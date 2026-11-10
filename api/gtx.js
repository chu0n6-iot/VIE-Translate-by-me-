/**
 * VIE-Translate — Translate Toad AI
 * api/gtx.js — Instant zero-key translation fallback via Google Translate
 */

(function (root) {
  "use strict";

  async function translateWithGoogleFree(text, targetLang = "vi") {
    if (!text || !text.trim()) return "";
    const clean = text.trim();
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=auto&tl=${encodeURIComponent(
      targetLang
    )}&q=${encodeURIComponent(clean)}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`GTX HTTP ${res.status}`);
    const data = await res.json();
    if (!data || !Array.isArray(data[0])) return "";
    return data[0].map((item) => item[0] || "").join("").trim();
  }

  root.VieGTX = {
    translate: translateWithGoogleFree,
    translateWithGoogleFree
  };
  root.VieGtx = root.VieGTX;
})(typeof self !== "undefined" ? self : this);
