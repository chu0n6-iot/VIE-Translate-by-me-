/**
 * VIE-Translate — Translate Toad AI
 * popup/ollama.js — Local AI (Ollama) settings panel
 */
(function () {
  const providerSel = document.getElementById("provider");
  const section = document.getElementById("ollamaSection");
  const urlInput = document.getElementById("ollamaUrl");
  const modelSel = document.getElementById("ollamaModel");
  const testBtn = document.getElementById("ollamaTestBtn");
  const statusEl = document.getElementById("ollamaStatus");
  if (!providerSel || !section) return;

  const toggle = () => {
    section.style.display = providerSel.value === "ollama" ? "block" : "none";
  };

  function fillModels(models, selected) {
    modelSel.innerHTML = "";
    modelSel.add(new Option("(tự chọn model tốt nhất)", ""));
    models.forEach((m) => modelSel.add(new Option(m, m)));
    modelSel.value = models.includes(selected) ? selected : "";
  }

  function save() {
    chrome.storage.local.set({
      provider: providerSel.value,
      ollamaBaseUrl: urlInput.value.trim() || "http://localhost:11434",
      ollamaModel: modelSel.value
    });
  }

  testBtn.addEventListener("click", () => {
    statusEl.textContent = "⏳ Đang kết nối Ollama...";
    chrome.runtime.sendMessage(
      { type: "TEST_API", provider: "ollama", baseUrl: urlInput.value.trim(), model: modelSel.value },
      (res) => {
        if (chrome.runtime.lastError || !res?.ok) {
          statusEl.textContent = `✗ ${res?.error || chrome.runtime.lastError?.message || "Lỗi"}`;
          return;
        }
        fillModels(res.availableModels || [], modelSel.value || res.modelUsed);
        statusEl.textContent = `✓ OK [${res.modelUsed}] → "${res.sample}"`;
        save();
      }
    );
  });

  providerSel.addEventListener("change", () => {
    toggle();
    if (providerSel.value === "ollama") save();
  });
  urlInput.addEventListener("change", save);
  modelSel.addEventListener("change", save);

  chrome.storage.local.get({ ollamaBaseUrl: "http://localhost:11434", ollamaModel: "" }, (s) => {
    urlInput.value = s.ollamaBaseUrl;
    if (s.ollamaModel) fillModels([s.ollamaModel], s.ollamaModel);
    toggle();
  });
})();
