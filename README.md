# VIE-Translate — Translate Toad AI v1.0.0

<p align="center">
  <img src="assets/translate-toad.png" alt="Translate Toad" width="140">
</p>

<p align="center">
  <b>Manifest V3</b> • <b>Version 1.0.0 (All-in-One Studio)</b> • <b>30/30 Tests Passing</b> • <b>MIT License</b> • <b>100% Free &amp; Open Source</b>
</p>

Tiện ích mở rộng (Browser Extension) miễn phí, mã nguồn mở, **All-in-One Studio** giúp dịch phụ đề video song ngữ, dịch song ngữ cả trang web, dịch truyện tranh (OCR), tra từ điển ngữ cảnh &amp; ôn tập Flashcard bằng AI (**Local AI**, **OpenRouter / DeepSeek**, **Groq**, **Google Gemini**) hoặc **Google Translate Miễn Phí**. Hoàn toàn không quảng cáo.

---

## 🚀 Cài đặt & Hướng dẫn sử dụng nhanh

### Bước 1: Nạp Extension vào trình duyệt (Chrome, Edge, Cốc Cốc, Brave)
1. Tải hoặc clone thư mục dự án này về máy:
   ```bash
   git clone https://github.com/chu0n6-iot/VIE-Translate-by-me-.git
   ```
2. Mở trình duyệt và truy cập trang quản lý tiện ích:
   - Trên **Google Chrome / Brave / Cốc Cốc**: gõ `chrome://extensions` vào thanh địa chỉ rồi Enter.
   - Trên **Microsoft Edge**: gõ `edge://extensions` vào thanh địa chỉ rồi Enter.
3. Bật công tắc **Developer mode** (Chế độ dành cho nhà phát triển) ở góc trên.
4. Bấm nút **Load unpacked** (Tải tiện ích đã giải nén) ➔ Chọn thư mục `VIE-Translate-by-me-`.
5. Bấm vào biểu tượng mảnh ghép (**Extensions**) ở góc trên bên phải trình duyệt ➔ **Ghim (Pin)** biểu tượng chú Cóc **Translate Toad** lên thanh công cụ.
6. *Khi cập nhật phiên bản mới:* Chạy `git pull origin main` tại thư mục dự án, sau đó bấm nút **🔄 Nạp lại** ngay trong Popup của Extension (hoặc bấm biểu tượng ↻ trong `chrome://extensions`) và tải lại trang web (`F5`).

---

### Bước 2: Chọn bộ máy dịch phù hợp

Bấm vào biểu tượng chú Cóc trên thanh công cụ để mở bảng điều khiển **Translate Toad Studio**. Extension hỗ trợ linh hoạt 5 bộ máy dịch:

| Bộ máy | Chi phí | Cần Key? | Điểm mạnh nổi bật |
| :--- | :---: | :---: | :--- |
| **🏠 Local AI (LM Studio / Ollama / Jan)** | Miễn phí 100% | Không | Chạy trên phần cứng máy tính, bảo mật tuyệt đối, **không bao giờ hết Quota** (hỗ trợ cả Local Vision OCR) |
| **🌐 OpenRouter / DeepSeek / Cerebras / Mistral** | Miễn phí (`:free`) | Có | Hỗ trợ model `:free` trên OpenRouter (Llama 3.3 70B, Gemma 3, Qwen 3, DeepSeek) &amp; endpoint OpenAI-Compatible |
| **🚀 Groq Cloud** | Miễn phí | Có | Tốc độ siêu thanh (~0.15s/câu), hạn mức **14.400 lượt/ngày**, hỗ trợ Whisper nghe âm thanh |
| **✨ Google Gemini API** | Miễn phí | Có | Dịch sát ngữ cảnh điện ảnh, tối ưu độ trễ `thinkingBudget: 0` (Gemini 2.5+), hỗ trợ Audio &amp; Vision OCR |
| **⚡ Google Translate (GTX)** | Miễn phí 100% | Không | Kích hoạt tức thì **0ms**, không cần cài đặt hay API Key, tự động làm hệ thống cứu hộ dự phòng |

---

#### 🏠 Lựa chọn 1: Local AI (100% trên máy — Không cần Key, Vĩnh viễn)
Chạy hoàn toàn trên máy tính của bạn, không gửi dữ liệu ra ngoài, không phụ thuộc giới hạn API đám mây.

