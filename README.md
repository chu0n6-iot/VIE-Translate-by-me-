# 🐸 VIE-Translate — Translate Toad AI (Universal Video Subtitle Translator)

<p align="center">
  <img src="assets/translate-toad.png" alt="Translate Toad Mascot" width="160">
</p>

<p align="center">
  <b>Tiện ích dịch phụ đề video Real-Time theo ngữ cảnh & AI tự nghe âm thanh trên mọi trang web có video</b><br>
  <i>Real-Time Context-Aware Bilingual Video Subtitle Translator & Live AI Audio Captioner for All Video Websites</i>
</p>

<p align="center">
  <a href="#-tiếng-việt-bản-hướng-dẫn-đầy-đủ-từ-a-z">🇻🇳 Bản Tiếng Việt (A–Z)</a> •
  <a href="#-english-complete-a-to-z-guide">🇬🇧 English Version (A–Z)</a>
</p>

---

# 🇻🇳 TIẾNG VIỆT (Bản Hướng Dẫn Đầy Đủ Từ A–Z)

**VIE-Translate (Translate Toad AI `v0.6`)** là tiện ích mở rộng trình duyệt (Chrome, Microsoft Edge, Brave, Cốc Cốc, Opera...) giúp dịch trực tiếp phụ đề video theo thời gian thực (**Real-Time**) sang **Tiếng Việt hoặc bất kỳ cặp song ngữ nào (Việt–Pháp, Việt–Anh, Việt–Nhật, Việt–Hàn, Việt–Trung...)** bằng **Google Gemini AI (Free Tier)**, **Groq Cloud (Free Tier)** và **Google Translate** — kể cả trên **các video không có nút CC/Subtitles**.

## ✨ Tính Năng Nổi Bật (`v0.6.0`)

1. **⚡ Tối Ưu Hóa Dịch Real-Time & Auto-Captions (Zero-Starvation Engine)**:
   - Xử lý mượt mà cả **phụ đề tự động chạy từng chữ theo thời gian thực (Auto-Captions / ASR)** lẫn phụ đề tĩnh: sử dụng cơ chế **Leading + Trailing Throttle (250ms)** kết hợp **AI Context Refinement** giúp phụ đề hiện ngay lập tức khi nhân vật đang nói mà không bao giờ bị trễ hay mất chữ.
   - Tự động gom cụm và dịch trước hàng loạt (**Lookahead Batch Prefetching**) cho cả `<track>` và YouTube TimedText để giảm 85% lượt gọi API.
2. **🎙️ Dịch Cả Video & Trang Web KHÔNG Có Nút CC / Subtitles (`Toad AI Nghe & Dịch`)**:
   - **Tự động mở khóa `<track>` ẩn**: Tự phát hiện và bật các luồng phụ đề ngầm của trang web ngay cả khi giao diện trình phát không có nút CC.
   - **Thu âm thanh AI trực tiếp từ thẻ `<video>` (Không cần CC)**: Với các video hoàn toàn không có phụ đề (Facebook, TikTok, Vimeo, web tin tức, phim/anime raw...), bạn chỉ cần bấm nút **🐸 `AI Nghe & Dịch (Không cần CC)`** hiện ở góc trên bên phải video (hoặc bật tự động trong cài đặt). Tiện ích sẽ thu trực tiếp luồng âm thanh bên trong video (`video.captureStream()`) và gửi tới **Groq Whisper (`whisper-large-v3-turbo`)** hoặc **Gemini Multimodal Audio** để tự tạo phụ đề gốc + dịch song ngữ theo thời gian thực!
3. **🌍 Tùy Chỉnh Cặp Song Ngữ Đa Ngôn Ngữ & 5 Phong Cách Dịch AI**:
   - **Tùy chọn ngôn ngữ chính & phụ**: Không chỉ có Anh–Việt! Bạn có thể tự phối bất kỳ cặp song ngữ nào: **Song ngữ Việt – Pháp 🇫🇷, Việt – Anh 🇬🇧, Việt – Nhật 🇯🇵, Việt – Hàn 🇰🇷, Việt – Trung 🇨🇳, Việt – Đức 🇩🇪, Việt – Tây Ban Nha 🇪🇸, Việt – Nga 🇷🇺**, hoặc chỉ hiện 1 dòng duy nhất.
   - **5 Phong cách biên dịch (AI Personas)**:
     - 🌿 **Tự nhiên & Đời thường**: Chuẩn ngôi xưng hô (*anh/em, thầy/trò, mình/cậu...*) và giữ nguyên sắc thái câu thoại.
     - 🍿 **Điện ảnh / Netflix**: Câu từ cô đọng, giàu cảm xúc và thần thái nhân vật.
     - 🎓 **Học thuật & Chuyên ngành**: Chuẩn thuật ngữ cho Coursera, Udemy, bài giảng lập trình, y sinh, kinh tế.
     - 🔥 **Hài hước / GenZ**: Trẻ trung, bắt trend cho Vlog, Gaming, Livestream.
     - 📖 **Dịch sát nghĩa**: Bám sát cấu trúc câu gốc để học ngoại ngữ.
