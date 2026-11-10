/**
 * VIE-Translate — Translate Toad AI
 * content/captions.js — Multi-platform video caption observer & YouTube timedtext / lyrics sync
 */

(function (root) {
  "use strict";

  const PLATFORM_CAPTION_CONFIGS = [
    { name: "youtube", playerSelector: ".html5-video-player", containerSelector: ".ytp-caption-window-container", segmentSelector: ".ytp-caption-segment", isStreaming: true },
    { name: "videojs", playerSelector: ".video-js", containerSelector: ".vjs-text-track-display", segmentSelector: ".vjs-text-track-cue" },
    { name: "jwplayer", playerSelector: ".jwplayer", containerSelector: ".jw-captions", segmentSelector: ".jw-text-track-cue" },
    { name: "plyr", playerSelector: ".plyr", containerSelector: ".plyr__captions", segmentSelector: ".plyr__caption" },
    { name: "shaka", playerSelector: ".shaka-video-container", containerSelector: ".shaka-text-container", segmentSelector: "span" },
    { name: "udemy", playerSelector: "[data-purpose='video-player'], .video-player--container--23VX7", containerSelector: "[data-purpose='captions-cue-text'], [class*='captions-display--captions-container']" },
    { name: "coursera", playerSelector: ".rc-VideoMiniPlayer, .c-video-player", containerSelector: ".c-video-cue-container" },
    { name: "vimeo", playerSelector: ".vp-video-wrapper, .player", containerSelector: ".vp-captions", segmentSelector: "span" },
    { name: "bilibili", playerSelector: ".bpx-player-video-area, .bilibili-player-video-wrap", containerSelector: ".bpx-player-subtitle-panel-wrap, .bilibili-player-video-subtitle", segmentSelector: ".bpx-player-subtitle-panel-text" },
    { name: "netflix", playerSelector: ".watch-video, .NFPlayer", containerSelector: ".player-timedtext", segmentSelector: ".player-timedtext-text-container" },
    { name: "ted", playerSelector: "[data-testid='video-player']", containerSelector: "[data-testid='player-captions'], .ted-player-captions" },
    { name: "artplayer", playerSelector: ".art-video-player", containerSelector: ".art-subtitle" },
    { name: "dplayer", playerSelector: ".dplayer", containerSelector: ".dplayer-subtitle" },
    { name: "mediaelement", playerSelector: ".mejs__container", containerSelector: ".mejs__captions-layer", segmentSelector: ".mejs__captions-text" }
  ];

  const watchedVideos = new WeakSet();
  const watchedTracks = new WeakSet();
  const watchedCaptionContainers = new WeakSet();
  const videoStateMap = new WeakMap();

  const ytCueState = {
    vid: "",
    cues: [],
    isLyrics: false,
    lyricsSearchedTitle: "",
    sent: new Set(),
    timer: null,
    renderTimer: null
  };

  let userWantsAudioCapture = false;

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
        prefetchedTrackCues: new WeakSet(),
        hasReceivedAnySubtitle: false,
        audioCaptureActive: false,
        audioRecorder: null,
        audioLoopTimer: null,
        audioRetryTimer: null,
        capturedSrc: "",
        videoNavKey: "",
        toadBtnEl: null
      };
      videoStateMap.set(video, state);
    }
    return state;
  }

  function normalizeSubtitleText(rawText) {
    return (rawText || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\{[^}]+\}/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getVideoTitle() {
    const ytTitle =
      document.querySelector("h1.ytd-watch-metadata yt-formatted-string")?.textContent ||
      document.querySelector(".ytp-title-link")?.textContent ||
      document.querySelector("h1")?.textContent;
    if (ytTitle && ytTitle.trim()) return ytTitle.trim().slice(0, 140);
    return document.title.replace(/\s*-\s*YouTube$/i, "").trim().slice(0, 140);
  }

  function getChannelName() {
    const ch =
      document.querySelector("ytd-watch-metadata #channel-name a")?.textContent ||
      document.querySelector(".ytd-channel-name a")?.textContent ||
      document.querySelector("[itemprop='author'] [itemprop='name']")?.getAttribute("content") ||
      "";
    return (ch || "").trim().slice(0, 80);
  }

  function looksLikeMusicVideo(title, html = "", duration = 0) {
    if (html && (html.includes('"category":"Music"') || html.includes('"musicVideoType"'))) return true;
    const t = (title || "").toLowerCase();
    if (/\b(mv|m\/v|official\s*(music\s*)?video|lyrics?|lyric\s*video|official\s*audio|visualizer|ost|soundtrack|cover|remix|karaoke|acoustic|ft\.?|feat\.?|prod\.?|single|album)\b/i.test(t)) {
      return true;
    }
    if (t.includes(" - ") && (!duration || (duration >= 60 && duration <= 540))) return true;
    return false;
  }

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
        const tooLong = cur.text.length >= 80 || ev.end - cur.start > 6.5;
        if (gap > 0.8 || tooLong || /[.?!…]$/.test(cur.text)) flush();
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

  function extractYouTubeMetaFromHtml(html) {
    if (!html) return { title: "", author: "", duration: 0 };
    let title = "", author = "", duration = 0;
    try {
      const detailsMatch = html.match(/"videoDetails":\{([\s\S]{1,1200}?)\}/);
      const block = detailsMatch ? detailsMatch[1] : html;
      const titleMatch = block.match(/"title":"((?:[^"\\]|\\.)*)"/);
      const authorMatch = block.match(/"author":"((?:[^"\\]|\\.)*)"/);
      const lenMatch = block.match(/"lengthSeconds":"(\d+)"/);
      if (titleMatch) title = JSON.parse(`"${titleMatch[1]}"`);
      if (authorMatch) author = JSON.parse(`"${authorMatch[1]}"`);
      if (lenMatch) duration = parseInt(lenMatch[1], 10) || 0;
    } catch {}
    return { title: title.trim(), author: author.trim(), duration };
  }

  async function tryLoadSongLyricsForVideo(video, expectedVid = "", metaOverride = null) {
    return new Promise((resolve) => {
      const title = (metaOverride?.title || getVideoTitle() || "").trim();
      if (!title || title.length < 3) return resolve(false);

      const duration = metaOverride?.duration || (Number.isFinite(video?.duration) ? video.duration : 0);
      const channelName = (metaOverride?.author || getChannelName() || "").trim();

      chrome.runtime.sendMessage({
        type: "SEARCH_SONG_LYRICS",
        videoTitle: title,
        channelName,
        duration
      }, (res) => {
        if (chrome.runtime.lastError || !res?.found) return resolve(false);
        if (expectedVid && ytCueState.vid && ytCueState.vid !== expectedVid) return resolve(false);

        if (res.synced && Array.isArray(res.cues) && res.cues.length >= 4) {
          ytCueState.cues = res.cues;
          ytCueState.isLyrics = true;
          ytCueState.sent.clear();
          const st = getVideoState(video);
          st.hasReceivedAnySubtitle = true;
          if (st.audioCaptureActive) stopVideoAudioCapture(video, false);
          renderYouTubeByTime(video);
          resolve(true);
          return;
        }
        resolve(false);
      });
    });
  }

  async function loadYouTubeCues(video) {
    if (!location.hostname.includes("youtube.com")) return;
    const vid = new URL(location.href).searchParams.get("v");
    if (!vid) {
      if (ytCueState.vid) {
        ytCueState.vid = "";
        ytCueState.cues = [];
        ytCueState.isLyrics = false;
        ytCueState.sent.clear();
      }
      return;
    }

    if (ytCueState.vid === vid) return;
    ytCueState.vid = vid;
    ytCueState.cues = [];
    ytCueState.isLyrics = false;
    ytCueState.sent = new Set();

    try {
      const html = await (await fetch(`/watch?v=${vid}`, { credentials: "include" })).text();
      const htmlMeta = extractYouTubeMetaFromHtml(html);
      const title = htmlMeta.title || getVideoTitle();
      const duration = htmlMeta.duration || video?.duration || 0;
      const isMusic = looksLikeMusicVideo(title, html, duration);
      const m = html.match(/"captionTracks":(\[\{.*?\}\]),"/);

      let manualTrack = null, asrTrack = null;
      if (m) {
        const tracks = JSON.parse(m[1]);
        manualTrack = tracks.find((t) => t.kind !== "asr") || null;
        asrTrack = tracks.find((t) => t.kind === "asr") || tracks[0] || null;
      }

      if (isMusic && (!manualTrack || userWantsAudioCapture)) {
        ytCueState.lyricsSearchedTitle = title;
        const foundSynced = await tryLoadSongLyricsForVideo(video, vid, htmlMeta);
        if (foundSynced) return;
      }

      const chosenTrack = manualTrack || asrTrack;
      if (chosenTrack) {
        const data = await (await fetch(`${chosenTrack.baseUrl}&fmt=json3`, { credentials: "include" })).json();
        const events = [];
        for (const ev of data.events || []) {
          if (!ev.segs) continue;
          const text = normalizeSubtitleText(ev.segs.map((sg) => sg.utf8 || "").join(""));
          if (!text) continue;
          const start = (ev.tStartMs || 0) / 1000;
          events.push({ start, end: start + (ev.dDurationMs || 2000) / 1000, text });
        }
        const cues = chosenTrack.kind === "asr" ? mergeEventsIntoSentences(events) : events;
        if (ytCueState.vid === vid && cues.length > 0) {
          ytCueState.cues = cues;
          ytCueState.isLyrics = false;
          if (video) renderYouTubeByTime(video);
        }
      }
    } catch {}
  }

  function renderYouTubeByTime(video) {
    const cues = ytCueState.cues;
    if (!cues.length) return false;

    if (!ytCueState.isLyrics && !userWantsAudioCapture) {
      const ccBtn = document.querySelector(".ytp-subtitles-button");
      if (ccBtn && ccBtn.getAttribute("aria-pressed") === "false") {
        root.VieDOM?.hideOverlay(video);
        return true;
      }
    }

    const t = video.currentTime || 0;
    let lo = 0, hi = cues.length - 1, idx = -1;
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
        root.VieDOM?.hideOverlay(video);
      }
      return true;
    }

    if (cue.text !== state.lastText) {
      state.lastText = cue.text;
      state.hasReceivedAnySubtitle = true;
      root.VieContent?.onCaptionReceived(video, cue.text, true);
    }
    return true;
  }

  function startYouTubePrefetch(video) {
    if (location.hostname.includes("youtube.com")) {
      loadYouTubeCues(video);
    }
    if (!ytCueState.timer) {
      ytCueState.timer = setInterval(() => {
        if (location.hostname.includes("youtube.com")) loadYouTubeCues(video);
      }, 1500);
    }
    if (!ytCueState.renderTimer) {
      ytCueState.renderTimer = setInterval(() => renderYouTubeByTime(video), 60);
    }
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = String(reader.result || "");
        resolve(dataUrl.includes(",") ? dataUrl.split(",")[1] : "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function stopVideoAudioCapture(video, disableUserIntent = true) {
    const state = getVideoState(video);
    if (disableUserIntent) userWantsAudioCapture = false;
    state.audioCaptureActive = false;
    if (state.audioLoopTimer) {
      clearTimeout(state.audioLoopTimer);
      state.audioLoopTimer = null;
    }
    if (state.audioRecorder && state.audioRecorder.state !== "inactive") {
      try { state.audioRecorder.stop(); } catch {}
    }
    state.audioRecorder = null;
    updateToadButtonUI(video);
  }

  async function startVideoAudioCapture(video) {
    const state = getVideoState(video);
    if (state.audioCaptureActive || userWantsAudioCapture) {
      stopVideoAudioCapture(video, true);
      return;
    }

    userWantsAudioCapture = true;
    updateToadButtonUI(video, "listening");

    const foundSynced = await tryLoadSongLyricsForVideo(video, ytCueState.vid);
    if (foundSynced) return;

    const captureFn = video.captureStream || video.mozCaptureStream;
    if (typeof captureFn !== "function") return;

    let stream = null;
    try {
      const full = captureFn.call(video);
      const audioTracks = full.getAudioTracks().filter((t) => t.readyState !== "ended");
      if (audioTracks.length) stream = new MediaStream(audioTracks);
    } catch {}

    if (!stream) return;

    state.audioCaptureActive = true;
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";

    const recordNext = () => {
      if (!state.audioCaptureActive || !userWantsAudioCapture) {
        stopVideoAudioCapture(video, false);
        return;
      }
      if (video.paused || video.ended || video.muted || video.volume === 0) {
        state.audioLoopTimer = setTimeout(recordNext, 500);
        return;
      }

      try {
        const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 24000 });
        const chunks = [];
        recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = async () => {
          if (!state.audioCaptureActive || !chunks.length) return;
          const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
          if (blob.size < 400) return;
          const b64 = await blobToBase64(blob);
          chrome.runtime.sendMessage({
            type: "TRANSCRIBE_AUDIO",
            audioBase64: b64,
            mimeType: recorder.mimeType || "audio/webm",
            videoTitle: getVideoTitle()
          }, (res) => {
            if (!chrome.runtime.lastError && res?.vi) {
              root.VieContent?.renderSubtitles(video, res.orig || "", res.vi, res.sub2 || "", false);
            }
          });
        };

        state.audioRecorder = recorder;
        recorder.start();
        state.audioLoopTimer = setTimeout(() => {
          if (recorder.state === "recording") {
            try { recorder.stop(); } catch {}
          }
          if (state.audioCaptureActive && userWantsAudioCapture) recordNext();
        }, 1800);
      } catch {
        state.audioLoopTimer = setTimeout(recordNext, 800);
      }
    };
    recordNext();
  }

  function ensureToadAudioButton(video) {
    const container = video.parentElement || document.body;
    let btn = container.querySelector(":scope > .vie-toad-audio-btn");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vie-toad-audio-btn";
      btn.title = "Translate Toad AI: Tự tìm Lyrics hoặc nghe âm thanh khi video không có CC";
      btn.innerHTML = `<img src="${chrome.runtime.getURL("assets/icon48.png")}" alt="Toad"><span>AI Nghe & Dịch</span>`;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        startVideoAudioCapture(video);
      });
      container.appendChild(btn);
    }
  }

  function updateToadButtonUI(video, mode = "idle") {
    const container = video.parentElement || document.body;
    const btn = container.querySelector(":scope > .vie-toad-audio-btn");
    if (!btn) return;
    const span = btn.querySelector("span");
    if (!span) return;
    if (mode === "listening" || userWantsAudioCapture) {
      btn.classList.add("vie-audio-active");
      span.textContent = "🎙️ Đang nghe & dịch...";
    } else {
      btn.classList.remove("vie-audio-active");
      span.textContent = "AI Nghe & Dịch";
    }
  }

  function observePlatformCaptions(video, onCaption) {
    const scopeRoot = video.parentElement || document;
    for (const cfg of PLATFORM_CAPTION_CONFIGS) {
      const player = video.closest(cfg.playerSelector) || scopeRoot;
      const captionContainer = player.querySelector(cfg.containerSelector);
      if (!captionContainer || watchedCaptionContainers.has(captionContainer)) continue;
      watchedCaptionContainers.add(captionContainer);

      const readCaption = () => {
        if (cfg.name === "youtube" && ytCueState.cues.length) return;
        const text = normalizeSubtitleText(captionContainer.textContent || "");
        onCaption(video, text, !cfg.isStreaming);
      };

      const observer = new MutationObserver(readCaption);
      observer.observe(captionContainer, { childList: true, subtree: true, characterData: true });
      readCaption();
    }
  }

  function bindTextTrack(video, track, onCaption) {
    if (watchedTracks.has(track)) return;
    if (track.kind !== "subtitles" && track.kind !== "captions") return;
    watchedTracks.add(track);

    if (track.mode === "showing") track.mode = "hidden";
    track.addEventListener("cuechange", () => {
      if (track.mode === "showing") track.mode = "hidden";
      const cues = track.activeCues ? Array.from(track.activeCues) : [];
      const text = cues.map((c) => normalizeSubtitleText(c.text || "")).filter(Boolean).join(" ");
      onCaption(video, text, true);
    });
  }

  function watchVideo(video, onCaption) {
    if (watchedVideos.has(video)) return;
    watchedVideos.add(video);

    observePlatformCaptions(video, onCaption);
    startYouTubePrefetch(video);
    ensureToadAudioButton(video);

    if (video.textTracks) {
      for (const t of video.textTracks) bindTextTrack(video, t, onCaption);
      video.textTracks.addEventListener("addtrack", (e) => {
        if (e.track) bindTextTrack(video, e.track, onCaption);
      });
    }

    video.addEventListener("timeupdate", () => renderYouTubeByTime(video));
  }

  root.VieCaptions = {
    getVideoTitle,
    getChannelName,
    looksLikeMusicVideo,
    normalizeSubtitleText,
    watchVideo,
    getVideoState,
    ensureToadAudioButton,
    updateToadButtonUI,
    ytCueState
  };
})(typeof self !== "undefined" ? self : this);
