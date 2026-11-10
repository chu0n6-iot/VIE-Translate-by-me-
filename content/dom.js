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

  function formatSubtitleDecorations(origText, viText, isMusicOrLyrics = false) {
    let finalOrig = (origText || "")
      .replace(/^(?:\*{1,2})?(?:ORIG(?:INAL)?|GỐC|TRANS(?:LATION)?|DỊCH)\s*:\s*(?:\*{1,2})?/i, "")
      .replace(/^(?:ORIG|GỐC|ORIGINAL)\b[:\s-]*/i, "")
      .trim();
    let finalVi = (viText || "")
      .replace(/^(?:\*{1,2})?(?:TRANS(?:LATION)?|DỊCH|VIETNAMESE|VI|ORIG(?:INAL)?|GỐC)\s*:\s*(?:\*{1,2})?/i, "")
      .replace(/^(?:ORIG|GỐC|ORIGINAL)\b[:\s-]*/i, "")
      .trim();
    if (!finalVi && !finalOrig) return { formattedOrig: finalOrig, formattedVi: finalVi };

    const hasMusicNote = /[♪♫♬]/.test(finalOrig) || /[♪♫♬]/.test(finalVi) || isMusicOrLyrics;
    if (hasMusicNote) {
      if (finalOrig && !finalOrig.startsWith("♪") && !finalOrig.startsWith("♫")) finalOrig = `♪ ${finalOrig}`;
      if (finalOrig && !finalOrig.endsWith("♪") && !finalOrig.endsWith("♫")) finalOrig = `${finalOrig} ♪`;
      if (finalVi && !finalVi.startsWith("♪") && !finalVi.startsWith("♫")) finalVi = `♪ ${finalVi}`;
      if (finalVi && !finalVi.endsWith("♪") && !finalVi.endsWith("♫")) finalVi = `${finalVi} ♪`;
    }

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

    const tokens = (text || "").split(/(\s+)/).filter(Boolean);
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

  function renderStableViText(viEl, text) {
    if (!viEl) return;
    if (viEl.textContent === text) return;
    viEl.textContent = text;
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
    "article"
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

    document.querySelectorAll(".vie-overlay").forEach((overlay) => {
      if (!isEnabled) {
        overlay.classList.add("vie-hidden");
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
          <button type="button" class="vie-learn-btn vie-learn-scene-btn" title="Xem giải thích ngữ cảnh, phân tích câu & cách dùng thực tế">
            🎓 Xem thêm: Ngữ cảnh &amp; Cách dùng thực tế
          </button>
          <button type="button" class="vie-learn-btn vie-learn-speak-all-btn" title="Nghe phát âm cả câu">
            🔊 Nghe câu
          </button>
          <div class="vie-sync-group" title="Tự động đối chiếu âm thanh hoặc tự chỉnh độ lệch phụ đề / lyrics">
            <span class="vie-sync-label">⏱️ Lệch:</span>
            <button type="button" class="vie-sync-btn vie-sync-minus" title="Chạy sớm hơn 0.5s (giảm độ trễ, Shift click để nhảy 1s)">⏪ -0.5s</button>
            <span class="vie-sync-val">0s</span>
            <button type="button" class="vie-sync-btn vie-sync-plus" title="Trễ lại 0.5s (nếu sub chạy trước tiếng nhạc, Shift click để nhảy 1s)">+0.5s ⏩</button>
            <button type="button" class="vie-sync-btn vie-sync-auto" title="Tự động đối chiếu âm thanh thực tế và lời bài hát để căn chuẩn nhịp">🎯 Căn tự động</button>
            <button type="button" class="vie-sync-btn vie-sync-reset" title="Đặt lại độ lệch về 0s" style="display:none;">↺</button>
          </div>
          <span class="vie-learn-tip">💡 Bấm từ bất kỳ để tra từ điển</span>
        `;

        overlay.appendChild(origLine);
        overlay.appendChild(viLine);
        overlay.appendChild(learnBar);
        container.appendChild(overlay);

        bindOverlayEvents(video, overlay, origLine, viLine, dictCard, learnBar, settings);
      }
      video._vieOverlay = overlay;
    }

    // Đảm bảo TUYỆT ĐỐI không có overlay duplicate thứ 2 trên DOM
    document.querySelectorAll(".vie-overlay").forEach((el) => {
      if (el !== overlay) {
        el.remove();
      }
    });

    applyOverlayVisualStyle(overlay, settings);
    return overlay;
  }

  function applyOverlayVisualStyle(overlay, settings) {
    if (!overlay || !settings) return;
    const fontStack = root.VieStorage?.FONT_FAMILY_MAP[settings.subFont] || root.VieStorage?.FONT_FAMILY_MAP.default;
    const scale = Math.max(0.6, Math.min(2.0, (Number(settings.subSize) || 100) / 100));
    const bottomPos = Math.max(2, Math.min(60, Number(settings.subBottomPos) || 12));
    const widthPct = Math.max(30, Math.min(100, Number(settings.overlayWidth) || 72));

    overlay.style.setProperty("--vie-font-family", fontStack);
    overlay.style.setProperty("--vie-scale", String(scale));
    overlay.style.setProperty("--vie-w", `${widthPct}%`);
    overlay.style.setProperty("--vie-bottom", `${bottomPos}%`);
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
      if (settings?.hoverPauseDict !== false && !video.paused && !video.ended) {
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
      speakWord(word);
      openWordLookup(video, overlay, dictCard, word, sentence, viText, wordSpan);
    });

    learnBar.querySelector(".vie-learn-scene-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      const sentence = origEl.dataset.rawText || origEl.textContent.trim();
      const viText = viEl.textContent.trim();
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
      root.VieCaptions?.adjustSubSyncOffset(video, -0.5, e.shiftKey);
    });

    learnBar.querySelector(".vie-sync-plus")?.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      root.VieCaptions?.adjustSubSyncOffset(video, +0.5, e.shiftKey);
    });

    learnBar.querySelector(".vie-sync-auto")?.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      root.VieCaptions?.autoAlignSubtitleWithAudio(video);
    });

    learnBar.querySelector(".vie-sync-reset")?.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      root.VieCaptions?.resetSubSyncOffset(video);
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
        dictCard.innerHTML = `
          <div class="vie-dict-header">
            <span class="vie-dict-word">🎓 Phân tích ngữ cảnh</span>
            <button type="button" class="vie-dict-close">✕</button>
          </div>
          <div class="vie-dict-meaning">Không thể phân tích ngữ cảnh lúc này.</div>
        `;
        dictCard.querySelector(".vie-dict-close")?.addEventListener("click", () => closeDictAndCoach(video, overlay, dictCard, false));
        return;
      }

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

  function showSelectionBubble(text, coords, onAction) {
    const el = ensureSelectionBubble();
    el.innerHTML = `
      <button type="button" class="vie-bubble-btn" title="Dịch nhanh văn bản">
        <img src="${chrome.runtime.getURL("assets/icon48.png")}" alt="Toad">
        <span>Dịch nhanh</span>
      </button>
    `;

    el.style.left = `${Math.max(10, coords.x)}px`;
    el.style.top = `${Math.max(10, coords.y - 42)}px`;
    el.classList.remove("vie-bubble-hidden");

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
    el.innerHTML = `
      <div class="vie-quick-popup">
        <div class="vie-quick-header">
          <span class="vie-quick-title">🐸 VIE-Translate</span>
          <button type="button" class="vie-quick-close">✕</button>
        </div>
        <div class="vie-quick-src">${escapeHtml(text)}</div>
        <div class="vie-quick-trans">${escapeHtml(result.vi || result.meaning || "Đang dịch...")}</div>
      </div>
    `;
    el.style.left = `${Math.max(10, Math.min(window.innerWidth - 300, coords.x))}px`;
    el.style.top = `${Math.max(10, coords.y - 120)}px`;
    el.classList.remove("vie-bubble-hidden");

    el.querySelector(".vie-quick-close")?.addEventListener("click", () => {
      hideSelectionBubble();
    });
  }

  root.VieDOM = {
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
    closeDictAndCoach,
    showSelectionBubble,
    hideSelectionBubble,
    showQuickTranslatePopup,
    PLAYER_WRAPPER_SELECTORS,
    getContainer,
    applySettingsToDOM
  };
})(typeof self !== "undefined" ? self : this);
