from pydub import AudioSegment, effects
import os

# --- CẤU HÌNH QUAN TRỌNG ---
# Nội trỏ đường dẫn trực tiếp đến file exe đã tải về nhen
ffmpeg_path = os.path.abspath("./OpenVoice/ffmpeg.exe")
ffprobe_path = os.path.abspath("./OpenVoice/ffprobe.exe")

AudioSegment.converter = ffmpeg_path
AudioSegment.ffprobe = ffprobe_path

input_file = "nguoi_than.m4a" 
output_file = "nguoi_than.wav"

if os.path.exists(input_file):
    print(f"--- Đang dùng FFmpeg xử lý {input_file}... ---")
    
    try:
        # Nhờ có FFmpeg, bước này sẽ đọc file m4a cực chuẩn
        audio = AudioSegment.from_file(input_file, format="m4a")
        
        # Chuyển về Mono và 22050Hz bằng thuật toán của FFmpeg (rất sạch)
        audio = audio.set_channels(1).set_frame_rate(22050)
        
        # Normalize để giọng mẫu đạt độ to chuẩn, AI dễ bắt tông
        audio = effects.normalize(audio)
        
        audio.export(output_file, format="wav")
        print("--- CHUẨN HÓA THÀNH CÔNG! Giọng mẫu đã sẵn sàng cho OpenVoice. ---")
    except Exception as e:
        print(f"LỖI khi xử lý âm thanh: {e}")
        print("Nội kiểm tra xem file ffmpeg.exe đã để đúng chỗ chưa nhen!")
else:
    print(f"LỖI: Nội ơi, chưa có file {input_file} trong thư mục ạ!")