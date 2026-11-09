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
  <a href="#-lịch-sử-cập-nhật--các-cơ-chế-mới-changelog">🚀 Lịch Sử Cập Nhật (`v0.6.3`)</a> •
  <a href="#-english-complete-a-to-z-guide">🇬🇧 English Version (A–Z)</a> •
  <a href="#-version-history--new-mechanisms-changelog">📋 English Changelog</a>
</p>

---

# 🇻🇳 TIẾNG VIỆT (Bản Hướng Dẫn Đầy Đủ Từ A–Z)

**VIE-Translate (Translate Toad AI `v0.6.3`)** là tiện ích mở rộng trình duyệt (Chrome, Microsoft Edge, Brave, Cốc Cốc, Opera...) giúp dịch trực tiếp phụ đề video theo thời gian thực (**Real-Time**) sang **Tiếng Việt hoặc bất kỳ cặp song ngữ nào (Việt–Pháp, Việt–Anh, Việt–Nhật, Việt–Hàn, Việt–Trung...)** bằng **Google Gemini AI (Free Tier)**, **Groq Cloud (Free Tier)** và **Google Translate** — kể cả trên **các video không có nút CC/Subtitles**.

## ✨ Tính Năng Nổi Bật (`v0.6.3`)

1. **⚡ Tối Ưu Hóa Dịch Real-Time & Auto-Captions (Zero-Starvation Engine)**:
   - Xử lý mượt mà cả **phụ đề tự động chạy từng chữ theo thời gian thực (Auto-Captions / ASR)** lẫn phụ đề tĩnh: sử dụng cơ chế **0ms Fast Preview + 95ms AI Refinement** giúp phụ đề hiện tức thì ngay khi nhân vật mở lời và tự nâng cấp lên bản dịch AI mượt mà không bị trễ nhịp.
   - Tự động gom cụm và dịch trước hàng loạt (**Lookahead Batch Prefetching**) cho cả `<track>` và YouTube TimedText để giảm 85% lượt gọi API.
2. **🔒 Thống Nhất Nhân Xưng Xuyên Suốt Video (`Consistent Pronoun Lock Engine`)**:
   - Giải quyết triệt để tình trạng nhảy ngôi xưng lộn xộn (*câu trước dịch "tôi", câu sau nhảy sang "mình", "anh", "tớ"*):
     - **Tự động khóa ngôi xưng theo ngữ cảnh (`Auto Lock`)**: AI phân tích tiêu đề và những câu thoại đầu tiên để xác định cặp đại từ chủ đạo (*Mình – Bạn* cho Vlog/Tutorial, *Tôi – Bạn* cho Tin tức/Tài liệu, *Anh/Chị – Em* cho Phim truyện) rồi **khóa cứng xuyên suốt toàn bộ video** (áp dụng cho cả dịch lẻ, dịch gom cụm `Batch` và đồng bộ hóa cả lớp dịch nhanh `0ms Preview`).
     - **4 Chế độ nhân xưng tùy chọn**: Người dùng có thể tự chọn cố định trong tab **🌍 Ngôn Ngữ**: `🔒 Tự động khóa ngôi xưng`, `🤝 Mình – Bạn`, `👔 Tôi – Bạn`, hoặc `🎬 Anh/Chị – Em`.
3. **🎵 Tự Động Tìm Lyrics Bài Hát & Chống Lệch Nhạc (`Smart Music Lyrics Lookup`)**:
   - Khi bật **AI Nghe & Dịch** trên các MV ca nhạc YouTube, tiện ích tự động quét tiêu đề + tên kênh, làm sạch các hậu tố (*Official MV, Lyrics, Visualizer...*) và truy vấn cơ sở dữ liệu **LRCLIB** để tải sẵn lời bài hát có mốc thời gian (`syncedLyrics`) lẫn lời chuẩn (`plainLyrics`).
   - Giúp **hiển thị phụ đề MV ca nhạc với độ trễ 0ms theo đúng nhịp beat** hoặc mớm lời chuẩn vào Whisper/Gemini để AI không bao giờ nghe nhầm lời ca sĩ hát luyến láy.
