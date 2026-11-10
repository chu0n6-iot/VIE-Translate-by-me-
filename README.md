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
  <a href="#-lịch-sử-cập-nhật--các-cơ-chế-mới-changelog">🚀 Lịch Sử Cập Nhật (`v0.6.6`)</a> •
  <a href="#-english-complete-a-to-z-guide">🇬🇧 English Version (A–Z)</a> •
  <a href="#-version-history--new-mechanisms-changelog">📋 English Changelog</a>
</p>

---

# 🇻🇳 TIẾNG VIỆT (Bản Hướng Dẫn Đầy Đủ Từ A–Z)

**VIE-Translate (Translate Toad AI `v0.6.6`)** là tiện ích mở rộng trình duyệt (Chrome, Microsoft Edge, Brave, Cốc Cốc, Opera...) giúp dịch trực tiếp phụ đề video theo thời gian thực (**Real-Time**) sang **Tiếng Việt hoặc bất kỳ cặp song ngữ nào (Việt–Pháp, Việt–Anh, Việt–Nhật, Việt–Hàn, Việt–Trung...)**, kết hợp **Trợ Lý Học Ngoại Ngữ Chuyên Sâu (`Từ Loại POS • Ví Dụ Thực Tế • Fact Thú Vị & Mẹo Nhớ • Cụm Đi Kèm • Sổ Từ Vựng`)**, **Cân Chỉnh Độ Lệch Sub/Nhạc Tức Thì (`Sub Sync Calibration`)** và **Đọc Phát Âm Chuẩn Giọng Bản Xứ** bằng **Google Gemini AI (Free Tier)**, **Groq Cloud (Free Tier)** và **Google Translate** — kể cả trên **các video không có nút CC/Subtitles**.

## ✨ Tính Năng Nổi Bật (`v0.6.6`)

1. **📚 Phần Học Từ Vựng Đa Chiều Đặc Sắc (Rich Vocabulary Engine)**:
   - **Huy hiệu từ loại song ngữ trực quan (POS Badges)**: Tự động phân loại Động từ (Verb), Danh từ (Noun), Tính từ (Adjective), Trạng từ (Adverb), Cụm động từ (Phrasal Verb), Thành ngữ (Idiom), Tiếng lóng (Slang) với màu sắc bắt mắt.
   - **Ví dụ thực tế khác ngoài đời kèm dịch**: Cung cấp các câu ví dụ sinh động ngoài đời kèm bản dịch nghĩa và nút loa riêng `🔊` để nghe phát âm từng câu.
   - **Fact thú vị & Mẹo nhớ siêu tốc (`Fun Facts & Memory Hacks`)**: Bật mí nguồn gốc từ nguyên độc lạ (etymology), bối cảnh văn hóa bản xứ hoặc mẹo ghi nhớ hài hước giúp hiểu bản chất từ ngữ.
   - **Cụm từ hay đi kèm & Đồng nghĩa (`Collocations & Synonyms`)**: Gợi ý các cách kết hợp từ tự nhiên như người bản xứ.
   - **Sổ từ vựng đồng bộ & Xuất file `.txt`**: Quản lý từ vựng đã lưu trong tab `📚 Học Từ`, hỗ trợ nghe lại mọi câu ví dụ và xuất tài liệu học tập `.txt` chỉ với 1 cú click.
2. **⏱️ Khắc Phục Lệch Sub/Lyrics & Bộ Điều Chỉnh Nhịp Tức Thì (`Live Sub Sync Calibration`)**:
   - **Tự động căn chỉnh độ lệch Intro của MV ca nhạc**: Tự động so khớp mốc thời gian phát âm thực từ phụ đề YouTube ASR với lời bài hát LRCLIB; tự động bù trừ khoảng chênh lệch thời lượng (`durationDelta`) của các Official Music Video (có đoạn thoại/cảnh phim mở đầu) và đọc thẻ chuẩn `[offset: +/-ms]` trong file LRC để phụ đề khớp từng nhịp hát.
   - **Thanh chỉnh lệch sub 1-chạm (`⏱️ Lệch sub: ⏪ -1s / 0s / +1s ⏩ / ↺`)**: Nằm ngay trên thanh công cụ học tập dưới câu phụ đề, cho phép bạn bấm nới nhanh ±1s (hoặc nhiều giây) tức thì để phụ đề trễ lại hay chạy sớm theo ý muốn.
