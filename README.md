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
  <a href="#-lịch-sử-cập-nhật--các-cơ-chế-mới-changelog">🚀 Lịch Sử Cập Nhật (`v0.6.4`)</a> •
  <a href="#-english-complete-a-to-z-guide">🇬🇧 English Version (A–Z)</a> •
  <a href="#-version-history--new-mechanisms-changelog">📋 English Changelog</a>
</p>

---

# 🇻🇳 TIẾNG VIỆT (Bản Hướng Dẫn Đầy Đủ Từ A–Z)

**VIE-Translate (Translate Toad AI `v0.6.4`)** là tiện ích mở rộng trình duyệt (Chrome, Microsoft Edge, Brave, Cốc Cốc, Opera...) giúp dịch trực tiếp phụ đề video theo thời gian thực (**Real-Time**) sang **Tiếng Việt hoặc bất kỳ cặp song ngữ nào (Việt–Pháp, Việt–Anh, Việt–Nhật, Việt–Hàn, Việt–Trung...)**, kết hợp **Trợ Lý Học Ngoại Ngữ Qua Phụ Đề (`Tra Từ Điển + Xem Thêm Ngữ Cảnh Thực Tế`)** bằng **Google Gemini AI (Free Tier)**, **Groq Cloud (Free Tier)** và **Google Translate** — kể cả trên **các video không có nút CC/Subtitles**.

## ✨ Tính Năng Nổi Bật (`v0.6.4`)

1. **🎓 Học Ngoại Ngữ Qua Phụ Đề Video (Dừng Cảnh, Tra Từ Điển & Xem Thêm Ngữ Cảnh Thực Tế)**:
   - **Rê chuột hoặc bấm dừng video để học ngay trên câu thoại (`Hover-to-Pause & Action Bar`)**: Khi bạn dừng video hoặc đưa chuột vào khung phụ đề song ngữ, video tự động tạm dừng và hiện thanh công cụ học tập ngay bên dưới câu thoại (`🎓 Xem thêm: Ngữ cảnh & Cách dùng thực tế` • `🔊 Nghe câu`).
   - **Bấm từ bất kỳ để tra từ điển ngữ cảnh (`Click-to-Define`)**: Chạm vào bất kỳ từ nào trên dòng phụ đề gốc để xem ngay **Phiên âm IPA, Từ loại, Nghĩa sát ngữ cảnh trong cảnh phim đó, Ví dụ thực tế** và nghe phát âm chuẩn (`🔊`).
   - **Nút `🎓 Xem thêm: Ngữ cảnh & Cách dùng thực tế` (*"Ồ, hóa ra đoạn này dịch ra như ri à!"*)**:
     - Giải thích sâu **tại sao trong hoàn cảnh/cảnh phim đó người bản xứ lại dịch thoát ý như vậy (`💡 Tại sao trong cảnh này dịch như vậy?`)** so với **nghĩa đen từng chữ (`🔤 Nghĩa đen từng chữ`)**.
     - Chỉ rõ **cách người bản xứ dùng cấu trúc/idiom đó ngoài đời thực (`🗣️ Cách người bản xứ dùng thực tế`)**, **từ vựng & cụm từ ăn điểm (`🧩 Từ vựng & Cụm từ ăn điểm`)** và **ví dụ áp dụng thực tế (`✨ Ví dụ áp dụng ngay`)**.
   - **Sổ Từ Vựng & Mẫu Câu (`📚 Học Từ`)**: Lưu từ vựng hoặc lưu nguyên cả câu thoại kèm giải thích ngữ cảnh chỉ với 1 cú nhấp (`⭐ Lưu từ` / `⭐ Lưu cả câu vào Sổ từ`), ôn tập lại ngay trong popup và xuất ra file `.txt`.
