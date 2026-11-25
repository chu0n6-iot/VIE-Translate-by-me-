/**
 * VIE-Translate — Translate Toad AI
 * api/openai.js — Universal OpenAI-Compatible Cloud API client (OpenRouter, DeepSeek, Cerebras, Mistral & Custom endpoints)
 */

(function (root) {
  "use strict";

  const PRESETS = {
    openrouter: {
      name: "OpenRouter (Free)",
      baseUrl: "https://openrouter.ai/api/v1",
      defaultModels: [
        "meta-llama/llama-3.3-70b-instruct:free",
        "google/gemma-3-27b-it:free",
        "qwen/qwen3-32b:free",
        "deepseek/deepseek-chat-v3-0324:free"
      ]
    },
    deepseek: {
      name: "DeepSeek",
      baseUrl: "https://api.deepseek.com/v1",
      defaultModels: ["deepseek-chat"]
    },
    cerebras: {
      name: "Cerebras (Ultra Fast)",
      baseUrl: "https://api.cerebras.ai/v1",
      defaultModels: ["llama-3.3-70b", "llama3.1-8b"]
    },
    mistral: {
      name: "Mistral AI",
      baseUrl: "https://api.mistral.ai/v1",
      defaultModels: ["mistral-small-latest", "open-mistral-nemo"]
    }
  };

  const discoveredModelsByKey = new Map();
  const inFlightDiscovery = new Map();
  const cooldownModels = new Map();
  const lastWorkingModelByKey = new Map();

  function cleanBase(url) {
    const raw = (url || PRESETS.openrouter.baseUrl).trim().replace(/\/+$/, "");
    if (!raw) return PRESETS.openrouter.baseUrl;
    if (/\/v\d+$/i.test(raw)) return raw;
    if (raw.includes("openrouter.ai/api")) return raw.endsWith("/v1") ? raw : `${raw}/v1`;
    return raw;
  }

  function getDefaultModelsForUrl(baseUrl) {
    const u = (baseUrl || "").toLowerCase();
    if (u.includes("deepseek.com")) return [...PRESETS.deepseek.defaultModels];
    if (u.includes("cerebras.ai")) return [...PRESETS.cerebras.defaultModels];
    if (u.includes("mistral.ai")) return [...PRESETS.mistral.defaultModels];
    return [...PRESETS.openrouter.defaultModels];
  }

  function isModelInCooldown(cacheKey, modelId) {
    const k = `${cacheKey}:${modelId}`;
    const until = cooldownModels.get(k);
    if (!until) return false;
    if (Date.now() > until) {
      cooldownModels.delete(k);
      return false;
    }
    return true;
  }

  function markModelCooldown(cacheKey, modelId, durationMs = 180000) {
    cooldownModels.set(`${cacheKey}:${modelId}`, Date.now() + durationMs);
  }

  function scoreOpenAIModel(modelId, baseUrl = "") {
    const m = (modelId || "").toLowerCase();
    if (
      m.includes("whisper") ||
      m.includes("embedding") ||
      m.includes("tts") ||
      m.includes("dall-e") ||
      m.includes("moderation") ||
      m.includes("guard") ||
      m.includes("reasoner")
    ) {
      return -9999;
    }
    const isOpenRouter = (baseUrl || "").toLowerCase().includes("openrouter.ai");
    let score = 50;
    if (isOpenRouter && m.endsWith(":free")) score += 3000;
    if (m.includes("llama-3.3-70b")) score += 1200;
    else if (m.includes("deepseek-chat")) score += 1150;
    else if (m.includes("gemma-3-27b")) score += 1100;
    else if (m.includes("qwen3")) score += 1050;
    else if (m.includes("qwen2.5")) score += 950;
    else if (m.includes("mistral-small")) score += 900;
    else if (m.includes("llama-3.1-8b") || m.includes("llama3.1-8b")) score += 850;
    else if (m.includes("gpt-4o-mini") || m.includes("gpt-4.1-mini")) score += 800;
    return score;
  }

  async function discoverModels(baseUrl, apiKey) {
    const base = cleanBase(baseUrl);
    const cleanKey = (apiKey || "").trim();
    const cacheId = `${base}:${cleanKey}`;
    const defaults = getDefaultModelsForUrl(base);

    if (!cleanKey) return defaults;
    if (discoveredModelsByKey.has(cacheId)) {
      return discoveredModelsByKey.get(cacheId);
    }
    if (inFlightDiscovery.has(cacheId)) {
      return inFlightDiscovery.get(cacheId);
    }

    const promise = (async () => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3500);
      try {
        const res = await fetch(`${base}/models`, {
          signal: ctrl.signal,
          headers: { Authorization: `Bearer ${cleanKey}` }
        });
        clearTimeout(timer);
        if (!res.ok) return defaults;
        const data = await res.json();
        const rawList = Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : [];
        const list = rawList
          .map((m) => m.id || m.name || "")
          .filter((id) => id && scoreOpenAIModel(id, base) > 0)
          .sort((a, b) => scoreOpenAIModel(b, base) - scoreOpenAIModel(a, base))
          .slice(0, 40);
        const finalModels = list.length ? list : defaults;
        discoveredModelsByKey.set(cacheId, finalModels);
        return finalModels;
      } catch {
        clearTimeout(timer);
        return defaults;
      } finally {
        inFlightDiscovery.delete(cacheId);
      }
    })();

    inFlightDiscovery.set(cacheId, promise);
    return promise;
  }

  async function callChat({
    baseUrl,
    model,
    apiKey,
    messages,
    temperature = 0.2,
    maxTokens = 1024,
    timeoutMs = 9000
  }) {
    const base = cleanBase(baseUrl);
    const cleanKey = (apiKey || "").trim();
    if (!cleanKey) throw new Error("Vui lòng nhập API Key cho dịch vụ OpenAI-Compatible.");

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cleanKey}`
    };
    if (base.toLowerCase().includes("openrouter.ai")) {
      headers["HTTP-Referer"] = "https://github.com/chu0n6-iot/VIE-Translate-by-me-";
      headers["X-Title"] = "VIE-Translate Toad AI";
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        signal: ctrl.signal,
        headers,
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
        const msg = errJson?.error?.message || `OpenAI-Compatible HTTP ${res.status}`;
        const err = new Error(msg);
        err.status = res.status;
        err.isQuotaExceeded =
          res.status === 429 || /rate_limit|quota|credit|tokens per|requests per/i.test(msg);
        throw err;
      }
      const data = await res.json();
      return (data?.choices?.[0]?.message?.content || "").trim();
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  async function translateWithOpenAIAuto({
    text,
    texts,
    nextText = "",
    videoTitle = "",
    videoPersona = "",
    glossary = [],
    history = [],
    baseUrl,
    apiKey,
    preferredModel = "auto",
    targetLang = "vi",
    translationStyle = "natural",
    pronounStyle = "auto",
    lockedPronounPair = "",
    softenProfanity = true,
    multiSpeakerSplit = true
  }) {
    const base = cleanBase(baseUrl);
    const cacheId = `${base}:${(apiKey || "").trim()}`;
    const S = root.VieStorage || {};

    const { systemPrompt, userPrompt, isBatch } = S.buildTranslationPrompts
      ? S.buildTranslationPrompts({
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

    const candidates = await discoverModels(base, apiKey);
    const ordered = [];
    const stickyModel = lastWorkingModelByKey.get(cacheId);
    if (preferredModel && preferredModel !== "auto") {
      ordered.push(preferredModel);
    } else if (stickyModel && candidates.includes(stickyModel) && !isModelInCooldown(cacheId, stickyModel)) {
      ordered.push(stickyModel);
    }
    for (const m of candidates) {
      if (!ordered.includes(m)) ordered.push(m);
    }

    const historyMessages = history.slice(-6).flatMap((h) => [
      { role: "user", content: h.src },
      { role: "assistant", content: h.vi }
    ]);

    const cleanFn = S.cleanTranslatedOutput || ((s) => (s || "").trim());
    const parseBatchFn =
      S.parseBatchTranslations ||
      ((raw) => raw.split("\n").map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim()).filter(Boolean));
    const maxTokens = isBatch ? 1536 : 320;
    const timeoutMs = isBatch ? 12000 : 7500;

    const MAX_ATTEMPTS = 3;
    let attempts = 0;
    let lastErr = null;
    for (const m of ordered) {
      if (isModelInCooldown(cacheId, m)) continue;
      if (attempts >= MAX_ATTEMPTS) break;
      attempts++;

      const sysMsg = m.toLowerCase().includes("qwen3") ? `${systemPrompt} /no_think` : systemPrompt;
      const messages = [
        { role: "system", content: sysMsg },
        ...historyMessages,
        { role: "user", content: userPrompt }
      ];

      try {
        const out = await callChat({ baseUrl: base, model: m, apiKey, messages, maxTokens, timeoutMs });
        if (!out || root.VieGemini?.looksLikeRefusal?.(out)) {
          throw new Error("OpenAI-Compatible API returned empty or refused output.");
        }
        lastWorkingModelByKey.set(cacheId, m);
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
        const isQuota =
          err?.isQuotaExceeded || err?.status === 429 || /rate_limit|quota|429/i.test(err?.message || "");
        markModelCooldown(cacheId, m, isQuota ? 600000 : 120000);
      }
    }

    if (lastErr) throw lastErr;
    const cd = new Error("All OpenAI-Compatible models are cooling down.");
    cd.isQuotaExceeded = true;
    throw cd;
  }

  async function callOpenAIJson({ prompt, baseUrl, apiKey, preferredModel = "auto", maxTokens = 1100 }) {
    const base = cleanBase(baseUrl);
    const cacheId = `${base}:${(apiKey || "").trim()}`;
    const candidates = await discoverModels(base, apiKey);
    const ordered = [];
    if (preferredModel && preferredModel !== "auto") ordered.push(preferredModel);
    for (const m of candidates) if (!ordered.includes(m)) ordered.push(m);

    let lastErr = null;
    for (const m of ordered.slice(0, 3)) {
      if (isModelInCooldown(cacheId, m)) continue;
      try {
        const sys = m.toLowerCase().includes("qwen3")
          ? "Return ONLY valid JSON without markdown or commentary. /no_think"
          : "Return ONLY valid JSON without markdown or commentary.";
        const raw = await callChat({
          baseUrl: base,
          model: m,
          apiKey,
          messages: [
            { role: "system", content: sys },
            { role: "user", content: prompt }
          ],
          temperature: 0.2,
          maxTokens,
          timeoutMs: 10000
        });
        const parsed = root.VieStorage?.parseJsonSafe
          ? root.VieStorage.parseJsonSafe(raw)
          : JSON.parse(String(raw).replace(/```json|```/g, "").trim());
        if (parsed && typeof parsed === "object") {
          return { ok: true, ...parsed, modelUsed: m };
        }
        throw new Error("Invalid JSON from OpenAI-Compatible API");
      } catch (err) {
        lastErr = err;
        if (err?.status === 401 || err?.status === 403) break;
        markModelCooldown(cacheId, m, err?.status === 429 ? 600000 : 60000);
      }
    }
    throw lastErr || new Error("OpenAI-Compatible JSON request failed.");
  }

  async function lookupWordWithOpenAI(word, sentence, baseUrl, apiKey, preferredModel = "auto", targetLang = "vi") {
    const prompt = root.VieStorage?.buildLookupPrompt
      ? root.VieStorage.buildLookupPrompt(word, sentence, targetLang)
      : `Explain word "${word}" in "${sentence}" in ${targetLang}. Return JSON.`;
    return await callOpenAIJson({ prompt, baseUrl, apiKey, preferredModel, maxTokens: 1200 });
  }

  async function explainSceneWithOpenAI({ sentence, vi, focusWord, baseUrl, apiKey, preferredModel = "auto", targetLang = "vi" }) {
    const prompt = root.VieStorage?.buildExplainScenePrompt
      ? root.VieStorage.buildExplainScenePrompt(sentence, vi, focusWord, targetLang)
      : `Analyze subtitle "${sentence}" (${vi}) in ${targetLang}. Return JSON.`;
    return await callOpenAIJson({ prompt, baseUrl, apiKey, preferredModel, maxTokens: 850 });
  }

  root.VieOpenAI = {
    PRESETS,
    cleanBase,
    discoverModels,
    callChat,
    translateWithOpenAIAuto,
    lookupWordWithOpenAI,
    explainSceneWithOpenAI
  };
})(typeof self !== "undefined" ? self : typeof globalThis !== "undefined" ? globalThis : this);
