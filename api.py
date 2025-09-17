# api.py
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import numpy as np
from sklearn.cluster import KMeans
from io import BytesIO

app = FastAPI()

# CORS สำหรับ dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def rgb_to_hex(rgb): 
    return f"#{rgb[0]:02X}{rgb[1]:02X}{rgb[2]:02X}"

@app.post("/summarize")
async def summarize(
    file: UploadFile = File(...),
    k: int = Form(6),
    max_side: int = Form(512),
):
    # validate เบื้องต้น
    k = int(max(3, min(12, k)))
    max_side = int(max(128, min(2048, max_side)))

    # อ่านไฟล์
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")

    # เปิดรูปและย่อ
    try:
        img = Image.open(BytesIO(data)).convert("RGBA")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image")

    w, h = img.size
    scale = min(1.0, max_side / max(w, h))
    if scale < 1.0:
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    # เตรียมข้อมูล pixel (ข้ามโปร่งใส)
    arr = np.array(img)
    rgb = arr[..., :3][arr[..., 3] > 0]
    if rgb.size == 0:
        return {"palette": []}

    # ถ้าจำนวนพิกเซลไม่พอสำหรับ k ให้ลด k ลง
    unique_colors = np.unique(rgb, axis=0)
    k_eff = min(k, len(unique_colors))
    if k_eff < 1:
        return {"palette": []}

    # subsample เพื่อความเร็วถ้ารูปใหญ่มาก
    SAMPLE_CAP = 150_000
    if len(rgb) > SAMPLE_CAP:
        idx = np.random.choice(len(rgb), SAMPLE_CAP, replace=False)
        sample = rgb[idx]
    else:
        sample = rgb

    # fit KMeans (รองรับ sklearn หลายเวอร์ชัน)
    try:
        km = KMeans(n_clusters=int(k_eff), n_init="auto", random_state=42)
    except TypeError:
        km = KMeans(n_clusters=int(k_eff), n_init=10, random_state=42)

    km.fit(sample)
    centers = np.clip(np.rint(km.cluster_centers_), 0, 255).astype(int)

    # นับสัดส่วนด้วย labels จาก sample
    labels = km.labels_
    counts = np.bincount(labels, minlength=int(k_eff)).astype(float)
    pcts = (counts / counts.sum()) * 100.0

    # เรียงจากใหญ่ไปเล็ก
    order = np.argsort(-pcts)
    centers = centers[order]
    pcts = pcts[order]

    palette = [
        {"hex": rgb_to_hex(c), "rgb": c.tolist(), "percent": round(float(p), 2)}
        for c, p in zip(centers, pcts)
    ]
    return {"palette": palette}
