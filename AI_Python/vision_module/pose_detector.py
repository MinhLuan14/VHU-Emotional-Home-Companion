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
    def detect_fall(self, pts):
        if 0 not in pts or 23 not in pts or 24 not in pts:
            return False

        nose = pts[0][1]
        hip_y = (pts[23][1] + pts[24][1]) / 2

        y = [p[1] for p in pts.values() if p[2] > 0.5]
        x = [p[0] for p in pts.values() if p[2] > 0.5]

        if not y or not x:
            return False

        h = max(y) - min(y)
        w = max(x) - min(x)

        horizontal = w > h * 0.85
        head_drop = abs(nose - hip_y) < 120

        if horizontal and head_drop:
            self.fall_counter += 1
        else:
            self.fall_counter = max(0, self.fall_counter - 1)

        return self.fall_counter > 5

    # ================= POSTURE =================
    def detect_posture_score(self, pts):
        score = 100

        # shoulders
        if 11 in pts and 12 in pts:
            diff = abs(pts[11][1] - pts[12][1])
            if diff > 80:
                score -= 20

        # stooping
        if 11 in pts and 23 in pts and 25 in pts:
            angle = self._angle(pts[11], pts[23], pts[25])
            if angle < 155:
                score -= 25

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

        is_fall = self.detect_fall(pts)
        is_sitting = self.detect_sitting(pts, sh_dist)
        sit_time = self.sitting_duration(is_sitting)
        posture_score = self.detect_posture_score(pts)

        # 1. Xác định status hiện tại (Đảm bảo không bao giờ là None)
        status = "LOADING"
        risk = "SAFE"
        color = (0,255,0)

        if is_fall:
            status, risk, color = "🚨 NGÃ NGUY HIỂM", "DANGER", (0,0,255)
        elif is_sitting:
            if sit_time > 60:
                status, risk, color = "⚠️ NGỒI QUÁ LÂU", "WARNING", (0,120,255)
            else:
                status, risk, color = "🧘 NGỒI NGHỈ", "SAFE", (255,255,255)
        elif posture_score < 40:
            status, risk, color = "⚠️ TƯ THẾ XẤU", "WARNING", (0,165,255)
        else:
            status = "✅ BÌNH THƯỜNG"

        # 2. CƠ CHẾ RESET BUFFER AN TOÀN
        # Dùng list comprehension để tránh NoneType khi duyệt buffer
        if not is_sitting and self.posture_buffer:
            if any("NGỒI" in str(s) for s in self.posture_buffer if s):
                self.posture_buffer.clear()

        # 3. THÊM VÀO BUFFER TRƯỚC KHI TÍNH TOÁN FINAL_STATUS
        self.posture_buffer.append(status)

        # 4. TÍNH TOÁN TRẠNG THÁI CUỐI CÙNG (Tránh lỗi max() trên tập rỗng)
        valid_items = [str(s) for s in self.posture_buffer if s is not None]
        if valid_items:
            final_status = max(set(valid_items), key=valid_items.count)
        else:
            final_status = status

        pose_ctx = {
            "is_falling": is_fall,
            "is_sitting": is_sitting,
            "sitting_seconds": sit_time,
            "posture_score": posture_score,
            "risk_level": risk,
            "status": final_status
        }

        return final_status, color, sit_time, pose_ctx