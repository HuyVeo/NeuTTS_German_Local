// Deutsch Shadowing Master - Frontend Application with Segment Playback

document.addEventListener("DOMContentLoaded", () => {
    // App State
    let lessons = [];
    let activeLevel = "A1";
    let activeLesson = null;
    let activeSentenceIndex = 0;
    let currentSentenceData = []; // [{ index, text, audio_url }]
    let activeLoopIndex = null;   // Chỉ số câu đang bật chế độ lặp

    let customSentence = {
        de: "Ich heiße Josefine. Ich bin 25 und gerade nach London gezogen. Die U-Bahn ist ziemlich verwirrend, aber mit ihr komme ich in kürzester Zeit überall hin.",
        vi: "Tôi tên là Josefine. Tôi 25 tuổi và vừa mới chuyển đến London. Tàu điện ngầm khá rối rắm, nhưng nhờ nó tôi có thể đến mọi nơi rất nhanh."
    };

    // Audio & Recording State
    let mediaRecorder = null;
    let recordedChunks = [];
    let isRecording = false;
    let recordStartTime = null;
    let recordTimerInterval = null;

    // DOM Elements - Navigation & Settings
    const levelTabs = document.getElementById("levelTabs");
    const lessonList = document.getElementById("lessonList");
    const voiceSelect = document.getElementById("voiceSelect");
    const speedRange = document.getElementById("speedRange");
    const speedVal = document.getElementById("speedVal");
    const generateAudioBtn = document.getElementById("generateAudioBtn");

    const customInputCard = document.getElementById("customInputCard");
    const customTextInput = document.getElementById("customTextInput");
    const applyCustomBtn = document.getElementById("applyCustomBtn");

    const currentLessonTag = document.getElementById("currentLessonTag");
    const sentenceIndexTag = document.getElementById("sentenceIndexTag");
    const targetGermanText = document.getElementById("targetGermanText");
    const targetVietnameseText = document.getElementById("targetVietnameseText");

    // Audio Player Elements
    const mainAudioPlayer = document.getElementById("mainAudioPlayer");
    const timelineTrackWrap = document.getElementById("timelineTrackWrap");
    const timelineProgressBar = document.getElementById("timelineProgressBar");
    const timelineHandle = document.getElementById("timelineHandle");
    const currentTimeLabel = document.getElementById("currentTimeLabel");
    const durationLabel = document.getElementById("durationLabel");
    const playPauseBtn = document.getElementById("playPauseBtn");
    const playIcon = document.getElementById("playIcon");
    const rewindBtn = document.getElementById("rewindBtn");
    const forwardBtn = document.getElementById("forwardBtn");
    const loopWholeBtn = document.getElementById("loopWholeBtn");
    const playerStatusText = document.getElementById("playerStatusText");

    // Sentence Segments
    const sentenceSegmentsList = document.getElementById("sentenceSegmentsList");

    // Recording Elements
    const recordBtn = document.getElementById("recordBtn");
    const recordBtnText = document.getElementById("recordBtnText");
    const recordTimer = document.getElementById("recordTimer");
    const waveAnim = document.getElementById("waveAnim");

    const prevSentenceBtn = document.getElementById("prevSentenceBtn");
    const nextSentenceBtn = document.getElementById("nextSentenceBtn");

    // Scorecard Elements
    const scoreCard = document.getElementById("scoreCard");
    const scoreCircle = document.getElementById("scoreCircle");
    const scoreNumber = document.getElementById("scoreNumber");
    const scoreRating = document.getElementById("scoreRating");
    const feedbackText = document.getElementById("feedbackText");
    const correctCount = document.getElementById("correctCount");
    const mispronouncedCount = document.getElementById("mispronouncedCount");
    const missingCount = document.getElementById("missingCount");
    const wordsContainer = document.getElementById("wordsContainer");
    const userAudioPlayer = document.getElementById("userAudioPlayer");
    const sttTimeTag = document.getElementById("sttTimeTag");
    const retryBtn = document.getElementById("retryBtn");

    // Helper: Định dạng thời gian mm:ss
    function formatTime(seconds) {
        if (isNaN(seconds)) return "00:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }

    // 1. Tải bài học từ Backend
    async function init() {
        try {
            const res = await fetch("/api/lessons");
            const data = await res.json();
            lessons = data.lessons || [];
            renderLevelLessons(activeLevel);
        } catch (e) {
            console.error("Lỗi tải bài học:", e);
        }
    }

    // 2. Tốc độ nói
    speedRange.addEventListener("input", (e) => {
        const val = parseInt(e.target.value);
        speedVal.textContent = (val > 0 ? `+${val}%` : `${val}%`) + (val === 0 ? " (Chuẩn)" : "");
    });

    // 3. Chuyển cấp độ
    levelTabs.addEventListener("click", (e) => {
        if (!e.target.classList.contains("level-tab")) return;
        document.querySelectorAll(".level-tab").forEach(tab => tab.classList.remove("active"));
        e.target.classList.add("active");

        activeLevel = e.target.getAttribute("data-level");
        if (activeLevel === "custom") {
            customInputCard.classList.remove("hidden");
            lessonList.innerHTML = `<div class="lesson-desc" style="padding:10px;">Chế độ tự nhập: Nhập bất kỳ đoạn văn bản tiếng Đức nào. Hệ thống sẽ tự động phân tách từng câu để bạn nghe riêng lẻ!</div>`;
            setCustomSentence(customSentence.de, customSentence.vi);
        } else {
            customInputCard.classList.add("hidden");
            renderLevelLessons(activeLevel);
        }
    });

    function renderLevelLessons(level) {
        lessonList.innerHTML = "";
        const filtered = lessons.filter(l => l.level === level);
        if (filtered.length === 0) return;

        filtered.forEach((les, idx) => {
            const item = document.createElement("div");
            item.className = `lesson-item ${idx === 0 ? 'active' : ''}`;
            item.innerHTML = `
                <div class="lesson-title">${les.title}</div>
                <div class="lesson-desc">${les.desc} (${les.sentences.length} câu)</div>
            `;
            item.addEventListener("click", () => {
                document.querySelectorAll(".lesson-item").forEach(el => el.classList.remove("active"));
                item.classList.add("active");
                selectLesson(les);
            });
            lessonList.appendChild(item);
        });

        selectLesson(filtered[0]);
    }

    function selectLesson(les) {
        activeLesson = les;
        activeSentenceIndex = 0;
        updateActiveSentenceUI();
    }

    function setCustomSentence(deText, viText) {
        activeLesson = {
            id: "custom",
            level: "Custom",
            title: "Đoạn văn tự nhập",
            sentences: [{ de: deText, vi: viText || "(Đoạn văn tự nhập)" }]
        };
        activeSentenceIndex = 0;
        updateActiveSentenceUI();
    }

    applyCustomBtn.addEventListener("click", () => {
        const text = customTextInput.value.trim();
        if (!text) {
            alert("Vui lòng nhập văn bản tiếng Đức trước!");
            return;
        }
        customSentence.de = text;
        customSentence.vi = "(Đoạn văn tự nhập của bạn)";
        setCustomSentence(text, "(Đoạn văn tự nhập của bạn)");
    });

    // 4. Cập nhật câu hiện tại & Tự động tạo audio phân đoạn
    function updateActiveSentenceUI() {
        if (!activeLesson || !activeLesson.sentences[activeSentenceIndex]) return;

        const current = activeLesson.sentences[activeSentenceIndex];
        currentLessonTag.textContent = `${activeLesson.level}: ${activeLesson.title}`;
        sentenceIndexTag.textContent = `Câu ${activeSentenceIndex + 1}/${activeLesson.sentences.length}`;
        targetGermanText.textContent = current.de;
        targetVietnameseText.textContent = current.vi;

        prevSentenceBtn.disabled = activeSentenceIndex === 0;
        nextSentenceBtn.disabled = activeSentenceIndex >= activeLesson.sentences.length - 1;

        scoreCard.classList.add("hidden");
        activeLoopIndex = null;

        // Tự động phân đoạn và sinh audio cho đoạn này
        fetchAndSetupAudio(current.de);
    }

    prevSentenceBtn.addEventListener("click", () => {
        if (activeSentenceIndex > 0) {
            activeSentenceIndex--;
            updateActiveSentenceUI();
        }
    });

    nextSentenceBtn.addEventListener("click", () => {
        if (activeLesson && activeSentenceIndex < activeLesson.sentences.length - 1) {
            activeSentenceIndex++;
            updateActiveSentenceUI();
        }
    });

    generateAudioBtn.addEventListener("click", () => {
        const text = targetGermanText.textContent.trim();
        fetchAndSetupAudio(text);
    });

    // 5. Gọi API TTS sinh audio toàn bài và audio từng câu
    async function fetchAndSetupAudio(text) {
        const voice = voiceSelect.value;
        const rateVal = parseInt(speedRange.value);
        const rateStr = (rateVal >= 0 ? `+${rateVal}%` : `${rateVal}%`);

        playerStatusText.textContent = "⏳ Đang tạo âm thanh và phân tích từng câu...";
        sentenceSegmentsList.innerHTML = `<div style="color:var(--text-muted); padding:10px;">Đang tải các đoạn câu...</div>`;

        try {
            const res = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, voice, rate: rateStr })
            });
            const data = await res.json();

            if (data.audio_url) {
                mainAudioPlayer.src = data.audio_url;
                mainAudioPlayer.load();
                playerStatusText.textContent = `Sẵn sàng phát (${voiceSelect.options[voiceSelect.selectedIndex].text.split('(')[0].trim()})`;

                currentSentenceData = data.sentences || [];
                renderSentenceSegments(currentSentenceData);
            }
        } catch (e) {
            playerStatusText.textContent = "Lỗi tạo âm thanh!";
            console.error(e);
        }
    }

    // 6. Hiển thị danh sách từng câu để bấm nghe bất kỳ câu nào
    function renderSentenceSegments(sentences) {
        sentenceSegmentsList.innerHTML = "";

        if (!sentences || sentences.length === 0) {
            sentenceSegmentsList.innerHTML = `<div style="color:var(--text-muted); padding:10px;">Chỉ có 1 đoạn đơn.</div>`;
            return;
        }

        sentences.forEach((s, idx) => {
            const card = document.createElement("div");
            card.className = "segment-card";
            card.id = `segmentCard_${idx}`;

            card.innerHTML = `
                <div class="segment-left">
                    <span class="segment-index-badge">${idx + 1}</span>
                    <span class="segment-text">${s.text}</span>
                </div>
                <div class="segment-actions">
                    <button class="btn-seg-play" data-idx="${idx}" title="Nghe riêng câu này">
                        ▶️ Nghe đoạn này
                    </button>
                    <button class="btn-seg-loop ${activeLoopIndex === idx ? 'active' : ''}" data-idx="${idx}" title="Lặp lại câu này liên tục">
                        🔁 Lặp
                    </button>
                    <button class="btn-seg-target" data-idx="${idx}" title="Chọn câu này để luyện và chấm điểm">
                        🎯 Luyện câu này
                    </button>
                </div>
            `;

            // Bấm vào nút "Nghe riêng câu này"
            card.querySelector(".btn-seg-play").addEventListener("click", () => {
                playSingleSegment(s, idx, false);
            });

            // Bấm vào nút "Lặp câu này"
            card.querySelector(".btn-seg-loop").addEventListener("click", (e) => {
                if (activeLoopIndex === idx) {
                    activeLoopIndex = null;
                    e.target.classList.remove("active");
                    playerStatusText.textContent = "Đã tắt lặp đoạn.";
                } else {
                    activeLoopIndex = idx;
                    document.querySelectorAll(".btn-seg-loop").forEach(b => b.classList.remove("active"));
                    e.target.classList.add("active");
                    playSingleSegment(s, idx, true);
                }
            });

            // Bấm vào nút "Luyện câu này" (Set làm mục tiêu chấm điểm)
            card.querySelector(".btn-seg-target").addEventListener("click", () => {
                targetGermanText.textContent = s.text;
                targetVietnameseText.textContent = `(Đang chọn luyện tập riêng đoạn ${idx + 1})`;
                sentenceIndexTag.textContent = `Đoạn ${idx + 1}/${sentences.length}`;
                highlightActiveSegment(idx);
                scoreCard.classList.add("hidden");
                playerStatusText.textContent = `Đã chọn đoạn ${idx + 1} làm mục tiêu thu âm & chấm điểm!`;
            });

            sentenceSegmentsList.appendChild(card);
        });
    }

    function highlightActiveSegment(idx) {
        document.querySelectorAll(".segment-card").forEach((card, i) => {
            if (i === idx) {
                card.classList.add("active");
            } else {
                card.classList.remove("active");
            }
        });
    }

    // Phát riêng 1 đoạn câu
    function playSingleSegment(segment, idx, isLoop) {
        highlightActiveSegment(idx);
        mainAudioPlayer.src = segment.audio_url;
        mainAudioPlayer.load();
        mainAudioPlayer.loop = isLoop;
        mainAudioPlayer.play();

        playerStatusText.textContent = isLoop 
            ? `🔁 Đang lặp lại đoạn ${idx + 1}: "${segment.text.substring(0, 30)}..."` 
            : `▶️ Đang phát đoạn ${idx + 1}`;
        playIcon.textContent = "⏸️";
    }

    // 7. Interactive Timeline Scrubber & Player Controls
    playPauseBtn.addEventListener("click", () => {
        if (!mainAudioPlayer.src) return;

        if (mainAudioPlayer.paused) {
            mainAudioPlayer.play();
            playIcon.textContent = "⏸️";
            playerStatusText.textContent = "Đang phát...";
        } else {
            mainAudioPlayer.pause();
            playIcon.textContent = "▶️";
            playerStatusText.textContent = "Đã tạm dừng";
        }
    });

    mainAudioPlayer.addEventListener("timeupdate", () => {
        const cur = mainAudioPlayer.currentTime;
        const dur = mainAudioPlayer.duration;

        currentTimeLabel.textContent = formatTime(cur);
        if (!isNaN(dur) && dur > 0) {
            durationLabel.textContent = formatTime(dur);
            const pct = (cur / dur) * 100;
            timelineProgressBar.style.width = `${pct}%`;
            timelineHandle.style.left = `${pct}%`;
        }
    });

    mainAudioPlayer.addEventListener("ended", () => {
        if (!mainAudioPlayer.loop) {
            playIcon.textContent = "▶️";
            playerStatusText.textContent = "Đã phát xong";
        }
    });

    // Tua chuột trên Timeline Progress Bar
    function seekTimeline(e) {
        const rect = timelineTrackWrap.getBoundingClientRect();
        const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const pct = clickX / rect.width;
        if (!isNaN(mainAudioPlayer.duration)) {
            mainAudioPlayer.currentTime = pct * mainAudioPlayer.duration;
        }
    }

    let isSeeking = false;
    timelineTrackWrap.addEventListener("mousedown", (e) => {
        isSeeking = true;
        seekTimeline(e);
    });
    window.addEventListener("mousemove", (e) => {
        if (isSeeking) seekTimeline(e);
    });
    window.addEventListener("mouseup", () => {
        isSeeking = false;
    });

    // Nút tua lui -3s, tua tới +3s
    rewindBtn.addEventListener("click", () => {
        mainAudioPlayer.currentTime = Math.max(0, mainAudioPlayer.currentTime - 3);
    });

    forwardBtn.addEventListener("click", () => {
        if (!isNaN(mainAudioPlayer.duration)) {
            mainAudioPlayer.currentTime = Math.min(mainAudioPlayer.duration, mainAudioPlayer.currentTime + 3);
        }
    });

    loopWholeBtn.addEventListener("click", () => {
        mainAudioPlayer.loop = !mainAudioPlayer.loop;
        loopWholeBtn.classList.toggle("active", mainAudioPlayer.loop);
        playerStatusText.textContent = mainAudioPlayer.loop ? "Đang bật lặp toàn bài" : "Đã tắt lặp";
    });

    // Tốc độ phát lại trên Player (0.8x, 1x, 1.2x)
    document.querySelectorAll(".btn-speed").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".btn-speed").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            mainAudioPlayer.playbackRate = parseFloat(btn.getAttribute("data-speed"));
        });
    });

    // 8. Thu âm & Chấm điểm Shadowing (Whisper STT)
    recordBtn.addEventListener("click", async () => {
        if (!isRecording) {
            startRecording();
        } else {
            stopRecording();
        }
    });

    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            recordedChunks = [];
            
            let mimeType = "audio/webm";
            if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
                mimeType = "audio/webm;codecs=opus";
            }

            mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) recordedChunks.push(e.data);
            };

            mediaRecorder.onstop = handleRecordingComplete;

            mediaRecorder.start();
            isRecording = true;

            recordBtn.classList.add("recording");
            recordBtnText.textContent = "Dừng & Chấm điểm";
            waveAnim.classList.remove("hidden");
            scoreCard.classList.add("hidden");

            recordStartTime = Date.now();
            recordTimerInterval = setInterval(() => {
                const diffSec = Math.floor((Date.now() - recordStartTime) / 1000);
                const mm = String(Math.floor(diffSec / 60)).padStart(2, "0");
                const ss = String(diffSec % 60).padStart(2, "0");
                recordTimer.textContent = `${mm}:${ss}`;
            }, 1000);

        } catch (err) {
            alert("Vui lòng cấp quyền truy cập Microphone cho trình duyệt để thu âm!");
            console.error("Lỗi Microphone:", err);
        }
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        isRecording = false;
        clearInterval(recordTimerInterval);

        recordBtn.classList.remove("recording");
        recordBtnText.textContent = "Đang phân tích...";
        recordBtn.disabled = true;
        waveAnim.classList.add("hidden");
    }

    async function handleRecordingComplete() {
        const audioBlob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || "audio/webm" });
        const targetText = targetGermanText.textContent.trim();

        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");
        formData.append("target_text", targetText);

        try {
            const res = await fetch("/api/score", {
                method: "POST",
                body: formData
            });
            const data = await res.json();

            if (data.error) {
                alert(`Lỗi chấm điểm: ${data.error}`);
            } else {
                renderScoreCard(data);
            }
        } catch (e) {
            alert("Lỗi kết nối máy chủ chấm điểm!");
            console.error(e);
        } finally {
            recordBtn.disabled = false;
            recordBtnText.textContent = "Bắt đầu thu âm";
            recordTimer.textContent = "00:00";
        }
    }

    // 9. Hiển thị Kết quả Chấm điểm AI
    function renderScoreCard(data) {
        scoreCard.classList.remove("hidden");
        scoreCard.scrollIntoView({ behavior: "smooth" });

        scoreNumber.textContent = data.accuracy_score;
        scoreRating.textContent = data.rating;
        feedbackText.textContent = data.feedback;
        sttTimeTag.textContent = `⚡ AI nhận diện trong ${data.stt_time}s`;

        correctCount.textContent = data.correct_count;
        mispronouncedCount.textContent = data.mispronounced_count;
        missingCount.textContent = data.missing_count;

        if (data.accuracy_score >= 85) {
            scoreCircle.style.borderColor = "var(--success)";
            scoreCircle.style.boxShadow = "0 0 25px rgba(16, 185, 129, 0.4)";
        } else if (data.accuracy_score >= 60) {
            scoreCircle.style.borderColor = "var(--warning)";
            scoreCircle.style.boxShadow = "0 0 25px rgba(245, 158, 11, 0.4)";
        } else {
            scoreCircle.style.borderColor = "var(--danger)";
            scoreCircle.style.boxShadow = "0 0 25px rgba(239, 68, 68, 0.4)";
        }

        if (data.user_audio_url) {
            userAudioPlayer.src = data.user_audio_url;
        }

        wordsContainer.innerHTML = "";
        data.words_analysis.forEach(item => {
            const pill = document.createElement("div");
            pill.className = `word-pill ${item.status}`;
            pill.textContent = item.word;

            const tooltip = document.createElement("span");
            tooltip.className = "word-tooltip";
            if (item.status === "correct") {
                tooltip.textContent = "Phát âm chuẩn xác! ✓";
            } else if (item.status === "mispronounced") {
                tooltip.textContent = `Bạn đọc thành: "${item.spoken}"`;
            } else {
                tooltip.textContent = "Bạn đã bỏ sót từ này";
            }

            pill.appendChild(tooltip);
            wordsContainer.appendChild(pill);
        });
    }

    retryBtn.addEventListener("click", () => {
        scoreCard.classList.add("hidden");
        recordBtn.scrollIntoView({ behavior: "smooth" });
    });

    init();
});
