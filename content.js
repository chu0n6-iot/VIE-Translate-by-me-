const watchedVideos = new WeakSet();
const watchedTracks = new WeakSet();
const watchedCaptionContainers = new WeakSet();
const localCache = new Map(); // cacheKey -> { vi, sub2 }

const FONT_FAMILY_MAP = {
  default: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", Times, serif',
  mono: '"JetBrains Mono", Consolas, "Courier New", monospace',
  rounded: '"Trebuchet MS", "Segoe UI", Verdana, sans-serif',
  impact: '"Arial Black", Impact, "Segoe UI", sans-serif'
};

let settings = {
  enabled: true,
  dualSub: true,
  provider: "gemini",
  targetLang: "vi",
  secondaryLang: "orig",
  translationStyle: "natural",
  subFont: "default",
  subSize: "100",
  subColor: "#fef08a",
  subSecondColor: "#e2e8f0",
  subBgStyle: "toad",
  subBottomPos: "12",
  overlayWidth: 72,
  overlayScale: 100,
  overlayBottom: 12,
  autoAudioNoCC: false
};

const PLATFORM_CAPTION_CONFIGS = [
  {
    name: "youtube",
    playerSelector: ".html5-video-player",
    containerSelector: ".ytp-caption-window-container",
    segmentSelector: ".ytp-caption-segment",
    isStreaming: true
  },
  {
    name: "videojs",
    playerSelector: ".video-js",
    containerSelector: ".vjs-text-track-display",
    segmentSelector: ".vjs-text-track-cue"
  },
  {
    name: "jwplayer",
    playerSelector: ".jwplayer",
    containerSelector: ".jw-captions",
    segmentSelector: ".jw-text-track-cue"
  },
  {
    name: "plyr",
    playerSelector: ".plyr",
    containerSelector: ".plyr__captions",
    segmentSelector: ".plyr__caption"
  },
  {
    name: "shaka",
    playerSelector: ".shaka-video-container",
    containerSelector: ".shaka-text-container",
    segmentSelector: "span"
  },
  {
    name: "udemy",
    playerSelector: "[data-purpose='video-player'], .video-player--container--23VX7",
    containerSelector: "[data-purpose='captions-cue-text'], [class*='captions-display--captions-container']",
    segmentSelector: null
  },
  {
    name: "coursera",
    playerSelector: ".rc-VideoMiniPlayer, .c-video-player",
    containerSelector: ".c-video-cue-container",
    segmentSelector: null
  },
  {
    name: "vimeo",
    playerSelector: ".vp-video-wrapper, .player",
    containerSelector: ".vp-captions",
    segmentSelector: "span"
  },
  {
    name: "bilibili",
    playerSelector: ".bpx-player-video-area, .bilibili-player-video-wrap",
    containerSelector: ".bpx-player-subtitle-panel-wrap, .bilibili-player-video-subtitle",
    segmentSelector: ".bpx-player-subtitle-panel-text"
  },
  {
    name: "netflix",
    playerSelector: ".watch-video, .NFPlayer",
    containerSelector: ".player-timedtext",
    segmentSelector: ".player-timedtext-text-container"
  },
  {
    name: "ted",
    playerSelector: "[data-testid='video-player']",
    containerSelector: "[data-testid='player-captions'], .ted-player-captions",
    segmentSelector: null
  },
  {
    name: "artplayer",
    playerSelector: ".art-video-player",
    containerSelector: ".art-subtitle",
    segmentSelector: null
  },
  {
    name: "dplayer",
    playerSelector: ".dplayer",
    containerSelector: ".dplayer-subtitle",
    segmentSelector: null
  },
  {
    name: "mediaelement",
    playerSelector: ".mejs__container",
    containerSelector: ".mejs__captions-layer",
    segmentSelector: ".mejs__captions-text"
  }
];

const PLAYER_WRAPPER_SELECTORS = [
  ".html5-video-player",
  ".video-js",
  ".jwplayer",
  ".plyr",
  ".shaka-video-container",
  ".bpx-player-video-area",
  ".art-video-player",
  ".dplayer",
  ".mejs__container",
  ".vp-video-wrapper",
  "[data-purpose='video-player']",
  ".watch-video"
].join(", ");

