"use client";

import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { 
  Play, Pause, RotateCcw, Save, ArrowLeft, 
  BookOpen, CheckCircle2, PencilLine, X, Loader2, AlertCircle
} from "lucide-react";

import PdfViewer, { PdfViewerHandle } from "@/components/PdfViewer";
import PdfSidebar from "@/components/PdfSidebar"; 
import PdfToolbar from "@/components/PdfToolbar";

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

  const [pdfList, setPdfList] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [securePdfUrl, setSecurePdfUrl] = useState<string | null>(null);
  const [storageType, setStorageType] = useState<'supabase' | 'google_drive'>('supabase');
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const pdfViewerRef = useRef<PdfViewerHandle>(null);
  
  const [drawingMode, setDrawingMode] = useState<'none' | 'pen' | 'marker' | 'eraser' | 'text'>('none');
  const [drawingColor, setDrawingColor] = useState<string>('#ef4444');
  const [penWidth, setPenWidth] = useState(3);
  const [markerWidth, setMarkerWidth] = useState(18);
  const [eraserWidth, setEraserWidth] = useState(30);

  const [notes, setNotes] = useState<any[]>([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [notePage, setNotePage] = useState(1);
  const [noteContent, setNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const fetchMaterialPaths = useCallback(async () => {
    if (!materialId) { setIsInitializing(false); return; }
    try {
      const { data: material, error: dbError } = await supabase
        .from('materials')
        .select('pdf_url, google_drive_file_id, storage_type')
        .eq('id', materialId)
        .single();

      if (dbError) throw new Error("教材データの取得に失敗しました");
      
      // Google Drive からの取得
      if (material?.google_drive_file_id && material?.storage_type === 'google_drive') {
        setPdfList([material.google_drive_file_id]);
        setStorageType('google_drive');
        setIsInitializing(false);
        return;
      }

      // Supabase Storage からの取得
      if (!material || !material.pdf_url || material.pdf_url === '[]') { 
        setPdfList([]);
        setStorageType('supabase');
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
      setStorageType('supabase');
    } catch (e: any) { setPdfError(e.message); setIsInitializing(false); } 
  }, [materialId]);

  const fetchDriveFile = useCallback(async () => {
    if (pdfList.length === 0) return;
    setPdfError(null);
    
    if (securePdfUrl && securePdfUrl.startsWith('blob:')) {
      URL.revokeObjectURL(securePdfUrl);
    }

    try {
      const fileId = pdfList[currentIndex];

      // Google Drive から取得
      if (storageType === 'google_drive') {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        const providerToken = currentSession?.provider_token;
        if (!providerToken) throw new Error("Google Drive の認証が必要です。再ログインしてください。");
        const response = await fetch(`/api/drive?fileId=${encodeURIComponent(fileId)}`, {
          headers: { 'Authorization': `Bearer ${providerToken}` },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (response.status === 401) throw new Error("セッションが期限切れです。再ログインしてください。");
          if (response.status === 404) throw new Error("ファイルが見つかりません。");
          throw new Error(errorData.error || "Google Drive からのファイル取得に失敗しました。");
        }

        const blob = await response.blob();
        const localBlobUrl = URL.createObjectURL(blob);
        setSecurePdfUrl(localBlobUrl);
      } else {
        // Supabase Storage から取得
        const { data, error } = await supabase.storage
          .from('materials')
          .createSignedUrl(fileId, 3600); // 1時間有効

        if (error || !data?.signedUrl) {
          throw new Error("Supabase からのファイル取得に失敗しました。");
        }

        setSecurePdfUrl(data.signedUrl);
      }
    } catch (e: any) { 
      setPdfError(e.message); 
    } finally {
      setIsInitializing(false);
    }
  }, [pdfList, currentIndex, storageType]);

  useEffect(() => {
    return () => {
      if (securePdfUrl && securePdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(securePdfUrl);
      }
    };
  }, [securePdfUrl]);

  useEffect(() => { fetchMaterialPaths(); }, [fetchMaterialPaths]);
  useEffect(() => { fetchDriveFile(); }, [fetchDriveFile]);

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

    if (editingNoteId) {
      await supabase.from('notes').update({ page_number: notePage, content: noteContent }).eq('id', editingNoteId);
    } else {
      await supabase.from('notes').insert([{ user_id: user.id, pdf_id: materialId, page_number: notePage, content: noteContent }]);
    }
    
    setNoteContent(""); setIsAddingNote(false); setEditingNoteId(null); fetchNotes();
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm("このメモを削除しますか？")) return;
    const { error } = await supabase.from('notes').delete().eq('id', noteId);
    if (error) alert("削除エラー: " + error.message); else fetchNotes();
  };

  const handleEditNote = (note: any) => {
    setIsAddingNote(true); setNotePage(note.page_number); setNoteContent(note.content); setEditingNoteId(note.id);
  };

  const handleCancelNote = () => {
    setIsAddingNote(false); setNoteContent(""); setEditingNoteId(null);
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

  const handleNoteClick = (pageNumber: number) => {
    pdfViewerRef.current?.scrollToPage(pageNumber);
  };

  if (isInitializing) return <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col items-center justify-center"><Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" /><p className="text-[10px] font-black text-white/50 tracking-[0.2em] uppercase">INITIALIZING WORKSPACE...</p></div>;

  if (pdfError) return <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col items-center justify-center text-rose-500 p-10 text-center select-none"><AlertCircle className="w-12 h-12 mb-4 animate-pulse" /><p className="font-black mb-6 text-sm">{pdfError}</p><button onClick={fetchDriveFile} className="px-8 py-4 bg-white/10 rounded-full text-white font-black active:scale-95 transition-all hover:bg-white/20">再試行する</button></div>;

  if (pdfList.length > 0 && securePdfUrl) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a] overflow-hidden text-white font-sans">
        
        <PdfToolbar 
          mode={drawingMode} setMode={setDrawingMode}
          color={drawingColor} setColor={setDrawingColor}
          penWidth={penWidth} setPenWidth={setPenWidth}
          markerWidth={markerWidth} setMarkerWidth={setMarkerWidth}
          eraserWidth={eraserWidth} setEraserWidth={setEraserWidth}
          seconds={seconds} isRunning={isRunning} setIsRunning={setIsRunning}
          setIsSidebarOpen={setIsSidebarOpen}
        />

        <div className="flex-1 flex overflow-hidden relative">
          
          <div className="flex-1 relative border-r border-[#2c2c2e]">
            <PdfViewer 
              ref={pdfViewerRef} 
              pdfUrl={securePdfUrl} 
              pdfId={`${materialId}-pdf-${currentIndex}`} 
              drawingMode={drawingMode} 
              drawingColor={drawingColor}
              penWidth={penWidth}
              markerWidth={markerWidth}
              eraserWidth={eraserWidth}
            />

            {/* 🌟 修正1: PDFビューアの戻るボタン */}
            <button 
              onClick={() => router.back()} 
              className="absolute top-4 left-4 z-40 p-2.5 bg-black/40 backdrop-blur-xl rounded-full text-white/70 active:scale-90 transition-all border border-white/10 hover:bg-black/60"
              aria-label="前の画面に戻る"
              title="戻る"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-[60] md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          <div className={`
            fixed inset-y-0 right-0 z-[70] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
            ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
          `}>
            <div className="w-80 h-full bg-[#0d0d0f] shadow-2xl border-l border-white/10">
              <PdfSidebar 
                seconds={seconds} isRunning={isRunning} setIsRunning={setIsRunning}
                notes={notes} isAddingNote={isAddingNote} setIsAddingNote={setIsAddingNote}
                notePage={notePage} setNotePage={setNotePage}
                noteContent={noteContent} setNoteContent={setNoteContent}
                handleSaveNote={handleSaveNote} handleDeleteNote={handleDeleteNote}
                onNoteClick={handleNoteClick} handleEditNote={handleEditNote}
                handleCancelNote={handleCancelNote} editingNoteId={editingNoteId}
                pdfList={pdfList} currentIndex={currentIndex} setCurrentIndex={setCurrentIndex}
                memo={memo} setMemo={setMemo} handleSave={handleSave} isSaving={isSaving} setSeconds={setSeconds}
              />
            </div>
          </div>
        </div>

        {showSaveModal && (
          <div className="absolute inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-[#1c1c1e] border border-white/10 w-full max-w-xs rounded-[2.5rem] p-7 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-black text-sm tracking-tight">学習の記録</h3>
                {/* 🌟 修正2: モーダルの閉じるボタン */}
                <button 
                  onClick={() => setShowSaveModal(false)} 
                  className="p-2 bg-white/5 rounded-full text-white/40"
                  aria-label="閉じる"
                  title="閉じる"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
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
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col text-slate-900 items-center justify-center p-4">
      <div className="absolute top-6 left-6">
        {/* 🌟 修正3: PDFなし画面の戻るボタン */}
        <button 
          onClick={() => router.back()} 
          className="p-3 bg-white hover:bg-slate-100 rounded-full shadow-sm transition-colors"
          aria-label="前の画面に戻る"
          title="戻る"
        >
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