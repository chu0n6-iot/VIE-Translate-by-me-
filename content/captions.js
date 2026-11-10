/**
 * VIE-Translate — Translate Toad AI
 * content/captions.js — Multi-platform video caption observer & YouTube timedtext / lyrics sync
 */

(function (root) {
  "use strict";

  const PLATFORM_CAPTION_CONFIGS = [
    { name: "youtube", playerSelector: ".html5-video-player", containerSelector: ".ytp-caption-window-container", segmentSelector: ".ytp-caption-segment", isStreaming: true },
    { name: "facebook", playerSelector: "div[data-video-id], div[data-pagelet*='Video'], div[role='dialog'], div[data-visualcompletion='video-renderer'], div.x1y1aw1k", containerSelector: "div[class*='captions'], div[class*='closed-captions'], [aria-label*='phụ đề' i], [aria-label*='captions' i]" },
    { name: "tiktok", playerSelector: "div[data-e2e='feed-video'], div[class*='DivVideoContainer'], div[class*='video-player-container']", containerSelector: "div[class*='DivSubtitleWrapper'], div[class*='caption-container'], [data-e2e='subtitle-container']" },
    { name: "twitter", playerSelector: "div[data-testid='videoPlayer'], div[data-testid='videoComponent']", containerSelector: "div[data-testid='captionText']" },
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
    { name: "mediaelement", playerSelector: ".mejs__container", containerSelector: ".mejs__captions-layer", segmentSelector: ".mejs__captions-text" },
    { name: "generic", playerSelector: "div, section, article", containerSelector: "[class*='subtitle' i], [class*='caption' i], [aria-label*='subtitle' i], [aria-label*='caption' i]" }
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
    lyricsDuration: 0,
    refEvents: [],
    sent: new Set(),
    timer: null,
    renderTimer: null
  };

  let userWantsAudioCapture = false;

  function getVideoState(video) {
    let state = videoStateMap.get(video);
    if (!state) {
      state = {
        lastCueText: "",
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
        toadBtnEl: null,
        subSyncOffset: 0,
        autoSynced: false,
        autoSyncSource: "",
        hasDetectedAudioOnset: false,
        autoSyncedWithLiveAudio: false
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

  function extractWordTokens(text) {
    return (text || "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .trim()
      .split(/\s+/)
      .filter((w) => w.length >= 2);
  }

  function correlateCuesWithReferenceTracks(lyricsCues, refEvents) {
    if (!Array.isArray(lyricsCues) || !Array.isArray(refEvents)) return null;
    if (lyricsCues.length < 3 || refEvents.length < 3) return null;

    const deltas = [];
    for (const lCue of lyricsCues.slice(0, 35)) {
      const lTokens = extractWordTokens(lCue.text);
      if (lTokens.length < 2) continue;

      let bestMatch = null;
      let bestScore = 0;

      for (const rEvent of refEvents) {
        const timeDiff = rEvent.start - lCue.start;
        if (timeDiff < -30 || timeDiff > 120) continue;

        const rTokens = extractWordTokens(rEvent.text);
        if (!rTokens.length) continue;

        let common = 0;
        for (const tok of lTokens) {
          if (rTokens.includes(tok)) common++;
        }
        const score = common / Math.max(lTokens.length, rTokens.length);
        if (common >= 2 && score > bestScore && score >= 0.42) {
          bestScore = score;
          bestMatch = rEvent;
        }
      }

      if (bestMatch) {
        const delta = Math.round((bestMatch.start - lCue.start) * 10) / 10;
        deltas.push(delta);
      }
    }

    if (deltas.length < 2) return null;
    deltas.sort((a, b) => a - b);
    return deltas[Math.floor(deltas.length / 2)];
  }

  function detectAudioOnsetForVideo(video, onOnsetDetected) {
    const state = getVideoState(video);
    if (state.hasDetectedAudioOnset) return;
    const captureFn = video.captureStream || video.mozCaptureStream;
    if (typeof captureFn !== "function") return;

    try {
      const stream = captureFn.call(video);
      const audioTracks = stream.getAudioTracks().filter((t) => t.readyState !== "ended");
      if (!audioTracks.length) return;

      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;
      const audioCtx = new AudioCtxClass();
      const source = audioCtx.createMediaStreamSource(new MediaStream(audioTracks));
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let count = 0;

      const checkTimer = setInterval(() => {
        count++;
        if (state.hasDetectedAudioOnset || video.paused || video.ended || count > 120) {
          clearInterval(checkTimer);
          try { audioCtx.close(); } catch {}
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const avg = sum / bufferLength;

        if (avg > 14 && video.currentTime >= 0.5) {
          state.hasDetectedAudioOnset = true;
          clearInterval(checkTimer);
          try { audioCtx.close(); } catch {}
          if (typeof onOnsetDetected === "function") {
            onOnsetDetected(video.currentTime);
          }
        }
      }, 150);
    } catch {}
  }

  function correlateLiveAudioWithCues(video, origText, audioTime) {
    const state = getVideoState(video);
    if (state.autoSyncedWithLiveAudio) return;
    const cues = ytCueState.cues;
    if (!Array.isArray(cues) || cues.length < 3) return;

    const speechTokens = extractWordTokens(origText);
    if (speechTokens.length < 2) return;

    let bestCue = null;
    let bestScore = 0;
    // BẮT BUỘC chỉ tìm trong vùng phụ đề gần thời điểm phát hiện tại [audioTime - 8s, audioTime + 8s]
    // Tuyệt đối không quét cả video 4-5 phút vì từ ngữ thông thường ("I", "you", "know", "yeah")
    // sẽ ăn khớp với câu ở phút thứ 1 làm lệch sub hàng trăm giây và đứng hình sub!
    for (const c of cues) {
      if (Math.abs(c.start - audioTime) > 8.0) continue;
      const cueTokens = extractWordTokens(c.text);
      if (!cueTokens.length) continue;
      let common = 0;
      for (const tok of speechTokens) {
        if (cueTokens.includes(tok)) common++;
      }
      const score = common / Math.max(speechTokens.length, cueTokens.length);
      if (common >= 2 && score > bestScore && score >= 0.5) {
        bestScore = score;
        bestCue = c;
      }
    }

    if (bestCue && bestScore >= 0.5) {
      const delta = Math.round((audioTime - bestCue.start) * 10) / 10;
      if (Math.abs(delta) <= 5.0) {
        state.subSyncOffset = delta;
        state.autoSynced = true;
        state.autoSyncedWithLiveAudio = true;
        state.lastCueText = "";
        state.lastText = "";
        updateOverlaySyncUI(video);
        renderYouTubeByTime(video);
        showSyncToast(video, `🎯 Đã tự khớp phụ đề (${delta >= 0 ? "+" : ""}${delta}s) theo giọng thực tế!`);
      }
    }
  }

  function updateOverlaySyncUI(video) {
    const overlay = video._vieOverlay || document.querySelector(".vie-overlay");
    if (!overlay) return;
    const state = getVideoState(video);
    const syncValEl = overlay.querySelector(".vie-sync-val");
    const resetBtn = overlay.querySelector(".vie-sync-reset");
    if (!syncValEl) return;

    const offset = state.subSyncOffset || 0;
    const offsetStr = `${offset > 0 ? "+" : ""}${offset.toFixed(1)}s`;
    if (state.autoSynced) {
      syncValEl.innerHTML = `${offsetStr} <span class="vie-sync-auto-tag" title="Đã tự động căn khớp theo âm thanh thực tế">Tự khớp ✨</span>`;
    } else {
      syncValEl.textContent = offsetStr;
    }

    if (resetBtn) {
      resetBtn.style.display = Math.abs(offset) > 0.05 ? "inline-flex" : "none";
    }
  }

  function showSyncToast(video, msg) {
    const overlay = video._vieOverlay || document.querySelector(".vie-overlay");
    if (!overlay) return;
    const tipEl = overlay.querySelector(".vie-learn-tip");
    if (!tipEl) return;
    if (!tipEl._defaultTip) tipEl._defaultTip = tipEl.textContent;
    tipEl.textContent = msg;
    tipEl.style.color = "#fef08a";
    tipEl.style.fontWeight = "600";
    if (tipEl._tipTimer) clearTimeout(tipEl._tipTimer);
    tipEl._tipTimer = setTimeout(() => {
      tipEl.textContent = tipEl._defaultTip || "💡 Bấm từ bất kỳ để tra từ điển";
      tipEl.style.color = "";
      tipEl.style.fontWeight = "";
    }, 3000);
  }

  function adjustSubSyncOffset(video, step, isShift = false) {
    const state = getVideoState(video);
    const actualStep = isShift ? step * 2 : step;
    state.subSyncOffset = Math.round(((state.subSyncOffset || 0) + actualStep) * 10) / 10;
    state.autoSynced = false;
    state.lastText = "";
    updateOverlaySyncUI(video);
    renderYouTubeByTime(video);
    showSyncToast(video, `⏱️ Độ lệch: ${state.subSyncOffset > 0 ? "+" : ""}${state.subSyncOffset}s`);
  }

  function resetSubSyncOffset(video) {
    const state = getVideoState(video);
    state.subSyncOffset = 0;
    state.autoSynced = false;
    state.lastText = "";
    updateOverlaySyncUI(video);
    renderYouTubeByTime(video);
    showSyncToast(video, "↺ Đã đặt lại độ lệch về 0s");
  }

  function autoAlignSubtitleWithAudio(video) {
    const state = getVideoState(video);
    showSyncToast(video, "🎯 Đang tự động đối chiếu âm thanh & phụ đề...");

    // 1. So khớp token giữa lời bài hát/phụ đề với track phụ đề gốc YouTube (ASR/Manual)
    if (ytCueState.refEvents && ytCueState.refEvents.length >= 3 && ytCueState.cues.length >= 3) {
      const delta = correlateCuesWithReferenceTracks(ytCueState.cues, ytCueState.refEvents);
      if (delta !== null && Math.abs(delta) <= 6.0) {
        state.subSyncOffset = delta;
        state.autoSynced = true;
        state.autoSyncSource = "refTrack";
        state.lastCueText = "";
        state.lastText = "";
        updateOverlaySyncUI(video);
        renderYouTubeByTime(video);
        showSyncToast(video, `🎯 Tự căn khớp ${delta >= 0 ? "+" : ""}${delta}s theo phụ đề gốc!`);
        return;
      }
    }

    // 2. Nếu đã có độ lệch cũ bị lệch hoặc người dùng muốn căn lại chuẩn:
    // Đặt lại về 0.0s chuẩn mượt mà để tránh đứng hình phụ đề
    if (Math.abs(state.subSyncOffset) > 0) {
      state.subSyncOffset = 0;
      state.autoSynced = false;
      state.autoSyncSource = "";
      state.lastCueText = "";
      state.lastText = "";
      updateOverlaySyncUI(video);
      renderYouTubeByTime(video);
      showSyncToast(video, "↺ Đã đặt lại nhịp chuẩn gốc (0.0s) mượt mà!");
      return;
    }

    showSyncToast(video, "✨ Phụ đề đang khớp chuẩn theo thời gian thực (0.0s)");
  }

  async function tryLoadSongLyricsForVideo(video, expectedVid = "", metaOverride = null, refEventsOverride = null) {
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
          ytCueState.lyricsDuration = res.duration || 0;
          ytCueState.sent.clear();
          const st = getVideoState(video);
          st.hasReceivedAnySubtitle = true;
          if (st.audioCaptureActive) stopVideoAudioCapture(video, false);

          const refEvents = refEventsOverride || ytCueState.refEvents || [];
          if (refEvents.length >= 3) {
            const autoOffset = correlateCuesWithReferenceTracks(res.cues, refEvents);
            if (autoOffset !== null && Math.abs(autoOffset) >= 0.3) {
              st.subSyncOffset = autoOffset;
              st.autoSynced = true;
              st.autoSyncSource = "refTrack";
              updateOverlaySyncUI(video);
              showSyncToast(video, `🎯 Đã tự động căn khớp ${autoOffset > 0 ? "+" : ""}${autoOffset}s theo bài hát!`);
            }
          } else {
            detectAudioOnsetForVideo(video, (onset) => {
              if (onset > 1.5 && (!st.subSyncOffset || Math.abs(st.subSyncOffset) < 0.5)) {
                const firstCueStart = res.cues[0]?.start || 0;
                if (onset > firstCueStart) {
                  const onsetDelta = Math.round((onset - firstCueStart) * 10) / 10;
                  if (onsetDelta > 1.0 && onsetDelta < 40) {
                    st.subSyncOffset = onsetDelta;
                    st.autoSynced = true;
                    st.autoSyncSource = "audioOnset";
                    updateOverlaySyncUI(video);
                    renderYouTubeByTime(video);
                    showSyncToast(video, `🎯 Đã tự khớp +${onsetDelta}s theo tiếng nhạc thực tế!`);
                  }
                }
              }
            });
          }

          // Tiền dịch trước các câu đầu tiên để người xem có phụ đề ngay khi nhạc chạy
          const firstTexts = res.cues.slice(0, 8).map((c) => c.text);
          if (firstTexts.length > 0) {
            chrome.runtime.sendMessage({
              type: "TRANSLATE_BATCH",
              texts: firstTexts,
              videoTitle: getVideoTitle()
            }, () => {});
          }

          updateOverlaySyncUI(video);
          renderYouTubeByTime(video);
          resolve(true);
          return;
        }
        resolve(false);
      });
    });
  }

  let lastCcAutoClickAt = 0;
  function autoEnsureYouTubeCC(video) {
    if (!location.hostname.includes("youtube.com")) return;
    const now = Date.now();
    if (now - lastCcAutoClickAt < 1800) return;
    const ccBtn = document.querySelector(".ytp-subtitles-button");
    if (!ccBtn || ccBtn.style.display === "none" || ccBtn.hasAttribute("disabled")) return;
    if (ccBtn.getAttribute("aria-pressed") === "false") {
      lastCcAutoClickAt = now;
      try {
        ccBtn.click();
      } catch {}
    }
  }

  function getYouTubePlayerCaptionTracks() {
    try {
      const mp = document.getElementById("movie_player");
      const pr = mp?.getPlayerResponse ? mp.getPlayerResponse() : null;
      const tracks = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (Array.isArray(tracks) && tracks.length > 0) return tracks;
    } catch {}
    try {
      const pr = window.ytInitialPlayerResponse;
      const tracks = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (Array.isArray(tracks) && tracks.length > 0) return tracks;
    } catch {}
    return null;
  }

  async function loadYouTubeCues(video) {
    if (!location.hostname.includes("youtube.com")) return;
    const vid = new URL(location.href).searchParams.get("v");
    if (!vid) {
      if (ytCueState.vid) {
        ytCueState.vid = "";
        ytCueState.cues = [];
        ytCueState.refEvents = [];
        ytCueState.isLyrics = false;
        ytCueState.sent.clear();
      }
      return;
    }

    if (ytCueState.vid === vid && ytCueState.cues.length > 0) return;
    if (ytCueState.loading && ytCueState.vid === vid) return;

    if (ytCueState.vid !== vid) {
      ytCueState.vid = vid;
      ytCueState.cues = [];
      ytCueState.refEvents = [];
      ytCueState.isLyrics = false;
      ytCueState.sent = new Set();
      ytCueState.attempts = 0;
    } else {
      ytCueState.attempts = (ytCueState.attempts || 0) + 1;
      if (ytCueState.attempts > 12) return;
    }

    const st = getVideoState(video);
    st.subSyncOffset = 0;
    st.autoSynced = false;
    st.autoSyncSource = "";
    st.hasDetectedAudioOnset = false;
    st.autoSyncedWithLiveAudio = false;
    updateOverlaySyncUI(video);

    // 1. Tự động bật CC YouTube để lấy phụ đề gốc và tiết kiệm token
    autoEnsureYouTubeCC(video);

    // 2. Kiểm tra nhanh xem bài hát có lời trên LRCLIB không (0 tokens, chuẩn xác từng câu)
    const fastTitle = getVideoTitle();
    const isProbableMusic = looksLikeMusicVideo(fastTitle, "", video?.duration || 0);
    if (isProbableMusic) {
      tryLoadSongLyricsForVideo(video, vid).catch(() => {});
    }

    try {
      ytCueState.loading = true;
      let tracks = getYouTubePlayerCaptionTracks();
      let htmlMeta = null;
      if (!tracks) {
        const html = await (await fetch(`/watch?v=${vid}`, { credentials: "include" })).text();
        htmlMeta = extractYouTubeMetaFromHtml(html);
        const m = html.match(/"captionTracks":(\[\{.*?\}\]),"/);
        if (m) {
          try { tracks = JSON.parse(m[1]); } catch {}
        }
      }

      const title = htmlMeta?.title || getVideoTitle();
      const duration = htmlMeta?.duration || video?.duration || 0;
      const isMusic = isProbableMusic || looksLikeMusicVideo(title, "", duration);

      let manualTrack = null, asrTrack = null;
      if (Array.isArray(tracks)) {
        manualTrack = tracks.find((t) => t.kind !== "asr") || null;
        asrTrack = tracks.find((t) => t.kind === "asr") || tracks[0] || null;
      }

      const chosenTrack = manualTrack || asrTrack;
      let refEvents = [];
      if (chosenTrack) {
        try {
          const data = await (await fetch(`${chosenTrack.baseUrl}&fmt=json3`, { credentials: "include" })).json();
          for (const ev of data.events || []) {
            if (!ev.segs) continue;
            const text = normalizeSubtitleText(ev.segs.map((sg) => sg.utf8 || "").join(""));
            if (!text) continue;
            const start = (ev.tStartMs || 0) / 1000;
            refEvents.push({ start, end: start + (ev.dDurationMs || 2000) / 1000, text });
          }
        } catch {}
      }
      ytCueState.refEvents = refEvents;

      if (isMusic && (!manualTrack || userWantsAudioCapture)) {
        ytCueState.lyricsSearchedTitle = title;
        const foundSynced = await tryLoadSongLyricsForVideo(video, vid, htmlMeta, refEvents);
        if (foundSynced) return;
      }

      if (chosenTrack && refEvents.length > 0) {
        const cues = chosenTrack.kind === "asr" ? mergeEventsIntoSentences(refEvents) : refEvents;
        if (ytCueState.vid === vid && cues.length > 0) {
          ytCueState.cues = cues;
          ytCueState.isLyrics = false;
          if (video) renderYouTubeByTime(video);
        }
      }
    } catch {} finally {
      ytCueState.loading = false;
    }
  }

  function renderYouTubeByTime(video) {
    const cues = ytCueState.cues;
    if (!cues.length) return false;

    // Tự động đảm bảo CC được kích hoạt để nhận text liên tục
    if (!ytCueState.isLyrics) {
      autoEnsureYouTubeCC(video);
    }

    const state = getVideoState(video);
    if (state.subMuted) {
      root.VieDOM?.hideOverlay(video);
      return true;
    }
    const t = Math.max(0, (video.currentTime || 0) - (state.subSyncOffset || 0));
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

    const cue = idx >= 0 && t <= cues[idx].end ? cues[idx] : null;
    if (!cue) {
      if (!state.audioCaptureActive && state.lastCueText) {
        state.lastCueText = "";
        state.lastText = "";
        state.reqSeq++;
        root.VieDOM?.hideOverlay(video);
      }
      return true;
    }

    if (cue.text !== state.lastCueText) {
      state.lastCueText = cue.text;
      state.hasReceivedAnySubtitle = true;
      const nextCue = cues[idx + 1];
      const nextText = nextCue ? nextCue.text : "";
      root.VieContent?.onCaptionReceived(video, cue.text, true, nextText);
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

  async function getAudioStreamFromVideo(video) {
    if (!video) return null;

    // Tầng 1: Native captureStream hoặc mozCaptureStream
    const captureFn = video.captureStream || video.mozCaptureStream;
    if (typeof captureFn === "function") {
      try {
        const full = captureFn.call(video);
        if (full) {
          const audioTracks = full.getAudioTracks().filter((t) => t.readyState !== "ended");
          if (audioTracks.length) {
            return new MediaStream(audioTracks);
          }
        }
      } catch (e) {
        // captureStream may fail on cross-origin media
      }
    }

    // Tầng 2: Web Audio API createMediaElementSource (tương thích cao cho Facebook & thẻ video HTML5)
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        if (!video._vieAudioCtx) {
          const ctx = new AudioCtx();
          const srcNode = ctx.createMediaElementSource(video);
          const destNode = ctx.createMediaStreamDestination();
          srcNode.connect(destNode);
          srcNode.connect(ctx.destination);
          video._vieAudioCtx = ctx;
          video._vieAudioDest = destNode;
        }
        if (video._vieAudioCtx.state === "suspended") {
          await video._vieAudioCtx.resume().catch(() => {});
        }
        if (video._vieAudioDest && video._vieAudioDest.stream) {
          const tracks = video._vieAudioDest.stream.getAudioTracks().filter((t) => t.readyState !== "ended");
          if (tracks.length) {
            return new MediaStream(tracks);
          }
        }
      }
    } catch (e) {
      // createMediaElementSource fallback
    }

    // Tầng 3: video.srcObject (WebRTC / live media stream)
    if (video.srcObject instanceof MediaStream) {
      const tracks = video.srcObject.getAudioTracks().filter((t) => t.readyState !== "ended");
      if (tracks.length) return new MediaStream(tracks);
    }

    return null;
  }

  async function startVideoAudioCapture(video) {
    const state = getVideoState(video);
    if (state.audioCaptureActive || userWantsAudioCapture) {
      stopVideoAudioCapture(video, true);
      return;
    }

    userWantsAudioCapture = true;
    state.audioCaptureActive = true;
    updateToadButtonUI(video, "listening");

    // Nếu trên YouTube và có ID video, tìm kiếm lyrics nền nhưng KHÔNG TẮT LẮNG NGHE của người dùng!
    if (location.hostname.includes("youtube.com") && ytCueState.vid) {
      tryLoadSongLyricsForVideo(video, ytCueState.vid)
        .then((foundSynced) => {
          if (foundSynced && state.audioCaptureActive) {
            showSyncToast(video, "🎵 Đã tải lời bài hát đồng bộ! AI tiếp tục nghe hỗ trợ bạn.");
            renderYouTubeByTime(video);
          }
        })
        .catch(() => {});
    }

    // Lấy stream âm thanh qua 3 tầng bảo vệ
    const stream = await getAudioStreamFromVideo(video);

    if (!stream) {
      userWantsAudioCapture = false;
      state.audioCaptureActive = false;
      updateToadButtonUI(video, "idle");
      showSyncToast(video, "⚠️ Không thể trích xuất âm thanh từ video. Vui lòng bấm Play video và thử lại!");
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : (MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4");

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
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        recorder.onstop = async () => {
          if (!state.audioCaptureActive || !chunks.length) return;
          const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
          if (blob.size < 400) return;
          const b64 = await blobToBase64(blob);
          const sliceTime = video.currentTime || 0;
          chrome.runtime.sendMessage(
            {
              type: "TRANSCRIBE_AUDIO",
              audioBase64: b64,
              mimeType: recorder.mimeType || "audio/webm",
              videoTitle: getVideoTitle()
            },
            (res) => {
              if (res?.error === "NO_KEY") {
                stopVideoAudioCapture(video, true);
                showSyncToast(video, "🔑 Cần API Key (Gemini/Groq) để AI nghe & dịch. Bấm icon Toad để lấy Key!");
                return;
              }
              if (!chrome.runtime.lastError && (res?.vi || res?.orig)) {
                if (res.orig && ytCueState.cues.length > 0) {
                  correlateLiveAudioWithCues(video, res.orig, Math.max(0, sliceTime - 0.9));
                }
                root.VieContent?.renderSubtitles(video, res.orig || "", res.vi || "", res.sub2 || "", false);
              }
            }
          );
        };

        state.audioRecorder = recorder;
        recorder.start();
        state.audioLoopTimer = setTimeout(() => {
          if (recorder.state === "recording") {
            try {
              recorder.stop();
            } catch {}
          }
          if (state.audioCaptureActive && userWantsAudioCapture) recordNext();
        }, 1800);
      } catch (err) {
        state.audioLoopTimer = setTimeout(recordNext, 800);
      }
    };
    recordNext();
  }

  function ensureToadAudioButton(video) {
    const state = getVideoState(video);
    const container =
      (root.VieDOM?.getContainer && root.VieDOM.getContainer(video)) ||
      (root.VieDOM?.findBestVideoContainer && root.VieDOM.findBestVideoContainer(video)) ||
      video.closest(".html5-video-player, .video-js, .jwplayer, .plyr") ||
      video.parentElement ||
      document.body;

    let btn = state.toadBtnEl;
    if (btn && btn.isConnected) {
      if (btn.parentElement !== container) {
        container.appendChild(btn);
      }
    } else {
      btn = container.querySelector(":scope > .vie-toad-audio-btn") || document.querySelector(".vie-toad-audio-btn");
      if (btn) {
        if (btn.parentElement !== container) {
          container.appendChild(btn);
        }
      } else {
        btn = document.createElement("button");
        btn.type = "button";
        btn.className = "vie-toad-audio-btn";
        btn.title = "Translate Toad AI: Tự tìm Lyrics hoặc nghe âm thanh khi video không có CC (Facebook, TikTok, YouTube...)";
        btn.innerHTML = `<img src="${chrome.runtime.getURL("assets/icon48.png")}" alt="Toad"><span>AI Nghe & Dịch</span>`;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          const now = Date.now();
          if (btn._lastClick && now - btn._lastClick < 400) return;
          btn._lastClick = now;
          startVideoAudioCapture(video);
        });
        container.appendChild(btn);
      }
      state.toadBtnEl = btn;
    }

    // Nút bật/tắt phụ đề 1-chạm ngay trên video, bật lại vẫn bắt kịp nhịp phim tức thì
    let toggleBtn = state.subToggleBtnEl;
    if (toggleBtn && toggleBtn.isConnected) {
      if (toggleBtn.parentElement !== container) {
        container.appendChild(toggleBtn);
      }
    } else {
      toggleBtn = container.querySelector(":scope > .vie-quick-sub-toggle") || document.querySelector(".vie-quick-sub-toggle");
      if (toggleBtn) {
        if (toggleBtn.parentElement !== container) {
          container.appendChild(toggleBtn);
        }
      } else {
        toggleBtn = document.createElement("button");
        toggleBtn.type = "button";
        toggleBtn.className = "vie-quick-sub-toggle";
        toggleBtn.title = "Bấm 1 phát để Bật / Tắt ngay phụ đề trên video (Bật lại vẫn khớp đúng nhịp phim!)";
        toggleBtn.innerHTML = `<span>👁️ Sub: BẬT</span>`;
        toggleBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          const st = getVideoState(video);
          st.subMuted = !st.subMuted;
          const ov = video._vieOverlay || document.querySelector(".vie-overlay");
          if (ov) ov._subMuted = st.subMuted;

          if (st.subMuted) {
            toggleBtn.classList.add("vie-sub-off");
            toggleBtn.innerHTML = `<span>🙈 Sub: TẮT</span>`;
            root.VieDOM?.hideOverlay(video);
            showSyncToast(video, "🙈 Đã tạm ẩn phụ đề trên video");
          } else {
            toggleBtn.classList.remove("vie-sub-off");
            toggleBtn.innerHTML = `<span>👁️ Sub: BẬT</span>`;
            st.lastCueText = "";
            st.lastText = "";
            st.lastRenderedSeq = 0;
            renderYouTubeByTime(video);
            showSyncToast(video, "👁️ Đã bật lại phụ đề — Bắt kịp ngay nhịp phim hiện tại!");
          }
        });
        container.appendChild(toggleBtn);
      }
      state.subToggleBtnEl = toggleBtn;
    }

    // Prune các nút duplicate còn sót trên DOM
    document.querySelectorAll(".vie-toad-audio-btn").forEach((b) => {
      if (b !== btn) b.remove();
    });
    document.querySelectorAll(".vie-quick-sub-toggle").forEach((b) => {
      if (b !== toggleBtn) b.remove();
    });

    updateToadButtonUI(video);
  }

  function updateToadButtonUI(video, mode = "idle") {
    const state = getVideoState(video);
    const btn = state.toadBtnEl || document.querySelector(".vie-toad-audio-btn");
    if (!btn) return;
    const span = btn.querySelector("span");
    if (!span) return;
    if (mode === "listening" || userWantsAudioCapture || state.audioCaptureActive) {
      btn.classList.add("vie-audio-active");
      span.textContent = "🎙️ Đang nghe & dịch...";
    } else if (ytCueState.cues.length > 0 || state.hasReceivedAnySubtitle) {
      btn.classList.remove("vie-audio-active");
      span.textContent = ytCueState.isLyrics ? "🎵 Lời bài hát (0 Token)" : "✨ Tự động dịch (CC)";
    } else {
      btn.classList.remove("vie-audio-active");
      span.textContent = "AI Nghe & Dịch";
    }
  }

  function observePlatformCaptions(video, onCaption) {
    const scopeRoot =
      (root.VieDOM?.getContainer && root.VieDOM.getContainer(video)) ||
      (root.VieDOM?.findBestVideoContainer && root.VieDOM.findBestVideoContainer(video)) ||
      video.parentElement ||
      document;
    for (const cfg of PLATFORM_CAPTION_CONFIGS) {
      const player = video.closest(cfg.playerSelector) || (cfg.name === "generic" ? scopeRoot : (scopeRoot || document));
      if (!player) continue;
      const captionContainer = player.querySelector(cfg.containerSelector);
      if (!captionContainer || watchedCaptionContainers.has(captionContainer)) continue;
      if (captionContainer.closest(".vie-overlay")) continue;
      watchedCaptionContainers.add(captionContainer);

      player.classList.add("vie-player-active", "vie-yt-active");

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

    const player = (root.VieDOM?.getContainer ? root.VieDOM.getContainer(video) : video.closest(".html5-video-player")) || video.parentElement;
    if (player) {
      player.classList.add("vie-player-active", "vie-yt-active");
    }

    observePlatformCaptions(video, onCaption);
    startYouTubePrefetch(video);
    autoEnsureYouTubeCC(video);
    ensureToadAudioButton(video);

    if (video.textTracks) {
      for (const t of video.textTracks) bindTextTrack(video, t, onCaption);
      video.textTracks.addEventListener("addtrack", (e) => {
        if (e.track) bindTextTrack(video, e.track, onCaption);
      });
    }

    const handleSeek = () => {
      const state = getVideoState(video);
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
      renderYouTubeByTime(video);
    };

    video.addEventListener("seeking", handleSeek);
    video.addEventListener("seeked", handleSeek);

    let autoAudioTimer = null;
    const checkAutoTranslate = async () => {
      autoEnsureYouTubeCC(video);
      renderYouTubeByTime(video);
      updateToadButtonUI(video);

      // Nếu sau 1.8s phát mà video không có phụ đề CC và không có lyrics (Facebook, TikTok, HTML5)
      // Tự động kích hoạt nghe & dịch để người dùng xem video rảnh tay 100%
      if (autoAudioTimer) clearTimeout(autoAudioTimer);
      autoAudioTimer = setTimeout(async () => {
        const st = getVideoState(video);
        if (video.paused || video.ended || st.hasReceivedAnySubtitle || ytCueState.cues.length > 0 || st.audioCaptureActive) {
          return;
        }
        const s = await root.VieStorage?.getSettings?.();
        if (s?.enabled !== false && s?.autoAudioNoCC !== false && !userWantsAudioCapture) {
          startVideoAudioCapture(video);
        }
      }, 1800);
    };

    video.addEventListener("play", checkAutoTranslate);
    video.addEventListener("playing", checkAutoTranslate);
    video.addEventListener("loadeddata", () => {
      autoEnsureYouTubeCC(video);
      startYouTubePrefetch(video);
    });

    video.addEventListener("timeupdate", () => renderYouTubeByTime(video));
  }

  root.VieCaptions = {
    getVideoTitle,
    getChannelName,
    looksLikeMusicVideo,
    normalizeSubtitleText,
    watchVideo,
    getVideoState,
    autoEnsureYouTubeCC,
    loadYouTubeCues,
    renderYouTubeByTime,
    ensureToadAudioButton,
    updateToadButtonUI,
    updateOverlaySyncUI,
    adjustSubSyncOffset,
    resetSubSyncOffset,
    autoAlignSubtitleWithAudio,
    showSyncToast,
    correlateCuesWithReferenceTracks,
    correlateLiveAudioWithCues,
    ytCueState
  };
})(typeof self !== "undefined" ? self : this);
