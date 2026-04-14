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
import inspect
print(inspect.getfile(PoseDetector))
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
def trigger_remind_logic(status_text, emotion, objects=None, history_context=""):
    if ai_state.get("is_ai_speaking"):
        return

    try:
        # ==== 1. XỬ LÝ OBJECT ====
        object_names = []
        if objects and isinstance(objects, list):
            for obj in objects:
                if isinstance(obj, dict) and "name" in obj:
                    object_names.append(obj["name"])

        object_text = ", ".join(object_names) if object_names else "không rõ"

        # ==== 2. SYSTEM PROMPT (NÂNG CẤP) ====
        SYSTEM_PROMPT = (
            "Bạn là Ami, cháu nội hiếu thảo ở miền Nam.\n"
            "Nhiệm vụ: Nhắc nhở nội dựa trên tư thế, cảm xúc và đồ vật xung quanh.\n"
            f"Bối cảnh gần đây: {history_context}.\n"

            "LUẬT:\n"
            "- Nói tự nhiên như cháu với nội.\n"
            "- Câu NGẮN (1-2 câu).\n"
            "- Có từ miền Nam: dạ, nhen, nha nội.\n"
            "- Nếu thấy đồ vật → nhắc cụ thể.\n"

            "VÍ DỤ:\n"
            "- Ngồi lâu + điện thoại → nhắc nghỉ mắt\n"
            "- Ngồi lâu + TV → nhắc đứng dậy vận động\n"
            "- Té → hỏi có sao không ngay lập tức\n"
        )

        # ==== 3. USER PROMPT ====
        prompt = (
            f"Trạng thái: {status_text}\n"
            f"Cảm xúc: {emotion}\n"
            f"Đồ vật xung quanh: {object_text}"
        )

        # ==== 4. CALL LLM ====
        completion = client_groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            max_tokens=60,
            temperature=0.7
        )

        text = completion.choices[0].message.content.strip().replace('"', '')

        if text:
            start_voice_thread(text)

    except Exception as e:
        print(f"❌ Lỗi Brain-Remind: {e}")
# ================== VIDEO PROCESSOR ==================
def camera_worker():
    """Luồng 1: Chỉ đọc frame thô từ phần cứng, cực nhẹ."""
    global cap, running
    running = True
    print("📷 Camera Worker: Đang bắt đầu luồng đọc dữ liệu...")
    
    while running:
        if cap is None or not cap.isOpened():
            time.sleep(1)
            continue

        ret, frame = cap.read()
        if not ret: 
            continue

        # Đẩy frame thô vào bộ đệm. Chỉ giữ lại 2 frame mới nhất để tránh trễ (latency)
        raw_buffer.append(frame)
        
        # Nghỉ cực ngắn để không chiếm dụng 100% CPU của luồng này
        time.sleep(0.01)

def ai_worker():
    global last_warning_time

    print("🧠 AI Worker running...")

    # load face detector 1 lần
    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    )

    while True:
        try:
            if not raw_buffer:
                time.sleep(0.01)
                continue

            frame = raw_buffer[-1].copy()
            h, w, _ = frame.shape

           # ================== 1. POSE ==================
            frame = pose_detector.findPose(frame, draw=True)
            lmList = pose_detector.getPosition(frame)

            status_text = "Đang quét..."
            pose_ctx = {}
            sitting_seconds = 0

            if lmList and len(lmList) > 0:
                status_text, color, sitting_seconds, pose_ctx = pose_detector.detect_posture(frame)
            else:
                status_text = "Không thấy người"
                pose_ctx = {}

            # ================== 2. EMOTION ==================
            emotion = "neutral"

            try:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                faces = face_cascade.detectMultiScale(gray, 1.3, 5)

                if len(faces) > 0:
                    x, y, fw, fh = faces[0]
                    face_img = frame[y:y+fh, x:x+fw]

                    emotion = emotion_detector.detect_posture(face_img, None)

                    #cv2.rectangle(frame, (x, y), (x+fw, y+fh), (255, 0, 0), 2)

            except Exception as e:
                print("Emotion error:", e)
                emotion = "neutral"

            # đảm bảo string
            if not isinstance(emotion, str):
                emotion = "neutral"

            # ================== 3. OBJECT ==================
            try:
                objects, obj_context = obj_detector.detect_objects(frame)
                frame = obj_detector.draw_objects(frame, objects, obj_context)
            except:
                objects = []

            # ================== 4. BRAIN ==================
            if not isinstance(pose_ctx, dict):
                pose_ctx = {}

            final_status, brain_context = brain.process_frame(
                pose_ctx=pose_ctx,
                objects=objects,
                emotion=emotion
            )

            display_status = final_status if isinstance(final_status, str) else status_text

            # ================== 5. UPDATE UI ==================
            current_ai_status.update({
                "status": display_status,
                "emotion": emotion,
                "is_warning": any(k in display_status.upper() for k in ["NGUY HIEM", "NGA", "SAI", "⚠️"]),
                "sitting_seconds": int(sitting_seconds),
                "full_objects_data": objects
            })

            # ================== 6. FACE TRACK ==================
            if lmList:
                face_tracking["x"] = float(lmList[0][1] / w) - 0.5
                face_tracking["y"] = float(lmList[0][2] / h) - 0.5

            # ================== 7. VOICE ==================
            if current_ai_status["is_warning"] and not ai_state["is_ai_speaking"]:
                now = time.time()
                if now - last_warning_time > WARNING_COOLDOWN:
                    last_warning_time = now

                    history = brain_context.get("description", "") if isinstance(brain_context, dict) else ""

                    threading.Thread(
                        target=trigger_remind_logic,
                        args=(display_status, emotion, objects, history),
                        daemon=True
                    ).start()

            # ================== 8. ENCODE ==================
            success, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
            if success:
                processed_buffer.append(buffer.tobytes())

            time.sleep(0.03)

        except Exception as e:
            print("❌ AI WORKER ERROR:", e)
            import traceback
            traceback.print_exc()
            time.sleep(0.1)
@app.websocket("/ws/video")
async def websocket_video(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            if not processed_buffer:
                await asyncio.sleep(0.01)
                continue

            frame_bytes = processed_buffer[-1]
            img_base64 = base64.b64encode(frame_bytes).decode("utf-8")

            # Tạo bản copy an toàn cho JSON
            data = {
                "frame": img_base64,
                "status": {
                    "text": str(current_ai_status.get("status", "Đang kết nối...")),
                    "emotion": str(current_ai_status.get("emotion", "Bình thường")),
                    "is_warning": bool(current_ai_status.get("is_warning", False)),
                    "sitting_seconds": int(current_ai_status.get("sitting_seconds", 0))
                },
                "face": face_tracking,
                "is_ai_speaking": bool(ai_state.get("is_ai_speaking", False))
            }
            
            await websocket.send_json(data)
            await asyncio.sleep(0.04)
    except Exception as e:
        print(f"Websocket closed: {e}")
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
@app.on_event("shutdown")
def shutdown_event():
    global running, cap
    print("🧹 Đang dọn dẹp tài nguyên...")
    running = False  # Dừng các vòng lặp while
    
    if cap is not None:
        cap.release()
        print("📷 Camera đã giải phóng.")
        
    pygame.mixer.quit() # Đóng bộ trộn âm thanh
    cv2.destroyAllWindows()
    print("✅ Hệ thống đã tắt an toàn.")
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