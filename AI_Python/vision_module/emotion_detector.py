import cv2
from deepface import DeepFace
from collections import deque

class EmotionDetector:
    def __init__(self):
        # Dùng maxlen để tự động pop như mình đã thảo luận ở trên
        self.emotion_buffer = deque(maxlen=15)
        self.frame_count = 0 
        self.last_face_emotion = "neutral"

    # ===== 1. FACE EMOTION (Tối ưu tốc độ) =====
    def get_face_emotion(self, frame):
        self.frame_count += 1
        # Chỉ quét mặt sau mỗi 10 khung hình để tránh lag
        if self.frame_count % 10 == 0:
            try:
                # Chuyển sang ảnh xám hoặc resize nhỏ lại sẽ nhanh hơn
                result = DeepFace.analyze(
                    frame,
                    actions=['emotion'],
                    enforce_detection=False,
                    detector_backend='opencv' # Dùng backend opencv cho tốc độ nhanh nhất
                )
                self.last_face_emotion = result[0]['dominant_emotion']
            except:
                pass
        return self.last_face_emotion

    # ===== 2. POSE EMOTION (Dựa trên tọa độ xương) =====
    def get_pose_emotion(self, landmarks):
        if not landmarks:
            return "neutral"

        # Tọa độ MediaPipe thường là object có thuộc tính .x, .y
        try:
            nose_y = landmarks[0].y
            l_sh_y = landmarks[11].y
            r_sh_y = landmarks[12].y
            l_wrist_y = landmarks[15].y
            r_wrist_y = landmarks[16].y

            # SAD: Đầu cúi thấp hẳn so với vai
            if nose_y > l_sh_y and nose_y > r_sh_y:
                return "sad"
            # HAPPY: Tay giơ cao quá vai (biểu hiện vui mừng/phấn khởi)
            if l_wrist_y < l_sh_y or r_wrist_y < r_sh_y:
                return "happy"
        except:
            pass
        return "neutral"

    # ===== 3. FUSION (Kết hợp thông minh) =====
    def fuse_emotion(self, face_emotion, pose_emotion):
        # Bảng ưu tiên: Cảm xúc mạnh (Vui/Buồn) ưu tiên hơn trung tính (Neutral)
        priority = {
            "happy": 3,
            "sad": 3,      # Cả vui và buồn đều quan trọng để nhắc nhở
            "angry": 2,
            "fear": 2,
            "neutral": 1
        }

        p1 = priority.get(face_emotion, 0)
        p2 = priority.get(pose_emotion, 0)

        # Nếu mặt đang buồn mà dáng người cũng buồn => Chắc chắn là buồn
        if face_emotion == "sad" or pose_emotion == "sad":
            return "sad"
            
        return face_emotion if p1 >= p2 else pose_emotion

    def detect(self, frame, landmarks):
        face_emo = self.get_face_emotion(frame)
        pose_emo = self.get_pose_emotion(landmarks)

        final_emo = self.fuse_emotion(face_emo, pose_emo)
        
        # Ổn định kết quả bằng Buffer
        self.emotion_buffer.append(final_emo)
        stable_emotion = max(set(self.emotion_buffer), key=self.emotion_buffer.count)

        return stable_emotion