4. **🎨 Studio Tùy Chỉnh Giao Diện Phụ Đề & Xem Trước Trực Tiếp (Live Preview)**:
   - Giao diện **Translate Toad** sống động với khung **Xem trước trực tiếp**.
   - Tùy biến **4 kiểu khung nền** (*🐸 Translate Toad viền vàng*, *✨ Kính mờ Frosted Glass*, *🎬 Hộp đen Cinema*, *🌟 Không nền - Viền chữ đậm kiểu Netflix/Anime*).
   - Tùy chỉnh **5 bộ Phông chữ**, thanh trượt **Độ rộng khung (`30%–100%`)** (giúp khung cố định, không bị co giãn giật lắc), **Cỡ chữ (`75%–150%`)**, **Vị trí độ cao (`4%–45%`)**, và **Màu sắc từng dòng phụ đề**.
5. **🔑 Tự Động Nhập API Key Từ Google AI Studio Chỉ Với 1 Cú Nhấp**:
   - Bấm **"⚡ Tự động lấy Key từ Google AI Studio"**, trợ lý nổi của Cóc sẽ tự mở AI Studio, trích xuất mã Key (`AIza...` / `AQ...`), kiểm tra danh sách model thực tế của tài khoản và lưu tự động.
6. **🛡️ Tùy Chọn Bật/Tắt Giảm Nhẹ Lời Nói Tục & Chửi Thề (Family-Friendly / Censoring Control)**:
   - **Chế độ Thân thiện (Mặc định)**: Khi YouTuber nói tục hoặc chửi thề (`fuck`, `shit`, `damn`...), AI sẽ chủ động **giảm nhẹ tình tiết và làm mềm ngôn từ** sang cách diễn đạt văn minh, lịch sự (*"chết tiệt"*, *"trời đất ơi"*, *"quái quỷ"*, *"khốn khổ"*...). Phụ đề luôn hiển thị trọn vẹn, **tuyệt đối không bị ngắt quãng, không bị AI từ chối dịch hay che dấu `***`**.
   - **Chế độ Nguyên văn**: Dịch trung thực, giữ nguyên văn phong đời thường và sắc thái tự nhiên của người nói.
   - **Bộ nhớ đệm độc lập**: Tự động làm mới cache khi đổi chế độ, phụ đề mới áp dụng ngay lập tức.

---

## 📖 Hướng Dẫn Cài Đặt & Sử Dụng Đầy Đủ Từ A–Z (Tiếng Việt)

### Bước A: Tải Mã Nguồn / Cập Nhật Vào VS Code
- **Nếu tải mới**:
  ```bash
  git clone https://github.com/chu0n6-iot/VIE-Translate-by-me-.git
  ```
