import os
import uuid
import cv2
import time
import threading
import pygame
import wave

from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import Groq

from openvoice import se_extractor
from OpenVoice.voice_service import EmotionalVoice

from vision_module.pose_detector import PoseDetector
from vision_module.emotion_detector import EmotionDetector

# ================== INIT ==================
print("🚀 Initializing Emotional AI System...")

load_dotenv()
app = FastAPI(title="Emotional Home Companion AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================== AUDIO ==================
AUDIO_DIR = os.path.join(os.getcwd(), "OpenVoice", "outputs")
os.makedirs(AUDIO_DIR, exist_ok=True)

app.mount("/audio", StaticFiles(directory=AUDIO_DIR), name="audio")

pygame.mixer.init()

# ================== AI ==================
print("🎤 Loading voice cloning...")
openvoice_engine = EmotionalVoice()

GROQ_KEY = os.getenv("GROQ_API_KEY")
client_groq = Groq(api_key=GROQ_KEY)

# ================== VISION ==================
cap = cv2.VideoCapture(0)
cap.set(3, 640)
cap.set(4, 480)

pose_detector = PoseDetector()
emotion_detector = EmotionDetector()

# ================== GLOBAL STATE ==================
current_ai_status = {
    "status": "Đang khởi động...",
    "is_warning": False,
    "emotion": "Ổn định",
    "color": (255, 255, 255)
}

lip_sync_data = []
current_audio_url = ""
face_tracking = {"x": 0.5, "y": 0.5}

last_warning_time = 0
last_status = ""
WARNING_COOLDOWN = 20

audio_lock = threading.Lock()

# ================== MODELS ==================
class ChatRequest(BaseModel):
    user_input: str

# ================== VOICE ==================
def play_voice_worker(text):
    global lip_sync_data, current_audio_url

    with audio_lock:
        try:
            uid = uuid.uuid4().hex[:8]
            filename = f"voice_{uid}.wav"
            filepath = os.path.join(AUDIO_DIR, filename)

            print(f"🎤 Generating: {text}")

            openvoice_engine.speak(text, filename=filename)

            time.sleep(0.4)

            if not os.path.exists(filepath):
                print("❌ Audio not found")
                return

            # ===== LIP SYNC (THEO AUDIO REAL) =====
            with wave.open(filepath, 'rb') as wf:
                duration = wf.getnframes() / wf.getframerate()

            steps = max(8, int(duration * 12))  # mượt hơn
            interval = duration / steps

            lip_sync_data = [
                {"time": i * interval, "phoneme": "A"}
                for i in range(steps)
            ]

            current_audio_url = f"/audio/{filename}"

            # ===== PLAY AUDIO =====
            pygame.mixer.music.load(filepath)
            pygame.mixer.music.play()

            while pygame.mixer.music.get_busy():
                pygame.time.Clock().tick(30)

            pygame.mixer.music.stop()

            # ===== RESET =====
            lip_sync_data = []
            current_audio_url = ""

        except Exception as e:
            print(f"❌ Voice error: {e}")

# ================== QUICK RULE (FALLBACK) ==================
def quick_remind(status, emotion):
    if "khom" in status:
        return "Dạ nội ơi, nội ngồi thẳng lại nha."
    if "nghiêng" in status:
        return "Nội ơi, giữ thăng bằng lại nha."
    if emotion == "Buồn":
        return "Dạ nội đừng buồn, có con đây nha."
    return "Dạ nội giữ sức khỏe nha."

# ================== AI REMINDER ==================
def trigger_auto_remind(status_text, emotion):
    global last_warning_time, last_status

    now = time.time()

    # tránh spam
    if now - last_warning_time < WARNING_COOLDOWN:
        return

    if status_text == last_status:
        return

    last_warning_time = now
    last_status = status_text

    try:
        prompt = f"""
        Nội đang: {status_text}
        Cảm xúc: {emotion}

        Chỉ nói 1 câu dưới 15 từ, giọng cháu nội miền Nam.
        """

        res = client_groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=40,
            temperature=0.6,
            messages=[
                {"role": "system", "content": "Chỉ trả lời 1 câu ngắn dưới 15 từ."},
                {"role": "user", "content": prompt}
            ]
        )

        text = res.choices[0].message.content.strip()

        # ===== HARD CUT =====
        text = text.split(".")[0]
        words = text.split()[:15]
        text = " ".join(words)

    except:
        # fallback nếu AI lỗi
        text = quick_remind(status_text, emotion)

    print(f"🤖 AI: {text}")

    threading.Thread(
        target=play_voice_worker,
        args=(text,),
        daemon=True
    ).start()

