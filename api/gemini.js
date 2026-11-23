/**
 * VIE-Translate — Translate Toad AI
 * api/gemini.js — Google Gemini API integration (REST + Vertex, Vision/Audio, Subtitle & Dict)
 */

(function (root) {
  "use strict";

  const FALLBACK_GEMINI_MODELS = [
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
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
  const inFlightGeminiDiscovery = new Map();
  const cooldownGeminiModels = new Map();
  const workingEndpointByKey = new Map();
  const lastWorkingModelByKey = new Map();

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
    let score = 100;
    // Ưu tiên cao nhất các model flash-lite có quota 1500 RPD (tránh các model bị Google giới hạn 20 RPD)
    if (m.includes("2.5-flash-lite")) score += 2500;
    else if (m.includes("2.0-flash-lite")) score += 2400;
    else if (m.includes("flash-lite-latest")) score += 2300;
    else if (m.includes("2.0-flash")) score += 2000;
    else if (m.includes("2.5-flash")) score += 1900;
    else if (m.includes("flash-latest")) score += 1800;
    else if (m.includes("gemma-3-27b")) score += 1500;
    else if (m.includes("gemma-3-12b")) score += 1400;
    else if (m.includes("flash")) score += 1000;
    return score;
  }

  async function discoverGeminiModels(apiKey) {
    const cleanKey = (apiKey || "").trim();
    if (!cleanKey) return [...FALLBACK_GEMINI_MODELS];
    if (discoveredGeminiModelsByKey.has(cleanKey)) {
      return discoveredGeminiModelsByKey.get(cleanKey);
    }
    if (inFlightGeminiDiscovery.has(cleanKey)) {
      return inFlightGeminiDiscovery.get(cleanKey);
    }
    const promise = (async () => {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3500);
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
      } finally {
        inFlightGeminiDiscovery.delete(cleanKey);
      }
    })();
    inFlightGeminiDiscovery.set(cleanKey, promise);
    return promise;
  }

  async function callGeminiEndpoint({ model, apiKey, body, timeoutMs = 6000 }) {
    const cleanKey = (apiKey || "").trim();
    const developerEp = {
      type: "developer",
      url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${cleanKey}`
    };
    const vertexEp = {
      type: "vertex",
      url: `https://aiplatform.googleapis.com/v1/publishers/google/models/${encodeURIComponent(model)}:generateContent?key=${cleanKey}`
    };

    let endpoints;
    if (cleanKey.startsWith("AIza")) {
      endpoints = [developerEp];
    } else if (workingEndpointByKey.get(cleanKey) === "developer") {
      endpoints = [developerEp, vertexEp];
    } else if (workingEndpointByKey.get(cleanKey) === "vertex" || cleanKey.startsWith("AQ.")) {
      endpoints = [vertexEp, developerEp];
    } else {
      endpoints = [developerEp, vertexEp];
    }

    let lastError = null;
    let quotaError = null;
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
          const err = new Error(errMsg);
          err.status = res.status;
          err.isQuotaExceeded = res.status === 429 || /quota|resource_exhausted|rate_limit|exceeded your current quota/i.test(errMsg);
          throw err;
        }
        workingEndpointByKey.set(cleanKey, ep.type);
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return text.trim();
      } catch (err) {
        clearTimeout(timer);
        if (err?.isQuotaExceeded && !quotaError) quotaError = err;
        lastError = err;
      }
    }
    throw quotaError || lastError || new Error("Gemini API call failed.");
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
    softenProfanity = true,
    multiSpeakerSplit = true
  }) {
    const { systemPrompt, userPrompt, isBatch } = root.VieStorage?.buildTranslationPrompts
      ? root.VieStorage.buildTranslationPrompts({
          text,
          texts,
          nextText,
          videoTitle,
          videoPersona,
          glossary,
          targetLang,
          translationStyle,
          pronounStyle,
          lockedPronounPair,
          softenProfanity,
          multiSpeakerSplit
        })
      : {
          systemPrompt: `You are an elite subtitle translator. Target language: ${targetLang}.`,
          userPrompt: Array.isArray(texts) && texts.length ? texts.map((t, i) => `[[${i + 1}]] ${t}`).join("\n") : (text || ""),
          isBatch: Array.isArray(texts) && texts.length > 0
        };

    const candidates = await discoverGeminiModels(apiKey);
    const ordered = [];
    const stickyModel = lastWorkingModelByKey.get(apiKey);
    if (preferredModel && preferredModel !== "auto" && candidates.includes(preferredModel)) {
      ordered.push(preferredModel);
    } else if (stickyModel && candidates.includes(stickyModel) && !isModelInCooldown(apiKey, stickyModel)) {
      ordered.push(stickyModel);
    }
    for (const m of candidates) {
      if (!ordered.includes(m)) ordered.push(m);
    }

    const baseContents = [
      ...history.slice(-6).map((h) => [
        { role: "user", parts: [{ text: h.src }] },
        { role: "model", parts: [{ text: h.vi }] }
      ]).flat(),
      { role: "user", parts: [{ text: userPrompt }] }
    ];

    const generationConfig = {
      temperature: 0.2,
      maxOutputTokens: isBatch ? 1536 : 320
    };
    const timeoutMs = isBatch ? 9000 : 5000;

    const cleanFn = root.VieStorage?.cleanTranslatedOutput || ((s) => (s || "").trim());
    const parseBatchFn =
      root.VieStorage?.parseBatchTranslations ||
      ((raw) => raw.split("\n").map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim()).filter(Boolean));

    const MAX_ATTEMPTS = 3;
    let attempts = 0;
    let lastErr = null;
    for (const m of ordered) {
      if (isModelInCooldown(apiKey, m)) continue;
      if (attempts >= MAX_ATTEMPTS) break;
      attempts++;

      const isGemma = m.toLowerCase().startsWith("gemma");
      let reqBody;
      if (isGemma) {
        const gemmaContents = baseContents.map((item, idx) => {
          if (idx !== 0) return item;
          const origTxt = item?.parts?.[0]?.text || "";
          return {
            role: item.role || "user",
            parts: [{ text: `${systemPrompt}\n\n${origTxt}` }]
          };
        });
        reqBody = { contents: gemmaContents, generationConfig };
      } else {
        reqBody = {
          contents: baseContents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig
        };
      }

      try {
        const out = await callGeminiEndpoint({ model: m, apiKey, body: reqBody, timeoutMs });
        if (!out || looksLikeRefusal(out)) {
          throw new Error("Gemini returned empty or refused output.");
        }
        lastWorkingModelByKey.set(apiKey, m);
        if (isBatch) {
          const lines = parseBatchFn(out, texts.length);
          return { translations: lines, modelUsed: m };
        }
        return { vi: cleanFn(out), modelUsed: m };
      } catch (err) {
        lastErr = err;
        if (err?.status === 401 || err?.status === 403) {
          break;
        }
        const isQuota = err.isQuotaExceeded || err.status === 429 || /quota|resource_exhausted|429/i.test(err.message || "");
        markModelCooldown(apiKey, m, isQuota ? 3600000 : 120000);
      }
    }
    if (lastErr) throw lastErr;
    const cd = new Error("All Gemini models are cooling down (quota).");
    cd.isQuotaExceeded = true;
    throw cd;
  }

  function isAiMetaOrPromptLeak(text) {
    if (!text) return false;
    if (root.VieStorage?.isAiMetaOrPromptLeak) {
      return root.VieStorage.isAiMetaOrPromptLeak(text);
    }
    const s = String(text).trim();
    const lower = s.toLowerCase();
    return (
      lower.includes("listen to this audio") ||
      lower.includes("transcribe the spoken speech") ||
      lower.includes("format json") ||
      /^(?:tôi đang dịch|đang dịch\b|dưới đây là bản dịch)/i.test(s)
    );
  }

  function sanitizeAudioText(t) {
    if (!t || isAiMetaOrPromptLeak(t)) return "";
    return (t || "")
      .replace(/^(?:\*{1,2})?(?:ORIG(?:INAL)?|GỐC|TRANS(?:LATION)?|DỊCH)\s*:\s*(?:\*{1,2})?/i, "")
      .replace(/^(?:ORIG|GỐC|ORIGINAL)\b[:\s-]*/i, "")
      .replace(/^(?:Tôi đang dịch|Đang dịch|Dưới đây là bản dịch)\s*[:\s-]*/i, "")
      .trim();
  }

  async function transcribeAndTranslateWithGeminiAudio({ audioBase64, mimeType, geminiKey, targetLang = "vi" }) {
    const candidates = await discoverGeminiModels(geminiKey);
    const body = {
      systemInstruction: {
        parts: [
          {
            text: `You are an accurate live speech captioner and translator. Listen to the audio clip, transcribe the exact spoken words into 'orig', and translate them into ${targetLang} into 'vi'. Never output prompt instructions, meta commentary, or disclaimers. If there is no clear speech (silence, music, noise), return {"orig":"","vi":""}. Return JSON ONLY: {"orig": "...", "vi": "..."}`
          }
        ]
      },
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
              text: `Transcribe and translate to ${targetLang}. JSON format: {"orig": "...", "vi": "..."}`
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
          if (isAiMetaOrPromptLeak(orig) || isAiMetaOrPromptLeak(vi)) {
            continue;
          }
          const gtxFn = self.VieGTX?.translate || self.VieGtx?.translateWithGoogleFree;
          if (orig && !vi && gtxFn) {
            try {
              vi = await gtxFn(orig, targetLang);
              if (isAiMetaOrPromptLeak(vi)) vi = "";
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
        maxOutputTokens: 1400,
        responseMimeType: "application/json"
      }
    };

    const candidates = await discoverGeminiModels(apiKey);
    for (const m of candidates) {
      if (isModelInCooldown(apiKey, m)) continue;
      try {
        const raw = await callGeminiEndpoint({ model: m, apiKey, body, timeoutMs: 9000 });
        const clean = String(raw).replace(/```json|```/g, "").trim();
        let parsed;
        try {
          parsed = JSON.parse(clean);
        } catch {
          const a = clean.indexOf("{");
          const b = clean.lastIndexOf("}");
          if (a >= 0 && b > a) parsed = JSON.parse(clean.slice(a, b + 1));
          else {
            const mm = clean.match(/"meaning"\s*:\s*"([^"]+)"/);
            if (!mm) throw new Error("bad json");
            const pm = clean.match(/"pos"\s*:\s*"([^"]+)"/);
            parsed = { word, meaning: mm[1], pos: pm ? pm[1] : "" };
          }
        }
        return { ok: true, ...parsed };
      } catch (err) {
        if (err && err.isQuotaExceeded) markModelCooldown(apiKey, m, 3600000);
        else if (!/bad json|JSON/i.test(String(err && err.message))) markModelCooldown(apiKey, m, 60000);
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

  async function translateMangaRegions({ imageBase64, mimeType = "image/jpeg", regions = [], previousLines = [], apiKey, targetLang = "vi", translationStyle = "natural", pronounStyle = "auto", glossary = [] }) {
    if (!imageBase64) throw new Error("Không có dữ liệu ảnh truyện.");
    const regionInput = regions.map((r, i) => ({
      index: i,
      type: r.type || r.kind || "dialogue",
      text: r.text || ""
    }));
    const glossaryText = glossary
      .filter((g) => g && g.enabled !== false && g.src && g.target)
      .slice(0, 30)
      .map((g) => `"${g.src}" -> "${g.target}"`)
      .join("\n");
    const prompt = `Bạn là biên tập truyện tranh chuyên nghiệp.
Nhiệm vụ: dịch các thoại từ ảnh trang truyện sang "${targetLang}".

QUAN TRỌNG:
- Xem trực tiếp ảnh để nhận nhân vật, giới tính, biểu cảm, quan hệ, suy nghĩ và hướng nhìn.
- Phục hồi text OCR bị sai, dính ký tự, thiếu nét, che mờ, furigana hoặc watermark.
- Dịch tự nhiên, giàu cảm xúc, phù hợp văn phong truyện, không dịch từng chữ máy móc.
- Suy đoán xưng hô theo quan hệ: tao-mày, tớ-cậu, anh-em, tôi-cô/cậu, lão phu-ngươi, ta-ngươi...
- Giữ hậu tố văn hóa như senpai/sensei/san/kun/chan khi phù hợp.
- Từ thoại ngắn gọn, vừa bong bóng.
- SFX ngắn gợi thanh/gợi hình.
- Giữ 3-5 thoại cuối trang trước để xưng hô xuyên chương:
${previousLines.length ? previousLines.slice(-5).map((x, i) => `${i + 1}. ${x}`).join("\n") : "(Chưa có)"}
- Glossary:
${glossaryText || "(Không có)"}
- Style: ${translationStyle}
- Pronoun: ${pronounStyle}

OCR/regions đầu vào:
${JSON.stringify(regionInput)}

Trả về DUY NHẤT JSON hợp lệ:
{"regions":[{"index":0,"text":"bản dịch tiếng Việt tự nhiên","type":"dialogue|thought|sfx|narration","font":"normal|italic|bold|brush"}]}
`;
    const body = {
      contents: [{ role: "user", parts: [
        { inlineData: { mimeType: mimeType || "image/jpeg", data: imageBase64 } },
        { text: prompt }
      ] }],
      generationConfig: { temperature: 0.15, maxOutputTokens: 3000, responseMimeType: "application/json" }
    };
    const candidates = await discoverGeminiModels(apiKey);
    for (const m of candidates) {
      if (isModelInCooldown(apiKey, m)) continue;
      try {
        const raw = await callGeminiEndpoint({ model: m, apiKey, body, timeoutMs: 25000 });
        const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
        if (!Array.isArray(parsed.regions)) throw new Error("Manga translation JSON invalid.");
        return { ok: true, regions: parsed.regions, modelUsed: m };
      } catch (err) {
        markModelCooldown(apiKey, m, /quota|429/i.test(err.message || "") ? 3600000 : 120000);
      }
    }
    throw new Error("Không thể dịch manga bằng Gemini.");
  }

  async function scanMangaPage({ imageBase64, mimeType = "image/jpeg", apiKey, targetLang = "vi" }) {
    if (!imageBase64) throw new Error("Không có dữ liệu ảnh truyện.");
    const prompt = `Analyze this manga/comic page and detect every readable speech bubble or caption.
Return ONLY valid JSON:
{"language":"ja|ko|zh-CN|zh-TW|en|es|other","regions":[{"x":0,"y":0,"w":100,"h":100,"text":"recovered original text","translation":"concise natural Vietnamese translation","confidence":0.95,"type":"dialogue|thought|sfx|narration","font":"normal|italic|brush","kind":"bubble|caption|sfx"}]}
Coordinates must be percentages of the whole image (0-100). Do not include prose outside JSON.
Ignore decorative art. Preserve line breaks. Detect Japanese, Korean, Chinese, English, Spanish and other Latin scripts.
The target language is ${targetLang}. Return the best direct 1-to-1 Vietnamese translation in each region as "translation"; it may be refined later with chapter context.`;
    const body = {
      contents: [{ role: "user", parts: [
        { inlineData: { mimeType: mimeType || "image/jpeg", data: imageBase64 } },
        { text: prompt }
      ] }],
      generationConfig: { temperature: 0.05, maxOutputTokens: 3000, responseMimeType: "application/json" }
    };
    const candidates = await discoverGeminiModels(apiKey);
    for (const m of candidates) {
      if (isModelInCooldown(apiKey, m)) continue;
      try {
        const raw = await callGeminiEndpoint({ model: m, apiKey, body, timeoutMs: 20000 });
        const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
        if (!Array.isArray(parsed.regions)) throw new Error("OCR JSON không hợp lệ.");
        return { ok: true, ...parsed, modelUsed: m };
      } catch (err) {
        const isQuota = err.isQuotaExceeded || err.status === 429 || /quota|resource_exhausted|429/i.test(err.message || "");
        markModelCooldown(apiKey, m, isQuota ? 3600000 : 120000);
      }
    }
    throw new Error("Không thể OCR trang truyện lúc này.");
  }

  async function scanAndTranslateVisualText({ imageBase64, mimeType = "image/jpeg", apiKey, videoTitle = "", targetLang = "vi" }) {
    if (!imageBase64) throw new Error("Không có dữ liệu ảnh để quét chữ.");
    const prompt = `Bạn là trợ lý dịch thuật điện ảnh & bối cảnh thị giác chuyên nghiệp.
Hãy quan sát thật kỹ khung hình video này${videoTitle ? ` (thuộc video: "${videoTitle}")` : ""}:
1. Phát hiện và đọc toàn bộ chữ, biển báo, biển hiệu, tin nhắn điện thoại, thư từ, tài liệu, mốc thời gian, báo chí, nhãn hiệu hoặc dòng chữ chạy trên màn hình (On-Screen Visual Text / OCR).
2. Dịch sang tiếng Việt sát nghĩa, tự nhiên và giải thích đa hướng bối cảnh phim (ví dụ: đây là biển báo gì, tin nhắn từ ai, địa điểm/thời gian nào, ẩn ý gì trong phân cảnh phim).

Nếu trên màn hình KHÔNG CÓ chữ nào đáng kể (chỉ có phong cảnh/mặt người mà không có chữ):
Trả về JSON duy nhất: {"hasText": false}

Nếu CÓ chữ trên màn hình:
Trả về JSON duy nhất (không bọc code block markdown):
{
  "hasText": true,
  "orig": "văn bản gốc tiếng nước ngoài tìm thấy trên khung hình",
  "vi": "bản dịch tiếng Việt sát nghĩa và tự nhiên",
  "sceneType": "Biển hiệu / Tin nhắn điện thoại / Mốc thời gian / Tài liệu / Bối cảnh phim",
  "nuance": "giải thích ngắn gọn ý nghĩa bối cảnh của đoạn chữ này đối với tình tiết câu chuyện"
}`;

    const body = {
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: mimeType || "image/jpeg",
                data: imageBase64
              }
            },
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1400,
        responseMimeType: "application/json"
      }
    };

    const candidates = await discoverGeminiModels(apiKey);
    for (const m of candidates) {
      if (isModelInCooldown(apiKey, m)) continue;
      try {
        const raw = await callGeminiEndpoint({ model: m, apiKey, body, timeoutMs: 9000 });
        const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
        return { ok: true, ...parsed, modelUsed: m };
      } catch (err) {
        const isQuota = err.isQuotaExceeded || err.status === 429 || /quota|resource_exhausted|429/i.test(err.message || "");
        markModelCooldown(apiKey, m, isQuota ? 3600000 : 120000);
      }
    }
    throw new Error("Không thể quét chữ trên màn hình lúc này.");
  }

  root.VieGemini = {
    FALLBACK_GEMINI_MODELS,
    discoverGeminiModels,
    callGeminiEndpoint,
    translateWithGeminiAuto,
    transcribeAndTranslateWithGeminiAudio,
    scanMangaPage,
    scanAndTranslateVisualText,
    lookupWordWithGemini,
    explainSceneWithGemini,
    translateMangaRegions,
    looksLikeRefusal
  };
})(typeof self !== "undefined" ? self : this);