function getLocalCacheKey(text) {
  return `${settings.targetLang}:${settings.secondaryLang}:${settings.translationStyle}:${text}`;
}

chrome.storage.local.get(settings, (res) => {
  settings = { ...settings, ...res };
  applySettingsToDOM();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  let clearCacheNeeded = false;
  for (const [k, change] of Object.entries(changes)) {
    if (k in settings) {
      settings[k] = change.newValue;
      if (["provider", "targetLang", "secondaryLang", "translationStyle"].includes(k)) {
        clearCacheNeeded = true;
      }
    }
  }
  if (clearCacheNeeded) {
    localCache.clear();
  }
  applySettingsToDOM();
});

function applyOverlayVisualStyle(overlay) {
  if (!overlay) return;
  const fontStack = FONT_FAMILY_MAP[settings.subFont] || FONT_FAMILY_MAP.default;
  const rawScale = Number(settings.subSize) || Number(settings.overlayScale) || 100;
  const scale = Math.max(0.6, Math.min(2.0, rawScale / 100));
  const rawBottom = Number(settings.subBottomPos) || Number(settings.overlayBottom) || 12;
  const bottomPos = Math.max(2, Math.min(60, rawBottom));
  const widthPct = Math.max(30, Math.min(100, Number(settings.overlayWidth) || 72));

  overlay.style.setProperty("--vie-font-family", fontStack);
  overlay.style.setProperty("--vie-scale", String(scale));
  overlay.style.setProperty("--vie-w", `${widthPct}%`);
  overlay.style.setProperty("--vie-bottom", `${bottomPos}%`);
  overlay.style.setProperty("--vie-primary-color", settings.subColor || "#fef08a");
  overlay.style.setProperty("--vie-second-color", settings.subSecondColor || "#e2e8f0");
  overlay.setAttribute("data-bg-style", settings.subBgStyle || "toad");

  const origEl = overlay.querySelector(".vie-orig");
  if (origEl) {
    const showSecondary = Boolean(settings.dualSub) && settings.secondaryLang !== "none";
    origEl.style.display = showSecondary ? "block" : "none";
  }
}

function applySettingsToDOM() {
  document.querySelectorAll(PLAYER_WRAPPER_SELECTORS).forEach((player) => {
    player.classList.toggle("vie-player-active", Boolean(settings.enabled));
    player.classList.toggle("vie-yt-active", Boolean(settings.enabled));
  });

  document.querySelectorAll("video").forEach((video) => {
    const container = getContainer(video);
    if (container) {
      container.classList.toggle("vie-player-active", Boolean(settings.enabled));
    }
    if (video.textTracks) {
      for (const track of video.textTracks) {
        if (track.kind !== "subtitles" && track.kind !== "captions") continue;
        if (!settings.enabled && track._vieWasShowing && track.mode === "hidden") {
          track.mode = "showing";
        } else if (settings.enabled && track.mode === "showing") {
          track._vieWasShowing = true;
          track.mode = "hidden";
        }
      }
    }
  });

  document.querySelectorAll(".vie-overlay").forEach((overlay) => {
    if (!settings.enabled) {
      overlay.classList.add("vie-hidden");
    }
    applyOverlayVisualStyle(overlay);
  });
}

function getContainer(video) {
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  if (fsEl && fsEl !== video && fsEl.contains(video)) {
    return fsEl;
  }

  const knownPlayer = video.closest(PLAYER_WRAPPER_SELECTORS);
  if (knownPlayer) return knownPlayer;

  const parent = video.parentElement || document.body;
  const style = window.getComputedStyle(parent);
  if (style.position === "static") {
    parent.style.position = "relative";
  }
  return parent;
}

function getOrCreateOverlay(video) {
  const container = getContainer(video);
  container.classList.toggle("vie-player-active", Boolean(settings.enabled));

  let overlay = container.querySelector(":scope > .vie-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "vie-overlay vie-hidden";

    const origLine = document.createElement("div");
    origLine.className = "vie-orig";

    const viLine = document.createElement("div");
    viLine.className = "vie-vi";

    overlay.appendChild(origLine);
    overlay.appendChild(viLine);
    container.appendChild(overlay);
  }
  applyOverlayVisualStyle(overlay);
  return overlay;
}

