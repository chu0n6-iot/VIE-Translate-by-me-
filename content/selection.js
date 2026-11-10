/**
 * VIE-Translate — Translate Toad AI
 * content/selection.js — Text selection listener & quick translate floating bubble
 */

(function (root) {
  "use strict";

  let lastSelectedText = "";
  let lastCoords = { x: 0, y: 0 };
  let isEnabled = true;

  function initSelectionListener() {
    document.addEventListener("mouseup", (e) => {
      // Don't trigger if click is inside our own bubble or overlay
      if (e.target.closest("#vie-selection-bubble, .vie-overlay, .vie-toad-audio-btn")) {
        return;
      }

      setTimeout(() => {
        const sel = window.getSelection();
        const text = sel ? sel.toString().trim() : "";

        if (!text || text.length < 2 || text.length > 500) {
          root.VieDOM?.hideSelectionBubble();
          return;
        }

        // Avoid triggering on purely digits or symbols
        if (/^[\d\s.,!?;:()\-+/*=]+$/.test(text)) {
          root.VieDOM?.hideSelectionBubble();
          return;
        }

        const range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
        if (!range) return;

        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;

        lastSelectedText = text;
        lastCoords = {
          x: rect.left + window.scrollX + rect.width / 2,
          y: rect.top + window.scrollY
        };

        root.VieDOM?.showSelectionBubble(text, lastCoords, handleSelectionAction);
      }, 30);
    });

    document.addEventListener("mousedown", (e) => {
      if (!e.target.closest("#vie-selection-bubble")) {
        root.VieDOM?.hideSelectionBubble();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        root.VieDOM?.hideSelectionBubble();
      }
    });

    chrome.runtime.onMessage.addListener((msg) => {
      if (msg?.type === "TRIGGER_SELECTION_TRANSLATE" && msg.text) {
        const coords = {
          x: Math.max(20, window.innerWidth / 2 - 140),
          y: Math.max(50, window.innerHeight / 3)
        };
        handleSelectionAction(msg.text, coords);
      }
    });
  }

  function handleSelectionAction(text, coords) {
    chrome.runtime.sendMessage({ type: "TRANSLATE", text }, (res) => {
      if (chrome.runtime.lastError || !res) {
        root.VieDOM?.showQuickTranslatePopup(text, coords, { vi: "Lỗi kết nối dịch thuật." });
        return;
      }
      root.VieDOM?.showQuickTranslatePopup(text, coords, res);
    });
  }

  root.VieSelection = {
    init: initSelectionListener
  };
})(typeof self !== "undefined" ? self : this);
