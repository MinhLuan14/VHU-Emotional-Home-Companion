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
from collections import deque, Counter
# Module AI/Voice/Vision
from OpenVoice.voice_service import EmotionalVoice
from vision_module.pose_detector import PoseDetector
from vision_module.emotion_detector import EmotionDetector
from vision_module.object_detector import ObjectDetector
from vision_module.hand_detector import HandDetector
from lip_sync_generator import generate_lip_sync 
from brain_module.context_engine import ContextEngine
from brain_module.vector_memory import VectorMemory
from queue import Queue
sync_queue = Queue(maxsize=100)
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
voice_thread_lock = threading.Lock()
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
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

if not cap.isOpened():
    print("❌ LỖI: Backend không thể kết nối với Camera vật lý!")
    
pose_detector = PoseDetector()
emotion_detector = EmotionDetector()
hand_detector = HandDetector()
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
        if "Ami nói" in status: return []
        
        pose = context.get("posture", {})
        is_falling = pose.get("is_falling", False)
        is_sitting = pose.get("is_sitting", False)
        risk_level = pose.get("risk_level", "") # Lấy risk_level từ PoseDetector

        now = time.time()

        # ===== EVENT 1: FALL =====
        if is_falling:
            events.append("FALL_DETECTED")

        # ===== EVENT 2: SIT TOO LONG =====
        sitting_seconds = context.get("sitting_seconds", 0)
        if is_sitting and sitting_seconds > 1800: # Ví dụ 30 phút
            events.append("SIT_TOO_LONG")

        # ===== EVENT 3: BAD POSTURE (THÊM DÒNG NÀY) =====
        if risk_level == "WARNING" and "NGỒI SAI TƯ THẾ" in status:
            # Cooldown để tránh Ami nhắc liên tục gây khó chịu (45 giây)
            last = self.last_event_time.get("BAD_POSTURE", 0)
            if now - last > 45: 
                events.append("BAD_POSTURE")
                self.last_event_time["BAD_POSTURE"] = now

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
LAST_POSTURE_WARNING = 0
POSTURE_WARNING_COOLDOWN = 45
class ChatRequest(BaseModel):
    user_input: str
def sync_worker():
    print("📡 Sync Worker started")

    while True:
        try:
            payload = sync_queue.get()

            if payload is None:
                continue

            requests.post(
                "http://localhost:8080/api/ami/process",
                json=payload,
                timeout=2
            )

        except Exception as e:
            print("❌ Sync error:", e)
# ================== MEMORY IO ==================
def save_json(path, data):
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
    except Exception as e:
        print(f"❌ LỖI GHI FILE {os.path.basename(path)}: {e}")

def load_json(path, default):
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        return default
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"⚠️ LỖI ĐỌC FILE {os.path.basename(path)}: {e}")
        return default
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
    stats["sitting_durations"] = stats["sitting_durations"][-100:]
    save_json(STATS_PATH, stats)
    if len(stats["sitting_durations"]) % 10 == 0:
        update_adaptive_threshold()
# ================== WRAPPER ĐỂ GỌI WORKER ==================
def start_voice_thread(text: str):
    update_user_activity()
    with voice_thread_lock:

        # CHẶN DOUBLE
        if ai_state.get("is_ai_speaking", False):
            print("🛑 AI đang nói, bỏ qua request mới")
            return

        ai_state["is_ai_speaking"] = True

    def safe_worker():
        try:
            print(f"🗣️ AI Speaking: {text}")

            play_voice_worker(
                text,
                openvoice_engine,
                AUDIO_DIR,
                audio_lock,
                ai_state
            )

        except Exception as e:
            print("❌ Voice Error:", e)

        finally:
            with voice_thread_lock:
                ai_state["is_ai_speaking"] = False

            print("✅ AI finished speaking")

    threading.Thread(
        target=safe_worker,
        daemon=True
    ).start()

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
LAST_INTERACTION_TIME = time.time()
IDLE_REMIND_DELAY = 600  # 10 phút
LAST_IDLE_REMIND = 0
IDLE_REMIND_COOLDOWN = 1000 # 10 phút mới nhắc lại
START_DELAY = 12       # delay khi mới mở app
long_term_memory = VectorMemory(max_memory=1000)
def update_user_activity():
    global LAST_INTERACTION_TIME
    LAST_INTERACTION_TIME = time.time()
def is_user_idle():
    idle_time = time.time() - LAST_INTERACTION_TIME
    return idle_time >= IDLE_REMIND_DELAY
