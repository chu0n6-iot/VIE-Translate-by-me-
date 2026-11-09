const MAX_CACHE_SIZE = 800;
const MAX_CONTEXT_ITEMS = 6;

const cache = new Map();
const inFlight = new Map();
const contextByTab = new Map();

// Lưu danh sách model và model đang hoạt động tốt nhất theo từng API key
const discoveredModelsByKey = new Map();
const activeRouteByKey = new Map(); // apiKey -> { model, endpointType }
const cooldownModels = new Map(); // `${apiKey}:${model}` -> timestamp

const FALLBACK_GEMINI_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
  "gemini-1.5-flash"
];

const FALLBACK_GROQ_MODELS = [
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3-32b",
  "gemma2-9b-it"
];

// Khôi phục cache từ storage khi Service Worker khởi động lại
let saveCacheTimer = null;
chrome.storage.local.get({ translationCache: [] }, (stored) => {
  if (Array.isArray(stored.translationCache)) {
    for (const [k, v] of stored.translationCache) {
      if (k && v) cache.set(k, v);
    }
  }
});

function schedulePersistCache() {
  if (saveCacheTimer) return;
  saveCacheTimer = setTimeout(() => {
    saveCacheTimer = null;
    const entries = Array.from(cache.entries()).slice(-MAX_CACHE_SIZE);
    chrome.storage.local.set({ translationCache: entries });
  }, 2500);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;

  if (msg.type === "TRANSLATE") {
    const tabId = sender.tab?.id ?? "global";
    handleTranslate(msg.text, msg.videoTitle || "", tabId, msg.fastPreviewOnly === true)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message || "Lỗi dịch phụ đề" }));
    return true;
  }

  if (msg.type === "TRANSLATE_BATCH") {
    const tabId = sender.tab?.id ?? "global";
    handleTranslateBatch(msg.texts || [], msg.videoTitle || "", tabId)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message || "Lỗi dịch hàng loạt" }));
    return true;
  }

  if (msg.type === "TEST_API") {
    testAndDetectActiveModel(msg.apiKey, msg.provider, msg.model)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err.message || "Lỗi kết nối" }));
    return true;
  }

  if (msg.type === "AUTO_IMPORT_API_KEY") {
    handleAutoImportApiKey(msg.apiKey)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err.message || "Lỗi tự động nhập Key" }));
    return true;
  }

  if (msg.type === "CLEAR_CACHE") {
    cache.clear();
    contextByTab.clear();
    discoveredModelsByKey.clear();
    activeRouteByKey.clear();
    cooldownModels.clear();
    chrome.storage.local.remove(["translationCache"]);
    sendResponse({ ok: true });
    return true;
  }
});

// Tự nhận diện nhà cung cấp dựa trên tiền tố API Key
function resolveProvider(apiKey, selectedProvider) {
  const key = (apiKey || "").trim();
  if (key.startsWith("gsk_")) return "groq";
  if (key.startsWith("AQ.") || key.startsWith("AIza")) return "gemini";
  return selectedProvider || "gemini";
}

function getCached(key) {
  if (!cache.has(key)) return null;
  const val = cache.get(key);
  cache.delete(key);
  cache.set(key, val);
  return val;
}

function setCached(key, val) {
  if (!val) return;
  if (cache.has(key)) cache.delete(key);
  else if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  cache.set(key, val);
  schedulePersistCache();
}

function getTabContext(tabId, videoTitle) {
  let ctx = contextByTab.get(tabId);
  if (!ctx || (videoTitle && ctx.videoTitle !== videoTitle)) {
    ctx = { videoTitle: videoTitle || "", items: [] };
    contextByTab.set(tabId, ctx);
  }
  return ctx;
}

function pushTabContext(tabId, videoTitle, src, vi) {
  if (!src || !vi) return;
  const ctx = getTabContext(tabId, videoTitle);
  if (ctx.items.length > 0 && ctx.items[ctx.items.length - 1].src === src) {
    ctx.items[ctx.items.length - 1].vi = vi;
    return;
  }
  ctx.items.push({ src, vi });
  if (ctx.items.length > MAX_CONTEXT_ITEMS) {
    ctx.items.shift();
  }
}

function isModelInCooldown(apiKey, modelId) {
  const key = `${apiKey.slice(-10)}:${modelId}`;
  const until = cooldownModels.get(key);
  if (!until) return false;
  if (Date.now() > until) {
    cooldownModels.delete(key);
    return false;
  }
  return true;
}

function markModelCooldown(apiKey, modelId, durationMs = 60_000) {
  cooldownModels.set(`${apiKey.slice(-10)}:${modelId}`, Date.now() + durationMs);
}

