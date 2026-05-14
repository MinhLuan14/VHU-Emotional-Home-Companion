import cv2
import time
import os
import numpy as np
import torch

from ultralytics import YOLO


class ObjectDetector:

    def __init__(self, model_path='yolov10n.pt'):

        print("🚀 Loading YOLO Model...")

        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"❌ Không tìm thấy model: {model_path}"
            )

        # ==========================================
        # LOAD MODEL
        # ==========================================
        self.model = YOLO(model_path)

        # GPU
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        self.model.to(self.device)

        print(f"✅ Using device: {self.device}")

        # ==========================================
        # CONFIG
        # ==========================================
        self.min_conf = 0.35
        self.iou = 0.5

        self.imgsz = 960

        # object tồn tại tạm thời khi detect fail
        self.object_ttl = 3.0

        # smooth box
        self.smooth_boxes = {}

        # cache
        self.last_objects = []
        self.last_detect_time = 0

        # anti flicker
        self.object_history = {}

        # object phải xuất hiện tối thiểu N frame
        self.min_appear_frames = 2

        # max memory
        self.max_history = 100

        # tracking cache
        self.track_memory = {}

        # ==========================================
        # LABEL VN
        # ==========================================
        self.label_vn = {

            # PERSON
            'person': 'nguoi',

            # FURNITURE
            'chair': 'cai ghe',
            'couch': 'ghe sofa',
            'bed': 'giuong ngu',
            'dining table': 'ban an',
            'toilet': 'bon cau',

            # ELECTRONIC
            'tv': 'tivi',
            'laptop': 'may tinh',
            'cell phone': 'dien thoai',
            'keyboard': 'ban phim',
            'mouse': 'chuot',
            'remote': 'remote',
            'microwave': 'lo vi song',
            'oven': 'lo nuong',
            'refrigerator': 'tu lanh',

            # OBJECT
            'bottle': 'chai nuoc',
            'cup': 'ly nuoc',
            'book': 'cuon sach',
            'clock': 'dong ho',
            'backpack': 'ba lo',
            'handbag': 'tui xach',
            'scissors': 'keo',

            # FOOD
            'banana': 'chuoi',
            'apple': 'tao',
            'orange': 'cam',

            # ANIMAL
            'dog': 'con cho',
            'cat': 'con meo',

            # VEHICLE
            'car': 'xe hoi',
            'motorcycle': 'xe may',
            'bicycle': 'xe dap',

            # DECOR
            'potted plant': 'chau cay'
        }

        print("✅ YOLO Loaded Successfully")

    # =========================================================
    # DISTANCE
    # =========================================================
    def calculate_distance(self, p1, p2):
        return np.linalg.norm(np.array(p1) - np.array(p2))

    # =========================================================
    # CLEAN MEMORY
    # =========================================================
    def cleanup_history(self):

        if len(self.object_history) <= self.max_history:
            return

        sorted_items = sorted(
            self.object_history.items(),
            key=lambda x: x[1]
        )

        remove_count = len(sorted_items) - self.max_history

        for i in range(remove_count):
            key = sorted_items[i][0]
            del self.object_history[key]

    # =========================================================
    # HANDLE EMPTY
    # =========================================================
    def handle_empty_detection(self):

        if time.time() - self.last_detect_time < self.object_ttl:

            relations = self.analyze_relationships(
                self.last_objects
            )

            context = self.build_context(
                self.last_objects,
                relations
            )

            return self.last_objects, context

        return [], {}

    # =========================================================
    # DETECT OBJECTS
    # =========================================================
    def detect_objects(self, frame):

        try:

            # ==========================================
            # YOLO TRACKING
            # ==========================================
            results = self.model.track(
                frame,
                persist=True,
                conf=self.min_conf,
                iou=self.iou,
                imgsz=self.imgsz,
                tracker="bytetrack.yaml",
                verbose=False
            )[0]

            detected_list = []

            # ==========================================
            # NO BOX
            # ==========================================
            if results.boxes is None:
                return self.handle_empty_detection()

            # ==========================================
            # LOOP OBJECT
            # ==========================================
            for box in results.boxes:

                try:

                    conf = float(box.conf[0])

                    if conf < self.min_conf:
                        continue

                    cls_id = int(box.cls[0])

                    name_en = self.model.names[cls_id]

                    name_vn = self.label_vn.get(
                        name_en,
                        name_en
                    )

                    # ==========================================
                    # BBOX
                    # ==========================================
                    x1, y1, x2, y2 = map(
                        int,
                        box.xyxy[0]
                    )

                    center = (
                        (x1 + x2) // 2,
                        (y1 + y2) // 2
                    )

                    # ==========================================
                    # TRACK ID
                    # ==========================================
                    track_id = None

                    if box.id is not None:
                        track_id = int(box.id[0])

                    # ==========================================
                    # SMOOTH BOX
                    # ==========================================
                    if track_id is not None:

                        prev = self.smooth_boxes.get(track_id)

                        if prev:

                            px1, py1, px2, py2 = prev

                            alpha = 0.92

                            x1 = int(
                                px1 * alpha +
                                x1 * (1 - alpha)
                            )

                            y1 = int(
                                py1 * alpha +
                                y1 * (1 - alpha)
                            )

                            x2 = int(
                                px2 * alpha +
                                x2 * (1 - alpha)
                            )

                            y2 = int(
                                py2 * alpha +
                                y2 * (1 - alpha)
                            )

                        self.smooth_boxes[track_id] = (
                            x1,
                            y1,
                            x2,
                            y2
                        )

                    # ==========================================
                    # ANTI FLICKER
                    # ==========================================
                    key = f"{name_en}_{track_id}"

                    count = self.object_history.get(key, 0)

                    self.object_history[key] = count + 1

                    if self.object_history[key] < self.min_appear_frames:
                        continue

                    # ==========================================
                    # OBJECT
                    # ==========================================
                    obj = {

                        "id": track_id,

                        "label_en": name_en,

                        "label": name_vn,

                        "bbox": (
                            x1,
                            y1,
                            x2,
                            y2
                        ),

                        "center": center,

                        "conf": round(conf, 2),

                        "timestamp": time.time()
                    }

                    detected_list.append(obj)

                except Exception as e:
                    print("⚠️ Box Error:", e)

            # ==========================================
            # CACHE
            # ==========================================
            if detected_list:

                self.last_objects = detected_list

                self.last_detect_time = time.time()

            else:

                if (
                    time.time() - self.last_detect_time
                    < self.object_ttl
                ):
                    detected_list = self.last_objects

            self.cleanup_history()

            # ==========================================
            # RELATION
            # ==========================================
            relations = self.analyze_relationships(
                detected_list
            )

            # ==========================================
            # CONTEXT
            # ==========================================
            context = self.build_context(
                detected_list,
                relations
            )

            return detected_list, context

        except Exception as e:

            print(f"❌ Object Detect Error: {e}")

            return self.handle_empty_detection()

    # =========================================================
    # RELATIONSHIP
    # =========================================================
    def analyze_relationships(self, objects):

        persons = [
            o for o in objects
            if o["label_en"] == "person"
        ]

        relations = []

        if not persons:
            return relations

        # MULTI PERSON
        for person in persons:

            p_center = person["center"]

            for obj in objects:

                if obj["label_en"] == "person":
                    continue

                dist = self.calculate_distance(
                    p_center,
                    obj["center"]
                )

                relation = "none"

                if (
                    obj["label_en"] in ["chair", "couch"]
                    and dist < 150
                ):
                    relation = "sitting_near"

                elif (
                    obj["label_en"] == "bed"
                    and dist < 180
                ):
                    relation = "lying_on_bed"

                elif (
                    obj["label_en"] in ["bottle", "cup"]
                    and dist < 120
                ):
                    relation = "using_object"

                elif dist < 100:
                    relation = "near_object"

                relations.append({

                    "person_id": person["id"],

                    "object": obj["label_en"],

                    "relation": relation,

                    "distance": round(float(dist), 2)
                })

        return relations

    # =========================================================
    # BUILD CONTEXT
    # =========================================================
    def build_context(self, objects, relations):

        context = {

            "time": time.strftime("%H:%M"),

            "person_present": any(
                o["label_en"] == "person"
                for o in objects
            ),

            "person_count": len([
                o for o in objects
                if o["label_en"] == "person"
            ]),

            "objects": list(set([
                o["label_en"]
                for o in objects
            ])),

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

    # =========================================================
    # DRAW
    # =========================================================
    def draw_objects(self, frame, objects, context):

        for obj in objects:

            x1, y1, x2, y2 = obj['bbox']

            conf = int(obj['conf'] * 100)

            label = f"{obj['label']} {conf}%"

            # ==========================================
            # BOX
            # ==========================================
            cv2.rectangle(
                frame,
                (x1, y1),
                (x2, y2),
                (255, 191, 0),
                2
            )

            # ==========================================
            # CENTER
            # ==========================================
            cv2.circle(
                frame,
                obj['center'],
                4,
                (0, 0, 255),
                -1
            )

            # ==========================================
            # LABEL
            # ==========================================
            cv2.putText(
                frame,
                label,
                (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (255, 191, 0),
                2
            )

            # ==========================================
            # TRACK ID
            # ==========================================
            if obj["id"] is not None:

                cv2.putText(
                    frame,
                    f"ID:{obj['id']}",
                    (x1, y2 + 20),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (0, 255, 0),
                    2
                )

        # ==========================================
        # ACTIVITY
        # ==========================================
        cv2.putText(
            frame,
            f"Activity: {context.get('activity', '')}",
            (20, 35),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 0, 255),
            2
        )

        # ==========================================
        # OBJECT COUNT
        # ==========================================
        cv2.putText(
            frame,
            f"Objects: {len(objects)}",
            (20, 70),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 255, 255),
            2
        )

        # ==========================================
        # PERSON COUNT
        # ==========================================
        cv2.putText(
            frame,
            f"Persons: {context.get('person_count', 0)}",
            (20, 105),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (255, 255, 0),
            2
        )

        return frame

    # =========================================================
    # PIPELINE
    # =========================================================
    def process(self, frame):

        objects, context = self.detect_objects(frame)

        frame = self.draw_objects(
            frame,
            objects,
            context
        )

        return frame, objects, context