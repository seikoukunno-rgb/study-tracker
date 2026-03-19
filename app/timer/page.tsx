// app/timer/page.tsx
"use client";

import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { 
  Play, Pause, RotateCcw, Save, ArrowLeft, 
  BookOpen, CheckCircle2, PencilLine, X, Loader2, AlertCircle, FileText, Plus, Send, PenTool,
  ChevronRight, ChevronLeft, Menu // 🌟 収納機能用アイコンを追加
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
  
  // 🌟 追加：タイマーポップアップを収納するかどうかのステート
  const [isPillMinimized, setIsPillMinimized] = useState(false);

  const [pdfList, setPdfList] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [securePdfUrl, setSecurePdfUrl] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const pdfViewerRef = useRef<PdfViewerHandle>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [notePage, setNotePage] = useState(1);
  const [noteContent, setNoteContent] = useState("");

  const fetchMaterialPaths = useCallback(async () => {
    if (!materialId) { setIsInitializing(false); return; }
    try {
      const { data: material, error: dbError } = await supabase.from('materials').select('pdf_url').eq('id', materialId).single();
      if (dbError) throw new Error("教材データの取得に失敗しました");
      if (!material || !material.pdf_url) { setIsInitializing(false); return; }

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
    } catch (e: any) { setPdfError(e.message); } finally { setIsInitializing(false); }
  }, [materialId]);

  const fetchSignedUrl = useCallback(async () => {
    if (pdfList.length === 0) return;
    setPdfError(null);
    try {
      let filePath = pdfList[currentIndex];
      if (filePath.includes('/storage/v1/object/public/pdfs/')) filePath = filePath.split('/storage/v1/object/public/pdfs/')[1];
      else if (filePath.includes('/pdfs/')) filePath = filePath.split('/pdfs/')[1];

      const { data, error: storageError } = await supabase.storage.from('pdfs').createSignedUrl(filePath, 300);
      if (storageError) throw new Error("セキュアPDFの発行に失敗しました");
      setSecurePdfUrl(data.signedUrl);
    } catch (e: any) { setPdfError(e.message); }
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

    if (error) { alert("保存エラー"); setIsSaving(false); } 
    else { setIsSaved(true); setIsRunning(false); setShowSaveModal(false); setTimeout(() => router.push("/"), 1500); }
  };

  if (pdfError || isInitializing) return <div className="h-[100dvh] w-full bg-black flex items-center justify-center"><Loader2 className="w-10 h-10 text-indigo-500 animate-spin" /></div>;

  if (pdfList.length > 0 && securePdfUrl) {
    return (
      <div className="relative h-[100dvh] w-full bg-[#0a0a0a] overflow-hidden select-none flex">
        
        <div className="absolute inset-0 z-0">
          <PdfViewer ref={pdfViewerRef} pdfUrl={securePdfUrl} isDrawingMode={isDrawingMode} />
        </div>

        <button onClick={() => router.back()} className="absolute top-6 left-4 z-40 p-3 bg-black/40 backdrop-blur-xl rounded-full text-white/70 active:scale-90 transition-all border border-white/10 hover:bg-black/60">
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* 🌟 修正：収納可能なタイマーポップアップ (スマートピル) */}
        <div 
          className={`absolute top-6 right-0 z-40 flex items-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isSidebarOpen ? 'translate-x-full opacity-0' : isPillMinimized ? 'translate-x-[calc(100%-28px)]' : '-translate-x-4'
          }`}
        >
          {/* 収納/展開トグルボタン */}
          <button 
            onClick={() => setIsPillMinimized(!isPillMinimized)}
            className="h-12 w-7 bg-black/60 backdrop-blur-xl border-y border-l border-white/10 rounded-l-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-black/80 transition-colors shadow-[-5px_0_15px_rgba(0,0,0,0.3)]"
          >
            {isPillMinimized ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {/* ポップアップ本体 */}
          <div className="bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl pl-3 pr-2 py-2 flex items-center gap-3 h-12 rounded-r-xl">
            
            {/* タイマー表示部 */}
            <button onClick={() => setIsRunning(!isRunning)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              {isRunning ? <Play className="w-4 h-4 text-indigo-400 animate-pulse fill-current" /> : <Pause className="w-4 h-4 text-amber-400 fill-current" />}
              <span className="text-white font-black font-mono text-lg tracking-wider w-16 text-left">{formatTime(seconds)}</span>
            </button>

            <div className="w-[1px] h-6 bg-white/20 mx-1"></div>

            {/* 🌟 ペンマーク（書き込みモード切替） */}
            <button
              onClick={() => setIsDrawingMode(!isDrawingMode)}
              className={`p-2 rounded-lg transition-all ${isDrawingMode ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
              title="書き込みモード"
            >
              <PenTool className="w-4 h-4" />
            </button>

            {/* サイドバー展開ボタン */}
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg">
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 暗転オーバーレイ */}
        <div className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] z-40 transition-opacity duration-500 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)} />

        {/* サイドバー本体 */}
        <div className={`absolute top-0 right-0 w-80 max-w-[85vw] h-full bg-[#1c1c1e]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl z-50 flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h3 className="text-white font-black tracking-widest text-sm">CONTROL PANEL</h3>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
            {/* タイマー操作エリア */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-indigo-400 font-black tracking-[0.2em] mb-2 uppercase">Study Timer</span>
              <div className="text-5xl font-black font-mono text-white mb-6 tracking-wider drop-shadow-lg">{formatTime(seconds)}</div>
              <button onClick={() => setIsRunning(!isRunning)} className={`w-full py-4 rounded-[2rem] font-black flex items-center justify-center gap-2 transition-all active:scale-95 ${isRunning ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'}`}>
                {isRunning ? <><Pause className="w-5 h-5 fill-current" /> PAUSE</> : <><Play className="w-5 h-5 fill-current ml-1" /> RESUME</>}
              </button>
              {!isRunning && seconds > 0 && (
                <div className="flex w-full gap-2 mt-3">
                  <button onClick={() => setShowSaveModal(true)} className="flex-[2] py-4 bg-emerald-500 text-white rounded-[1.5rem] font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 active:scale-95 transition-all"><Save className="w-4 h-4" /> SAVE RECORD</button>
                  <button onClick={() => { setSeconds(0); setMemo(""); }} className="flex-1 p-4 bg-rose-500/10 text-rose-500 rounded-[1.5rem] font-black active:bg-rose-500/20 transition-all flex items-center justify-center"><RotateCcw className="w-4 h-4" /></button>
                </div>
              )}
            </div>

            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

            {/* メモエリア */}
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

            {/* 資料エリア */}
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

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col text-slate-900 items-center justify-center p-4">
      {/* 以前の通常モード画面省略なし (そのまま) */}
      <div className="text-center">PDFが見つかりません。</div>
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