"use client";

import { useState, useEffect } from "react";
import { Book, Clock, Plus, BookOpen, CheckCircle2, X, SmartphoneNfc, PencilLine, History, Settings, Loader2, Search, Trash2, FileEdit } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase"; 

export default function Home() {
  const router = useRouter();
  const [materials, setMaterials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalTime, setTotalTime] = useState(0);
// 🌟 ファイルの上部（useStateが並んでいるところ）に追加
const [selectedPdfs, setSelectedPdfs] = useState<File[]>([]);
const [isUploading, setIsUploading] = useState(false); // アップロード中のぐるぐる用
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [timeInput, setTimeInput] = useState("");
  const [memoInput, setMemoInput] = useState("");
  const [showSuccess, setShowSuccess] = useState(false); 
  const [lastStudiedDate, setLastStudiedDate] = useState<string | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customTitle, setCustomTitle] = useState("");

  // 🌟 ファイルの上部（useState などがある場所）に追加
const PRESET_ICONS = [
  "/icons/blue.png",
  "icons/black.png",
  "icons/gold.png",
  "icons/green.png",
  "icons/light-blue.png",
  "icons/orange.png",
   "icons/purple.png",
   "icons/red.png",
   "icons/silver.png",
    "icons/yellow.png",
    "icons/vocabulary-book.png"

  // 👆 用意した画像のファイル名に合わせて書き換えてください
];

// 最初は1番目の画像を選択状態にしておく
const [selectedIconUrl, setSelectedIconUrl] = useState(PRESET_ICONS[0]);

  // 🌟 教材（マイ本棚）のスワイプ削除用State
  const [swipingMaterialId, setSwipingMaterialId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);
  
  // 🌟 カッコいい削除モーダル用のState
  const [deleteTarget, setDeleteTarget] = useState<{id: string, title: string} | null>(null);

  // 🌟 教材カードのスワイプ処理
  const handleMaterialTouchStart = (e: React.TouchEvent, materialId: string) => {
    setSwipingMaterialId(materialId);
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
    setSwipeOffset(0);
    setIsSwiping(true);
  };

  const handleMaterialTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || !isSwiping) return;
    const currentX = e.targetTouches[0].clientX;
    const currentY = e.targetTouches[0].clientY;
    const xDiff = currentX - touchStart.x;
    const yDiff = currentY - touchStart.y;
    
    if (Math.abs(yDiff) > Math.abs(xDiff) && Math.abs(swipeOffset) < 10) {
      setIsSwiping(false);
      return;
    }
    if (xDiff < 0) {
      setSwipeOffset(xDiff);
    }
  };

  const handleMaterialTouchEnd = (materialId: string, title: string) => {
    if (!isSwiping) return;
    setIsSwiping(false);
    
    // -80px スワイプで「シュイン！」を発動
    if (swipeOffset < -80) {
      setSwipeOffset(-window.innerWidth); 
      setTimeout(() => {
        setDeleteTarget({ id: materialId, title: title }); // モーダルを出す
        setTimeout(() => {
          setSwipeOffset(0);
          setSwipingMaterialId(null);
        }, 300);
      }, 200);
    } else {
      setSwipeOffset(0);
      setSwipingMaterialId(null);
    }
    setTouchStart(null);
  };

  useEffect(() => {
    const checkDarkMode = () => {
      const savedMode = localStorage.getItem('dark_mode');
      setIsDarkMode(savedMode === 'true');
    };
    
    checkDarkMode();
    fetchData();

    window.addEventListener('storage', checkDarkMode);
    window.addEventListener('darkModeChanged', checkDarkMode);

    return () => {
      window.removeEventListener('storage', checkDarkMode);
      window.removeEventListener('darkModeChanged', checkDarkMode);
    };
  }, []);

  useEffect(() => {
    if (selectedMaterial) {
      const fetchLastStudied = async () => {
        const { data } = await supabase
          .from('study_logs')
          .select('created_at')
          .eq('material_id', selectedMaterial.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (data) {
          const date = new Date(data.created_at);
          setLastStudiedDate(`${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`);
        } else {
          setLastStudiedDate("まだ記録がありません");
        }
      };
      fetchLastStudied();
    } else {
      setLastStudiedDate(null);
    }
  }, [selectedMaterial]);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: matData } = await supabase.from('materials').select('*').eq('student_id', user.id).order('created_at', { ascending: false });
    if (matData) setMaterials(matData);

    const today = new Date().toISOString().split('T')[0];
    const { data: logsData } = await supabase.from('study_logs').select('duration_minutes').eq('studied_at', today).eq('student_id', user.id);
    
    if (logsData) {
      const total = logsData.reduce((sum: number, log: any) => sum + log.duration_minutes, 0);
      setTotalTime(total);
    }
    setIsLoading(false);
  };
