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
  <a href="#-lịch-sử-cập-nhật--các-cơ-chế-mới-changelog">🚀 Lịch Sử Cập Nhật (`v0.6.8`)</a> •
  <a href="#-english-complete-a-to-z-guide">🇬🇧 English Version (A–Z)</a> •
  <a href="#-version-history--new-mechanisms-changelog">📋 English Changelog</a>
</p>

---

> ⚡ **LƯU Ý DÀNH CHO CỘNG TÁC VIÊN / COLLABORATORS (TỐI ƯU HÓA AI INDEXING)**:
> Codebase của dự án đã được đại tu và module hóa toàn diện (`v0.6.8`), loại bỏ hoàn toàn các God file cồng kềnh nhằm giúp các công cụ lập trình AI (Antigravity IDE, Cursor, GitHub Copilot...) đọc hiểu cực nhanh và tiết kiệm tối đa token.
> **Mẹo quan trọng:** Trước khi yêu cầu AI sửa lỗi hoặc phát triển tính năng mới, bạn **chỉ cần gõ kèm `@AI_CONTEXT.md` ở đầu câu lệnh**. AI sẽ lập tức nắm toàn bộ bản đồ kiến trúc mà **không cần quét lại toàn bộ codebase**, giúp tốc độ phản hồi tăng vọt!

# 🇻🇳 TIẾNG VIỆT (Bản Hướng Dẫn Đầy Đủ Từ A–Z)

**VIE-Translate (Translate Toad AI `v0.6.8`)** là tiện ích mở rộng trình duyệt (Chrome, Microsoft Edge, Brave, Cốc Cốc, Opera...) giúp dịch trực tiếp phụ đề video theo thời gian thực (**Real-Time**) sang **Tiếng Việt hoặc bất kỳ cặp song ngữ nào (Việt–Pháp, Việt–Anh, Việt–Nhật, Việt–Hàn, Việt–Trung...)**, kết hợp **Trợ Lý Học Ngoại Ngữ Chuyên Sâu (`Từ Loại POS • Ví Dụ Thực Tế • Fact Thú Vị & Mẹo Nhớ • Cụm Đi Kèm • Sổ Từ Vựng`)**, **Cân Chỉnh Độ Lệch Sub/Nhạc Tức Thì (`Sub Sync Calibration`)** và **Đọc Phát Âm Chuẩn Giọng Bản Xứ** bằng **Google Gemini AI (Free Tier)**, **Groq Cloud (Free Tier)** và **Google Translate** — kể cả trên **các video không có nút CC/Subtitles (hỗ trợ Facebook, TikTok, Twitter/X & web HTML5 bất kỳ)**.

## ✨ Tính Năng Nổi Bật (`v0.6.8`)

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

### 🌟 Phiên bản `v0.6.8` (Mới nhất) — *Khắc Phục Lỗi Nút Dịch Tự Tắt & Mở Rộng Facebook, TikTok, Twitter/X, HTML5 Toàn Diện*
- **🛠️ Khắc phục triệt để lỗi nút "AI Nghe & Dịch" tự bật rồi tắt ngay lập tức (`Fix Toad Button Auto-Revert Glitch`)**:
  - **Tách biệt ý muốn thu âm với việc tải lyrics**: Trước đây, khi bấm nút "AI Nghe & Dịch", nếu video đã có lời bài hát (hoặc tải thành công từ LRCLIB), hàm thu âm tự động gọi `userWantsAudioCapture = false` và chuyển nút về `idle` sau 100ms khiến người dùng thấy nút tự động nảy ngược trở lại. Nay hệ thống tách biệt hoàn toàn: việc tìm kiếm lyrics chạy nền không bao giờ huỷ trạng thái lắng nghe của người dùng; nút luôn duy trì ở trạng thái `🎙️ Đang nghe & dịch...` ổn định cho đến khi người dùng bấm tắt.
  - **Chống nhấp đúp (Click Debouncing)**: Thêm cơ chế chặn nhấp chuột dồn dập (400ms debounce), tránh hiện tượng nhấp đúp làm nút bật và tắt ngay trong nháy mắt.
  - **Hệ thống thu âm 3 tầng dự phòng (`3-Tier Audio Extraction`)**:
    - *Tầng 1*: Native `captureStream()` / `mozCaptureStream()`.
    - *Tầng 2 (Đột phá)*: Web Audio API `AudioContext.createMediaElementSource(video)` kết hợp `createMediaStreamDestination()` — vượt qua rào cản CORS và thẻ video không cấp stream trực tiếp, vừa trích xuất âm thanh cho AI vừa giữ nguyên đường ra loa (`ctx.destination`) cho người dùng nghe bình thường.
    - *Tầng 3*: `video.srcObject` cho các luồng WebRTC / LiveStream trực tiếp.
  - **Giữ vòng lặp thu âm khi video tạm dừng**: Nếu video tạm dừng, bộ đệm ghi âm tự động đợi tiếp mà không tắt nút hay thoát chế độ thu âm.
