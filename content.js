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
      <button type="button" class="vie-learn-btn vie-learn-speak-all-btn" title="Nghe phát âm cả câu bằng giọng bản xứ">
        🔊 Nghe câu
      </button>
      <div class="vie-sync-group" title="Chỉnh độ lệch phụ đề / lyrics (nếu sub chạy trước tiếng nhạc hoặc chạy sau)">
        <span class="vie-sync-label">⏱️ Lệch:</span>
        <button type="button" class="vie-sync-btn vie-sync-minus" title="Chạy sớm hơn 1s (giảm độ trễ)">⏪ -1s</button>
        <span class="vie-sync-val">0s</span>
        <button type="button" class="vie-sync-btn vie-sync-plus" title="Trễ lại 1s (nếu sub đang chạy trước tiếng hát/thoại)">+1s ⏩</button>
        <button type="button" class="vie-sync-btn vie-sync-reset" title="Đặt lại độ lệch về 0s" style="display:none;">↺</button>
      </div>
      <span class="vie-learn-tip">💡 Chạm từ để tra</span>
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

const LANG_SPEECH_MAP = {
  en: "en-US",
  fr: "fr-FR",
  ja: "ja-JP",
  ko: "ko-KR",
  "zh-CN": "zh-CN",
  "zh-TW": "zh-TW",
  de: "de-DE",
  es: "es-ES",
  ru: "ru-RU",
  th: "th-TH",
  vi: "vi-VN"
};

function detectLanguageForSpeech(text, langHint = "") {
  if (langHint && LANG_SPEECH_MAP[langHint]) {
    return LANG_SPEECH_MAP[langHint];
  }
  const t = String(text || "").trim();
  if (!t) return "en-US";

  // Nhận diện theo bảng chữ cái đặc thù
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(t)) return "ja-JP"; // Tiếng Nhật
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(t)) return "ko-KR"; // Tiếng Hàn
  if (/[\u4E00-\u9FFF]/.test(t)) return "zh-CN"; // Tiếng Trung
  if (/[\u0400-\u04FF]/.test(t)) return "ru-RU"; // Tiếng Nga / Cyrillic
  if (/[\u0E00-\u0E7F]/.test(t)) return "th-TH"; // Tiếng Thái

  // Dấu Tiếng Việt đặc thù
  if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/.test(t)) {
    return "vi-VN";
  }

  // Dấu Tiếng Pháp đặc thù
  if (/[éèêëàâôûùçîïœæ]/i.test(t)) return "fr-FR";
  // Dấu Tiếng Đức đặc thù
  if (/[äöüß]/i.test(t)) return "de-DE";
  // Dấu Tiếng Tây Ban Nha đặc thù
  if (/[áéíóúñ¿¡]/i.test(t)) return "es-ES";

  // Ưu tiên theo cấu hình dòng phụ song ngữ người dùng đang chọn
  if (settings.secondaryLang && LANG_SPEECH_MAP[settings.secondaryLang]) {
    return LANG_SPEECH_MAP[settings.secondaryLang];
  }

  // Mặc định cho ký tự Latin ngoại ngữ là Tiếng Anh chuẩn bản ngữ (en-US)
  return "en-US";
}

function getBestVoiceForLang(bcpLang) {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return null;

  const cleanTarget = bcpLang.toLowerCase().replace("_", "-");
  const primaryTag = cleanTarget.split("-")[0];

  // 1. Khớp chính xác mã BCP-47 (ví dụ en-US, fr-FR, ja-JP)
  let match = voices.find((v) => (v.lang || "").toLowerCase().replace("_", "-") === cleanTarget);
  if (match) return match;

  // 2. Khớp tiền tố ngôn ngữ (ví dụ en-GB, fr-CA)
  const tagMatches = voices.filter((v) =>
    (v.lang || "").toLowerCase().replace("_", "-").startsWith(primaryTag)
  );
  if (tagMatches.length > 0) {
    const natural = tagMatches.find((v) => /google|natural|premium|online/i.test(v.name));
    return natural || tagMatches[0];
  }

  return null;
}

if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    try {
      window.speechSynthesis.getVoices();
    } catch {}
  };
}

function speakWord(word, langHint = "") {
  try {
    if (!("speechSynthesis" in window) || !word) return;
    window.speechSynthesis.cancel();
    const targetLang = detectLanguageForSpeech(word, langHint);
    const utter = new SpeechSynthesisUtterance(word);
    utter.lang = targetLang;
    const voice = getBestVoiceForLang(targetLang);
    if (voice) {
      utter.voice = voice;
    }
    utter.rate = 0.95;
    window.speechSynthesis.speak(utter);
  } catch {
    // ignore speech errors
  }
}

