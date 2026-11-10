# AI Context Map — VIE-Translate (Translate Toad AI)

> 💡 **Lưu ý cho Collaborator**: Dự án đã được tối ưu module hóa cực gọn nhẹ để AI phản hồi siêu nhanh. Trước khi yêu cầu AI sửa hoặc thêm tính năng, hãy gõ kèm `@AI_CONTEXT.md` ở đầu prompt để AI nắm ngay bản đồ ngữ cảnh mà **không cần quét lại toàn bộ codebase**, giúp tiết kiệm tối đa token và tăng tốc độ xử lý!

## 1. Sơ đồ Module & Nhiệm vụ Từng File
- [manifest.json](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/manifest.json): Cấu hình Chrome Extension Manifest V3, permissions & entry scripts.
- [utils/storage.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/utils/storage.js): Quản lý `chrome.storage.local`, settings mặc định và cache key.
- [api/gemini.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/api/gemini.js): Gọi Google Gemini API (REST/Vertex), prompt dịch thuật, tra từ điển & học ngữ cảnh.
- [api/groq.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/api/groq.js): Gọi Groq Cloud API (Llama 3/4 dịch thuật siêu tốc & Whisper nhận diện giọng nói).
- [api/gtx.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/api/gtx.js): Bộ máy dự phòng Google Translate miễn phí tức thì (0ms latency, không cần Key).
- [api/lyrics.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/api/lyrics.js): Tìm kiếm và parse lời bài hát đồng bộ thời gian (LRC) từ LRCLIB.
- [background/background.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/background/background.js): Service worker: điều phối message, quản lý cache, context menu & khóa ngôi xưng.
- [content/content.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/content/content.js): Điểm neo (entry point) mỏng nhẹ điều phối luồng dữ liệu phụ đề giữa các module.
- [content/dom.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/content/dom.js): Tạo & cập nhật giao diện phụ đề nổi, thẻ tra từ vựng, coach ngữ cảnh & âm thanh.
- [content/selection.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/content/selection.js): Bắt sự kiện bôi đen văn bản trên trang web và hiển thị bubble dịch nhanh.
- [content/captions.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/content/captions.js): Nhận diện video, trích xuất phụ đề YouTube/HTML5, sync lyrics & thu âm trực tiếp.
- [content/overlay.css](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/content/overlay.css): Toàn bộ CSS giao diện phụ đề, popup tra từ, badges POS/CEFR & hiệu ứng.
- [popup/popup.html](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/popup/popup.html): Cấu trúc HTML giao diện cài đặt popup & options (đã tách riêng CSS).
- [popup/popup.css](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/popup/popup.css): Phong cách giao diện cài đặt (dark theme, glassmorphism, micro-animations).
- [popup/popup.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/popup/popup.js): Điều khiển cài đặt API Key, ngôn ngữ, xưng hô, test kết nối & sổ từ vựng.
- [popup/sfx.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/popup/sfx.js): Âm thanh tương tác nhỏ của popup (WebAudio).
- [aistudio-helper.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/aistudio-helper.js): Tự động phát hiện và trích xuất Gemini API Key từ tab Google AI Studio.
- [aistudio-page-hook.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/aistudio-page-hook.js): Hook clipboard trong MAIN world trên AI Studio để bắt Key tức thì.

## 2. Luồng Dữ liệu Chính (Data Flow)
`Video/DOM/Selection` ➔ `captions.js / selection.js` ➔ `content.js` ➔ `chrome.runtime.sendMessage` ➔ `background.js` ➔ `api/gemini.js` (hoặc `groq.js` / `gtx.js`) ➔ Trả kết quả ngược lại để `dom.js` render lên màn hình.

## 3. Quy tắc Bắt buộc cho AI
1. **Luôn đọc `AI_CONTEXT.md` đầu tiên** để định vị chính xác file cần sửa theo đúng nhiệm vụ.
2. **TUYỆT ĐỐI KHÔNG đọc toàn bộ codebase** nếu chỉ cần sửa một module riêng biệt.
3. Không tái tạo "God file"; duy trì tính độc lập và kích thước nhỏ gọn của từng module.
4. Ghi chú kiến trúc mới (v0.7.x): `background.js` có key pool (`withKeyPool`, `keyCooldown`, `backupKeys`) + `limitTranslationLength`; `captions.js` có `resetForNewVideo` (reset khi đổi video), `getVideoContext`; `content.js` có toast hết key (`showQuotaToast`) và gợi ý F5 (`startNoSubWatchdog`).
