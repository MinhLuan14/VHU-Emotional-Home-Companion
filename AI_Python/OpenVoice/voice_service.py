import os
import torch
from openvoice import se_extractor
from openvoice.api import ToneColorConverter
from gtts import gTTS

class EmotionalVoice:
    def __init__(self):
        self.ckpt_converter = 'OpenVoice/checkpoints/converter'
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.output_dir = os.path.join(os.getcwd(), 'OpenVoice', 'outputs')
        os.makedirs(self.output_dir, exist_ok=True)
        
        # Khởi tạo converter một lần duy nhất để tiết kiệm RAM
        self.converter = ToneColorConverter(f'{self.ckpt_converter}/config.json', device=self.device)
        self.converter.load_ckpt(f'{self.ckpt_converter}/checkpoint.pth')
        
        self.target_se, _ = se_extractor.get_se('nguoi_than.wav', self.converter, target_dir='processed')
        self.source_se = torch.load('OpenVoice/checkpoints/base_speakers/ses/en-default.pth', map_location=self.device)

    def speak(self, text, filename="canh_bao.wav"):
        # 1. Tạo giọng nền tiếng Việt từ text truyền vào
        base_path = os.path.join(self.output_dir, "base_temp.mp3")
        tts = gTTS(text=text, lang='vi')
        tts.save(base_path)
        
        # 2. Clone giọng
        final_path = os.path.join(self.output_dir, filename)
        self.converter.convert(base_path, self.source_se, self.target_se, final_path)
        
        print(f"📢 Robot nói: {text}")
        return final_path

# --- Cách Luân dùng trong đồ án ---
# engine = EmotionalVoice()
# engine.speak("Nội ơi, tới giờ uống thuốc rồi ạ!")