"use client";
import { useState, useEffect, Suspense, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { 
  MoreHorizontal, User, Book, SmilePlus, ChevronDown, 
  Edit2, Trash2, X, Share2, Award, Bell, Settings, 
  HelpCircle, Target, Rocket, GraduationCap, Calendar, Clock, ChevronRight, BookOpen, Plus, QrCode, Moon, Sun, Pen, AlertCircle, PenLine, Search
} from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import { useRouter } from "next/navigation";

const EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

function ReportContent() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [rawLogs, setRawLogs] = useState<any[]>([]);
  const [rawMats, setRawMats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userColor, setUserColor] = useState("bg-blue-500");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"record" | "timeline">("timeline");
  
  // 🌟 修正：期間フィルターを「RECORD用」と「TIMELINE用」に完全分離！
  const [recordFilter, setRecordFilter] = useState<"all" | "today" | "yesterday" | "older">("all");
  const [timelineFilter, setTimelineFilter] = useState<"all" | "today" | "yesterday" | "older">("all");
  
  const [materialSearchQuery, setMaterialSearchQuery] = useState("");

  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const [chartRange, setChartRange] = useState<"week" | "month">("week");
  
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(null);
  const [activeEditMenu, setActiveEditMenu] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [editingLog, setEditingLog] = useState<any | null>(null);
  const [showQrModal, setShowQrModal] = useState(false); 
  
  const [showAddMaterial, setShowAddMaterial] = useState(false); 
  const [showImageActionSheet, setShowImageActionSheet] = useState(false);
  const [newMaterialTitle, setNewMaterialTitle] = useState("");

  const [userName, setUserName] = useState("ユーザー");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userGoal, setUserGoal] = useState("TOEFL 100+ GOAL");

  const [showReminderSetup, setShowReminderSetup] = useState(false);
  const [showGlobalReminders, setShowGlobalReminders] = useState(false); 
  const [reminderSubject, setReminderSubject] = useState<string | null>(null);
  const [reminderDateTime, setReminderDateTime] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastIcon, setToastIcon] = useState<"pen" | "trash" | "error">("pen");
  const [reminders, setReminders] = useState<Record<string, string[]>>({}); 
  const [currentTime, setCurrentTime] = useState(new Date()); 
  const [swipedSubject, setSwipedSubject] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number, y: number } | null>(null);
  const [myUserId, setMyUserId] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editMinutes, setEditMinutes] = useState(0);
  const [editMemo, setEditMemo] = useState("");
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number, emoji: string, offset: number }[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [maxChartVal, setMaxChartVal] = useState(60);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sidebarOffset, setSidebarOffset] = useState(0);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const sidebarStartX = useRef<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [swipingLogId, setSwipingLogId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState(false);
  // 🌟 RECORD用とTIMELINE用のフィルターを分ける

  // 🌟 追加：画面全体のスワイプタブ切り替え用
  const [mainTouchStart, setMainTouchStart] = useState<{ x: number, y: number } | null>(null);

  const handleSidebarMenuTouchStart = (e: React.TouchEvent) => {
    sidebarStartX.current = e.touches[0].clientX;
    setIsDraggingSidebar(true);
  };
  const handleSidebarMenuTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingSidebar || sidebarStartX.current === null) return;
    const diffX = e.touches[0].clientX - sidebarStartX.current;
    if (diffX < 0) setSidebarOffset(diffX); 
  };
  const handleSidebarMenuTouchEnd = () => {
    setIsDraggingSidebar(false);
    if (sidebarOffset < -100) setShowProfileMenu(false); 
    setSidebarOffset(0);
    sidebarStartX.current = null;
  };

  const handleEdgeTouchStart = (e: React.TouchEvent) => {
    sidebarStartX.current = e.touches[0].clientX;
    setIsDraggingSidebar(true);
  };
  const handleEdgeTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingSidebar || sidebarStartX.current === null) return;
    const diffX = e.touches[0].clientX - sidebarStartX.current;
    if (diffX > 0 && diffX < 300) setSidebarOffset(diffX); 
  };
  const handleEdgeTouchEnd = () => {
    setIsDraggingSidebar(false);
    if (sidebarOffset > 80) setShowProfileMenu(true); 
    setSidebarOffset(0);
    sidebarStartX.current = null;
  };

  // 🌟 追加：メイン画面のスワイプ処理（タブ切り替え）
  const handleMainTouchStart = (e: React.TouchEvent) => {
    // グラフや横スクロール要素など、特定の中身を触っている時はスワイプ判定しない
    const target = e.target as HTMLElement;
    if (target.closest('.no-scrollbar') || target.closest('button')) return;
    setMainTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleMainTouchEnd = (e: React.TouchEvent) => {
    if (!mainTouchStart) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = mainTouchStart.x - touchEndX;
    const diffY = mainTouchStart.y - touchEndY;

    // 縦の動きより横の動きが大きく、かつ一定距離スワイプした場合のみタブを切り替える
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0 && activeTab === "record") setActiveTab("timeline"); // 左スワイプ -> タイムライン
      else if (diffX < 0 && activeTab === "timeline") setActiveTab("record"); // 右スワイプ -> レコード
    }
    setMainTouchStart(null);
  };

  const profileUrl = typeof window !== 'undefined' && myUserId 
  ? `${window.location.origin}/user/${myUserId}` 
  : "";
  const isMounted = useRef(true);

  useEffect(() => {
    const savedGoal = localStorage.getItem('user_goal');
    if (savedGoal) setUserGoal(savedGoal);
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchLogs();
    const savedReminders = localStorage.getItem('study_reminders_v2');
    if (savedReminders) setReminders(JSON.parse(savedReminders));
    
    const checkDarkMode = () => {
      const isDark = localStorage.getItem('dark_mode') === 'true';
      setIsDarkMode(isDark);
      document.body.style.backgroundColor = isDark ? '#0a0a0a' : '#f8fafc';
    };
    checkDarkMode();

    window.addEventListener('storage', checkDarkMode);
    window.addEventListener('darkModeChanged', checkDarkMode);

    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => { 
      isMounted.current = false; 
      clearInterval(timer); 
      window.removeEventListener('storage', checkDarkMode);
      window.removeEventListener('darkModeChanged', checkDarkMode);
    };
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('dark_mode', newMode.toString());
    document.body.style.backgroundColor = newMode ? '#0a0a0a' : '#f8fafc';
    window.dispatchEvent(new Event('darkModeChanged'));
  };

  useEffect(() => {
    if (rawLogs.length > 0) processChartData(rawLogs, rawMats, chartRange);
  }, [chartRange, rawLogs, rawMats]);

  const saveRemindersToLocal = (newReminders: Record<string, string[]>) => {
    setReminders(newReminders);
    localStorage.setItem('study_reminders_v2', JSON.stringify(newReminders));
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && isMounted.current) {
      setCurrentUser(user);

      const { data: logsData } = await supabase
        .from('study_logs')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      const { data: matData } = await supabase
        .from('materials')
        .select('*')
        .eq('student_id', user.id);

      if (logsData && matData && isMounted.current) {
        setRawLogs(logsData);
        setRawMats(matData);
        setLogs(logsData.map(log => ({
          ...log, 
          materials: matData?.find(m => m.id === log.material_id) || null, 
          reactions: {}, 
          userReaction: null
        })));
        
        processChartData(logsData, matData, chartRange); 
      }
    }
    if (isMounted.current) setIsLoading(false);
  };

  const processChartData = (logsData: any[], matData: any[], range: "week" | "month") => {
    const colors = ["#60a5fa", "#4ade80", "#fbbf24", "#f43f5e", "#a78bfa", "#2dd4bf"];
    const subjectColors: Record<string, string> = {};
    let colorIndex = 0;
    logsData.forEach(log => {
      const title = matData?.find(m => m.id === log.material_id)?.title || log.subject || "その他";
      if (!subjectColors[title]) subjectColors[title] = colors[colorIndex++ % colors.length];
    });

    const now = new Date();
    let periods: { label: string, start: Date, end: Date }[] = [];

    if (range === "week") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const start = new Date(d.setHours(0, 0, 0, 0));
        const end = new Date(d.setHours(23, 59, 59, 999));
        periods.push({ label: `${start.getMonth() + 1}/${start.getDate()}`, start, end });
      }
    } else {
      for (let i = 3; i >= 0; i--) {
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7);
        end.setHours(23, 59, 59, 999);
        const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
        start.setHours(0, 0, 0, 0);
        periods.push({ label: `${start.getMonth() + 1}/${start.getDate()}~`, start, end });
      }
    }

    const grouped = periods.map(p => {
      const periodLogs = logsData.filter(log => {
        const logTime = new Date(log.created_at).getTime();
        return logTime >= p.start.getTime() && logTime <= p.end.getTime();
      });
      const total = periodLogs.reduce((s, l) => s + l.duration_minutes, 0);
      const subTotals: Record<string, number> = {};
      periodLogs.forEach(l => {
        const title = matData?.find(m => m.id === l.material_id)?.title || l.subject || "その他";
        subTotals[title] = (subTotals[title] || 0) + l.duration_minutes;
      });
      return {
        date: p.label, total,
        segments: Object.entries(subTotals).map(([title, minutes]) => ({
          title, minutes, color: subjectColors[title], heightPercent: 0
        }))
      };
    });

    const rawMax = Math.max(...grouped.map(d => d.total), 60);
    const calcMax = Math.ceil(rawMax / 60) * 60;
    setMaxChartVal(calcMax);

    grouped.forEach(g => { g.segments.forEach(s => { s.heightPercent = calcMax > 0 ? (s.minutes / calcMax) * 100 : 0; }); });
    setChartData(grouped);

    const groupedByMat: Record<string, number> = {};
    let totalMinutes = 0;
    logsData.forEach(log => {
      const title = matData?.find(m => m.id === log.material_id)?.title || log.subject || "その他";
      groupedByMat[title] = (groupedByMat[title] || 0) + log.duration_minutes;
      totalMinutes += log.duration_minutes;
    });

    setPieData(Object.keys(groupedByMat).map(title => ({
      title, percentage: totalMinutes > 0 ? (groupedByMat[title] / totalMinutes) * 100 : 0, color: subjectColors[title]
    })).sort((a, b) => b.percentage - a.percentage));
  };

  const showToast = (message: string, type: "success" | "error" = "success", icon: "pen" | "trash" | "error" = "pen") => {
    setToastMessage(message);
    setToastType(type);
    setToastIcon(icon);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleLogTouchStart = (e: React.TouchEvent, logId: string) => {
    setSwipingLogId(logId);
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
    setSwipeOffset(0);
    setIsSwiping(true);
  };

  const handleLogTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || !isSwiping) return;
    const currentX = e.targetTouches[0].clientX;
    const currentY = e.targetTouches[0].clientY;
    const xDiff = currentX - touchStart.x;
    const yDiff = currentY - touchStart.y;
    
    if (Math.abs(yDiff) > Math.abs(xDiff) && Math.abs(swipeOffset) < 10) {
      setIsSwiping(false);
      return;
    }
    if (xDiff < 0) setSwipeOffset(xDiff);
  };

  const handleLogTouchEnd = (logId: string) => {
    if (!isSwiping) return;
    setIsSwiping(false);
    
    if (swipeOffset < -100) {
      setSwipeOffset(-window.innerWidth); 
      setTimeout(() => {
        handleDeleteClick(logId); 
        setTimeout(() => { setSwipeOffset(0); setSwipingLogId(null); }, 300);
      }, 200);
    } else {
      setSwipeOffset(0);
      setSwipingLogId(null);
    }
    setTouchStart(null);
  };

  const handleDeleteClick = (logId: string) => {
    setDeleteTargetId(logId); 
    setActiveEditMenu(null); 
  };

  const executeDelete = async () => {
    if (!deleteTargetId) return;
    const { error } = await supabase.from('study_logs').delete().eq('id', deleteTargetId);
    if (error) {
      showToast(`削除エラー詳細: ${error.message}`, "error", "error"); 
      setDeleteTargetId(null);
      return;
    }
    showToast("削除しました！", "success", "trash"); 
    setDeleteTargetId(null); 
    setTimeout(() => { fetchLogs(); }, 100);
  };

  const handleUpdate = async () => {
    if (!editingLog) return;
    const { error } = await supabase.from('study_logs').update({
      studied_at: new Date(editDate).toISOString().split('T')[0],
      duration_minutes: Number(editMinutes),
      thoughts: editMemo
    }).eq('id', editingLog.id);

    if (error) {
      showToast(`更新エラー: ${error.message}`, "error", "error"); 
      return;
    }
    showToast("更新しました！", "success", "pen"); 
    setEditingLog(null);
    setActiveEditMenu(null);
    fetchLogs();
  };

  const handleAddCustomMaterial = async () => {
    if (!newMaterialTitle.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('materials').insert([{ student_id: user.id, title: newMaterialTitle }]);
      showToast(`「${newMaterialTitle}」を追加しました！`, "success", "pen");
      setNewMaterialTitle("");
      setShowAddMaterial(false);
      fetchLogs();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };
  const handleTouchEnd = (title: string) => {
    if (!touchStart || !touchEnd) return;
    const xDiff = touchStart.x - touchEnd.x;
    const yDiff = Math.abs(touchStart.y - touchEnd.y);
    if (yDiff > Math.abs(xDiff)) return; 
    if (xDiff > 40) setSwipedSubject(title); 
    if (xDiff < -40 && swipedSubject === title) setSwipedSubject(null); 
  };

  const calculateTargetDate = (val: string) => {
    const d = new Date();
    if (val === '15分後') d.setMinutes(d.getMinutes() + 15);
    else if (val === '1時間後') d.setHours(d.getHours() + 1);
    else if (val === '明日') d.setDate(d.getDate() + 1);
    else if (val === '3日後') d.setDate(d.getDate() + 3);
    else if (val === '1週間後') d.setDate(d.getDate() + 7);
    else if (val === '1ヶ月後') d.setMonth(d.getMonth() + 1);
    else return new Date(val).toISOString(); 
    return d.toISOString();
  };

  const handleSaveReminder = () => {
    if (reminderSubject && reminderDateTime) {
      const targetIso = calculateTargetDate(reminderDateTime);
      const currentRems = reminders[reminderSubject] || [];
      const newReminders = { ...reminders, [reminderSubject]: [...currentRems, targetIso] };
      saveRemindersToLocal(newReminders);
      showToast(`リマインダーを追加しました！`, "success", "pen");
    }
    setShowReminderSetup(false);
  };

  const handleClearReminder = (subject: string, targetIso: string) => {
    const currentRems = reminders[subject] || [];
    const updatedRems = currentRems.filter(t => t !== targetIso);
    const newReminders = { ...reminders };
    if (updatedRems.length > 0) newReminders[subject] = updatedRems;
    else delete newReminders[subject]; 
    saveRemindersToLocal(newReminders);
    showToast(`リマインダーを解除しました。`, "success", "trash");
  };

  const handleReaction = (logId: string, emoji: string) => {
    setLogs(prev => prev.map(log => {
      if (log.id === logId) {
        const reactions = { ...log.reactions };
        if (log.userReaction && log.userReaction !== emoji) {
          reactions[log.userReaction] = Math.max(0, (reactions[log.userReaction] || 1) - 1);
          if (reactions[log.userReaction] === 0) delete reactions[log.userReaction];
        }
        if (log.userReaction === emoji) {
          reactions[emoji] = Math.max(0, (reactions[emoji] || 1) - 1);
          if (reactions[emoji] === 0) delete reactions[emoji];
          return { ...log, reactions, userReaction: null };
        }
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        return { ...log, reactions, userReaction: emoji };
      }
      return log;
    }));
    setActiveReactionMenu(null);
  };

  const getCountdownDisplay = (isoStr: string) => {
    const target = new Date(isoStr);
    if (isNaN(target.getTime())) return "";
    const diffMs = target.getTime() - currentTime.getTime();
    if (diffMs <= 0) return `時間です！`;
    const diffMins = Math.floor(diffMs / 60000);
    const d = Math.floor(diffMins / (24 * 60));
    const hours = Math.floor((diffMins % (24 * 60)) / 60);
    const mins = diffMins % 60;
    
    let countdown = "";
    if (d > 0) countdown = `あと${d}日${hours > 0 ? `${hours}時間` : ''}`;
    else if (hours > 0) countdown = `あと${hours}時間${mins > 0 ? `${mins}分` : ''}`;
    else countdown = `あと${mins}分`;
    
    return countdown; 
  };

  const handleShareProfile = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Study Tracker Profile',
          text: '私のStudy Trackerのプロフィールを見てね！',
          url: profileUrl,
        });
      } catch (error) {
        console.error('Error sharing', error);
      }
    } else {
      navigator.clipboard.writeText(profileUrl);
      showToast("URLをコピーしました！", "success", "pen");
    }
  };

  const allSubjects = Array.from(new Set([
    ...rawMats.map(m => m.title),
    ...logs.map(log => log.materials?.title || log.subject || "名称未設定")
  ]));

