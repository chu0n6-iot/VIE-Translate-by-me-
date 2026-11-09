// Content script chạy trên https://aistudio.google.com/*
// Tự động phát hiện, trích xuất và lưu Gemini API Key vào VIE-Translate
(function () {
  const KEY_REGEX = /\b(AIza[0-9A-Za-z_-]{35}|AQ\.[0-9A-Za-z._-]{24,})\b/;
  let lastImportedKey = "";
  let isImporting = false;
  let bannerEl = null;
  let statusTextEl = null;
  let actionBtnEl = null;

  function isApiKeyPage() {
    return (
      location.pathname.includes("apikey") ||
      location.search.includes("vie_auto_import=1")
    );
  }

  function ensureBanner() {
    if (!isApiKeyPage()) return;
    if (bannerEl && document.body.contains(bannerEl)) return;

    bannerEl = document.createElement("div");
    bannerEl.id = "vie-aistudio-assistant";
    bannerEl.style.cssText = [
      "position: fixed",
      "right: 20px",
      "bottom: 20px",
      "width: 340px",
      "max-width: calc(100vw - 40px)",
      "background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      "color: #f8fafc",
      "border: 1px solid #3b82f6",
      "border-radius: 12px",
      "padding: 14px 16px",
      "box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45)",
      "font-family: 'Segoe UI', Roboto, Arial, sans-serif",
      "font-size: 13px",
      "line-height: 1.45",
      "z-index: 2147483647",
      "box-sizing: border-box"
    ].join(";");

    const header = document.createElement("div");
    header.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;font-weight:700;font-size:13.5px;color:#60a5fa;";
    header.innerHTML = `
      <span>⚡ VIE-Translate Auto Key</span>
      <button id="vie-aistudio-close" title="Đóng" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:16px;line-height:1;padding:0 4px;">×</button>
    `;

    statusTextEl = document.createElement("div");
    statusTextEl.style.cssText = "color:#e2e8f0;margin-bottom:10px;font-size:12.5px;";
    statusTextEl.textContent =
      "Bấm nút bên dưới hoặc bấm 'Create API key' / 'Copy' bất kỳ mã Key nào, VIE-Translate sẽ tự động lưu và kích hoạt.";

    actionBtnEl = document.createElement("button");
    actionBtnEl.type = "button";
    actionBtnEl.style.cssText = [
      "width: 100%",
      "background: #2563eb",
      "color: #ffffff",
      "border: none",
      "border-radius: 8px",
      "padding: 8px 12px",
      "font-size: 12.5px",
      "font-weight: 600",
      "cursor: pointer",
      "transition: background 0.15s"
    ].join(";");
    actionBtnEl.textContent = "⚡ Tự động lấy & Kết nối Key ngay";

    actionBtnEl.addEventListener("click", () => {
      autoGrabExistingKeyOnPage(true);
    });

    bannerEl.appendChild(header);
    bannerEl.appendChild(statusTextEl);
    bannerEl.appendChild(actionBtnEl);
    document.body.appendChild(bannerEl);

    const closeBtn = bannerEl.querySelector("#vie-aistudio-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        bannerEl.remove();
      });
    }
  }

  function updateBannerStatus(message, type = "info") {
    ensureBanner();
    if (!statusTextEl) return;
    statusTextEl.textContent = message;
    if (type === "success") {
      statusTextEl.style.color = "#4ade80";
      if (bannerEl) bannerEl.style.borderColor = "#22c55e";
      if (actionBtnEl) {
        actionBtnEl.textContent = "✓ Đã kết nối! Bấm để lấy lại nếu đổi Key";
        actionBtnEl.style.background = "#059669";
      }
    } else if (type === "error") {
      statusTextEl.style.color = "#f87171";
      if (bannerEl) bannerEl.style.borderColor = "#ef4444";
    } else {
      statusTextEl.style.color = "#e2e8f0";
    }
  }

  function importDetectedKey(apiKey, sourceLabel = "auto") {
    const cleanKey = (apiKey || "").trim();
    if (!cleanKey || !KEY_REGEX.test(cleanKey)) return;
    if (cleanKey === lastImportedKey || isImporting) return;

    isImporting = true;
    updateBannerStatus("⏳ Đang kiểm tra & tự động lưu API Key vào VIE-Translate...", "info");

    chrome.runtime.sendMessage(
      {
        type: "AUTO_IMPORT_API_KEY",
        apiKey: cleanKey,
        source: sourceLabel
      },
      (res) => {
        isImporting = false;
        if (chrome.runtime.lastError) return;
        if (res?.ok) {
          lastImportedKey = cleanKey;
          updateBannerStatus(
            `✅ Đã tự động nhập API Key thành công! Model kích hoạt: ${res.modelUsed || "auto"}. Bạn có thể quay lại xem video ngay!`,
            "success"
          );
        } else if (res?.error) {
          updateBannerStatus(`⚠ Không thể dùng Key này: ${res.error}`, "error");
        }
      }
    );
  }

  function scanVisibleKeyInDOM() {
    if (!isApiKeyPage()) return null;

    const selectors = [
      "mat-dialog-container",
      "[role='dialog']",
      "input[readonly]",
      "code",
      "pre",
      ".apikey-value",
      "[data-test-id*='key' i]",
      "[class*='api-key' i]",
      "[class*='apikey' i]"
    ];

    for (const sel of selectors) {
      const elements = document.querySelectorAll(sel);
      for (const el of elements) {
        const val = (el.value || el.textContent || "").trim();
        const match = val.match(KEY_REGEX);
        if (match) {
          return match[1];
        }
      }
    }
    return null;
  }

  function autoGrabExistingKeyOnPage(userInitiated = false) {
    ensureBanner();

    const visibleKey = scanVisibleKeyInDOM();
    if (visibleKey) {
      importDetectedKey(visibleKey, "dom-visible");
      return { triggered: true, method: "dom-visible" };
    }

    const allButtons = Array.from(document.querySelectorAll("button, [role='button']"));
    const copyBtn = allButtons.find((btn) => {
      if (btn.id === "vie-aistudio-close" || btn === actionBtnEl) return false;
      const label = [
        btn.getAttribute("aria-label") || "",
        btn.getAttribute("mattooltip") || "",
        btn.getAttribute("title") || "",
        btn.getAttribute("data-test-id") || "",
        btn.textContent || ""
      ]
        .join(" ")
        .toLowerCase();

      const hasCopyIcon =
        label.includes("copy api key") ||
        label.includes("copy key") ||
        label.includes("sao chép khóa api") ||
        label.includes("content_copy");

      return hasCopyIcon && btn.offsetParent !== null;
    });

    if (copyBtn) {
      updateBannerStatus("⚡ Đang tự động trích xuất API Key từ danh sách của bạn...", "info");
      copyBtn.click();
      return { triggered: true, method: "copy-button" };
    }

    if (userInitiated) {
      const createBtn = allButtons.find((btn) => {
        const text = (
          (btn.textContent || "") +
          " " +
          (btn.getAttribute("aria-label") || "")
        ).toLowerCase();
        return (
          (text.includes("create api key") || text.includes("tạo khóa api")) &&
          btn.offsetParent !== null
        );
      });

      if (createBtn) {
        updateBannerStatus(
          "👉 Đã mở hộp thoại tạo Key! Hãy chọn Project hoặc bấm 'Create API key in new project' để hoàn tất.",
          "info"
        );
        createBtn.click();
        return { triggered: true, method: "create-button" };
      }

      updateBannerStatus(
        "⚠ Chưa tìm thấy Key trên trang. Hãy đăng nhập Google và bấm nút 'Create API key' trên màn hình.",
        "error"
      );
    }

    return { triggered: false };
  }

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data;
    if (
      data &&
      data.source === "VIE_TRANSLATE_AISTUDIO_HOOK" &&
      data.type === "GEMINI_KEY_CAPTURED" &&
      data.apiKey
    ) {
      importDetectedKey(data.apiKey, data.triggerSource || "clipboard-hook");
    }
  });

  document.addEventListener("copy", () => {
    setTimeout(async () => {
      const sel = window.getSelection()?.toString()?.trim() || "";
      const selMatch = sel.match(KEY_REGEX);
      if (selMatch) {
        importDetectedKey(selMatch[1], "selection-copy");
        return;
      }
      try {
        const clipText = await navigator.clipboard.readText();
        const clipMatch = (clipText || "").match(KEY_REGEX);
        if (clipMatch) {
          importDetectedKey(clipMatch[1], "clipboard-read");
        }
      } catch {
        // Bỏ qua nếu trình duyệt chặn đọc clipboard
      }
    }, 80);
  });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "TRIGGER_AISTUDIO_AUTO_GRAB") {
      const result = autoGrabExistingKeyOnPage(true);
      sendResponse(result);
      return true;
    }
  });

  const observer = new MutationObserver(() => {
    if (!isApiKeyPage()) return;
    ensureBanner();
    const visibleKey = scanVisibleKeyInDOM();
    if (visibleKey && visibleKey !== lastImportedKey) {
      importDetectedKey(visibleKey, "modal-observer");
    }
  });

  function init() {
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
    if (isApiKeyPage()) {
      ensureBanner();
      if (location.search.includes("vie_auto_import=1")) {
        setTimeout(() => autoGrabExistingKeyOnPage(false), 1500);
        setTimeout(() => autoGrabExistingKeyOnPage(false), 3500);
      } else {
        const visibleKey = scanVisibleKeyInDOM();
        if (visibleKey) importDetectedKey(visibleKey, "initial-scan");
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
