/**
 * VIE-Translate — Translate Toad AI
 * content/content.js — Thin entry point: coordinates storage, DOM, selection & captions
 */

(function (root) {
  "use strict";

  let settings = root.VieStorage ? { ...root.VieStorage.DEFAULT_SETTINGS } : {};
  const localCache = new Map();

  function renderSubtitles(video, origText, viText, sub2Text = "", isPreview = false, isError = false) {
    if (!settings.enabled) return;
    const overlay = root.VieDOM?.getOrCreateOverlay(video, settings);
    if (!overlay) return;

    const cleanOrigRaw = (origText || "")
      .replace(/^(?:\*{1,2})?(?:ORIG(?:INAL)?|GỐC)\s*:\s*(?:\*{1,2})?/i, "")
      .replace(/^(?:ORIG|GỐC|ORIGINAL)\b[:\s-]*/i, "")
      .trim();
    const cleanViRaw = (viText || "")
      .replace(/^(?:\*{1,2})?(?:TRANS(?:LATION)?|DỊCH|VIETNAMESE|VI|ORIG(?:INAL)?|GỐC)\s*:\s*(?:\*{1,2})?/i, "")
      .replace(/^(?:ORIG|GỐC|ORIGINAL)\b[:\s-]*/i, "")
      .trim();

    const isMusic = root.VieCaptions?.ytCueState?.isLyrics || root.VieCaptions?.looksLikeMusicVideo(root.VieCaptions.getVideoTitle());
    const { formattedOrig, formattedVi } = root.VieDOM.formatSubtitleDecorations(cleanOrigRaw, cleanViRaw, isMusic);

    const origEl = overlay.querySelector(".vie-orig");
    const viEl = overlay.querySelector(".vie-vi");
    const showSecondary = Boolean(settings.dualSub) && settings.secondaryLang !== "none";

    if (origEl) {
      const secondLine = settings.secondaryLang && settings.secondaryLang !== "orig" && sub2Text ? sub2Text : formattedOrig;
      root.VieDOM.renderInteractiveWords(origEl, secondLine);
      origEl.style.display = showSecondary ? "block" : "none";
    }

    if (viEl) {
      root.VieDOM.renderStableViText(viEl, formattedVi);
      viEl.classList.toggle("vie-preview", Boolean(isPreview));
      viEl.classList.toggle("vie-error", Boolean(isError));
    }

    root.VieCaptions?.updateOverlaySyncUI?.(video);
    overlay.classList.remove("vie-hidden");
  }

  function onCaptionReceived(video, rawText, immediate = false) {
    if (!settings.enabled) {
      root.VieDOM?.hideOverlay(video);
      return;
    }

    const state = root.VieCaptions.getVideoState(video);
    const cleanText = root.VieCaptions.normalizeSubtitleText(rawText);

    if (!cleanText) {
      if (state.throttleTimer) clearTimeout(state.throttleTimer);
      if (state.hideTimer) clearTimeout(state.hideTimer);
      state.hideTimer = setTimeout(() => {
        state.lastText = "";
        root.VieDOM?.hideOverlay(video);
      }, 700);
      return;
    }

    if (state.hideTimer) clearTimeout(state.hideTimer);
    if (cleanText === state.lastText) return;
    state.lastText = cleanText;

    const ck = root.VieStorage.getCacheKey(cleanText, settings);
    if (localCache.has(ck)) {
      const cached = localCache.get(ck);
      renderSubtitles(video, cleanText, cached.vi, cached.sub2, false, false);
      return;
    }

    const now = Date.now();
    const elapsed = now - state.lastSendAt;
    const THROTTLE_MS = 60;

    const doTranslate = () => {
      state.lastSendAt = Date.now();
      const currentSeq = ++state.reqSeq;

      // Fast preview stream
      if (settings.provider !== "gtx") {
        chrome.runtime.sendMessage({
          type: "TRANSLATE",
          text: cleanText,
          videoTitle: root.VieCaptions.getVideoTitle(),
          fastPreviewOnly: true
        }, (previewRes) => {
          if (!chrome.runtime.lastError && previewRes?.vi && currentSeq >= state.lastRenderedSeq) {
            state.lastRenderedSeq = currentSeq;
            renderSubtitles(video, cleanText, previewRes.vi, previewRes.sub2 || "", true, false);
          }
        });
      }

      chrome.runtime.sendMessage({
        type: "TRANSLATE",
        text: cleanText,
        videoTitle: root.VieCaptions.getVideoTitle(),
        fastPreviewOnly: false
      }, (res) => {
        if (!chrome.runtime.lastError && res?.vi && currentSeq >= state.lastRenderedSeq) {
          state.lastRenderedSeq = currentSeq;
          localCache.set(ck, { vi: res.vi, sub2: res.sub2 || "" });
          if (localCache.size > 500) {
            localCache.delete(localCache.keys().next().value);
          }
          renderSubtitles(video, cleanText, res.vi, res.sub2 || "", false, false);
        }
      });
    };

    if (immediate || elapsed >= THROTTLE_MS) {
      doTranslate();
    } else if (!state.throttleTimer) {
      state.throttleTimer = setTimeout(() => {
        state.throttleTimer = null;
        doTranslate();
      }, THROTTLE_MS - elapsed);
    }
  }

  function scanAndWatchVideos() {
    document.querySelectorAll("video").forEach((video) => {
      root.VieCaptions.watchVideo(video, onCaptionReceived);
    });
  }

  async function init() {
    settings = await root.VieStorage.getSettings();

    root.VieStorage.onChanged((changes) => {
      let clearCache = false;
      for (const [k, c] of Object.entries(changes)) {
        if (k in settings) {
          settings[k] = c.newValue;
          if (["provider", "targetLang", "secondaryLang", "translationStyle", "pronounStyle"].includes(k)) {
            clearCache = true;
          }
        }
      }
      if (clearCache) localCache.clear();
      document.querySelectorAll("video").forEach((v) => {
        const overlay = v.parentElement?.querySelector(".vie-overlay");
        if (overlay) root.VieDOM.applyOverlayVisualStyle(overlay, settings);
      });
    });

    root.VieSelection?.init();
    scanAndWatchVideos();

    // DOM Observer for dynamically added videos
    const observer = new MutationObserver(() => scanAndWatchVideos());
    if (document.documentElement) {
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  root.VieContent = {
    onCaptionReceived,
    renderSubtitles
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof self !== "undefined" ? self : this);
