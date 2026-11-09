const CLIPBOARD_KEY_REGEX = /\b(AIza[0-9A-Za-z_-]{35}|AQ\.[0-9A-Za-z._-]{24,}|gsk_[0-9A-Za-z]{20,})\b/;

document.addEventListener("DOMContentLoaded", async () => {
  const enabledInput = document.getElementById("enabled");
  const dualSubInput = document.getElementById("dualSub");
  const providerSelect = document.getElementById("provider");
  const apiSection = document.getElementById("apiSection");
  const autoImportBtn = document.getElementById("autoImportBtn");
  const pasteKeyBtn = document.getElementById("pasteKeyBtn");
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
    if (!modelField) return;
    modelField.style.display = "none";
    modelSelect.innerHTML = "";
    if (modelCount) modelCount.textContent = "";
    detectedModelBadge.style.display = "none";
  }

  function showModelList(models, selectedModel) {
    if (!modelField) return;
    const list = Array.isArray(models) ? [...models] : [];
    if (selectedModel && selectedModel !== "auto" && !list.includes(selectedModel)) {
      list.unshift(selectedModel);
    }

    modelSelect.innerHTML = "";
    const autoOpt = document.createElement("option");
    autoOpt.value = "auto";
    autoOpt.textContent = "✨ Tự động chọn Model tốt nhất (Tự chuyển nếu hết Quota)";
    modelSelect.appendChild(autoOpt);

    for (const m of list) {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m === selectedModel ? `✓ ${m}` : m;
      modelSelect.appendChild(opt);
    }

    if (selectedModel && (selectedModel === "auto" || list.includes(selectedModel))) {
      modelSelect.value = selectedModel;
    } else if (list.length > 0) {
      modelSelect.value = list[0];
    }

    if (modelCount) modelCount.textContent = `${list.length} model`;
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
      getKeyLink.href = "https://aistudio.google.com/apikey?vie_auto_import=1";
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
    provider: "gemini",
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
  providerSelect.value = stored.provider || "gemini";
  fallbackInput.checked = Boolean(stored.fallbackToFree);

  updateProviderUI(providerSelect.value);

  verifiedKey = stored.verifiedKey || "";
  const currentKey = apiKeyInput.value.trim();
  if (
    currentKey &&
    currentKey === verifiedKey &&
    stored.availableModels.length > 0 &&
    providerSelect.value !== "gtx"
  ) {
    const sel =
      stored.model === "auto" || stored.availableModels.includes(stored.model)
        ? stored.model
        : stored.detectedModel || stored.availableModels[0];
    showModelList(stored.availableModels, stored.detectedModel || sel);
  } else {
    hideModelList();
  }

  // Nếu chưa có API Key nào, tự động kiểm tra Clipboard khi mở Popup
  if (!currentKey) {
    tryAutoReadClipboard(true);
  }

  // Lắng nghe sự kiện khi tab Google AI Studio tự động nhập Key thành công
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.lastAutoImportAt?.newValue) {
      chrome.storage.local.get(
        {
          provider: "gemini",
          apiKey: "",
          geminiApiKey: "",
          groqApiKey: "",
          verifiedKey: "",
          detectedModel: "",
          availableModels: []
        },
        (s) => {
          if (s.geminiApiKey) keysByProvider.gemini = s.geminiApiKey;
          if (s.groqApiKey) keysByProvider.groq = s.groqApiKey;
          providerSelect.value = s.provider;
          updateProviderUI(s.provider, false);
          apiKeyInput.value = s.apiKey;
          verifiedKey = s.verifiedKey;
          showModelList(s.availableModels, s.detectedModel);
          showStatus(
            `✓ Đã tự động nhận & kích hoạt API Key từ Google AI Studio! Đang dùng [${s.detectedModel}].`,
            "ok"
          );
        }
      );
    }
  });

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
      chrome.storage.local
        .get({ availableModels: [], model: "", detectedModel: "" })
        .then((s) => {
          if (s.availableModels.length > 0) {
            showModelList(s.availableModels, s.detectedModel || s.model);
          }
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

    if (val !== verifiedKey) {
      hideModelList();
    }

    if (autoDetectTimer) clearTimeout(autoDetectTimer);
    verifyToken++;
    if (val && val !== verifiedKey && detected && val.length >= 20) {
      autoDetectTimer = setTimeout(() => verifyKey(val), 600);
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
    await chrome.storage.local.set({ model: m, detectedModel: m === "auto" ? stored.detectedModel : m });
    chrome.runtime.sendMessage({ type: "CLEAR_CACHE" }, () => void chrome.runtime.lastError);
    detectedModelBadge.textContent = `✓ Đang dùng model: ${m}`;
    detectedModelBadge.style.display = "inline-block";
    showStatus(`✓ Đã chọn model [${m}]. Nếu model lỗi, hệ thống tự chuyển sang model khác.`, "ok");
  });

  async function tryAutoReadClipboard(silent = false) {
    try {
      const text = await navigator.clipboard.readText();
      const match = (text || "").trim().match(CLIPBOARD_KEY_REGEX);
      if (match) {
        const foundKey = match[1];
        const detected = detectProviderFromKey(foundKey);
        if (detected) {
          providerSelect.value = detected;
          keysByProvider[detected] = foundKey;
          updateProviderUI(detected, true);
        }
        apiKeyInput.value = foundKey;
        verifyKey(foundKey);
        return true;
      } else if (!silent) {
        showStatus(
          "⚠ Chưa thấy API Key (AIza... / AQ... / gsk_...) trong Clipboard. Hãy bấm '⚡ Tự động nhập Key từ Google AI Studio'!",
          "err"
        );
      }
    } catch {
      if (!silent) {
        showStatus(
          "⚠ Không thể đọc Clipboard. Hãy bấm '⚡ Tự động nhập Key từ Google AI Studio' hoặc dán trực tiếp.",
          "err"
        );
      }
    }
    return false;
  }

  pasteKeyBtn.addEventListener("click", () => {
    tryAutoReadClipboard(false);
  });

  // Nút 1-Click Tự động lấy API Key từ Google AI Studio
  autoImportBtn.addEventListener("click", async () => {
    const fromClip = await tryAutoReadClipboard(true);
    if (fromClip) return;

    showStatus("⏳ Đang kết nối tới Google AI Studio để tự động lấy API Key...", "wait");

    if (chrome.tabs && typeof chrome.tabs.query === "function") {
      chrome.tabs.query({ url: "https://aistudio.google.com/*" }, (tabs) => {
        if (tabs && tabs.length > 0) {
          const targetTab = tabs[0];
          chrome.tabs.sendMessage(
            targetTab.id,
            { type: "TRIGGER_AISTUDIO_AUTO_GRAB" },
            (res) => {
              if (!chrome.runtime.lastError && res?.triggered) {
                showStatus("⚡ Đang tự động trích xuất API Key từ tab Google AI Studio...", "wait");
                chrome.tabs.update(targetTab.id, { active: true });
              } else {
                chrome.tabs.update(targetTab.id, {
                  active: true,
                  url: "https://aistudio.google.com/apikey?vie_auto_import=1"
                });
              }
            }
          );
        } else {
          chrome.tabs.create({
            url: "https://aistudio.google.com/apikey?vie_auto_import=1"
          });
        }
      });
    } else {
      window.open("https://aistudio.google.com/apikey?vie_auto_import=1", "_blank");
    }
  });

  async function saveCurrentSettings(silent = false) {
    const key = apiKeyInput.value.trim();
    const p = providerSelect.value;
    if (p === "groq") keysByProvider.groq = key;
    if (p === "gemini") keysByProvider.gemini = key;

    const modelValue =
      modelField && modelField.style.display !== "none" && modelSelect.value
        ? modelSelect.value
        : "auto";

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

  function verifyKey(keyToTest, keepSelectedModel = false) {
    const key = (keyToTest || apiKeyInput.value || "").trim();
    if (!key) {
      showStatus(
        "⚠ Vui lòng nhập API Key hoặc bấm '⚡ Tự động nhập Key từ Google AI Studio' ở trên.",
        "err"
      );
      return;
    }

    const token = ++verifyToken;
    showStatus("⏳ Đang xác thực API Key và lấy danh sách model khả dụng...", "wait");
    testBtn.disabled = true;

    const preferred =
      keepSelectedModel && modelField && modelField.style.display !== "none"
        ? modelSelect.value
        : "auto";

    chrome.runtime.sendMessage(
      {
        type: "TEST_API",
        apiKey: key,
        provider: providerSelect.value,
        model: preferred
      },
      async (res) => {
        testBtn.disabled = false;
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