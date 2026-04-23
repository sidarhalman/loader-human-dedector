"use client";

import { useRef, useState, useEffect, useCallback } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

type Box = { x1: number; y1: number; x2: number; y2: number };

type DetectResponse = {
  person_detected: boolean;
  boxes: Box[];
  image_width: number;
  image_height: number;
};

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // AudioContext desteklenmiyor
  }
}

function drawBoxes(
  overlay: HTMLCanvasElement,
  video: HTMLVideoElement,
  boxes: Box[],
  imgW: number,
  imgH: number
) {
  const rect = video.getBoundingClientRect();
  overlay.width = rect.width;
  overlay.height = rect.height;

  const ctx = overlay.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, overlay.width, overlay.height);

  const scaleX = rect.width / imgW;
  const scaleY = rect.height / imgH;

  ctx.strokeStyle = "#00ff00";
  ctx.lineWidth = 2;
  ctx.fillStyle = "#00ff00";
  ctx.font = "bold 14px sans-serif";

  for (const box of boxes) {
    const x = box.x1 * scaleX;
    const y = box.y1 * scaleY;
    const w = (box.x2 - box.x1) * scaleX;
    const h = (box.y2 - box.y1) * scaleY;

    ctx.strokeRect(x, y, w, h);
    ctx.fillRect(x, y - 18, 56, 18);
    ctx.fillStyle = "#000";
    ctx.fillText("Person", x + 3, y - 4);
    ctx.fillStyle = "#00ff00";
  }
}

export default function CameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prevDetectedRef = useRef(false);

  const [active, setActive] = useState(false);
  const [personDetected, setPersonDetected] = useState(false);

  const sendFrame = useCallback(() => {
    const video = videoRef.current;
    const capture = captureRef.current;
    const overlay = overlayRef.current;
    if (!video || !capture || !overlay) return;

    capture.width = video.videoWidth;
    capture.height = video.videoHeight;
    capture.getContext("2d")?.drawImage(video, 0, 0);

    capture.toBlob(
      async (blob) => {
        if (!blob) return;
        const form = new FormData();
        form.append("file", blob, "frame.jpg");
        try {
          const res = await fetch(`${BACKEND_URL}/detect`, { method: "POST", body: form });
          const data: DetectResponse = await res.json();

          if (data.person_detected && !prevDetectedRef.current) {
            beep();
          }
          prevDetectedRef.current = data.person_detected;
          setPersonDetected(data.person_detected);

          if (videoRef.current && overlayRef.current) {
            drawBoxes(overlayRef.current, videoRef.current, data.boxes, data.image_width, data.image_height);
          }
        } catch {
          // backend ulaşılamaz
        }
      },
      "image/jpeg",
      0.8
    );
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      intervalRef.current = setInterval(sendFrame, 700);
      setActive(true);
    } catch {
      // kamera erişim hatası
    }
  }, [sendFrame]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    overlayRef.current?.getContext("2d")?.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    prevDetectedRef.current = false;
    setPersonDetected(false);
    setActive(false);
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-white text-2xl font-bold">Kamera</h1>

      <div className="relative w-full max-w-md">
        {/* Uyarı göstergesi */}
        {active && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
            <span
              className={`w-4 h-4 rounded-full ${
                personDetected ? "bg-red-500 animate-pulse" : "bg-green-500"
              }`}
            />
            {personDetected && (
              <span className="text-white text-sm font-bold bg-red-600/80 px-2 py-0.5 rounded">
                İNSAN ALGILANDI
              </span>
            )}
          </div>
        )}

        <video
          ref={videoRef}
          muted
          playsInline
          className="w-full rounded-lg bg-black"
          style={{ aspectRatio: "4/3", display: "block" }}
        />
        <canvas
          ref={overlayRef}
          className="absolute top-0 left-0 w-full h-full rounded-lg pointer-events-none"
        />
      </div>

      <canvas ref={captureRef} className="hidden" />

      <button
        onClick={active ? stop : start}
        className={`px-8 py-3 rounded-lg text-white font-semibold text-lg transition-colors ${
          active
            ? "bg-red-600 hover:bg-red-700"
            : "bg-green-600 hover:bg-green-700"
        }`}
      >
        {active ? "Pasif" : "Aktif"}
      </button>
    </div>
  );
}
