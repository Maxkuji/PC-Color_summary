# api.py
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import numpy as np
from sklearn.cluster import KMeans
from io import BytesIO

app = FastAPI()

# ✅ อนุญาต CORS ให้ Frontend เรียกได้ตอน dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
)

def rgb_to_hex(rgb): return f"#{rgb[0]:02X}{rgb[1]:02X}{rgb[2]:02X}"

@app.post("/summarize")
async def summarize(file: UploadFile = File(...), k: int = 6, max_side: int = 512):
    data = await file.read()
    img = Image.open(BytesIO(data)).convert("RGBA")
    w, h = img.size
    scale = min(1.0, max_side / max(w, h))
    if scale < 1.0:
        img = img.resize((int(w*scale), int(h*scale)), Image.LANCZOS)

    arr = np.array(img)
    rgb = arr[..., :3][arr[..., 3] > 0]  # ข้ามพิกเซลโปร่งใส
    if len(rgb) == 0:
        return {"palette": []}

    try:
        km = KMeans(n_clusters=int(k), n_init="auto", random_state=42)
    except TypeError:
        km = KMeans(n_clusters=int(k), n_init=10, random_state=42)
    km.fit(rgb)

    centers = km.cluster_centers_.round().astype(int)
    labels = km.labels_
    counts = np.bincount(labels, minlength=int(k)).astype(float)
    pcts = (counts / counts.sum()) * 100

    order = np.argsort(-pcts)
    centers = centers[order]
    pcts = pcts[order]

    palette = [{"hex": rgb_to_hex(c), "rgb": c.tolist(), "percent": round(float(p), 2)}
               for c, p in zip(centers, pcts)]
    return {"palette": palette}
