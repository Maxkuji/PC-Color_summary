# ถ้ายังไม่มี venv
py -m venv .venv
.\.venv\Scripts\activate

run FastAPI
python -m uvicorn api:app --reload --port 8000
Uvicorn running on http://127.0.0.1:8000

ภาพรวมงาน
รับภาพจาก React ผ่าน POST /summarize, 
วิเคราะห์สีเด่นด้วย K‑Means, ส่งกลับพาเลตสีเป็น JSON แล้ว UI แสดงผล/ให้ดาวน์โหลดออกเป็น 
JSON หรือ CSS variables