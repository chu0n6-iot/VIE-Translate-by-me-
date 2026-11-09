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
  pronounStyle: "auto",
  subFont: "default",
  subSize: "100",
  subColor: "#fef08a",
  subSecondColor: "#e2e8f0",
  subBgStyle: "toad",
  subAlign: "left",
  subBottomPos: "12",
  overlayWidth: 72,
  overlayScale: 100,
  overlayBottom: 12,
  autoAudioNoCC: false,
  softenProfanity: true,
  hoverPauseDict: true
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
  return `${settings.targetLang}:${settings.secondaryLang}:${settings.translationStyle}:${settings.pronounStyle || "auto"}:${settings.softenProfanity !== false ? "soft" : "raw"}:${text}`;
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
      if (["provider", "targetLang", "secondaryLang", "translationStyle", "pronounStyle", "softenProfanity"].includes(k)) {
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
  overlay.setAttribute("data-align", settings.subAlign || "left");

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

    // Hộp tra từ nhanh & Học ngoại ngữ (nằm ngay phía trên khung phụ đề)
    const dictCard = document.createElement("div");
    dictCard.className = "vie-dict-card vie-dict-hidden";
    overlay.appendChild(dictCard);

    const origLine = document.createElement("div");
    origLine.className = "vie-orig";

    const viLine = document.createElement("div");
    viLine.className = "vie-vi";

    const learnBar = document.createElement("div");
    learnBar.className = "vie-learn-bar";
    learnBar.innerHTML = `
      <button type="button" class="vie-learn-btn vie-learn-scene-btn" title="Xem giải thích vì sao đoạn này dịch như vậy, cách dùng thực tế & từ vựng quan trọng">
        🎓 Xem thêm: Ngữ cảnh &amp; Cách dùng thực tế
      </button>
      <button type="button" class="vie-learn-btn vie-learn-speak-all-btn" title="Nghe phát âm cả câu">
        🔊 Nghe câu
      </button>
      <span class="vie-learn-tip">💡 Bấm từ bất kỳ để tra từ điển</span>
    `;

    overlay.appendChild(origLine);
    overlay.appendChild(viLine);
    overlay.appendChild(learnBar);
    container.appendChild(overlay);

    bindInteractiveOverlayEvents(video, overlay, origLine, viLine, dictCard, learnBar);
  }
  applyOverlayVisualStyle(overlay);
  return overlay;
}

function speakWord(word) {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(word);
    utter.rate = 0.95;
    window.speechSynthesis.speak(utter);
  } catch {
    // ignore speech errors
  }
}

async function saveWordToVocab(item, saveBtnEl) {
  try {
    const stored = await chrome.storage.local.get({ savedVocab: [] });
    const list = Array.isArray(stored.savedVocab) ? stored.savedVocab : [];
    const existsIdx = list.findIndex(
      (x) => (x.word || "").toLowerCase() === (item.word || "").toLowerCase()
    );
    const entry = {
      word: item.word,
      pron: item.pron || "",
      pos: item.pos || "",
      meaning: item.meaning || "",
      note: item.note || "",
      sentence: item.sentence || "",
      videoTitle: getVideoTitle(),
      savedAt: Date.now()
    };
    if (existsIdx >= 0) {
      list[existsIdx] = entry;
    } else {
      list.unshift(entry);
    }
    await chrome.storage.local.set({ savedVocab: list.slice(0, 300) });
    if (saveBtnEl) {
      saveBtnEl.textContent = "✓ Đã lưu vào Sổ từ";
      saveBtnEl.classList.add("vie-dict-saved");
    }
  } catch {
    // ignore storage errors
  }
}

function closeDictAndCoach(video, overlay, dictCard, resumeVideo = false) {
  const state = getVideoState(video);
  state.isDictPinned = false;
  dictCard.classList.add("vie-dict-hidden");
  dictCard.classList.remove("vie-scene-expanded");
  overlay.classList.remove("vie-dict-open");
  overlay.querySelectorAll(".vie-word.vie-word-active").forEach((el) => {
    el.classList.remove("vie-word-active");
  });
  if (resumeVideo && video.paused) {
    state.pausedByHover = false;
    video.play().catch(() => {});
  }
}

