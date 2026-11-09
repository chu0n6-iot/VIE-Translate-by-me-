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
  if (changes.model || changes.provider || changes.apiKey || changes.groqApiKey || changes.geminiApiKey) {
    clearTranslations();
  }
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
      debounceTimer: null,
      cues: [], // cue của YouTube (timedtext) để dịch trước
      tracks: [], // textTrack HTML5
      ytVid: "",
      prefetchTimer: null
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

// ============================================================================
// DỊCH SONG SONG: hàng đợi + cache phía trang
// ============================================================================
const MAX_PARALLEL = 3;
const trCache = new Map(); // text gốc -> bản dịch
const trPending = new Map(); // text gốc -> entry đang chờ/đang dịch
const trQueue = [];
let trActive = 0;
let recentPairs = []; // các cặp {src, vi} gần nhất để làm ngữ cảnh

function clearTranslations() {
  trCache.clear();
  recentPairs = [];
  clearQueue();
}

function clearQueue() {
  while (trQueue.length) {
    const e = trQueue.shift();
    if (!e.started) {
      trPending.delete(e.text);
      e.resolve({});
    }
  }
}

function startEntry(entry) {
  if (entry.started) return;
  entry.started = true;
  trActive++;

  const finish = (res) => {
    trActive--;
    trPending.delete(entry.text);
    const vi = (res?.vi || "").trim();
    if (vi && !res.error) {
      trCache.set(entry.text, vi);
      recentPairs.push({ src: entry.text, vi });
      if (recentPairs.length > 5) recentPairs.shift();
    }
    entry.resolve(res || {});
    pumpQueue();
  };

  try {
    chrome.runtime.sendMessage(
      {
        type: "TRANSLATE",
        text: entry.text,
        videoTitle: getVideoTitle(),
        history: recentPairs.slice(-5)
      },
      (res) => {
        if (chrome.runtime.lastError) {
          finish({ error: "Mất kết nối extension, hãy tải lại trang" });
          return;
        }
        finish(res);
      }
    );
  } catch {
    finish({ error: "Extension vừa được cập nhật, hãy tải lại trang" });
  }
}

function pumpQueue() {
  while (trActive < MAX_PARALLEL && trQueue.length) {
    startEntry(trQueue.shift());
  }
}

// urgent = câu đang hiển thị trên màn hình → chạy ngay, không chờ hàng đợi
function requestTranslation(text, urgent = false) {
  if (trCache.has(text)) return Promise.resolve({ vi: trCache.get(text) });

  let entry = trPending.get(text);
  if (!entry) {
    entry = { text, started: false };
    entry.promise = new Promise((resolve) => (entry.resolve = resolve));
    trPending.set(text, entry);
    if (!urgent) trQueue.push(entry);
  }
  if (urgent && !entry.started) startEntry(entry);
  else if (!urgent) pumpQueue();
  return entry.promise;
}

// Dịch trước các cue sắp tới (song song, tối đa MAX_PARALLEL)
function getUpcomingCues(video, state) {
  let cues = state.cues;
  if (!cues.length && state.tracks.length) {
    cues = [];
    for (const track of state.tracks) {
      if (!track.cues) continue;
      for (const c of Array.from(track.cues)) {
        const text = (c.text || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        if (text) cues.push({ start: c.startTime, end: c.endTime, text });
      }
    }
  }
  const t = video.currentTime || 0;
  return cues.filter((c) => c.end >= t - 1 && c.start <= t + 120).sort((a, b) => a.start - b.start);
}

function startPrefetch(video) {
  const state = getVideoState(video);
  if (state.prefetchTimer) return;

  const tick = () => {
    if (!settings.enabled || video.paused && video.readyState < 2) return;
    if (trQueue.length > 20) return;
    for (const c of getUpcomingCues(video, state).slice(0, 25)) {
      if (!trCache.has(c.text) && !trPending.has(c.text)) {
        requestTranslation(c.text, false);
      }
    }
  };

  state.prefetchTimer = setInterval(tick, 1500);
  video.addEventListener("seeking", () => clearQueue());
  tick();
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

  // Đã dịch trước → hiện ngay, không độ trễ
  if (trCache.has(text)) {
    viEl.classList.remove("vie-error", "vie-loading");
    viEl.textContent = trCache.get(text);
    overlay.classList.remove("vie-hidden");
    return;
  }

  // Hiện phụ đề gốc ngay, dòng Việt hiện "…" trong lúc chờ
  viEl.classList.remove("vie-error");
  viEl.classList.add("vie-loading");
  viEl.textContent = "…";
  overlay.classList.remove("vie-hidden");

  requestTranslation(text, true).then((res) => {
    // Bỏ qua nếu đã có câu phụ đề mới hơn
    if (currentSeq !== state.reqSeq || !settings.enabled) return;
    viEl.classList.remove("vie-loading");

    if (res?.error) {
      viEl.textContent = `⚠ ${res.error}`;
      viEl.classList.add("vie-error");
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
  });
}

// Tải toàn bộ phụ đề YouTube (timedtext) để dịch trước; lỗi thì chỉ dịch theo từng câu
async function loadYouTubeCues(video) {
  const state = getVideoState(video);
  const vid = new URL(location.href).searchParams.get("v");
  if (!vid || state.ytVid === vid) return;
  state.ytVid = vid;
  state.cues = [];
  clearQueue();

  try {
    const html = await (await fetch(`/watch?v=${vid}`, { credentials: "include" })).text();
    const m = html.match(/"captionTracks":(\[\{.*?\}\]),"/);
    if (!m) return;
    const tracks = JSON.parse(m[1]);
    if (!tracks.length) return;

    const notVi = tracks.filter((t) => !/^vi/i.test(t.languageCode || ""));
    const pool = notVi.length ? notVi : tracks;
    const track = pool.find((t) => t.kind !== "asr") || pool[0];

    const res = await fetch(`${track.baseUrl}&fmt=json3`, { credentials: "include" });
    const data = await res.json();
    const cues = [];
    for (const ev of data.events || []) {
      if (!ev.segs) continue;
      const text = ev.segs.map((sg) => sg.utf8 || "").join("").replace(/\s+/g, " ").trim();
      if (!text) continue;
      const start = (ev.tStartMs || 0) / 1000;
      cues.push({ start, end: start + (ev.dDurationMs || 2000) / 1000, text });
    }
    if (state.ytVid === vid) state.cues = cues;
  } catch {
    // Không lấy được cue → vẫn dịch theo từng câu hiển thị
  }
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
  getVideoState(video).tracks.push(track);

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
  if (video.closest(".html5-video-player")) loadYouTubeCues(video);

  if (watchedVideos.has(video)) return;
  watchedVideos.add(video);
  startPrefetch(video);

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