3. **🎵 Thêm Nốt Nhạc (`♪ ... ♪`) & Dấu Câu Biểu Cảm Phong Phú**:
   - Tự động bao bọc lời bài hát bằng nốt nhạc `♪ ... ♪` cho cả câu gốc và câu dịch.
   - Bổ sung quy tắc dịch AI thêm dấu câu biểu cảm vào các câu đặc thù: `?` cho câu hỏi, `!` / `!?` cho câu cảm thán/kinh ngạc, `...` cho câu ngập ngừng/thì thầm/bỏ lửng, `“...”` khi trích dẫn lời thoại.
4. **🔊 Đọc Ngoại Ngữ Chuẩn Giọng Bản Xứ (Native Foreign Voice TTS)**:
   - Tự động nhận diện ngôn ngữ của từ vựng / câu thoại (Tiếng Anh 🇬🇧, Tiếng Pháp 🇫🇷, Tiếng Nhật 🇯🇵, Tiếng Hàn 🇰🇷, Tiếng Trung 🇨🇳, Tiếng Đức 🇩🇪, Tiếng Tây Ban Nha 🇪🇸, Tiếng Nga 🇷🇺...) và kích hoạt đúng giọng đọc bản xứ (`en-US`, `fr-FR`, `ja-JP`, `ko-KR`...), loại bỏ hoàn toàn tình trạng dùng giọng đọc tiếng Việt đọc từ tiếng nước ngoài.
5. **🎓 Dừng Cảnh & Xem Thêm Ngữ Cảnh Thực Tế (`Scene Nuance Coach`)**:
   - **Rê chuột hoặc bấm dừng video để học ngay trên câu thoại (`Hover-to-Pause & Action Bar`)**: Hiện thanh công cụ học tập (`🎓 Xem thêm: Ngữ cảnh & Cách dùng thực tế` • `🔊 Nghe câu` • `⏱️ Lệch sub`).
   - **Nút `🎓 Xem thêm` (*"Ồ, hóa ra đoạn này dịch ra như ri à!"*)**: Bóc tách **Nghĩa đen từng chữ (`LITERAL`)**, **Tại sao trong cảnh này dịch như vậy (`NUANCE`)**, **Cách người bản xứ dùng thực tế ngoài đời (`USAGE`)**, **Từ vựng & Idiom ăn điểm (`VOCAB`)** và **Ví dụ áp dụng ngay (`EXAMPLE`)**.
6. **⚡ Tối Ưu Hóa Dịch Real-Time & Auto-Captions (Zero-Starvation Engine)**:
   - Cơ chế **0ms Fast Preview + 95ms AI Refinement** giúp phụ đề hiện tức thì ngay khi nhân vật mở lời và tự nâng cấp lên bản dịch AI mượt mà không bị trễ nhịp.
7. **🔒 Thống Nhất Nhân Xưng Xuyên Suốt Video (`Consistent Pronoun Lock Engine`)**:
   - Tự động khóa cặp ngôi xưng chủ đạo (*Mình – Bạn*, *Tôi – Bạn*, *Anh/Chị – Em*) xuyên suốt toàn bộ video.
8. **🎙️ Dịch Cả Video & Trang Web KHÔNG Có Nút CC / Subtitles (`Toad AI Nghe & Dịch`)**:
   - Tự động mở khóa `<track>` ẩn và thu âm thanh AI trực tiếp từ thẻ `<video>` (`2.2s` mỗi nhịp) qua **Groq Whisper** hoặc **Gemini Multimodal Audio**.

---

## 🚀 Lịch Sử Cập Nhật & Các Cơ Chế Mới (Changelog)