function hideOverlay(video) {
  const container = getContainer(video);
  const overlay = container.querySelector(":scope > .vie-overlay");
  if (overlay) {
    overlay.classList.add("vie-hidden");
  }
}

function getVideoTitle() {
  const ytTitle =
    document.querySelector("h1.ytd-watch-metadata yt-formatted-string")?.textContent ||
    document.querySelector(".ytp-title-link")?.textContent ||
    document.querySelector("h1")?.textContent;
  if (ytTitle && ytTitle.trim()) return ytTitle.trim().slice(0, 140);
  return document.title.replace(/\s*-\s*YouTube$/i, "").trim().slice(0, 140);
}

function normalizeSubtitleText(rawText) {
  return (rawText || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\{[^}]+\}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const videoStateMap = new WeakMap();

function getVideoState(video) {
  let state = videoStateMap.get(video);
  if (!state) {
    state = {
      lastText: "",
      reqSeq: 0,
      lastRenderedSeq: 0,
      lastSendAt: 0,
      hideTimer: null,
      throttleTimer: null,
      aiRefineTimer: null,
      previewTimer: null,
      prefetchedTrackCues: new WeakSet(),
      hasReceivedAnySubtitle: false,
      audioCaptureActive: false,
      audioRecorder: null,
      audioInterval: null,
      toadBtnEl: null
    };
    videoStateMap.set(video, state);
  }
  return state;
}

function getSecondaryDisplayLine(origText, sub2Text) {
  if (!settings.dualSub || settings.secondaryLang === "none") return "";
  if (settings.secondaryLang && settings.secondaryLang !== "orig" && sub2Text) {
    return sub2Text;
  }
  return origText;
}

function renderTranslation(video, origText, viText, sub2Text = "", isPreview = false, isError = false) {
  const overlay = getOrCreateOverlay(video);
  const origEl = overlay.querySelector(".vie-orig");
  const viEl = overlay.querySelector(".vie-vi");

  const showSecondary = Boolean(settings.dualSub) && settings.secondaryLang !== "none";
  if (origEl) {
    origEl.textContent = getSecondaryDisplayLine(origText, sub2Text);
    origEl.style.display = showSecondary ? "block" : "none";
  }

  if (viEl) {
    viEl.textContent = viText;
    viEl.classList.toggle("vie-preview", Boolean(isPreview));
    viEl.classList.toggle("vie-error", Boolean(isError));
  }

  overlay.classList.remove("vie-hidden");
}

function scheduleTranslate(video, rawText, immediate = false) {
  const state = getVideoState(video);

  if (!settings.enabled) {
    hideOverlay(video);
    return;
  }

  const cleanText = normalizeSubtitleText(rawText);
  if (!cleanText) {
    if (state.throttleTimer) {
      clearTimeout(state.throttleTimer);
      state.throttleTimer = null;
    }
    if (state.aiRefineTimer) {
      clearTimeout(state.aiRefineTimer);
      state.aiRefineTimer = null;
    }
    if (state.hideTimer) clearTimeout(state.hideTimer);
    state.hideTimer = setTimeout(() => {
      state.lastText = "";
      state.reqSeq++;
      state.lastRenderedSeq = state.reqSeq;
      hideOverlay(video);
    }, 700);
    return;
  }

  if (state.hideTimer) {
    clearTimeout(state.hideTimer);
    state.hideTimer = null;
  }

  state.hasReceivedAnySubtitle = true;
  if (cleanText === state.lastText) return;

  const ck = getLocalCacheKey(cleanText);
  if (localCache.has(ck)) {
    state.lastText = cleanText;
    const cachedObj = localCache.get(ck);
    renderTranslation(video, cleanText, cachedObj.vi, cachedObj.sub2, false, false);
    return;
  }

  const isStreamingGrowth =
    !immediate &&
    state.lastText &&
    (cleanText.startsWith(state.lastText) ||
      cleanText.includes(state.lastText.slice(-20)));

  state.lastText = cleanText;

  if (immediate) {
    if (state.throttleTimer) {
      clearTimeout(state.throttleTimer);
      state.throttleTimer = null;
    }
    state.lastSendAt = Date.now();
    translateAndShow(video, cleanText, false);
    return;
  }

  const now = Date.now();
  const elapsed = now - state.lastSendAt;
  const THROTTLE_MS = 110;

  if (elapsed >= THROTTLE_MS) {
    state.lastSendAt = now;
    translateAndShow(video, cleanText, isStreamingGrowth && settings.provider !== "gtx");
  } else if (!state.throttleTimer) {
    state.throttleTimer = setTimeout(() => {
      state.throttleTimer = null;
      state.lastSendAt = Date.now();
      if (state.lastText) {
        translateAndShow(video, state.lastText, false);
      }
    }, THROTTLE_MS - elapsed);
  }

  if (settings.provider !== "gtx") {
    if (state.aiRefineTimer) clearTimeout(state.aiRefineTimer);
    const endsWithPunct = /[.,!?;:]$/.test(cleanText);
    state.aiRefineTimer = setTimeout(
      () => {
        state.aiRefineTimer = null;
        if (state.lastText && settings.enabled) {
          translateAndShow(video, state.lastText, false);
        }
      },
      endsWithPunct ? 70 : 240
    );
  }
}

function translateAndShow(video, text, fastStreamMode = false) {
  const state = getVideoState(video);
  const currentSeq = ++state.reqSeq;

  const overlay = getOrCreateOverlay(video);
  const origEl = overlay.querySelector(".vie-orig");
  if (origEl && settings.secondaryLang === "orig") {
    origEl.textContent = text;
    origEl.style.display = settings.dualSub ? "block" : "none";
  }

  let settled = false;

  // Song song hiển thị ngay bản dịch tức thời (0ms delay) để người dùng đọc kịp ngay lập tức,
  // sau đó bản dịch AI chuẩn ngữ cảnh sẽ tự động nâng cấp đè lên khi hoàn tất
  if (!fastStreamMode && settings.provider !== "gtx") {
    if (state.previewTimer) {
      clearTimeout(state.previewTimer);
      state.previewTimer = null;
    }
    chrome.runtime.sendMessage(
      {
        type: "TRANSLATE",
        text,
        videoTitle: getVideoTitle(),
        fastPreviewOnly: true
      },
      (previewRes) => {
        if (chrome.runtime.lastError) return;
        if (settled || currentSeq < state.lastRenderedSeq || !settings.enabled) return;
        const previewVi = (previewRes?.vi || "").trim();
        if (previewVi) {
          state.lastRenderedSeq = Math.max(state.lastRenderedSeq, currentSeq);
          renderTranslation(video, text, previewVi, previewRes?.sub2 || "", true, false);
        }
      }
    );
  }

  chrome.runtime.sendMessage(
    {
      type: "TRANSLATE",
      text,
      videoTitle: getVideoTitle(),
      fastPreviewOnly: fastStreamMode
    },
    (res) => {
      settled = true;
      if (state.previewTimer) {
        clearTimeout(state.previewTimer);
        state.previewTimer = null;
      }
      if (chrome.runtime.lastError) return;
      if (currentSeq < state.lastRenderedSeq || !settings.enabled) return;

      // Không bao giờ hiện thông báo lỗi màu đỏ che video khi hết quota
      if (res?.error) {
        return;
      }

      const viText = (res?.vi || "").trim();
      if (!viText) return;

      state.lastRenderedSeq = currentSeq;
      const sub2Text = (res?.sub2 || "").trim();

      if (!fastStreamMode) {
        const ck = getLocalCacheKey(text);
        localCache.set(ck, { vi: viText, sub2: sub2Text });
        if (localCache.size > 600) {
          const oldest = localCache.keys().next().value;
          localCache.delete(oldest);
        }
      }

      renderTranslation(video, text, viText, sub2Text, fastStreamMode, false);
    }
  );
}

// Dịch trước (Lookahead Prefetch) các câu phụ đề sắp tới trong <track>
function prefetchUpcomingCues(video, track) {
  if (!settings.enabled || !track.cues || track.cues.length === 0) return;
  const state = getVideoState(video);
  const now = video.currentTime || 0;
  const upcomingTexts = [];

  for (let i = 0; i < track.cues.length; i++) {
    const cue = track.cues[i];
    if (!cue || cue.endTime < now) continue;
    if (cue.startTime > now + 100) break;
    if (state.prefetchedTrackCues.has(cue)) continue;

    const clean = normalizeSubtitleText(cue.text || "");
    if (clean && !localCache.has(getLocalCacheKey(clean))) {
      upcomingTexts.push({ cue, clean });
      if (upcomingTexts.length >= 12) break;
    }
  }

  if (upcomingTexts.length < 1) return;

  for (const item of upcomingTexts) {
    state.prefetchedTrackCues.add(item.cue);
  }

  chrome.runtime.sendMessage(
    {
      type: "TRANSLATE_BATCH",
      texts: upcomingTexts.map((x) => x.clean),
      videoTitle: getVideoTitle()
    },
    (res) => {
      if (chrome.runtime.lastError || !res?.results) return;
      for (const [src, vi] of Object.entries(res.results)) {
        if (src && vi) {
          localCache.set(getLocalCacheKey(src), { vi, sub2: "" });
        }
      }
    }
  );
}

// Dịch trước & đồng bộ theo thời gian cho YouTube (gộp câu thông minh cho cả Auto-Captions ASR)
const ytCueState = { vid: "", cues: [], sent: new Set(), timer: null, renderTimer: null };

function mergeEventsIntoSentences(events) {
  const out = [];
  let cur = null;
  const flush = () => {
    if (cur) out.push(cur);
    cur = null;
  };
  for (const ev of events) {
    if (cur) {
      const gap = ev.start - cur.end;
      const tooLong = cur.text.length >= 90 || ev.end - cur.start > 8;
      if (gap > 0.9 || tooLong || /[.?!…]$/.test(cur.text)) flush();
    }
    if (!cur) {
      cur = { start: ev.start, end: ev.end, text: ev.text };
    } else {
      cur.text = `${cur.text} ${ev.text}`;
      cur.end = Math.max(cur.end, ev.end);
    }
  }
  flush();
  for (let i = 0; i < out.length; i++) {
    const next = out[i + 1];
    const maxEnd = next ? next.start : out[i].end + 1.5;
    out[i].end = Math.min(Math.max(out[i].end, out[i].end + 1.5), maxEnd);
  }
  return out;
}

async function loadYouTubeCues(video) {
  if (!location.hostname.includes("youtube.com")) return;
  const vid = new URL(location.href).searchParams.get("v");
  if (!vid || ytCueState.vid === vid) return;
  ytCueState.vid = vid;
  ytCueState.cues = [];
  ytCueState.sent = new Set();
  try {
    const html = await (await fetch(`/watch?v=${vid}`, { credentials: "include" })).text();
    const m = html.match(/"captionTracks":(\[\{.*?\}\]),"/);
    if (!m) return;
    const tracks = JSON.parse(m[1]);
    const notTarget = tracks.filter(
      (t) => !(t.languageCode || "").toLowerCase().startsWith((settings.targetLang || "vi").toLowerCase())
    );
    const pool = notTarget.length ? notTarget : tracks;
    const track = pool.find((t) => t.kind !== "asr") || pool[0];
    if (!track) return;
    const data = await (await fetch(`${track.baseUrl}&fmt=json3`, { credentials: "include" })).json();
    const events = [];
    for (const ev of data.events || []) {
      if (!ev.segs) continue;
      const text = normalizeSubtitleText(ev.segs.map((sg) => sg.utf8 || "").join(""));
      if (!text) continue;
      const start = (ev.tStartMs || 0) / 1000;
      events.push({ start, end: start + (ev.dDurationMs || 2000) / 1000, text });
    }
    const cues = track.kind === "asr" ? mergeEventsIntoSentences(events) : events;
    if (ytCueState.vid === vid) {
      ytCueState.cues = cues;
      if (video) {
        renderYouTubeByTime(video);
        prefetchYouTubeCues(video);
      }
    }
  } catch {
    // Nếu YouTube chặn tải trước timedtext thì vẫn dịch trực tiếp real-time từ DOM
  }
}

function prefetchYouTubeCues(video) {
  if (!settings.enabled || !ytCueState.cues.length) return;
  const now = video.currentTime || 0;
  const batch = [];
  for (const c of ytCueState.cues) {
    if (c.end < now) continue;
    if (c.start > now + 120) break;
    const ck = getLocalCacheKey(c.text);
    if (ytCueState.sent.has(ck) || localCache.has(ck)) continue;
    batch.push(c.text);
    if (batch.length >= 12) break;
  }
  if (!batch.length) return;
  batch.forEach((t) => ytCueState.sent.add(getLocalCacheKey(t)));
  chrome.runtime.sendMessage(
    { type: "TRANSLATE_BATCH", texts: batch, videoTitle: getVideoTitle() },
    (res) => {
      if (chrome.runtime.lastError || !res?.results) {
        batch.forEach((t) => ytCueState.sent.delete(getLocalCacheKey(t)));
        return;
      }
      for (const [src, vi] of Object.entries(res.results)) {
        if (src && vi) localCache.set(getLocalCacheKey(src), { vi, sub2: "" });
      }
    }
  );
}

function renderYouTubeByTime(video) {
  const cues = ytCueState.cues;
  if (!cues.length || !settings.enabled) return false;

  const ccBtn = document.querySelector(".ytp-subtitles-button");
  if (ccBtn && ccBtn.getAttribute("aria-pressed") === "false") {
    hideOverlay(video);
    return true;
  }

  const t = video.currentTime || 0;
  let lo = 0;
  let hi = cues.length - 1;
  let idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].start <= t) {
      idx = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  const state = getVideoState(video);
  const cue = idx >= 0 && t <= cues[idx].end ? cues[idx] : null;
  if (!cue) {
    if (state.lastText) {
      state.lastText = "";
      state.reqSeq++;
      hideOverlay(video);
    }
    return true;
  }
  if (cue.text !== state.lastText) {
    state.lastText = cue.text;
    state.hasReceivedAnySubtitle = true;
    const ck = getLocalCacheKey(cue.text);
    if (localCache.has(ck) && (settings.secondaryLang === "orig" || settings.secondaryLang === "none")) {
      const cachedObj = localCache.get(ck);
      renderTranslation(video, cue.text, cachedObj.vi, cachedObj.sub2, false, false);
    } else {
      translateAndShow(video, cue.text, false);
    }
  }
  return true;
}

function startYouTubePrefetch(video) {
  if (!video.closest(".html5-video-player")) return;
  loadYouTubeCues(video);
  if (ytCueState.timer) return;
  ytCueState.timer = setInterval(() => {
    loadYouTubeCues(video);
    prefetchYouTubeCues(video);
  }, 1200);
  ytCueState.renderTimer = setInterval(() => renderYouTubeByTime(video), 50);
  video.addEventListener("timeupdate", () => renderYouTubeByTime(video));
  video.addEventListener("seeking", () => {
    ytCueState.sent.clear();
    renderYouTubeByTime(video);
    prefetchYouTubeCues(video);
  });
}

// ============================================================================
// TÍNH NĂNG MỞ RỘNG: DỊCH VIDEO TRÊN TRANG WEB KHÔNG CÓ NÚT CC / SUBTITLES
// ============================================================================

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = String(reader.result || "");
      const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function stopVideoAudioCapture(video) {
  const state = getVideoState(video);
  state.audioCaptureActive = false;
  if (state.audioInterval) {
    clearInterval(state.audioInterval);
    state.audioInterval = null;
  }
  if (state.audioRecorder && state.audioRecorder.state !== "inactive") {
    try {
      state.audioRecorder.stop();
    } catch {
      // Bỏ qua
    }
  }
  state.audioRecorder = null;
  if (state.toadBtnEl) {
    state.toadBtnEl.classList.remove("vie-audio-active");
    const span = state.toadBtnEl.querySelector("span");
    if (span) span.textContent = "AI Nghe & Dịch (Không cần CC)";
  }
}

function startVideoAudioCapture(video) {
  const state = getVideoState(video);
  if (state.audioCaptureActive) {
    stopVideoAudioCapture(video);
    return;
  }

  const captureFn = video.captureStream || video.mozCaptureStream;
  if (typeof captureFn !== "function") {
    return;
  }

  let fullStream;
  try {
    fullStream = captureFn.call(video);
  } catch {
    return;
  }

  const audioTracks = fullStream.getAudioTracks();
  if (!audioTracks || audioTracks.length === 0) {
    return;
  }

  const audioOnlyStream = new MediaStream(audioTracks);
  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : MediaRecorder.isTypeSupported("audio/webm")
    ? "audio/webm"
    : "";

  state.audioCaptureActive = true;
  if (state.toadBtnEl) {
    state.toadBtnEl.classList.add("vie-audio-active");
    const span = state.toadBtnEl.querySelector("span");
    if (span) span.textContent = "🎙️ Đang nghe & dịch AI...";
  }

  renderTranslation(
    video,
    "🐸 Translate Toad AI Audio",
    "Đang lắng nghe âm thanh video để tạo phụ đề trực tiếp...",
    "",
    true,
    false
  );

  const recordSlice = () => {
    if (!state.audioCaptureActive || !settings.enabled) {
      stopVideoAudioCapture(video);
      return;
    }
    if (video.paused || video.ended || video.muted || video.volume === 0) return;

    try {
      const recorder = mimeType
        ? new MediaRecorder(audioOnlyStream, { mimeType, audioBitsPerSecond: 32000 })
        : new MediaRecorder(audioOnlyStream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        if (!state.audioCaptureActive || chunks.length === 0) return;
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        if (blob.size < 600) return;
        try {
          const audioBase64 = await blobToBase64(blob);
          chrome.runtime.sendMessage(
            {
              type: "TRANSCRIBE_AUDIO",
              audioBase64,
              mimeType: recorder.mimeType || "audio/webm",
              videoTitle: getVideoTitle()
            },
            (res) => {
              if (chrome.runtime.lastError || !state.audioCaptureActive) return;
              if (res?.error) {
                return;
              }
              if (res?.vi) {
                renderTranslation(
                  video,
                  res.orig || "",
                  res.vi,
                  res.sub2 || "",
                  false,
                  false
                );
              }
            }
          );
        } catch {
          // Bỏ qua lỗi chuyển đổi
        }
      };

      state.audioRecorder = recorder;
      recorder.start();
      setTimeout(() => {
        if (recorder.state === "recording") {
          try {
            recorder.stop();
          } catch {
            // Bỏ qua
          }
        }
      }, 2300);
    } catch {
      stopVideoAudioCapture(video);
    }
  };

  recordSlice();
  state.audioInterval = setInterval(recordSlice, 2350);
}

function ensureToadAudioButton(video) {
  const state = getVideoState(video);
  const container = getContainer(video);
  if (!container) return;

  if (video.clientWidth > 0 && video.clientWidth < 240) return;

  let btn = container.querySelector(":scope > .vie-toad-audio-btn");
  if (!btn) {
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "vie-toad-audio-btn";
    btn.title =
      "Bật/Tắt chế độ Translate Toad AI tự nghe âm thanh và tạo phụ đề cho các video không có nút CC/Subtitles";

    const iconUrl = chrome.runtime.getURL("assets/icon48.png");
    btn.innerHTML = `<img src="${iconUrl}" alt="Toad"><span>AI Nghe & Dịch (Không cần CC)</span>`;

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      startVideoAudioCapture(video);
    });

    container.appendChild(btn);
    state.toadBtnEl = btn;
  }
}

