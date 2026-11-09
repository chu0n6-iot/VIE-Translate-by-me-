const cache = new Map();
let wrap, box, currentVideo, resizeObs;
let isEnabled = true;
let lastRawText = "";
let latestRequestId = 0;
let ytDebounceTimer = null;
let errorHideTimer = null;
let lastErrorShownAt = 0;

// Đồng bộ trạng thái Bật/Tắt từ storage
chrome.storage.local.get({ enabled: true }, (data) => {
  isEnabled = data.enabled !== false;
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.enabled) {
    isEnabled = changes.enabled.newValue !== false;
    if (!isEnabled && box) {
      box.textContent = "";
      box.classList.remove("vie-error");
    } else if (isEnabled && currentVideo && lastRawText) {
      translateAndShow(currentVideo, lastRawText, true);
    }
  }
  // Nếu người dùng vừa đổi API key, provider hoặc model trên popup thì xóa cache cục bộ để dịch lại câu hiện tại
  if (changes.apiKey || changes.geminiApiKey || changes.groqApiKey || changes.provider || changes.model) {
    cache.clear();
    lastErrorShownAt = 0;
    if (isEnabled && currentVideo && lastRawText) {
      translateAndShow(currentVideo, lastRawText, true);
    }
  }
});

// ===== Overlay co giãn theo video =====
function ensureOverlay() {
  if (wrap) return;
  wrap = document.createElement("div");
  wrap.id = "vie-wrap";
  box = document.createElement("div");
  box.id = "vie-overlay";
  wrap.appendChild(box);
}

// Đặt khung bao khớp đúng vị trí và kích thước của video
function placeOverlay(video) {
  if (!video || !wrap) return;
  const fs = document.fullscreenElement;
  // Không thể gắn phần tử con vào chính thẻ <video>, nên dùng phần tử cha
  const host = fs && fs !== video && fs.contains(video) ? fs : video.parentElement;
  if (!host) return;

  if (getComputedStyle(host).position === "static") {
    host.style.position = "relative";
  }
  if (wrap.parentElement !== host) {
    host.appendChild(wrap);
  }
  const v = video.getBoundingClientRect();
  const h = host.getBoundingClientRect();
  Object.assign(wrap.style, {
    left: v.left - h.left + "px",
    top: v.top - h.top + "px",
    width: v.width + "px",
    height: v.height + "px"
  });
}

function getOverlay(video) {
  ensureOverlay();
  if (video !== currentVideo) {
    currentVideo = video;
    resizeObs?.disconnect();
    resizeObs = new ResizeObserver(() => placeOverlay(video));
    resizeObs.observe(video); // video đổi kích thước thì overlay đổi theo
  }
  placeOverlay(video);
  return box;
}

function clearOverlay() {
  lastRawText = "";
  latestRequestId++;
  if (box) {
    box.textContent = "";
    box.classList.remove("vie-error");
  }
}

function showErrorHint(video, errorMsg) {
  const now = Date.now();
  // Chỉ hiện cảnh báo lỗi tối đa 10 giây 1 lần để không làm phiền khi xem video
  if (now - lastErrorShownAt < 10000) return;
  lastErrorShownAt = now;

  const targetBox = getOverlay(video);
  targetBox.classList.add("vie-error");
  targetBox.textContent = `⚠️ VIE-Translate: ${errorMsg}`;

  clearTimeout(errorHideTimer);
  errorHideTimer = setTimeout(() => {
    if (targetBox.classList.contains("vie-error")) {
      targetBox.textContent = "";
      targetBox.classList.remove("vie-error");
    }
  }, 4500);
}

// Vào hoặc thoát toàn màn hình, hoặc đổi cỡ cửa sổ
document.addEventListener("fullscreenchange", () => {
  if (currentVideo) placeOverlay(currentVideo);
});
window.addEventListener("resize", () => {
  if (currentVideo) placeOverlay(currentVideo);
});

// ===== Dịch và hiển thị =====
async function translateAndShow(video, rawText, force = false) {
  if (!isEnabled) return;

  const text = (rawText || "").replace(/\s+/g, " ").trim();
  if (!text) {
    clearOverlay();
    return;
  }

  if (!force && text === lastRawText) {
    return;
  }
  lastRawText = text;

  if (cache.has(text)) {
    const targetBox = getOverlay(video);
    targetBox.classList.remove("vie-error");
    targetBox.textContent = cache.get(text);
    return;
  }

  const requestId = ++latestRequestId;
  try {
    const reply = await chrome.runtime.sendMessage({ type: "TRANSLATE", text });
    // Nếu trong lúc chờ mạng đã sang câu thoại mới hơn thì bỏ qua kết quả cũ
    if (requestId !== latestRequestId) return;

    if (reply?.vi) {
      cache.set(text, reply.vi);
      const targetBox = getOverlay(video);
      targetBox.classList.remove("vie-error");
      targetBox.textContent = reply.vi;
    } else if (reply?.error) {
      showErrorHint(video, reply.error);
    }
  } catch (err) {
    // Bỏ qua lỗi khi vừa reload extension mà trang chưa F5
  }
}

// ===== Lớp 1: chuẩn chung cho mọi thẻ <video> =====
function hookTrack(video, track) {
  if (track.kind !== "subtitles" && track.kind !== "captions") return;
  if (track.dataset_vieHooked) return;
  track.dataset_vieHooked = true;

  track.mode = "hidden"; // vẫn nhận phụ đề nhưng không hiện bản gốc
  track.addEventListener("cuechange", () => {
    const text = [...(track.activeCues || [])]
      .map((c) => c.text.replace(/<[^>]+>/g, ""))
      .join(" ")
      .trim();
    if (text) {
      translateAndShow(video, text);
    } else {
      clearOverlay();
    }
  });
}

function watchVideo(video) {
  if (video.dataset.vieWatched) return;
  video.dataset.vieWatched = "1";
  for (const track of video.textTracks) hookTrack(video, track);
  // nhiều trang nạp phụ đề muộn hơn video
  video.textTracks.addEventListener("addtrack", (e) => hookTrack(video, e.track));
}

setInterval(() => {
  document.querySelectorAll("video").forEach(watchVideo);
}, 1000);

// ===== Lớp 2: YouTube tự vẽ phụ đề bằng HTML =====
if (location.hostname.endsWith("youtube.com")) {
  const observer = new MutationObserver((mutations) => {
    // Bỏ qua nếu thay đổi DOM xuất phát từ chính khung dịch #vie-wrap của chúng ta
    const isExternalChange = mutations.some(
      (m) => !wrap || !wrap.contains(m.target)
    );
    if (!isExternalChange) return;

    const segments = document.querySelectorAll(".ytp-caption-segment");
    const text = [...segments]
      .map((s) => s.textContent)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (!text) {
      clearTimeout(ytDebounceTimer);
      if (lastRawText) clearOverlay();
      return;
    }

    if (text === lastRawText) return;

    // Debounce nhẹ 180ms để gom phụ đề tự động (nhảy từng chữ) và tránh spam API
    clearTimeout(ytDebounceTimer);
    ytDebounceTimer = setTimeout(() => {
      const video = document.querySelector("video");
      if (video) translateAndShow(video, text);
    }, 180);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}
