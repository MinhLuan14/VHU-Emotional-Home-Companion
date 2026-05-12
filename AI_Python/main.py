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
from brain_module.vector_memory import VectorMemory
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
running = True # Khai báo để các hàm khác nhìn thấy
cap_lock = threading.Lock() # Khóa để Camera và AI không giành giật nhau
last_threshold_update = 0 # Tách riêng thời gian update threshold
last_java_sync_time = 0 # Tách riêng thời gian gửi Java
# Sửa dòng này (khoảng dòng 60)
cap = cv2.VideoCapture(0, cv2.CAP_DSHOW) 
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

if not cap.isOpened():
    print("❌ LỖI: Backend không thể kết nối với Camera vật lý!")
    
pose_detector = PoseDetector()
emotion_detector = EmotionDetector()
class EventEngine:
    def __init__(self):
        self.prev_state = {
            "status": None,
            "is_falling": False,
            "is_sitting": False
        }
        self.last_event_time = {}

    def detect_event(self, context):
        events = []

        status = context.get("status", "")
        if "Ami nói" in status:
            return []
        pose = context.get("pose", {})

        is_falling = pose.get("is_falling", False)
        is_sitting = pose.get("is_sitting", False)

        now = time.time()

        # ===== EVENT 1: FALL =====
        if is_falling and not self.prev_state["is_falling"]:
            events.append("FALL_DETECTED")

        # ===== EVENT 2: SIT TOO LONG =====
        sitting_seconds = context.get("sitting_seconds", 0)
        if is_sitting and sitting_seconds > 60:
            last = self.last_event_time.get("SIT_TOO_LONG", 0)
            if now - last > 300:
                events.append("SIT_TOO_LONG")
                self.last_event_time["SIT_TOO_LONG"] = now

        # ===== EVENT 3: STATE CHANGE =====
        if status != self.prev_state["status"]:
            events.append("STATE_CHANGED")

        # ===== UPDATE STATE =====
        self.prev_state = {
            "status": status,
            "is_falling": is_falling,
            "is_sitting": is_sitting
        }

        return events
obj_detector = ObjectDetector()
event_engine = EventEngine()
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
    events = load_json(EVENTS_PATH, [])
    if not events: return "Nội đang bắt đầu ngày mới."
    
    recent = events[-limit:]
    memory_str = ""
    for e in recent:
        # CHỈ lấy những sự kiện KHÔNG phải do Ami nói để tránh lặp lại logic sai
        if "Ami nói" not in e['status']:
            memory_str += f"- {e['time']}: Nội {e['status']} ({e['emotion']}). "
    return memory_str

last_sent_status = ""
last_remind_time = 0
start_app_time = time.time()

REMIND_INTERVAL = 30   # giây giữa các lần nói
STATUS_COOLDOWN = 5    # giây nếu cùng trạng thái
START_DELAY = 5        # delay khi mới mở app
long_term_memory = VectorMemory(max_memory=1000)

