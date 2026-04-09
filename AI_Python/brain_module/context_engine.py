from collections import deque, defaultdict
import time
from .vector_memory import VectorMemory

class ContextEngine:
    def __init__(self):
        self.short_term = deque(maxlen=50)
        self.long_term = defaultdict(int)
        self.vector = VectorMemory()

        self.last_status = None
        self.last_speak = 0

    def process_frame(self, pose, objects, emotion):
        if pose is None:
            return None, None

        labels = [o['label'] for o in objects]

        if "phone" in labels:
            status = "Nội đang dùng điện thoại"
        elif emotion == "sad":
            status = "Nội đang buồn"
        else:
            status = "Nội đang sinh hoạt"

        if status == self.last_status:
            return None, None

        self.last_status = status

        event = f"{status} | {emotion}"
        self.short_term.append(event)
        self.vector.add(event)
        self.long_term[status] += 1

        memory = {
            "recent": list(self.short_term)[-5:],
            "related": self.vector.search(event),
            "habits": dict(self.long_term)
        }

        return status, memory

    def should_speak(self):
        if time.time() - self.last_speak < 20:
            return False
        self.last_speak = time.time()
        return True