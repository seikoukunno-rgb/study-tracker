"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from 'next/dynamic'; 
import { supabase } from "../../lib/supabase";
import { 
  Play, Pause, RotateCcw, Save, ArrowLeft, 
  BookOpen, CheckCircle2, PencilLine, X, Loader2, AlertCircle, FileText
} from "lucide-react";

// 🌟 PDFリーダー (変更なし・機能維持)
const PDFReader = dynamic(
  () => import('@react-pdf-viewer/core').then((mod) => {
    return function PDFComponent({ url }: { url: string }) {
      return (
<mod.Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
          <div className="h-full w-full custom-pdf-theme">
            <mod.Viewer fileUrl={url} theme="dark" />
          </div>
        </mod.Worker>
      );
    };
  }),
  { 
    ssr: false, 
    loading: () => (
      <div className="h-full w-full bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-[10px] font-black text-slate-500 tracking-[0.2em]">LOADING DOCUMENT</p>
      </div>
    ) 
  }
);

import "@react-pdf-viewer/core/lib/styles/index.css";

function TimerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const materialId = searchParams.get("id") || searchParams.get("material_id"); 
  const title = searchParams.get("title") || "名称未設定の教材";
  const imageUrl = searchParams.get("image_url");

  // --- 既存の基本ステート ---
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [memo, setMemo] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);

  // 🌟 新UI用：サイドバーの開閉ステート（isMinimizedの代わり）
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- 複数PDF・セキュア管理用のステート ---
  const [pdfList, setPdfList] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [securePdfUrl, setSecurePdfUrl] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // 1. DBからPDFのリストを取得する (変更なし)
  const fetchMaterialPaths = useCallback(async () => {
    if (!materialId) {
      setIsInitializing(false);
      return;
    }
    try {
      const { data: material, error: dbError } = await supabase
        .from('materials')
        .select('pdf_url')
        .eq('id', materialId)
        .single();

      if (dbError) throw new Error("教材データの取得に失敗しました");
      
      if (!material || !material.pdf_url) {
        setIsInitializing(false);
        return;
      }

      let paths: string[] = [];
      if (Array.isArray(material.pdf_url)) {
        paths = material.pdf_url;
      } else if (typeof material.pdf_url === 'string') {
        try {
          const parsed = JSON.parse(material.pdf_url);
          paths = Array.isArray(parsed) ? parsed : [material.pdf_url];
        } catch (e) {
          paths = material.pdf_url.split(',').map((p: string) => p.trim()).filter(Boolean);
        }
      }
      setPdfList(paths);
    } catch (e: any) {
      console.error(e);
      setPdfError(e.message);
    } finally {
      setIsInitializing(false);
    }
  }, [materialId]);

  // 2. 「5分間チケット（Signed URL）」を発行する (変更なし)
  const fetchSignedUrl = useCallback(async () => {
    if (pdfList.length === 0) return;
    setPdfError(null);

    try {
      let filePath = pdfList[currentIndex];
      if (filePath.includes('/storage/v1/object/public/pdfs/')) {
        filePath = filePath.split('/storage/v1/object/public/pdfs/')[1];
      } else if (filePath.includes('/pdfs/')) {
        filePath = filePath.split('/pdfs/')[1];
      }

      const { data, error: storageError } = await supabase.storage
        .from('pdfs')
        .createSignedUrl(filePath, 300);

      if (storageError) throw new Error("セキュアPDFの発行に失敗しました");

      setSecurePdfUrl(data.signedUrl);
    } catch (e: any) {
      console.error(e);
      setPdfError(e.message);
    }
  }, [pdfList, currentIndex]);

  useEffect(() => { fetchMaterialPaths(); }, [fetchMaterialPaths]);
  useEffect(() => { fetchSignedUrl(); }, [fetchSignedUrl]);

  // --- タイマー＆保存ロジック (変更なし) ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  const handleSave = async () => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("ログインが必要です");
      router.push("/login");
      return;
    }

    const durationMinutes = Math.floor(seconds / 60);
    const now = new Date();
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const { error } = await supabase.from('study_logs').insert([{
      student_id: user.id,
      material_id: materialId || null, 
      duration_minutes: durationMinutes,
      thoughts: memo,                    
      studied_at: localDate 
    }]);

    if (error) {
      alert("保存エラー: " + error.message);
      setIsSaving(false);
    } else {
      setIsSaved(true);
      setIsRunning(false);
      setShowSaveModal(false);
      setTimeout(() => router.push("/"), 1500);
    }
  };

  // --- エラー＆ロード画面 ---
  if (pdfError) {
    return (
      <div className="h-[100dvh] w-screen bg-black flex flex-col items-center justify-center text-rose-500 p-10 text-center select-none">
        <AlertCircle className="w-12 h-12 mb-4 animate-pulse" />
        <p className="font-black mb-6 text-sm">{pdfError}</p>
        <button onClick={fetchSignedUrl} className="px-8 py-4 bg-white/10 rounded-full text-white font-black active:scale-95 transition-all hover:bg-white/20">
          再試行する
        </button>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="h-[100dvh] w-screen bg-black flex flex-col items-center justify-center select-none">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-[10px] font-black text-white/50 tracking-[0.2em] uppercase">INITIALIZING WORKSPACE...</p>
      </div>
    );
  }

  // ==========================================
  // 🎨 パターンA: スマートピル ＋ サイドバー UI
  // ==========================================
  if (pdfList.length > 0 && securePdfUrl) {
    // 現在表示しているPDFのファイル名を抽出（表示用）
    const currentFileName = pdfList[currentIndex].split('/').pop()?.replace(/^\d+_/, '') || `PDF ${currentIndex + 1}`;

    return (
      <div className="relative h-[100dvh] w-screen bg-black overflow-hidden select-none flex">
        
        {/* PDFリーダー本体（最背面） */}
        <div className="absolute inset-0 z-0">
          <PDFReader url={securePdfUrl} />
        </div>

        {/* 戻るボタン */}
        <button 
          onClick={() => router.back()} 
          className="absolute top-6 left-4 z-40 p-3 bg-black/40 backdrop-blur-xl rounded-full text-white/70 active:scale-90 transition-all border border-white/10 hover:bg-black/60"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* 🌟 1. スマートピル (右上の小さな情報窓) */}
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className={`absolute top-6 right-6 z-40 bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl px-5 py-3 rounded-full flex items-center gap-4 transition-all duration-500 hover:scale-105 hover:bg-black/80 ${isSidebarOpen ? 'opacity-0 pointer-events-none translate-x-10' : 'opacity-100 translate-x-0'}`}
        >
          <div className="flex items-center gap-2">
            {isRunning ? (
              <Play className="w-4 h-4 text-indigo-400 animate-pulse fill-current" />
            ) : (
              <Pause className="w-4 h-4 text-amber-400 fill-current" />
            )}
            <span className="text-white font-black font-mono text-lg tracking-wider">{formatTime(seconds)}</span>
          </div>
          <div className="w-[1px] h-5 bg-white/20"></div>
          <div className="flex items-center gap-2 text-slate-300">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold truncate max-w-[120px]">{currentFileName}</span>
          </div>
        </button>

        {/* 🌟 2. サイドバー (コントロールパネル) */}
        {/* 暗転オーバーレイ */}
        <div 
          className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] z-40 transition-opacity duration-500 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setIsSidebarOpen(false)}
        />

        {/* サイドバー本体 */}
        <div className={`absolute top-0 right-0 w-80 max-w-[85vw] h-full bg-[#1c1c1e]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl z-50 flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h3 className="text-white font-black tracking-widest text-sm">CONTROL PANEL</h3>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
            
            {/* タイマー操作エリア */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-indigo-400 font-black tracking-[0.2em] mb-2 uppercase">Study Timer</span>
              <div className="text-5xl font-black font-mono text-white mb-6 tracking-wider drop-shadow-lg">{formatTime(seconds)}</div>
              
              <button 
                onClick={() => setIsRunning(!isRunning)}
                className={`w-full py-4 rounded-[2rem] font-black flex items-center justify-center gap-2 transition-all active:scale-95 ${isRunning ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'}`}
              >
                {isRunning ? <><Pause className="w-5 h-5 fill-current" /> PAUSE</> : <><Play className="w-5 h-5 fill-current ml-1" /> RESUME</>}
              </button>

              {/* 停止中 ＆ 1秒以上経過でセーブ・リセットボタン表示 */}
              {!isRunning && seconds > 0 && (
                <div className="flex w-full gap-2 mt-3">
                  <button 
                    onClick={() => setShowSaveModal(true)}
                    className="flex-[2] py-4 bg-emerald-500 text-white rounded-[1.5rem] font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 active:scale-95 transition-all"
                  >
                    <Save className="w-4 h-4" /> SAVE RECORD
                  </button>
                  <button 
                    onClick={() => { setSeconds(0); setMemo(""); }}
                    className="flex-1 p-4 bg-rose-500/10 text-rose-500 rounded-[1.5rem] font-black active:bg-rose-500/20 transition-all flex items-center justify-center"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

            {/* PDF切り替えリストエリア（複数対応） */}
            <div>
              <span className="text-[10px] text-emerald-400 font-black tracking-[0.2em] mb-4 block uppercase">Attached Materials ({pdfList.length})</span>
              <div className="space-y-2">
                {pdfList.map((pdfPath, idx) => {
                  // ファイル名だけを綺麗に抽出
                  const fileName = pdfPath.split('/').pop()?.replace(/^\d+_/, '') || `PDF ${idx + 1}`;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentIndex(idx);
                        if (window.innerWidth < 768) setIsSidebarOpen(false); // スマホなら選択後に閉じる
                      }}
                      className={`w-full text-left p-4 rounded-2xl flex items-center justify-between transition-all group ${currentIndex === idx ? 'bg-white/10 border border-white/20' : 'border border-transparent hover:bg-white/5'}`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileText className={`w-5 h-5 shrink-0 ${currentIndex === idx ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <span className={`text-sm font-bold truncate ${currentIndex === idx ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`}>
                          {fileName}
                        </span>
                      </div>
                      {currentIndex === idx && <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 🌟 3. 保存モーダル＆完了表示 (変更なし・階層を調整) */}
        {showSaveModal && (
          <div className="absolute inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-[#1c1c1e] border border-white/10 w-full max-w-xs rounded-[2.5rem] p-7 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-black text-sm tracking-tight">学習の記録</h3>
                <button onClick={() => setShowSaveModal(false)} className="p-2 bg-white/5 rounded-full text-white/40"><X className="w-4 h-4" /></button>
              </div>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="何を学んだ？"
                className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-4 text-sm text-white outline-none focus:border-indigo-500 transition-all resize-none h-32 mb-6"
              />
              <button 
                onClick={handleSave} 
                disabled={isSaving} 
                className="w-full bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black text-sm flex justify-center items-center gap-3 shadow-xl shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {isSaving ? "SAVING..." : "COMPLETE"}
              </button>
            </div>
          </div>
        )}

        {isSaved && (
          <div className="absolute inset-0 z-[110] bg-emerald-600 flex flex-col items-center justify-center text-white animate-in slide-in-from-bottom-full duration-700 cubic-bezier(0.2, 0.8, 0.2, 1)">
            <div className="p-5 bg-white/20 rounded-full mb-6">
              <CheckCircle2 className="w-16 h-16 animate-in zoom-in-50 duration-500 delay-300" />
            </div>
            <span className="text-3xl font-black tracking-[0.3em]">GREAT JOB</span>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // 📄 パターンB: 通常モード (PDFがない場合・変更なし)
  // ==========================================
  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col text-slate-900 items-center justify-center p-4">
      <div className="absolute top-6 left-6">
        <button onClick={() => router.back()} className="p-3 bg-white hover:bg-slate-100 rounded-full shadow-sm transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 flex flex-col items-center transition-all">
        <div className="flex flex-col items-center mt-2 mb-8">
          <div className="text-[10px] font-black text-slate-400 flex items-center gap-1 mb-3 tracking-widest">
            <BookOpen className="w-4 h-4" /> CURRENT SUBJECT
          </div>
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="w-20 h-28 object-cover rounded-lg shadow-sm border border-slate-200 mb-4" />
          ) : (
            <div className="w-20 h-28 bg-slate-100 rounded-lg shadow-sm border border-slate-200 mb-4 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-slate-300" />
            </div>
          )}
          <h2 className="text-base font-black text-slate-800 text-center px-4 leading-relaxed line-clamp-3">
            {title}
          </h2>
        </div>

        <div className="mb-8 font-black tabular-nums tracking-tighter text-indigo-600" style={{ fontSize: seconds >= 3600 ? '4rem' : '5rem', lineHeight: '1' }}>
          {formatTime(seconds)}
        </div>

        {isSaved ? (
          <div className="w-full bg-green-50 border border-green-200 text-green-600 py-6 rounded-3xl flex flex-col items-center justify-center gap-2 animate-in zoom-in duration-300">
            <CheckCircle2 className="w-10 h-10" />
            <span className="font-black">記録を保存しました！</span>
          </div>
        ) : (
          <div className="w-full space-y-4">
            <div className="flex gap-4">
              <button 
                onClick={() => { setIsRunning(false); setSeconds(0); setMemo(""); }}
                className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-3xl font-black flex items-center justify-center gap-2 hover:bg-slate-200 active:scale-95 transition-all"
              >
                <RotateCcw className="w-5 h-5" /> リセット
              </button>
              <button 
                onClick={() => setIsRunning(!isRunning)}
                className={`flex-[2] py-5 text-white rounded-3xl font-black flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg ${isRunning ? 'bg-amber-500 shadow-amber-200' : 'bg-indigo-600 shadow-indigo-200'}`}
              >
                {isRunning ? (
                  <><Pause className="w-6 h-6 fill-current" /> 一時停止</>
                ) : (
                  <><Play className="w-6 h-6 fill-current ml-1" /> {seconds > 0 ? "再開" : "スタート"}</>
                )}
              </button>
            </div>

            <div className={`transition-all duration-500 overflow-hidden ${!isRunning && seconds > 0 ? 'max-h-96 opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="flex items-center gap-1 text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">
                    <PencilLine className="w-3 h-3" /> メモ・感想 (任意)
                  </label>
                  <textarea
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="今日の学びや反省などを記録..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none h-24"
                  />
                </div>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full bg-black text-white py-5 rounded-3xl font-black flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl disabled:opacity-50"
                >
                  {isSaving ? "保存中..." : <><Save className="w-5 h-5" /> この記録を保存して終了</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TimerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin opacity-20" />
      </div>
    }>
      <TimerContent />
    </Suspense>
  );
}