function categorizePos(posText) {
  const p = (posText || "").toLowerCase();
  if (/động từ|\bverb\b/.test(p) && !/thành ngữ|idiom/.test(p)) return "verb";
  if (/danh từ|\bnoun\b/.test(p)) return "noun";
  if (/tính từ|\badjective\b|\badj\b/.test(p)) return "adj";
  if (/trạng từ|\badverb\b|\badv\b/.test(p)) return "adv";
  if (/thành ngữ|idiom|lóng|slang|phrasal|cụm/.test(p)) return "idiom";
  return "other";
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
      posCategory: categorizePos(item.pos),
      meaning: item.meaning || "",
      posVariants: Array.isArray(item.posVariants) ? item.posVariants : [],
      examples: Array.isArray(item.examples)
        ? item.examples
        : (item.examples ? [item.examples] : []),
      fact: item.fact || "",
      synonyms: Array.isArray(item.synonyms)
        ? item.synonyms
        : (typeof item.synonyms === "string" ? item.synonyms.split(",").map((s) => s.trim()).filter(Boolean) : []),
      note: item.note || "",
      lang: detectLanguageForSpeech(item.word),
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

function getPosClass(posText) {
  const p = (posText || "").toLowerCase();
  if (/động từ|\bverb\b/.test(p)) return "vie-pos-verb";
  if (/danh từ|\bnoun\b/.test(p)) return "vie-pos-noun";
  if (/tính từ|\badj/.test(p)) return "vie-pos-adj";
  if (/trạng từ|\badv/.test(p)) return "vie-pos-adv";
  if (/thành ngữ|\bidiom\b/.test(p)) return "vie-pos-idiom";
  if (/lóng|\bslang\b/.test(p)) return "vie-pos-slang";
  if (/cụm động từ|phrasal/.test(p)) return "vie-pos-phrasal";
  return "";
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
        <span class="vie-dict-loading">⏳ Cóc đang phân tích từ loại, ví dụ &amp; fact thú vị...</span>
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

      const posClass = getPosClass(res.pos);
      const posVariants = Array.isArray(res.posVariants) ? res.posVariants : [];
      const examplesList = Array.isArray(res.examples) ? res.examples : [];
      const synonymList = Array.isArray(res.synonyms)
        ? res.synonyms
        : (typeof res.synonyms === "string" ? res.synonyms.split(",").map((s) => s.trim()).filter(Boolean) : []);

      dictCard.innerHTML = `
        <div class="vie-dict-header">
          <div class="vie-dict-title">
            <span class="vie-dict-word">${escapeHtml(res.word || word)}</span>
            ${res.pron ? `<span class="vie-dict-pron">/${escapeHtml(res.pron.replace(/^\/|\/$/g, ""))}/</span>` : ""}
            ${res.pos ? `<span class="vie-dict-pos ${posClass}">${escapeHtml(res.pos)}</span>` : ""}
            <button type="button" class="vie-dict-speak" title="Nghe phát âm từ này">🔊</button>
          </div>
          <div class="vie-dict-actions">
            <button type="button" class="vie-dict-save" title="Lưu vào Sổ từ vựng để ôn tập">⭐ Lưu từ</button>
            <button type="button" class="vie-dict-close" title="Đóng">✕</button>
          </div>
        </div>

        <div class="vie-dict-meaning-box">
          <div class="vie-dict-meaning-label">🎯 Nghĩa trong ngữ cảnh câu này:</div>
          <div class="vie-dict-meaning">${escapeHtml(res.meaning || "")}</div>
        </div>

        ${
          posVariants.length > 0
            ? `
        <div class="vie-dict-multipos-box">
          <div class="vie-dict-multipos-title">🔄 Phân biệt khi dùng ở các Từ Loại khác nhau:</div>
          <div class="vie-dict-multipos-list">
            ${posVariants
              .map(
                (v) => `
              <div class="vie-dict-multipos-item">
                <span class="vie-dict-pos-mini ${getPosClass(v.pos)}">${escapeHtml(v.pos)}</span>
                <span class="vie-dict-multipos-desc">${escapeHtml(v.desc)}</span>
              </div>`
              )
              .join("")}
          </div>
        </div>`
            : ""
        }

        ${
          examplesList.length > 0
            ? `
        <div class="vie-dict-section">
          <div class="vie-dict-section-title">🗣️ Ví dụ thực tế khác ngoài đời:</div>
          <div class="vie-dict-examples-list">
            ${examplesList
              .map(
                (ex) => `
              <div class="vie-dict-example-item">
                <div class="vie-dict-example-orig">
                  <button type="button" class="vie-dict-mini-speak" data-text="${escapeHtml(ex.orig || "")}" title="Nghe câu ví dụ">🔊</button>
                  <span>${escapeHtml(ex.orig || "")}</span>
                </div>
                ${ex.trans ? `<div class="vie-dict-example-trans">➔ ${escapeHtml(ex.trans)}</div>` : ""}
              </div>`
              )
              .join("")}
          </div>
        </div>`
            : ""
        }

        ${
          res.fact
            ? `
        <div class="vie-dict-fact-box">
          <div class="vie-dict-fact-title">✨ Fact thú vị &amp; Mẹo nhớ siêu tốc:</div>
          <div class="vie-dict-fact-body">${escapeHtml(res.fact)}</div>
        </div>`
            : res.note
            ? `<div class="vie-dict-note">💡 ${escapeHtml(res.note)}</div>`
            : ""
        }

        ${
          synonymList.length > 0
            ? `
        <div class="vie-dict-synonyms-box">
          <span class="vie-dict-syn-label">🧩 Đồng nghĩa / Đi kèm:</span>
          <div class="vie-dict-syn-tags">
            ${synonymList.map((s) => `<span class="vie-dict-syn-tag">${escapeHtml(s)}</span>`).join("")}
          </div>
        </div>`
            : ""
        }

        <button type="button" class="vie-dict-more-btn">
          🎓 Xem thêm: Tại sao cả câu dịch như vậy &amp; Cách dùng thực tế ➔
        </button>
      `;

      dictCard.querySelector(".vie-dict-speak")?.addEventListener("click", (e) => {
        e.stopPropagation();
        speakWord(res.word || word);
      });

      dictCard.querySelectorAll(".vie-dict-mini-speak").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const t = btn.getAttribute("data-text");
          if (t) speakWord(t);
        });
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
  if (origEl.dataset.rawText === text && origEl.children.length > 0) return;
  origEl.dataset.rawText = text;
  origEl.innerHTML = "";

  const tokens = (text || "").split(/(\s+)/);
  for (const tok of tokens) {
    if (!tok) continue;
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
    span.className = "vie-word";
    span.dataset.word = cleanWord;
    span.textContent = tok;
    origEl.appendChild(span);
  }
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

  const syncValEl = learnBar.querySelector(".vie-sync-val");
  const syncResetBtn = learnBar.querySelector(".vie-sync-reset");

  const updateSyncUI = () => {
    if (!syncValEl) return;
    const offset = state.subSyncOffset || 0;
    syncValEl.textContent = offset === 0 ? "0s" : offset > 0 ? `+${offset}s` : `${offset}s`;
    if (syncResetBtn) {
      syncResetBtn.style.display = offset !== 0 ? "inline-flex" : "none";
    }
  };

  learnBar.querySelector(".vie-sync-minus")?.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    state.subSyncOffset = Math.round(((state.subSyncOffset || 0) - 1.0) * 10) / 10;
    updateSyncUI();
    renderYouTubeByTime(video);
  });

  learnBar.querySelector(".vie-sync-plus")?.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    state.subSyncOffset = Math.round(((state.subSyncOffset || 0) + 1.0) * 10) / 10;
    updateSyncUI();
    renderYouTubeByTime(video);
  });

  syncResetBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    state.subSyncOffset = 0;
    updateSyncUI();
    renderYouTubeByTime(video);
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
      subSyncOffset: 0,
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