4. **🎙️ Dịch Cả Video & Trang Web KHÔNG Có Nút CC / Subtitles (`Toad AI Nghe & Dịch`)**:
   - **Tự động mở khóa `<track>` ẩn**: Tự phát hiện và bật các luồng phụ đề ngầm của trang web ngay cả khi giao diện trình phát không có nút CC.
   - **Thu âm thanh AI trực tiếp từ thẻ `<video>` (Không cần CC)**: Với các video hoàn toàn không có phụ đề (Facebook, TikTok, Vimeo, web tin tức, phim/anime raw...), chỉ cần bấm nút **🐸 `AI Nghe & Dịch`** ở góc trên phải video. Tiện ích thu trực tiếp luồng âm thanh (`2.2s` mỗi nhịp) qua **Groq Whisper (`whisper-large-v3-turbo`)** hoặc **Gemini Multimodal Audio** và tự động duy trì xuyên suốt khi bạn chuyển sang video kế tiếp!
5. **🌍 Tùy Chỉnh Cặp Song Ngữ Đa Ngôn Ngữ & 5 Phong Cách Dịch AI**:
   - **Tùy chọn ngôn ngữ chính & phụ**: Phối bất kỳ cặp song ngữ nào (**Việt – Pháp 🇫🇷, Việt – Anh 🇬🇧, Việt – Nhật 🇯🇵, Việt – Hàn 🇰🇷, Việt – Trung 🇨🇳, Việt – Đức 🇩🇪, Việt – Tây Ban Nha 🇪🇸, Việt – Nga 🇷🇺**) hoặc chỉ hiện 1 dòng duy nhất.
   - **5 Phong cách biên dịch (AI Personas)**: 🌿 *Tự nhiên & Đời thường*, 🍿 *Điện ảnh / Netflix*, 🎓 *Học thuật & Chuyên ngành*, 🔥 *Hài hước / GenZ*, 📖 *Dịch sát nghĩa*.
6. **🎨 Giao Diện Sáng Sủa, Tinh Gọn & Hiệu Ứng Tương Tác Mượt Mà (`Micro-Interactions UI`)**:
   - Thiết kế bảng điều khiển **Translate Toad `v0.6.3`** sáng sủa, độ tương phản cao, bố cục tinh gọn vừa khít khung nhìn (không cần thanh cuộn dọc rườm rà).
   - **Hiệu ứng phản hồi tức thì** cho mỗi thao tác: hiệu ứng nảy đàn hồi (`spring bounce`) và viền sáng ngọc lục bảo khi tick chọn cài đặt, hiệu ứng sóng lan tỏa (`ripple pulse`) kèm nháy khung Preview khi đổi màu chữ, chú cóc nhảy vui mừng kèm thông báo nổi (`floating toast pill`) mỗi khi lưu cài đặt.
7. **🛡️ Chuyển Đổi Model Âm Thầm & Bật/Tắt Giảm Nhẹ Lời Nói Tục**:
   - **Zero-Interruption Silent Failover**: Khi một model chạm giới hạn băng thông (HTTP 429/Quota), tiện ích **tự động chuyển âm thầm sang model dự phòng trong <50ms** mà không bao giờ hiện cảnh báo đỏ làm che khuất video.
   - **Chế độ Thân thiện (Mặc định) / Nguyên văn**: Tùy chọn làm mềm từ ngữ nhạy cảm sang cách diễn đạt lịch sự hoặc giữ nguyên văn phong gốc của người nói.
8. **📚 Học Ngoại Ngữ Qua Phụ Đề Song Ngữ (Hover Pause, Từ Điển Chạm Từ AI & Sổ Từ Vựng)**:
   - **Rê chuột tự dừng video (`Hover-to-Pause`)**: Đưa chuột vào khung phụ đề để video tự động tạm dừng giúp bạn đọc kỹ câu thoại; rời chuột ra video tự phát tiếp.
   - **Chạm từ bất kỳ để tra nghĩa theo ngữ cảnh (`Click-to-Define`)**: Bấm vào bất kỳ từ nào trên dòng phụ đề gốc để nghe phát âm chuẩn (`🔊`) và xem thẻ từ điển AI ngay trên phụ đề (gồm **Phiên âm IPA, Từ loại, Nghĩa sát ngữ cảnh câu thoại và Ví dụ/Mẹo nhớ**).
   - **Sổ Từ Vựng (`📚 Học Từ`)**: Lưu từ vựng chỉ với 1 cú nhấp (`⭐ Lưu từ`), ôn tập lại kèm câu thoại gốc ngay trong popup và xuất ra file `.txt` bất cứ lúc nào.
   - **Giao diện kết nối thu gọn (`Compact Connected Bar`)**: Tự động thu gọn vùng nhập API Key sau khi đã kết nối thành công, giữ giao diện luôn thoáng và gọn.

