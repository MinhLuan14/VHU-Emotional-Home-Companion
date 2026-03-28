# play_voice_worker.py
import os
import uuid
import time
import pygame
from lip_sync_generator import generate_lip_sync

def play_voice_worker(text, openvoice_engine, audio_dir, audio_lock, state_dict):
    """
    Worker phát giọng nói chuyên nghiệp
    """
    # Khóa luồng để tránh nhiều giọng nói đè lên nhau
    with audio_lock:
        try:
            # 1. Bật cờ đang nói
            state_dict["is_ai_speaking"] = True
            
            uid = uuid.uuid4().hex[:8]
            filename = f"voice_{uid}.wav"
            filepath = os.path.join(audio_dir, filename)

            print(f"🎤 AI Minh đang tạo giọng: {text}")

            # 2. SINH GIỌNG NÓI (QUAN TRỌNG: Truyền target_se để lấy giọng Minh)
            # Đảm bảo class EmotionalVoice đã được sửa hàm speak như mình chỉ trước đó
            openvoice_engine.speak(
                text, 
                filename=filename, 
                target_se=openvoice_engine.target_se
            )

            if not os.path.exists(filepath):
                print(f"❌ Không tìm thấy file âm thanh tại: {filepath}")
                return

            # 3. ĐỒNG BỘ MÔI (LIP SYNC)
            lip_sync_data = generate_lip_sync(filepath, fps=12)
            state_dict["lip_sync_data"] = lip_sync_data
            state_dict["current_audio_url"] = f"/audio/{filename}"

            # 4. PHÁT ÂM THANH
            pygame.mixer.music.load(filepath)
            pygame.mixer.music.play()

            # Chờ phát xong
            while pygame.mixer.music.get_busy():
                pygame.time.Clock().tick(10)

            # Giải phóng file để hệ thống có thể xóa/ghi đè sau này
            pygame.mixer.music.stop()
            pygame.mixer.music.unload() 

        except Exception as e:
            print(f"❌ Lỗi tại Voice Worker: {e}")
        
        finally:
            # 5. RESET TRẠNG THÁI (Luôn chạy kể cả khi lỗi)
            time.sleep(0.3) # Nghỉ ngắn để cảm giác tự nhiên
            state_dict["lip_sync_data"] = []
            state_dict["current_audio_url"] = ""
            state_dict["is_ai_speaking"] = False
            print("✅ AI đã nói xong.")