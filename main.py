import asyncio
import os
import sys
import time
from pathlib import Path
import edge_tts

# Đảm bảo mã hóa UTF-8 cho console Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

APP_DIR = Path(__file__).resolve().parent

# Danh sách giọng tiếng Đức chất lượng cao
GERMAN_VOICES = {
    "Katja (Nữ - Đức chuẩn Hochdeutsch)": "de-DE-KatjaNeural",
    "Conrad (Nam - Đức chuẩn Hochdeutsch)": "de-DE-ConradNeural",
    "Amala (Nữ - Truyền cảm)": "de-DE-AmalaNeural",
    "Florian (Nam - Tự nhiên)": "de-DE-FlorianMultilingualNeural",
    "Killian (Nam - Trầm ấm)": "de-DE-KillianNeural",
    "Ingrid (Nữ - Áo / Österreich)": "de-AT-IngridNeural",
    "Jan (Nam - Thụy Sĩ / Schweiz)": "de-CH-JanNeural",
}

async def generate_speech(
    text: str,
    voice: str = "de-DE-KatjaNeural",
    rate: str = "+0%",
    pitch: str = "+0Hz",
    output_path: str = "test.wav"
):
    communicate = edge_tts.Communicate(text=text, voice=voice, rate=rate, pitch=pitch)
    await communicate.save(output_path)

def main():
    print("=" * 65)
    print("   🎙️ GERMAN SHADOWING TTS STUDIO — MÔ HÌNH TIẾNG ĐỨC CHUẨN")
    print("=" * 65)
    print("✅ Không yêu cầu Hugging Face Token, không bị khóa quyền!")
    print("✅ Giọng đọc bản ngữ tiêu chuẩn Đức (Katja, Conrad, Amala...)")

    input_text = (
        "Ich heiße Josefine. Ich bin 25 und gerade nach London gezogen. "
        "Die U-Bahn ist ziemlich verwirrend, aber mit ihr komme ich in kürzester Zeit überall hin."
    )
    output_file = APP_DIR / "test.wav"
    voice = "de-DE-KatjaNeural"  # Giọng nữ bản ngữ chuẩn

    print(f"\n📝 Văn bản cần đọc:\n\"{input_text}\"")
    print(f"\n🗣️ Giọng đọc: {voice} (Katja - Đức chuẩn)")
    print("⚡ Đang tạo âm thanh...")

    start_time = time.time()
    asyncio.run(generate_speech(input_text, voice=voice, rate="+0%", output_path=str(output_file)))
    elapsed = time.time() - start_time

    print("\n" + "=" * 65)
    print("🎉 TẠO FILE THÀNH CÔNG!")
    print(f"📁 File xuất ra: {output_file}")
    print(f"⏱️ Thời gian tạo: {elapsed:.2f} giây")
    print(f"📊 Dung lượng: {output_file.stat().st_size:,} bytes")
    print("=" * 65)

if __name__ == "__main__":
    main()
