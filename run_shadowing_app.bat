@echo off
chcp 65001 > nul
echo ========================================================
echo     🇩🇪 DEUTSCH SHADOWING MASTER (FLASK API + STT AI)
echo ========================================================
echo.

cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] Không tìm thấy môi trường ảo .venv!
    pause
    exit /b 1
)

echo Đang khởi động Server Flask API & Mô hình Whisper STT...
echo Trình duyệt sẽ mở tại http://127.0.0.1:5000
echo.

start "" http://127.0.0.1:5000
.venv\Scripts\python.exe server.py
pause
