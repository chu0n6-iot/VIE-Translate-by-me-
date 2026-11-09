# 🎬 VIE-Translate — Universal AI Video Subtitle Translator

<p align="center">
  <b>Tiện ích dịch phụ đề video sang tiếng Việt tự nhiên theo ngữ cảnh trên mọi trang web có video</b><br>
  <i>Context-Aware Vietnamese Video Subtitle Translator for All Video Websites (Powered by Google Gemini AI, Groq Cloud & Google Translate)</i>
</p>

<p align="center">
  <a href="#-tiếng-việt-bản-hướng-dẫn-đầy-đủ-từ-a-z">🇻🇳 Bản Tiếng Việt (A–Z)</a> •
  <a href="#-english-complete-a-to-z-guide">🇬🇧 English Version (A–Z)</a>
</p>

---

# 🇻🇳 TIẾNG VIỆT (Bản Hướng Dẫn Đầy Đủ Từ A–Z)

**VIE-Translate** là tiện ích mở rộng trình duyệt (Chrome, Microsoft Edge, Brave, Cốc Cốc, Opera...) giúp dịch trực tiếp phụ đề video sang **tiếng Việt tự nhiên, đúng ngữ cảnh và chuẩn ngôi xưng hô** bằng **Google Gemini AI (Free Tier)**, **Groq Cloud (Free Tier)** và **Google Translate**.

## ✨ Tính Năng Nổi Bật

1. **🌐 Dịch Phụ Đề Trên Toàn Bộ Các Trang Web Có Video (Universal Video Support)**:
   - **Nền tảng video & giải trí**: YouTube (video thường, Livestream có CC, YouTube Embed), Netflix, Bilibili, Vimeo, TED, Twitch...
   - **Nền tảng học trực tuyến (E-Learning)**: Coursera, Udemy, edX, Khan Academy, LinkedIn Learning...
   - **Mọi trang web phim / anime / khóa học dùng trình phát HTML5**: Hỗ trợ toàn diện chuẩn `<video>` + `<track>` (`WebVTT` / `SRT`) và tự động nhận diện vùng phụ đề của các bộ khung trình phát phổ biến nhất: **Video.js, JWPlayer, Plyr, Shaka Player, ArtPlayer, DPlayer, MediaElement.js**.
   - **Hỗ trợ Toàn màn hình (Fullscreen)**: Tự động đồng bộ lớp phủ phụ đề (`.vie-overlay`) khi phóng to toàn màn hình trên mọi trang web.
2. **⚡ Tự Động Nhập API Key Từ Google AI Studio (1-Click Auto-Import)**:
   - Không cần tìm kiếm hay copy-paste thủ công: Chỉ cần bấm nút **"⚡ Tự động nhập Key từ Google AI Studio"**, tiện ích sẽ mở Google AI Studio, tự động trích xuất mã API Key của bạn (`AIza...` hoặc `AQ...`), kiểm tra kết nối, chọn model tốt nhất và lưu thẳng vào tiện ích.
   - Hỗ trợ **Tự động nhận diện Key trong Clipboard** (`AIza...`, `AQ...`, `gsk_...`) ngay khi mở Popup hoặc bấm **"📋 Dán nhanh"**.
3. **🛡️ Tự Động Sửa Lỗi Model 404 & Tự Động Chuyển Tiếp Khi Hết Quota 429 (Self-Healing Auto Model)**:
   - Tự động gọi API của Google Gemini (`/v1beta/models` và Vertex Express Mode) hoặc Groq Cloud (`/openai/v1/models`) để lấy **danh sách model thực tế mà API Key của bạn được phép dùng** (`gemini-2.5-flash-lite`, `gemini-2.5-flash`, `gemini-2.0-flash`, `llama-4-scout`, `llama-3.3-70b`...).
   - **Khắc phục triệt để lỗi *"Không tìm thấy model"* (404)**: Nếu một model bị Google/Groq đổi tên, ngừng hỗ trợ hoặc hết hạn mức (Quota 429), hệ thống sẽ **tự động chuyển tiếp (failover)** sang model khả dụng tiếp theo trong tài khoản của bạn mà không bao giờ làm gián đoạn phụ đề.
