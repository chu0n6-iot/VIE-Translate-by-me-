const MAX_CACHE_SIZE = 500;
const MAX_CONTEXT_ITEMS = 5;
const DEFAULT_MODEL = "gemini-2.5-flash";

const cache = new Map();
const inFlight = new Map();
const contextByTab = new Map();

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
    testGeminiConnection(msg.apiKey, msg.model)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err.message || "Lỗi kết nối" }));
    return true;
  }

  if (msg.type === "CLEAR_CACHE") {
    cache.clear();
    contextByTab.clear();
    sendResponse({ ok: true });
    return true;
  }
});

function getCached(key) {
  if (!cache.has(key)) return null;
  const val = cache.get(key);
  // Làm mới thứ tự LRU
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
  // Tránh lưu trùng câu vừa dịch
  if (ctx.items.length > 0 && ctx.items[ctx.items.length - 1].src === src) {
    return;
  }
  ctx.items.push({ src, vi });
  if (ctx.items.length > MAX_CONTEXT_ITEMS) {
    ctx.items.shift();
  }
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
      // Nếu người dùng chọn chế độ Google Translate miễn phí (không cần key)
      if (settings.provider === "gtx") {
        const vi = await translateWithGoogleFree(cleanText);
        if (vi) setCached(cacheKey, vi);
        return { vi, provider: "gtx" };
      }

      // Chế độ Gemini AI: kiểm tra API key
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
        const vi = await translateWithGemini({
          text: cleanText,
          videoTitle,
          history: ctx.items,
          apiKey,
          model: settings.model || DEFAULT_MODEL
        });

        if (vi) {
          setCached(cacheKey, vi);
          pushTabContext(tabId, videoTitle, cleanText, vi);
        }
        return { vi, provider: "gemini" };
      } catch (geminiErr) {
        // Tự động chuyển sang Google Translate miễn phí nếu hết quota (429) hoặc bật fallback
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

async function translateWithGemini({ text, videoTitle, history, apiKey, model }) {
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

  const generationConfig = {
    temperature: 0.2,
    maxOutputTokens: 200
  };

  if (model.startsWith("gemini-2.5")) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemText }]
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: contextPrompt
                ? `${contextPrompt}\nDịch câu tiếp theo:\n${text}`
                : text
            }
          ]
        }
      ],
      generationConfig
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const apiMsg = data?.error?.message || `HTTP ${res.status}`;
    throw new Error(apiMsg);
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

async function testGeminiConnection(apiKey, model = DEFAULT_MODEL) {
  const trimmedKey = (apiKey || "").trim();
  if (!trimmedKey) {
    return { ok: false, error: "Vui lòng nhập Gemini API Key trước khi kiểm tra." };
  }
  const sample = await translateWithGemini({
    text: "Hello everyone, welcome back to my channel!",
    videoTitle: "Tech Review",
    history: [],
    apiKey: trimmedKey,
    model: model || DEFAULT_MODEL
  });
  return { ok: true, sample };
}