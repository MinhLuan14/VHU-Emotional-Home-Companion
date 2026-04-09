import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

class VectorMemory:
    def __init__(self):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.index = faiss.IndexFlatL2(384)
        self.texts = []

    def add(self, text):
        emb = self.model.encode([text])
        self.index.add(np.array(emb).astype("float32"))
        self.texts.append(text)

    def search(self, query, k=3):
        if len(self.texts) == 0:
            return []

        emb = self.model.encode([query])
        D, I = self.index.search(np.array(emb).astype("float32"), k)
        return [self.texts[i] for i in I[0] if i < len(self.texts)]