4. **🚀 Tối Ưu Hóa Tốc Độ & Tiết Kiệm 85% Quota API**:
   - **Lookahead Batch Translation (Dịch trước hàng loạt)**: Với các trang web có phụ đề `<track>`, tiện ích tự động gom nhóm 8 câu thoại sắp tới để dịch trước chỉ trong **1 lượt gọi API**, giúp phụ đề hiển thị **tức thì (0ms)** và tiết kiệm tới 85% hạn mức miễn phí.
   - **Zero-Thinking Latency (`thinkingBudget: 0`)**: Tắt độ trễ suy nghĩ thừa trên dòng `gemini-2.5-flash` và lọc bỏ thẻ `<think>` trên Groq, tăng tốc độ phản hồi gấp 4 lần (~250–350ms).
   - **Hybrid Instant Preview**: Hiển thị bản dịch nhanh tức thì trong lúc chờ AI phân tích ngữ cảnh, sau đó mượt mà nâng cấp lên câu dịch chuẩn ngữ cảnh của AI.
   - **Bộ nhớ đệm bền vững (Persistent LRU Cache)**: Lưu trữ tới 800 câu thoại đã dịch trong `chrome.storage.local`, không tốn API khi tua lại video hoặc tải lại trang.
5. **🎭 Dịch Theo Ngữ Cảnh & Phụ Đề Song Ngữ (Dual-Subtitle)**:
   - Giữ mạch hội thoại và ngôi xưng hô tự nhiên (*anh/em, tôi/bạn, mình/cậu, thầy/trò, con/bố...*) dựa trên tiêu đề video và các câu thoại liền trước.
   - Tùy chọn bật/tắt hiển thị song song **Phụ đề gốc + Phụ đề Tiếng Việt**.

---

## 📖 Hướng Dẫn Cài Đặt & Sử Dụng Đầy Đủ Từ A–Z (Tiếng Việt)

### Bước A: Tải Mã Nguồn Về Máy
Bạn có thể tải dự án về máy bằng 1 trong 2 cách:
- **Cách 1 (Dùng Git)**:
  ```bash
  git clone https://github.com/chu0n6-iot/VIE-Translate-by-me-.git
  ```
- **Cách 2 (Tải file ZIP)**:
  1. Ở đầu trang GitHub này, nhấn nút màu xanh **Code** → chọn **Download ZIP**.
  2. Giải nén file `.zip` vừa tải ra một thư mục cố định trên máy tính (ví dụ: `D:\VIE-Translate`).

### Bước B: Cài Đặt Tiện Ích Lên Trình Duyệt (Chrome / Edge / Brave / Cốc Cốc)
1. Mở trình duyệt của bạn và nhập vào thanh địa chỉ:
   - **Google Chrome / Cốc Cốc**: `chrome://extensions/`
   - **Microsoft Edge**: `edge://extensions/`
   - **Brave**: `brave://extensions/`
2. Bật công tắc **Developer mode (Chế độ dành cho nhà phát triển)** (nằm ở góc trên bên phải hoặc menu bên trái).
3. Nhấn vào nút **Load unpacked (Tải tiện ích đã giải nén)**.
4. Chọn đúng thư mục chứa mã nguồn `VIE-Translate-by-me-` (thư mục có chứa file `manifest.json`).
5. Nhấn biểu tượng mảnh ghép 🧩 (**Extensions**) trên góc phải trình duyệt và bấm nút **Ghim (Pin 📌)** cạnh **VIE-Translate** để tiện sử dụng.

### Bước C: Tự Động Lấy & Kết Nối API Key Miễn Phí (Google AI Studio / Groq)
Bạn có thể chọn **Cách 1 (Tự động 100% từ Google AI Studio)** hoặc **Cách 2 (Dán nhanh Key Gemini / Groq)**:

#### Cách 1: Tự động nhập Gemini API Key chỉ với 1 cú nhấp chuột (Khuyên dùng)
1. Bấm vào biểu tượng **VIE-Translate** trên thanh công cụ trình duyệt.
2. Nhấn nút màu xanh **"⚡ Tự động nhập Key từ Google AI Studio"**.
3. Trình duyệt sẽ mở trang [Google AI Studio API Keys](https://aistudio.google.com/apikey?vie_auto_import=1) (hãy đăng nhập tài khoản Google/Gmail nếu được hỏi):
   - **Nếu bạn đã có sẵn API Key trong tài khoản**: Hộp trợ lý nổi **⚡ VIE-Translate Auto Key** ở góc dưới bên phải trang AI Studio sẽ tự động trích xuất Key, kiểm tra model và lưu thẳng vào VIE-Translate!
   - **Nếu tài khoản bạn chưa có Key nào**: Hãy bấm nút **"Create API key"** trên màn hình. Ngay khi mã Key hiện ra (hoặc khi bạn bấm nút Copy), VIE-Translate sẽ **tự động bắt lấy mã Key**, kích hoạt model tốt nhất và thông báo `✅ Đã tự động nhập API Key thành công!`.

#### Cách 2: Dán nhanh từ Clipboard (Hỗ trợ cả Gemini `AIza...` / `AQ...` và Groq `gsk_...`)
1. Lấy Key miễn phí tại [Google AI Studio](https://aistudio.google.com/apikey) hoặc [Groq Console](https://console.groq.com/keys) và bấm **Copy**.
2. Mở biểu tượng **VIE-Translate**: Tiện ích sẽ **tự động phát hiện mã Key trong Clipboard**, tự nhận diện nhà cung cấp (Gemini hoặc Groq), xác thực Key và hiển thị danh sách các model thực tế mà Key đó dùng được!

### Bước D: Cách Dịch Phụ Đề Video Trên Mọi Trang Web
1. Mở bất kỳ trang web nào có video mà bạn muốn xem (**YouTube, Coursera, Udemy, Bilibili, Vimeo, TED, Netflix, hoặc các trang web xem phim/khóa học dùng trình phát HTML5**).
2. **Quan trọng**: Hãy **BẬT chức năng Phụ đề gốc (CC / Subtitles)** trên trình phát video của trang web đó (bất kỳ ngôn ngữ gốc nào: Tiếng Anh, Tiếng Trung, Tiếng Nhật, Tiếng Hàn, Tiếng Pháp, Tiếng Tây Ban Nha... đều được hỗ trợ).
   - *Trên YouTube*: Bấm nút **CC** ở góc dưới video (hoặc nhấn phím `C`).
   - *Trên Coursera / Udemy / Web phim*: Bấm biểu tượng hội thoại **CC / Subtitles** trên thanh điều khiển video và chọn ngôn ngữ phụ đề sẵn có.
3. **VIE-Translate** sẽ tự động ẩn phụ đề gốc bị rối mắt và hiển thị lớp phủ phụ đề song ngữ (Gốc + Tiếng Việt) sắc nét ngay trên video (kể cả ở chế độ Toàn màn hình)!
4. Bạn có thể mở **VIE-Translate** bất cứ lúc nào để:
   - Bật/tắt dịch phụ đề hoặc bật/tắt chế độ **Song ngữ**.
   - Đổi qua lại giữa các model khả dụng trong danh sách hoặc chuyển sang **Google Translate** (không cần Key).

### Bước E: Xử Lý Sự Cố Thường Gặp (Troubleshooting)
- **Lỗi *"Không tìm thấy model gemini-..."* (404)**:
  - Đã được khắc phục triệt để trong bản `v0.5.0`. Hãy vào `chrome://extensions/` → bấm nút **Reload (Tải lại 🔄)** ở thẻ VIE-Translate, sau đó mở tiện ích và bấm **Test API** (hoặc **⚡ Tự động nhập Key từ Google AI Studio**) để tiện ích nạp danh sách model thực tế của tài khoản bạn.
- **Video đang phát nhưng không hiện phụ đề dịch**:
  - Hãy kiểm tra xem nút **CC / Subtitles** trên trình phát video đã được bật chưa. Tiện ích cần video có luồng phụ đề đang chạy để đọc và dịch sang tiếng Việt.

---

# 🇬🇧 ENGLISH (Complete A-to-Z Guide)

**VIE-Translate** is a high-performance browser extension (Manifest V3 for Chrome, Edge, Brave, Opera, etc.) that translates video subtitles into **natural, context-aware Vietnamese** in real time across all video websites using **Google Gemini AI (Free Tier)**, **Groq Cloud (Free Tier)**, and **Google Translate**.

## ✨ Key Features

1. **🌐 Universal Video Website Support (Translate Videos Everywhere)**:
   - **Streaming & Video Platforms**: YouTube (standard videos, Livestreams with CC, Embedded players), Netflix, Bilibili, Vimeo, TED, Twitch, and more.
   - **Online Learning (MOOCs)**: Coursera, Udemy, edX, Khan Academy, LinkedIn Learning, etc.
   - **Standard HTML5 `<video>` & Popular Web Players**: Full support for native HTML5 `<track>` (`WebVTT` / `SRT` cues) plus automatic DOM caption detection for **Video.js, JWPlayer, Plyr, Shaka Player, ArtPlayer, DPlayer, and MediaElement.js**.
   - **Fullscreen Ready**: Automatically attaches and syncs the bilingual subtitle overlay inside fullscreen containers on every website.
2. **⚡ 1-Click Auto-Import API Key from Google AI Studio**:
   - No manual copy-pasting needed: Click **"⚡ Tự động nhập Key từ Google AI Studio"** in the extension popup, and VIE-Translate will open Google AI Studio, automatically extract your Gemini API key (`AIza...` or `AQ...`), verify it, select the best active model, and save it directly into the extension.
   - Also includes **Instant Clipboard Detection** for both Gemini (`AIza...`, `AQ...`) and Groq (`gsk_...`) API keys.
3. **🛡️ Self-Healing Model Discovery & Failover (Zero 404 / 429 Interruptions)**:
   - Queries Google's `/v1beta/models` (plus Vertex Express Mode for `AQ.` keys) or Groq's `/openai/v1/models` to list only the real models available for your key.
   - **Eliminates Model 404 Errors**: If any model is deprecated, renamed, or hits a rate limit (HTTP 429), VIE-Translate automatically fails over to the next working model in your account without interrupting video playback.
4. **🚀 Ultra-Low Latency & 85% Quota Reduction**:
   - **Lookahead Batch Prefetching**: On websites using HTML5 `<track>`, VIE-Translate batches up to 8 upcoming subtitle cues into a single AI API call—delivering **0ms latency** when the video reaches those timestamps while cutting API usage by up to 85%.
   - **Zero-Thinking Overhead (`thinkingBudget: 0`)**: Disables unnecessary chain-of-thought token delay on `gemini-2.5-*` models and strips `<think>` tags on Groq reasoning models for ~4x faster responses.
   - **Hybrid Instant Preview**: Shows an instant translation preview if network latency exceeds 220ms, then seamlessly upgrades to the context-aware AI translation once ready.
   - **Persistent LRU Cache**: Stores up to 800 translated lines in `chrome.storage.local` so rewinding videos or restarting the browser never wastes API calls.
5. **🎭 Context-Aware Pronouns & Dual Subtitles**:
   - Uses the video title and a sliding window of previous dialogue lines to keep Vietnamese pronouns (*anh/em, tôi/bạn, mình/cậu, thầy/trò...*) natural and consistent.
   - Toggleable **Dual Subtitles** (Original subtitle on top + Vietnamese translation below).

---

## 📖 Complete Step-by-Step Guide from A to Z (English)

### Step A: Download the Repository
Choose one of the following methods:
- **Option 1 (Using Git)**:
  ```bash
  git clone https://github.com/chu0n6-iot/VIE-Translate-by-me-.git
  ```
- **Option 2 (Download ZIP)**:
  1. Click the green **Code** button at the top of this GitHub page → select **Download ZIP**.
  2. Extract the downloaded `.zip` file to a permanent folder on your computer.

### Step B: Install the Extension in Your Browser (Developer Mode)
1. Open your Chromium-based browser and go to the Extensions page:
   - **Google Chrome**: `chrome://extensions/`
   - **Microsoft Edge**: `edge://extensions/`
   - **Brave**: `brave://extensions/`
2. Enable the **Developer mode** toggle in the top-right (or left) corner.
3. Click **Load unpacked**.
4. Select the extracted `VIE-Translate-by-me-` folder (the folder containing `manifest.json`).
5. Click the puzzle icon 🧩 (**Extensions**) in your browser toolbar and **Pin 📌 VIE-Translate** for easy access.

### Step C: Auto-Import Your Free API Key (Google AI Studio / Groq)
You can use **Method 1 (1-Click Fully Automatic Import)** or **Method 2 (Clipboard Auto-Detection)**:

#### Method 1: 1-Click Auto-Import from Google AI Studio (Recommended)
1. Click the **VIE-Translate** icon in your browser toolbar.
2. Click the blue button **"⚡ Tự động nhập Key từ Google AI Studio"** (*Auto-import Key from Google AI Studio*).
3. A tab will open at [Google AI Studio API Keys](https://aistudio.google.com/apikey?vie_auto_import=1) (sign in with your Google account if prompted):
   - **If you already have an API key**: The floating **⚡ VIE-Translate Auto Key** assistant in the bottom-right corner will automatically trigger the copy action, capture your key, validate it, and save it into VIE-Translate!
   - **If you don't have an API key yet**: Click **"Create API key"** on the page. As soon as the key is generated or copied, VIE-Translate automatically captures and activates it!

#### Method 2: Quick Clipboard Paste (Supports Gemini `AIza...` / `AQ...` & Groq `gsk_...`)
1. Copy a free API key from [Google AI Studio](https://aistudio.google.com/apikey) or [Groq Console](https://console.groq.com/keys).
2. Open the **VIE-Translate** popup: it will automatically detect the key from your clipboard, identify the provider (Gemini or Groq), verify the key, and populate the dropdown with all active models supported by your key!

### Step D: How to Translate Videos on Any Website
1. Open any video website (**YouTube, Coursera, Udemy, Netflix, Bilibili, Vimeo, TED, or any HTML5 streaming/course site**).
2. **Important**: Turn **ON the native Closed Captions / Subtitles (CC)** in the video player (any source language—English, Chinese, Japanese, Korean, Spanish, French, etc.—is supported).
   - *On YouTube*: Click the **CC** button in the player bar (or press `C`).
   - *On Coursera / Udemy / Streaming sites*: Click the **CC / Subtitles** icon in the video controls and select any available caption track.
3. **VIE-Translate** will automatically hide the default cluttered captions and display a crisp bilingual subtitle overlay directly on the video (including in Fullscreen mode)!
4. Click the **VIE-Translate** toolbar icon anytime to:
   - Enable/Disable subtitle translation or toggle **Dual Subtitles** (*Song ngữ*).
   - Switch between verified AI models or use **Google Translate** (no API key required).

### Step E: Troubleshooting & FAQ
- **Seeing *"Model not found (404)"* error?**
  - Fixed in `v0.5.0`! Go to `chrome://extensions/`, click the **Reload 🔄** button on the VIE-Translate card, open the popup, and click **Test API** (or **⚡ Tự động nhập Key từ Google AI Studio**). The extension will dynamically fetch and use only the verified models available for your key.
- **Subtitles are not appearing on the video?**
  - Ensure the video player's native **CC / Subtitles** button is turned ON. VIE-Translate reads the active subtitle stream from the player and replaces it with the translated overlay.

---

## 🗂️ Cấu Trúc Dự Án / Project Structure

| File | Mô tả (VN) | Description (EN) |
| :--- | :--- | :--- |
| `manifest.json` | Cấu hình Manifest V3, quyền truy cập & scripts | Manifest V3 configuration, permissions & content scripts |
| `background.js` | Service Worker: Tự dò model Gemini/Groq, dịch đơn/hàng loạt, LRU Cache | Service Worker: Gemini/Groq model discovery, failover, batching, cache |
| `content.js` | Theo dõi phụ đề đa nền tảng, dịch trước `<track>`, hiển thị Hybrid | Universal video caption observer, `<track>` lookahead prefetching, overlay |
| `aistudio-page-hook.js` | Hook sự kiện copy trên Google AI Studio để bắt mã Key tự động | MAIN-world clipboard hook on Google AI Studio for instant key capture |
| `aistudio-helper.js` | Trợ lý nổi trên trang Google AI Studio giúp tự động lấy và lưu API Key | Floating assistant on Google AI Studio for 1-click API key extraction |
| `options.html` / `options.js` | Giao diện cài đặt Dark Mode, nút Tự động lấy Key, Test API | Dark-mode popup/options UI, 1-click AI Studio auto-import, API tester |
| `overlay.css` | Giao diện lớp phủ phụ đề song ngữ và tương thích toàn màn hình | Bilingual subtitle overlay styling & multi-player fullscreen rules |

## 📄 License
[MIT License](LICENSE)