- **🌐 Mở rộng dịch thuật sang Facebook Video & các trang không dùng `.html5-video-player` (`Universal Non-HTML5 & Facebook Video Engine`)**:
  - **Hỗ trợ toàn diện Facebook Video**: Tương thích hoàn hảo với Facebook Watch, Facebook Reels, Facebook Feed và khung Theatre/Dialog (`div[data-video-id]`, `div[data-pagelet*='Video']`, `div[role='dialog']`, `div.x1y1aw1k`).
  - **Hỗ trợ TikTok & Twitter / X**: Tương thích các vùng chứa video đặc thù (`div[data-e2e='feed-video']`, `div[data-testid='videoPlayer']`).
  - **Thuật toán định vị khung hình thông minh `findBestVideoContainer(video)`**: Tự động leo ngược DOM phân tích kích thước để gắn khung phụ đề `.vie-overlay` và nút `.vie-toad-audio-btn` chuẩn xác, không bị lệch ra ngoài hay bị che khuất.
  - **Bắt video tức thì qua Capture Phase**: Lắng nghe sự kiện `play` và `playing` ở cấp độ `window` với cờ `capture: true`, bắt trọn mọi video vừa bắt đầu phát trên Facebook Feed / Reels mà không cần đợi DOM Mutation Observer.
  - **Nâng cấp nút Toad Audio luôn nổi bật & dễ bấm**: Đặt độ mờ mặc định `opacity: 0.78` (thay vì ẩn hoàn toàn `opacity: 0`), kết hợp kính mờ `backdrop-filter: blur(8px)` và viền vàng sang trọng, giúp người dùng dễ dàng nhìn thấy và bấm nghe dịch ngay cả trên các trang không có hiệu ứng hover player.

### 🌟 Phiên bản `v0.6.7` — *Dịch Thuật Chuyên Nghiệp Liên Kết Câu Trước-Sau & Khắc Phục Lỗi Giao Diện*
- **🧠 Cơ chế mới — Dịch Thuật Chuyên Nghiệp Liên Kết Mạch Lạc Câu Trước - Câu Sau (`Cohesive Discourse Translation Engine`)**:
  - **Truyền ngữ cảnh hai chiều (Bidirectional Context)**: Hệ thống truyền song song cả các câu thoại liền trước (`history` mở rộng 6 lượt) và câu thoại sắp xuất hiện tiếp theo (`nextText`), giúp AI hiểu trọn vẹn ngữ cảnh và chủ đề đang nói.
  - **Chấm dứt lối dịch ngang 1:1 máy móc ("tiếng Tây sang tiếng Ta")**: Áp dụng bộ chỉ thị dịch thuật cao cấp, diễn đạt thuần Việt uyển chuyển, giàu nhạc điệu và cảm xúc như dịch giả phụ đề chuyên nghiệp của Netflix/HBO.
  - **Xử lý mượt mà liên từ & câu rút gọn**: Tự động chắp nối các vế câu dang dở bằng liên từ tự nhiên (*"Nhưng rồi", "Thế là", "Hóa ra", "Dẫu vậy..."*) và giải mã chính xác các đại từ quy chiếu (*it, that, they...*).
- **🛠️ Khắc phục lỗi nút "Đang nghe & dịch..." bị đứng im & Không hiện phụ đề (`Fix Frozen Audio Button & Subtitle Display`)**:
  - Khắc phục lỗi nút Toad AI bị kẹt vĩnh viễn ở trạng thái `🎙️ Đang nghe & dịch...` khi đã tải xong lyrics hoặc khi bị chặn bởi chính sách CORS của video.
  - Xóa bỏ cơ chế bù lệch thời lượng giả định (`durDelta` ở đuôi video) từng khiến phụ đề các bài hát như *Less Than Zero* bị lệch 30s và biến mất khỏi màn hình.
  - **Cơ chế Pre-Translation 0ms**: Tự động tiền dịch trước 8 câu đầu tiên của bài hát ngay khi tìm thấy lyrics, giúp phụ đề xuất hiện tức thì, không bị trễ hay đứng chờ dịch.
  - Thêm thông báo hướng dẫn khi chưa có API Key cho tính năng thu âm thanh từ loa.
