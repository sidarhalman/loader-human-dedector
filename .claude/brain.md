# Proje Beyni — Human Detection MVP

## Proje Amacı
Telefon kamerası üzerinden gerçek zamanlıya yakın (700ms) insan tespiti.
Ayrı bir "uyarı ekranı" bu durumu dinler, kırmızı/yeşil arka plan ve sesli uyarı verir.

## Mimari
```
Telefon (/camera)  →  POST /detect  →  FastAPI + YOLO (backend)
Uyarı Ekranı (/warning)  ←  GET /status (500ms polling)  ←  Backend state
```

## Teknoloji Seçimleri

| Katman | Teknoloji | Neden |
|---|---|---|
| Frontend | Next.js (App Router, TypeScript) | Vercel deploy, file-based routing |
| Styling | Tailwind CSS | Minimum config, utility-first |
| Backend | FastAPI + Uvicorn | Async, hızlı, YOLO ile kolay entegrasyon |
| ML Model | YOLOv8n (ultralytics) | Nano model, Render free RAM'e sığar (~6MB) |
| State | In-memory Python dict | DB gereksiz, kalıcılık istenmez |

## Deploy Hedefleri
- **Frontend → Vercel** (ücretsiz tier, otomatik HTTPS)
- **Backend → Render** (ücretsiz tier, cold start ~30s ilk istekte)
- YOLO **kesinlikle backend'de** çalışır, Vercel serverless'da çalıştırılmaz

## Environment Değişkenleri
| Değişken | Yer | Değer (örnek) |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | Vercel env | `https://your-api.onrender.com` |

Backend herhangi bir env değişkeni gerektirmez.

## Önemli Kısıtlar
- **Render free tier**: 512MB RAM → `yolov8n.pt` (nano) zorunlu
- **Kamera**: `getUserMedia` HTTPS gerektirir → local'de `localhost` çalışır, production'da Vercel URL (HTTPS)
- **CORS**: Production'da `allow_origins` Vercel URL ile kısıtlanmalı (şu an `["*"]`)
- **Ses**: Web Audio API ile programatik beep, harici ses dosyası yok
- Frame: JPEG, quality 0.8 → her 700ms bir istek ~20-50KB

## Sayfa Özeti
- `/camera`: Kamerayı aç, "Aktif/Pasif" butonu, 700ms'de bir frame gönder
- `/warning`: Full ekran, yeşil/kırmızı arka plan, 500ms polling, ses sadece false→true geçişinde

## Kritik Dosyalar
- `backend/main.py` — detect + status endpoint + CORS + YOLO startup
- `backend/requirements.txt` — Python bağımlılıkları
- `frontend/app/camera/page.tsx` — kamera + frame gönderme
- `frontend/app/warning/page.tsx` — polling + uyarı UI
