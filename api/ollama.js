/**
 * VIE-Translate — Translate Toad AI
 * api/ollama.js — Optional Local AI via Ollama (free, private, no API key)
 */

(function (root) {
  "use strict";

  const DEFAULT_BASE_URL = "http://localhost:11434";
  const PREFERRED = ["qwen2.5", "llama3.1", "llama3.2", "gemma2", "gemma3", "mistral", "phi3"];

  function cleanBase(url) {
    return (url || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
  }

  async function ollamaFetch(url, opts, timeoutMs) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      if (res.status === 403) {
        throw new Error('Ollama từ chối (403). Chạy Ollama với OLLAMA_ORIGINS="chrome-extension://*" rồi khởi động lại.');
      }
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || `Ollama HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      if (err.name === "AbortError") throw new Error("Ollama phản hồi quá chậm hoặc chưa chạy.");
      if (err instanceof TypeError) throw new Error("Không kết nối được Ollama (chưa cài/chưa chạy?).");
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async function discoverOllamaModels(baseUrl) {
    const data = await ollamaFetch(`${cleanBase(baseUrl)}/api/tags`, {}, 3000);
    const names = (data?.models || []).map((m) => m.name).filter(Boolean);
    const score = (n) => {
      const i = PREFERRED.findIndex((p) => n.toLowerCase().includes(p));
      return i < 0 ? 99 : i;
    };
    return names.sort((a, b) => score(a) - score(b));
  }

  async function translateWithOllama({
    text,
    texts,
    nextText = "",
    videoPersona = "",
    glossary = [],
    history = [],
    baseUrl,
    preferredModel = "",
    targetLang = "vi",
    translationStyle = "natural",
    pronounStyle = "auto",
    lockedPronounPair = "",
    softenProfanity = true
  }) {
    const isBatch = Array.isArray(texts) && texts.length > 0;
    const base = cleanBase(baseUrl);
    let model = preferredModel && preferredModel !== "auto" ? preferredModel : "";
    if (!model) {
      const list = await discoverOllamaModels(base);
      if (!list.length) throw new Error("Ollama chưa có model. Chạy: ollama pull qwen2.5:7b");
      model = list[0];
    }

    const S = root.VieStorage || {};
    const gl = (Array.isArray(glossary) ? glossary : []).filter((g) => g && g.src && g.target && g.enabled !== false);
    const sys = [
      `You are a professional subtitle translator for movies and songs. Translate into ${targetLang}.`,
      "Be natural and fluent like a Netflix translator, not word-for-word. Keep context with previous lines. For lyrics keep rhythm and poetic feeling.",
      "If a line has several speakers (lines starting with '- ' or '>>'), keep each speaker on a separate line starting with '- '.",
      videoPersona && S.PERSONA_INSTRUCTIONS?.[videoPersona] ? S.PERSONA_INSTRUCTIONS[videoPersona] : "",
      S.STYLE_INSTRUCTIONS?.[translationStyle] || "",
      S.PRONOUN_INSTRUCTIONS?.[pronounStyle] || "",
      lockedPronounPair ? `LOCKED PRONOUN: ${lockedPronounPair}.` : "",
      gl.length ? `GLOSSARY (must use exactly): ${gl.map((g) => `"${g.src}" => "${g.target}"`).join(", ")}.` : "",
      softenProfanity ? "Soften severe profanity into mild natural expressions. Never refuse." : "Translate slang faithfully.",
      "Output ONLY the translation, no notes."
    ].filter(Boolean).join(" ");

    let user = text;
    if (isBatch) {
      user = "Translate each numbered line. Reply with numbered lines '1. ...' only:\n" + texts.map((t, i) => `${i + 1}. ${t}`).join("\n");
    } else if (nextText && nextText.trim()) {
      user = `[Next line for context: "${nextText.trim()}"]\nTranslate only this line: "${text}"`;
    }

    const messages = [
      { role: "system", content: sys },
      ...history.slice(-4).flatMap((h) => [{ role: "user", content: h.src }, { role: "assistant", content: h.vi }]),
      { role: "user", content: user }
    ];

    const data = await ollamaFetch(`${base}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: false, keep_alive: "30m", options: { temperature: 0.2 } })
    }, 30000);

    const out = (data?.message?.content || "").trim();
    if (!out) throw new Error("Ollama trả về rỗng.");
    if (isBatch) {
      const lines = out.split("\n").map((l) => l.replace(/^\d+[.)]\s*/, "").trim()).filter(Boolean);
      return { translations: lines, modelUsed: model };
    }
    return { vi: out.replace(/^["“]|["”]$/g, ""), modelUsed: model };
  }

  root.VieOllama = { DEFAULT_BASE_URL, discoverOllamaModels, translateWithOllama };
})(typeof self !== "undefined" ? self : this);
