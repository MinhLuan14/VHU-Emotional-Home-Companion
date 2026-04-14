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
import requests
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
import traceback
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
MEMORY_DIR = os.path.join(BASE_DIR, "memory")
if not os.path.exists(MEMORY_DIR):
    os.makedirs(MEMORY_DIR, exist_ok=True)

CONFIG_PATH = os.path.join(MEMORY_DIR, "config.json")
VOICE_PROFILE_PATH = os.path.join(BASE_DIR, "processed", "nguoi_than_v2_xpxv93QJWtOWk30f", "se.pth")
import json
buffer_lock = threading.Lock()
MEMORY_DIR = os.path.join(BASE_DIR, "memory")
os.makedirs(MEMORY_DIR, exist_ok=True)

EVENTS_PATH = os.path.join(MEMORY_DIR, "events.json")
STATS_PATH  = os.path.join(MEMORY_DIR, "stats.json")
CONFIG_PATH = os.path.join(MEMORY_DIR, "config.json")
last_log_time = 0
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
# ================== MEMORY IO ==================
def load_json(path, default):
    if not os.path.exists(path):
        return default
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print("⚠️ load_json lỗi:", e)
        return default


def save_json(path, data):
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print("⚠️ save_json lỗi:", e)
        # ================== MEMORY LOG ==================
def log_event(context):
    events = load_json(EVENTS_PATH, [])

    event = {
        "time": time.strftime("%H:%M:%S", time.localtime()), # Lưu dạng giờ cho dễ đọc
        "status": context.get("status"),
        "emotion": context.get("emotion"),
        "sitting_seconds": int(context.get("sitting_seconds", 0))
    }

    events.append(event)
    events = events[-100:] 

    save_json(EVENTS_PATH, events)
def update_adaptive_threshold():
    stats = load_stats()
    cfg = load_config()

    sitting_times = stats.get("sitting_durations", [])

    if len(sitting_times) < 5:
        return  # chưa đủ data

    avg_time = sum(sitting_times) / len(sitting_times)

    # 👉 AI học theo nội
    new_threshold = int(avg_time * 1.2)

    # clamp để tránh điên
    new_threshold = max(30, min(new_threshold, 600))

    cfg["sitting_threshold"] = new_threshold

    save_config(cfg)

    print(f"🧠 Updated threshold: {new_threshold}s")
def load_config():
    default_config = {"sitting_threshold": 60}
    # Nếu file không tồn tại, tạo luôn file mới với giá trị mặc định
    if not os.path.exists(CONFIG_PATH):
        save_json(CONFIG_PATH, default_config)
        print(f"📦 Đã khởi tạo file cấu hình mới tại: {CONFIG_PATH}")
        return default_config
    
    return load_json(CONFIG_PATH, default_config)

def save_config(cfg):
    save_json(CONFIG_PATH, cfg)

def load_stats():
    return load_json(STATS_PATH, {
        "sitting_durations": []
    })
def update_stats(context):
    stats = load_stats()

    if context.get("sitting_seconds", 0) > 5:
        stats.setdefault("sitting_durations", []).append(context["sitting_seconds"])

    # giữ tối đa 100 mẫu
    stats["sitting_durations"] = stats["sitting_durations"][-100:]

    save_json(STATS_PATH, stats)
# ================== WRAPPER ĐỂ GỌI WORKER ==================
def start_voice_thread(text: str):
    if ai_state.get("is_ai_speaking"):
        return

    ai_state["is_ai_speaking"] = True

    def safe_worker():
        try:
            play_voice_worker(text, openvoice_engine, AUDIO_DIR, audio_lock, ai_state)
        except Exception as e:
            print("❌ Voice Error:", e)
        finally:
            ai_state["is_ai_speaking"] = False  # 🔥 QUAN TRỌNG

    threading.Thread(target=safe_worker, daemon=True).start()

# ================== LOGIC NHẮC NHỞ ==================
def get_recent_memory(limit=5):
    """Đọc dữ liệu từ events.json để Ami biết nãy giờ nội làm gì"""
    events = load_json(EVENTS_PATH, [])
    if not events:
        return "Nội vừa mới bắt đầu sinh hoạt."
    
    # Lấy n sự kiện gần nhất
    recent = events[-limit:]
    memory_str = "Nhật ký gần đây:\n"
    for e in recent:
        memory_str += f"- Lúc {e['time']}: Nội {e['status']} với cảm xúc {e['emotion']}.\n"
    return memory_str

