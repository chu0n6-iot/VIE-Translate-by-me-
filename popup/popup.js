const CLIPBOARD_KEY_REGEX = /\b(AIza[0-9A-Za-z_-]{35}|AQ\.[0-9A-Za-z._-]{24,}|gsk_[0-9A-Za-z]{20,})\b/;

const FONT_FAMILY_MAP = {
  default: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", Times, serif',
  mono: '"JetBrains Mono", Consolas, "Courier New", monospace',
  rounded: '"Trebuchet MS", "Segoe UI", Verdana, sans-serif',
  impact: '"Arial Black", Impact, "Segoe UI", sans-serif'
};

const SAMPLE_SENTENCES = {
  orig: "Welcome back! Today I'll show you something amazing.",
  vi: "Chào mừng các bạn quay lại! Hôm nay mình sẽ cho các bạn xem điều tuyệt vời.",
  vi_minh: "Chào mừng các bạn quay lại! Hôm nay mình sẽ cho các bạn xem điều tuyệt vời.",
  vi_toi: "Chào mừng các bạn quay lại! Hôm nay tôi sẽ cho các bạn xem điều tuyệt vời.",
  vi_anh: "Chào mừng em quay lại! Hôm nay anh sẽ cho em xem điều tuyệt vời.",
  en: "Welcome back! Today I will show you something amazing.",
  fr: "Bon retour ! Aujourd'hui, je vais vous montrer quelque chose d'incroyable.",
  ja: "おかえりなさい！今日は素晴らしいものをお見せしましょう。",
  ko: "돌아오신 것을 환영합니다! 오늘 놀라운 것을 보여드리겠습니다.",
  "zh-CN": "欢迎回来！今天我将向大家展示一些令人惊叹的事物。",
  "zh-TW": "歡迎回來！今天我將向大家展示一些令人驚嘆的事物。",
  de: "Willkommen zurück! Heute zeige ich euch etwas Erstaunliches.",
  es: "¡Bienvenidos de nuevo! Hoy les mostraré algo increíble.",
  ru: "С возвращением! Сегодня я покажу вам кое-что удивительное.",
  th: "ยินดีต้อนรับกลับมา! วันนี้ฉันจะแสดงสิ่งที่น่าทึ่งให้คุณดู"
};

