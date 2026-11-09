const MAX_CACHE_SIZE = 800;
const MAX_CONTEXT_ITEMS = 8;

const cache = new Map();
const inFlight = new Map();
const contextByTab = new Map();

// Lưu danh sách model và model đang hoạt động tốt nhất theo từng API key
const discoveredModelsByKey = new Map();
const activeRouteByKey = new Map(); // apiKey -> { model, endpointType }
const cooldownModels = new Map(); // `${apiKey}:${model}` -> timestamp

const LANGUAGE_NAMES = {
  vi: "Tiếng Việt",
  en: "Tiếng Anh (English)",
  fr: "Tiếng Pháp (Français)",
  ja: "Tiếng Nhật (日本語)",
  ko: "Tiếng Hàn (한국어)",
  "zh-CN": "Tiếng Trung Giản thể (简体中文)",
  "zh-TW": "Tiếng Trung Phồn thể (繁體中文)",
  de: "Tiếng Đức (Deutsch)",
  es: "Tiếng Tây Ban Nha (Español)",
  ru: "Tiếng Nga (Русский)",
  th: "Tiếng Thái (ไทย)"
};

const STYLE_INSTRUCTIONS = {
  natural:
    "Phong cách tự nhiên, đời thường, trôi chảy, đúng ngữ cảnh hội thoại và ngôi xưng hô (anh/em, tôi/bạn, mình/cậu, chú/bác, thầy/trò, mày/tao...).",
  cinema:
    "Phong cách phụ đề điện ảnh / Netflix chuyên nghiệp: câu từ cô đọng, súc tích, giàu cảm xúc, giàu nhịp điệu, truyền tải trọn vẹn thần thái nhân vật.",
  academic:
    "Phong cách học thuật & chuyên ngành: dịch chuẩn xác các thuật ngữ khoa học, kỹ thuật, lập trình, y sinh, kinh tế; văn phong rõ ràng, mạch lạc.",
  genz:
    "Phong cách trẻ trung, hài hước, năng động (GenZ / Vlog / Gaming): dùng từ ngữ tự nhiên, bắt trend hợp ngữ cảnh nhưng vẫn giữ chuẩn ý nghĩa câu gốc.",
  literal:
    "Phong cách dịch sát nghĩa và cấu trúc câu gốc (hỗ trợ người học ngoại ngữ đối chiếu từ vựng và ngữ pháp dễ dàng)."
};

// Quy tắc dịch nguyên văn kể cả tiếng lóng, chửi thề trong phim/video
const TRANSLATION_STYLE_RULE =
  " Đây là công việc biên dịch phụ đề nguyên văn: nếu câu gốc có tiếng lóng, từ cảm thán hoặc từ chửi thề (fuck, shit, damn, bitch, ass, hell...), BẮT BUỘC dịch thẳng sang từ tương đương tự nhiên (đệch, mẹ kiếp, chết tiệt, khốn kiếp, vãi, đéo, má...), TUYỆT ĐỐI KHÔNG kiểm duyệt, không làm nhẹ, không dùng dấu *** và không bao giờ từ chối dịch.";

function looksLikeRefusal(text) {
  const s = (text || "").trim();
  if (!s) return true;
  return /^(tôi không thể|tôi xin lỗi|xin lỗi,? tôi|sorry,? i can'?t|i cannot (translate|fulfill|assist)|i apologize|as an ai)/i.test(
    s
  );
}

// Các câu ảo giác (hallucination) phổ biến của Whisper khi đoạn âm thanh chỉ có tiếng nhạc hoặc im lặng
function isAudioHallucination(text) {
  const s = (text || "").trim().toLowerCase();
  if (!s || s.length < 2) return true;
  const hallucinations = [
    "silence",
    "thank you.",
    "thank you for watching.",
    "thanks for watching.",
    "subtitles by",
    "amara.org",
    "hãy subscribe",
    "ghiền mì gõ",
    "la la la",
    "you",
    ".",
    "..."
  ];
  return hallucinations.includes(s) || /^[\s.,!?;:\-♪♫*]+$/.test(s);
}

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

  if (msg.type === "TRANSCRIBE_AUDIO") {
    const tabId = sender.tab?.id ?? "global";
    handleTranscribeAudio(msg.audioBase64, msg.mimeType, msg.videoTitle || "", tabId)
      .then(sendResponse)
      .catch(() => sendResponse({ orig: "", vi: "" }));
    return true;
  }

  if (msg.type === "SEARCH_SONG_LYRICS") {
    const tabId = sender.tab?.id ?? "global";
    handleSearchSongLyrics(msg, tabId)
      .then(sendResponse)
      .catch(() => sendResponse({ found: false }));
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
  const key = `${(apiKey || "").slice(-10)}:${modelId}`;
  const until = cooldownModels.get(key);
  if (!until) return false;
  if (Date.now() > until) {
    cooldownModels.delete(key);
    return false;
  }
  return true;
}

