import cv2
from deepface import DeepFace
from collections import deque
import numpy as np

class EmotionDetector:
    def __init__(self):
        # Tăng buffer lên 20 để kết quả cực kỳ ổn định, không bị nhảy liên tục
        self.emotion_buffer = deque(maxlen=20)
        self.frame_count = 0 
        self.last_face_emotion = "neutral"

    # ===== 1. FACE EMOTION (Tối ưu để không gây lag) =====
    def get_face_emotion(self, frame):
        self.frame_count += 1
        # Chỉ quét mặt sau mỗi 15 khung hình để dành tài nguyên cho Pose
        if self.frame_count % 15 == 0:
            try:
                # Resize nhỏ lại 50% để DeepFace xử lý nhanh gấp đôi
                small_frame = cv2.resize(frame, (0,0), fx=0.5, fy=0.5)
                result = DeepFace.analyze(
                    small_frame,
                    actions=['emotion'],
                    enforce_detection=False,
                    detector_backend='opencv' 
                )
                self.last_face_emotion = result[0]['dominant_emotion']
            except:
                pass
        return self.last_face_emotion

    # ===== 2. POSE EMOTION (Nâng cấp chuẩn xác hơn) =====
    def get_pose_emotion(self, landmarks):
        if not landmarks: return "neutral"
        try:
            # Lấy các điểm quan trọng
            nose = landmarks[0]
            l_sh, r_sh = landmarks[11], landmarks[12]
            l_wrist, r_wrist = landmarks[15], landmarks[16]
            
            # Tính độ rộng vai để làm đơn vị đo lường (scale) thay vì dùng số cứng
            shoulder_width = abs(l_sh.x - r_sh.x)
            avg_sh_y = (l_sh.y + r_sh.y) / 2

            # 1. KIỂM TRA SAD (Cúi đầu sâu)
            # Chỉ coi là buồn nếu mũi thấp xuống gần bằng đường nối hai vai
            if (avg_sh_y - nose.y) < shoulder_width * 0.2: 
                return "sad"

            # 2. KIỂM TRA HAPPY (Vẫy tay hoặc tay giơ cao)
            # Tay cao hơn hẳn vai
            if l_wrist.y < l_sh.y - 0.1 or r_wrist.y < r_sh.y - 0.1:
                return "happy"

            # 3. KIỂM TRA CĂNG THẲNG (Tay ôm đầu/mặt)
            # Khoảng cách từ cổ tay đến mũi bé hơn 1/2 độ rộng vai
            dist_l = np.sqrt((l_wrist.x - nose.x)**2 + (l_wrist.y - nose.y)**2)
            dist_r = np.sqrt((r_wrist.x - nose.x)**2 + (r_wrist.y - nose.y)**2)
            if dist_l < shoulder_width * 0.5 or dist_r < shoulder_width * 0.5:
                # Nếu tay ở gần mặt mà không phải giơ cao thì thường là mệt mỏi/lo lắng
                return "sad" 

        except Exception as e:
            print(f"Error: {e}")
        return "neutral"
    # ===== 3. FUSION (Kết hợp thông minh - Ưu tiên Pose nếu Face mờ) =====
    def fuse_emotion(self, face_emotion, pose_emotion):
        # Chuyển đổi sang tiếng Việt cho thân thiện với hệ thống của Luân
        mapping = {
            "happy": "Vui vẻ",
            "sad": "Buồn/Mệt mỏi",
            "angry": "Căng thẳng",
            "neutral": "Ổn định",
            "fear": "Lo lắng",
            "surprise": "Ngạc nhiên"
        }

        # LUẬT ƯU TIÊN:
        # Nếu Pose phát hiện Sad (cúi đầu/chống cằm) -> Tin Pose hơn (vì mặt người già khó quét)
        if pose_emotion == "sad":
            return mapping["sad"]
            
        # Nếu đang vẫy tay (Happy ở Pose) -> Tin Pose
        if pose_emotion == "happy":
            return mapping["happy"]

        # Nếu Pose bình thường, mới xét đến kết quả từ DeepFace (Face)
        return mapping.get(face_emotion, "Ổn định")

    def detect_posture(self, frame, landmarks):
        face_emo = self.get_face_emotion(frame)
        pose_emo = self.get_pose_emotion(landmarks)
        final_emo = self.fuse_emotion(face_emo, pose_emo)
        self.emotion_buffer.append(final_emo)
        latest = self.emotion_buffer[-1]
        if self.emotion_buffer.count(latest) > len(self.emotion_buffer) * 0.3:
            return latest
        return max(set(self.emotion_buffer), key=self.emotion_buffer.count)