# ================== VIDEO STREAM ==================
def generate_frames():
    global current_ai_status, face_tracking

    prev_time = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame = pose_detector.findPose(frame)
        pose_detector.getPosition(frame, draw=False)

        status_text, color = pose_detector.detect_posture()

        emotion = emotion_detector.detect(
            frame,
            pose_detector.results.pose_landmarks.landmark
            if pose_detector.results.pose_landmarks else None
        )

        # ===== HEAD TRACK =====
        if pose_detector.results.pose_landmarks:
            nose = pose_detector.results.pose_landmarks.landmark[0]
            face_tracking["x"] = float(nose.x)
            face_tracking["y"] = float(nose.y)

        is_warning = any(x in status_text for x in ["🚨", "⚠️", "🆘"])

        current_ai_status = {
            "status": status_text,
            "is_warning": is_warning,
            "emotion": emotion,
            "color": color
        }

        if is_warning:
            trigger_auto_remind(status_text, emotion)

        # ===== UI =====
        cv2.rectangle(frame, (0, 0), (640, 60), (0, 0, 0), -1)

        cv2.putText(
            frame,
            status_text,
            (20, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (color[2], color[1], color[0]),
            2
        )

        # FPS
        curr = time.time()
        fps = 1 / (curr - prev_time) if curr != prev_time else 0
        prev_time = curr

        cv2.putText(
            frame,
            f"FPS: {int(fps)}",
            (500, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 255, 255),
            2
        )

        _, buffer = cv2.imencode(".jpg", frame)

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" +
            buffer.tobytes() +
            b"\r\n"
        )

# ================== API ==================
@app.get("/api/ai/status")
async def full_state():
    return {
        "status": current_ai_status,
        "lip_sync": lip_sync_data,
        "audio": current_audio_url,
        "face": face_tracking
    }

@app.get("/api/ai/video_feed")
def video_feed():
    return StreamingResponse(
        generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.post("/api/ai/chat")
async def chat(req: ChatRequest):
    try:
        res = client_groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=40,
            messages=[
                {"role": "system", "content": "Trả lời 1 câu ngắn."},
                {"role": "user", "content": req.user_input}
            ]
        )

        text = res.choices[0].message.content.strip()
        text = text.split(".")[0]
        text = " ".join(text.split()[:15])

        threading.Thread(
            target=play_voice_worker,
            args=(text,),
            daemon=True
        ).start()

        return {"text": text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/upload_voice")
async def upload_voice(file: UploadFile = File(...)):
    try:
        temp_path = os.path.join("OpenVoice", file.filename)

        with open(temp_path, "wb") as f:
            f.write(await file.read())

        openvoice_engine.target_se, _ = se_extractor.get_se(
            temp_path,
            openvoice_engine.converter,
            target_dir='processed'
        )

        return {"status": "updated"}

    except Exception as e:
        return {"error": str(e)}

# ================== RUN ==================
if __name__ == "__main__":
    import uvicorn

    print("🚀 Server running at http://localhost:8000")

    try:
        uvicorn.run(app, host="0.0.0.0", port=8000)
    finally:
        cap.release()
        cv2.destroyAllWindows()