function autoUnlockHiddenTracks(video) {
  if (!video.textTracks || video.textTracks.length === 0) return;
  let hasActive = false;
  for (const t of video.textTracks) {
    if ((t.kind === "subtitles" || t.kind === "captions") && t.mode !== "disabled") {
      hasActive = true;
      break;
    }
  }
  if (!hasActive && settings.enabled) {
    for (const t of video.textTracks) {
      if (t.kind === "subtitles" || t.kind === "captions") {
        t.mode = "hidden";
        bindTextTrack(video, t);
        break;
      }
    }
  }
}

function observePlatformCaptions(video) {
  const scopeRoot = getContainer(video) || document;

  for (const cfg of PLATFORM_CAPTION_CONFIGS) {
    const player = video.closest(cfg.playerSelector) || scopeRoot;
    const captionContainer = player.querySelector(cfg.containerSelector);
    if (!captionContainer || watchedCaptionContainers.has(captionContainer)) continue;

    watchedCaptionContainers.add(captionContainer);
    player.classList.toggle("vie-player-active", Boolean(settings.enabled));
    player.classList.toggle("vie-yt-active", Boolean(settings.enabled));

    const readCaption = () => {
      if (cfg.name === "youtube" && ytCueState.cues.length) return;
      if (!settings.enabled) {
        hideOverlay(video);
        return;
      }

      let text = "";
      if (cfg.name === "youtube") {
        const lines = captionContainer.querySelectorAll(".ytp-caption-line");
        if (lines.length > 0) {
          const recentLines = Array.from(lines).slice(-2);
          text = recentLines.map((l) => l.textContent || "").join(" ");
        } else {
          const segments = captionContainer.querySelectorAll(cfg.segmentSelector);
          text = Array.from(segments)
            .map((seg) => seg.textContent || "")
            .join(" ");
        }
      } else if (cfg.segmentSelector) {
        const segments = captionContainer.querySelectorAll(cfg.segmentSelector);
        if (segments.length > 0) {
          text = Array.from(segments)
            .map((seg) => seg.textContent || "")
            .join(" ");
        }
      } else {
        text = captionContainer.textContent || "";
      }

      const clean = normalizeSubtitleText(text);
      if (!clean) {
        scheduleTranslate(video, "", true);
        return;
      }

      scheduleTranslate(video, clean, !cfg.isStreaming);
    };

    const observer = new MutationObserver(readCaption);
    observer.observe(captionContainer, {
      childList: true,
      subtree: true,
      characterData: true
    });

    readCaption();
  }
}

