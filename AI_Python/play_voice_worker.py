import os
import uuid
import time
import threading
import torch
from lip_sync_generator import generate_lip_sync
import glob

def clean_old_audio_files(audio_dir, max_files=5):
    try:
        files = glob.glob(os.path.join(audio_dir, "*.wav"))

        if not files:
            return

        files.sort(key=os.path.getmtime, reverse=True)

        for f in files[max_files:]:
            try:
                os.remove(f)
                print(f"🧹 Deleted: {f}")
            except Exception as e:
                print(f"⚠️ Cannot delete {f}: {e}")

    except Exception as e:
        print(f"⚠️ Cleanup error: {e}")

def play_voice_worker(text, openvoice_engine, audio_dir, audio_lock, state_dict):
    try:
        state_dict["is_ai_speaking"] = True

        uid = uuid.uuid4().hex[:8]
        filename = f"voice_{uid}.wav"
        filepath = os.path.join(audio_dir, filename)

        print(f"🎤 Generating voice: {text}")

        # ================= TTS =================
        with torch.inference_mode():
            openvoice_engine.speak(
                text,
                filename=filename,
                target_se=openvoice_engine.target_se
            )

        if not os.path.exists(filepath):
            print(f"❌ Missing file: {filepath}")
            return

        # ================= STREAM AUDIO =================
        state_dict["current_audio_url"] = f"/audio/{filename}"

        # ================= LIPSYNC THREAD =================
        def run_lipsync():
            try:
                lip_sync_data = generate_lip_sync(filepath, fps=12)
                state_dict["lip_sync_data"] = lip_sync_data
            except Exception as e:
                print(f"❌ Lipsync error: {e}")

        threading.Thread(target=run_lipsync, daemon=True).start()

        # ================= CLEANUP CALL (FIX HERE) =================
        def cleanup_worker():
            time.sleep(3)  # đợi file ổn định
            with audio_lock:
                clean_old_audio_files(audio_dir, max_files=5)

        threading.Thread(target=cleanup_worker, daemon=True).start()

        # optional wait nhẹ (không block chính)
        time.sleep(0.1)

    except Exception as e:
        print(f"❌ Voice Worker Error: {e}")

    finally:
        time.sleep(0.2)
        state_dict["lip_sync_data"] = []
        state_dict["current_audio_url"] = ""
        state_dict["is_ai_speaking"] = False
        print("✅ AI finished speaking")