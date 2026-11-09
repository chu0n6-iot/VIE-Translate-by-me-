const watchedVideos = new WeakSet();
const watchedTracks = new WeakSet();
const watchedCaptionContainers = new WeakSet();
const localCache = new Map();

let settings = {
  enabled: true,
  dualSub: true,
  provider: "gemini"
};

// Cấu hình danh sách các bộ chọn (selectors) vùng chứa phụ đề của các nền tảng video phổ biến
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

chrome.storage.local.get(
  { enabled: true, dualSub: true, provider: "gemini" },
  (res) => {
    settings = { ...settings, ...res };
    applySettingsToDOM();
  }
);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.enabled) settings.enabled = changes.enabled.newValue;
  if (changes.dualSub) settings.dualSub = changes.dualSub.newValue;
  if (changes.provider) {
    settings.provider = changes.provider.newValue;
    localCache.clear();
  }
  applySettingsToDOM();
});

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
    const origEl = overlay.querySelector(".vie-orig");
    if (origEl) {
      origEl.style.display = settings.dualSub ? "block" : "none";
    }
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
    origLine.style.display = settings.dualSub ? "block" : "none";

    const viLine = document.createElement("div");
    viLine.className = "vie-vi";

    overlay.appendChild(origLine);
    overlay.appendChild(viLine);
    container.appendChild(overlay);
  }
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
      debounceTimer: null,
      previewTimer: null,
      prefetchedTrackCues: new WeakSet()
    };
    videoStateMap.set(video, state);
  }
  return state;
}

function scheduleTranslate(video, rawText, immediate = false) {
  const state = getVideoState(video);
  if (state.debounceTimer) {
    clearTimeout(state.debounceTimer);
    state.debounceTimer = null;
  }

  if (!settings.enabled) {
    hideOverlay(video);
    return;
  }

  const cleanText = normalizeSubtitleText(rawText);
  if (!cleanText) {
    state.lastText = "";
    state.reqSeq++;
    if (state.previewTimer) {
      clearTimeout(state.previewTimer);
      state.previewTimer = null;
    }
    hideOverlay(video);
    return;
  }

  if (cleanText === state.lastText) return;

  if (localCache.has(cleanText)) {
    state.lastText = cleanText;
    renderTranslation(video, cleanText, localCache.get(cleanText), false);
    return;
  }

  const isStreamingExtension =
    !immediate &&
    state.lastText &&
    cleanText.startsWith(state.lastText) &&
    cleanText.length - state.lastText.length < 18;

  const delayMs = immediate ? 0 : isStreamingExtension ? 220 : 90;

  const run = () => {
    state.lastText = cleanText;
    translateAndShow(video, cleanText);
  };

  if (delayMs === 0) {
    run();
  } else {
    state.debounceTimer = setTimeout(run, delayMs);
  }
}

function renderTranslation(video, origText, viText, isPreview = false, isError = false) {
  const overlay = getOrCreateOverlay(video);
  const origEl = overlay.querySelector(".vie-orig");
  const viEl = overlay.querySelector(".vie-vi");

  if (origEl) {
    origEl.textContent = origText;
    origEl.style.display = settings.dualSub ? "block" : "none";
  }

  if (viEl) {
    viEl.textContent = viText;
    viEl.classList.toggle("vie-preview", Boolean(isPreview));
    viEl.classList.toggle("vie-error", Boolean(isError));
  }

  overlay.classList.remove("vie-hidden");
}

function translateAndShow(video, text) {
  const state = getVideoState(video);
  const currentSeq = ++state.reqSeq;

  if (state.previewTimer) {
    clearTimeout(state.previewTimer);
    state.previewTimer = null;
  }

  const overlay = getOrCreateOverlay(video);
  const origEl = overlay.querySelector(".vie-orig");
  if (origEl) {
    origEl.textContent = text;
    origEl.style.display = settings.dualSub ? "block" : "none";
  }

  let settled = false;

  if (settings.provider !== "gtx") {
    state.previewTimer = setTimeout(() => {
      if (settled || currentSeq !== state.reqSeq || !settings.enabled) return;
      chrome.runtime.sendMessage(
        {
          type: "TRANSLATE",
          text,
          videoTitle: getVideoTitle(),
          fastPreviewOnly: true
        },
        (previewRes) => {
          if (chrome.runtime.lastError) return;
          if (settled || currentSeq !== state.reqSeq || !settings.enabled) return;
          const previewVi = (previewRes?.vi || "").trim();
          if (previewVi) {
            renderTranslation(video, text, previewVi, true, false);
          }
        }
      );
    }, 220);
  }

  chrome.runtime.sendMessage(
    {
      type: "TRANSLATE",
      text,
      videoTitle: getVideoTitle()
    },
    (res) => {
      settled = true;
      if (state.previewTimer) {
        clearTimeout(state.previewTimer);
        state.previewTimer = null;
      }
      if (chrome.runtime.lastError) return;
      if (currentSeq !== state.reqSeq || !settings.enabled) return;

      if (res?.error) {
        renderTranslation(video, text, `⚠ ${res.error}`, false, true);
        return;
      }

      const viText = (res?.vi || "").trim();
      if (!viText) {
        hideOverlay(video);
        return;
      }

      localCache.set(text, viText);
      if (localCache.size > 500) {
        const oldest = localCache.keys().next().value;
        localCache.delete(oldest);
      }

      renderTranslation(video, text, viText, false, false);
    }
  );
}

