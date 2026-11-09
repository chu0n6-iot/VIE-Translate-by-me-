# VIE-Translate

Tiện ích mở rộng trình duyệt (Chrome/Edge Extension) dịch phụ đề video sang tiếng Việt tự nhiên, đúng ngữ cảnh và ngôi xưng hô bằng Google Gemini AI / Groq (Free Tier) và Google Translate.

## Tính năng nổi bật
- **Dịch phụ đề trực tiếp trên YouTube** và các trình phát video HTML5.
- **Nhập API Key → tự xác thực → tự liệt kê model dùng được**: Dán key Groq (`gsk_...`) hoặc Gemini (`AQ.`/`AIza...`), tiện ích tự nhận diện nhà cung cấp, kiểm tra key, rồi hiện danh sách các model mà key đó thực sự dùng được để bạn chọn. Nếu model đang dùng lỗi/hết hạn mức, tự chuyển sang model khác.
- **Dịch theo ngữ cảnh (Context-aware)**: Giữ mạch hội thoại và ngôi xưng hô (*anh/em, tôi/bạn, mình/cậu, thầy/trò...*) dựa trên tiêu đề video và các câu thoại liền trước.
- **Phụ đề song ngữ (Dual-subtitle)**: Hiển thị song song phụ đề gốc và tiếng Việt.
- **Chế độ dự phòng không cần Key**: Tự động chuyển sang Google Translate miễn phí nếu người dùng chưa nhập API Key hoặc hết hạn mức.

## Hướng dẫn lấy API Key miễn phí (30 giây)
- **Gemini**: vào [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → **Create API key** (key dạng `AQ.Ab8...` hoặc `AIza...`). Một key dùng chung cho mọi model free.
- **Groq**: vào [console.groq.com/keys](https://console.groq.com/keys) → **Create API Key** (key dạng `gsk_...`).

Sau đó bấm biểu tượng **VIE-Translate** → dán key. Tiện ích sẽ tự xác thực và hiện danh sách model khả dụng; chọn model bạn muốn (mặc định là model đã được kiểm tra hoạt động).

## Cách cài đặt vào trình duyệt (Developer Mode)
1. Tải hoặc `git clone` repo này về máy.
2. Mở Chrome/Edge, truy cập `chrome://extensions/`.
3. Bật **Developer mode (Chế độ dành cho nhà phát triển)** ở góc trên bên phải.
4. Nhấn **Load unpacked (Tải tiện ích đã giải nén)** và chọn thư mục chứa repo này.