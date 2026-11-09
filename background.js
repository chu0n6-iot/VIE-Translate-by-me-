const MAX_CACHE_SIZE = 500;
const MAX_CONTEXT_ITEMS = 5;
const DEFAULT_MODEL = "auto";

const cache = new Map();
const inFlight = new Map();
const contextByTab = new Map();

// Lưu danh sách model khả dụng và model đang hoạt động tốt nhất theo từng API key
const discoveredModelsByKey = new Map();
const activeModelByKey = new Map();
const cooldownModels = new Map(); // model -> timestamp hết hạn cooldown

// Danh sách model dự phòng theo thứ tự ưu tiên nếu chưa gọi được /v1beta/models
const FALLBACK_FREE_MODELS = [
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
    testAndDetectModel(msg.apiKey, msg.model)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err.message || "Lỗi kết nối" }));
    return true;
  }

  if (msg.type === "CLEAR_CACHE") {
    cache.clear();
    contextByTab.clear();
    discoveredModelsByKey.clear();
    activeModelByKey.clear();
    cooldownModels.clear();
    sendResponse({ ok: true });
    return true;
  }
});

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

function isModelInCooldown(modelId) {
  const until = cooldownModels.get(modelId);
  if (!until) return false;
  if (Date.now() > until) {
    cooldownModels.delete(modelId);
    return false;
  }
  return true;
}

function markModelCooldown(modelId, durationMs = 60_000) {
  cooldownModels.set(modelId, Date.now() + durationMs);
}

