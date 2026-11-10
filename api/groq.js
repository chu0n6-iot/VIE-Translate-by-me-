/**
 * VIE-Translate — Translate Toad AI
 * api/groq.js — Groq Cloud API integration (Llama translation & Whisper audio)
 */

(function (root) {
  "use strict";

  const FALLBACK_GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
    "qwen/qwen3-32b",
    "gemma2-9b-it"
  ];

  const discoveredGroqModelsByKey = new Map();
  const cooldownGroqModels = new Map();

  function isModelInCooldown(apiKey, modelId) {
    const key = `${apiKey}:${modelId}`;
    const until = cooldownGroqModels.get(key);
    if (!until) return false;
    if (Date.now() > until) {
      cooldownGroqModels.delete(key);
      return false;
    }
    return true;
  }

  function markModelCooldown(apiKey, modelId, durationMs = 180000) {
    cooldownGroqModels.set(`${apiKey}:${modelId}`, Date.now() + durationMs);
  }

  function scoreGroqModel(modelId) {
    const m = (modelId || "").toLowerCase();
    if (m.includes("whisper") || m.includes("guard") || m.includes("vision") || m.includes("distil")) {
      return -9999;
    }
    let score = 0;
    if (m.includes("llama-3.3-70b")) score += 2000;
    else if (m.includes("llama-3.1-70b")) score += 1800;
    else if (m.includes("llama-4-scout")) score += 1600;
    else if (m.includes("llama-3.1-8b")) score += 1400;
    else if (m.includes("qwen3")) score += 1300;
    else if (m.includes("gemma2-9b")) score += 1100;
    return score;
  }

  async function discoverGroqModels(apiKey) {
    const cleanKey = (apiKey || "").trim();
    if (!cleanKey) return [...FALLBACK_GROQ_MODELS];
    if (discoveredGroqModelsByKey.has(cleanKey)) {
      return discoveredGroqModelsByKey.get(cleanKey);
    }
    try {
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${cleanKey}` }
      });
      if (!res.ok) return [...FALLBACK_GROQ_MODELS];
      const data = await res.json();
      const list = (data?.data || [])
        .map((m) => m.id)
        .filter((id) => id && scoreGroqModel(id) > 0)
        .sort((a, b) => scoreGroqModel(b) - scoreGroqModel(a));
      const finalModels = list.length ? list : [...FALLBACK_GROQ_MODELS];
      discoveredGroqModelsByKey.set(cleanKey, finalModels);
      return finalModels;
    } catch {
      return [...FALLBACK_GROQ_MODELS];
    }
  }

  async function callGroqChat({ model, apiKey, messages, temperature = 0.2, timeoutMs = 8000 }) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: 1024
        })
      });
      clearTimeout(timer);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const msg = errJson?.error?.message || `Groq HTTP ${res.status}`;
        throw new Error(msg);
      }
      const data = await res.json();
      return (data?.choices?.[0]?.message?.content || "").trim();
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  async function translateWithGroqAuto({
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
    const candidates = await discoverGroqModels(apiKey);
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

    const sys = [
      `You are an expert bilingual subtitle translator. Target language: ${targetLang}.`,
      videoTitle ? `VIDEO CONTEXT: "${videoTitle}".` : "",
      "PROFESSIONAL COHESION & FLOW (LIÊN KẾT MẠCH LẠC CÂU TRƯỚC - CÂU SAU):",
      "- TUYỆT ĐỐI KHÔNG dịch ngang từ-nối-từ 1:1 theo cấu trúc tiếng Tây máy móc.",
      "- Đọc hiểu mạch ngữ cảnh từ các câu thoại trước đó (history) và câu sau (nếu có). Kết nối ý tứ liền mạch, tự nhiên, giàu nhạc điệu và cảm xúc như dịch giả phim/show chuyên nghiệp (Netflix/HBO).",
      "- Sử dụng liên từ tiếng Việt tự nhiên ('Nhưng rồi', 'Thế là', 'Hóa ra', 'Chẳng ngờ', 'Dẫu vậy...') khi câu là vế nối tiếp hoặc câu rút gọn.",
      "- Xử lý các đại từ quy chiếu (it, that, they...) sát theo đối tượng ở câu trước thay vì dịch cứng nhắc.",
      "- Với video ca nhạc/lyrics: dịch giàu vần điệu, hình ảnh thơ ca, giữ trọn hồn bài hát.",
      "MULTI-SPEAKER DIALOGUE & LINE SEPARATION (HỘI THOẠI NHIỀU NGƯỜI NÓI):",
      "- Khi câu thoại có từ 2 người nói trở lên (dấu hiệu: có gạch đầu dòng '- ', ký hiệu '>>', tên nhân vật, ngoặc kép, hoặc câu hỏi - đáp qua lại giữa hai người):",
      "- BẮT BUỘC TÁCH MỖI NGƯỜI NÓI THÀNH MỘT DÒNG RIÊNG BIỆT. Mỗi dòng PHẢI bắt đầu bằng dấu gạch ngang và dấu cách: '- [Lời dịch người A]\\n- [Lời dịch người B]'.",
      "- TUYỆT ĐỐI KHÔNG gộp lời nói của 2 người khác nhau thành 1 câu dính liền trên cùng một dòng.",
      "- Giữ nguyên vị thế xưng hô, ngữ khí và thái độ riêng của từng người nói một cách độc lập.",
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
      "If <context_next> is provided, use it ONLY as lookahead context for grammar/pronouns — NEVER translate <context_next>. Translate ONLY <translate_now> and output ONLY the translated text without XML tags, notes or intro."
    ].filter(Boolean).join(" ");

    let userPrompt = "";
    if (isBatch) {
      userPrompt =
        `Translate each numbered subtitle line below in continuous context. Keep exact numbering format '1. ...' \\n '2. ...':\n` +
        texts.map((t, i) => `${i + 1}. ${t}`).join("\n");
    } else if (nextText && nextText.trim()) {
      userPrompt = `<context_next>${nextText.trim()}</context_next>\n<translate_now>${text}</translate_now>`;
    } else {
      userPrompt = text;
    }

    if (!isBatch && (root.VieStorage?.isMultiSpeakerDialogue?.(text) || text.includes("\n-"))) {
      userPrompt = `[Multi-speaker dialogue. Keep each speaker on separate line with '- ']:\n${userPrompt}`;
    }

    const messages = [
      { role: "system", content: sys },
      ...history.slice(-6).map((h) => [{ role: "user", content: h.src }, { role: "assistant", content: h.vi }]).flat(),
      { role: "user", content: userPrompt }
    ];

    const cleanFn = root.VieStorage?.cleanTranslatedOutput || ((s) => (s || "").trim());
    const parseBatchFn =
      root.VieStorage?.parseBatchTranslations ||
      ((raw) => raw.split("\n").map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim()).filter(Boolean));

    let lastErr = null;
    for (const m of ordered) {
      if (isModelInCooldown(apiKey, m)) continue;
      try {
        const out = await callGroqChat({ model: m, apiKey, messages });
        if (isBatch) {
          const lines = parseBatchFn(out, texts.length);
          return { translations: lines, modelUsed: m };
        }
        return { vi: cleanFn(out), modelUsed: m };
      } catch (err) {
        lastErr = err;
        markModelCooldown(apiKey, m, 120000);
      }
    }
    if (lastErr) throw lastErr;
    const cd = new Error("All Groq models are cooling down (rate_limit).");
    cd.isQuotaExceeded = true;
    throw cd;
  }

  async function transcribeWithGroqWhisper(audioBase64, mimeType, apiKey, prompt = "") {
    const binary = atob(audioBase64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mimeType || "audio/webm" });

    const form = new FormData();
    form.append("file", blob, "audio.webm");
    form.append("model", "whisper-large-v3-turbo");
    form.append("response_format", "json");
    if (prompt) form.append("prompt", prompt.slice(0, 200));

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey.trim()}` },
      body: form
    });
    if (!res.ok) throw new Error(`Groq Whisper error ${res.status}`);
    const data = await res.json();
    return (data?.text || "").trim();
  }

  root.VieGroq = {
    FALLBACK_GROQ_MODELS,
    discoverGroqModels,
    callGroqChat,
    translateWithGroqAuto,
    transcribeWithGroqWhisper
  };
})(typeof self !== "undefined" ? self : this);
