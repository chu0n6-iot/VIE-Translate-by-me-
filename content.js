function watchVideo(video) {
  if (video.dataset.vieWatched) return;
  video.dataset.vieWatched = "1";

  for (const track of video.textTracks) {
    if (track.kind !== "subtitles" && track.kind !== "captions") continue;
    track.mode = "hidden"; // vẫn nhận cue nhưng không hiện bản gốc
    track.addEventListener("cuechange", () => {
      const text = [...(track.activeCues || [])].map(c => c.text).join(" ");
      if (text) translateAndShow(video, text);
    });
  }
}

setInterval(() => {
  document.querySelectorAll("video").forEach(watchVideo);
}, 1000);