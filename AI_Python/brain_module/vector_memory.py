import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import threading


class VectorMemory:
    # ========================
    # SHARED MODEL (LOAD 1 LẦN)
    # ========================
    _model = None
    _lock = threading.Lock()

    def __init__(self, max_memory=1000):
        if VectorMemory._model is None:
            with VectorMemory._lock:
                if VectorMemory._model is None:
                    print("🔄 Loading embedding model...")
                    VectorMemory._model = SentenceTransformer('all-MiniLM-L6-v2')

        self.model = VectorMemory._model

        # FAISS index (cosine similarity giả lập bằng normalize + L2)
        self.dim = 384
        self.index = faiss.IndexFlatL2(self.dim)

        self.texts = []
        self.max_memory = max_memory

    # ========================
    # NORMALIZE VECTOR
    # ========================
    def _normalize(self, vec):
        norm = np.linalg.norm(vec, axis=1, keepdims=True)
        return vec / (norm + 1e-10)

    # ========================
    # ADD MEMORY
    # ========================
    def add(self, text):
        try:
            emb = self.model.encode([text])
            emb = np.array(emb).astype("float32")

            # normalize để semantic tốt hơn
            emb = self._normalize(emb)

            self.index.add(emb)
            self.texts.append(text)

            # 🔥 GIỚI HẠN BỘ NHỚ
            if len(self.texts) > self.max_memory:
                self._rebuild_index()

        except Exception as e:
            print(f"❌ VectorMemory add error: {e}")

    # ========================
    # SEARCH
    # ========================
    def search(self, query, k=3, threshold=0.5):
        if len(self.texts) == 0:
            return []

        try:
            emb = self.model.encode([query])
            emb = np.array(emb).astype("float32")
            emb = self._normalize(emb)

            D, I = self.index.search(emb, k)

            results = []
            for dist, idx in zip(D[0], I[0]):
                if idx < len(self.texts):
                    # chuyển L2 distance → similarity
                    similarity = 1 / (1 + dist)

                    if similarity > threshold:
                        results.append({
                            "text": self.texts[idx],
                            "score": float(similarity)
                        })

            return results

        except Exception as e:
            print(f"❌ VectorMemory search error: {e}")
            return []

    # ========================
    # REBUILD INDEX (GIỮ MEMORY MỚI)
    # ========================
    def _rebuild_index(self):
        print("♻️ Rebuilding vector memory...")

        # giữ lại nửa cuối (recent memory)
        self.texts = self.texts[len(self.texts)//2:]

        self.index = faiss.IndexFlatL2(self.dim)

        if len(self.texts) > 0:
            emb = self.model.encode(self.texts)
            emb = np.array(emb).astype("float32")
            emb = self._normalize(emb)
            self.index.add(emb)