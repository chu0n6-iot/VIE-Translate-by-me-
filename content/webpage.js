/**
 * VIE-Translate — Translate Toad AI
 * content/webpage.js — Immersive Full-Page Bilingual Web Translator (Viewport-lazy via IntersectionObserver)
 */

(function (root) {
  "use strict";

  const BLOCK_SELECTOR = "p, h1, h2, h3, h4, h5, h6, li, blockquote, figcaption, td, th, dd";
  const SKIP_ANCESTOR_SELECTOR = [
    ".vie-overlay",
    ".vie-web-trans",
    ".vie-web-pill",
    "#vie-selection-bubble",
    "#vie-manga-toolbar",
    ".vie-manga-wrapper",
    "script",
    "style",
    "noscript",
    "svg",
    "canvas",
    "code",
    "pre",
    "kbd",
    "nav",
    "header",
    "footer",
    "button",
    "input",
    "textarea",
    "select",
    "[contenteditable='true']",
    "[aria-hidden='true']"
  ].join(", ");

  const VIETNAMESE_DIACRITICS_RE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/g;

  const state = {
    active: false,
    hidden: false,
    totalBlocks: 0,
    translatedCount: 0,
    observer: null,
    queue: [],
    flushTimer: null,
    inFlight: false,
    processedBlocks: new WeakSet(),
    pillEl: null
  };

  function isLikelyVietnamese(text) {
    const s = String(text || "").trim();
    if (!s) return false;
    const matches = s.match(VIETNAMESE_DIACRITICS_RE);
    if (!matches || matches.length < 3) return false;
    const ratio = matches.length / Math.max(1, s.replace(/\s+/g, "").length);
    return ratio >= 0.08;
  }

  function collectTranslatableBlocks(doc = typeof document !== "undefined" ? document : null, targetLang = "vi") {
    if (!doc || !doc.body) return [];
    const nodes = Array.from(doc.querySelectorAll(BLOCK_SELECTOR));
    const eligible = [];

    for (const el of nodes) {
      if (!el || state.processedBlocks.has(el)) continue;
      if (el.closest && el.closest(SKIP_ANCESTOR_SELECTOR)) continue;
      if (el.querySelector && el.querySelector("p, h1, h2, h3, h4, blockquote")) continue;

      const text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
      if (text.length < 6) continue;
      if (/^[\d\s.,!?;:()\-+/*=@#$%^&[\]{}<>~`_|\\]+$/.test(text)) continue;
      if (targetLang === "vi" && isLikelyVietnamese(text)) continue;

      eligible.push({ el, text });
    }
    return eligible;
  }

  function injectTranslation(blockEl, translatedText, doc = typeof document !== "undefined" ? document : null) {
    if (!blockEl || !translatedText || !doc) return null;
    const existing = blockEl.querySelector?.(":scope > .vie-web-trans");
    if (existing) {
      existing.textContent = translatedText;
      return existing;
    }
    const span = doc.createElement("span");
    span.className = "vie-web-trans";
    span.setAttribute("data-vie-web", "1");
    span.textContent = translatedText;
    blockEl.appendChild(span);
    return span;
  }

  function updatePill() {
    if (!state.pillEl || typeof document === "undefined") return;
    const statusSpan = state.pillEl.querySelector(".vie-web-pill-status");
    const toggleBtn = state.pillEl.querySelector("[data-action='toggle-hide']");
    if (statusSpan) {
      if (state.translatedCount < state.totalBlocks) {
        statusSpan.textContent = `🐸 Đang dịch ${state.translatedCount}/${state.totalBlocks}...`;
      } else {
        statusSpan.textContent = `🐸 Đã dịch ${state.translatedCount} đoạn`;
      }
    }
    if (toggleBtn) {
      toggleBtn.textContent = state.hidden ? "👁️ Hiện dịch" : "🙈 Ẩn dịch";
    }
  }

  function ensurePill() {
    if (typeof document === "undefined" || !document.body) return null;
    if (state.pillEl && document.body.contains(state.pillEl)) return state.pillEl;

    const pill = document.createElement("div");
    pill.id = "vie-web-pill";
    pill.className = "vie-web-pill";
    pill.innerHTML = `
      <span class="vie-web-pill-status">🐸 Đang chuẩn bị...</span>
      <button type="button" class="vie-web-pill-btn" data-action="toggle-hide">🙈 Ẩn dịch</button>
      <button type="button" class="vie-web-pill-btn vie-web-pill-close" data-action="close" title="Tắt dịch trang">✕</button>
    `;
    pill.addEventListener("click", (e) => {
      const action = e.target.closest("button")?.dataset.action;
      if (action === "toggle-hide") {
        state.hidden = !state.hidden;
        document.documentElement.classList.toggle("vie-web-trans-hidden", state.hidden);
        updatePill();
      } else if (action === "close") {
        disable();
      }
    });
    document.body.appendChild(pill);
    state.pillEl = pill;
    updatePill();
    return pill;
  }

  async function flushQueue() {
    if (!state.active || state.inFlight || !state.queue.length) return;
    state.inFlight = true;
    const batch = state.queue.splice(0, 10);
    const texts = batch.map((b) => b.text);

    try {
      const res = await new Promise((resolve) => {
        if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage({ type: "TRANSLATE_PAGE_BATCH", texts }, resolve);
        } else {
          resolve({ results: {} });
        }
      });
      if (!state.active) return;
      const results = res?.results || {};
      for (const item of batch) {
        const trans = (results[item.text] || "").trim();
        if (trans) {
          injectTranslation(item.el, trans);
          state.translatedCount++;
        }
      }
      updatePill();
    } catch {
      // ignore transient error
    } finally {
      state.inFlight = false;
      if (state.active && state.queue.length > 0) {
        state.flushTimer = setTimeout(flushQueue, 80);
      }
    }
  }

  function scheduleEnqueue(item) {
    if (!state.active || state.processedBlocks.has(item.el)) return;
    state.processedBlocks.add(item.el);
    state.queue.push(item);
    if (!state.flushTimer) {
      state.flushTimer = setTimeout(() => {
        state.flushTimer = null;
        flushQueue();
      }, 140);
    }
  }

  async function enable() {
    if (state.active || typeof document === "undefined") return;
    let targetLang = "vi";
    try {
      const s = await root.VieStorage?.getSettings?.();
      if (s?.targetLang) targetLang = s.targetLang;
    } catch {}

    const items = collectTranslatableBlocks(document, targetLang);
    state.active = true;
    state.hidden = false;
    state.totalBlocks = items.length;
    state.translatedCount = 0;
    state.queue = [];
    state.processedBlocks = new WeakSet();
    document.documentElement.classList.remove("vie-web-trans-hidden");
    ensurePill();

    if (!items.length) {
      updatePill();
      return { ok: true, count: 0 };
    }

    const itemByEl = new WeakMap();
    items.forEach((it) => itemByEl.set(it.el, it));

    if (typeof IntersectionObserver !== "undefined") {
      state.observer = new IntersectionObserver(
        (entries) => {
          if (!state.active) return;
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const it = itemByEl.get(entry.target);
              state.observer?.unobserve(entry.target);
              if (it) scheduleEnqueue(it);
            }
          }
        },
        { rootMargin: "350px 0px" }
      );
      items.forEach((it) => state.observer.observe(it.el));
    } else {
      items.slice(0, 40).forEach(scheduleEnqueue);
    }

    return { ok: true, count: items.length };
  }

  function disable() {
    state.active = false;
    state.hidden = false;
    state.totalBlocks = 0;
    state.translatedCount = 0;
    state.queue = [];
    state.processedBlocks = new WeakSet();
    if (state.flushTimer) {
      clearTimeout(state.flushTimer);
      state.flushTimer = null;
    }
    if (state.observer) {
      try { state.observer.disconnect(); } catch {}
      state.observer = null;
    }
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("vie-web-trans-hidden");
      document.querySelectorAll(".vie-web-trans").forEach((el) => el.remove());
      document.getElementById("vie-web-pill")?.remove();
    }
    state.pillEl = null;
    return { ok: true, active: false };
  }

  async function toggle() {
    if (state.active) return disable();
    await enable();
    return { ok: true, active: true, totalBlocks: state.totalBlocks };
  }

  function isActive() {
    return state.active;
  }

  if (typeof chrome !== "undefined" && chrome.runtime?.onMessage?.addListener) {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!msg?.type) return;
      if (msg.type === "TOGGLE_WEBPAGE_TRANSLATE") {
        toggle().then(sendResponse).catch((err) => sendResponse({ ok: false, error: err?.message }));
        return true;
      }
      if (msg.type === "GET_WEBPAGE_STATE") {
        sendResponse({ ok: true, active: state.active, translatedCount: state.translatedCount, totalBlocks: state.totalBlocks });
        return false;
      }
    });
  }

  root.VieWebpage = {
    toggle,
    enable,
    disable,
    isActive,
    collectTranslatableBlocks,
    injectTranslation,
    isLikelyVietnamese
  };
})(typeof self !== "undefined" ? self : typeof globalThis !== "undefined" ? globalThis : this);
