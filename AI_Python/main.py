import os
import uuid
import cv2
import time
import threading
import pygame
import torch
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import Groq

# Module AI/Voice/Vision
from OpenVoice.voice_service import EmotionalVoice
from vision_module.pose_detector import PoseDetector
from vision_module.emotion_detector import EmotionDetector
from lip_sync_generator import generate_lip_sync 

# IMPORT TỪ FILE RIÊNG CỦA LUÂN
from play_voice_worker import play_voice_worker

# ================== CONFIG & INIT ==================
load_dotenv()
app = FastAPI(title="VHU Emotional Home Companion")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
AUDIO_DIR = os.path.join(BASE_DIR, "OpenVoice", "outputs")
VOICE_PROFILE_PATH = os.path.join(BASE_DIR, "processed", "nguoi_than_v2_xpxv93QJWtOWk30f", "se.pth")

if not os.path.exists(AUDIO_DIR):
    os.makedirs(AUDIO_DIR, exist_ok=True)

app.mount("/audio", StaticFiles(directory=AUDIO_DIR), name="audio")

# Khởi tạo Engine
pygame.mixer.init()
audio_lock = threading.Lock()
openvoice_engine = EmotionalVoice()
client_groq = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Nạp giọng chuẩn (se.pth)
if os.path.exists(VOICE_PROFILE_PATH):
    openvoice_engine.target_se = torch.load(VOICE_PROFILE_PATH)
    print(f"✅ Đã nạp giọng chuẩn từ: {VOICE_PROFILE_PATH}")
else:
    print("⚠️ Cảnh báo: Không tìm thấy file se.pth")

# Sửa dòng này (khoảng dòng 60)
cap = cv2.VideoCapture(0, cv2.CAP_DSHOW) 
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

if not cap.isOpened():
    print("❌ LỖI: Backend không thể kết nối với Camera vật lý!")
pose_detector = PoseDetector()
emotion_detector = EmotionDetector()

# ================== GLOBAL STATE (ĐỒNG BỘ VỚI WORKER) ==================
current_ai_status = {
    "status": "Đang khởi động...",
    "is_warning": False,
    "emotion": "Ổn định",
    "color": (255, 255, 255)
}

# Dùng Dictionary để pass vào file play_voice_worker.py
ai_state = {
    "lip_sync_data": [],
    "current_audio_url": "",
    "is_ai_speaking": False  # Thêm cờ này để kiểm tra trạng thái nói
}

face_tracking = {"x": 0.5, "y": 0.5}
last_warning_time = 0
WARNING_COOLDOWN = 30 

class ChatRequest(BaseModel):
    user_input: str

# ================== WRAPPER ĐỂ GỌI WORKER ==================
def start_voice_thread(text: str):
    """Hàm phụ trợ để gọi thread từ file play_voice_worker.py"""
    # Cập nhật trạng thái đang nói trước khi luồng bắt đầu để tránh bị gọi chồng
    ai_state["is_ai_speaking"] = True
    
    # Ở file play_voice_worker.py, hãy đảm bảo bạn sửa hàm để nhận target_se nhé!
    threading.Thread(
        target=play_voice_worker, 
        args=(text, openvoice_engine, AUDIO_DIR, audio_lock, ai_state), 
        daemon=True
    ).start()

# ================== LOGIC NHẮC NHỞ ==================
def trigger_remind_logic(status_text, emotion):
    if ai_state.get("is_ai_speaking"): return

    try:
        SYSTEM_PROMPT_REMINDER = (
            "Bạn là Minh, cháu nội. Nhiệm vụ: Nhắc nội điều chỉnh tư thế để bảo vệ sức khỏe. "
            "PHONG CÁCH: Lễ phép, ấm áp, giọng miền Nam (dùng các từ: nhen, nè, nha, đó nội, dạ). "
            "XƯNG HÔ: Bạn gọi là 'con', gọi bà là 'nội'. TUYỆT ĐỐI không gọi nội là 'con' hoặc 'bạn'. "
            "QUY TẮC VÀNG: Câu nói phải cực ngắn (dưới 12 chữ) để phản hồi nhanh. "
            "VÍ DỤ: "
            "- 'Dạ nội ơi, mình ngồi thẳng lưng lên cho khỏe nhen.' "
            "- 'Nội đừng khom lưng nè, đau lưng đó nội.' "
            "- 'Nội ngồi thẳng lên xíu cho con vui nhen.' "
            "KHÔNG giải thích dài dòng, KHÔNG dùng từ ngữ máy móc."
        )
        prompt = f"Tình trạng: {status_text}. Cảm xúc: {emotion}."
        completion = client_groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_REMINDER},
                {"role": "user", "content": prompt}
            ],
            max_tokens=50
        )
        text = completion.choices[0].message.content.strip().replace('"', '')
        if text:
            start_voice_thread(text)
    except Exception as e:
        print(f"❌ Lỗi Nhắc nhở: {e}")

