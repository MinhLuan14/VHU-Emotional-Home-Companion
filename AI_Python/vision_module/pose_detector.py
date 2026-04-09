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
        self.smooth_alpha = 0.3  # Mượt vừa phải, phản ứng nhanh vừa đủ
        self.status_history = deque(maxlen=30)  # Lấy trạng thái nhiều khung để ổn định

        # Biến cho NGÃ
        self.fall_counter = 0
        self.velocity_history = deque(maxlen=5)
        self.last_y = None

        # Biến cho NGỒI LÂU
        self.sitting_start_time = None
        self.SITTING_LIMIT = 60  # 15 phút, chỉnh test nhanh xuống 10 giây nếu cần

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

    def getPosition(self, img, draw=False):
        self.lmList = []
        if not self.results or not self.results.pose_landmarks:
            return self.lmList
        h, w, _ = img.shape
        for i, lm in enumerate(self.results.pose_landmarks.landmark):
            cx, cy = int(lm.x * w), int(lm.y * h)
            # Smooth points
            if i in self.prev_points:
                px, py = self.prev_points[i]
                cx = int(self.smooth_alpha * cx + (1 - self.smooth_alpha) * px)
                cy = int(self.smooth_alpha * cy + (1 - self.smooth_alpha) * py)
            self.prev_points[i] = (cx, cy)
            self.lmList.append([i, cx, cy, lm.visibility])
        return self.lmList

    def get_angle(self, p1, p2, p3):
        try:
            a, b, c = np.array(p1[:2]), np.array(p2[:2]), np.array(p3[:2])
            ba, bc = a - b, c - b
            cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
            return np.degrees(np.arccos(np.clip(cosine_angle, -1.0, 1.0)))
        except:
            return 0

    # --- NGỒI LÂU ---
    def check_sitting_duration(self, is_sitting):
        if is_sitting:
            if self.sitting_start_time is None:
                self.sitting_start_time = time.time()
            elapsed = time.time() - self.sitting_start_time
            return elapsed > self.SITTING_LIMIT, int(elapsed) # Trả về thêm elapsed
        else:
            self.sitting_start_time = None
            return False, 0

    # --- NGÃ ---
    def is_falling_advanced(self, pts, sh_dist):
        if 0 in pts and 11 in pts and 12 in pts:
            nose_y = pts[0][1]
            shoulder_mid_y = (pts[11][1] + pts[12][1]) / 2
            if self.last_y is None:
                self.last_y = nose_y
            vel = nose_y - self.last_y
            self.velocity_history.append(vel)
            self.last_y = nose_y
            avg_vel = sum(self.velocity_history) / len(self.velocity_history)
            if avg_vel > (sh_dist * 0.42) and nose_y > shoulder_mid_y:  # Vừa nhạy vừa chặt
                self.fall_counter += 1
            else:
                self.fall_counter = max(0, self.fall_counter - 1)
            return self.fall_counter > 2
        return False

    # --- KHOM LƯNG (Ngưỡng 162°) ---
    def is_stooping_strict(self, pts):
        if 11 in pts and 23 in pts:
            p_knee = pts[25] if 25 in pts and pts[25][2] > 0.5 else (pts[23][0], pts[23][1] + 100, 0)
            angle = self.get_angle(pts[11], pts[23], p_knee)
            return angle < 162 and pts[11][2] > 0.5
        return False

    # --- VẪY TAY ---
    def is_waving(self, pts, sh_dist):
        for wrist_id in [15,16]:
            if wrist_id in pts and 0 in pts:
                wrist = pts[wrist_id]
                nose = pts[0]
                if wrist[1] < nose[1] and abs(wrist[0]-nose[0]) > (sh_dist * 0.45):
                    return True
        return False

    # --- TỔNG HỢP ---
    def detect_posture(self):
        if not self.lmList or len(self.lmList) < 24:
            return "🔍 Đang quét hệ thống...", (200, 200, 200), 0

        pts = {it[0]: (it[1], it[2], it[3]) for it in self.lmList}
        sh_dist = math.hypot(pts[11][0]-pts[12][0], pts[11][1]-pts[12][1]) if 11 in pts and 12 in pts else 100

        # Ngồi
        is_sitting = 23 in pts and 25 in pts and abs(pts[23][1]-pts[25][1]) < (sh_dist*1.3)
        too_long, sitting_seconds = self.check_sitting_duration(is_sitting)

        # Các tư thế khác
        is_stooping = self.is_stooping_strict(pts)
        shoulder_lean = 11 in pts and 12 in pts and abs(pts[11][1]-pts[12][1]) > (sh_dist*0.2)

        # --- ƯU TIÊN ---
        if self.is_falling_advanced(pts, sh_dist):
            status, color = "🚨 NGUY HIỂM: NGÃ", (0,0,255)
        elif any(pts[i][1] < pts[0][1] for i in [15,16] if i in pts and pts[i][2]>0.5):
            status, color = "🆘 CẦN HỖ TRỢ GẤP", (0,0,255)
        elif is_stooping:
            status, color = ("⚠️ NGỒI KHOM LƯNG", (0,165,255)) if is_sitting else ("🚨 ĐI KHOM NGUY HIỂM", (0,69,255))
        elif shoulder_lean:
            status, color = "⚖️ TƯ THẾ LỆCH VAI", (255,0,255)
        elif too_long:
            status, color = "⚠️ NỘI NGỒI QUÁ LÂU", (0,120,255)
        elif self.is_waving(pts, sh_dist):
            status, color = "👋 ĐANG CHÀO ROBOT", (0,255,0)
        elif any(i in pts and abs(pts[i][1]-pts[0][1]) < (sh_dist*0.2) for i in [15,16]):
            status, color = "😫 NỘI THẤY MỆT Ư?", (255,165,0)
        else:
            status, color = ("🧘 ĐANG NGỒI NGHỈ", (255,255,255)) if is_sitting else ("✅ TRẠNG THÁI TỐT", (255,255,255))

        self.status_history.append(status)
        final_status = max(set(self.status_history), key=self.status_history.count)
        return final_status, color, sitting_seconds