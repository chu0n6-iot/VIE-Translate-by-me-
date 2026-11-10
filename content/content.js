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

    const isLyrics = Boolean(root.VieCaptions?.ytCueState?.isLyrics);
    const { formattedOrig, formattedVi } = root.VieDOM.formatSubtitleDecorations(cleanOrigRaw, cleanViRaw, isLyrics);

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

  function onCaptionReceived(video, rawText, immediate = false, nextText = "") {
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
          nextText: nextText || "",
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
        nextText: nextText || "",
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
    root.VieDOM?.applySettingsToDOM(settings);
    document.querySelectorAll("video").forEach((video) => {
      root.VieCaptions.watchVideo(video, onCaptionReceived);
    });
  }

  async function init() {
    settings = await root.VieStorage.getSettings();
    root.VieDOM?.applySettingsToDOM(settings);

    root.VieStorage.onChanged((changes) => {
      let clearCache = false;
      for (const [k, c] of Object.entries(changes)) {
        if (k in settings) {
          settings[k] = c.newValue;
          if (["provider", "targetLang", "secondaryLang", "translationStyle", "pronounStyle", "softenProfanity", "enabled"].includes(k)) {
            clearCache = true;
          }
        }
      }
      if (clearCache) localCache.clear();
      root.VieDOM?.applySettingsToDOM(settings);
      document.querySelectorAll("video").forEach((v) => {
        const overlay = v._vieOverlay || root.VieDOM?.getContainer?.(v)?.querySelector(".vie-overlay") || v.parentElement?.querySelector(".vie-overlay");
        if (overlay) root.VieDOM.applyOverlayVisualStyle(overlay, settings);
      });
    });

    root.VieSelection?.init();
    scanAndWatchVideos();

    // Bắt ngay lập tức mọi video đang phát qua capture phase (Tối ưu cho Facebook Feed, Reels, Twitter, TikTok)
    window.addEventListener(
      "play",
      (e) => {
        if (e.target && e.target.tagName === "VIDEO") {
          root.VieCaptions?.watchVideo(e.target, onCaptionReceived);
        }
      },
      true
    );

    window.addEventListener(
      "playing",
      (e) => {
        if (e.target && e.target.tagName === "VIDEO") {
          root.VieCaptions?.watchVideo(e.target, onCaptionReceived);
        }
      },
      true
    );

    // Xử lý tua video (seek) trên mọi trang web: xóa ngay cache text cũ để phụ đề hiển thị tức thì không bị mất
    const handleGlobalSeek = (e) => {
      if (e.target && e.target.tagName === "VIDEO") {
        const v = e.target;
        const state = root.VieCaptions?.getVideoState?.(v);
        if (state) {
          state.lastCueText = "";
          state.lastText = "";
          state.lastRenderedSeq = 0;
          if (state.hideTimer) {
            clearTimeout(state.hideTimer);
            state.hideTimer = null;
          }
          if (state.throttleTimer) {
            clearTimeout(state.throttleTimer);
            state.throttleTimer = null;
          }
        }
        root.VieCaptions?.renderYouTubeByTime?.(v);
      }
    };
    window.addEventListener("seeking", handleGlobalSeek, true);
    window.addEventListener("seeked", handleGlobalSeek, true);

    // DOM Observer cho các video được chèn động vào trang
    const observer = new MutationObserver(() => scanAndWatchVideos());
    if (document.documentElement) {
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    // Lắng nghe sự kiện chuyển trang ngầm (SPA) của YouTube để kích hoạt ngay phụ đề và CC
    const onYouTubePageChange = () => {
      if (!location.hostname.includes("youtube.com")) return;
      document.querySelectorAll("video").forEach((v) => {
        root.VieCaptions?.autoEnsureYouTubeCC?.(v);
        root.VieCaptions?.watchVideo?.(v, onCaptionReceived);
      });
      scanAndWatchVideos();
    };
    window.addEventListener("yt-navigate-finish", onYouTubePageChange);
    document.addEventListener("yt-navigate-finish", onYouTubePageChange);
    window.addEventListener("yt-page-data-updated", onYouTubePageChange);

    // Interval to ensure dynamic SPA video players (YouTube SPA nav, etc.) are always watched and have styles applied
    setInterval(scanAndWatchVideos, 1200);
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