function openSceneExplanation(video, overlay, dictCard, sentence, viText, focusWord = "") {
  const cleanSentence = normalizeSubtitleText(sentence);
  if (!cleanSentence) return;

  const state = getVideoState(video);
  state.isDictPinned = true;
  if (!video.paused && !video.ended) {
    state.pausedByHover = true;
    video.pause();
  }

  overlay.classList.add("vie-dict-open");
  dictCard.classList.remove("vie-dict-hidden");
  dictCard.classList.add("vie-scene-expanded");

  dictCard.innerHTML = `
    <div class="vie-dict-header">
      <div class="vie-dict-title">
        <span class="vie-dict-word">🐸 Ngữ Cảnh Thực Tế &amp; Cách Dùng</span>
        <span class="vie-dict-loading">⏳ Cóc đang mổ xẻ câu thoại trong cảnh này...</span>
      </div>
      <div class="vie-dict-actions">
        <button type="button" class="vie-dict-close" title="Đóng">✕</button>
      </div>
    </div>
    <div class="vie-scene-sentence-box">
      <div class="vie-scene-orig">🎬 “${escapeHtml(cleanSentence)}”</div>
      <div class="vie-scene-vi">🇻🇳 Dịch trong cảnh này: “${escapeHtml(viText || "...")}”</div>
    </div>
  `;

  dictCard.querySelector(".vie-dict-close")?.addEventListener("click", (e) => {
    e.stopPropagation();
    closeDictAndCoach(video, overlay, dictCard, false);
  });

  chrome.runtime.sendMessage(
    {
      type: "EXPLAIN_SCENE",
      sentence: cleanSentence,
      vi: viText,
      focusWord,
      videoTitle: getVideoTitle()
    },
    (res) => {
      if (chrome.runtime.lastError || !res?.ok) {
        dictCard.innerHTML = `
          <div class="vie-dict-header">
            <span class="vie-dict-word">🐸 Phân tích ngữ cảnh</span>
            <button type="button" class="vie-dict-close">✕</button>
          </div>
          <div class="vie-dict-meaning">Không thể tải phân tích ngữ cảnh lúc này. Hãy thử bấm vào từng từ trên phụ đề nhé!</div>
        `;
        dictCard.querySelector(".vie-dict-close")?.addEventListener("click", (e) => {
          e.stopPropagation();
          closeDictAndCoach(video, overlay, dictCard, false);
        });
        return;
      }

      dictCard.innerHTML = `
        <div class="vie-dict-header">
          <div class="vie-dict-title">
            <span class="vie-dict-word">🐸 Giải Nghĩa Ngữ Cảnh &amp; Thực Tế</span>
            ${res.modelUsed ? `<span class="vie-dict-pos">${escapeHtml(res.modelUsed)}</span>` : ""}
            <button type="button" class="vie-dict-speak" title="Nghe phát âm cả câu">🔊 Nghe câu</button>
          </div>
          <div class="vie-dict-actions">
            <button type="button" class="vie-dict-save" title="Lưu mẫu câu & ngữ cảnh này vào Sổ từ">⭐ Lưu câu</button>
            <button type="button" class="vie-dict-speak vie-scene-resume" title="Đóng bảng và phát tiếp video" style="background:rgba(245,158,11,0.28);border-color:#fbbf24;color:#fef08a;">▶️ Xem tiếp</button>
            <button type="button" class="vie-dict-close" title="Đóng">✕</button>
          </div>
        </div>
        <div class="vie-scene-sentence-box">
          <div class="vie-scene-orig">🎬 “${escapeHtml(cleanSentence)}”</div>
          <div class="vie-scene-vi">🇻🇳 Hóa ra trong cảnh này dịch là: “${escapeHtml(viText || res.vi || "")}”</div>
          ${
            res.literal
              ? `<div class="vie-scene-literal">🔍 Nghĩa đen từng chữ: “${escapeHtml(res.literal)}”</div>`
              : ""
          }
        </div>
        <div class="vie-scene-block">
          <div class="vie-scene-label">🎭 Tại sao trong cảnh này lại dịch như vậy?</div>
          <div class="vie-scene-text">${escapeHtml(res.nuance || "")}</div>
        </div>
        ${
          res.usage
            ? `
        <div class="vie-scene-block">
          <div class="vie-scene-label">💡 Cách người bản xứ dùng thực tế ngoài đời</div>
          <div class="vie-scene-text">${escapeHtml(res.usage)}</div>
        </div>`
            : ""
        }
        ${
          res.vocab
            ? `
        <div class="vie-scene-block">
          <div class="vie-scene-label">🧩 Từ vựng &amp; Cụm từ ăn điểm trong câu</div>
          <div class="vie-scene-text">${escapeHtml(res.vocab)}</div>
        </div>`
            : ""
        }
        ${
          res.example
            ? `
        <div class="vie-scene-block">
          <div class="vie-scene-label">🗣️ Ví dụ áp dụng thực tế</div>
          <div class="vie-scene-text">${escapeHtml(res.example)}</div>
        </div>`
            : ""
        }
      `;

      dictCard.querySelector(".vie-dict-speak")?.addEventListener("click", (e) => {
        e.stopPropagation();
        speakWord(cleanSentence);
      });

      const saveBtn = dictCard.querySelector(".vie-dict-save");
      saveBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        saveWordToVocab(
          {
            word: focusWord || cleanSentence,
            pron: "",
            pos: "Mẫu câu thực tế",
            meaning: viText || res.vi || "",
            note: res.nuance || "",
            sentence: cleanSentence
          },
          saveBtn
        );
      });

      dictCard.querySelector(".vie-scene-resume")?.addEventListener("click", (e) => {
        e.stopPropagation();
        closeDictAndCoach(video, overlay, dictCard, true);
      });

      dictCard.querySelector(".vie-dict-close")?.addEventListener("click", (e) => {
        e.stopPropagation();
        closeDictAndCoach(video, overlay, dictCard, false);
      });
    }
  );
}

