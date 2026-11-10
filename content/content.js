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
    if (overlay._subMuted) {
      overlay.classList.add("vie-hidden");
      return;
    }

    const cleanOrigRaw = (origText || "")
      .replace(/^(?:\*{1,2})?(?:ORIG(?:INAL)?|GỐC)\s*:\s*(?:\*{1,2})?/i, "")
      .replace(/^(?:ORIG|GỐC|ORIGINAL)\b[:\s-]*/i, "")
      .trim();
    const cleanViRaw = (viText || "")
      .replace(/^(?:\*{1,2})?(?:TRANS(?:LATION)?|DỊCH|VIETNAMESE|VI|ORIG(?:INAL)?|GỐC)\s*:\s*(?:\*{1,2})?/i, "")
      .replace(/^(?:ORIG|GỐC|ORIGINAL)\b[:\s-]*/i, "")
      .replace(/^(?:Tôi đang dịch|Đang dịch|Dưới đây là bản dịch)\s*[:\s-]*/i, "")
      .trim();

    // Giấu ngay lập tức nếu sub chứa câu chữ AI tự nói về mình ("Tôi đang dịch...") hoặc rò rỉ prompt
    const isLeakFn = root.VieStorage?.isAiMetaOrPromptLeak;
    if (isLeakFn && (isLeakFn(cleanOrigRaw) || isLeakFn(cleanViRaw))) {
      root.VieDOM?.hideOverlay(video);
      return;
    }

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

  let reloadHintVid = "";
  let noSubPlayedMs = 0;
  function showReloadHint(video, text) {
    const host = video?.parentElement || document.body;
    if (host.querySelector(".vie-quota-toast")) return;
    const el = document.createElement("div");
    el.className = "vie-quota-toast";
    const span = document.createElement("span");
    span.textContent = text;
    const btn = document.createElement("button");
    btn.textContent = "Tải lại (F5)";
    btn.onclick = () => location.reload();
    const close = document.createElement("button");
    close.className = "vie-quota-close";
    close.textContent = "✕";
    close.onclick = () => el.remove();
    el.append(span, btn, close);
    host.appendChild(el);
    setTimeout(() => el.remove(), 25000);
  }

  // Nếu video đã chạy một lúc mà vẫn chưa có phụ đề, gợi ý người dùng tải lại trang
  function startNoSubWatchdog() {
    setInterval(() => {
      const video = document.querySelector("video.html5-main-video") || document.querySelector("video");
      if (!video) return;
      const key = location.href;
      if (reloadHintVid === key) return;
      let stale = false;
      try { stale = !chrome.runtime?.id; } catch { stale = true; }
      if (stale) {
        reloadHintVid = key;
        showReloadHint(video, "Tiện ích vừa được cập nhật. Tải lại trang để phụ đề chạy lại.");
        return;
      }
      const st = root.VieCaptions?.getVideoState?.(video);
      if (!st || video.paused || video.ended || (video.currentTime || 0) < 1) return;
      const cs = root.VieCaptions?.ytCueState;
      const hasSub = st.hasReceivedAnySubtitle || st.audioCaptureActive || (cs && cs.cues.length > 0);
      const overlayText = document.querySelector(".vie-overlay:not(.vie-hidden)");
      if (hasSub || overlayText) { noSubPlayedMs = 0; return; }
      noSubPlayedMs += 2000;
      if (noSubPlayedMs >= 16000) {
        reloadHintVid = key;
        noSubPlayedMs = 0;
        showReloadHint(video, "Chưa thấy phụ đề hiện ra. Thử tải lại trang (F5) nhé.");
      }
    }, 2000);
  }

  let lastQuotaToastAt = 0;
  function showQuotaToast(video) {
    const now = Date.now();
    if (now - lastQuotaToastAt < 10 * 60 * 1000) return;
    lastQuotaToastAt = now;
    const host = video?.parentElement || document.body;
    if (host.querySelector(".vie-quota-toast")) return;
    const el = document.createElement("div");
    el.className = "vie-quota-toast";
    el.innerHTML = '<span>Key AI đã hết lượt hôm nay. Đang dùng Google Translate tạm.</span>';
    const add = document.createElement("button");
    add.textContent = "Thêm key";
    add.onclick = () => {
      chrome.runtime.sendMessage({ type: "OPEN_KEY_SETUP" });
      el.remove();
    };
    const close = document.createElement("button");
    close.className = "vie-quota-close";
    close.textContent = "✕";
    close.onclick = () => el.remove();
    el.append(add, close);
    host.appendChild(el);
    setTimeout(() => el.remove(), 20000);
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

      // Fast preview stream (0ms instant preview)
      if (settings.provider !== "gtx") {
        chrome.runtime.sendMessage({
          type: "TRANSLATE",
          text: cleanText,
          nextText: nextText || "",
          videoTitle: root.VieCaptions.getVideoTitle(),
          videoContext: root.VieCaptions.getVideoContext?.() || "",
          navToken: root.VieCaptions.ytCueState?.navToken || 0,
          fastPreviewOnly: true
        }, (previewRes) => {
          if (!chrome.runtime.lastError && previewRes?.vi && currentSeq >= state.lastRenderedSeq && currentSeq === state.reqSeq) {
            state.lastRenderedSeq = currentSeq;
            renderSubtitles(video, cleanText, previewRes.vi, previewRes.sub2 || "", true, false);
          }
        });
      }

      const executeAiTranslate = () => {
        chrome.runtime.sendMessage({
          type: "TRANSLATE",
          text: cleanText,
          nextText: nextText || "",
          videoTitle: root.VieCaptions.getVideoTitle(),
          videoContext: root.VieCaptions.getVideoContext?.() || "",
          navToken: root.VieCaptions.ytCueState?.navToken || 0,
          fastPreviewOnly: false
        }, (res) => {
          if (!chrome.runtime.lastError && res?.quotaExhausted) showQuotaToast(video);
          if (!chrome.runtime.lastError && res?.vi && currentSeq >= state.lastRenderedSeq) {
            localCache.set(ck, { vi: res.vi, sub2: res.sub2 || "" });
            if (localCache.size > 500) {
              localCache.delete(localCache.keys().next().value);
            }
            if (currentSeq !== state.reqSeq) return;
            state.lastRenderedSeq = currentSeq;
            renderSubtitles(video, cleanText, res.vi, res.sub2 || "", false, false);
          }
        });
      };

      if (state.aiRefineTimer) {
        clearTimeout(state.aiRefineTimer);
        state.aiRefineTimer = null;
      }

      // Ghép câu thông minh (Cơ chế 4): Nếu câu chưa trọn vẹn ngữ pháp, đợi nhẹ 280ms để ghép trọn câu
      const isIncomplete = settings.smartMergeCaptions !== false && root.VieCaptions?.isIncompleteClause?.(cleanText);
      if (isIncomplete && !nextText && settings.provider !== "gtx") {
        state.aiRefineTimer = setTimeout(executeAiTranslate, 280);
      } else {
        executeAiTranslate();
      }
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
    let lastHandledVid = "";
    const onYouTubePageChange = () => {
      if (!location.hostname.includes("youtube.com")) return;
      const curVid = new URL(location.href).searchParams.get("v") || "";
      if (curVid && curVid !== lastHandledVid) {
        lastHandledVid = curVid;
        reloadHintVid = "";
        noSubPlayedMs = 0;
        const curVideo = document.querySelector("video.html5-main-video") || document.querySelector("video");
        root.VieCaptions?.resetForNewVideo?.(curVideo, curVid);
        if (curVideo) {
          root.VieCaptions?.autoEnsureYouTubeCC?.(curVideo);
          root.VieCaptions?.loadYouTubeCues?.(curVideo);
        }
      }
      document.querySelectorAll("video").forEach((v) => {
        root.VieCaptions?.autoEnsureYouTubeCC?.(v);
        root.VieCaptions?.watchVideo?.(v, onCaptionReceived);
      });
      scanAndWatchVideos();
    };

    const onYouTubeNavStart = () => {
      if (!location.hostname.includes("youtube.com")) return;
      const curVid = new URL(location.href).searchParams.get("v") || "";
      lastHandledVid = curVid;
      reloadHintVid = "";
      noSubPlayedMs = 0;
      const curVideo = document.querySelector("video.html5-main-video") || document.querySelector("video");
      root.VieCaptions?.resetForNewVideo?.(curVideo, curVid);
    };

    window.addEventListener("yt-navigate-start", onYouTubeNavStart);
    document.addEventListener("yt-navigate-start", onYouTubeNavStart);
    window.addEventListener("yt-navigate-finish", onYouTubePageChange);
    document.addEventListener("yt-navigate-finish", onYouTubePageChange);
    window.addEventListener("yt-page-data-updated", onYouTubePageChange);
    window.addEventListener("popstate", onYouTubePageChange);

    // Interval phát hiện URL đổi tức thì ngay cả khi YouTube không bắn event SPA (100ms)
    setInterval(() => {
      if (!location.hostname.includes("youtube.com")) return;
      const curVid = new URL(location.href).searchParams.get("v") || "";
      if (curVid && curVid !== lastHandledVid) {
        onYouTubePageChange();
      }
    }, 120);

    // Interval to ensure dynamic SPA video players (YouTube SPA nav, etc.) are always watched and have styles applied
    setInterval(scanAndWatchVideos, 1200);
    startNoSubWatchdog();
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
