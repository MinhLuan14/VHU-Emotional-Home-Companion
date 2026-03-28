import os
import torch
from openvoice.api import ToneColorConverter

# ================= CONFIG =================
ckpt_converter = 'checkpoints/converter'
device = "cuda" if torch.cuda.is_available() else "cpu"
output_dir = 'outputs'
os.makedirs(output_dir, exist_ok=True)

print(f"🚀 Khởi động trên: {device.upper()}")

# ================= LOAD OPENVOICE =================
converter = ToneColorConverter(
    f'{ckpt_converter}/config.json',
    device=device
)
converter.load_ckpt(f'{ckpt_converter}/checkpoint.pth')

# ================= LOAD VOICE =================
target_se_path = "processed/nguoi_than_v2/se.pth"

if not os.path.exists(target_se_path):
    raise FileNotFoundError(f"❌ Không tìm thấy: {target_se_path}")

target_se = torch.load(target_se_path, map_location=device)

source_se = torch.load(
    'checkpoints/base_speakers/ses/en-default.pth',
    map_location=device
)

# ================= TEXT =================
text_to_say = "Nội ơi, ngồi thẳng lưng lại nha, con thấy nội hơi mỏi rồi đó"

# ================= PATH =================
base_mp3 = os.path.join(output_dir, "temp.mp3")
final_wav = os.path.join(output_dir, "ket_qua_cuoi_cung.wav")

try:
    print("🎤 Đang tạo giọng nền (gTTS)...")

    # 🔥 gTTS → MP3
    tts = gTTS(text=text_to_say, lang='vi', slow=False)
    tts.save(base_mp3)

    print("🎯 Đang convert sang giọng người thân...")

    # 🔥 Convert giọng
    converter.convert(
        base_mp3,
        source_se,
        target_se,
        final_wav
    )

    print("🎉 THÀNH CÔNG!")
    print(f"👉 File: {os.path.abspath(final_wav)}")

except Exception as e:
    print(f"❌ Lỗi: {e}")

finally:
    # 🔥 Cleanup file tạm
    if os.path.exists(base_mp3):
        os.remove(base_mp3)