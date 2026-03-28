import os
import torch
import uuid
from gtts import gTTS
from openvoice.api import ToneColorConverter


class EmotionalVoice:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        self.output_dir = os.path.join(os.getcwd(), 'OpenVoice', 'outputs')
        os.makedirs(self.output_dir, exist_ok=True)

        # ================= LOAD OPENVOICE =================
        self.converter = ToneColorConverter(
            'OpenVoice/checkpoints/converter/config.json',
            device=self.device
        )
        self.converter.load_ckpt(
            'OpenVoice/checkpoints/converter/checkpoint.pth'
        )

        # ================= LOAD GIỌNG =================
        import glob
        folders = glob.glob("processed/*")

        if not folders:
            raise FileNotFoundError("❌ Không tìm thấy thư mục processed")

        target_folder = folders[0]
        target_se_path = os.path.join(target_folder, "se.pth")

        if not os.path.exists(target_se_path):
            raise FileNotFoundError(f"❌ Không tìm thấy: {target_se_path}")

        self.target_se = torch.load(target_se_path, map_location=self.device)

        self.source_se = torch.load(
            'OpenVoice/checkpoints/base_speakers/ses/en-default.pth',
            map_location=self.device
        )

        print("✅ EmotionalVoice READY")

    def speak(self, text, filename=None, target_se=None):

        if not text.strip():
            raise ValueError("❌ Text rỗng")

        uid = uuid.uuid4().hex[:8]

        base_mp3 = os.path.join(self.output_dir, f"temp_{uid}.mp3")
        final_filename = filename if filename else f"voice_{uid}.wav"
        final_path = os.path.join(self.output_dir, final_filename)

        # ✅ FIX tensor check
        current_target_se = target_se if target_se is not None else self.target_se

        try:
            # ================= STEP 1: gTTS =================
            tts = gTTS(text=text, lang='vi')
            tts.save(base_mp3)

            # ================= STEP 2: CONVERT =================
            self.converter.convert(
                base_mp3,
                self.source_se,
                current_target_se,
                final_path
            )

            print(f"🎤 AI nói: {text}")
            return final_path

        except Exception as e:
            print(f"❌ Voice Error: {e}")
            return None

        finally:
            if os.path.exists(base_mp3):
                try:
                    os.remove(base_mp3)
                except:
                    pass