### 🌟 Phiên bản `v0.6.6` (Mới nhất) — *Học Từ Vựng Đa Chiều Đặc Sắc: Phân Biệt Đa Từ Loại (Multi-POS), So Sánh Ngữ Nghĩa/Cách Dùng & Bộ Lọc Noun/Verb/Adj*
- **Cơ chế Phân Tách & So Sánh Đa Từ Loại (`Multi-POS Breakdown & Contrast`)**:
  - Đối với các từ thuộc **NHIỀU từ loại khác nhau** (ví dụ vừa là Verb vừa là Noun hay Adj như *record*, *present*, *lead*, *run*, *close*...), AI tự động chỉ rõ **sự khác nhau về ngữ nghĩa, phát âm/trọng âm và cách dùng** giữa từng từ loại đó trên cả thẻ tra từ nổi trên video và Sổ từ vựng.
- **Bộ Lọc Phân Loại Từ Vựng Trực Quan (`POS Category Filter Chips`)**:
  - Bổ sung thanh công cụ phân loại từ vựng trong tab **`📚 Học Từ`**: `Tất cả` • `🟢 Verb` • `🔵 Noun` • `🟣 Adj` • `🟡 Cụm / Idiom` • `⚪ Khác` kèm số lượng thống kê tự động cho từng nhóm, giúp người học chia nhóm và ôn luyện có hệ thống.
- **Huy hiệu từ loại song ngữ trực quan (`Bilingual POS Badges`)**:
  - Tự động nhận diện và gán màu sắc trực quan cho từng từ loại: **Danh từ (Noun)** xanh lam, **Động từ (Verb)** xanh ngọc, **Tính từ (Adjective)** tím, **Trạng từ (Adverb)** đỏ hồng, **Cụm động từ (Phrasal Verb)** / **Thành ngữ (Idiom)** / **Tiếng lóng (Slang)** vàng hổ phách.
- **Ví dụ thực tế khác ngoài đời (`Real-World Usage Examples`) kèm phát âm giọng bản xứ**:
  - Cung cấp 1–2 câu ví dụ thực tế sinh động khác ngoài đời kèm bản dịch tiếng Việt sát nghĩa; mỗi câu ví dụ đều có nút loa riêng `🔊` để nghe chuẩn giọng bản xứ.
- **Fact thú vị & Mẹo nhớ siêu tốc (`Fun Facts & Memory Hacks`)**:
  - Hộp thông tin vàng sáng làm nổi bật các sự thật ngôn ngữ/văn hóa thú vị, nguồn gốc từ nguyên (etymology) độc lạ, sự khác biệt văn hóa hay cách nhớ siêu nhanh giúp người học ghi nhớ sâu.
- **Cụm từ hay đi kèm & Từ đồng nghĩa (`Collocations & Synonyms`)**:
  - Liệt kê các từ đồng nghĩa và cụm kết hợp từ tự nhiên người bản xứ hay dùng.
- **Nâng cấp Sổ Từ Vựng (`📚 Học Từ`) & Xuất file `.txt`**:
  - Toàn bộ từ loại, biến thể đa từ loại, ví dụ thực tế, fact thú vị và collocations được lưu trữ đồng bộ trong Sổ từ vựng, có nút bấm nghe từng câu ví dụ và xuất ra file `.txt` chuẩn chỉnh như một giáo trình học từ vựng cá nhân.

### ⏱️ Phiên bản `v0.6.5` — *Cân Chỉnh Lệch Sub/Nhạc, Nốt Nhạc Biểu Cảm & Đọc Giọng Bản Xứ*
- **Cơ chế mới — Tự Động Bù Lệch Intro & Bộ Chỉnh Sub Sync Tức Thì (`Sub Sync Calibration`)**:
  - Khắc phục triệt để tình trạng phụ đề/lyrics chạy trước tiếng hát: Tự động so khớp mốc thời gian phát âm thực từ phụ đề YouTube ASR với LRCLIB; tự động tính khoảng chênh lệch thời lượng (`durationDelta`) của các Official MV và đọc thẻ chuẩn `[offset: +/-ms]` trong file LRC.
  - Tích hợp bộ nút chỉnh độ lệch thời gian phụ đề tức thì (`⏱️ Lệch sub: ⏪ -1s / 0s / +1s ⏩ / ↺`) ngay trên thanh công cụ học tập.