// ==========================================
  // 🌟 リマインダー通知 ＆ 30分後自動削除システム
  // ==========================================
  useEffect(() => {
    // 1. 最初に、ブラウザの通知許可をお願いする（初回のみポップアップが出ます）
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const checkReminders = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      
      // Supabaseからリマインダーを取得
      const { data: reminders } = await supabase
        .from('reminders')
        .select('*')
        .eq('student_id', user.id);

      if (!reminders || reminders.length === 0) return;

      reminders.forEach(async (reminder) => {
        const remindTime = new Date(reminder.remind_at);
        // 設定時刻から「何分経過したか」を計算
        const diffMinutes = (now.getTime() - remindTime.getTime()) / (1000 * 60);

        // 🌟 ① 設定時刻ピッタリ（0〜1分経過）なら通知を送る！
        // ※ すでに通知済みのものを何度も鳴らさないように localStorage で管理します
        const notifiedKey = `notified_${reminder.id}`;
        if (diffMinutes >= 0 && diffMinutes < 1 && !localStorage.getItem(notifiedKey)) {
          if (Notification.permission === "granted") {
            new Notification("STUDY TRACKER", {
              body: `リマインダー: ${reminder.title} の時間です！`,
              icon: "/favicon.ico" // もしアプリのアイコンがあれば指定
            });
            localStorage.setItem(notifiedKey, "true"); // 通知済みマークをつける
          }
        }

        // 🌟 ② 設定時刻から30分経過していたら、自動でデータベースから削除する！
        if (diffMinutes >= 30) {
          await supabase.from('reminders').delete().eq('id', reminder.id);
          localStorage.removeItem(notifiedKey); // ゴミ掃除
          console.log(`リマインダー「${reminder.title}」を30分経過のため削除しました`);
        }
      });
    };

    // 1分ごと（60000ミリ秒）に時間をチェックして回るループ
    const intervalId = setInterval(checkReminders, 60000);
    
    // 画面を開いた時にも1回チェック
    checkReminders();

    return () => clearInterval(intervalId); // 画面を閉じる時にループを止める
  }, []);
  // ==========================================
  useEffect(() => {
    if (materials.length > 0 && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const recordId = params.get('record'); 

      if (recordId) {
        const targetMat = materials.find(m => m.id === recordId);
        if (targetMat) {
          setSelectedMaterial(targetMat); 
          window.history.replaceState({}, '', '/'); 
        }
      }
    }
  }, [materials]);

  const handleSaveRecord = async () => {
    if (!selectedMaterial || !timeInput) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('study_logs').insert([{
      material_id: selectedMaterial.id,
      student_id: user.id,
      duration_minutes: parseInt(timeInput, 10),
      studied_at: new Date().toISOString().split('T')[0],
      thoughts: memoInput
    }]);

    if (!error) {
      setSelectedMaterial(null);
      setTimeInput("");
      setMemoInput("");
      fetchData();
      setShowSuccess(true); 
      setTimeout(() => setShowSuccess(false), 3000);
    } else {
      alert(`保存エラー: ${error.message}`);
    }
  };

