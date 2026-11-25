/**
 * VIE-Translate — Translate Toad AI
 * content/youtube-hook.js — MAIN world passive interceptor for YouTube /api/timedtext (PO Token safe) & player metadata
 */

(function () {
  "use strict";
  if (window.__vieYtHookInstalled) return;
  window.__vieYtHookInstalled = true;

  function extractVideoIdFromUrl(urlStr) {
    try {
      const u = new URL(urlStr, location.origin);
      const v = u.searchParams.get("v");
      if (v) return v;
    } catch {}
    try {
      const m = String(location.href || "").match(/[?&]v=([^&#]+)|\/(?:shorts|embed|live)\/([^/?&#]+)/);
      return (m && (m[1] || m[2])) || "";
    } catch {}
    return "";
  }

  function decodeXmlEntities(str) {
    return String(str || "")
      .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'");
  }

  function parseTimedtextPayload(rawText) {
    const raw = String(rawText || "").trim();
    if (!raw) return [];
    const events = [];

    // 1. JSON3 format
    if (raw.startsWith("{")) {
      try {
        const data = JSON.parse(raw);
        for (const ev of data?.events || []) {
          if (!ev || !Array.isArray(ev.segs)) continue;
          const text = ev.segs.map((sg) => sg.utf8 || "").join("").replace(/\s+/g, " ").trim();
          if (!text) continue;
          const start = (Number(ev.tStartMs) || 0) / 1000;
          const dur = (Number(ev.dDurationMs) || 2000) / 1000;
          events.push({ start, end: start + dur, text });
        }
        return events;
      } catch {}
    }

    // 2. XML timedtext formats (<text start=".." dur=".."> or <p t=".." d="..">)
    try {
      const pRe = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
      let pm;
      while ((pm = pRe.exec(raw)) !== null) {
        const attrs = pm[1] || "";
        const tMatch = attrs.match(/\bt=["'](\d+)["']/i);
        const dMatch = attrs.match(/\bd=["'](\d+)["']/i);
        if (!tMatch) continue;
        const inner = pm[2].replace(/<[^>]+>/g, " ");
        const text = decodeXmlEntities(inner).replace(/\s+/g, " ").trim();
        if (!text) continue;
        const start = Number(tMatch[1]) / 1000;
        const dur = dMatch ? Number(dMatch[1]) / 1000 : 2.0;
        events.push({ start, end: start + dur, text });
      }
      if (events.length > 0) return events;

      const textRe = /<text\b([^>]*)>([\s\S]*?)<\/text>/gi;
      let tm;
      while ((tm = textRe.exec(raw)) !== null) {
        const attrs = tm[1] || "";
        const sMatch = attrs.match(/\bstart=["']([\d.]+)["']/i);
        const durMatch = attrs.match(/\bdur=["']([\d.]+)["']/i);
        if (!sMatch) continue;
        const inner = tm[2].replace(/<[^>]+>/g, " ");
        const text = decodeXmlEntities(inner).replace(/\s+/g, " ").trim();
        if (!text) continue;
        const start = parseFloat(sMatch[1]) || 0;
        const dur = durMatch ? parseFloat(durMatch[1]) || 2.0 : 2.0;
        events.push({ start, end: start + dur, text });
      }
    } catch {}

    return events;
  }

  function handleTimedtextResponse(urlStr, rawText) {
    try {
      const events = parseTimedtextPayload(rawText);
      if (!events.length) return;
      const vid = extractVideoIdFromUrl(urlStr);
      const isAsr = /[?&]kind=asr\b/i.test(urlStr);
      window.postMessage(
        {
          type: "VIE_YT_TIMEDTEXT",
          vid,
          isAsr,
          events
        },
        "*"
      );
    } catch {}
  }

  // Passive wrap window.fetch
  const origFetch = window.fetch;
  if (typeof origFetch === "function") {
    window.fetch = function (...args) {
      const p = origFetch.apply(this, args);
      try {
        const reqUrl = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
        if (reqUrl && reqUrl.includes("/api/timedtext")) {
          p.then((res) => {
            if (res && res.ok && typeof res.clone === "function") {
              res.clone().text().then((txt) => handleTimedtextResponse(reqUrl, txt)).catch(() => {});
            }
          }).catch(() => {});
        }
      } catch {}
      return p;
    };
  }

  // Passive wrap XMLHttpRequest
  if (typeof XMLHttpRequest !== "undefined" && XMLHttpRequest.prototype) {
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      try {
        this._vieUrl = typeof url === "string" ? url : String(url || "");
      } catch {}
      return origOpen.apply(this, [method, url, ...rest]);
    };

    XMLHttpRequest.prototype.send = function (...args) {
      try {
        if (this._vieUrl && this._vieUrl.includes("/api/timedtext") && !this._vieListening) {
          this._vieListening = true;
          this.addEventListener("load", () => {
            try {
              if (this.status >= 200 && this.status < 300 && typeof this.responseText === "string") {
                handleTimedtextResponse(this._vieUrl, this.responseText);
              }
            } catch {}
          });
        }
      } catch {}
      return origSend.apply(this, args);
    };
  }

  // Metadata bridge for ISOLATED world content scripts
  window.addEventListener("message", (e) => {
    if (e.source !== window || !e.data || e.data.type !== "VIE_YT_REQUEST_META") return;
    try {
      const mp = document.getElementById("movie_player");
      const pr = (mp && typeof mp.getPlayerResponse === "function" ? mp.getPlayerResponse() : null) || window.ytInitialPlayerResponse || null;
      const vd = pr?.videoDetails || {};
      const tracks = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
      window.postMessage(
        {
          type: "VIE_YT_META_RESPONSE",
          vid: vd.videoId || extractVideoIdFromUrl(location.href),
          title: vd.title || "",
          duration: Number(vd.lengthSeconds) || 0,
          author: vd.author || "",
          captionTracks: Array.isArray(tracks) ? tracks : []
        },
        "*"
      );
    } catch {}
  });
})();
