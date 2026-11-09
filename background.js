const MAX_CACHE_SIZE = 1000;
const cache = new Map();
const inFlight = new Map();

const SYSTEM_PROMPT =
  "Bạn là dịch giả phụ đề phim chuyên nghiệp. Hãy dịch câu thoại sau sang tiếng Việt ngắn gọn, tự nhiên, đúng ngữ cảnh giao tiếp. Chỉ trả về duy nhất bản dịch tiếng Việt, không kèm giải thích, không đặt trong dấu ngoặc kép.";

const DEFAULT_SETTINGS = {
  enabled: true,
  provider: "gemini",
  model: "gemini-2.5-flash-lite",
  apiKey: "",
  geminiApiKey: "",
  groqApiKey: ""
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "TRANSLATE") {
    translate(msg.text).then(sendResponse);
    return true; // giữ kênh mở cho phản hồi bất đồng bộ
  }

  if (msg.type === "TEST_API") {
    testApiConnection(msg).then(sendResponse);
    return true;
  }

  if (msg.type === "CLEAR_CACHE") {
    cache.clear();
    sendResponse({ ok: true });
    return false;
  }
});

function setCache(key, value) {
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, value);
}

async function getActiveConfig() {
  const data = await chrome.storage.local.get(DEFAULT_SETTINGS);
  const provider = data.provider || "gemini";
  const model =
    data.model ||
    (provider === "groq" ? "llama-3.3-70b-versatile" : "gemini-2.5-flash-lite");

  // Ưu tiên key theo từng provider, fallback về apiKey chung
  let activeKey = "";
  if (provider === "groq") {
    activeKey = (data.groqApiKey || data.apiKey || "").trim();
  } else {
    activeKey = (data.geminiApiKey || data.apiKey || "").trim();
  }

  return {
    enabled: data.enabled !== false,
    provider,
    model,
    apiKey: activeKey
  };
}

async function translate(text) {
  const cleanText = (text || "").replace(/\s+/g, " ").trim();
  if (!cleanText) return { vi: "" };

  const config = await getActiveConfig();
  if (!config.enabled) {
    return { vi: "" };
  }

  if (!config.apiKey) {
    return {
      error: "Chưa nhập API Key. Hãy bấm vào biểu tượng VIE-Translate ở góc trên trình duyệt để nhập key."
    };
  }

  const cacheKey = `${config.provider}:${config.model}:${cleanText}`;
  if (cache.has(cacheKey)) {
    return { vi: cache.get(cacheKey) };
  }

  // Nếu câu này đang được gửi đi dịch rồi thì chờ kết quả chung, tránh bắn API trùng lặp
  if (inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey);
  }

  const requestPromise = (async () => {
    try {
      const vi = await callLLM({
        provider: config.provider,
        model: config.model,
        apiKey: config.apiKey,
        text: cleanText
      });

      if (vi) {
        setCache(cacheKey, vi);
      }
      return { vi };
    } catch (err) {
      console.error("[VIE-Translate] Lỗi gọi API:", err);
      return { error: err.message || "Lỗi kết nối tới API dịch" };
    } finally {
      inFlight.delete(cacheKey);
    }
  })();

  inFlight.set(cacheKey, requestPromise);
  return requestPromise;
}

async function testApiConnection({ provider, model, apiKey }) {
  const cleanKey = (apiKey || "").trim();
  if (!cleanKey) {
    return { ok: false, error: "Vui lòng nhập API Key trước khi kiểm tra." };
  }

  const startTime = Date.now();
  try {
    const vi = await callLLM({
      provider: provider || "gemini",
      model: model || "gemini-2.5-flash-lite",
      apiKey: cleanKey,
      text: "Hello! Everything is working great."
    });
    const latencyMs = Date.now() - startTime;
    return { ok: true, vi, latencyMs };
  } catch (err) {
    return { ok: false, error: err.message || "Không thể kết nối API" };
  }
}

async function callLLM({ provider, model, apiKey, text }) {
  if (provider === "groq") {
    return callGroq({ model, apiKey, text });
  }
  return callGemini({ model, apiKey, text });
}

async function callGemini({ model, apiKey, text }) {
  const safeModel = model || "gemini-2.5-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(safeModel)}:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      contents: [{ role: "user", parts: [{ text }] }],
      generationConfig: {
        maxOutputTokens: 200,
        temperature: 0.2
      }
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const msg = data.error?.message || `HTTP ${res.status}`;
    if (res.status === 400 && msg.toLowerCase().includes("api key")) {
      throw new Error("API Key Gemini không hợp lệ.");
    }
    if (res.status === 404) {
      throw new Error(`Không tìm thấy model "${safeModel}". Hãy đổi sang gemini-2.5-flash-lite hoặc gemini-2.5-flash.`);
    }
    if (res.status === 429) {
      throw new Error("Đã vượt giới hạn gọi miễn phí mỗi phút (429 Rate Limit). Hãy thử chuyển sang Groq hoặc model Flash-Lite.");
    }
    throw new Error(msg);
  }

  const vi = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  return vi;
}

async function callGroq({ model, apiKey, text }) {
  const safeModel = model || "llama-3.3-70b-versatile";
  const url = "https://api.groq.com/openai/v1/chat/completions";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: safeModel,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text }
      ],
      temperature: 0.2,
      max_tokens: 200
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const msg = data.error?.message || `HTTP ${res.status}`;
    if (res.status === 401) {
      throw new Error("Groq API Key không hợp lệ (bắt đầu bằng gsk_...).");
    }
    if (res.status === 429) {
      throw new Error("Groq quá tải giới hạn phút (429 Rate Limit). Đợi vài giây hoặc đổi sang llama-3.1-8b-instant.");
    }
    throw new Error(msg);
  }

  const vi = data.choices?.[0]?.message?.content?.trim() ?? "";
  return vi;
}