const handleAddCustomMaterial = async () => {
  // 🌟 customTitle が空なら何もしないバリデーション
  if (!customTitle.trim()) return;
  
  setIsUploading(true);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("ログインが必要です");
      setIsUploading(false);
      return;
    }

    // アップロードされたパスを保存する配列
    let pdfPaths: string[] = [];

    // --- 🌟 あなたが提示した複数アップロードの核となるロジック ---
    if (selectedPdfs.length > 0) {
      for (const file of selectedPdfs) {
        const fileExt = file.name.split('.').pop();
        // 重複防止のためランダム文字列を追加
        const uniqueFileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('pdfs')
          .upload(uniqueFileName, file);

        // 🌟 修正1：ストレージ（PDF保存）でエラーが起きた場合
        if (uploadError) throw new Error("【ストレージのRLSエラー】 " + uploadError.message);

        // パスを記録
        pdfPaths.push(uniqueFileName);
      }
    }
    // --------------------------------------------------------

    // 2. データベースに保存
    const { error: dbError } = await supabase.from('materials').insert([{ 
      student_id: user.id, 
      title: customTitle,
      image_url: selectedIconUrl,
      // 🌟 重要：配列をJSON形式の文字列にして1つのセルに保存！
      pdf_url: pdfPaths.length > 0 ? JSON.stringify(pdfPaths) : null 
    }]);

    // 🌟 修正2：データベース（情報保存）でエラーが起きた場合
    if (dbError) throw new Error("【データベースのRLSエラー】 " + dbError.message);

    // --- 🌟 ここからがエラーの「犯人」を駆除するリセット処理 ---
    setCustomTitle("");
    
    // 修正前: setSelectedPdf(null) ← これがエラーの原因でした
    setSelectedPdfs([]); // 修正後: 配列を空にする
    
    setSelectedIconUrl(PRESET_ICONS[0]); 
    setShowCustomModal(false); 
    fetchData(); // データを再読み込み
    
    alert("バインダー教材を作成しました！");

  } catch (error: any) {
    console.error(error);
    // 🌟 修正3：エラーメッセージをそのままアラートに出す
    alert(error.message);
  } finally {
    setIsUploading(false);
  }
};
  const bgPage = isDarkMode ? "bg-[#0a0a0a] text-slate-100" : "bg-slate-50 text-slate-800";
  const bgHeader = isDarkMode ? "bg-[#1c1c1e] border-[#2c2c2e]" : "bg-white border-slate-100";
  const bgCard = isDarkMode ? "bg-[#1c1c1e] border-[#38383a]" : "bg-white border-slate-100";
  const bgSubCard = isDarkMode ? "bg-[#2c2c2e] border-[#38383a]" : "bg-slate-100 border-slate-50";
  const textMain = isDarkMode ? "text-white" : "text-slate-800";
  const textSub = isDarkMode ? "text-slate-400" : "text-slate-500";
  const bgInput = isDarkMode ? "bg-[#2c2c2e] border-[#38383a] text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-700 focus:border-indigo-500";

  return (
    <div className={`min-h-screen pb-24 font-sans transition-colors duration-300 ${bgPage}`}>
      
      {showSuccess && (
        <div className="fixed bottom-24 left-4 right-4 z-[100] bg-emerald-500 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between animate-in fade-in slide-in-from-bottom duration-500">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6" />
            <span className="font-bold">記録を保存しました！</span>
          </div>
          <button onClick={() => setShowSuccess(false)}><X className="w-5 h-5 text-white/70 hover:text-white" /></button>
        </div>
      )}

      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200]" onClick={() => setShowAddModal(false)}></div>
          <div className={`fixed bottom-0 left-0 right-0 z-[201] rounded-t-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-white'}`}>
             <div className="flex justify-between items-center mb-8">
               <h3 className={`text-xl font-black ${textMain}`}>教材を追加する</h3>
               <button onClick={() => setShowAddModal(false)} className={`p-2 rounded-full ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'}`}><X className="w-5 h-5"/></button>
             </div>
             
             <div className="space-y-4">
               <button onClick={() => router.push('/search')} className={`w-full p-5 rounded-2xl border-2 flex items-center gap-5 transition-all active:scale-95 ${isDarkMode ? 'bg-[#2c2c2e] border-[#38383a] hover:border-indigo-500' : 'bg-white border-slate-100 hover:border-indigo-300 shadow-sm'}`}>
                 <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}><Search className="w-6 h-6" /></div>
                 <div className="text-left">
                   <h4 className={`text-base font-black ${textMain}`}>市販の教材を検索する</h4>
                   <p className={`text-xs font-bold mt-1 ${textSub}`}>タイトルや著者名から探す</p>
                 </div>
               </button>

               <button onClick={() => { setShowAddModal(false); setShowCustomModal(true); }} className={`w-full p-5 rounded-2xl border-2 flex items-center gap-5 transition-all active:scale-95 ${isDarkMode ? 'bg-[#2c2c2e] border-[#38383a] hover:border-emerald-500' : 'bg-white border-slate-100 hover:border-emerald-300 shadow-sm'}`}>
                 <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}><FileEdit className="w-6 h-6" /></div>
                 <div className="text-left">
                   <h4 className={`text-base font-black ${textMain}`}>独自教材を作成する</h4>
                   <p className={`text-xs font-bold mt-1 ${textSub}`}>学校のプリントや独自のノート</p>
                 </div>
               </button>
             </div>
          </div>
        </>
      )}

      {showCustomModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200]" onClick={() => setShowCustomModal(false)}></div>
          <div className={`fixed bottom-0 left-0 right-0 z-[201] rounded-t-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-white'}`}>
             <div className="flex justify-between items-center mb-8">
               <h3 className={`text-xl font-black ${textMain}`}>独自教材を作成</h3>
               <button onClick={() => setShowCustomModal(false)} className={`p-2 rounded-full ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'}`}><X className="w-5 h-5"/></button>
             </div>
             <div className="space-y-6">

              <div className="w-full">
                  <label className={`text-xs font-black uppercase tracking-widest mb-3 block ${textSub}`}>
                    アイコンを選択
                  </label>
                  <div className="grid grid-cols-4 gap-3 max-h-[40vh] overflow-y-auto no-scrollbar pb-2">
                    {PRESET_ICONS.map((imgUrl) => (
                      <button
                        key={imgUrl}
                        onClick={() => setSelectedIconUrl(imgUrl)}
                        className={`relative rounded-xl overflow-hidden transition-all bg-slate-50 dark:bg-slate-800 aspect-square flex items-center justify-center border-2 
                          ${selectedIconUrl === imgUrl 
                            ? 'border-indigo-500 ring-4 ring-indigo-500/20 scale-105 shadow-md z-10' 
                            : 'border-transparent hover:scale-105 opacity-80 hover:opacity-100'
                          }`}
                      >
                        <img 
                          src={imgUrl} 
                          alt="icon" 
                          className="w-full h-full object-cover pointer-events-none" 
                        />
                        {selectedIconUrl === imgUrl && (
                          <div className="absolute top-1 right-1 bg-indigo-600 text-white rounded-full p-0.5 shadow-sm">
                            <CheckCircle2 className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
               <div>
                 <label className={`text-xs font-black uppercase tracking-widest mb-3 block ${textSub}`}>教材のタイトル</label>
                 <input type="text" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="例: 大学のプリント、英単語まとめ" className={`w-full rounded-2xl px-5 py-4 font-bold border-2 outline-none transition-all ${bgInput}`} />
               </div>
{/* 🌟 417行目のあとにこれを追加！ PDF選択エリア */}
<div className="mt-6 w-full">
  <p className={`text-[10px] font-black mb-3 uppercase tracking-widest ${textSub}`}>
    PDF教材を添付 (任意)
  </p>
  
  <label className={`group relative flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-[2rem] cursor-pointer transition-all ${selectedPdfs.length > 0 ? 'border-emerald-500 bg-emerald-500/5' : `hover:bg-slate-50 dark:hover:bg-white/5 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}`}>
    {/* 🌟 PDF選択用のinputタグを修正 */}
<input 
  type="file" 
  accept="application/pdf"
  className="hidden" 
  multiple // これで複数選択可能に！
  onChange={(e) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setSelectedPdfs(files);
      
      // 🌟 最強の時短：最初のファイル名をタイトルに自動入力！
      if (!customTitle.trim()) {
        const firstFileName = files[0].name.replace(/\.[^/.]+$/, "");
        if (files.length === 1) {
          setCustomTitle(firstFileName);
        } else {
          setCustomTitle(`${firstFileName} 他${files.length - 1}件`);
        }
      }
    }
  }}
/>

{/* 🌟 プレビュー表示（モーダル内の点線エリア）を複数対応に修正 */}
<div className="flex flex-col items-center gap-2">
  <div className={`p-3 rounded-2xl ${selectedPdfs.length > 0 ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
    <BookOpen className="w-6 h-6" />
  </div>
  <span className={`text-xs font-black text-center px-4 line-clamp-1 ${selectedPdfs.length > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
    {selectedPdfs.length > 0 
      ? `${selectedPdfs.length}個のPDFがバインダーに入っています` 
      : "タップしてPDFを選択（複数可）"}
  </span>
</div>
  </label>
</div>

{/* 🌟 元のボタン（418行目〜）をこれに書き換え！ */}
<button 
  onClick={handleAddCustomMaterial} 
  disabled={!customTitle.trim() || isUploading}
  className={`w-full mt-8 py-5 rounded-[2rem] font-black text-lg shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95 ${isUploading ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white shadow-indigo-500/30'}`}
>
  {isUploading ? (
    <>
      <Loader2 className="w-5 h-5 animate-spin" />
      <span>アップロード中...</span>
    </>
  ) : (
    <>
      <Plus className="w-5 h-5" />
      <span>本棚に追加する</span>
    </>
  )}
</button>
              
             </div>
          </div>
        </>
      )}

<header className={`${bgHeader} shadow-sm px-5 py-6 flex justify-between items-center sticky top-0 z-40 transition-colors duration-300`}>
        <h1 className={`text-xl font-black italic tracking-tighter flex items-center gap-2 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
          <BookOpen className="w-6 h-6" /> STUDY TRACKER
        </h1>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
          <Clock className={`w-4 h-4 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-500'}`} />
          <span className={`text-sm font-bold ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>今日: {totalTime}分</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-5">
        <div className="flex justify-between items-center mb-6 px-1">
          <h2 className={`text-sm font-black tracking-[0.2em] uppercase ${textSub}`}>マイ本棚</h2>
          <button onClick={() => setShowAddModal(true)} className={`text-sm font-bold flex items-center gap-1.5 px-5 py-2.5 rounded-full transition-all active:scale-95 ${isDarkMode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-indigo-600 text-white shadow-md'}`}>
            <Plus className="w-4 h-4" /> 教材を追加
          </button>
        </div>

        {isLoading ? (
          <div className={`text-center py-20 font-black tracking-widest ${textSub}`}>LOADING...</div>
        ) : materials.length === 0 ? (
          <div className={`rounded-[2.5rem] border-2 border-dashed p-10 text-center ${isDarkMode ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-white'}`}>
            <Book className={`w-12 h-12 mx-auto mb-4 ${isDarkMode ? 'text-slate-600' : 'text-slate-200'}`} />
            <p className={`text-sm font-bold mb-6 ${textSub}`}>まだ本棚に教材がありません</p>
            <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 text-white px-8 py-3 rounded-full font-black shadow-lg">最初の教材を追加</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
{materials.map((material) => {
              // PDFがあるかどうかをここで判定（変更なし）
              const hasPdf = material.pdf_url && material.pdf_url !== '[]' && material.pdf_url !== '';

              return (
                <div key={material.id} className="relative h-full">
                  
                  {/* 背景のゴミ箱エリア（変更なし） */}
                  <div className="absolute inset-0 bg-rose-500 rounded-3xl flex items-center justify-end pr-6">
                    <div className={`flex flex-col items-center justify-center transition-opacity duration-300 ${swipingMaterialId === material.id && swipeOffset < -40 ? 'opacity-100 scale-110' : 'opacity-0 scale-90'}`}>
                      <Trash2 className="w-6 h-6 text-white mb-1" />
                      <span className="text-white text-[10px] font-black tracking-widest">削除</span>
                    </div>
                  </div>

                  <button 
                    onTouchStart={(e) => handleMaterialTouchStart(e, material.id)}
                    onTouchMove={handleMaterialTouchMove}
                    onTouchEnd={() => handleMaterialTouchEnd(material.id, material.title)}
                    onClick={() => {
                      if (Math.abs(swipeOffset) < 10) setSelectedMaterial(material);
                    }}
                    style={{ 
                      transform: swipingMaterialId === material.id ? `translateX(${swipeOffset}px)` : 'translateX(0)', 
                      transition: isSwiping && swipingMaterialId === material.id ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' 
                    }}
                    // 🌟 修正：背景色を固定し、PDF教材かつスワイプ中でない場合のみ縁（ボーダー）を赤にするロジック
                    className={`relative z-10 w-full h-full flex flex-col items-center text-center p-4 rounded-3xl transition-all border-2
                      ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-white'} // 背景色は固定して透けないようにする
                      ${hasPdf && swipingMaterialId !== material.id // 🌟 条件：PDF教材 かつ スワイプ中でない
                        ? 'border-rose-500 shadow-rose-100' // 📕 PDF教材（通常時）：赤枠
                        : swipingMaterialId === material.id // スワイプ中
                          ? isDarkMode ? 'border-[#38383a]' : 'border-slate-100' // スワイプ中は通常枠に戻す
                          : isDarkMode ? 'border-[#38383a]' : 'border-slate-100' // 通常教材
                      } ${swipingMaterialId === material.id ? 'shadow-2xl' : 'shadow-sm'}`}
                  >
                    {/* 🌟 修正：教材アイコン部分にPDFマークを追加（divをrelativeにする） */}
                    <div className={`relative w-24 h-32 rounded-xl mb-4 flex items-center justify-center overflow-hidden border shadow-inner pointer-events-none
                      ${hasPdf ? 'border-rose-100' : bgSubCard}`}>
                      {material.image_url ? (
                        <img src={material.image_url} alt={material.title} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                      ) : (
                        // PDFがあるのに画像がない場合は、アイコンも赤っぽく（お好みで）
                        <Book className={`w-8 h-8 transition-colors ${hasPdf ? 'text-rose-300' : isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                      )}
                      
                      {/* 🌟 PDFマークを追加（絶対配置） */}
                      {hasPdf && (
                        <div className="absolute top-1.5 right-1.5 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow z-20">
                          PDF
                        </div>
                      )}
                    </div>

                    <h3 className={`text-xs font-black line-clamp-2 leading-snug px-2 ${hasPdf ? 'text-rose-900' : ''}`}>
                      {material.title}
                    </h3>

                    {/* 下の「記録する」ボタンの色は、カードの縁（ボーダー）の赤を際立たせるため、PDFかどうかで変えず、元のインディゴ（またはダークモード対応色）に統一します */}
                    <div className={`mt-3 text-[10px] font-black px-4 py-1.5 rounded-full ${isDarkMode ? 'bg-indigo-700 text-indigo-100' : 'bg-indigo-600 text-white'}`}>
                      記録する
                    </div>
                  </button>
                </div>
              );
            })}          </div>
        )}
      </main>

      {selectedMaterial && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[500]" onClick={() => { setSelectedMaterial(null); setMemoInput(""); setLastStudiedDate(null); }}></div>
          <div className={`fixed bottom-0 left-0 right-0 w-full z-[501] rounded-t-[2.5rem] p-8 shadow-2xl transition-transform duration-300 max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-white'}`}>
            
            <button onClick={() => { setSelectedMaterial(null); setMemoInput(""); setLastStudiedDate(null); }} className={`absolute top-6 right-6 p-2 rounded-full ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
              <X className="w-5 h-5" />
            </button>
            
            <h2 className={`text-xl font-black mb-8 ${textMain}`}>学習記録を付ける</h2>
            
            <div className={`flex gap-5 mb-8 p-4 rounded-[1.5rem] border ${bgSubCard}`}>
              <div className={`w-16 h-20 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border shadow-sm ${isDarkMode ? 'bg-[#1c1c1e] border-[#38383a]' : 'bg-white border-slate-200'}`}>
                {selectedMaterial.image_url ? (
                  <img src={selectedMaterial.image_url} alt={selectedMaterial.title} className="w-full h-full object-cover" />
                ) : (
                  <Book className={`w-6 h-6 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                )}
              </div>
              
              <div className="flex flex-col justify-center">
                <p className={`text-sm font-black line-clamp-2 leading-snug ${textMain}`}>{selectedMaterial.title}</p>
                <div className={`flex items-center gap-1 mt-2 text-xs font-bold px-2 py-1 rounded-md self-start ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                  <History className="w-3 h-3" /> 前回: {lastStudiedDate || "読込中..."}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => router.push(`/timer?id=${selectedMaterial.id}&title=${encodeURIComponent(selectedMaterial.title)}&image_url=${encodeURIComponent(selectedMaterial.image_url || '')}`)}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all mb-4"
              >
                <Clock className="w-5 h-5" />
                今からタイマーで測る
              </button>

              <button
                onClick={() => {
                  const url = `/nfc-setup?id=${selectedMaterial.id}&subject=${encodeURIComponent(selectedMaterial.title)}${selectedMaterial.image_url ? `&image=${encodeURIComponent(selectedMaterial.image_url)}` : ''}`;
                  router.push(url);
                }}
                className={`w-full font-black py-4 rounded-[2rem] transition-all flex justify-center items-center gap-2 active:scale-95 border-2 ${isDarkMode ? 'bg-[#2c2c2e] border-[#38383a] text-slate-300 hover:bg-[#38383a]' : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'}`}
              >
                <SmartphoneNfc className="w-5 h-5" /> NFCにかざして起動
              </button>

              <div className="relative flex items-center py-6">
                <div className={`flex-grow border-t ${isDarkMode ? 'border-[#38383a]' : 'border-slate-100'}`}></div>
                <span className={`flex-shrink-0 mx-4 text-[10px] font-black uppercase tracking-widest ${textSub}`}>OR 手動で入力</span>
                <div className={`flex-grow border-t ${isDarkMode ? 'border-[#38383a]' : 'border-slate-100'}`}></div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={`block text-xs font-black mb-3 uppercase tracking-widest ${textSub}`}>学習時間 (分)</label>
                  <input
                    type="number"
                    value={timeInput}
                    onChange={(e) => setTimeInput(e.target.value)}
                    placeholder="例: 60"
                    className={`w-full border-2 rounded-2xl px-5 py-4 text-xl font-black outline-none transition-all ${bgInput}`}
                  />
                </div>
              </div>
              
              <div>
                <label className={`flex items-center gap-1 text-[10px] font-black mb-3 uppercase tracking-widest ${textSub}`}>
                  <PencilLine className="w-3 h-3" /> メモ・感想 (任意)
                </label>
                <textarea
                  value={memoInput}
                  onChange={(e) => setMemoInput(e.target.value)}
                  placeholder="今日の学びや反省など..."
                  className={`w-full border-2 rounded-2xl px-5 py-4 text-sm font-bold outline-none transition-all resize-none h-24 ${bgInput}`}
                />
              </div>

              <button
                onClick={handleSaveRecord}
                disabled={!timeInput}
                className="w-full bg-black text-white disabled:bg-slate-300 disabled:text-slate-500 font-black py-5 rounded-[2rem] shadow-xl active:scale-95 transition-all mt-4"
              >
                手動で保存する
              </button>
            </div>
          </div>
        </>
      )}

      {/* 🌟 削除確認モーダル（追加！） */}
      {deleteTarget && (
        <>
          <div className="fixed inset-0 z-[600] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setDeleteTarget(null)}></div>
          <div className="fixed inset-0 z-[601] flex items-center justify-center p-4 pointer-events-none">
            <div className={`pointer-events-auto w-full max-w-xs rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-white'}`}>
              <h3 className={`text-xl font-black mb-2 text-center ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>本当に削除しますか？</h3>
              <p className="text-slate-500 text-xs font-bold text-center mb-6">
                「{deleteTarget.title}」を本棚から削除します。<br/>
                <span className="text-[10px] text-rose-500 mt-1 block">※関連する学習記録はそのまま残ります</span>
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className={`flex-1 py-4 font-bold rounded-2xl active:scale-95 transition-transform ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                  キャンセル
                </button>
                <button onClick={async () => {
                  await supabase.from('study_logs').update({ material_id: null }).eq('material_id', deleteTarget.id);
                  await supabase.from('materials').delete().eq('id', deleteTarget.id);
                  setDeleteTarget(null);
                  fetchData();
                }} className="flex-1 py-4 font-bold rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-500/30 active:scale-95 transition-transform">
                  削除する
                </button>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}