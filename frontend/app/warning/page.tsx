"use client";

import { useEffect, useRef, useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

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

export default function WarningPage() {
  const [personDetected, setPersonDetected] = useState(false);
  const prevRef = useRef(false);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/status`);
        const data: { person_detected: boolean } = await res.json();
        const current = data.person_detected;

        if (current && !prevRef.current) {
          beep();
        }

        prevRef.current = current;
        setPersonDetected(current);
      } catch {
        // backend ulaşılamaz
      }
    };

    poll();
    const id = setInterval(poll, 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center transition-colors duration-300 ${
        personDetected ? "bg-red-600" : "bg-green-600"
      }`}
    >
      <p className="text-white text-5xl font-black tracking-widest select-none">
        {personDetected ? "İNSAN ALGILANDI" : "TEMİZ"}
      </p>
    </div>
  );
}