function markModelCooldown(apiKey, modelId, durationMs = 180_000) {
  const key = `${(apiKey || "").slice(-10)}:${modelId}`;
  cooldownModels.set(key, Date.now() + durationMs);
  const currentActive = activeRouteByKey.get(apiKey);
  if (currentActive && currentActive.model === modelId) {
    activeRouteByKey.delete(apiKey);
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 3600) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function buildOrderedCandidates(candidates, apiKey, preferredModel, savedModel) {
  const ordered = [];
  const add = (m) => {
    if (m && !ordered.includes(m) && !isModelInCooldown(apiKey, m)) {
      ordered.push(m);
    }
  };

  // Ưu tiên model đang chạy mượt gần nhất (savedModel) nếu người dùng để chế độ auto
  if (savedModel && (!preferredModel || preferredModel === "auto")) {
    add(savedModel);
  }

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

  // Nếu tất cả đều đang trong thời gian hồi (cooldown), giải phóng cooldown để thử lại
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

function buildSystemPrompt({ targetLang = "vi", translationStyle = "natural", isBatch = false, softenProfanity = true }) {
  const langLabel = LANGUAGE_NAMES[targetLang] || targetLang;
  const styleDesc = STYLE_INSTRUCTIONS[translationStyle] || STYLE_INSTRUCTIONS.natural;

  const profanityRule = softenProfanity
    ? " CHẾ ĐỘ THÂN THIỆN (Family-friendly) ĐANG BẬT: nếu câu gốc có từ nói tục, chửi thề hoặc nhạy cảm (fuck, shit, damn, bitch, ass...), hãy CHỦ ĐỘNG GIẢM NHẸ TÌNH TIẾT và LÀM MỀM NGÔN TỪ, thay bằng các từ ngữ biểu cảm nhẹ nhàng, lịch sự và văn minh (ví dụ: 'chết tiệt', 'trời đất ơi', 'quái quỷ', 'bực thật', 'khốn khổ'). TUYỆT ĐỐI KHÔNG bỏ sót câu, KHÔNG từ chối dịch, giữ trọn vẹn ý nghĩa và ngữ cảnh câu chuyện."
    : " CHẾ ĐỘ NGUYÊN VĂN ĐANG BẬT: nếu câu gốc có tiếng lóng, từ cảm thán hoặc từ chửi thề (fuck, shit, damn, bitch, ass...), BẮT BUỘC dịch thẳng sang từ tương đương tự nhiên theo văn phong đời thường (đệch, mẹ kiếp, chết tiệt, vãi...), TUYỆT ĐỐI KHÔNG kiểm duyệt, không bỏ sót và không từ chối dịch.";

  if (isBatch) {
    return (
      `Bạn là biên dịch viên phụ đề video chuyên nghiệp sang ${langLabel}. ` +
      `Hãy dịch từng câu được đánh số [1], [2]... sang ${langLabel}. ${styleDesc} ` +
      `BẮT BUỘC giữ nguyên định dạng đánh số [1], [2]... trên từng dòng tương ứng, không giải thích thêm. ` +
      profanityRule
    );
  }

  return (
    `Bạn là biên dịch viên phụ đề video chuyên nghiệp sang ${langLabel}. ` +
    `Hãy dịch câu thoại sang ${langLabel} ngắn gọn, dễ đọc trên màn hình. ${styleDesc} ` +
    `Chỉ trả về duy nhất câu ${langLabel} đã dịch, không giải thích, không suy nghĩ dài dòng, không thêm dấu ngoặc kép. ` +
    profanityRule
  );
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

async function callGroqModel({
  text,
  texts,
  videoTitle,
  history,
  apiKey,
  model,
  targetLang = "vi",
  translationStyle = "natural",
  softenProfanity = true
}) {
  let contextPrompt = "";
  if (videoTitle) {
    contextPrompt += `Tiêu đề video: "${videoTitle}".\n`;
  }
  if (history && history.length > 0) {
    const recentLines = history
      .slice(-6)
      .map((item) => `- "${item.src}" -> "${item.vi}"`)
      .join("\n");
    contextPrompt += `Các câu thoại trước đó để giữ mạch xưng hô:\n${recentLines}\n`;
  }

  const isBatch = Array.isArray(texts) && texts.length > 0;
  const systemText = buildSystemPrompt({ targetLang, translationStyle, isBatch, softenProfanity });

  const userContent = isBatch
    ? `${contextPrompt}\nDịch các câu phụ đề sau:\n${texts
        .map((t, idx) => `[${idx + 1}] ${t}`)
        .join("\n")}`
    : contextPrompt
    ? `${contextPrompt}\nDịch câu tiếp theo:\n${text}`
    : text;

  const timeoutMs = isBatch ? 7000 : 3400;
  const res = await fetchWithTimeout(
    "https://api.groq.com/openai/v1/chat/completions",
    {
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
        max_tokens: isBatch ? Math.min(1200, texts.length * 140) : 200
      })
    },
    timeoutMs
  );

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
  if (!out || (!isBatch && looksLikeRefusal(out))) {
    const err = new Error(`[${model}] Model từ chối/bỏ trống do nội dung nhạy cảm`);
    err.status = 200;
    err.refused = true;
    throw err;
  }

  if (isBatch) {
    return parseNumberedBatchOutput(out, texts.length);
  }
  return out.replace(/^["“”']+|["“”']+$/g, "").trim();
}

async function translateWithGroqAuto({
  text,
  texts,
  videoTitle,
  history,
  apiKey,
  preferredModel,
  targetLang = "vi",
  translationStyle = "natural",
  softenProfanity = true
}) {
  const candidates = await discoverGroqModels(apiKey);
  const savedRoute = activeRouteByKey.get(apiKey);
  const ordered = buildOrderedCandidates(candidates, apiKey, preferredModel, savedRoute?.model);

  let lastError = null;
  for (const candidate of ordered.slice(0, 7)) {
    try {
      const out = await callGroqModel({
        text,
        texts,
        videoTitle,
        history,
        apiKey,
        model: candidate,
        targetLang,
        translationStyle,
        softenProfanity
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

      if (err.refused) continue;

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
      } else if (
        status === 429 ||
        msg.includes("quota") ||
        msg.includes("rate limit") ||
        msg.includes("resource_exhausted")
      ) {
        markModelCooldown(apiKey, candidate, 3 * 60 * 1000);
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
    const res = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      {},
      3000
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

const GEMINI_SAFETY_OFF = [
  "HARM_CATEGORY_HARASSMENT",
  "HARM_CATEGORY_HATE_SPEECH",
  "HARM_CATEGORY_SEXUALLY_EXPLICIT",
  "HARM_CATEGORY_DANGEROUS_CONTENT",
  "HARM_CATEGORY_CIVIC_INTEGRITY"
].map((category) => ({ category, threshold: "BLOCK_NONE" }));

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
      safetySettings: GEMINI_SAFETY_OFF,
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
    safetySettings: GEMINI_SAFETY_OFF,
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
  endpointType,
  targetLang = "vi",
  translationStyle = "natural",
  softenProfanity = true
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
      .slice(-6)
      .map((item) => `- "${item.src}" -> "${item.vi}"`)
      .join("\n");
    contextPrompt += `Các câu thoại trước đó để giữ mạch xưng hô:\n${recentLines}\n`;
  }

  const isBatch = Array.isArray(texts) && texts.length > 0;
  const systemText = buildSystemPrompt({ targetLang, translationStyle, isBatch, softenProfanity });

  const fullUserText = isBatch
    ? `${contextPrompt}\nDịch các câu phụ đề sau:\n${texts
        .map((t, idx) => `[${idx + 1}] ${t}`)
        .join("\n")}`
    : contextPrompt
    ? `${contextPrompt}\nDịch câu tiếp theo:\n${text}`
    : text;

  const maxTokens = isBatch ? Math.min(1200, texts.length * 140) : 200;
  const timeoutMs = isBatch ? 7000 : 3400;

  let requestBody = buildGeminiBody({
    systemText,
    fullUserText,
    model,
    maxTokens,
    useThinkingZero: true
  });

  let res = await fetchWithTimeout(
    endpoint,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    },
    timeoutMs
  );

  if (res.status === 400 && requestBody.generationConfig?.thinkingConfig) {
    requestBody = buildGeminiBody({
      systemText,
      fullUserText,
      model,
      maxTokens,
      useThinkingZero: false
    });
    res = await fetchWithTimeout(
      endpoint,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      },
      timeoutMs
    );
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

  if (!out || (!isBatch && looksLikeRefusal(out))) {
    const blocked =
      data?.promptFeedback?.blockReason ||
      ["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "RECITATION"].includes(
        data?.candidates?.[0]?.finishReason
      ) ||
      Boolean(out);
    const err = new Error(
      blocked
        ? `[${model}] Gemini chặn câu này do nội dung nhạy cảm`
        : `[${model}] Phản hồi rỗng từ Gemini API`
    );
    err.status = 500;
    err.refused = Boolean(blocked);
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
  preferredModel,
  targetLang = "vi",
  translationStyle = "natural",
  softenProfanity = true
}) {
  const isVertexKey = apiKey.startsWith("AQ.");
  const candidates = isVertexKey ? FALLBACK_GEMINI_MODELS : await discoverGeminiModels(apiKey);
  const savedRoute = activeRouteByKey.get(apiKey);

  const endpointTypes = isVertexKey
    ? savedRoute?.endpointType === "aistudio"
      ? ["aistudio", "vertex"]
      : ["vertex", "aistudio"]
    : ["aistudio"];

  const ordered = buildOrderedCandidates(candidates, apiKey, preferredModel, savedRoute?.model);

  let lastError = null;
  for (const endpointType of endpointTypes) {
    for (const candidate of ordered.slice(0, 7)) {
      try {
        const out = await callGeminiEndpoint({
          text,
          texts,
          videoTitle,
          history,
          apiKey,
          model: candidate,
          endpointType,
          targetLang,
          translationStyle,
          softenProfanity
        });
        activeRouteByKey.set(apiKey, { model: candidate, endpointType });
        chrome.storage.local.set({ detectedModel: candidate, availableModels: candidates });
        if (Array.isArray(texts) && texts.length > 0) {
          return { translations: out, modelUsed: candidate };
        }
        return { vi: out, modelUsed: candidate };
      } catch (err) {
        const status = err.status || 0;
        const msg = (err.message || "").toLowerCase();

        // Không ghi đè lỗi chi tiết của endpoint chính bằng lỗi "API key not valid" của endpoint phụ
        if (!lastError || !msg.includes("api key not valid")) {
          lastError = err;
        }

        if (err.refused) continue;

        // Lỗi cấp độ API Key / Google Cloud Project chưa bật API -> ngắt luôn vòng lặp endpoint này, không phạt model
        if (
          status === 401 ||
          status === 403 ||
          msg.includes("api key not valid") ||
          msg.includes("has not been used in project") ||
          msg.includes("is disabled") ||
          msg.includes("permission_denied")
        ) {
          break;
        }

        if (status === 404 || status === 400 || msg.includes("not found")) {
          markModelCooldown(apiKey, candidate, 24 * 60 * 60 * 1000);
        } else if (
          status === 429 ||
          status === 503 ||
          msg.includes("quota") ||
          msg.includes("rate") ||
          msg.includes("exhausted")
        ) {
          markModelCooldown(apiKey, candidate, 3 * 60 * 1000);
        } else {
          markModelCooldown(apiKey, candidate, 45 * 1000);
        }
      }
    }
  }

  if (lastError) {
    const rawMsg = lastError.message || "";
    const urlMatch = rawMsg.match(/https:\/\/console\.developers\.google\.com\/[^\s]+/);
    if (rawMsg.includes("has not been used in project") || rawMsg.includes("is disabled")) {
      const enableUrl =
        urlMatch?.[0] || "https://console.cloud.google.com/apis/library/aiplatform.googleapis.com";
      throw new Error(
        `Project Google Cloud chứa Key này chưa bật API. Hãy mở link sau và bấm "ENABLE" (Bật), đợi 1 phút rồi thử lại: ${enableUrl} — HOẶC lấy Key chuẩn (AIza...) tại https://aistudio.google.com/apikey`
      );
    }
    throw lastError;
  }

  throw new Error("Không tìm thấy model Gemini khả dụng cho API Key này.");
}

// ============================================================================
// 3. ĐIỀU PHỐI DỊCH CHÍNH, ĐA NGÔN NGỮ SONG NGỮ & DỊCH HÀNG LOẠT
// ============================================================================

async function getActiveConfig() {
  const settings = await chrome.storage.local.get({
    provider: "gemini",
    apiKey: "",
    groqApiKey: "",
    geminiApiKey: "",
    model: "auto",
    fallbackToFree: true,
    targetLang: "vi",
    secondaryLang: "orig",
    translationStyle: "natural",
    softenProfanity: true
  });

  const groqKey =
    (settings.groqApiKey || "").trim() ||
    ((settings.apiKey || "").trim().startsWith("gsk_") ? settings.apiKey.trim() : "");
  const geminiKey =
    (settings.geminiApiKey || "").trim() ||
    ((settings.apiKey || "").trim().startsWith("AIza") ||
    (settings.apiKey || "").trim().startsWith("AQ.")
      ? settings.apiKey.trim()
      : "");

  let rawKey = (settings.apiKey || "").trim();
  if (settings.provider === "groq" && groqKey) {
    rawKey = groqKey;
  } else if (settings.provider === "gemini" && geminiKey) {
    rawKey = geminiKey;
  }

  const effectiveProvider =
    settings.provider === "gtx" ? "gtx" : resolveProvider(rawKey, settings.provider);

  return { settings, rawKey, groqKey, geminiKey, effectiveProvider };
}

async function resolveSecondaryTranslation(cleanText, secondaryLang, targetLang) {
  if (!secondaryLang || secondaryLang === "orig" || secondaryLang === "none") {
    return "";
  }
  if (secondaryLang === targetLang) return "";
  const sub2CacheKey = `gtx:${secondaryLang}:${cleanText}`;
  const cachedSub2 = getCached(sub2CacheKey);
  if (cachedSub2) return cachedSub2;
  try {
    const sub2 = await translateWithGoogleFree(cleanText, secondaryLang);
    if (sub2) setCached(sub2CacheKey, sub2);
    return sub2;
  } catch {
    return "";
  }
}

async function handleTranslate(rawText, videoTitle, tabId, fastPreviewOnly = false) {
  const cleanText = (rawText || "").replace(/\s+/g, " ").trim();
  if (!cleanText) return { vi: "" };

  const { settings, rawKey, groqKey, geminiKey, effectiveProvider } = await getActiveConfig();
  const targetLang = settings.targetLang || "vi";
  const secondaryLang = settings.secondaryLang || "orig";
  const translationStyle = settings.translationStyle || "natural";
  const softenProfanity = settings.softenProfanity !== false;

  const modeKey = softenProfanity ? "soft" : "raw";
  const targetProvider = fastPreviewOnly ? "gtx" : effectiveProvider;
  const cacheKey = `${targetProvider}:${targetLang}:${translationStyle}:${modeKey}:${cleanText}`;

  const cached = getCached(cacheKey);
  if (cached) {
    const sub2 = await resolveSecondaryTranslation(cleanText, secondaryLang, targetLang);
    return { vi: cached, sub2, provider: targetProvider, cached: true };
  }

  if (inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey);
  }

  const task = (async () => {
    try {
      const sub2Promise = resolveSecondaryTranslation(cleanText, secondaryLang, targetLang);

      if (targetProvider === "gtx" || !rawKey) {
        const [vi, sub2] = await Promise.all([
          translateWithGoogleFree(cleanText, targetLang),
          sub2Promise
        ]);
        if (vi) setCached(`gtx:${targetLang}:natural:${cleanText}`, vi);
        return { vi, sub2, provider: "gtx" };
      }

      const ctx = getTabContext(tabId, videoTitle);
      try {
        const [result, sub2] = await Promise.all([
          targetProvider === "groq"
            ? translateWithGroqAuto({
                text: cleanText,
                videoTitle,
                history: ctx.items,
                apiKey: rawKey,
                preferredModel: settings.model || "auto",
                targetLang,
                translationStyle,
                softenProfanity
              })
            : translateWithGeminiAuto({
                text: cleanText,
                videoTitle,
                history: ctx.items,
                apiKey: rawKey,
                preferredModel: settings.model || "auto",
                targetLang,
                translationStyle,
                softenProfanity
              }),
          sub2Promise
        ]);

        if (result.vi) {
          setCached(cacheKey, result.vi);
          pushTabContext(tabId, videoTitle, cleanText, result.vi);
        }
        return { vi: result.vi, sub2, provider: targetProvider, modelUsed: result.modelUsed };
      } catch {
        // Âm thầm chuyển sang nhà cung cấp AI còn lại nếu người dùng có lưu cả 2 Key (Gemini <-> Groq)
        const backupProvider = targetProvider === "gemini" ? "groq" : "gemini";
        const backupKey = backupProvider === "groq" ? groqKey : geminiKey;
        if (backupKey) {
          try {
            const [backupRes, sub2] = await Promise.all([
              backupProvider === "groq"
                ? translateWithGroqAuto({
                    text: cleanText,
                    videoTitle,
                    history: ctx.items,
                    apiKey: backupKey,
                    preferredModel: "auto",
                    targetLang,
                    translationStyle,
                    softenProfanity
                  })
                : translateWithGeminiAuto({
                    text: cleanText,
                    videoTitle,
                    history: ctx.items,
                    apiKey: backupKey,
                    preferredModel: "auto",
                    targetLang,
                    translationStyle,
                    softenProfanity
                  }),
              sub2Promise
            ]);
            if (backupRes?.vi) {
              setCached(cacheKey, backupRes.vi);
              pushTabContext(tabId, videoTitle, cleanText, backupRes.vi);
              return {
                vi: backupRes.vi,
                sub2,
                provider: backupProvider,
                modelUsed: backupRes.modelUsed
              };
            }
          } catch {
            // Tiếp tục chuyển êm sang Google Translate Free bên dưới
          }
        }

        // Luôn âm thầm dự phòng qua Google Translate Free để không bao giờ hiện thông báo lỗi đỏ che video
        try {
          const [vi, sub2] = await Promise.all([
            translateWithGoogleFree(cleanText, targetLang),
            sub2Promise
          ]);
          if (vi) {
            setCached(`gtx:${targetLang}:natural:${cleanText}`, vi);
            pushTabContext(tabId, videoTitle, cleanText, vi);
            return { vi, sub2, provider: "gtx" };
          }
        } catch {
          // Bỏ qua
        }
        return { vi: "" };
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
  ).slice(0, 12);

  if (cleanList.length === 0) return { results: {} };

  const { settings, rawKey, groqKey, geminiKey, effectiveProvider } = await getActiveConfig();
  const targetLang = settings.targetLang || "vi";
  const translationStyle = settings.translationStyle || "natural";
  const softenProfanity = settings.softenProfanity !== false;

  const modeKey = softenProfanity ? "soft" : "raw";
  const results = {};
  const uncached = [];

  for (const text of cleanList) {
    const cached =
      getCached(`${effectiveProvider}:${targetLang}:${translationStyle}:${modeKey}:${text}`) ||
      getCached(`gtx:${targetLang}:natural:${text}`);
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
          const vi = await translateWithGoogleFree(t, targetLang);
          if (vi) {
            setCached(`gtx:${targetLang}:natural:${t}`, vi);
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
            preferredModel: settings.model || "auto",
            targetLang,
            translationStyle,
            softenProfanity
          })
        : await translateWithGeminiAuto({
            texts: uncached,
            videoTitle,
            history: ctx.items,
            apiKey: rawKey,
            preferredModel: settings.model || "auto",
            targetLang,
            translationStyle,
            softenProfanity
          });

    const translations = batchRes.translations || [];
    for (let i = 0; i < uncached.length; i++) {
      const src = uncached[i];
      const vi = (translations[i] || "").trim();
      if (vi) {
        setCached(`${effectiveProvider}:${targetLang}:${translationStyle}:${modeKey}:${src}`, vi);
        pushTabContext(tabId, videoTitle, src, vi);
        results[src] = vi;
      }
    }
    return { results, provider: effectiveProvider, modelUsed: batchRes.modelUsed };
  } catch {
    // Âm thầm thử nhà cung cấp AI dự phòng nếu có
    const backupProvider = effectiveProvider === "gemini" ? "groq" : "gemini";
    const backupKey = backupProvider === "groq" ? groqKey : geminiKey;
    if (backupKey) {
      try {
        const backupBatch =
          backupProvider === "groq"
            ? await translateWithGroqAuto({
                texts: uncached,
                videoTitle,
                history: ctx.items,
                apiKey: backupKey,
                preferredModel: "auto",
                targetLang,
                translationStyle,
                softenProfanity
              })
            : await translateWithGeminiAuto({
                texts: uncached,
                videoTitle,
                history: ctx.items,
                apiKey: backupKey,
                preferredModel: "auto",
                targetLang,
                translationStyle,
                softenProfanity
              });
        const translations = backupBatch.translations || [];
        for (let i = 0; i < uncached.length; i++) {
          const src = uncached[i];
          const vi = (translations[i] || "").trim();
          if (vi) {
            setCached(`${effectiveProvider}:${targetLang}:${translationStyle}:${modeKey}:${src}`, vi);
            pushTabContext(tabId, videoTitle, src, vi);
            results[src] = vi;
          }
        }
        return { results, provider: backupProvider, modelUsed: backupBatch.modelUsed };
      } catch {
        // Tiếp tục rơi êm về Google Translate Free
      }
    }

    await Promise.all(
      uncached.map(async (t) => {
        try {
          const vi = await translateWithGoogleFree(t, targetLang);
          if (vi) {
            setCached(`gtx:${targetLang}:natural:${t}`, vi);
            results[t] = vi;
          }
        } catch {
          // Bỏ qua
        }
      })
    );
    return { results, provider: "gtx" };
  }
}

// ============================================================================
// 4. TÌM LYRICS BÀI HÁT TRÊN MẠNG (LRCLIB LRC + AI) & AI LIVE AUDIO (WHISPER / GEMINI)
// ============================================================================

const songLyricsCache = new Map(); // queryKey -> { found, synced, cues, plainLyrics, trackName, artistName }
const tabLyricsContext = new Map(); // tabId -> { videoTitle, plainLyrics }

function cleanSongTitleForLyrics(rawTitle, channelName = "") {
  let s = (rawTitle || "").trim();
  if (!s) return { primary: "", secondary: "" };

  // Xóa các thẻ ngoặc chứa từ khóa rác phổ biến trên YouTube MV
  const noiseBracketRegex =
    /[\(\[\{【][^)\]\}】]*\b(official|music\s*video|m\/v|mv|lyric|lyrics|audio|visualizer|live|performance|vietsub|engsub|sub|karaoke|hd|4k|hq|remaster|remastered|prod\.?|ost|soundtrack|ver\.?|version|full|clip|video|color\s*coded|pinyin|romaji|han|eng|vi)\b[^)\]\}】]*[\)\]\}】]/gi;
  s = s.replace(noiseBracketRegex, " ");

  // Xóa hashtag, hậu tố sau dấu | hoặc //
  s = s
    .replace(/#\S+/g, " ")
    .replace(/\s+[\|｜\/]{1,2}\s+.*$/, " ")
    .replace(/\b(official\s+music\s+video|official\s+video|official\s+mv|official\s+audio|lyrics?\s+video|m\/v)\b/gi, " ")
    .replace(/\b(ft\.?|feat\.?|featuring)\s+[^-\(\[\|]+/gi, " ")
    .replace(/[“”"''`´]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const cleanChannel = (channelName || "")
    .replace(/\b(official|vevo|topic|music|records|entertainment|channel)\b/gi, "")
    .replace(/\s*-\s*topic$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  let secondary = "";
  if (s.includes(" - ")) {
    const parts = s
      .split(" - ")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      secondary = `${parts[0]} ${parts[1]}`.replace(/\s+/g, " ").trim();
    }
  } else if (cleanChannel && !s.toLowerCase().includes(cleanChannel.toLowerCase())) {
    secondary = `${cleanChannel} ${s}`.trim();
  }

  return { primary: s, secondary };
}

function parseSyncedLrcToCues(lrcText) {
  if (!lrcText || typeof lrcText !== "string") return [];
  const lines = lrcText.split(/\r?\n/);
  const rawCues = [];
  const timeRegex = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

  for (const line of lines) {
    timeRegex.lastIndex = 0;
    const times = [];
    let match;
    while ((match = timeRegex.exec(line)) !== null) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const fracRaw = match[3] || "0";
      const frac = parseInt(fracRaw.padEnd(3, "0").slice(0, 3), 10) / 1000;
      times.push(min * 60 + sec + frac);
    }
    if (!times.length) continue;

    const text = line
      .replace(/\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\]/g, "")
      .replace(/^[\s♪♫♬〜~\-]+|[\s♪♫♬〜~\-]+$/g, "")
      .trim();

    if (!text || /^(instrumental|intro|outro|music)$/i.test(text)) continue;

    for (const t of times) {
      rawCues.push({ start: t, text });
    }
  }

  rawCues.sort((a, b) => a.start - b.start);

  const cues = [];
  for (let i = 0; i < rawCues.length; i++) {
    const cur = rawCues[i];
    const next = rawCues[i + 1];
    const end = next ? Math.min(next.start, cur.start + 7.0) : cur.start + 5.0;
    if (end > cur.start + 0.15) {
      cues.push({ start: cur.start, end, text: cur.text });
    }
  }
  return cues;
}

async function searchLrclibCandidates(query) {
  if (!query || query.length < 2) return [];
  try {
    const url = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
    const res = await fetchWithTimeout(url, {}, 3500);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function handleSearchSongLyrics(msg, tabId) {
  const rawTitle = (msg.videoTitle || "").trim();
  const channelName = (msg.channelName || "").trim();
  const duration = Number(msg.duration) || 0;
  if (!rawTitle) return { found: false };

  const cacheKey = `${rawTitle.toLowerCase()}::${Math.round(duration / 5)}`;
  if (songLyricsCache.has(cacheKey)) {
    const cached = songLyricsCache.get(cacheKey);
    if (cached.plainLyrics) {
      tabLyricsContext.set(tabId, { videoTitle: rawTitle, plainLyrics: cached.plainLyrics });
    }
    return cached;
  }

  const { primary, secondary } = cleanSongTitleForLyrics(rawTitle, channelName);
  let candidates = await searchLrclibCandidates(primary);
  if (candidates.length === 0 && secondary && secondary !== primary) {
    candidates = await searchLrclibCandidates(secondary);
  }

  let bestSynced = null;
  let bestSyncedScore = -9999;
  let bestPlain = null;

  for (const item of candidates) {
    if (!item || item.instrumental) continue;
    if (!bestPlain && item.plainLyrics) {
      bestPlain = item;
    }
    if (item.syncedLyrics) {
      let score = 1000;
      if (duration > 20 && item.duration > 20) {
        const diff = Math.abs(item.duration - duration);
        if (diff <= 3) score += 350;
        else if (diff <= 8) score += 200;
        else if (diff <= 18) score += 80;
        else if (diff > 40) score -= 450;
      }
      if (score > bestSyncedScore) {
        bestSyncedScore = score;
        bestSynced = item;
      }
    }
  }

  if (bestSynced && bestSyncedScore >= 700) {
    const cues = parseSyncedLrcToCues(bestSynced.syncedLyrics);
    if (cues.length >= 4) {
      const plain = bestSynced.plainLyrics || cues.map((c) => c.text).join("\n");
      const out = {
        found: true,
        synced: true,
        cues,
        plainLyrics: plain.slice(0, 2500),
        trackName: bestSynced.trackName || primary,
        artistName: bestSynced.artistName || channelName
      };
      songLyricsCache.set(cacheKey, out);
      tabLyricsContext.set(tabId, { videoTitle: rawTitle, plainLyrics: out.plainLyrics });
      return out;
    }
  }

  if (bestPlain && bestPlain.plainLyrics) {
    const plain = bestPlain.plainLyrics.slice(0, 2500);
    const out = {
      found: true,
      synced: false,
      cues: [],
      plainLyrics: plain,
      trackName: bestPlain.trackName || primary,
      artistName: bestPlain.artistName || channelName
    };
    songLyricsCache.set(cacheKey, out);
    tabLyricsContext.set(tabId, { videoTitle: rawTitle, plainLyrics: plain });
    return out;
  }

  const notFound = { found: false, synced: false, cues: [] };
  songLyricsCache.set(cacheKey, notFound);
  return notFound;
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function transcribeWithGroqWhisper(audioBase64, mimeType, groqKey, whisperPrompt = "") {
  const bytes = base64ToUint8Array(audioBase64);
  const ext = (mimeType || "").includes("mp4") ? "mp4" : "webm";
  const blob = new Blob([bytes], { type: mimeType || "audio/webm" });

  const models = ["whisper-large-v3-turbo", "whisper-large-v3"].filter(
    (m) => !isModelInCooldown(groqKey, m)
  );
  if (models.length === 0) models.push("whisper-large-v3-turbo", "whisper-large-v3");

  let lastErr = null;

  for (const whisperModel of models) {
    try {
      const form = new FormData();
      form.append("file", blob, `chunk.${ext}`);
      form.append("model", whisperModel);
      form.append("response_format", "json");
      form.append("temperature", "0");
      if (whisperPrompt) {
        form.append("prompt", whisperPrompt.slice(0, 380));
      }

      const res = await fetchWithTimeout(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${groqKey}` },
          body: form
        },
        3600
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429 || res.status === 503) {
          markModelCooldown(groqKey, whisperModel, 3 * 60 * 1000);
        }
        lastErr = new Error(data?.error?.message || `Groq Whisper HTTP ${res.status}`);
        continue;
      }

      const text = (data?.text || "").trim();
      return text;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("Lỗi gọi Groq Whisper");
}

async function transcribeAndTranslateWithGeminiAudio({
  audioBase64,
  mimeType,
  geminiKey,
  targetLang,
  translationStyle,
  videoTitle,
  referenceLyrics = ""
}) {
  const candidates = await discoverGeminiModels(geminiKey);
  const nonGemma = candidates.filter((m) => !m.includes("gemma"));
  const savedRoute = activeRouteByKey.get(geminiKey);
  const audioModels = buildOrderedCandidates(
    nonGemma.length > 0 ? nonGemma : FALLBACK_GEMINI_MODELS,
    geminiKey,
    "auto",
    savedRoute?.model && !savedRoute.model.includes("gemma") ? savedRoute.model : ""
  ).slice(0, 6);

  const langLabel = LANGUAGE_NAMES[targetLang] || targetLang;
  const styleDesc = STYLE_INSTRUCTIONS[translationStyle] || STYLE_INSTRUCTIONS.natural;

  const lyricsHint = referenceLyrics
    ? `\nLời bài hát tham khảo của video này (dùng để nhận diện chính xác câu đang hát):\n${referenceLyrics.slice(
        0,
        900
      )}\n`
    : "";

  const prompt =
    `Nghe đoạn âm thanh ngắn từ video${videoTitle ? ` "${videoTitle}"` : ""}.${lyricsHint} ` +
    `Nếu chỉ có tiếng nhạc dạo, tiếng ồn hoặc im lặng không có lời người nói/hát, hãy trả về đúng 1 từ: SILENCE. ` +
    `Nếu có lời nói hoặc câu hát, hãy chép lại câu gốc và dịch sang ${langLabel} (${styleDesc}). ` +
    `BẮT BUỘC trả về đúng 2 dòng theo định dạng:\n` +
    `ORIG: <câu gốc nghe được>\n` +
    `TRANS: <bản dịch sang ${langLabel}>`;

  let lastErr = null;
  for (const model of audioModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(geminiKey)}`;

      const generationConfig = { temperature: 0.1, maxOutputTokens: 180 };
      if (model.includes("gemini-2.5")) {
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }

      const res = await fetchWithTimeout(
        endpoint,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    inlineData: {
                      mimeType: (mimeType || "audio/webm").split(";")[0],
                      data: audioBase64
                    }
                  },
                  { text: prompt }
                ]
              }
            ],
            safetySettings: GEMINI_SAFETY_OFF,
            generationConfig
          })
        },
        3800
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (data?.error?.message || "").toLowerCase();
        if (
          res.status === 429 ||
          res.status === 503 ||
          msg.includes("quota") ||
          msg.includes("exhausted")
        ) {
          markModelCooldown(geminiKey, model, 3 * 60 * 1000);
        } else if (res.status === 404 || res.status === 400) {
          markModelCooldown(geminiKey, model, 24 * 60 * 60 * 1000);
        }
        lastErr = new Error(data?.error?.message || `Gemini Audio HTTP ${res.status}`);
        continue;
      }

      activeRouteByKey.set(geminiKey, { model, endpointType: "aistudio" });
      chrome.storage.local.set({ detectedModel: model });

      const out = (data?.candidates?.[0]?.content?.parts || [])
        .filter((p) => !p.thought)
        .map((p) => p.text || "")
        .join("")
        .trim();

      if (!out || /^silence$/i.test(out)) {
        return { orig: "", vi: "" };
      }

      const origMatch = out.match(/ORIG:\s*(.+)/i);
      const transMatch = out.match(/TRANS:\s*(.+)/i);

      const orig = (origMatch ? origMatch[1] : "").trim();
      const vi = (transMatch ? transMatch[1] : out).trim();
      if (isAudioHallucination(orig)) return { orig: "", vi: "" };
      return { orig, vi };
    } catch (err) {
      lastErr = err;
      markModelCooldown(geminiKey, model, 45 * 1000);
    }
  }
  throw lastErr || new Error("Không thể xử lý âm thanh bằng Gemini Audio");
}

