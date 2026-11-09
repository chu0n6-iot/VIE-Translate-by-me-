// Chạy trong MAIN world trên https://aistudio.google.com/*
// Tự động bắt sự kiện khi Google AI Studio copy API Key vào clipboard
(function () {
  const KEY_REGEX = /\b(AIza[0-9A-Za-z_-]{35}|AQ\.[0-9A-Za-z._-]{24,})\b/;

  function notifyKey(rawText, triggerSource) {
    if (!rawText || typeof rawText !== "string") return;
    const match = rawText.trim().match(KEY_REGEX);
    if (!match) return;
    window.postMessage(
      {
        source: "VIE_TRANSLATE_AISTUDIO_HOOK",
        type: "GEMINI_KEY_CAPTURED",
        apiKey: match[1],
        triggerSource
      },
      window.location.origin
    );
  }

  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    const origWriteText = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = async function (text) {
      try {
        notifyKey(String(text || ""), "clipboard.writeText");
      } catch {
        // Bỏ qua lỗi nội bộ
      }
      return origWriteText(text);
    };
  }

  const origExecCommand = document.execCommand;
  if (typeof origExecCommand === "function") {
    document.execCommand = function (command, ...args) {
      const result = origExecCommand.apply(this, [command, ...args]);
      if (typeof command === "string" && command.toLowerCase() === "copy") {
        try {
          const sel = window.getSelection()?.toString() || "";
          notifyKey(sel, "execCommand.copy");
        } catch {
          // Bỏ qua
        }
      }
      return result;
    };
  }
})();