def trigger_remind_logic(status_text, emotion, objects=None, history_context="", event_type=None):
    global LAST_IDLE_REMIND, last_sent_status, last_remind_time

    # 1. Chỉ chặn khi đang nói thật sự
    if ai_state.get("is_ai_speaking"):
        return

    # 2. ÉP event_type (Để demo luôn chạy khi có WARNING)
    # Nếu truyền vào risk_level là WARNING thì tự hiểu là BAD_POSTURE
    if event_type is None:
        return 

    # 3. Tạm thời nới lỏng Cooldown để quay Clip demo
    now = time.time()
    if now - LAST_IDLE_REMIND < 5: # Chỉ đợi 5s thay vì 30s
        return
    
    LAST_IDLE_REMIND = now
    global last_sent_status, last_remind_time
    # ===== 1. BLOCK khi AI đang nói =====
    if ai_state.get("is_ai_speaking"):
        return
    current_time = time.time()
    # ===== 2. Tránh nói ngay khi mở app =====
    if current_time - start_app_time < START_DELAY:
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
            f"3. Nếu {event_type} là 'BAD_POSTURE', hãy nhắc nội ngồi thẳng lưng lên nhen.\n" # THÊM DÒNG NÀY
            f"4. TUYỆT ĐỐI KHÔNG lặp lại ý hệt những câu trong mục 'CON ĐÃ NÓI GÌ TRƯỚC ĐÓ'.\n"
            f"5. Văn phong: Ngọt ngào, dùng từ: nhen, nha nội, đó nội, nghen.\n"
            f"6. CHỈ 1 CÂU DUY NHẤT (< 20 từ)."
            f"7. Nếu không có sự kiện rõ ràng (FALL_DETECTED hoặc SIT_TOO_LONG) → trả về ''. KHÔNG được tự nói chuyện.\n"
            f"8. KHÔNG được nói các câu như 'con không hiểu', 'con không nghe rõ', 'nội nói lại'.\n"
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
                    print("⚠️ Reopening camera...")
                    cap = cv2.VideoCapture(0)

            ret, frame = cap.read()

            if not ret or frame is None:
                print("⚠️ Camera read failed")
                time.sleep(0.1)
                continue

            with buffer_lock:
                raw_buffer.append(frame)

        except Exception as e:
            print("❌ CAMERA ERROR:", e)
            traceback.print_exc()

        time.sleep(0.01)

last_log_time = 0
WARNING_KEYWORDS = {
    "NGÃ",
    "NGUY HIỂM",
    "FALL",
    "MẤT THĂNG BẰNG",
    "LOẠNG CHOẠNG",
    "NGỒI KHOM",
    "KHOM LƯNG",
    "BẤT ĐỘNG",
    "NẰM SÀN",
    "NGỒI LÂU",
    "NGỒI QUÁ LÂU",
    "ĐỨNG KHÔNG VỮNG"
}

def detect_warning(status_text: str) -> bool:
    if not status_text:
        return False

    text = str(status_text).upper()

    return any(keyword in text for keyword in WARNING_KEYWORDS)
