/**
 * VIE-Translate — Translate Toad AI
 * api/whisper.js — Optional local Whisper (OpenAI-compatible server) with CPU/GPU routing
 */

(function (root) {
  "use strict";

  let rr = 0;

  function clean(u) {
    return (u || "").trim().replace(/\/+$/, "");
  }

  // mode: auto = GPU rồi CPU dự phòng | gpu | cpu | both = chạy song song luân phiên GPU+CPU
  function orderedUrls(s) {
    const gpu = clean(s.whisperGpuUrl);
    const cpu = clean(s.whisperCpuUrl);
    const mode = s.whisperMode || "auto";
    if (mode === "gpu") return [gpu].filter(Boolean);
    if (mode === "cpu") return [cpu].filter(Boolean);
    const list = [gpu, cpu].filter(Boolean);
    if (mode === "both" && list.length === 2) {
      const first = rr++ % 2;
      return first ? [list[1], list[0]] : list;
    }
    return list;
  }

  async function post(base, audioBase64, mimeType, model, language, prompt) {
    const bin = atob(audioBase64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: mimeType || "audio/webm" }), "audio.webm");
    form.append("model", model || "whisper");
    form.append("response_format", "json");
    if (language) form.append("language", language);
    if (prompt) form.append("prompt", prompt.slice(0, 200));
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    try {
      const res = await fetch(`${base}/v1/audio/transcriptions`, { method: "POST", body: form, signal: ctrl.signal });
      if (!res.ok) throw new Error(`Whisper HTTP ${res.status}`);
      return ((await res.json())?.text || "").trim();
    } finally {
      clearTimeout(timer);
    }
  }

  async function transcribe(settings, audioBase64, mimeType, prompt = "") {
    const urls = orderedUrls(settings);
    if (!urls.length) throw new Error("Chưa cấu hình địa chỉ Whisper.");
    let lastErr = null;
    for (const u of urls) {
      try {
        return await post(u, audioBase64, mimeType, settings.whisperModel, settings.whisperLang, prompt);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("Whisper local không phản hồi.");
  }

  async function ping(url) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    try {
      const res = await fetch(`${clean(url)}/health`, { signal: ctrl.signal });
      return res.ok ? await res.json().catch(() => ({ ok: true })) : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  root.VieWhisper = { transcribe, ping };
})(typeof self !== "undefined" ? self : this);
