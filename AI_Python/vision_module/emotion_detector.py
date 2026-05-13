import cv2
from deepface import DeepFace
from collections import deque
import numpy as np

class EmotionDetector:
    def __init__(self):
        self.emotion_buffer = deque(maxlen=20)
        self.frame_count = 0
        self.last_face_emotion = "neutral"

    # ===== 1. FACE EMOTION =====
    def get_face_emotion(self, frame):
        self.frame_count += 1
        if self.frame_count % 5 == 0: # Tăng tần suất để nhạy hơn
            try:
                # Resize nhỏ để xử lý cực nhanh
                small_frame = cv2.resize(frame, (150, 150))
                result = DeepFace.analyze(
                    small_frame,
                    actions=['emotion'],
                    enforce_detection=False,
                    detector_backend='opencv'
                )
                res = result[0] if isinstance(result, list) else result
                self.last_face_emotion = res['dominant_emotion']
            except:
                pass 
        return self.last_face_emotion

    # ===== 2. POSE EMOTION (Đảm bảo tên hàm này chính xác) =====
    def get_pose_emotion(self, landmarks):
        # landmarks từ getPosition() là list dạng: [[id, x, y], ...]
        if not landmarks or len(landmarks) < 17:
            return "neutral"

        try:
            nose = landmarks[0]
            l_sh = landmarks[11]
            r_sh = landmarks[12]
            l_wrist = landmarks[15]
            r_wrist = landmarks[16]

            # Dùng index [1] cho x, [2] cho y
            shoulder_width = abs(l_sh[1] - r_sh[1])
            avg_sh_y = (l_sh[2] + r_sh[2]) / 2

            # Logic nhận diện tư thế buồn/mệt mỏi (vai nhô cao)
            if (avg_sh_y - nose[2]) < shoulder_width * 0.2:
                return "sad"

            # Logic nhận diện vui vẻ (giơ tay cao hơn vai)
            if (l_wrist[2] < l_sh[2] - 0.1 or r_wrist[2] < r_sh[2] - 0.1):
                return "happy"

            # Logic ôm đầu/mặt
            dist_l = np.sqrt((l_wrist[1] - nose[1])**2 + (l_wrist[2] - nose[2])**2)
            dist_r = np.sqrt((r_wrist[1] - nose[1])**2 + (r_wrist[2] - nose[2])**2)
            if (dist_l < shoulder_width * 0.5 or dist_r < shoulder_width * 0.5):
                return "sad"

        except Exception:
            pass
        return "neutral"

    # ===== 3. FUSION =====
    def fuse_emotion(self, face_emotion, pose_emotion):
        mapping = {
            "happy": "Vui vẻ",
            "sad": "Buồn/Mệt mỏi",
            "angry": "Căng thẳng",
            "neutral": "Ổn định",
            "fear": "Lo lắng",
            "surprise": "Ngạc nhiên"
        }
        # Ưu tiên Vui vẻ nếu một trong hai cái nhận diện được
        if face_emotion == "happy" or pose_emotion == "happy":
            return "Vui vẻ"
        if pose_emotion == "sad":
            return mapping["sad"]
        return mapping.get(face_emotion, "Ổn định")

    # ===== API CHÍNH MÀ MAIN.PY GỌI =====
    def detect_emotion(self, frame, landmarks=None):
        face_emo = self.get_face_emotion(frame)
        pose_emo = self.get_pose_emotion(landmarks) # Gọi hàm số 2

        final_emo = self.fuse_emotion(face_emo, pose_emo)
        self.emotion_buffer.append(final_emo)

        # Ưu tiên hiển thị "Vui vẻ" ngay nếu xuất hiện trong buffer
        if self.emotion_buffer.count("Vui vẻ") >= 3:
            return "Vui vẻ"
            
        return max(set(self.emotion_buffer), key=self.emotion_buffer.count)