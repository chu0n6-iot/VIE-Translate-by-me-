# VIE-Translate - Translate Toad AI

<p align="center">
  <img src="assets/translate-toad.png" alt="Translate Toad" width="140">
</p>

Tiện ích mở rộng miễn phí, mã nguồn mở, giúp dịch phụ đề video và truyện tranh trực tiếp trên trình duyệt. Không quảng cáo.

## Tính năng

- Dịch phụ đề video theo thời gian thực trên YouTube và các trang web có `<video>`.
- Dịch video không có phụ đề bằng Gemini, Groq hoặc Whisper local.
- Dịch bằng Ollama hoàn toàn trên máy, hoặc Google Translate không cần API key.
- Ngôn ngữ: tiếng Việt, Anh, Pháp, Nhật, Hàn, Trung, Đức, Tây Ban Nha, Nga và Thái.
- Tự khớp ngữ cảnh, glossary, nhân xưng và nhiều người nói.
- OCR chữ trên màn hình.
- OCR vùng thoại truyện/truyện tranh theo trang.
- Kéo thả và sửa trực tiếp khung dịch trên ảnh.
- Xuất PNG, PDF và Excel.
- Quét lại vùng chữ sót; hỗ trợ TextDetector của trình duyệt làm OCR dự phòng.

Tính năng truyện tranh đang ở giai đoạn thử nghiệm. Nút công cụ tự xuất hiện trên trang có ảnh lớn. Nhấn **Quét trang** để nhận diện và dịch vùng thoại.

## Cài đặt

1. Cài Ollama hoặc dùng chế độ Google Translate nếu không muốn dùng API key.
2. Mở Chrome/Edge: `chrome://extensions`
3. Bật **Developer mode**.
4. Chọn **Load unpacked** và trỏ tới thư mục dự án.
5. Mở trang manga/comic, video hoặc MangaDex và dùng popup/toolbar của tiện ích.

Ollama:

```bash
ollama pull qwen2.5:7b
```

Ollama trên máy cần chạy với quyền truy cập extension:

```powershell
$env:OLLAMA_ORIGINS="chrome-extension://*"
ollama serve
```

Whisper local:

```bash
python tools/whisper_server.py --device cuda --port 8000 --model large-v3
python tools/whisper_server.py --device cpu --port 8001 --model small
```

## Cấu hình

- **Nhà cung cấp:** Gemini, Groq, Ollama hoặc Google Translate.
- **API key:** tùy chọn; key dự phòng được xoay tự động khi hết quota.
- **Dịch truyện:** OCR chính xác nhất dùng Gemini Vision; TextDetector có thể được dùng làm fallback.
- **Mạng:** extension hỗ trợ `<img>` và ảnh tải qua worker, tùy quyền truy cập của từng website.

## Kiểm tra

```bash
node test/run_tests.js
```

## Hạn chế hiện tại

- Dịch truyện chưa hỗ trợ xuất PSD.
- Kết quả OCR phụ thuộc chất lượng tranh, phông chữ SFX và chính sách chặn ảnh của từng website.
- PDF hiện mở cửa sổ in để người dùng lưu PDF.
- Chrome TextDetector không có trên mọi phiên bản hoặc nền tảng.

## Giấy phép

Phát hành theo [MIT License](LICENSE).
