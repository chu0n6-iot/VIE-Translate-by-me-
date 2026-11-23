(function (root) {
  "use strict";

  const state = { active: false, regions: [], scannedImages: new Set() };

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
      <button type="button" data-action="scan" class="primary">🧩 Quét trang</button>
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

  async function renderRegions(img, ocr) {
    const layer = ensureLayer(img);
    if (!layer) return;
    layer.querySelectorAll(".vie-manga-region").forEach((el) => el.remove());
    const texts = (ocr.regions || []).map((r) => r.text).filter(Boolean);
    let translations = [];
    if (texts.length) {
      const batch = await sendMessage({ type: "TRANSLATE_BATCH", texts, videoTitle: document.title, videoContext: "Manga/comic page context" });
      translations = batch?.results || batch?.translations || [];
    }
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
      ta.addEventListener("input", () => { record.vi = ta.value; });
      ta.addEventListener("dblclick", (e) => e.stopPropagation());
      el.addEventListener("dblclick", () => ta.focus());
      makeDraggable(el, img, record);
    });
  }

  async function scanVisiblePages() {
    ensureToolbar();
    state.active = true;
    const originalScroll = { x: scrollX, y: scrollY };
    const scrollers = collectAcrossShadowRoots("*").filter((element) => {
      const style = getComputedStyle(element);
      return element.scrollHeight > element.clientHeight + 500 &&
        /(auto|scroll)/.test(`${style.overflowY} ${style.overflow}`);
    });
    scrollers.push(document.documentElement);
    scrollers.push(document.body);

    const uniqueScrollers = [...new Set(scrollers)].slice(0, 30);
    for (const scroller of uniqueScrollers) {
      const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      if (!max) continue;
      for (let y = 0; y <= max; y += Math.max(500, scroller.clientHeight || 500)) {
        scroller.scrollTop = y;
        await new Promise((resolve) => setTimeout(resolve, 260));
      }
      scroller.scrollTop = 0;
    }
    window.scrollTo(originalScroll.x, originalScroll.y);

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
    const pending = images.filter((img) => !state.scannedImages.has(img));
    for (let offset = 0; offset < pending.length; offset += 3) {
      await Promise.all(pending.slice(offset, offset + 3).map(async (img) => {
        try {
          const ocr = await scanImage(img);
          await renderRegions(img, ocr);
          state.scannedImages.add(img);
        } catch (err) {
          console.warn("[VIE Manga]", err);
        }
      }));
    }
    const scannedCount = state.scannedImages.size;
    toolbar.querySelector('[data-action="scan"]').textContent =
      scannedCount ? `✅ ${scannedCount} trang` : "⚠️ Chưa thấy trang";
  }

  async function rescanMissing() {
    state.scannedImages.clear();
    await scanVisiblePages();
  }

  function clearRegions() {
    document.querySelectorAll(".vie-manga-region").forEach((el) => el.remove());
    state.regions = [];
    state.scannedImages.clear();
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
        ctx.fillStyle = "#fff";
        ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
        ctx.fillStyle = "#111";
        ctx.font = `700 ${Math.max(10, h * 0.16)}px Segoe UI, sans-serif`;
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
    root.VieManga = { init, scanVisiblePages, clearRegions, exportPNG, exportPDF, exportExcel };
  }

  init();
})(typeof self !== "undefined" ? self : this);
