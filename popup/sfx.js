// Âm thanh tương tác vui tai cho Translate Toad Studio (WebAudio thuần)
(function () {
  let ctx = null;
  let on = localStorage.getItem("vieSfx") !== "off";
  const toggle = document.getElementById("sfxToggle");
  const sync = () => {
    if (toggle) {
      toggle.textContent = on ? "🔊" : "🔇";
      toggle.classList.toggle("muted", !on);
    }
  };

  function getAudioCtx() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = ctx || new AudioCtx();
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      return ctx;
    } catch {
      return null;
    }
  }

  // 1. Tiếng ộp ộp của chú Cóc (Cute FM Toad Croak / Ribbit)
  function soundFrog() {
    if (!on) return;
    const ac = getAudioCtx();
    if (!ac) return;
    const t0 = ac.currentTime;

    // Phase 1: Thấp ấm
    const osc1 = ac.createOscillator();
    const gain1 = ac.createGain();
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(150, t0);
    osc1.frequency.exponentialRampToValueAtTime(110, t0 + 0.08);

    gain1.gain.setValueAtTime(0.001, t0);
    gain1.gain.linearRampToValueAtTime(0.06, t0 + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, t0 + 0.09);

    osc1.connect(gain1).connect(ac.destination);
    osc1.start(t0);
    osc1.stop(t0 + 0.1);

    // Phase 2: Nẩy vui nhộn (Ribbit)
    const osc2 = ac.createOscillator();
    const gain2 = ac.createGain();
    osc2.type = "square";
    osc2.frequency.setValueAtTime(220, t0 + 0.06);
    osc2.frequency.exponentialRampToValueAtTime(160, t0 + 0.18);

    gain2.gain.setValueAtTime(0.001, t0 + 0.06);
    gain2.gain.linearRampToValueAtTime(0.055, t0 + 0.09);
    gain2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);

    osc2.connect(gain2).connect(ac.destination);
    osc2.start(t0 + 0.06);
    osc2.stop(t0 + 0.21);
  }

  // 2. Tiếng nổ bong bóng / Giọt nước (Cute Bubble Pop)
  function soundPop(freq = 560) {
    if (!on) return;
    const ac = getAudioCtx();
    if (!ac) return;
    const t0 = ac.currentTime;

    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.85, t0 + 0.045);

    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.linearRampToValueAtTime(0.065, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);

    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + 0.065);
  }

  // 3. Tiếng gạt công tắc Bật / Tắt (Toggle Switch)
  function soundToggle(isTurningOn = true) {
    if (!on) return;
    const ac = getAudioCtx();
    if (!ac) return;
    const t0 = ac.currentTime;

    const [f1, f2] = isTurningOn ? [460, 780] : [720, 420];
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(f1, t0);
    osc.frequency.exponentialRampToValueAtTime(f2, t0 + 0.07);

    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.linearRampToValueAtTime(0.055, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);

    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + 0.09);
  }

  // 4. Tiếng Lưu Cài Đặt Thành Công (Lush 4-note Chord Arpeggio)
  function soundSuccess() {
    if (!on) return;
    const ac = getAudioCtx();
    if (!ac) return;
    const t0 = ac.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    notes.forEach((freq, idx) => {
      const start = t0 + idx * 0.055;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.045, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);

      osc.connect(gain).connect(ac.destination);
      osc.start(start);
      osc.stop(start + 0.23);
    });
  }

  // 5. Tiếng Test Key vui vẻ (Fanfare)
  function soundFanfare() {
    if (!on) return;
    const ac = getAudioCtx();
    if (!ac) return;
    const t0 = ac.currentTime;
    const notes = [659.25, 783.99, 987.77]; // E5, G5, B5

    notes.forEach((freq, idx) => {
      const start = t0 + idx * 0.07;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.05, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);

      osc.connect(gain).connect(ac.destination);
      osc.start(start);
      osc.stop(start + 0.17);
    });
  }

  // 6. Tiếng chuyển Tab nhẹ nhàng (Micro-Haptic Tick)
  function soundTab() {
    if (!on) return;
    const ac = getAudioCtx();
    if (!ac) return;
    const t0 = ac.currentTime;

    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(980, t0);

    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.linearRampToValueAtTime(0.035, t0 + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.03);

    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + 0.035);
  }

  // 7. Tiếng rê thanh trượt (Slider Scrub Tick)
  let lastSliderSound = 0;
  function soundSlider() {
    if (!on) return;
    const now = Date.now();
    if (now - lastSliderSound < 45) return;
    lastSliderSound = now;
    soundPop(680);
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("#sfxToggle")) return;
    if (e.target.closest(".toad-avatar-wrap")) return soundFrog();
    if (e.target.closest("#saveBtn")) return soundSuccess();
    if (e.target.closest("#testBtn")) return soundFanfare();
    if (e.target.closest(".tab-btn")) return soundTab();
    if (e.target.closest(".swatch")) return soundPop(750);
    if (e.target.closest("button")) return soundPop(520);
  });

  document.addEventListener("change", (e) => {
    if (e.target.matches("input[type=checkbox]")) {
      soundToggle(e.target.checked);
    } else if (e.target.matches("select")) {
      soundPop(600);
    }
  });

  document.addEventListener("input", (e) => {
    if (e.target.matches("input[type=range]")) {
      soundSlider();
    }
  });

  if (toggle) {
    toggle.addEventListener("click", () => {
      on = !on;
      localStorage.setItem("vieSfx", on ? "on" : "off");
      sync();
      if (on) soundToggle(true);
    });
  }
  sync();

  window.VieSfx = {
    frog: soundFrog,
    pop: soundPop,
    toggle: soundToggle,
    success: soundSuccess,
    fanfare: soundFanfare,
    tab: soundTab
  };
})();
