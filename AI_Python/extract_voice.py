import os
import torch
# Nhập hàm get_se từ thư mục openvoice mà Nội vừa hỏi lúc nãy
from openvoice import se_extractor
from openvoice.api import ToneColorConverter

# Cấu hình thiết bị (Ưu tiên dùng Card đồ họa nếu có)
device = "cuda" if torch.cuda.is_available() else "cpu"
output_dir = 'processed'

# 1. Khởi tạo bộ chuyển đổi màu giọng
print("--- Đang nạp mô hình OpenVoice... ---")
converter = ToneColorConverter('OpenVoice/checkpoints/converter/config.json', device=device)
converter.load_ckpt('OpenVoice/checkpoints/converter/checkpoint.pth')

# 2. Đường dẫn file giọng người thân mà Nội vừa tạo xong
reference_speaker = 'nguoi_than.wav' 

# 3. Tiến hành "Lấy hồn" giọng nói
print(f"--- Đang phân tích giọng từ {reference_speaker}... ---")
try:
    # Hàm này sẽ gọi vào file se_extractor.py trong openvoice để làm việc
    target_se, audio_name = se_extractor.get_se(
        reference_speaker, 
        converter, 
        target_dir=output_dir, 
        vad=False # Bật cái này để AI bỏ qua đoạn im lặng, học giọng chuẩn hơn
    )
    print(f"--- THÀNH CÔNG! ---")
    print(f"Thư mục '{output_dir}' đã được tạo lại với dữ liệu mới.")
    print("Bây giờ Nội có thể chạy lại 'python main.py' rồi đó!")
except Exception as e:
    print(f"❌ Lỗi: {e}")