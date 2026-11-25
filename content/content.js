/**
 * VIE-Translate — Translate Toad AI
 * content/content.js — Thin entry point: coordinates storage, DOM, selection & captions
 */

(function (root) {
  "use strict";

  let settings = root.VieStorage ? { ...root.VieStorage.DEFAULT_SETTINGS } : {};
  const localCache = new Map();
  const knownVideos = new WeakSet();

  function setLocalCache(ck, val) {
    localCache.set(ck, val);
    if (localCache.size > 500) {
      localCache.delete(localCache.keys().next().value);
    }
  }

  function formatSrtTimestamp(seconds) {
    const msTotal = Math.max(0, Math.round((Number(seconds) || 0) * 1000));
    const hrs = Math.floor(msTotal / 3600000);
    const mins = Math.floor((msTotal % 3600000) / 60000);
    const secs = Math.floor((msTotal % 60000) / 1000);
    const ms = msTotal % 1000;
    const pad2 = (n) => String(n).padStart(2, "0");
    const pad3 = (n) => String(n).padStart(3, "0");
    return `${pad2(hrs)}:${pad2(mins)}:${pad2(secs)},${pad3(ms)}`;
  }

  function buildBilingualSrt(cues, lookupFn = null, includeOrig = true) {
    if (!Array.isArray(cues) || !cues.length) return "";
    const blocks = [];
    for (let i = 0; i < cues.length; i++) {
      const c = cues[i];
      if (!c) continue;
      const orig = String(c.text || "").trim();
      if (!orig) continue;
      const start = formatSrtTimestamp(c.start || 0);
      const end = formatSrtTimestamp(c.end > c.start ? c.end : (c.start || 0) + 2.5);
      const cachedEntry = typeof lookupFn === "function" ? lookupFn(orig) : null;
      const trans = cachedEntry ? (typeof cachedEntry === "string" ? cachedEntry : cachedEntry.vi || "") : (c.vi || "");
      const lines = [];
      if (includeOrig && orig) lines.push(orig);
      if (trans) lines.push(trans);
      if (!lines.length) continue;
      blocks.push(`${blocks.length + 1}\n${start} --> ${end}\n${lines.join("\n")}`);
    }
    return blocks.join("\n\n");
  }

  function exportBilingualSrt(video) {
    const activeVideo = video || (typeof document !== "undefined" ? document.querySelector("video.html5-main-video") || document.querySelector("video") : null);
    let cues = root.VieCaptions?.ytCueState?.cues || [];
    if ((!cues || !cues.length) && activeVideo?.textTracks) {
      for (const track of activeVideo.textTracks) {
        if ((track.kind === "subtitles" || track.kind === "captions") && track.cues?.length) {
          cues = Array.from(track.cues).map((c) => ({
            start: c.startTime,
            end: c.endTime,
            text: root.VieCaptions?.normalizeSubtitleText?.(c.text || "", settings.multiSpeakerSplit !== false) || String(c.text || "").trim()
          }));
          break;
        }
      }
    }
    if (!cues || !cues.length) {
      if (activeVideo) root.VieCaptions?.showSyncToast?.(activeVideo, "⚠ Chưa có dữ liệu phụ đề để xuất SRT!");
      return { ok: false, count: 0, error: "Chưa có dữ liệu phụ đề trên video này." };
    }

    const splitMulti = settings.multiSpeakerSplit !== false;
    const lookup = (raw) => {
      const clean = root.VieCaptions?.normalizeSubtitleText?.(raw, splitMulti) || raw.trim();
      const ck = root.VieStorage?.getCacheKey?.(clean, settings);
      return ck ? localCache.get(ck) : null;
    };
    const srtContent = buildBilingualSrt(cues, lookup, settings.dualSub !== false);
    if (!srtContent) return { ok: false, count: 0, error: "Không tạo được nội dung SRT." };

    const title = (root.VieCaptions?.getVideoTitle?.() || "subtitles")
      .replace(/[\\/:*?"<>|]+/g, "_")
      .slice(0, 60);
    const blob = new Blob(["\uFEFF" + srtContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `VIE-Translate-${title}.srt`;
    a.click();
    URL.revokeObjectURL(url);
    if (activeVideo) root.VieCaptions?.showSyncToast?.(activeVideo, `📥 Đã tải ${cues.length} dòng phụ đề (.SRT)!`);
    return { ok: true, count: cues.length };
  }

  function ingestBatchTranslations(resultsMap, sub2Map = {}) {
    if (!resultsMap || typeof resultsMap !== "object") return;
    const splitMulti = settings.multiSpeakerSplit !== false;
    const updated = new Map();

    for (const [src, vi] of Object.entries(resultsMap)) {
      if (!src || !vi) continue;
      const cleanSrc = root.VieCaptions
        ? root.VieCaptions.normalizeSubtitleText(src, splitMulti)
        : src.trim();
      const sub2 = (sub2Map && sub2Map[src]) || "";
      const ck = root.VieStorage.getCacheKey(cleanSrc, settings);
      setLocalCache(ck, { vi, sub2 });
      updated.set(cleanSrc, { vi, sub2 });
    }

    if (updated.size > 0 && typeof document !== "undefined") {
      document.querySelectorAll("video").forEach((v) => {
        const st = root.VieCaptions?.getVideoState?.(v);
        if (!st || !st.lastText || !updated.has(st.lastText)) return;
        const ov = v._vieOverlay || root.VieDOM?.getContainer?.(v)?.querySelector(".vie-overlay");
        const viEl = ov?.querySelector(".vie-vi");
        if (viEl && viEl.classList.contains("vie-preview")) {
          const entry = updated.get(st.lastText);
          renderSubtitles(v, st.lastText, entry.vi, entry.sub2, false, false);
        }
      });
    }
  }

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

  function maybeShowGithubUpdateToast() {
    if (settings.enabled === false || settings.autoCheckUpdates === false) return;
    const video = document.querySelector("video.html5-main-video") || document.querySelector("video");
    if (!video) return;
    try {
      if (!chrome?.runtime?.id) return;
      chrome.runtime.sendMessage({ type: "GET_UPDATE_STATUS" }, (res) => {
        if (chrome.runtime.lastError || !res?.ok || !res.hasUpdate || !res.updateId) return;
        if (res.dismissedCommitSha === res.updateId || res.toastShownForSha === res.updateId) return;
        const host = video?.parentElement || document.body;
        if (!host || host.querySelector(".vie-update-toast")) return;

        chrome.runtime.sendMessage(
          { type: "MARK_UPDATE_TOAST_SHOWN", updateId: res.updateId },
          () => void chrome.runtime.lastError
        );

        const label = res.remoteVersion && res.remoteVersion !== res.localVersion
          ? `v${res.remoteVersion}`
          : `#${res.remoteShortSha || "mới"}`;
        const el = document.createElement("div");
        el.className = "vie-update-toast";
        const span = document.createElement("span");
        span.textContent = `🐸 VIE-Translate có cập nhật mới trên GitHub (${label})!`;
        const openBtn = document.createElement("button");
        openBtn.textContent = "Cập nhật";
        openBtn.onclick = () => {
          chrome.runtime.sendMessage({ type: "OPEN_KEY_SETUP" }, () => void chrome.runtime.lastError);
          el.remove();
        };
        const close = document.createElement("button");
        close.className = "vie-quota-close";
        close.textContent = "✕";
        close.onclick = () => {
          chrome.runtime.sendMessage({ type: "DISMISS_UPDATE", updateId: res.updateId }, () => void chrome.runtime.lastError);
          el.remove();
        };
        el.append(span, openBtn, close);
        host.appendChild(el);
        setTimeout(() => el.remove(), 18000);
      });
    } catch {}
  }

  function onCaptionReceived(video, rawText, immediate = false, nextText = "") {
    if (!settings.enabled) {
      root.VieDOM?.hideOverlay(video);
      return;
    }

    const state = root.VieCaptions.getVideoState(video);
    const cleanText = root.VieCaptions.normalizeSubtitleText(rawText, settings.multiSpeakerSplit !== false);

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
      const needsSub2 = Boolean(
        settings.dualSub &&
        settings.secondaryLang &&
        settings.secondaryLang !== "orig" &&
        settings.secondaryLang !== "none" &&
        settings.secondaryLang !== settings.targetLang
      );
      if (!needsSub2 || cached.sub2) {
        renderSubtitles(video, cleanText, cached.vi, cached.sub2, false, false);
        return;
      }
    }

    const now = Date.now();
    const elapsed = now - state.lastSendAt;
    const THROTTLE_MS = 60;

    const doTranslate = () => {
      state.lastSendAt = Date.now();
      const currentSeq = ++state.reqSeq;
      let gotFinalFromPreview = false;

      // Fast preview stream (0ms instant preview — or instant 0ms final AI if already cached in background)
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
            if (previewRes.isFinalAi) {
              gotFinalFromPreview = true;
              setLocalCache(ck, { vi: previewRes.vi, sub2: previewRes.sub2 || "" });
              if (state.aiRefineTimer) {
                clearTimeout(state.aiRefineTimer);
                state.aiRefineTimer = null;
              }
              state.lastRenderedSeq = currentSeq;
              renderSubtitles(video, cleanText, previewRes.vi, previewRes.sub2 || "", false, false);
            } else {
              state.lastRenderedSeq = currentSeq;
              renderSubtitles(video, cleanText, previewRes.vi, previewRes.sub2 || "", true, false);
            }
          }
        });
      }

      const executeAiTranslate = () => {
        if (gotFinalFromPreview || currentSeq !== state.reqSeq) return;
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
            setLocalCache(ck, { vi: res.vi, sub2: res.sub2 || "" });
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

      // Ghép câu thông minh (Cơ chế 4): Chỉ trễ nhẹ 180ms cho stream CC chưa ngắt câu (không trễ với cue rời rạc immediate === true)
      const isIncomplete = settings.smartMergeCaptions !== false && root.VieCaptions?.isIncompleteClause?.(cleanText);
      if (!immediate && isIncomplete && !nextText && settings.provider !== "gtx") {
        state.aiRefineTimer = setTimeout(executeAiTranslate, 180);
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

  function watchVideosLight() {
    let foundNew = false;
    document.querySelectorAll("video").forEach((video) => {
      if (!knownVideos.has(video)) {
        knownVideos.add(video);
        foundNew = true;
      }
      root.VieCaptions.watchVideo(video, onCaptionReceived);
    });
    if (foundNew) {
      root.VieDOM?.applySettingsToDOM(settings);
    }
  }

  function scanAndWatchVideos() {
    root.VieDOM?.applySettingsToDOM(settings);
    document.querySelectorAll("video").forEach((video) => {
      knownVideos.add(video);
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
          if (["provider", "targetLang", "secondaryLang", "translationStyle", "pronounStyle", "softenProfanity", "customGlossary", "multiSpeakerSplit", "enabled"].includes(k)) {
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
          knownVideos.add(e.target);
          root.VieCaptions?.watchVideo(e.target, onCaptionReceived);
        }
      },
      true
    );

    window.addEventListener(
      "playing",
      (e) => {
        if (e.target && e.target.tagName === "VIDEO") {
          knownVideos.add(e.target);
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

    // DOM Observer có bộ lọc & gom lô 120ms để tránh chạy lại khi chính extension cập nhật phụ đề
    let mutationScanTimer = null;
    const OWN_UI_SELECTOR = ".vie-overlay, #vie-selection-bubble, .vie-toad-audio-btn, .vie-quick-sub-toggle";
    const isOwnUiNode = (node) => {
      const el = node instanceof Element ? node : node?.parentElement;
      return Boolean(el && el.closest(OWN_UI_SELECTOR));
    };
    const observer = new MutationObserver((mutations) => {
      const hasExternalMutation = mutations.some((m) => !isOwnUiNode(m.target));
      if (!hasExternalMutation) return;
      if (!mutationScanTimer) {
        mutationScanTimer = setTimeout(() => {
          mutationScanTimer = null;
          watchVideosLight();
        }, 120);
      }
    });
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
      watchVideosLight();
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

    // Interval phát hiện URL đổi tức thì ngay cả khi YouTube không bắn event SPA (120ms)
    let lastCheckedUrl = "";
    setInterval(() => {
      if (!location.hostname.includes("youtube.com")) return;
      if (location.href === lastCheckedUrl) return;
      lastCheckedUrl = location.href;
      const curVid = new URL(lastCheckedUrl).searchParams.get("v") || "";
      if (curVid && curVid !== lastHandledVid) {
        onYouTubePageChange();
      }
    }, 120);

    // Interval to ensure dynamic SPA video players (YouTube SPA nav, etc.) are always watched
    setInterval(watchVideosLight, 1200);
    startNoSubWatchdog();
    initHotkeys();
    if (typeof chrome !== "undefined" && chrome.runtime?.id) {
      setTimeout(maybeShowGithubUpdateToast, 2800);
    }
  }

  function initHotkeys() {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;
    window.addEventListener("keydown", (e) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || settings.hotkeysEnabled === false) return;
      const tag = (e.target?.tagName || "").toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target?.isContentEditable) return;

      const k = (e.key || "").toLowerCase();
      const activeVideo = document.querySelector("video.html5-main-video") || document.querySelector("video");

      if (k === "v") {
        e.preventDefault();
        const btn = document.querySelector(".vie-quick-sub-toggle");
        if (btn) btn.click();
        else if (root.VieStorage?.setSettings) root.VieStorage.setSettings({ enabled: !settings.enabled });
      } else if (k === "d") {
        e.preventDefault();
        const nextDual = !settings.dualSub;
        root.VieStorage?.setSettings?.({ dualSub: nextDual });
        if (activeVideo) {
          root.VieCaptions?.showSyncToast?.(activeVideo, nextDual ? "🔤 Đã bật Song ngữ 2 dòng" : "🇻🇳 Đã chuyển chế độ 1 dòng");
        }
      } else if (k === "t") {
        e.preventDefault();
        root.VieWebpage?.toggle?.();
      } else if (k === "s" && activeVideo) {
        e.preventDefault();
        root.VieDOM?.triggerVisualSceneOCR?.(activeVideo, activeVideo._vieOverlay);
      } else if (k === "l" && activeVideo) {
        e.preventDefault();
        const audioBtn = document.querySelector(".vie-toad-audio-btn");
        if (audioBtn) audioBtn.click();
        else root.VieCaptions?.startVideoAudioCapture?.(activeVideo);
      } else if (e.key === "," && activeVideo) {
        e.preventDefault();
        root.VieCaptions?.adjustSubSyncOffset?.(activeVideo, -0.5, e.shiftKey);
      } else if (e.key === "." && activeVideo) {
        e.preventDefault();
        root.VieCaptions?.adjustSubSyncOffset?.(activeVideo, 0.5, e.shiftKey);
      }
    });
  }

  if (typeof chrome !== "undefined" && chrome.runtime?.onMessage?.addListener) {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!msg?.type) return;
      if (msg.type === "EXPORT_VIDEO_SRT") {
        sendResponse(exportBilingualSrt());
        return false;
      }
      if (msg.type === "TRIGGER_SCREEN_OCR") {
        const video = document.querySelector("video.html5-main-video") || document.querySelector("video");
        if (!video) {
          sendResponse({ ok: false, error: "Không tìm thấy video đang phát trên tab này." });
          return false;
        }
        root.VieDOM?.triggerVisualSceneOCR?.(video, video._vieOverlay);
        sendResponse({ ok: true });
        return false;
      }
    });
  }

  root.VieContent = {
    onCaptionReceived,
    renderSubtitles,
    ingestBatchTranslations,
    formatSrtTimestamp,
    buildBilingualSrt,
    exportBilingualSrt
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof self !== "undefined" ? self : this);
