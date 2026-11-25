# Changelog — VIE-Translate (Translate Toad AI)

## [1.0.0] - 2026-11-25 (All-in-One Studio Release)

### 🚀 Hệ thống AI Engines Đa Nền Tảng (Cloud + Local + OpenAI-Compatible)
- **Universal OpenAI-Compatible Client (`api/openai.js` & `popup/openai.js`)**: Hỗ trợ **OpenRouter** (tự động ưu tiên model `:free` như Llama 3.3 70B, Gemma 3 27B, Qwen 3, DeepSeek), **DeepSeek**, **Cerebras**, **Mistral** hoặc custom endpoint tùy biến.
- **Tối ưu Google Gemini 2.5+ (`api/gemini.js`)**:
  - Tự động gắn `thinkingConfig: { thinkingBudget: 0 }` cho các dòng `gemini-2.5*` khi dịch phụ đề để đạt độ trễ thấp nhất (giữ nguyên tương thích cho `gemma`).
  - Lọc bỏ token suy nghĩ nội bộ (`thought: true`) trong `candidates[0].content.parts`, đảm bảo không bao giờ lấy nhầm reasoning text.
  - Loại bỏ tự động các model không phải text khi discovery (`-tts`, `-image`, `imagen`, `veo`, `learnlm`).
- **Từ điển & Giải thích Ngữ cảnh Đa Nhà Cung Cấp (`api/groq.js`, `api/ollama.js`, `api/openai.js`)**: `LOOKUP_WORD` và `EXPLAIN_SCENE` giờ hoạt động trơn tru trên Gemini, Groq, OpenRouter/OpenAI và Local AI (Ollama / LM Studio), kèm Key Pool xoay tua khi 429.
- **Local AI Vision OCR & Concurrency Limiter (`api/ollama.js`)**: Bổ sung `scanImageWithOllama` hỗ trợ cả Ollama native (`images[]`) lẫn LM Studio (`image_url`) cho Manga & Visual OCR offline, kèm giới hạn tối đa **2 request song song** (`MAX_LOCAL_CONCURRENT = 2`) bảo vệ VRAM.
- **Service Worker & Telemetry (`background/background.js`, `utils/storage.js`)**: Nâng LRU cache lên **2.500 mục**, thêm thống kê thời gian thực (`GET_ENGINE_STATS`), `RESET_COOLDOWNS`, và `TRANSLATE_PAGE_BATCH`.

### 🌐 Dịch Song Ngữ Cả Trang Web (Immersive Web Translator)
- **Module mới `content/webpage.js`**: Tự động phát hiện đoạn văn bản cần dịch (bỏ qua code, thanh điều hướng và đoạn đã là tiếng Việt), dịch cuốn theo khung nhìn bằng `IntersectionObserver` và chèn bản dịch gọn đẹp dưới đoạn gốc kèm pill nổi Ẩn/Hiện/Tắt. Kích hoạt qua `Alt + T`, nút **🌐 Dịch trang** trong Popup hoặc menu chuột phải.

### 🎬 Video Overlay, Kéo Thả, Xuất `.SRT` & Phím Tắt Nhanh
- **Di chuyển phụ đề & Xuất SRT (`content/dom.js`, `content/content.js`)**: Thêm tay kéo `⠿ Vị trí` (double-click để đặt lại mặc định), nút `📋 Copy` câu đang phát và nút `📥 SRT` tải toàn bộ phụ đề song ngữ định dạng `.srt`.
- **Sửa lỗi đa video & hover pause**: Cập nhật `overlay._vieSettings` động và giới hạn dọn overlay theo từng container video.
- **Nâng cấp Popup Bôi đen (`content/selection.js`, `content/dom.js`)**: Nới rộng giới hạn chọn văn bản lên **2.500 ký tự**, tự neo vị trí an toàn trong viewport, thêm badge provider, nút phát âm/copy và nút **📖 Tra từ điển chi tiết & Lưu vào sổ từ** ngay trên popup.
- **Phím tắt nhanh (`Alt + V / D / T / S / L / , / .`)**: Bật/tắt phụ đề, chuyển 1/2 dòng, dịch cả trang web, OCR khung hình, AI Nghe & Dịch và chỉnh độ lệch phụ đề.

### 🐸 Popup Studio v1.0.0 (`popup/popup.html`, `popup/popup.js`, `popup/popup.css`)
- Thêm **Studio Quick Action Bar** & **Engine Health Bar** (kèm nút `↺ Reset Cooldown`).
- Tab Từ vựng bổ sung **Tìm kiếm từ vựng**, chế độ ôn tập **🃏 Flashcard** tương tác (lật thẻ, phát âm, xáo trộn, đánh dấu đã thuộc), xuất **Anki CSV**, và **💾 Sao lưu / 📂 Khôi phục JSON**.

### 🧪 Kiểm tra Tự động
- Nâng cấp bộ kiểm tra `test/run_tests.js` lên **30/30 bài test đạt 100% PASSED** (bao gồm kiểm tra cú pháp toàn bộ **24 file JS** và `manifest.json`).