def trigger_remind_logic(status_text, emotion, objects=None, history_context="",event_type=None):
    global last_sent_status, last_remind_time
    # ===== 1. BLOCK khi AI đang nói =====
    if ai_state.get("is_ai_speaking"):
        return
    current_time = time.time()
    # ===== 2. Tránh nói ngay khi mở app =====
    if current_time - start_app_time < START_DELAY:
        return
    # ===== 3. Cooldown thời gian =====
    if current_time - last_remind_time < REMIND_INTERVAL:
        return
    # ===== 4. Tránh lặp trạng thái =====
    if status_text == last_sent_status:
        if current_time - last_remind_time < STATUS_COOLDOWN:
            return
    try:
        # ===== MEMORY =====
        actual_memory = get_recent_memory(5)

        # ===== OBJECT =====
        object_names = []
        if objects:
            for obj in objects:
                if isinstance(obj, dict):
                    name = obj.get("name")
                    if name:
                        object_names.append(str(name))

        object_text = ", ".join(object_names) if object_names else "Không có đồ vật đặc biệt"
        status_text = str(status_text) if status_text else "đang hoạt động"
        emotion = str(emotion) if emotion else "bình thường"
        actual_memory = str(actual_memory) if actual_memory else "..."
        query = f"Nội đang {status_text} và {event_type}"
        similar_past_events = long_term_memory.search(query, k=2, threshold=0.6)
        
        past_texts = [res['text'] for res in similar_past_events]
        past_context = " | ".join(past_texts) if past_texts else "Chưa có dữ liệu tương tự."
        # Trong hàm trigger_remind_logic
        SYSTEM_PROMPT = (
            f"VAI DIỄN: Ami, cháu nội miền Nam hiếu thảo.\n"
            f"NGỮ CẢNH HIỆN TẠI: Nội đang {status_text}, cảm xúc {emotion}. Sự kiện: {event_type}.\n"
            f"NHẬT KÝ BRAIN: {history_context}\n"
            f"CON ĐÃ NÓI GÌ TRƯỚC ĐÓ: {past_context}\n\n"
            f"VẬT THỂ THẤY ĐƯỢC: {object_text}.\n"
            f"NHIỆM VỤ:\n"
            f"1. Nếu {event_type} là 'SIT_TOO_LONG', hãy khuyên nội đứng dậy đi lại cho khỏe chân nhen.\n"
            f"2. Nếu {event_type} là 'FALL_DETECTED', phải hỏi thăm thật lòng: 'Nội ơi nội có sao không nội?'.\n"
            f"3. TUYỆT ĐỐI KHÔNG lặp lại ý hệt những câu trong mục 'CON ĐÃ NÓI GÌ TRƯỚC ĐÓ'.\n"
            f"4. Văn phong: Ngọt ngào, dùng từ: nhen, nha nội, đó nội, nghen.\n"
            f"5. CHỈ 1 CÂU DUY NHẤT (< 20 từ)."
        )

        # ===== CALL GROQ =====
        completion = client_groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "system", "content": SYSTEM_PROMPT}],
            max_tokens=60,
            temperature=0.7
        )

        text = completion.choices[0].message.content.strip().replace('"', '')

        if text:
            start_voice_thread(text)
            
            # 🔥 LƯU VÀO VECTOR MEMORY ĐỂ LẦN SAU KHÔNG LẶP LẠI
            memory_entry = f"Ami nhắc nội {event_type}: {text}"
            long_term_memory.add(memory_entry)
            
            # Lưu vào events.json như cũ để xem log
            log_event({"status": f"Ami nói: {text}", "emotion": "Ami_Speaking"})

    except Exception as e:
        print(f"❌ Lỗi Brain-Remind: {e}")
last_sent_status = "" # Biến toàn cục để theo dõi
last_remind_time = 0
start_app_time = time.time() # Thêm biến này ở đầu file main.py