async function handleTranscribeAudio(audioBase64, mimeType, videoTitle, tabId) {
  if (!audioBase64) return { orig: "", vi: "" };

  const stored = await chrome.storage.local.get({
    provider: "gemini",
    apiKey: "",
    groqApiKey: "",
    geminiApiKey: "",
    targetLang: "vi",
    secondaryLang: "orig",
    translationStyle: "natural"
  });

  const groqKey =
    (stored.groqApiKey || "").trim() ||
    ((stored.apiKey || "").trim().startsWith("gsk_") ? stored.apiKey.trim() : "");
  const geminiKey =
    (stored.geminiApiKey || "").trim() ||
    ((stored.apiKey || "").trim().startsWith("AIza") ||
    (stored.apiKey || "").trim().startsWith("AQ.")
      ? stored.apiKey.trim()
      : "");

  const tabLyrics = tabLyricsContext.get(tabId);
  const referenceLyrics =
    tabLyrics && (!videoTitle || tabLyrics.videoTitle === videoTitle)
      ? tabLyrics.plainLyrics || ""
      : "";

  // Ưu tiên Groq Whisper nếu có Groq Key vì tốc độ nhận diện âm thanh siêu nhanh (~150ms)
  if (groqKey) {
    try {
      const whisperPrompt = [videoTitle, referenceLyrics.slice(0, 220)]
        .filter(Boolean)
        .join(" - ");
      const origText = await transcribeWithGroqWhisper(
        audioBase64,
        mimeType,
        groqKey,
        whisperPrompt
      );
      if (isAudioHallucination(origText)) {
        return { orig: "", vi: "" };
      }
      // Đua tốc độ giữa dịch AI và dịch nhanh để trả về kết quả dưới 700ms
      const aiPromise = handleTranslate(origText, videoTitle, tabId, false);
      const fastPromise = new Promise((resolve) =>
        setTimeout(async () => {
          const fastRes = await handleTranslate(origText, videoTitle, tabId, true);
          resolve(fastRes);
        }, 650)
      );
      const transRes = await Promise.race([aiPromise, fastPromise]);
      return {
        orig: origText,
        vi: transRes?.vi || "",
        sub2: transRes?.sub2 || "",
        provider: "groq-whisper"
      };
    } catch {
      // Âm thầm chuyển sang Gemini Audio nếu Groq Whisper lỗi hoặc hết quota
    }
  }

  if (geminiKey) {
    try {
      const { orig, vi } = await transcribeAndTranslateWithGeminiAudio({
        audioBase64,
        mimeType,
        geminiKey,
        targetLang: stored.targetLang || "vi",
        translationStyle: stored.translationStyle || "natural",
        videoTitle,
        referenceLyrics
      });
      if (!orig || !vi) return { orig: "", vi: "" };
      const sub2 = await resolveSecondaryTranslation(
        orig,
        stored.secondaryLang || "orig",
        stored.targetLang || "vi"
      );
      pushTabContext(tabId, videoTitle, orig, vi);
      return { orig, vi, sub2, provider: "gemini-audio" };
    } catch {
      // Âm thầm bỏ qua đoạn âm thanh lỗi thay vì hiện cảnh báo đỏ che màn hình video
      return { orig: "", vi: "" };
    }
  }

  return { orig: "", vi: "" };
}

// ============================================================================
// 5. GOOGLE TRANSLATE FREE & KIỂM TRA / TỰ ĐỘNG NHẬP API KEY
// ============================================================================

async function translateWithGoogleFree(text, targetLang = "vi") {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
    targetLang
  )}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetchWithTimeout(url, {}, 2800);
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
  const { targetLang = "vi", translationStyle = "natural" } = await chrome.storage.local.get({
    targetLang: "vi",
    translationStyle: "natural"
  });

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
          preferredModel: preferredModel || "auto",
          targetLang,
          translationStyle
        })
      : await translateWithGeminiAuto({
          text: "Hello everyone, welcome back to the video!",
          videoTitle: "Tech Channel",
          history: [],
          apiKey: trimmedKey,
          preferredModel: preferredModel || "auto",
          targetLang,
          translationStyle
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
    model: "auto",
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