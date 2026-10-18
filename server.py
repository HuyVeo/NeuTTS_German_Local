import asyncio
import difflib
import os
import re
import sys
import time
import uuid
from pathlib import Path
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import edge_tts
from faster_whisper import WhisperModel

# Thiết lập encoding UTF-8 cho console Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

APP_DIR = Path(__file__).resolve().parent
STATIC_DIR = APP_DIR / "static"
AUDIO_DIR = STATIC_DIR / "audio"
UPLOADS_DIR = STATIC_DIR / "uploads"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

app = Flask(__name__, static_folder=str(STATIC_DIR), template_folder=str(APP_DIR / "templates"))
CORS(app)

# Nạp mô hình Whisper STT (sử dụng bản base, định dạng int8 siêu nhanh trên CPU/GPU)
print("⏳ Đang khởi động mô hình Whisper STT...")
whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
print("✅ Mô hình Whisper STT đã sẵn sàng!")

# Danh sách giọng đọc tiếng Đức chuẩn
GERMAN_VOICES = [
    {"id": "de-DE-KatjaNeural", "name": "Katja (Đức chuẩn Hochdeutsch - Nữ)", "tag": "Chuẩn phòng thu ⭐"},
    {"id": "de-DE-ConradNeural", "name": "Conrad (Đức chuẩn Hochdeutsch - Nam)", "tag": "Trầm ấm ⭐"},
    {"id": "de-DE-AmalaNeural", "name": "Amala (Đức - Nữ)", "tag": "Truyền cảm"},
    {"id": "de-DE-FlorianMultilingualNeural", "name": "Florian (Đức - Nam)", "tag": "Tự nhiên"},
    {"id": "de-DE-KillianNeural", "name": "Killian (Đức - Nam)", "tag": "Rõ ràng"},
    {"id": "de-DE-SeraphinaMultilingualNeural", "name": "Seraphina (Đức - Nữ)", "tag": "Nhẹ nhàng"},
    {"id": "de-AT-IngridNeural", "name": "Ingrid (Tiếng Đức Áo - Nữ)", "tag": "Österreich"},
    {"id": "de-CH-JanNeural", "name": "Jan (Tiếng Đức Thụy Sĩ - Nam)", "tag": "Schweiz"},
]

# Thư viện bài luyện tập Shadowing theo cấp độ
LESSONS_DATA = [
    {
        "id": "a1-1",
        "level": "A1",
        "title": "Giới thiệu bản thân cơ bản",
        "desc": "Luyện ngữ điệu chào hỏi và giới thiệu tên tuổi",
        "sentences": [
            {
                "de": "Hallo! Ich heiße Huy und komme aus Vietnam.",
                "vi": "Xin chào! Tôi tên là Huy và tôi đến từ Việt Nam."
            },
            {
                "de": "Ich lerne seit drei Monaten Deutsch.",
                "vi": "Tôi đã học tiếng Đức được ba tháng."
            },
            {
                "de": "Mein Ziel ist es, später in Deutschland zu studieren.",
                "vi": "Mục tiêu của tôi là sau này sẽ du học tại Đức."
            },
            {
                "de": "Vielen Dank und auf Wiedersehen!",
                "vi": "Xin chân thành cảm ơn và hẹn gặp lại!"
            }
        ]
    },
    {
        "id": "a2-1",
        "level": "A2",
        "title": "Đi siêu thị & Mua sắm",
        "desc": "Luyện câu giao tiếp thực tế khi mua hàng và hỏi giá",
        "sentences": [
            {
                "de": "Guten Tag! Ich suche frisches Obst und Gemüse.",
                "vi": "Chào bạn! Tôi đang tìm hoa quả và rau tươi."
            },
            {
                "de": "Wo finde ich die Äpfel? Sie sind drüben in der zweiten Reihe.",
                "vi": "Tôi có thể tìm táo ở đâu? Chúng ở dãy thứ hai đằng kia."
            },
            {
                "de": "Haben Sie auch Vollkornbrot? Ja, direkt neben der Kasse.",
                "vi": "Bạn có bánh mì nguyên cám không? Có, ngay cạnh quầy thu ngân."
            },
            {
                "de": "Wie viel kostet das insgesamt? Das macht 12 Euro 50, bitte.",
                "vi": "Tổng cộng hết bao nhiêu tiền? Của bạn hết 12 Euro 50 xu."
            }
        ]
    },
    {
        "id": "b1-1",
        "level": "B1",
        "title": "Công việc & Trải nghiệm sống tại thành phố",
        "desc": "Luyện câu ghép phức tạp và ngữ điệu tự nhiên",
        "sentences": [
            {
                "de": "Ich heiße Josefine. Ich bin 25 und gerade nach London gezogen.",
                "vi": "Tôi tên là Josefine. Tôi 25 tuổi và vừa mới chuyển đến London."
            },
            {
                "de": "Die U-Bahn ist ziemlich verwirrend, aber mit ihr komme ich schnell überall hin.",
                "vi": "Tàu điện ngầm khá rối rắm, nhưng nhờ nó tôi có thể đến mọi nơi rất nhanh."
            },
            {
                "de": "Immer mehr Menschen arbeiten im Homeoffice und nutzen moderne digitale Technologien.",
                "vi": "Ngày càng nhiều người làm việc tại nhà và tận dụng công nghệ số hiện đại."
            },
            {
                "de": "Das spart Zeit beim Pendeln und ermöglicht eine bessere Vereinbarkeit von Familie und Beruf.",
                "vi": "Điều này giúp tiết kiệm thời gian đi lại và cân bằng tốt hơn giữa gia đình và công việc."
            }
        ]
    },
    {
        "id": "b2-1",
        "level": "B2",
        "title": "Bàn luận & Nêu quan điểm xã hội",
        "desc": "Luyện phát âm các từ vựng học thuật và nhịp điệu nâng cao",
        "sentences": [
            {
                "de": "Der nachhaltige Umgang mit Ressourcen spielt eine entscheidende Rolle für unsere Zukunft.",
                "vi": "Việc sử dụng bền vững các nguồn tài nguyên đóng vai trò then chốt cho tương lai của chúng ta."
            },
            {
                "de": "Es ist unerlässlich, innovative Lösungen zur Bewältigung des Klimawandels zu entwickeln.",
                "vi": "Điều cấp thiết là phải phát triển các giải pháp đổi mới để ứng phó với biến đổi khí hậu."
            }
        ]
    }
]

