"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase"; 
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, 
  CheckCircle2, Circle, Bell, Target, Book, Flame, Trash2, 
  ChevronDown, ChevronUp, X, Minus, RefreshCcw, ChevronRight as ChevronRightIcon,
  Menu 
} from "lucide-react";
import { useRouter } from "next/navigation";

type Event = {
  id: string;
  date: string;
  title: string;
  event_type: "task" | "exam";
  is_completed: boolean;
  notify_time: string | null;
};

export default function CalendarPage() {
  const router = useRouter(); 
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventType, setNewEventType] = useState<"task" | "exam">("task");
  const [notifyOption, setNotifyOption] = useState<string>("none");
  const [showNotifySheet, setShowNotifySheet] = useState(false);
  const [customOffsetDays, setCustomOffsetDays] = useState(0);
  const [customHour, setCustomHour] = useState(12);
  const [customMinute, setCustomMinute] = useState(0);

  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [swipedEventId, setSwipedEventId] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number, y: number } | null>(null);

  const [googleToken, setGoogleToken] = useState<string | null>(null);

  const [selectedReminderTask, setSelectedReminderTask] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<Event | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminders, setReminders] = useState<any[]>([]);
  
  const [remindOffset, setRemindOffset] = useState<number>(0); 
  const [remindHour, setRemindHour] = useState<number>(9);     
  const [remindMinute, setRemindMinute] = useState<number>(0); 

  const [showGlobalReminders, setShowGlobalReminders] = useState(false);

  const isMounted = useRef(true);

  const sidebarStartX = useRef<number | null>(null);

  const handleEdgeTouchStart = (e: React.TouchEvent) => { 
    sidebarStartX.current = e.touches[0].clientX; 
  };
  const handleEdgeTouchMove = (e: React.TouchEvent) => { 
    if (sidebarStartX.current === null) return;
    const diffX = e.touches[0].clientX - sidebarStartX.current;
    if (diffX > 40) {
      window.dispatchEvent(new Event('openSidebar'));
      sidebarStartX.current = null; 
    }
  };
  const handleEdgeTouchEnd = () => { 
    sidebarStartX.current = null; 
  };

  const notifyOptionsList = [
    { id: "none", label: "通知しない" },
    { id: "today_0700", label: "当日の朝 7:00" },
    { id: "today_2000", label: "当日の夜 20:00" },
    { id: "prev_2100", label: "前日の夜 21:00" },
    { id: "prev2_2100", label: "2日前の夜 21:00" },
    { id: "week_1000", label: "1週間前の朝 10:00" },
    { id: "custom", label: "カスタム（日時を指定）..." },
  ];

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.provider_token) setGoogleToken(session.provider_token);
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.provider_token) setGoogleToken(session.provider_token);
    });

    const checkDarkMode = () => setIsDarkMode(localStorage.getItem('dark_mode') === 'true');
    checkDarkMode();
    window.addEventListener('storage', checkDarkMode);
    window.addEventListener('darkModeChanged', checkDarkMode);
    
    return () => {
      isMounted.current = false;
      authListener.subscription.unsubscribe();
      window.removeEventListener('storage', checkDarkMode);
      window.removeEventListener('darkModeChanged', checkDarkMode);
    };
  }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    
    const checkReminders = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const now = new Date();
      
      const { data: activeReminders } = await supabase.from('reminders').select('*').eq('student_id', user.id);
      const { data: activeEvents } = await supabase.from('calendar_events').select('*').eq('student_id', user.id).not('notify_time', 'is', null).eq('is_completed', false);

      const allNotifications = [
        ...(activeReminders || []).map(r => ({ id: `rem_${r.id}`, rawId: r.id, title: r.title, time: r.remind_at, type: 'reminder' })),
        ...(activeEvents || []).map(e => ({ id: `ev_${e.id}`, rawId: e.id, title: e.title, time: e.notify_time, type: 'event' }))
      ];

      if (allNotifications.length === 0) return;

      allNotifications.forEach(async (notify) => {
        const remindTime = new Date(notify.time);
        const diffMinutes = (now.getTime() - remindTime.getTime()) / (1000 * 60);

        const notifiedKey = `notified_${notify.id}`;
        
        if (diffMinutes >= 0 && diffMinutes < 1 && !localStorage.getItem(notifiedKey)) {
          if (Notification.permission === "granted") {
            const timeString = new Date(notify.time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
            
            // 🌟 TSのエラーを回避するために、一旦 'any' 型としてオプションを定義します
            const notificationOptions: any = { 
              body: `📚「${notify.title}」の予定時刻（${timeString}）です！\nタップして学習を始めましょう🔥`, 
              icon: "/logo.png", 
              badge: "/logo.png", 
              vibrate: [200, 100, 200, 100, 200], 
              requireInteraction: true 
            };

            new Notification("Mercury リマインダー", notificationOptions);
            localStorage.setItem(notifiedKey, "true");
          }
        }
        
        if (diffMinutes >= 30) {
          if (notify.type === 'reminder') {
            await supabase.from('reminders').delete().eq('id', notify.rawId);
            setReminders(prev => prev.filter(r => r.id !== notify.rawId));
          } else {
            await supabase.from('calendar_events').update({ notify_time: null }).eq('id', notify.rawId);
            setEvents(prev => prev.map(e => e.id === notify.rawId ? { ...e, notify_time: null } : e));
          }
          localStorage.removeItem(notifiedKey);
        }
      });
    };

    const intervalId = setInterval(checkReminders, 60000);
    checkReminders(); 
    
    return () => clearInterval(intervalId);
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: eventsData } = await supabase.from('calendar_events').select('*').eq('student_id', user.id);
      const { data: matsData } = await supabase.from('materials').select('*').eq('student_id', user.id).order('created_at', { ascending: false });
      const { data: remindersData } = await supabase.from('reminders').select('*').eq('student_id', user.id); 
      if (isMounted.current) {
        if (eventsData) setEvents(eventsData.map(d => ({ ...d, event_type: d.event_type as "task" | "exam" })));
        if (matsData) setMaterials(matsData);
        if (remindersData) setReminders(remindersData);
      }
    }
    if (isMounted.current) setIsLoading(false);
  };

  const linkGoogleCalendar = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
        redirectTo: window.location.origin + '/calendar',
        queryParams: { access_type: 'offline', prompt: 'consent' }
      }
    });
    if (error) alert("Google連携エラー: " + error.message);
  };

  // 🌟 エラー詳細がわかるように改良
  const getOrCreateStudyTrackerCalendar = async (token: string) => {
    const listRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!listRes.ok) {
      const errorData = await listRes.json().catch(() => ({}));
      if (errorData?.error?.message?.includes('Calendar API has not been used')) {
        alert("Google Cloud Consoleで「Google Calendar API」を有効化してください！");
      }
      throw new Error("AUTH_ERROR");
    }

    const listData = await listRes.json();
    const existing = listData.items?.find((c: any) => c.summary === 'StudyTracker');
    if (existing) return existing.id;

    const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: 'StudyTracker' })
    });
    if (!createRes.ok) throw new Error("AUTH_ERROR");

    const newData = await createRes.json();
    return newData.id;
  };

  const syncAllToGoogle = async () => {
    if (!googleToken) return linkGoogleCalendar();
    setToastMessage("Googleカレンダーと同期中...");
    
    try {
      const calendarId = await getOrCreateStudyTrackerCalendar(googleToken);
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
        headers: { 'Authorization': `Bearer ${googleToken}` }
      });
      
      if (!res.ok) throw new Error("AUTH_ERROR");

      const googleData = await res.json();
      const existingTitles = googleData.items?.map((i:any) => i.summary) || [];
      let syncCount = 0;

      for (const ev of events) {
        if (existingTitles.includes(ev.title)) continue;
        const [y, m, d] = ev.date.split('-').map(Number);
        const nextDay = new Date(y, m - 1, d + 1);
        const endDateStr = formatDateStr(nextDay);

        const postRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${googleToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ summary: ev.title, start: { date: ev.date }, end: { date: endDateStr } })
        });
        
        if (postRes.ok) syncCount++;
      }
      setToastMessage(`${syncCount}件の予定をGoogleに同期しました！`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch(e) { 
      console.error(e);
      setToastMessage(null);
      setGoogleToken(null);
      alert("同期に失敗しました。再連携をお試しください。");
    }
  };

  const handleAddEvent = async () => {
    if (!newEventTitle.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

        let calculatedNotifyTime = null;
    let googleStartTime = null;
    let googleEndTime = null;
    const targetDate = new Date(selectedDate);
    if (notifyOption !== "none") {
      if (notifyOption === "custom") {
        targetDate.setDate(targetDate.getDate() - customOffsetDays);
        targetDate.setHours(customHour, customMinute, 0, 0);
      } else if (notifyOption === "today_0700") targetDate.setHours(7, 0, 0, 0);
      else if (notifyOption === "today_2000") targetDate.setHours(20, 0, 0, 0);
      else if (notifyOption === "prev_2100") { targetDate.setDate(targetDate.getDate() - 1); targetDate.setHours(21, 0, 0, 0); }
      else if (notifyOption === "prev2_2100") { targetDate.setDate(targetDate.getDate() - 2); targetDate.setHours(21, 0, 0, 0); } 
      else if (notifyOption === "week_1000") { targetDate.setDate(targetDate.getDate() - 7); targetDate.setHours(10, 0, 0, 0); } 
      
      calculatedNotifyTime = targetDate.toISOString(); // Supabase保存用（UTC）

      // 🌟 Google Calendar API専用に「日本時間(+09:00)」の文字列を明示的に作成
      const pad = (n: number) => String(n).padStart(2, '0');
      googleStartTime = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}T${pad(targetDate.getHours())}:${pad(targetDate.getMinutes())}:00+09:00`;
      
      const eDate = new Date(targetDate.getTime() + 3600000); // 1時間後を終了時刻に
      googleEndTime = `${eDate.getFullYear()}-${pad(eDate.getMonth() + 1)}-${pad(eDate.getDate())}T${pad(eDate.getHours())}:${pad(eDate.getMinutes())}:00+09:00`;
    }

    const newEventObj = {
      student_id: session.user.id, date: formatDateStr(selectedDate), title: newEventTitle,
      event_type: newEventType, is_completed: false, notify_time: calculatedNotifyTime
    };

    const { error } = await supabase.from('calendar_events').insert([newEventObj]);

    const currentToken = session?.provider_token || googleToken;
    let googleSynced = false;

    if (!error && currentToken) {
      try {
        const calendarId = await getOrCreateStudyTrackerCalendar(currentToken);
        const [y, m, d] = formatDateStr(selectedDate).split('-').map(Number);
        const nextDay = new Date(y, m - 1, d + 1);
        
        const googleEvent = {
          summary: newEventTitle,
          description: "StudyTrackerアプリから追加されました",
          start: googleStartTime 
            ? { dateTime: googleStartTime, timeZone: 'Asia/Tokyo' } 
            : { date: formatDateStr(selectedDate) },
          end: googleEndTime 
            ? { dateTime: googleEndTime, timeZone: 'Asia/Tokyo' } 
            : { date: formatDateStr(nextDay) },
        };
        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(googleEvent)
        });

        if (res.ok) {
          googleSynced = true;
        } else {
          // 🌟 401/403ならトークン切れ、400ならデータ形式エラーとしてログを出す
          const errText = await res.text();
          console.error("Google Calendar Error:", errText);
          if (res.status === 401 || res.status === 403) setGoogleToken(null);
        }
      } catch (e) { console.error("Google Sync Catch Error", e); }
    }

    if (!error) {
      fetchData(); 
      setShowAddModal(false);
      // 🌟 トークンがあるのに同期失敗した場合はわかりやすいメッセージを出す
      if (currentToken && !googleSynced) {
        setToastMessage("アプリに保存しました。Google反映に失敗したため再連携してください。");
      } else {
        setToastMessage(googleSynced ? "予定を追加し、Googleに反映しました！" : "予定を追加しました！");
      }
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const toggleComplete = async (event: Event) => {
    const { error } = await supabase.from('calendar_events').update({ is_completed: !event.is_completed }).eq('id', event.id);
    if (!error) fetchData();
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    const evToDelete = events.find(e => e.id === eventToDelete);
    if (!evToDelete) return;

    const targetId = eventToDelete;
    setEventToDelete(null);
    setSwipedEventId(null);
    setEvents(prev => prev.filter(e => e.id !== targetId));

    const { error } = await supabase.from('calendar_events').delete().eq('id', targetId);
    
    const { data: { session } } = await supabase.auth.getSession();
    const currentToken = session?.provider_token || googleToken;
    let googleDeleted = false;

    if (!error && currentToken) {
      try {
        const calendarId = await getOrCreateStudyTrackerCalendar(currentToken);
        const [y, m, d] = evToDelete.date.split('-').map(Number);
        const timeMin = new Date(y, m - 2, 1).toISOString(); 
        const timeMax = new Date(y, m + 1, 0).toISOString(); 
        
        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true`,
          { headers: { 'Authorization': `Bearer ${currentToken}` } }
        );
        if (res.ok) {
          const data = await res.json();
          const gEvent = data.items?.find((i: any) => {
            if (i.summary !== evToDelete.title) return false;
            // 終日予定の場合
            if (i.start?.date === evToDelete.date) return true;
            // 🌟 修正：UTCのズレによる削除失敗を防ぐため、日本時間の日付文字列に変換して比較
            if (i.start?.dateTime) {
              const eventStartDate = new Date(i.start.dateTime);
              const pad = (n: number) => String(n).padStart(2, '0');
              const eventDateStr = `${eventStartDate.getFullYear()}-${pad(eventStartDate.getMonth() + 1)}-${pad(eventStartDate.getDate())}`;
              return eventDateStr === evToDelete.date;
            }
            return false;
          });
          
          if (gEvent) {
            const delRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${gEvent.id}`, { 
              method: 'DELETE', 
              headers: { 'Authorization': `Bearer ${currentToken}` } 
            });
            if (delRes.ok) googleDeleted = true;
          }
          setGoogleToken(null);
        }
      } catch (e) { console.error(e); }
    }
    
    if (!error) { 
      fetchData(); 
      setToastMessage(googleDeleted ? "Googleカレンダーからも削除しました！" : "削除しました"); 
      setTimeout(() => setToastMessage(null), 3000); 
    }
  };

  const handleSaveReminder = async () => {
    if (!selectedReminderTask) return;
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    setShowReminderModal(false);

    const baseDate = selectedReminderTask.date ? new Date(selectedReminderTask.date) : new Date();
    baseDate.setDate(baseDate.getDate() + remindOffset);
    baseDate.setHours(remindHour, remindMinute, 0, 0);
    const finalIsoTime = baseDate.toISOString(); 

    const { data: newReminder, error } = await supabase
      .from('reminders')
      .insert([{
        student_id: user.id, 
        title: `${selectedReminderTask.title || selectedReminderTask.subject}`,
        remind_at: finalIsoTime,
        task_id: selectedReminderTask.id,
      }])
      .select()
      .single();

    if (error) {
      alert(`エラー: ${error.message}`);
    } else {
      setReminders(prev => [...prev, newReminder]); 
      
      const currentToken = session?.provider_token || googleToken;
      let googleSynced = false;

      if (currentToken) {
        try {
          const calendarId = await getOrCreateStudyTrackerCalendar(currentToken);
          const [y, m, d] = selectedReminderTask.date.split('-').map(Number);
          const targetDate = new Date(y, m - 1, d);
          const timeMin = new Date(targetDate.getTime() - 86400000 * 2).toISOString(); 
          const timeMax = new Date(targetDate.getTime() + 86400000 * 2).toISOString(); 
          
          const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true`,
            { headers: { 'Authorization': `Bearer ${currentToken}` } }
          );
          
          if (res.ok) {
            const data = await res.json();
            const gEvent = data.items?.find((i: any) => 
              i.summary === (selectedReminderTask.title || selectedReminderTask.subject)
            );

            if (gEvent) {
              let eventStartTimeMs = 0;
              if (gEvent.start?.dateTime) {
                eventStartTimeMs = new Date(gEvent.start.dateTime).getTime();
              } else if (gEvent.start?.date) {
                eventStartTimeMs = new Date(gEvent.start.date + 'T00:00:00+09:00').getTime();
              }
              
              let minutesBefore = Math.round((eventStartTimeMs - baseDate.getTime()) / 60000);
              if (minutesBefore < 0) minutesBefore = 0; 

              const patchBody = {
                reminders: {
                  useDefault: false,
                  overrides: [
                    { method: 'popup', minutes: minutesBefore }
                  ]
                }
              };

              const patchRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${gEvent.id}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(patchBody)
              });

              if (patchRes.ok) googleSynced = true;
            }
          } else if (res.status === 401 || res.status === 403) {
            setGoogleToken(null);
          }
        } catch(e) { console.error("Google Sync Error", e) }
      }

      setToastMessage(googleSynced ? "Googleの既存予定に通知をセットしました！" : "通知をセットしました！");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => { setTouchEnd(null); setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY }); };
  const handleTouchMove = (e: React.TouchEvent) => { setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY }); };
  const handleTouchEnd = (id: string) => {
    if (!touchStart || !touchEnd) return;
    const xDiff = touchStart.x - touchEnd.x;
    if (Math.abs(touchStart.y - touchEnd.y) > Math.abs(xDiff)) return; 
    if (xDiff > 40) setSwipedEventId(id); 
    if (xDiff < -40 && swipedEventId === id) setSwipedEventId(null); 
  };

  const formatDateStr = (d: Date) => `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  const days = Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate() }, (_, i) => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1));
  const firstDayIndex = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const selectedDateStr = formatDateStr(selectedDate);
  const selectedEvents = events.filter(e => e.date === selectedDateStr);

  const bgPage = isDarkMode ? "bg-[#0a0a0a] text-slate-100" : "bg-slate-50 text-slate-900";
  const bgCard = isDarkMode ? "bg-[#1c1c1e] border-[#2c2c2e]" : "bg-white border-slate-100";
  const textMain = isDarkMode ? "text-white" : "text-slate-800";
  const textSub = isDarkMode ? "text-slate-400" : "text-slate-500";
  const bgInput = isDarkMode ? "bg-[#2c2c2e] border-[#38383a] text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-700 focus:border-indigo-500";

  return (
    <div className={`min-h-screen pb-24 font-sans transition-colors duration-300 ${bgPage}`}>
      
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[400] animate-in slide-in-from-bottom-4 fade-in duration-300 w-[90%] max-w-sm">
          <div className="bg-indigo-600 text-white px-6 py-4 rounded-2xl shadow-xl font-bold text-sm flex items-center justify-center gap-3">
            <CheckCircle2 className="w-5 h-5" /> {toastMessage}
          </div>
        </div>
      )}

      <header className={`px-6 py-6 flex justify-between items-center sticky top-0 z-10 transition-colors duration-300 border-b ${isDarkMode ? 'bg-[#1c1c1e] border-[#2c2c2e]' : 'bg-white border-slate-100'}`}>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.dispatchEvent(new Event('openSidebar'))} 
            className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm transition-all active:scale-90 ${bgCard}`}
          >
            <Menu className="w-5 h-5 text-slate-500" />
          </button>
          <CalendarIcon className="w-6 h-6 text-indigo-500 hidden md:block" />
          <h1 className="text-xl font-black italic tracking-tighter text-indigo-500 uppercase">Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowGlobalReminders(true)} className="w-10 h-10 flex items-center justify-center active:scale-90 transition-transform relative">
            <Bell className="w-6 h-6 text-slate-400" />
            {(reminders.length > 0 || events.some(e => e.notify_time && !e.is_completed)) && (
              <span className={`absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 border-2 rounded-full ${isDarkMode ? 'border-[#1c1c1e]' : 'border-white'}`}></span>
            )}
          </button>

          {googleToken ? (
            <button onClick={syncAllToGoogle} className="p-2.5 rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-all flex items-center gap-2 shadow-sm">
              <RefreshCcw className="w-4 h-4" /><span className="text-[10px] font-black tracking-wider uppercase">Googleへ反映</span>
            </button>
          ) : (
            <button onClick={linkGoogleCalendar} className="p-2.5 rounded-full bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-all flex items-center gap-2 shadow-sm">
              <RefreshCcw className="w-4 h-4" /><span className="text-[10px] font-black tracking-wider uppercase">Google連携</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto p-5 space-y-6">
        
        <div className={`p-6 rounded-[2.5rem] shadow-sm border transition-colors ${bgCard}`}>
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronLeft className="w-5 h-5" /></button>
            <h2 className={`text-lg font-black ${textMain}`}>{currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月</h2>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-7 mb-4">
            {["日", "月", "火", "水", "木", "金", "土"].map((day, i) => (
              <div key={day} className={`text-center text-[10px] font-black ${i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-500' : textSub}`}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-4">
            {Array(firstDayIndex).fill(null).map((_, i) => <div key={`empty-${i}`} className="h-10"></div>)}
            {days.map((date, i) => {
              const dStr = formatDateStr(date);
              const isSelected = dStr === selectedDateStr;
              const hasAnyEvent = events.some(e => e.date === dStr);
              return (
                <button key={i} onClick={() => setSelectedDate(date)} 
                  className={`relative h-10 w-10 mx-auto rounded-full flex flex-col items-center justify-center transition-all 
                    ${isSelected ? 'bg-indigo-600 text-white shadow-lg' : hasAnyEvent ? (isDarkMode ? 'bg-indigo-500/20 text-indigo-300 font-black' : 'bg-indigo-50 text-indigo-700 font-black') : textMain}`}
                >
                  <span className="text-sm font-bold">{date.getDate()}</span>
                  {hasAnyEvent && <div className="absolute bottom-1 flex gap-0.5"><div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`}></div></div>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-2">
          <div className="flex justify-between items-end mb-4 px-2">
            <h3 className={`text-base font-black flex items-center gap-2 ${textMain}`}>
              {selectedDateStr === formatDateStr(new Date()) ? <><Flame className="w-5 h-5 text-orange-500" />今日やる課題・予定</> : <>{selectedDate.getMonth()+1}月{selectedDate.getDate()}日の予定</>}
            </h3>
            <span className={`text-[10px] font-bold ${textSub}`}>{selectedEvents.length} 件</span>
          </div>
          
          <div className="space-y-3 overflow-hidden">
            {selectedEvents.length === 0 ? (
              <div className={`p-8 rounded-[2rem] border border-dashed text-center ${isDarkMode ? 'border-slate-800 bg-[#1c1c1e]' : 'border-slate-200 bg-white'}`}>
                <Book className={`w-10 h-10 mx-auto mb-3 opacity-10 ${textMain}`} />
                <p className={`text-xs font-bold ${textSub}`}>予定がありません</p>
              </div>
            ) : (
              selectedEvents.map(event => {
                const mat = materials.find(m => m.title === event.title);
                const matImageUrl = mat?.image_url;

let notifyTimeDisplay = "通知設定済み";
                if (event.notify_time) {
                  const nDate = new Date(event.notify_time);
                  if (!isNaN(nDate.getTime())) {
                    const [y, m, d] = event.date.split('-').map(Number);
                    const eventDate = new Date(y, m - 1, d);
                    const notifyDateObj = new Date(nDate.getFullYear(), nDate.getMonth(), nDate.getDate());
                    const diffDays = Math.round((eventDate.getTime() - notifyDateObj.getTime()) / (1000 * 60 * 60 * 24));
                    
                    let dayPrefix = "";
                    if (diffDays === 0) dayPrefix = "当日 ";
                    else if (diffDays === 1) dayPrefix = "前日 ";
                    else if (diffDays === 2) dayPrefix = "2日前 ";
                    else if (diffDays === 7) dayPrefix = "1週間前 ";
                    else if (diffDays > 0) dayPrefix = `${diffDays}日前 `;
                    else if (diffDays < 0) dayPrefix = `${Math.abs(diffDays)}日後 `;

                    notifyTimeDisplay = `${dayPrefix}${nDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} に通知`;
                  }
                }
                return (
                  <div key={event.id} className={`relative rounded-2xl overflow-hidden mb-3 ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-slate-100'}`}>
                    
                    <div className="absolute right-0 top-0 bottom-0 w-[160px] flex">
                      <button 
                        onClick={() => setEventToDelete(event.id)} 
                        className="flex-1 bg-rose-500 flex flex-col items-center justify-center text-white active:bg-rose-600 transition-colors"
                      >
                        <Trash2 className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-black">削除</span>
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedTask(event);
                          setSelectedReminderTask(event);
                          setShowReminderModal(true);
                          setSwipedEventId(null); 
                        }}
                        className="flex-1 bg-indigo-600 flex flex-col items-center justify-center text-white active:bg-indigo-700 transition-colors"
                      >
                        <Bell className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-black">リマインド</span>
                      </button>
                    </div>

                    <div 
                      onTouchStart={handleTouchStart} 
                      onTouchMove={handleTouchMove} 
                      onTouchEnd={() => handleTouchEnd(event.id)} 
                      onClick={() => { 
                        if (swipedEventId === event.id) {
                          setSwipedEventId(null);
                          return;
                        }
                        if (mat) {
                          router.push(`/?record=${mat.id}`);
                        }
                      }}
                      className={`relative flex items-center justify-between p-4 border transition-all duration-300 ease-out 
                        ${swipedEventId === event.id ? '-translate-x-[160px]' : 'translate-x-0'} 
                        ${event.is_completed ? (isDarkMode ? 'bg-[#1c1c1e] border-[#2c2c2e]' : 'bg-slate-50 border-slate-200') : bgCard}
                        ${mat ? 'cursor-pointer active:scale-[0.98]' : ''} 
                      `}
                    >
                      <div className="flex items-center gap-4 flex-1 pointer-events-none">
                        {event.event_type === "task" ? (
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleComplete(event); }} 
                              className="pointer-events-auto shrink-0 p-2 -ml-2 active:scale-90 transition-transform"
                            >
                              {event.is_completed ? <CheckCircle2 className={`w-8 h-8 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} /> : <Circle className={`w-8 h-8 ${textSub}`} />}
                            </button>
                            <div className={`w-8 h-10 rounded shrink-0 flex items-center justify-center overflow-hidden border ${isDarkMode ? 'bg-[#1c1c1e] border-[#38383a]' : 'bg-slate-50 border-slate-200'}`}>
                              {matImageUrl ? <img src={matImageUrl} alt={event.title} className="w-full h-full object-cover" /> : <Book className={`w-4 h-4 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />}
                            </div>
                          </div>
                        ) : (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${event.is_completed ? 'bg-slate-200' : 'bg-rose-500/20'}`}>
                            <Target className={`w-5 h-5 ${event.is_completed ? 'text-slate-400' : 'text-rose-500'}`} />
                          </div>
                        )}
                        <div>
                          <p className={`text-sm font-black line-clamp-1 ${event.is_completed ? `line-through ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}` : (event.event_type === 'exam' ? 'text-rose-500' : textMain)}`}>{event.title}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                            {reminders
                              .filter(rem => rem.task_id === event.id) 
                              .map(rem => {
                                const rDate = new Date(rem.remind_at);
                                const [y, m, d] = event.date.split('-').map(Number);
                                const eventDate = new Date(y, m - 1, d);
                                const notifyDateObj = new Date(rDate.getFullYear(), rDate.getMonth(), rDate.getDate());
                                const diffDays = Math.round((eventDate.getTime() - notifyDateObj.getTime()) / (1000 * 60 * 60 * 24));
                                
                                let dayPrefix = "";
                                if (diffDays === 0) dayPrefix = "当日 ";
                                else if (diffDays === 1) dayPrefix = "前日 ";
                                else if (diffDays === 2) dayPrefix = "2日前 ";
                                else if (diffDays === 7) dayPrefix = "1週間前 ";
                                else if (diffDays > 0) dayPrefix = `${diffDays}日前 `;
                                else if (diffDays < 0) dayPrefix = `${Math.abs(diffDays)}日後 `;

                                return (
                                  <div key={rem.id} className={`px-2 py-1 rounded-full text-[10px] font-black flex items-center gap-1 w-fit ${event.is_completed ? 'bg-slate-200/50 text-slate-500' : 'bg-indigo-500/20 text-indigo-400'}`}>
                                    <Bell className="w-3 h-3" />
                                    {dayPrefix}{rDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                );
                              })}
                          </div>            



                        </div>
                      </div>
                      
                      {mat && (
                        <ChevronRightIcon className="w-5 h-5 text-slate-300 shrink-0 pointer-events-none" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          <button onClick={() => setShowAddModal(true)} className={`w-full mt-4 p-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 font-black transition-colors ${isDarkMode ? 'border-indigo-500/30 text-indigo-400' : 'border-indigo-200 text-indigo-500'}`}>
            <Plus className="w-5 h-5" /> 予定を追加する
          </button>
        </div>
      </main>

      {showGlobalReminders && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[500] animate-in fade-in duration-200" onClick={() => setShowGlobalReminders(false)}></div>
          <div className={`fixed top-24 right-4 w-[85%] max-w-xs ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-white'} z-[501] rounded-3xl p-6 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300`}>
            <div className={`flex justify-between items-center mb-4 border-b pb-4 ${isDarkMode ? 'border-[#38383a]' : 'border-slate-100'}`}>
              <h3 className={`text-sm font-black flex items-center gap-2 ${textMain}`}><Bell className="w-4 h-4 text-indigo-500"/> 設定中の通知</h3>
              <button onClick={() => setShowGlobalReminders(false)} className={`p-1 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}><X className="w-4 h-4" /></button>
            </div>
            {(() => {
              const allDisplayReminders = [
                ...reminders.map(r => ({ id: `rem_${r.id}`, rawId: r.id, title: r.title, time: r.remind_at, type: 'reminder' })),
                ...events.filter(e => e.notify_time && !e.is_completed).map(e => ({ id: `ev_${e.id}`, rawId: e.id, title: e.title, time: e.notify_time as string, type: 'event' }))
              ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

              return allDisplayReminders.length === 0 ? (
                <p className="text-xs font-bold text-slate-400 text-center py-6">現在設定されている通知はありません</p>
              ) : (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {allDisplayReminders.map((rem) => (
                    <div key={rem.id} className={`flex items-center justify-between p-3 rounded-2xl border mb-2 ${isDarkMode ? 'bg-[#2c2c2e] border-[#38383a]' : 'bg-slate-50 border-slate-100'}`}>
                       <div className="flex-1 pr-2">
                         <p className={`text-xs font-black line-clamp-1 mb-1 ${textMain}`}>{rem.title}</p>
                         <p className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 inline-block px-2 py-0.5 rounded-md">
                           {new Date(rem.time).toLocaleTimeString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                         </p>
                       </div>
                       <button onClick={async () => {
                         if (rem.type === 'reminder') {
                           await supabase.from('reminders').delete().eq('id', rem.rawId);
                           setReminders(prev => prev.filter(r => r.id !== rem.rawId));
                         } else {
                           await supabase.from('calendar_events').update({ notify_time: null }).eq('id', rem.rawId);
                           setEvents(prev => prev.map(e => e.id === rem.rawId ? { ...e, notify_time: null } : e));
                         }
                       }} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-full transition-colors shrink-0">
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </>
      )}

      {eventToDelete && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400]" onClick={() => setEventToDelete(null)}></div>
          <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[401] w-[85%] max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-white'}`}>
            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="w-8 h-8 text-rose-500" /></div>
            <h3 className={`text-lg font-black text-center mb-2 ${textMain}`}>予定の削除</h3>
            <p className={`text-sm font-bold text-center mb-8 ${textSub}`}>この予定をカレンダーから削除しますか？<br/>※Googleカレンダーからも削除されます</p>
            <div className="flex gap-3">
              <button onClick={() => setEventToDelete(null)} className={`flex-1 py-3 rounded-xl font-black ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>キャンセル</button>
              <button onClick={confirmDeleteEvent} className="flex-1 py-3 rounded-xl font-black bg-rose-500 text-white">削除する</button>
            </div>
          </div>
        </>
      )}

      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[200]" onClick={() => setShowAddModal(false)}></div>
          <div className={`fixed bottom-0 inset-x-0 z-[201] rounded-t-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-8">
              <h3 className={`text-lg font-black ${textMain}`}>予定を追加</h3>
              <button onClick={() => setShowAddModal(false)} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'bg-[#2c2c2e] text-slate-300' : 'bg-slate-100 text-slate-500'}`}><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-6">
              <div className={`flex p-1 rounded-2xl ${isDarkMode ? 'bg-[#2c2c2e]' : 'bg-slate-100'}`}>
                <button onClick={() => { setNewEventType("task"); setNewEventTitle(""); }} className={`flex-1 py-3 text-xs font-black rounded-xl ${newEventType === "task" ? (isDarkMode ? 'bg-[#38383a] text-indigo-400 shadow-sm' : 'bg-white text-indigo-600 shadow-sm') : textSub}`}>課題</button>
                <button onClick={() => { setNewEventType("exam"); setNewEventTitle(""); }} className={`flex-1 py-3 text-xs font-black rounded-xl ${newEventType === "exam" ? (isDarkMode ? 'bg-[#38383a] text-rose-400 shadow-sm' : 'bg-white text-rose-500 shadow-sm') : textSub}`}>模試・イベント</button>
              </div>
              {newEventType === "task" ? (
                <div className="max-h-40 overflow-y-auto pr-1 space-y-2">
                  {materials.map(mat => (
                    <button key={mat.id} onClick={() => setNewEventTitle(mat.title)} className={`w-full flex items-center p-3 rounded-2xl border transition-all ${newEventTitle === mat.title ? (isDarkMode ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-indigo-50 border-indigo-300 text-indigo-700') : (isDarkMode ? 'bg-[#2c2c2e] border-[#38383a] text-slate-300' : 'bg-white border-slate-200 text-slate-600')}`}>
                      <div className="w-8 h-10 rounded shrink-0 flex items-center justify-center overflow-hidden mr-4 border">{mat.image_url ? <img src={mat.image_url} alt={mat.title} className="w-full h-full object-cover" /> : <Book className="w-4 h-4" />}</div>
                      <span className="text-sm font-bold line-clamp-1">{mat.title}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <input type="text" value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} placeholder="例: 第1回 全国模試" className={`w-full rounded-2xl px-5 py-4 font-bold border-2 outline-none ${bgInput}`} />
              )}
              
              <div>
                <label className={`text-xs font-black uppercase mb-2 block flex items-center gap-1 ${textSub}`}><Bell className="w-3 h-3" /> 通知リマインダー</label>
                <button onClick={() => setShowNotifySheet(true)} className={`w-full flex justify-between items-center rounded-2xl px-5 py-4 font-bold border-2 ${bgInput}`}>
                  <span>{notifyOptionsList.find(o => o.id === notifyOption)?.label}</span><ChevronDown className="w-5 h-5 text-slate-400" />
                </button>
                {notifyOption === "custom" && (
                  <div className={`mt-3 p-4 rounded-2xl border-2 transition-all ${isDarkMode ? 'bg-[#1c1c1e] border-[#38383a]' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-xs font-bold ${textMain}`}>通知日</span>
                      <div className={`flex items-center gap-4 px-4 py-2 rounded-xl ${isDarkMode ? 'bg-[#2c2c2e]' : 'bg-slate-50'}`}>
                        <button onClick={() => setCustomOffsetDays(Math.max(0, customOffsetDays - 1))}><Minus className="w-4 h-4 text-slate-400"/></button>
                        <span className={`text-sm font-black w-12 text-center ${textMain}`}>{customOffsetDays === 0 ? "当日" : `${customOffsetDays}日前`}</span>
                        <button onClick={() => setCustomOffsetDays(customOffsetDays + 1)}><Plus className="w-4 h-4 text-slate-400"/></button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${textMain}`}>時間</span>
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isDarkMode ? 'bg-[#2c2c2e]' : 'bg-slate-50'}`}>
                          <button onClick={() => setCustomHour((customHour - 1 + 24) % 24)}><Minus className="w-4 h-4 text-slate-400"/></button>
                          <span className={`text-sm font-black w-6 text-center ${textMain}`}>{customHour.toString().padStart(2, '0')}</span>
                          <button onClick={() => setCustomHour((customHour + 1) % 24)}><Plus className="w-4 h-4 text-slate-400"/></button>
                        </div>
                        <span className="font-black text-slate-400">:</span>
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isDarkMode ? 'bg-[#2c2c2e]' : 'bg-slate-50'}`}>
                          <button onClick={() => setCustomMinute((customMinute - 5 + 60) % 60)}><Minus className="w-4 h-4 text-slate-400"/></button>
                          <span className={`text-sm font-black w-6 text-center ${textMain}`}>{customMinute.toString().padStart(2, '0')}</span>
                          <button onClick={() => setCustomMinute((customMinute + 5) % 60)}><Plus className="w-4 h-4 text-slate-400"/></button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={handleAddEvent} disabled={!newEventTitle.trim()} className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black shadow-xl active:scale-95 disabled:opacity-50 transition-all">保存する</button>
            </div>
          </div>

          {showNotifySheet && (
            <>
              <div className="fixed inset-0 z-[300] bg-black/60" onClick={() => setShowNotifySheet(false)}></div>
              <div className={`fixed bottom-0 inset-x-0 z-[301] rounded-t-[2rem] p-6 pb-safe animate-in slide-in-from-bottom duration-300 ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-slate-50'}`}>
                <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-6"></div>
                {notifyOptionsList.map(option => (
                  <button key={option.id} onClick={() => { setNotifyOption(option.id); setShowNotifySheet(false); }} className={`w-full flex items-center justify-between p-4 rounded-xl font-black transition-colors ${notifyOption === option.id ? (isDarkMode ? 'bg-[#2c2c2e] text-indigo-400' : 'bg-white text-indigo-600 shadow-sm') : (isDarkMode ? 'text-slate-300' : 'text-slate-600')}`}>{option.label}{notifyOption === option.id && <CheckCircle2 className="w-5 h-5" />}</button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {showReminderModal && selectedReminderTask && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] animate-in fade-in duration-200" onClick={() => setShowReminderModal(false)} />
          <div className={`fixed bottom-0 left-0 right-0 z-[201] rounded-t-[2.5rem] p-6 animate-in slide-in-from-bottom flex flex-col max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>リマインダーを追加</h2>
              <button onClick={() => setShowReminderModal(false)} className={`p-2 rounded-full ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className={`p-4 rounded-2xl mb-6 border flex items-start gap-3 ${isDarkMode ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-100'}`}>
              <Book className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-black text-indigo-500 mb-1">対象課題</p>
                <p className={`text-sm font-bold line-clamp-2 ${isDarkMode ? 'text-indigo-100' : 'text-indigo-900'}`}>{selectedReminderTask.title || selectedReminderTask.subject}</p>
              </div>
            </div>
            <p className="text-xs font-black text-slate-500 mb-3 mt-4">いつ通知しますか？</p>
            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
              {[ { label: "1週間前", value: -7 }, { label: "前日", value: -1 }, { label: "当日", value: 0 }, { label: "明日", value: 1 }, { label: "2日後", value: 2 } ].map(day => (
                <button key={day.label} onClick={() => setRemindOffset(day.value)} className={`whitespace-nowrap px-6 py-3 rounded-2xl text-sm font-bold transition-all ${remindOffset === day.value ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : isDarkMode ? 'bg-[#2c2c2e] text-slate-400 hover:text-slate-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-200'}`}>
                  {day.label}
                </button>
              ))}
            </div>
{/* 🌟 時計UIをコンパクト化（p-4, mb-4, gap-2, text-4xl 等へ縮小） */}
<div className={`rounded-3xl p-4 mb-4 flex items-center justify-center gap-4 shadow-inner ${isDarkMode ? 'bg-[#151516] border border-[#2c2c2e]' : 'bg-slate-50 border border-slate-100'}`}>
   <div className="flex flex-col items-center gap-2">
     <button onClick={() => setRemindHour(h => (h + 1) % 24)} className={`p-2 rounded-full transition-colors active:scale-90 ${isDarkMode ? 'hover:bg-[#2c2c2e] bg-[#1c1c1e] text-slate-400' : 'hover:bg-slate-200 bg-white text-slate-500 shadow-sm'}`}><ChevronUp className="w-5 h-5"/></button>
     <span className={`text-4xl sm:text-5xl font-black tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{String(remindHour).padStart(2, '0')}</span>
     <button onClick={() => setRemindHour(h => (h - 1 + 24) % 24)} className={`p-2 rounded-full transition-colors active:scale-90 ${isDarkMode ? 'hover:bg-[#2c2c2e] bg-[#1c1c1e] text-slate-400' : 'hover:bg-slate-200 bg-white text-slate-500 shadow-sm'}`}><ChevronDown className="w-5 h-5"/></button>
   </div>
   <span className="text-3xl sm:text-4xl font-black text-indigo-500 pb-1 animate-pulse">:</span>
   <div className="flex flex-col items-center gap-2">
     <button onClick={() => setRemindMinute(m => (m + 5) % 60)} className={`p-2 rounded-full transition-colors active:scale-90 ${isDarkMode ? 'hover:bg-[#2c2c2e] bg-[#1c1c1e] text-slate-400' : 'hover:bg-slate-200 bg-white text-slate-500 shadow-sm'}`}><ChevronUp className="w-5 h-5"/></button>
     <span className={`text-4xl sm:text-5xl font-black tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{String(remindMinute).padStart(2, '0')}</span>
     <button onClick={() => setRemindMinute(m => (m - 5 + 60) % 60)} className={`p-2 rounded-full transition-colors active:scale-90 ${isDarkMode ? 'hover:bg-[#2c2c2e] bg-[#1c1c1e] text-slate-400' : 'hover:bg-slate-200 bg-white text-slate-500 shadow-sm'}`}><ChevronDown className="w-5 h-5"/></button>
   </div>
            </div>
            <button onClick={handleSaveReminder} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-95">
              <Bell className="w-5 h-5" /> 通知をセットする
            </button>
          </div>
        </>
      )}

      <div
        onTouchStart={handleEdgeTouchStart}
        onTouchMove={handleEdgeTouchMove}
        onTouchEnd={handleEdgeTouchEnd}
        className="fixed top-0 left-0 bottom-0 w-6 z-[30]"
      />

      <button
        onClick={() => window.dispatchEvent(new Event('openSidebar'))}
        className={`fixed left-0 top-1/3 -translate-y-1/2 z-[20] w-4 h-24 rounded-r-xl shadow-sm flex items-center justify-center transition-all duration-300 active:scale-95 border-y border-r border-white/10 ${
          isDarkMode ? 'bg-slate-700/40 hover:bg-indigo-500/80' : 'bg-slate-300/50 hover:bg-indigo-500/80'
        } backdrop-blur-sm group`}
      >
        <div className={`w-1 h-10 rounded-full transition-colors ${isDarkMode ? 'bg-slate-400/50 group-hover:bg-white' : 'bg-slate-500/50 group-hover:bg-white'}`} />
      </button>

    </div>
  );
}