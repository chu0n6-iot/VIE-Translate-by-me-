/**
 * VIE-Translate — Translate Toad AI
 * api/lyrics.js — Synchronized song lyrics search & LRC parser (LRCLIB)
 */

(function (root) {
  "use strict";

  const songLyricsCache = new Map();

  function cleanSongTitleForLyrics(rawTitle, channelName = "") {
    let s = (rawTitle || "").trim();
    if (!s) return { primary: "", secondary: "" };

    const noiseBracketRegex =
      /[\(\[\{【][^)\]\}】]*\b(official|music\s*video|m\/v|mv|lyric|lyrics|audio|visualizer|live|performance|vietsub|engsub|sub|karaoke|hd|4k|hq|remaster|remastered|prod\.?|ost|soundtrack|ver\.?|version|full|clip|video|color\s*coded|pinyin|romaji|han|eng|vi)\b[^)\]\}】]*[\)\]\}】]/gi;
    s = s.replace(noiseBracketRegex, " ");

    s = s
      .replace(/#\S+/g, " ")
      .replace(/\s+[\|｜\/]{1,2}\s+.*$/, " ")
      .replace(/\b(official\s+music\s+video|official\s+video|official\s+mv|official\s+audio|lyrics?\s+video|m\/v)\b/gi, " ")
      .replace(/\b(ft\.?|feat\.?|featuring)\s+[^-\(\[\|]+/gi, " ")
      .replace(/[“”"''`´]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const cleanChannel = (channelName || "")
      .replace(/\b(official|vevo|topic|music|records|entertainment|channel)\b/gi, "")
      .replace(/\s*-\s*topic$/i, "")
      .replace(/\s+/g, " ")
      .trim();

    let secondary = "";
    if (s.includes(" - ")) {
      const parts = s
        .split(" - ")
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length >= 2) {
        secondary = `${parts[0]} ${parts[1]}`.replace(/\s+/g, " ").trim();
      }
    } else if (cleanChannel && !s.toLowerCase().includes(cleanChannel.toLowerCase())) {
      secondary = `${cleanChannel} ${s}`.trim();
    }

    return { primary: s, secondary };
  }

  function parseSyncedLrcToCues(lrcText) {
    if (!lrcText || typeof lrcText !== "string") return [];
    const lines = lrcText.split(/\r?\n/);
    const rawCues = [];
    const timeRegex = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

    for (const line of lines) {
      timeRegex.lastIndex = 0;
      const times = [];
      let match;
      while ((match = timeRegex.exec(line)) !== null) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const fracRaw = match[3] || "0";
        const frac = parseInt(fracRaw.padEnd(3, "0").slice(0, 3), 10) / 1000;
        times.push(min * 60 + sec + frac);
      }
      if (!times.length) continue;

      const text = line
        .replace(/\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\]/g, "")
        .replace(/^[\s♪♫♬〜~\-]+|[\s♪♫♬〜~\-]+$/g, "")
        .trim();

      if (!text || /^(instrumental|intro|outro|music)$/i.test(text)) continue;

      for (const t of times) {
        rawCues.push({ start: t, text });
      }
    }

    rawCues.sort((a, b) => a.start - b.start);

    const cues = [];
    for (let i = 0; i < rawCues.length; i++) {
      const cur = rawCues[i];
      const next = rawCues[i + 1];
      const end = next ? Math.min(next.start, cur.start + 7.0) : cur.start + 5.0;
      if (end > cur.start + 0.15) {
        cues.push({ start: cur.start, end, text: cur.text });
      }
    }
    return cues;
  }

  async function searchLrclibCandidates(query) {
    if (!query || query.length < 2) return [];
    try {
      const url = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3500);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async function searchLyrics({ videoTitle, channelName, duration }) {
    const rawTitle = (videoTitle || "").trim();
    const cleanDuration = Number(duration) || 0;
    if (!rawTitle) return { found: false };

    const cacheKey = `${rawTitle.toLowerCase()}::${Math.round(cleanDuration / 5)}`;
    if (songLyricsCache.has(cacheKey)) {
      return songLyricsCache.get(cacheKey);
    }

    const { primary, secondary } = cleanSongTitleForLyrics(rawTitle, channelName);
    let candidates = await searchLrclibCandidates(primary);
    if (candidates.length === 0 && secondary && secondary !== primary) {
      candidates = await searchLrclibCandidates(secondary);
    }

    let bestSynced = null;
    let bestSyncedScore = -9999;
    let bestPlain = null;

    for (const item of candidates) {
      if (!item || item.instrumental) continue;
      if (!bestPlain && item.plainLyrics) {
        bestPlain = item;
      }
      if (item.syncedLyrics) {
        let score = 1000;
        if (cleanDuration > 20 && item.duration > 20) {
          const diff = Math.abs(item.duration - cleanDuration);
          if (diff <= 3) score += 350;
          else if (diff <= 8) score += 200;
          else if (diff <= 18) score += 80;
          else if (diff > 40) score -= 450;
        }
        if (score > bestSyncedScore) {
          bestSyncedScore = score;
          bestSynced = item;
        }
      }
    }

    if (bestSynced && bestSynced.syncedLyrics) {
      const cues = parseSyncedLrcToCues(bestSynced.syncedLyrics);
      if (cues.length >= 4) {
        const result = {
          found: true,
          synced: true,
          trackName: bestSynced.trackName || "",
          artistName: bestSynced.artistName || "",
          plainLyrics: bestSynced.plainLyrics || "",
          cues
        };
        songLyricsCache.set(cacheKey, result);
        return result;
      }
    }

    const notFound = { found: false };
    songLyricsCache.set(cacheKey, notFound);
    return notFound;
  }

  root.VieLyrics = {
    cleanSongTitleForLyrics,
    parseSyncedLrcToCues,
    searchLyrics
  };
})(typeof self !== "undefined" ? self : this);