- **Nếu đã có sẵn trong VS Code**: Mở Terminal trong VS Code (`` Ctrl + ` ``) và chạy:
  ```bash
  git pull origin main
  ```

### Bước B: Cài Đặt Lên Trình Duyệt (Chrome / Edge / Brave / Cốc Cốc)
1. Mở trình duyệt và truy cập `chrome://extensions/` (hoặc `edge://extensions/`).
2. Bật công tắc **Developer mode (Chế độ dành cho nhà phát triển)** ở góc trên bên phải.
3. Nhấn **Load unpacked (Tải tiện ích đã giải nén)** và chọn thư mục `VIE-Translate-by-me-` (nếu đã cài từ trước, chỉ cần bấm nút **Reload 🔄** ở khung tiện ích **VIE-Translate**).
4. Bấm biểu tượng mảnh ghép 🧩 trên thanh công cụ và **Ghim 📌** chú cóc **Translate Toad**.

### Bước C: Tự Động Lấy & Kích Hoạt API Key Miễn Phí
1. Bấm vào biểu tượng chú cóc **VIE-Translate** trên thanh công cụ → ở tab **🔑 AI & Kết Nối**, nhấn nút màu vàng **"⚡ Tự động lấy Key từ Google AI Studio"**.
2. Trang [Google AI Studio](https://aistudio.google.com/apikey?vie_auto_import=1) sẽ mở ra:
   - Nếu bạn đã có Key, hộp trợ lý **⚡ VIE-Translate Auto Key** ở góc dưới phải sẽ tự động trích xuất và lưu Key vào tiện ích.
   - Nếu chưa có Key, bấm **"Create API key"** trên màn hình — ngay khi Key hiện ra hoặc được Copy, tiện ích sẽ tự bắt lấy và kích hoạt model tốt nhất!
3. Bạn cũng có thể copy Key của **Groq Cloud (`gsk_...`)** tại [console.groq.com/keys](https://console.groq.com/keys) rồi bấm **"📋 Dán nhanh"**.

### Bước D: Tùy Chỉnh Song Ngữ (Việt–Pháp, Việt–Anh...) & Giao Diện Phụ Đề
1. Chuyển sang tab **🌍 Ngôn Ngữ**:
   - Chọn **Ngôn ngữ dịch chính** (ví dụ: *🇻🇳 Tiếng Việt*).
   - Chọn **Ngôn ngữ dòng phụ ở trên** (ví dụ: chọn *🇫🇷 Song ngữ với Tiếng Pháp* để hiển thị song ngữ Pháp – Việt, hoặc chọn *🎬 Giữ nguyên ngôn ngữ gốc của video*).
   - Chọn **Phong cách biên dịch** (*Tự nhiên, Điện ảnh, Học thuật, GenZ, Sát nghĩa*).
2. Chuyển sang tab **🎨 Giao Diện Sub**:
   - Đổi **Kiểu khung nền**, **Phông chữ**, **Cỡ chữ**, **Màu chữ** và xem kết quả thay đổi ngay lập tức trên khung **🐸 Xem trước trực tiếp**.

### Bước E: Dịch Video Có CC & Video Không Có CC
- **Với các video có nút CC (YouTube, Coursera, Udemy, Netflix, Bilibili...)**:
  - Hãy bật nút **CC / Subtitles** trên trình phát video. Khung phụ đề của Cóc sẽ tự động thay thế phụ đề gốc và dịch theo thời gian thực.
- **Với các video KHÔNG có nút CC / Subtitles (Facebook, TikTok, Vimeo, web phim/tin tức...)**:
  - Di chuột vào khung video → bấm nút **🐸 `AI Nghe & Dịch (Không cần CC)`** ở góc trên bên phải video (hoặc tích chọn *"🎙️ Tự động bật AI Nghe & Dịch cho video không có nút CC"* trong tab đầu tiên của tiện ích).
  - Tiện ích sẽ tự thu âm thanh trực tiếp từ video và tạo phụ đề dịch trực tiếp lên màn hình!

---

# 🇬🇧 ENGLISH (Complete A-to-Z Guide)

**VIE-Translate (Translate Toad AI `v0.6`)** is a charismatic, real-time browser extension (Manifest V3 for Chrome, Edge, Brave, Opera, etc.) that translates video subtitles into **Vietnamese or any custom bilingual pair (e.g., Vietnamese–French, Vietnamese–English, Vietnamese–Japanese, Vietnamese–Korean...)** using **Google Gemini AI (Free Tier)**, **Groq Cloud (Free Tier)**, and **Google Translate**—including **AI Live Audio Captioning for videos without CC/Subtitles**.

## ✨ Key Features (`v0.6.0`)

1. **⚡ Real-Time & Auto-Captions Zero-Starvation Engine**:
   - Built specifically to handle word-by-word streaming **Auto-Captions (ASR)** without lag or dropped lines: uses a **Leading + Trailing Throttle (250ms)** paired with **AI Clause Refinement** so translations stream smoothly in real time alongside the speaker's voice.
   - Includes **Lookahead Batch Prefetching** for HTML5 `<track>` and YouTube TimedText to reduce API calls by up to 85%.
2. **🎙️ Translate Videos on Websites WITHOUT CC / Subtitles (`Toad AI Live Audio`)**:
   - **Hidden `<track>` Auto-Unlocker**: Automatically detects and activates hidden subtitle tracks even when a website's video player hides the CC button.
   - **Direct `<video>` Audio Capture -> Whisper / Gemini Audio**: When watching a video that has **no subtitles at all**, click the floating **🐸 `AI Nghe & Dịch (Không cần CC)`** button in the top-right corner of the video (or enable auto-mode in settings). VIE-Translate taps directly into `video.captureStream()`, slices audio every 3.2 seconds, and uses **Groq Whisper (`whisper-large-v3-turbo`)** or **Gemini Multimodal Audio** to transcribe and translate the speech in real time!
3. **🌍 Custom Bilingual Language Pairs & 5 AI Translation Personas**:
   - Mix and match any primary and secondary language (**Vietnamese, English, French, Japanese, Korean, Simplified/Traditional Chinese, German, Spanish, Russian, Thai**—e.g. display **French + Vietnamese** subtitles on any video!).
   - Choose from **5 AI Translation Personas**: *Natural & Conversational*, *Cinema / Netflix*, *Academic / Technical*, *GenZ / Humor*, or *Literal (Language Learning)*.
4. **🎨 Interactive Subtitle Studio with Live Preview**:
   - Customize **Background Themes** (*🐸 Translate Toad Gold*, *✨ Frosted Glass*, *🎬 Cinema Dark*, *🌟 Clean Outline*), **5 Font Families**, **Box Width (`30%–100%`)** (stabilizes subtitle box against horizontal jitter), **Font Size (`75%–150%`)**, **Vertical Position (`4%–45%`)**, and **Custom Colors** with an instant live preview inside the popup.
5. **🔑 1-Click Auto-Import API Key from Google AI Studio**:
   - Click **"⚡ Tự động lấy Key từ Google AI Studio"** to open Google AI Studio and automatically extract, verify, and save your Gemini API key (`AIza...` / `AQ...`) and active model list.
6. **🛡️ Configurable Family-Friendly Profanity Softening (Censoring Control)**:
   - **Family-Friendly Mode (Default)**: Automatically softens swear words, slurs, and profanities (`fuck`, `shit`, `damn`, `bitch`...) into polite expressions (*"darn it"*, *"oh goodness"*, *"frustrating"*, *"heavens"*...) without breaking subtitle continuity or triggering model refusal errors.
   - **Raw / Uncensored Mode**: Provides authentic, true-to-life translations capturing the speaker's full emotional slang.
   - **Isolated Mode Caching**: Employs separate cache routes so switching between family-friendly and raw modes refreshes immediately.

---

## 📖 Complete Step-by-Step Guide from A to Z (English)

### Step A: Clone or Update in VS Code
```bash
git clone https://github.com/chu0n6-iot/VIE-Translate-by-me-.git
# Or if already cloned in VS Code:
git pull origin main
```

### Step B: Load or Reload in Your Browser
1. Open `chrome://extensions/` (or `edge://extensions/`).
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `VIE-Translate-by-me-` folder (or click the **Reload 🔄** icon on the VIE-Translate card if already installed).
4. Pin 📌 the **Translate Toad** icon to your browser toolbar.

### Step C: Connect Your Free API Key in 1 Click
1. Click the **Translate Toad** toolbar icon → in the **🔑 AI & Kết Nối** tab, click **"⚡ Tự động lấy Key từ Google AI Studio"**.
2. On [Google AI Studio](https://aistudio.google.com/apikey?vie_auto_import=1), the floating **⚡ VIE-Translate Auto Key** assistant will automatically extract your existing key (or capture a newly created key as soon as you click **Create API key**), verify the best free model, and save it!
3. You can also copy a free **Groq Cloud (`gsk_...`)** key from [console.groq.com/keys](https://console.groq.com/keys) and click **"📋 Dán nhanh"** (*Quick Paste*).

### Step D: Customize Languages, Style & Subtitle Appearance
1. Open the **🌍 Ngôn Ngữ** (*Languages*) tab to pick your **Primary Target Language**, **Secondary Bilingual Line** (e.g., Original, French, English, Japanese, Korean, or Single-line), and **Translation Persona**.
2. Open the **🎨 Giao Diện Sub** (*Subtitle Studio*) tab to customize the box theme, font family, font size, colors, and bottom offset with real-time preview.

### Step E: Translate Any Video (With or Without CC)
- **Videos WITH CC/Subtitles**: Turn ON the player's **CC / Subtitles** button. Translate Toad will automatically replace the default captions with your customized bilingual overlay.
- **Videos WITHOUT CC/Subtitles**: Hover over the video and click the **🐸 `AI Nghe & Dịch (Không cần CC)`** button in the top-right corner of the video player to start live AI audio transcription and translation!

---

## 📄 License
[MIT License](LICENSE)