- **Cách 1: Dùng LM Studio (Dễ nhất cho Windows / macOS có giao diện đồ họa):**
  1. Tải và cài đặt [LM Studio](https://lmstudio.ai).
  2. Tìm kiếm và tải model **`Qwen 2.5 3B`** (hoặc `Qwen 2.5 7B`). Nếu muốn dùng **OCR truyện tranh / quét chữ trên video offline**, tải thêm model Vision như `Qwen 2.5 VL` hoặc `Gemma 3`.
  3. Chuyển sang tab **Developer / Local Server** (biểu tượng `<->`) ➔ Bấm **Start Server** (mặc định cổng `http://localhost:1234/v1`, đã bật sẵn CORS).
  4. Trong Extension: Chọn **Local AI** ➔ Bấm nút **LM Studio (1234)** ➔ Bấm **Kiểm tra &amp; tải danh sách model**.

- **Cách 2: Dùng Ollama:**
  1. Cài đặt [Ollama](https://ollama.com).
  2. Mở Terminal / PowerShell và tải model khuyên dùng:
     ```bash
     ollama pull qwen2.5:3b
     ```
     *(Tùy chọn cho Local Vision OCR offline: `ollama pull qwen2.5vl:7b` hoặc `ollama pull gemma3`)*
  3. Khởi chạy Ollama với biến môi trường cho phép Extension kết nối:
     - Trên **Windows (PowerShell)**:
       ```powershell
       $env:OLLAMA_ORIGINS="*"
       ollama serve
       ```
     - Trên **Windows (CMD)**:
       ```cmd
       set OLLAMA_ORIGINS=*
       ollama serve
       ```
     - Trên **macOS / Linux**:
       ```bash
       OLLAMA_ORIGINS="*" ollama serve
       ```
  4. Trong Extension: Chọn **Local AI** ➔ Bấm **Ollama (11434)** (hoặc **Jan (1337)**) ➔ Bấm **Kiểm tra &amp; tải danh sách model**.

> 💡 **Gợi ý Model Local tốt nhất:**
> - ⭐ **`qwen2.5:3b`** (Khuyên dùng số 1): Siêu nhẹ (~2GB VRAM), dịch tiếng Việt cực chuẩn, tốc độ 40–70 token/s.
> - ⭐ **`qwen2.5:7b`**: Dịch văn phong điện ảnh chuyên nghiệp (cần GPU 6GB+ VRAM).
> - 🖼️ **`qwen2.5vl:7b` / `gemma3`**: Hỗ trợ quét chữ trên màn hình video &amp; OCR truyện tranh hoàn toàn cục bộ.

---

#### 🌐 Lựa chọn 2: OpenRouter (`:free`) / DeepSeek / Cerebras / Mistral *(Mới ở v1.0.0)*
1. Lấy API Key miễn phí tại [openrouter.ai/keys](https://openrouter.ai/keys) (hoặc DeepSeek / Cerebras / Mistral).
2. Trong Popup ➔ Tab **Kết nối** ➔ mục **Dịch bằng** chọn **OpenRouter / DeepSeek / OpenAI-Compatible**.
3. Chọn nhanh preset **OpenRouter (Free)** / **DeepSeek** / **Cerebras** / **Mistral**, dán Key ➔ bấm **Kiểm tra kết nối &amp; nạp model**. Hệ thống tự động ưu tiên các model `:free` chất lượng cao như `llama-3.3-70b-instruct:free`, `gemma-3-27b-it:free`, `qwen3-32b:free`, `deepseek-chat-v3-0324:free`.

---

#### 🚀 Lựa chọn 3: Groq Cloud &amp; Google Gemini API (Cloud AI miễn phí)
- **Groq Cloud**: Đăng ký lấy Key (`gsk_...`) miễn phí tại [console.groq.com/keys](https://console.groq.com/keys) (~0.15s/câu, 14.400 lượt/ngày).
- **Google Gemini API**: Lấy Key (`AIza...`) miễn phí tại [aistudio.google.com](https://aistudio.google.com) hoặc bấm nút **Lấy key tự động** ngay trong Popup để Cóc tự bắt key từ AI Studio.
- *Mẹo Key Pool:* Dán thêm nhiều Key Gemini/Groq vào mục **Key dự phòng**, Cóc sẽ tự động xoay tua khi một key chạm ngưỡng giới hạn (429 Quota Exceeded). Bạn có thể bấm **↺ Reset Cooldown** trên thanh Engine Health bất cứ lúc nào.

---

#### ⚡ Lựa chọn 4: Google Translate Miễn Phí (0 cần cài đặt, 0 cần Key)
- Trong Popup, chọn **Dịch bằng:** ➔ `Google Translate (không cần key)`. Phụ đề và trang web được dịch tức thì, không giới hạn lượt xem.

---

### Bước 3: Sử dụng hàng ngày (4 Chế độ Chính)

1. **🎬 Xem Video &amp; Phụ đề Song ngữ (YouTube, Coursera, Udemy, Facebook, TikTok, Netflix, HTML5 `<video>`):**
   - Mở video bất kỳ và bật phụ đề (CC): Cóc tự động dịch hiển thị 2 dòng song ngữ (hoặc 1 dòng) mượt mà, tua video (**Seek**) hiển thị lại tức thì **0ms**.
   - **Kéo thả vị trí &amp; Sao chép / Xuất `.SRT`:** Rê chuột lên phụ đề ➔ giữ nút **`⠿ Vị trí`** để kéo thả tùy ý (double-click để đặt lại mặc định); bấm **`📋 Copy`** để chép nhanh câu thoại; bấm **`📥 SRT`** (hoặc trong Popup) để tải toàn bộ phụ đề song ngữ định dạng `.srt` về máy.
   - **Quét chữ trên khung hình (Visual OCR):** Bấm nút **`🔍 OCR`** trên thanh phụ đề hoặc nhấn **`Alt + S`** để đọc &amp; giải thích ngữ cảnh biển báo, tin nhắn điện thoại, tài liệu xuất hiện trong phim.
   - **Video không có phụ đề CC:** Bấm **`🎙️ AI Nghe &amp; Dịch`** ở góc trên phải video (hoặc nhấn **`Alt + L`**) để AI nghe âm thanh/lời bài hát (tự động đồng bộ lời bài hát từ LRCLIB nếu là Music Video).

2. **🌐 Dịch Song Ngữ Cả Trang Web *(Mới ở v1.0.0)*:**
   - Nhấn **`Alt + T`**, bấm nút **`🌐 Dịch trang`** ngay trên đầu Popup, hoặc **Chuột phải lên trang ➔ *Dịch song ngữ cả trang web (VIE-Translate)***.
   - Sử dụng `IntersectionObserver` chỉ dịch những đoạn văn bản đang cuộn tới trong khung nhìn, chèn bản dịch gọn đẹp ngay bên dưới đoạn gốc (tự động bỏ qua code, thanh điều hướng và văn bản đã là tiếng Việt), kèm thanh pill nổi cho phép **Ẩn/Hiện** hoặc **Tắt** chỉ với 1 chạm.

3. **📖 Bôi đen Dịch Nhanh, Từ điển Ngữ cảnh, Flashcard &amp; Anki:**
   - **Bôi đen văn bản (tối đa 2.500 ký tự)** trên bất kỳ website nào để hiện nút dịch nhanh; popup hỗ trợ đọc phát âm `🔊`, copy `📋`, xem nguồn AI và mở rộng **Tra từ điển chi tiết** + **Lưu vào sổ từ** ngay tại chỗ.
   - **Khi đang xem video:** Rê chuột vào khung phụ đề để tự động tạm dừng video ➔ bấm vào từ bất kỳ để tra nghĩa theo ngữ cảnh (IPA, từ loại, CEFR, ví dụ, collocations) hoặc bấm **`🎓 Ngữ cảnh`** để xem phân tích cách dùng của người bản xứ.
   - **Tab Từ vựng trong Popup:** Tìm kiếm từ vựng, lọc theo từ loại (`Verb`, `Noun`, `Adj`, `Cụm từ`), ôn tập bằng chế độ **🃏 Flashcard** tương tác (lật thẻ, phát âm, xáo trộn, đánh dấu đã thuộc), xuất file **`.txt`**, xuất **Anki CSV**, và **💾 Sao lưu / 📂 Khôi phục JSON**.

4. **📚 Đọc Truyện Tranh &amp; Tiểu thuyết Web (Manga, Manhwa, Webtoon, MangaPlaza, Social/AO3):**
   - Khi mở trang đọc truyện, thanh công cụ nổi sẽ xuất hiện ở góc màn hình để quét ngầm toàn chương và chèn bản dịch trực tiếp lên khung thoại (hỗ trợ Gemini hoặc Vision Model cục bộ qua Ollama/LM Studio) và xuất bản dịch ra PNG / PDF / Excel.

---

## ⌨️ Bảng Phím Tắt Nhanh (Hotkeys)

| Phím tắt | Chức năng |
| :--- | :--- |
| `Alt + V` | Bật / Tắt nhanh phụ đề trên video |
| `Alt + D` | Chuyển nhanh chế độ Song ngữ 2 dòng / 1 dòng |
| `Alt + T` | Bật / Tắt dịch song ngữ toàn trang web |
| `Alt + S` | Quét &amp; dịch chữ trực tiếp trên khung hình video (Visual OCR) |
| `Alt + L` | Bật / Tắt AI Nghe &amp; Dịch |
| `Alt + ,` / `Alt + .` | Chỉnh độ lệch phụ đề `-0.5s` / `+0.5s` (giữ `Shift` để nhảy `1s`) |

*(Có thể bật/tắt bộ phím tắt trong Tab **Kết nối** của Popup.)*

---

## ✨ Tính năng nổi bật &amp; Có gì mới ở v1.0.0

- **Studio Quick Action Bar &amp; Engine Health Telemetry:** Nút thao tác 1 chạm (`Dịch trang`, `Xuất SRT`, `OCR màn hình`) kèm thanh hiển thị trạng thái bộ máy đang chạy, số câu đã dịch, dung lượng cache (LRU 2.500 mục) và nút `Reset Cooldown` khi API chạm 429.
- **Tối ưu Tốc độ &amp; Độ chính xác AI:** Tự gắn `thinkingBudget: 0` cho Gemini 2.5+ khi dịch phụ đề để đạt tốc độ tức thì, lọc bỏ token `thought: true`, và tự loại các model `-tts` / `-image` / `imagen` khi dò model.
- **Từ điển &amp; Giải thích Ngữ cảnh Đa Nhà Cung Cấp:** Không còn bị khóa cứng vào Gemini — `LOOKUP_WORD` và `EXPLAIN_SCENE` hoạt động mượt mà trên cả **Gemini**, **Groq**, **OpenRouter/OpenAI**, và **Local AI (Ollama / LM Studio)**.
- **Dịch có ngữ cảnh, Persona &amp; Multi-Speaker:** Tự nhận diện thể loại video (Gaming, Khoa học, Phim ảnh, Ca nhạc, Podcast), khóa ngôi xưng tiếng Việt (bảo vệ từ ghép như *một mình*, *ẩn mình*), ép thuật ngữ cố định (**Glossary**), tách riêng dòng lời thoại người A / người B (`- `), và dịch đón đầu (**Lookahead Prefetching**).
- **Bảo vệ VRAM Local AI:** Hàng đợi giới hạn tối đa **2 request song song** (`MAX_LOCAL_CONCURRENT = 2`) cho Local AI để tránh nghẽn GPU khi tua video nhanh.
- **Tự động phát hiện cập nhật GitHub:** Kiểm tra thay đổi phiên bản `manifest.json` và cây mã nguồn `main` bằng Git Blob SHA-1 (`api/updater.js`).

---

## 🎧 Chạy Whisper Local cho AI Nghe &amp; Dịch (Tùy chọn)

Nếu muốn dùng tính năng **AI Nghe âm thanh video** hoàn toàn offline trên GPU/CPU cá nhân:

```bash
# Cài đặt thư viện:
pip install openai-whisper torch

# Chạy server GPU (khuyên dùng):
python tools/whisper_server.py --device cuda --port 8000 --model large-v3

# Hoặc chạy server CPU:
python tools/whisper_server.py --device cpu --port 8001 --model small
```

Trong bảng Cài đặt của Extension ➔ mở mục **🎧 AI Nghe local (Whisper)** và bật tính năng.

---

## 🗂️ Cấu trúc Dự án (Modular Architecture)

```text
VIE-Translate-by-me-/
├── manifest.json            # Cấu hình Chrome Extension Manifest V3 (v1.0.0)
├── utils/
│   └── storage.js           # Quản lý settings cache 0ms, prompt builder, parser & glossary hash
├── api/
│   ├── gemini.js            # Google Gemini REST/Vertex, thinkingBudget:0, Audio & Vision OCR
│   ├── groq.js              # Groq Cloud Chat, Whisper, Dictionary & Scene Coach
│   ├── openai.js            # Universal OpenAI-Compatible (OpenRouter, DeepSeek, Cerebras, Mistral)
│   ├── ollama.js            # Local AI (Ollama / LM Studio / Jan), Vision OCR & Concurrency Limiter
│   ├── gtx.js               # Google Translate miễn phí 0ms + Batch recovery
│   ├── whisper.js           # Local Whisper GPU/CPU client
│   ├── lyrics.js            # Tìm kiếm & đồng bộ lời bài hát LRC từ LRCLIB
│   └── updater.js           # Kiểm tra cập nhật GitHub (Semver + Git Blob SHA-1)
├── background/
│   └── background.js        # Service Worker điều phối, LRU Cache 2500, Key Pool & Telemetry
├── content/
│   ├── content.js           # Entry point phụ đề, SRT exporter & bộ phím tắt Hotkeys
│   ├── dom.js               # Overlay phụ đề kéo thả, từ điển, scene coach & popup bôi đen
│   ├── captions.js          # Bắt phụ đề đa nền tảng, YouTube timedtext, smart merge & audio capture
│   ├── webpage.js           # Dịch song ngữ toàn trang web theo viewport (IntersectionObserver)
│   ├── manga.js             # Quét ngầm & dịch truyện tranh (OCR, typesetting, PNG/PDF/Excel)
│   ├── selection.js         # Bắt sự kiện bôi đen văn bản (tối đa 2500 ký tự)
│   └── overlay.css          # Stylesheet cho overlay phụ đề, popup từ điển & trang web song ngữ
├── popup/
│   ├── popup.html / .css / .js  # Bảng điều khiển Studio, Flashcards, Anki CSV & Backup JSON
│   ├── ollama.js / openai.js / whisper.js / sfx.js
├── tools/
│   └── whisper_server.py    # Local OpenAI-compatible Whisper server
└── test/
    └── run_tests.js         # Bộ kiểm tra tự động toàn diện (30 test suites)
```

---

## 🛠️ Khắc phục sự cố thường gặp

- **Ollama báo lỗi `403 CORS`:** Hãy thoát hoàn toàn Ollama ở khay hệ thống (System Tray), sau đó bật lại bằng lệnh `set OLLAMA_ORIGINS=* && ollama serve` (CMD) hoặc `$env:OLLAMA_ORIGINS="*"; ollama serve` (PowerShell), hoặc chuyển sang dùng **LM Studio** (cổng `1234`, bật sẵn CORS).
- **Vừa kéo code mới (`git pull`) hoặc bật Extension nhưng trang web chưa nhận:** Bấm **Reload (↻)** extension ở `chrome://extensions` rồi bấm **`F5`** tải lại tab đang xem video/đọc báo.
- **API Key báo hết lượt (`429 Quota`):** Hệ thống sẽ tự động chuyển sang Key dự phòng hoặc Google Translate Free. Bạn có thể bấm **`↺ Reset Cooldown`** ngay trên thanh Engine Health ở đầu Popup sau khi quota hồi phục.

---

## 🧪 Kiểm tra hệ thống (Test Suite)

Dự án tích hợp bộ kiểm tra tự động toàn diện gồm **30 bài test** (kiểm tra logic dịch thuật, cache, failover, Vision OCR, dịch trang web, xuất SRT, cấu trúc Popup Studio và cú pháp toàn bộ 24 file JS + `manifest.json`):

```bash
node test/run_tests.js
```

---

## 📄 Giấy phép

Dự án được phát hành theo giấy phép mã nguồn mở [MIT License](LICENSE). Mọi đóng góp (Pull Request, Issue) đều được hoan nghênh!