function formatSubtitleDecorations(origText, viText, isMusicOrLyrics = false) {
  let finalOrig = (origText || "").trim();
  let finalVi = (viText || "").trim();

  if (!finalVi && !finalOrig) return { formattedOrig: finalOrig, formattedVi: finalVi };

  // 1. Thêm nốt nhạc ♪ ở đầu và cuối nếu là bài hát / câu hát / lyrics
  const hasMusicNote = /[♪♫♬]/.test(finalOrig) || /[♪♫♬]/.test(finalVi) || isMusicOrLyrics;
  if (hasMusicNote) {
    if (finalOrig && !finalOrig.startsWith("♪") && !finalOrig.startsWith("♫")) {
      finalOrig = `♪ ${finalOrig}`;
    }
    if (finalOrig && !finalOrig.endsWith("♪") && !finalOrig.endsWith("♫")) {
      finalOrig = `${finalOrig} ♪`;
    }
    if (finalVi && !finalVi.startsWith("♪") && !finalVi.startsWith("♫")) {
      finalVi = `♪ ${finalVi}`;
    }
    if (finalVi && !finalVi.endsWith("♪") && !finalVi.endsWith("♫")) {
      finalVi = `${finalVi} ♪`;
    }
  }

  // 2. Đồng bộ các dấu câu đặc thù: ?, !, ... sang câu dịch
  const cleanOrig = finalOrig.replace(/^[♪♫♬\s]+|[♪♫♬\s]+$/g, "").trim();
  const cleanVi = finalVi.replace(/^[♪♫♬\s]+|[♪♫♬\s]+$/g, "").trim();

  if (finalVi) {
    if (/\?$/.test(cleanOrig) && !/\?$/.test(cleanVi)) {
      finalVi = hasMusicNote ? finalVi.replace(/\s*♪$/, "? ♪") : `${finalVi}?`;
    } else if (/!$/.test(cleanOrig) && !/[!?]$/.test(cleanVi)) {
      finalVi = hasMusicNote ? finalVi.replace(/\s*♪$/, "! ♪") : `${finalVi}!`;
    } else if (/(\.{3}|…)$/.test(cleanOrig) && !/(\.{3}|…)$/.test(cleanVi)) {
      finalVi = hasMusicNote ? finalVi.replace(/\s*♪$/, "... ♪") : `${finalVi}...`;
    }
  }

  return { formattedOrig: finalOrig, formattedVi: finalVi };
}

