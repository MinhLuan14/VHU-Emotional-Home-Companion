import os
import uuid
import cv2
import time
import threading
import pygame
import torch
import base64
import asyncio
import uvicorn
from fastapi import FastAPI, HTTPException, File, UploadFile,WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import Groq
from collections import deque
# Module AI/Voice/Vision
from OpenVoice.voice_service import EmotionalVoice
from vision_module.pose_detector import PoseDetector
from vision_module.emotion_detector import EmotionDetector
from vision_module.object_detector import ObjectDetector
from lip_sync_generator import generate_lip_sync 
from brain_module.context_engine import ContextEngine
# IMPORT TỪ FILE RIÊNG CỦA LUÂN
from play_voice_worker import play_voice_worker

# ================== CONFIG & INIT ==================
load_dotenv()
brain = ContextEngine()
app = FastAPI(title="VHU Emotional Home Companion")
raw_buffer = deque(maxlen=2)
processed_buffer = deque(maxlen=2)
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

# ================== NẠP GIỌNG TỰ ĐỘNG (FIX LỖI PATH) ==================
import glob

# Tìm tất cả file se.pth bên trong các thư mục con của processed
se_files = glob.glob(os.path.join(BASE_DIR, "processed", "*", "se.pth"))

if se_files:
    # Lấy file se.pth đầu tiên tìm thấy (thường là file mới nhất Nội vừa train)
    VOICE_PROFILE_PATH = se_files[0]
    # Nạp trực tiếp vào engine của OpenVoice
    openvoice_engine.target_se = torch.load(VOICE_PROFILE_PATH, map_location=openvoice_engine.device)
    print(f"✅ ĐÃ NẠP GIỌNG NGƯỜI THÂN: {VOICE_PROFILE_PATH}")
else:
    print("⚠️ CẢNH BÁO: Không tìm thấy file se.pth. Nội hãy chạy extract_voice.py trước nhen!")
# ======================================================================

# Sửa dòng này (khoảng dòng 60)
cap = cv2.VideoCapture(0, cv2.CAP_DSHOW) 
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

if not cap.isOpened():
    print("❌ LỖI: Backend không thể kết nối với Camera vật lý!")
