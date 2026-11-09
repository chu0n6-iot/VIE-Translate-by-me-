const MAX_CACHE_SIZE = 500;
const MAX_CONTEXT_ITEMS = 5;

const cache = new Map();
const inFlight = new Map();
const contextByTab = new Map();

// Lưu danh sách model và model đang hoạt động tốt nhất theo từng API key
const discoveredModelsByKey = new Map();
const activeRouteByKey = new Map(); // apiKey -> { model, endpointType }
const cooldownModels = new Map(); // `${apiKey}:${model}` -> timestamp

const FALLBACK_GEMINI_MODELS = [
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite"
];

const FALLBACK_GROQ_MODELS = [
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3-32b",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "gemma2-9b-it"
];

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;

  if (msg.type === "TRANSLATE") {
    const tabId = sender.tab?.id ?? "global";
    handleTranslate(msg.text, msg.videoTitle || "", tabId)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message || "Lỗi dịch phụ đề" }));
    return true;
  }

  if (msg.type === "TEST_API") {
    testAndDetectActiveModel(msg.apiKey, msg.provider, msg.model)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err.message || "Lỗi kết nối" }));
    return true;
  }

  if (msg.type === "CLEAR_CACHE") {
    cache.clear();
    contextByTab.clear();
    discoveredModelsByKey.clear();
    activeRouteByKey.clear();
    cooldownModels.clear();
    sendResponse({ ok: true });
    return true;
  }
});

// Tự nhận diện nhà cung cấp dựa trên tiền tố API Key
function resolveProvider(apiKey, selectedProvider) {
  const key = (apiKey || "").trim();
  if (key.startsWith("gsk_")) return "groq";
  if (key.startsWith("AQ.") || key.startsWith("AIza")) return "gemini";
  return selectedProvider || "groq";
}

function getCached(key) {
  if (!cache.has(key)) return null;
  const val = cache.get(key);
  cache.delete(key);
  cache.set(key, val);
  return val;
}

function setCached(key, val) {
  if (cache.has(key)) cache.delete(key);
  else if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  cache.set(key, val);
}

function getTabContext(tabId, videoTitle) {
  let ctx = contextByTab.get(tabId);
  if (!ctx || ctx.videoTitle !== videoTitle) {
    ctx = { videoTitle, items: [] };
    contextByTab.set(tabId, ctx);
  }
  return ctx;
}

function pushTabContext(tabId, videoTitle, src, vi) {
  const ctx = getTabContext(tabId, videoTitle);
  if (ctx.items.length > 0 && ctx.items[ctx.items.length - 1].src === src) {
    return;
  }
  ctx.items.push({ src, vi });
  if (ctx.items.length > MAX_CONTEXT_ITEMS) {
    ctx.items.shift();
  }
}

function isModelInCooldown(apiKey, modelId) {
  const key = `${apiKey}:${modelId}`;
  const until = cooldownModels.get(key);
  if (!until) return false;
  if (Date.now() > until) {
    cooldownModels.delete(key);
    return false;
  }
  return true;
}

function markModelCooldown(apiKey, modelId, durationMs = 60_000) {
  cooldownModels.set(`${apiKey}:${modelId}`, Date.now() + durationMs);
}

// ============================================================================
// 1. GROQ CLOUD: Dò danh sách model đang hoạt động & dịch tự động
// ============================================================================

function scoreGroqModel(modelId) {
  const id = modelId.toLowerCase();
  // Loại bỏ các model âm thanh (whisper/tts), bảo mật (guard), embedding
  const blocked = [
    "whisper",
    "tts",
    "playai",
    "guard",
    "orpheus",
    "embed",
    "allam",
    "distil-whisper",
    "vision-preview",
    "compound"
  ];
  if (blocked.some((kw) => id.includes(kw))) return -1;

  let score = 100;
  if (id.includes("llama-4-scout")) score += 95;
  else if (id.includes("llama-4-maverick")) score += 90;
  else if (id.includes("llama-3.3-70b")) score += 88;
  else if (id.includes("gpt-oss-120b")) score += 85;
  else if (id.includes("gpt-oss-20b")) score += 82;
  else if (id.includes("qwen3-32b") || id.includes("qwen")) score += 80;
  else if (id.includes("llama-3.1-8b-instant") || id.includes("8b-instant")) score += 78;
  else if (id.includes("gemma")) score += 70;
  else if (id.includes("llama")) score += 65;
  else if (id.includes("deepseek")) score += 50;

  return score;
}