def should_remind(context, ai_state):
    global last_sent_status, last_remind_time
    
    # 1. Lấy dữ liệu thô từ máy quét (Pose), KHÔNG lấy câu nói của Ami
    # Giả sử Luân lưu status máy quét vào một biến riêng, hoặc lọc chữ "Ami nói"
    status = context.get("status", "")
    if "Ami nói" in status: 
        return False # Tuyệt đối không nhắc dựa trên câu nói của Robot

    sitting_seconds = context.get("sitting_seconds", 0)
    now = time.time()
    cfg = load_config()
    threshold = cfg.get("sitting_threshold", 60)

    # 2. KIỂM TRA NGÃ (Phải là status từ PoseDetector)
    # Chỉ báo ngã nếu Pose thật sự trả về chữ NGÃ
    if "NGÃ" in status.upper() and sitting_seconds >= 0:
        if now - last_remind_time > 15:
            last_remind_time = now
            return True
        return False

    # 3. KIỂM TRA NGỒI LÂU (Bắt buộc sitting_seconds phải lớn hơn ngưỡng)
    # Luân thêm điều kiện sitting_seconds > threshold để chặn đứng vụ 0s
    if "NGỒI" in status.upper() and sitting_seconds > threshold and threshold > 0:
        if now - last_remind_time > 300: # 5 phút nhắc 1 lần thôi nhen
            last_remind_time = now
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
            with cap_lock:
                if cap is None or not cap.isOpened():
                    print("⚠️ Camera mất kết nối, retry...")
                    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
                    time.sleep(2)
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
    # Sử dụng các biến global mới đã tách biệt
    global last_threshold_update, last_java_sync_time, last_warning_time 

    print("🧠 AI Worker running...")
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

    while True:
        try:
            now = time.time()
            
            # 1. LẤY FRAME TỪ BUFFER (Dùng copy() để tránh xung đột luồng)
            with buffer_lock:
                if not raw_buffer:
                    time.sleep(0.01)
                    continue
                frame = raw_buffer[-1].copy()

            h, w, _ = frame.shape

            # 2. XỬ LÝ POSE & SITTING TIME
            frame = pose_detector.findPose(frame, draw=True)
            lmList = pose_detector.getPosition(frame)
            pose_ctx = {}
            sitting_seconds = 0
            if lmList:
                status_text, color, sitting_seconds, pose_ctx = pose_detector.detect_posture(frame)
            else:
                status_text = "Không thấy người"

            # 3. XỬ LÝ EMOTION (Sửa lại tên hàm cho đúng thực tế module)
            emotion = "neutral"
            try:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                faces = face_cascade.detectMultiScale(gray, 1.3, 5)
                if len(faces) > 0:
                    x, y, fw, fh = faces[0]
                    face_img = frame[y:y+fh, x:x+fw]
                    # Lưu ý: Kiểm tra lại file emotion_detector.py xem là detect_posture hay detect_emotion nhen
                    emotion = emotion_detector.detect_posture(face_img, None)
            except Exception as e:
                print("Emotion error:", e)

            # 4. XỬ LÝ OBJECTS
            try:
                objects, obj_context = obj_detector.detect_objects(frame)
                frame = obj_detector.draw_objects(frame, objects, obj_context)
            except:
                objects = []

            # 5. BRAIN ENGINE (Xử lý ngữ cảnh tổng hợp)
            final_status, brain_context = brain.process_frame(
                pose_ctx=pose_ctx if isinstance(pose_ctx, dict) else {},
                objects=objects,
                emotion=emotion
            )
            display_status = final_status if isinstance(final_status, str) else status_text

            # 6. CẬP NHẬT TRẠNG THÁI UI
            current_ai_status.update({
                "status": display_status,
                "emotion": emotion,
                "is_warning": any(k in display_status.upper() for k in ["NGUY HIEM", "NGA", "SAI", "⚠️"]),
                "sitting_seconds": int(sitting_seconds),
                "full_objects_data": objects
            })

            # 7. LOGIC ĐỒNG BỘ DATA (TÁCH BIỆT THỜI GIAN)
            context = {
                "status": display_status, "emotion": emotion,
                "objects": objects, "sitting_seconds": sitting_seconds, "pose": pose_ctx
            }

            # --- Nhánh 1: Cập nhật ngưỡng AI học (Mỗi 10s) ---
            if now - last_threshold_update > 10:
                last_threshold_update = now
                update_adaptive_threshold()

            # --- Nhánh 2: Gửi data lên Java & Ghi log file (Mỗi 10s) ---
            if now - last_java_sync_time > 10:
                last_java_sync_time = now # Update ngay để tránh thread trùng lặp
                
                payload = {
                    "userId": "user_01",
                    "status": str(display_status), 
                    "sitting_seconds": int(sitting_seconds), 
                    "emotion": str(emotion),
                    "warning": bool(current_ai_status["is_warning"])
                }

                def safe_sync(p):
                    try:
                        requests.post("http://localhost:8080/api/ami/process", json=p, timeout=2)
                    except: pass

                threading.Thread(target=safe_sync, args=(payload,), daemon=True).start()
                log_event(context)
                update_stats(context)
                print(f"📝 Sync & Log success (Sitting: {sitting_seconds}s)")

            # 8. LOGIC NHẮC NHỞ (Chỉ chạy khi có sự kiện thực sự)
            events = event_engine.detect_event(context)
            history = brain_context.get("description", "") if isinstance(brain_context, dict) else ""
            for event in events:
                threading.Thread(
                    target=trigger_remind_logic,
                    args=(display_status, emotion, objects, history, event), 
                    daemon=True
                ).start()

            # 9. ĐẨY FRAME ĐÃ XỬ LÝ RA KÊNH HIỂN THỊ
            success, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
            if success:
                with buffer_lock:
                    processed_buffer.append(buffer.tobytes())

            time.sleep(0.03)

        except Exception as e:
            print("❌ AI WORKER ERROR:", e)
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