- **Cơ chế mới — Nốt Nhạc (`♪ ... ♪`) & Dấu Câu Biểu Cảm Phong Phú**:
  - Trang trí nốt nhạc `♪ ... ♪` cho các câu hát/lyrics; bổ sung quy tắc AI biên dịch dấu câu biểu cảm (`?`, `!`, `...`, `“...”`) cho các câu hỏi, câu cảm thán hay trích dẫn.
- **Cơ chế mới — Đọc Ngoại Ngữ Chuẩn Giọng Bản Xứ (`Native Speech Synthesis`)**:
  - Tích hợp bộ nhận diện ngôn ngữ thông minh `detectLanguageForSpeech` và bộ chọn giọng đọc bản xứ `getBestVoiceForLang` cho cả khung phụ đề lẫn tab Sổ Từ Vựng (`options.js`), đảm bảo tiếng Anh, Pháp, Nhật, Hàn, Trung... được phát âm chuẩn giọng bản xứ thay vì giọng tiếng Việt.

### 🎓 Phiên bản `v0.6.4` — *Cơ Chế Học Ngoại Ngữ Qua Phụ Đề: Tra Từ Điển, Phân Tích Ngữ Cảnh Thực Tế & Sổ Từ Vựng*
- Thêm cơ chế `EXPLAIN_SCENE` (Nút `🎓 Xem thêm: Ngữ cảnh & Cách dùng thực tế`), từ điển chạm từ theo ngữ cảnh `LOOKUP_WORD`, ghim thẻ học tập `state.isDictPinned` và tab `📚 Học Từ` quản lý từ vựng lưu trữ kèm xuất file `.txt`.

### 🌟 Phiên bản `v0.6.3` — *Thống Nhất Nhân Xưng & Tinh Chỉnh Giao Diện Tương Tác*
- Thêm bộ khóa đại từ xuyên suốt video (`Consistent Pronoun Lock Engine`) và làm mới giao diện với hiệu ứng tương tác mượt mà (`Micro-Interactions UI`).

### 🔧 Phiên bản `v0.6.2` — *Tương Thích Gemini 2.5 / 2.0 Mới Nhất & Sửa Lỗi Model Cũ*
- Loại bỏ các model cũ đã ngừng hỗ trợ, nâng cấp lên `gemini-2.5-flash-lite`, `gemini-2.5-flash`, `gemini-2.0-flash-lite`, và cơ chế phục hồi tự động `minimalMode`.

---

## 📖 Hướng Dẫn Cài Đặt & Sử Dụng Đầy Đủ Từ A–Z (Tiếng Việt)