document.addEventListener("DOMContentLoaded", async () => {
  const microToast = document.getElementById("microToast");
  const toadAvatarWrap = document.getElementById("toadAvatarWrap");
  const toadSpeech = document.getElementById("toadSpeech");
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
  const autoAudioNoCCInput = document.getElementById("autoAudioNoCC");
  const softenProfanityInput = document.getElementById("softenProfanity");
  const hoverPauseDictInput = document.getElementById("hoverPauseDict");
  const connectedKeyBar = document.getElementById("connectedKeyBar");
  const connectedKeyText = document.getElementById("connectedKeyText");
  const changeKeyBtn = document.getElementById("changeKeyBtn");
  const keyEditorBox = document.getElementById("keyEditorBox");
  const vocabListEl = document.getElementById("vocabList");
  const vocabCountBadge = document.getElementById("vocabCountBadge");
  const exportVocabBtn = document.getElementById("exportVocabBtn");
  const clearVocabBtn = document.getElementById("clearVocabBtn");

  // Ngôn ngữ, Xưng hô & Phong cách
  const targetLangSelect = document.getElementById("targetLang");
  const secondaryLangSelect = document.getElementById("secondaryLang");
  const pronounStyleSelect = document.getElementById("pronounStyle");
  const translationStyleSelect = document.getElementById("translationStyle");

  // Tùy chỉnh giao diện phụ đề
  const previewStage = document.getElementById("previewStage");
  const previewBox = document.getElementById("previewBox");
  const previewOrig = document.getElementById("previewOrig");
  const previewVi = document.getElementById("previewVi");
  const subBgStyleSelect = document.getElementById("subBgStyle");
  const subFontSelect = document.getElementById("subFont");
  const overlayWidthInput = document.getElementById("overlayWidth");
  const overlayWidthVal = document.getElementById("overlayWidthVal");
  const subSizeInput = document.getElementById("subSize");
  const subSizeVal = document.getElementById("subSizeVal");
  const subBottomPosInput = document.getElementById("subBottomPos");
  const subBottomVal = document.getElementById("subBottomVal");
  const subColorInput = document.getElementById("subColor");
  const subSecondColorInput = document.getElementById("subSecondColor");
  const resetStyleBtn = document.getElementById("resetStyleBtn");
  const swatches = document.querySelectorAll(".swatch");

  const saveBtn = document.getElementById("saveBtn");
  const testBtn = document.getElementById("testBtn");
  const status = document.getElementById("status");

  let keysByProvider = { groq: "", gemini: "" };
  let verifiedKey = "";
  let verifyToken = 0;
  let toastTimer = null;

  function triggerMicroToast(msg = "✨ Đã áp dụng!") {
    if (!microToast) return;
    microToast.textContent = msg;
    microToast.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      microToast.classList.remove("show");
    }, 1350);
  }

  function triggerToadHop() {
    if (!toadAvatarWrap) return;
    toadAvatarWrap.classList.remove("toad-hop");
    void toadAvatarWrap.offsetWidth;
    toadAvatarWrap.classList.add("toad-hop");
  }

  function flashPreviewStage() {
    if (!previewStage) return;
    previewStage.classList.remove("preview-flash");
    void previewStage.offsetWidth;
    previewStage.classList.add("preview-flash");
    setTimeout(() => previewStage.classList.remove("preview-flash"), 450);
  }

  function animateTickRow(inputEl, labelText = "") {
    const row = inputEl?.closest(".checkbox-row, .pill-toggle");
    if (row) {
      row.classList.remove("tick-anim");
      void row.offsetWidth;
      row.classList.add("tick-anim");
    }
    triggerToadHop();
    if (labelText) {
      triggerMicroToast(`${inputEl.checked ? "✓ Bật" : "○ Tắt"}: ${labelText}`);
    }
  }

  // Chuyển Tab
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      const pane = document.getElementById(btn.dataset.tab);
      if (pane) pane.classList.add("active");
      triggerToadHop();
      updateLivePreview();
    });
  });

  function setToadSay(msg) {
    if (toadSpeech && msg) toadSpeech.textContent = msg;
  }

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

  function updateLivePreview() {
    if (!previewBox) return;
    const tLang = targetLangSelect.value || "vi";
    const sLang = secondaryLangSelect.value || "orig";
    const pStyle = pronounStyleSelect ? pronounStyleSelect.value : "auto";
    const showDual = dualSubInput.checked && sLang !== "none";

    previewOrig.style.display = showDual ? "block" : "none";
    previewOrig.textContent = SAMPLE_SENTENCES[sLang] || SAMPLE_SENTENCES.orig;

    if (tLang === "vi") {
      if (pStyle === "toi_ban") previewVi.textContent = SAMPLE_SENTENCES.vi_toi;
      else if (pStyle === "anh_em") previewVi.textContent = SAMPLE_SENTENCES.vi_anh;
      else previewVi.textContent = SAMPLE_SENTENCES.vi_minh;
    } else {
      previewVi.textContent = SAMPLE_SENTENCES[tLang] || SAMPLE_SENTENCES.vi;
    }

    const fontStack = FONT_FAMILY_MAP[subFontSelect.value] || FONT_FAMILY_MAP.default;
    const scale = (parseFloat(subSizeInput.value) || 100) / 100;
    const primaryColor = subColorInput.value || "#fef08a";
    const secondColor = subSecondColorInput.value || "#e2e8f0";
    const bgStyle = subBgStyleSelect.value || "toad";

    if (overlayWidthVal) overlayWidthVal.textContent = `${overlayWidthInput.value}%`;
    subSizeVal.textContent = `${subSizeInput.value}%`;
    subBottomVal.textContent = `${subBottomPosInput.value}%`;

    previewBox.style.fontFamily = fontStack;
    previewOrig.style.color = secondColor;
    previewOrig.style.fontSize = `${Math.round(11 * scale)}px`;
    previewVi.style.color = primaryColor;
    previewVi.style.fontSize = `${Math.round(14 * scale)}px`;

    // Áp dụng kiểu khung nền cho Preview
    previewBox.style.backdropFilter = "none";
    previewOrig.style.textShadow = "0 1px 2px rgba(0,0,0,0.9)";
    previewVi.style.textShadow = "0 1px 3px rgba(0,0,0,0.95)";

    if (bgStyle === "toad") {
      previewBox.style.background =
        "linear-gradient(135deg, rgba(12, 18, 34, 0.9) 0%, rgba(23, 37, 68, 0.9) 100%)";
      previewBox.style.border = "1.5px solid rgba(251, 191, 36, 0.55)";
    } else if (bgStyle === "glass") {
      previewBox.style.background = "rgba(15, 23, 42, 0.68)";
      previewBox.style.border = "1px solid rgba(255, 255, 255, 0.16)";
    } else if (bgStyle === "dark") {
      previewBox.style.background = "rgba(4, 6, 10, 0.95)";
      previewBox.style.border = "1px solid rgba(255, 255, 255, 0.08)";
    } else if (bgStyle === "outline") {
      previewBox.style.background = "transparent";
      previewBox.style.border = "none";
      previewOrig.style.textShadow =
        "-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000";
      previewVi.style.textShadow =
        "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000";
    }

    swatches.forEach((sw) => {
      sw.classList.toggle(
        "active",
        sw.dataset.color.toLowerCase() === primaryColor.toLowerCase()
      );
    });
  }

  function maskKey(k) {
    const trimmed = (k || "").trim();
    if (trimmed.length <= 12) return trimmed;
    return `${trimmed.slice(0, 7)}•••${trimmed.slice(-4)}`;
  }

  function showCompactConnectedMode(key, providerName) {
    if (!connectedKeyBar || !keyEditorBox) return;
    const pLabel = providerName === "groq" ? "Groq Cloud" : "Google Gemini";
    if (connectedKeyText) {
      connectedKeyText.innerHTML = `Đã kết nối <b>${pLabel}</b> (${maskKey(key)})`;
    }
    connectedKeyBar.style.display = "flex";
    keyEditorBox.style.display = "none";
  }

  function showKeyEditorMode() {
    if (!connectedKeyBar || !keyEditorBox) return;
    connectedKeyBar.style.display = "none";
    keyEditorBox.style.display = "block";
  }

  if (changeKeyBtn) {
    changeKeyBtn.addEventListener("click", () => {
      showKeyEditorMode();
      apiKeyInput.focus();
      apiKeyInput.select();
    });
  }

  function hideModelList() {
    if (!modelField) return;
    modelField.style.display = "none";
    modelSelect.innerHTML = "";
    if (modelCount) modelCount.textContent = "";
    detectedModelBadge.style.display = "none";
    showKeyEditorMode();
  }

  function showModelList(models, activeModel, preferredSetting = "auto") {
    if (!modelField) return;
    const list = Array.isArray(models)
      ? models.filter((m) => m && !m.includes("gemini-1.5") && !m.includes("gemini-1.0"))
      : [];
    if (
      activeModel &&
      activeModel !== "auto" &&
      !activeModel.includes("gemini-1.5") &&
      !list.includes(activeModel)
    ) {
      list.unshift(activeModel);
    }

    modelSelect.innerHTML = "";
    const autoOpt = document.createElement("option");
    autoOpt.value = "auto";
    autoOpt.textContent = "✨ Tự động xoay vòng Model (Âm thầm đổi khi hết Quota)";
    modelSelect.appendChild(autoOpt);

    for (const m of list) {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m === activeModel ? `✓ ${m} (Đang chạy)` : m;
      modelSelect.appendChild(opt);
    }

    if (preferredSetting && preferredSetting !== "auto" && list.includes(preferredSetting)) {
      modelSelect.value = preferredSetting;
    } else {
      modelSelect.value = "auto";
    }

    if (modelCount) modelCount.textContent = `${list.length} model`;
    modelField.style.display = list.length > 0 ? "block" : "none";

    if (activeModel) {
      detectedModelBadge.textContent = `✓ Đang chạy: ${activeModel} (Tự chuyển nếu hết Quota)`;
      detectedModelBadge.style.display = "inline-block";
    } else {
      detectedModelBadge.style.display = "none";
    }
    if (list.length > 0 && apiKeyInput.value.trim()) {
      showCompactConnectedMode(apiKeyInput.value.trim(), providerSelect.value);
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
      apiKeyLabel.textContent = "Gemini API Key (AIza... / AQ.):";
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
    fallbackToFree: true,
    autoAudioNoCC: true,
    softenProfanity: true,
    hoverPauseDict: true,
    savedVocab: [],
    targetLang: "vi",
    secondaryLang: "orig",
    pronounStyle: "auto",
    translationStyle: "natural",
    subFont: "default",
    overlayWidth: 72,
    subSize: "100",
    subColor: "#fef08a",
    subSecondColor: "#e2e8f0",
    subBgStyle: "toad",
    subBottomPos: "12"
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
  autoAudioNoCCInput.checked = Boolean(stored.autoAudioNoCC);
  if (softenProfanityInput) softenProfanityInput.checked = stored.softenProfanity !== false;
  if (hoverPauseDictInput) hoverPauseDictInput.checked = stored.hoverPauseDict !== false;

  targetLangSelect.value = stored.targetLang || "vi";
  secondaryLangSelect.value = stored.secondaryLang || "orig";
  if (pronounStyleSelect) pronounStyleSelect.value = stored.pronounStyle || "auto";
  translationStyleSelect.value = stored.translationStyle || "natural";

  subBgStyleSelect.value = stored.subBgStyle || "toad";
  subFontSelect.value = stored.subFont || "default";
  if (overlayWidthInput) overlayWidthInput.value = stored.overlayWidth || 72;
  subSizeInput.value = stored.subSize || "100";
  subBottomPosInput.value = stored.subBottomPos || "12";
  subColorInput.value = stored.subColor || "#fef08a";
  subSecondColorInput.value = stored.subSecondColor || "#e2e8f0";

  updateProviderUI(providerSelect.value);
  updateLivePreview();

  verifiedKey = stored.verifiedKey || "";
  const currentKey = apiKeyInput.value.trim();
  if (
    currentKey &&
    currentKey === verifiedKey &&
    stored.availableModels.length > 0 &&
    providerSelect.value !== "gtx"
  ) {
    const activeModel = stored.detectedModel || stored.availableModels[0];
    showModelList(stored.availableModels, activeModel, stored.model || "auto");
    setToadSay(`Ộp! Đang kết nối mượt mà với [${activeModel}] 🐸🎧`);
  } else {
    hideModelList();
  }

  if (!currentKey) {
    tryAutoReadClipboard(true);
  }

  // Lắng nghe sự kiện khi tab Google AI Studio tự động nhập Key hoặc khi Cóc âm thầm chuyển model
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
          model: "auto",
          availableModels: []
        },
        (s) => {
          if (s.geminiApiKey) keysByProvider.gemini = s.geminiApiKey;
          if (s.groqApiKey) keysByProvider.groq = s.groqApiKey;
          providerSelect.value = s.provider;
          updateProviderUI(s.provider, false);
          apiKeyInput.value = s.apiKey;
          verifiedKey = s.verifiedKey;
          showModelList(s.availableModels, s.detectedModel, s.model || "auto");
          triggerToadHop();
          triggerMicroToast("🎉 Đã tự động nạp Key!");
          setToadSay(`Ộp ộp! Đã tự động lấy Key thành công: [${s.detectedModel}] 🐸✨`);
          showStatus(
            `✓ Đã tự động nhận & kích hoạt API Key từ Google AI Studio! Đang dùng [${s.detectedModel}].`,
            "ok"
          );
        }
      );
    } else if (changes.detectedModel?.newValue && detectedModelBadge) {
      const newModel = changes.detectedModel.newValue;
      detectedModelBadge.textContent = `✓ Đang chạy: ${newModel} (Tự chuyển nếu hết Quota)`;
      detectedModelBadge.style.display = "inline-block";
    }
  });

  toggleKeyBtn.addEventListener("click", () => {
    const isHidden = apiKeyInput.type === "password";
    apiKeyInput.type = isHidden ? "text" : "password";
    toggleKeyBtn.textContent = isHidden ? "Ẩn" : "Hiện";
  });

  providerSelect.addEventListener("change", () => {
    const p = providerSelect.value;
    updateProviderUI(p);
    hideModelList();
    showStatus("");
    triggerToadHop();
    triggerMicroToast(`⚡ Chuyển bộ máy: ${p.toUpperCase()}`);
    const key = apiKeyInput.value.trim();
    if (p !== "gtx" && key && key === verifiedKey) {
      chrome.storage.local
        .get({ availableModels: [], model: "auto", detectedModel: "" })
        .then((s) => {
          if (s.availableModels.length > 0) {
            showModelList(s.availableModels, s.detectedModel || s.availableModels[0], s.model);
          }
        });
    }
  });

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

  // Tự động áp dụng ngay mọi thay đổi về ngôn ngữ, xưng hô, phong cách, phông chữ, màu sắc
  function syncInstantPreferences() {
    updateLivePreview();
    chrome.storage.local.set({
      enabled: enabledInput.checked,
      dualSub: dualSubInput.checked,
      fallbackToFree: fallbackInput.checked,
      autoAudioNoCC: autoAudioNoCCInput.checked,
      softenProfanity: softenProfanityInput ? softenProfanityInput.checked : true,
      hoverPauseDict: hoverPauseDictInput ? hoverPauseDictInput.checked : true,
      targetLang: targetLangSelect.value,
      secondaryLang: secondaryLangSelect.value,
      pronounStyle: pronounStyleSelect ? pronounStyleSelect.value : "auto",
      translationStyle: translationStyleSelect.value,
      subBgStyle: subBgStyleSelect.value,
      subFont: subFontSelect.value,
      overlayWidth: overlayWidthInput ? Number(overlayWidthInput.value) || 72 : 72,
      subSize: subSizeInput.value,
      overlayScale: Number(subSizeInput.value) || 100,
      subBottomPos: subBottomPosInput.value,
      overlayBottom: Number(subBottomPosInput.value) || 12,
      subColor: subColorInput.value,
      subSecondColor: subSecondColorInput.value
    });
  }

  // Hiệu ứng khi tick từng checkbox
  const checkboxConfigs = [
    [enabledInput, "Dịch phụ đề"],
    [dualSubInput, "Song ngữ 2 dòng"],
    [fallbackInput, "Dự phòng Google Translate"],
    [autoAudioNoCCInput, "AI Nghe & Dịch"],
    [softenProfanityInput, "Chế độ thân thiện"]
  ];
  checkboxConfigs.forEach(([el, label]) => {
    if (!el) return;
    el.addEventListener("change", () => {
      syncInstantPreferences();
      animateTickRow(el, label);
    });
  });

  // Hiệu ứng khi đổi ngôn ngữ / xưng hô / phong cách / giao diện
  [
    targetLangSelect,
    secondaryLangSelect,
    pronounStyleSelect,
    translationStyleSelect,
    subBgStyleSelect,
    subFontSelect
  ]
    .filter(Boolean)
    .forEach((el) => {
      el.addEventListener("change", () => {
        syncInstantPreferences();
        flashPreviewStage();
        triggerToadHop();
        if (el === pronounStyleSelect) {
          chrome.runtime.sendMessage({ type: "CLEAR_CACHE" }, () => void chrome.runtime.lastError);
          triggerMicroToast("🗣️ Đã đồng bộ ngôi xưng mới!");
          setToadSay("Ộp! Cóc đã khóa ngôi xưng xuyên suốt cho bạn! 🐸🗣️");
        } else {
          triggerMicroToast("✨ Đã cập nhật tùy chỉnh!");
        }
      });
    });

  [overlayWidthInput, subSizeInput, subBottomPosInput, subColorInput, subSecondColorInput]
    .filter(Boolean)
    .forEach((el) => {
      el.addEventListener("input", () => {
        syncInstantPreferences();
        flashPreviewStage();
      });
      el.addEventListener("change", () => {
        syncInstantPreferences();
        if (el === subColorInput || el === subSecondColorInput) {
          triggerToadHop();
          triggerMicroToast(`🎨 Đã đổi màu ${el.value.toUpperCase()}`);
        } else {
          triggerMicroToast("📐 Đã cập nhật kích thước!");
        }
      });
    });

  swatches.forEach((sw) => {
    sw.addEventListener("click", () => {
      subColorInput.value = sw.dataset.color;
      sw.classList.remove("swatch-pop");
      void sw.offsetWidth;
      sw.classList.add("swatch-pop");
      syncInstantPreferences();
      flashPreviewStage();
      triggerToadHop();
      triggerMicroToast(`🎨 Đã chọn màu ${sw.title || sw.dataset.color}`);
    });
  });

  resetStyleBtn.addEventListener("click", () => {
    subBgStyleSelect.value = "toad";
    subFontSelect.value = "default";
    if (overlayWidthInput) overlayWidthInput.value = "72";
    subSizeInput.value = "100";
    subBottomPosInput.value = "12";
    subColorInput.value = "#fef08a";
    subSecondColorInput.value = "#e2e8f0";
    syncInstantPreferences();
    flashPreviewStage();
    triggerToadHop();
    triggerMicroToast("↺ Đã khôi phục mặc định!");
    showStatus("✓ Đã khôi phục giao diện phụ đề Translate Toad mặc định!", "ok");
  });

  modelSelect.addEventListener("change", async () => {
    const m = modelSelect.value;
    await chrome.storage.local.set({
      model: m,
      detectedModel: m === "auto" ? stored.detectedModel : m
    });
    chrome.runtime.sendMessage({ type: "CLEAR_CACHE" }, () => void chrome.runtime.lastError);
    detectedModelBadge.textContent = `✓ Đang dùng model: ${m}`;
    detectedModelBadge.style.display = "inline-block";
    triggerToadHop();
    triggerMicroToast(`🤖 Model: ${m}`);
    showStatus(`✓ Đã chọn model [${m}]. Nếu model lỗi, Cóc tự chuyển sang model khác!`, "ok");
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
          "⚠ Chưa thấy API Key (AIza... / AQ... / gsk_...) trong Clipboard. Hãy bấm '⚡ Tự động lấy Key từ Google AI Studio'!",
          "err"
        );
      }
    } catch {
      if (!silent) {
        showStatus(
          "⚠ Không thể đọc Clipboard. Hãy bấm '⚡ Tự động lấy Key từ Google AI Studio' hoặc dán trực tiếp.",
          "err"
        );
      }
    }
    return false;
  }

  pasteKeyBtn.addEventListener("click", () => {
    tryAutoReadClipboard(false);
  });

  autoImportBtn.addEventListener("click", async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      const match = (clipText || "").trim().match(CLIPBOARD_KEY_REGEX);
      if (match && match[1] !== apiKeyInput.value.trim()) {
        const foundKey = match[1];
        const detected = detectProviderFromKey(foundKey);
        if (detected) {
          providerSelect.value = detected;
          keysByProvider[detected] = foundKey;
          updateProviderUI(detected, true);
        }
        apiKeyInput.value = foundKey;
        verifyKey(foundKey);
        return;
      }
    } catch {
      // Tiếp tục mở Google AI Studio bên dưới
    }

    setToadSay("Ộp! Đang mở Google AI Studio để lấy Key cho bạn... 🐸🚀");
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

    syncInstantPreferences();
    await chrome.storage.local.set({
      provider: p,
      apiKey: key,
      groqApiKey: keysByProvider.groq,
      geminiApiKey: keysByProvider.gemini,
      model: modelValue
    });

    if (!silent) {
      triggerToadHop();
      triggerMicroToast("💾 Đã lưu cài đặt!");
      setToadSay("Ộp ộp! Đã lưu mọi tùy chỉnh phụ đề của bạn! 🐸💛");
      showStatus("✓ Đã lưu toàn bộ cài đặt thành công!", "ok");
      if (saveBtn) {
        const origText = saveBtn.textContent;
        saveBtn.classList.add("btn-saved-anim");
        saveBtn.textContent = "✨ Đã lưu thành công!";
        setTimeout(() => {
          saveBtn.classList.remove("btn-saved-anim");
          saveBtn.textContent = origText;
        }, 1250);
      }
    }
  }

  function verifyKey(keyToTest, keepSelectedModel = false) {
    const key = (keyToTest || apiKeyInput.value || "").trim();
    if (!key) {
      showStatus(
        "⚠ Vui lòng nhập API Key hoặc bấm '🚀 Tự động lấy Key từ Google AI Studio' ở trên.",
        "err"
      );
      return;
    }

    const token = ++verifyToken;
    setToadSay("Đợi Cóc vài giây để kiểm tra Key và dò model nhé... 🐸🔍");
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
          setToadSay("Ối! Key này chưa hợp lệ rồi, thử lấy lại Key nhé! 🐸💦");
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
        showModelList(res.availableModels || [], res.modelUsed, preferred);

        await saveCurrentSettings(true);
        await chrome.storage.local.set({
          verifiedKey: key,
          availableModels: res.availableModels || [],
          detectedModel: res.modelUsed,
          model: preferred || "auto"
        });

        triggerToadHop();
        if (res.isQuotaExceeded) {
          triggerMicroToast(`🐸 Đã lưu Key (Tự động kích hoạt Dự phòng Miễn phí)`);
          setToadSay(`Key chuẩn rồi! Cóc tự động kích hoạt Dự phòng Không Giới Hạn khi Google hết Quota nhé! 🐸🛡️`);
          showStatus(
            `✓ API Key hợp lệ! Đã lưu thành công.\n🛡️ Lưu ý: Google đang tạm giới hạn lượt gọi ngày của Project này (${res.modelUsed}).\n✨ VIE-Translate đã TỰ ĐỘNG KÍCH HOẠT chế độ Dự phòng Google Translate Không Giới Hạn để bạn xem video ngay tức thì mà không cần chờ đợi!`,
            "ok"
          );
        } else {
          triggerMicroToast(`🐸 Kết nối: ${res.modelUsed}`);
          setToadSay(`Tuyệt vời! Cóc đang dịch bằng [${res.modelUsed}] 🐸🎧`);
          showStatus(
            `✓ API Key hợp lệ! Tìm thấy ${(res.availableModels || []).length} model. Đang dùng [${res.modelUsed}] (Tự động chuyển model khác nếu hết Quota).\nDịch thử: "${res.sample}"`,
            "ok"
          );
        }
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

  const LANG_SPEECH_MAP = {
    en: "en-US",
    fr: "fr-FR",
    ja: "ja-JP",
    ko: "ko-KR",
    "zh-CN": "zh-CN",
    "zh-TW": "zh-TW",
    de: "de-DE",
    es: "es-ES",
    ru: "ru-RU",
    th: "th-TH",
    vi: "vi-VN"
  };

  function detectLanguageForSpeech(text, langHint = "") {
    if (langHint && LANG_SPEECH_MAP[langHint]) {
      return LANG_SPEECH_MAP[langHint];
    }
    const t = String(text || "").trim();
    if (!t) return "en-US";
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(t)) return "ja-JP";
    if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(t)) return "ko-KR";
    if (/[\u4E00-\u9FFF]/.test(t)) return "zh-CN";
    if (/[\u0400-\u04FF]/.test(t)) return "ru-RU";
    if (/[\u0E00-\u0E7F]/.test(t)) return "th-TH";
    if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/.test(t)) {
      return "vi-VN";
    }
    if (/[éèêëàâôûùçîïœæ]/i.test(t)) return "fr-FR";
    if (/[äöüß]/i.test(t)) return "de-DE";
    if (/[áéíóúñ¿¡]/i.test(t)) return "es-ES";
    if (secondaryLangSelect?.value && LANG_SPEECH_MAP[secondaryLangSelect.value]) {
      return LANG_SPEECH_MAP[secondaryLangSelect.value];
    }
    return "en-US";
  }

  function getBestVoiceForLang(bcpLang) {
    if (!("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return null;
    const cleanTarget = bcpLang.toLowerCase().replace("_", "-");
    const primaryTag = cleanTarget.split("-")[0];
    let match = voices.find((v) => (v.lang || "").toLowerCase().replace("_", "-") === cleanTarget);
    if (match) return match;
    const tagMatches = voices.filter((v) =>
      (v.lang || "").toLowerCase().replace("_", "-").startsWith(primaryTag)
    );
    if (tagMatches.length > 0) {
      const natural = tagMatches.find((v) => /google|natural|premium|online/i.test(v.name));
      return natural || tagMatches[0];
    }
    return null;
  }

  if ("speechSynthesis" in window) {
    window.speechSynthesis.onvoiceschanged = () => {
      try {
        window.speechSynthesis.getVoices();
      } catch {}
    };
  }

  function speakWordWithNativeVoice(word, langHint = "") {
    if (!("speechSynthesis" in window) || !word) return;
    try {
      window.speechSynthesis.cancel();
      const targetLang = detectLanguageForSpeech(word, langHint);
      const u = new SpeechSynthesisUtterance(word);
      u.lang = targetLang;
      const voice = getBestVoiceForLang(targetLang);
      if (voice) {
        u.voice = voice;
      }
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    } catch {
      // ignore
    }
  }

  // ============================================================================
  // SỔ TỪ VỰNG HỌC NGOẠI NGỮ (VOCABULARY NOTEBOOK)
  // ============================================================================
  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getVocabPosClass(posText) {
    const p = (posText || "").toLowerCase();
    if (/động từ|\bverb\b/.test(p)) return "pos-verb";
    if (/danh từ|\bnoun\b/.test(p)) return "pos-noun";
    if (/tính từ|\badj/.test(p)) return "pos-adj";
    if (/trạng từ|\badv/.test(p)) return "pos-adv";
    if (/thành ngữ|\bidiom\b/.test(p)) return "pos-idiom";
    if (/lóng|\bslang\b/.test(p)) return "pos-slang";
    if (/cụm động từ|phrasal/.test(p)) return "pos-phrasal";
    return "";
  }

  function categorizeVocabPos(posText) {
    const p = (posText || "").toLowerCase();
    if (/động từ|\bverb\b/.test(p) && !/thành ngữ|idiom/.test(p)) return "verb";
    if (/danh từ|\bnoun\b/.test(p)) return "noun";
    if (/tính từ|\badjective\b|\badj\b/.test(p)) return "adj";
    if (/thành ngữ|idiom|lóng|slang|phrasal|cụm/.test(p)) return "idiom";
    return "other";
  }

  let currentPosFilter = "all";
  let cachedVocabList = [];

  function renderVocabNotebook(vocabArr) {
    const list = Array.isArray(vocabArr) ? vocabArr : [];
    cachedVocabList = list;
    if (vocabCountBadge) {
      vocabCountBadge.textContent = list.length > 0 ? `(${list.length})` : "";
    }

    const countAllEl = document.getElementById("countAll");
    const countVerbEl = document.getElementById("countVerb");
    const countNounEl = document.getElementById("countNoun");
    const countAdjEl = document.getElementById("countAdj");
    const countIdiomEl = document.getElementById("countIdiom");
    const countOtherEl = document.getElementById("countOther");

    if (countAllEl) countAllEl.textContent = list.length ? `(${list.length})` : "";
    if (countVerbEl) {
      const c = list.filter((x) => categorizeVocabPos(x.posCategory || x.pos) === "verb").length;
      countVerbEl.textContent = c ? `(${c})` : "";
    }
    if (countNounEl) {
      const c = list.filter((x) => categorizeVocabPos(x.posCategory || x.pos) === "noun").length;
      countNounEl.textContent = c ? `(${c})` : "";
    }
    if (countAdjEl) {
      const c = list.filter((x) => categorizeVocabPos(x.posCategory || x.pos) === "adj").length;
      countAdjEl.textContent = c ? `(${c})` : "";
    }
    if (countIdiomEl) {
      const c = list.filter((x) => categorizeVocabPos(x.posCategory || x.pos) === "idiom").length;
      countIdiomEl.textContent = c ? `(${c})` : "";
    }
    if (countOtherEl) {
      const c = list.filter((x) => categorizeVocabPos(x.posCategory || x.pos) === "other").length;
      countOtherEl.textContent = c ? `(${c})` : "";
    }

    if (!vocabListEl) return;

    if (list.length === 0) {
      vocabListEl.innerHTML = `
        <div class="vocab-empty">
          🐸 <b>Sổ từ vựng của bạn đang trống!</b><br>
          Khi xem video có bật <b>Song ngữ 2 dòng</b>, hãy rê chuột vào khung phụ đề (video sẽ tự dừng) và <b>bấm vào bất kỳ từ nào</b> để nghe phát âm giọng bản xứ, xem từ loại, ví dụ thực tế &amp; lưu từ vào đây nhé!
        </div>
      `;
      return;
    }

    const filteredList =
      currentPosFilter === "all"
        ? list.map((item, originalIdx) => ({ item, originalIdx }))
        : list
            .map((item, originalIdx) => ({ item, originalIdx }))
            .filter(({ item }) => categorizeVocabPos(item.posCategory || item.pos) === currentPosFilter);

    if (filteredList.length === 0) {
      vocabListEl.innerHTML = `
        <div class="vocab-empty">
          Chưa có từ vựng nào thuộc nhóm này trong Sổ từ. Hãy chọn mục khác hoặc chạm vào từ trên video để thêm nhé!
        </div>
      `;
      return;
    }

    vocabListEl.innerHTML = "";
    filteredList.forEach(({ item, originalIdx }) => {
      const card = document.createElement("div");
      card.className = "vocab-item";
      const posClass = getVocabPosClass(item.pos);
      const posVariants = Array.isArray(item.posVariants) ? item.posVariants : [];
      const examplesList = Array.isArray(item.examples) ? item.examples : [];
      const synonymList = Array.isArray(item.synonyms)
        ? item.synonyms
        : (typeof item.synonyms === "string" ? item.synonyms.split(",").map((s) => s.trim()).filter(Boolean) : []);

      card.innerHTML = `
        <div class="vocab-item-top">
          <div class="vocab-word-group">
            <span class="vocab-word" title="Bấm để nghe phát âm giọng bản xứ">🔊 ${escapeHtml(item.word || "")}</span>
            ${item.pron ? `<span class="vocab-pron">/${escapeHtml(item.pron.replace(/^\/|\/$/g, ""))}/</span>` : ""}
            ${item.pos ? `<span class="vocab-pos ${posClass}">${escapeHtml(item.pos)}</span>` : ""}
          </div>
          <button type="button" class="btn-toggle-key vocab-del-btn" data-idx="${originalIdx}" style="padding:2px 6px;font-size:10.5px;" title="Xóa từ này">✕</button>
        </div>
        <div class="vocab-meaning">🎯 ${escapeHtml(item.meaning || "")}</div>
        ${item.sentence ? `<div class="vocab-ctx">🎬 Ngữ cảnh phim: "${escapeHtml(item.sentence)}"</div>` : ""}
        ${
          posVariants.length > 0
            ? `
        <div class="vocab-multipos-box">
          <div class="vocab-section-heading">🔄 So sánh khi dùng ở các từ loại khác nhau:</div>
          ${posVariants
            .map(
              (v) => `
            <div class="vocab-multipos-row">
              <span class="vocab-pos ${getVocabPosClass(v.pos)}" style="font-size:9.5px;padding:0.5px 5px;">${escapeHtml(v.pos)}</span>
              <span class="vocab-multipos-text">${escapeHtml(v.desc)}</span>
            </div>`
            )
            .join("")}
        </div>`
            : ""
        }
        ${
          examplesList.length > 0
            ? `
        <div class="vocab-examples-box">
          <div class="vocab-section-heading">🗣️ Ví dụ khác ngoài đời:</div>
          ${examplesList
            .map(
              (ex) => `
            <div class="vocab-ex-item">
              <span class="vocab-ex-orig" title="Bấm để nghe đọc câu này">🔊 ${escapeHtml(ex.orig || "")}</span>
              ${ex.trans ? `<span class="vocab-ex-trans">➔ ${escapeHtml(ex.trans)}</span>` : ""}
            </div>`
            )
            .join("")}
        </div>`
            : ""
        }
        ${item.fact || item.funFact ? `<div class="vocab-fact-box">✨ <b>Fact &amp; Mẹo nhớ:</b> ${escapeHtml(item.fact || item.funFact)}</div>` : ""}
        ${
          synonymList.length > 0
            ? `
        <div class="vocab-syn-row">
          <span style="font-weight:600;color:#94a3b8;">🧩 Đi kèm / Đồng nghĩa:</span>
          ${synonymList.map((s) => `<span class="vocab-syn-pill">${escapeHtml(s)}</span>`).join("")}
        </div>`
            : ""
        }
      `;

      card.querySelector(".vocab-word")?.addEventListener("click", () => {
        speakWordWithNativeVoice(item.word, item.lang || "");
      });

      card.querySelectorAll(".vocab-ex-orig").forEach((el, exIdx) => {
        el.addEventListener("click", () => {
          const ex = examplesList[exIdx];
          if (ex?.orig) speakWordWithNativeVoice(ex.orig, item.lang || "");
        });
      });

      card.querySelector(".vocab-del-btn")?.addEventListener("click", async () => {
        const next = list.filter((_, i) => i !== originalIdx);
        await chrome.storage.local.set({ savedVocab: next });
        renderVocabNotebook(next);
      });

      vocabListEl.appendChild(card);
    });
  }

  const filterChips = document.querySelectorAll(".vocab-filter-chip");
  filterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      filterChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      currentPosFilter = chip.dataset.pos || "all";
      renderVocabNotebook(cachedVocabList);
    });
  });

  renderVocabNotebook(stored.savedVocab || []);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.savedVocab) {
      renderVocabNotebook(changes.savedVocab.newValue || []);
    }
  });

  if (exportVocabBtn) {
    exportVocabBtn.addEventListener("click", async () => {
      const s = await chrome.storage.local.get({ savedVocab: [] });
      const list = s.savedVocab || [];
      if (!list.length) {
        showStatus("⚠ Sổ từ vựng đang trống, hãy chạm từ trên phụ đề video để lưu trước nhé!", "err");
        return;
      }
      const lines = list.map((v, i) => {
        const parts = [
          `${i + 1}. ${v.word} ${v.pron ? `(/${v.pron}/)` : ""} [${v.pos || "Từ vựng"}]`,
          `   • Nghĩa: ${v.meaning}`
        ];
        if (v.sentence) parts.push(`   • Ngữ cảnh phim: "${v.sentence}"`);
        if (Array.isArray(v.posVariants) && v.posVariants.length) {
          parts.push(`   • So sánh khi dùng ở các từ loại khác nhau:`);
          v.posVariants.forEach((pv) => {
            parts.push(`     - [${pv.pos}]: ${pv.desc}`);
          });
        }
        if (Array.isArray(v.examples) && v.examples.length) {
          parts.push(`   • Ví dụ thực tế ngoài đời:`);
          v.examples.forEach((ex) => {
            parts.push(`     - ${ex.orig || ""}${ex.trans ? ` ➔ ${ex.trans}` : ""}`);
          });
        }
        if (v.fact) parts.push(`   • Fact thú vị & Mẹo nhớ: ${v.fact}`);
        if (Array.isArray(v.synonyms) && v.synonyms.length) {
          parts.push(`   • Đồng nghĩa / Đi kèm: ${v.synonyms.join(", ")}`);
        }
        return parts.join("\n");
      });
      const separator = "\n\n" + "—".repeat(45) + "\n\n";
      const blob = new Blob([lines.join(separator)], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `VIE-Translate-Vocab-${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      showStatus(`✓ Đã xuất ${list.length} từ vựng ra file .txt!`, "ok");
    });
  }

  if (clearVocabBtn) {
    clearVocabBtn.addEventListener("click", async () => {
      await chrome.storage.local.set({ savedVocab: [] });
      renderVocabNotebook([]);
      showStatus("✓ Đã xóa sạch Sổ từ vựng.", "ok");
    });
  }
});