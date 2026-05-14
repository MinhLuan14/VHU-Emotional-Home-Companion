import cv2
import mediapipe as mp
import time
import numpy as np


class HandDetector:
    def __init__(self,
                 maxHands=1,
                 detectionCon=0.7,
                 trackCon=0.6):

        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=maxHands,
            min_detection_confidence=detectionCon,
            min_tracking_confidence=trackCon
        )

        self.mp_draw = mp.solutions.drawing_utils

        # store landmarks
        self.lmList = []

        # motion tracking
        self.prev_hand_y = None
        self.prev_hand_x = None
        self.prev_time = time.time()

        # gesture cooldown
        self.last_gesture = "NONE"
        self.last_time = 0

        # threshold tuning
        self.swipe_threshold = 40
        self.wave_threshold = 30
        self.cooldown = 1.2

    # ==================================================
    # FIND HANDS
    # ==================================================
    def findHands(self, img, draw=True):

        imgRGB = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        self.results = self.hands.process(imgRGB)

        if self.results.multi_hand_landmarks:

            for handLms in self.results.multi_hand_landmarks:

                if draw:
                    self.mp_draw.draw_landmarks(
                        img,
                        handLms,
                        self.mp_hands.HAND_CONNECTIONS
                    )

        return img

    # ==================================================
    # GET POSITION
    # ==================================================
    def getPosition(self, img, handNo=0):

        self.lmList = []

        if self.results.multi_hand_landmarks:

            hand = self.results.multi_hand_landmarks[handNo]

            h, w, _ = img.shape

            for id, lm in enumerate(hand.landmark):
                cx, cy = int(lm.x * w), int(lm.y * h)
                self.lmList.append([id, cx, cy])

        return self.lmList

    # ==================================================
    # DETECT OPEN PALM
    # ==================================================
    def is_open_palm(self):
        if not self.lmList:
            return False

        # simple rule: fingers visible spread
        y_values = [self.lmList[i][2] for i in [8, 12, 16, 20]]

        return max(y_values) < self.lmList[0][2] + 80
    def getGesture(self, img):
        self.findHands(img)
        lmList = self.getPosition(img)

        if not lmList:
            return "NONE"

        # center hand
        cx = int(np.mean([lmList[i][1] for i in range(len(lmList))]))
        cy = int(np.mean([lmList[i][2] for i in range(len(lmList))]))

        fingers = self.fingersUp() if hasattr(self, "fingersUp") else []

        motion_gesture = self.detect_motion(cx, cy)

        # ưu tiên motion trước
        if motion_gesture != "NONE":
            return motion_gesture

        # fallback finger gestures
        return self.getGestureAction(fingers)
    def fingersUp(self):
        fingers = []
        if not self.lmList or len(self.lmList) < 21:
            return [0, 0, 0, 0, 0]

        # Ngón cái (Thumb) - So sánh trục X (vì ngón cái gập ngang)
        # Kiểm tra xem đầu ngón cái (4) nằm bên trái hay bên phải khớp (3)
        if self.lmList[4][1] > self.lmList[3][1]:
            fingers.append(1)
        else:
            fingers.append(0)

        # 4 ngón còn lại - So sánh trục Y (đầu ngón phải cao hơn khớp)
        tipIds = [8, 12, 16, 20] # Trỏ, Giữa, Áp út, Út
        for id in tipIds:
            if self.lmList[id][2] < self.lmList[id - 2][2]:
                fingers.append(1)
            else:
                fingers.append(0)
        
        return fingers
    # ==================================================
    # MOTION ANALYSIS
    # ==================================================
    def detect_motion(self, center_x, center_y):

        gesture = "NONE"
        now = time.time()

        if self.prev_hand_y is None:
            self.prev_hand_y = center_y
            self.prev_hand_x = center_x
            return "NONE"

        dy = center_y - self.prev_hand_y
        dx = center_x - self.prev_hand_x

        # cooldown chống spam
        if now - self.last_time < self.cooldown:
            return "NONE"

        # ==============================
        # SWIPE UP (tăng âm lượng)
        # ==============================
        if dy < -self.swipe_threshold:
            gesture = "VOLUME_UP"

        # ==============================
        # SWIPE DOWN (giảm âm lượng)
        # ==============================
        elif dy > self.swipe_threshold:
            gesture = "VOLUME_DOWN"

        # ==============================
        # WAVE LEFT/RIGHT (gọi Ami)
        # ==============================
        elif abs(dx) > self.wave_threshold:
            gesture = "CALL_AMI"

        # update state
        if gesture != "NONE":
            self.last_time = now
            self.last_gesture = gesture

        self.prev_hand_x = center_x
        self.prev_hand_y = center_y

        return gesture

    # ==================================================
    # MAIN GESTURE API
    # ==================================================
    def getGestureAction(self, fingers):
        # 1. Nắm đấm (Gập hết ngón tay) -> Vẫy tay chào (WAVE)
        if fingers == [0, 0, 0, 0, 0]:
            return "WAVE_HAND"

        # 2. Xòe bàn tay -> OPEN_PALM
        if fingers == [1, 1, 1, 1, 1]:
            return "OPEN_PALM"

        # 3. Chỉ ngón trỏ và ngón giữa -> SWIPE_UP (Tăng âm lượng hoặc cuộn)
        if fingers == [0, 1, 1, 0, 0]:
            return "VOLUME_UP"

        # 4. Giơ ngón cái (Like) -> OK / GOOD
        if fingers == [1, 0, 0, 0, 0]:
            return "LIKE"

        # 5. Cử chỉ gọi Ami (Ví dụ: Giơ ngón út)
        if fingers == [0, 0, 0, 0, 1]:
            return "CALL_AMI"

        return "NONE"