document.addEventListener("DOMContentLoaded", async () => {
  const enabledInput = document.getElementById("enabled");
  const dualSubInput = document.getElementById("dualSub");
  const providerSelect = document.getElementById("provider");
  const geminiSection = document.getElementById("geminiSection");
  const apiKeyInput = document.getElementById("apiKey");
  const modelSelect = document.getElementById("model");
  const detectedModelBadge = document.getElementById("detectedModelBadge");
  const fallbackInput = document.getElementById("fallbackToFree");
  const saveBtn = document.getElementById("saveBtn");
  const testBtn = document.getElementById("testBtn");
  const status = document.getElementById("status");

  function showStatus(msg, isError = false) {
    status.textContent = msg;
    status.className = isError ? "status-err" : "status-ok";
  }

  function showDetectedModel(modelName) {
    if (modelName && modelSelect.value === "auto") {
      detectedModelBadge.textContent = `✓ Đang dùng model free: ${modelName}`;
      detectedModelBadge.style.display = "inline-block";
    } else {
      detectedModelBadge.style.display = "none";
    }
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
    model: "auto",
    detectedModel: "",
    fallbackToFree: true
  });

  enabledInput.checked = Boolean(stored.enabled);
  dualSubInput.checked = Boolean(stored.dualSub);
  providerSelect.value = stored.provider || "gemini";
  apiKeyInput.value = stored.apiKey || "";

  // Nếu giá trị model cũ đã bị khai tử (không nằm trong danh sách mới), chuyển về "auto"
  const validModels = Array.from(modelSelect.options).map((o) => o.value);
  modelSelect.value = validModels.includes(stored.model) ? stored.model : "auto";

  fallbackInput.checked = Boolean(stored.fallbackToFree);
  updateProviderUI();
  showDetectedModel(stored.detectedModel);

  providerSelect.addEventListener("change", updateProviderUI);
  modelSelect.addEventListener("change", () => {
    showDetectedModel(stored.detectedModel);
  });

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

    showStatus("⏳ Đang tự động dò tìm model miễn phí tốt nhất cho Key của bạn...");
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
          showDetectedModel(res.modelUsed);
          showStatus(
            `✓ Thành công! Đã chọn model [${res.modelUsed}]. Dịch thử: "${res.sample}"`
          );
        } else {
          showStatus(`✗ Lỗi API: ${res?.error || "Không xác định"}`, true);
        }
      }
    );
  });
});