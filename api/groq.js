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
  const inFlightGroqDiscovery = new Map();
  const cooldownGroqModels = new Map();
  const lastWorkingGroqModelByKey = new Map();

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
    else if (m.includes("llama-4-maverick")) score += 1750;
    else if (m.includes("llama-4-scout")) score += 1650;
    else if (m.includes("qwen3")) score += 1500;
    else if (m.includes("llama-3.1-8b")) score += 1400;
    else if (m.includes("gemma2-9b")) score += 1100;
    return score;
  }

  async function discoverGroqModels(apiKey) {
    const cleanKey = (apiKey || "").trim();
    if (!cleanKey) return [...FALLBACK_GROQ_MODELS];
    if (discoveredGroqModelsByKey.has(cleanKey)) {
      return discoveredGroqModelsByKey.get(cleanKey);
    }
    if (inFlightGroqDiscovery.has(cleanKey)) {
      return inFlightGroqDiscovery.get(cleanKey);
    }
    const promise = (async () => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3500);
      try {
        const res = await fetch("https://api.groq.com/openai/v1/models", {
          signal: ctrl.signal,
          headers: { Authorization: `Bearer ${cleanKey}` }
        });
        clearTimeout(timer);
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
        clearTimeout(timer);
        return [...FALLBACK_GROQ_MODELS];
      } finally {
        inFlightGroqDiscovery.delete(cleanKey);
      }
    })();
    inFlightGroqDiscovery.set(cleanKey, promise);
    return promise;
  }

  async function callGroqChat({ model, apiKey, messages, temperature = 0.2, maxTokens = 1024, timeoutMs = 8000 }) {
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
          max_tokens: maxTokens
        })
      });
      clearTimeout(timer);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const msg = errJson?.error?.message || `Groq HTTP ${res.status}`;
        const err = new Error(msg);
        err.status = res.status;
        err.isQuotaExceeded = res.status === 429 || /rate_limit|quota|tokens per minute|requests per/i.test(msg);
        throw err;
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
          systemPrompt: `You are an expert bilingual subtitle translator. Target language: ${targetLang}.`,
          userPrompt: Array.isArray(texts) && texts.length ? texts.map((t, i) => `[[${i + 1}]] ${t}`).join("\n") : (text || ""),
          isBatch: Array.isArray(texts) && texts.length > 0
        };

    const candidates = await discoverGroqModels(apiKey);
    const ordered = [];
    const stickyModel = lastWorkingGroqModelByKey.get(apiKey);
    if (preferredModel && preferredModel !== "auto" && candidates.includes(preferredModel)) {
      ordered.push(preferredModel);
    } else if (stickyModel && candidates.includes(stickyModel) && !isModelInCooldown(apiKey, stickyModel)) {
      ordered.push(stickyModel);
    }
    for (const m of candidates) {
      if (!ordered.includes(m)) ordered.push(m);
    }

    const historyMessages = history.slice(-6).map((h) => [
      { role: "user", content: h.src },
      { role: "assistant", content: h.vi }
    ]).flat();

    const cleanFn = root.VieStorage?.cleanTranslatedOutput || ((s) => (s || "").trim());
    const parseBatchFn =
      root.VieStorage?.parseBatchTranslations ||
      ((raw) => raw.split("\n").map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim()).filter(Boolean));
    const maxTokens = isBatch ? 1536 : 320;
    const timeoutMs = isBatch ? 8500 : 5000;

    const MAX_ATTEMPTS = 3;
    let attempts = 0;
    let lastErr = null;
    for (const m of ordered) {
      if (isModelInCooldown(apiKey, m)) continue;
      if (attempts >= MAX_ATTEMPTS) break;
      attempts++;

      const sysMsg = m.toLowerCase().includes("qwen3") ? `${systemPrompt} /no_think` : systemPrompt;
      const messages = [
        { role: "system", content: sysMsg },
        ...historyMessages,
        { role: "user", content: userPrompt }
      ];

      try {
        const out = await callGroqChat({ model: m, apiKey, messages, maxTokens, timeoutMs });
        if (!out || root.VieGemini?.looksLikeRefusal?.(out)) {
          throw new Error("Groq returned empty or refused output.");
        }
        lastWorkingGroqModelByKey.set(apiKey, m);
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
        const isQuota = err?.isQuotaExceeded || err?.status === 429 || /rate_limit|quota|429/i.test(err?.message || "");
        markModelCooldown(apiKey, m, isQuota ? 600000 : 120000);
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
