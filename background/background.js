/**
 * VIE-Translate — Translate Toad AI
 * background/background.js — Service worker coordinator: state, context menus & message routing
 */

importScripts(
  "/utils/storage.js",
  "/api/gemini.js",
  "/api/groq.js",
  "/api/ollama.js",
  "/api/whisper.js",
  "/api/gtx.js",
  "/api/lyrics.js",
  "/api/updater.js"
);

const MAX_CACHE_SIZE = 800;
const cache = new Map();
const inFlight = new Map();
const contextByTab = new Map();

// Khôi phục cache từ storage khi Service Worker khởi động lại
let saveCacheTimer = null;
chrome.storage.local.get({ translationCache: [] }, (stored) => {
  if (Array.isArray(stored.translationCache)) {
    for (const [k, v] of stored.translationCache) {
      if (k && v) cache.set(k, v);
    }
  }
});

function schedulePersistCache() {
  if (saveCacheTimer) return;
  saveCacheTimer = setTimeout(() => {
    saveCacheTimer = null;
    const entries = Array.from(cache.entries()).slice(-MAX_CACHE_SIZE);
    chrome.storage.local.set({ translationCache: entries });
  }, 2500);
}

function getCached(key) {
  if (!cache.has(key)) return null;
  const val = cache.get(key);
  cache.delete(key);
  cache.set(key, val);
  return val;
}

function setCached(key, val) {
  if (!val) return;
  if (cache.has(key)) cache.delete(key);
  else if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  cache.set(key, val);
  schedulePersistCache();
}

function detectVideoPersona(videoTitle) {
  const t = (videoTitle || "").toLowerCase();
  if (!t) return "general";
  if (/\b(game|gaming|gameplay|walkthrough|lets play|stream|twitch|minecraft|roblox|gta|pewdiepie|speedrun|esports|valorant|league of legends|vlog|challenge|prank|reaction)\b/i.test(t)) {
    return "gaming_vlog";
  }
  if (/\b(science|veritasium|kurzgesagt|ted|physics|chemistry|biology|math|history|documentary|explained|how it works|tutorial|coding|programming|developer|ai|machine learning|deep learning|tech|review|apple|google)\b/i.test(t)) {
    return "science_tech";
  }
  if (/\b(movie|film|trailer|scene|episode|clip|cinema|drama|netflix|series|acting|cast|season|full movie)\b/i.test(t)) {
    return "drama_movie";
  }
  if (/\b(official (music )?video|mv|m\/v|lyrics?|lyric video|official audio|visualizer|ost|soundtrack|song|acoustic|karaoke|remix|cover|album|single)\b/i.test(t)) {
    return "music_lyrics";
  }
  if (/\b(podcast|interview|talkshow|conversation|dialogue|chat|discussion)\b/i.test(t)) {
    return "podcast_interview";
  }
  return "general";
}

const CJK_OR_THAI_TERM_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af\u0e00-\u0e7f]/;

function buildUnicodeTermRegex(term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (CJK_OR_THAI_TERM_RE.test(term)) {
    return new RegExp(escaped, "giu");
  }
  try {
    return new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, "giu");
  } catch {
    return new RegExp(`\\b${escaped}\\b`, "gi");
  }
}

function applyGlossaryOverrides(viText, glossary, srcText) {
  if (!viText || !Array.isArray(glossary) || !glossary.length || !srcText) return viText;
  const active = glossary
    .filter((item) => item && item.src && item.target && item.enabled !== false && item.src.trim() && item.target.trim())
    .map((item) => ({ src: item.src.trim(), target: item.target.trim() }))
    .sort((a, b) => b.src.length - a.src.length);
  if (!active.length) return viText;

  let result = viText;
  const lowerSrc = srcText.toLowerCase();
  for (const item of active) {
    if (lowerSrc.includes(item.src.toLowerCase())) {
      const regex = buildUnicodeTermRegex(item.src);
      result = result.replace(regex, item.target);
    }
  }
  return result;
}

function getTabContext(tabId, videoTitle) {
  if (!contextByTab.has(tabId)) {
    contextByTab.set(tabId, {
      videoTitle: videoTitle || "",
      persona: detectVideoPersona(videoTitle),
      lockedPronounPair: "",
      lockedFirstPerson: "",
      items: []
    });
  }
  const ctx = contextByTab.get(tabId);
  if (videoTitle && ctx.videoTitle !== videoTitle) {
    ctx.videoTitle = videoTitle;
    ctx.persona = detectVideoPersona(videoTitle);
    ctx.lockedPronounPair = "";
    ctx.lockedFirstPerson = "";
    ctx.items = [];
  }
  return ctx;
}

const COMPOUND_PRONOUN_STRIP_RE = /(?:một|tự|giật|rùng|vươn|chuyển|ẩn|nép|dấn|thân|bên|riêng|chính|thương|quên|liều|hòa|nhún|uốn|xoay|nghiêng|cúi|gồng|thu|trở|đẫm|lắc|bản\s+thân)\s+mình|mình\s+(?:mẩy|ên|đồng)|(?:vôi|bề|phận)\s+tôi|tôi\s+(?:luyện|đòi|tớ|mọi)/giu;
const UNICODE_MINH_RE = /(?<![\p{L}\p{N}_])(mình|tụi mình|chúng mình)(?![\p{L}\p{N}_])/iu;
const UNICODE_TOI_RE = /(?<![\p{L}\p{N}_])(tôi|chúng tôi)(?![\p{L}\p{N}_])/iu;
const UNICODE_KINSHIP_RE = /(?<![\p{L}\p{N}_])(anh|em|chị|cậu|tớ)(?![\p{L}\p{N}_])/iu;