def trigger_remind_logic(status_text, emotion, objects=None, history_context=""):
    if ai_state.get("is_ai_speaking"):
        return

    try:
        # Lấy trí nhớ thực tế từ file
        actual_memory = get_recent_memory(5)
        
        object_names = [obj.get("name") for obj in objects if isinstance(obj, dict)] if objects else []
        object_text = ", ".join(object_names) if object_names else "Không có đồ vật đặc biệt"

        # SYSTEM PROMPT "SIÊU CẤP" (Tối ưu từ bản trước của Luân)
        SYSTEM_PROMPT = (
            "VAI DIỄN: Ami, cháu nội miền Nam hiếu thảo. "
            "TRÍ NHỚ: Bạn biết rõ lịch sử sinh hoạt của nội để tâm sự, không chỉ nhìn hiện tại.\n\n"
            
            "DỮ LIỆU HIỆN TẠI:\n"
            f"- Tư thế: {status_text}\n"
            f"- Cảm xúc: {emotion}\n"
            f"- Đồ vật: {object_text}\n\n"
            
            "TRÍ NHỚ GẦN ĐÂY:\n"
            f"{actual_memory}\n\n"

            "CHIẾN THUẬT TÂM LÝ:\n"
            "- Nếu nội vừa mới đổi tư thế (ví dụ từ ngồi sang đứng): Hãy khích lệ nội.\n"
            "- Nếu nội duy trì một trạng thái quá lâu: Hãy nhắc nội đổi tư thế nhẹ nhàng.\n"
            "- Tuyệt đối dùng giọng miền Nam (Dạ, nhen, nghen, nha nội, hà, quá xá).\n"
            "- Trả về DUY NHẤT 1 câu hủ hỉ dưới 25 từ."
        )

        completion = client_groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "system", "content": SYSTEM_PROMPT}],
            max_tokens=60,
            temperature=0.7
        )

        text = completion.choices[0].message.content.strip().replace('"', '')
        if text:
            start_voice_thread(text)
            # Lưu lại câu Ami vừa nói vào lịch sử để không bị lặp
            log_event({"status": f"Ami nói: {text}", "emotion": "Happy", "sitting_seconds": 0})

    except Exception as e:
        print(f"❌ Lỗi Brain-Remind: {e}")
last_sent_status = "" # Biến toàn cục để theo dõi

def should_remind(context, ai_state):
    global last_sent_status
    status = context.get("status", "")
    sitting_seconds = context.get("sitting_seconds", 0)
    
    # Nếu là Ngã (Fall) - Ưu tiên cao nhất, bỏ qua cooldown
    if "NGÃ" in status.upper() or "FALL" in status.upper():
        return True

    # Tránh nhắc lại cùng một trạng thái trong thời gian ngắn
    if status == last_sent_status and sitting_seconds < 120: 
        return False
    
    # Logic thời gian ngồi (dựa trên config động của Luân)
    cfg = load_config()
    if sitting_seconds > cfg.get("sitting_threshold", 60):
        last_sent_status = status
        return True
        
    return False
def sync_to_java(payload):
    try:
        java_url = "http://localhost:8080/api/ami/process"
        requests.post(java_url, json=payload, timeout=1)
    except:
        pass # Tránh làm sập app Python nếu Java chưa bật
# ================== VIDEO PROCESSOR ==================
def camera_worker():
    global cap, running
    running = True
    print("📷 Camera Worker started")

    while running:
        try:
            if cap is None or not cap.isOpened():
                print("⚠️ Camera mất kết nối, retry...")
                cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
                time.sleep(1)
                continue

            ret, frame = cap.read()
            if not ret:
                continue

            with buffer_lock:
                raw_buffer.append(frame)

            time.sleep(0.01)

        except Exception as e:
            print("❌ Camera Worker Error:", e)
            time.sleep(1)

last_log_time = 0