---

## 🚀 Lịch Sử Cập Nhật & Các Cơ Chế Mới (Changelog)

### 🌟 Phiên bản `v0.6.3` (Mới nhất) — *Thống Nhất Nhân Xưng & Tinh Chỉnh Giao Diện Tương Tác*
- **Cơ chế mới — Khóa Nhân Xưng Xuyên Suốt (`Consistent Pronoun Lock Engine`)**:
  - Mở rộng bộ nhớ ngữ cảnh hội thoại lên **14 câu liên tiếp** (`MAX_CONTEXT_ITEMS = 14`).
  - Thêm bộ suy luận đại từ từ tiêu đề video (`inferInitialPronounPairFromTitle`) và cơ chế tự động khóa cặp ngôi xưng chủ đạo (`updateContextPronounLock`) xuyên suốt cả luồng dịch đơn lẻ (`TRANSLATE_SUBTITLE`) lẫn luồng dịch gom cụm (`TRANSLATE_BATCH`).
  - Thêm bộ đồng bộ hậu kỳ `harmonizeVietnamesePronouns()` giúp ngay cả bản dịch xem trước 0ms của Google Translate cũng tự động khớp đại từ (*"mình"* / *"tôi"*) với giọng của AI, loại bỏ hiện tượng "nhảy chữ" khi câu dịch được tinh chỉnh.
  - Bổ sung menu **🗣️ Ngôi xưng hô xuyên suốt video** trong tab **🌍 Ngôn Ngữ** (`Tự động khóa`, `Mình – Bạn`, `Tôi – Bạn`, `Anh/Chị – Em`).
- **Nâng cấp Giao diện (`UI/UX Redesign & Micro-Interactions`)**:
  - Làm mới bảng màu Slate-Indigo & Warm Gold sáng sủa, rõ nét, thu gọn khoảng cách các thẻ giúp giao diện gọn gàng trên một khung nhìn duy nhất.
  - Thêm hiệu ứng động (`@keyframes tickBounce`, `swatchPulse`, `toadHappyHop`, `preview-flash` và `#microToast`) mỗi khi tick checkbox, chọn màu phụ đề, đổi tùy chọn hoặc bấm Lưu.

### 🔧 Phiên bản `v0.6.2` — *Tương Thích Gemini 2.5 / 2.0 Mới Nhất & Sửa Lỗi Model Cũ*
- **Sửa lỗi `models/gemini-1.5-flash is not found for API version v1beta`**:
  - Loại bỏ hoàn toàn các định danh model thế hệ cũ đã bị Google ngừng hỗ trợ (`gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-1.0`) khỏi danh sách khởi tạo và danh sách dự phòng.
  - Cập nhật danh sách model mặc định sang thế hệ mới: **`gemini-2.5-flash-lite`**, **`gemini-2.5-flash`**, **`gemini-2.0-flash-lite`**, **`gemini-2.0-flash`**, và **`gemini-flash-lite-latest`**.
- **Cơ chế mới — Tự động tương thích Payload (`Universal Minimal-Mode Retry`)**:
  - Gỡ bỏ danh mục `HARM_CATEGORY_CIVIC_INTEGRITY` và trường `role` trong `systemInstruction` từng gây lỗi `HTTP 400 Bad Request` trên một số model `v1beta`.
  - Khi gặp bất kỳmodel nào kén cấu hình `systemInstruction` hoặc `safetySettings`, tiện ích tự động gộp chỉ dẫn hệ thống vào prompt và thử lại ngay lập tức (`minimalMode`).

### 🔑 Phiên bản `v0.6.1` — *Phân Luồng Thông Minh Key `AIza` / `AQ.` & Vá Lỗi Dịch Thuật*
- **Sửa lỗi `ReferenceError: softenProfanity is not defined`**:
  - Khắc phục triệt để lỗi thiếu tham số `softenProfanity` trong `callGeminiEndpoint` và `translateWithGeminiAuto` khiến luồng dịch Gemini bị gián đoạn.
- **Sửa lỗi `Agent Platform API has not been used in project...` với Key `AQ.`**:
  - Phân biệt tự động giữa **Standard Google AI Studio Key (`AIzaSy...`)** và **Vertex AI Express Key (`AQ...`)** để định tuyến đúng endpoint và hướng dẫn người dùng lấy đúng chuẩn Key `AIzaSy...` miễn phí không cần bật Google Cloud Billing.
  - Không khóa nhầm danh sách model (`markModelRateLimited`) khi lỗi xuất phát từ quyền truy cập API của Project.