function openWordLookup(video, overlay, dictCard, word, sentence, viText, wordSpan) {
  const state = getVideoState(video);
  state.isDictPinned = true;
  if (!video.paused && !video.ended) {
    state.pausedByHover = true;
    video.pause();
  }

  overlay.classList.add("vie-dict-open");
  overlay.querySelectorAll(".vie-word.vie-word-active").forEach((el) => {
    el.classList.remove("vie-word-active");
  });
  if (wordSpan) wordSpan.classList.add("vie-word-active");

  dictCard.classList.remove("vie-dict-hidden", "vie-scene-expanded");
  dictCard.innerHTML = `
    <div class="vie-dict-header">
      <div class="vie-dict-title">
        <span class="vie-dict-word">${escapeHtml(word)}</span>
        <span class="vie-dict-loading">⏳ Cóc đang tra từ điển theo ngữ cảnh...</span>
      </div>
      <button type="button" class="vie-dict-close" title="Đóng">✕</button>
    </div>
  `;

  dictCard.querySelector(".vie-dict-close")?.addEventListener("click", (e) => {
    e.stopPropagation();
    closeDictAndCoach(video, overlay, dictCard, false);
  });

  chrome.runtime.sendMessage(
    {
      type: "LOOKUP_WORD",
      word,
      sentence,
      videoTitle: getVideoTitle()
    },
    (res) => {
      if (chrome.runtime.lastError || !res?.ok) {
        dictCard.innerHTML = `
          <div class="vie-dict-header">
            <span class="vie-dict-word">${escapeHtml(word)}</span>
            <button type="button" class="vie-dict-close">✕</button>
          </div>
          <div class="vie-dict-meaning">Không thể tra từ lúc này.</div>
        `;
        dictCard.querySelector(".vie-dict-close")?.addEventListener("click", (e) => {
          e.stopPropagation();
          closeDictAndCoach(video, overlay, dictCard, false);
        });
        return;
      }

      dictCard.innerHTML = `
        <div class="vie-dict-header">
          <div class="vie-dict-title">
            <span class="vie-dict-word">${escapeHtml(res.word || word)}</span>
            ${res.pron ? `<span class="vie-dict-pron">/${escapeHtml(res.pron.replace(/^\/|\/$/g, ""))}/</span>` : ""}
            ${res.pos ? `<span class="vie-dict-pos">${escapeHtml(res.pos)}</span>` : ""}
            <button type="button" class="vie-dict-speak" title="Nghe phát âm">🔊</button>
          </div>
          <div class="vie-dict-actions">
            <button type="button" class="vie-dict-save" title="Lưu vào Sổ từ vựng để ôn tập">⭐ Lưu từ</button>
            <button type="button" class="vie-dict-close" title="Đóng">✕</button>
          </div>
        </div>
        <div class="vie-dict-meaning">🎯 ${escapeHtml(res.meaning || "")}</div>
        ${res.note ? `<div class="vie-dict-note">💡 ${escapeHtml(res.note)}</div>` : ""}
        <button type="button" class="vie-dict-more-btn">
          🎓 Xem thêm: Tại sao cả câu dịch như vậy &amp; Cách dùng thực tế ➔
        </button>
      `;

      dictCard.querySelector(".vie-dict-speak")?.addEventListener("click", (e) => {
        e.stopPropagation();
        speakWord(res.word || word);
      });

      const saveBtn = dictCard.querySelector(".vie-dict-save");
      saveBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        saveWordToVocab({ ...res, word: res.word || word, sentence }, saveBtn);
      });

      dictCard.querySelector(".vie-dict-more-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        openSceneExplanation(video, overlay, dictCard, sentence, viText, res.word || word);
      });

      dictCard.querySelector(".vie-dict-close")?.addEventListener("click", (e) => {
        e.stopPropagation();
        closeDictAndCoach(video, overlay, dictCard, false);
      });
    }
  );
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInteractiveWords(origEl, text) {
  if (!origEl) return;
  if (origEl.dataset.rawText === text && origEl.childNodes.length > 0) return;
  origEl.dataset.rawText = text;

  const tokens = (text || "").split(/(\s+)/).filter(Boolean);
  const existingNodes = Array.from(origEl.childNodes);

  let matchCount = 0;
  while (
    matchCount < existingNodes.length &&
    matchCount < tokens.length &&
    existingNodes[matchCount].textContent === tokens[matchCount]
  ) {
    matchCount++;
  }

  for (let i = existingNodes.length - 1; i >= matchCount; i--) {
    origEl.removeChild(existingNodes[i]);
  }

  const animateNew = matchCount > 0;
  for (let i = matchCount; i < tokens.length; i++) {
    const tok = tokens[i];
    if (/^\s+$/.test(tok)) {
      origEl.appendChild(document.createTextNode(tok));
      continue;
    }
    const cleanWord = tok.replace(/^[.,!?;:"“”'‘’()\[\]{}<>…\-]+|[.,!?;:"“”'‘’()\[\]{}<>…\-]+$/g, "");
    if (!cleanWord) {
      origEl.appendChild(document.createTextNode(tok));
      continue;
    }
    const span = document.createElement("span");
    span.className = animateNew ? "vie-word vie-word-appear" : "vie-word";
    span.dataset.word = cleanWord;
    span.textContent = tok;
    origEl.appendChild(span);
  }
}

function renderStableViText(viEl, text) {
  if (!viEl) return;
  if (viEl.dataset.rawText === text && viEl.childNodes.length > 0) return;
  viEl.dataset.rawText = text;

  const tokens = (text || "").split(/(\s+)/).filter(Boolean);
  const existingNodes = Array.from(viEl.childNodes);

  let matchCount = 0;
  while (
    matchCount < existingNodes.length &&
    matchCount < tokens.length &&
    existingNodes[matchCount].textContent === tokens[matchCount]
  ) {
    matchCount++;
  }

  for (let i = existingNodes.length - 1; i >= matchCount; i--) {
    viEl.removeChild(existingNodes[i]);
  }

  const animateNew = matchCount > 0;
  for (let i = matchCount; i < tokens.length; i++) {
    const tok = tokens[i];
    if (/^\s+$/.test(tok)) {
      viEl.appendChild(document.createTextNode(tok));
      continue;
    }
    const span = document.createElement("span");
    span.className = animateNew ? "vie-vi-word vie-word-appear" : "vie-vi-word";
    span.textContent = tok;
    viEl.appendChild(span);
  }
}

function stabilizeStreamingTranslation(prevOrig, prevVi, newOrig, newVi) {
  if (!prevOrig || !prevVi || !newOrig || !newVi) return newVi;

  const cleanPrevOrig = prevOrig.trim().toLowerCase();
  const cleanNewOrig = newOrig.trim().toLowerCase();

  // Chỉ khóa tiền tố khi câu gốc mới là phần nối dài của câu gốc đang nói dở
  if (!cleanNewOrig.startsWith(cleanPrevOrig) || cleanNewOrig === cleanPrevOrig) {
    return newVi;
  }

  const basePrevVi = prevVi.replace(/[.,!?;:…]+$/g, "").trim();
  const cleanNewVi = newVi.trim();
  if (!basePrevVi || !cleanNewVi) return newVi;

  if (cleanNewVi.toLowerCase().startsWith(basePrevVi.toLowerCase())) {
    return cleanNewVi;
  }

  const prevWords = basePrevVi.split(/\s+/);
  const newWords = cleanNewVi.split(/\s+/);
  if (prevWords.length < 2) return cleanNewVi;

  const norm = (w) => w.replace(/^[.,!?;:"“”'‘’()]+|[.,!?;:"“”'‘’()]+$/g, "").toLowerCase();

  for (let dropTail = 0; dropTail <= Math.min(2, prevWords.length - 2); dropTail++) {
    const lockLen = prevWords.length - dropTail;
    const anchorW2 = norm(prevWords[lockLen - 1]);
    const anchorW1 = lockLen >= 2 ? norm(prevWords[lockLen - 2]) : "";
    if (!anchorW2) continue;

    const minIdx = Math.max(0, lockLen - 4);
    const maxIdx = Math.min(newWords.length - 1, lockLen + 3);

    for (let idx = maxIdx; idx >= minIdx; idx--) {
      if (norm(newWords[idx]) === anchorW2) {
        const twoWordMatch = !anchorW1 || (idx >= 1 && norm(newWords[idx - 1]) === anchorW1);
        if (twoWordMatch) {
          const suffixWords = newWords.slice(idx + 1);
          if (suffixWords.length > dropTail) {
            const lockedPrefix = prevWords.slice(0, lockLen).join(" ");
            return `${lockedPrefix} ${suffixWords.join(" ")}`.trim();
          }
        }
      }
    }
  }

  return cleanNewVi;
}

function bindInteractiveOverlayEvents(video, overlay, origEl, viEl, dictCard, learnBar) {
  const state = getVideoState(video);

  overlay.addEventListener("mouseenter", () => {
    state.isHoveringOverlay = true;
    if (state.hideTimer) {
      clearTimeout(state.hideTimer);
      state.hideTimer = null;
    }
    if (settings.hoverPauseDict !== false && !video.paused && !video.ended) {
      state.pausedByHover = true;
      video.pause();
    }
  });

  overlay.addEventListener("mouseleave", () => {
    state.isHoveringOverlay = false;
    if (state.isDictPinned) {
      // Giữ nguyên hộp phân tích khi người dùng đã bấm vào từ hoặc nút "Xem thêm"
      return;
    }
    dictCard.classList.add("vie-dict-hidden");
    overlay.querySelectorAll(".vie-word.vie-word-active").forEach((el) => {
      el.classList.remove("vie-word-active");
    });
    if (state.pausedByHover) {
      state.pausedByHover = false;
      video.play().catch(() => {});
    }
  });

  ["click", "mousedown", "mouseup", "dblclick"].forEach((evtName) => {
    overlay.addEventListener(evtName, (e) => {
      e.stopPropagation();
    });
  });

  origEl.addEventListener("click", (e) => {
    const wordSpan = e.target.closest(".vie-word");
    if (!wordSpan) return;
    e.stopPropagation();
    e.preventDefault();
    const word = wordSpan.dataset.word || wordSpan.textContent.trim();
    const sentence = origEl.dataset.rawText || state.lastText || origEl.textContent.trim();
    const viText = viEl.textContent.trim();
    if (!word) return;
    speakWord(word);
    openWordLookup(video, overlay, dictCard, word, sentence, viText, wordSpan);
  });

  learnBar.querySelector(".vie-learn-scene-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    const sentence = origEl.dataset.rawText || state.lastText || origEl.textContent.trim();
    const viText = viEl.textContent.trim();
    openSceneExplanation(video, overlay, dictCard, sentence, viText, "");
  });

  learnBar.querySelector(".vie-learn-speak-all-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    const sentence = origEl.dataset.rawText || state.lastText || origEl.textContent.trim();
    if (sentence) speakWord(sentence);
  });
}

function hideOverlay(video) {
  const state = videoStateMap.get(video);
  if (state && (state.isHoveringOverlay || state.isDictPinned)) {
    return;
  }
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

function getChannelName() {
  const ch =
    document.querySelector("ytd-watch-metadata #channel-name a")?.textContent ||
    document.querySelector(".ytd-channel-name a")?.textContent ||
    document.querySelector("[itemprop='author'] [itemprop='name']")?.getAttribute("content") ||
    "";
  return (ch || "").trim().slice(0, 80);
}

function looksLikeMusicVideo(title, html = "", duration = 0) {
  if (html && (html.includes('"category":"Music"') || html.includes('"musicVideoType"'))) {
    return true;
  }
  const t = (title || "").toLowerCase();
  if (
    /\b(mv|m\/v|official\s*(music\s*)?video|lyrics?|lyric\s*video|official\s*audio|visualizer|ost|soundtrack|cover|remix|karaoke|acoustic|ft\.?|feat\.?|prod\.?|single|album)\b/i.test(
      t
    )
  ) {
    return true;
  }
  if (t.includes(" - ") && (!duration || (duration >= 60 && duration <= 540))) {
    return true;
  }
  return false;
}

function normalizeSubtitleText(rawText) {
  return (rawText || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\{[^}]+\}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const videoStateMap = new WeakMap();
// Ghi nhớ trạng thái người dùng đã bật chế độ AI Nghe & Dịch xuyên suốt khi chuyển qua video khác
let userWantsAudioCapture = false;

function getVideoState(video) {
  let state = videoStateMap.get(video);
  if (!state) {
    state = {
      lastText: "",
      renderedOrigText: "",
      renderedViText: "",
      ytPageFirstLine: "",
      ytPageSecondLine: "",
      ytConsumedLine: "",
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

function updateToadButtonUI(video, mode = "idle") {
  const state = getVideoState(video);
  const btn = state.toadBtnEl;
  if (!btn) return;
  const span = btn.querySelector("span");
  if (!span) return;

  if (mode === "lyrics") {
    btn.classList.add("vie-audio-active");
    span.textContent = "🎵 Đã đồng bộ Lyrics AI";
  } else if (mode === "listening" || state.audioCaptureActive || userWantsAudioCapture) {
    btn.classList.add("vie-audio-active");
    span.textContent = "🎙️ Đang nghe & dịch AI...";
  } else {
    btn.classList.remove("vie-audio-active");
    span.textContent = "AI Nghe & Dịch (Không cần CC)";
  }
}

function getSecondaryDisplayLine(origText, sub2Text) {
  if (!settings.dualSub || settings.secondaryLang === "none") return "";
  if (settings.secondaryLang && settings.secondaryLang !== "orig" && sub2Text) {
    return sub2Text;
  }
  return origText;
}

function renderTranslation(video, origText, viText, sub2Text = "", isPreview = false, isError = false) {
  const state = getVideoState(video);
  const overlay = getOrCreateOverlay(video);
  const origEl = overlay.querySelector(".vie-orig");
  const viEl = overlay.querySelector(".vie-vi");

  const finalViText = !isError
    ? stabilizeStreamingTranslation(state.renderedOrigText, state.renderedViText, origText, viText)
    : viText;

  if (!isError && origText && finalViText) {
    state.renderedOrigText = origText;
    state.renderedViText = finalViText;
  }

  const showSecondary = Boolean(settings.dualSub) && settings.secondaryLang !== "none";
  if (origEl) {
    const secondLine = getSecondaryDisplayLine(origText, sub2Text);
    renderInteractiveWords(origEl, secondLine);
    origEl.style.display = showSecondary ? "block" : "none";
  }

  if (viEl) {
    renderStableViText(viEl, finalViText);
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
      if (state.isHoveringOverlay || state.isDictPinned) return;
      state.lastText = "";
      state.renderedOrigText = "";
      state.renderedViText = "";
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

  // Dịch tức thì từng từ ngay khi xuất hiện (nhịp 45ms, không đợi chữ sau mới dịch)
  const now = Date.now();
  const elapsed = now - state.lastSendAt;
  const THROTTLE_MS = 45;
  const useFastStream = settings.provider !== "gtx";

  if (elapsed >= THROTTLE_MS) {
    state.lastSendAt = now;
    translateAndShow(video, cleanText, useFastStream);
  } else if (!state.throttleTimer) {
    state.throttleTimer = setTimeout(() => {
      state.throttleTimer = null;
      state.lastSendAt = Date.now();
      if (state.lastText) {
        translateAndShow(video, state.lastText, useFastStream);
      }
    }, THROTTLE_MS - elapsed);
  }

  if (settings.provider !== "gtx") {
    if (state.aiRefineTimer) clearTimeout(state.aiRefineTimer);
    const endsWithPunct = /[.,!?;:…]$/.test(cleanText);
    state.aiRefineTimer = setTimeout(
      () => {
        state.aiRefineTimer = null;
        if (state.lastText && settings.enabled) {
          translateAndShow(video, state.lastText, false);
        }
      },
      endsWithPunct ? 85 : 280
    );
  }
}

function translateAndShow(video, text, fastStreamMode = false) {
  const state = getVideoState(video);
  const currentSeq = ++state.reqSeq;

  let settled = false;

  // Song song hiển thị ngay bản dịch tức thời (0ms delay) để người dùng đọc kịp ngay lập tức,
  // đồng bộ cả dòng gốc lẫn dòng dịch cùng lúc (không để chữ gốc nhảy ra trước bắt chờ dòng dịch)
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

// ============================================================================
// ĐỒNG BỘ THEO THỜI GIAN CHO YOUTUBE & TỰ ĐỘNG TÌM LYRICS BÀI HÁT TRÊN MẠNG
// ============================================================================

const ytCueState = {
  vid: "",
  cues: [],
  isLyrics: false,
  lyricsSearchedTitle: "",
  sent: new Set(),
  timer: null,
  renderTimer: null
};

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
      const tooLong = cur.text.length >= 68 || ev.end - cur.start > 5.2;
      if (gap > 0.7 || tooLong || /[.?!…]$/.test(cur.text)) flush();
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
  let title = "";
  let author = "";
  let duration = 0;

  try {
    const detailsMatch = html.match(/"videoDetails":\{([\s\S]{1,1200}?)\}/);
    const block = detailsMatch ? detailsMatch[1] : html;
    const titleMatch = block.match(/"title":"((?:[^"\\]|\\.)*)"/);
    const authorMatch = block.match(/"author":"((?:[^"\\]|\\.)*)"/);
    const lenMatch = block.match(/"lengthSeconds":"(\d+)"/);

    if (titleMatch) title = JSON.parse(`"${titleMatch[1]}"`);
    if (authorMatch) author = JSON.parse(`"${authorMatch[1]}"`);
    if (lenMatch) duration = parseInt(lenMatch[1], 10) || 0;
  } catch {
    // Bỏ qua lỗi parse
  }

  return { title: title.trim(), author: author.trim(), duration };
}

function tryLoadSongLyricsForVideo(video, expectedVid = "", metaOverride = null) {
  return new Promise((resolve) => {
    const title = (metaOverride?.title || getVideoTitle() || "").trim();
    if (!title || title.length < 3) {
      resolve(false);
      return;
    }

    const duration =
      metaOverride?.duration ||
      (Number.isFinite(video?.duration) ? video.duration : 0);
    const channelName = (metaOverride?.author || getChannelName() || "").trim();

    chrome.runtime.sendMessage(
      {
        type: "SEARCH_SONG_LYRICS",
        videoTitle: title,
        channelName,
        duration
      },
      (res) => {
        if (chrome.runtime.lastError || !res?.found) {
          resolve(false);
          return;
        }
        if (expectedVid && ytCueState.vid && ytCueState.vid !== expectedVid) {
          resolve(false);
          return;
        }
        if (res.synced && Array.isArray(res.cues) && res.cues.length >= 4) {
          ytCueState.cues = res.cues;
          ytCueState.isLyrics = true;
          ytCueState.sent.clear();
          const st = getVideoState(video);
          st.hasReceivedAnySubtitle = true;
          // Nếu đang bật thu âm live thì tạm ngắt recorder vì đã có Lyrics chuẩn từng mili-giây
          if (st.audioCaptureActive) {
            stopVideoAudioCapture(video, false);
          }
          updateToadButtonUI(video, "lyrics");
          renderYouTubeByTime(video);
          prefetchYouTubeCues(video);
          resolve(true);
          return;
        }
        resolve(false);
      }
    );
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

  // Nếu đang ở cùng video nhưng chưa có cues và tiêu đề vừa cập nhật xong, thử quét lại lyrics cho video nhạc
  if (ytCueState.vid === vid) {
    if (!ytCueState.cues.length) {
      const currentTitle = getVideoTitle();
      if (
        currentTitle &&
        currentTitle !== ytCueState.lyricsSearchedTitle &&
        (looksLikeMusicVideo(currentTitle, "", video?.duration || 0) ||
          userWantsAudioCapture ||
          settings.autoAudioNoCC)
      ) {
        ytCueState.lyricsSearchedTitle = currentTitle;
        await tryLoadSongLyricsForVideo(video, vid);
      }
    }
    return;
  }

  ytCueState.vid = vid;
  ytCueState.cues = [];
  ytCueState.isLyrics = false;
  ytCueState.lyricsSearchedTitle = "";
  ytCueState.sent = new Set();

  try {
    const html = await (await fetch(`/watch?v=${vid}`, { credentials: "include" })).text();
    const htmlMeta = extractYouTubeMetaFromHtml(html);
    const title = htmlMeta.title || getVideoTitle();
    const duration = htmlMeta.duration || video?.duration || 0;
    const isMusic = looksLikeMusicVideo(title, html, duration);
    const m = html.match(/"captionTracks":(\[\{.*?\}\]),"/);

    let manualTrack = null;
    let asrTrack = null;

    if (m) {
      const tracks = JSON.parse(m[1]);
      const notTarget = tracks.filter(
        (t) =>
          !(t.languageCode || "")
            .toLowerCase()
            .startsWith((settings.targetLang || "vi").toLowerCase())
      );
      const pool = notTarget.length ? notTarget : tracks;
      manualTrack = pool.find((t) => t.kind !== "asr") || null;
      asrTrack = pool.find((t) => t.kind === "asr") || pool[0] || null;
    }

    // Với video nhạc: ưu tiên tìm Lyrics chuẩn nhịp nhạc (LRC) trên mạng trước nếu không có sub thủ công
    // hoặc khi người dùng bật chế độ AI Nghe & Dịch
    if (isMusic && (!manualTrack || userWantsAudioCapture)) {
      ytCueState.lyricsSearchedTitle = title;
      const foundSynced = await tryLoadSongLyricsForVideo(video, vid, htmlMeta);
      if (foundSynced) return;
    }

    const chosenTrack = manualTrack || asrTrack;
    if (chosenTrack) {
      const data = await (
        await fetch(`${chosenTrack.baseUrl}&fmt=json3`, { credentials: "include" })
      ).json();
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
        if (video) {
          renderYouTubeByTime(video);
          prefetchYouTubeCues(video);
        }
        return;
      }
    }

    // Nếu video hoàn toàn không có captionTracks trên YouTube, thử tìm Lyrics bài hát trên mạng
    if (!ytCueState.lyricsSearchedTitle && title) {
      ytCueState.lyricsSearchedTitle = title;
      await tryLoadSongLyricsForVideo(video, vid, htmlMeta);
    }
  } catch {
    // Nếu YouTube chặn tải trước timedtext thì vẫn dịch trực tiếp real-time từ DOM hoặc Lyrics
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

  // Nếu là phụ đề CC thường của YouTube thì tôn trọng nút bật/tắt CC,
  // nhưng nếu là Lyrics bài hát tự tìm hoặc người dùng đã bật AI Nghe & Dịch thì luôn hiển thị!
  if (!ytCueState.isLyrics && !userWantsAudioCapture) {
    const ccBtn = document.querySelector(".ytp-subtitles-button");
    if (ccBtn && ccBtn.getAttribute("aria-pressed") === "false") {
      hideOverlay(video);
      return true;
    }
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
  const isYt = location.hostname.includes("youtube.com") && video.closest(".html5-video-player");
  if (isYt) {
    loadYouTubeCues(video);
  }
  if (!ytCueState.timer) {
    ytCueState.timer = setInterval(() => {
      if (location.hostname.includes("youtube.com")) {
        loadYouTubeCues(video);
      }
      prefetchYouTubeCues(video);
    }, 1200);
  }
  if (!ytCueState.renderTimer) {
    ytCueState.renderTimer = setInterval(() => renderYouTubeByTime(video), 50);
  }
}

// ============================================================================
// TÍNH NĂNG MỞ RỘNG: AI NGHE & DỊCH CUỐN CHIẾU (ZERO-GAP) & TỰ KẾT NỐI KHI ĐỔI VIDEO
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

function stopVideoAudioCapture(video, disableUserIntent = true) {
  const state = getVideoState(video);
  if (disableUserIntent) {
    userWantsAudioCapture = false;
  }
  state.audioCaptureActive = false;
  if (state.audioLoopTimer) {
    clearTimeout(state.audioLoopTimer);
    state.audioLoopTimer = null;
  }
  if (state.audioRetryTimer) {
    clearTimeout(state.audioRetryTimer);
    state.audioRetryTimer = null;
  }
  if (state.audioRecorder && state.audioRecorder.state !== "inactive") {
    try {
      state.audioRecorder.stop();
    } catch {
      // Bỏ qua
    }
  }
  state.audioRecorder = null;
  updateToadButtonUI(
    video,
    ytCueState.isLyrics && ytCueState.cues.length
      ? "lyrics"
      : userWantsAudioCapture
      ? "listening"
      : "idle"
  );
}

async function startVideoAudioCapture(video, isAutoReconnect = false) {
  const state = getVideoState(video);

  // Nếu người dùng bấm trực tiếp vào nút Cóc khi đang bật -> tắt hẳn chế độ AI Nghe & Dịch
  if (!isAutoReconnect && (state.audioCaptureActive || userWantsAudioCapture)) {
    stopVideoAudioCapture(video, true);
    if (ytCueState.isLyrics) {
      ytCueState.cues = [];
      ytCueState.isLyrics = false;
      hideOverlay(video);
    }
    updateToadButtonUI(video, "idle");
    return;
  }

  userWantsAudioCapture = true;
  updateToadButtonUI(video, "listening");

  // Bước 1: Quét tiêu đề xem video này có Lyrics đồng bộ thời gian trên mạng không (đặc biệt cho MV nhạc)
  const foundSyncedLyrics = await tryLoadSongLyricsForVideo(video, ytCueState.vid);
  if (foundSyncedLyrics) {
    return;
  }

  if (!userWantsAudioCapture || !settings.enabled) return;

  const captureFn = video.captureStream || video.mozCaptureStream;
  if (typeof captureFn !== "function") {
    return;
  }

  const acquireAudioStream = () => {
    try {
      const fullStream = captureFn.call(video);
      const tracks = fullStream.getAudioTracks().filter((t) => t.readyState !== "ended");
      if (!tracks.length) return null;
      return new MediaStream(tracks);
    } catch {
      return null;
    }
  };

  let audioOnlyStream = acquireAudioStream();
  if (!audioOnlyStream) {
    // Khi vừa chuyển sang video mới, luồng âm thanh có thể cần vài trăm ms để khởi tạo xong:
    // Tự động thử kết nối lại ngay khi video phát mà không bắt người dùng bấm lại!
    if (state.audioRetryTimer) clearTimeout(state.audioRetryTimer);
    state.audioRetryTimer = setTimeout(() => {
      if (userWantsAudioCapture && !state.audioCaptureActive && settings.enabled) {
        startVideoAudioCapture(video, true);
      }
    }, 650);
    return;
  }

  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : MediaRecorder.isTypeSupported("audio/webm")
    ? "audio/webm"
    : "";

  state.audioCaptureActive = true;
  state.capturedSrc = video.currentSrc || location.href;
  updateToadButtonUI(video, "listening");

  if (!state.lastText) {
    renderTranslation(
      video,
      "🐸 Translate Toad AI Audio",
      "Đang lắng nghe & dịch trực tiếp...",
      "",
      true,
      false
    );
  }

  let isFirstSlice = true;

  // Thu âm cuốn chiếu Zero-Gap: Ngay khi lát cắt trước vừa đóng để gửi lên AI,
  // lát cắt mới bắt đầu thu ngay ở 0ms tiếp theo để không sót từ và giảm tối đa độ trễ!
  const recordNextSlice = () => {
    if (!state.audioCaptureActive || !userWantsAudioCapture || !settings.enabled) {
      stopVideoAudioCapture(video, false);
      return;
    }

    // Nếu đã tìm thấy Lyrics chuẩn nhịp nhạc trong lúc đang nghe thì nhường cho bộ đồng bộ Lyrics
    if (ytCueState.isLyrics && ytCueState.cues.length > 0) {
      stopVideoAudioCapture(video, false);
      updateToadButtonUI(video, "lyrics");
      return;
    }

    if (video.paused || video.ended || video.muted || video.volume === 0) {
      state.audioLoopTimer = setTimeout(recordNextSlice, 500);
      return;
    }

    // Nếu luồng âm thanh của video bị đổi (do chuyển bài / hết quảng cáo), tự động lấy lại stream mới!
    const currentTracks = audioOnlyStream ? audioOnlyStream.getAudioTracks() : [];
    if (
      !currentTracks.length ||
      currentTracks[0].readyState === "ended" ||
      (video.currentSrc && video.currentSrc !== state.capturedSrc)
    ) {
      audioOnlyStream = acquireAudioStream();
      state.capturedSrc = video.currentSrc || location.href;
      if (!audioOnlyStream) {
        state.audioLoopTimer = setTimeout(recordNextSlice, 600);
        return;
      }
    }

    const sliceDurationMs = isFirstSlice ? 1500 : 1850;
    isFirstSlice = false;

    try {
      const recorder = mimeType
        ? new MediaRecorder(audioOnlyStream, { mimeType, audioBitsPerSecond: 24000 })
        : new MediaRecorder(audioOnlyStream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        if (!state.audioCaptureActive || chunks.length === 0) return;
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        if (blob.size < 450) return;
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
              if (res?.error) return;
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

      state.audioLoopTimer = setTimeout(() => {
        if (recorder.state === "recording") {
          try {
            recorder.stop();
          } catch {
            // Bỏ qua
          }
        }
        // Bắt đầu ngay lát cắt tiếp theo (0ms gap)
        if (state.audioCaptureActive && userWantsAudioCapture) {
          recordNextSlice();
        }
      }, sliceDurationMs);
    } catch {
      state.audioLoopTimer = setTimeout(recordNextSlice, 800);
    }
  };

  recordNextSlice();
}

function handleVideoSourceOrPageChange(video) {
  const state = getVideoState(video);
  const currentNavKey = `${location.href}::${video.currentSrc || ""}`;
  if (state.videoNavKey === currentNavKey) return;
  state.videoNavKey = currentNavKey;

  // Dọn phụ đề cũ của video trước
  state.lastText = "";
  state.renderedOrigText = "";
  state.renderedViText = "";
  state.ytPageFirstLine = "";
  state.ytPageSecondLine = "";
  state.ytConsumedLine = "";
  state.reqSeq++;
  state.lastRenderedSeq = state.reqSeq;
  state.hasReceivedAnySubtitle = false;
  hideOverlay(video);

  // Tạm dừng recorder của luồng cũ (nhưng GIỮ NGUYÊN userWantsAudioCapture = true nếu người dùng đã bật)
  if (state.audioCaptureActive) {
    stopVideoAudioCapture(video, false);
  }

  observePlatformCaptions(video);
  startYouTubePrefetch(video);
  autoUnlockHiddenTracks(video);
  ensureToadAudioButton(video);

  // Nếu người dùng đã bật AI Nghe & Dịch từ video trước (hoặc bật tự động),
  // tự động kích hoạt lại trên video mới mà không cần bấm tắt/bật lại!
  if ((userWantsAudioCapture || settings.autoAudioNoCC) && settings.enabled) {
    if (state.audioRetryTimer) clearTimeout(state.audioRetryTimer);
    state.audioRetryTimer = setTimeout(() => {
      if (!settings.enabled) return;
      if (userWantsAudioCapture) {
        startVideoAudioCapture(video, true);
      } else if (settings.autoAudioNoCC && !state.hasReceivedAnySubtitle && !video.paused) {
        startVideoAudioCapture(video, true);
      }
    }, 550);
  }
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
      "Bật/Tắt chế độ Translate Toad AI: Tự tìm Lyrics chuẩn nhịp cho video nhạc hoặc tự nghe âm thanh tạo phụ đề khi không có CC";

    const iconUrl = chrome.runtime.getURL("assets/icon48.png");
    btn.innerHTML = `<img src="${iconUrl}" alt="Toad"><span>AI Nghe & Dịch (Không cần CC)</span>`;

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      startVideoAudioCapture(video, false);
    });

    container.appendChild(btn);
    state.toadBtnEl = btn;
    updateToadButtonUI(
      video,
      ytCueState.isLyrics && ytCueState.cues.length
        ? "lyrics"
        : state.audioCaptureActive || userWantsAudioCapture
        ? "listening"
        : "idle"
    );
  } else {
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

function extractYouTubeStreamingText(video, captionContainer, segmentSelector) {
  const state = getVideoState(video);
  const lines = captionContainer.querySelectorAll(".ytp-caption-line");

  if (lines.length === 0) {
    const segments = captionContainer.querySelectorAll(segmentSelector);
    return Array.from(segments)
      .map((seg) => seg.textContent || "")
      .join(" ");
  }

  if (lines.length === 1) {
    const l0 = normalizeSubtitleText(lines[0].textContent || "");
    state.ytPageFirstLine = l0;
    state.ytPageSecondLine = "";
    state.ytConsumedLine = "";
    return l0;
  }

  const l0 = normalizeSubtitleText(lines[lines.length - 2].textContent || "");
  const l1 = normalizeSubtitleText(lines[lines.length - 1].textContent || "");
  if (!l0) return l1;

  // Khi YouTube cuộn dòng 2 của trang trước (ytPageSecondLine) lên làm dòng 1 (l0),
  // đánh dấu l0 đã hiển thị xong để trang mới bắt đầu cố định từ l1 (không kéo ngược l0 về đầu câu)
  if (
    state.ytPageFirstLine &&
    l0 !== state.ytPageFirstLine &&
    state.ytPageSecondLine &&
    (l0 === state.ytPageSecondLine || l0.startsWith(state.ytPageSecondLine))
  ) {
    state.ytConsumedLine = l0;
    state.ytPageFirstLine = "";
    state.ytPageSecondLine = "";
    state.renderedOrigText = "";
    state.renderedViText = "";
  }

  if (state.ytConsumedLine && l0 === state.ytConsumedLine) {
    return l1 || l0;
  }

  state.ytPageFirstLine = l0;
  state.ytPageSecondLine = l1;
  return l1 ? `${l0} ${l1}` : l0;
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
        text = extractYouTubeStreamingText(video, captionContainer, cfg.segmentSelector);
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

  const state = getVideoState(video);
  state.videoNavKey = `${location.href}::${video.currentSrc || ""}`;

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

  video.addEventListener("timeupdate", () => renderYouTubeByTime(video));
  video.addEventListener("seeking", () => {
    ytCueState.sent.clear();
    renderYouTubeByTime(video);
    prefetchYouTubeCues(video);
  });

  video.addEventListener("loadedmetadata", () => {
    handleVideoSourceOrPageChange(video);
  });

  video.addEventListener("loadeddata", () => {
    handleVideoSourceOrPageChange(video);
  });

  video.addEventListener("pause", () => {
    if (state.overlay) {
      state.overlay.classList.add("vie-player-paused");
    }
  });

  video.addEventListener("playing", () => {
    if (state.overlay) {
      state.overlay.classList.remove("vie-player-paused");
    }
    if (state.isDictPinned) {
      closeDictAndCoach(video, false);
    }
    handleVideoSourceOrPageChange(video);
    if (userWantsAudioCapture && !state.audioCaptureActive && !ytCueState.isLyrics && settings.enabled) {
      startVideoAudioCapture(video, true);
    } else if (
      settings.autoAudioNoCC &&
      settings.enabled &&
      !state.hasReceivedAnySubtitle &&
      !state.audioCaptureActive &&
      !ytCueState.isLyrics
    ) {
      setTimeout(() => {
        if (
          !state.hasReceivedAnySubtitle &&
          !state.audioCaptureActive &&
          !ytCueState.isLyrics &&
          !video.paused
        ) {
          startVideoAudioCapture(video, true);
        }
      }, 2200);
    }
  });
}

function scanVideos() {
  document.querySelectorAll("video").forEach(watchVideo);
}

// Bắt sự kiện chuyển bài / chuyển video SPA trên YouTube và các nền tảng web
["yt-navigate-finish", "yt-page-data-updated", "popstate"].forEach((evtName) => {
  window.addEventListener(evtName, () => {
    document.querySelectorAll("video").forEach((video) => {
      handleVideoSourceOrPageChange(video);
    });
  });
});

["play", "playing", "loadedmetadata", "loadeddata"].forEach((evtName) => {
  document.addEventListener(
    evtName,
    (e) => {
      if (e.target && e.target.tagName === "VIDEO") {
        watchVideo(e.target);
        handleVideoSourceOrPageChange(e.target);
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