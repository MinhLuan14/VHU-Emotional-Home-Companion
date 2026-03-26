from pydub import AudioSegment
import os

# 1. Tên file m4a của Luân (đảm bảo file này nằm cùng thư mục với file python này)
input_file = "nguoi_than.m4a" 
output_file = "nguoi_than.wav"

if os.path.exists(input_file):
    print(f"--- Đang chuyển đổi {input_file} sang {output_file}... ---")
    
    # nạp file m4a
    audio = AudioSegment.from_file(input_file, format="m4a")
    
    # Xuất ra file wav với chất lượng chuẩn cho OpenVoice (22050Hz)
    audio = audio.set_frame_rate(22050)
    audio.export(output_file, format="wav")
    
    print("--- Chuyển đổi THÀNH CÔNG! ---")
    print(f"File mới đã xuất hiện tại: {os.path.abspath(output_file)}")
else:
    print(f"LỖI: Không tìm thấy file {input_file}. Luân nhớ chép file m4a vào thư mục AI_Python nhé!")