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
        if not landmarks:
            return "neutral"

        try:
            # Lấy tọa độ các điểm quan trọng
            nose = landmarks[0]
            l_shoulder, r_shoulder = landmarks[11], landmarks[12]
            l_elbow, r_elbow = landmarks[13], landmarks[14]
            l_wrist, r_wrist = landmarks[15], landmarks[16]
            l_hip, r_hip = landmarks[23], landmarks[24]

            # Tính toán các chỉ số vật lý
            avg_shoulder_y = (l_shoulder.y + r_shoulder.y) / 2
            avg_elbow_y = (l_elbow.y + r_elbow.y) / 2
            avg_hip_y = (l_hip.y + r_hip.y) / 2
            
            # --- LOGIC PHÂN TÍCH CHUẨN ---

            # 1. SAD (Buồn/Mệt mỏi): Đầu gục thấp hẳn dưới vai HOẶC Tay chống cằm/ôm mặt lâu
            # (Khoảng cách tay tới mặt rất gần)
            hand_to_face_dist = min(
                np.sqrt((l_wrist.x - nose.x)**2 + (l_wrist.y - nose.y)**2),
                np.sqrt((r_wrist.x - nose.x)**2 + (r_wrist.y - nose.y)**2)
            )
            if nose.y > avg_shoulder_y + 0.05 or hand_to_face_dist < 0.1:
                return "sad"

            # 2. ANGRY/STRESSED (Giận dữ/Căng thẳng): Tay chống hông HOẶC Khoanh tay trước ngực
            # (Khuỷu tay đưa ra xa thân người trong khi tay ở gần hông)
            if avg_elbow_y > avg_shoulder_y and hand_to_face_dist > 0.3:
                # Nếu khuỷu tay ngang tầm hông nhưng tay không giơ cao -> Đang bực bội/chống hông
                if abs(l_wrist.y - l_hip.y) < 0.1 or abs(r_wrist.y - r_hip.y) < 0.1:
                    return "angry"

            # 3. HAPPY (Vui vẻ): Tay giơ cao hơn vai (Vẫy tay) HOẶC Tay mở rộng (Thoải mái)
            if l_wrist.y < l_shoulder.y or r_wrist.y < r_shoulder.y:
                return "happy"

        except Exception as e:
            print(f"Pose Emotion Error: {e}")
            
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

    def detect(self, frame, landmarks):
        # 1. Lấy cảm xúc từ mặt
        face_emo = self.get_face_emotion(frame)
        
        # 2. Lấy cảm xúc từ dáng bộ (Quan trọng nhất cho người già)
        pose_emo = self.get_pose_emotion(landmarks)

        # 3. Kết hợp kết quả
        final_emo = self.fuse_emotion(face_emo, pose_emo)
        
        # 4. Dùng Buffer để tránh tình trạng cảm xúc bị "giật" (đang vui nhảy sang buồn ngay)
        self.emotion_buffer.append(final_emo)
        
        # Trả về cảm xúc xuất hiện nhiều nhất trong 20 khung hình gần nhất
        stable_emotion = max(set(self.emotion_buffer), key=self.emotion_buffer.count)

        return stable_emotion