import cv2
import mediapipe as mp
import math
import numpy as np
import time
from collections import deque

mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils

class PoseDetector:
    def __init__(self):
        self.pose = mp_pose.Pose(
            static_image_mode=False,
            model_complexity=2,
            smooth_landmarks=True,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.7
        )

        self.lmList = []
        self.prev_points = {}
        self.alpha = 0.35

        # stability buffers
        self.posture_buffer = deque(maxlen=15)
        self.fall_counter = 0

        # sitting tracking
        self.sitting_start = None
        self.sitting_history = deque(maxlen=20)
        self.fall_buffer = deque(maxlen=10)
        # risk smoothing
        self.risk_history = deque(maxlen=10)

    # ================= CORE =================
    def findPose(self, img, draw=True):
        imgRGB = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        self.results = self.pose.process(imgRGB)

        if self.results.pose_landmarks and draw:
            mp_drawing.draw_landmarks(
                img,
                self.results.pose_landmarks,
                mp_pose.POSE_CONNECTIONS
            )
        return img

    def getPosition(self, img):
        self.lmList = []

        if not self.results or not self.results.pose_landmarks:
            return self.lmList

        h, w, _ = img.shape

        for i, lm in enumerate(self.results.pose_landmarks.landmark):
            cx, cy = int(lm.x * w), int(lm.y * h)

            if i in self.prev_points:
                px, py = self.prev_points[i]
                cx = int(self.alpha * cx + (1 - self.alpha) * px)
                cy = int(self.alpha * cy + (1 - self.alpha) * py)

            self.prev_points[i] = (cx, cy)
            self.lmList.append([i, cx, cy, lm.visibility])

        return self.lmList

    # ================= UTILS =================
    def _get_pts(self):
        return {p[0]: (p[1], p[2], p[3]) for p in self.lmList}

    def _angle(self, a, b, c):
        try:
            a, b, c = np.array(a[:2]), np.array(b[:2]), np.array(c[:2])
            ba, bc = a - b, c - b
            cos = np.dot(ba, bc) / (np.linalg.norm(ba)*np.linalg.norm(bc))
            return np.degrees(np.arccos(np.clip(cos, -1.0, 1.0)))
        except:
            return 0

    # ================= FALL =================
    def detect_fall(self, pts, is_sitting=False, is_slouch=False):

        if 0 not in pts or 23 not in pts or 24 not in pts:
            return False

        nose = np.array(pts[0][:2])
        l_hip = np.array(pts[23][:2])
        r_hip = np.array(pts[24][:2])
        hip = (l_hip + r_hip) / 2

        # ================================
        # 1. BODY ORIENTATION (quan trọng nhất)
        # ================================
        body_vec = nose - hip
        vertical_vec = np.array([0, -1])  # trục Y đi xuống

        # cosine similarity (độ nghiêng cơ thể)
        norm_body = np.linalg.norm(body_vec)
        if norm_body == 0:
            return False

        cos_angle = np.dot(body_vec, vertical_vec) / (norm_body * 1.0)
        cos_angle = np.clip(cos_angle, -1.0, 1.0)

        body_angle = np.degrees(np.arccos(cos_angle))

        # ================================
        # 2. HEIGHT DROP CHECK
        # ================================
        y_coords = [p[1] for p in pts.values() if p[2] > 0.5]
        if not y_coords:
            return False

        h_person = max(y_coords) - min(y_coords)

        # ================================
        # 3. FALL CONDITIONS (MỚI)
        # ================================

        # NGÃ thật = cơ thể gần ngang + head thấp bất thường
        is_laying = body_angle > 60          # quan trọng nhất
        is_flat = h_person < 0.6 * np.ptp(y_coords) if len(y_coords) > 2 else False

        head_drop = nose[1] > hip[1] + (h_person * 0.25)

        raw_fall = is_laying and head_drop

        # ================================
        # 4. BUFFER STABILITY
        # ================================
        self.fall_buffer.append(raw_fall)

        # tăng độ nhạy nhưng vẫn ổn định
        if len(self.fall_buffer) < 5:
            return False

        return self.fall_buffer.count(True) >= 4
    # ================= POSTURE =================
    def detect_posture_score(self, pts):
        score = 100
        
        # --- Check 1: Độ lệch vai (Cân bằng hông) ---
        if 11 in pts and 12 in pts:
            shoulder_tilt = abs(pts[11][1] - pts[12][1])
            if shoulder_tilt > 45: score -= 15

        # --- Check 2: Khom lưng (Góc tạo bởi Vai - Hông - Đầu gối) ---
        # Nếu góc này nhỏ hơn 150 độ tức là lưng đang bị gập về trước
        if 11 in pts and 23 in pts and 25 in pts:
            back_angle = self._angle(pts[11], pts[23], pts[25])
            if back_angle < 155:
                # Trừ điểm nặng nếu khom sâu
                penalty = int((155 - back_angle) * 1.5)
                score -= min(40, penalty)

        # --- Check 3: Chúi đầu (Tai so với Vai) ---
        # Giúp phát hiện hội chứng "cổ rùa" khi xem điện thoại/đọc sách
        if 7 in pts and 11 in pts: # Tai trái và Vai trái
            head_forward = pts[11][1] - pts[7][1] 
            if head_forward < 20: # Tai quá gần hoặc vượt quá vai theo trục Y
                score -= 15

        return max(0, score)

    # ================= SITTING =================
    def detect_sitting(self, pts, sh_dist):
        if 23 not in pts or 25 not in pts or 11 not in pts:
            return False
        knee_gap = abs(pts[23][1] - pts[25][1])
        hip_angle = self._angle(pts[11], pts[23], pts[25])
        if hip_angle > 150:
            return False

        return knee_gap < sh_dist * 1.3

    def sitting_duration(self, is_sitting):
        if is_sitting:
            if not self.sitting_start:
                self.sitting_start = time.time()
            return int(time.time() - self.sitting_start)
        else:
            self.sitting_start = None
            return 0

    # ================= MAIN =================
    def detect_posture(self, frame=None):
        if len(self.lmList) < 10:
            return "LOADING", (200,200,200), 0, {}

        pts = self._get_pts()
        sh_dist = 100
        if 11 in pts and 12 in pts:
            sh_dist = math.hypot(pts[11][0]-pts[12][0], pts[11][1]-pts[12][1])

        # --- TÍNH TOÁN CÁC BIẾN CÒN THIẾU ---
        # 1. Tính back_angle để truyền vào pose_ctx
        back_angle = 0
        if 11 in pts and 23 in pts and 25 in pts:
            back_angle = self._angle(pts[11], pts[23], pts[25])

        # 2. Tính velocity (tốc độ thay đổi tọa độ hông - dùng để hỗ trợ detect fall)
        velocity = 0
        if 23 in pts:
            curr_hip_y = pts[23][1]
            # Lưu tọa độ hông cũ để tính vận tốc (nếu cần xử lý nâng cao)
            # Ở đây mình tạm để 0.0 hoặc tính toán đơn giản nếu bạn có buffer tọa độ
            velocity = 0.0 

        is_fall = self.detect_fall(pts)
        is_sitting = self.detect_sitting(pts, sh_dist)
        sit_time = self.sitting_duration(is_sitting)
        posture_score = self.detect_posture_score(pts)

        # 1. Xác định status hiện tại
        status = "LOADING"
        risk = "SAFE"
        color = (0,255,0)

        if is_fall:
            status, risk, color = "🚨 CẢNH BÁO: TÉ NGÃ", "DANGER", (0, 0, 255)
        elif is_sitting:
            # Luân có thể chỉnh lại mức posture_score ở đây để AI nhắc nhở sớm hơn
            if sit_time > 1800: 
                status, risk, color = "⚠️ NGỒI QUÁ LÂU", "WARNING", (0, 120, 255)
            elif posture_score < 70: # Tăng lên 70 để dễ trigger WARNING khi demo
                status, risk, color = "🪑 NGỒI SAI TƯ THẾ", "WARNING", (0, 165, 255)
            else:
                status, risk, color = "🧘 NGỒI NGHỈ", "SAFE", (255, 255, 255)
        elif posture_score < 55:
            status, risk, color = "⚠️ ĐANG KHOM LƯNG", "WARNING", (0, 165, 255)
        else:
            status, risk, color = "✅ ĐỨNG THẲNG", "SAFE", (0, 255, 0)
        
        

        # 2. CƠ CHẾ RESET BUFFER
        if not is_sitting and self.posture_buffer:
            if any("NGỒI" in str(s) for s in self.posture_buffer if s):
                self.posture_buffer.clear()

        # 3. THÊM VÀO BUFFER
        self.posture_buffer.append(status)

        # 4. TÍNH TOÁN TRẠNG THÁI CUỐI CÙNG
        valid_items = [str(s) for s in self.posture_buffer if s is not None]
        if valid_items:
            final_status = max(set(valid_items), key=valid_items.count)
        else:
            final_status = status

        # Đóng gói dữ liệu (Đã có back_angle và velocity)
        pose_ctx = {
            "is_falling": is_fall,
            "is_sitting": is_sitting,
            "sitting_seconds": sit_time,
            "posture_score": posture_score,
            "back_angle": back_angle, 
            "velocity": velocity,
            "risk_level": risk,
            "status": final_status
        }

        return final_status, color, sit_time, pose_ctx