/**
 * VIE-Translate — Translate Toad AI
 * content/dom.js — UI & DOM manager (Subtitles, Popups, Dict cards, Audio button & Tooltips)
 */

(function (root) {
  "use strict";

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getPosClass(posText) {
    const p = (posText || "").toLowerCase().trim();
    if (p.includes("noun") || p.includes("danh từ") || p === "n." || p === "n") return "vie-pos-noun";
    if (p.includes("verb") || p.includes("động từ") || p === "v." || p === "v") return "vie-pos-verb";
    if (p.includes("adj") || p.includes("tính từ")) return "vie-pos-adj";
    if (p.includes("adv") || p.includes("phó từ") || p.includes("trạng từ")) return "vie-pos-adv";
    if (p.includes("idiom") || p.includes("thành ngữ")) return "vie-pos-idiom";
    return "vie-pos-other";
  }

  function formatSubtitleDecorations(origText, viText, isLyricsTrack = false) {
    let finalOrig = root.VieStorage?.formatMultiSpeakerDialogue
      ? root.VieStorage.formatMultiSpeakerDialogue(origText)
      : (origText || "").trim();
    let finalVi = root.VieStorage?.formatMultiSpeakerDialogue
      ? root.VieStorage.formatMultiSpeakerDialogue(viText)
      : (viText || "").trim();

    finalOrig = (finalOrig || "")
      .replace(/^(?:\*{1,2})?(?:ORIG(?:INAL)?|GỐC|TRANS(?:LATION)?|DỊCH)\s*:\s*(?:\*{1,2})?/i, "")
      .replace(/^(?:ORIG|GỐC|ORIGINAL)\b[:\s-]*/i, "")
      .trim();
    finalVi = (finalVi || "")
      .replace(/^(?:\*{1,2})?(?:TRANS(?:LATION)?|DỊCH|VIETNAMESE|VI|ORIG(?:INAL)?|GỐC)\s*:\s*(?:\*{1,2})?/i, "")
      .replace(/^(?:ORIG|GỐC|ORIGINAL)\b[:\s-]*/i, "")
      .trim();
    if (!finalVi && !finalOrig) return { formattedOrig: finalOrig, formattedVi: finalVi };

    // Phát hiện xem có phải là lời thoại nói chuyện / đối thoại bình thường không
    const isSpokenDialogue =
      /^\[?(?:intro|outro|dialogue|spoken|speech|nói|thoại|phỏng vấn|mc|bình luận|narrat)/i.test(finalOrig) ||
      /^["“].+["”]$/.test(finalOrig) ||
      /^[A-Z][a-z]+:\s+/.test(finalOrig);

    // CHỈ THÊM NỐT NHẠC NẾU:
    // 1. Phụ đề gốc hoặc dịch có sẵn ký hiệu nốt nhạc (YouTube CC thường gắn ♪ khi nhân vật hát)
    // 2. HOẶC là bài hát có lời đồng bộ từ LRCLIB (isLyricsTrack = true) và KHÔNG PHẢI là đoạn nói chuyện
    // TUYỆT ĐỐI KHÔNG thêm nốt nhạc vào lời người đang nói chuyện bình thường!
    const hasExplicitMusicSymbol = /[♪♫♬♩♯]/.test(finalOrig) || /[♪♫♬♩♯]/.test(finalVi);
    const shouldAddMusicNote = hasExplicitMusicSymbol || (isLyricsTrack && !isSpokenDialogue);

    if (shouldAddMusicNote) {
      if (finalOrig && !finalOrig.startsWith("♪") && !finalOrig.startsWith("♫")) finalOrig = `♪ ${finalOrig}`;
      if (finalOrig && !finalOrig.endsWith("♪") && !finalOrig.endsWith("♫")) finalOrig = `${finalOrig} ♪`;
      if (finalVi && !finalVi.startsWith("♪") && !finalVi.startsWith("♫")) finalVi = `♪ ${finalVi}`;
      if (finalVi && !finalVi.endsWith("♪") && !finalVi.endsWith("♫")) finalVi = `${finalVi} ♪`;
    }

    const cleanOrig = finalOrig.replace(/^[♪♫♬\s]+|[♪♫♬\s]+$/g, "").trim();
    const cleanVi = finalVi.replace(/^[♪♫♬\s]+|[♪♫♬\s]+$/g, "").trim();
    if (finalVi && !finalVi.includes("\n")) {
      if (/\?$/.test(cleanOrig) && !/\?$/.test(cleanVi)) {
        finalVi = shouldAddMusicNote ? finalVi.replace(/\s*♪$/, "? ♪") : `${finalVi}?`;
      } else if (/!$/.test(cleanOrig) && !/[!?]$/.test(cleanVi)) {
        finalVi = shouldAddMusicNote ? finalVi.replace(/\s*♪$/, "! ♪") : `${finalVi}!`;
      } else if (/(\.{3}|…)$/.test(cleanOrig) && !/(\.{3}|…)$/.test(cleanVi)) {
        finalVi = shouldAddMusicNote ? finalVi.replace(/\s*♪$/, "... ♪") : `${finalVi}...`;
      }
    }
    return { formattedOrig: finalOrig, formattedVi: finalVi };
  }

  function detectLanguageForSpeech(text, langHint = "") {
    if (langHint && langHint !== "orig" && langHint !== "none") return langHint;
    const s = (text || "").trim();
    if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(s)) {
      return /[\u3040-\u309f\u30a0-\u30ff]/.test(s) ? "ja-JP" : "zh-CN";
    }
    if (/[\uac00-\ud7af]/.test(s)) return "ko-KR";
    if (/[\u0e00-\u0e7f]/.test(s)) return "th-TH";
    if (/[\u0400-\u04ff]/.test(s)) return "ru-RU";
    if (/[àâçéèêëîïôûùüÿœæ]/i.test(s)) return "fr-FR";
    if (/[äöüß]/i.test(s)) return "de-DE";
    if (/[áéíóúñ¿¡]/i.test(s)) return "es-ES";
    return "en-US";
  }

  function getBestVoiceForLang(bcpLang) {
    if (!("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    const exact = voices.filter((v) => v.lang && v.lang.toLowerCase() === bcpLang.toLowerCase());
    const nat = exact.find((v) => v.name.includes("Natural") || v.name.includes("Online") || v.name.includes("Google"));
    if (nat) return nat;
    if (exact.length) return exact[0];
    const prefix = bcpLang.split("-")[0].toLowerCase();
    const prefixVoices = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith(prefix));
    return prefixVoices[0] || null;
  }

  let uiAudioCtx = null;
  function playUiSound(type = "pop") {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      uiAudioCtx = uiAudioCtx || new AudioCtx();
      if (uiAudioCtx.state === "suspended") uiAudioCtx.resume().catch(() => {});
      const now = uiAudioCtx.currentTime;
      const osc = uiAudioCtx.createOscillator();
      const gain = uiAudioCtx.createGain();
      osc.connect(gain);
      gain.connect(uiAudioCtx.destination);

      if (type === "pop" || type === "word") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(850, now + 0.05);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.045, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.065);
      } else if (type === "toggle_on") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(460, now);
        osc.frequency.exponentialRampToValueAtTime(760, now + 0.07);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.04, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.085);
      } else if (type === "toggle_off") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(720, now);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.07);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.035, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.085);
      } else if (type === "tick") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(950, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.03, now + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
        osc.start(now);
        osc.stop(now + 0.035);
      } else if (type === "chime") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(880, now + 0.06);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.04, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.17);
      }
    } catch {}
  }

  function speakWord(word, langHint = "") {
    try {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(word);
      const bcp = detectLanguageForSpeech(word, langHint);
      utter.lang = bcp;
      const best = getBestVoiceForLang(bcp);
      if (best) utter.voice = best;
      utter.rate = 0.95;
      window.speechSynthesis.speak(utter);
    } catch {}
  }

  async function saveWordToVocab(item, saveBtnEl) {
    try {
      const stored = await chrome.storage.local.get({ savedVocab: [] });
      const list = Array.isArray(stored.savedVocab) ? stored.savedVocab : [];
      const wordKey = (item.word || "").toLowerCase();
      const existsIdx = list.findIndex((x) => (x.word || "").toLowerCase() === wordKey);
      const entry = {
        word: item.word,
        pron: item.pron || "",
        pos: item.pos || "Từ vựng",
        meaning: item.meaning || "",
        sentence: item.sentence || "",
        cefr: item.cefr || "",
        posVariants: Array.isArray(item.posVariants) ? item.posVariants : [],
        examples: item.examples || [],
        funFact: item.funFact || "",
        collocations: item.collocations || [],
        savedAt: Date.now()
      };
      if (existsIdx >= 0) list[existsIdx] = entry;
      else list.unshift(entry);
      await chrome.storage.local.set({ savedVocab: list.slice(0, 300) });
      if (saveBtnEl) {
        saveBtnEl.textContent = "✓ Đã lưu!";
        saveBtnEl.classList.add("vie-dict-saved");
        setTimeout(() => {
          saveBtnEl.textContent = "⭐ Lưu từ";
          saveBtnEl.classList.remove("vie-dict-saved");
        }, 1600);
      }
    } catch {}
  }

  function renderInteractiveWords(origEl, text) {
    if (!origEl) return;
    if (origEl.dataset.rawText === text && origEl.childNodes.length > 0) return;
    origEl.dataset.rawText = text;
    origEl.innerHTML = "";

    const raw = String(text || "").trim();
    if (!raw) return;

    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    const isMulti = lines.length >= 2 && lines.some((l) => l.startsWith("-") || l.startsWith("–") || l.startsWith("—"));

    if (isMulti) {
      lines.forEach((line, idx) => {
        const lineWrap = document.createElement("div");
        lineWrap.className = `vie-orig-dialogue-turn vie-speaker-${(idx % 2) + 1}`;
        const dashSpan = document.createElement("span");
        dashSpan.className = "vie-speaker-bullet";
        dashSpan.textContent = "- ";
        lineWrap.appendChild(dashSpan);

        const cleanLine = line.replace(/^[-–—]\s*/, "");
        const tokens = cleanLine.split(/(\s+)/).filter(Boolean);
        for (const tok of tokens) {
          if (/^\s+$/.test(tok)) {
            lineWrap.appendChild(document.createTextNode(tok));
            continue;
          }
          const cleanWord = tok.replace(/^[.,!?;:"“”'‘’()\[\]{}<>…\-♪♫♬]+|[.,!?;:"“”'‘’()\[\]{}<>…\-♪♫♬]+$/g, "");
          if (!cleanWord) {
            lineWrap.appendChild(document.createTextNode(tok));
            continue;
          }
          const span = document.createElement("span");
          span.className = "vie-word";
          span.dataset.word = cleanWord;
          span.textContent = tok;
          lineWrap.appendChild(span);
        }
        origEl.appendChild(lineWrap);
      });
    } else {
      const tokens = raw.split(/(\s+)/).filter(Boolean);
      for (const tok of tokens) {
        if (/^\s+$/.test(tok)) {
          origEl.appendChild(document.createTextNode(tok));
          continue;
        }
        const cleanWord = tok.replace(/^[.,!?;:"“”'‘’()\[\]{}<>…\-♪♫♬]+|[.,!?;:"“”'‘’()\[\]{}<>…\-♪♫♬]+$/g, "");
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
  }

  function renderStableViText(viEl, text) {
    if (!viEl) return;
    if (viEl.dataset.rawText === text) return;
    viEl.dataset.rawText = text;

    const raw = String(text || "").trim();
    if (!raw) {
      viEl.textContent = "";
      return;
    }

    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    const isMulti = lines.length >= 2 && lines.some((l) => l.startsWith("-") || l.startsWith("–") || l.startsWith("—"));

    if (isMulti) {
      viEl.innerHTML = "";
      lines.forEach((line, idx) => {
        const turnDiv = document.createElement("div");
        turnDiv.className = `vie-dialogue-turn vie-speaker-${(idx % 2) + 1}`;
        const cleanContent = line.replace(/^[-–—]\s*/, "").trim();
        turnDiv.innerHTML = `<span class="vie-speaker-bullet" title="Người nói ${idx + 1}">- </span><span class="vie-speaker-content">${escapeHtml(cleanContent)}</span>`;
        viEl.appendChild(turnDiv);
      });
    } else {
      viEl.textContent = raw;
    }
  }

  const PLAYER_WRAPPER_SELECTORS = [
    ".html5-video-player",
    ".video-js",
    ".jwplayer",
    ".plyr",
    ".shaka-video-container",
    ".vp-video-wrapper",
    "[data-purpose='video-player']",
    ".rc-VideoMiniPlayer",
    ".bpx-player-video-area",
    ".watch-video",
    ".art-video-player",
    ".dplayer",
    // Facebook Video Containers (Feed, Watch, Reels, Modal Dialog)
    "div[data-video-id]",
    "div[data-pagelet*='Video']",
    "div[role='dialog']",
    "div[data-visualcompletion='video-renderer']",
    "div.x1y1aw1k",
    // Twitter / X
    "div[data-testid='videoPlayer']",
    "div[data-testid='videoComponent']",
    // TikTok & Instagram
    "div[data-e2e='feed-video']",
    "div[class*='DivVideoContainer']",
    "div[class*='video-player-container']",
    // Classic Cinema & Streaming Wrappers (Easter Egg Support: rổ phim & phim mới)
    "#box-player",
    ".watch-player"
  ].join(", ");

  function getContainer(video) {
    if (!video) return document.body;
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsEl && fsEl !== video && fsEl.contains(video)) {
      return fsEl;
    }
    const knownPlayer = video.closest(PLAYER_WRAPPER_SELECTORS);
    if (knownPlayer && knownPlayer !== document.body) {
      if (window.getComputedStyle(knownPlayer).position === "static") {
        knownPlayer.style.position = "relative";
      }
      return knownPlayer;
    }

    // Tự động leo ngược DOM tìm wrapper cha có kích thước ôm sát video
    let parent = video.parentElement;
    let candidate = parent;
    let depth = 0;
    while (parent && parent !== document.body && depth < 4) {
      const pRect = parent.getBoundingClientRect();
      const vRect = video.getBoundingClientRect();
      if (pRect.width > 0 && Math.abs(pRect.width - vRect.width) < 80 && Math.abs(pRect.height - vRect.height) < 100) {
        candidate = parent;
        break;
      }
      parent = parent.parentElement;
      depth++;
    }

    const finalContainer = candidate || video.parentElement || document.body;
    if (finalContainer && finalContainer !== document.body && window.getComputedStyle(finalContainer).position === "static") {
      finalContainer.style.position = "relative";
    }
    return finalContainer;
  }

  const findBestVideoContainer = getContainer;

  function applySettingsToDOM(settings) {
    const isEnabled = Boolean(settings?.enabled);

    document.querySelectorAll(PLAYER_WRAPPER_SELECTORS).forEach((player) => {
      player.classList.toggle("vie-player-active", isEnabled);
      player.classList.toggle("vie-yt-active", isEnabled);
    });

    document.querySelectorAll("video").forEach((video) => {
      const container = getContainer(video);
      if (container) {
        container.classList.toggle("vie-player-active", isEnabled);
        container.classList.toggle("vie-yt-active", isEnabled);
      }
      if (video.textTracks) {
        for (const track of video.textTracks) {
          if (track.kind !== "subtitles" && track.kind !== "captions") continue;
          if (!isEnabled && track._vieWasShowing && track.mode === "hidden") {
            track.mode = "showing";
          } else if (isEnabled && track.mode === "showing") {
            track._vieWasShowing = true;
            track.mode = "hidden";
          }
        }
      }
    });

    const showSecondary = Boolean(settings?.dualSub) && settings?.secondaryLang !== "none";
    document.querySelectorAll(".vie-overlay").forEach((overlay) => {
      if (!isEnabled) {
        overlay.classList.add("vie-hidden");
      }
      const origEl = overlay.querySelector(".vie-orig");
      if (origEl) {
        origEl.style.display = showSecondary ? "block" : "none";
      }
      applyOverlayVisualStyle(overlay, settings);
    });
  }

  function getOrCreateOverlay(video, settings) {
    const container = getContainer(video);
    if (window.getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }

    if (settings?.enabled) {
      container.classList.add("vie-player-active", "vie-yt-active");
      const player = video.closest(PLAYER_WRAPPER_SELECTORS);
      if (player) player.classList.add("vie-player-active", "vie-yt-active");
    }

    let overlay = video._vieOverlay;
    if (overlay && overlay.isConnected) {
      if (overlay.parentElement !== container) {
        container.appendChild(overlay);
      }
    } else {
      overlay =
        container.querySelector(":scope > .vie-overlay") ||
        (getContainer(video)?.querySelector(".vie-overlay") || null);

      if (overlay) {
        if (overlay.parentElement !== container) {
          container.appendChild(overlay);
        }
      } else {
        overlay = document.createElement("div");
        overlay.className = "vie-overlay vie-hidden";

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
          <button type="button" class="vie-learn-btn vie-drag-handle" title="Giữ & kéo để đổi vị trí phụ đề (Double-click để đặt lại)">
            ⠿ Vị trí
          </button>
          <button type="button" class="vie-learn-btn vie-learn-scene-btn" title="Xem giải thích ngữ cảnh, phân tích câu & cách dùng thực tế">
            🎓 Ngữ cảnh
          </button>
          <button type="button" class="vie-learn-btn vie-learn-ocr-btn" title="Quét chữ trên màn hình (Visual OCR) & dịch bối cảnh phim (biển hiệu, tin nhắn, tài liệu...)">
            🔍 OCR
          </button>
          <button type="button" class="vie-learn-btn vie-learn-speak-all-btn" title="Nghe phát âm cả câu">
            🔊 Nghe
          </button>
          <button type="button" class="vie-learn-btn vie-learn-copy-btn" title="Sao chép phụ đề hiện tại">
            📋 Copy
          </button>
          <button type="button" class="vie-learn-btn vie-learn-srt-btn" title="Tải toàn bộ phụ đề song ngữ định dạng .SRT">
            📥 SRT
          </button>
          <div class="vie-sync-group" title="Tự động đối chiếu âm thanh hoặc tự chỉnh độ lệch phụ đề / lyrics">
            <span class="vie-sync-label">⏱️</span>
            <button type="button" class="vie-sync-btn vie-sync-minus" title="Chạy sớm hơn 0.5s (giảm độ trễ, Shift click để nhảy 1s)">⏪ -0.5s</button>
            <span class="vie-sync-val">0s</span>
            <button type="button" class="vie-sync-btn vie-sync-plus" title="Trễ lại 0.5s (nếu sub chạy trước tiếng nhạc, Shift click để nhảy 1s)">+0.5s ⏩</button>
            <button type="button" class="vie-sync-btn vie-sync-auto" title="Tự động đối chiếu âm thanh thực tế và lời bài hát để căn chuẩn nhịp">🎯 Tự căn</button>
            <button type="button" class="vie-sync-btn vie-sync-reset" title="Đặt lại độ lệch về 0s" style="display:none;">↺</button>
          </div>
          <span class="vie-learn-tip" title="Vietsub mượt như hồi còn cày phim mới đêm khuya, nhặt trọn vào rổ phim của bạn 🍿">💡 Bấm từ bất kỳ để tra từ điển</span>
        `;

        overlay.appendChild(origLine);
        overlay.appendChild(viLine);
        overlay.appendChild(learnBar);
        container.appendChild(overlay);

        overlay._vieSettings = settings;
        bindOverlayEvents(video, overlay, origLine, viLine, dictCard, learnBar, settings);
      }
      video._vieOverlay = overlay;
    }

    // Chỉ dọn overlay duplicate trong cùng container (hỗ trợ trang nhiều video như Facebook Feed)
    container.querySelectorAll(":scope > .vie-overlay").forEach((el) => {
      if (el !== overlay) {
        el.remove();
      }
    });

    applyOverlayVisualStyle(overlay, settings);
    return overlay;
  }

  function applyOverlayVisualStyle(overlay, settings) {
    if (!overlay || !settings) return;
    overlay._vieSettings = settings;
    const fontStack = root.VieStorage?.FONT_FAMILY_MAP[settings.subFont] || root.VieStorage?.FONT_FAMILY_MAP.default;
    const scale = Math.max(0.6, Math.min(2.0, (Number(settings.subSize) || 100) / 100));
    const bottomPos = Math.max(2, Math.min(82, Number(settings.subBottomPos) || 12));
    const widthPct = Math.max(30, Math.min(100, Number(settings.overlayWidth) || 72));

    overlay.style.setProperty("--vie-font-family", fontStack);
    overlay.style.setProperty("--vie-scale", String(scale));
    overlay.style.setProperty("--vie-w", `${widthPct}%`);
    const isYouTube = location.hostname.includes("youtube.com");
    let safeBottom = bottomPos;
    if (isYouTube && !overlay.dataset.customDragged) {
      const player = overlay.closest(".html5-video-player, .ytd-player, #movie_player");
      const controls = player?.querySelector(".ytp-chrome-bottom, .ytp-control-bar, .ytp-progress-bar-container");
      if (controls) {
        const playerRect = player.getBoundingClientRect();
        const controlsRect = controls.getBoundingClientRect();
        if (playerRect.height > 0 && controlsRect.height > 0) {
          const controlsFromBottom = Math.max(0, playerRect.bottom - controlsRect.top);
          const controlsPercent = (controlsFromBottom / playerRect.height) * 100;
          safeBottom = Math.max(bottomPos, Math.min(60, controlsPercent + 9));
        }
      } else {
        safeBottom = Math.max(bottomPos, 18);
      }
    }
    overlay.style.setProperty("--vie-bottom", `${safeBottom}%`);
    overlay.style.setProperty("--vie-primary-color", settings.subColor || "#fef08a");
    overlay.style.setProperty("--vie-second-color", settings.subSecondColor || "#e2e8f0");
    overlay.setAttribute("data-bg-style", settings.subBgStyle || "toad");
  }

  function hideOverlay(video) {
    const container = getContainer(video);
    const overlay = video._vieOverlay || container?.querySelector(".vie-overlay") || video.parentElement?.querySelector(".vie-overlay");
    if (overlay && !overlay.classList.contains("vie-dict-open") && !overlay._isDictPinned) {
      overlay.classList.add("vie-hidden");
    }
  }

  function bindOverlayEvents(video, overlay, origEl, viEl, dictCard, learnBar, settings) {
    overlay.addEventListener("mouseenter", () => {
      const curSettings = overlay._vieSettings || settings;
      if (curSettings?.hoverPauseDict !== false && !video.paused && !video.ended) {
        overlay._pausedByHover = true;
        video.pause();
      }
    });

    overlay.addEventListener("mouseleave", () => {
      if (overlay._isDictPinned) return;
      dictCard.classList.add("vie-dict-hidden");
      overlay.classList.remove("vie-dict-open");
      overlay.querySelectorAll(".vie-word.vie-word-active").forEach((el) => el.classList.remove("vie-word-active"));
      if (overlay._pausedByHover) {
        overlay._pausedByHover = false;
        video.play().catch(() => {});
      }
    });

    origEl.addEventListener("click", (e) => {
      const wordSpan = e.target.closest(".vie-word");
      if (!wordSpan) return;
      e.stopPropagation();
      e.preventDefault();
      const word = wordSpan.dataset.word || wordSpan.textContent.trim();
      const sentence = origEl.dataset.rawText || origEl.textContent.trim();
      const viText = viEl.textContent.trim();
      if (!word) return;
      playUiSound("word");
      speakWord(word);
      openWordLookup(video, overlay, dictCard, word, sentence, viText, wordSpan);
    });

    learnBar.querySelector(".vie-learn-scene-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      const sentence = origEl.dataset.rawText || origEl.textContent.trim();
      const viText = viEl.textContent.trim();
      playUiSound("pop");
      openSceneExplanation(video, overlay, dictCard, sentence, viText, "");
    });

    learnBar.querySelector(".vie-learn-speak-all-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      const sentence = origEl.dataset.rawText || origEl.textContent.trim();
      if (sentence) speakWord(sentence);
    });

    learnBar.querySelector(".vie-sync-minus")?.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      playUiSound("tick");
      root.VieCaptions?.adjustSubSyncOffset(video, -0.5, e.shiftKey);
    });

    learnBar.querySelector(".vie-sync-plus")?.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      playUiSound("tick");
      root.VieCaptions?.adjustSubSyncOffset(video, +0.5, e.shiftKey);
    });

    learnBar.querySelector(".vie-sync-auto")?.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      playUiSound("chime");
      root.VieCaptions?.autoAlignSubtitleWithAudio(video);
    });

    learnBar.querySelector(".vie-learn-ocr-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      playUiSound("pop");
      triggerVisualSceneOCR(video, overlay);
    });

    learnBar.querySelector(".vie-sync-reset")?.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      playUiSound("tick");
      root.VieCaptions?.resetSubSyncOffset(video);
    });

    const copyBtn = learnBar.querySelector(".vie-learn-copy-btn");
    copyBtn?.addEventListener("click", async (e) => {
      e.stopPropagation();
      e.preventDefault();
      const orig = (origEl.dataset.rawText || origEl.textContent || "").trim();
      const vi = (viEl.textContent || "").trim();
      const payload = [orig, vi].filter(Boolean).join("\n");
      if (!payload) return;
      try {
        await navigator.clipboard.writeText(payload);
        playUiSound("pop");
        const prev = copyBtn.textContent;
        copyBtn.textContent = "✓ Đã copy";
        setTimeout(() => { copyBtn.textContent = prev; }, 1200);
      } catch {}
    });

    learnBar.querySelector(".vie-learn-srt-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      playUiSound("chime");
      root.VieContent?.exportBilingualSrt?.(video);
    });

    const dragHandle = learnBar.querySelector(".vie-drag-handle");
    if (dragHandle) {
      let dragging = false;
      let startX = 0;
      let startY = 0;
      let origBottomPct = 12;
      let origLeftPct = 50;
      let lastBottomPct = 12;

      dragHandle.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        e.preventDefault();
        dragging = true;
        dragHandle.setPointerCapture?.(e.pointerId);
        startX = e.clientX;
        startY = e.clientY;
        const container = getContainer(video);
        const cRect = container.getBoundingClientRect();
        const ovRect = overlay.getBoundingClientRect();
        origBottomPct = cRect.height > 0 ? ((cRect.bottom - ovRect.bottom) / cRect.height) * 100 : 12;
        origLeftPct = parseFloat(overlay.style.left) || 50;
        lastBottomPct = origBottomPct;
      });

      dragHandle.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const container = getContainer(video);
        const cRect = container.getBoundingClientRect();
        if (!cRect.width || !cRect.height) return;
        const dyPct = ((startY - e.clientY) / cRect.height) * 100;
        const dxPct = ((e.clientX - startX) / cRect.width) * 100;
        lastBottomPct = Math.max(4, Math.min(82, Math.round((origBottomPct + dyPct) * 10) / 10));
        const nextLeftPct = Math.max(15, Math.min(85, Math.round((origLeftPct + dxPct) * 10) / 10));
        overlay.dataset.customDragged = "1";
        overlay.style.setProperty("--vie-bottom", `${lastBottomPct}%`);
        overlay.style.left = `${nextLeftPct}%`;
      });

      const endDrag = (e) => {
        if (!dragging) return;
        dragging = false;
        try { dragHandle.releasePointerCapture?.(e.pointerId); } catch {}
        root.VieStorage?.setSettings?.({ subBottomPos: String(Math.round(lastBottomPct)) });
      };
      dragHandle.addEventListener("pointerup", endDrag);
      dragHandle.addEventListener("pointercancel", endDrag);
      dragHandle.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        delete overlay.dataset.customDragged;
        overlay.style.left = "50%";
        overlay.style.setProperty("--vie-bottom", "12%");
        root.VieStorage?.setSettings?.({ subBottomPos: "12" });
        root.VieCaptions?.showSyncToast?.(video, "↺ Đã đặt lại vị trí phụ đề mặc định");
      });
    }
  }

  async function triggerVisualSceneOCR(video, overlay) {
    if (!overlay) overlay = video?._vieOverlay;
    if (!overlay) return;
    const dictCard = overlay.querySelector(".vie-dict-card");
    if (!dictCard) return;

    overlay._isDictPinned = true;
    overlay.classList.add("vie-dict-open");
    dictCard.classList.remove("vie-dict-hidden");
    dictCard.classList.add("vie-scene-expanded");
    dictCard.innerHTML = `
      <div class="vie-dict-header">
        <div class="vie-dict-title">
          <span class="vie-dict-word">🔍 Đang quét chữ trên màn hình (Visual OCR)...</span>
          <span class="vie-dict-loading">🤖 AI đang phân tích bối cảnh &amp; dịch đa hướng...</span>
        </div>
        <button type="button" class="vie-dict-close" title="Đóng">✕</button>
      </div>
    `;

    dictCard.querySelector(".vie-dict-close")?.addEventListener("click", () => {
      closeDictAndCoach(video, overlay, dictCard, false);
    });

    let imageBase64 = "";
    // 1. Vẽ canvas trực tiếp từ video element
    try {
      const w = Math.min(video.videoWidth || 960, 960);
      const h = Math.min(video.videoHeight || 540, 540);
      if (w > 0 && h > 0) {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
        imageBase64 = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
      }
    } catch {
      // CORS tainted canvas
    }

    // 2. Dự phòng chụp tab nếu canvas bị CORS
    if (!imageBase64) {
      try {
        const tabRes = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: "CAPTURE_VISIBLE_TAB" }, resolve);
        });
        if (tabRes?.ok && tabRes.imageBase64) {
          imageBase64 = tabRes.imageBase64;
        }
      } catch {}
    }

    if (!imageBase64) {
      dictCard.innerHTML = `
        <div class="vie-dict-header">
          <span class="vie-dict-word">⚠️ Không thể chụp ảnh màn hình</span>
          <button type="button" class="vie-dict-close">✕</button>
        </div>
        <div class="vie-dict-meaning">Vui lòng đảm bảo video đang mở trên tab và thử lại nhé!</div>
      `;
      dictCard.querySelector(".vie-dict-close")?.addEventListener("click", () => closeDictAndCoach(video, overlay, dictCard, false));
      return;
    }

    const videoTitle = root.VieCaptions?.getVideoTitle?.() || "";
    chrome.runtime.sendMessage({
      type: "SCAN_SCREEN_TEXT",
      imageBase64,
      videoTitle
    }, (res) => {
      if (chrome.runtime.lastError || !res?.ok) {
        const errText = res?.message || res?.error || "Không thể phân tích chữ trên khung hình lúc này.";
        dictCard.innerHTML = `
          <div class="vie-dict-header">
            <span class="vie-dict-word">⚠️ Quét chữ màn hình</span>
            <button type="button" class="vie-dict-close">✕</button>
          </div>
          <div class="vie-dict-meaning">${escapeHtml(errText)}</div>
        `;
        dictCard.querySelector(".vie-dict-close")?.addEventListener("click", () => closeDictAndCoach(video, overlay, dictCard, false));
        return;
      }

      if (!res.hasText) {
        dictCard.innerHTML = `
          <div class="vie-dict-header">
            <span class="vie-dict-word">🔍 Kết quả quét thị giác</span>
            <button type="button" class="vie-dict-close">✕</button>
          </div>
          <div class="vie-dict-meaning" style="color: #cbd5e1; font-style: italic;">
            Không phát hiện thấy chữ, biển hiệu hay văn bản nào đáng kể trên khung hình hiện tại. Hãy thử lại ở cảnh có biển báo, tin nhắn điện thoại hoặc chữ chạy nhé!
          </div>
        `;
        dictCard.querySelector(".vie-dict-close")?.addEventListener("click", () => closeDictAndCoach(video, overlay, dictCard, false));
        return;
      }

      dictCard.innerHTML = `
        <div class="vie-dict-header">
          <div class="vie-dict-title">
            <span class="vie-dict-word">🖼️ ${escapeHtml(res.sceneType || "Chữ trên màn hình")}</span>
            <button type="button" class="vie-dict-speak" title="Nghe phát âm chữ gốc">🔊</button>
          </div>
          <button type="button" class="vie-dict-close" title="Đóng">✕</button>
        </div>
        <div class="vie-dict-meaning" style="font-size: 15px; margin-bottom: 8px;">
          <strong style="color: #93c5fd;">Gốc:</strong> "${escapeHtml(res.orig || "")}"
        </div>
        <div class="vie-dict-meaning" style="font-size: 16px; color: #fef08a; font-weight: 600; margin-bottom: 8px;">
          <strong style="color: #86efac;">Dịch:</strong> ${escapeHtml(res.vi || "")}
        </div>
        ${res.nuance ? `
          <div class="vie-coach-box" style="margin-top: 10px; border-left: 3px solid #38bdf8; background: rgba(56, 189, 248, 0.1);">
            <div class="vie-coach-label" style="color: #38bdf8;">🎬 Bối Cảnh Phim &amp; Ý Nghĩa:</div>
            <div class="vie-coach-val">${escapeHtml(res.nuance)}</div>
          </div>
        ` : ""}
      `;

      dictCard.querySelector(".vie-dict-speak")?.addEventListener("click", () => {
        if (res.orig) speakWord(res.orig);
      });
      dictCard.querySelector(".vie-dict-close")?.addEventListener("click", () => {
        closeDictAndCoach(video, overlay, dictCard, false);
      });
    });
  }

  function closeDictAndCoach(video, overlayOrResume, maybeDictCard, maybeResume) {
    let overlay = null;
    let dictCard = null;
    let resumeVideo = false;

    if (typeof overlayOrResume === "boolean") {
      resumeVideo = overlayOrResume;
    } else if (overlayOrResume && overlayOrResume.nodeType) {
      overlay = overlayOrResume;
    }

    if (maybeDictCard && maybeDictCard.nodeType) {
      dictCard = maybeDictCard;
    }
    if (typeof maybeResume === "boolean") {
      resumeVideo = maybeResume;
    }

    if (!overlay && video) overlay = video._vieOverlay;
    if (!dictCard && overlay) dictCard = overlay.querySelector(".vie-dict-card");

    if (overlay) {
      overlay._isDictPinned = false;
      overlay.classList.remove("vie-dict-open");
      overlay.querySelectorAll(".vie-word.vie-word-active").forEach((el) => el.classList.remove("vie-word-active"));
    }
    if (dictCard) {
      dictCard.classList.add("vie-dict-hidden");
      dictCard.classList.remove("vie-scene-expanded");
    }

    // Quét dọn toàn bộ card hoặc duplicate còn sót trên DOM
    document.querySelectorAll(".vie-dict-card").forEach((card) => {
      card.classList.add("vie-dict-hidden");
      card.classList.remove("vie-scene-expanded");
    });
    document.querySelectorAll(".vie-overlay").forEach((ov) => {
      if (ov !== overlay) {
        ov.remove();
      } else {
        ov._isDictPinned = false;
        ov.classList.remove("vie-dict-open");
        ov.querySelectorAll(".vie-word.vie-word-active").forEach((el) => el.classList.remove("vie-word-active"));
      }
    });

    if (resumeVideo && video && video.paused && overlay?._pausedByHover) {
      overlay._pausedByHover = false;
      video.play().catch(() => {});
    }
  }

  document.addEventListener(
    "pointerdown",
    (e) => {
      if (e.target && (e.target.closest(".vie-overlay") || e.target.closest(".vie-toad-audio-btn"))) {
        return;
      }
      document.querySelectorAll("video").forEach((vid) => {
        if (vid._vieOverlay?._isDictPinned) {
          closeDictAndCoach(vid, false);
        }
      });
    },
    { passive: true }
  );

  function openWordLookup(video, overlay, dictCard, word, sentence, viText, wordSpan) {
    if (overlay) {
      overlay._isDictPinned = true;
      overlay.classList.add("vie-dict-open");
      overlay.querySelectorAll(".vie-word.vie-word-active").forEach((el) => el.classList.remove("vie-word-active"));
    }
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

    chrome.runtime.sendMessage({ type: "LOOKUP_WORD", word, sentence }, (res) => {
      if (chrome.runtime.lastError || !res?.ok) {
        dictCard.innerHTML = `
          <div class="vie-dict-header">
            <span class="vie-dict-word">${escapeHtml(word)}</span>
            <button type="button" class="vie-dict-close">✕</button>
          </div>
          <div class="vie-dict-meaning">Không thể tra từ lúc này.</div>
        `;
        dictCard.querySelector(".vie-dict-close")?.addEventListener("click", () => closeDictAndCoach(video, overlay, dictCard, false));
        return;
      }

      const posClass = getPosClass(res.pos);
      const posVariants = Array.isArray(res.posVariants) ? res.posVariants : [];
      const examplesList = Array.isArray(res.examples)
        ? res.examples.map((ex) => (typeof ex === "string" ? { orig: ex, trans: "" } : ex))
        : [];
      const collocationsList = Array.isArray(res.collocations)
        ? res.collocations.filter(Boolean)
        : typeof res.collocations === "string"
        ? res.collocations.split(",").map((s) => s.trim()).filter(Boolean)
        : Array.isArray(res.synonyms)
        ? res.synonyms.filter(Boolean)
        : [];

      dictCard.innerHTML = `
        <div class="vie-dict-header">
          <div class="vie-dict-title">
            <span class="vie-dict-word">${escapeHtml(res.word || word)}</span>
            ${res.pron ? `<span class="vie-dict-pron">/${escapeHtml(res.pron.replace(/^\/|\/$/g, ""))}/</span>` : ""}
            ${res.pos ? `<span class="vie-dict-pos ${posClass}">${escapeHtml(res.pos)}</span>` : ""}
            ${res.cefr ? `<span class="vie-dict-cefr">${escapeHtml(res.cefr)}</span>` : ""}
            <button type="button" class="vie-dict-speak" title="Nghe phát âm">🔊</button>
          </div>
          <div class="vie-dict-actions">
            <button type="button" class="vie-dict-save" title="Lưu vào Sổ từ vựng">⭐ Lưu từ</button>
            <button type="button" class="vie-dict-close" title="Đóng">✕</button>
          </div>
        </div>
        <div class="vie-dict-meaning">🎯 ${escapeHtml(res.meaning || "")}</div>
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
          collocationsList.length > 0
            ? `
        <div class="vie-dict-synonyms-box">
          <span class="vie-dict-syn-label">🧩 Cụm đi kèm:</span>
          <span class="vie-dict-syn-tags">
            ${collocationsList.map((c) => `<span class="vie-dict-syn-tag">${escapeHtml(c)}</span>`).join("")}
          </span>
        </div>`
            : ""
        }
        ${res.note ? `<div class="vie-dict-note">💡 ${escapeHtml(res.note)}</div>` : ""}
        ${res.funFact ? `<div class="vie-dict-funfact">✨ ${escapeHtml(res.funFact)}</div>` : ""}
        <button type="button" class="vie-dict-more-btn">
          🎓 Xem thêm: Tại sao cả câu dịch như vậy &amp; Cách dùng thực tế ➔
        </button>
      `;

      dictCard.querySelectorAll(".vie-dict-mini-speak").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const t = btn.dataset.text;
          if (t) speakWord(t);
        });
      });

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
    });
  }

  function openSceneExplanation(video, overlay, dictCard, sentence, viText, focusWord = "") {
    if (overlay) {
      overlay._isDictPinned = true;
      overlay.classList.add("vie-dict-open");
    }
    dictCard.classList.remove("vie-dict-hidden");
    dictCard.classList.add("vie-scene-expanded");

    dictCard.innerHTML = `
      <div class="vie-dict-header">
        <div class="vie-dict-title">
          <span class="vie-dict-word">🎓 Phân tích ngữ cảnh thực tế</span>
        </div>
        <button type="button" class="vie-dict-close" title="Đóng">✕</button>
      </div>
      <div class="vie-scene-sentence-box">
        <div class="vie-scene-orig">"${escapeHtml(sentence)}"</div>
        <div class="vie-scene-vi">➔ ${escapeHtml(viText)}</div>
      </div>
      <div class="vie-dict-loading">⏳ Cóc đang phân tích ngữ cảnh, sắc thái & cách dùng thực tế...</div>
    `;

    dictCard.querySelector(".vie-dict-close")?.addEventListener("click", (e) => {
      e.stopPropagation();
      closeDictAndCoach(video, overlay, dictCard, false);
    });

    chrome.runtime.sendMessage({ type: "EXPLAIN_SCENE", sentence, vi: viText, focusWord }, (res) => {
      if (chrome.runtime.lastError || !res?.ok) {
        const errMsg = res?.error || chrome.runtime.lastError?.message || "Không thể phân tích ngữ cảnh lúc này.";
        dictCard.innerHTML = `
          <div class="vie-dict-header">
            <span class="vie-dict-word">🎓 Phân tích ngữ cảnh</span>
            <button type="button" class="vie-dict-close">✕</button>
          </div>
          <div class="vie-dict-meaning">⚠️ ${escapeHtml(errMsg)}</div>
        `;
        dictCard.querySelector(".vie-dict-close")?.addEventListener("click", () => closeDictAndCoach(video, overlay, dictCard, false));
        return;
      }

      const keyPoints = Array.isArray(res.keyPoints) ? res.keyPoints.filter(Boolean) : [];
      dictCard.innerHTML = `
        <div class="vie-dict-header">
          <div class="vie-dict-title">
            <span class="vie-dict-word">🎓 Phân tích ngữ cảnh &amp; Cách dùng</span>
          </div>
          <button type="button" class="vie-dict-close" title="Đóng">✕</button>
        </div>
        <div class="vie-scene-sentence-box">
          <div class="vie-scene-orig">"${escapeHtml(sentence)}"</div>
          <div class="vie-scene-vi">➔ ${escapeHtml(viText)}</div>
          ${res.literal ? `<div class="vie-scene-literal">📖 Sát cấu trúc gốc: "${escapeHtml(res.literal)}"</div>` : ""}
        </div>
        ${res.nuance ? `<div class="vie-scene-block"><div class="vie-scene-label">🎭 Sắc thái &amp; Cảm xúc:</div><div class="vie-scene-text">${escapeHtml(res.nuance)}</div></div>` : ""}
        ${res.realLife ? `<div class="vie-scene-block"><div class="vie-scene-label">🗣️ Người bản xứ dùng thực tế thế nào:</div><div class="vie-scene-text">${escapeHtml(res.realLife)}</div></div>` : ""}
        ${keyPoints.length > 0 ? `<div class="vie-scene-block"><div class="vie-scene-label">🔑 Điểm đáng nhớ:</div><ul class="vie-scene-keypoints">${keyPoints.map((kp) => `<li>${escapeHtml(kp)}</li>`).join("")}</ul></div>` : ""}
      `;

      dictCard.querySelector(".vie-dict-close")?.addEventListener("click", (e) => {
        e.stopPropagation();
        closeDictAndCoach(video, overlay, dictCard, false);
      });
    });
  }

  // Floating Quick-Translate Tooltip / Selection Bubble for highlighted text
  let selectionBubbleEl = null;

  function ensureSelectionBubble() {
    if (selectionBubbleEl && document.body.contains(selectionBubbleEl)) return selectionBubbleEl;
    selectionBubbleEl = document.createElement("div");
    selectionBubbleEl.id = "vie-selection-bubble";
    selectionBubbleEl.className = "vie-selection-bubble vie-bubble-hidden";
    document.body.appendChild(selectionBubbleEl);
    return selectionBubbleEl;
  }

  function positionSelectionBubble(el, coords, fallbackW, fallbackH) {
    const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    const scrollX = typeof window !== "undefined" ? window.scrollX : 0;
    const scrollY = typeof window !== "undefined" ? window.scrollY : 0;
    const pad = 12;
    const boxW = el.offsetWidth || fallbackW || 280;
    const boxH = el.offsetHeight || fallbackH || 160;

    // CSS .vie-selection-bubble uses transform: translate(-50%, -100%),
    // so visual left = left - boxW/2, visual top = top - boxH, visual bottom = top.
    const minLeft = scrollX + boxW / 2 + pad;
    const maxLeft = Math.max(minLeft, scrollX + vw - boxW / 2 - pad);
    const safeLeft = Math.max(minLeft, Math.min(maxLeft, coords.x));

    let anchorTop = coords.y - 14;
    if (anchorTop - boxH < scrollY + pad) {
      anchorTop = Math.min(scrollY + vh - pad, coords.y + 24 + boxH);
    }
    const minTop = scrollY + boxH + pad;
    const maxTop = Math.max(minTop, scrollY + vh - pad);
    const safeTop = Math.max(minTop, Math.min(maxTop, anchorTop));

    el.style.left = `${safeLeft}px`;
    el.style.top = `${safeTop}px`;
  }

  function showSelectionBubble(text, coords, onAction) {
    const el = ensureSelectionBubble();
    el.innerHTML = `
      <button type="button" class="vie-bubble-btn" title="Dịch nhanh văn bản">
        <img src="${chrome.runtime.getURL("assets/icon48.png")}" alt="Toad">
        <span>Dịch nhanh</span>
      </button>
    `;

    el.classList.remove("vie-bubble-hidden");
    positionSelectionBubble(el, coords, 120, 36);

    el.querySelector(".vie-bubble-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      onAction(text, coords);
    });
  }

  function hideSelectionBubble() {
    if (selectionBubbleEl) {
      selectionBubbleEl.classList.add("vie-bubble-hidden");
    }
  }

  function showQuickTranslatePopup(text, coords, result) {
    const el = ensureSelectionBubble();
    const transText = result?.vi || result?.meaning || "Đang dịch...";
    const provMap = {
      gemini: "Gemini",
      groq: "Groq",
      ollama: "Local AI",
      openai: "OpenAI",
      gtx: "Google Free"
    };
    const provLabel = result?.provider ? (provMap[result.provider] || result.provider) : "";
    const wordCount = String(text || "").trim().split(/\s+/).length;
    const showDictBtn = Boolean(result?.isSingleWord || wordCount <= 3) && !transText.startsWith("⏳");

    el.innerHTML = `
      <div class="vie-quick-popup">
        <div class="vie-quick-header">
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="vie-quick-title">🐸 VIE-Translate</span>
            ${provLabel ? `<span class="vie-quick-provider">${escapeHtml(provLabel)}</span>` : ""}
          </div>
          <div style="display:flex;align-items:center;gap:4px;">
            <button type="button" class="vie-quick-mini-btn vie-quick-speak" title="Nghe phát âm">🔊</button>
            <button type="button" class="vie-quick-mini-btn vie-quick-copy" title="Sao chép bản dịch">📋</button>
            <button type="button" class="vie-quick-close" title="Đóng">✕</button>
          </div>
        </div>
        <div class="vie-quick-src">${escapeHtml(text)}</div>
        <div class="vie-quick-trans">${escapeHtml(transText)}</div>
        ${showDictBtn ? `
          <div class="vie-quick-actions">
            <button type="button" class="vie-quick-dict-btn">📖 Tra từ điển chi tiết</button>
          </div>
          <div class="vie-quick-dict-box" style="display:none;"></div>
        ` : ""}
      </div>
    `;

    el.classList.remove("vie-bubble-hidden");
    positionSelectionBubble(el, coords, 290, 175);

    el.querySelector(".vie-quick-close")?.addEventListener("click", () => {
      hideSelectionBubble();
    });

    el.querySelector(".vie-quick-speak")?.addEventListener("click", (e) => {
      e.stopPropagation();
      speakWord(text);
    });

    const copyBtn = el.querySelector(".vie-quick-copy");
    copyBtn?.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(transText);
        copyBtn.textContent = "✓";
        setTimeout(() => { copyBtn.textContent = "📋"; }, 1100);
      } catch {}
    });

    const dictBtn = el.querySelector(".vie-quick-dict-btn");
    const dictBox = el.querySelector(".vie-quick-dict-box");
    dictBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!dictBox) return;
      dictBtn.disabled = true;
      dictBtn.textContent = "⏳ Đang tra...";
      chrome.runtime.sendMessage({ type: "LOOKUP_WORD", word: text.trim(), sentence: text.trim() }, (res) => {
        if (chrome.runtime.lastError || !res?.ok) {
          dictBtn.textContent = "📖 Thử lại";
          dictBtn.disabled = false;
          return;
        }
        dictBtn.style.display = "none";
        dictBox.style.display = "block";
        const exList = Array.isArray(res.examples) ? res.examples.slice(0, 2) : [];
        dictBox.innerHTML = `
          <div class="vie-quick-dict-meta">
            ${res.pron ? `<span>/${escapeHtml(res.pron.replace(/^\/|\/$/g, ""))}/</span>` : ""}
            ${res.pos ? `<span class="vie-dict-pos ${getPosClass(res.pos)}">${escapeHtml(res.pos)}</span>` : ""}
            ${res.cefr ? `<span class="vie-dict-cefr">${escapeHtml(res.cefr)}</span>` : ""}
          </div>
          <div style="margin-top:4px;font-weight:600;color:#fef08a;">🎯 ${escapeHtml(res.meaning || transText)}</div>
          ${res.note ? `<div style="margin-top:4px;font-size:11.5px;color:#cbd5e1;">💡 ${escapeHtml(res.note)}</div>` : ""}
          ${exList.length ? `<div style="margin-top:5px;font-size:11.5px;color:#93c5fd;">${exList.map((ex) => `• ${escapeHtml(typeof ex === "string" ? ex : ex.orig || "")}`).join("<br>")}</div>` : ""}
          <button type="button" class="vie-dict-save" style="margin-top:6px;">⭐ Lưu từ</button>
        `;
        positionSelectionBubble(el, coords, 290, 220);
        const saveBtn = dictBox.querySelector(".vie-dict-save");
        saveBtn?.addEventListener("click", (ev) => {
          ev.stopPropagation();
          saveWordToVocab({ ...res, word: res.word || text.trim(), sentence: text.trim() }, saveBtn);
        });
      });
    });
  }

  root.VieDOM = {
    playUiSound,
    findBestVideoContainer,
    escapeHtml,
    getPosClass,
    formatSubtitleDecorations,
    detectLanguageForSpeech,
    getBestVoiceForLang,
    speakWord,
    saveWordToVocab,
    renderInteractiveWords,
    renderStableViText,
    getOrCreateOverlay,
    applyOverlayVisualStyle,
    hideOverlay,
    openWordLookup,
    openSceneExplanation,
    triggerVisualSceneOCR,
    closeDictAndCoach,
    showSelectionBubble,
    hideSelectionBubble,
    showQuickTranslatePopup,
    PLAYER_WRAPPER_SELECTORS,
    getContainer,
    applySettingsToDOM
  };
})(typeof self !== "undefined" ? self : this);
