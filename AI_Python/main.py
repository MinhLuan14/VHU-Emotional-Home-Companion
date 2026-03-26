import os
import base64
import uuid
import cv2
import asyncio
import time
import threading
import pygame
from openvoice import se_extractor
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import Groq
import edge_tts
from fastapi.responses import StreamingResponse
from vision_module.emotion_detector import EmotionDetector
# Import module của bạn
from vision_module.pose_detector import PoseDetector
from OpenVoice.voice_service import EmotionalVoice
# 1. CẤU HÌNH HỆ THỐNG
print("--- Đang nạp giọng nói người thân (OpenVoice)... ---")
openvoice_engine = EmotionalVoice()
load_dotenv()
app = FastAPI(title="Emotional Home Companion - VHU")
detector = PoseDetector()
emotion_analyzer = EmotionDetector()
# Khởi tạo âm thanh (Pygame mixer)
try:
    pygame.mixer.init()
except Exception as e:
    print(f"Lưu ý: Không tìm thấy thiết bị âm thanh: {e}")

# Cấu hình CORS cho React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Khởi tạo Groq
GROQ_KEY = os.getenv("GROQ_API_KEY")
client_groq = Groq(api_key=GROQ_KEY)

# Quản lý trạng thái nhắc nhở
last_warning_time = 0
WARNING_COOLDOWN = 20  # Giãn cách 20 giây mỗi lần nhắc để không làm phiền nội

class ChatRequest(BaseModel):
    user_input: str

# Khởi tạo Camera và Detector
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
detector = PoseDetector()

current_ai_status = {
    "status": "Đang khởi động...",
    "is_warning": False,
    "emotion": "Ổn định",
    "color": (255, 255, 255)
}
@app.post("/api/ai/upload_voice")
async def upload_voice(file: UploadFile = File(...)):
    try:
        # Đường dẫn lưu file tạm
        temp_path = os.path.join("OpenVoice", "nguoi_than_upload" + os.path.splitext(file.filename)[1])
        
        # Lưu file người dùng gửi lên
        with open(temp_path, "wb") as buffer:
            buffer.write(await file.read())
            
        # Cập nhật lại vân giọng (SE) trong OpenVoice engine
        # Luân gọi lại hàm khởi tạo SE của OpenVoice ở đây
        openvoice_engine.target_se, _ = se_extractor.get_se(
            temp_path, 
            openvoice_engine.converter, 
            target_dir='processed'
        )
        
        return {"status": "success", "message": "Đã cập nhật giọng người thân mới!"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}
def play_voice_worker(text):
    """SỬ DỤNG OPENVOICE ĐỂ CLONE GIỌNG NGƯỜI THÂN"""
    unique_id = uuid.uuid4().hex[:8]
    file_name_only = f"clone_{unique_id}.wav"
    
    # 1. Lấy đường dẫn gốc của dự án (AI_Python)
    base_path = os.getcwd() 
    
    # 2. Trỏ thẳng vào cái kho OpenVoice/outputs (Nơi file thực sự sinh ra)
    # Dùng os.path.join để Windows không bị lỗi dấu gạch chéo
    final_filename = os.path.join(base_path, "OpenVoice", "outputs", file_name_only)
    
    try:
        print(f"⏳ Đang tạo giọng nói cho: {text[:30]}...")
        # Gọi OpenVoice tạo file
        openvoice_engine.speak(text, filename=file_name_only)
        
        # Đợi file ghi xong
        time.sleep(0.8) 
        
        if os.path.exists(final_filename):
            print(f"🔊 Robot đang nói (File: {file_name_only})")
            
            if not pygame.mixer.get_init():
                pygame.mixer.init()
            
            pygame.mixer.music.load(final_filename)
            pygame.mixer.music.play()
            
            while pygame.mixer.music.get_busy():
                pygame.time.Clock().tick(10)
            
            pygame.mixer.music.stop()
            pygame.mixer.music.unload() 
            
            # Sau khi phát xong thì dọn dẹp cho sạch máy
            os.remove(final_filename)
        else:
            # Nếu vẫn không thấy, ta in ra danh sách file để "truy vết"
            print(f"❌ Không tìm thấy file tại: {final_filename}")
            print(f"📂 Thử kiểm tra thư mục: {os.path.dirname(final_filename)}")
            
    except Exception as e:
        print(f"❌ Lỗi phát âm thanh: {e}")