function updateContextPronounLock(ctx, viText) {
  if (ctx.lockedPronounPair) return;
  const stripped = (viText || "").replace(COMPOUND_PRONOUN_STRIP_RE, " ");
  if (UNICODE_MINH_RE.test(stripped)) {
    ctx.lockedPronounPair = "mình – các bạn";
    ctx.lockedFirstPerson = "mình";
  } else if (UNICODE_TOI_RE.test(stripped)) {
    ctx.lockedPronounPair = "tôi – các bạn";
    ctx.lockedFirstPerson = "tôi";
  } else if (UNICODE_KINSHIP_RE.test(stripped)) {
    ctx.lockedPronounPair = "anh/chị – em (hoặc cậu – tớ)";
    ctx.lockedFirstPerson = "";
  }
}

function pushTabContext(tabId, videoTitle, src, vi) {
  const ctx = getTabContext(tabId, videoTitle);
  updateContextPronounLock(ctx, vi);
  ctx.items.push({ src, vi });
  if (ctx.items.length > 10) ctx.items.shift();
}

// Danh sách từ đứng trước/sau tạo thành từ ghép tiếng Việt với "mình" hoặc "tôi" (không được đổi nhầm)
const MINH_PREFIX_COMPOUNDS = /^(?:một|tự|giật|rùng|vươn|chuyển|ẩn|nép|dấn|thân|bên|riêng|chính|thương|quên|liều|hòa|nhún|uốn|xoay|nghiêng|cúi|gồng|thu|trở|đẫm|lắc|bản\s+thân)$/i;
const MINH_SUFFIX_COMPOUNDS = /^(?:mẩy|ên|đồng)$/i;
const TOI_PREFIX_COMPOUNDS = /^(?:vôi|bề|phận)$/i;
const TOI_SUFFIX_COMPOUNDS = /^(?:luyện|đòi|tớ|mọi)$/i;

function harmonizeVietnamesePronouns(viText, pronounStyle = "auto", lockedFirstPerson = "", persona = "") {
  if (!viText || typeof viText !== "string") return viText;
  if (viText.includes("\n")) {
    return viText
      .split("\n")
      .map((line) => harmonizeVietnamesePronouns(line, pronounStyle, lockedFirstPerson, persona))
      .join("\n");
  }

  // Trong phim kịch tính (drama_movie) hoặc chế độ anh_em có nhiều tuyến nhân vật khác nhau, không ép 1 đại từ bằng regex
  if (pronounStyle === "anh_em" || (pronounStyle === "auto" && persona === "drama_movie")) {
    return viText;
  }

  let targetFirst = "";
  if (pronounStyle === "minh_ban") targetFirst = "mình";
  else if (pronounStyle === "toi_ban") targetFirst = "tôi";
  else if (lockedFirstPerson === "mình" || lockedFirstPerson === "tôi") targetFirst = lockedFirstPerson;
  else return viText;

  const otherFirst = targetFirst === "mình" ? "tôi" : "mình";
  const regex = new RegExp(`(^|[\\s"“‘'(—–-])(${otherFirst})(?=([.,!?;:\\s"”’')!]|$))`, "gi");

  return viText.replace(regex, (match, prefix, word, _lookahead, offset, fullStr) => {
    const beforeSlice = fullStr.slice(0, offset + prefix.length).trim();
    const prevWords = beforeSlice.split(/\s+/);
    const prevWord = prevWords[prevWords.length - 1]?.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "") || "";

    const afterSlice = fullStr.slice(offset + match.length).trim();
    const nextWord = (afterSlice.split(/\s+/)[0] || "").replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");

    if (otherFirst === "mình") {
      if (MINH_PREFIX_COMPOUNDS.test(prevWord) || MINH_SUFFIX_COMPOUNDS.test(nextWord)) {
        return match;
      }
    } else if (otherFirst === "tôi") {
      if (TOI_PREFIX_COMPOUNDS.test(prevWord) || TOI_SUFFIX_COMPOUNDS.test(nextWord)) {
        return match;
      }
    }

    const isCap = /^[A-ZÀ-Ỹ]/.test(word);
    const replacement = isCap ? targetFirst.charAt(0).toUpperCase() + targetFirst.slice(1) : targetFirst;
    return `${prefix}${replacement}`;
  });
}

async function resolveSecondaryTranslation(cleanText, secondaryLang, targetLang) {
  if (!secondaryLang || secondaryLang === "orig" || secondaryLang === "none" || secondaryLang === targetLang) {
    return "";
  }
  const cachedSub2 = getCached(`sub2:${secondaryLang}:${cleanText}`);
  if (cachedSub2) return cachedSub2;
  try {
    const sub2 = await self.VieGTX.translate(cleanText, secondaryLang);
    if (sub2) setCached(`sub2:${secondaryLang}:${cleanText}`, sub2);
    return sub2;
  } catch {
    return "";
  }
}

const keyCooldown = new Map();
const KEY_COOLDOWN_MS = 15 * 60 * 1000;

function isQuotaError(err) {
  return !!(err && (err.isQuotaExceeded || err.status === 429 ||
    /quota|resource_exhausted|rate_limit|exceeded your current quota|429/i.test(err.message || "")));
}

function buildKeyPool(settings, rawKey) {
  const list = [rawKey, ...String(settings.backupKeys || "").split(/[\s,;]+/), settings.geminiApiKey, settings.groqApiKey];
  const seen = new Set();
  return list
    .map((k) => (k || "").trim())
    .filter((k) => k && self.VieStorage.detectProviderFromKey(k) && !seen.has(k) && seen.add(k));
}

