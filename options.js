document.addEventListener("DOMContentLoaded", async () => {
  const enabledInput = document.getElementById("enabled");
  const dualSubInput = document.getElementById("dualSub");
  const providerSelect = document.getElementById("provider");
  const apiSection = document.getElementById("apiSection");
  const apiKeyLabel = document.getElementById("apiKeyLabel");
  const getKeyLink = document.getElementById("getKeyLink");
  const apiKeyInput = document.getElementById("apiKey");
  const toggleKeyBtn = document.getElementById("toggleKeyBtn");
  const modelField = document.getElementById("modelField");
  const modelSelect = document.getElementById("model");
  const modelCount = document.getElementById("modelCount");
  const detectedModelBadge = document.getElementById("detectedModelBadge");
  const fallbackInput = document.getElementById("fallbackToFree");
  const saveBtn = document.getElementById("saveBtn");
  const testBtn = document.getElementById("testBtn");
  const status = document.getElementById("status");

  let keysByProvider = { groq: "", gemini: "" };
  // Key đã được xác thực thành công (chỉ khi key trong ô nhập == verifiedKey mới hiện danh sách model)
  let verifiedKey = "";
  let verifyToken = 0;

  function showStatus(msg, type = "ok") {
    if (!msg) {
      status.style.display = "none";
      status.textContent = "";
      status.className = "";
      return;
    }
    status.textContent = msg;
    status.className =
      type === "err" ? "status-err" : type === "wait" ? "status-wait" : "status-ok";
    status.style.display = "block";
  }

  function hideModelList() {
    modelField.style.display = "none";
    modelSelect.innerHTML = "";
    modelCount.textContent = "";
    detectedModelBadge.style.display = "none";
  }

  function showModelList(models, selectedModel) {
    const list = Array.isArray(models) ? [...models] : [];
    if (selectedModel && !list.includes(selectedModel)) list.unshift(selectedModel);

    modelSelect.innerHTML = "";
    for (const m of list) {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m === selectedModel ? `✓ ${m}` : m;
      modelSelect.appendChild(opt);
    }
    if (selectedModel) modelSelect.value = selectedModel;

    modelCount.textContent = `${list.length} model`;
    modelField.style.display = list.length > 0 ? "block" : "none";

    if (selectedModel) {
      detectedModelBadge.textContent = `✓ Đã xác thực hoạt động: ${selectedModel}`;
      detectedModelBadge.style.display = "inline-block";
    } else {
      detectedModelBadge.style.display = "none";
    }
  }

  function updateProviderUI(provider, keepCurrentKeyInput = false) {
    const isGtx = provider === "gtx";
    apiSection.style.display = isGtx ? "none" : "block";
    testBtn.style.display = isGtx ? "none" : "inline-block";

    if (provider === "groq") {
      apiKeyLabel.textContent = "Groq API Key (gsk_...):";
      getKeyLink.textContent = "Lấy key Groq Free ↗";
      getKeyLink.href = "https://console.groq.com/keys";
      if (!keepCurrentKeyInput) apiKeyInput.value = keysByProvider.groq || "";
    } else if (provider === "gemini") {
      apiKeyLabel.textContent = "Gemini API Key (AQ. / AIza...):";
      getKeyLink.textContent = "Lấy key Gemini Free ↗";
      getKeyLink.href = "https://aistudio.google.com/apikey";
      if (!keepCurrentKeyInput) apiKeyInput.value = keysByProvider.gemini || "";
    }
  }

  function detectProviderFromKey(key) {
    if (key.startsWith("gsk_")) return "groq";
    if (key.startsWith("AQ.") || key.startsWith("AIza")) return "gemini";
    return "";
  }

  // Đọc dữ liệu đã lưu
  const stored = await chrome.storage.local.get({
    enabled: true,
    dualSub: true,
    provider: "groq",
    apiKey: "",
    groqApiKey: "",
    geminiApiKey: "",
    model: "auto",
    detectedModel: "",
    availableModels: [],
    verifiedKey: "",
    fallbackToFree: true
  });

  keysByProvider.groq =
    stored.groqApiKey || (stored.apiKey.startsWith("gsk_") ? stored.apiKey : "");
  keysByProvider.gemini =
    stored.geminiApiKey ||
    (stored.apiKey.startsWith("AQ.") || stored.apiKey.startsWith("AIza") ? stored.apiKey : "");
  if (stored.apiKey && !keysByProvider.groq && !keysByProvider.gemini) {
    keysByProvider[stored.provider === "gemini" ? "gemini" : "groq"] = stored.apiKey;
  }

  enabledInput.checked = Boolean(stored.enabled);
  dualSubInput.checked = Boolean(stored.dualSub);
  providerSelect.value = stored.provider || "groq";
  fallbackInput.checked = Boolean(stored.fallbackToFree);

  updateProviderUI(providerSelect.value);

  // Chỉ hiện danh sách model nếu key hiện tại đã từng được xác thực
  verifiedKey = stored.verifiedKey || "";
  const currentKey = apiKeyInput.value.trim();
  if (
    currentKey &&
    currentKey === verifiedKey &&
    stored.availableModels.length > 0 &&
    providerSelect.value !== "gtx"
  ) {
    const sel = stored.availableModels.includes(stored.model)
      ? stored.model
      : stored.detectedModel || stored.availableModels[0];
    showModelList(stored.availableModels, sel);
  } else {
    hideModelList();
  }

  // Nút Hiện / Ẩn API Key
  toggleKeyBtn.addEventListener("click", () => {
    const isHidden = apiKeyInput.type === "password";
    apiKeyInput.type = isHidden ? "text" : "password";
    toggleKeyBtn.textContent = isHidden ? "Ẩn" : "Hiện";
  });

  // Đổi nhà cung cấp trong dropdown
  providerSelect.addEventListener("change", () => {
    const p = providerSelect.value;
    updateProviderUI(p);
    hideModelList();
    showStatus("");
    const key = apiKeyInput.value.trim();
    if (p !== "gtx" && key && key === verifiedKey) {
      // Key này đã xác thực trước đó → nạp lại danh sách
      chrome.storage.local.get({ availableModels: [], model: "", detectedModel: "" }).then((s) => {
        if (s.availableModels.length > 0) showModelList(s.availableModels, s.model || s.detectedModel);
      });
    }
  });

  // Tự động nhận diện nhà cung cấp & xác thực key khi dán/nhập
  let autoDetectTimer = null;
  apiKeyInput.addEventListener("input", () => {
    const val = apiKeyInput.value.trim();

    const detected = detectProviderFromKey(val);
    if (detected && providerSelect.value !== detected) {
      providerSelect.value = detected;
      updateProviderUI(detected, true);
    }

    if (providerSelect.value === "groq") keysByProvider.groq = val;
    if (providerSelect.value === "gemini") keysByProvider.gemini = val;

    // Key thay đổi → danh sách model cũ không còn hợp lệ
    if (val !== verifiedKey) {
      hideModelList();
    }

    if (autoDetectTimer) clearTimeout(autoDetectTimer);
    verifyToken++;
    if (val && val !== verifiedKey && detected && val.length >= 20) {
      autoDetectTimer = setTimeout(() => verifyKey(val), 800);
    }
  });

  enabledInput.addEventListener("change", () => {
    chrome.storage.local.set({ enabled: enabledInput.checked });
  });

  dualSubInput.addEventListener("change", () => {
    chrome.storage.local.set({ dualSub: dualSubInput.checked });
  });

  // Người dùng chọn model khác trong danh sách khả dụng
  modelSelect.addEventListener("change", async () => {
    const m = modelSelect.value;
    await chrome.storage.local.set({ model: m, detectedModel: m });
    chrome.runtime.sendMessage({ type: "CLEAR_CACHE" }, () => void chrome.runtime.lastError);
    detectedModelBadge.textContent = `✓ Đang dùng model: ${m}`;
    detectedModelBadge.style.display = "inline-block";
    showStatus(`✓ Đã chọn model [${m}]. Nếu model lỗi, hệ thống tự chuyển sang model khác.`, "ok");
  });

  async function saveCurrentSettings(silent = false) {
    const key = apiKeyInput.value.trim();
    const p = providerSelect.value;
    if (p === "groq") keysByProvider.groq = key;
    if (p === "gemini") keysByProvider.gemini = key;

    const modelValue =
      modelField.style.display !== "none" && modelSelect.value ? modelSelect.value : "auto";

    await chrome.storage.local.set({
      enabled: enabledInput.checked,
      dualSub: dualSubInput.checked,
      provider: p,
      apiKey: key,
      groqApiKey: keysByProvider.groq,
      geminiApiKey: keysByProvider.gemini,
      model: modelValue,
      fallbackToFree: fallbackInput.checked
    });

    if (!silent) showStatus("✓ Đã lưu cài đặt thành công!", "ok");
  }

  // Xác thực key → nếu OK thì liệt kê các model dùng được
  function verifyKey(keyToTest, keepSelectedModel = false) {
    const key = (keyToTest || apiKeyInput.value || "").trim();
    if (!key) {
      showStatus("⚠ Vui lòng nhập API Key trước.", "err");
      return;
    }

    const token = ++verifyToken;
    showStatus("⏳ Đang xác thực API Key và lấy danh sách model khả dụng...", "wait");
    testBtn.disabled = true;

    const preferred = keepSelectedModel && modelField.style.display !== "none" ? modelSelect.value : "auto";

    chrome.runtime.sendMessage(
      {
        type: "TEST_API",
        apiKey: key,
        provider: providerSelect.value,
        model: preferred
      },
      async (res) => {
        testBtn.disabled = false;
        // Key đã đổi trong lúc chờ → bỏ kết quả cũ
        if (token !== verifyToken || apiKeyInput.value.trim() !== key) return;

        if (chrome.runtime.lastError) {
          showStatus(`✗ Lỗi: ${chrome.runtime.lastError.message}`, "err");
          return;
        }
        if (!res?.ok) {
          verifiedKey = "";
          hideModelList();
          showStatus(`✗ API Key không dùng được: ${res?.error || "Không xác định"}`, "err");
          return;
        }

        if (res.provider && res.provider !== providerSelect.value) {
          providerSelect.value = res.provider;
          updateProviderUI(res.provider, true);
          if (res.provider === "groq") keysByProvider.groq = key;
          if (res.provider === "gemini") keysByProvider.gemini = key;
        }

        verifiedKey = key;
        showModelList(res.availableModels || [], res.modelUsed);

        await saveCurrentSettings(true);
        await chrome.storage.local.set({
          verifiedKey: key,
          availableModels: res.availableModels || [],
          detectedModel: res.modelUsed,
          model: res.modelUsed
        });

        showStatus(
          `✓ API Key hợp lệ! Tìm thấy ${(res.availableModels || []).length} model. Đang dùng [${res.modelUsed}].\nDịch thử: "${res.sample}"`,
          "ok"
        );
      }
    );
  }

  saveBtn.addEventListener("click", async () => {
    await saveCurrentSettings(false);
    const key = apiKeyInput.value.trim();
    if (providerSelect.value !== "gtx" && key && key !== verifiedKey) {
      verifyKey(key);
    }
  });

  testBtn.addEventListener("click", () => {
    verifyKey(apiKeyInput.value.trim());
  });
});