// Dịch trước (Lookahead Prefetch) các câu phụ đề sắp tới trong <track> để hiển thị 0ms
function prefetchUpcomingCues(video, track) {
  if (!settings.enabled || !track.cues || track.cues.length === 0) return;
  const state = getVideoState(video);
  const now = video.currentTime || 0;
  const upcomingTexts = [];

  for (let i = 0; i < track.cues.length; i++) {
    const cue = track.cues[i];
    if (!cue || cue.endTime < now) continue;
    if (cue.startTime > now + 75) break;
    if (state.prefetchedTrackCues.has(cue)) continue;

    const clean = normalizeSubtitleText(cue.text || "");
    if (clean && !localCache.has(clean)) {
      upcomingTexts.push({ cue, clean });
      if (upcomingTexts.length >= 8) break;
    }
  }

  if (upcomingTexts.length < 2) return;

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
          localCache.set(src, vi);
        }
      }
    }
  );
}

// Dịch trước phụ đề YouTube: tải cả file timedtext, dịch theo lô các câu sắp tới
const ytCueState = { vid: "", cues: [], sent: new Set(), timer: null };

async function loadYouTubeCues() {
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
    const notVi = tracks.filter((t) => !/^vi/i.test(t.languageCode || ""));
    const pool = notVi.length ? notVi : tracks;
    const track = pool.find((t) => t.kind !== "asr") || pool[0];
    if (!track) return;
    const data = await (await fetch(`${track.baseUrl}&fmt=json3`, { credentials: "include" })).json();
    const cues = [];
    for (const ev of data.events || []) {
      if (!ev.segs) continue;
      const text = normalizeSubtitleText(ev.segs.map((sg) => sg.utf8 || "").join(""));
      if (!text) continue;
      const start = (ev.tStartMs || 0) / 1000;
      cues.push({ start, end: start + (ev.dDurationMs || 2000) / 1000, text });
    }
    if (ytCueState.vid === vid) ytCueState.cues = cues;
  } catch {
    // Không lấy được → vẫn dịch từng câu theo thời gian thực
  }
}

function prefetchYouTubeCues(video) {
  if (!settings.enabled || !ytCueState.cues.length) return;
  const now = video.currentTime || 0;
  const batch = [];
  for (const c of ytCueState.cues) {
    if (c.end < now) continue;
    if (c.start > now + 60) break;
    if (ytCueState.sent.has(c.text) || localCache.has(c.text)) continue;
    batch.push(c.text);
    if (batch.length >= 8) break;
  }
  if (!batch.length) return;
  batch.forEach((t) => ytCueState.sent.add(t));
  chrome.runtime.sendMessage(
    { type: "TRANSLATE_BATCH", texts: batch, videoTitle: getVideoTitle() },
    (res) => {
      if (chrome.runtime.lastError || !res?.results) {
        batch.forEach((t) => ytCueState.sent.delete(t));
        return;
      }
      for (const [src, vi] of Object.entries(res.results)) {
        if (src && vi) localCache.set(src, vi);
      }
    }
  );
}

function startYouTubePrefetch(video) {
  if (!video.closest(".html5-video-player")) return;
  loadYouTubeCues();
  if (ytCueState.timer) return;
  ytCueState.timer = setInterval(() => {
    loadYouTubeCues();
    prefetchYouTubeCues(video);
  }, 2000);
  video.addEventListener("seeking", () => ytCueState.sent.clear());
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
      if (!settings.enabled) {
        hideOverlay(video);
        return;
      }

      let text = "";
      if (cfg.segmentSelector) {
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

  if (watchedVideos.has(video)) return;
  watchedVideos.add(video);

  if (video.textTracks) {
    for (const track of video.textTracks) {
      bindTextTrack(video, track);
    }
    video.textTracks.addEventListener("addtrack", (e) => {
      if (e.track) bindTextTrack(video, e.track);
    });
  }

  video.addEventListener("loadedmetadata", () => observePlatformCaptions(video));
  video.addEventListener("play", () => observePlatformCaptions(video));
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
        const cached = localCache.get(state.lastText);
        if (cached) {
          renderTranslation(video, state.lastText, cached, false, false);
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