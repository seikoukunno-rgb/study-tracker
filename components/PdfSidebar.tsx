'use client';

import { Dispatch, SetStateAction } from 'react'; 
import { Timer } from 'lucide-react';

type PdfSidebarProps = {
  seconds?: number;
  isRunning?: boolean;
  setIsRunning?: Dispatch<SetStateAction<boolean>>;
};

export default function PdfSidebar({ seconds, isRunning, setIsRunning }: PdfSidebarProps) {
  
  const formatTime = (totalSeconds: number) => {
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <aside className="hidden lg:flex w-80 h-full bg-[#0d0d0f] border-l border-white/5 flex-col relative z-10">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-indigo-500/20 rounded-lg"><Timer className="w-4 h-4 text-indigo-400" /></div>
          <h2 className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">Control Panel</h2>
        </div>
        
        {/* 🌟 タイマーの表示部分 */}
        {seconds !== undefined && isRunning !== undefined && setIsRunning && (
          <div className="bg-white/5 rounded-3xl p-8 border border-white/5 text-center shadow-inner">
            <span className="text-[10px] font-bold text-indigo-400/80 tracking-widest uppercase mb-2 block">Study Session</span>
            <div className="text-5xl font-black text-white mb-8 tracking-tighter tabular-nums">
              {formatTime(seconds)}
            </div>
            <button 
              onClick={() => setIsRunning(!isRunning)} 
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all shadow-xl active:scale-95"
            >
              {isRunning ? 'PAUSE' : 'RESUME'}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}