document.addEventListener("DOMContentLoaded", async () => {
  const enabledInput = document.getElementById("enabled");
  const dualSubInput = document.getElementById("dualSub");
  const providerSelect = document.getElementById("provider");
  const geminiSection = document.getElementById("geminiSection");
  const apiKeyInput = document.getElementById("apiKey");
  const modelSelect = document.getElementById("model");
  const fallbackInput = document.getElementById("fallbackToFree");
  const saveBtn = document.getElementById("saveBtn");
  const testBtn = document.getElementById("testBtn");
  const status = document.getElementById("status");

  function showStatus(msg, isError = false) {
    status.textContent = msg;
    status.className = isError ? "status-err" : "status-ok";
  }

  function updateProviderUI() {
    const isGemini = providerSelect.value === "gemini";
    geminiSection.style.display = isGemini ? "block" : "none";
    testBtn.style.display = isGemini ? "inline-block" : "none";
  }

  const stored = await chrome.storage.local.get({
    enabled: true,
    dualSub: true,
    provider: "gemini",
    apiKey: "",
    model: "gemini-2.5-flash",
    fallbackToFree: true
  });

  enabledInput.checked = Boolean(stored.enabled);
  dualSubInput.checked = Boolean(stored.dualSub);
  providerSelect.value = stored.provider || "gemini";
  apiKeyInput.value = stored.apiKey || "";
  modelSelect.value = stored.model || "gemini-2.5-flash";
  fallbackInput.checked = Boolean(stored.fallbackToFree);
  updateProviderUI();

  providerSelect.addEventListener("change", updateProviderUI);

  // Tự động cập nhật ngay khi bật/tắt công tắc
  enabledInput.addEventListener("change", () => {
    chrome.storage.local.set({ enabled: enabledInput.checked });
  });

  dualSubInput.addEventListener("change", () => {
    chrome.storage.local.set({ dualSub: dualSubInput.checked });
  });

  saveBtn.addEventListener("click", async () => {
    const newSettings = {
      enabled: enabledInput.checked,
      dualSub: dualSubInput.checked,
      provider: providerSelect.value,
      apiKey: apiKeyInput.value.trim(),
      model: modelSelect.value,
      fallbackToFree: fallbackInput.checked
    };

    await chrome.storage.local.set(newSettings);
    chrome.runtime.sendMessage({ type: "CLEAR_CACHE" });
    showStatus("✓ Đã lưu cài đặt thành công!");
    setTimeout(() => {
      if (status.textContent.startsWith("✓")) status.textContent = "";
    }, 2500);
  });

  testBtn.addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    if (!key) {
      showStatus("⚠ Vui lòng nhập Gemini API Key trước khi kiểm tra.", true);
      return;
    }

    showStatus("Đang kiểm tra kết nối Gemini API...");
    testBtn.disabled = true;

    chrome.runtime.sendMessage(
      {
        type: "TEST_API",
        apiKey: key,
        model: modelSelect.value
      },
      (res) => {
        testBtn.disabled = false;
        if (chrome.runtime.lastError) {
          showStatus(`✗ Lỗi: ${chrome.runtime.lastError.message}`, true);
          return;
        }
        if (res?.ok) {
          showStatus(`✓ Kết nối thành công! Dịch thử: "${res.sample}"`);
        } else {
          showStatus(`✗ Lỗi API: ${res?.error || "Không xác định"}`, true);
        }
      }
    );
  });
});