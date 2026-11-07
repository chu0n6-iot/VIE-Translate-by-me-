function addOverlay() {
  const player = document.querySelector(".html5-video-player");
  if (!player || document.getElementById("vie-overlay")) return;

  const box = document.createElement("div");
  box.id = "vie-overlay";
  box.textContent = "Hí anh em! VIE-Translate đang hoạt động.";
  player.appendChild(box);
}

// YouTube loads pages dynamically, so keep checking
setInterval(addOverlay, 1000);