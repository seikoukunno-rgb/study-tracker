"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { vibrateLevelUp } from "../lib/haptics";

type Props = {
  fromLevel: number;
  toLevel: number;
  onClose: () => void;
};

// 紙吹雪の位置・色・タイミングは固定値にして、描画のたびに変わらないようにする
const CONFETTI = Array.from({ length: 24 }, (_, i) => ({
  left: (i * 41 + 7) % 100,
  delay: (i % 8) * 0.07,
  duration: 1.6 + (i % 5) * 0.25,
  size: 6 + (i % 4) * 3,
  rotate: (i * 47) % 360,
  color: ["#818cf8", "#f472b6", "#fbbf24", "#34d399", "#60a5fa"][i % 5],
}));

export default function LevelUpCelebration({ fromLevel, toLevel, onClose }: Props) {
  // 数字が from → to へ切り替わる短い演出
  const [shownLevel, setShownLevel] = useState(fromLevel);
  const retryOnTouchRef = useRef(false);

  useEffect(() => {
    // 振動。画面をまだ触っていないとブラウザにブロックされることがあるので、
    // その場合は最初のタップで再試行する
    const ok = vibrateLevelUp();
    if (!ok) retryOnTouchRef.current = true;

    const retry = () => {
      if (!retryOnTouchRef.current) return;
      retryOnTouchRef.current = false;
      vibrateLevelUp();
    };
    window.addEventListener("pointerdown", retry, { once: true });

    const countTimer = setTimeout(() => setShownLevel(toLevel), 650);
    return () => {
      clearTimeout(countTimer);
      window.removeEventListener("pointerdown", retry);
    };
  }, [toLevel]);

  const gained = toLevel - fromLevel;

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-label="レベルアップ">
      <style>{`
        @keyframes lvup-backdrop { from { opacity: 0 } to { opacity: 1 } }
        @keyframes lvup-card {
          0% { opacity: 0; transform: scale(0.6) translateY(24px) }
          60% { opacity: 1; transform: scale(1.06) translateY(0) }
          100% { opacity: 1; transform: scale(1) translateY(0) }
        }
        @keyframes lvup-glow {
          0% { opacity: 0.9; transform: scale(0.4) }
          100% { opacity: 0; transform: scale(2.2) }
        }
        @keyframes lvup-number {
          0% { transform: scale(1) }
          40% { transform: scale(1.35) }
          100% { transform: scale(1) }
        }
        @keyframes lvup-fall {
          0% { transform: translateY(-20vh) rotate(0deg); opacity: 1 }
          100% { transform: translateY(110vh) rotate(540deg); opacity: 0.9 }
        }
        @keyframes lvup-shake {
          0%, 100% { transform: translateX(0) }
          20% { transform: translateX(-5px) }
          40% { transform: translateX(5px) }
          60% { transform: translateX(-3px) }
          80% { transform: translateX(3px) }
        }
        @media (prefers-reduced-motion: reduce) {
          .lvup-anim, .lvup-anim * { animation-duration: 0.01ms !important; animation-delay: 0ms !important; }
        }
      `}</style>

      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        style={{ animation: "lvup-backdrop 0.25s ease-out both" }}
        onClick={onClose}
      />

      <div className="lvup-anim pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {CONFETTI.map((c, i) => (
          <span
            key={i}
            className="absolute top-0 block rounded-[2px]"
            style={{
              left: `${c.left}%`,
              width: c.size,
              height: c.size * 1.6,
              backgroundColor: c.color,
              transform: `rotate(${c.rotate}deg)`,
              animation: `lvup-fall ${c.duration}s ease-in ${c.delay}s both`,
            }}
          />
        ))}
      </div>

      <div className="lvup-anim relative w-full max-w-xs" style={{ animation: "lvup-card 0.55s cubic-bezier(0.2, 0.9, 0.3, 1.2) both, lvup-shake 0.4s ease-in-out 0.15s both" }}>
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 -ml-32 -mt-32 h-64 w-64 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(129,140,248,0.75) 0%, rgba(129,140,248,0) 70%)",
            animation: "lvup-glow 1.1s ease-out 0.1s both",
          }}
          aria-hidden="true"
        />

        <div className="relative rounded-[2.5rem] bg-gradient-to-b from-[#1e1b4b] to-[#111827] border border-indigo-400/40 px-8 py-9 text-center text-white shadow-2xl shadow-indigo-900/50">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-400/20">
            <Sparkles className="h-6 w-6 text-amber-300" />
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-indigo-300">Level Up!</p>
          <h2 className="mt-1 text-2xl font-black">レベルが上がりました！</h2>

          <div className="my-6 flex items-end justify-center gap-2">
            <span className="mb-2 text-lg font-black italic text-indigo-300">Lv.</span>
            <span
              key={shownLevel}
              className="text-7xl font-black italic leading-none bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent"
              style={{ animation: shownLevel === toLevel && toLevel !== fromLevel ? "lvup-number 0.5s ease-out both" : undefined }}
            >
              {shownLevel}
            </span>
          </div>

          <p className="text-xs font-bold text-slate-400">
            {gained > 1 ? `Lv.${fromLevel} → Lv.${toLevel}（${gained}レベルアップ）` : `Lv.${fromLevel} → Lv.${toLevel}`}
          </p>

          <button
            onClick={onClose}
            className="mt-7 w-full rounded-[2rem] bg-indigo-600 py-4 font-black text-white shadow-lg shadow-indigo-500/30 transition-transform active:scale-95"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
