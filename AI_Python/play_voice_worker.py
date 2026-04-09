import os
import uuid
import time
import threading
import torch
from lip_sync_generator import generate_lip_sync

def play_voice_worker(text, openvoice_engine, audio_dir, audio_lock, state_dict):
    try:
        state_dict["is_ai_speaking"] = True

        uid = uuid.uuid4().hex[:8]
        filename = f"voice_{uid}.wav"
        filepath = os.path.join(audio_dir, filename)

        print(f"🎤 AI đang tạo giọng: {text}")

        # ================= TTS (GPU SAFE) =================
        with torch.inference_mode():
            openvoice_engine.speak(
                text,
                filename=filename,
                target_se=openvoice_engine.target_se
            )

        if not os.path.exists(filepath):
            print(f"❌ Không tìm thấy file: {filepath}")
            return

        # ================= TRẢ AUDIO NGAY (REALTIME) =================
        state_dict["current_audio_url"] = f"/audio/{filename}"

        # ================= LIP SYNC (CHẠY NỀN) =================
        def run_lipsync():
            try:
                lip_sync_data = generate_lip_sync(filepath, fps=12)
                state_dict["lip_sync_data"] = lip_sync_data
            except Exception as e:
                print(f"❌ Lỗi lipsync: {e}")

        threading.Thread(target=run_lipsync, daemon=True).start()

        # ================= KHÔNG BLOCK =================
        duration = 2.5  # giả lập thời gian audio (có thể cải tiến)
        time.sleep(duration)

    except Exception as e:
        print(f"❌ Voice Worker Error: {e}")

    finally:
        time.sleep(0.2)

        state_dict["lip_sync_data"] = []
        state_dict["current_audio_url"] = ""
        state_dict["is_ai_speaking"] = False

        print("✅ AI đã hoàn tất.")