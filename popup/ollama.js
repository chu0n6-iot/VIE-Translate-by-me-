/**
 * VIE-Translate — Translate Toad AI
 * popup/ollama.js — Universal Local AI (Ollama, LM Studio, Jan) settings panel
 */
(function () {
  const providerSel = document.getElementById("provider");
  const section = document.getElementById("ollamaSection");
  const urlInput = document.getElementById("ollamaUrl");
  const modelSel = document.getElementById("ollamaModel");
  const testBtn = document.getElementById("ollamaTestBtn");
  const statusEl = document.getElementById("ollamaStatus");
  const presetBtns = document.querySelectorAll(".ollama-preset-btn");
  if (!providerSel || !section) return;

  const toggle = () => {
    section.style.display = providerSel.value === "ollama" ? "block" : "none";
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
    modelSel.add(new Option("(tự chọn model tốt nhất)", ""));
    models.forEach((m) => {
      let label = m;
      const lower = m.toLowerCase();
      if (lower.includes("qwen2.5:3b") || lower.includes("qwen2.5-3b")) {
        label += " ⭐ [Khuyên dùng: Siêu nhanh]";
      } else if (lower.includes("qwen2.5:7b") || lower.includes("qwen2.5-7b")) {
        label += " 🎬 [Điện ảnh sâu sắc]";
      } else if (lower.includes("llama3.2:3b") || lower.includes("llama3.2-3b")) {
        label += " ⚡ [Rất nhẹ]";
      }
      modelSel.add(new Option(label, m));
    });
    modelSel.value = models.includes(selected) ? selected : "";
  }

  function save() {
    chrome.storage.local.set({
      provider: providerSel.value,
      ollamaBaseUrl: urlInput.value.trim() || "http://localhost:11434",
      ollamaModel: modelSel.value
    });
  }

  function testConnection() {
    const rawUrl = urlInput.value.trim() || "http://localhost:11434";
    statusEl.innerHTML = `⏳ Đang kết nối Local AI tại <code>${rawUrl}</code>...`;
    chrome.runtime.sendMessage(
      { type: "TEST_API", provider: "ollama", baseUrl: rawUrl, model: modelSel.value },
      (res) => {
        if (chrome.runtime.lastError || !res?.ok) {
          const errText = res?.error || chrome.runtime.lastError?.message || "Lỗi kết nối Local AI";
          statusEl.innerHTML = `<span style="color:#f87171">✗ ${errText}</span>`;
          return;
        }
        fillModels(res.availableModels || [], modelSel.value || res.modelUsed);
        statusEl.innerHTML = `<span style="color:#34d399;font-weight:600">✓ Kết nối thành công! [${res.modelUsed}]</span><br/><span style="opacity:0.9">Bản dịch thử: "${res.sample}"</span>`;
        save();
      }
    );
  }

  testBtn.addEventListener("click", testConnection);

  presetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      urlInput.value = btn.getAttribute("data-url") || "http://localhost:11434";
      updatePresetButtons(urlInput.value);
      save();
      testConnection();
    });
  });

  providerSel.addEventListener("change", () => {
    toggle();
    if (providerSel.value === "ollama") save();
  });

  urlInput.addEventListener("input", () => {
    updatePresetButtons(urlInput.value);
  });
  urlInput.addEventListener("change", () => {
    updatePresetButtons(urlInput.value);
    save();
  });
  modelSel.addEventListener("change", save);

  chrome.storage.local.get({ ollamaBaseUrl: "http://localhost:11434", ollamaModel: "" }, (s) => {
    urlInput.value = s.ollamaBaseUrl || "http://localhost:11434";
    updatePresetButtons(urlInput.value);
    if (s.ollamaModel) fillModels([s.ollamaModel], s.ollamaModel);
    toggle();
  });
})();
