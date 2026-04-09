from pydub import AudioSegment
import os

# Chỉ định đường dẫn trực tiếp đến file ffmpeg.exe Luân vừa dán vào
AudioSegment.converter = os.path.abspath("ffmpeg.exe")
AudioSegment.ffprobe   = os.path.abspath("ffprobe.exe")

try:
    # Load file m4a
    audio = AudioSegment.from_file("nguoi_than.mp3", format="mp3")

    # Xuất ra file wav chuẩn cho OpenVoice
    audio = audio.set_frame_rate(22050)
    audio.export("nguoi_than.wav", format="wav")
    print("✅ Ngon lành! Đã tạo xong file 'nguoi_than.wav' rồi Luân ơi!")
except Exception as e:
    print(f"❌ Vẫn còn lỗi: {e}")
    print("Luân nhớ kiểm tra xem file 'nguoi_than.m4a' có nằm cùng chỗ với file này chưa nhé!")