def ai_worker():
    global last_java_sync_time

    print("🧠 AI Worker running...")

    frame_count = 0

    while running:
        try:
            # =========================
            # 1. GET FRAME (SAFE)
            # =========================
            frame = None

            with buffer_lock:
                if raw_buffer:
                    frame = raw_buffer[-1]
                    raw_buffer.clear()

            if frame is None:
                time.sleep(0.01)
                continue

            # =========================
            # 2. PREPROCESS
            # =========================
            ai_frame = cv2.resize(frame, (640, 480))

            # =========================
            # 3. POSE DETECTION
            # =========================
            try:
                frame_pose = pose_detector.findPose(ai_frame)
                pose_lms = pose_detector.getPosition(frame_pose)
                pose_result = pose_detector.detect_posture(ai_frame)
            except Exception as e:
                print("⚠️ Pose error:", e)
                continue
            #print("POSE_RESULT:", pose_result)         
            if not pose_result or len(pose_result) != 4:
                continue

            status_text, color, sitting_seconds, pose_ctx = pose_result
            print("POSE DEBUG:", {
                "is_falling": pose_ctx.get("is_falling"),
                "back_angle": pose_ctx.get("back_angle"),
                "velocity": pose_ctx.get("velocity"),
                "risk_level": pose_ctx.get("risk_level"),
                "status_text": status_text
            })
            #print("POSE_CTX:", pose_ctx)
            # =========================
            # 4. OBJECT DETECTION (SKIP FRAME)
            # =========================
            objects = []
            if frame_count % 5 == 0:
                try:
                    objects, _ = obj_detector.detect_objects(ai_frame)
                except Exception:
                    objects = []

            # =========================
            # 5. EMOTION DETECTION
            # =========================
            try:
                emotion = emotion_detector.detect_emotion(
                    ai_frame,
                    landmarks=pose_lms
                )
            except Exception:
                emotion = "unknown"

            emotion = emotion or "unknown"
           
            # =========================
            # 7. BRAIN PROCESS
            # =========================
            try:
                result = brain.process_frame(pose_ctx, objects, emotion)

                if (
                    not result
                    or not isinstance(result, (list, tuple))
                    or result[0] is None
                ):
                    final_status = status_text  # fallback từ pose
                else:
                    final_status = result[0]
            except Exception as e:
                print("⚠️ Brain error:", e)
                final_status = "LOADING"

            # =========================
            # 8. UPDATE GLOBAL STATE
            # =========================
            is_warning_by_text = detect_warning(final_status)
            back_angle = pose_ctx.get("back_angle", 0)
            velocity = pose_ctx.get("velocity", 0)
            is_falling = pose_ctx.get("is_falling", False)

            is_real_fall = is_falling and velocity > 0.8 and back_angle > 70
            is_slouching = back_angle > 35 and back_angle <= 70

            is_warning_by_pose = is_real_fall
            is_warning = is_warning_by_text or is_warning_by_pose
            print(f"[POSE] fall={is_falling} angle={back_angle:.1f} vel={velocity:.2f}")
            current_ai_status.update({
                "status": final_status,
                "emotion": emotion,
                "sitting_seconds": int(sitting_seconds or 0),
                "is_warning": is_warning,
                "full_objects_data": objects or [],
                "posture": pose_ctx  
            })
            now_ts = time.time()
            global last_log_time
            if now_ts - last_log_time > 2: # Cứ 2 giây lưu log 1 lần để tránh nát ổ cứng
                log_event(current_ai_status)
                update_stats(current_ai_status)
                last_log_time = now_ts
            # =========================
            # 9. EVENT ENGINE
            # =========================
            try:
                events = event_engine.detect_event(current_ai_status)
            except Exception:
                events = []

            for event_type in events:
                trigger_remind_logic(
                    status_text=final_status,
                    emotion=emotion,
                    objects=objects,
                    history_context=get_recent_memory(3),
                    event_type=event_type
                )

            # =========================
            # 10. ENCODE FRAME (STREAM)
            # =========================
            try:
                ok, encoded = cv2.imencode(
                    ".jpg",
                    ai_frame,
                    [cv2.IMWRITE_JPEG_QUALITY, 60]
                )

                if ok:
                    with buffer_lock:
                        processed_buffer.append(encoded.tobytes())

            except Exception as e:
                print("⚠️ Encode error:", e)

            # =========================
            # 11. DEBUG LOG
            # =========================
            if frame_count % 10 == 0:
                print(
                    f"✅ AI OK | Frame {frame_count} | "
                    f"Posture: {status_text} | Emotion: {emotion}"
                )

            frame_count += 1
            time.sleep(0.01)

        except Exception as e:
            print(f"❌ AI WORKER CRASH: {e}")
            time.sleep(0.05)
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
                frame_bytes = processed_buffer.pop()
            img_base64 = base64.b64encode(frame_bytes).decode("utf-8")

            # Tạo bản copy an toàn cho JSON
            data = {
                "frame": img_base64,
                "status": str(current_ai_status.get("status", "Đang kết nối...")), # Gửi chuỗi trực tiếp
                "posture": current_ai_status.get("posture", {}), # Gửi kèm object posture chi tiết
                "emotion": str(current_ai_status.get("emotion", "Bình thường")),
                "is_warning": bool(current_ai_status.get("is_warning", False)),
                "sitting_seconds": int(current_ai_status.get("sitting_seconds", 0)),
                "detected_objects": current_ai_status.get("full_objects_data", []),
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
        "status": current_ai_status.get("status", "Bình thường"),
        "emotion": current_ai_status.get("emotion", "Ổn định"),

        "posture": current_ai_status.get("posture", {
            "state": "UNKNOWN",
            "back_angle": 0,
            "velocity": 0,
            "confidence": 0
        }),

        "lip_sync": ai_state["lip_sync_data"],
        "audio": ai_state["current_audio_url"],
        "face": face_tracking,
        "detected_objects": current_ai_status.get("full_objects_data", []),
        "is_ai_speaking": ai_state.get("is_ai_speaking", False)
    }
@app.post("/api/ai/chat")
async def chat(req: ChatRequest):
    update_user_activity()
    if ai_state.get("is_ai_speaking") or ai_state.get("is_thinking", False):
        return {"text": "Dạ nội chờ con xíu, con đang nghe nè...", "audio": None}

    try:
        ai_state["is_thinking"] = True
        SYSTEM_PROMPT_CHAT = (
           "VAI DIỄN: Bạn là AMI, đứa cháu nội hiếu thảo, luôn ở bên hủ hỉ với nội. "
            "PHONG CÁCH: Lễ phép, ấm áp, rặt mùi miền Nam (ngọt ngào, chân thành). "
            "XƯNG HÔ: Luôn gọi mình là 'con', gọi bà là 'nội'. CẤM gọi nội là 'bạn', 'bà' hoặc 'người dùng'. "
            "XỬ LÝ KHI MỚI BẮT ĐẦU / IM LẶNG:\n"
            "- Nếu dữ liệu đầu vào trống hoặc mập mờ, KHÔNG ĐƯỢC hỏi 'Nội nói gì con không nghe'.\n"
            "- Thay vào đó, hãy chủ động chào hoặc khơi gợi chuyện: 'Dạ nội ơi, con đang nghe nội nè, nội có gì vui kể con nghe với nhen'.\n\n"
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
    finally:
        # Xong việc thì tắt cờ suy nghĩ
        ai_state["is_thinking"] = False
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
        t3 = threading.Thread(target=sync_worker, daemon=True)
        t1.start()
        t2.start()
        t3.start()
        print("🚀 Đang khởi động Uvicorn...")
        uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
        
    except Exception as e:
        print(f"‼️ LỖI HỆ THỐNG DẪN ĐẾN TREO: {e}")
        import traceback
        traceback.print_exc() 