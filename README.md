# VIE-Translate

Tiện ích mở rộng trình duyệt (Chrome/Edge Extension) dịch phụ đề video sang tiếng Việt tự nhiên, đúng ngữ cảnh và ngôi xưng hô bằng Google Gemini AI (Free Tier) và Google Translate.

## Tính năng nổi bật
- **Dịch phụ đề trực tiếp trên YouTube** và các trình phát video HTML5.
- **Tự động dò tìm & chọn Model Gemini miễn phí tốt nhất (`Auto Free Model`)**: Tự gọi API kiểm tra danh sách model hiện hành (`gemini-flash-latest`, `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`...) và tự động đổi sang model free khác nếu model hiện tại hết hạn mức (Quota 429) hoặc bị Google ngừng hỗ trợ.
- **Dịch theo ngữ cảnh (Context-aware)**: Giữ mạch hội thoại và ngôi xưng hô (*anh/em, tôi/bạn, mình/cậu, thầy/trò...*) dựa trên tiêu đề video và các câu thoại liền trước.
- **Phụ đề song ngữ (Dual-subtitle)**: Hiển thị song song phụ đề gốc và tiếng Việt.
- **Chế độ dự phòng không cần Key**: Tự động chuyển sang Google Translate miễn phí nếu người dùng chưa nhập API Key hoặc hết hạn mức.

## Hướng dẫn lấy Google Gemini API Key miễn phí (30 giây)
Một mã Gemini API Key không bị khóa vào 1 model cố định mà **dùng chung được cho tất cả các model miễn phí** trong tài khoản của bạn:
1. Truy cập [Google AI Studio (aistudio.google.com/apikey)](https://aistudio.google.com/apikey) và đăng nhập tài khoản Google.
2. Nhấn nút **"Create API key"** (Tạo khóa API).
3. Copy mã Key (định dạng mới bắt đầu bằng `AQ.Ab8...` hoặc định dạng cũ `AIza...`).
4. Bấm vào biểu tượng **VIE-Translate** trên thanh công cụ trình duyệt → dán mã Key → bấm **"Kiểm tra & Dò Model"** rồi **"Lưu cài đặt"**.

## Cách cài đặt vào trình duyệt (Developer Mode)
1. Tải hoặc `git clone` repo này về máy.
2. Mở Chrome/Edge, truy cập `chrome://extensions/`.
3. Bật **Developer mode (Chế độ dành cho nhà phát triển)** ở góc trên bên phải.
4. Nhấn **Load unpacked (Tải tiện ích đã giải nén)** và chọn thư mục chứa repo này.