def trigger_auto_remind(status_text, emotion):
    global last_warning_time
    current_time = time.time()
    
    if current_time - last_warning_time > WARNING_COOLDOWN:
        last_warning_time = current_time
        
        # Prompt "thông minh" hơn cho Groq
        prompt = (
            f"Nội đang bị: {status_text}. "
            f"Vẻ mặt nội đang: {emotion}. "
            f"Hãy là cháu Luân, dựa vào tình trạng và cảm xúc này để an ủi và nhắc nội. "
            f"Nếu nội buồn, hãy nói ngọt ngào hơn. Nếu nội đang mệt (ngồi khom), hãy rủ nội nghỉ ngơi."
        )
        
        try:
            completion = client_groq.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system", 
                        "content": "Bạn là Luân, cháu nội miền Nam cực kỳ hiếu thảo và tâm lý. Nói chuyện ngọt ngào, dùng từ: dạ, thưa, nha nội, thương nội."
                    },
                    {"role": "user", "content": prompt}
                ]
            )
            remind_text = completion.choices[0].message.content.strip()
            
            # Làm sạch văn bản (loại bỏ dấu ngoặc kép nếu AI tự thêm vào)
            remind_text = remind_text.replace('"', '').replace("'", "")
            
            print(f"🤖 AI: {remind_text}")
            
            # Phát loa qua thread riêng
            threading.Thread(target=play_voice_worker, args=(remind_text,), daemon=True).start()
            
        except Exception as e:
            print(f"Lỗi Groq API: {e}")
# --- 3. STREAMING VIDEO FEED ---

def generate_frames():
    global current_ai_status
    pTime = 0

    while True:
        success, frame = cap.read()
        if not success: break
        
        # 1. Nhận diện Tư thế
        frame = detector.findPose(frame)
        lmList = detector.getPosition(frame, draw=False) 
        status_text, color = detector.detect_posture()

        stable_emotion = emotion_analyzer.detect(frame, detector.results.pose_landmarks.landmark if detector.results.pose_landmarks else None)

        # 3. Cập nhật trạng thái tổng hợp cho Frontend
        is_warning = any(icon in status_text for icon in ["🚨", "⚠️", "🆘"])
        
        current_ai_status = {
            "status": status_text,
            "is_warning": is_warning,
            "emotion": stable_emotion, 
            "color": color
        }

        if is_warning:
            trigger_auto_remind(status_text, stable_emotion)

        # 5. Vẽ giao diện (UI) lên Frame
        cv2.rectangle(frame, (0, 0), (640, 60), (0, 0, 0), -1)
        # Sửa màu từ BGR sang hiển thị đúng trên Text
        text_color = (color[2], color[1], color[0]) 
        
        cv2.putText(frame, f"ROBOT: {status_text}", (20, 40), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, text_color, 2)
        
        # Hiển thị FPS (Đã sửa lỗi fontFace)
        cTime = time.time()
        fps = 1 / (cTime - pTime) if (cTime - pTime) > 0 else 0
        pTime = cTime
        cv2.putText(frame, f"FPS: {int(fps)}", (540, 40), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

        # Encode frame
        ret, buffer = cv2.imencode('.jpg', frame)
        if not ret: continue
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

# --- 4. CÁC API ENDPOINTS ---

@app.get("/api/ai/status")
async def get_latest_status():
    return current_ai_status

@app.get("/api/ai/video_feed")
def video_feed():
    return StreamingResponse(
        generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.post("/api/ai/chat")
async def manual_chat_api(request: ChatRequest):
    """API dành cho việc nhắn tin trực tiếp với Robot trên giao diện"""
    try:
        completion = client_groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "Bạn là Luân, cháu nội hiếu thảo. Trả lời lễ phép, ấm áp, ngắn dưới 3 câu."},
                {"role": "user", "content": request.user_input}
            ]
        )
        ai_text = completion.choices[0].message.content.strip()
        return {"status": "success", "text": ai_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*50)
    print("🚀 EMOTIONAL HOME COMPANION SERVER IS STARTING")
    print("📡 Local API: http://localhost:8000")
    print("="*50 + "\n")
    
    try:
        uvicorn.run(app, host="0.0.0.0", port=8000)
    finally:
        cap.release()
        cv2.destroyAllWindows()