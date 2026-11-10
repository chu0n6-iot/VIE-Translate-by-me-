/**
 * VIE-Translate — Translate Toad AI
 * api/gemini.js — Google Gemini API integration (REST + Vertex, Vision/Audio, Subtitle & Dict)
 */

(function (root) {
  "use strict";

  const FALLBACK_GEMINI_MODELS = [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-flash-latest",
    "gemma-3-27b-it",
    "gemma-3-12b-it"
  ];

  const GEMINI_SAFETY_SETTINGS = [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" }
  ];

  const discoveredGeminiModelsByKey = new Map();
  const cooldownGeminiModels = new Map();

  function isModelInCooldown(apiKey, modelId) {
    const key = `${apiKey}:${modelId}`;
    const until = cooldownGeminiModels.get(key);
    if (!until) return false;
    if (Date.now() > until) {
      cooldownGeminiModels.delete(key);
      return false;
    }
    return true;
  }

  function markModelCooldown(apiKey, modelId, durationMs = 180000) {
    cooldownGeminiModels.set(`${apiKey}:${modelId}`, Date.now() + durationMs);
  }

  function looksLikeRefusal(text) {
    const s = (text || "").trim();
    if (!s) return true;
    return /^(tôi không thể|tôi xin lỗi|xin lỗi,? tôi|sorry,? i can'?t|i cannot (translate|fulfill|assist)|i apologize|as an ai)/i.test(
      s
    );
  }

  function scoreGeminiModel(modelId) {
    const m = (modelId || "").toLowerCase();
    if (m.includes("gemini-1.5") || m.includes("gemini-1.0") || m.includes("vision") || m.includes("embedding")) {
      return -9999;
    }
    let score = 0;
    if (m.includes("2.5-flash-lite")) score += 2000;
    else if (m.includes("2.5-flash")) score += 1900;
    else if (m.includes("2.0-flash-lite")) score += 1800;
    else if (m.includes("2.0-flash")) score += 1700;
    else if (m.includes("flash-lite-latest")) score += 1600;
    else if (m.includes("flash-latest")) score += 1500;
    else if (m.includes("gemma-3-27b")) score += 1300;
    else if (m.includes("gemma-3-12b")) score += 1200;
    return score;
  }

  async function discoverGeminiModels(apiKey) {
    const cleanKey = (apiKey || "").trim();
    if (!cleanKey) return [...FALLBACK_GEMINI_MODELS];
    if (discoveredGeminiModelsByKey.has(cleanKey)) {
      return discoveredGeminiModelsByKey.get(cleanKey);
    }
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) return [...FALLBACK_GEMINI_MODELS];
      const data = await res.json();
      const list = (data?.models || [])
        .map((m) => (m.name || "").replace(/^models\//, ""))
        .filter((id) => id && scoreGeminiModel(id) > 0)
        .sort((a, b) => scoreGeminiModel(b) - scoreGeminiModel(a));
      const finalModels = list.length ? list : [...FALLBACK_GEMINI_MODELS];
      discoveredGeminiModelsByKey.set(cleanKey, finalModels);
      return finalModels;
    } catch {
      return [...FALLBACK_GEMINI_MODELS];
    }
  }

  async function callGeminiEndpoint({ model, apiKey, body, timeoutMs = 7500 }) {
    const cleanKey = (apiKey || "").trim();
    const isAqKey = cleanKey.startsWith("AQ.");
    const endpoints = isAqKey
      ? [
          {
            type: "vertex",
            url: `https://aiplatform.googleapis.com/v1/publishers/google/models/${encodeURIComponent(model)}:generateContent?key=${cleanKey}`
          },
          {
            type: "developer",
            url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${cleanKey}`
          }
        ]
      : [
          {
            type: "developer",
            url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${cleanKey}`
          },
          {
            type: "vertex",
            url: `https://aiplatform.googleapis.com/v1/publishers/google/models/${encodeURIComponent(model)}:generateContent?key=${cleanKey}`
          }
        ];

    let lastError = null;
    for (const ep of endpoints) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetch(ep.url, {
          method: "POST",
          signal: ctrl.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...body,
            safetySettings: GEMINI_SAFETY_SETTINGS
          })
        });
        clearTimeout(timer);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData?.error?.message || `Gemini HTTP ${res.status}`;
          throw new Error(errMsg);
        }
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return text.trim();
      } catch (err) {
        clearTimeout(timer);
        lastError = err;
      }
    }
    throw lastError || new Error("Gemini API call failed.");
  }

  async function translateWithGeminiAuto({
    text,
    texts,
    nextText = "",
    videoTitle,
    videoPersona = "",
    glossary = [],
    history = [],
    apiKey,
    preferredModel = "auto",
    targetLang = "vi",
    translationStyle = "natural",
    pronounStyle = "auto",
    lockedPronounPair = "",
    softenProfanity = true
  }) {
    const isBatch = Array.isArray(texts) && texts.length > 0;
    const candidates = await discoverGeminiModels(apiKey);
    const ordered = [];
    if (preferredModel && preferredModel !== "auto" && candidates.includes(preferredModel)) {
      ordered.push(preferredModel);
    }
    for (const m of candidates) {
      if (!ordered.includes(m)) ordered.push(m);
    }

    const validGlossary = Array.isArray(glossary)
      ? glossary.filter((g) => g && g.src && g.target && g.enabled !== false)
      : [];

    const sysInstruction = [
      `You are an elite bilingual video subtitle translator. Target language: ${targetLang}.`,
      "PROFESSIONAL COHESION & FLOW (LIÊN KẾT MẠCH LẠC CÂU TRƯỚC - CÂU SAU):",
      "- TUYỆT ĐỐI KHÔNG dịch ngang từ-nối-từ 1:1 theo cấu trúc tiếng Tây máy móc.",
      "- Phải đọc hiểu mạch ngữ cảnh từ các câu thoại trước đó (history) và câu sau (nếu có). Kết nối ý tứ liền mạch, trôi chảy, giàu nhạc điệu và cảm xúc như dịch giả Netflix/HBO.",
      "- Sử dụng liên từ tiếng Việt tự nhiên ('Nhưng rồi', 'Thế là', 'Hóa ra', 'Chẳng ngờ', 'Dẫu vậy...') khi câu là vế nối tiếp hoặc câu rút gọn.",
      "- Xử lý các đại từ quy chiếu (it, that, they...) sát theo đối tượng ở câu trước thay vì dịch cứng nhắc.",
      "- Với video ca nhạc/lyrics: dịch giàu vần điệu, hình ảnh thơ ca, giữ trọn hồn bài hát.",
      videoPersona && root.VieStorage?.PERSONA_INSTRUCTIONS[videoPersona]
        ? root.VieStorage.PERSONA_INSTRUCTIONS[videoPersona]
        : "",
      root.VieStorage?.STYLE_INSTRUCTIONS[translationStyle] || "",
      root.VieStorage?.PRONOUN_INSTRUCTIONS[pronounStyle] || "",
      lockedPronounPair ? `LOCKED PRONOUN: ${lockedPronounPair}.` : "",
      validGlossary.length > 0
        ? `STRICT GLOSSARY ENFORCEMENT: You MUST translate the following terms exactly as mapped without exception: ${validGlossary
            .map((g) => `"${g.src}" => "${g.target}"`)
            .join(", ")}.`
        : "",
      softenProfanity
        ? "FAMILY-FRIENDLY: Soften severe profanities/vulgar insults into mild natural expressions (e.g. 'chết tiệt', 'khốn kiếp', 'trời đất ơi'). NEVER refuse or stop translating."
        : "UNCENSORED: Faithfully translate any colloquial expressions and slang.",
      "Output ONLY the translated subtitle text without notes, quotes or intro."
    ].filter(Boolean).join(" ");

    let promptContent = "";
    if (isBatch) {
      promptContent = `Translate each numbered line below. Return numbered lines format '1. ...' \\n '2. ...':\n` +
        texts.map((t, i) => `${i + 1}. ${t}`).join("\n");
    } else if (nextText && nextText.trim()) {
      promptContent = `[Upcoming next line: "${nextText.trim()}"]\nTranslate this current line smoothly connecting with the preceding lines and leading into the next line: "${text}"`;
    } else {
      promptContent = text;
    }

    const contents = [
      ...history.slice(-6).map((h) => [
        { role: "user", parts: [{ text: h.src }] },
        { role: "model", parts: [{ text: h.vi }] }
      ]).flat(),
      { role: "user", parts: [{ text: promptContent }] }
    ];

    const body = {
      contents,
      systemInstruction: { parts: [{ text: sysInstruction }] },
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024
      }
    };

    let lastErr = null;
    for (const m of ordered) {
      if (isModelInCooldown(apiKey, m)) continue;
      try {
        const out = await callGeminiEndpoint({ model: m, apiKey, body });
        if (looksLikeRefusal(out)) {
          throw new Error("Gemini refused output.");
        }
        if (isBatch) {
          const lines = out.split("\n").map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim()).filter(Boolean);
          return { translations: lines, modelUsed: m };
        }
        return { vi: out, modelUsed: m };
      } catch (err) {
        lastErr = err;
        markModelCooldown(apiKey, m, 120000);
      }
    }
    throw lastErr || new Error("All Gemini models failed.");
  }

  function sanitizeAudioText(t) {
    return (t || "")
      .replace(/^(?:\*{1,2})?(?:ORIG(?:INAL)?|GỐC|TRANS(?:LATION)?|DỊCH)\s*:\s*(?:\*{1,2})?/i, "")
      .replace(/^(?:ORIG|GỐC|ORIGINAL)\b[:\s-]*/i, "")
      .trim();
  }

  async function transcribeAndTranslateWithGeminiAudio({ audioBase64, mimeType, geminiKey, targetLang = "vi" }) {
    const candidates = await discoverGeminiModels(geminiKey);
    const body = {
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: mimeType || "audio/webm",
                data: audioBase64
              }
            },
            {
              text: `Listen to this audio clip and transcribe the spoken speech, then translate it to ${targetLang}. Format JSON ONLY: {"orig": "exact spoken speech in original language", "vi": "translation in ${targetLang}"}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 256,
        responseMimeType: "application/json"
      }
    };

    for (const m of candidates) {
      if (isModelInCooldown(geminiKey, m)) continue;
      try {
        const raw = await callGeminiEndpoint({ model: m, apiKey: geminiKey, body, timeoutMs: 6000 });
        let parsed = null;
        try {
          parsed = JSON.parse(raw);
        } catch {
          const matchOrig = raw.match(/(?:orig|gốc)\s*["':]\s*([^"\n\r}]+)/i);
          const matchVi = raw.match(/(?:vi|trans|dịch)\s*["':]\s*([^"\n\r}]+)/i);
          if (matchOrig || matchVi) {
            parsed = { orig: matchOrig ? matchOrig[1] : "", vi: matchVi ? matchVi[1] : "" };
          }
        }
        if (parsed) {
          let orig = sanitizeAudioText(parsed.orig || "");
          let vi = sanitizeAudioText(parsed.vi || "");
          const gtxFn = self.VieGTX?.translate || self.VieGtx?.translateWithGoogleFree;
          if (orig && !vi && gtxFn) {
            try {
              vi = await gtxFn(orig, targetLang);
            } catch {
              vi = orig;
            }
          }
          if (vi || orig) {
            return { orig, vi: sanitizeAudioText(vi) };
          }
        }
      } catch {
        markModelCooldown(geminiKey, m, 120000);
      }
    }
    return { orig: "", vi: "" };
  }

  async function lookupWordWithGemini(word, sentence, apiKey) {
    const prompt = `Phân tích từ vựng '${word}' trong ngữ cảnh câu: "${sentence}".
Trả về duy nhất JSON hợp lệ (không markdown, không codeblock):
{
  "word": "${word}",
  "pron": "/phiên âm IPA/",
  "pos": "Động từ (Verb) / Danh từ (Noun)...",
  "cefr": "A1/A2/B1/B2/C1/C2",
  "meaning": "nghĩa tiếng Việt ngắn gọn, đúng nhất trong ngữ cảnh này",
  "note": "giải thích ngắn vì sao trong câu này từ đó có nghĩa như vậy",
  "posVariants": [
    {"pos": "Danh từ", "desc": "nghĩa và cách dùng khác khi là danh từ"},
    {"pos": "Động từ", "desc": "nghĩa và cách dùng khác khi là động từ"}
  ],
  "examples": [
    {"orig": "Example sentence 1", "trans": "Bản dịch ví dụ 1"},
    {"orig": "Example sentence 2", "trans": "Bản dịch ví dụ 2"}
  ],
  "collocations": ["Cụm từ hay gặp 1", "Cụm từ 2"],
  "funFact": "Một điểm thú vị hoặc sắc thái văn hóa khi dùng từ này (nếu có)"
}`;

    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 600,
        responseMimeType: "application/json"
      }
    };

    const candidates = await discoverGeminiModels(apiKey);
    for (const m of candidates) {
      if (isModelInCooldown(apiKey, m)) continue;
      try {
        const raw = await callGeminiEndpoint({ model: m, apiKey, body, timeoutMs: 6500 });
        const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
        return { ok: true, ...parsed };
      } catch {
        markModelCooldown(apiKey, m, 120000);
      }
    }
    throw new Error("Không thể tra từ lúc này.");
  }

  async function explainSceneWithGemini({ sentence, vi, focusWord, apiKey }) {
    const prompt = `Phân tích phụ đề và hướng dẫn học ngoại ngữ:
Câu gốc: "${sentence}"
Dịch: "${vi}"
${focusWord ? `Từ trọng tâm: "${focusWord}"` : ""}

Trả về duy nhất JSON hợp lệ (không markdown, không codeblock):
{
  "literal": "Dịch sát từng từ cấu trúc câu gốc",
  "nuance": "Sắc thái cảm xúc, ngữ cảnh hội thoại, giọng điệu nhân vật",
  "realLife": "Cách người bản xứ thường dùng cấu trúc/từ này trong đời thực",
  "keyPoints": ["Điểm ngữ pháp/từ vựng nổi bật 1", "Điểm nổi bật 2"]
}`;

    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 750,
        responseMimeType: "application/json"
      }
    };

    const candidates = await discoverGeminiModels(apiKey);
    for (const m of candidates) {
      if (isModelInCooldown(apiKey, m)) continue;
      try {
        const raw = await callGeminiEndpoint({ model: m, apiKey, body, timeoutMs: 7000 });
        const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
        return { ok: true, ...parsed };
      } catch {
        markModelCooldown(apiKey, m, 120000);
      }
    }
    throw new Error("Không thể phân tích ngữ cảnh lúc này.");
  }

  root.VieGemini = {
    FALLBACK_GEMINI_MODELS,
    discoverGeminiModels,
    callGeminiEndpoint,
    translateWithGeminiAuto,
    transcribeAndTranslateWithGeminiAudio,
    lookupWordWithGemini,
    explainSceneWithGemini,
    looksLikeRefusal
  };
})(typeof self !== "undefined" ? self : this);
