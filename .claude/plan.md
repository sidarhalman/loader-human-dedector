# Human Detection MVP — 10 Adımlık Plan

## Context
Telefon kamerası üzerinden görüntü alıp YOLO ile insan tespiti yapan bir MVP sistemi sıfırdan oluşturulacak.
Frontend Vercel'e, Backend Render'a deploy edilecek.

---

## Hedef Proje Yapısı

```
loader-human-dedector/
├── .claude/
│   ├── brain.md              ← Proje beyni
│   └── plan.md               ← Bu dosya
├── frontend/                 ← Next.js
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── camera/page.tsx   ← Kamera sayfası
│   │   └── warning/page.tsx  ← Uyarı sayfası
│   ├── public/
│   ├── .env.local.example
│   ├── next.config.ts
│   ├── tsconfig.json
│   └── package.json
├── backend/                  ← FastAPI
│   ├── main.py
│   └── requirements.txt
├── .gitignore
└── README.md
```

---

## Adım 1 — .claude/ dizini: proje beyni ve plan
- [x] `.claude/brain.md`: mimari kararlar, teknoloji gerekçeleri, deploy hedefleri, env değişkenleri
- [x] `.claude/plan.md`: bu plan

## Adım 2 — .gitignore
- `node_modules/`, `__pycache__/`, `.env*`, `*.pt`, `.next/`, `venv/`

## Adım 3 — Backend: requirements.txt
```
fastapi==0.115.0
uvicorn==0.30.6
python-multipart==0.0.9
ultralytics==8.3.0
Pillow==10.4.0
numpy==1.26.4
```

## Adım 4 — Backend: main.py — state + CORS + startup
- FastAPI app
- CORS: `allow_origins=["*"]`
- In-memory state: `{"person_detected": False, "last_detected_at": None}`
- YOLO startup: `YOLO("yolov8n.pt")`

## Adım 5 — Backend: POST /detect
- `UploadFile` → PIL → numpy → YOLO predict (classes=[0])
- State güncelle → JSON dön

## Adım 6 — Backend: GET /status
- State'i JSON olarak dön

## Adım 7 — Frontend: Next.js kurulumu
- `package.json`, `next.config.ts`, `tsconfig.json`, `layout.tsx`, `globals.css`
- `.env.local.example`: `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000`

## Adım 8 — Frontend: /camera sayfası
- getUserMedia, 700ms interval, canvas.toBlob → fetch POST /detect
- Aktif/Pasif butonu

## Adım 9 — Frontend: /warning sayfası
- 500ms polling GET /status
- Kırmızı/yeşil arka plan, Web Audio API beep (false→true geçişinde)

## Adım 10 — README.md
- Local çalıştırma, Render deploy, Vercel deploy, env değişkenleri

---

## Teknik Kararlar

| Karar | Seçim | Neden |
|---|---|---|
| YOLO modeli | `yolov8n.pt` (nano) | Render free tier 512MB RAM |
| Frame formatı | JPEG quality 0.8 | Bant genişliği optimize |
| Ses | Web Audio API beep | Dosya gerektirmez |
| State | In-memory dict | DB gereksiz |
| CSS | Tailwind CSS | Minimum config |

---

## Doğrulama

1. `cd backend && uvicorn main:app --reload` → `http://localhost:8000/status` ✓
2. `cd frontend && npm run dev` → `http://localhost:3000/camera` ✓
3. Aktif buton → kamera açılıyor mu? ✓
4. Kameraya insan → `/warning` kırmızı + ses ✓
5. Kameradan insan çek → `/warning` yeşil ✓