2. **⚡ Tối Ưu Hóa Dịch Real-Time & Auto-Captions (Zero-Starvation Engine)**:
   - Xử lý mượt mà cả **phụ đề tự động chạy từng chữ theo thời gian thực (Auto-Captions / ASR)** lẫn phụ đề tĩnh: sử dụng cơ chế **0ms Fast Preview + 95ms AI Refinement** giúp phụ đề hiện tức thì ngay khi nhân vật mở lời và tự nâng cấp lên bản dịch AI mượt mà không bị trễ nhịp.
   - Tự động gom cụm và dịch trước hàng loạt (**Lookahead Batch Prefetching**) cho cả `<track>` và YouTube TimedText để giảm 85% lượt gọi API.
3. **🔒 Thống Nhất Nhân Xưng Xuyên Suốt Video (`Consistent Pronoun Lock Engine`)**:
   - Giải quyết triệt để tình trạng nhảy ngôi xưng lộn xộn (*câu trước dịch "tôi", câu sau nhảy sang "mình", "anh", "tớ"*):
     - **Tự động khóa ngôi xưng theo ngữ cảnh (`Auto Lock`)**: AI phân tích tiêu đề và những câu thoại đầu tiên để xác định cặp đại từ chủ đạo (*Mình – Bạn* cho Vlog/Tutorial, *Tôi – Bạn* cho Tin tức/Tài liệu, *Anh/Chị – Em* cho Phim truyện) rồi **khóa cứng xuyên suốt toàn bộ video**.
     - **4 Chế độ nhân xưng tùy chọn**: Người dùng có thể tự chọn cố định trong tab **🌍 Ngôn Ngữ**: `🔒 Tự động khóa ngôi xưng`, `🤝 Mình – Bạn`, `👔 Tôi – Bạn`, hoặc `🎬 Anh/Chị – Em`.
4. **🎵 Tự Động Tìm Lyrics Bài Hát & Chống Lệch Nhạc (`Smart Music Lyrics Lookup`)**:
   - Khi bật **AI Nghe & Dịch** trên các MV ca nhạc YouTube, tiện ích tự động quét tiêu đề + tên kênh, truy vấn **LRCLIB** để tải sẵn lời bài hát có mốc thời gian (`syncedLyrics`) lẫn lời chuẩn (`plainLyrics`), giúp hiển thị phụ đề nhạc chuẩn từng nhịp beat.
5. **🎙️ Dịch Cả Video & Trang Web KHÔNG Có Nút CC / Subtitles (`Toad AI Nghe & Dịch`)**:
   - **Tự động mở khóa `<track>` ẩn** + **Thu âm thanh AI trực tiếp từ thẻ `<video>` (`2.2s` mỗi nhịp)** qua **Groq Whisper (`whisper-large-v3-turbo`)** hoặc **Gemini Multimodal Audio**, tự động duy trì xuyên suốt khi chuyển bài/video mới.
6. **🌍 Tùy Chỉnh Cặp Song Ngữ Đa Ngôn Ngữ & 5 Phong Cách Dịch AI**:
   - Phối bất kỳ cặp song ngữ nào (**Việt – Pháp 🇫🇷, Việt – Anh 🇬🇧, Việt – Nhật 🇯🇵, Việt – Hàn 🇰🇷, Việt – Trung 🇨🇳, Việt – Đức 🇩🇪, Việt – Tây Ban Nha 🇪🇸, Việt – Nga 🇷🇺**) cùng **5 Phong cách biên dịch** (*Tự nhiên, Điện ảnh, Học thuật, GenZ, Sát nghĩa*).
7. **🎨 Giao Diện Sáng Sủa, Tinh Gọn & Hiệu Ứng Tương Tác Mượt Mà (`Micro-Interactions UI`)**:
   - Thiết kế bảng điều khiển **Translate Toad `v0.6.4`** sáng sủa, thanh trạng thái API thu gọn thông minh (`#connectedKeyBar`), cùng hiệu ứng nảy đàn hồi (`spring bounce`), sóng màu (`ripple pulse`) và thông báo nổi (`#microToast`) cho từng thao tác.