### Bước A: Tải Mã Nguồn / Cập Nhật Vào VS Code
- **Cập nhật trong VS Code**: Mở Terminal (`` Ctrl + ` ``) và chạy:
  ```bash
  git pull origin main
  ```

### Bước B: Cài Đặt Lên Trình Duyệt (Chrome / Edge / Brave / Cốc Cốc)
1. Mở trình duyệt và truy cập `chrome://extensions/` (hoặc `edge://extensions/`).
2. Bật công tắc **Developer mode** ở góc trên bên phải.
3. Nhấn **Load unpacked** và chọn thư mục `VIE-Translate-by-me-` (hoặc bấm nút **Reload 🔄** ở thẻ **VIE-Translate**).
4. **Ghim 📌** chú cóc **Translate Toad** lên thanh công cụ.

### Bước C: Tự Động Lấy & Kích Hoạt API Key Miễn Phí
1. Bấm vào biểu tượng chú cóc **VIE-Translate** → ở tab **🔑 Kết Nối**, nhấn nút màu vàng **"🚀 Tự động lấy Key từ Google AI Studio"**.
2. Tiện ích sẽ tự động nhận diện Key và kích hoạt model miễn phí tốt nhất!

### Bước D: Tận Hưởng Phim & Nhạc, Cân Chỉnh Sub & Học Ngoại Ngữ
1. **Khi xem video/nghe nhạc**: Phụ đề tự động hiện song ngữ với nốt nhạc `♪ ... ♪` và dấu câu biểu cảm.
2. **Nếu sub chạy trước hoặc sau tiếng hát**: Rê chuột vào phụ đề và bấm `+1s ⏩` (để sub trễ lại) hoặc `⏪ -1s` (để sub chạy sớm hơn) trên cụm `⏱️ Lệch sub`.
3. **Khi muốn học từ vựng**: Bấm vào bất kỳ từ nào để nghe phát âm chuẩn giọng bản xứ (`🔊`) hoặc bấm **`🎓 Xem thêm`** để xem phân tích sắc thái ngữ cảnh trong cảnh phim!

---

# 🇬🇧 ENGLISH (Complete A-to-Z Guide)

**VIE-Translate (Translate Toad AI `v0.6.6`)** is a real-time browser extension that translates video subtitles into **Vietnamese or any custom bilingual pair**, acts as a **Multi-Dimensional Vocabulary & Scene Nuance Coach**, and provides **Instant Subtitle/Lyrics Timing Calibration & Native Voice Speech Synthesis** using **Google Gemini AI (Free Tier)**, **Groq Cloud (Free Tier)**, and **Google Translate**.

## ✨ Key Features (`v0.6.6`)

1. **📚 Multi-Dimensional Vocabulary Engine (POS, Real-World Examples, Fun Facts & Collocations)**:
   - **Bilingual Part-of-Speech Badges (POS)**: Clearly displays visual color-coded badges for Nouns (Blue), Verbs (Emerald), Adjectives (Purple), Adverbs (Rose), Phrasal Verbs (Orange), Idioms (Amber), and Slang.
   - **Real-World Examples with Audio Playback**: 1–2 real-life example sentences with precise Vietnamese translations and individual `🔊` speech pronunciation buttons.
   - **Fun Facts & Memory Hacks**: Highlights fascinating etymology origins, cultural context, native speaker usage tips, or mnemonic memory tricks.
   - **Collocations & Synonyms**: Suggests frequent word pairings and synonyms.
   - **Synchronized Vocabulary Notebook & `.txt` Export**: Review saved cards in the `📚 Học Từ` tab with full audio playback and export clean study sheets with 1 click.
2. **⏱️ Lyrics & Subtitle Timing Calibration (`Live Sub Sync Controls`)**:
   - **Auto Intro Offset Compensation**: Automatically matches YouTube ASR speech timestamps against LRCLIB cues, offsets official music video intro dialogue gaps (`durationDelta`), and reads standard `[offset: +/-ms]` tags in LRC headers.
   - **1-Click Live Sub Sync Bar (`⏱️ Lệch sub: ⏪ -1s / 0s / +1s ⏩ / ↺`)**: Fine-tune or delay subtitles instantly by ±1s (or multiple seconds) to lock timing with the singer or actor.
3. **🎵 Expressive Musical Notes (`♪ ... ♪`) & Punctuation**:
   - Automatically wraps song lyrics with musical notes `♪ ... ♪` on both original and translated lines.
   - Intelligent AI prompting adds expressive punctuation (`?`, `!`, `...`, `“...”`) to questions, exclamations, and direct speech.
4. **🔊 Native Voice Foreign Language Speech Synthesis**:
   - Smart language detection (`detectLanguageForSpeech`) and native voice selector (`getBestVoiceForLang`) speak English, French, Japanese, Korean, Chinese, German, Spanish, Russian, etc. with authentic native accents instead of a Vietnamese voice.
5. **🎓 Interactive Language Learning & Scene Nuance Coach**:
   - Hover-to-pause with deep scene nuance explanation (`EXPLAIN_SCENE` / `🎓 Xem thêm`), click-to-define dictionary card, card pinning (`state.isDictPinned`), and Vocabulary Notebook (`📚 Học Từ`) with `.txt` export.
6. **⚡ Real-Time & Auto-Captions Zero-Starvation Engine**:
   - 0ms Fast Preview + 95ms AI Clause Refinement pipeline with Lookahead Batch Prefetching.
7. **🔒 Consistent Pronoun Lock Engine**:
   - Locks dominant Vietnamese addressing styles (*Mình – Bạn*, *Tôi – Bạn*, *Anh/Chị – Em*) throughout the entire video.
8. **🎙️ Translate Videos on Websites WITHOUT CC / Subtitles**:
   - Captures direct video audio via Groq Whisper or Gemini Multimodal Audio.

---

## 📋 Version History & New Mechanisms (Changelog)

### 🌟 `v0.6.6` (Latest) — *Multi-Dimensional Vocabulary Engine (Multi-POS Breakdown, Real-World Examples, Fun Facts & POS Filter Chips)*
- **New Mechanism — Multi-POS Breakdown & Usage Contrast (`posVariants`)**:
  - For words belonging to **multiple parts of speech** (e.g., both Verb and Noun/Adjective such as *record*, *present*, *lead*, *run*, *close*...), AI explicitly contrasts the differences in meaning, pronunciation/stress, and usage between those parts of speech on both the on-video popup card and the Vocabulary Notebook.
- **New Mechanism — POS Category Filter Chips**:
  - Adds interactive category filters in the `📚 Học Từ` tab: `All` • `🟢 Verb` • `🔵 Noun` • `🟣 Adj` • `🟡 Phrasal / Idiom` • `⚪ Other` with real-time counters, allowing learners to organize and study words by grammatical category.
- **New Mechanism — Visual Bilingual Part-of-Speech Badges (`POS Badges`)**:
  - Distinguishes Noun, Verb, Adjective, Adverb, Phrasal Verb, Idiom, and Slang with dedicated styling.
- **New Mechanism — Real-World Example Sentences & Audio Playback**:
  - Generates 1–2 authentic everyday sentences with translations and per-sentence native pronunciation buttons.
- **New Mechanism — Fun Facts, Etymology & Memory Hacks (`Mnemonics`)**:
  - Features cultural nuances, etymology, and rapid-recall tricks.
- **New Mechanism — Synonyms & Collocations**:
  - Displays natural word pairings.
- **New Mechanism — Comprehensive Vocabulary Notebook (`📚 Học Từ`) & Rich `.txt` Export**:
  - Displays and exports all POS, multi-POS comparisons, examples, and fun facts in a clean format.

### ⏱️ `v0.6.5` — *Live Sub Sync Calibration, Expressive Musical Notes & Native Voice Synthesis*
- **New Mechanism — Live Sub Sync Calibration & Auto Intro Offset**:
  - Automatically aligns LRCLIB lyrics with YouTube ASR timestamps, compensates for official music video intro dialogue (`durationDelta`), parses LRC `[offset:...]` tags, and provides on-screen `[ ⏪ -1s ] [ 0s ] [ +1s ⏩ ]` sub sync controls.
- **New Mechanism — Expressive Musical Notes & Diverse Punctuation**:
  - Wraps song lyrics with `♪ ... ♪` and enhances translations with appropriate punctuation marks (`?`, `!`, `...`, `“...”`).
- **New Mechanism — Native Voice Foreign Speech Synthesis**:
  - Selects matching native browser voices (`en-US`, `fr-FR`, `ja-JP`, `ko-KR`...) so foreign words are pronounced correctly.

### 🎓 `v0.6.4` — *Interactive Language Learning, Scene Nuance Coach & Vocabulary Notebook*
- Added `EXPLAIN_SCENE` breakdown, click dictionary `LOOKUP_WORD`, and the Vocabulary Notebook tab (`📚 Học Từ`).

### 🌟 `v0.6.3` — *Consistent Pronoun Lock Engine & Tactile UI Redesign*
- Added dominant pronoun locking (`updateContextPronounLock`) and spring micro-interactions.

---

## 📖 Complete Step-by-Step Guide from A to Z (English)

### Step A: Clone or Update in VS Code
```bash
git pull origin main
```

### Step B: Load or Reload in Your Browser
1. Open `chrome://extensions/`, enable **Developer mode**, and click **Reload 🔄** on the **VIE-Translate** card.
2. Pin 📌 the **Translate Toad** icon to your toolbar.

### Step C: Calibrate Timing & Learn Languages While Watching
- **If sub runs ahead of music**: Hover over the subtitle box and click `+1s ⏩` on `⏱️ Lệch sub` to delay it and match the music.
- **To listen to pronunciation**: Click any foreign word or the `🔊 Nghe câu` button to hear it spoken with an authentic native accent!

---

## 📄 License
[MIT License](LICENSE)