async function withKeyPool(settings, rawKey, fn) {
  const pool = buildKeyPool(settings, rawKey);
  const now = Date.now();
  const avail = pool.filter((k) => (keyCooldown.get(k) || 0) <= now);
  let lastErr = null;
  let quotaHits = 0;
  for (const key of avail) {
    try {
      return await fn(key, self.VieStorage.detectProviderFromKey(key));
    } catch (err) {
      lastErr = err;
      if (isQuotaError(err)) {
        quotaHits++;
        keyCooldown.set(key, Date.now() + KEY_COOLDOWN_MS);
      }
    }
  }
  const e = lastErr || new Error("no key available");
  e.allKeysExhausted = pool.length > 0 && (avail.length === 0 || quotaHits === avail.length);
  throw e;
}

function limitTranslationLength(vi, src, style = "natural") {
  const cleanVi = (vi || "").trim();
  if (!cleanVi) return "";
  const srcStr = (src || "").trim();
  // Chữ tượng hình (Nhật/Trung/Hàn) ngắn nhưng dịch ra chữ Latin tiếng Việt sẽ dài hơn ~3-4 lần
  const hasCjk = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/.test(srcStr);
  const mult = hasCjk ? 4.8 : style === "unhinged" ? 3.4 : 2.75;
  const minFloor = style === "unhinged" || cleanVi.includes("\n-") ? 125 : 75;
  const max = Math.max(minFloor, Math.round(srcStr.length * mult));
  return cleanVi.length > max ? "" : cleanVi;
}

function postProcessTranslation(rawVi, srcText, settings, ctx, persona, targetLang, glossaryList, splitMulti) {
  if (!rawVi) return "";
  let vi = targetLang === "vi"
    ? harmonizeVietnamesePronouns(rawVi, settings.pronounStyle, ctx.lockedFirstPerson, persona)
    : rawVi;
  if (self.VieStorage?.formatMultiSpeakerDialogue) {
    vi = self.VieStorage.formatMultiSpeakerDialogue(vi, splitMulti);
  }
  return applyGlossaryOverrides(vi, glossaryList, srcText);
}

async function translateGtxMultiline(cleanText, targetLang, glossaryList = []) {
  const preText = applyGlossaryOverrides(cleanText, glossaryList, cleanText);
  const singleOut = await self.VieGTX.translate(preText, targetLang);
  if (preText.includes("\n") && (!singleOut || !singleOut.includes("\n"))) {
    const parts = preText.split("\n");
    const transParts = await Promise.all(parts.map((p) => self.VieGTX.translate(p, targetLang)));
    return transParts.join("\n");
  }
  return singleOut;
}

async function translateGtxBatch(texts, targetLang, glossaryList = []) {
  if (!Array.isArray(texts) || !texts.length) return [];
  const preTexts = texts.map((t) => applyGlossaryOverrides(t, glossaryList, t));
  if (typeof self.VieGTX?.translateBatch === "function") {
    return self.VieGTX.translateBatch(preTexts, targetLang);
  }
  return Promise.all(preTexts.map((t) => translateGtxMultiline(t, targetLang, [])));
}