---

## 🚀 Lịch Sử Cập Nhật & Các Cơ Chế Mới (Changelog)

### 🎓 Phiên bản `v0.6.4` (Mới nhất) — *Cơ Chế Học Ngoại Ngữ Qua Phụ Đề: Tra Từ Điển, Phân Tích Ngữ Cảnh Thực Tế & Sổ Từ Vựng*
- **Cơ chế mới — Phân Tích Ngữ Cảnh & Cách Dùng Thực Tế (`EXPLAIN_SCENE` / Nút `🎓 Xem thêm`)**:
  - Khi người dùng dừng lại ở một câu phụ đề song ngữ và thấy *"Ồ, hóa ra đoạn này dịch ra như ri à!"*, chỉ cần bấm **`🎓 Xem thêm: Ngữ cảnh & Cách dùng thực tế`** (ngay dưới phụ đề hoặc bên trong thẻ tra từ điển) để Cóc AI phân tích sâu toàn bộ câu thoại dựa trên mạch hội thoại trước đó:
    1. **🔤 Nghĩa đen từng chữ (`LITERAL`)**: Dịch sát từng thành phần để nắm cấu trúc gốc.
    2. **💡 Tại sao trong cảnh này dịch như vậy (`NUANCE`)**: Giải thích sắc thái cảm xúc, ẩn ý hoặc lý do câu dịch thoát ý trong tình huống đang diễn ra trên video.
    3. **🗣️ Cách người bản xứ dùng thực tế (`USAGE`)**: Tình huống giao tiếp thực tế ngoài đời khi người bản xứ dùng cụm từ/cấu trúc này.
    4. **🧩 Từ vựng & Cụm từ ăn điểm (`VOCAB`)**: Giải nghĩa nhanh các idiom, phrasal verb, slang đắt giá trong câu.
    5. **✨ Ví dụ áp dụng ngay (`EXAMPLE`)**: Câu ví dụ thực tế kèm bản dịch để người học áp dụng ngay.
- **Cơ chế mới — Từ Điển Chạm Từ Theo Ngữ Cảnh & Sổ Tay Từ Vựng (`LOOKUP_WORD` & Tab `📚 Học Từ`)**:
  - Rê chuột vào phụ đề tự động tạm dừng video (`hoverPauseDict`), tách từng từ trên dòng phụ đề gốc thành thẻ tương tác để bấm tra nhanh **IPA + Từ loại + Nghĩa trong câu + Phát âm TTS (`🔊`)**.
  - Ghim cố định thẻ học (`state.isDictPinned`) khi đang xem giải thích để video không tự chạy mất, kèm nút **`▶️ Xem tiếp`** để quay lại xem phim ngay khi đọc xong.
  - Thêm tab **`📚 Học Từ`** trên thanh điều hướng popup để quản lý từ vựng & câu thoại đã lưu, hỗ trợ nghe lại phát âm và xuất danh sách ra file `.txt`.

### 🌟 Phiên bản `v0.6.3` — *Thống Nhất Nhân Xưng & Tinh Chỉnh Giao Diện Tương Tác*
- **Cơ chế mới — Khóa Nhân Xưng Xuyên Suốt (`Consistent Pronoun Lock Engine`)**:
  - Mở rộng bộ nhớ ngữ cảnh hội thoại lên **14 câu liên tiếp** (`MAX_CONTEXT_ITEMS = 14`).
  - Thêm bộ suy luận đại từ từ tiêu đề video (`inferInitialPronounPairFromTitle`), tự động khóa cặp ngôi xưng chủ đạo (`updateContextPronounLock`) và đồng bộ hóa cả bản dịch xem trước 0ms (`harmonizeVietnamesePronouns`).
  - Bổ sung menu **🗣️ Thống nhất ngôi xưng xuyên suốt video** trong tab **🌍 Ngôn Ngữ** (`Tự động khóa`, `Mình – Bạn`, `Tôi – Bạn`, `Anh/Chị – Em`).
