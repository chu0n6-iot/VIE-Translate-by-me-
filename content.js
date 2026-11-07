const cache = new Map();
let wrap, box, currentVideo, resizeObs;

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
  const fs = document.fullscreenElement;
  // Không thể gắn phần tử con vào chính thẻ <video>, nên dùng phần tử cha
  const host = fs && fs !== video && fs.contains(video) ? fs : video.parentElement;
  if (getComputedStyle(host).position === "static") {
    host.style.position = "relative";
  }
  if (wrap.parentElement !== host) host.appendChild(wrap);
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

// Vào hoặc thoát toàn màn hình, hoặc đổi cỡ cửa sổ
document.addEventListener("fullscreenchange", () => {
  if (currentVideo) placeOverlay(currentVideo);
});
window.addEventListener("resize", () => {
  if (currentVideo) placeOverlay(currentVideo);
});

// ===== Dịch và hiển thị =====
async function translateAndShow(video, text) {
  if (cache.has(text)) {
    getOverlay(video).textContent = cache.get(text);
    return;
  }
  const reply = await chrome.runtime.sendMessage({ type: "TRANSLATE", text });
  if (reply?.vi) {
    cache.set(text, reply.vi);
    getOverlay(video).textContent = reply.vi;
  }
}

// ===== Lớp 1: chuẩn chung cho mọi thẻ <video> =====
function hookTrack(video, track) {
  if (track.kind !== "subtitles" && track.kind !== "captions") return;
  track.mode = "hidden"; // vẫn nhận phụ đề nhưng không hiện bản gốc
  track.addEventListener("cuechange", () => {
    const text = [...(track.activeCues || [])]
      .map(c => c.text.replace(/<[^>]+>/g, ""))
      .join(" ")
      .trim();
    if (text) translateAndShow(video, text);
  });
}

function watchVideo(video) {
  if (video.dataset.vieWatched) return;
  video.dataset.vieWatched = "1";
  for (const track of video.textTracks) hookTrack(video, track);
  // nhiều trang nạp phụ đề muộn hơn video
  video.textTracks.addEventListener("addtrack", e => hookTrack(video, e.track));
}

setInterval(() => {
  document.querySelectorAll("video").forEach(watchVideo);
}, 1000);

// ===== Lớp 2: YouTube tự vẽ phụ đề bằng HTML =====
if (location.hostname.endsWith("youtube.com")) {
  new MutationObserver(() => {
    const text = [...document.querySelectorAll(".ytp-caption-segment")]
      .map(s => s.textContent)
      .join(" ")
      .trim();
    const video = document.querySelector("video");
    if (text && video) translateAndShow(video, text);
  }).observe(document.body, { childList: true, subtree: true });
}