// Chấm điểm ưu tiên cho các model miễn phí (Flash / Flash-Lite / Gemma)
function scoreFreeModel(modelId) {
  const id = modelId.toLowerCase();

  // Loại bỏ các model chuyên biệt không dùng dịch text phụ đề hoặc chỉ có ở bản trả phí
  const blockedKeywords = [
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
  if (blockedKeywords.some((kw) => id.includes(kw))) return -1;

  if (!id.includes("flash") && !id.includes("gemma")) return -1;

  let score = 100;

  // Ưu tiên alias tự động cập nhật của Google
  if (id === "gemini-flash-latest") return 1000;
  if (id === "gemini-flash-lite-latest") return 990;

  // Trích xuất số phiên bản (ví dụ 3.8, 3.6, 3.5, 2.5...)
  const verMatch = id.match(/gemini-(\d+(?:\.\d+)?)/);
  if (verMatch) {
    score += parseFloat(verMatch[1]) * 100;
  }

  // Ưu tiên bản ổn định hơn bản preview/exp
  if (id.includes("preview") || id.includes("exp")) {
    score -= 15;
  }

  // Ưu tiên dòng flash-lite và flash vì tốc độ phản hồi phụ đề nhanh & quota free cao
  if (id.includes("flash-lite")) {
    score += 10;
  } else if (id.includes("flash")) {
    score += 20;
  }

  // Tránh các bản snapshot ngày tháng cũ (ví dụ -001, -2025...) nếu đã có alias chính
  if (/\d{4,}/.test(id)) {
    score -= 25;
  }

  return score;
}

// Tự động hỏi Google API danh sách các model mà API Key này được phép dùng
async function discoverFreeModels(apiKey) {
  if (discoveredModelsByKey.has(apiKey)) {
    return discoveredModelsByKey.get(apiKey);
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
    );
    if (!res.ok) {
      return FALLBACK_FREE_MODELS;
    }
    const data = await res.json();
    const models = Array.isArray(data?.models) ? data.models : [];

    const scored = [];
    for (const m of models) {
      const methods = m.supportedGenerationMethods || [];
      if (!methods.includes("generateContent")) continue;
      const id = (m.name || "").replace(/^models\//, "");
      const s = scoreFreeModel(id);
      if (s > 0) {
        scored.push({ id, score: s });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const list = scored.map((x) => x.id);

    // Gộp thêm danh sách dự phòng nếu chưa có
    for (const fb of FALLBACK_FREE_MODELS) {
      if (!list.includes(fb)) list.push(fb);
    }

    const finalModels = list.length > 0 ? list : FALLBACK_FREE_MODELS;
    discoveredModelsByKey.set(apiKey, finalModels);
    return finalModels;
  } catch {
    return FALLBACK_FREE_MODELS;
  }
}

async function translateWithAutoModel({ text, videoTitle, history, apiKey, preferredModel }) {
  // Nếu người dùng chọn cố định 1 model cụ thể (không phải "auto")
  if (preferredModel && preferredModel !== "auto") {
    const vi = await callGeminiModel({
      text,
      videoTitle,
      history,
      apiKey,
      model: preferredModel
    });
    return { vi, modelUsed: preferredModel };
  }

  // Chế độ "auto": thử model đã biết là hoạt động tốt trước tiên
  const candidates = await discoverFreeModels(apiKey);
  const currentActive = activeModelByKey.get(apiKey);

  const ordered = [];
  if (currentActive && !isModelInCooldown(currentActive)) {
    ordered.push(currentActive);
  }
  for (const c of candidates) {
    if (!ordered.includes(c) && !isModelInCooldown(c)) {
      ordered.push(c);
    }
  }
  // Nếu tất cả đều đang cooldown thì thử lại từ đầu
  if (ordered.length === 0) {
    ordered.push(...candidates.slice(0, 4));
  }

  let lastError = null;
  // Thử tối đa 4 model ứng viên tốt nhất để tìm model có free quota hoạt động
  for (const candidate of ordered.slice(0, 4)) {
    try {
      const vi = await callGeminiModel({
        text,
        videoTitle,
        history,
        apiKey,
        model: candidate
      });
      activeModelByKey.set(apiKey, candidate);
      // Lưu tên model đang chạy vào storage để hiển thị trên UI nếu cần
      chrome.storage.local.set({ detectedModel: candidate });
      return { vi, modelUsed: candidate };
    } catch (err) {
      lastError = err;
      const status = err.status || 0;
      // Nếu lỗi 401/403 do sai API Key thì dừng ngay không thử model khác
      if (status === 401 || status === 403 || /API_KEY_INVALID|invalid api key/i.test(err.message)) {
        throw err;
      }
      // Nếu model bị khai tử (404) -> khóa lâu, nếu hết quota (429) -> khóa tạm 90s rồi tự nhảy sang model free tiếp theo
      if (status === 404) {
        markModelCooldown(candidate, 24 * 60 * 60 * 1000);
      } else {
        markModelCooldown(candidate, 90 * 1000);
      }
    }
  }

  throw lastError || new Error("Không tìm thấy model Gemini miễn phí khả dụng cho API Key này.");
}

async function handleTranslate(rawText, videoTitle, tabId) {
  const cleanText = (rawText || "").replace(/\s+/g, " ").trim();
  if (!cleanText) return { vi: "" };

  const settings = await chrome.storage.local.get({
    provider: "gemini",
    apiKey: "",
    model: DEFAULT_MODEL,
    fallbackToFree: true
  });

  const cacheKey = `${settings.provider}:${settings.model}:${cleanText}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return { vi: cached, cached: true };
  }

  if (inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey);
  }

  const task = (async () => {
    try {
      if (settings.provider === "gtx") {
        const vi = await translateWithGoogleFree(cleanText);
        if (vi) setCached(cacheKey, vi);
        return { vi, provider: "gtx" };
      }

      const apiKey = (settings.apiKey || "").trim();
      if (!apiKey) {
        if (settings.fallbackToFree) {
          const vi = await translateWithGoogleFree(cleanText);
          if (vi) setCached(`gtx::${cleanText}`, vi);
          return { vi, provider: "gtx" };
        }
        return { error: "Chưa nhập Google Gemini API Key trong Cài đặt" };
      }

      const ctx = getTabContext(tabId, videoTitle);
      try {
        const { vi, modelUsed } = await translateWithAutoModel({
          text: cleanText,
          videoTitle,
          history: ctx.items,
          apiKey,
          preferredModel: settings.model || DEFAULT_MODEL
        });

        if (vi) {
          setCached(cacheKey, vi);
          pushTabContext(tabId, videoTitle, cleanText, vi);
        }
        return { vi, provider: "gemini", modelUsed };
      } catch (geminiErr) {
        if (settings.fallbackToFree) {
          const vi = await translateWithGoogleFree(cleanText);
          if (vi) {
            pushTabContext(tabId, videoTitle, cleanText, vi);
            return { vi, provider: "gtx", warning: geminiErr.message };
          }
        }
        return { error: geminiErr.message || "Lỗi gọi Gemini API" };
      }
    } finally {
      inFlight.delete(cacheKey);
    }
  })();

  inFlight.set(cacheKey, task);
  return task;
}

async function callGeminiModel({ text, videoTitle, history, apiKey, model }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
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
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 200
        }
      }
    : {
        systemInstruction: {
          parts: [{ text: systemText }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: fullUserText }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 200
        }
      };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const apiMsg = data?.error?.message || `HTTP ${res.status}`;
    const err = new Error(`[${model}] ${apiMsg}`);
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

async function testAndDetectModel(apiKey, preferredModel = "auto") {
  const trimmedKey = (apiKey || "").trim();
  if (!trimmedKey) {
    return { ok: false, error: "Vui lòng nhập Gemini API Key trước khi kiểm tra." };
  }

  // Xóa cache model cũ của key này để dò lại mới nhất
  discoveredModelsByKey.delete(trimmedKey);
  activeModelByKey.delete(trimmedKey);
  cooldownModels.clear();

  const models = await discoverFreeModels(trimmedKey);
  const { vi, modelUsed } = await translateWithAutoModel({
    text: "Hello everyone, welcome back to my channel!",
    videoTitle: "Tech Review",
    history: [],
    apiKey: trimmedKey,
    preferredModel: preferredModel || "auto"
  });

  return {
    ok: true,
    sample: vi,
    modelUsed,
    availableModels: models.slice(0, 8)
  };
}