from collections import deque, defaultdict
import time
import math
from .vector_memory import VectorMemory


class ContextEngine:
    def __init__(self):
        # ================= MEMORY =================
        self.short_term = deque(maxlen=100)   # sự kiện gần
        self.long_term = defaultdict(int)     # thói quen
        self.vector = VectorMemory()          # semantic memory

        # ================= STATE =================
        self.last_status = None
        self.last_speak = 0

        # ================= TRACKING =================
        self.position_history = deque(maxlen=10)
        self.activity_duration = defaultdict(float)
        self.last_activity_time = time.time()

    # =====================================================
    # MAIN PIPELINE
    # =====================================================
    def process_frame(self, pose_ctx, objects, emotion):
        if pose_ctx is None:
            return None, None

        now = time.time()

        # ===== EXTRACT =====
        labels = [o['label_en'] for o in objects]
        activity = pose_ctx.get("pose_type", "unknown")
        risk = pose_ctx.get("risk_level", "low")
        sitting_time = pose_ctx.get("sitting_time", 0)

        # ===== UPDATE TEMPORAL =====
        self.update_activity_time(activity, now)

        # ===== PREDICTION (🔥 nâng cấp lớn) =====
        predicted_risk = self.predict_risk(pose_ctx)

        # ===== REASONING =====
        status = self.infer_status(
            activity, labels, emotion, sitting_time, predicted_risk
        )

        if status == self.last_status:
            return None, None

        self.last_status = status

        # ===== EVENT =====
        event = {
            "status": status,
            "emotion": emotion,
            "activity": activity,
            "risk": predicted_risk,
            "time": now
        }

        # ===== MEMORY UPDATE =====
        self.short_term.append(event)
        self.vector.add(str(event))
        self.long_term[status] += 1

        # ===== CONTEXT =====
        context = self.build_context(event, labels)

        return status, context

    # =====================================================
    # TEMPORAL TRACKING
    # =====================================================
    def update_activity_time(self, activity, now):
        delta = now - self.last_activity_time
        self.activity_duration[activity] += delta
        self.last_activity_time = now

    # =====================================================
    # RISK PREDICTION (🔥 ĐIỂM ĂN TIỀN NCKH)
    # =====================================================
    def predict_risk(self, pose_ctx):
        risk_score = 0

        # Rule 1: fall risk
        if pose_ctx.get("pose_type") == "fall":
            return "high"

        # Rule 2: sitting too long
        if pose_ctx.get("sitting_time", 0) > 900:
            risk_score += 2

        # Rule 3: bad posture lâu
        if pose_ctx.get("pose_type") == "bad_posture":
            risk_score += 1

        # Rule 4: activity abnormal
        if self.activity_duration.get("unknown", 0) > 60:
            risk_score += 1

        # Convert score → level
        if risk_score >= 3:
            return "high"
        elif risk_score == 2:
            return "medium"
        else:
            return "low"

    # =====================================================
    # REASONING
    # =====================================================
    def infer_status(self, activity, objects, emotion, sitting_time, risk):
        if activity == "fall":
            return "🚨 Nội bị té"

        if risk == "high":
            return "⚠️ Nội đang nguy hiểm"

        if activity == "sitting" and sitting_time > 600:
            return "🪑 Nội ngồi lâu"

        if "bed" in objects:
            return "🛏️ Nội đang nghỉ"

        if "chair" in objects and activity == "sitting":
            return "🪑 Nội đang ngồi"

        if emotion in ["sad", "Buồn/Mệt mỏi"]:
            return "😔 Nội có vẻ mệt"

        if emotion in ["happy", "Vui vẻ"]:
            return "😊 Nội đang vui"

        return "🙂 Nội đang sinh hoạt"

    # =====================================================
    # CONTEXT BUILDER (🔥 CHO GROQ)
    # =====================================================
    def build_context(self, event, objects):
        recent = list(self.short_term)[-5:]

        context = {
            "current": event,
            "recent": recent,
            "related": self.vector.search(str(event)),
            "habits": dict(self.long_term),
            "environment": objects,
            "risk": event["risk"],
            "activity": event["activity"]
        }

        context["description"] = self.generate_description(context)

        return context

    # =====================================================
    # NATURAL LANGUAGE CONTEXT
    # =====================================================
    def generate_description(self, context):
        e = context["current"]

        desc = f"{e['status']}"

        if context["environment"]:
            desc += f", xung quanh có {', '.join(context['environment'][:3])}"

        if context["risk"] == "high":
            desc += ", có nguy cơ cao"

        return desc

    # =====================================================
    # SPEAK CONTROL
    # =====================================================
    def should_speak(self):
        if time.time() - self.last_speak < 12:
            return False

        self.last_speak = time.time()
        return True