### 🎵 Phiên bản `v0.6.0` — *AI Tìm Lyrics Bài Hát, Chuyển Video Không Ngắt Quãng & Dịch Siêu Tốc*
- **Cơ chế mới — Quét Tiêu Đề & Tải Trước Lyrics Nhạc (`LRCLIB Lyrics Pre-Fetcher`)**:
  - Tự động phát hiện video âm nhạc trên YouTube, tải lời bài hát có đồng bộ thời gian (`syncedLyrics`) từ LRCLIB để hiển thị và dịch chuẩn xác theo giai điệu bài hát.
- **Sửa lỗi phải bật/tắt lại `AI Nghe & Dịch` khi chuyển sang video khác**:
  - Thêm bộ theo dõi chuyển trang SPA (`yt-navigate-finish`, URL poller, và trình lắng nghe thay thế thẻ `<video>`), tự động gắn lại luồng thu âm `MediaStream` sang video mới mà không cần người dùng bấm bật lại.
- **Tăng tốc độ dịch & Ẩn thông báo lỗi hết Quota**:
  - Giảm chu kỳ cắt âm thanh từ `3.2s` xuống `2.2s`, giảm nhịp chờ phụ đề xuống `95ms`, và ẩn toàn bộ thông báo đỏ khi chuyển đổi model dự phòng.

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
   - Nếu bạn đã có Key (`AIzaSy...`), hộp trợ lý **⚡ VIE-Translate Auto Key** ở góc dưới phải sẽ tự động trích xuất và lưu Key vào tiện ích.
   - Nếu chưa có Key, bấm **"Create API key"** trên màn hình — ngay khi Key hiện ra hoặc được Copy, tiện ích sẽ tự bắt lấy và kích hoạt model tốt nhất!
