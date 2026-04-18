"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Book, Clock, Plus, BookOpen, CheckCircle2, X, SmartphoneNfc, PencilLine, 
  History, Settings, Loader2, Search, Trash2, FileEdit, BookText, ChevronLeft,
  Menu, ChevronRight, Sun, Moon
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase"; 

export default function Home() {
  const router = useRouter();
  const [materials, setMaterials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalTime, setTotalTime] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPdfs, setSelectedPdfs] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [timeInput, setTimeInput] = useState("");
  const [memoInput, setMemoInput] = useState("");
  const [showSuccess, setShowSuccess] = useState(false); 
  const [lastStudiedDate, setLastStudiedDate] = useState<string | null>(null);
  const [lastMemo, setLastMemo] = useState<string | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  const PRESET_ICONS = [
    "/icons/blue.png", "icons/black.png", "icons/gold.png", "icons/green.png", 
    "/icons/light-blue.png", "icons/orange.png", "icons/purple.png", "icons/red.png", 
    "/icons/silver.png", "icons/yellow.png", "icons/vocabulary-book.png"
  ];
  const [selectedIconUrl, setSelectedIconUrl] = useState(PRESET_ICONS[0]);

  // 教材（マイ本棚）のスワイプ削除用State
  const [swipingMaterialId, setSwipingMaterialId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);
  
  // 削除モーダル用のState
  const [deleteTarget, setDeleteTarget] = useState<{id: string, title: string} | null>(null);

  // 学習記録モーダルの下スワイプクローズ用State
  const [modalTouchStartY, setModalTouchStartY] = useState(0);
  const [modalSwipeY, setModalSwipeY] = useState(0);
  const [isModalClosing, setIsModalClosing] = useState(false);

  // ==========================================
  // 🌟 共通サイドバー呼び出し用の処理
  // ==========================================
  const sidebarStartX = useRef<number | null>(null);

  const handleEdgeTouchStart = (e: React.TouchEvent) => { 
    sidebarStartX.current = e.touches[0].clientX; 
  };
  const handleEdgeTouchMove = (e: React.TouchEvent) => { 
    if (sidebarStartX.current === null) return;
    const diffX = e.touches[0].clientX - sidebarStartX.current;
    // 左端から40px以上右へスワイプされたら共通サイドバーを開く命令を送る
    if (diffX > 40) {
      window.dispatchEvent(new Event('openSidebar'));
      sidebarStartX.current = null; // 連続発火防止
    }
  };
  const handleEdgeTouchEnd = () => { 
    sidebarStartX.current = null; 
  };
  // ==========================================

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
    
    if (swipeOffset < -60) {
      setSwipeOffset(-window.innerWidth); 
      setTimeout(() => {
        setDeleteTarget({ id: materialId, title: title });
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

  const handleModalTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName.toLowerCase() === 'textarea' || target.tagName.toLowerCase() === 'input') return;
    
    const scrollableDiv = e.currentTarget as HTMLDivElement;
    if (scrollableDiv.scrollTop > 0) return;

    setModalTouchStartY(e.touches[0].clientY);
    setIsModalClosing(false);
  };

  const handleModalTouchMove = (e: React.TouchEvent) => {
    if (modalTouchStartY === 0) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - modalTouchStartY;

    if (diff > 5) {
      if (e.cancelable) e.preventDefault();
      setModalSwipeY(diff * 0.8);
    }
  };

  const handleModalTouchEnd = () => {
    if (modalTouchStartY === 0) return;
    if (modalSwipeY > 100) {
      closeModal();
    } else {
      setModalSwipeY(0);
      setModalTouchStartY(0);
    }
  };

  const closeModal = () => {
    setIsModalClosing(true);
    setTimeout(() => {
      setSelectedMaterial(null);
      setMemoInput("");
      setLastStudiedDate(null);
      setLastMemo(null);
      setModalSwipeY(0);
      setModalTouchStartY(0);
      setIsModalClosing(false);
    }, 300);
  };

  useEffect(() => {
    const checkDarkMode = () => {
      const savedMode = localStorage.getItem('dark_mode');
      setIsDarkMode(savedMode === 'true');
    };
    checkDarkMode();
    fetchData();
    setIsGoogleConnected(localStorage.getItem('google_drive_connected') === 'true');
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
          .select('created_at, thoughts') 
          .eq('material_id', selectedMaterial.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (data) {
          const date = new Date(data.created_at);
          setLastStudiedDate(`${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`);
          setLastMemo(data.thoughts); 
        } else {
          setLastStudiedDate("まだ記録がありません");
          setLastMemo(null);
        }
      };
      fetchLastStudied();
    } else {
      setLastStudiedDate(null);
      setLastMemo(null);
    }
  }, [selectedMaterial]);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // ==========================================
    // 🌟 ここに追加！【関所システム】
    // ユーザーのプロフィールを確認し、設定が終わってなければ強制送還
    // ==========================================
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_setup_completed')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_setup_completed) {
      router.push('/onboarding');
      return; // ここで処理をストップ！下には進ませない
    }
    // ==========================================

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

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    const checkReminders = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const now = new Date();
      const { data: reminders } = await supabase.from('reminders').select('*').eq('student_id', user.id);
      if (!reminders || reminders.length === 0) return;

      reminders.forEach(async (reminder) => {
        const remindTime = new Date(reminder.remind_at);
        const diffMinutes = (now.getTime() - remindTime.getTime()) / (1000 * 60);

        const notifiedKey = `notified_${reminder.id}`;
        if (diffMinutes >= 0 && diffMinutes < 1 && !localStorage.getItem(notifiedKey)) {
          if (Notification.permission === "granted") {
            new Notification("STUDY TRACKER", { body: `リマインダー: ${reminder.title} の時間です！`, icon: "/favicon.ico" });
            localStorage.setItem(notifiedKey, "true");
          }
        }
        if (diffMinutes >= 30) {
          await supabase.from('reminders').delete().eq('id', reminder.id);
          localStorage.removeItem(notifiedKey);
        }
      });
    };
    const intervalId = setInterval(checkReminders, 60000);
    checkReminders();
    return () => clearInterval(intervalId);
  }, []);

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
      closeModal();
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
    if (!customTitle.trim()) return;
    
    // Google 認証を開始し、成功後に Google Drive Setup ページにリダイレクト
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/google-drive-setup?title=${encodeURIComponent(customTitle)}&icon=${encodeURIComponent(selectedIconUrl)}`,
        scopes: "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
      },
    });
    
    if (error) {
      alert("Google 認証に失敗しました: " + error.message);
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

      {/* --- ADD MODAL --- */}
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

      {/* --- CUSTOM MODAL --- */}
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
                        <img src={imgUrl} alt="icon" className="w-full h-full object-cover pointer-events-none" />
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

              <div className="space-y-3 mt-6">
                <button 
                  onClick={handleAddCustomMaterial} 
                  disabled={!customTitle.trim() || isUploading}
                  className={`w-full py-5 rounded-[2rem] font-black text-lg shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95 ${isUploading ? 'bg-slate-400 cursor-not-allowed' : 'bg-green-600 text-white shadow-green-500/30'}`}
                >
                  {isUploading ? <><Loader2 className="w-5 h-5 animate-spin" /><span>処理中...</span></> : isGoogleConnected ? <><Plus className="w-5 h-5" /><span>GoogleドライブからPDFを追加</span></> : <><Plus className="w-5 h-5" /><span>Google Drive 認証</span></>}
                </button>

                <button 
                  onClick={async () => {
                    if (!customTitle.trim()) return;
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;
                    
                    const { error } = await supabase.from('materials').insert([{
                      title: customTitle,
                      student_id: user.id,
                      image_url: selectedIconUrl,
                      created_at: new Date().toISOString()
                    }]);
                    
                    if (!error) {
                      setShowCustomModal(false);
                      setCustomTitle("");
                      setSelectedIconUrl(PRESET_ICONS[0]);
                      fetchData();
                      setShowSuccess(true);
                      setTimeout(() => setShowSuccess(false), 3000);
                    }
                  }}
                  disabled={!customTitle.trim()}
                  className={`w-full py-5 rounded-[2rem] font-black text-lg shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95 ${!customTitle.trim() ? 'bg-slate-400 cursor-not-allowed text-slate-600' : 'bg-indigo-600 text-white shadow-indigo-500/30'}`}
                >
                  <Plus className="w-5 h-5" /><span>PDF なしで作成</span>
                </button>
              </div>
             </div>
          </div>
        </>
      )}

      {/* --- HEADER --- */}
      <header className={`${bgHeader} shadow-sm px-5 py-6 flex justify-between items-center sticky top-0 z-40 transition-colors`}>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.dispatchEvent(new Event('openSidebar'))} 
            className={`p-2 -ml-2 rounded-xl transition-all active:scale-90 ${isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className={`text-xl font-black italic tracking-tighter ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
            STUDY TRACKER
          </h1>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
          <Clock className={`w-4 h-4 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-500'}`} />
          <span className={`text-sm font-bold ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>今日: {totalTime}分</span>
        </div>
      </header>

      {/* --- MAIN MATERIAL LIST --- */}
      <main className="max-w-4xl mx-auto p-5">
        <div className="flex justify-between items-center mb-4 px-1">
          <h2 className={`text-sm font-black tracking-[0.2em] uppercase ${textSub}`}>マイ本棚</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => router.push("/google-drive-setup")} 
              className={`text-sm font-bold flex items-center gap-1.5 px-5 py-2.5 rounded-full transition-all active:scale-95 ${isDarkMode ? 'bg-green-600 text-white shadow-lg shadow-green-500/20' : 'bg-green-600 text-white shadow-md'}`}
            >
              📁 Google Drive から追加
            </button>
            <button 
              onClick={() => setShowAddModal(true)} 
              className={`text-sm font-bold flex items-center gap-1.5 px-5 py-2.5 rounded-full transition-all active:scale-95 ${isDarkMode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-indigo-600 text-white shadow-md'}`}
            >
              <Plus className="w-4 h-4" /> 教材を追加
            </button>
          </div>
        </div>

        <div className="relative mb-6 px-1">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <Search className={`w-4 h-4 ${textSub}`} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="教材を検索..."
            className={`w-full pl-11 pr-4 py-3 rounded-2xl text-sm font-bold outline-none transition-all border shadow-sm ${isDarkMode ? 'bg-[#1c1c1e] border-[#38383a] focus:border-indigo-500 text-white' : 'bg-white border-slate-100 focus:border-indigo-400 text-slate-800'}`}
          />
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
            {materials
              .filter(material => material.title.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((material) => {
              const hasPdf = material.pdf_url && material.pdf_url !== '[]' && material.pdf_url !== '';

              return (
                <div key={material.id} className="relative h-full">
                  <div className={`absolute inset-0 rounded-3xl flex items-center justify-end pr-6 overflow-hidden transition-colors duration-300 ${swipingMaterialId === material.id && swipeOffset < -60 ? 'bg-rose-600' : 'bg-rose-500/40'}`}>
                    <div className={`flex flex-col items-center justify-center transition-all duration-300 ${swipingMaterialId === material.id ? 'opacity-100' : 'opacity-0'} ${swipeOffset < -60 ? 'scale-125' : 'scale-100'}`}>
                      <Trash2 className={`w-6 h-6 text-white mb-1 ${swipeOffset < -60 ? 'animate-bounce' : ''}`} />
                      <span className="text-white text-[10px] font-black tracking-widest">
                        {swipeOffset < -60 ? '離して削除' : '削除'}
                      </span>
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
                      opacity: swipingMaterialId === material.id ? Math.max(1 + swipeOffset / 150, 0.3) : 1,
                      transition: isSwiping && swipingMaterialId === material.id ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s' 
                    }}
                    className={`relative z-10 w-full h-full flex flex-col items-center text-center p-4 rounded-3xl transition-all border-2
                      ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-white'} 
                      ${hasPdf 
                        ? (swipingMaterialId === material.id && Math.abs(swipeOffset) > 10) 
                          ? isDarkMode ? 'border-[#38383a]' : 'border-slate-100' 
                          : 'border-rose-500 shadow-rose-100' 
                        : isDarkMode ? 'border-[#38383a]' : 'border-slate-100' 
                      } ${swipingMaterialId === material.id ? 'shadow-2xl' : 'shadow-sm'}`}
                  >
                    
                    {swipingMaterialId !== material.id && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 animate-pulse-horizontal pointer-events-none opacity-40">
                        <ChevronLeft className="w-5 h-5 text-slate-300" />
                      </div>
                    )}

                    <div className={`relative w-24 h-32 rounded-xl mb-4 flex items-center justify-center overflow-hidden border shadow-inner pointer-events-none
                      ${hasPdf ? 'border-rose-100' : bgSubCard}`}>
                      {material.image_url ? (
                        <img src={material.image_url} alt={material.title} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                      ) : (
                        <Book className={`w-8 h-8 transition-colors ${hasPdf ? 'text-rose-300' : isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                      )}
                      
                      {hasPdf && (
                        <div className="absolute top-1.5 right-1.5 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow z-20">
                          PDF
                        </div>
                      )}
                    </div>

                    <h3 className={`text-xs font-black line-clamp-2 leading-snug px-2 ${hasPdf ? 'text-rose-900' : ''}`}>
                      {material.title}
                    </h3>

                    <div className={`mt-3 text-[10px] font-black px-4 py-1.5 rounded-full ${isDarkMode ? 'bg-indigo-700 text-indigo-100' : 'bg-indigo-600 text-white'}`}>
                      記録する
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 🌟 SELECTED MATERIAL MODAL */}
      {selectedMaterial && (
        <>
          <div 
            className={`fixed inset-0 bg-black/70 backdrop-blur-md z-[500] transition-opacity duration-300 ${isModalClosing ? 'opacity-0' : 'opacity-100'}`} 
            onClick={closeModal}
          ></div>
          
          <div 
            onTouchStart={handleModalTouchStart}
            onTouchMove={handleModalTouchMove}
            onTouchEnd={handleModalTouchEnd}
            style={{ 
              transform: `translateY(${isModalClosing ? '100%' : modalSwipeY > 0 ? `${modalSwipeY}px` : '0'})`,
              transition: isModalClosing ? 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' : modalSwipeY > 0 ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
              ,willChange: 'transform',
              overscrollBehaviorY: 'contain',
              touchAction: modalSwipeY > 0 ? 'none' : 'pan-y'
            }}
            className={`fixed bottom-0 left-0 right-0 w-full z-[501] rounded-t-[2.5rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-white'}`}
          >
            <div className={`absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full ${isDarkMode ? 'bg-white/20' : 'bg-slate-300'}`}></div>

            <button onClick={closeModal} className={`absolute top-6 right-6 p-2 rounded-full ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
              <X className="w-5 h-5" />
            </button>
            
            <h2 className={`text-xl font-black mb-8 mt-2 ${textMain}`}>学習記録を付ける</h2>
            
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
                {lastMemo && (
                  <div className={`mt-3 p-3 rounded-xl border border-dashed text-[11px] leading-relaxed font-bold ${isDarkMode ? 'bg-indigo-500/5 border-indigo-500/20 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700'}`}>
                    <div className="flex items-center gap-1 mb-1 opacity-70">
                      <BookText className="w-3 h-3" /> 前回のメモ
                    </div>
                    {lastMemo}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <button onClick={() => router.push(`/timer?id=${selectedMaterial.id}&title=${encodeURIComponent(selectedMaterial.title)}&image_url=${encodeURIComponent(selectedMaterial.image_url || '')}`)} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all mb-4">
                <Clock className="w-5 h-5" /> 今からタイマーで測る
              </button>

              <button onClick={() => { const url = `/nfc-setup?id=${selectedMaterial.id}&subject=${encodeURIComponent(selectedMaterial.title)}${selectedMaterial.image_url ? `&image=${encodeURIComponent(selectedMaterial.image_url)}` : ''}`; router.push(url); }} className={`w-full font-black py-4 rounded-[2rem] transition-all flex justify-center items-center gap-2 active:scale-95 border-2 ${isDarkMode ? 'bg-[#2c2c2e] border-[#38383a] text-slate-300 hover:bg-[#38383a]' : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'}`}>
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
                  <input type="number" value={timeInput} onChange={(e) => setTimeInput(e.target.value)} placeholder="例: 60" className={`w-full border-2 rounded-2xl px-5 py-4 text-xl font-black outline-none transition-all ${bgInput}`} />
                </div>
              </div>
              
              <div>
                <label className={`flex items-center gap-1 text-[10px] font-black mb-3 uppercase tracking-widest ${textSub}`}>
                  <PencilLine className="w-3 h-3" /> メモ・感想 (任意)
                </label>
                <textarea value={memoInput} onChange={(e) => setMemoInput(e.target.value)} placeholder="今日の学びや反省など..." className={`w-full border-2 rounded-2xl px-5 py-4 text-sm font-bold outline-none transition-all resize-none h-24 ${bgInput}`} />
              </div>

              <button onClick={handleSaveRecord} disabled={!timeInput} className="w-full bg-black text-white disabled:bg-slate-300 disabled:text-slate-500 font-black py-5 rounded-[2rem] shadow-xl active:scale-95 transition-all mt-4">
                手動で保存する
              </button>
            </div>
          </div>
        </>
      )}

      {/* --- DELETE MODAL --- */}
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

      {/* =========================================================
          🌟 共通サイドバー呼び出しエリア（スワイプ＆グリップ）
      ========================================================= */}
      
      {/* 1. スワイプ検知用の透明エリア (z-indexを下げてサイドバー展開時は下敷きになるように) */}
      <div
        onTouchStart={handleEdgeTouchStart}
        onTouchMove={handleEdgeTouchMove}
        onTouchEnd={handleEdgeTouchEnd}
        className="fixed top-0 left-0 bottom-0 w-6 z-[30]"
      />

      {/* 2. じゃまにならないスライドグリップ (開いている時はサイドバーの裏に隠れる) */}
      <button
        onClick={() => window.dispatchEvent(new Event('openSidebar'))}
        className={`fixed left-0 top-1/3 -translate-y-1/2 z-[20] w-4 h-24 rounded-r-xl shadow-sm flex items-center justify-center transition-all duration-300 active:scale-95 border-y border-r border-white/10 ${
          isDarkMode ? 'bg-slate-700/40 hover:bg-indigo-500/80' : 'bg-slate-300/50 hover:bg-indigo-500/80'
        } backdrop-blur-sm group`}
      >
        <div className={`w-1 h-10 rounded-full transition-colors ${isDarkMode ? 'bg-slate-400/50 group-hover:bg-white' : 'bg-slate-500/50 group-hover:bg-white'}`} />
      </button>

      {/* 🌟 魔法のアニメーションCSS（マイ本棚用） */}
      <style jsx global>{`
        @keyframes pulse-horizontal {
          0% { transform: translateX(0); opacity: 0.3; }
          50% { transform: translateX(-5px); opacity: 1; }
          100% { transform: translateX(0); opacity: 0.3; }
        }
        .animate-pulse-horizontal {
          animation: pulse-horizontal 1.5s ease-in-out infinite;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}