def ai_worker():
    global last_log_time, last_warning_time

    print("🧠 AI Worker running...")

    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    )

    while True:
        try:
            now = time.time()
            if now - last_log_time > 10:
                update_adaptive_threshold()
                last_log_time = now
            with buffer_lock:
                if not raw_buffer:
                    time.sleep(0.01)
                    continue
                frame = raw_buffer[-1].copy()

            h, w, _ = frame.shape

            # ===== POSE =====
            frame = pose_detector.findPose(frame, draw=True)
            lmList = pose_detector.getPosition(frame)

            status_text = "Đang quét..."
            pose_ctx = {}
            sitting_seconds = 0

            if lmList:
                status_text, color, sitting_seconds, pose_ctx = pose_detector.detect_posture(frame)
            else:
                status_text = "Không thấy người"

            # ===== EMOTION =====
            emotion = "neutral"
            try:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                faces = face_cascade.detectMultiScale(gray, 1.3, 5)

                if len(faces) > 0:
                    x, y, fw, fh = faces[0]
                    face_img = frame[y:y+fh, x:x+fw]
                    emotion = emotion_detector.detect_posture(face_img, None)

            except Exception as e:
                print("Emotion error:", e)

            if not isinstance(emotion, str):
                emotion = "neutral"

            # ===== OBJECT =====
            try:
                objects, obj_context = obj_detector.detect_objects(frame)
                frame = obj_detector.draw_objects(frame, objects, obj_context)
            except:
                objects = []

            # ===== BRAIN =====
            final_status, brain_context = brain.process_frame(
                pose_ctx=pose_ctx if isinstance(pose_ctx, dict) else {},
                objects=objects,
                emotion=emotion
            )

            display_status = final_status if isinstance(final_status, str) else status_text

            # ===== UPDATE UI =====
            current_ai_status.update({
                "status": display_status,
                "emotion": emotion,
                "is_warning": any(k in display_status.upper() for k in ["NGUY HIEM", "NGA", "SAI", "⚠️"]),
                "sitting_seconds": int(sitting_seconds),
                "full_objects_data": objects
            })

            # ===== FACE TRACK =====
            if lmList:
                face_tracking["x"] = float(lmList[0][1] / w) - 0.5
                face_tracking["y"] = float(lmList[0][2] / h) - 0.5

           # ===== LOGIC GHI LOG ĐỊNH KỲ (GOM VÀO TRONG IF) =====
            # 1. KHỞI TẠO CONTEXT LUÔN LUÔN (Đưa ra ngoài mọi câu lệnh IF)
            context = {
                "status": display_status,
                "emotion": emotion,
                "objects": objects,
                "sitting_seconds": sitting_seconds,
                "pose": pose_ctx
            }

            # 2. LOGIC GHI LOG ĐỊNH KỲ (Chỉ dùng context để ghi file mỗi 10s)
            # Trong hàm ai_worker của Python
            now = time.time()
            if now - last_log_time > 10: 
                try:
                    java_url = "http://localhost:8080/api/ami/process"
                    
                    # Payload phải có đầy đủ userId và đúng tên trường Java cần
                    payload = {
                        "userId": "user_01", # Luân nhớ thêm cái này
                        "status": display_status, # Sẽ map vào posture nhờ @JsonProperty
                        "sitting_seconds": int(sitting_seconds), # Sẽ map vào sittingSeconds
                        "emotion": emotion,
                        "warning": current_ai_status["is_warning"]
                    }
                    
                    threading.Thread(target=sync_to_java, args=(payload,), daemon=True).start()
                    print(f"📡 Java Status: {response.status_code}")
                    
                except Exception as e:
                    print(f"❌ Lỗi đẩy dữ liệu: {e}")
                log_event(context)
                update_stats(context)
                last_log_time = now 
                print(f"📝 Đã lưu log định kỳ (Sitting: {sitting_seconds}s)")

            # 3. LOGIC NHẮC NHỞ (Bây giờ context đã luôn tồn tại nên không sợ lỗi nữa)
            if should_remind(context, ai_state):
                now_remind = time.time()
                if now_remind - last_warning_time > WARNING_COOLDOWN:
                    last_warning_time = now_remind
                    history = brain_context.get("description", "") if isinstance(brain_context, dict) else ""

                    threading.Thread(
                        target=trigger_remind_logic,
                        args=(display_status, emotion, objects, history),
                        daemon=True
                    ).start()
            # ===== ENCODE =====
            success, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
            if success:
                with buffer_lock:
                    processed_buffer.append(buffer.tobytes())

            time.sleep(0.03)

        except Exception as e:
            print("❌ AI WORKER ERROR:", e)
            traceback.print_exc()
            time.sleep(0.2)



@app.websocket("/ws/video")
async def websocket_video(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            if not processed_buffer:
                await asyncio.sleep(0.01)
                continue

            with buffer_lock:
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
    print("🧹 Cleaning...")

    running = False

    try:
        if cap:
            cap.release()
        pygame.mixer.quit()
        cv2.destroyAllWindows()
    except:
        pass

    print("✅ Done shutdown")
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