// Âm thanh tương tác nhỏ cho popup (WebAudio, không cần file ngoài)
(function () {
  let ctx = null;
  let on = localStorage.getItem("vieSfx") !== "off";
  const toggle = document.getElementById("sfxToggle");
  const sync = () => { if (toggle) toggle.textContent = on ? "🔊" : "🔇"; };

  function tone(freq, start, dur, type, vol) {
    if (!on) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || "sine";
      o.frequency.setValueAtTime(freq, ctx.currentTime + start);
      g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(vol || 0.05, ctx.currentTime + start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + start);
      o.stop(ctx.currentTime + start + dur + 0.02);
    } catch {}
  }

  const sfx = {
    click: () => tone(620, 0, 0.07, "triangle"),
    toggle: () => { tone(520, 0, 0.06, "triangle"); tone(780, 0.06, 0.08, "triangle"); },
    save: () => { tone(523, 0, 0.09); tone(659, 0.09, 0.09); tone(784, 0.18, 0.14); },
    frog: () => { tone(180, 0, 0.09, "square", 0.04); tone(260, 0.1, 0.12, "square", 0.04); },
    tab: () => tone(440, 0, 0.05, "sine")
  };

  document.addEventListener("click", (e) => {
    if (e.target.closest("#sfxToggle")) return;
    if (e.target.closest("#saveBtn")) return sfx.save();
    if (e.target.closest(".toad-avatar-wrap")) return sfx.frog();
    if (e.target.closest(".tab-btn")) return sfx.tab();
    if (e.target.closest("button")) sfx.click();
  });
  document.addEventListener("change", (e) => {
    if (e.target.matches("input[type=checkbox], select")) sfx.toggle();
  });
  if (toggle) {
    toggle.addEventListener("click", () => {
      on = !on;
      localStorage.setItem("vieSfx", on ? "on" : "off");
      sync();
      if (on) sfx.toggle();
    });
  }
  sync();
})();
