/**
 * VIE-Translate — Translate Toad AI
 * background/background.js — Service worker coordinator: state, context menus & message routing
 */

importScripts(
  "/utils/storage.js",
  "/api/gemini.js",
  "/api/groq.js",
  "/api/gtx.js",
  "/api/lyrics.js"
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

function getTabContext(tabId, videoTitle) {
  if (!contextByTab.has(tabId)) {
    contextByTab.set(tabId, {
      videoTitle: videoTitle || "",
      lockedPronounPair: "",
      lockedFirstPerson: "",
      items: []
    });
  }
  const ctx = contextByTab.get(tabId);
  if (videoTitle && ctx.videoTitle !== videoTitle) {
    ctx.videoTitle = videoTitle;
    ctx.lockedPronounPair = "";
    ctx.lockedFirstPerson = "";
    ctx.items = [];
  }
  return ctx;
}

function updateContextPronounLock(ctx, viText) {
  if (ctx.lockedPronounPair) return;
  const s = (viText || "").toLowerCase();
  if (/\b(mình|tụi mình|chúng mình)\b/.test(s)) {
    ctx.lockedPronounPair = "mình – các bạn";
    ctx.lockedFirstPerson = "mình";
  } else if (/\b(tôi|chúng tôi)\b/.test(s)) {
    ctx.lockedPronounPair = "tôi – các bạn";
    ctx.lockedFirstPerson = "tôi";
  } else if (/\b(anh|em|chị|cậu|tớ)\b/.test(s)) {
    ctx.lockedPronounPair = "anh/chị – em (hoặc cậu – tớ)";
    ctx.lockedFirstPerson = "anh";
  }
}

function pushTabContext(tabId, videoTitle, src, vi) {
  const ctx = getTabContext(tabId, videoTitle);
  updateContextPronounLock(ctx, vi);
  ctx.items.push({ src, vi });
  if (ctx.items.length > 10) ctx.items.shift();
}

function harmonizeVietnamesePronouns(viText, pronounStyle = "auto", lockedFirstPerson = "") {
  if (!viText || typeof viText !== "string") return viText;
  let targetFirst = lockedFirstPerson || "";
  if (!targetFirst) {
    if (pronounStyle === "minh_ban") targetFirst = "mình";
    else if (pronounStyle === "toi_ban") targetFirst = "tôi";
    else return viText;
  }
  const otherFirst = targetFirst === "mình" ? "tôi" : "mình";
  const regex = new RegExp(`(^|\\s)${otherFirst}([.,!?;:\\s]|$)`, "gi");
  return viText.replace(regex, (match, prefix, suffix) => {
    const isCap = /^[A-ZÀ-Ỹ]/.test(match.trim());
    const replacement = isCap ? targetFirst.charAt(0).toUpperCase() + targetFirst.slice(1) : targetFirst;
    return `${prefix}${replacement}${suffix}`;
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

async function handleTranslate(rawText, videoTitle, tabId, fastPreviewOnly = false, nextText = "") {
  const cleanText = (rawText || "").replace(/\s+/g, " ").trim();
  if (!cleanText) return { vi: "" };

  const settings = await self.VieStorage.getSettings();
  const rawKey = settings.apiKey || (settings.provider === "groq" ? settings.groqApiKey : settings.geminiApiKey) || "";
  const provider = self.VieStorage.detectProviderFromKey(rawKey) || settings.provider || "gemini";
  const targetProvider = fastPreviewOnly ? "gtx" : provider;

  const targetLang = settings.targetLang || "vi";
  const secondaryLang = settings.secondaryLang || "orig";
  const cacheKey = `${targetProvider}:${self.VieStorage.getCacheKey(cleanText, settings)}`;

  const cached = getCached(cacheKey);
  if (cached) {
    const sub2 = await resolveSecondaryTranslation(cleanText, secondaryLang, targetLang);
    return { vi: cached, sub2, provider: targetProvider, cached: true };
  }

  if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);

  const task = (async () => {
    try {
      const sub2Promise = resolveSecondaryTranslation(cleanText, secondaryLang, targetLang);
      const ctx = getTabContext(tabId, videoTitle);

      if (targetProvider === "gtx" || !rawKey) {
        const [rawVi, sub2] = await Promise.all([self.VieGTX.translate(cleanText, targetLang), sub2Promise]);
        const vi = targetLang === "vi" ? harmonizeVietnamesePronouns(rawVi, settings.pronounStyle, ctx.lockedFirstPerson) : rawVi;
        if (vi) setCached(cacheKey, vi);
        return { vi, sub2, provider: "gtx" };
      }

      try {
        const [result, sub2] = await Promise.all([
          targetProvider === "groq"
            ? self.VieGroq.translateWithGroqAuto({
                text: cleanText,
                nextText,
                videoTitle,
                history: ctx.items,
                apiKey: rawKey,
                preferredModel: settings.model || "auto",
                targetLang,
                translationStyle: settings.translationStyle,
                pronounStyle: settings.pronounStyle,
                lockedPronounPair: ctx.lockedPronounPair,
                softenProfanity: settings.softenProfanity !== false
              })
            : self.VieGemini.translateWithGeminiAuto({
                text: cleanText,
                nextText,
                videoTitle,
                history: ctx.items,
                apiKey: rawKey,
                preferredModel: settings.model || "auto",
                targetLang,
                translationStyle: settings.translationStyle,
                pronounStyle: settings.pronounStyle,
                lockedPronounPair: ctx.lockedPronounPair,
                softenProfanity: settings.softenProfanity !== false
              }),
          sub2Promise
        ]);

        const rawVi = result.vi || "";
        const finalVi = targetLang === "vi" ? harmonizeVietnamesePronouns(rawVi, settings.pronounStyle, ctx.lockedFirstPerson) : rawVi;
        if (finalVi) {
          setCached(cacheKey, finalVi);
          pushTabContext(tabId, videoTitle, cleanText, finalVi);
        }
        return { vi: finalVi, sub2, provider: targetProvider, modelUsed: result.modelUsed };
      } catch (err) {
        // Fallback to GTX on API error
        const [rawVi, sub2] = await Promise.all([self.VieGTX.translate(cleanText, targetLang), sub2Promise]);
        const vi = targetLang === "vi" ? harmonizeVietnamesePronouns(rawVi, settings.pronounStyle, ctx.lockedFirstPerson) : rawVi;
        if (vi) setCached(`gtx:${self.VieStorage.getCacheKey(cleanText, settings)}`, vi);
        return { vi, sub2, provider: "gtx" };
      }
    } finally {
      inFlight.delete(cacheKey);
    }
  })();

  inFlight.set(cacheKey, task);
  return task;
}

async function handleTranslateBatch(rawTexts, videoTitle, tabId) {
  if (!Array.isArray(rawTexts) || !rawTexts.length) return { results: {} };
  const cleanList = Array.from(new Set(rawTexts.map((t) => (t || "").trim()).filter(Boolean))).slice(0, 12);
  if (!cleanList.length) return { results: {} };

  const settings = await self.VieStorage.getSettings();
  const rawKey = settings.apiKey || (settings.provider === "groq" ? settings.groqApiKey : settings.geminiApiKey) || "";
  const provider = self.VieStorage.detectProviderFromKey(rawKey) || settings.provider || "gemini";
  const targetLang = settings.targetLang || "vi";

  const results = {};
  const uncached = [];
  for (const text of cleanList) {
    const ck = `${provider}:${self.VieStorage.getCacheKey(text, settings)}`;
    const cached = getCached(ck);
    if (cached) results[text] = cached;
    else uncached.push(text);
  }

  if (!uncached.length) return { results, cached: true };

  const ctx = getTabContext(tabId, videoTitle);
  if (provider === "gtx" || !rawKey) {
    await Promise.all(
      uncached.map(async (t) => {
        try {
          const rawVi = await self.VieGTX.translate(t, targetLang);
          const vi = targetLang === "vi" ? harmonizeVietnamesePronouns(rawVi, settings.pronounStyle, ctx.lockedFirstPerson) : rawVi;
          if (vi) {
            setCached(`gtx:${self.VieStorage.getCacheKey(t, settings)}`, vi);
            results[t] = vi;
          }
        } catch {}
      })
    );
    return { results, provider: "gtx" };
  }

  try {
    const batchRes =
      provider === "groq"
        ? await self.VieGroq.translateWithGroqAuto({
            texts: uncached,
            videoTitle,
            history: ctx.items,
            apiKey: rawKey,
            preferredModel: settings.model || "auto",
            targetLang,
            translationStyle: settings.translationStyle,
            pronounStyle: settings.pronounStyle,
            lockedPronounPair: ctx.lockedPronounPair,
            softenProfanity: settings.softenProfanity !== false
          })
        : await self.VieGemini.translateWithGeminiAuto({
            texts: uncached,
            videoTitle,
            history: ctx.items,
            apiKey: rawKey,
            preferredModel: settings.model || "auto",
            targetLang,
            translationStyle: settings.translationStyle,
            pronounStyle: settings.pronounStyle,
            lockedPronounPair: ctx.lockedPronounPair,
            softenProfanity: settings.softenProfanity !== false
          });

    const translations = batchRes.translations || [];
    for (let i = 0; i < uncached.length; i++) {
      const src = uncached[i];
      const rawVi = (translations[i] || "").trim();
      const vi = targetLang === "vi" ? harmonizeVietnamesePronouns(rawVi, settings.pronounStyle, ctx.lockedFirstPerson) : rawVi;
      if (vi) {
        setCached(`${provider}:${self.VieStorage.getCacheKey(src, settings)}`, vi);
        pushTabContext(tabId, videoTitle, src, vi);
        results[src] = vi;
      }
    }
    return { results, provider, modelUsed: batchRes.modelUsed };
  } catch {
    // Fallback GTX
    await Promise.all(
      uncached.map(async (t) => {
        try {
          const rawVi = await self.VieGTX.translate(t, targetLang);
          const vi = targetLang === "vi" ? harmonizeVietnamesePronouns(rawVi, settings.pronounStyle, ctx.lockedFirstPerson) : rawVi;
          if (vi) {
            setCached(`gtx:${self.VieStorage.getCacheKey(t, settings)}`, vi);
            results[t] = vi;
          }
        } catch {}
      })
    );
    return { results, provider: "gtx" };
  }
}

// Message Dispatcher
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;
  const tabId = sender.tab?.id ?? "global";

  if (msg.type === "TRANSLATE") {
    handleTranslate(msg.text, msg.videoTitle || "", tabId, msg.fastPreviewOnly === true, msg.nextText || "")
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message || "Lỗi dịch phụ đề" }));
    return true;
  }

  if (msg.type === "TRANSLATE_BATCH") {
    handleTranslateBatch(msg.texts || [], msg.videoTitle || "", tabId)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message || "Lỗi dịch hàng loạt" }));
    return true;
  }

  if (msg.type === "TRANSCRIBE_AUDIO") {
    (async () => {
      const s = await self.VieStorage.getSettings();
      const rawKey = s.apiKey || (s.provider === "groq" ? s.groqApiKey : s.geminiApiKey) || "";
      if (!rawKey) {
        return { error: "NO_KEY", orig: "", vi: "" };
      }
      const p = self.VieStorage.detectProviderFromKey(rawKey) || s.provider;
      let res = { orig: "", vi: "" };
      if (p === "groq") {
        const text = await self.VieGroq.transcribeWithGroqWhisper(msg.audioBase64, msg.mimeType, rawKey);
        const trans = await handleTranslate(text, msg.videoTitle || "", tabId, false);
        res = { orig: text, vi: trans.vi || "", sub2: trans.sub2 || "" };
      } else {
        res = await self.VieGemini.transcribeAndTranslateWithGeminiAudio({
          audioBase64: msg.audioBase64,
          mimeType: msg.mimeType,
          geminiKey: rawKey,
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

  if (msg.type === "TEST_API") {
    (async () => {
      const key = (msg.apiKey || "").trim();
      const p = msg.provider || self.VieStorage.detectProviderFromKey(key) || "gemini";
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

  if (msg.type === "LOOKUP_WORD") {
    (async () => {
      const s = await self.VieStorage.getSettings();
      const key = s.geminiApiKey || s.apiKey || "";
      if (!key) {
        // Fallback to GTX single word
        const vi = await self.VieGTX.translate(msg.word, s.targetLang || "vi");
        return { ok: true, word: msg.word, meaning: vi, pron: "", pos: "Vocabulary", note: "" };
      }
      return await self.VieGemini.lookupWordWithGemini(msg.word, msg.sentence || "", key);
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
});

// Context Menu (Right click to translate selected text)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "vie_translate_selection",
    title: "🐸 Dịch với VIE-Translate Toad",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "vie_translate_selection" && info.selectionText && tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      type: "TRIGGER_SELECTION_TRANSLATE",
      text: info.selectionText
    }, () => void chrome.runtime.lastError);
  }
});