async function handleTranslate(rawText, videoTitle, tabId, fastPreviewOnly = false, nextText = "") {
  const settings = await self.VieStorage.getSettings();
  const splitMulti = settings.multiSpeakerSplit !== false;
  const cleanText = self.VieStorage?.formatMultiSpeakerDialogue
    ? self.VieStorage.formatMultiSpeakerDialogue(rawText, splitMulti)
    : (rawText || "").trim();
  if (!cleanText) return { vi: "" };

  const isLocal = settings.provider === "ollama";
  const rawKey = isLocal ? "local" : settings.apiKey || (settings.provider === "groq" ? settings.groqApiKey : settings.geminiApiKey) || "";
  const provider = isLocal ? "ollama" : self.VieStorage.detectProviderFromKey(rawKey) || settings.provider || "gemini";
  const targetProvider = fastPreviewOnly ? "gtx" : provider;

  const targetLang = settings.targetLang || "vi";
  const secondaryLang = settings.secondaryLang || "orig";
  const baseCacheKey = self.VieStorage.getCacheKey(cleanText, settings);
  const aiCacheKey = `${provider}:${baseCacheKey}`;
  const cacheKey = `${targetProvider}:${baseCacheKey}`;

  // 0ms AI Cache Shortcut: If final AI translation is already cached, return it on fastPreviewOnly without hitting GTX
  if (fastPreviewOnly && provider !== "gtx" && rawKey) {
    const aiCached = getCached(aiCacheKey);
    if (aiCached) {
      const sub2 = await resolveSecondaryTranslation(cleanText, secondaryLang, targetLang);
      return { vi: aiCached, sub2, provider, cached: true, isFinalAi: true };
    }
  }

  const cached = getCached(cacheKey);
  if (cached) {
    const sub2 = await resolveSecondaryTranslation(cleanText, secondaryLang, targetLang);
    return {
      vi: cached,
      sub2,
      provider: targetProvider,
      cached: true,
      isFinalAi: targetProvider !== "gtx" || provider === "gtx" || !rawKey
    };
  }

  if (inFlight.has(cacheKey)) {
    const shared = await inFlight.get(cacheKey);
    if (
      shared &&
      !shared.sub2 &&
      secondaryLang &&
      secondaryLang !== "orig" &&
      secondaryLang !== "none" &&
      secondaryLang !== targetLang
    ) {
      const sub2 = await resolveSecondaryTranslation(cleanText, secondaryLang, targetLang);
      return { ...shared, sub2 };
    }
    return shared;
  }

  const task = (async () => {
    try {
      const sub2Promise = resolveSecondaryTranslation(cleanText, secondaryLang, targetLang);
      const ctx = getTabContext(tabId, videoTitle);

      const glossaryList = Array.isArray(settings.customGlossary) ? settings.customGlossary : [];
      const persona = settings.autoPersona !== false ? ctx.persona : "";

      if (targetProvider === "gtx" || !rawKey) {
        const [rawVi, sub2] = await Promise.all([
          translateGtxMultiline(cleanText, targetLang, glossaryList),
          sub2Promise
        ]);
        const vi = postProcessTranslation(rawVi, cleanText, settings, ctx, persona, targetLang, glossaryList, splitMulti);
        if (vi) setCached(cacheKey, vi);
        return { vi, sub2, provider: "gtx" };
      }

      try {
        const callAI = (key, prov) => {
          if (prov === "ollama") {
            return self.VieOllama.translateWithOllama({
              text: cleanText, nextText, videoTitle, videoPersona: persona, glossary: glossaryList,
              history: ctx.items, baseUrl: settings.ollamaBaseUrl, preferredModel: settings.ollamaModel,
              targetLang, translationStyle: settings.translationStyle, pronounStyle: settings.pronounStyle,
              lockedPronounPair: ctx.lockedPronounPair, softenProfanity: settings.softenProfanity !== false,
              multiSpeakerSplit: splitMulti
            });
          }
          const common = {
            text: cleanText, nextText, videoTitle, videoPersona: persona, glossary: glossaryList,
            history: ctx.items, apiKey: key,
            preferredModel: settings.model || "auto", targetLang,
            translationStyle: settings.translationStyle, pronounStyle: settings.pronounStyle,
            lockedPronounPair: ctx.lockedPronounPair, softenProfanity: settings.softenProfanity !== false,
            multiSpeakerSplit: splitMulti
          };
          return prov === "groq" ? self.VieGroq.translateWithGroqAuto(common) : self.VieGemini.translateWithGeminiAuto(common);
        };
        const aiTask = targetProvider === "ollama" ? callAI("local", "ollama") : withKeyPool(settings, rawKey, callAI);
        const [result, sub2] = await Promise.all([aiTask, sub2Promise]);

        const rawVi = limitTranslationLength(result.vi || "", cleanText, settings.translationStyle);
        if (!rawVi) throw new Error("translation too long or empty");
        const finalVi = postProcessTranslation(rawVi, cleanText, settings, ctx, persona, targetLang, glossaryList, splitMulti);
        if (finalVi) {
          setCached(cacheKey, finalVi);
          pushTabContext(tabId, videoTitle, cleanText, finalVi);
        }
        return { vi: finalVi, sub2, provider: targetProvider, modelUsed: result.modelUsed };
      } catch (err) {
        // Fallback to GTX on API error
        const [rawVi, sub2] = await Promise.all([
          translateGtxMultiline(cleanText, targetLang, glossaryList),
          sub2Promise
        ]);
        const vi = postProcessTranslation(rawVi, cleanText, settings, ctx, persona, targetLang, glossaryList, splitMulti);
        if (vi) setCached(`gtx:${baseCacheKey}`, vi);
        return { vi, sub2, provider: "gtx", quotaExhausted: !!err.allKeysExhausted };
      }
    } finally {
      inFlight.delete(cacheKey);
    }
  })();

  inFlight.set(cacheKey, task);
  return task;
}

// Whisper hay "ảo giác" ra các câu này khi gặp im lặng/nhạc nền
function isWhisperNoise(text) {
  const t = (text || "").trim();
  if (t.length < 2) return true;
  return /^(thank(s| you)( so much)?( for watching)?[.!]?|thanks for watching|please subscribe|subscribe to|amara\.org|subtitles by|you|bye[.!]?|\.+|♪+|\[.*\]|\(.*\))$/i.test(t);
}