3. Bạn cũng có thể copy Key của **Groq Cloud (`gsk_...`)** tại [console.groq.com/keys](https://console.groq.com/keys) rồi bấm **"📋 Dán"**.

### Bước D: Tùy Chỉnh Song Ngữ, Ngôi Xưng & Giao Diện Phụ Đề
1. Chuyển sang tab **🌍 Ngôn Ngữ**:
   - Chọn **Ngôn ngữ dịch chính** (ví dụ: *🇻🇳 Tiếng Việt*) và **Dòng phụ ở trên** (ví dụ: *🇫🇷 Song ngữ với Tiếng Pháp* hoặc *🎬 Giữ nguyên ngôn ngữ gốc*).
   - Chọn **Phong cách biên dịch** (*Tự nhiên, Điện ảnh, Học thuật, GenZ, Sát nghĩa*).
   - Chọn **🗣️ Ngôi xưng hô xuyên suốt video** (*🔒 Tự động khóa ngôi xưng*, *🤝 Mình – Bạn*, *👔 Tôi – Bạn*, hoặc *🎬 Anh/Chị – Em*).
2. Chuyển sang tab **🎨 Giao Diện**:
   - Đổi **Kiểu khung nền**, **Phông chữ**, **Cỡ chữ**, **Màu chữ** và xem kết quả thay đổi ngay lập tức kèm hiệu ứng nháy sáng trên khung **🐸 Xem trước trực tiếp**.

### Bước E: Dịch Video Có CC & Video Không Có CC
- **Với các video có nút CC (YouTube, Coursera, Udemy, Netflix, Bilibili...)**:
  - Hãy bật nút **CC / Subtitles** trên trình phát video. Khung phụ đề của Cóc sẽ tự động thay thế phụ đề gốc và dịch theo thời gian thực.
- **Với các video KHÔNG có nút CC / Subtitles (Facebook, TikTok, Vimeo, web phim/tin tức...)**:
  - Di chuột vào khung video → bấm nút **🐸 `AI Nghe & Dịch (Không cần CC)`** ở góc trên bên phải video (hoặc tích chọn *"🎙️ Tự động bật AI Nghe & Dịch khi video không có CC"* trong tab đầu tiên).
  - Tiện ích sẽ tự thu âm thanh trực tiếp từ video (và tự tìm lời bài hát nếu là MV ca nhạc) để tạo phụ đề dịch trực tiếp lên màn hình!

---

# 🇬🇧 ENGLISH (Complete A-to-Z Guide)

**VIE-Translate (Translate Toad AI `v0.6.3`)** is a charismatic, real-time browser extension (Manifest V3 for Chrome, Edge, Brave, Opera, etc.) that translates video subtitles into **Vietnamese or any custom bilingual pair (e.g., Vietnamese–French, Vietnamese–English, Vietnamese–Japanese, Vietnamese–Korean...)** using **Google Gemini AI (Free Tier)**, **Groq Cloud (Free Tier)**, and **Google Translate**—including **AI Live Audio Captioning & Music Lyrics Sync for videos without CC/Subtitles**.

## ✨ Key Features (`v0.6.3`)

1. **⚡ Real-Time & Auto-Captions Zero-Starvation Engine**:
   - Built specifically to handle word-by-word streaming **Auto-Captions (ASR)** without lag or dropped lines: uses a **0ms Instant Preview + 95ms AI Clause Refinement** pipeline alongside **Lookahead Batch Prefetching** (reducing API calls by up to 85%).
2. **🔒 Consistent Pronoun Lock Engine (`Thống Nhất Nhân Xưng Xuyên Suốt`)**:
   - Eliminates pronoun shifting across Vietnamese translations (*no more jumping between "tôi", "mình", "anh", "tớ" mid-video*):
     - **Automatic Context Pronoun Lock (`Auto Lock`)**: Analyzes the video title and opening dialogue to detect and lock the dominant addressing style (*Mình – Bạn* for Vlogs/Tutorials, *Tôi – Bạn* for News/Talks, *Anh/Chị – Em* for Cinema/Drama) across single-line requests, batch prefetching, and 0ms previews.
     - **4 Selectable Addressing Modes**: Choose between `Auto Lock`, `Mình – Bạn (Friendly)`, `Tôi – Bạn (Formal)`, or `Anh/Chị – Em (Cinema)` in the **🌍 Languages** tab.
3. **🎵 Smart Music Lyrics Lookup (`LRCLIB Audio Sync`)**:
   - When using **AI Live Audio** on music videos, VIE-Translate automatically parses the video title and artist, fetches timestamped `syncedLyrics` (or `plainLyrics`) from **LRCLIB**, and either syncs translations directly to the beat with 0ms delay or feeds reference lyrics into Whisper/Gemini for crystal-clear song transcription.
4. **🎙️ Translate Videos on Websites WITHOUT CC / Subtitles (`Toad AI Live Audio`)**:
   - **Hidden `<track>` Auto-Unlocker** + **Direct `<video>` Audio Capture (`2.2s` fast chunks)** via **Groq Whisper (`whisper-large-v3-turbo`)** or **Gemini Multimodal Audio**.
   - **Seamless SPA Video Switching**: Automatically rebinds the live audio stream when navigating to a new video on YouTube or SPA websites without needing to toggle the feature off and on.
5. **🌍 Custom Bilingual Language Pairs & 5 AI Translation Personas**:
   - Mix and match any primary and secondary language (**Vietnamese, English, French, Japanese, Korean, Simplified/Traditional Chinese, German, Spanish, Russian, Thai**).
   - Choose from **5 AI Translation Personas**: *Natural & Conversational*, *Cinema / Netflix*, *Academic / Technical*, *GenZ / Humor*, or *Literal (Language Learning)*.
6. **🎨 Bright, Compact Subtitle Studio with Interactive Micro-Animations**:
   - Redesigned `v0.6.3` popup featuring a bright, high-contrast Slate-Indigo & Warm Gold palette that fits cleanly without vertical scrollbar clutter.
   - **Tactile Micro-Animations**: Spring-bounce checkbox cards with emerald-gold active borders, ripple-pulse color swatches that flash the live preview box, a hopping Translate Toad mascot, and a floating confirmation pill on every setting change.
7. **🛡️ Silent Model Failover & Configurable Family-Friendly Profanity Control**:
   - **Silent Quota Rotation**: Automatically rotates across 17+ discovered Gemini and Groq models in `<50ms` upon rate limits without displaying intrusive red error banners over your video.
   - **Family-Friendly Mode (Default) / Raw Mode**: Softens profanities gracefully without breaking subtitle continuity or triggering AI safety refusals.

---

## 📋 Version History & New Mechanisms (Changelog)

### 🌟 `v0.6.3` (Latest) — *Consistent Pronoun Lock Engine & Tactile UI Redesign*
- **New Mechanism — Consistent Pronoun Lock (`Consistent Pronoun Lock Engine`)**:
  - Expanded rolling dialogue memory to **14 context lines** (`MAX_CONTEXT_ITEMS = 14`).
  - Added title-based pronoun inference (`inferInitialPronounPairFromTitle`), automatic dominant-pronoun locking (`updateContextPronounLock`) across single and batch translation pipelines, and post-processing pronoun harmonization (`harmonizeVietnamesePronouns`) so 0ms Google Translate previews match AI pronouns seamlessly.
  - Added the **🗣️ Consistent Pronoun Style** selector in the **🌍 Languages** tab.
- **UI/UX Polish & Micro-Interactions**:
  - Brightened popup theme, compacted spacing to eliminate vertical scrolling, and added spring animations (`tickBounce`, `swatchPulse`, `toadHappyHop`, `preview-flash`, `#microToast`) for every checkbox tick, color change, and save action.

### 🔧 `v0.6.2` — *Gemini 2.5 / 2.0 Compatibility & Universal Minimal-Mode Fallback*
- **Fixed `models/gemini-1.5-flash is not found for API version v1beta`**:
  - Purged retired `gemini-1.5-*` and `gemini-1.0-*` model IDs from all candidate and fallback lists, upgrading defaults to **`gemini-2.5-flash-lite`**, **`gemini-2.5-flash`**, **`gemini-2.0-flash-lite`**, and **`gemini-flash-lite-latest`**.
- **New Mechanism — Universal `minimalMode` HTTP 400 Recovery**:
  - Removed deprecated `HARM_CATEGORY_CIVIC_INTEGRITY` and `systemInstruction.role` fields, and added automatic fallback to inline prompt instructions whenever a model rejects `systemInstruction` or `safetySettings`.

### 🔑 `v0.6.1` — *Smart `AIza` vs `AQ.` Key Routing & Pipeline Bug Fixes*
- **Fixed `ReferenceError: softenProfanity is not defined`** inside `callGeminiEndpoint` and `translateWithGeminiAuto`.
- **Fixed `Agent Platform API has not been used in project...`** when testing `AQ.` Vertex Express keys by routing `AIzaSy...` and `AQ.` keys appropriately, avoiding false model cooldown locks on project-level 403 errors, and guiding users to generate standard `AIzaSy...` keys in 1 click.

### 🎵 `v0.6.0` — *Music Video Lyrics Pre-Fetch, Seamless Video Navigation & Speed Boost*
- **New Mechanism — LRCLIB Music Lyrics Engine**: Automatically detects music videos, fetches timestamped `syncedLyrics` / `plainLyrics` from LRCLIB, and syncs translations accurately to the song's rhythm.
- **Fixed SPA Video Navigation Bug**: Automatically re-attaches `AI Live Audio` when switching videos on YouTube without manual toggling.
- **Speed & UX Optimization**: Reduced audio slice duration to `2.2s`, lowered subtitle debounce to `95ms`, and silenced quota warning banners with background model rotation.

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
2. On [Google AI Studio](https://aistudio.google.com/apikey?vie_auto_import=1), the floating **⚡ VIE-Translate Auto Key** assistant will automatically extract your existing `AIzaSy...` key (or capture a newly created key as soon as you click **Create API key**), verify the best free model, and save it!
3. You can also copy a free **Groq Cloud (`gsk_...`)** key from [console.groq.com/keys](https://console.groq.com/keys) and click **"📋 Dán"** (*Quick Paste*).

### Step D: Customize Languages, Pronouns, Style & Subtitle Appearance
1. Open the **🌍 Ngôn Ngữ** (*Languages*) tab to pick your **Primary Target Language**, **Secondary Bilingual Line**, **Translation Persona**, and **Consistent Pronoun Addressing Style**.
2. Open the **🎨 Giao Diện** (*Subtitle Studio*) tab to customize the box theme, font family, font size, colors, and bottom offset with interactive live preview.

### Step E: Translate Any Video (With or Without CC)
- **Videos WITH CC/Subtitles**: Turn ON the player's **CC / Subtitles** button. Translate Toad will automatically replace the default captions with your customized bilingual overlay.
- **Videos WITHOUT CC/Subtitles**: Hover over the video and click the **🐸 `AI Nghe & Dịch (Không cần CC)`** button in the top-right corner of the video player to start live AI audio transcription and translation!

---

## 📄 License
[MIT License](LICENSE)