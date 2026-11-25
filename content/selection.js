/**
 * VIE-Translate — Translate Toad AI
 * content/selection.js — Text selection listener & quick translate floating bubble
 */

(function (root) {
  "use strict";

  let lastSelectedText = "";
  let lastCoords = { x: 0, y: 0 };
  let isEnabled = true;
  let selectionReqId = 0;

  function syncSelectionSetting(s) {
    if (!s) return;
    isEnabled = s.enabled !== false && s.selectionTranslate !== false;
    if (!isEnabled) {
      root.VieDOM?.hideSelectionBubble();
    }
  }

  function initSelectionListener() {
    root.VieStorage?.getSettings?.().then(syncSelectionSetting).catch(() => {});
    root.VieStorage?.onChanged?.((changes) => {
      if ("enabled" in changes || "selectionTranslate" in changes) {
        root.VieStorage?.getSettings?.().then(syncSelectionSetting).catch(() => {});
      }
    });

    document.addEventListener("mouseup", (e) => {
      if (!isEnabled) return;
      // Don't trigger if click is inside our own bubble or overlay
      if (e.target.closest("#vie-selection-bubble, .vie-overlay, .vie-toad-audio-btn")) {
        return;
      }

      setTimeout(() => {
        if (!isEnabled) {
          root.VieDOM?.hideSelectionBubble();
          return;
        }
        const sel = window.getSelection();
        const text = sel ? sel.toString().trim() : "";

        if (!text || text.length < 2 || text.length > 2500) {
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
    const reqId = ++selectionReqId;
    let gotFinal = false;
    const isSingleWord = text.trim().split(/\s+/).length <= 3;

    root.VieDOM?.showQuickTranslatePopup(text, coords, { vi: "⏳ Đang dịch...", isSingleWord });

    chrome.runtime.sendMessage({ type: "TRANSLATE", text, fastPreviewOnly: true }, (previewRes) => {
      if (reqId !== selectionReqId) return;
      if (!chrome.runtime.lastError && previewRes?.vi && !gotFinal) {
        if (previewRes.isFinalAi) gotFinal = true;
        root.VieDOM?.showQuickTranslatePopup(text, coords, { ...previewRes, isSingleWord });
      }
    });

    chrome.runtime.sendMessage({ type: "TRANSLATE", text, fastPreviewOnly: false }, (res) => {
      if (reqId !== selectionReqId) return;
      if (chrome.runtime.lastError || !res) {
        if (!gotFinal) {
          root.VieDOM?.showQuickTranslatePopup(text, coords, { vi: "Lỗi kết nối dịch thuật.", isSingleWord });
        }
        return;
      }
      gotFinal = true;
      root.VieDOM?.showQuickTranslatePopup(text, coords, { ...res, isSingleWord });
    });
  }

  root.VieSelection = {
    init: initSelectionListener
  };
})(typeof self !== "undefined" ? self : this);