- **Nâng cấp Giao diện (`UI/UX Redesign & Micro-Interactions`)**:
  - Làm mới bảng màu Slate-Indigo & Warm Gold sáng sủa, thu gọn khoảng cách các thẻ và thêm hiệu ứng động (`tickBounce`, `swatchPulse`, `toadHappyHop`, `preview-flash`, `#microToast`).

### 🔧 Phiên bản `v0.6.2` — *Tương Thích Gemini 2.5 / 2.0 Mới Nhất & Sửa Lỗi Model Cũ*
- **Sửa lỗi `models/gemini-1.5-flash is not found for API version v1beta`**:
  - Loại bỏ hoàn toàn các model thế hệ cũ đã ngừng hỗ trợ (`gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-1.0`) và nâng cấp mặc định lên **`gemini-2.5-flash-lite`**, **`gemini-2.5-flash`**, **`gemini-2.0-flash-lite`**, **`gemini-2.0-flash`**, **`gemini-flash-lite-latest`**.
- **Cơ chế mới — Tự động tương thích Payload (`Universal Minimal-Mode Retry`)**:
  - Tự động gộp chỉ dẫn hệ thống vào prompt và thử lại ngay lập tức (`minimalMode`) nếu model từ chối `systemInstruction` hoặc `safetySettings`.

### 🔑 Phiên bản `v0.6.1` — *Phân Luồng Thông Minh Key `AIza` / `AQ.` & Vá Lỗi Dịch Thuật*
- **Sửa lỗi `ReferenceError: softenProfanity is not defined`** và phân luồng chuẩn xác giữa **Standard Google AI Studio Key (`AIzaSy...`)** với **Vertex AI Express Key (`AQ...`)**.

