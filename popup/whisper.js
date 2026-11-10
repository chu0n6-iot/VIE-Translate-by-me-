/**
 * VIE-Translate — Translate Toad AI
 * popup/whisper.js — Local Whisper (CPU/GPU) settings panel
 */
(function () {
  const $ = (id) => document.getElementById(id);
  const ids = { whisperEnabled: "checkbox", whisperMode: "v", whisperGpuUrl: "v", whisperCpuUrl: "v" };
  if (!$("whisperEnabled")) return;

  const save = () =>
    chrome.storage.local.set({
      whisperEnabled: $("whisperEnabled").checked,
      whisperMode: $("whisperMode").value,
      whisperGpuUrl: $("whisperGpuUrl").value.trim(),
      whisperCpuUrl: $("whisperCpuUrl").value.trim()
    });

  chrome.storage.local.get(
    { whisperEnabled: false, whisperMode: "auto", whisperGpuUrl: "http://localhost:8000", whisperCpuUrl: "http://localhost:8001" },
    (s) => {
      $("whisperEnabled").checked = s.whisperEnabled;
      $("whisperMode").value = s.whisperMode;
      $("whisperGpuUrl").value = s.whisperGpuUrl;
      $("whisperCpuUrl").value = s.whisperCpuUrl;
    }
  );
  Object.keys(ids).forEach((id) => $(id).addEventListener("change", save));

  $("whisperTestBtn").addEventListener("click", () => {
    $("whisperStatus").textContent = "⏳ Đang kiểm tra...";
    chrome.runtime.sendMessage({ type: "TEST_WHISPER", gpuUrl: $("whisperGpuUrl").value, cpuUrl: $("whisperCpuUrl").value }, (r) => {
      const f = (x, n) => (x ? `✓ ${n} (${x.model || "ok"})` : `✗ ${n} chưa chạy`);
      $("whisperStatus").textContent = r ? `${f(r.gpu, "GPU")} · ${f(r.cpu, "CPU")}` : "✗ Lỗi";
    });
  });
})();