- **🎯 Tự Động Đối Chiếu Bản Âm Thanh & Phụ Đề Căn Chỉnh Độ Lệch (`Automatic Audio-to-Text Subtitle Sync Engine`)**:
  - **So khớp chéo đa nguồn (Cross-Track Correlation)**: Tự động so sánh độ trùng khớp token từ vựng giữa lời bài hát (LRCLIB) và phụ đề gốc YouTube (ASR/Manual caption tracks), tính toán trung vị độ lệch (median delta) và tự động căn chuẩn nhịp phụ đề tức thì.
  - **Tự động khóa nhịp theo giọng hát thực tế (Live Speech Auto-Lock)**: Khi AI lắng nghe âm thanh từ video, các cụm từ nhận diện được sẽ tự động đối chiếu với mốc thời gian lời bài hát/phụ đề để tự khóa độ lệch (`+X.Xs Tự khớp ✨`) mà người dùng không cần bấm tay thủ công.
  - **Nút 1-chạm `🎯 Căn tự động`**: Tích hợp trên thanh công cụ `vie-sync-group` dưới phụ đề, cho phép kích hoạt đo và căn khớp nhịp tức thì.
- **🛡️ Khắc phục triệt để lỗi 2 thanh phụ đề song song & loại bỏ chữ "ORIG" kỹ thuật**:
  - Nâng cấp `video._vieOverlay` và nút Toad `state.toadBtnEl` thành mô hình Strict Singleton; tự động di chuyển đúng container và quét sạch thẻ thừa trên DOM.
  - Thêm bộ lọc `sanitizeAudioText` và fallback Google Translate Free tự động, loại bỏ hoàn toàn chữ `ORIG` hay các nhãn kỹ thuật thô.
- **🏗️ Đại tu kiến trúc module hóa toàn diện & Tối ưu hóa AI Indexing**:
  - Module hóa mã nguồn thành các thư mục độc lập `api/`, `content/`, `background/`, `popup/`, `utils/` kèm `@AI_CONTEXT.md` giúp AI index tức thì trong 0.1s.

### 🌟 Phiên bản `v0.6.6` — *Học Từ Vựng Đa Chiều Đặc Sắc: Từ Loại (POS), Ví Dụ Đời Thường, Fact Thú Vị & Collocations*
- **Huy hiệu từ loại song ngữ trực quan (`Bilingual POS Badges`)**:
  - Tự động nhận diện và gán màu sắc trực quan cho từng từ loại: **Danh từ (Noun)** xanh lam, **Động từ (Verb)** xanh ngọc, **Tính từ (Adjective)** tím, **Trạng từ (Adverb)** đỏ hồng, **Cụm động từ (Phrasal Verb)** / **Thành ngữ (Idiom)** / **Tiếng lóng (Slang)** vàng hổ phách.
- **Ví dụ thực tế khác ngoài đời (`Real-World Usage Examples`) kèm phát âm giọng bản xứ**:
  - Cung cấp 1–2 câu ví dụ thực tế sinh động khác ngoài đời kèm bản dịch tiếng Việt sát nghĩa; mỗi câu ví dụ đều có nút loa riêng `🔊` để nghe chuẩn giọng bản xứ.
- **Fact thú vị & Mẹo nhớ siêu tốc (`Fun Facts & Memory Hacks`)**:
  - Hộp thông tin vàng sáng làm nổi bật các sự thật ngôn ngữ/văn hóa thú vị, nguồn gốc từ nguyên (etymology) độc lạ, sự khác biệt văn hóa hay cách nhớ siêu nhanh giúp người học ghi nhớ sâu.
- **Cụm từ hay đi kèm & Từ đồng nghĩa (`Collocations & Synonyms`)**:
  - Liệt kê các từ đồng nghĩa và cụm kết hợp từ tự nhiên người bản xứ hay dùng.
