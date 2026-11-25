/**
 * VIE-Translate — Translate Toad AI
 * popup/openai.js — OpenRouter, DeepSeek, Cerebras, Mistral & Custom OpenAI-Compatible settings panel
 */
(function () {
  const providerSel = document.getElementById("provider");
  const section = document.getElementById("openaiSection");
  const urlInput = document.getElementById("openaiBaseUrl");
  const keyInput = document.getElementById("openaiApiKey");
  const toggleKeyBtn = document.getElementById("toggleOpenaiKeyBtn");
  const modelSel = document.getElementById("openaiModel");
  const testBtn = document.getElementById("openaiTestBtn");
  const statusEl = document.getElementById("openaiStatus");
  const presetBtns = document.querySelectorAll(".openai-preset-btn");
  if (!providerSel || !section) return;

  const toggle = () => {
    section.style.display = providerSel.value === "openai" ? "block" : "none";
  };

  function updatePresetButtons(currentUrl) {
    const norm = (currentUrl || "").trim().replace(/\/+$/, "");
    presetBtns.forEach((btn) => {
      const target = (btn.getAttribute("data-url") || "").trim().replace(/\/+$/, "");
      btn.classList.toggle("active", target === norm);
    });
  }

  function fillModels(models, selected) {
    modelSel.innerHTML = "";
    modelSel.add(new Option("(tự chọn model tốt nhất / :free)", ""));
    models.forEach((m) => {
      let label = m;
      if (m.endsWith(":free")) label += " 🆓";
      else if (m.includes("deepseek-chat")) label += " ⭐";
      modelSel.add(new Option(label, m));
    });
    modelSel.value = models.includes(selected) ? selected : "";
  }

  function save() {
    chrome.storage.local.set({
      provider: providerSel.value,
      openaiBaseUrl: urlInput.value.trim() || "https://openrouter.ai/api/v1",
      openaiApiKey: keyInput.value.trim(),
      openaiModel: modelSel.value
    });
  }

  function testConnection() {
    const baseUrl = urlInput.value.trim() || "https://openrouter.ai/api/v1";
    const apiKey = keyInput.value.trim();
    if (!apiKey) {
      statusEl.innerHTML = `<span style="color:#f87171">✗ Vui lòng dán API Key trước khi kiểm tra.</span>`;
      keyInput.focus();
      return;
    }
    statusEl.innerHTML = `⏳ Đang kết nối tới <code>${baseUrl}</code>...`;
    chrome.runtime.sendMessage(
      { type: "TEST_API", provider: "openai", baseUrl, apiKey, model: modelSel.value || "auto" },
      (res) => {
        if (chrome.runtime.lastError || !res?.ok) {
          const errText = res?.error || chrome.runtime.lastError?.message || "Lỗi kết nối API";
          statusEl.innerHTML = `<span style="color:#f87171">✗ ${errText}</span>`;
          return;
        }
        fillModels(res.availableModels || [], modelSel.value || res.modelUsed);
        statusEl.innerHTML = `<span style="color:#34d399;font-weight:600">✓ Kết nối thành công! [${res.modelUsed}]</span><br/><span style="opacity:0.9">Bản dịch thử: "${res.sample}"</span>`;
        save();
      }
    );
  }

  toggleKeyBtn?.addEventListener("click", () => {
    const hidden = keyInput.type === "password";
    keyInput.type = hidden ? "text" : "password";
    toggleKeyBtn.textContent = hidden ? "Ẩn" : "Hiện";
  });

  testBtn?.addEventListener("click", testConnection);

  presetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      urlInput.value = btn.getAttribute("data-url") || "https://openrouter.ai/api/v1";
      updatePresetButtons(urlInput.value);
      save();
    });
  });

  providerSel.addEventListener("change", () => {
    toggle();
    if (providerSel.value === "openai") save();
  });

  urlInput.addEventListener("input", () => updatePresetButtons(urlInput.value));
  urlInput.addEventListener("change", () => {
    updatePresetButtons(urlInput.value);
    save();
  });
  keyInput.addEventListener("change", save);
  modelSel.addEventListener("change", save);

  chrome.storage.local.get(
    { openaiBaseUrl: "https://openrouter.ai/api/v1", openaiApiKey: "", openaiModel: "" },
    (s) => {
      urlInput.value = s.openaiBaseUrl || "https://openrouter.ai/api/v1";
      keyInput.value = s.openaiApiKey || "";
      updatePresetButtons(urlInput.value);
      if (s.openaiModel) fillModels([s.openaiModel], s.openaiModel);
      toggle();
    }
  );
})();
