const CLIPBOARD_KEY_REGEX = /\b(AIza[0-9A-Za-z_-]{35}|AQ\.[0-9A-Za-z._-]{24,}|gsk_[0-9A-Za-z]{20,}|sk-or-v1-[0-9A-Za-z]{20,})\b/;

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
  const selectionTranslateInput = document.getElementById("selectionTranslate");
  const hotkeysEnabledInput = document.getElementById("hotkeysEnabled");
  const autoCheckUpdatesInput = document.getElementById("autoCheckUpdates");
  const quickWebTranslateBtn = document.getElementById("quickWebTranslateBtn");
  const quickExportSrtBtn = document.getElementById("quickExportSrtBtn");
  const quickOcrBtn = document.getElementById("quickOcrBtn");
  const engineHealthText = document.getElementById("engineHealthText");
  const resetCooldownBtn = document.getElementById("resetCooldownBtn");
  const checkUpdateMiniBtn = document.getElementById("checkUpdateMiniBtn");
  const updateBanner = document.getElementById("updateBanner");
  const updateBannerTitle = document.getElementById("updateBannerTitle");
  const updateBannerMeta = document.getElementById("updateBannerMeta");
  const dismissUpdateBtn = document.getElementById("dismissUpdateBtn");
  const copyGitPullBtn = document.getElementById("copyGitPullBtn");
  const openGithubUpdateLink = document.getElementById("openGithubUpdateLink");
  const reloadExtBtn = document.getElementById("reloadExtBtn");
  const connectedKeyBar = document.getElementById("connectedKeyBar");
  const connectedKeyText = document.getElementById("connectedKeyText");
  const changeKeyBtn = document.getElementById("changeKeyBtn");
  const keyEditorBox = document.getElementById("keyEditorBox");
  const vocabListEl = document.getElementById("vocabList");
  const vocabCountBadge = document.getElementById("vocabCountBadge");
  const vocabSearchInput = document.getElementById("vocabSearchInput");
  const exportVocabBtn = document.getElementById("exportVocabBtn");
  const exportAnkiBtn = document.getElementById("exportAnkiBtn");
  const clearVocabBtn = document.getElementById("clearVocabBtn");
  const subnavVocabBtn = document.getElementById("subnavVocabBtn");
  const subnavFlashcardBtn = document.getElementById("subnavFlashcardBtn");
  const subnavGlossaryBtn = document.getElementById("subnavGlossaryBtn");
  const paneVocabSub = document.getElementById("paneVocabSub");
  const paneFlashcardSub = document.getElementById("paneFlashcardSub");
  const flashcardStage = document.getElementById("flashcardStage");
  const paneGlossarySub = document.getElementById("paneGlossarySub");
  const exportBackupBtn = document.getElementById("exportBackupBtn");
  const importBackupBtn = document.getElementById("importBackupBtn");
  const importBackupFile = document.getElementById("importBackupFile");
  const glossarySrcInput = document.getElementById("glossarySrcInput");
  const glossaryTargetInput = document.getElementById("glossaryTargetInput");
  const addGlossaryBtn = document.getElementById("addGlossaryBtn");
  const glossaryListEl = document.getElementById("glossaryList");
  const glossaryCountBadge = document.getElementById("glossaryCountBadge");

  // Ngôn ngữ, Xưng hô & Phong cách
  const targetLangSelect = document.getElementById("targetLang");
  const secondaryLangSelect = document.getElementById("secondaryLang");
  const pronounStyleSelect = document.getElementById("pronounStyle");
  const translationStyleSelect = document.getElementById("translationStyle");
  const autoPersonaInput = document.getElementById("autoPersona");
  const smartMergeCaptionsInput = document.getElementById("smartMergeCaptions");
  const multiSpeakerSplitInput = document.getElementById("multiSpeakerSplit");

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

  const SUBTLE_EASTER_EGGS = [
    "🎬 Vietsub mượt đến mức cứ ngỡ đang cày bộ phim mới lúc nửa đêm...",
    "🍿 Chất lượng phụ đề nét căng chuẩn rạp, hội mê rổ phim nhìn là ưng bụng liền!",
    "🐸 Đổi bao nhiêu tên miền đi nữa thì Cóc vẫn ở đây dịch phim mới cho bạn!",
    "✨ Góc nhỏ cho dân sành phim: Nhặt trọn từng câu thoại vào chiếc rổ kỷ niệm!"
  ];
  let easterEggIdx = 0;

  function triggerToadHop() {
    if (!toadAvatarWrap) return;
    toadAvatarWrap.classList.remove("toad-hop");
    void toadAvatarWrap.offsetWidth;
    toadAvatarWrap.classList.add("toad-hop");
  }

  if (toadAvatarWrap) {
    toadAvatarWrap.style.cursor = "pointer";
    toadAvatarWrap.title = "Bấm vào Cóc để nghe tâm sự điện ảnh 🐸🍿";
    toadAvatarWrap.addEventListener("click", () => {
      triggerToadHop();
      const quote = SUBTLE_EASTER_EGGS[easterEggIdx % SUBTLE_EASTER_EGGS.length];
      easterEggIdx++;
      setToadSay(quote);
      triggerMicroToast("🍿 Easter Egg Điện Ảnh!");
    });
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

    const tStyle = translationStyleSelect ? translationStyleSelect.value : "natural";
    if (tStyle === "unhinged") {
      previewVi.textContent = "💀 Quả rizz này skibidi vãi chưởng, múa quạt như Khá Bảnh ở Ohio luôn lil bro! 🐶🔥";
    } else if (tLang === "vi") {
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

    const widthPct = Math.max(35, Math.min(98, Number(overlayWidthInput?.value) || 72));
    const bottomPct = Math.max(3, Math.min(45, Number(subBottomPosInput?.value) || 12));

    if (overlayWidthVal) overlayWidthVal.textContent = `${widthPct}%`;
    subSizeVal.textContent = `${subSizeInput.value}%`;
    subBottomVal.textContent = `${bottomPct}%`;

    previewBox.style.width = `${widthPct}%`;
    previewBox.style.maxWidth = "96%";
    previewBox.style.position = "absolute";
    previewBox.style.left = "50%";
    previewBox.style.transform = "translateX(-50%)";
    previewBox.style.bottom = `${bottomPct}%`;
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
    const hasOwnSection = provider === "gtx" || provider === "ollama" || provider === "openai";
    apiSection.style.display = hasOwnSection ? "none" : "block";
    testBtn.style.display = hasOwnSection ? "none" : "inline-block";

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
    if (key.startsWith("sk-or-")) return "openai";
    return "";
  }

  // Đọc dữ liệu đã lưu
  const stored = await chrome.storage.local.get({
    enabled: true,
    dualSub: true,
    provider: "gemini",
    apiKey: "",
    backupKeys: "",
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
    selectionTranslate: true,
    hotkeysEnabled: true,
    autoCheckUpdates: true,
    savedVocab: [],
    customGlossary: [],
    autoPersona: true,
    smartMergeCaptions: true,
    multiSpeakerSplit: true,
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

  const backupKeysEl = document.getElementById("backupKeys");
  if (backupKeysEl) {
    backupKeysEl.value = stored.backupKeys || "";
    backupKeysEl.addEventListener("change", () => chrome.storage.local.set({ backupKeys: backupKeysEl.value.trim() }));
  }

  enabledInput.checked = Boolean(stored.enabled);
  dualSubInput.checked = Boolean(stored.dualSub);
  providerSelect.value = stored.provider || "gemini";
  fallbackInput.checked = Boolean(stored.fallbackToFree);
  autoAudioNoCCInput.checked = Boolean(stored.autoAudioNoCC);
  if (softenProfanityInput) softenProfanityInput.checked = stored.softenProfanity !== false;
  if (hoverPauseDictInput) hoverPauseDictInput.checked = stored.hoverPauseDict !== false;
  if (selectionTranslateInput) selectionTranslateInput.checked = stored.selectionTranslate !== false;
  if (hotkeysEnabledInput) hotkeysEnabledInput.checked = stored.hotkeysEnabled !== false;
  if (autoCheckUpdatesInput) autoCheckUpdatesInput.checked = stored.autoCheckUpdates !== false;
  if (autoPersonaInput) autoPersonaInput.checked = stored.autoPersona !== false;
  if (smartMergeCaptionsInput) smartMergeCaptionsInput.checked = stored.smartMergeCaptions !== false;
  if (multiSpeakerSplitInput) multiSpeakerSplitInput.checked = stored.multiSpeakerSplit !== false;

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

  const localManifestVersion = (chrome.runtime.getManifest && chrome.runtime.getManifest()?.version) || "1.0.0";
  if (checkUpdateMiniBtn) {
    checkUpdateMiniBtn.textContent = `v${localManifestVersion} ↻`;
  }

  function refreshEngineHealth() {
    if (!engineHealthText) return;
    chrome.runtime.sendMessage({ type: "GET_ENGINE_STATS" }, (res) => {
      if (chrome.runtime.lastError || !res?.ok) return;
      const st = res.stats || {};
      const lastInfo = st.lastModel ? `${st.lastProvider || ""} (${st.lastModel})` : (providerSelect?.value || "gemini");
      engineHealthText.textContent = `⚡ ${lastInfo} • Đã dịch: ${st.totalTranslated || 0} • Cache: ${res.cacheSize || 0}`;
      if (resetCooldownBtn) {
        resetCooldownBtn.style.display = res.cooldownKeysCount > 0 ? "inline-flex" : "none";
      }
    });
  }
  refreshEngineHealth();

  resetCooldownBtn?.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "RESET_COOLDOWNS" }, () => {
      triggerMicroToast("↺ Đã làm mới hàng đợi API Key!");
      refreshEngineHealth();
    });
  });

  function isRestrictedTabUrl(url) {
    const tabUrl = String(url || "").trim();
    if (!tabUrl) return true;
    return (
      /^(chrome|edge|about|chrome-extension|moz-extension|devtools|view-source):/i.test(tabUrl) ||
      /^https?:\/\/chromewebstore\.google\.com/i.test(tabUrl) ||
      /^https?:\/\/microsoftedge\.microsoft\.com\/addons/i.test(tabUrl)
    );
  }

  function sendToActiveTab(payload, onDone) {
    if (!chrome.tabs?.query) return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs?.[0];
      if (!tab?.id) {
        showStatus("⚠ Không tìm thấy tab đang mở.", "err");
        return;
      }
      if (isRestrictedTabUrl(tab.url)) {
        showStatus(
          "⚠ Không thể chạy trên trang nội bộ hoặc trang được trình duyệt bảo vệ (chrome://, edge://, New Tab...). Hãy mở một trang web thông thường!",
          "err"
        );
        return;
      }
      chrome.tabs.sendMessage(tab.id, payload, (res) => {
        if (chrome.runtime.lastError) {
          showStatus("⚠ Hãy tải lại trang web (F5) rồi thử lại nhé!", "err");
          return;
        }
        if (typeof onDone === "function") onDone(res);
      });
    });
  }

  quickWebTranslateBtn?.addEventListener("click", () => {
    sendToActiveTab({ type: "TOGGLE_WEBPAGE_TRANSLATE" }, (res) => {
      triggerToadHop();
      if (res?.active) {
        triggerMicroToast("🌐 Đang dịch song ngữ trang web!");
        showStatus(`✓ Đã bật dịch song ngữ trang (${res.totalBlocks || 0} đoạn văn).`, "ok");
      } else {
        triggerMicroToast("🌐 Đã tắt dịch trang web");
      }
    });
  });

  quickExportSrtBtn?.addEventListener("click", () => {
    sendToActiveTab({ type: "EXPORT_VIDEO_SRT" }, (res) => {
      triggerToadHop();
      if (res?.ok) {
        triggerMicroToast(`📥 Đã xuất ${res.count} dòng .SRT!`);
        showStatus(`✓ Đã tải xuống file phụ đề song ngữ (.SRT) gồm ${res.count} dòng!`, "ok");
      } else {
        showStatus(`⚠ ${res?.error || "Trang hiện tại chưa có phụ đề video để xuất."}`, "err");
      }
    });
  });

  quickOcrBtn?.addEventListener("click", () => {
    sendToActiveTab({ type: "TRIGGER_SCREEN_OCR" }, (res) => {
      triggerToadHop();
      if (res?.ok) {
        triggerMicroToast("🔍 Đang quét chữ trên khung hình!");
        window.close?.();
      } else {
        showStatus(`⚠ ${res?.error || "Không tìm thấy video đang phát."}`, "err");
      }
    });
  });

  let currentUpdateId = "";
  function renderUpdateBanner(st) {
    if (!updateBanner) return;
    const autoOn = !autoCheckUpdatesInput || autoCheckUpdatesInput.checked;
    const shouldShow = Boolean(
      st?.hasUpdate &&
      st.updateId &&
      st.dismissedCommitSha !== st.updateId &&
      (autoOn || st._manualCheck)
    );
    if (!shouldShow) {
      updateBanner.style.display = "none";
      return;
    }

    currentUpdateId = st.updateId || "";
    const verChanged = st.remoteVersion && st.remoteVersion !== (st.localVersion || localManifestVersion);
    if (updateBannerTitle) {
      updateBannerTitle.textContent = verChanged
        ? `🚀 Có bản mới v${st.remoteVersion}!`
        : `🚀 GitHub có cập nhật mới (#${st.remoteShortSha || "main"})!`;
    }
    if (updateBannerMeta) {
      const msgPart = st.commitMessage ? `${st.commitMessage}` : "Phát hiện thay đổi mới trên nhánh main";
      const fileCount = Array.isArray(st.changedFiles) ? st.changedFiles.length : 0;
      const hint = fileCount > 0
        ? ` (Thay đổi ${fileCount} file — kéo code mới rồi bấm Nạp lại)`
        : " (Kéo code mới rồi bấm Nạp lại để áp dụng)";
      updateBannerMeta.textContent = `${msgPart}${hint}`;
    }
    if (openGithubUpdateLink) {
      openGithubUpdateLink.href = st.commitUrl || st.repoUrl || "https://github.com/chu0n6-iot/VIE-Translate-by-me-";
    }
    updateBanner.style.display = "block";
  }

  chrome.runtime.sendMessage({ type: "GET_UPDATE_STATUS" }, (res) => {
    if (!chrome.runtime.lastError && res?.ok) {
      renderUpdateBanner(res);
    }
  });

  if (checkUpdateMiniBtn) {
    checkUpdateMiniBtn.addEventListener("click", () => {
      checkUpdateMiniBtn.disabled = true;
      checkUpdateMiniBtn.textContent = "⏳...";
      showStatus("⏳ Đang kiểm tra cập nhật trên GitHub...", "wait");
      chrome.runtime.sendMessage({ type: "CHECK_GITHUB_UPDATE" }, (res) => {
        checkUpdateMiniBtn.disabled = false;
        checkUpdateMiniBtn.textContent = `v${localManifestVersion} ↻`;
        if (chrome.runtime.lastError || !res?.ok) {
          showStatus("⚠ Không kiểm tra được GitHub lúc này.", "err");
          return;
        }
        if (res.hasUpdate) {
          res._manualCheck = true;
          renderUpdateBanner(res);
          triggerToadHop();
          setToadSay("Ộp! Có bản mới trên GitHub rồi nè! 🐸🚀");
          showStatus("🚀 Đã phát hiện thay đổi mới trên GitHub!", "ok");
        } else {
          renderUpdateBanner(res);
          triggerMicroToast("✅ Đang ở bản mới nhất!");
          showStatus("✓ Bạn đang dùng phiên bản mới nhất trên GitHub!", "ok");
        }
      });
    });
  }

  if (copyGitPullBtn) {
    copyGitPullBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText("git pull origin main");
      } catch {}
      triggerMicroToast("📋 Đã copy: git pull origin main");
    });
  }

  if (reloadExtBtn) {
    reloadExtBtn.addEventListener("click", () => {
      triggerMicroToast("🔄 Đang nạp lại tiện ích...");
      chrome.runtime.sendMessage({ type: "RELOAD_EXTENSION" }, () => void chrome.runtime.lastError);
    });
  }

  if (dismissUpdateBtn) {
    dismissUpdateBtn.addEventListener("click", () => {
      if (updateBanner) updateBanner.style.display = "none";
      chrome.runtime.sendMessage(
        { type: "DISMISS_UPDATE", updateId: currentUpdateId },
        () => void chrome.runtime.lastError
      );
    });
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
    if (changes.vieUpdateState?.newValue) {
      const uv = changes.vieUpdateState.newValue;
      const updateId = uv.remoteCommitSha || (uv.remoteVersion ? `v${uv.remoteVersion}` : "");
      renderUpdateBanner({
        ...uv,
        localVersion: localManifestVersion,
        updateId,
        repoUrl: "https://github.com/chu0n6-iot/VIE-Translate-by-me-"
      });
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
    if (p !== "gtx" && p !== "ollama" && p !== "openai" && key && key === verifiedKey) {
      chrome.storage.local
        .get({ availableModels: [], model: "auto", detectedModel: "" })
        .then((s) => {
          if (s.availableModels.length > 0) {
            showModelList(s.availableModels, s.detectedModel || s.availableModels[0], s.model);
          }
        });
    }
  });

  function applyDetectedOpenAiKey(val, triggerTest = true) {
    const openaiKeyEl = document.getElementById("openaiApiKey");
    const openaiUrlEl = document.getElementById("openaiBaseUrl");
    if (openaiKeyEl) {
      openaiKeyEl.value = val;
      openaiKeyEl.dispatchEvent(new Event("change"));
    }
    if (openaiUrlEl && !openaiUrlEl.value.trim()) {
      openaiUrlEl.value = "https://openrouter.ai/api/v1";
      openaiUrlEl.dispatchEvent(new Event("change"));
    }
    if (providerSelect.value !== "openai") {
      providerSelect.value = "openai";
      providerSelect.dispatchEvent(new Event("change"));
    } else {
      updateProviderUI("openai", true);
    }
    apiKeyInput.value = "";
    if (triggerTest && val.length >= 20) {
      autoDetectTimer = setTimeout(() => {
        document.getElementById("openaiTestBtn")?.click();
      }, 600);
    }
  }

  let autoDetectTimer = null;
  apiKeyInput.addEventListener("input", () => {
    const val = apiKeyInput.value.trim();
    const detected = detectProviderFromKey(val);
    if (detected === "openai") {
      if (autoDetectTimer) clearTimeout(autoDetectTimer);
      verifyToken++;
      applyDetectedOpenAiKey(val, true);
      return;
    }
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
      selectionTranslate: selectionTranslateInput ? selectionTranslateInput.checked : true,
      hotkeysEnabled: hotkeysEnabledInput ? hotkeysEnabledInput.checked : true,
      autoCheckUpdates: autoCheckUpdatesInput ? autoCheckUpdatesInput.checked : true,
      autoPersona: autoPersonaInput ? autoPersonaInput.checked : true,
      smartMergeCaptions: smartMergeCaptionsInput ? smartMergeCaptionsInput.checked : true,
      multiSpeakerSplit: multiSpeakerSplitInput ? multiSpeakerSplitInput.checked : true,
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
    [softenProfanityInput, "Làm dịu từ tục"],
    [hoverPauseDictInput, "Chế độ học từ điển"],
    [selectionTranslateInput, "Dịch khi bôi đen"],
    [hotkeysEnabledInput, "Phím tắt nhanh"],
    [autoCheckUpdatesInput, "Tự báo cập nhật"],
    [autoPersonaInput, "Nhận diện Persona"],
    [smartMergeCaptionsInput, "Ghép câu thông minh"],
    [multiSpeakerSplitInput, "Tách giọng đối thoại"]
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
        if (detected === "openai") {
          applyDetectedOpenAiKey(foundKey, true);
          return true;
        }
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
        if (detected === "openai") {
          applyDetectedOpenAiKey(foundKey, true);
          return;
        }
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
      backupKeys: (document.getElementById("backupKeys")?.value || "").trim(),
      groqApiKey: keysByProvider.groq,
      geminiApiKey: keysByProvider.gemini,
      model: modelValue
    });

    if (!silent) {
      triggerToadHop();
      triggerMicroToast("Đã lưu");
      setToadSay("Đã lưu rồi nhé!");
      showStatus("✓ Đã lưu toàn bộ cài đặt thành công!", "ok");
      if (saveBtn) {
        const origText = saveBtn.textContent;
        saveBtn.classList.add("btn-saved-anim");
        saveBtn.textContent = "Đã lưu";
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
    if (providerSelect.value !== "gtx" && providerSelect.value !== "ollama" && providerSelect.value !== "openai" && key && key !== verifiedKey) {
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
    if (/cụm động từ|phrasal/.test(p)) return "pos-phrasal";
    if (/thành ngữ|\bidiom\b/.test(p)) return "pos-idiom";
    if (/lóng|\bslang\b/.test(p)) return "pos-slang";
    if (/động từ|\bverb\b/.test(p)) return "pos-verb";
    if (/danh từ|\bnoun\b/.test(p)) return "pos-noun";
    if (/tính từ|\badj/.test(p)) return "pos-adj";
    if (/trạng từ|\badv/.test(p)) return "pos-adv";
    return "";
  }

  function categorizeVocabPos(posText) {
    const p = (posText || "").toLowerCase();
    if (/phrasal|cụm|thành ngữ|idiom|lóng|slang/.test(p)) return "idiom";
    if (/động từ|\bverb\b/.test(p)) return "verb";
    if (/danh từ|\bnoun\b/.test(p)) return "noun";
    if (/tính từ|\badjective\b|\badj\b/.test(p)) return "adj";
    return "other";
  }

  let currentPosFilter = "all";
  let currentSearchQuery = "";
  let cachedVocabList = [];
  let flashcardIdx = 0;
  let flashcardFlipped = false;

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

    const q = currentSearchQuery.trim().toLowerCase();
    const filteredList = list
      .map((item, originalIdx) => ({ item, originalIdx }))
      .filter(({ item }) => {
        if (currentPosFilter !== "all" && categorizeVocabPos(item.posCategory || item.pos) !== currentPosFilter) {
          return false;
        }
        if (!q) return true;
        return (
          (item.word || "").toLowerCase().includes(q) ||
          (item.meaning || "").toLowerCase().includes(q) ||
          (item.sentence || "").toLowerCase().includes(q)
        );
      });

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
      const rawRelated = Array.isArray(item.collocations) && item.collocations.length
        ? item.collocations
        : Array.isArray(item.synonyms) && item.synonyms.length
        ? item.synonyms
        : typeof item.collocations === "string"
        ? item.collocations.split(",").map((s) => s.trim()).filter(Boolean)
        : typeof item.synonyms === "string"
        ? item.synonyms.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      const synonymList = rawRelated.filter(Boolean);

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

  if (vocabSearchInput) {
    vocabSearchInput.addEventListener("input", () => {
      currentSearchQuery = vocabSearchInput.value || "";
      renderVocabNotebook(cachedVocabList);
    });
  }

  function renderFlashcard() {
    if (!flashcardStage) return;
    const deck = cachedVocabList;
    if (!deck.length) {
      flashcardStage.innerHTML = `
        <div class="vocab-empty">
          🃏 <b>Chưa có thẻ Flashcard nào!</b><br>
          Hãy bấm vào từ bất kỳ trên phụ đề video rồi chọn <b>⭐ Lưu từ</b> để luyện tập ghi nhớ nhé.
        </div>`;
      return;
    }
    if (flashcardIdx >= deck.length) flashcardIdx = 0;
    if (flashcardIdx < 0) flashcardIdx = deck.length - 1;
    const card = deck[flashcardIdx];
    const masteredCount = deck.filter((x) => x.mastered).length;

    flashcardStage.innerHTML = `
      <div class="flashcard-meta">
        <span>Thẻ <b>${flashcardIdx + 1}/${deck.length}</b></span>
        <span>✓ Đã thuộc: <b>${masteredCount}</b></span>
      </div>
      <div class="flashcard-card ${flashcardFlipped ? "is-flipped" : ""}" id="flashcardCardBox" title="Bấm để lật thẻ">
        ${
          !flashcardFlipped
            ? `<div class="flashcard-front">
                <div class="flashcard-word">${escapeHtml(card.word || "")}</div>
                ${card.pron ? `<div class="flashcard-pron">/${escapeHtml(card.pron.replace(/^\/|\/$/g, ""))}/</div>` : ""}
                <div style="margin-top:8px;display:flex;gap:8px;justify-content:center;">
                  <button type="button" id="fcSpeakBtn" class="btn-toggle-key" style="font-size:11px;padding:3px 9px;">🔊 Phát âm</button>
                  <span style="font-size:11px;color:#94a3b8;align-self:center;">(Bấm thẻ để xem nghĩa)</span>
                </div>
              </div>`
            : `<div class="flashcard-back">
                <div class="flashcard-meaning">🎯 ${escapeHtml(card.meaning || "")}</div>
                ${card.pos ? `<div style="margin-top:4px;font-size:11px;color:#7dd3fc;">[${escapeHtml(card.pos)}] ${card.cefr ? `• ${escapeHtml(card.cefr)}` : ""}</div>` : ""}
                ${card.sentence ? `<div class="flashcard-ctx">"${escapeHtml(card.sentence)}"</div>` : ""}
                ${card.note ? `<div style="margin-top:5px;font-size:11px;color:#cbd5e1;">💡 ${escapeHtml(card.note)}</div>` : ""}
              </div>`
        }
      </div>
      <div class="flashcard-controls">
        <button type="button" id="fcPrevBtn" class="btn-toggle-key">← Trước</button>
        <button type="button" id="fcShuffleBtn" class="btn-toggle-key">🔀 Trộn</button>
        <button type="button" id="fcMasteredBtn" class="btn-toggle-key" style="color:${card.mastered ? "#34d399" : "#fde68a"};">${card.mastered ? "✓ Đã thuộc" : "☆ Đánh dấu thuộc"}</button>
        <button type="button" id="fcNextBtn" class="btn-toggle-key">Tiếp →</button>
      </div>
    `;

    document.getElementById("flashcardCardBox")?.addEventListener("click", (e) => {
      if (e.target.closest("#fcSpeakBtn")) return;
      flashcardFlipped = !flashcardFlipped;
      renderFlashcard();
    });
    document.getElementById("fcSpeakBtn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      speakWordWithNativeVoice(card.word, card.lang || "");
    });
    document.getElementById("fcPrevBtn")?.addEventListener("click", () => {
      flashcardIdx = (flashcardIdx - 1 + deck.length) % deck.length;
      flashcardFlipped = false;
      renderFlashcard();
    });
    document.getElementById("fcNextBtn")?.addEventListener("click", () => {
      flashcardIdx = (flashcardIdx + 1) % deck.length;
      flashcardFlipped = false;
      renderFlashcard();
    });
    document.getElementById("fcShuffleBtn")?.addEventListener("click", () => {
      flashcardIdx = Math.floor(Math.random() * deck.length);
      flashcardFlipped = false;
      renderFlashcard();
    });
    document.getElementById("fcMasteredBtn")?.addEventListener("click", async () => {
      const next = deck.map((item, i) => (i === flashcardIdx ? { ...item, mastered: !item.mastered } : item));
      await chrome.storage.local.set({ savedVocab: next });
      cachedVocabList = next;
      renderFlashcard();
    });
  }

  renderVocabNotebook(stored.savedVocab || []);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.savedVocab) {
      renderVocabNotebook(changes.savedVocab.newValue || []);
      if (paneFlashcardSub && paneFlashcardSub.style.display !== "none") {
        renderFlashcard();
      }
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
        const cleanPron = v.pron ? String(v.pron).replace(/^\/+|\/+$/g, "") : "";
        const parts = [
          `${i + 1}. ${v.word} ${cleanPron ? `(/${cleanPron}/)` : ""} [${v.pos || "Từ vựng"}]`,
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
        const factText = v.funFact || v.fact;
        if (factText) parts.push(`   • Fact thú vị & Mẹo nhớ: ${factText}`);
        const relatedList = Array.isArray(v.collocations) && v.collocations.length
          ? v.collocations
          : Array.isArray(v.synonyms)
          ? v.synonyms
          : [];
        if (relatedList.length) {
          parts.push(`   • Đồng nghĩa / Đi kèm: ${relatedList.join(", ")}`);
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

  if (exportAnkiBtn) {
    exportAnkiBtn.addEventListener("click", async () => {
      const s = await chrome.storage.local.get({ savedVocab: [] });
      const list = s.savedVocab || [];
      if (!list.length) {
        showStatus("⚠ Sổ từ vựng đang trống!", "err");
        return;
      }
      const csvEsc = (v) => `"${String(v || "").replace(/"/g, '""')}"`;
      const rows = list.map((v) => {
        const front = `${v.word || ""}${v.pron ? ` /${v.pron.replace(/^\/|\/$/g, "")}/` : ""}`;
        const back = [
          v.meaning || "",
          v.pos ? `[${v.pos}]` : "",
          v.sentence ? `Ngữ cảnh: ${v.sentence}` : ""
        ].filter(Boolean).join(" | ");
        return `${csvEsc(front)},${csvEsc(back)},${csvEsc(v.cefr || "VIE-Translate")}`;
      });
      const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `VIE-Translate-Anki-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      triggerMicroToast(`📥 Đã xuất ${list.length} thẻ Anki CSV!`);
      showStatus(`✓ Đã xuất ${list.length} từ vựng chuẩn Anki CSV!`, "ok");
    });
  }

  if (exportBackupBtn && importBackupBtn && importBackupFile) {
    exportBackupBtn.addEventListener("click", async () => {
      const all = await chrome.storage.local.get(null);
      const safeBackup = {
        version: localManifestVersion,
        exportedAt: new Date().toISOString(),
        settings: {
          enabled: all.enabled,
          dualSub: all.dualSub,
          provider: all.provider,
          targetLang: all.targetLang,
          secondaryLang: all.secondaryLang,
          translationStyle: all.translationStyle,
          pronounStyle: all.pronounStyle,
          autoPersona: all.autoPersona,
          smartMergeCaptions: all.smartMergeCaptions,
          multiSpeakerSplit: all.multiSpeakerSplit,
          subFont: all.subFont,
          subSize: all.subSize,
          subColor: all.subColor,
          subSecondColor: all.subSecondColor,
          subBgStyle: all.subBgStyle,
          subBottomPos: all.subBottomPos,
          overlayWidth: all.overlayWidth,
          softenProfanity: all.softenProfanity,
          hoverPauseDict: all.hoverPauseDict,
          selectionTranslate: all.selectionTranslate,
          hotkeysEnabled: all.hotkeysEnabled
        },
        customGlossary: Array.isArray(all.customGlossary) ? all.customGlossary : [],
        savedVocab: Array.isArray(all.savedVocab) ? all.savedVocab : []
      };
      const blob = new Blob([JSON.stringify(safeBackup, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `VIE-Translate-Backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      triggerMicroToast("💾 Đã tải file sao lưu JSON!");
    });

    function applySettingsToForm(s) {
      if (!s || typeof s !== "object") return;
      if ("enabled" in s && enabledInput) enabledInput.checked = Boolean(s.enabled);
      if ("dualSub" in s && dualSubInput) dualSubInput.checked = Boolean(s.dualSub);
      if ("provider" in s && providerSelect && s.provider) {
        providerSelect.value = s.provider;
        providerSelect.dispatchEvent(new Event("change"));
      }
      if ("fallbackToFree" in s && fallbackInput) fallbackInput.checked = Boolean(s.fallbackToFree);
      if ("autoAudioNoCC" in s && autoAudioNoCCInput) autoAudioNoCCInput.checked = Boolean(s.autoAudioNoCC);
      if ("softenProfanity" in s && softenProfanityInput) softenProfanityInput.checked = s.softenProfanity !== false;
      if ("hoverPauseDict" in s && hoverPauseDictInput) hoverPauseDictInput.checked = s.hoverPauseDict !== false;
      if ("selectionTranslate" in s && selectionTranslateInput) selectionTranslateInput.checked = s.selectionTranslate !== false;
      if ("hotkeysEnabled" in s && hotkeysEnabledInput) hotkeysEnabledInput.checked = s.hotkeysEnabled !== false;
      if ("autoCheckUpdates" in s && autoCheckUpdatesInput) autoCheckUpdatesInput.checked = s.autoCheckUpdates !== false;
      if ("autoPersona" in s && autoPersonaInput) autoPersonaInput.checked = s.autoPersona !== false;
      if ("smartMergeCaptions" in s && smartMergeCaptionsInput) smartMergeCaptionsInput.checked = s.smartMergeCaptions !== false;
      if ("multiSpeakerSplit" in s && multiSpeakerSplitInput) multiSpeakerSplitInput.checked = s.multiSpeakerSplit !== false;
      if ("targetLang" in s && targetLangSelect && s.targetLang) targetLangSelect.value = s.targetLang;
      if ("secondaryLang" in s && secondaryLangSelect && s.secondaryLang) secondaryLangSelect.value = s.secondaryLang;
      if ("pronounStyle" in s && pronounStyleSelect && s.pronounStyle) pronounStyleSelect.value = s.pronounStyle;
      if ("translationStyle" in s && translationStyleSelect && s.translationStyle) translationStyleSelect.value = s.translationStyle;
      if ("subBgStyle" in s && subBgStyleSelect && s.subBgStyle) subBgStyleSelect.value = s.subBgStyle;
      if ("subFont" in s && subFontSelect && s.subFont) subFontSelect.value = s.subFont;
      if ("overlayWidth" in s && overlayWidthInput && s.overlayWidth != null) overlayWidthInput.value = String(s.overlayWidth);
      if ("subSize" in s && subSizeInput && s.subSize != null) subSizeInput.value = String(s.subSize);
      if ("subBottomPos" in s && subBottomPosInput && s.subBottomPos != null) subBottomPosInput.value = String(s.subBottomPos);
      if ("subColor" in s && subColorInput && s.subColor) subColorInput.value = s.subColor;
      if ("subSecondColor" in s && subSecondColorInput && s.subSecondColor) subSecondColorInput.value = s.subSecondColor;
      updateLivePreview();
    }

    importBackupBtn.addEventListener("click", () => importBackupFile.click());
    importBackupFile.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const raw = await file.text();
        const data = JSON.parse(raw);
        const updates = { ...(data.settings || {}) };
        if (updates.subSize != null) updates.overlayScale = Number(updates.subSize) || 100;
        if (updates.subBottomPos != null) updates.overlayBottom = Number(updates.subBottomPos) || 12;
        if (Array.isArray(data.customGlossary)) updates.customGlossary = data.customGlossary;
        if (Array.isArray(data.savedVocab)) updates.savedVocab = data.savedVocab;
        await chrome.storage.local.set(updates);
        applySettingsToForm(updates);
        triggerMicroToast("📂 Đã khôi phục dữ liệu!");
        showStatus("✓ Đã khôi phục Sổ từ, Glossary & Cài đặt thành công!", "ok");
        if (updates.savedVocab) renderVocabNotebook(updates.savedVocab);
        if (updates.customGlossary) renderGlossaryList(updates.customGlossary);
      } catch {
        showStatus("✗ File JSON sao lưu không hợp lệ.", "err");
      } finally {
        importBackupFile.value = "";
      }
    });
  }

  if (clearVocabBtn) {
    let clearConfirmTimer = null;
    clearVocabBtn.addEventListener("click", async () => {
      if (!cachedVocabList.length) {
        showStatus("⚠ Sổ từ vựng đang trống.", "err");
        return;
      }
      if (clearVocabBtn.dataset.confirmPending !== "1") {
        clearVocabBtn.dataset.confirmPending = "1";
        clearVocabBtn.dataset.origLabel = clearVocabBtn.textContent;
        clearVocabBtn.textContent = "⚠ Xác nhận xóa?";
        showStatus("⚠ Bấm nút 'Xác nhận xóa?' thêm lần nữa trong 4 giây để xóa toàn bộ Sổ từ vựng.", "wait");
        if (clearConfirmTimer) clearTimeout(clearConfirmTimer);
        clearConfirmTimer = setTimeout(() => {
          delete clearVocabBtn.dataset.confirmPending;
          clearVocabBtn.textContent = clearVocabBtn.dataset.origLabel || "🗑️ Xóa hết";
        }, 4000);
        return;
      }
      if (clearConfirmTimer) clearTimeout(clearConfirmTimer);
      delete clearVocabBtn.dataset.confirmPending;
      clearVocabBtn.textContent = clearVocabBtn.dataset.origLabel || "🗑️ Xóa hết";
      await chrome.storage.local.set({ savedVocab: [] });
      renderVocabNotebook([]);
      showStatus("✓ Đã xóa sạch Sổ từ vựng.", "ok");
    });
  }

  // SUBNAV CHUYỂN ĐỔI: SỔ TỪ VỰNG <-> FLASHCARD <-> KHÓA THUẬT NGỮ (GLOSSARY)
  if (subnavVocabBtn && subnavGlossaryBtn) {
    const switchSubnav = (mode) => {
      subnavVocabBtn.classList.toggle("active", mode === "vocab");
      subnavFlashcardBtn?.classList.toggle("active", mode === "flashcard");
      subnavGlossaryBtn.classList.toggle("active", mode === "glossary");
      if (paneVocabSub) paneVocabSub.style.display = mode === "vocab" ? "block" : "none";
      if (paneFlashcardSub) paneFlashcardSub.style.display = mode === "flashcard" ? "block" : "none";
      if (paneGlossarySub) paneGlossarySub.style.display = mode === "glossary" ? "block" : "none";
      triggerToadHop();
      if (mode === "flashcard") renderFlashcard();
      if (mode === "glossary" && glossarySrcInput) glossarySrcInput.focus();
    };
    subnavVocabBtn.addEventListener("click", () => switchSubnav("vocab"));
    subnavFlashcardBtn?.addEventListener("click", () => switchSubnav("flashcard"));
    subnavGlossaryBtn.addEventListener("click", () => switchSubnav("glossary"));
  }

  // QUẢN LÝ KHÓA THUẬT NGỮ (CUSTOM GLOSSARY)
  function renderGlossaryList(list) {
    if (!glossaryListEl) return;
    const items = Array.isArray(list) ? list : [];
    if (glossaryCountBadge) {
      glossaryCountBadge.textContent = items.length ? `(${items.length})` : "";
    }

    if (items.length === 0) {
      glossaryListEl.innerHTML = `
        <div class="vocab-empty" style="padding: 14px 10px;">
          🏷️ Chưa có thuật ngữ nào được khóa.<br>
          <span style="font-size: 11px; color: #94a3b8;">Nhập từ gốc và nghĩa tiếng Việt ở trên rồi bấm <b>+ Thêm</b> để AI luôn dịch chuẩn theo ý bạn!</span>
        </div>`;
      return;
    }

    glossaryListEl.innerHTML = "";
    items.forEach((item, idx) => {
      const el = document.createElement("div");
      el.className = "glossary-item";
      el.innerHTML = `
        <div class="glossary-item-text">
          <span class="glossary-src" title="${escapeHtml(item.src || "")}">${escapeHtml(item.src || "")}</span>
          <span class="glossary-arrow">➔</span>
          <span class="glossary-target" title="${escapeHtml(item.target || "")}">${escapeHtml(item.target || "")}</span>
        </div>
        <button type="button" class="glossary-del-btn" data-idx="${idx}" title="Xóa thuật ngữ này">✕</button>
      `;

      el.querySelector(".glossary-del-btn")?.addEventListener("click", async () => {
        const s = await chrome.storage.local.get({ customGlossary: [] });
        const curList = Array.isArray(s.customGlossary) ? s.customGlossary : [];
        const next = curList.filter((_, i) => i !== idx);
        await chrome.storage.local.set({ customGlossary: next });
        renderGlossaryList(next);
        chrome.runtime.sendMessage({ type: "CLEAR_CACHE" }, () => void chrome.runtime.lastError);
        triggerMicroToast("🗑️ Đã gỡ thuật ngữ!");
      });

      glossaryListEl.appendChild(el);
    });
  }

  async function handleAddGlossary() {
    if (!glossarySrcInput || !glossaryTargetInput) return;
    const src = (glossarySrcInput.value || "").trim();
    const target = (glossaryTargetInput.value || "").trim();
    if (!src) {
      showStatus("⚠ Vui lòng nhập từ hoặc cụm từ gốc cần khóa!", "err");
      glossarySrcInput.focus();
      return;
    }
    if (!target) {
      showStatus("⚠ Vui lòng nhập nghĩa / cách dịch mong muốn!", "err");
      glossaryTargetInput.focus();
      return;
    }
    const s = await chrome.storage.local.get({ customGlossary: [] });
    const list = Array.isArray(s.customGlossary) ? s.customGlossary : [];
    const existingIdx = list.findIndex(
      (item) => (item.src || "").toLowerCase() === src.toLowerCase()
    );
    if (existingIdx >= 0) {
      list[existingIdx].target = target;
    } else {
      list.unshift({ src, target });
    }
    await chrome.storage.local.set({ customGlossary: list });
    glossarySrcInput.value = "";
    glossaryTargetInput.value = "";
    renderGlossaryList(list);
    chrome.runtime.sendMessage({ type: "CLEAR_CACHE" }, () => void chrome.runtime.lastError);
    triggerToadHop();
    triggerMicroToast(`🏷️ Đã khóa: "${src}" ➔ "${target}"`);
    showStatus(`✓ Đã khóa thuật ngữ [${src} ➔ ${target}]! Cóc sẽ luôn tuân thủ quy tắc này.`, "ok");
  }

  if (addGlossaryBtn) {
    addGlossaryBtn.addEventListener("click", handleAddGlossary);
  }

  if (glossaryTargetInput) {
    glossaryTargetInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddGlossary();
      }
    });
  }

  renderGlossaryList(stored.customGlossary || []);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.customGlossary) {
      renderGlossaryList(changes.customGlossary.newValue || []);
    }
  });
});