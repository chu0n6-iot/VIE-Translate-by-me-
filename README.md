# VIE-Translate — Translate Toad AI v0.8.3

<p align="center">
  <img src="assets/translate-toad.png" alt="Translate Toad" width="140">
</p>

Tiện ích mở rộng (Browser Extension) miễn phí, mã nguồn mở, giúp dịch phụ đề video và truyện tranh trực tiếp trên trình duyệt bằng AI ngữ cảnh (Local AI, Gemini, Groq) hoặc Google Translate. Hoàn toàn không quảng cáo.

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
5. Bấm vào biểu tượng mảnh ghép (Extensions) ở góc trên bên phải trình duyệt ➔ **Ghim (Pin)** biểu tượng chú Cóc **Translate Toad** lên thanh công cụ.

---

### Bước 2: Chọn phương thức dịch phù hợp

Bấm vào biểu tượng chú Cóc trên thanh công cụ để mở bảng điều khiển. Bạn có 3 lựa chọn linh hoạt:

#### 🏠 Lựa chọn 1: Local AI (100% trên máy — Không cần Key, Không lo hết Quota, Vĩnh viễn)
Chạy hoàn toàn trên phần cứng máy tính của bạn, không gửi dữ liệu ra ngoài, không phụ thuộc vào giới hạn API của Google.

- **Cách 1: Dùng LM Studio (Dễ nhất cho Windows / Mac có giao diện đồ họa):**
  1. Tải và cài đặt [LM Studio](https://lmstudio.ai).
  2. Tìm kiếm và tải model **`Qwen 2.5 3B`** (hoặc `Qwen 2.5 7B`).
  3. Chuyển sang tab **Developer / Local Server** (biểu tượng `<->`) ➔ Bấm **Start Server** (mặc định cổng `http://localhost:1234/v1`, đã bật sẵn CORS).
  4. Trong Extension: Chọn **Local AI** ➔ Bấm nút **LM Studio (1234)** ➔ Bấm **Kiểm tra**.

- **Cách 2: Dùng Ollama:**
  1. Cài đặt [Ollama](https://ollama.com).
  2. Mở Terminal / PowerShell và tải model khuyên dùng:
     ```bash
     ollama pull qwen2.5:3b
     ```
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
  4. Trong Extension: Chọn **Local AI** ➔ Bấm **Ollama (11434)** ➔ Bấm **Kiểm tra**.

> 💡 **Gợi ý Model Local tốt nhất:**
> - ⭐ **`qwen2.5:3b`** (Khuyên dùng số 1): Siêu nhẹ (~2GB VRAM), dịch tiếng Việt cực chuẩn, tốc độ 40–70 token/s.
> - ⭐ **`qwen2.5:7b`**: Dịch văn phong điện ảnh chuyên nghiệp (cần GPU 6GB+ VRAM).

---

#### ⚡ Lựa chọn 2: Google Translate Miễn Phí (Nhanh nhất — 0 cần cài đặt, 0 cần Key)
- Trong Extension, chọn **Dịch bằng:** ➔ `Google Translate (không cần key)`.
- Phụ đề sẽ được dịch trực tiếp qua máy chủ Google với tốc độ tức thì, không giới hạn lượt xem.

---

#### 🚀 Lựa chọn 3: Cloud AI chất lượng cao (Miễn phí qua API Key)
- **Groq Cloud (Khuyên dùng nếu dùng Cloud)**:
  - Cực kỳ nhanh (~0.15s/câu) và cấp miễn phí **14.400 câu/ngày**.
  - Đăng ký lấy API Key miễn phí tại: [console.groq.com/keys](https://console.groq.com/keys).
- **Google Gemini API**:
  - Dịch tự nhiên, hiểu bối cảnh sâu sắc.
  - Lấy API Key miễn phí tại: [aistudio.google.com](https://aistudio.google.com).
  - *Mẹo:* Bạn có thể dán nhiều API Key vào mục **Key dự phòng**, tiện ích sẽ tự động xoay tua khi một key chạm ngưỡng giới hạn (429 Quota Exceeded).

---

### Bước 3: Thưởng thức Video & Truyện tranh

1. **Xem Video (YouTube, Coursera, Facebook, Netflix, v.v.):**
   - Mở bất kỳ video nào, bật phụ đề (CC). Tiện ích sẽ tự động dịch và hiển thị phụ đề tiếng Việt đè mượt mà lên video.
   - **Tua video (Seek):** Phụ đề hiển thị tức thì 0ms, không bị mất dòng.
   - **Video không có phụ đề CC:** Bấm nút **🎙️ AI Nghe & Dịch** cạnh video để tiện ích tự nhận dạng âm thanh và dịch.
   - **Học ngoại ngữ:** Rê chuột vào phụ đề để tạm dừng video, bấm vào từ bất kỳ để tra từ điển và phân tích ngữ cảnh.

2. **Đọc Truyện Tranh (Manga, Manhwa, Webtoon):**
   - Khi vào trang truyện tranh, thanh công cụ chú Cóc sẽ xuất hiện ở góc màn hình.
   - Bấm **Quét trang** để AI nhận diện các khung thoại và dịch trực tiếp sang tiếng Việt.

---

## ✨ Tính năng nổi bật

- **Đa nền tảng video:** Hoạt động trên YouTube, Facebook Watch, TikTok, Netflix, Coursera, Udemy, Twitter/X, và mọi website dùng thẻ HTML5 `<video>`.
- **Dịch có ngữ cảnh & xưng hô thông minh:** Tự nhận diện thể loại video (gaming, phim ảnh, bài giảng, ca nhạc) để chọn ngôi xưng phù hợp (anh/em, mình/bạn, tôi/bạn).
- **Phân tách đối thoại nhiều người (Multi-Speaker):** Tự động tách lời thoại người A và người B thành 2 dòng riêng biệt có gạch đầu dòng `- `, không bị dính chùm.
- **Dịch đón đầu siêu tốc (Lookahead Prefetching):** Gom trước 4–5 câu sắp tới gửi dịch ngầm, giúp phụ đề hiện ra tức thì 0ms khi nhân vật nói.
- **Sổ từ vựng (Glossary) cá nhân:** Khóa cố định các thuật ngữ chuyên ngành hoặc tên riêng theo ý muốn.
- **Whisper Local:** Hỗ trợ mô hình Whisper chạy GPU/CPU trên máy cho tính năng "AI Nghe & Dịch" không cần gửi âm thanh lên cloud.

---

## 🎧 Chạy Whisper Local cho AI Nghe & Dịch (Tùy chọn)

Nếu muốn dùng tính năng **AI Nghe âm thanh video** mà hoàn toàn offline:

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

## 🧪 Kiểm tra hệ thống (Test Suite)

Dự án tích hợp bộ kiểm tra tự động toàn diện gồm 24 bài test:

```bash
node test/run_tests.js
```

---

## 📄 Giấy phép

Dự án được phát hành theo giấy phép mã nguồn mở [MIT License](LICENSE). Mọi đóng góp (Pull Request, Issue) đều được hoan nghênh!
