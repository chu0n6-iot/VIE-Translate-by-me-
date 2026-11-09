const DEFAULT_MODELS_BY_PROVIDER = {
  groq: [
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3-32b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant"
  ],
  gemini: [
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
    "gemini-3-flash-preview"
  ]
};

document.addEventListener("DOMContentLoaded", async () => {
  const enabledInput = document.getElementById("enabled");
  const dualSubInput = document.getElementById("dualSub");
  const providerSelect = document.getElementById("provider");
  const apiSection = document.getElementById("apiSection");
  const apiKeyLabel = document.getElementById("apiKeyLabel");
  const getKeyLink = document.getElementById("getKeyLink");
  const apiKeyInput = document.getElementById("apiKey");
  const toggleKeyBtn = document.getElementById("toggleKeyBtn");
  const modelSelect = document.getElementById("model");
  const detectedModelBadge = document.getElementById("detectedModelBadge");
  const fallbackInput = document.getElementById("fallbackToFree");
  const saveBtn = document.getElementById("saveBtn");
  const testBtn = document.getElementById("testBtn");
  const status = document.getElementById("status");

  let keysByProvider = {
    groq: "",
    gemini: ""
  };

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

  function showDetectedModel(modelName) {
    if (modelName) {
      detectedModelBadge.textContent = `✓ Model đang hoạt động: ${modelName}`;
      detectedModelBadge.style.display = "inline-block";
    } else {
      detectedModelBadge.style.display = "none";
    }
  }

  function populateModelOptions(provider, customList = [], selectedModel = "auto") {
    const list =
      Array.isArray(customList) && customList.length > 0
        ? customList
        : DEFAULT_MODELS_BY_PROVIDER[provider] || [];

    modelSelect.innerHTML = "";
    const autoOpt = document.createElement("option");
    autoOpt.value = "auto";
    autoOpt.textContent = "✨ Tự động dò Model đang hoạt động (Khuyên dùng)";
    modelSelect.appendChild(autoOpt);

    for (const m of list) {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      modelSelect.appendChild(opt);
    }

    const validValues = ["auto", ...list];
    modelSelect.value = validValues.includes(selectedModel) ? selectedModel : "auto";
  }

  function updateProviderUI(provider, keepCurrentKeyInput = false) {
    const isGtx = provider === "gtx";
    apiSection.style.display = isGtx ? "none" : "block";
    testBtn.style.display = isGtx ? "none" : "inline-block";

    if (provider === "groq") {
      apiKeyLabel.textContent = "Groq API Key (gsk_...):";
      getKeyLink.textContent = "Lấy key Groq Free ↗";
      getKeyLink.href = "https://console.groq.com/keys";
      if (!keepCurrentKeyInput) {
        apiKeyInput.value = keysByProvider.groq || "";
      }
    } else if (provider === "gemini") {
      apiKeyLabel.textContent = "Gemini API Key (AQ. / AIza...):";
      getKeyLink.textContent = "Lấy key Gemini Free ↗";
      getKeyLink.href = "https://aistudio.google.com/apikey";
      if (!keepCurrentKeyInput) {
        apiKeyInput.value = keysByProvider.gemini || "";
      }
    }
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
    fallbackToFree: true
  });

  keysByProvider.groq = stored.groqApiKey || (stored.apiKey.startsWith("gsk_") ? stored.apiKey : "");
  keysByProvider.gemini =
    stored.geminiApiKey ||
    (stored.apiKey.startsWith("AQ.") || stored.apiKey.startsWith("AIza") ? stored.apiKey : "");

  // Nếu có apiKey chung mà chưa phân loại
  if (stored.apiKey && !keysByProvider.groq && !keysByProvider.gemini) {
    keysByProvider[stored.provider === "gemini" ? "gemini" : "groq"] = stored.apiKey;
  }

  enabledInput.checked = Boolean(stored.enabled);
  dualSubInput.checked = Boolean(stored.dualSub);
  providerSelect.value = stored.provider || "groq";
  fallbackInput.checked = Boolean(stored.fallbackToFree);

  updateProviderUI(providerSelect.value);
  populateModelOptions(providerSelect.value, stored.availableModels, stored.model);
  showDetectedModel(stored.detectedModel);

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
    populateModelOptions(p, [], "auto");
    showDetectedModel("");
    showStatus("");
  });

  // Tự động nhận diện nhà cung cấp & tự động dò model ngay khi dán API Key
  let autoDetectTimer = null;
  apiKeyInput.addEventListener("input", () => {
    const val = apiKeyInput.value.trim();

    if (val.startsWith("gsk_") && providerSelect.value !== "groq") {
      providerSelect.value = "groq";
      updateProviderUI("groq", true);
      populateModelOptions("groq", [], "auto");
    } else if ((val.startsWith("AQ.") || val.startsWith("AIza")) && providerSelect.value !== "gemini") {
      providerSelect.value = "gemini";
      updateProviderUI("gemini", true);
      populateModelOptions("gemini", [], "auto");
    }

    if (providerSelect.value === "groq") keysByProvider.groq = val;
    if (providerSelect.value === "gemini") keysByProvider.gemini = val;

    if (autoDetectTimer) clearTimeout(autoDetectTimer);
    if (val.length >= 20) {
      autoDetectTimer = setTimeout(() => {
        runDetectAndTest(val, true);
      }, 400);
    }
  });

  enabledInput.addEventListener("change", () => {
    chrome.storage.local.set({ enabled: enabledInput.checked });
  });

  dualSubInput.addEventListener("change", () => {
    chrome.storage.local.set({ dualSub: dualSubInput.checked });
  });

  async function saveCurrentSettings(silent = false) {
    const currentKey = apiKeyInput.value.trim();
    const p = providerSelect.value;
    if (p === "groq") keysByProvider.groq = currentKey;
    if (p === "gemini") keysByProvider.gemini = currentKey;

    await chrome.storage.local.set({
      enabled: enabledInput.checked,
      dualSub: dualSubInput.checked,
      provider: p,
      apiKey: currentKey,
      groqApiKey: keysByProvider.groq,
      geminiApiKey: keysByProvider.gemini,
      model: modelSelect.value,
      fallbackToFree: fallbackInput.checked
    });

    if (!silent) {
      showStatus("✓ Đã lưu cài đặt thành công!", "ok");
    }
  }

  function runDetectAndTest(keyToTest, autoSave = false) {
    const key = (keyToTest || apiKeyInput.value || "").trim();
    if (!key) {
      showStatus("⚠ Vui lòng nhập API Key trước khi kiểm tra.", "err");
      return;
    }

    showStatus("⏳ Đang tự động dò tìm model đang hoạt động cho API Key...", "wait");
    testBtn.disabled = true;

    // Khi mới dán key, ưu tiên truyền "auto" để tự động tìm model sống thay vì bị kẹt ở model cũ đã chết
    const preferredModel = autoSave ? "auto" : modelSelect.value;

    chrome.runtime.sendMessage(
      {
        type: "TEST_API",
        apiKey: key,
        provider: providerSelect.value,
        model: preferredModel
      },
      async (res) => {
        testBtn.disabled = false;
        if (chrome.runtime.lastError) {
          showStatus(`✗ Lỗi: ${chrome.runtime.lastError.message}`, "err");
          return;
        }
        if (res?.ok) {
          if (res.provider && res.provider !== providerSelect.value) {
            providerSelect.value = res.provider;
            updateProviderUI(res.provider, true);
          }
          populateModelOptions(
            providerSelect.value,
            res.availableModels || [],
            modelSelect.value === "auto" ? "auto" : res.modelUsed
          );
          showDetectedModel(res.modelUsed);
          await saveCurrentSettings(true);
          showStatus(
            `✓ Hoạt động tốt! Tự động chọn model [${res.modelUsed}].\nDịch thử: "${res.sample}"`,
            "ok"
          );
        } else {
          showStatus(`✗ Lỗi: ${res?.error || "Không xác định"}`, "err");
        }
      }
    );
  }

  saveBtn.addEventListener("click", async () => {
    await saveCurrentSettings(false);
    const key = apiKeyInput.value.trim();
    if (providerSelect.value !== "gtx" && key) {
      runDetectAndTest(key, true);
    }
  });

  testBtn.addEventListener("click", () => {
    runDetectAndTest(apiKeyInput.value.trim(), true);
  });
});