### 🎵 Phiên bản `v0.6.0` — *AI Tìm Lyrics Bài Hát, Chuyển Video Không Ngắt Quãng & Dịch Siêu Tốc*
- **Cơ chế mới — Quét Tiêu Đề & Tải Trước Lyrics Nhạc (`LRCLIB Lyrics Pre-Fetcher`)**, tự động duy trì `AI Nghe & Dịch` khi chuyển video mới trên YouTube và ẩn toàn bộ cảnh báo đỏ khi xoay vòng model dự phòng.

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
1. Bấm vào biểu tượng chú cóc **VIE-Translate** trên thanh công cụ → ở tab **🔑 Kết Nối**, nhấn nút màu vàng **"🚀 Tự động lấy Key từ Google AI Studio"**.
2. Trang [Google AI Studio](https://aistudio.google.com/apikey?vie_auto_import=1) sẽ mở ra và tự động trích xuất/lưu Key `AIzaSy...` vào tiện ích. Sau khi kết nối, vùng nhập Key sẽ tự thu gọn thành thanh trạng thái xanh gọn gàng!

### Bước D: Học Ngoại Ngữ Trực Tiếp Khi Xem Video (`Tra Từ` & `Xem Thêm Ngữ Cảnh`)
1. Khi đang xem bất kỳ video nào có phụ đề song ngữ, chỉ cần **đưa chuột vào khung phụ đề** (hoặc bấm Pause video) — video sẽ tự động dừng lại để bạn quan sát.
2. **Muốn tra nhanh 1 từ**: Bấm trực tiếp vào từ đó trên dòng phụ đề gốc để xem phiên âm IPA, nghĩa trong câu, nghe phát âm (`🔊`) hoặc bấm **`⭐ Lưu từ`**.
3. **Muốn hiểu sâu cả câu (*"Tại sao trong cảnh này lại dịch như ri?"*)**: Bấm nút **`🎓 Xem thêm: Ngữ cảnh & Cách dùng thực tế`** ngay dưới phụ đề (hoặc nút **`🎓 Xem thêm...`** bên trong thẻ từ điển) để xem phân tích Nghĩa đen vs. Nghĩa ngữ cảnh trong cảnh phim, Cách người bản xứ dùng thực tế và lưu vào tab **`📚 Học Từ`**.

---

# 🇬🇧 ENGLISH (Complete A-to-Z Guide)

**VIE-Translate (Translate Toad AI `v0.6.4`)** is a real-time browser extension (Manifest V3 for Chrome, Edge, Brave, Opera, etc.) that translates video subtitles into **Vietnamese or any custom bilingual pair (e.g., Vietnamese–French, Vietnamese–English, Vietnamese–Japanese, Vietnamese–Korean...)** and acts as an **Interactive Language Learning & Scene Nuance Coach** using **Google Gemini AI (Free Tier)**, **Groq Cloud (Free Tier)**, and **Google Translate**—including **AI Live Audio Captioning & Music Lyrics Sync for videos without CC/Subtitles**.

## ✨ Key Features (`v0.6.4`)

1. **🎓 Interactive Language Learning Through Video Subtitles (`Scene Nuance Coach & Click Dictionary`)**:
   - **Hover-to-Pause & Learning Action Bar**: Hover over the subtitle box (or pause the video) to automatically pause playback and reveal the interactive learning bar (`🎓 Xem thêm: Ngữ cảnh & Cách dùng thực tế` • `🔊 Nghe câu`).
   - **Click-to-Define Contextual Dictionary (`LOOKUP_WORD`)**: Click any word on the original subtitle line to view its **IPA pronunciation, Part of Speech, exact contextual meaning in that scene, real-world usage tip**, and listen to native TTS pronunciation (`🔊`).
   - **Deep Scene Nuance & Real-Life Usage Breakdown (`EXPLAIN_SCENE` — *"Why is it translated like this in this scene?"*)**:
     - Click **`🎓 Xem thêm: Ngữ cảnh & Cách dùng thực tế`** on the subtitle bar or inside the word card to see:
       1. **🔤 Literal Word-by-Word Meaning (`LITERAL`)** vs. **💡 Scene Nuance & Why It's Translated That Way (`NUANCE`)**.
       2. **🗣️ How Native Speakers Actually Use It in Real Life (`USAGE`)**.
       3. **🧩 Key Idioms, Phrasal Verbs & Slang Breakdown (`VOCAB`)** + **✨ Ready-to-Use Example (`EXAMPLE`)**.
   - **Built-in Vocabulary & Sentence Notebook (`📚 Học Từ` Tab)**: Save individual words or full contextual sentence breakdowns with 1 click, review them anytime in the popup, and export to `.txt`.
2. **⚡ Real-Time & Auto-Captions Zero-Starvation Engine**:
   - Handles word-by-word streaming **Auto-Captions (ASR)** with a **0ms Instant Preview + 95ms AI Clause Refinement** pipeline and **Lookahead Batch Prefetching** (reducing API calls by up to 85%).
3. **🔒 Consistent Pronoun Lock Engine (`Thống Nhất Nhân Xưng Xuyên Suốt`)**:
   - Locks the dominant Vietnamese addressing style (*Mình – Bạn*, *Tôi – Bạn*, *Anh/Chị – Em*) across single-line requests, batch prefetching, and 0ms previews so pronouns never jump mid-video.
4. **🎵 Smart Music Lyrics Lookup (`LRCLIB Audio Sync`) & 🎙️ AI Live Audio for Videos Without CC**:
   - Automatically fetches synced lyrics for music videos from **LRCLIB** and captures direct `<video>` audio (`2.2s` slices) via **Groq Whisper** or **Gemini Multimodal Audio** for videos without CC/Subtitles.
5. **🌍 Custom Bilingual Language Pairs, 5 AI Personas & Bright Tactile Studio UI**:
   - Mix any primary and secondary language with live preview, compact connected API bar, and spring micro-animations.

---

## 📋 Version History & New Mechanisms (Changelog)

### 🎓 `v0.6.4` (Latest) — *Interactive Language Learning, Scene Nuance Coach & Vocabulary Notebook*
- **New Mechanism — Deep Scene & Practical Usage Coach (`EXPLAIN_SCENE` / `🎓 Xem thêm`)**:
  - Added full-sentence contextual breakdown analyzing the current line, its bilingual translation, and preceding dialogue history to explain `LITERAL` meaning, `NUANCE` (why the translation adapts to the scene), `USAGE` (how native speakers use the expression in real life), `VOCAB` (idioms/chunks), and `EXAMPLE`.
- **New Mechanism — Click-to-Define Contextual Dictionary & Vocab Notebook (`LOOKUP_WORD` & `📚 Học Từ`)**:
  - Added interactive word tokens on original subtitles, automatic hover-to-pause with card pinning (`state.isDictPinned`), Web Speech TTS pronunciation (`🔊`), `▶️ Xem tiếp` one-click resume, and the **`📚 Học Từ`** notebook tab with `.txt` export.

### 🌟 `v0.6.3` — *Consistent Pronoun Lock Engine & Tactile UI Redesign*
- Expanded rolling dialogue memory to **14 context lines**, added automatic dominant-pronoun locking (`updateContextPronounLock`) + 0ms preview harmonization (`harmonizeVietnamesePronouns`), and redesigned the popup with bright Slate-Indigo & Gold micro-animations.

### 🔧 `v0.6.2` — *Gemini 2.5 / 2.0 Compatibility & Universal Minimal-Mode Fallback*
- Replaced retired `gemini-1.5-*` models with **`gemini-2.5-flash-lite`**, **`gemini-2.5-flash`**, **`gemini-2.0-flash-lite`**, and **`gemini-flash-lite-latest`**, plus automatic `minimalMode` HTTP 400 recovery.

### 🔑 `v0.6.1` — *Smart `AIza` vs `AQ.` Key Routing & Pipeline Bug Fixes*
- Fixed `softenProfanity` parameter passing and added smart routing between standard AI Studio keys (`AIzaSy...`) and Vertex Express keys (`AQ...`).

### 🎵 `v0.6.0` — *Music Video Lyrics Pre-Fetch, Seamless Video Navigation & Speed Boost*
- Added **LRCLIB** synced lyrics lookup for music videos, seamless SPA video navigation re-attachment, and silent quota failover.

---

## 📖 Complete Step-by-Step Guide from A to Z (English)

### Step A: Clone or Update in VS Code
```bash
git clone https://github.com/chu0n6-iot/VIE-Translate-by-me-.git
# Or if already cloned in VS Code:
git pull origin main
```

### Step B: Load or Reload in Your Browser
1. Open `chrome://extensions/` (or `edge://extensions/`), enable **Developer mode**, and click **Load unpacked** to select `VIE-Translate-by-me-` (or click **Reload 🔄** if already installed).
2. Pin 📌 the **Translate Toad** icon to your toolbar.

### Step C: Connect Your Free API Key & Learn Languages While Watching
1. Click the **Translate Toad** icon → in **🔑 Kết Nối**, click **"🚀 Tự động lấy Key từ Google AI Studio"** for 1-click key extraction.
2. While watching any video with bilingual subtitles, **hover over the subtitle overlay** (or pause the video):
   - **Click any word** on the top subtitle line to open the contextual dictionary card with IPA, meaning in scene, and audio pronunciation (`🔊`).
   - **Click `🎓 Xem thêm: Ngữ cảnh & Cách dùng thực tế`** below the subtitle (or inside the dictionary card) to see *why* the sentence is translated that way in the scene, how native speakers use it in real life, and save it to your **📚 Học Từ** notebook!

---

## 📄 License
[MIT License](LICENSE)