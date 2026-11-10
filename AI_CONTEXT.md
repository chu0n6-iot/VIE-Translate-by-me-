# AI Context Map — VIE-Translate (Translate Toad AI)

> 💡 **Tự động kích hoạt cho AI**: Dự án đã tích hợp `.cursorrules` và `.agentrules` để AI tự động nạp ngữ cảnh từ file này trên **mọi prompt** mà không cần người dùng gõ tay `@AI_CONTEXT.md`.

## 1. Sơ đồ Module & Nhiệm vụ Từng File
- [manifest.json](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/manifest.json): Cấu hình Chrome Extension Manifest V3, permissions & entry scripts.
- [utils/storage.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/utils/storage.js): Quản lý `chrome.storage.local`, settings, persona archetypes & cache key.
- [api/gemini.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/api/gemini.js): Gọi Google Gemini API, prompt dịch thuật theo Persona, ép Glossary & tra từ điển.
- [api/groq.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/api/groq.js): Gọi Groq Cloud API siêu thanh, prompt Persona & ép Glossary.
- [api/gtx.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/api/gtx.js): Bộ máy dự phòng Google Translate miễn phí tức thì (0ms latency, không cần Key).
- [api/lyrics.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/api/lyrics.js): Tìm kiếm và parse lời bài hát đồng bộ thời gian (LRC) từ LRCLIB.
- [background/background.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/background/background.js): Service worker: điều phối, nhận diện Persona, ép Glossary override & khóa xưng hô.
- [content/content.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/content/content.js): Entry point mỏng nhẹ điều phối phụ đề, giữ preview 0ms & smart boundary debounce.
- [content/dom.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/content/dom.js): Tạo & cập nhật giao diện phụ đề nổi, thẻ tra từ vựng, coach ngữ cảnh & âm thanh.
- [content/selection.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/content/selection.js): Bắt sự kiện bôi đen văn bản trên trang web và hiển thị bubble dịch nhanh.
- [content/captions.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/content/captions.js): Nhận diện video, ghét câu ASR dở dang (Smart Boundary), sync lyrics & thu âm.
- [content/overlay.css](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/content/overlay.css): Toàn bộ CSS giao diện phụ đề, popup tra từ, badges POS/CEFR & hiệu ứng.
- [popup/popup.html](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/popup/popup.html): Giao diện cài đặt (Tab API, Ngôn ngữ, Style, Sổ từ & Khóa thuật ngữ).
- [popup/popup.css](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/popup/popup.css): Phong cách giao diện cài đặt (dark theme, glassmorphism, micro-animations).
- [popup/popup.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/popup/popup.js): Điều khiển cài đặt API Key, Persona toggle, Boundary toggle, Sổ từ & Glossary.
- [aistudio-helper.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/aistudio-helper.js): Tự động phát hiện và trích xuất Gemini API Key từ tab Google AI Studio.
- [aistudio-page-hook.js](file:///home/antigravity/chu0n6-iot/VIE-Translate-by-me-/aistudio-page-hook.js): Hook clipboard trong MAIN world trên AI Studio để bắt Key tức thì.

## 2. Luồng Dữ liệu Chính (Data Flow)
`Video/DOM/Selection` ➔ `captions.js` (Smart Merge) ➔ `content.js` (0ms preview) ➔ `background.js` (Persona + Glossary) ➔ `api/gemini.js` / `groq.js` ➔ `dom.js` (Render phụ đề).

## 3. Quy tắc Bắt buộc cho AI
1. **Luôn đọc `AI_CONTEXT.md` đầu tiên** để định vị chính xác file cần sửa theo đúng nhiệm vụ.
2. **TUYỆT ĐỐI KHÔNG đọc toàn bộ codebase** nếu chỉ cần sửa một module riêng biệt.
3. Không tái tạo "God file"; duy trì tính độc lập và kích thước nhỏ gọn của từng module.