async function discoverGroqModels(apiKey) {
  const cacheId = `groq:${apiKey}`;
  if (discoveredModelsByKey.has(cacheId)) {
    return discoveredModelsByKey.get(cacheId);
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (!res.ok) {
      return FALLBACK_GROQ_MODELS;
    }
    const data = await res.json();
    const rawModels = Array.isArray(data?.data) ? data.data : [];

    const scored = [];
    for (const m of rawModels) {
      if (m.active === false) continue;
      const id = m.id || "";
      const s = scoreGroqModel(id);
      if (s > 0) {
        scored.push({ id, score: s });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const list = scored.map((x) => x.id);

    const finalModels = list.length > 0 ? list : FALLBACK_GROQ_MODELS;
    discoveredModelsByKey.set(cacheId, finalModels);
    return finalModels;
  } catch {
    return FALLBACK_GROQ_MODELS;
  }
}

async function callGroqModel({ text, videoTitle, history, apiKey, model }) {
  let contextPrompt = "";
  if (videoTitle) {
    contextPrompt += `Tiêu đề video: "${videoTitle}".\n`;
  }
  if (history && history.length > 0) {
    const recentLines = history
      .map((item) => `- "${item.src}" -> "${item.vi}"`)
      .join("\n");
    contextPrompt += `Các câu thoại trước đó để giữ mạch xưng hô:\n${recentLines}\n`;
  }

  const systemText =
    "Bạn là biên dịch viên phụ đề video chuyên nghiệp sang tiếng Việt. " +
    "Hãy dịch câu thoại sang tiếng Việt tự nhiên, ngắn gọn, đúng ngữ cảnh và ngôi xưng hô (anh/em, tôi/bạn, mình/cậu, chú/bác, thầy/trò...). " +
    "Chỉ trả về duy nhất câu tiếng Việt đã dịch, không giải thích, không suy nghĩ dài dòng, không thêm dấu ngoặc kép.";

  const userContent = contextPrompt
    ? `${contextPrompt}\nDịch câu tiếp theo:\n${text}`
    : text;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemText },
        { role: "user", content: userContent }
      ],
      temperature: 0.2,
      max_tokens: 200
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const apiMsg = data?.error?.message || `HTTP ${res.status}`;
    const err = new Error(apiMsg);
    err.status = res.status;
    err.code = data?.error?.code || "";
    throw err;
  }

  let vi = data?.choices?.[0]?.message?.content || "";
  // Loại bỏ thẻ <think>...</think> nếu model reasoning (như qwen/deepseek) sinh ra
  vi = vi.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  return vi.replace(/^["“”']+|["“”']+$/g, "").trim();
}

async function translateWithGroqAuto({ text, videoTitle, history, apiKey, preferredModel }) {
  const candidates = await discoverGroqModels(apiKey);
  const savedRoute = activeRouteByKey.get(apiKey);

  // Sắp xếp thứ tự model sẽ thử:
  // 1. Model người dùng chọn (nếu khác "auto")
  // 2. Model đã xác nhận chạy tốt gần nhất
  // 3. Toàn bộ danh sách model đang active lấy từ /openai/v1/models
  const ordered = [];
  if (preferredModel && preferredModel !== "auto" && !isModelInCooldown(apiKey, preferredModel)) {
    ordered.push(preferredModel);
  }
  if (savedRoute?.model && !ordered.includes(savedRoute.model) && !isModelInCooldown(apiKey, savedRoute.model)) {
    ordered.push(savedRoute.model);
  }
  for (const c of candidates) {
    if (!ordered.includes(c) && !isModelInCooldown(apiKey, c)) {
      ordered.push(c);
    }
  }
  if (ordered.length === 0) {
    ordered.push(...candidates.slice(0, 6));
  }

  let lastError = null;
  for (const candidate of ordered.slice(0, 6)) {
    try {
      const vi = await callGroqModel({
        text,
        videoTitle,
        history,
        apiKey,
        model: candidate
      });
      activeRouteByKey.set(apiKey, { model: candidate, endpointType: "groq" });
      chrome.storage.local.set({ detectedModel: candidate, availableModels: candidates });
      return { vi, modelUsed: candidate };
    } catch (err) {
      lastError = err;
      const status = err.status || 0;
      const msg = (err.message || "").toLowerCase();

      // Sai API key -> báo lỗi ngay
      if (status === 401 || msg.includes("invalid api key")) {
        throw err;
      }

      // Model bị khai tử / không tồn tại / không có quyền truy cập -> khóa model này 24h và tự động thử model kế tiếp!
      if (
        status === 404 ||
        status === 400 ||
        msg.includes("does not exist") ||
        msg.includes("do not have access") ||
        msg.includes("decommissioned") ||
        msg.includes("not found")
      ) {
        markModelCooldown(apiKey, candidate, 24 * 60 * 60 * 1000);
      } else {
        // Quá tải / hết quota tạm thời (429) -> cooldown 60s rồi thử model kế tiếp
        markModelCooldown(apiKey, candidate, 60 * 1000);
      }
    }
  }

  throw lastError || new Error("Không tìm thấy model Groq khả dụng cho API Key này.");
}

// ============================================================================
// 2. GOOGLE GEMINI (Hỗ trợ cả AI Studio & Vertex AI Express Mode cho key AQ.)
// ============================================================================

function scoreGeminiModel(modelId) {
  const id = modelId.toLowerCase();
  const blocked = [
    "tts",
    "image",
    "imagen",
    "veo",
    "embedding",
    "aqa",
    "audio",
    "live",
    "robotics",
    "computer-use",
    "learnlm",
    "thinking",
    "-pro",
    "argon",
    "ultra"
  ];
  if (blocked.some((kw) => id.includes(kw))) return -1;
  if (!id.includes("flash") && !id.includes("gemma")) return -1;

  if (id === "gemini-flash-latest") return 1000;
  if (id === "gemini-flash-lite-latest") return 990;

  let score = 100;
  const verMatch = id.match(/gemini-(\d+(?:\.\d+)?)/);
  if (verMatch) {
    score += parseFloat(verMatch[1]) * 100;
  }
  if (id.includes("preview") || id.includes("exp")) score -= 15;
  if (id.includes("flash-lite")) score += 10;
  else if (id.includes("flash")) score += 20;
  if (/\d{4,}/.test(id)) score -= 25;

  return score;
}

async function discoverGeminiModels(apiKey) {
  const cacheId = `gemini:${apiKey}`;
  if (discoveredModelsByKey.has(cacheId)) {
    return discoveredModelsByKey.get(cacheId);
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
    );
    if (!res.ok) {
      return FALLBACK_GEMINI_MODELS;
    }
    const data = await res.json();
    const models = Array.isArray(data?.models) ? data.models : [];

    const scored = [];
    for (const m of models) {
      const methods = m.supportedGenerationMethods || [];
      if (!methods.includes("generateContent")) continue;
      const id = (m.name || "").replace(/^models\//, "");
      const s = scoreGeminiModel(id);
      if (s > 0) {
        scored.push({ id, score: s });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const list = scored.map((x) => x.id);
    for (const fb of FALLBACK_GEMINI_MODELS) {
      if (!list.includes(fb)) list.push(fb);
    }

    const finalModels = list.length > 0 ? list : FALLBACK_GEMINI_MODELS;
    discoveredModelsByKey.set(cacheId, finalModels);
    return finalModels;
  } catch {
    return FALLBACK_GEMINI_MODELS;
  }
}

async function callGeminiEndpoint({ text, videoTitle, history, apiKey, model, endpointType }) {
  // Hỗ trợ cả AI Studio (generativelanguage) và Vertex AI Express Mode (aiplatform) cho key AQ.Ab8...
  const endpoint =
    endpointType === "vertex"
      ? `https://aiplatform.googleapis.com/v1/publishers/google/models/${encodeURIComponent(
          model
        )}:generateContent?key=${encodeURIComponent(apiKey)}`
      : `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          model
        )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  let contextPrompt = "";
  if (videoTitle) {
    contextPrompt += `Tiêu đề video: "${videoTitle}".\n`;
  }
  if (history && history.length > 0) {
    const recentLines = history
      .map((item) => `- "${item.src}" -> "${item.vi}"`)
      .join("\n");
    contextPrompt += `Các câu thoại trước đó để giữ mạch xưng hô:\n${recentLines}\n`;
  }

  const systemText =
    "Bạn là biên dịch viên phụ đề video chuyên nghiệp sang tiếng Việt. " +
    "Hãy dịch câu thoại sang tiếng Việt tự nhiên, ngắn gọn, đúng ngữ cảnh và ngôi xưng hô (anh/em, tôi/bạn, mình/cậu, chú/bác, thầy/trò...). " +
    "Chỉ trả về duy nhất câu tiếng Việt đã dịch, không giải thích, không thêm dấu ngoặc kép.";

  const isGemma = model.toLowerCase().includes("gemma");
  const fullUserText = contextPrompt
    ? `${contextPrompt}\nDịch câu tiếp theo:\n${text}`
    : text;

  const requestBody = isGemma
    ? {
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemText}\n\n${fullUserText}` }]
          }
        ],
        generationConfig: { temperature: 0.2, maxOutputTokens: 200 }
      }
    : {
        systemInstruction: {
          role: "system",
          parts: [{ text: systemText }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: fullUserText }]
          }
        ],
        generationConfig: { temperature: 0.2, maxOutputTokens: 200 }
      };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const apiMsg = data?.error?.message || `HTTP ${res.status}`;
    const err = new Error(apiMsg);
    err.status = res.status;
    throw err;
  }

  const vi =
    data?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || "")
      .join("")
      .trim() || "";

  return vi.replace(/^["“”']+|["“”']+$/g, "").trim();
}

async function translateWithGeminiAuto({ text, videoTitle, history, apiKey, preferredModel }) {
  const candidates = await discoverGeminiModels(apiKey);
  const savedRoute = activeRouteByKey.get(apiKey);

  // Nếu key bắt đầu bằng AQ., ưu tiên thử cả Vertex Express Mode và AI Studio
  const endpointTypes = apiKey.startsWith("AQ.")
    ? savedRoute?.endpointType === "vertex"
      ? ["vertex", "aistudio"]
      : ["aistudio", "vertex"]
    : ["aistudio"];

  const ordered = [];
  if (preferredModel && preferredModel !== "auto" && !isModelInCooldown(apiKey, preferredModel)) {
    ordered.push(preferredModel);
  }
  if (savedRoute?.model && !ordered.includes(savedRoute.model) && !isModelInCooldown(apiKey, savedRoute.model)) {
    ordered.push(savedRoute.model);
  }
  for (const c of candidates) {
    if (!ordered.includes(c) && !isModelInCooldown(apiKey, c)) {
      ordered.push(c);
    }
  }
  if (ordered.length === 0) {
    ordered.push(...candidates.slice(0, 5));
  }

  let lastError = null;
  for (const endpointType of endpointTypes) {
    for (const candidate of ordered.slice(0, 5)) {
      try {
        const vi = await callGeminiEndpoint({
          text,
          videoTitle,
          history,
          apiKey,
          model: candidate,
          endpointType
        });
        activeRouteByKey.set(apiKey, { model: candidate, endpointType });
        chrome.storage.local.set({ detectedModel: candidate, availableModels: candidates });
        return { vi, modelUsed: candidate };
      } catch (err) {
        lastError = err;
        const status = err.status || 0;
        if (status === 404 || status === 400) {
          markModelCooldown(apiKey, candidate, 24 * 60 * 60 * 1000);
        } else if (status === 429) {
          markModelCooldown(apiKey, candidate, 60 * 1000);
        } else if (status === 401 || status === 403) {
          // Nếu aistudio từ chối key AQ., thoát vòng lặp trong để chuyển sang thử endpoint vertex
          break;
        }
      }
    }
  }

  throw lastError || new Error("Không tìm thấy model Gemini khả dụng cho API Key này.");
}

// ============================================================================
// 3. ĐIỀU PHỐI DỊCH CHÍNH & KIỂM TRA API
// ============================================================================

async function handleTranslate(rawText, videoTitle, tabId) {
  const cleanText = (rawText || "").replace(/\s+/g, " ").trim();
  if (!cleanText) return { vi: "" };

  const settings = await chrome.storage.local.get({
    provider: "groq",
    apiKey: "",
    groqApiKey: "",
    geminiApiKey: "",
    model: "auto",
    fallbackToFree: true
  });

  // Lấy API key tương ứng với provider hoặc tự nhận diện
  let rawKey = (settings.apiKey || "").trim();
  if (settings.provider === "groq" && settings.groqApiKey) {
    rawKey = settings.groqApiKey.trim();
  } else if (settings.provider === "gemini" && settings.geminiApiKey) {
    rawKey = settings.geminiApiKey.trim();
  }

  const effectiveProvider =
    settings.provider === "gtx" ? "gtx" : resolveProvider(rawKey, settings.provider);

  const cacheKey = `${effectiveProvider}:${settings.model}:${cleanText}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return { vi: cached, cached: true };
  }

  if (inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey);
  }

  const task = (async () => {
    try {
      if (effectiveProvider === "gtx") {
        const vi = await translateWithGoogleFree(cleanText);
        if (vi) setCached(cacheKey, vi);
        return { vi, provider: "gtx" };
      }

      if (!rawKey) {
        if (settings.fallbackToFree) {
          const vi = await translateWithGoogleFree(cleanText);
          if (vi) setCached(`gtx::${cleanText}`, vi);
          return { vi, provider: "gtx" };
        }
        return { error: "Chưa nhập API Key trong Cài đặt" };
      }

      const ctx = getTabContext(tabId, videoTitle);
      try {
        const result =
          effectiveProvider === "groq"
            ? await translateWithGroqAuto({
                text: cleanText,
                videoTitle,
                history: ctx.items,
                apiKey: rawKey,
                preferredModel: settings.model || "auto"
              })
            : await translateWithGeminiAuto({
                text: cleanText,
                videoTitle,
                history: ctx.items,
                apiKey: rawKey,
                preferredModel: settings.model || "auto"
              });

        if (result.vi) {
          setCached(cacheKey, result.vi);
          pushTabContext(tabId, videoTitle, cleanText, result.vi);
        }
        return { vi: result.vi, provider: effectiveProvider, modelUsed: result.modelUsed };
      } catch (apiErr) {
        if (settings.fallbackToFree) {
          const vi = await translateWithGoogleFree(cleanText);
          if (vi) {
            pushTabContext(tabId, videoTitle, cleanText, vi);
            return { vi, provider: "gtx", warning: apiErr.message };
          }
        }
        return { error: apiErr.message || "Lỗi gọi API dịch" };
      }
    } finally {
      inFlight.delete(cacheKey);
    }
  })();

  inFlight.set(cacheKey, task);
  return task;
}

async function translateWithGoogleFree(text) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=${encodeURIComponent(
    text
  )}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Google Translate HTTP ${res.status}`);
  }
  const data = await res.json();
  if (!Array.isArray(data) || !Array.isArray(data[0])) return "";
  return data[0]
    .map((segment) => (Array.isArray(segment) ? segment[0] : ""))
    .join("")
    .trim();
}