function buildOrderedCandidates(candidates, apiKey, preferredModel, savedModel) {
  const ordered = [];
  const add = (m) => {
    if (m && !ordered.includes(m) && !isModelInCooldown(apiKey, m)) {
      ordered.push(m);
    }
  };

  if (preferredModel && preferredModel !== "auto") {
    if (candidates.includes(preferredModel)) {
      add(preferredModel);
    } else {
      const prefixMatch = candidates.find((c) => c.startsWith(preferredModel));
      if (prefixMatch) add(prefixMatch);
      add(preferredModel);
    }
  }

  if (savedModel) add(savedModel);
  for (const c of candidates) add(c);

  if (ordered.length === 0) {
    ordered.push(...candidates.slice(0, 6));
  }
  return ordered;
}

function parseNumberedBatchOutput(rawOut, expectedCount) {
  const resultArr = new Array(expectedCount).fill("");
  const lines = (rawOut || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const m = line.match(/^\[(\d+)\]\s*(.+)$/);
    if (m) {
      const idx = parseInt(m[1], 10) - 1;
      if (idx >= 0 && idx < expectedCount) {
        resultArr[idx] = m[2].replace(/^["“”']+|["“”']+$/g, "").trim();
      }
    }
  }

  if (resultArr.every((x) => !x) && lines.length === expectedCount) {
    for (let i = 0; i < expectedCount; i++) {
      resultArr[i] = lines[i]
        .replace(/^\d+[\.\)]\s*/, "")
        .replace(/^["“”']+|["“”']+$/g, "")
        .trim();
    }
  }

  return resultArr;
}

// ============================================================================
// 1. GROQ CLOUD: Dò danh sách model đang hoạt động & dịch tự động
// ============================================================================

function scoreGroqModel(modelId) {
  const id = modelId.toLowerCase();
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

async function callGroqModel({ text, texts, videoTitle, history, apiKey, model }) {
  let contextPrompt = "";
  if (videoTitle) {
    contextPrompt += `Tiêu đề video: "${videoTitle}".\n`;
  }
  if (history && history.length > 0) {
    const recentLines = history
      .slice(-4)
      .map((item) => `- "${item.src}" -> "${item.vi}"`)
      .join("\n");
    contextPrompt += `Các câu thoại trước đó để giữ mạch xưng hô:\n${recentLines}\n`;
  }

  const isBatch = Array.isArray(texts) && texts.length > 0;
  const systemText = isBatch
    ? "Bạn là biên dịch viên phụ đề video chuyên nghiệp sang tiếng Việt. " +
      "Hãy dịch từng câu được đánh số [1], [2]... sang tiếng Việt tự nhiên, liền mạch ngữ cảnh và thống nhất ngôi xưng hô. " +
      "BẮT BUỘC giữ nguyên định dạng đánh số [1], [2]... trên từng dòng tương ứng, không giải thích thêm."
    : "Bạn là biên dịch viên phụ đề video chuyên nghiệp sang tiếng Việt. " +
      "Hãy dịch câu thoại sang tiếng Việt tự nhiên, ngắn gọn, đúng ngữ cảnh và ngôi xưng hô (anh/em, tôi/bạn, mình/cậu, chú/bác, thầy/trò...). " +
      "Chỉ trả về duy nhất câu tiếng Việt đã dịch, không giải thích, không suy nghĩ dài dòng, không thêm dấu ngoặc kép.";

  const userContent = isBatch
    ? `${contextPrompt}\nDịch các câu phụ đề sau:\n${texts
        .map((t, idx) => `[${idx + 1}] ${t}`)
        .join("\n")}`
    : contextPrompt
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
      max_tokens: isBatch ? Math.min(1200, texts.length * 140) : 220
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

  let out = data?.choices?.[0]?.message?.content || "";
  out = out.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  if (isBatch) {
    return parseNumberedBatchOutput(out, texts.length);
  }
  return out.replace(/^["“”']+|["“”']+$/g, "").trim();
}

async function translateWithGroqAuto({ text, texts, videoTitle, history, apiKey, preferredModel }) {
  const candidates = await discoverGroqModels(apiKey);
  const savedRoute = activeRouteByKey.get(apiKey);
  const ordered = buildOrderedCandidates(candidates, apiKey, preferredModel, savedRoute?.model);

  let lastError = null;
  for (const candidate of ordered.slice(0, 6)) {
    try {
      const out = await callGroqModel({
        text,
        texts,
        videoTitle,
        history,
        apiKey,
        model: candidate
      });
      activeRouteByKey.set(apiKey, { model: candidate, endpointType: "groq" });
      chrome.storage.local.set({ detectedModel: candidate, availableModels: candidates });
      if (Array.isArray(texts) && texts.length > 0) {
        return { translations: out, modelUsed: candidate };
      }
      return { vi: out, modelUsed: candidate };
    } catch (err) {
      lastError = err;
      const status = err.status || 0;
      const msg = (err.message || "").toLowerCase();

      if (status === 401 || msg.includes("invalid api key")) {
        throw err;
      }

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
    "ultra",
    "bisect"
  ];
  if (blocked.some((kw) => id.includes(kw))) return -1;
  if (!id.includes("flash") && !id.includes("gemma")) return -1;

  if (id === "gemini-2.5-flash-lite") return 1100;
  if (id === "gemini-2.5-flash") return 1080;
  if (id === "gemini-2.0-flash-lite") return 1050;
  if (id === "gemini-2.0-flash") return 1040;
  if (id === "gemini-flash-lite-latest") return 1020;
  if (id === "gemini-flash-latest") return 1000;

  let score = 100;
  const verMatch = id.match(/gemini-(\d+(?:\.\d+)?)/);
  if (verMatch) {
    score += parseFloat(verMatch[1]) * 100;
  }
  if (id.includes("flash-lite")) score += 35;
  else if (id.includes("flash")) score += 25;
  if (id.includes("preview") || id.includes("exp")) score -= 20;
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

    const finalModels = list.length > 0 ? list : FALLBACK_GEMINI_MODELS;
    discoveredModelsByKey.set(cacheId, finalModels);
    return finalModels;
  } catch {
    return FALLBACK_GEMINI_MODELS;
  }
}

function buildGeminiBody({ systemText, fullUserText, model, maxTokens, useThinkingZero }) {
  const isGemma = model.toLowerCase().includes("gemma");
  const generationConfig = {
    temperature: 0.2,
    maxOutputTokens: maxTokens
  };

  if (useThinkingZero && model.toLowerCase().includes("gemini-2.5")) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  if (isGemma) {
    return {
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemText}\n\n${fullUserText}` }]
        }
      ],
      generationConfig
    };
  }

  return {
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
    generationConfig
  };
}

async function callGeminiEndpoint({
  text,
  texts,
  videoTitle,
  history,
  apiKey,
  model,
  endpointType
}) {
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
      .slice(-4)
      .map((item) => `- "${item.src}" -> "${item.vi}"`)
      .join("\n");
    contextPrompt += `Các câu thoại trước đó để giữ mạch xưng hô:\n${recentLines}\n`;
  }

  const isBatch = Array.isArray(texts) && texts.length > 0;
  const systemText = isBatch
    ? "Bạn là biên dịch viên phụ đề video chuyên nghiệp sang tiếng Việt. " +
      "Hãy dịch từng câu được đánh số [1], [2]... sang tiếng Việt tự nhiên, liền mạch ngữ cảnh và thống nhất ngôi xưng hô. " +
      "BẮT BUỘC giữ nguyên định dạng đánh số [1], [2]... trên từng dòng tương ứng, không giải thích thêm."
    : "Bạn là biên dịch viên phụ đề video chuyên nghiệp sang tiếng Việt. " +
      "Hãy dịch câu thoại sang tiếng Việt tự nhiên, ngắn gọn, đúng ngữ cảnh và ngôi xưng hô (anh/em, tôi/bạn, mình/cậu, chú/bác, thầy/trò...). " +
      "Chỉ trả về duy nhất câu tiếng Việt đã dịch, không giải thích, không thêm dấu ngoặc kép.";

  const fullUserText = isBatch
    ? `${contextPrompt}\nDịch các câu phụ đề sau:\n${texts
        .map((t, idx) => `[${idx + 1}] ${t}`)
        .join("\n")}`
    : contextPrompt
    ? `${contextPrompt}\nDịch câu tiếp theo:\n${text}`
    : text;

  const maxTokens = isBatch ? Math.min(1200, texts.length * 140) : 220;

  let requestBody = buildGeminiBody({
    systemText,
    fullUserText,
    model,
    maxTokens,
    useThinkingZero: true
  });

  let res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody)
  });

  // Nếu endpoint báo 400 do không hỗ trợ thinkingConfig, tự động thử lại không có thinkingConfig
  if (res.status === 400 && requestBody.generationConfig?.thinkingConfig) {
    requestBody = buildGeminiBody({
      systemText,
      fullUserText,
      model,
      maxTokens,
      useThinkingZero: false
    });
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const apiMsg = data?.error?.message || `HTTP ${res.status}`;
    const err = new Error(apiMsg);
    err.status = res.status;
    throw err;
  }

  const parts = data?.candidates?.[0]?.content?.parts;
  const out = Array.isArray(parts)
    ? parts
        .filter((p) => !p.thought)
        .map((p) => p.text || "")
        .join("")
        .trim()
    : "";

  if (!out) {
    const err = new Error(`[${model}] Phản hồi rỗng từ Gemini API`);
    err.status = 500;
    throw err;
  }

  if (isBatch) {
    return parseNumberedBatchOutput(out, texts.length);
  }
  return out.replace(/^["“”']+|["“”']+$/g, "").trim();
}

async function translateWithGeminiAuto({
  text,
  texts,
  videoTitle,
  history,
  apiKey,
  preferredModel
}) {
  const candidates = await discoverGeminiModels(apiKey);
  const savedRoute = activeRouteByKey.get(apiKey);

  const endpointTypes = apiKey.startsWith("AQ.")
    ? savedRoute?.endpointType === "vertex"
      ? ["vertex", "aistudio"]
      : ["aistudio", "vertex"]
    : ["aistudio"];

  const ordered = buildOrderedCandidates(candidates, apiKey, preferredModel, savedRoute?.model);

  let lastError = null;
  for (const endpointType of endpointTypes) {
    for (const candidate of ordered.slice(0, 6)) {
      try {
        const out = await callGeminiEndpoint({
          text,
          texts,
          videoTitle,
          history,
          apiKey,
          model: candidate,
          endpointType
        });
        activeRouteByKey.set(apiKey, { model: candidate, endpointType });
        chrome.storage.local.set({ detectedModel: candidate, availableModels: candidates });
        if (Array.isArray(texts) && texts.length > 0) {
          return { translations: out, modelUsed: candidate };
        }
        return { vi: out, modelUsed: candidate };
      } catch (err) {
        lastError = err;
        const status = err.status || 0;
        if (status === 404 || status === 400) {
          markModelCooldown(apiKey, candidate, 24 * 60 * 60 * 1000);
        } else if (status === 429 || status === 503) {
          markModelCooldown(apiKey, candidate, 60 * 1000);
        } else if (status === 401 || status === 403) {
          break;
        }
      }
    }
  }

  throw lastError || new Error("Không tìm thấy model Gemini khả dụng cho API Key này.");
}

// ============================================================================
// 3. ĐIỀU PHỐI DỊCH CHÍNH, DỊCH HÀNG LOẠT & TỰ ĐỘNG NHẬP KEY
// ============================================================================

async function getActiveConfig() {
  const settings = await chrome.storage.local.get({
    provider: "gemini",
    apiKey: "",
    groqApiKey: "",
    geminiApiKey: "",
    model: "auto",
    fallbackToFree: true
  });

  let rawKey = (settings.apiKey || "").trim();
  if (settings.provider === "groq" && settings.groqApiKey) {
    rawKey = settings.groqApiKey.trim();
  } else if (settings.provider === "gemini" && settings.geminiApiKey) {
    rawKey = settings.geminiApiKey.trim();
  }

  const effectiveProvider =
    settings.provider === "gtx" ? "gtx" : resolveProvider(rawKey, settings.provider);

  return { settings, rawKey, effectiveProvider };
}

async function handleTranslate(rawText, videoTitle, tabId, fastPreviewOnly = false) {
  const cleanText = (rawText || "").replace(/\s+/g, " ").trim();
  if (!cleanText) return { vi: "" };

  const { settings, rawKey, effectiveProvider } = await getActiveConfig();
  const targetProvider = fastPreviewOnly ? "gtx" : effectiveProvider;
  const cacheKey = `${targetProvider}:${cleanText}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return { vi: cached, provider: targetProvider, cached: true };
  }

  if (inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey);
  }

  const task = (async () => {
    try {
      if (targetProvider === "gtx") {
        const vi = await translateWithGoogleFree(cleanText);
        if (vi) setCached(cacheKey, vi);
        return { vi, provider: "gtx" };
      }

      if (!rawKey) {
        if (settings.fallbackToFree) {
          const vi = await translateWithGoogleFree(cleanText);
          if (vi) setCached(`gtx:${cleanText}`, vi);
          return { vi, provider: "gtx" };
        }
        return {
          error:
            "Chưa có API Key. Hãy mở tiện ích và bấm '⚡ Tự động lấy Key từ AI Studio'!"
        };
      }

      const ctx = getTabContext(tabId, videoTitle);
      try {
        const result =
          targetProvider === "groq"
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
        return { vi: result.vi, provider: targetProvider, modelUsed: result.modelUsed };
      } catch (apiErr) {
        if (settings.fallbackToFree) {
          const vi = await translateWithGoogleFree(cleanText);
          if (vi) {
            setCached(`gtx:${cleanText}`, vi);
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

async function handleTranslateBatch(rawTexts, videoTitle, tabId) {
  if (!Array.isArray(rawTexts) || rawTexts.length === 0) {
    return { results: {} };
  }

  const cleanList = Array.from(
    new Set(
      rawTexts
        .map((t) => (t || "").replace(/\s+/g, " ").trim())
        .filter(Boolean)
    )
  ).slice(0, 8);

  if (cleanList.length === 0) return { results: {} };

  const { settings, rawKey, effectiveProvider } = await getActiveConfig();
  const results = {};
  const uncached = [];

  for (const text of cleanList) {
    const cached = getCached(`${effectiveProvider}:${text}`) || getCached(`gtx:${text}`);
    if (cached) {
      results[text] = cached;
    } else {
      uncached.push(text);
    }
  }

  if (uncached.length === 0) return { results, cached: true };
  if (uncached.length === 1) {
    const single = await handleTranslate(uncached[0], videoTitle, tabId);
    if (single?.vi) results[uncached[0]] = single.vi;
    return { results, provider: single?.provider, modelUsed: single?.modelUsed };
  }

  if (effectiveProvider === "gtx" || !rawKey) {
    await Promise.all(
      uncached.map(async (t) => {
        try {
          const vi = await translateWithGoogleFree(t);
          if (vi) {
            setCached(`gtx:${t}`, vi);
            results[t] = vi;
          }
        } catch {
          // Bỏ qua câu lỗi
        }
      })
    );
    return { results, provider: "gtx" };
  }

  const ctx = getTabContext(tabId, videoTitle);
  try {
    const batchRes =
      effectiveProvider === "groq"
        ? await translateWithGroqAuto({
            texts: uncached,
            videoTitle,
            history: ctx.items,
            apiKey: rawKey,
            preferredModel: settings.model || "auto"
          })
        : await translateWithGeminiAuto({
            texts: uncached,
            videoTitle,
            history: ctx.items,
            apiKey: rawKey,
            preferredModel: settings.model || "auto"
          });

    const translations = batchRes.translations || [];
    for (let i = 0; i < uncached.length; i++) {
      const src = uncached[i];
      const vi = (translations[i] || "").trim();
      if (vi) {
        setCached(`${effectiveProvider}:${src}`, vi);
        pushTabContext(tabId, videoTitle, src, vi);
        results[src] = vi;
      }
    }
    return { results, provider: effectiveProvider, modelUsed: batchRes.modelUsed };
  } catch {
    if (settings.fallbackToFree) {
      await Promise.all(
        uncached.map(async (t) => {
          try {
            const vi = await translateWithGoogleFree(t);
            if (vi) {
              setCached(`gtx:${t}`, vi);
              results[t] = vi;
            }
          } catch {
            // Bỏ qua
          }
        })
      );
      return { results, provider: "gtx" };
    }
    return { results };
  }
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

async function handleAutoImportApiKey(rawKey) {
  const trimmedKey = (rawKey || "").trim();
  if (!trimmedKey) {
    return { ok: false, error: "Không tìm thấy API Key hợp lệ." };
  }

  const provider = resolveProvider(trimmedKey, "gemini");
  const verifyRes = await testAndDetectActiveModel(trimmedKey, provider, "auto");
  if (!verifyRes.ok) {
    return verifyRes;
  }

  const storageUpdate = {
    provider: verifyRes.provider,
    apiKey: trimmedKey,
    verifiedKey: trimmedKey,
    detectedModel: verifyRes.modelUsed,
    model: verifyRes.modelUsed,
    availableModels: verifyRes.availableModels || [],
    lastAutoImportAt: Date.now()
  };

  if (verifyRes.provider === "gemini") {
    storageUpdate.geminiApiKey = trimmedKey;
  } else if (verifyRes.provider === "groq") {
    storageUpdate.groqApiKey = trimmedKey;
  }

  await chrome.storage.local.set(storageUpdate);

  return {
    ok: true,
    apiKey: trimmedKey,
    provider: verifyRes.provider,
    modelUsed: verifyRes.modelUsed,
    sample: verifyRes.sample,
    availableModels: verifyRes.availableModels
  };
}