// 🌟 ① TIMELINEタブ用の絞り込み関数（timelineFilterを使用）
  const getFilteredTimelineLogs = () => {
    let filtered = logs;
    if (filterSubject !== "all") {
      filtered = filtered.filter(l => (l.materials?.title || l.subject || "その他") === filterSubject);
    }
    
    const today = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    
    if (timelineFilter === "today") {
      filtered = filtered.filter(l => new Date(l.created_at) >= today);
    } else if (timelineFilter === "yesterday") {
      filtered = filtered.filter(l => {
        const d = new Date(l.created_at);
        return d >= yesterday && d < today;
      });
    } else if (timelineFilter === "older") {
      const boundary = new Date(today);
      boundary.setDate(boundary.getDate() - 2);
      filtered = filtered.filter(l => new Date(l.created_at) < boundary);
    }
    return filtered;
  };

  // 🌟 ② RECORDタブ（教材リスト）用の検索・絞り込み関数
  const getFilteredMaterialSummary = () => {
    return allSubjects.filter(title => {
      const matchesSearch = title.toLowerCase().includes(materialSearchQuery.toLowerCase());
      // 学習履歴が1件以上あるものだけを残す（未学習を隠す）
      const materialLogs = logs.filter(l => (l.materials?.title || l.subject || "その他") === title);
      return materialLogs.length > 0 && matchesSearch;
    });
  };
  const formatTimeForChart = (minutes: number) => {
    if (!minutes || minutes === 0) return "0分";
    if (minutes < 60) return `${minutes}分`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}時間${m}分` : `${h}時間`;
  };

  const FormatDurationJSX = ({ minutes }: { minutes: number }) => {
    if (!minutes || minutes === 0) {
      return <span className={`text-lg font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>0分</span>;
    }
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    
    return (
      <div className="flex items-baseline justify-end gap-1">
        {h > 0 && (
          <>
            <span className={`text-2xl md:text-3xl font-black ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>{h}</span>
            <span className="text-sm font-bold text-indigo-400 mr-1">時間</span>
          </>
        )}
        <span className={`text-2xl md:text-3xl font-black ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>{m}</span>
        <span className="text-sm font-bold text-indigo-400">分</span>
      </div>
    );
  };

  const bgPage = isDarkMode ? "bg-[#0a0a0a] text-slate-100" : "bg-slate-50 text-slate-900";
  const bgCard = isDarkMode ? "bg-[#1c1c1e] border-[#2c2c2e]" : "bg-white border-slate-100";
  const bgHeader = isDarkMode ? "bg-[#1c1c1e] border-[#2c2c2e]" : "bg-white border-slate-100";
  const bgSubCard = isDarkMode ? "bg-[#2c2c2e] border-[#38383a]" : "bg-slate-50 border-slate-100";
  const textMain = isDarkMode ? "text-white" : "text-slate-800";
  const textSub = isDarkMode ? "text-slate-400" : "text-slate-600";
  const bgInput = isDarkMode ? "bg-[#2c2c2e] border-[#38383a] text-white" : "bg-slate-50 border-slate-200 text-slate-700";

  return (
    <div className={`min-h-screen pb-20 font-sans overflow-x-hidden transition-colors duration-300 ${bgPage}`}
         // 🌟 追加：メイン画面でのスワイプ判定
         onTouchStart={handleMainTouchStart}
         onTouchEnd={handleMainTouchEnd}
    >
      
      {toastMessage && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[400] animate-in fade-in duration-300 pointer-events-none"></div>
          <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[401] ${isDarkMode ? 'bg-[#2c2c2e]' : 'bg-white'} px-8 py-8 rounded-[2rem] shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95 fade-in duration-300 w-[85%] max-w-sm text-center`}>
            
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 ${toastIcon === "pen" ? "bg-emerald-50" : "bg-rose-50"}`}>
              {toastIcon === "trash" ? <Trash2 className="w-8 h-8 text-rose-500" /> : toastIcon === "error" ? <AlertCircle className="w-8 h-8 text-rose-500" /> : <Pen className="w-8 h-8 text-emerald-500" />}
            </div>
            
            <h3 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{toastMessage}</h3>
            
            <button onClick={() => setToastMessage(null)} className={`mt-4 px-8 py-3 font-bold rounded-xl transition-colors ${isDarkMode ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
              OK
            </button>
          </div>
        </>
      )}
      
      {deleteTargetId && (
        <>
          <div className="fixed inset-0 z-[500] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setDeleteTargetId(null)}></div>
          <div className="fixed inset-0 z-[501] flex items-center justify-center p-4 pointer-events-none">
            <div className={`pointer-events-auto w-full max-w-xs rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-white'}`}>
              <h3 className={`text-xl font-black mb-2 text-center ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>本当に削除しますか？</h3>
              <p className="text-slate-500 text-xs font-bold text-center mb-6">この操作は取り消せません。</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteTargetId(null)} 
                  className={`flex-1 py-4 font-bold rounded-2xl active:scale-95 transition-transform ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}
                >
                  キャンセル
                </button>
                <button 
                  onClick={executeDelete} 
                  className="flex-1 py-4 font-bold rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-500/30 active:scale-95 transition-transform"
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showGlobalReminders && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] animate-in fade-in duration-200" onClick={() => setShowGlobalReminders(false)}></div>
          <div className={`fixed top-24 right-4 w-[85%] max-w-xs ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-white'} z-[201] rounded-3xl p-6 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300`}>
            <div className={`flex justify-between items-center mb-4 border-b pb-4 ${isDarkMode ? 'border-[#38383a]' : 'border-slate-100'}`}>
              <h3 className={`text-sm font-black flex items-center gap-2 ${textMain}`}><Bell className="w-4 h-4 text-indigo-500"/> 設定中のリマインダー</h3>
              <button onClick={() => setShowGlobalReminders(false)} className={`p-1 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}><X className="w-4 h-4" /></button>
            </div>
            {Object.keys(reminders).length === 0 ? (
              <p className="text-xs font-bold text-slate-400 text-center py-6">現在設定されているリマインダーはありません</p>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {Object.entries(reminders).map(([sub, times]) => 
                  times.map((timeIso, idx) => (
                    <div key={`${sub}-${idx}`} className={`flex items-center justify-between p-3 rounded-2xl border mb-2 ${bgSubCard}`}>
                       <div className="flex-1 pr-2">
                         <p className={`text-xs font-black line-clamp-1 mb-1 ${textMain}`}>{sub}</p>
                         <p className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 inline-block px-2 py-0.5 rounded-md">
                           {getCountdownDisplay(timeIso)}
                         </p>
                       </div>
                       <button onClick={() => handleClearReminder(sub, timeIso)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-full transition-colors shrink-0">
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}

      <>
        <div 
          className={`fixed inset-0 bg-black/60 backdrop-blur-md z-[100] transition-opacity duration-300 ${showProfileMenu ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
          onClick={() => setShowProfileMenu(false)}
        ></div>
          
        <div 
          onTouchStart={handleSidebarMenuTouchStart}
          onTouchMove={handleSidebarMenuTouchMove}
          onTouchEnd={handleSidebarMenuTouchEnd}
          style={{ 
            transform: showProfileMenu ? `translateX(${sidebarOffset}px)` : `translateX(calc(-100% + ${sidebarOffset}px))`,
            transition: isDraggingSidebar ? 'none' : 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
          }}
          className={`fixed top-0 left-0 bottom-0 w-[80%] max-w-[300px] z-[101] shadow-2xl flex flex-col rounded-r-[2.5rem] overflow-hidden ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-white'}`}
        >
          <div className="p-8 bg-gradient-to-br from-indigo-600 to-blue-800 text-white relative shrink-0">
            <button onClick={() => setShowProfileMenu(false)} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X className="w-4 h-4" /></button>
            
            <button 
              onClick={() => router.push('/mypage')}
              className={`w-16 h-16 ${userColor?.startsWith('bg-') ? userColor : ''} hover:opacity-80 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-indigo-900/40 overflow-hidden shrink-0 transition-all active:scale-95`}
              style={!userColor?.startsWith('bg-') ? { backgroundColor: userColor || '#3b82f6' } : {}}
            >
              {userAvatar && userAvatar.trim() !== "" ? (
                <img 
                  src={userAvatar} 
                  alt="Profile" 
                  className="w-full h-full object-cover" 
                  onError={(e) => { 
                    e.currentTarget.style.display = 'none'; 
                    setUserAvatar(null); 
                  }} 
                />
              ) : (
                <span className="text-3xl font-black text-white">
                  {userName ? userName.charAt(0).toUpperCase() : <User className="w-8 h-8" />}
                </span>
              )}
            </button>
            
            <h2 className="text-xl font-black leading-tight line-clamp-1">{userName}</h2>
            
            <div className="mt-4 px-1">
              <p className="text-[10px] font-black text-white/50 mb-2 tracking-[0.2em] uppercase">Current Goal</p>
              <div className="relative group">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/100 transition-colors pointer-events-none">
                  <PenLine className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={userGoal}
                  onChange={(e) => {
                    const newGoal = e.target.value;
                    setUserGoal(newGoal);
                    localStorage.setItem('user_goal', newGoal);
                  }}
                  placeholder="目標を入力..."
                  className={`w-full py-3 px-4 pr-10 rounded-2xl text-xs font-black uppercase tracking-widest outline-none transition-all ${isDarkMode ? 'bg-black/20 border border-white/10 focus:bg-black/40 focus:border-indigo-500/50 text-white' : 'bg-white/10 border border-white/20 focus:bg-white/20 focus:border-white/50 text-white'} placeholder:text-white/30`}
                />
              </div>
            </div>

            <div className="flex gap-6 mt-5 pt-5 border-t border-white/20">
               <div><span className="font-black text-white text-lg">128</span> <span className="text-[10px] text-indigo-200">フォロワー</span></div>
               <div><span className="font-black text-white text-lg">45</span> <span className="text-[10px] text-indigo-200">フォロー中</span></div>
            </div>
          </div> 
          
          <div className="flex-grow p-6 overflow-y-auto"> 
            <div className="space-y-1">
              <div className="text-[10px] font-black text-slate-400 mb-4 tracking-[0.2em] uppercase px-2">Essential Tools</div>
              
              <button onClick={toggleDarkMode} className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all group ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-indigo-50'}`}>
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300">
                    {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
                  </div>
                  <span className={`text-sm font-black ${textMain}`}>ダークモード</span>
                </div>
              </button>

              <button onClick={() => { setShowQrModal(true); setShowProfileMenu(false); }} className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all group ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-indigo-50'}`}>
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400"><QrCode className="w-5 h-5" /></div>
                  <span className={`text-sm font-black ${textMain}`}>マイQRコード</span>
                </div>
              </button>

              <button onClick={() => { setShowGlobalReminders(true); setShowProfileMenu(false); }} className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all group ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-indigo-50'}`}>
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400"><Bell className="w-5 h-5" /></div>
                  <span className={`text-sm font-black ${textMain}`}>リマインダー確認</span>
                </div>
              </button>
            </div>
          </div> 
        </div> 

        {!showProfileMenu && (
          <div 
            onTouchStart={handleEdgeTouchStart}
            onTouchMove={handleEdgeTouchMove}
            onTouchEnd={handleEdgeTouchEnd}
            className="fixed top-0 left-0 bottom-0 w-5 z-[90]" 
          />
        )}
      </>

      {showQrModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[300]" onClick={() => setShowQrModal(false)}></div>
          <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[301] w-[85%] max-w-sm ${isDarkMode ? 'bg-[#2c2c2e]' : 'bg-white'} rounded-[2.5rem] shadow-2xl p-8 flex flex-col items-center animate-in zoom-in-95 fade-in duration-300`}>
            <button onClick={() => setShowQrModal(false)} className={`absolute top-4 right-4 p-2 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}><X className="w-5 h-5" /></button>
            <h3 className={`text-lg font-black mb-6 ${textMain}`}>プロフィールQR</h3>
            
            <div className={`p-6 rounded-[2rem] shadow-sm border mb-6 flex flex-col items-center ${isDarkMode ? 'bg-white border-transparent' : 'bg-white border-slate-100'}`}>
              <QRCodeSVG 
  value={profileUrl} 
  size={200}
  bgColor={"#ffffff"}
  fgColor={"#4f46e5"}
  level={"H"} 
  imageSettings={{
    src: "/logo.png", 
    height: 48,
    width: 48,
    excavate: true,
  }}
/>
              <p className="text-[10px] font-black text-indigo-400 mt-4 tracking-widest uppercase">SCAN TO CONNECT</p>
            </div>

            <p className={`text-xs font-bold text-center mb-6 ${textSub}`}>このQRコードをスキャンして<br/>Study Trackerで繋がりましょう！</p>
            
            <button onClick={handleShareProfile} className="w-full py-4 bg-indigo-600 text-white rounded-[2rem] font-black shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all">
              <Share2 className="w-5 h-5"/> リンクをシェア
            </button>
          </div>
        </>
      )}

      {showAddMaterial && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[300] transition-opacity" onClick={() => setShowAddMaterial(false)}></div>
          <div className={`fixed inset-x-0 bottom-0 top-[10%] z-[301] rounded-t-[2.5rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300 ${isDarkMode ? 'bg-[#111111]' : 'bg-white'}`}>
            
            <div className={`flex justify-between items-center px-6 py-5 border-b ${isDarkMode ? 'border-[#2c2c2e]' : 'border-slate-100'}`}>
              <button onClick={() => setShowAddMaterial(false)} className={`p-2 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}><X className="w-5 h-5" /></button>
              <h2 className={`text-base font-black ${textMain}`}>教材の追加</h2>
              <button onClick={handleAddCustomMaterial} disabled={!newMaterialTitle.trim()} className="text-blue-500 font-black disabled:opacity-40 px-2 py-1">保存</button>
            </div>

            <div className="p-8 flex gap-8">
              <div onClick={() => setShowImageActionSheet(true)} className="w-24 h-32 bg-blue-500 rounded-r-lg border-l-[12px] border-slate-800 shadow-xl flex-shrink-0 cursor-pointer flex items-center justify-center">
                <Book className="w-8 h-8 text-white/30" />
              </div>
              
              <div className="flex-1 pt-2">
                <label className={`text-sm font-black block mb-2 ${textMain}`}>教材名</label>
                <input 
                  type="text" 
                  placeholder="教材名を入力" 
                  value={newMaterialTitle}
                  maxLength={128}
                  onChange={(e) => setNewMaterialTitle(e.target.value)}
                  className={`w-full bg-transparent border-b-2 py-2 font-bold outline-none focus:border-blue-500 transition-colors ${isDarkMode ? 'border-slate-700 text-white placeholder-slate-600' : 'border-slate-200 text-slate-900 placeholder-slate-300'}`} 
                />
                <div className={`text-right text-xs mt-2 font-bold ${textSub}`}>{newMaterialTitle.length}/128</div>
                
                <button onClick={() => setShowImageActionSheet(true)} className={`mt-8 text-sm font-bold ${textSub} hover:text-blue-500 transition-colors`}>
                  教材画像の設定
                </button>
              </div>
            </div>
          </div>
          
          {showImageActionSheet && (
             <div className="fixed inset-0 bg-black/60 z-[400] flex flex-col justify-end animate-in fade-in duration-200" onClick={() => setShowImageActionSheet(false)}>
                <div className={`p-6 pb-12 rounded-t-[2.5rem] animate-in slide-in-from-bottom duration-300 ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-slate-100'}`} onClick={e => e.stopPropagation()}>
                   <h3 className={`font-black mb-6 text-center ${textMain}`}>教材画像の設定</h3>
                   <button className={`w-full py-4 rounded-2xl mb-3 font-black active:scale-95 transition-transform ${isDarkMode ? 'bg-[#2c2c2e] text-white' : 'bg-white text-slate-900 shadow-sm'}`}>写真を撮る</button>
                   <button className={`w-full py-4 rounded-2xl mb-3 font-black active:scale-95 transition-transform ${isDarkMode ? 'bg-[#2c2c2e] text-white' : 'bg-white text-slate-900 shadow-sm'}`}>画像を選択</button>
                   <button onClick={() => setShowImageActionSheet(false)} className={`w-full py-4 rounded-2xl font-black active:scale-95 transition-transform ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900 shadow-sm'}`}>キャンセル</button>
                </div>
             </div>
          )}
        </>
      )}

      {showReminderSetup && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200]" onClick={() => setShowReminderSetup(false)}></div>
          <div className={`fixed bottom-0 left-0 right-0 ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-white'} z-[201] rounded-t-[2.5rem] p-8 animate-in slide-in-from-bottom duration-500 shadow-2xl`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-xl font-black ${textMain}`}>リマインダーを追加</h3>
              <button onClick={() => setShowReminderSetup(false)} className={`p-2 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}><X className="w-5 h-5" /></button>
            </div>
            
            {reminderSubject && (
              <div className={`mb-6 p-4 rounded-2xl border flex items-center gap-3 ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
                <Book className="w-5 h-5 text-indigo-400" />
                <div>
                  <span className="text-[10px] font-black text-indigo-400 block mb-0.5 uppercase tracking-widest">対象教材</span>
                  <span className={`text-sm font-bold line-clamp-1 ${isDarkMode ? 'text-indigo-200' : 'text-indigo-900'}`}>{reminderSubject}</span>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className={`text-xs font-black uppercase mb-3 block ${textSub}`}>クイック設定 (相対時間)</label>
                <div className="grid grid-cols-3 gap-2">
                  {['15分後', '1時間後', '明日', '3日後', '1週間後', '1ヶ月後'].map(time => (
                    <button 
                      key={time} 
                      onClick={() => setReminderDateTime(time)} 
                      className={`py-3 rounded-xl text-xs font-bold transition-all border ${reminderDateTime === time ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : isDarkMode ? 'bg-[#2c2c2e] border-[#38383a] text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative flex items-center py-2">
                <div className={`flex-grow border-t ${isDarkMode ? 'border-[#38383a]' : 'border-slate-100'}`}></div>
                <span className={`flex-shrink-0 mx-4 text-[10px] font-black uppercase tracking-widest ${textSub}`}>OR</span>
                <div className={`flex-grow border-t ${isDarkMode ? 'border-[#38383a]' : 'border-slate-100'}`}></div>
              </div>

              <div>
                <label className={`text-xs font-black uppercase mb-3 block flex items-center gap-1 ${textSub}`}><Calendar className="w-3 h-3"/> 日時を細かく指定</label>
                <input 
                  type="datetime-local" 
                  value={['15分後', '1時間後', '明日', '3日後', '1週間後', '1ヶ月後'].includes(reminderDateTime) ? "" : reminderDateTime}
                  onChange={(e) => setReminderDateTime(e.target.value)}
                  className={`w-full border-2 rounded-2xl px-5 py-4 font-bold outline-none focus:border-indigo-500 transition-all ${bgInput}`} 
                />
              </div>
            </div>

            <div className="mt-8">
              <button onClick={handleSaveReminder} disabled={!reminderDateTime} className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" /> リマインダーを追加
              </button>
            </div>
          </div>
        </>
      )}

      {editingLog && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200]" onClick={() => setEditingLog(null)}></div>
          <div className={`fixed bottom-0 left-0 right-0 ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-white'} z-[201] rounded-t-[2.5rem] p-8 animate-in slide-in-from-bottom duration-500`}>
            <div className="flex justify-between items-center mb-8">
              <h3 className={`text-xl font-black ${textMain}`}>記録を編集</h3>
              <button onClick={() => setEditingLog(null)} className={`p-2 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-6 text-sm font-bold">
              <input type="datetime-local" value={editDate} onChange={(e) => setEditDate(e.target.value)} className={`w-full rounded-2xl px-5 py-4 font-black ${bgInput}`} />
              <input type="number" value={editMinutes} onChange={(e) => setEditMinutes(parseInt(e.target.value))} className={`w-full rounded-2xl px-5 py-4 font-black ${bgInput}`} placeholder="学習時間(分)" />
              <textarea value={editMemo} onChange={(e) => setEditMemo(e.target.value)} className={`w-full rounded-2xl px-5 py-4 font-bold h-24 ${bgInput}`} placeholder="メモ" />
              <button onClick={handleUpdate} className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black shadow-lg">更新を保存</button>
            </div>
          </div>
        </>
      )}

      <header className={`${bgHeader} pt-6 sticky top-0 z-50 shadow-sm transition-colors duration-300`}>
        <div className="flex justify-between items-center px-6 mb-4">
          <button onClick={() => window.dispatchEvent(new Event('openSidebar'))} className={`w-10 h-10 rounded-2xl flex items-center justify-center active:scale-90 transition-all border shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
            <User className="w-6 h-6 text-slate-400" />
          </button>
          <h1 className="text-lg font-black italic tracking-tighter text-indigo-500">STUDY REPORT</h1>
          <button onClick={() => setShowGlobalReminders(true)} className="w-10 h-10 flex items-center justify-center active:scale-90 transition-transform relative">
            <Bell className="w-6 h-6 text-slate-400" />
            {Object.keys(reminders).length > 0 && <span className={`absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 border-2 rounded-full ${isDarkMode ? 'border-[#1c1c1e]' : 'border-white'}`}></span>}
          </button>
        </div>
        <div className="flex px-4 relative">
          <button onClick={() => setActiveTab("record")} className={`flex-1 pb-3 text-xs font-black text-center transition-all ${activeTab === "record" ? "text-indigo-500" : textSub}`}>RECORD</button>
          <button onClick={() => setActiveTab("timeline")} className={`flex-1 pb-3 text-xs font-black text-center transition-all ${activeTab === "timeline" ? "text-indigo-500" : textSub}`}>TIMELINE</button>
          {/* タブの下線アニメーション */}
          <div className="absolute bottom-0 left-4 right-4 h-1 bg-slate-100 dark:bg-slate-800 rounded-full">
            <div className={`absolute top-0 bottom-0 w-1/2 bg-indigo-500 rounded-full transition-transform duration-300 ${activeTab === "timeline" ? "translate-x-full" : "translate-x-0"}`}></div>
          </div>
        </div>
      </header>

<main className="w-full overflow-x-hidden pb-10 pt-4">
        {isLoading ? (
          <div className={`text-center py-20 font-black tracking-[0.3em] ${textSub}`}>FETCHING...</div>
        ) : (
          <div 
            className="flex w-[200%] transition-transform duration-500 ease-out items-start"
            style={{ transform: activeTab === "record" ? "translateX(0)" : "translateX(-50%)" }}
          >
            
            {/* =================================================================
                左側：RECORD（レポート）タブ
            ================================================================= */}
            <div className={`w-1/2 px-4 space-y-6 transition-opacity duration-300 ${activeTab === "record" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
              
              <div className={`p-8 rounded-[3rem] shadow-sm border transition-colors duration-300 ${bgCard}`}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className={`text-[10px] font-black tracking-[0.2em] uppercase ${textSub}`}>Study Trend</h3>
                  <div className={`flex p-1 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <button onClick={() => setChartRange("week")} className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${chartRange === "week" ? `${isDarkMode ? 'bg-slate-700 text-indigo-400' : 'bg-white text-indigo-600 shadow-sm'}` : textSub}`}>週</button>
                    <button onClick={() => setChartRange("month")} className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${chartRange === "month" ? `${isDarkMode ? 'bg-slate-700 text-indigo-400' : 'bg-white text-indigo-600 shadow-sm'}` : textSub}`}>月</button>
                  </div>
                </div>

                <div className="relative h-48 flex">
                  <div className={`absolute inset-0 flex flex-col justify-between pb-6 text-[10px] font-black z-0 pointer-events-none ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`}>
                    {[maxChartVal, Math.round(maxChartVal * 0.75), Math.round(maxChartVal * 0.5), Math.round(maxChartVal * 0.25), 0].map((val, idx) => (
                      <div key={idx} className="flex items-center w-full">
                        <span className="w-12 text-right pr-2 shrink-0">{formatTimeForChart(val)}</span>
                        <div className={`flex-grow border-t border-dashed h-0 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}></div>
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 flex items-end justify-between gap-2 ml-14 pb-6 relative z-10 h-full">
                    {chartData.map((data, i) => (
                      <div key={i} className="flex flex-col items-center flex-1 h-full justify-end relative">
                        <div className={`w-full ${chartRange === "month" ? "max-w-[32px]" : "max-w-[20px]"} flex flex-col-reverse justify-start items-center h-full ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50/50'}`}>
                          {data.segments.map((seg: any, idx: number) => (
                            <div key={idx} className="w-full transition-all" style={{ height: `${seg.heightPercent}%`, backgroundColor: seg.color }}></div>
                          ))}
                        </div>
                        <span className={`text-[9px] font-black absolute -bottom-4 whitespace-nowrap ${textSub}`}>{data.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`p-8 rounded-[3rem] shadow-sm border transition-colors duration-300 ${bgCard}`}>
                <h3 className={`text-[10px] font-black mb-8 tracking-[0.2em] uppercase ${textSub}`}>Distribution</h3>
                <div className="flex flex-col items-center gap-8">
                  <div className={`w-44 h-44 rounded-full relative flex items-center justify-center border-4 ${isDarkMode ? 'border-[#1c1c1e]' : 'border-slate-50'}`} style={{ background: `conic-gradient(${pieData.map((d, i) => {
                    const start = pieData.slice(0, i).reduce((s, x) => s + x.percentage * 3.6, 0);
                    const end = start + d.percentage * 3.6;
                    return `${d.color} ${start}deg ${end}deg`;
                  }).join(", ")})` }}>
                    <div className={`w-28 h-28 rounded-full flex items-center justify-center shadow-inner ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-white'}`}>
                      <BookOpen className={`w-8 h-8 ${isDarkMode ? 'text-slate-800' : 'text-slate-100'}`} />
                    </div>
                  </div>
                  <div className="w-full space-y-3">
                    {pieData.map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-xs font-black">
                        <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></span><span className={`line-clamp-1 ${textMain}`}>{d.title}</span></div>
                        <span className={textSub}>{Math.round(d.percentage)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`p-6 rounded-[2.5rem] shadow-sm border transition-colors duration-300 ${bgCard}`}>
                <h3 className={`text-sm font-black mb-4 flex items-center gap-2 ${textMain}`}>教材別の最終学習日</h3>
                
                {/* 🌟 修正：RECORD用の独立フィルター */}
                <div className={`flex p-1 rounded-2xl w-full max-w-sm mx-auto mb-4 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  {[
                    { id: "all", label: "すべて" },
                    { id: "today", label: "今日" },
                    { id: "yesterday", label: "昨日" },
                    { id: "older", label: "3日以上前" }
                  ].map(f => (
                    <button 
                      key={f.id}
                      onClick={() => setRecordFilter(f.id as any)} 
                      className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${recordFilter === f.id ? (isDarkMode ? 'bg-slate-700 text-indigo-400 shadow-sm' : 'bg-white text-indigo-600 shadow-sm') : textSub}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="relative mb-6">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search className={`w-4 h-4 ${textSub}`} />
                  </div>
                  <input
                    type="text"
                    value={materialSearchQuery}
                    onChange={(e) => setMaterialSearchQuery(e.target.value)}
                    placeholder="教材を検索..."
                    className={`w-full pl-10 pr-4 py-3 rounded-2xl text-sm font-bold outline-none transition-all border ${isDarkMode ? 'bg-black/20 border-[#38383a] focus:border-indigo-500 text-white' : 'bg-slate-50 border-slate-200 focus:border-indigo-400 text-slate-800'}`}
                  />
                </div>

                <div className="space-y-4 overflow-hidden">
                  {allSubjects
                    .filter(title => {
                      const matchesSearch = (title as string).toLowerCase().includes(materialSearchQuery.toLowerCase());
                      const materialLogs = logs.filter(l => (l.materials?.title || l.subject || "名称未設定") === title);
                      
                      if (!matchesSearch || materialLogs.length === 0) return false;

                      const lastLog = materialLogs[0];
                      const today = new Date(); today.setHours(0, 0, 0, 0);
                      const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
                      const boundary = new Date(today); boundary.setDate(boundary.getDate() - 2);

                      if (recordFilter === "today") return new Date(lastLog.created_at) >= today;
                      if (recordFilter === "yesterday") {
                        const logDate = new Date(lastLog.created_at);
                        return logDate >= yesterday && logDate < today;
                      }
                      if (recordFilter === "older") return new Date(lastLog.created_at) < boundary;
                      
                      return true;
                    })
                    .map(title => {
                    const materialLogs = logs.filter(l => (l.materials?.title || l.subject || "名称未設定") === title);
                    const totalMinutes = materialLogs.reduce((sum, l) => sum + l.duration_minutes, 0);
                    const lastLog = materialLogs[0];
                    
                    let imageUrl = rawMats.find(m => m.title === title)?.image_url;
                    if (!imageUrl) imageUrl = materialLogs.find(l => l.materials?.image_url)?.materials?.image_url;
                    
                    const activeReminders = reminders[title as string] || [];
                    
                    let daysAgoText = "未学習";
                    let badgeClass = isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500";
                    if (lastLog) {
                      const diffTime = Math.abs(new Date().getTime() - new Date(lastLog.created_at).getTime());
                      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                      if (diffDays === 0) { daysAgoText = "今日"; badgeClass = isDarkMode ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-600"; }
                      else if (diffDays === 1) { daysAgoText = "昨日"; badgeClass = isDarkMode ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600"; }
                      else { daysAgoText = `${diffDays}日前`; }
                    }

                    return (
                      <div key={title as string} className={`relative rounded-2xl overflow-hidden bg-indigo-500`}>
                        
                        <div className="absolute inset-0 flex items-center justify-end pr-5">
                          <button 
                             onClick={() => {
                               setSwipedSubject(null);
                               setReminderSubject(title as string);
                               setReminderDateTime("");
                               setShowReminderSetup(true);
                             }}
                             className="flex flex-col items-center justify-center p-3 bg-white/20 hover:bg-white/30 rounded-2xl text-white transition-colors"
                          >
                            <Bell className="w-5 h-5 mb-1" />
                            <span className="text-[8px] font-black tracking-widest">リマインド</span>
                          </button>
                        </div>

                        <div 
                          onTouchStart={handleTouchStart}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={() => handleTouchEnd(title as string)}
                          onClick={() => { if (swipedSubject === title) setSwipedSubject(null); }}
                          className={`relative flex items-center justify-between p-4 border transition-transform duration-300 ease-out ${swipedSubject === title ? '-translate-x-24' : 'translate-x-0'} ${bgSubCard}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-16 rounded-lg border flex items-center justify-center overflow-hidden shrink-0 ${isDarkMode ? 'bg-[#1c1c1e] border-[#38383a]' : 'bg-white border-slate-200'}`}>
                              {imageUrl ? <img src={imageUrl} alt={title as string} className="w-full h-full object-cover pointer-events-none" /> : <Book className={`w-6 h-6 pointer-events-none ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`} />}
                            </div>
                            <div className="pointer-events-none">
                              <h4 className={`text-sm font-black line-clamp-1 mb-1 ${textMain}`}>{title as string}</h4>
                              <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
                                <span className={`px-2 py-0.5 rounded-md ${badgeClass}`}>{daysAgoText}</span>
                                <span className={`flex items-center gap-1 ${textSub}`}><Clock className="w-3 h-3"/> 累計</span>
                                <FormatDurationJSX minutes={totalMinutes} />
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1.5 shrink-0 pl-2">
                            {activeReminders.map((timeIso, idx) => (
                              <span key={idx} className={`text-[9px] font-black px-2 py-1 rounded-lg border flex items-center gap-1 pointer-events-none ${isDarkMode ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'text-indigo-600 bg-indigo-50 border-indigo-100'}`}>
                                <Bell className="w-2.5 h-2.5" /> {getCountdownDisplay(timeIso)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* =================================================================
                右側：TIMELINE タブ
            ================================================================= */}
            <div className={`w-1/2 px-4 space-y-4 transition-opacity duration-300 ${activeTab === "timeline" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
              
              <div className="relative mb-6 z-40 flex flex-col gap-3">
                {/* 🌟 修正：TIMELINE用の独立フィルター */}
                <div className={`flex p-1 rounded-2xl w-full max-w-[300px] mx-auto ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  {[
                    { id: "all", label: "すべて" },
                    { id: "today", label: "今日" },
                    { id: "yesterday", label: "昨日" },
                    { id: "older", label: "3日以上前" }
                  ].map(f => (
                    <button 
                      key={f.id}
                      onClick={() => setTimelineFilter(f.id as any)} 
                      className={`flex-1 py-2 text-[10px] sm:text-xs font-black rounded-xl transition-all ${timelineFilter === f.id ? (isDarkMode ? 'bg-slate-700 text-indigo-400 shadow-sm' : 'bg-white text-indigo-600 shadow-sm') : textSub}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`w-full border font-black py-4 px-6 rounded-[2rem] shadow-sm flex items-center justify-between text-sm transition-all focus:ring-4 ring-indigo-500/20 ${bgCard}`}>
                  <span>{filterSubject === "all" ? "すべての教材を一覧" : filterSubject}</span>
                  <ChevronDown className={`w-5 h-5 transition-transform ${isFilterOpen ? 'rotate-180' : ''} ${textSub}`} />
                </button>

                {isFilterOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsFilterOpen(false)}></div>
                    <div className={`absolute top-full left-0 right-0 mt-2 border rounded-3xl shadow-xl z-40 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 ${isDarkMode ? 'bg-[#1c1c1e] border-[#2c2c2e]' : 'bg-white border-slate-100'}`}>
                      <button onClick={() => { setFilterSubject("all"); setIsFilterOpen(false); }} className={`w-full text-left px-6 py-4 text-sm font-black transition-colors ${filterSubject === "all" ? (isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600') : (isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50')}`}>すべての教材を一覧</button>
                      {Array.from(new Set(allSubjects)).map((sub: any) => <button key={sub} onClick={() => { setFilterSubject(sub); setIsFilterOpen(false); }} className={`w-full text-left px-6 py-4 text-sm font-black transition-colors border-t ${isDarkMode ? 'border-slate-800/50' : 'border-slate-50'} ${filterSubject === sub ? (isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600') : (isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50')}`}>{sub}</button>)}
                    </div>
                  </>
                )}
              </div>

              {/* 🌟 変数ではなく、直接関数を呼び出し、(log: any) と指定する */}
{getFilteredTimelineLogs().length === 0 ? (
  <div className={`text-center py-20 font-black tracking-widest ${textSub}`}>記録がありません</div>
) : (
  getFilteredTimelineLogs().map((log: any) => (
                  <div key={log.id} className="relative mb-6">
                    
                    <div className="absolute inset-0 bg-rose-500 rounded-[2.5rem] flex items-center justify-end pr-8 overflow-hidden">
                      <div className={`flex flex-col items-center justify-center transition-opacity duration-300 ${swipingLogId === log.id && swipeOffset < -50 ? 'opacity-100 scale-110' : 'opacity-0 scale-90'}`}>
                        <Trash2 className="w-8 h-8 text-white mb-1" />
                        <span className="text-white text-[10px] font-black tracking-widest">削除</span>
                      </div>
                    </div>

                    <div 
                      onTouchStart={(e) => handleLogTouchStart(e, log.id)}
                      onTouchMove={handleLogTouchMove}
                      onTouchEnd={() => handleLogTouchEnd(log.id)}
                      style={{ transform: swipingLogId === log.id ? `translateX(${swipeOffset}px)` : 'translateX(0)', transition: isSwiping && swipingLogId === log.id ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
                      className={`p-6 rounded-[2.5rem] shadow-sm border relative group z-10 transition-colors w-full ${bgCard} ${swipingLogId === log.id ? 'shadow-2xl' : ''}`}
                    >
                      <div className="flex justify-between items-center mb-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 ${isDarkMode ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
                            {log.profiles?.avatar_url && !log.profiles.avatar_url.startsWith('bg-') ? (
                              <img src={log.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-indigo-400" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className={`font-black text-sm line-clamp-1 ${textMain}`}>
                              {log.student_id === currentUser?.id ? "あなた" : (log.profiles?.nickname || log.profiles?.name || "ユーザー")}
                            </span>
                            {log.student_id !== currentUser?.id && (
                              <span className="text-[9px] font-black text-indigo-400">フォロワー</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`text-xs font-black mr-2 ${textSub}`}>{new Date(log.created_at).toLocaleDateString()}</span>
                          {log.student_id === currentUser?.id && (
                            <>
                              <button onClick={() => setActiveEditMenu(activeEditMenu === log.id ? null : log.id)} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                                <MoreHorizontal className={`w-5 h-5 ${textSub}`} />
                              </button>
                              
                              {activeEditMenu === log.id && (
                                <div className={`absolute right-6 top-16 w-28 rounded-2xl shadow-2xl border z-50 overflow-hidden ${isDarkMode ? 'bg-[#2c2c2e] border-[#38383a]' : 'bg-white border-slate-50'}`}>
                                  <button onClick={() => { setEditingLog(log); setEditDate(new Date(log.created_at).toISOString().slice(0,16)); setEditMinutes(log.duration_minutes); setEditMemo(log.thoughts||""); setActiveEditMenu(null); }} className={`w-full flex items-center justify-center gap-3 px-4 py-4 text-sm font-black ${isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                                    <Edit2 className="w-4 h-4" /> 編集
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className={`rounded-3xl p-5 mb-5 flex items-center gap-5 border ${bgSubCard}`}>
                        <div className={`w-14 h-18 rounded-xl shadow-sm border overflow-hidden flex-shrink-0 ${isDarkMode ? 'bg-[#1c1c1e] border-[#38383a]' : 'bg-white border-slate-100'}`}>
                          {log.materials?.image_url ? <img src={log.materials.image_url} className="w-full h-full object-cover" /> : <Book className={`w-6 h-6 m-auto mt-6 ${isDarkMode ? 'text-slate-700' : 'text-slate-200'}`} />}
                        </div>
                        <div className="flex-grow">
                          <h3 className={`text-xs font-black line-clamp-1 mb-1 ${textMain}`}>{log.materials?.title || log.subject}</h3>
                          <FormatDurationJSX minutes={log.duration_minutes} />
                        </div>
                      </div>
                      
                      {log.thoughts && <div className={`mb-6 text-base font-bold leading-relaxed px-1 border-l-4 pl-4 ${isDarkMode ? 'text-slate-300 border-indigo-900/50' : 'text-slate-700 border-indigo-100'}`}>{log.thoughts}</div>}

                      <div className={`flex items-center gap-3 relative border-t pt-4 ${isDarkMode ? 'border-[#38383a]' : 'border-slate-100'}`}>
                        
                        {floatingEmojis.map(fe => (
                          <div 
                            key={fe.id} 
                            className="absolute bottom-full left-1/2 -translate-x-1/2 text-4xl animate-float-up z-[60]"
                            style={{ '--x-offset': `${fe.offset}px` } as React.CSSProperties}
                            onAnimationEnd={() => {
                              setFloatingEmojis(prev => prev.filter(e => e.id !== fe.id));
                            }}
                          >
                            {fe.emoji}
                          </div>
                        ))}

                        <button onClick={() => setActiveReactionMenu(activeReactionMenu === log.id ? null : log.id)} className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-slate-50 hover:bg-slate-100 text-slate-400'}`}>
                          <SmilePlus className="w-5 h-5" /> <span className="text-xs font-black uppercase">React</span>
                        </button>

                        {log.userReaction && <div className={`px-3 py-2 rounded-full font-black text-sm ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>{log.userReaction} 1</div>}

                        {activeReactionMenu === log.id && (
                          <div className={`absolute left-0 bottom-full mb-3 p-2 rounded-full shadow-2xl border flex gap-3 z-50 animate-in slide-in-from-bottom-2 duration-300 ${isDarkMode ? 'bg-[#2c2c2e] border-[#38383a]' : 'bg-white border-slate-100'}`}>
                            {EMOJIS.map(emoji => (
                              <button 
                                key={emoji} 
                                onClick={() => {
                                  handleReaction(log.id, emoji); 
                                  const newFloatingEmoji = {
                                    id: Date.now(), 
                                    emoji: emoji,
                                    offset: (Math.random() - 0.5) * 60, 
                                  };
                                  setFloatingEmojis(prev => [...prev, newFloatingEmoji]);
                                }} 
                                className="text-2xl hover:scale-125 transition-transform px-1"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}
      </main>
      <style jsx global>{`
        @keyframes floatUpAndFade {
          0% { opacity: 0; transform: translate(-50%, 0) scale(0.5); }
          10% { opacity: 1; transform: translate(calc(-50% + var(--x-offset) / 5), -20px) scale(1.2); }
          100% { opacity: 0; transform: translate(calc(-50% + var(--x-offset)), -100px) scale(1.5); }
        }
        .animate-float-up {
          animation: floatUpAndFade 1.5s ease-out forwards;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

export default function ReportPage() {
  return <Suspense fallback={null}><ReportContent /></Suspense>;
}