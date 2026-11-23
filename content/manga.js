(function (root) {
  "use strict";

  const state = {
    active: false,
    regions: [],
    scannedImages: new Set(),
    cachedOcr: new Map(),
    preflightDone: false,
    textTranslations: new Map(),
    textShowing: false
  };

  function sendMessage(payload) {
    return new Promise((resolve) => chrome.runtime.sendMessage(payload, (res) => resolve(res)));
  }

  function collectAcrossShadowRoots(selector) {
    const roots = [document];
    const found = [];
    const visited = new Set();
    while (roots.length) {
      const root = roots.pop();
      if (!root || visited.has(root)) continue;
      visited.add(root);
      found.push(...root.querySelectorAll(selector));
      root.querySelectorAll("*").forEach((element) => {
        if (element.shadowRoot) roots.push(element.shadowRoot);
      });
    }
    return found;
  }

  function findPageImages() {
    const candidates = [
      ...collectAcrossShadowRoots("img"),
      ...collectAcrossShadowRoots("canvas")
    ];
    return candidates.filter((element) => {
      const r = element.getBoundingClientRect();
      if (r.width < 240 || r.height < 300) return false;
      if (element.tagName === "CANVAS") {
        return element.width >= 240 && element.height >= 300;
      }
      const hasSource = element.currentSrc || element.src || element.dataset?.src ||
        element.dataset?.original || element.getAttribute("data-src") || element.srcset;
      return Boolean(hasSource) || Boolean(element.naturalWidth || element.width);
    });
  }

  function ensureToolbar() {
    let toolbar = document.getElementById("vie-manga-toolbar");
    if (toolbar) return toolbar;
    toolbar = document.createElement("div");
    toolbar.id = "vie-manga-toolbar";
    toolbar.className = "vie-manga-toolbar";
    toolbar.innerHTML = `
      <button type="button" data-action="scan" class="primary">⏳ Đang quét ngầm</button>
      <button type="button" data-action="rescan">🔎 Dò sót</button>
      <button type="button" data-action="png">PNG</button>
      <button type="button" data-action="pdf">PDF</button>
      <button type="button" data-action="xls">Excel</button>
      <button type="button" data-action="clear">✕</button>`;
    document.body.appendChild(toolbar);
    toolbar.addEventListener("click", (e) => {
      const action = e.target.closest("button")?.dataset.action;
      if (action === "scan") scanVisiblePages();
      if (action === "rescan") rescanMissing();
      if (action === "png") exportPNG();
      if (action === "pdf") exportPDF();
      if (action === "xls") exportExcel();
      if (action === "clear") clearRegions();
    });
    return toolbar;
  }

  async function fetchImageData(img) {
    if (img.tagName === "CANVAS") {
      try {
        const dataUrl = img.toDataURL("image/jpeg", 0.92);
        img._vieMangaDataUrl = dataUrl;
        return {
          ok: true,
          imageBase64: dataUrl.replace(/^data:[^;]+;base64,/, ""),
          mimeType: "image/jpeg"
        };
      } catch (err) {
        throw new Error("Canvas truyện đang bị bảo vệ bởi nguồn chéo.");
      }
    }
    let src = img.currentSrc || img.src || img.dataset?.src || img.dataset?.original ||
      img.getAttribute("data-src") || "";
    if (!src && img.srcset) src = img.srcset.split(",")[0]?.trim().split(/\s+/)[0] || "";
    if (!src) throw new Error("Trang không có ảnh đọc được.");
    if (src.startsWith("data:image/")) {
      return { ok: true, imageBase64: src.replace(/^data:[^;]+;base64,/, ""), mimeType: src.match(/^data:([^;]+)/)?.[1] || "image/jpeg" };
    }
    const fetched = await sendMessage({ type: "FETCH_MANGA_IMAGE", url: src });
    if (fetched?.ok) img._vieMangaDataUrl = `data:${fetched.mimeType || "image/jpeg"};base64,${fetched.imageBase64}`;
    return fetched;
  }

  async function scanImage(img) {
    const fetched = await fetchImageData(img);
    if (!fetched?.ok) throw new Error(fetched?.error || "Không tải được ảnh.");
    const ocr = await sendMessage({
      type: "SCAN_MANGA_PAGE",
      imageBase64: fetched.imageBase64,
      mimeType: fetched.mimeType
    });
    if (!ocr?.ok && ocr?.error === "NO_KEY" && "TextDetector" in window) {
      try {
        const detector = new TextDetector();
        const detections = await detector.detect(img);
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        return {
          ok: true,
          language: "other",
          regions: detections.map((d) => ({
            x: d.boundingBox.x / iw * 100,
            y: d.boundingBox.y / ih * 100,
            w: d.boundingBox.width / iw * 100,
            h: d.boundingBox.height / ih * 100,
            text: d.rawValue,
            confidence: 0.8,
            kind: "bubble"
          }))
        };
      } catch {}
    }
    if (!ocr?.ok) throw new Error(ocr?.message || ocr?.error || "Không OCR được trang.");
    return ocr;
  }

  function ensureLayer(img) {
    const parent = img.parentElement;
    if (!parent) return null;
    const position = getComputedStyle(parent).position;
    if (position === "static") parent.style.position = "relative";
    let layer = parent.querySelector(":scope > .vie-manga-layer");
    if (layer) return layer;
    layer = document.createElement("div");
    layer.className = "vie-manga-layer";
    parent.appendChild(layer);
    return layer;
  }

  function makeDraggable(el, img, record) {
    let startX = 0;
    let startY = 0;
    let left = 0;
    let top = 0;
    el.addEventListener("pointerdown", (e) => {
      if (e.target.tagName === "TEXTAREA") return;
      el.setPointerCapture(e.pointerId);
      const rect = el.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      left = rect.left;
      top = rect.top;
    });
    el.addEventListener("pointermove", (e) => {
      if (!el.hasPointerCapture(e.pointerId)) return;
      const parentRect = el.parentElement.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const x = Math.max(imgRect.left - parentRect.left, Math.min(left - parentRect.left + dx, imgRect.right - parentRect.left - el.offsetWidth));
      const y = Math.max(imgRect.top - parentRect.top, Math.min(top - parentRect.top + dy, imgRect.bottom - parentRect.top - el.offsetHeight));
      el.style.left = `${(x / imgRect.width) * 100}%`;
      el.style.top = `${(y / imgRect.height) * 100}%`;
      record.x = parseFloat(el.style.left);
      record.y = parseFloat(el.style.top);
    });
  }

  async function paintTranslatedPage(img, records) {
    if (!records.length) return;
    const layer = ensureLayer(img);
    if (!layer) return;

    const canvas = document.createElement("canvas");
    canvas.className = "vie-manga-inpaint-canvas";
    canvas.width = img.naturalWidth || img.width || 1000;
    canvas.height = img.naturalHeight || img.height || 1400;

    let source;
    try {
      if (img.tagName === "CANVAS") {
        source = img;
      } else if (img._vieMangaDataUrl) {
        source = await new Promise((resolve, reject) => {
          const copy = new Image();
          copy.onload = () => resolve(copy);
          copy.onerror = reject;
          copy.src = img._vieMangaDataUrl;
        });
      } else {
        return;
      }
    } catch {
      return;
    }

    const ctx = canvas.getContext("2d");
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

    records.forEach((record) => {
      const x = Math.round(canvas.width * record.x / 100);
      const y = Math.round(canvas.height * record.y / 100);
      const w = Math.round(canvas.width * record.w / 100);
      const h = Math.round(canvas.height * record.h / 100);
      if (w < 8 || h < 8) return;

      const samplePoints = [
        [Math.max(0, x - 1), y + h / 2],
        [Math.min(canvas.width - 1, x + w + 1), y + h / 2],
        [x + w / 2, Math.max(0, y - 1)],
        [x + w / 2, Math.min(canvas.height - 1, y + h + 1)]
      ];
      const sampled = samplePoints.map(([sx, sy]) => {
        try {
          return Array.from(ctx.getImageData(Math.round(sx), Math.round(sy), 1, 1).data).slice(0, 3);
        } catch {
          return [255, 255, 255];
        }
      }).filter((p) => p.length === 3);

      const median = [0, 1, 2].map((channel) =>
        [...sampled.map((p) => p[channel]).sort((a, b) => a - b)][Math.floor(sampled.length / 2)] || 255
      );
      ctx.fillStyle = `rgb(${median.join(",")})`;
      ctx.fillRect(x - 2, y - 2, w + 4, h + 4);

      const fontName = [
        "Anime Ace 3",
        "Anime Ace 2",
        "Anime Ace",
        "CC Wild Words",
        "Comic Sans MS",
        "Arial"
      ].find((name) => (typeof document.fonts?.check === "function" && document.fonts.check(`16px "${name}"`)) || name === "Arial") || "Arial";

      const text = String(record.vi || "").replace(/\r/g, "").trim();
      if (!text) return;
      let fontSize = Math.max(8, Math.min(32, h * 0.18));
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#111111";
      ctx.strokeStyle = "#111111";

      const wrapText = (size) => {
        ctx.font = `700 ${size}px "${fontName}", sans-serif`;
        const words = text.split(/\s+/);
        const lines = [];
        let line = "";
        words.forEach((word) => {
          const test = line ? `${line} ${word}` : word;
          if (ctx.measureText(test).width <= w - 12) {
            line = test;
          } else {
            if (line) lines.push(line);
            line = word;
          }
        });
        if (line) lines.push(line);
        return lines;
      };

      let lines = wrapText(fontSize);
      while (fontSize > 8 && (lines.length * fontSize * 1.18 > h - 8 || lines.some((line) => ctx.measureText(line).width > w - 12))) {
        fontSize -= 1;
        lines = wrapText(fontSize);
      }

      const lineHeight = fontSize * 1.18;
      const startY = y + h / 2 - ((lines.length - 1) * lineHeight) / 2;
      lines.forEach((line, i) => {
        ctx.fillText(line, x + w / 2, startY + i * lineHeight, w - 12);
      });
    });

    layer.querySelectorAll(".vie-manga-inpaint-canvas").forEach((el) => el.remove());
    layer.appendChild(canvas);
  }

  async function renderRegions(img, ocr) {
    const layer = ensureLayer(img);
    if (!layer) return;
    layer.querySelectorAll(".vie-manga-region").forEach((el) => el.remove());
    const texts = (ocr.regions || []).map((r) => r.text).filter(Boolean);
    let translations = [];
    if (Array.isArray(ocr.translations)) {
      translations = ocr.translations;
    } else if (texts.length) {
      const batch = await sendMessage({ type: "TRANSLATE_BATCH", texts, videoTitle: document.title, videoContext: "Manga/comic page context" });
      translations = batch?.results || batch?.translations || [];
    }
    const records = [];
    (ocr.regions || []).forEach((r, i) => {
      if (!r.text) return;
      const el = document.createElement("div");
      el.className = "vie-manga-region";
      el.style.left = `${Math.max(0, r.x || 0)}%`;
      el.style.top = `${Math.max(0, r.y || 0)}%`;
      el.style.width = `${Math.max(3, r.w || 8)}%`;
      el.style.height = `${Math.max(3, r.h || 5)}%`;
      el.title = `${r.kind || "bubble"} · OCR ${Math.round((r.confidence || 0) * 100)}% · bấm đúp để sửa`;
      const ta = document.createElement("textarea");
      ta.value = translations[i]?.vi || translations[i] || r.text;
      el.appendChild(ta);
      layer.appendChild(el);
      const record = { img, el, orig: r.text, vi: ta.value, x: r.x || 0, y: r.y || 0, w: r.w || 8, h: r.h || 5 };
      state.regions.push(record);
      records.push(record);
      ta.addEventListener("input", () => { record.vi = ta.value; });
      ta.addEventListener("dblclick", (e) => e.stopPropagation());
      el.addEventListener("dblclick", () => ta.focus());
      makeDraggable(el, img, record);
    });
    await paintTranslatedPage(img, records);
  }

  async function revealLazyChapter() {
    const originalScroll = { x: scrollX, y: scrollY };
    const scrollers = collectAcrossShadowRoots("*").filter((element) => {
      const style = getComputedStyle(element);
      return element.scrollHeight > element.clientHeight + 500 &&
        /(auto|scroll)/.test(`${style.overflowY} ${style.overflow}`);
    });
    scrollers.push(document.documentElement);
    scrollers.push(document.body);

    for (const scroller of [...new Set(scrollers)].slice(0, 30)) {
      const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      if (!max) continue;
      for (let y = 0; y <= max; y += Math.max(500, scroller.clientHeight || 500)) {
        scroller.scrollTop = y;
        await new Promise((resolve) => setTimeout(resolve, 220));
      }
      scroller.scrollTop = 0;
    }
    window.scrollTo(originalScroll.x, originalScroll.y);
  }

  function isSocialOrArticlePlatform() {
    const host = location.hostname;
    return /facebook\.com|tiktok\.com|instagram\.com|twitter\.com|x\.com|archiveofourown\.org|tumblr\.com|reddit\.com/.test(host);
  }

  function findTextBlocks() {
    const selectors = [
      "article",
      "main p",
      "#main p",
      ".userstuff",
      ".chapter",
      "[role='article']",
      "[data-testid*='tweetText']",
      "[data-ad-preview]",
      "[data-testid*='post']",
      "[class*='post-text']",
      "[class*='caption']"
    ];
    const candidates = collectAcrossShadowRoots(selectors.join(","));
    const unique = [];
    for (const el of candidates) {
      if (el.closest("#vie-manga-toolbar, .vie-manga-layer, .vie-manga-text-card")) continue;
      const text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
      if (text.length < 12 || text.length > 4000) continue;
      if (unique.some((other) => other !== el && (other.contains(el) || el.contains(other)))) continue;
      unique.push(el);
    }
    return unique.slice(0, 80);
  }

  async function preflightTextTranslations() {
    if (!isSocialOrArticlePlatform()) return;
    const blocks = findTextBlocks();
    if (!blocks.length) return;
    const texts = blocks.map((el) => (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim());
    const batch = await sendMessage({
      type: "TRANSLATE_BATCH",
      texts,
      videoTitle: document.title,
      videoContext: "Social post or fanfic/manga raw text context"
    });
    const translations = batch?.results || batch?.translations || [];
    blocks.forEach((el, i) => {
      state.textTranslations.set(el, {
        orig: texts[i],
        vi: translations[i]?.vi || translations[i] || ""
      });
    });
  }

  function showTextTranslations() {
    for (const [el, record] of state.textTranslations) {
      if (!el.isConnected || !record.vi) continue;
      if (el.nextElementSibling?.classList?.contains("vie-manga-text-card")) continue;
      const card = document.createElement("div");
      card.className = "vie-manga-text-card";
      card.textContent = record.vi;
      card.dataset.orig = record.orig;
      el.insertAdjacentElement("afterend", card);
    }
    state.textShowing = true;
  }

  function hideTextTranslations() {
    document.querySelectorAll(".vie-manga-text-card").forEach((el) => el.remove());
    state.textShowing = false;
  }

  async function scanVisiblePages() {
    ensureToolbar();
    state.active = true;
    if (state.preflightDone) {
      for (const [img, ocr] of state.cachedOcr) await renderRegions(img, ocr);
      showTextTranslations();
      const toolbar = ensureToolbar();
      const regionCount = [...state.cachedOcr.values()].reduce((sum, ocr) =>
        sum + (ocr.regions || []).filter((r) => r.text && Array.isArray(ocr.translations)).length, 0);
      toolbar.querySelector('[data-action="scan"]').textContent =
        regionCount ? `✅ ${regionCount} vùng đã dịch` : "⚠️ Chưa dịch được vùng nào";
      return;
    }
    await revealLazyChapter();

    let images = [];
    for (let attempt = 0; attempt < 6 && !images.length; attempt++) {
      images = findPageImages().filter((img) => {
        const r = img.getBoundingClientRect();
        return r.width >= 240 && r.height >= 300;
      }).slice(0, 100);
      if (!images.length) await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!images.length) {
      const toolbar = ensureToolbar();
      toolbar.querySelector('[data-action="scan"]').textContent = "⚠️ Chưa thấy trang";
      console.warn("[VIE Manga] Không tìm thấy ảnh/canvas truyện đang hiển thị.");
      return;
    }
    const toolbar = ensureToolbar();
    toolbar.querySelector('[data-action="scan"]').textContent = "⏳ Đang quét";
    const pending = images.filter((img) => !state.cachedOcr.has(img));
    for (let offset = 0; offset < pending.length; offset += 3) {
      await Promise.all(pending.slice(offset, offset + 3).map(async (img) => {
        try {
          const ocr = await scanImage(img);
          const texts = (ocr.regions || []).map((r) => r.text).filter(Boolean);
          if (texts.length) {
            const batch = await sendMessage({
              type: "TRANSLATE_BATCH",
              texts,
              videoTitle: document.title,
              videoContext: "Manga/comic page context"
            });
            ocr.translations = batch?.results || batch?.translations || [];
          }
          state.cachedOcr.set(img, ocr);
        } catch (err) {
          console.warn("[VIE Manga]", err);
        }
      }));
    }
    for (const [img, ocr] of state.cachedOcr) {
      await renderRegions(img, ocr);
      state.scannedImages.add(img);
    }
    showTextTranslations();
    state.preflightDone = true;
    const scannedCount = [...state.cachedOcr.values()].reduce((sum, ocr) =>
      sum + (ocr.regions || []).filter((r) => r.text && Array.isArray(ocr.translations)).length, 0);
    toolbar.querySelector('[data-action="scan"]').textContent =
      scannedCount ? `Xem bản dịch (${scannedCount} vùng)` : "⚠️ Chưa dịch được vùng nào";
  }

  async function preflightAllContent() {
    ensureToolbar();
    const toolbar = ensureToolbar();
    toolbar.querySelector('[data-action="scan"]').textContent = "⏳ Đang quét ngầm";
    await revealLazyChapter();

    const images = findPageImages().filter((img) => {
      const r = img.getBoundingClientRect();
      return r.width >= 240 && r.height >= 300;
    }).slice(0, 100);

    const pending = images.filter((img) => !state.cachedOcr.has(img));
    for (let offset = 0; offset < pending.length; offset += 3) {
      await Promise.all(pending.slice(offset, offset + 3).map(async (img) => {
        try {
          const ocr = await scanImage(img);
          const texts = (ocr.regions || []).map((r) => r.text).filter(Boolean);
          if (texts.length) {
            const batch = await sendMessage({
              type: "TRANSLATE_BATCH",
              texts,
              videoTitle: document.title,
              videoContext: "Manga/comic page context"
            });
            ocr.translations = batch?.results || batch?.translations || [];
          }
          state.cachedOcr.set(img, ocr);
        } catch (err) {
          console.warn("[VIE Manga preflight]", err);
        }
      }));
    }

    await preflightTextTranslations();
    state.preflightDone = true;
    const regionCount = [...state.cachedOcr.values()].reduce((sum, ocr) =>
      sum + (ocr.regions || []).filter((r) => r.text && Array.isArray(ocr.translations)).length, 0);
    if (regionCount) {
      toolbar.querySelector('[data-action="scan"]').textContent = `Xem bản dịch (${regionCount} vùng)`;
    } else if (state.textTranslations.size) {
      toolbar.querySelector('[data-action="scan"]').textContent = `Xem bản dịch (${state.textTranslations.size})`;
    } else {
      toolbar.querySelector('[data-action="scan"]').textContent = "⟳ Quét lại";
    }
  }

  async function rescanMissing() {
    state.cachedOcr.clear();
    state.textTranslations.clear();
    state.preflightDone = false;
    hideTextTranslations();
    state.scannedImages.clear();
    await preflightAllContent();
  }

  function clearRegions() {
    document.querySelectorAll(".vie-manga-region").forEach((el) => el.remove());
    hideTextTranslations();
    state.regions = [];
    state.scannedImages.clear();
    state.cachedOcr.clear();
    state.textTranslations.clear();
    state.preflightDone = false;
  }

  function snapshotTextCanvas(img, record) {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const x = canvas.width * record.x / 100;
    const y = canvas.height * record.y / 100;
    const w = canvas.width * record.w / 100;
    const h = canvas.height * record.h / 100;
    ctx.fillStyle = "#fff";
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = "#111";
    ctx.font = `700 ${Math.max(10, h * 0.16)}px Segoe UI, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lines = String(record.vi || "").split(/\n|(?<=。)/).slice(0, 8);
    const lineHeight = h / Math.max(lines.length, 1);
    lines.forEach((line, i) => ctx.fillText(line, x + w / 2, y + lineHeight * (i + 0.5), w - 8));
    return canvas;
  }

  async function exportPNG() {
    const img = findPageImages().find((i) => state.scannedImages.has(i));
    if (!img) return alert("Hãy quét ít nhất một trang trước.");
    const records = state.regions.filter((r) => r.img === img);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    try {
      if (img.tagName === "CANVAS") {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      } else if (img._vieMangaDataUrl) {
        const safeImg = await new Promise((resolve, reject) => {
          const copy = new Image();
          copy.onload = () => resolve(copy);
          copy.onerror = reject;
          copy.src = img._vieMangaDataUrl;
        });
        ctx.drawImage(safeImg, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      records.forEach((r) => {
        const x = canvas.width * r.x / 100;
        const y = canvas.height * r.y / 100;
        const w = canvas.width * r.w / 100;
        const h = canvas.height * r.h / 100;
        const samples = [[x - 1, y + h / 2], [x + w + 1, y + h / 2], [x + w / 2, y - 1], [x + w / 2, y + h + 1]]
          .map(([sx, sy]) => Array.from(ctx.getImageData(Math.max(0, Math.min(canvas.width - 1, Math.round(sx))), Math.max(0, Math.min(canvas.height - 1, Math.round(sy))), 1, 1).data).slice(0, 3));
        const median = [0, 1, 2].map((channel) =>
          [...samples.map((p) => p[channel]).sort((a, b) => a - b)][2] || 255
        );
        ctx.fillStyle = `rgb(${median.join(",")})`;
        ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
        ctx.fillStyle = "#111";
        ctx.font = `700 ${Math.max(10, h * 0.16)}px "Anime Ace 3", "Anime Ace 2", "Anime Ace", "CC Wild Words", "Comic Sans MS", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const lines = String(r.vi || "").split(/\n|(?<=。)/).slice(0, 8);
        const lineHeight = h / Math.max(lines.length, 1);
        lines.forEach((line, i) => ctx.fillText(line, x + w / 2, y + lineHeight * (i + 0.5), w - 8));
      });
    } catch (err) {
      alert("Không thể ghép PNG do trang chặn tải ảnh: " + err.message);
      return;
    }
    const a = document.createElement("a");
    a.download = "translated-manga-page.png";
    a.href = canvas.toDataURL("image/png");
    a.click();
  }

  function exportExcel() {
    const rows = [["Trang", "Tiếng gốc", "Tiếng dịch", "Tọa độ X", "Tọa độ Y"]];
    state.regions.forEach((r, i) => rows.push([i + 1, r.orig, r.vi, r.x.toFixed(2), r.y.toFixed(2)]));
    const csv = "\ufeff" + rows.map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "manga-glossary.xls";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportPDF() {
    const html = state.regions.map((r) => `<p><b>Gốc:</b> ${r.orig.replace(/</g, "&lt;")}<br><b>Dịch:</b> ${r.vi.replace(/</g, "&lt;")}</p>`).join("");
    const win = window.open("", "_blank");
    if (!win) return alert("Trình duyệt chặn cửa sổ PDF.");
    win.document.write(`<html><head><title>Manga translation</title></head><body>${html}<script>window.onload=()=>print()<\\/script></body></html>`);
    win.document.close();
  }

  function init() {
    ensureToolbar();
    setTimeout(() => {
      preflightAllContent().catch((err) => console.warn("[VIE Manga] Preflight:", err));
    }, 1800);

    let socialMutationTimer = null;
    if (isSocialOrArticlePlatform()) {
      const observer = new MutationObserver(() => {
        if (socialMutationTimer) clearTimeout(socialMutationTimer);
        socialMutationTimer = setTimeout(() => {
          preflightTextTranslations().catch(() => {});
        }, 1800);
      });
      if (document.documentElement) {
        observer.observe(document.documentElement, { childList: true, subtree: true });
      }
    }

    root.VieManga = {
      init,
      scanVisiblePages,
      preflightAllContent,
      clearRegions,
      exportPNG,
      exportPDF,
      exportExcel
    };
  }

  init();
})(typeof self !== "undefined" ? self : this);
