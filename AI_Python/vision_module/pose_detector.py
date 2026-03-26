import cv2
import mediapipe as mp
import math
import numpy as np
from collections import deque

mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils

class PoseDetector:
    def __init__(self):
        # Model Complexity 2 là bắt buộc để có độ chính xác cao nhất
        self.pose = mp_pose.Pose(
            static_image_mode=False,
            model_complexity=2, 
            smooth_landmarks=True,
            min_detection_confidence=0.7, # Tăng ngưỡng để lọc bỏ bóng ma
            min_tracking_confidence=0.7
        )
        self.lmList = []
        self.prev_points = {}
        self.smooth_alpha = 0.2
        self.status_history = deque(maxlen=40) # Tăng lên 40 frame để trạng thái cực kỳ ổn định
        self.fall_counter = 0 # Bộ đếm xác nhận ngã (tránh báo giả do camera giật)
        
        # Lưu trữ lịch sử vận tốc để phân tích xu hướng ngã
        self.velocity_history = deque(maxlen=5)

    def findPose(self, img, draw=True):
        imgRGB = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        self.results = self.pose.process(imgRGB)
        if self.results.pose_landmarks and draw:
            mp_drawing.draw_landmarks(
                img, self.results.pose_landmarks, mp_pose.POSE_CONNECTIONS,
                mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2),
                mp_drawing.DrawingSpec(color=(255, 255, 255), thickness=1)
            )
        return img

    def getPosition(self, img, draw=True): # Thêm ", draw=True" vào đây
        self.lmList = []
        if not self.results or not self.results.pose_landmarks:
            return self.lmList
        h, w, _ = img.shape
        for i, lm in enumerate(self.results.pose_landmarks.landmark):
            cx, cy = int(lm.x * w), int(lm.y * h)
            # Làm mượt tọa độ dựa trên độ tin cậy của MediaPipe
            if i in self.prev_points:
                px, py = self.prev_points[i]
                cx = int(self.smooth_alpha * cx + (1 - self.smooth_alpha) * px)
                cy = int(self.smooth_alpha * cy + (1 - self.smooth_alpha) * py)
            self.prev_points[i] = (cx, cy)
            if draw:
                cv2.circle(img, (cx, cy), 5, (255, 0, 0), cv2.FILLED)
                
            self.lmList.append([i, cx, cy, lm.visibility])
        return self.lmList

    def get_angle(self, p1, p2, p3):
        """Tính góc giữa 3 điểm (Dùng vector để chính xác tuyệt đối)"""
        try:
            a = np.array(p1[:2])
            b = np.array(p2[:2])
            c = np.array(p3[:2])
            ba = a - b
            bc = c - b
            cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
            angle = np.degrees(np.arccos(np.clip(cosine_angle, -1.0, 1.0)))
            return angle
        except:
            return 0

    # --- NHẬN DIỆN CƯỜNG ĐỘ CAO ---

    def is_falling_advanced(self, pts, sh_dist):
        """Phát hiện ngã bằng phân tích vector gia tốc đầu"""
        if 0 in pts and 11 in pts and 12 in pts:
            nose_y = pts[0][1]
            shoulder_mid_y = (pts[11][1] + pts[12][1]) / 2
            
            # Tính vận tốc tức thời
            if hasattr(self, 'last_y'):
                vel = nose_y - self.last_y
                self.velocity_history.append(vel)
            self.last_y = nose_y

            # Ngã khi: Vận tốc trung bình tăng đột biến VÀ đầu nằm dưới vai
            if len(self.velocity_history) > 0:
                avg_vel = sum(self.velocity_history) / len(self.velocity_history)
                if avg_vel > (sh_dist * 0.4) and nose_y > shoulder_mid_y:
                    self.fall_counter += 1
                else:
                    self.fall_counter = max(0, self.fall_counter - 1)
            
            return self.fall_counter > 3 # Phải duy trì trạng thái ngã 3 frame mới báo động
        return False

    def is_stooping_advanced(self, pts):
        """Dùng góc gập lưng thay vì độ dốc đơn thuần"""
        # Góc tạo bởi Vai - Hông - Đầu gối (hoặc trục đứng giả định)
        if 11 in pts and 23 in pts:
            # Nếu thấy đầu gối thì dùng đầu gối, không thì dùng trục thẳng đứng
            p_knee = pts[25] if 25 in pts and pts[25][2] > 0.5 else (pts[23][0], pts[23][1] + 100, 0)
            angle = self.get_angle(pts[11], pts[23], p_knee)
            # Lưng thẳng là ~180 độ. Gù/Khom là khi góc này < 150 độ
            return angle < 155 and pts[11][2] > 0.5
        return False

    def is_waving_advanced(self, pts, sh_dist):
        """Vẫy tay: Phải có sự chuyển động ngang của cổ tay phía trên đầu"""
        if 15 in pts and 0 in pts:
            wrist = pts[15]
            nose = pts[0]
            # Cổ tay cao hơn mũi và cách xa trục thân người
            return wrist[1] < nose[1] and abs(wrist[0] - nose[0]) > (sh_dist * 0.5)
        return False

    def detect_posture(self):
        if not self.lmList or len(self.lmList) < 24:
            return "🔍 Đang quét hệ thống...", (200, 200, 200)

        # Chuyển đổi list điểm thành dict để truy cập nhanh
        pts = {it[0]: (it[1], it[2], it[3]) for it in self.lmList}
        
        # Tính sh_dist (khoảng cách 2 vai) làm thước đo động
        if 11 in pts and 12 in pts:
            sh_dist = math.hypot(pts[11][0] - pts[12][0], pts[11][1] - pts[12][1])
        else:
            sh_dist = 100

        # TÍNH TOÁN CÁC CHỈ SỐ PHỤ ĐỂ PHÂN BIỆT NGỒI/ĐỨNG
        # Kiểm tra khoảng cách hông và gối (trục Y)
        is_sitting = False
        if 23 in pts and 25 in pts:
            # Nếu khoảng cách dọc từ hông đến gối ngắn lại đáng kể => Đang ngồi
            is_sitting = abs(pts[23][1] - pts[25][1]) < (sh_dist * 1.2)

        # --- HỆ THỐNG PHÂN CẤP QUYẾT ĐỊNH (PHÂN TẦNG) ---
        
        # 1. CẤP ĐỘ KHẨN CẤP: NGÃ
        if self.is_falling_advanced(pts, sh_dist):
            status, color = "🚨 NGUY HIỂM: NGÃ", (0, 0, 255)
        
        # 2. CẤP ĐỘ CẦU CỨU: GIƠ TAY CAO (S.O.S)
        elif 15 in pts and pts[15][1] < pts[0][1]: # Tay trái cao hơn mũi
            status, color = "🆘 CẦN HỖ TRỢ GẤP", (0, 0, 255)

        # 3. CẤP ĐỘ TƯƠNG TÁC: CHÀO HỎI
        elif self.is_waving_advanced(pts, sh_dist):
            status, color = "👋 ĐANG CHÀO ROBOT", (0, 255, 0)

        # 4. CẤP ĐỘ TƯ THẾ (ĐÃ PHÂN BIỆT NGỒI VÀ ĐI)
        elif self.is_stooping_advanced(pts):
            if is_sitting:
                status, color = "⚠️ NGỒI KHOM LƯNG", (0, 165, 255) # Sửa lỗi Luân gặp
            else:
                status, color = "🚨 ĐI KHOM NGUY HIỂM", (0, 69, 255)

        # 5. CẤP ĐỘ MỆT MỎI: CHỐNG CẰM / ÔM ĐẦU
        elif 15 in pts and abs(pts[15][1] - pts[0][1]) < (sh_dist * 0.3):
            status, color = "😫 NỘI THẤY MỆT Ư?", (255, 165, 0)

        # 6. CẤP ĐỘ CÂN BẰNG: LỆCH VAI
        elif abs(pts[11][1] - pts[12][1]) > (sh_dist * 0.25):
            status, color = "⚖️ TƯ THẾ LỆCH VAI", (255, 0, 255)

        else:
            if is_sitting:
                status, color = "🧘 ĐANG NGỒI NGHỈ", (255, 255, 255)
            else:
                status, color = "✅ TRẠNG THÁI TỐT", (255, 255, 255)


        self.status_history.append(status)
        if len(self.status_history) > 15:
            self.status_history.popleft()
            
        final_status = max(set(self.status_history), key=self.status_history.count)
        return final_status, color