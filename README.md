# 🇩🇪 Deutsch Shadowing Master (Flask API + Whisper STT + AI Scoring)

Hệ thống ứng dụng Web hoàn chỉnh luyện **Shadowing tiếng Đức** theo chuẩn người bản ngữ:
- **TTS (Text-to-Speech)**: Mô hình phát âm tiếng Đức tự nhiên chuẩn phòng thu (Katja, Conrad...) với khả năng tùy chỉnh tốc độ `-30%` đến `+30%`.
- **STT (Speech-to-Text)**: Mô hình nhận diện giọng nói tiếng Đức **Whisper STT** chạy cục bộ tốc độ cao.
- **AI Scoring**: Cơ chế chấm điểm và so khớp chi tiết từng từ (Word-by-word alignment), chỉ rõ từ nào phát âm chuẩn, từ nào bị đọc sai/bỏ sót.

---

## 🌟 Tính năng nổi bật

1. **Vòng lặp Shadowing 3 bước chuẩn quốc tế**:
   - **Bước 1: Nghe mẫu bản ngữ**: Nghe phát âm câu tiếng Đức với ngữ điệu chuẩn (có thể giảm tốc độ xuống -15% khi mới tập).
   - **Bước 2: Thu âm trực tiếp trên Web**: Nhấn nút thu âm và đọc nhại lại theo ngữ điệu vừa nghe (có biểu đồ sóng âm thời gian thực).
   - **Bước 3: AI Chấm điểm & So sánh**: AI tự động phiên âm, tính điểm %, gắn màu từng từ và cho phép nghe lại giọng bạn song song với giọng bản ngữ.
2. **Hệ thống phân cấp bài học**:
   - Đầy đủ bài tập từ cấp độ **A1, A2, B1, B2** kèm dịch nghĩa tiếng Việt.
   - Chế độ **Tự nhập văn bản**: Nhập bất kỳ câu tiếng Đức nào bạn muốn luyện.
3. **100% Miễn phí & Không cần Token**:
   - Chạy trực tiếp, không phụ thuộc Hugging Face Token, không lo bị chặn quyền.

---

## ⚡ Cách chạy ứng dụng

### Cách 1: Chạy 1-Click bằng file Batch (Khuyên dùng)
Nhấp đúp chuột vào file:
```cmd
run_shadowing_app.bat
```

### Cách 2: Chạy bằng Terminal
```powershell
.venv\Scripts\activate
python server.py
```

Truy cập giao diện tại: **http://127.0.0.1:5000**

---

## 🔌 Tài liệu Flask RESTful API

| Endpoint | Method | Mô tả |
| :--- | :--- | :--- |
| `/` | `GET` | Giao diện Web Shadowing Studio |
| `/api/lessons` | `GET` | Lấy danh sách bài học và câu mẫu theo cấp độ A1 - B2 |
| `/api/voices` | `GET` | Danh sách giọng đọc tiếng Đức hỗ trợ |
| `/api/tts` | `POST` | Tạo file âm thanh đọc mẫu (`text`, `voice`, `rate`) |
| `/api/score` | `POST` | Nhận diện giọng nói STT và chấm điểm phát âm (`audio`, `target_text`) |
