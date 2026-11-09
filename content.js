const watchedVideos = new WeakSet();
const watchedTracks = new WeakSet();
const watchedYtContainers = new WeakSet();

let settings = {
  enabled: true,
  dualSub: true
};

// Tải cài đặt ban đầu và lắng nghe thay đổi trực tiếp từ Popup/Options
chrome.storage.local.get({ enabled: true, dualSub: true }, (res) => {
  settings = { ...settings, ...res };
  applySettingsToDOM();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.enabled) settings.enabled = changes.enabled.newValue;
  if (changes.dualSub) settings.dualSub = changes.dualSub.newValue;
  applySettingsToDOM();
});

function applySettingsToDOM() {
  document.querySelectorAll(".html5-video-player").forEach((player) => {
    player.classList.toggle("vie-yt-active", Boolean(settings.enabled));
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
  const ytPlayer = video.closest(".html5-video-player");
  if (ytPlayer) return ytPlayer;

  const parent = video.parentElement || document.body;
  const style = window.getComputedStyle(parent);
  if (style.position === "static") {
    parent.style.position = "relative";
  }
  return parent;
}

function getOrCreateOverlay(video) {
  const container = getContainer(video);
  let overlay = container.querySelector(":scope > .vie-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "vie-overlay";
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
    document.querySelector(".ytp-title-link")?.textContent;
  if (ytTitle && ytTitle.trim()) return ytTitle.trim();
  return document.title.replace(/\s*-\s*YouTube$/i, "").trim();
}

const videoStateMap = new WeakMap();

function getVideoState(video) {
  let state = videoStateMap.get(video);
  if (!state) {
    state = {
      lastText: "",
      reqSeq: 0,
      debounceTimer: null
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

  const cleanText = (rawText || "").replace(/\s+/g, " ").trim();
  if (!cleanText) {
    state.lastText = "";
    state.reqSeq++;
    hideOverlay(video);
    return;
  }

  if (cleanText === state.lastText) return;

  const run = () => {
    state.lastText = cleanText;
    translateAndShow(video, cleanText);
  };

  if (immediate) {
    run();
  } else {
    state.debounceTimer = setTimeout(run, 150);
  }
}

function translateAndShow(video, text) {
  const state = getVideoState(video);
  const currentSeq = ++state.reqSeq;
  const overlay = getOrCreateOverlay(video);
  const origEl = overlay.querySelector(".vie-orig");
  const viEl = overlay.querySelector(".vie-vi");

  if (origEl) {
    origEl.textContent = text;
    origEl.style.display = settings.dualSub ? "block" : "none";
  }

  chrome.runtime.sendMessage(
    {
      type: "TRANSLATE",
      text,
      videoTitle: getVideoTitle()
    },
    (res) => {
      if (chrome.runtime.lastError) return;
      // Bỏ qua nếu đã có câu phụ đề mới hơn
      if (currentSeq !== state.reqSeq || !settings.enabled) return;

      if (res?.error) {
        viEl.textContent = `⚠ ${res.error}`;
        viEl.classList.add("vie-error");
        overlay.classList.remove("vie-hidden");
        return;
      }

      const viText = (res?.vi || "").trim();
      if (!viText) {
        hideOverlay(video);
        return;
      }

      viEl.classList.remove("vie-error");
      viEl.textContent = viText;
      overlay.classList.remove("vie-hidden");
    }
  );
}

// 1. Theo dõi phụ đề trên YouTube (.ytp-caption-window-container)
function observeYouTubeCaptions(video) {
  const player = video.closest(".html5-video-player");
  if (!player) return;

  player.classList.toggle("vie-yt-active", Boolean(settings.enabled));

  const captionContainer = player.querySelector(".ytp-caption-window-container");
  if (!captionContainer || watchedYtContainers.has(captionContainer)) return;
  watchedYtContainers.add(captionContainer);

  const readYtCaption = () => {
    if (!settings.enabled) {
      hideOverlay(video);
      return;
    }
    const segments = captionContainer.querySelectorAll(".ytp-caption-segment");
    if (!segments.length) {
      scheduleTranslate(video, "", true);
      return;
    }
    const text = Array.from(segments)
      .map((seg) => seg.textContent || "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    scheduleTranslate(video, text, false);
  };

  const observer = new MutationObserver(readYtCaption);
  observer.observe(captionContainer, {
    childList: true,
    subtree: true,
    characterData: true
  });

  readYtCaption();
}

// 2. Theo dõi phụ đề chuẩn HTML5 <track> cho các trang web khác
function bindTextTrack(video, track) {
  if (watchedTracks.has(track)) return;
  if (track.kind !== "subtitles" && track.kind !== "captions") return;
  watchedTracks.add(track);

  if (settings.enabled && track.mode === "showing") {
    track.mode = "hidden";
  }

  track.addEventListener("cuechange", () => {
    if (!settings.enabled) return;
    if (track.mode === "showing") {
      track.mode = "hidden";
    }
    const cues = track.activeCues ? Array.from(track.activeCues) : [];
    const text = cues
      .map((c) => (c.text || "").replace(/<[^>]+>/g, ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    scheduleTranslate(video, text, true);
  });
}

function watchVideo(video) {
  // Trên YouTube, container .ytp-caption-window-container có thể xuất hiện trễ
  observeYouTubeCaptions(video);

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
}

function scanVideos() {
  document.querySelectorAll("video").forEach(watchVideo);
}

scanVideos();
setInterval(scanVideos, 1000);