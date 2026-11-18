/**
 * VIE-Translate — Translate Toad AI
 * api/gtx.js — Instant zero-key translation fallback via Google Translate
 */

(function (root) {
  "use strict";

  async function translateWithGoogleFree(text, targetLang = "vi", timeoutMs = 3500) {
    if (!text || !text.trim()) return "";
    const clean = text.trim();
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=auto&tl=${encodeURIComponent(
      targetLang
    )}&q=${encodeURIComponent(clean)}`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`GTX HTTP ${res.status}`);
      const data = await res.json();
      if (!data || !Array.isArray(data[0])) return "";
      return data[0].map((item) => item[0] || "").join("").trim();
    } finally {
      clearTimeout(timer);
    }
  }

  async function translateBatchWithGoogleFree(texts, targetLang = "vi", timeoutMs = 4500) {
    if (!Array.isArray(texts) || !texts.length) return [];
    if (texts.length === 1) {
      const single = await translateWithGoogleFree(texts[0], targetLang, timeoutMs);
      return [single];
    }

    const CHUNK_SIZE = 12;
    const allResults = [];
    const parseFn =
      root.VieStorage?.parseBatchTranslations ||
      ((raw, n) => {
        const matches = [...String(raw || "").matchAll(/(?:^|\n)\s*\[\[\s*(\d+)\s*\]\]\s*/g)];
        const out = new Array(n).fill("");
        for (let i = 0; i < matches.length; i++) {
          const num = parseInt(matches[i][1], 10);
          const start = matches[i].index + matches[i][0].length;
          const end = i + 1 < matches.length ? matches[i + 1].index : raw.length;
          if (num >= 1 && num <= n) out[num - 1] = raw.slice(start, end).trim();
        }
        return out;
      });

    for (let offset = 0; offset < texts.length; offset += CHUNK_SIZE) {
      const chunk = texts.slice(offset, offset + CHUNK_SIZE);
      const joined = chunk.map((t, i) => `[[${i + 1}]]\n${t}`).join("\n");
      let parsed = new Array(chunk.length).fill("");
      try {
        const combinedOut = await translateWithGoogleFree(joined, targetLang, timeoutMs);
        const candidate = parseFn(combinedOut, chunk.length);
        if (Array.isArray(candidate)) {
          for (let i = 0; i < chunk.length; i++) {
            parsed[i] = (candidate[i] || "").trim();
          }
        }
      } catch {
        // If batch URL exceeds limit or errors, recover each item individually
      }

      const missingIdxs = [];
      for (let i = 0; i < chunk.length; i++) {
        if (!parsed[i] && chunk[i] && chunk[i].trim()) {
          missingIdxs.push(i);
        }
      }
      if (missingIdxs.length > 0) {
        await Promise.all(
          missingIdxs.map(async (i) => {
            try {
              parsed[i] = await translateWithGoogleFree(chunk[i], targetLang, timeoutMs);
            } catch {
              parsed[i] = "";
            }
          })
        );
      }
      allResults.push(...parsed);
    }

    return allResults;
  }

  root.VieGTX = {
    translate: translateWithGoogleFree,
    translateWithGoogleFree,
    translateBatch: translateBatchWithGoogleFree,
    translateBatchWithGoogleFree
  };
  root.VieGtx = root.VieGTX;
})(typeof self !== "undefined" ? self : this);