function renderTranslation(video, origText, viText, sub2Text = "", isPreview = false, isError = false) {
  const overlay = getOrCreateOverlay(video);
  const origEl = overlay.querySelector(".vie-orig");
  const viEl = overlay.querySelector(".vie-vi");

  const isMusic = ytCueState.isLyrics || looksLikeMusicVideo(getVideoTitle());
  const { formattedOrig, formattedVi } = formatSubtitleDecorations(origText, viText, isMusic);

  const showSecondary = Boolean(settings.dualSub) && settings.secondaryLang !== "none";
  if (origEl) {
    const secondLine = getSecondaryDisplayLine(formattedOrig, sub2Text);
    renderInteractiveWords(origEl, secondLine);
    origEl.style.display = showSecondary ? "block" : "none";
  }

  if (viEl) {
    viEl.textContent = isError ? viText : formattedVi;
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
    renderInteractiveWords(origEl, text);
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

function tryLoadSongLyricsForVideo(video, expectedVid = "", metaOverride = null, refEvents = []) {
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
          let cues = res.cues;
          let autoOffset = 0;

          // Tự động căn chỉnh độ lệch Intro của MV ca nhạc so với bản thu âm Album (LRC):
          // TH1: Dùng mốc thời gian thực của phụ đề YouTube ASR/Manual (nếu video có sẵn track)
          if (Array.isArray(refEvents) && refEvents.length > 0 && cues.length > 0) {
            const firstRef = refEvents.find((e) => e.text && e.text.trim().length >= 3);
            const firstLrc = cues[0];
            if (firstRef && firstLrc) {
              const firstWords = firstLrc.text.toLowerCase().split(/\s+/).slice(0, 3).join(" ");
              const matchedRef = refEvents.find(
                (e) => firstWords.length >= 4 && e.text.toLowerCase().includes(firstWords)
              );
              if (matchedRef) {
                autoOffset = Math.max(0, matchedRef.start - firstLrc.start);
              } else if (firstRef.start > firstLrc.start + 2.5) {
                autoOffset = Math.max(0, firstRef.start - firstLrc.start);
              }
            }
          }
          // TH2: Video không có track phụ đề nhưng video dài hơn bản album (durationDelta do cảnh intro MV)
          else if (
            res.durationDelta &&
            res.durationDelta >= 4.0 &&
            res.durationDelta <= 65.0 &&
            looksLikeMusicVideo(title, "", duration)
          ) {
            autoOffset = res.durationDelta;
          }

          if (autoOffset > 1.0 && autoOffset < 90.0) {
            cues = cues.map((c) => ({
              start: Math.round((c.start + autoOffset) * 100) / 100,
              end: Math.round((c.end + autoOffset) * 100) / 100,
              text: c.text
            }));
          }

          ytCueState.cues = cues;
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

    const chosenTrack = manualTrack || asrTrack;
    let events = [];
    if (chosenTrack) {
      try {
        const data = await (
          await fetch(`${chosenTrack.baseUrl}&fmt=json3`, { credentials: "include" })
        ).json();
        for (const ev of data.events || []) {
          if (!ev.segs) continue;
          const text = normalizeSubtitleText(ev.segs.map((sg) => sg.utf8 || "").join(""));
          if (!text) continue;
          const start = (ev.tStartMs || 0) / 1000;
          events.push({ start, end: start + (ev.dDurationMs || 2000) / 1000, text });
        }
      } catch {
        // Bỏ qua lỗi nạp track
      }
    }

    // Với video nhạc: thử tìm Lyrics chuẩn nhịp nhạc (LRC), truyền kèm events để tự động cân chỉnh độ lệch intro
    if (isMusic && (!manualTrack || userWantsAudioCapture)) {
      ytCueState.lyricsSearchedTitle = title;
      const foundSynced = await tryLoadSongLyricsForVideo(video, vid, htmlMeta, events);
      if (foundSynced) return;
    }

    if (events.length > 0) {
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
      await tryLoadSongLyricsForVideo(video, vid, htmlMeta, []);
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

  const state = getVideoState(video);
  const tRaw = video.currentTime || 0;
  const t = Math.max(0, tRaw - (state.subSyncOffset || 0));

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