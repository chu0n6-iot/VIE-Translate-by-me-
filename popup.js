const MODELS_BY_PROVIDER = {
  gemini: [
    { value: "gemini-2.5-flash-lite", label: "gemini-2.5-flash-lite (Khuyên dùng - Nhanh & nhiều lượt Free)" },
    { value: "gemini-2.5-flash", label: "gemini-2.5-flash (Dịch tự nhiên nhất)" },
    { value: "gemini-2.0-flash", label: "gemini-2.0-flash (Ổn định)" }
  ],
  groq: [
    { value: "llama-3.3-70b-versatile", label: "llama-3.3-70b-versatile (Khuyên dùng - Chuẩn & Siêu nhanh)" },
    { value: "llama-3.1-8b-instant", label: "llama-3.1-8b-instant (Tốc độ tức thì - 14.4k câu/ngày)" },
    { value: "gemma2-9b-it", label: "gemma2-9b-it (Google Gemma 2)" }
  ]
};

const PROVIDER_META = {
  gemini: {
    label: "Gemini API Key (AIza...):",
    placeholder: "Dán key AIzaSy... từ Google AI Studio",
    linkUrl: "https://aistudio.google.com/app/apikey",
    linkText: "Lấy key Gemini Free ↗"
  },
  groq: {
    label: "Groq API Key (gsk_...):",
    placeholder: "Dán key gsk_... từ console.groq.com",
    linkUrl: "https://console.groq.com/keys",
    linkText: "Lấy key Groq Free ↗"
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  const enabledToggle = document.getElementById("enabledToggle");
  const enabledLabel = document.getElementById("enabledLabel");
  const providerSelect = document.getElementById("providerSelect");
  const modelSelect = document.getElementById("modelSelect");
  const apiKeyInput = document.getElementById("apiKey");
  const apiKeyLabel = document.getElementById("apiKeyLabel");
  const getKeyLink = document.getElementById("getKeyLink");
  const toggleEyeBtn = document.getElementById("toggleEyeBtn");
  const saveBtn = document.getElementById("saveBtn");
  const testBtn = document.getElementById("testBtn");
  const statusBox = document.getElementById("status");

  // Đọc dữ liệu đã lưu
  const state = await chrome.storage.local.get({
    enabled: true,
    provider: "gemini",
    model: "gemini-2.5-flash-lite",
    apiKey: "",
    geminiApiKey: "",
    groqApiKey: ""
  });

  // Nếu trước đây người dùng đã lưu apiKey chung, gán sang geminiApiKey để không mất
  if (state.apiKey && !state.geminiApiKey && !state.groqApiKey) {
    if (state.apiKey.startsWith("gsk_")) {
      state.groqApiKey = state.apiKey;
    } else {
      state.geminiApiKey = state.apiKey;
    }
  }

  function showStatus(message, isError = false) {
    statusBox.textContent = message;
    statusBox.className = isError ? "err" : "ok";
  }

  function populateModels(provider, selectedModel) {
    const list = MODELS_BY_PROVIDER[provider] || MODELS_BY_PROVIDER.gemini;
    modelSelect.innerHTML = "";
    for (const item of list) {
      const opt = document.createElement("option");
      opt.value = item.value;
      opt.textContent = item.label;
      modelSelect.appendChild(opt);
    }
    const exists = list.some((m) => m.value === selectedModel);
    modelSelect.value = exists ? selectedModel : list[0].value;
  }

  function updateProviderUI(provider, desiredModel) {
    const meta = PROVIDER_META[provider] || PROVIDER_META.gemini;
    apiKeyLabel.textContent = meta.label;
    apiKeyInput.placeholder = meta.placeholder;
    getKeyLink.href = meta.linkUrl;
    getKeyLink.textContent = meta.linkText;

    populateModels(provider, desiredModel);
    apiKeyInput.value =
      provider === "groq" ? state.groqApiKey || "" : state.geminiApiKey || "";
  }

  // Khởi tạo giao diện ban đầu
  enabledToggle.checked = state.enabled !== false;
  enabledLabel.textContent = enabledToggle.checked ? "Đang bật" : "Đã tắt";
  providerSelect.value = state.provider || "gemini";
  updateProviderUI(providerSelect.value, state.model);

  // Bật / Tắt dịch ngay lập tức
  enabledToggle.addEventListener("change", async () => {
    const enabled = enabledToggle.checked;
    enabledLabel.textContent = enabled ? "Đang bật" : "Đã tắt";
    await chrome.storage.local.set({ enabled });
    showStatus(enabled ? "Đã bật dịch phụ đề." : "Đã tạm tắt dịch phụ đề.");
  });

  // Đổi nhà cung cấp (Gemini <-> Groq)
  providerSelect.addEventListener("change", () => {
    // Lưu tạm key đang gõ của provider cũ vào bộ nhớ tạm
    const prevProvider = providerSelect.value === "groq" ? "gemini" : "groq";
    if (prevProvider === "groq") {
      state.groqApiKey = apiKeyInput.value.trim();
    } else {
      state.geminiApiKey = apiKeyInput.value.trim();
    }
    updateProviderUI(providerSelect.value, "");
    statusBox.className = "";
    statusBox.textContent = "";
  });

  // Hiện / Ẩn mật khẩu API key
  toggleEyeBtn.addEventListener("click", () => {
    const isPassword = apiKeyInput.type === "password";
    apiKeyInput.type = isPassword ? "text" : "password";
    toggleEyeBtn.textContent = isPassword ? "Ẩn" : "Hiện";
  });

  // Hàm lưu cấu hình
  async function saveCurrentSettings() {
    const provider = providerSelect.value;
    const model = modelSelect.value;
    const trimmedKey = apiKeyInput.value.trim();

    if (provider === "groq") {
      state.groqApiKey = trimmedKey;
    } else {
      state.geminiApiKey = trimmedKey;
    }

    await chrome.storage.local.set({
      enabled: enabledToggle.checked,
      provider,
      model,
      apiKey: trimmedKey,
      geminiApiKey: state.geminiApiKey,
      groqApiKey: state.groqApiKey
    });

    await chrome.runtime.sendMessage({ type: "CLEAR_CACHE" }).catch(() => {});
    return { provider, model, apiKey: trimmedKey };
  }

  saveBtn.addEventListener("click", async () => {
    const { apiKey, model } = await saveCurrentSettings();
    if (!apiKey) {
      showStatus("Đã lưu cài đặt, nhưng bạn chưa nhập API Key.", true);
      return;
    }
    showStatus(`✅ Đã lưu thành công! Đang dùng model: ${model}`);
  });

  // Nút Test API trực tiếp
  testBtn.addEventListener("click", async () => {
    const { provider, model, apiKey } = await saveCurrentSettings();
    if (!apiKey) {
      showStatus("⚠️ Vui lòng dán API Key vào ô bên trên trước khi Test.", true);
      return;
    }

    testBtn.disabled = true;
    testBtn.textContent = "Đang thử...";
    showStatus(`⏳ Đang kiểm tra kết nối tới ${model}...`);

    try {
      const res = await chrome.runtime.sendMessage({
        type: "TEST_API",
        provider,
        model,
        apiKey
      });

      if (res?.ok) {
        showStatus(`🎉 Kết nối thành công (${res.latencyMs}ms)!\nBản dịch thử: "${res.vi}"`);
      } else {
        showStatus(`❌ Lỗi: ${res?.error || "Không thể gọi API"}`, true);
      }
    } catch (err) {
      showStatus(`❌ Lỗi: ${err.message}`, true);
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = "Test API";
    }
  });
});