function bindTextTrack(video, track) {
  if (watchedTracks.has(track)) return;
  if (track.kind !== "subtitles" && track.kind !== "captions") return;
  watchedTracks.add(track);

  if (settings.enabled && track.mode === "showing") {
    track._vieWasShowing = true;
    track.mode = "hidden";
  }

  track.addEventListener("cuechange", () => {
    if (!settings.enabled) return;
    if (track.mode === "showing") {
      track._vieWasShowing = true;
      track.mode = "hidden";
    }
    const cues = track.activeCues ? Array.from(track.activeCues) : [];
    const text = cues
      .map((c) => normalizeSubtitleText(c.text || ""))
      .filter(Boolean)
      .join(" ");

    scheduleTranslate(video, text, true);
    prefetchUpcomingCues(video, track);
  });
}

function watchVideo(video) {
  observePlatformCaptions(video);
  startYouTubePrefetch(video);
  autoUnlockHiddenTracks(video);
  ensureToadAudioButton(video);

  if (watchedVideos.has(video)) return;
  watchedVideos.add(video);

  if (video.textTracks) {
    for (const track of video.textTracks) {
      bindTextTrack(video, track);
    }
    video.textTracks.addEventListener("addtrack", (e) => {
      if (e.track) {
        bindTextTrack(video, e.track);
        autoUnlockHiddenTracks(video);
      }
    });
  }

  video.addEventListener("loadedmetadata", () => {
    observePlatformCaptions(video);
    autoUnlockHiddenTracks(video);
    ensureToadAudioButton(video);
  });

  video.addEventListener("play", () => {
    observePlatformCaptions(video);
    autoUnlockHiddenTracks(video);
    ensureToadAudioButton(video);

    if (settings.autoAudioNoCC && settings.enabled) {
      setTimeout(() => {
        const st = getVideoState(video);
        if (!st.hasReceivedAnySubtitle && !st.audioCaptureActive && !video.paused) {
          startVideoAudioCapture(video);
        }
      }, 3500);
    }
  });
}

function scanVideos() {
  document.querySelectorAll("video").forEach(watchVideo);
}

["play", "loadedmetadata", "loadeddata"].forEach((evtName) => {
  document.addEventListener(
    evtName,
    (e) => {
      if (e.target && e.target.tagName === "VIDEO") {
        watchVideo(e.target);
      }
    },
    true
  );
});

["fullscreenchange", "webkitfullscreenchange"].forEach((evtName) => {
  document.addEventListener(evtName, () => {
    document.querySelectorAll("video").forEach((video) => {
      const state = videoStateMap.get(video);
      if (state && state.lastText && settings.enabled) {
        const cached = localCache.get(getLocalCacheKey(state.lastText));
        if (cached) {
          renderTranslation(video, state.lastText, cached.vi, cached.sub2, false, false);
        }
      }
    });
  });
});

let domScanScheduled = false;
const rootObserver = new MutationObserver(() => {
  if (domScanScheduled) return;
  domScanScheduled = true;
  requestAnimationFrame(() => {
    domScanScheduled = false;
    scanVideos();
  });
});

if (document.documentElement) {
  rootObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

scanVideos();