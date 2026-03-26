import os
from openai import OpenAI
from dotenv import load_dotenv

# 1. Load key từ file .env
load_dotenv()

# 2. Khởi tạo Client
client = OpenAI(
    api_key=os.getenv("XAI_API_KEY"),
    base_url="https://api.x.ai/v1",
)

try:
    print("--- Đang kết nối tới xAI để lấy danh sách model ---")
    models = client.models.list()
    
    print("\n✅ CÁC MODEL BÁC CÓ THỂ DÙNG LÀ:")
    if not models.data:
        print("Trống trơn bác ơi, có vẻ Key này chưa được cấp quyền model nào.")
    for m in models.data:
        print(f"-> {m.id}")
        
except Exception as e:
    print(f"\n❌ Lỗi rồi bác ơi: {e}")