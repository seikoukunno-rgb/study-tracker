// app/timer/page.tsx
"use client";

import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { 
  Play, Pause, RotateCcw, Save, ArrowLeft, 
  BookOpen, CheckCircle2, PencilLine, X, Loader2, AlertCircle, FileText, Plus, Send, PenTool,
  ChevronRight, ChevronLeft, Menu, Eraser, Highlighter
} from "lucide-react";

import PdfViewer, { PdfViewerHandle } from "@/components/PdfViewer";

function TimerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const materialId = searchParams.get("id") || searchParams.get("material_id"); 
  const title = searchParams.get("title") || "名称未設定の教材";
  const imageUrl = searchParams.get("image_url");

  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [memo, setMemo] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPillMinimized, setIsPillMinimized] = useState(false);

  const [pdfList, setPdfList] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [securePdfUrl, setSecurePdfUrl] = useState<string | null>(null);
  
  // 🌟 初期化中かどうかの判定
  const [isInitializing, setIsInitializing] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const pdfViewerRef = useRef<PdfViewerHandle>(null);
  const [drawingMode, setDrawingMode] = useState<'none' | 'pen' | 'marker' | 'eraser'>('none');
  const [drawingColor, setDrawingColor] = useState<string>('#ef4444');

  const [notes, setNotes] = useState<any[]>([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [notePage, setNotePage] = useState(1);
  const [noteContent, setNoteContent] = useState("");

  const fetchMaterialPaths = useCallback(async () => {
    if (!materialId) { setIsInitializing(false); return; }
    try {
      const { data: material, error: dbError } = await supabase.from('materials').select('pdf_url').eq('id', materialId).single();
      if (dbError) throw new Error("教材データの取得に失敗しました");
      
      // PDFURLが空っぽ（nullや空文字）の場合はPDFなしと判定
      if (!material || !material.pdf_url || material.pdf_url === '[]') { 
        setPdfList([]);
        setIsInitializing(false); 
        return; 
      }

      let paths: string[] = [];
      if (Array.isArray(material.pdf_url)) paths = material.pdf_url;
      else if (typeof material.pdf_url === 'string') {
        try {
          const parsed = JSON.parse(material.pdf_url);
          paths = Array.isArray(parsed) ? parsed : [material.pdf_url];
        } catch (e) {
          paths = material.pdf_url.split(',').map((p: string) => p.trim()).filter(Boolean);
        }
      }
      setPdfList(paths);
    } catch (e: any) { setPdfError(e.message); } 
    // fetchSignedUrlでローディングを解除するため、ここではまだ isInitializing を false にしない
  }, [materialId]);

  const fetchSignedUrl = useCallback(async () => {
    if (pdfList.length === 0) {
      setIsInitializing(false); // PDFがない場合はここでローディング終了
      return;
    }
    setPdfError(null);
    try {
      let filePath = pdfList[currentIndex];
      if (filePath.includes('/storage/v1/object/public/pdfs/')) filePath = filePath.split('/storage/v1/object/public/pdfs/')[1];
      else if (filePath.includes('/pdfs/')) filePath = filePath.split('/pdfs/')[1];

      const { data, error: storageError } = await supabase.storage.from('pdfs').createSignedUrl(filePath, 300);
      if (storageError) throw new Error("セキュアPDFの発行に失敗しました");
      setSecurePdfUrl(data.signedUrl);
    } catch (e: any) { setPdfError(e.message); } finally {
      setIsInitializing(false); // 取得が終わったらローディング終了
    }
  }, [pdfList, currentIndex]);

  useEffect(() => { fetchMaterialPaths(); }, [fetchMaterialPaths]);
  useEffect(() => { fetchSignedUrl(); }, [fetchSignedUrl]);

  const fetchNotes = useCallback(async () => {
    if (!materialId) return;
    const { data } = await supabase.from('notes').select('*').eq('pdf_id', materialId).order('page_number', { ascending: true });
    if (data) setNotes(data);
  }, [materialId]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const handleSaveNote = async () => {
    if (!noteContent.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("ログインが必要です");
    await supabase.from('notes').insert([{ user_id: user.id, pdf_id: materialId, page_number: notePage, content: noteContent }]);
    setNoteContent(""); setIsAddingNote(false); fetchNotes();
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) interval = setInterval(() => setSeconds((s) => s + 1), 1000);
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
    if (!user) { alert("ログインが必要です"); router.push("/login"); return; }
    const durationMinutes = Math.floor(seconds / 60);
    const now = new Date();
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const { error } = await supabase.from('study_logs').insert([{
      student_id: user.id, material_id: materialId || null, duration_minutes: durationMinutes, thoughts: memo, studied_at: localDate 
    }]);

    if (error) { alert("保存エラー: " + error.message); setIsSaving(false); } 
    else { setIsSaved(true); setIsRunning(false); setShowSaveModal(false); setTimeout(() => router.push("/"), 1500); }
  };

  // --- ローディング画面 ---
  if (isInitializing) return <div className="h-[100dvh] w-full bg-[#0a0a0a] flex flex-col items-center justify-center"><Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" /><p className="text-[10px] font-black text-white/50 tracking-[0.2em] uppercase">INITIALIZING WORKSPACE...</p></div>;

  // --- エラー画面 ---
  if (pdfError) return <div className="h-[100dvh] w-full bg-[#0a0a0a] flex flex-col items-center justify-center text-rose-500 p-10 text-center select-none"><AlertCircle className="w-12 h-12 mb-4 animate-pulse" /><p className="font-black mb-6 text-sm">{pdfError}</p><button onClick={fetchSignedUrl} className="px-8 py-4 bg-white/10 rounded-full text-white font-black active:scale-95 transition-all hover:bg-white/20">再試行する</button></div>;


  // ==========================================
  // 🎨 パターンA: PDFがある場合の「最強学習ルーム」
  // ==========================================
  if (pdfList.length > 0 && securePdfUrl) {
    const currentFileName = pdfList[currentIndex].split('/').pop()?.replace(/^\d+_/, '') || `PDF ${currentIndex + 1}`;

    return (
      <div className="flex h-[100dvh] w-full bg-[#0a0a0a] overflow-hidden text-white font-sans relative">
        <div className="flex-1 relative flex flex-col border-r border-[#2c2c2e]">
          <div className="absolute inset-0 z-0">
           // app/timer/page.tsx の中
<PdfViewer 
  ref={pdfViewerRef} 
  pdfUrl={securePdfUrl} 
  pdfId={`${materialId}-pdf-${currentIndex}`} // 🌟 ここが「司令塔」からデータを送る場所です
  drawingMode={drawingMode} 
  drawingColor={drawingColor} 
/>
          </div>

          <button onClick={() => router.back()} className="absolute top-6 left-4 z-40 p-3 bg-black/40 backdrop-blur-xl rounded-full text-white/70 active:scale-90 transition-all border border-white/10 hover:bg-black/60">
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* 🌟 ツールバーポップアップ */}
          <div className={`absolute top-6 right-0 z-40 flex items-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isPillMinimized ? 'translate-x-[calc(100%-28px)]' : '-translate-x-4'}`}>
            <button onClick={() => setIsPillMinimized(!isPillMinimized)} className="h-12 w-7 bg-[#1c1c1e] border-y border-l border-white/10 rounded-l-xl flex items-center justify-center text-white/50 hover:text-white transition-colors shadow-[-5px_0_15px_rgba(0,0,0,0.5)]">
              {isPillMinimized ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <div className="bg-[#1c1c1e] border border-white/10 shadow-2xl pl-3 pr-2 py-2 flex items-center h-12 rounded-r-xl">
              <button onClick={() => setIsRunning(!isRunning)} className="flex items-center gap-2 hover:opacity-80 transition-opacity pr-2">
                {isRunning ? <Play className="w-4 h-4 text-indigo-400 animate-pulse fill-current" /> : <Pause className="w-4 h-4 text-amber-400 fill-current" />}
                <span className="text-white font-black font-mono text-lg tracking-wider w-16 text-left">{formatTime(seconds)}</span>
              </button>
              <div className="w-[1px] h-6 bg-white/20 mx-1"></div>
              <button onClick={() => setDrawingMode(drawingMode === 'pen' ? 'none' : 'pen')} className={`p-2 rounded-lg transition-all ${drawingMode === 'pen' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}><PenTool className="w-4 h-4" /></button>
              <button onClick={() => setDrawingMode(drawingMode === 'marker' ? 'none' : 'marker')} className={`p-2 rounded-lg transition-all ${drawingMode === 'marker' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}><Highlighter className="w-4 h-4" /></button>
              <button onClick={() => setDrawingMode(drawingMode === 'eraser' ? 'none' : 'eraser')} className={`p-2 rounded-lg transition-all ${drawingMode === 'eraser' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}><Eraser className="w-4 h-4" /></button>
              {(drawingMode === 'pen' || drawingMode === 'marker') && (
                <div className="flex items-center gap-2 ml-2 pl-3 border-l border-white/20 animate-in fade-in slide-in-from-left-2 duration-200">
                  <button onClick={() => setDrawingColor('#ef4444')} className={`w-4 h-4 rounded-full bg-red-500 transition-all ${drawingColor === '#ef4444' ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'}`} />
                  <button onClick={() => setDrawingColor('#3b82f6')} className={`w-4 h-4 rounded-full bg-blue-500 transition-all ${drawingColor === '#3b82f6' ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'}`} />
                  <button onClick={() => setDrawingColor('#eab308')} className={`w-4 h-4 rounded-full bg-yellow-500 transition-all ${drawingColor === '#eab308' ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'}`} />
                </div>
              )}
              <div className="md:hidden flex items-center ml-2 pl-2 border-l border-white/20">
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-white/10 rounded-lg transition-colors"><Menu className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </div>

        {/* 🌟 サイドバー */}
        <div className={`md:hidden absolute inset-0 bg-black/40 backdrop-blur-[2px] z-[45] transition-opacity duration-500 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)} />
        <div className={`absolute md:relative top-0 right-0 w-80 max-w-[85vw] h-full bg-[#1c1c1e] md:bg-[#141414] border-l border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] md:shadow-none z-[50] md:z-10 flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h3 className="text-white font-black tracking-widest text-sm">CONTROL PANEL</h3>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-indigo-400 font-black tracking-[0.2em] mb-2 uppercase">Study Timer</span>
              <div className="text-5xl font-black font-mono text-white mb-6 tracking-wider drop-shadow-lg">{formatTime(seconds)}</div>
              <button onClick={() => setIsRunning(!isRunning)} className={`w-full py-4 rounded-[2rem] font-black flex items-center justify-center gap-2 transition-all active:scale-95 ${isRunning ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'}`}>
                {isRunning ? <><Pause className="w-5 h-5 fill-current" /> PAUSE</> : <><Play className="w-5 h-5 fill-current ml-1" /> RESUME</>}
              </button>
              {!isRunning && seconds > 0 && (
                <div className="flex w-full gap-2 mt-3">
                  <button onClick={() => setShowSaveModal(true)} className="flex-[2] py-4 bg-emerald-500 text-white rounded-[1.5rem] font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 active:scale-95 transition-all"><Save className="w-4 h-4" /> SAVE</button>
                  <button onClick={() => { setSeconds(0); setMemo(""); }} className="flex-1 p-4 bg-rose-500/10 text-rose-500 rounded-[1.5rem] font-black active:bg-rose-500/20 transition-all flex items-center justify-center"><RotateCcw className="w-4 h-4" /></button>
                </div>
              )}
            </div>
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] text-indigo-400 font-black tracking-[0.2em] uppercase block">Notes</span>
                <button onClick={() => setIsAddingNote(true)} className="p-1 hover:bg-white/10 rounded-md transition-colors text-indigo-400"><Plus className="w-4 h-4" /></button>
              </div>
              {isAddingNote && (
                <div className="bg-[#2c2c2e] p-4 rounded-2xl border border-indigo-500/50 mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <input type="number" value={notePage} onChange={(e) => setNotePage(Number(e.target.value))} className="w-16 bg-black/30 border border-white/10 rounded px-2 py-1 text-xs font-black text-indigo-400 outline-none" placeholder="Page" />
                    <button onClick={() => setIsAddingNote(false)}><X className="w-4 h-4 text-slate-500" /></button>
                  </div>
                  <textarea autoFocus value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="メモを入力..." className="w-full bg-transparent text-sm font-bold text-white outline-none resize-none h-20 placeholder:text-slate-600 mb-2" />
                  <button onClick={handleSaveNote} className="w-full py-2 bg-indigo-600 rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:bg-indigo-500 transition-all text-white"><Send className="w-3 h-3" /> 保存</button>
                </div>
              )}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 no-scrollbar">
                {notes.map((note) => (
                  <button key={note.id} onClick={() => { pdfViewerRef.current?.scrollToPage(note.page_number); if (window.innerWidth < 768) setIsSidebarOpen(false); }} className="w-full text-left p-3 rounded-2xl bg-black/20 hover:bg-black/40 border border-white/5 hover:border-indigo-500/30 transition-all group">
                    <div className="flex justify-between text-[10px] font-black mb-1.5 text-slate-500"><span className="text-indigo-400 bg-indigo-500/10 px-2 py-[1px] rounded">P.{note.page_number}</span><span>{new Date(note.created_at).toLocaleDateString()}</span></div>
                    <p className="text-xs font-bold leading-relaxed text-slate-300 line-clamp-2">{note.content}</p>
                  </button>
                ))}
                {notes.length === 0 && !isAddingNote && <p className="text-xs font-bold text-slate-600 text-center py-4">メモはありません</p>}
              </div>
            </div>
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            <div>
              <span className="text-[10px] text-emerald-400 font-black tracking-[0.2em] mb-4 block uppercase">Attached Materials ({pdfList.length})</span>
              <div className="space-y-2">
                {pdfList.map((pdfPath, idx) => {
                  const fileName = pdfPath.split('/').pop()?.replace(/^\d+_/, '') || `PDF ${idx + 1}`;
                  return (
                    <button key={idx} onClick={() => { setCurrentIndex(idx); if (window.innerWidth < 768) setIsSidebarOpen(false); }} className={`w-full text-left p-4 rounded-2xl flex items-center justify-between transition-all group ${currentIndex === idx ? 'bg-white/10 border border-white/20' : 'border border-transparent hover:bg-white/5'}`}>
                      <div className="flex items-center gap-3 overflow-hidden"><FileText className={`w-5 h-5 shrink-0 ${currentIndex === idx ? 'text-emerald-400' : 'text-slate-500'}`} /><span className={`text-sm font-bold truncate ${currentIndex === idx ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`}>{fileName}</span></div>
                      {currentIndex === idx && <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 🌟 セーブモーダル */}
        {showSaveModal && (
          <div className="absolute inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-[#1c1c1e] border border-white/10 w-full max-w-xs rounded-[2.5rem] p-7 shadow-2xl">
              <div className="flex justify-between items-center mb-6"><h3 className="text-white font-black text-sm tracking-tight">学習の記録</h3><button onClick={() => setShowSaveModal(false)} className="p-2 bg-white/5 rounded-full text-white/40"><X className="w-4 h-4" /></button></div>
              <textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="何を学んだ？" className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-4 text-sm text-white outline-none focus:border-indigo-500 transition-all resize-none h-32 mb-6" />
              <button onClick={handleSave} disabled={isSaving} className="w-full bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black text-sm flex justify-center items-center gap-3 shadow-xl shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}{isSaving ? "SAVING..." : "COMPLETE"}
              </button>
            </div>
          </div>
        )}

        {isSaved && (
          <div className="absolute inset-0 z-[110] bg-emerald-600 flex flex-col items-center justify-center text-white animate-in slide-in-from-bottom-full duration-700 cubic-bezier(0.2, 0.8, 0.2, 1)">
            <div className="p-5 bg-white/20 rounded-full mb-6"><CheckCircle2 className="w-16 h-16 animate-in zoom-in-50 duration-500 delay-300" /></div>
            <span className="text-3xl font-black tracking-[0.3em]">GREAT JOB</span>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // 📄 パターンB: PDFがない場合の「ノーマルタイマー」
  // ==========================================
  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col text-slate-900 items-center justify-center p-4 relative">
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
    <Suspense fallback={<div className="min-h-[100dvh] w-full bg-[#0a0a0a] flex items-center justify-center"><Loader2 className="w-10 h-10 text-indigo-500 animate-spin opacity-20" /></div>}>
      <TimerContent />
    </Suspense>
  );
}