async function testAndDetectActiveModel(apiKey, selectedProvider, preferredModel = "auto") {
  const trimmedKey = (apiKey || "").trim();
  if (!trimmedKey) {
    return { ok: false, error: "Vui lòng nhập API Key trước khi kiểm tra." };
  }

  const provider = resolveProvider(trimmedKey, selectedProvider);

  // Làm mới bộ nhớ đệm dò model cho key này
  discoveredModelsByKey.delete(`groq:${trimmedKey}`);
  discoveredModelsByKey.delete(`gemini:${trimmedKey}`);
  activeRouteByKey.delete(trimmedKey);
  cooldownModels.clear();

  const models =
    provider === "groq"
      ? await discoverGroqModels(trimmedKey)
      : await discoverGeminiModels(trimmedKey);

  const { vi, modelUsed } =
    provider === "groq"
      ? await translateWithGroqAuto({
          text: "Hello everyone, welcome back to the video!",
          videoTitle: "Tech Channel",
          history: [],
          apiKey: trimmedKey,
          preferredModel: preferredModel || "auto"
        })
      : await translateWithGeminiAuto({
          text: "Hello everyone, welcome back to the video!",
          videoTitle: "Tech Channel",
          history: [],
          apiKey: trimmedKey,
          preferredModel: preferredModel || "auto"
        });

  return {
    ok: true,
    provider,
    sample: vi,
    modelUsed,
    availableModels: models.slice(0, 40)
  };
}