def clean_token(text):
    """Chuẩn hóa từ để so sánh chính xác không phụ thuộc dấu câu và viết hoa."""
    cleaned = re.sub(r'^[^\w]+|[^\w]+$', '', text.lower())
    return cleaned

def compute_shadowing_score(target_text, recognized_text):
    """Thuật toán so sánh chi tiết từng từ giữa câu mẫu và giọng nói người học."""
    target_tokens = target_text.strip().split()
    rec_tokens = recognized_text.strip().split()

    target_cleaned = [clean_token(w) for w in target_tokens]
    rec_cleaned = [clean_token(w) for w in rec_tokens]

    matcher = difflib.SequenceMatcher(None, target_cleaned, rec_cleaned)
    words_analysis = []
    correct_count = 0
    mispronounced_count = 0
    missing_count = 0

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'equal':
            for idx in range(i1, i2):
                words_analysis.append({
                    "word": target_tokens[idx],
                    "status": "correct",
                    "spoken": rec_tokens[j1 + (idx - i1)] if (j1 + (idx - i1)) < len(rec_tokens) else ""
                })
                correct_count += 1
        elif tag == 'replace':
            for idx in range(i1, i2):
                rel_j = j1 + (idx - i1)
                spoken_word = rec_tokens[rel_j] if rel_j < j2 and rel_j < len(rec_tokens) else "(nhầm từ)"
                words_analysis.append({
                    "word": target_tokens[idx],
                    "status": "mispronounced",
                    "spoken": spoken_word
                })
                mispronounced_count += 1
        elif tag == 'delete':
            for idx in range(i1, i2):
                words_analysis.append({
                    "word": target_tokens[idx],
                    "status": "missing",
                    "spoken": ""
                })
                missing_count += 1
        elif tag == 'insert':
            pass

    total_words = max(len(target_tokens), 1)
    accuracy_score = round((correct_count / total_words) * 100)
    
    if accuracy_score >= 90:
        rating = "Ausgezeichnet! (Xuất sắc) ⭐⭐⭐⭐⭐"
        level_class = "excellent"
        feedback = "Phát âm rất chuẩn xác và tự nhiên! Ngữ điệu khớp gần như tuyệt đối với người bản ngữ."
    elif accuracy_score >= 75:
        rating = "Sehr gut! (Rất tốt) ⭐⭐⭐⭐"
        level_class = "very-good"
        feedback = "Bạn phát âm tốt đa số các từ. Hãy chú ý các từ bị đánh dấu để phát âm rõ phụ âm và nguyên âm dài."
    elif accuracy_score >= 50:
        rating = "Gut! (Khá tốt) ⭐⭐⭐"
        level_class = "good"
        feedback = "Cơ bản bạn đã nắm được câu. Hãy giảm tốc độ mẫu xuống -15% và luyện nhại lại (Shadowing) từng cụm từ."
    else:
        rating = "Weiter üben! (Cần luyện thêm) ⭐⭐"
        level_class = "needs-practice"
        feedback = "Nhiều từ chưa được nhận diện chính xác. Hãy nghe kỹ từng từ của Katja hoặc Conrad trước khi thu âm lại nhé."

    return {
        "accuracy_score": accuracy_score,
        "rating": rating,
        "level_class": level_class,
        "feedback": feedback,
        "total_words": total_words,
        "correct_count": correct_count,
        "mispronounced_count": mispronounced_count,
        "missing_count": missing_count,
        "words_analysis": words_analysis,
    }

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/voices", methods=["GET"])
def get_voices():
    return jsonify({"voices": GERMAN_VOICES})