- **Nâng cấp Sổ Từ Vựng (`📚 Học Từ`) & Xuất file `.txt`**:
  - Toàn bộ từ loại, ví dụ thực tế, fact thú vị và collocations được lưu trữ đồng bộ trong Sổ từ vựng, có nút bấm nghe từng câu ví dụ và xuất ra file `.txt` chuẩn chỉnh như một giáo trình học từ vựng cá nhân.

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

**VIE-Translate (Translate Toad AI `v0.6.8`)** is a real-time browser extension that translates video subtitles into **Vietnamese or any custom bilingual pair**, acts as a **Multi-Dimensional Vocabulary & Scene Nuance Coach**, and provides **Instant Subtitle/Lyrics Timing Calibration, Native Voice Speech Synthesis & Live AI Audio Captioning** using **Google Gemini AI (Free Tier)**, **Groq Cloud (Free Tier)**, and **Google Translate** — across YouTube, Facebook, TikTok, Twitter/X and any HTML5 video player.

## ✨ Key Features (`v0.6.8`)

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
8. **🎙️ Translate Videos on Websites WITHOUT CC / Subtitles (Facebook, TikTok, Twitter/X & Custom HTML5 Players)**:
   - Captures direct video audio via 3-Tier Audio Extraction (Native `captureStream`, Web Audio API `createMediaElementSource`, and `srcObject`) with live transcription via Groq Whisper or Gemini Multimodal Audio.

---

## 📋 Version History & New Mechanisms (Changelog)

### 🌟 `v0.6.8` (Latest) — *Fix Button Auto-Revert Glitch & Universal Facebook, TikTok, Twitter/X HTML5 Support*
- **🛠️ Fix Instant Revert of "AI Nghe & Dịch" Button (`Fix Toad Button Auto-Revert Glitch`)**:
  - **Decoupled User Intent from Lyrics Presence**: Previously, clicking "AI Nghe & Dịch" checked for song lyrics; if lyrics were already cached or found on LRCLIB, the function explicitly called `userWantsAudioCapture = false` and reverted the button back to `idle` within 100ms. In `v0.6.8`, lyrics detection runs quietly in the background without canceling the user's audio capture. The button stays active in `🎙️ Đang nghe & dịch...` until the user deliberately toggles it off.
  - **Click Debouncing**: Added a 400ms debounce guard to prevent rapid double-clicks from toggling audio capture on and off instantly.
  - **3-Tier Audio Stream Extraction**:
    - *Tier 1*: Native `video.captureStream()` or `mozCaptureStream()`.
    - *Tier 2 (Breakthrough)*: Web Audio API `createMediaElementSource(video)` routed to `createMediaStreamDestination()` — eliminates CORS / cross-origin media blocks while routing audio simultaneously to `ctx.destination` so users continue hearing video audio seamlessly through speakers.
    - *Tier 3*: `video.srcObject` for live WebRTC / MediaStream video feeds.
  - **Continuous Loop on Pause**: If the video is paused or buffering, the audio loop gracefully pauses and polls without resetting the button state or user intent.
- **🌐 Universal Video Container Detection & Facebook Video Support**:
  - **Dedicated Facebook Video Support**: Full compatibility with Facebook Watch, Facebook Reels, Newsfeed auto-play videos, and Theatre/Dialog modals (`div[data-video-id]`, `div[data-pagelet*='Video']`, `div[role='dialog']`, `div.x1y1aw1k`).
  - **TikTok & Twitter/X Support**: Custom player support for TikTok (`div[data-e2e='feed-video']`, `div[class*='DivVideoContainer']`) and Twitter/X (`div[data-testid='videoPlayer']`).
  - **Smart Wrapper Traversal `findBestVideoContainer(video)`**: Dynamically inspects parent bounding boxes to ensure subtitles and the Toad button attach tightly to the true video bounding box across all custom player architectures.
  - **Capture Phase Video Hooking**: Listens to `play` and `playing` events on `window` in the capture phase, instantly latching onto any newly started video in infinite scroll feeds without waiting for DOM mutation ticks.
  - **Always Visible & Sleek Toad Button**: Updated `.vie-toad-audio-btn` to default translucent visibility (`opacity: 0.78`) with `backdrop-filter: blur(8px)` and golden borders, ensuring it is immediately discoverable and clickable on Facebook and custom HTML5 players without requiring a hover state.