# ================== VIDEO PROCESSOR ==================
def generate_frames():
    global last_warning_time
    while True:
        ret, frame = cap.read()
        if not ret: break

        frame = pose_detector.findPose(frame, draw=True)
        pose_detector.getPosition(frame)
        status_text, color = pose_detector.detect_posture()
        
        landmarks = pose_detector.results.pose_landmarks.landmark if pose_detector.results.pose_landmarks else None
        emotion = emotion_detector.detect(frame, landmarks)

        if landmarks:
            face_tracking["x"], face_tracking["y"] = float(landmarks[0].x), float(landmarks[0].y)

        is_warning = any(word in status_text.upper() for word in ["🚨", "⚠️", "🆘", "SAI", "LÂU"])

        current_ai_status.update({
            "status": status_text, "is_warning": is_warning, 
            "emotion": emotion, "color": color
        })

        # Kiểm tra điều kiện nhắc nhở
        if is_warning and not ai_state.get("is_ai_speaking"):
            now = time.time()
            if now - last_warning_time > WARNING_COOLDOWN:
                last_warning_time = now
                trigger_remind_logic(status_text, emotion)

        cv2.rectangle(frame, (0, 0), (640, 60), (20, 20, 20), -1)
        txt_color = (0, 0, 255) if is_warning else (0, 255, 0)
        cv2.putText(frame, f"AI STATUS: {status_text}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, txt_color, 2)

        _, buffer = cv2.imencode(".jpg", frame)
        yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

# ================== API ENDPOINTS ==================
@app.get("/api/ai/status")
async def get_status():
    return {
        "status": current_ai_status,
        "lip_sync": ai_state["lip_sync_data"],
        "audio": ai_state["current_audio_url"],
        "face": face_tracking,
        "is_ai_speaking": ai_state.get("is_ai_speaking", False)
    }

@app.get("/api/ai/video_feed")
async def video_feed():
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.post("/api/ai/chat")
async def chat(req: ChatRequest):
    if ai_state.get("is_ai_speaking"):
        return {"text": "Chờ con xíu nhen...", "audio": None}

    try:
        SYSTEM_PROMPT_CHAT = (
            "Bạn là Minh, cháu nội. Bạn đang trò chuyện, tâm sự thân thiết với bà nội. "
            "PHONG CÁCH: Lễ phép, hiếu thảo, giọng miền Nam ngọt ngào, ấm áp. "
            "XƯNG HÔ: Gọi là 'con', gọi bà là 'nội'. Tuyệt đối không xưng 'tôi/bạn'. "
            "CÁCH NÓI: "
            "- Luôn bắt đầu bằng 'Dạ' hoặc 'Nội ơi'. "
            "- Sử dụng các từ đệm cuối câu: 'nhen', 'nè', 'nha nội', 'đó nội', 'nghen'. "
            "- Câu trả lời ngắn gọn (2-3 câu), súc tích để tốc độ tạo giọng (TTS) nhanh nhất. "
            "Nhiệm vụ: Lắng nghe tâm sự của nội, an ủi nếu nội buồn, vui vẻ nếu nội khoe chuyện gì đó. "
            "Ví dụ: 'Dạ nội ơi, con nghe nè, nội thấy trong người sao rồi?', 'Dạ nội đừng lo nhen, có con ở đây với nội mà'."
        )
        res = client_groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_CHAT},
                {"role": "user", "content": req.user_input}
            ]
        )
        text = res.choices[0].message.content.strip().replace('"', '')
        start_voice_thread(text)
        return {"text": text, "audio": ai_state["current_audio_url"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)