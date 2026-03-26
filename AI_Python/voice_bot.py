import speech_recognition as sr
import os
import asyncio
import edge_tts
import pygame # Để phát âm thanh tự động
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
pygame.mixer.init()

def listen_to_user():
    """Hàm lắng nghe giọng nói và chuyển thành văn bản"""
    r = sr.Recognizer()
    with sr.Microphone() as source:
        print("\n👂 Đang nghe nội nói...")
        r.pause_threshold = 1 # Dừng 1 giây thì coi như nói xong
        audio = r.listen(source)

    try:
        # Dùng Google Speech Recognition (Miễn phí, hỗ trợ tiếng Việt)
        text = r.recognize_google(audio, language="vi-VN")
        print(f"👵 Nội nói: {text}")
        return text
    except Exception:
        return None

async def speak_back(text):
    """Hàm chuyển văn bản thành tiếng và phát ra loa"""
    output_file = "voice_out.mp3"
    communicate = edge_tts.Communicate(text, "vi-VN-NamMinhNeural")
    await communicate.save(output_file)
    
    # Phát âm thanh
    pygame.mixer.music.load(output_file)
    pygame.mixer.music.play()
    while pygame.mixer.music.get_busy():
        await asyncio.sleep(0.1)
    
    pygame.mixer.music.unload() # Giải phóng file để lần sau ghi đè
    os.remove(output_file)

async def main_loop():
    print("🚀 Hệ thống Emotional Home đã sẵn sàng!")
    while True:
        user_input = listen_to_user()
        
        if user_input:
            # 1. Gửi sang Groq xử lý
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "Bạn là cháu Luân, trả lời nội lễ phép, ấm áp, dưới 2 câu."},
                    {"role": "user", "content": user_input}
                ]
            )
            ai_response = completion.choices[0].message.content
            print(f"🤖 Luân: {ai_response}")
            
            # 2. Phát giọng nói trả lời
            await speak_back(ai_response)

if __name__ == "__main__":
    asyncio.run(main_loop())