### 🌟 `v0.6.7` — *Cohesive Discourse Translation, Instant Subtitles & Critical Audio Fixes*
- **🧠 New Mechanism — Cohesive Discourse Translation Engine**:
  - **Bidirectional Context Linking**: Feeds both preceding conversation history (up to 6 turns) and the upcoming next line (`nextText`) into the model so the AI grasps the full conversational narrative.
  - **Zero Word-for-Word Literalism**: Enforces professional cinematic/Netflix-grade Vietnamese subtitle translation, eliminating awkward mechanical 1:1 "tiếng Tây sang tiếng Ta" translations in favor of natural phrasing and poetic lyricism.
  - **Seamless Discourse Transitions**: Automatically connects sentence fragments with idiomatic Vietnamese conjunctions (*"Nhưng rồi", "Thế là", "Hóa ra", "Dẫu vậy..."*) and accurately resolves pronouns (*it, that, they...*).
- **🛠️ Fix Frozen Audio Button & Subtitle Stalling (`Fix Frozen Toad Button`)**:
  - Resolved bug where the Toad AI button became permanently frozen in `🎙️ Đang nghe & dịch...` after lyrics were loaded or when CORS restricted audio streams.
  - Eliminated flawed `durDelta` intro guessing that falsely delayed subtitles on songs with lengthy outro cards (such as *Less Than Zero*).
  - **0ms Pre-Translation**: Automatically pre-translates the first 8 lines of lyrics via batch queries upon load, ensuring subtitles display immediately without lag.
  - Added user guidance toasts when an API key is required for direct speaker audio transcription.
- **🎯 Automatic Audio-to-Text Subtitle Sync Engine**:
  - **Cross-Track Correlation**: Cross-references token overlap between external lyrics (LRCLIB) and YouTube native caption tracks (ASR/Manual) to automatically calibrate timing offsets.
  - **Live Speech Auto-Lock**: Cross-references live transcribed speech from audio capture with loaded subtitle cues, locking the timing offset (`+X.Xs Tự khớp ✨`) without manual clicks.
  - **1-Click `🎯 Căn tự động` Button**: Added to `.vie-sync-group` under the subtitle bar for instant audio-to-text timing alignment.
- **🛡️ Fix Duplicate Parallel Subtitle Bars & Dual Toad Buttons**:
  - Re-architected `video._vieOverlay` and Toad button `state.toadBtnEl` into strict singletons; automatically re-attaches to player container upon fullscreen / theater mode changes.
  - Actively purges orphan `.vie-overlay` and `.vie-toad-audio-btn` DOM elements upon video navigation or dictionary closing.
  - Fixed `closeDictAndCoach` call crashes and added global `pointerdown` listener to close pinned dictionaries safely when clicking outside the player.
- **✨ Scrub Technical "ORIG" / "GỐC" Labels**:
  - Implemented multi-layered `sanitizeAudioText` filters across `api/gemini.js`, `background/background.js`, `content/dom.js`, and `content/content.js`.
  - Automatically falls back to Google Translate Free if the model only returns raw original speech.
- **🏗️ Modular Architecture Overhaul & AI Indexing Optimization**:
  - Modularized codebase into `api/`, `content/`, `background/`, `popup/`, and `utils/`.
  - Added `@AI_CONTEXT.md` root memory map and ignore files (`.aiignore`, `.cursorignore`) for instant AI model onboarding and zero token waste.

### 🌟 `v0.6.6` — *Multi-Dimensional Vocabulary Engine (POS Badges, Real-World Examples, Fun Facts & Collocations)*
- **New Mechanism — Visual Bilingual Part-of-Speech Badges (`POS Badges`)**:
  - Distinguishes Noun, Verb, Adjective, Adverb, Phrasal Verb, Idiom, and Slang with dedicated styling.
- **New Mechanism — Real-World Example Sentences & Audio Playback**:
  - Generates 1–2 authentic everyday sentences with translations and per-sentence native pronunciation buttons.
- **New Mechanism — Fun Facts, Etymology & Memory Hacks (`Mnemonics`)**:
  - Features cultural nuances, etymology, and rapid-recall tricks.
- **New Mechanism — Synonyms & Collocations**:
  - Displays natural word pairings.
- **New Mechanism — Comprehensive Vocabulary Notebook (`📚 Học Từ`) & Rich `.txt` Export**:
  - Displays and exports all POS, examples, and fun facts in a clean format.

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