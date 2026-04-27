# Human Detector

Real-time human detection via phone camera. The backend detects people using YOLO, and the warning screen displays red/green accordingly.

## Architecture

```
/camera  →  POST /detect  →  FastAPI + YOLOv8n (ONNX)
/warning  ←  GET /status (500ms polling)
```

---

## Local Development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
# → http://localhost:8000
```

The `yolov8n.onnx` model file must be present in the `backend/` directory.

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
# → http://localhost:3000
```

Pages:
- `http://localhost:3000/camera` — Camera + frame streaming
- `http://localhost:3000/warning` — Alert screen

---

## Deploy

### Backend → Render

1. [render.com](https://render.com) → New Web Service → connect repo
2. **Root Directory**: `backend`
3. **Build Command**: `pip install -r requirements.txt`
4. **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Note the deployed URL (e.g. `https://your-api.onrender.com`)

> Render free tier may have a cold start delay of ~30s.

### Frontend → Vercel

1. [vercel.com](https://vercel.com) → New Project → connect repo
2. **Root Directory**: `frontend`
3. Add **Environment Variable**:
   ```
   NEXT_PUBLIC_BACKEND_URL=https://your-api.onrender.com
   ```
4. Deploy

---

## Environment Variables

| Variable | Location | Description |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | Vercel / `.env.local` | FastAPI backend URL |

---

## Notes

- Camera access requires **HTTPS** (local `localhost` is exempt; Vercel production URL is automatically HTTPS)
- YOLO runs on the backend only — never on Vercel
- In production, restrict `allow_origins` in `main.py` to your Vercel URL
