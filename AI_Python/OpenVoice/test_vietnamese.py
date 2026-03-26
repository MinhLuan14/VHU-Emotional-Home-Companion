import os
import torch
from openvoice import se_extractor
from openvoice.api import ToneColorConverter
from gtts import gTTS

# 1. Cấu hình
ckpt_converter = 'checkpoints/converter'
device = "cuda" if torch.cuda.is_available() else "cpu"
output_dir = 'outputs'
os.makedirs(output_dir, exist_ok=True)

# 2. Khởi tạo AI
print(f"--- Đang khởi động AI trên: {device.upper()} ---")
tone_color_converter = ToneColorConverter(f'{ckpt_converter}/config.json', device=device)
tone_color_converter.load_ckpt(f'{ckpt_converter}/checkpoint.pth')

# 3. Trích xuất màu giọng từ file WAV (Reference Voice)
print("--- Đang phân tích giọng người thân... ---")
# Lưu ý: OpenVoice V2 dùng hàm trích xuất có thêm tham số version
target_se, audio_name = se_extractor.get_se('nguoi_than.wav', tone_color_converter, target_dir='processed')

# 4. Tạo câu thoại nhắc nhở bằng tiếng Việt (Base Voice)
text_to_say = "Nội ơi, ngồi thẳng lưng lên nhé, con đang quan sát nội đấy!"
tts = gTTS(text=text_to_say, lang='vi')
tts.save(f"{output_dir}/base_vi.mp3")
# 5. Clone giọng - Cấu hình chuẩn xác 100% theo help của máy Luân
save_path = f'{output_dir}/ket_qua_cuoi_cung.wav'
source_se = torch.load('checkpoints/base_speakers/ses/en-default.pth', map_location=device)

# Truyền đúng thứ tự: audio_src_path, src_se, tgt_se, output_path
tone_color_converter.convert(
    f"{output_dir}/base_vi.mp3", # audio_src_path
    source_se,                   # src_se
    target_se,                   # tgt_se
    save_path                    # output_path
)

print(f"🎉 THÀNH CÔNG RỒI LUÂN ƠI!")
print(f"👉 File nằm tại: {os.path.abspath(save_path)}")