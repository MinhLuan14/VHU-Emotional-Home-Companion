import cv2
import time
import os
import sys
import torch

# 1. PHẢI ĐƯA LÊN ĐẦU: Ép Python ưu tiên folder yolov10 nội bộ
# Chúng ta dùng insert(0, ...) để nó đứng đầu danh sách tìm kiếm
current_dir = os.path.dirname(os.path.abspath(__file__))
yolo_path = os.path.join(current_dir, 'yolov10')
if yolo_path not in sys.path:
    sys.path.insert(0, yolo_path)

# 2. IMPORT TỪ FOLDER NỘI BỘ
# Lúc này Python sẽ tìm thấy class YOLOv10DetectionModel bên trong folder yolov10 của Luân
from ultralytics import YOLO 

class ObjectDetector:
    def __init__(self, model_path='yolov10n.pt'): 
        # Đảm bảo file .pt nằm đúng chỗ
        if not os.path.exists(model_path):
            print(f"⚠️ Cảnh báo: Không tìm thấy file {model_path}. Ami sẽ không thấy đồ vật đâu nhen!")
            
        self.model = YOLO(model_path)
        
        # Danh sách ID vật thể (COCO dataset)
        self.target_ids = [56, 57, 58, 59, 60, 61, 62, 63, 67, 39, 41, 73, 65, 64]
        
        self.label_vn = {
            'chair': 'cai ghe',
            'couch': 'ghe sofa',
            'potted plant': 'chau cay', 
            'bed': 'giuong ngu',
            'tv': 'cai tv',           
            'cell phone': 'dien thoai',
            'bottle': 'chai nuoc',
            'cup': 'ly nuoc',
            'laptop': 'may tinh',
            'book': 'cuon sach',
            'remote': 'remote tivi',
            'pottedplant': 'chau cay',
            'diningtable': 'ban an'
        }

    def detect_objects(self, frame):
        try:
            # YOLOv10 chạy rất nhanh trên CPU/GPU
            results = self.model(frame, conf=0.4, verbose=False)[0]
            detected_list = []

            for box in results.boxes:
                cls_id = int(box.cls[0])
                # Lấy tên tiếng Anh từ model
                name_en = self.model.names[cls_id]
                
                # Kiểm tra nếu là vật thể cần quan tâm hoặc đồ dùng trong nhà
                if cls_id in self.target_ids or name_en in self.label_vn:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    name_vn = self.label_vn.get(name_en, name_en)
                    
                    detected_list.append({
                        "label": name_vn,
                        "bbox": (x1, y1, x2, y2),
                        "conf": float(box.conf[0])
                    })
            return detected_list
        except Exception as e:
            print(f"⚠️ Lỗi nhận diện vật thể: {e}")
            return []

    def draw_objects(self, frame, objects):
        for obj in objects:
            x1, y1, x2, y2 = obj['bbox']
            label = obj['label']
            # Màu xanh ngọc cho Ami dễ nhìn
            cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 191, 0), 2)
            cv2.putText(frame, label, (x1, y1 - 10), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 191, 0), 2)
        return frame