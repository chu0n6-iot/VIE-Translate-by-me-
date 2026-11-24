# AI Context Map — VIE-Translate (Translate Toad AI)

> 💡 **Tự động kích hoạt cho AI**: Dự án đã tích hợp `.cursorrules` và `.agentrules` để AI tự động nạp ngữ cảnh từ file này trên **mọi prompt** mà không cần người dùng gõ tay `@AI_CONTEXT.md`.

## 0. Quy trình Làm việc & Tích hợp Agent Skills
- **Bắt buộc trước mỗi phiên phát triển/sửa code**: Luôn chạy `git fetch origin` & `git pull` để đồng bộ commit mới nhất từ remote repository trước khi thực hiện bất kỳ thay đổi nào. Quy tắc này đã được khóa cố định tại `.agentrules` và `.cursorrules`.
- **Google Agent Skills Catalog**: Dự án đã tích hợp đầy đủ bộ kỹ năng chính thức từ [google/skills](https://github.com/google/skills) (được định cấu hình tại `.agents/skills/` và khóa phiên bản qua `skills-lock.json`), hỗ trợ agent trong việc tích hợp Gemini API, Cloud Run, Firebase, và các giải pháp tối ưu AI/Cloud.

## 1. Sơ đồ Module & Nhiệm vụ Từng File
- [manifest.json](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/manifest.json): Cấu hình Chrome Extension Manifest V3, permissions & entry scripts.
- [utils/storage.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/utils/storage.js): Quản lý `chrome.storage.local`, settings, Persona, Multi-Speaker formatting & cache key.
- [api/gemini.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/api/gemini.js): Gọi Google Gemini API, prompt dịch thuật theo Persona, tách thoại Multi-Speaker, ép Glossary & tra từ điển.
- [api/groq.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/api/groq.js): Gọi Groq Cloud API siêu thanh, prompt Persona, Multi-Speaker & ép Glossary.
- [api/ollama.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/api/ollama.js): Local AI tùy chọn qua Ollama (localhost:11434), lỗi/không cài ➔ tự fallback GTX. UI: `popup/ollama.js`.
- [api/whisper.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/api/whisper.js): Whisper local (CPU/GPU, luân phiên/dự phòng) cho AI Nghe; server mẫu `tools/whisper_server.py`; UI `popup/whisper.js`.
- [api/gtx.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/api/gtx.js): Bộ máy dự phòng Google Translate miễn phí tức thì (0ms latency, không cần Key).
- [api/lyrics.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/api/lyrics.js): Tìm kiếm và parse lời bài hát đồng bộ thời gian (LRC) từ LRCLIB.
- [api/updater.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/api/updater.js): Kiểm tra cập nhật tự động trên GitHub (semver `manifest.json` + diff SHA-1 blob cây mã nguồn `main`) và đồng bộ badge thông báo.
- [background/background.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/background/background.js): Service worker: điều phối, nhận diện Persona, định dạng Multi-Speaker, ép Glossary & khóa xưng hô.
- [content/content.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/content/content.js): Entry point mỏng nhẹ điều phối phụ đề, giữ preview 0ms & smart boundary debounce.
- [content/dom.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/content/dom.js): Tạo & render phụ đề (phân tách dòng riêng biệt cho từng giọng nói A/B), thẻ từ điển & coach.
- [content/selection.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/content/selection.js): Bắt sự kiện bôi đen văn bản trên trang web và hiển thị bubble dịch nhanh.
- [content/captions.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/content/captions.js): Nhận diện video, tách lượt thoại Multi-Speaker, ghép câu ASR dở dang, sync lyrics.
- [content/manga.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/content/manga.js): Quét ngầm toàn chương truyện, OCR ảnh/canvas/Shadow DOM, dịch batch và hiển thị overlay chỉ khi người dùng bấm Xem bản dịch; hỗ trợ bài đăng social và văn bản dài.
- [content/overlay.css](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/content/overlay.css): CSS giao diện phụ đề, phân màu trực quan từng lượt thoại người nói, popup tra từ.
- [popup/popup.html](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/popup/popup.html): Giao diện cài đặt (Tab API, Ngôn ngữ & Tách giọng đối thoại, Style, Sổ từ & Glossary).
- [popup/popup.css](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/popup/popup.css): Phong cách giao diện cài đặt (dark theme, glassmorphism, micro-animations).
- [popup/popup.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/popup/popup.js): Điều khiển cài đặt API Key, Persona, Smart Boundary, Multi-Speaker, Sổ từ & Glossary.
- [popup/sfx.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/popup/sfx.js): Âm thanh tương tác WebAudio (tiếng cóc ộp, pop giọt nước, hợp âm lưu cài đặt).
- [aistudio-helper.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/aistudio-helper.js): Tự động phát hiện và trích xuất Gemini API Key từ tab Google AI Studio.
- [aistudio-page-hook.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/aistudio-page-hook.js): Hook clipboard trong MAIN world trên AI Studio để bắt Key tức thì.

## 2. Luồng Dữ liệu Chính (Data Flow)
`Video/DOM/Selection` ➔ `captions.js` (Smart Merge & Multi-Speaker) ➔ `content.js` (0ms preview) ➔ `background.js` (Persona + Multi-Speaker + Glossary) ➔ `api/gemini.js` / `groq.js` / `ollama.js` ➔ `dom.js` (Render tách dòng Người A / Người B).

## 3. Quy tắc Bắt buộc cho AI
1. **Luôn đọc `AI_CONTEXT.md` đầu tiên** để định vị chính xác file cần sửa theo đúng nhiệm vụ.
2. **TUYỆT ĐỐI KHÔNG đọc toàn bộ codebase** nếu chỉ cần sửa một module riêng biệt.
3. Không tái tạo "God file"; duy trì tính độc lập và kích thước nhỏ gọn của từng module.
4. Ghi chú kiến trúc v0.8.3 (Dịch truyện/social ngầm, cập nhật GitHub & tối ưu tốc độ dịch):
- Tự động báo cập nhật GitHub qua `api/updater.js` (`VieUpdater.checkForUpdates`, so sánh semver + Git blob SHA-1), banner Popup & toast video.
- Tối ưu dịch thuật: cache settings 0ms, watermark prefetch 10 cue (`prefetchUpcomingCues`), cross-dedup batch↔single `inFlight`, `[[N]]` GTX batch và `buildTranslationPrompts` đa ngôn ngữ.
- Local AI qua Ollama (`api/ollama.js`) và Whisper local (`api/whisper.js`, `tools/whisper_server.py`).
- Multi-Speaker tách dòng (`formatMultiSpeakerDialogue`), Glossary ép thuật ngữ (`applyGlossaryOverrides`), Persona tự nhận diện (`detectVideoPersona`), gộp câu thông minh (`smartMergeCaptions`).
- Key Pool xoay tua & hồi phục 429 (`withKeyPool`, `keyCooldown`, `backupKeys`), toast hết key (`showQuotaToast`), cảnh báo F5 (`startNoSubWatchdog`).
- Chống stack tràn câu (`limitTranslationLength`), reset video (`resetForNewVideo`), chống dính chữ (`normalizeSubtitleText`), âm thanh WebAudio (`popup/sfx.js`, `dom.js` `playUiSound`).
