import cv2
import time
import os
import sys
import numpy as np
from ultralytics import YOLO


class ObjectDetector:
    def __init__(self, model_path='yolov10n.pt'):
        if not os.path.exists(model_path):
            print(f"⚠️ Không tìm thấy {model_path}")

        self.model = YOLO(model_path)
        self.min_conf = 0.4

        self.label_vn = {
            'person': 'nguoi',
            'chair': 'cai ghe',
            'couch': 'ghe sofa',
            'bed': 'giuong ngu',
            'tv': 'tivi',
            'laptop': 'may tinh',
            'cell phone': 'dien thoai',
            'bottle': 'chai nuoc',
            'cup': 'ly nuoc',
            'book': 'cuon sach',
            'remote': 'remote'
        }

    # ========================
    # DISTANCE
    # ========================
    def calculate_distance(self, p1, p2):
        return np.linalg.norm(np.array(p1) - np.array(p2))

    # ========================
    # DETECT
    # ========================
    def detect_objects(self, frame):
        try:
            results = self.model(frame, conf=self.min_conf, verbose=False)[0]

            detected_list = []

            for box in results.boxes:
                conf = float(box.conf[0])
                if conf < self.min_conf:
                    continue

                cls_id = int(box.cls[0])
                name_en = self.model.names[cls_id]
                name_vn = self.label_vn.get(name_en, name_en)

                x1, y1, x2, y2 = map(int, box.xyxy[0])
                center = ((x1 + x2) // 2, (y1 + y2) // 2)

                detected_list.append({
                    "label_en": name_en,
                    "label": name_vn,
                    "bbox": (x1, y1, x2, y2),
                    "center": center,
                    "conf": conf,
                    "timestamp": time.time()
                })

            relations = self.analyze_relationships(detected_list)
            context = self.build_context(detected_list, relations)

            return detected_list, context

        except Exception as e:
            print(f"❌ Object detect error: {e}")
            return [], {}

    # ========================
    # RELATION
    # ========================
    def analyze_relationships(self, objects):
        persons = [o for o in objects if o["label_en"] == "person"]
        relations = []

        if not persons:
            return relations

        person = persons[0]
        p_center = person["center"]

        for obj in objects:
            if obj["label_en"] == "person":
                continue

            dist = self.calculate_distance(p_center, obj["center"])

            relation = "none"

            if obj["label_en"] in ["chair", "couch"] and dist < 150:
                relation = "sitting_near"

            elif obj["label_en"] == "bed" and dist < 180:
                relation = "lying_on_bed"

            elif obj["label_en"] in ["bottle", "cup"] and dist < 120:
                relation = "using_object"

            elif dist < 100:
                relation = "near_object"

            relations.append({
                "object": obj["label_en"],
                "relation": relation,
                "distance": float(dist)
            })

        return relations

    # ========================
    # CONTEXT
    # ========================
    def build_context(self, objects, relations):
        context = {
            "time": time.strftime("%H:%M"),
            "person_present": any(o["label_en"] == "person" for o in objects),
            "objects": list(set([o["label_en"] for o in objects])),
            "relations": relations,
            "activity": "unknown"
        }

        for r in relations:
            if r["relation"] == "lying_on_bed":
                context["activity"] = "lying"
                return context

            if r["relation"] == "sitting_near":
                context["activity"] = "sitting"
                return context

        if context["person_present"]:
            context["activity"] = "standing"

        return context

    # ========================
    # DRAW
    # ========================
    def draw_objects(self, frame, objects, context):
        for obj in objects:
            x1, y1, x2, y2 = obj['bbox']
            label = f"{obj['label']} {int(obj['conf']*100)}%"

            cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 191, 0), 2)
            cv2.circle(frame, obj['center'], 4, (0, 0, 255), -1)

            cv2.putText(frame, label, (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 191, 0), 2)

        cv2.putText(frame,
                    f"Activity: {context.get('activity','')}",
                    (20, 30),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 0, 255),
                    2)

        return frame

    # ========================
    # PIPELINE
    # ========================
    def process(self, frame):
        objects, context = self.detect_objects(frame)
        frame = self.draw_objects(frame, objects, context)
        return frame, objects, context