@app.route("/api/lessons", methods=["GET"])
def get_lessons():
    return jsonify({"lessons": LESSONS_DATA})

@app.route("/api/tts", methods=["POST"])
def tts_endpoint():
    data = request.get_json() or {}
    text = data.get("text", "").strip()
    voice = data.get("voice", "de-DE-KatjaNeural")
    rate = data.get("rate", "+0%")

    if not text:
        return jsonify({"error": "Văn bản không được để trống"}), 400

    session_id = uuid.uuid4().hex[:8]
    full_filename = f"tts_full_{session_id}.mp3"
    full_filepath = AUDIO_DIR / full_filename

    # Tách đoạn văn thành từng câu tự nhiên
    sentence_texts = [s.strip() for s in re.split(r'(?<=[.!?…])\s+', text) if s.strip()]
    if not sentence_texts:
        sentence_texts = [text]

    async def generate_all_audio():
        tasks = []
        # 1. Tạo audio toàn bài
        tasks.append(edge_tts.Communicate(text=text, voice=voice, rate=rate).save(str(full_filepath)))
        
        # 2. Tạo audio cho từng câu riêng biệt
        sentence_items = []
        for idx, s in enumerate(sentence_texts):
            s_filename = f"tts_s_{session_id}_{idx}.mp3"
            s_filepath = AUDIO_DIR / s_filename
            tasks.append(edge_tts.Communicate(text=s, voice=voice, rate=rate).save(str(s_filepath)))
            sentence_items.append({
                "index": idx,
                "text": s,
                "audio_url": f"/static/audio/{s_filename}"
            })
        
        await asyncio.gather(*tasks)
        return sentence_items

    try:
        sentences_result = asyncio.run(generate_all_audio())
        return jsonify({
            "success": True,
            "audio_url": f"/static/audio/{full_filename}",
            "text": text,
            "voice": voice,
            "rate": rate,
            "sentences": sentences_result
        })
    except Exception as e:
        return jsonify({"error": f"Lỗi tạo âm thanh: {str(e)}"}), 500

@app.route("/api/score", methods=["POST"])
def score_endpoint():
    target_text = request.form.get("target_text", "").strip()
    if not target_text:
        return jsonify({"error": "Chưa có văn bản mục tiêu cần chấm điểm"}), 400

    if "audio" not in request.files:
        return jsonify({"error": "Không tìm thấy file ghi âm"}), 400

    audio_file = request.files["audio"]
    if audio_file.filename == "":
        return jsonify({"error": "File âm thanh rỗng"}), 400

    # Lưu file ghi âm từ browser
    ext = os.path.splitext(audio_file.filename)[1] or ".webm"
    user_filename = f"user_{uuid.uuid4().hex[:8]}{ext}"
    user_path = UPLOADS_DIR / user_filename
    audio_file.save(str(user_path))

    start_stt = time.time()
    try:
        # Nhận diện giọng nói tiếng Đức bằng faster-whisper
        segments, info = whisper_model.transcribe(
            str(user_path),
            language="de",
            beam_size=5,
            vad_filter=True,
        )
        rec_parts = [s.text.strip() for s in segments]
        recognized_text = " ".join(rec_parts).strip()
    except Exception as e:
        return jsonify({"error": f"Lỗi nhận diện giọng nói (STT): {str(e)}"}), 500

    stt_time = round(time.time() - start_stt, 2)

    # Chấm điểm đối chiếu với câu mẫu
    result = compute_shadowing_score(target_text, recognized_text)
    result["recognized_text"] = recognized_text or "(Không nghe rõ âm thanh)"
    result["user_audio_url"] = f"/static/uploads/{user_filename}"
    result["stt_time"] = stt_time

    return jsonify(result)

if __name__ == "__main__":
    print("\n" + "=" * 65)
    print("🚀 FLASK GERMAN SHADOWING STUDIO SERVER ĐANG CHẠY")
    print("👉 Mở trình duyệt tại: http://127.0.0.1:5000")
    print("=" * 65 + "\n")
    app.run(host="127.0.0.1", port=5000, debug=False)
