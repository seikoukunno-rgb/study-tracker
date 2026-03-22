// components/PdfSidebar.tsx
'use client';

// 🌟 Dispatch, SetStateAction に加え、useState, useRef, useEffect をインポート
import { Dispatch, SetStateAction, useState, useRef, useEffect } from 'react'; 
// Type アイコンをインポート
import { Timer, PenTool, Highlighter, Eraser, Type, ChevronLeft } from 'lucide-react';

type PdfSidebarProps = {
  onNoteClick: (pageNumber: number) => void;
  drawingMode: 'none' | 'pen' | 'marker' | 'eraser' | 'text';
  setDrawingMode: Dispatch<SetStateAction<'none' | 'pen' | 'marker' | 'eraser' | 'text'>>;
  drawingColor: string;
  setDrawingColor: Dispatch<SetStateAction<string>>;
  penWidth: number;
  setPenWidth: Dispatch<SetStateAction<number>>;
  markerWidth: number;
  setMarkerWidth: Dispatch<SetStateAction<number>>;
};

export default function PdfSidebar({ 
  onNoteClick, drawingMode, setDrawingMode,
  drawingColor, setDrawingColor,
  penWidth, setPenWidth, markerWidth, setMarkerWidth 
}: PdfSidebarProps) {

  // =========================================================================
  // 🌟 Step 1: ツールバーを自由に動かすための「状態」と「魔法のロジック」
  // =========================================================================

  // 1-A. 【デスクトップ用】ツールバーのドラッグ状態
  const [desktopToolbarPos, setDesktopToolbarPos] = useState({ x: 0, y: 0 });
  const [isDraggingDesktopToolbar, setIsDraggingDesktopToolbar] = useState(false);
  const desktopDragRef = useRef({ startX: 0, startY: 0, lastX: 0, lastY: 0 });

  // 1-B. 【スマホ用】ツールバーのドラッグ状態
  const [mobileToolbarPos, setMobileToolbarPos] = useState({ x: 0, y: 0 });
  const [isDraggingMobileToolbar, setIsDraggingMobileToolbar] = useState(false);
  const mobileDragRef = useRef({ startX: 0, startY: 0, lastX: 0, lastY: 0 });

  // --- 共通ドラッグ開始関数 ---
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, toolbarType: 'desktop' | 'mobile') => {
    // ボタンをクリックした時はドラッグさせない（ペンの切り替えを優先）
    if ((e.target as HTMLElement).closest('button')) return;

    if (toolbarType === 'desktop') {
      setIsDraggingDesktopToolbar(true);
    } else {
      setIsDraggingMobileToolbar(true);
    }

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    if (toolbarType === 'desktop') {
      desktopDragRef.current = {
        startX: clientX,
        startY: clientY,
        lastX: desktopToolbarPos.x,
        lastY: desktopToolbarPos.y
      };
    } else {
      mobileDragRef.current = {
        startX: clientX,
        startY: clientY,
        lastX: mobileToolbarPos.x,
        lastY: mobileToolbarPos.y
      };
    }
  };

  // --- ドラッグ中・終了の処理（画面全体でのマウス/タッチを監視するEffect） ---
  useEffect(() => {
    // ドラッグ移動の共通処理
    const handleDragMove = (e: MouseEvent | TouchEvent) => {
      // どちらのツールバーもドラッグ中でなければ終了
      if (!isDraggingDesktopToolbar && !isDraggingMobileToolbar) return;

      e.preventDefault(); // 画面のスクロールを防ぐ
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      
      if (isDraggingDesktopToolbar) {
        // デスクトップ用の移動計算
        const dx = clientX - desktopDragRef.current.startX;
        const dy = clientY - desktopDragRef.current.startY;
        setDesktopToolbarPos({
          x: desktopDragRef.current.lastX + dx,
          y: desktopDragRef.current.lastY + dy
        });
      } else if (isDraggingMobileToolbar) {
        // スマホ用の移動計算
        const dx = clientX - mobileDragRef.current.startX;
        const dy = clientY - mobileDragRef.current.startY;
        setMobileToolbarPos({
          x: mobileDragRef.current.lastX + dx,
          y: mobileDragRef.current.lastY + dy
        });
      }
    };

    // ドラッグ終了の共通処理
    const handleDragEnd = () => {
      if (isDraggingDesktopToolbar) setIsDraggingDesktopToolbar(false);
      if (isDraggingMobileToolbar) setIsDraggingMobileToolbar(false);
    };

    // ドラッグ中だけ、画面全体にイベントを追加
    if (isDraggingDesktopToolbar || isDraggingMobileToolbar) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
    }

    // クリーンアップ関数
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDraggingDesktopToolbar, isDraggingMobileToolbar]);

  // =========================================================================
  // =========================================================================

  // 🌟 ボタン共通パーツ (「Tボタン」は既に含まれています)
  const ToolButtons = () => (
    <>
      <button onClick={() => setDrawingMode('pen')} className={`p-2 rounded-lg ${drawingMode === 'pen' ? 'bg-indigo-600' : 'text-white/60 hover:bg-white/10'}`}><PenTool className="w-5 h-5" /></button>
      <button onClick={() => setDrawingMode('marker')} className={`p-2 rounded-lg ${drawingMode === 'marker' ? 'bg-indigo-600' : 'text-white/60 hover:bg-white/10'}`}><Highlighter className="w-5 h-5" /></button>
      <button onClick={() => setDrawingMode('eraser')} className={`p-2 rounded-lg ${drawingMode === 'eraser' ? 'bg-indigo-600' : 'text-white/60 hover:bg-white/10'}`}><Eraser className="w-5 h-5" /></button>
      <button onClick={() => setDrawingMode('text')} className={`p-2 rounded-lg ${drawingMode === 'text' ? 'bg-indigo-600' : 'text-white/60 hover:bg-white/10'}`}><Type className="w-5 h-5" /></button>
    </>
  );

  return (
    <aside className="w-80 h-full bg-[#1c1c1e] border-l border-[#2c2c2e] flex flex-col relative">
      
      {/* =====================================================================
          Step 2-A: 【DESKTOPツールバー】にドラッグ機能を取り付ける
          ===================================================================== */}
      <div 
        // 🌟 ドラッグ開始イベントを追加
        onMouseDown={(e) => handleDragStart(e, 'desktop')}
        onTouchStart={(e) => handleDragStart(e, 'desktop')}
        // 🌟 インラインスタイルで位置を制御
        style={{ 
          transform: `translate(${desktopToolbarPos.x}px, ${desktopToolbarPos.y}px)`,
          cursor: isDraggingDesktopToolbar ? 'grabbing' : 'grab',
        }}
        // クラス名はそのまま
        className="hidden md:flex absolute top-4 left-[-260px] z-50 bg-black/80 backdrop-blur-md px-4 py-2 rounded-2xl items-center gap-3 border border-white/10 shadow-2xl"
      >
        <ToolButtons />
        <div className="w-[1px] h-6 bg-white/20 mx-1" />
        {/* 色選択 */}
        <div className="flex gap-1">
          {['#ef4444', '#3b82f6', '#eab308'].map((c) => (
            <button key={c} onClick={() => setDrawingColor(c)} className={`w-5 h-5 rounded-full border-2 ${drawingColor === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      {/* ===================================================================== */}

      {/* =====================================================================
          Step 2-B: 【スマホツールバー】にドラッグ機能を取り付ける
          ===================================================================== */}
      <div 
        // 🌟 ドラッグ開始イベントを追加
        onMouseDown={(e) => handleDragStart(e, 'mobile')}
        onTouchStart={(e) => handleDragStart(e, 'mobile')}
        // 🌟 インラインスタイルで位置を制御。画面中央上部からの相対位置にするため calc(-50% + ...) を使用
        style={{ 
          transform: `translate(calc(-50% + ${mobileToolbarPos.x}px), ${mobileToolbarPos.y}px)`,
          cursor: isDraggingMobileToolbar ? 'grabbing' : 'grab',
          touchAction: 'none' // スマホでの誤作動防止
        }}
        // クラス名を修正。ドラッグ位置が基準になるため left-1/2 -translate-x-1/2 は削除
        className="md:hidden fixed top-4 z-50 bg-black/80 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-3 border border-white/10 shadow-2xl w-[90%] justify-between"
      >
        <div className="flex gap-2">
          <ToolButtons />
        </div>
        <div className="flex gap-2">
          {['#ef4444', '#3b82f6', '#eab308'].map((c) => (
            <button key={c} onClick={() => setDrawingColor(c)} className={`w-5 h-5 rounded-full ${drawingColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`} style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      {/* ===================================================================== */}

      {/* 右側のコントロールパネル（タイマーやメモ）のコードがここに入る */}
      <div className="p-6 flex-1 overflow-y-auto">
        <h2 className="text-xs font-black tracking-widest text-slate-500 mb-8 uppercase">Control Panel</h2>
        {/* ここにタイマーやメモの続きを書いてください */}
        <div className="text-white">...</div>
      </div>

    </aside>
  );
}