async function handleTranslateBatch(rawTexts, videoTitle, tabId) {
  if (!Array.isArray(rawTexts) || !rawTexts.length) return { results: {}, sub2Results: {} };
  const settings = await self.VieStorage.getSettings();
  const splitMulti = settings.multiSpeakerSplit !== false;

  const cleanList = Array.from(
    new Set(
      rawTexts
        .map((t) =>
          self.VieStorage?.formatMultiSpeakerDialogue
            ? self.VieStorage.formatMultiSpeakerDialogue(t, splitMulti)
            : (t || "").trim()
        )
        .filter(Boolean)
    )
  ).slice(0, 12);
  if (!cleanList.length) return { results: {}, sub2Results: {} };

  const isLocal = settings.provider === "ollama";
  const rawKey = isLocal ? "local" : settings.apiKey || (settings.provider === "groq" ? settings.groqApiKey : settings.geminiApiKey) || "";
  const provider = isLocal ? "ollama" : self.VieStorage.detectProviderFromKey(rawKey) || settings.provider || "gemini";
  const targetLang = settings.targetLang || "vi";
  const secondaryLang = settings.secondaryLang || "orig";
  const needsSub2 = Boolean(secondaryLang && secondaryLang !== "orig" && secondaryLang !== "none" && secondaryLang !== targetLang);

  const results = {};
  const sub2Results = {};
  const uncached = [];
  const uncachedSub2 = [];

  for (const text of cleanList) {
    const ck = `${provider}:${self.VieStorage.getCacheKey(text, settings)}`;
    const cached = getCached(ck);
    if (cached) results[text] = cached;
    else uncached.push(text);

    if (needsSub2) {
      const s2k = `sub2:${secondaryLang}:${text}`;
      const cachedS2 = getCached(s2k);
      if (cachedS2) sub2Results[text] = cachedS2;
      else uncachedSub2.push(text);
    }
  }

  const sub2BatchPromise = (async () => {
    if (!needsSub2 || !uncachedSub2.length) return;
    try {
      const s2List = typeof self.VieGTX?.translateBatch === "function"
        ? await self.VieGTX.translateBatch(uncachedSub2, secondaryLang)
        : await Promise.all(uncachedSub2.map((t) => self.VieGTX.translate(t, secondaryLang).catch(() => "")));
      for (let i = 0; i < uncachedSub2.length; i++) {
        const s2Val = (s2List[i] || "").trim();
        if (s2Val) {
          sub2Results[uncachedSub2[i]] = s2Val;
          setCached(`sub2:${secondaryLang}:${uncachedSub2[i]}`, s2Val);
        }
      }
    } catch {}
  })();

  if (!uncached.length) {
    await sub2BatchPromise;
    return { results, sub2Results, cached: true };
  }

  const ctx = getTabContext(tabId, videoTitle);
  const batchGlossary = Array.isArray(settings.customGlossary) ? settings.customGlossary : [];
  const persona = settings.autoPersona !== false ? ctx.persona : "";

  if (provider === "gtx" || !rawKey) {
    const [rawBatch] = await Promise.all([
      translateGtxBatch(uncached, targetLang, batchGlossary).catch(() => new Array(uncached.length).fill("")),
      sub2BatchPromise
    ]);
    for (let i = 0; i < uncached.length; i++) {
      const src = uncached[i];
      const vi = postProcessTranslation(rawBatch[i] || "", src, settings, ctx, persona, targetLang, batchGlossary, splitMulti);
      if (vi) {
        setCached(`gtx:${self.VieStorage.getCacheKey(src, settings)}`, vi);
        results[src] = vi;
      }
    }
    return { results, sub2Results, provider: "gtx" };
  }

  const batchCall = (key, prov) => {
    if (prov === "ollama") {
      return self.VieOllama.translateWithOllama({
        texts: uncached, videoTitle, videoPersona: persona, history: ctx.items,
        glossary: batchGlossary, baseUrl: settings.ollamaBaseUrl, preferredModel: settings.ollamaModel,
        targetLang, translationStyle: settings.translationStyle, pronounStyle: settings.pronounStyle,
        lockedPronounPair: ctx.lockedPronounPair, softenProfanity: settings.softenProfanity !== false,
        multiSpeakerSplit: splitMulti
      });
    }
    const common = {
      texts: uncached, videoTitle, videoPersona: persona, glossary: batchGlossary,
      history: ctx.items, apiKey: key,
      preferredModel: settings.model || "auto", targetLang,
      translationStyle: settings.translationStyle, pronounStyle: settings.pronounStyle,
      lockedPronounPair: ctx.lockedPronounPair, softenProfanity: settings.softenProfanity !== false,
      multiSpeakerSplit: splitMulti
    };
    return prov === "groq" ? self.VieGroq.translateWithGroqAuto(common) : self.VieGemini.translateWithGeminiAuto(common);
  };

  const batchExecutionPromise = (async () => {
    const itemProviders = {};
    try {
      const batchRes = provider === "ollama" ? await batchCall("local", "ollama") : await withKeyPool(settings, rawKey, batchCall);
      const translations = batchRes.translations || [];
      const missingSrcs = [];

      for (let i = 0; i < uncached.length; i++) {
        const src = uncached[i];
        const rawVi = limitTranslationLength((translations[i] || "").trim(), src, settings.translationStyle);
        const vi = postProcessTranslation(rawVi, src, settings, ctx, persona, targetLang, batchGlossary, splitMulti);
        if (vi) {
          setCached(`${provider}:${self.VieStorage.getCacheKey(src, settings)}`, vi);
          pushTabContext(tabId, videoTitle, src, vi);
          results[src] = vi;
          itemProviders[src] = provider;
        } else {
          missingSrcs.push(src);
        }
      }

      if (missingSrcs.length > 0) {
        try {
          const recovered = await translateGtxBatch(missingSrcs, targetLang, batchGlossary);
          for (let j = 0; j < missingSrcs.length; j++) {
            const mSrc = missingSrcs[j];
            const mVi = postProcessTranslation(recovered[j] || "", mSrc, settings, ctx, persona, targetLang, batchGlossary, splitMulti);
            if (mVi) {
              setCached(`gtx:${self.VieStorage.getCacheKey(mSrc, settings)}`, mVi);
              results[mSrc] = mVi;
              itemProviders[mSrc] = "gtx";
            }
          }
        } catch {}
      }

      return { results, provider, modelUsed: batchRes.modelUsed, itemProviders };
    } catch {
      try {
        const recovered = await translateGtxBatch(uncached, targetLang, batchGlossary);
        for (let i = 0; i < uncached.length; i++) {
          const src = uncached[i];
          const vi = postProcessTranslation(recovered[i] || "", src, settings, ctx, persona, targetLang, batchGlossary, splitMulti);
          if (vi) {
            setCached(`gtx:${self.VieStorage.getCacheKey(src, settings)}`, vi);
            results[src] = vi;
            itemProviders[src] = "gtx";
          }
        }
      } catch {}
      return { results, provider: "gtx", modelUsed: "", itemProviders };
    }
  })();

  // Register per-item inFlight promises so live single-cue requests await this active batch instead of duplicating API calls
  for (const src of uncached) {
    const itemKey = `${provider}:${self.VieStorage.getCacheKey(src, settings)}`;
    if (!inFlight.has(itemKey)) {
      const itemPromise = Promise.all([batchExecutionPromise, sub2BatchPromise])
        .then(([out]) => ({
          vi: out.results[src] || "",
          sub2: sub2Results[src] || "",
          provider: out.itemProviders[src] || out.provider,
          modelUsed: out.modelUsed
        }))
        .finally(() => {
          inFlight.delete(itemKey);
        });
      inFlight.set(itemKey, itemPromise);
    }
  }

  const [batchOut] = await Promise.all([batchExecutionPromise, sub2BatchPromise]);
  return { results: batchOut.results, sub2Results, provider: batchOut.provider, modelUsed: batchOut.modelUsed };
}

