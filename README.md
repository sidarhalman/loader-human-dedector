# Human Detector

Telefon kamerasından gerçek zamanlı insan tespiti. Backend YOLO ile kişi algılar, uyarı ekranı kırmızı/yeşil gösterir.

## Mimari

```
/camera  →  POST /detect  →  FastAPI + YOLOv8n
/warning  ←  GET /status (500ms polling)
```

---

## Local Çalıştırma

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
# → http://localhost:8000
```

İlk çalıştırmada `yolov8n.pt` modeli (~6MB) otomatik indirilir.

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
# → http://localhost:3000
```

Sayfalar:
- `http://localhost:3000/camera` — Kamera + frame gönderme
- `http://localhost:3000/warning` — Uyarı ekranı

---

## Deploy

### Backend → Render

1. [render.com](https://render.com) → New Web Service → repo'yu bağla
2. **Root Directory**: `backend`
3. **Build Command**: `pip install -r requirements.txt`
4. **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Deploy sonrası URL'yi not al (örn. `https://your-api.onrender.com`)

> Render free tier cold start ~30s sürebilir.

### Frontend → Vercel

1. [vercel.com](https://vercel.com) → New Project → repo'yu bağla
2. **Root Directory**: `frontend`
3. **Environment Variables** ekle:
   ```
   NEXT_PUBLIC_BACKEND_URL=https://your-api.onrender.com
   ```
4. Deploy

---

## Environment Değişkenleri

| Değişken | Yer | Açıklama |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | Vercel / `.env.local` | FastAPI backend URL |

---

## Notlar

- Kamera erişimi **HTTPS** gerektirir (local `localhost` muaf, production Vercel URL'si otomatik HTTPS)
- YOLO sadece backend'de çalışır, Vercel'de çalıştırılmaz
- Production'da `main.py` içindeki `allow_origins=["*"]` Vercel URL ile kısıtlanmalı
