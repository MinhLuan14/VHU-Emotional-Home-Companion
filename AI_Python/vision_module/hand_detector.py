import cv2
import mediapipe as mp

class HandDetector:
    def __init__(self, mode=False, maxHands=1, detectionCon=0.7, trackCon=0.5):

        self.mp_hands = mp.solutions.hands

        self.hands = self.mp_hands.Hands(
            static_image_mode=mode,
            max_num_hands=maxHands,
            min_detection_confidence=detectionCon,
            min_tracking_confidence=trackCon
        )

        self.mp_draw = mp.solutions.drawing_utils
        self.tipIds = [4, 8, 12, 16, 20]

        self.lmList = []

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

    def getPosition(self, img, handNo=0):
        self.lmList = []

        if self.results.multi_hand_landmarks:
            hand = self.results.multi_hand_landmarks[handNo]

            h, w, _ = img.shape

            for id, lm in enumerate(hand.landmark):
                cx, cy = int(lm.x * w), int(lm.y * h)
                self.lmList.append([id, cx, cy])

        return self.lmList

    def fingersUp(self):
        if not self.lmList:
            return [0, 0, 0, 0, 0]

        fingers = []

        # Thumb (x-axis)
        if self.lmList[self.tipIds[0]][1] < self.lmList[self.tipIds[0] - 1][1]:
            fingers.append(1)
        else:
            fingers.append(0)

        # 4 fingers (y-axis)
        for i in range(1, 5):
            if self.lmList[self.tipIds[i]][2] < self.lmList[self.tipIds[i] - 2][2]:
                fingers.append(1)
            else:
                fingers.append(0)

        return fingers

    def getGestureAction(self, fingers):
        if fingers == [1, 0, 0, 0, 0]:
            return "VOLUME_UP"
        if fingers == [0, 1, 0, 0, 0]:
            return "VOLUME_DOWN"
        if fingers == [1, 1, 0, 0, 0]:
            return "SCROLL_UP"
        if fingers == [1, 1, 1, 0, 0]:
            return "SCROLL_DOWN"
        if fingers == [1, 1, 1, 1, 1]:
            return "MOVE_CURSOR"

        return "NONE"