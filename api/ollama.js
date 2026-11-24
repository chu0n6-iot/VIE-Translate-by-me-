/**
 * VIE-Translate — Translate Toad AI
 * api/ollama.js — Universal Local AI via Ollama, LM Studio, Jan & OpenAI-compatible local runtimes (free, private, unlimited, no API key)
 */

(function (root) {
  "use strict";

  const DEFAULT_BASE_URL = "http://localhost:11434";
  const PREFERRED = [
    "qwen2.5:3b",
    "qwen2.5:7b",
    "qwen2.5",
    "qwen2.5:1.5b",
    "llama3.2:3b",
    "llama3.2",
    "qwen3",
    "gemma3",
    "gemma2",
    "mistral",
    "phi3"
  ];
  const OLLAMA_DISCOVERY_TTL_MS = 60000;
  const cachedOllamaModels = new Map();
  const serverProtocolMap = new Map(); // maps clean baseUrl -> "ollama" | "openai"

  function cleanBase(url) {
    return (url || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
  }

  async function localAiFetch(url, opts, timeoutMs = 15000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      if (res.status === 403) {
        throw new Error(
          'Local AI từ chối kết nối (403 CORS). Nếu dùng Ollama, chạy lệnh: set OLLAMA_ORIGINS=* rồi mở lại Ollama. Hoặc dùng LM Studio (http://localhost:1234/v1 - bật sẵn CORS).'
        );
      }
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error?.message || e?.error || `Local AI HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      if (err.name === "AbortError") throw new Error("Local AI phản hồi quá chậm (timeout) hoặc model đang quá tải.");
      if (err instanceof TypeError) {
        throw new Error(`Không thể kết nối tới Local AI tại ${url}. Hãy kiểm tra Ollama hoặc LM Studio đã được bật chưa.`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async function discoverOllamaModels(baseUrl, forceRefresh = false) {
    const base = cleanBase(baseUrl);
    const cached = cachedOllamaModels.get(base);
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      return cached.models;
    }

    let names = [];
    let detectedProto = "ollama";

    // 1. Nếu URL chỉ định rõ /v1 hoặc cổng LM Studio (1234) / Jan (1337), ưu tiên thử endpoint OpenAI trước
    const isOpenAiHint = base.endsWith("/v1") || base.includes(":1234") || base.includes(":1337") || base.includes(":8080");

    if (isOpenAiHint) {
      try {
        const openAiUrl = `${base.replace(/\/v1$/, "")}/v1/models`;
        const data = await localAiFetch(openAiUrl, {}, 3500);
        names = (data?.data || []).map((m) => m.id).filter(Boolean);
        detectedProto = "openai";
      } catch (err) {
        // Fallback sang Ollama native nếu không phải
        try {
          const data = await localAiFetch(`${base}/api/tags`, {}, 3000);
          names = (data?.models || []).map((m) => m.name).filter(Boolean);
          detectedProto = "ollama";
        } catch {
          throw err;
        }
      }
    } else {
      // Mặc định: Thử Ollama native (/api/tags) trước
      try {
        const data = await localAiFetch(`${base}/api/tags`, {}, 3000);
        names = (data?.models || []).map((m) => m.name).filter(Boolean);
        detectedProto = "ollama";
      } catch (err) {
        // Nếu /api/tags thất bại nhưng không phải lỗi 403, thử sang OpenAI endpoint (/v1/models) của LM Studio
        if (!err.message?.includes("403")) {
          try {
            const openAiUrl = `${base.replace(/\/v1$/, "")}/v1/models`;
            const data = await localAiFetch(openAiUrl, {}, 3500);
            names = (data?.data || []).map((m) => m.id).filter(Boolean);
            detectedProto = "openai";
          } catch {
            throw err;
          }
        } else {
          throw err;
        }
      }
    }

    serverProtocolMap.set(base, detectedProto);

    const score = (n) => {
      const lower = n.toLowerCase();
      const i = PREFERRED.findIndex((p) => lower.includes(p));
      return i < 0 ? 99 : i;
    };
    const sorted = names.sort((a, b) => score(a) - score(b));
    if (sorted.length > 0) {
      cachedOllamaModels.set(base, { models: sorted, expiresAt: Date.now() + OLLAMA_DISCOVERY_TTL_MS });
    }
    return sorted;
  }

  async function translateWithOllama({
    text,
    texts,
    nextText = "",
    videoTitle = "",
    videoPersona = "",
    glossary = [],
    history = [],
    baseUrl,
    preferredModel = "",
    targetLang = "vi",
    translationStyle = "natural",
    pronounStyle = "auto",
    lockedPronounPair = "",
    softenProfanity = true,
    multiSpeakerSplit = true
  }) {
    const base = cleanBase(baseUrl);
    let model = preferredModel && preferredModel !== "auto" ? preferredModel : "";
    if (!model) {
      const list = await discoverOllamaModels(base);
      if (!list.length) {
        throw new Error("Local AI chưa có model nào. Hãy chạy: ollama pull qwen2.5:3b (hoặc tải model trong LM Studio).");
      }
      model = list[0];
    }

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
          multiSpeakerSplit,
          isLocal: true
        })
      : {
          systemPrompt: `You are a professional subtitle translator. Translate into ${targetLang}.`,
          userPrompt: Array.isArray(texts) && texts.length ? texts.map((t, i) => `[[${i + 1}]] ${t}`).join("\n") : (text || ""),
          isBatch: Array.isArray(texts) && texts.length > 0
        };

    const sysMsg = model.toLowerCase().includes("qwen3") ? `${systemPrompt} /no_think` : systemPrompt;

    const messages = [
      { role: "system", content: sysMsg },
      ...history.slice(-3).flatMap((h) => [{ role: "user", content: h.src }, { role: "assistant", content: h.vi }]),
      { role: "user", content: userPrompt }
    ];

    const detectedProto = serverProtocolMap.get(base) || (base.endsWith("/v1") || base.includes(":1234") || base.includes(":1337") ? "openai" : "ollama");

    let out = "";
    if (detectedProto === "openai") {
      // Chuẩn OpenAI Chat Completions (LM Studio, Jan, LocalAI, vLLM, Ollama /v1)
      const epUrl = `${base.replace(/\/v1$/, "")}/v1/chat/completions`;
      const data = await localAiFetch(epUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.1,
          max_tokens: isBatch ? 1200 : 280
        })
      }, 35000);
      out = (data?.choices?.[0]?.message?.content || "").trim();
    } else {
      // Chuẩn Ollama Native (/api/chat)
      const data = await localAiFetch(`${base}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          keep_alive: "60m",
          options: { temperature: 0.1, num_predict: isBatch ? 1200 : 280 }
        })
      }, 35000);
      out = (data?.message?.content || "").trim();
    }

    if (!out) throw new Error("Local AI trả về nội dung rỗng.");
    const cleanFn = S.cleanTranslatedOutput || ((s) => (s || "").replace(/^["“]|["”]$/g, "").trim());
    const parseBatchFn =
      S.parseBatchTranslations ||
      ((raw) => raw.split("\n").map((l) => l.replace(/^\d+[.)]\s*/, "").trim()).filter(Boolean));
    if (isBatch) {
      const lines = parseBatchFn(out, texts.length);
      return { translations: lines, modelUsed: model };
    }
    return { vi: cleanFn(out), modelUsed: model };
  }

  root.VieOllama = {
    DEFAULT_BASE_URL,
    discoverOllamaModels,
    translateWithOllama,
    discoverLocalModels: discoverOllamaModels,
    translateWithLocalAi: translateWithOllama
  };
  root.VieLocalAI = root.VieOllama;
})(typeof self !== "undefined" ? self : this);