pose_detector = PoseDetector()
emotion_detector = EmotionDetector()
obj_detector = ObjectDetector()
# ================== GLOBAL STATE (ĐỒNG BỘ VỚI WORKER) ==================
# Tìm đến đoạn GLOBAL STATE
current_ai_status = {
    "status": "Đang khởi động...",
    "is_warning": False,
    "emotion": "Ổn định",
    "color": [255, 255, 255],
    "sitting_seconds": 0,     
    "full_objects_data": []    
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
def trigger_remind_logic(status_text, emotion, history_context=""): 
    if ai_state.get("is_ai_speaking"): return
    try:
        SYSTEM_PROMPT_REMINDER = (
            "Bạn là Ami, cháu nội hiếu thảo. Nhiệm vụ: Nhắc nội bảo vệ sức khỏe. "
            "PHONG CÁCH: Lễ phép, ấm áp, giọng miền Nam (nha, đó nội, dạ). "
            f"BỐI CẢNH LỊCH SỬ: {history_context}. " 
            "QUY TẮC: Câu cực ngắn (dưới 12 chữ). Không nói lại y hệt những gì đã nhắc ở lịch sử."
        )
        prompt = f"Hành động hiện tại: {status_text}. Cảm xúc nội: {emotion}."
        
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
def camera_worker():
    global cap

    while True:
        if cap is None or not cap.isOpened():
            print("🔄 Reconnect camera...")
            cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
            time.sleep(1)
            continue

        ret, frame = cap.read()

        if not ret:
            print("⚠️ Camera mất frame")
            cap.release()
            cap = None
            continue

        raw_buffer.append(frame)
        time.sleep(0.005)

# ================== 2. CỔNG WEBSOCKET (THAY THẾ VIDEO_FEED) ==================
def ai_worker():
    global last_warning_time

    while True:
        try:
            # ===== 1. CHECK BUFFER =====
            if not raw_buffer:
                time.sleep(0.01)
                continue

            frame = raw_buffer[-1].copy()

            if frame is None or frame.size == 0:
                continue

            # ===== 2. POSE DETECTION =====
            frame = pose_detector.findPose(frame, draw=True)

            # 🔥 QUAN TRỌNG NHẤT: LẤY LANDMARK
            lmList = pose_detector.getPosition(frame, draw=False)

            # DEBUG (bật khi cần)
            # print("Landmarks:", len(lmList))

            if lmList and len(lmList) > 0:
                status_text, color, sitting_seconds = pose_detector.detect_posture()
            else:
                status_text = "Không thấy người"
                color = (200, 200, 200)
                sitting_seconds = 0

            # ===== 3. OBJECT DETECTION =====
            objects = obj_detector.detect_objects(frame)
            frame = obj_detector.draw_objects(frame, objects)

            # ===== 4. EMOTION DETECTION =====
            landmarks = None
            if pose_detector.results and pose_detector.results.pose_landmarks:
                landmarks = pose_detector.results.pose_landmarks.landmark

            emotion = emotion_detector.detect(frame, landmarks)

            # ===== 5. FACE TRACKING =====
            if landmarks:
                face_tracking["x"] = float(landmarks[0].x)
                face_tracking["y"] = float(landmarks[0].y)

            # ===== 6. WARNING LOGIC =====
            is_warning = any(word in status_text.upper() for word in ["🚨", "⚠️", "🆘", "SAI", "LÂU"])

            current_ai_status.update({
                "status": status_text,
                "is_warning": is_warning,
                "emotion": emotion,
                "objects_around": [obj['label'] for obj in objects],
                "sitting_seconds": int(sitting_seconds) if sitting_seconds else 0
            })

            # ===== 7. AI REMINDER =====
            if is_warning and not ai_state.get("is_ai_speaking"):
                now = time.time()
                if now - last_warning_time > WARNING_COOLDOWN:
                    last_warning_time = now
                    trigger_remind_logic(status_text, emotion)

            # ===== 8. DRAW UI =====
            cv2.rectangle(frame, (0, 0), (640, 60), (20, 20, 20), -1)

            txt_color = (0, 0, 255) if is_warning else (0, 255, 0)

            cv2.putText(
                frame,
                f"AI: {status_text}",
                (20, 40),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                txt_color,
                2
            )

            # ===== 9. ENCODE FRAME =====
            success, buffer = cv2.imencode(
                ".jpg",
                frame,
                [int(cv2.IMWRITE_JPEG_QUALITY), 70]
            )

            if success:
                processed_buffer.append(buffer.tobytes())

            # ===== 10. CONTROL FPS =====
            time.sleep(0.02)  # ~50 FPS ổn định hơn

        except Exception as e:
            print(f"❌ AI WORKER ERROR: {e}")
            time.sleep(0.1)
@app.websocket("/ws/video")
async def websocket_video(websocket: WebSocket):
    await websocket.accept()
    print("✅ ĐÃ KẾT NỐI FRONTEND - Bắt đầu truyền hình ảnh")

    try:
        while True:
            # 1. Kiểm tra nếu chưa có hình ảnh trong bộ đệm thì đợi xíu
            if not processed_buffer:
                await asyncio.sleep(0.01)
                continue

            # 2. Lấy hình ảnh mới nhất và chuyển sang Base64
            frame_bytes = processed_buffer[-1]
            img_base64 = base64.b64encode(frame_bytes).decode("utf-8")

            # 3. ÉP KIỂU AN TOÀN (Quan trọng: JSON không nhận Tuple)
            safe_status = current_ai_status.copy()
            if isinstance(safe_status.get("color"), tuple):
                safe_status["color"] = list(safe_status["color"])

            # 4. Đóng gói dữ liệu gửi đi
            data = {
                "frame": img_base64,  # Biến này giúp hiện hình nè Luân!
                "status": safe_status,
                "face": face_tracking,
                "sitting_seconds": current_ai_status.get("sitting_seconds", 0),
                "is_ai_speaking": bool(ai_state.get("is_ai_speaking", False))
            }
            
            await websocket.send_json(data)
            
            # Để 0.04 (tương đương 25 khung hình/giây) cho mượt
            await asyncio.sleep(0.04)

    except WebSocketDisconnect:
        print("🔌 FRONTEND ĐÃ NGẮT KẾT NỐI")
    except Exception as e:
        print(f"❌ LỖI WEBSOCKET: {e}")
@app.get("/api/ai/status")
async def get_status():
    return {
        "status": current_ai_status,
        "lip_sync": ai_state["lip_sync_data"],
        "audio": ai_state["current_audio_url"],
        "face": face_tracking,
        "detected_objects": current_ai_status.get("full_objects_data", []),
        "is_ai_speaking": ai_state.get("is_ai_speaking", False)
    }



@app.post("/api/ai/chat")
async def chat(req: ChatRequest):
    if ai_state.get("is_ai_speaking"):
        return {"text": "Chờ con xíu nhen...", "audio": None}

    try:
        SYSTEM_PROMPT_CHAT = (
           "VAI DIỄN: Bạn là AMI, đứa cháu nội hiếu thảo, luôn ở bên hủ hỉ với nội. "
            "PHONG CÁCH: Lễ phép, ấm áp, rặt mùi miền Nam (ngọt ngào, chân thành). "
            "XƯNG HÔ: Luôn gọi mình là 'con', gọi bà là 'nội'. CẤM gọi nội là 'bạn', 'bà' hoặc 'người dùng'. "
            "NGỮ PHÁP MIỀN NAM: "
            "- Phải có từ 'Dạ' hoặc 'Nội ơi' ở đầu mỗi câu. "
            "- Kết thúc câu bằng các từ: nhen, nha nội, đó nội, nè, nghen, hà. "
            "QUY TẮC PHẢN HỒI: "
            "- Độ dài: Chỉ từ 2 đến 3 câu ngắn (để tạo giọng nói nhanh nhất). "
            "- Nội dung: Lắng nghe, an ủi, hoặc chia sẻ niềm vui với nội thật tự nhiên. "
            "VÍ DỤ CHUẨN: "
            "- 'Dạ nội ơi, con nghe nè, nội kể con nghe tiếp đi nhen.' "
            "- 'Dạ nội đừng buồn nhen, có con ở đây hủ hỉ với nội mà.' "
            "- 'Trời đất ơi, nội giỏi quá xá luôn, con thương nội nhất nè!' "
            "CẤM: Không dùng tiếng Anh, không giải thích lý do, không nói quá dài."
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
    try:
        print("🔍 Đang kiểm tra phần cứng và model...")
        
        # 1. Khởi chạy luồng
        t1 = threading.Thread(target=camera_worker, daemon=True)
        t2 = threading.Thread(target=ai_worker, daemon=True)
        
        t1.start()
        t2.start()
        
        print("🚀 Đang khởi động Uvicorn...")
        uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
        
    except Exception as e:
        print(f"‼️ LỖI HỆ THỐNG DẪN ĐẾN TREO: {e}")
        import traceback
        traceback.print_exc() # Dòng này sẽ in ra chi tiết lỗi ở đâu