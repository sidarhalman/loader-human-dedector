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

  const videoAR = imgW / imgH;
  const elemAR = rect.width / rect.height;
  let displayW: number, displayH: number, offsetX: number, offsetY: number;
  if (videoAR > elemAR) {
    displayW = rect.width;
    displayH = rect.width / videoAR;
    offsetX = 0;
    offsetY = (rect.height - displayH) / 2;
  } else {
    displayH = rect.height;
    displayW = rect.height * videoAR;
    offsetX = (rect.width - displayW) / 2;
    offsetY = 0;
  }

  const scaleX = displayW / imgW;
  const scaleY = displayH / imgH;

  ctx.strokeStyle = "#00ff00";
  ctx.lineWidth = 2;
  ctx.fillStyle = "#00ff00";
  ctx.font = "bold 14px sans-serif";

  for (const box of boxes) {
    const x = box.x1 * scaleX + offsetX;
    const y = box.y1 * scaleY + offsetY;
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
  const streamRef = useRef<MediaStream | null>(null);
  const prevDetectedRef = useRef(false);
  const runningRef = useRef(false);

  const [active, setActive] = useState(false);
  const [personDetected, setPersonDetected] = useState(false);

  const captureBlob = (video: HTMLVideoElement, capture: HTMLCanvasElement): Promise<Blob | null> =>
    new Promise((resolve) => {
      capture.width = video.videoWidth;
      capture.height = video.videoHeight;
      capture.getContext("2d")?.drawImage(video, 0, 0);
      capture.toBlob(resolve, "image/jpeg", 0.8);
    });

  const loop = useCallback(async () => {
    const TARGET_FPS = 5; 
    const frameDelayMs = 1000 / TARGET_FPS;

    while (runningRef.current) {
      const startTime = Date.now();

      const video = videoRef.current;
      const capture = captureRef.current;
      const overlay = overlayRef.current;
      if (!video || !capture || !overlay) break;

      const blob = await captureBlob(video, capture);
      if (!blob || !runningRef.current) break;

      const form = new FormData();
      form.append("file", blob, "frame.jpg");
      try {
        const res = await fetch(`${BACKEND_URL}/detect`, { method: "POST", body: form });
        const data: DetectResponse = await res.json();

        if (!runningRef.current) break;
        if (data.person_detected && !prevDetectedRef.current) beep();
        prevDetectedRef.current = data.person_detected;
        setPersonDetected(data.person_detected);

        if (videoRef.current && overlayRef.current) {
          drawBoxes(overlayRef.current, videoRef.current, data.boxes, data.image_width, data.image_height);
        }
      } catch {
        await new Promise((r) => setTimeout(r, 500));
      }

      const elapsed = Date.now() - startTime;
      const delay = Math.max(0, frameDelayMs - elapsed);
      if (delay > 0) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }
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
      runningRef.current = true;
      setActive(true);
      loop();
    } catch {
    }
  }, [loop]);

  const stop = useCallback(() => {
    runningRef.current = false;
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

  const ledStyle: React.CSSProperties = active
    ? personDetected
      ? {
          background: "#ff2222",
          boxShadow: "0 0 8px 2px #ff2222, 0 0 24px 6px #ff000066",
        }
      : {
          background: "#22ff44",
          boxShadow: "0 0 8px 2px #22ff44, 0 0 24px 6px #00ff4466",
        }
    : {
        background: "#444",
        boxShadow: "none",
      };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center p-2 gap-2">
      <span
        className="rounded-full"
        style={{ width: 40, height: 40, display: "inline-block", ...ledStyle }}
      />

      <h1 className="text-white text-2xl font-bold">Kamera</h1>

      <div className="relative w-full" style={{ height: "70vh" }}>
        <video
          ref={videoRef}
          muted
          playsInline
          className="w-full h-full rounded-lg bg-black object-contain"
        />
        <canvas
          ref={overlayRef}
          className="absolute inset-0 w-full h-full rounded-lg pointer-events-none"
        />
      </div>

      <canvas ref={captureRef} className="hidden" />

      <button
        onClick={active ? stop : start}
        className={`px-8 py-3 rounded-lg text-white font-semibold text-lg transition-colors ${
          active ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
        }`}
      >
        {active ? "Pasif" : "Aktif"}
      </button>
    </div>
  );
}