// Message Dispatcher
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;
  const tabId = sender.tab?.id ?? "global";

  if (msg.type === "TRANSLATE") {
    self.VieUpdater?.maybeAutoCheck?.();
    handleTranslate(msg.text, (msg.videoTitle || "") + (msg.videoContext ? " | Mô tả: " + msg.videoContext : ""), tabId, msg.fastPreviewOnly === true, msg.nextText || "")
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message || "Lỗi dịch phụ đề" }));
    return true;
  }

  if (msg.type === "TRANSLATE_BATCH") {
    handleTranslateBatch(msg.texts || [], (msg.videoTitle || "") + (msg.videoContext ? " | Mô tả: " + msg.videoContext : ""), tabId)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message || "Lỗi dịch hàng loạt" }));
    return true;
  }

  if (msg.type === "TRANSCRIBE_AUDIO") {
    (async () => {
      const s = await self.VieStorage.getSettings();
      if (s.whisperEnabled) {
        try {
          const text = (await self.VieWhisper.transcribe(s, msg.audioBase64, msg.mimeType, msg.videoTitle || "")).trim();
          if (isWhisperNoise(text)) return { orig: "", vi: "" };
          const trans = await handleTranslate(text, msg.videoTitle || "", tabId, false);
          return { orig: text, vi: trans.vi || "", sub2: trans.sub2 || "" };
        } catch {
          // Whisper local lỗi ➔ thử tiếp bằng key cloud (nếu có)
        }
      }
      const keys = [s.apiKey, s.groqApiKey, s.geminiApiKey].filter(Boolean);
      const groqKey = keys.find((k) => self.VieStorage.detectProviderFromKey(k) === "groq") || "";
      const geminiKey = keys.find((k) => self.VieStorage.detectProviderFromKey(k) === "gemini") || "";
      if (!groqKey && !geminiKey) {
        return { error: "NO_KEY", orig: "", vi: "" };
      }
      let res = { orig: "", vi: "" };
      if (groqKey) {
        // Whisper (nhanh) nghe ➔ dịch bằng bộ máy đang chọn (Gemini/Groq/Ollama/GTX)
        const text = (await self.VieGroq.transcribeWithGroqWhisper(msg.audioBase64, msg.mimeType, groqKey, msg.videoTitle || "")).trim();
        if (isWhisperNoise(text)) return { orig: "", vi: "" };
        const trans = await handleTranslate(text, msg.videoTitle || "", tabId, false);
        res = { orig: text, vi: trans.vi || "", sub2: trans.sub2 || "" };
      } else {
        res = await self.VieGemini.transcribeAndTranslateWithGeminiAudio({
          audioBase64: msg.audioBase64,
          mimeType: msg.mimeType,
          geminiKey,
          targetLang: s.targetLang || "vi"
        });
      }
      const cleanVi = (res?.vi || "")
        .replace(/^(?:ORIG|GỐC|ORIGINAL)\b[:\s-]*/i, "")
        .replace(/^(?:Tôi đang dịch|Đang dịch|Dưới đây là bản dịch)\s*[:\s-]*/i, "")
        .trim();
      const cleanOrig = (res?.orig || "").replace(/^(?:ORIG|GỐC|ORIGINAL)\b[:\s-]*/i, "").trim();
      if (self.VieStorage.isAiMetaOrPromptLeak(cleanOrig) || self.VieStorage.isAiMetaOrPromptLeak(cleanVi)) {
        return { orig: "", vi: "", sub2: "" };
      }
      return { orig: cleanOrig, vi: cleanVi, sub2: res?.sub2 || "" };
    })()
      .then(sendResponse)
      .catch(() => sendResponse({ orig: "", vi: "" }));
    return true;
  }

  if (msg.type === "SEARCH_SONG_LYRICS") {
    self.VieLyrics.searchLyrics(msg)
      .then(sendResponse)
      .catch(() => sendResponse({ found: false }));
    return true;
  }

  if (msg.type === "TEST_WHISPER") {
    (async () => ({
      gpu: await self.VieWhisper.ping(msg.gpuUrl),
      cpu: await self.VieWhisper.ping(msg.cpuUrl)
    }))().then(sendResponse);
    return true;
  }

  if (msg.type === "TEST_API") {
    (async () => {
      const key = (msg.apiKey || "").trim();
      const p = msg.provider || self.VieStorage.detectProviderFromKey(key) || "gemini";
      if (p === "ollama") {
        const base = msg.baseUrl;
        const models = await self.VieOllama.discoverOllamaModels(base);
        if (!models.length) throw new Error("Ollama chạy rồi nhưng chưa có model. Chạy: ollama pull qwen2.5:7b");
        const modelToTest = msg.model && models.includes(msg.model) ? msg.model : models[0];
        const res = await self.VieOllama.translateWithOllama({ text: "Hello world!", baseUrl: base, preferredModel: modelToTest, targetLang: "vi" });
        return { ok: true, provider: "ollama", modelUsed: res.modelUsed, availableModels: models, sample: res.vi };
      }
      if (p === "groq") {
        try {
          const models = await self.VieGroq.discoverGroqModels(key);
          const modelToTest = msg.model && msg.model !== "auto" && models.includes(msg.model) ? msg.model : models[0];
          const res = await self.VieGroq.translateWithGroqAuto({
            text: "Hello world!",
            apiKey: key,
            preferredModel: modelToTest,
            targetLang: "vi"
          });
          return { ok: true, provider: "groq", modelUsed: res.modelUsed, availableModels: models, sample: res.vi };
        } catch (err) {
          const errMsg = err?.message || "";
          if (/quota|rate_limit|429/i.test(errMsg)) {
            return {
              ok: true,
              provider: "groq",
              isQuotaExceeded: true,
              modelUsed: "llama-3.3-70b-versatile",
              availableModels: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
              sample: "Xin chào thế giới! (Chế độ Dự phòng Không Giới Hạn)",
              warning: "Key Groq hợp lệ! Tạm thời chạm ngưỡng gọi, đã tự động bật Dự phòng Google Translate để bạn xem video ngay."
            };
          }
          throw err;
        }
      }

      // Gemini
      const models = await self.VieGemini.discoverGeminiModels(key);
      const preferredModel = models.find((m) => m.includes("flash-lite")) || models[0] || "gemini-2.5-flash-lite";
      const modelToTest = msg.model && msg.model !== "auto" && models.includes(msg.model) ? msg.model : preferredModel;
      try {
        const res = await self.VieGemini.translateWithGeminiAuto({
          text: "Hello world!",
          apiKey: key,
          preferredModel: modelToTest,
          targetLang: "vi"
        });
        return { ok: true, provider: "gemini", modelUsed: res.modelUsed, availableModels: models, sample: res.vi };
      } catch (err) {
        const errMsg = err?.message || "";
        const isQuota = /quota|resource_exhausted|rate_limit|exceeded your current quota|429/i.test(errMsg);
        if (isQuota) {
          // Key hoàn toàn hợp lệ, chỉ là Google đang tạm chạm giới hạn ngày của Project (RPD limit)
          return {
            ok: true,
            provider: "gemini",
            isQuotaExceeded: true,
            modelUsed: modelToTest || "gemini-2.5-flash-lite",
            availableModels: models.length ? models : ["gemini-2.5-flash-lite", "gemini-2.0-flash-lite", "gemini-2.0-flash"],
            sample: "Xin chào thế giới! (Chế độ Dự phòng Không Giới Hạn)",
            warning: "Key Google Gemini hợp lệ! Hiện tại Google đang tạm tính chạm giới hạn ngày của Project (hồi phục sau vài giờ). Hệ thống đã tự động kích hoạt chế độ Dự phòng Không Giới Hạn (Google Translate) để bạn xem video ngay lập tức!"
          };
        }
        throw err;
      }
    })()
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err.message || "Lỗi kết nối API" }));
    return true;
  }

  if (msg.type === "AUTO_IMPORT_API_KEY") {
    (async () => {
      const key = (msg.apiKey || "").trim();
      const models = await self.VieGemini.discoverGeminiModels(key);
      const activeModel = models.find((m) => m.includes("flash-lite")) || models[0] || "gemini-2.5-flash-lite";
      await self.VieStorage.setSettings({
        provider: "gemini",
        apiKey: key,
        geminiApiKey: key,
        verifiedKey: key,
        detectedModel: activeModel,
        model: "auto",
        availableModels: models,
        lastAutoImportAt: Date.now()
      });
      return { ok: true, modelUsed: activeModel };
    })()
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "OPEN_KEY_SETUP") {
    const url = chrome.runtime.getURL("popup/popup.html");
    try {
      chrome.action.openPopup().catch(() => chrome.tabs.create({ url }));
    } catch {
      chrome.tabs.create({ url });
    }
    sendResponse({ ok: true });
    return false;
  }

  if (msg.type === "LOOKUP_WORD") {
    (async () => {
      const s = await self.VieStorage.getSettings();
      const dictCacheKey = `dict:${s.targetLang || "vi"}:${(msg.word || "").toLowerCase()}:${(msg.sentence || "").slice(0, 80)}`;
      const cachedDict = getCached(dictCacheKey);
      if (cachedDict) return cachedDict;

      const gk = buildKeyPool(s, s.apiKey || "").filter((k) => self.VieStorage.detectProviderFromKey(k) === "gemini" && (keyCooldown.get(k) || 0) <= Date.now());
      const key = gk[0] || "";
      const gtxFallback = async () => {
        let vi = "";
        try { vi = await self.VieGTX.translate(msg.word, s.targetLang || "vi"); } catch {}
        let ctx = "";
        if (msg.sentence) {
          try { ctx = await self.VieGTX.translate(msg.sentence, s.targetLang || "vi"); } catch {}
        }
        return {
          ok: true, word: msg.word, meaning: vi || msg.word, pron: "", pos: "Từ vựng",
          note: ctx ? "Cả câu: " + ctx : "", fallback: true
        };
      };
      if (!key) return await gtxFallback();
      try {
        const res = await self.VieGemini.lookupWordWithGemini(msg.word, msg.sentence || "", key);
        if (res?.ok && !res.fallback) setCached(dictCacheKey, res);
        return res;
      } catch {
        return await gtxFallback();
      }
    })()
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "EXPLAIN_SCENE") {
    (async () => {
      const s = await self.VieStorage.getSettings();
      const key = s.geminiApiKey || s.apiKey || "";
      if (!key) throw new Error("Cần kết nối API Key Gemini để dùng tính năng này.");
      return await self.VieGemini.explainSceneWithGemini({
        sentence: msg.sentence,
        vi: msg.vi,
        focusWord: msg.focusWord,
        apiKey: key
      });
    })()
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "CAPTURE_VISIBLE_TAB") {
    try {
      chrome.tabs.captureVisibleTab(null, { format: "jpeg", quality: 80 }, (dataUrl) => {
        if (chrome.runtime.lastError || !dataUrl) {
          sendResponse({ ok: false, error: chrome.runtime.lastError?.message || "Không thể chụp màn hình tab" });
        } else {
          const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
          sendResponse({ ok: true, imageBase64: base64 });
        }
      });
    } catch (e) {
      sendResponse({ ok: false, error: e.message });
    }
    return true;
  }

  if (msg.type === "FETCH_MANGA_IMAGE") {
    (async () => {
      const url = String(msg.url || "");
      if (!/^https?:\/\//i.test(url)) throw new Error("URL ảnh truyện không hợp lệ.");
      const res = await fetch(url, { credentials: "omit" });
      if (!res.ok) throw new Error(`Không tải được ảnh (HTTP ${res.status}).`);
      const blob = await res.blob();
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Không đọc được dữ liệu ảnh."));
        reader.readAsDataURL(blob);
      });
      return {
        ok: true,
        imageBase64: String(dataUrl).replace(/^data:[^;]+;base64,/, ""),
        mimeType: blob.type || "image/jpeg"
      };
    })()
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err.message || "Lỗi tải ảnh truyện" }));
    return true;
  }

  if (msg.type === "SCAN_MANGA_PAGE") {
    (async () => {
      const s = await self.VieStorage.getSettings();
      const apiKey = s.apiKey || s.geminiApiKey || "";
      if (!apiKey) {
        return {
          ok: false,
          error: "NO_KEY",
          message: "OCR truyện hiện cần Gemini. Dùng Ollama/Gemini cục bộ hoặc thêm key Gemini; chương dịch vẫn có thể dùng GTX/Ollama."
        };
      }
      return await self.VieGemini.scanMangaPage({
        imageBase64: msg.imageBase64,
        mimeType: msg.mimeType || "image/jpeg",
        apiKey,
        targetLang: s.targetLang || "vi"
      });
    })()
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err.message || "Lỗi OCR trang truyện" }));
    return true;
  }

  if (msg.type === "SCAN_SCREEN_TEXT") {
    (async () => {
      const s = await self.VieStorage.getSettings();
      const rawKey = s.apiKey || s.geminiApiKey || "";
      if (!rawKey) {
        return { ok: false, error: "NO_KEY", message: "Cần API Key Gemini để AI quét chữ trên màn hình (OCR)." };
      }
      return await self.VieGemini.scanAndTranslateVisualText({
        imageBase64: msg.imageBase64,
        mimeType: msg.mimeType || "image/jpeg",
        apiKey: rawKey,
        videoTitle: msg.videoTitle || "",
        targetLang: s.targetLang || "vi"
      });
    })()
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err.message || "Lỗi quét chữ trên màn hình" }));
    return true;
  }

  if (msg.type === "CLEAR_CACHE") {
    cache.clear();
    contextByTab.clear();
    chrome.storage.local.remove(["translationCache"]);
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === "GET_UPDATE_STATUS") {
    self.VieUpdater.getStatus()
      .then((st) => sendResponse({ ok: true, ...st }))
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }

  if (msg.type === "CHECK_GITHUB_UPDATE") {
    self.VieUpdater.checkForUpdates({ force: true, verifyLocalSync: true })
      .then((st) => sendResponse({ ok: true, ...st }))
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }

  if (msg.type === "DISMISS_UPDATE") {
    self.VieUpdater.dismissUpdate(msg.updateId || "")
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (msg.type === "MARK_UPDATE_TOAST_SHOWN") {
    self.VieUpdater.markToastShown(msg.updateId || "")
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (msg.type === "RELOAD_EXTENSION") {
    sendResponse({ ok: true });
    setTimeout(() => {
      try { chrome.runtime.reload(); } catch {}
    }, 80);
    return true;
  }
});

// Tự động kiểm tra cập nhật GitHub khi Service Worker khởi động & khi cài đặt / nạp lại extension
if (typeof chrome !== "undefined" && chrome.runtime?.id) {
  setTimeout(() => self.VieUpdater?.maybeAutoCheck?.(), 3500);
}

self.VieStorage?.onChanged?.((changes) => {
  if ("autoCheckUpdates" in changes) {
    if (changes.autoCheckUpdates.newValue === false) {
      self.VieUpdater?.getStatus?.()
        .then((st) => self.VieUpdater.syncActionBadge(st, false))
        .catch(() => {});
    } else {
      self.VieUpdater?.maybeAutoCheck?.();
    }
  }
});

// Context Menu (Right click to translate selected text)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "vie_translate_selection",
    title: "🐸 Dịch với VIE-Translate Toad",
    contexts: ["selection"]
  });
  self.VieUpdater?.checkForUpdates?.({ force: true, verifyLocalSync: true })?.catch(() => {});
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "vie_translate_selection" && info.selectionText && tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      type: "TRIGGER_SELECTION_TRANSLATE",
      text: info.selectionText
    }, () => void chrome.runtime.lastError);
  }
});
