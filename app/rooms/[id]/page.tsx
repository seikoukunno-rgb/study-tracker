"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase"; 
import { ChevronLeft, Send, Users, Loader2, Smile, Trash2, UserPlus, UserMinus, Trophy, Clock, Flame, History, BookOpen, LogOut, Settings, Calendar, Play, Plus, Flag, CheckCircle2, Edit2, X } from "lucide-react";

export default function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const roomId = resolvedParams.id;

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [room, setRoom] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]); 
  const [activeUsers, setActiveUsers] = useState<any[]>([]); 
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showStamps, setShowStamps] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false); 
  const [follows, setFollows] = useState<string[]>([]); 

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editRoomName, setEditRoomName] = useState("");
  const [editRankingEnabled, setEditRankingEnabled] = useState(true);

  const [showRankingModal, setShowRankingModal] = useState(false);
  const [staruns, setStaruns] = useState<any[]>([]);
  const [selectedStarunId, setSelectedStarunId] = useState<string | null>(null);
  const [isCreatingStarun, setIsCreatingStarun] = useState(false);
  const [newStarunName, setNewStarunName] = useState("");
  const [newStarunStart, setNewStarunStart] = useState("");
  const [newStarunEnd, setNewStarunEnd] = useState("");
  
  const [rankingTab, setRankingTab] = useState<'ranking' | 'timeline'>('ranking');
  const [rankingPeriod, setRankingPeriod] = useState<'daily' | 'weekly' | 'total'>('total');
  const [studyLogs, setStudyLogs] = useState<any[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [isParticipating, setIsParticipating] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [modalDragY, setModalDragY] = useState(0);
  const modalTouchStartY = useRef<number | null>(null);

  // 🌟 長押し・メッセージ編集用State
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stampList = ["👍", "🔥", "🎉", "👀", "🚀", "🙏", "💯", "✅", "💡", "😭"];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const checkDarkMode = () => setIsDarkMode(localStorage.getItem('dark_mode') === 'true');
    checkDarkMode();

    const initRoom = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);

      const { data: followData } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
      if (followData) setFollows(followData.map(f => f.following_id));

      const { data: groupData } = await supabase.from('groups').select('*').eq('id', roomId).single();
      const { data: membersData } = await supabase.from('group_members').select('user_id, is_ranking_participant').eq('group_id', roomId);
      const { data: msgsData } = await supabase.from('messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true });

      let currentMembersInfo = membersData || [];
      let currentMsgsData = msgsData || [];

      const { data: myProf } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      const myDisplayName = myProf?.nickname || myProf?.name || myProf?.full_name || "ユーザー";
      setMyProfile({ ...myProf, display_name: myDisplayName });

      let myMemberInfo = currentMembersInfo.find(m => m.user_id === user.id);

      if (!myMemberInfo) {
        await supabase.from('group_members').insert([{ group_id: roomId, user_id: user.id }]);
        currentMembersInfo.push({ user_id: user.id, is_ranking_participant: false });
        myMemberInfo = { user_id: user.id, is_ranking_participant: false };
        
        await supabase.from('messages').insert([{
          room_id: roomId, user_id: user.id, content: `${myDisplayName} が参加しました 👋`, is_system: true, is_stamp: false
        }]);

        const { data: newMsgsData } = await supabase.from('messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true });
        if (newMsgsData) currentMsgsData = newMsgsData;
      }

      setIsParticipating(myMemberInfo?.is_ranking_participant || false);

      const allUserIds = Array.from(new Set([...currentMembersInfo.map(m=>m.user_id), ...currentMsgsData.map(m => m.user_id)]));
      const { data: profilesData } = await supabase.from('profiles').select('*').in('id', allUserIds);

      const profileMap: Record<string, any> = {};
      if (profilesData) {
        profilesData.forEach(p => {
          profileMap[p.id] = { ...p, display_name: p.nickname || p.name || p.full_name || "ユーザー" };
        });
      }

      const finalMembers = currentMembersInfo.map(info => ({ 
        user_id: info.user_id, 
        is_ranking_participant: info.is_ranking_participant,
        profiles: profileMap[info.user_id] || { display_name: "ユーザー" } 
      }));
      
      const finalMessages = currentMsgsData.map(m => ({ ...m, profiles: profileMap[m.user_id] || { display_name: "ユーザー" } }));

      if (groupData) {
        setRoom(groupData);
        setEditRoomName(groupData.name);
        setEditRankingEnabled(groupData.is_ranking_enabled);
      }
      setMembers(finalMembers);
      setMessages(finalMessages);
      setIsLoading(false);

      const channel = supabase.channel(`room-${roomId}`, { config: { presence: { key: user.id } } });

      channel
        .on('presence', { event: 'sync' }, () => {
          const newState = channel.presenceState();
          setActiveUsers(Object.keys(newState));
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, async (p) => {
          if (p.new.user_id === user.id) return;
          const { data: userData } = await supabase.from('profiles').select('*').eq('id', p.new.user_id).single();
          const pName = userData?.nickname || userData?.name || userData?.full_name || "ユーザー";
          setMessages(prev => {
            if (prev.some(m => m.id === p.new.id)) return prev;
            return [...prev, { ...p.new, profiles: { ...userData, display_name: pName } }];
          });
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, (p) => {
          // 他人のメッセージ編集をリアルタイムに反映
          setMessages(prev => prev.map(m => m.id === p.new.id ? { ...m, content: p.new.content } : m));
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, (p) => {
          setMessages(prev => prev.filter(m => m.id !== p.old.id));
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') await channel.track({ name: myDisplayName, online_at: new Date().toISOString() });
        });

      return () => { supabase.removeChannel(channel); };
    };

    initRoom();
  }, [roomId]);

  const fetchStaruns = async () => {
    const { data } = await supabase.from('staruns').select('*').eq('group_id', roomId).order('start_date', { ascending: false });
    if (data && data.length > 0) {
      setStaruns(data);
      const now = new Date().toISOString().split('T')[0];
      const active = data.find(s => s.start_date <= now && s.end_date >= now);
      setSelectedStarunId(active ? active.id : data[0].id);
      setIsCreatingStarun(false);
    } else {
      setStaruns([]);
      setIsCreatingStarun(true);
    }
  };

  useEffect(() => {
    if (showRankingModal) fetchStaruns();
  }, [showRankingModal]);

  // 🌟 名前が確実に表示されるマニュアルジョイン方式
  const fetchStudyLogsForStarun = async () => {
    if (!selectedStarunId) return;
    setIsLogsLoading(true);

    const targetStarun = staruns.find(s => s.id === selectedStarunId);
    if (!targetStarun) { setIsLogsLoading(false); return; }

    const participatingIds = members.filter(m => m.is_ranking_participant).map(m => m.user_id);
    if (participatingIds.length === 0) { setStudyLogs([]); setIsLogsLoading(false); return; }

    const startTime = `${targetStarun.start_date}T00:00:00+09:00`;
    const endTime = `${targetStarun.end_date}T23:59:59+09:00`;

    // 1. 学習記録の生データを取得（通信量削減のためカラム指定）
    const { data: rawLogs, error } = await supabase
      .from('study_logs')
      .select('id, student_id, material_id, duration_minutes, studied_at, created_at')
      .in('student_id', participatingIds)
      .gte('created_at', startTime)
      .lte('created_at', endTime)
      .order('created_at', { ascending: false });

    if (error || !rawLogs) {
      setStudyLogs([]);
      setIsLogsLoading(false);
      return;
    }

    // 2. プロフィールと教材データを別々に取得してアプリ側でマージする
    const studentIds = Array.from(new Set(rawLogs.map(l => l.student_id)));
    const materialIds = Array.from(new Set(rawLogs.map(l => l.material_id).filter(Boolean)));

    const { data: profilesData } = await supabase.from('profiles').select('id, nickname, name, full_name, avatar_url').in('id', studentIds);
    const { data: materialsData } = await supabase.from('materials').select('id, title, image_url').in('id', materialIds);

    const profMap: Record<string, any> = {};
    profilesData?.forEach(p => { profMap[p.id] = { ...p, display_name: p.nickname || p.name || p.full_name || "ユーザー" }; });

    const matMap: Record<string, any> = {};
    materialsData?.forEach(m => { matMap[m.id] = m; });

    const formattedLogs = rawLogs.map(log => ({
      ...log,
      display_name: profMap[log.student_id]?.display_name || "ユーザー",
      avatar_url: profMap[log.student_id]?.avatar_url,
      materials: matMap[log.material_id] || null
    }));

    setStudyLogs(formattedLogs);
    setIsLogsLoading(false);
  };

  useEffect(() => {
    if (showRankingModal && !isCreatingStarun && isParticipating) fetchStudyLogsForStarun();
  }, [selectedStarunId, isCreatingStarun, showRankingModal, isParticipating]);

  // 🌟 スタラン作成（最大1週間制限）
  const handleCreateStarun = async () => {
    if (!newStarunName.trim() || !newStarunStart || !newStarunEnd) return showToast("全て入力してください");
    if (newStarunStart > newStarunEnd) return showToast("終了日は開始日以降に設定してください");

    const startDate = new Date(newStarunStart);
    const endDate = new Date(newStarunEnd);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    if (diffDays > 7) return showToast("スタランの期間は最大1週間（7日間）に設定してください");

    const { data, error } = await supabase.from('staruns').insert([{
      group_id: roomId, name: newStarunName, start_date: newStarunStart, end_date: newStarunEnd, created_by: currentUser?.id
    }]).select().single();

    if (!error && data) {
      setStaruns(prev => [data, ...prev].sort((a, b) => b.start_date.localeCompare(a.start_date)));
      setSelectedStarunId(data.id);
      setIsCreatingStarun(false);
      setNewStarunName(""); setNewStarunStart(""); setNewStarunEnd("");
      showToast("新しいスタランを開催しました！");
    } else {
      showToast("作成に失敗しました");
    }
  };

  const saveRoomSettings = async () => {
    if (!editRoomName.trim()) return;
    const { error } = await supabase.from('groups').update({ name: editRoomName, is_ranking_enabled: editRankingEnabled }).eq('id', roomId);
    if (!error) { setRoom({ ...room, name: editRoomName, is_ranking_enabled: editRankingEnabled }); showToast("設定を保存しました！"); setShowSettingsModal(false); }
  };

  const handleJoinRanking = async () => {
    if (!currentUser) return;
    const { error } = await supabase.from('group_members').update({ is_ranking_participant: true }).eq('group_id', roomId).eq('user_id', currentUser.id);
    if (!error) {
      setIsParticipating(true);
      setMembers(prev => prev.map(m => m.user_id === currentUser.id ? { ...m, is_ranking_participant: true } : m));
      fetchStudyLogsForStarun();
      showToast("スタランに参加しました！");
    }
  };

  const handleKickMember = async (userId: string) => {
    if (!window.confirm("このメンバーをルームから退出させますか？")) return;
    const { error } = await supabase.from('group_members').delete().eq('group_id', roomId).eq('user_id', userId);
    if (!error) {
      setMembers(prev => prev.filter(m => m.user_id !== userId));
      showToast("メンバーを退出させました");
    }
  };

  const handleLeaveOrDeleteRoom = async () => {
    if (!room || !currentUser) return;
    const isHost = room.created_by === currentUser.id;
    const confirmMessage = isHost ? "⚠️ あなたが作成したルームです。\n本当に「ルームごと削除」しますか？\n（参加者やメッセージもデータベースから完全に消去されます）" : "このルームから「退出」しますか？";
    if (!window.confirm(confirmMessage)) return;

    if (isHost) {
      const { error } = await supabase.from('groups').delete().eq('id', roomId);
      if (error) { showToast("削除に失敗しました"); return; }
    } else {
      const { error } = await supabase.from('group_members').delete().eq('group_id', roomId).eq('user_id', currentUser.id);
      if (error) { showToast("退室に失敗しました"); return; }
      await supabase.from('messages').insert([{ room_id: roomId, user_id: currentUser.id, content: `${myProfile?.display_name} が退室しました 🏃💨`, is_system: true, is_stamp: false }]);
    }
    router.push('/rooms');
  };

  // 🌟 送信・編集
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;
    const content = newMessage;
    setNewMessage(""); setShowStamps(false);
    
    if (editingMessageId) {
      const { data, error } = await supabase.from('messages').update({ content }).eq('id', editingMessageId).select().single();
      if (!error && data) {
        setMessages(prev => prev.map(m => m.id === editingMessageId ? { ...m, content: data.content } : m));
        showToast("メッセージを編集しました");
      }
      setEditingMessageId(null);
    } else {
      const { data: insertedMsg, error } = await supabase.from('messages').insert([{ room_id: roomId, user_id: currentUser.id, content, is_stamp: false }]).select().single();
      if (!error && insertedMsg) setMessages(prev => [...prev, { ...insertedMsg, profiles: myProfile }]);
    }
  };

  const sendStamp = async (stamp: string) => {
    if (!currentUser) return;
    setShowStamps(false);
    const { data: insertedMsg, error } = await supabase.from('messages').insert([{ room_id: roomId, user_id: currentUser.id, content: stamp, is_stamp: true }]).select().single();
    if (!error && insertedMsg) setMessages(prev => [...prev, { ...insertedMsg, profiles: myProfile }]);
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("送信を取り消しますか？")) return;
    setMessages(prev => prev.filter(m => m.id !== id));
    setActiveMessageId(null);
    await supabase.from('messages').delete().eq('id', id);
  };

  // 🌟 長押し処理
  const handleTouchStartMsg = (id: string) => {
    pressTimer.current = setTimeout(() => { setActiveMessageId(id); }, 500);
  };
  const handleTouchEndMsg = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  const toggleFollow = async (targetUserId: string) => {
    if (!currentUser) return;
    const isFollowing = follows.includes(targetUserId);
    if (isFollowing) {
      setFollows(prev => prev.filter(id => id !== targetUserId));
      await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', targetUserId);
    } else {
      setFollows(prev => [...prev, targetUserId]);
      await supabase.from('follows').insert([{ follower_id: currentUser.id, following_id: targetUserId }]);
    }
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, showStamps]);

  const handleModalTouchStart = (e: React.TouchEvent) => { modalTouchStartY.current = e.touches[0].clientY; };
  const handleModalTouchMove = (e: React.TouchEvent) => {
    if (modalTouchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - modalTouchStartY.current;
    if (diff > 0) setModalDragY(diff);
  };
  const handleModalTouchEnd = (closeFunction: () => void) => {
    if (modalDragY > 100) closeFunction();
    setModalDragY(0);
    modalTouchStartY.current = null;
  };

  const AvatarImage = ({ url, name, className }: { url: string | null, name: string, className: string }) => {
    const [imgError, setImgError] = useState(false);
    const isBgClass = url?.startsWith('bg-');
    if (url && !isBgClass && !imgError) return <img src={url} alt={name} className={className} onError={() => setImgError(true)} />;
    return <div className={`${className} flex items-center justify-center font-black ${isBgClass ? url : (isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-500')}`}>{name.charAt(0).toUpperCase()}</div>;
  };

  const getRankings = () => {
    const targetStarun = staruns.find(s => s.id === selectedStarunId);
    if (!targetStarun) return [];

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const aggregated: Record<string, { totalTime: number, name: string, avatarUrl: string | null, id: string }> = {};

    studyLogs.forEach(log => {
      let isTarget = false;
      if (rankingPeriod === 'total') isTarget = true;
      if (rankingPeriod === 'daily') isTarget = log.studied_at === todayStr;
      if (rankingPeriod === 'weekly') isTarget = new Date(log.created_at) >= weekAgo;

      if (isTarget) {
        if (!aggregated[log.student_id]) aggregated[log.student_id] = { totalTime: 0, name: log.display_name, avatarUrl: log.avatar_url, id: log.student_id };
        aggregated[log.student_id].totalTime += (log.duration_minutes || 0);
      }
    });
    return Object.values(aggregated).filter(r => r.totalTime > 0).sort((a, b) => b.totalTime - a.totalTime);
  };

  const bgPage = isDarkMode ? "bg-[#0a0a0a] text-slate-100" : "bg-slate-50 text-slate-900";
  const bgHeader = isDarkMode ? "bg-[#1c1c1e] border-[#2c2c2e]" : "bg-white border-slate-100";
  const bgCard = isDarkMode ? "bg-[#2c2c2e] border-[#38383a]" : "bg-white border-slate-100";
  const textMain = isDarkMode ? "text-white" : "text-slate-800";
  const textSub = isDarkMode ? "text-slate-400" : "text-slate-500";

  if (isLoading) return <div className={`h-[100dvh] w-full flex items-center justify-center ${bgPage}`}><Loader2 className="animate-spin text-indigo-500" /></div>;

  const isHost = room?.created_by === currentUser?.id;
  const rankings = getRankings();
  const selectedStarunData = staruns.find(s => s.id === selectedStarunId);

  return (
    <div className={`flex flex-col h-[100dvh] w-full font-sans transition-colors duration-300 overflow-hidden ${bgPage}`} onClick={() => setActiveMessageId(null)}>
      
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-top-4 fade-in duration-300 w-[90%] max-w-sm pointer-events-none">
          <div className="bg-slate-800 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center justify-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-amber-400" /> {toastMessage}
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <header className={`shrink-0 z-40 px-4 py-3 flex items-center justify-between border-b shadow-sm ${bgHeader}`}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/rooms')} className={`p-2.5 rounded-2xl transition-all flex items-center justify-center shrink-0 border shadow-sm active:scale-95 ${bgCard}`}>
            <ChevronLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-base font-black leading-tight line-clamp-1">{room?.name || "ルーム"}</h1>
            <p className="text-[10px] font-bold text-indigo-500 mt-0.5 tracking-wider">直近10件以降は3日で消滅します ⏳</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5">
          {room?.is_ranking_enabled && (
            <button onClick={() => setShowRankingModal(true)} className={`p-2.5 rounded-xl border shadow-sm transition-all active:scale-95 ${isDarkMode ? 'bg-[#2c2c2e] border-[#38383a] text-amber-500' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
              <Trophy className="w-5 h-5" />
            </button>
          )}
          <button onClick={() => setShowMembersModal(true)} className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border shadow-sm transition-all active:scale-95 ${bgCard}`}>
            <Users className={`w-4 h-4 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-500'}`} />
            <span className="text-xs font-black">{members.length}</span>
          </button>
          <button onClick={() => setShowSettingsModal(true)} className={`p-2.5 rounded-xl border shadow-sm transition-all active:scale-95 text-slate-500 ${bgCard}`}>
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* メッセージエリア */}
      <div ref={scrollRef} className="flex-1 px-4 py-6 space-y-6 overflow-y-auto no-scrollbar scroll-smooth">
        {messages.map((m) => {
          if (m.is_system) {
            return (
              <div key={m.id} className="flex justify-center w-full my-4">
                <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${isDarkMode ? 'bg-[#1c1c1e] text-slate-400 border-[#2c2c2e]' : 'bg-slate-200/50 text-slate-500 border-slate-200'}`}>
                  {m.content}
                </span>
              </div>
            );
          }
          const isMine = m.user_id === currentUser?.id;
          const displayName = m.profiles?.display_name || "ユーザー";
          return (
            <div key={m.id} className={`flex flex-col animate-in slide-in-from-bottom-2 fade-in duration-300 ${isMine ? 'items-end' : 'items-start'}`}>
              {!isMine && <span className="text-[10px] font-bold text-slate-400 mb-1.5 px-2">{displayName}</span>}
              <div className={`flex items-end gap-2 relative ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                {m.is_stamp ? (
                  <div className="text-6xl py-1 filter drop-shadow-sm">{m.content}</div>
                ) : (
                  <div 
                    onTouchStart={() => handleTouchStartMsg(m.id)} 
                    onTouchEnd={handleTouchEndMsg} 
                    onTouchMove={handleTouchEndMsg}
                    onContextMenu={(e) => { e.preventDefault(); setActiveMessageId(m.id); }}
                    className={`max-w-[260px] p-4 rounded-[1.5rem] text-sm font-bold shadow-sm break-words whitespace-pre-wrap leading-relaxed select-none ${activeMessageId === m.id ? 'opacity-80 scale-[0.98]' : ''} transition-all ${isMine ? 'bg-indigo-600 text-white rounded-tr-sm' : (isDarkMode ? 'bg-[#1c1c1e] text-white border border-[#2c2c2e]' : 'bg-white text-slate-800 border border-slate-100') + ' rounded-tl-sm'}`}
                  >
                    {m.content}
                  </div>
                )}

                {/* 長押しメニュー */}
                {activeMessageId === m.id && isMine && !m.is_stamp && (
                  <div className="absolute top-[-40px] right-0 z-50 bg-white dark:bg-[#2c2c2e] shadow-xl rounded-xl border border-slate-100 dark:border-[#38383a] flex overflow-hidden animate-in zoom-in-95 duration-200">
                    <button onClick={(e) => { e.stopPropagation(); setEditingMessageId(m.id); setNewMessage(m.content); setActiveMessageId(null); }} className="px-4 py-2.5 flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#38383a] transition-colors border-r dark:border-[#38383a]">
                      <Edit2 className="w-3.5 h-3.5" /> 編集
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteMessage(m.id); }} className="px-4 py-2.5 flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> 削除
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 入力エリア */}
      <div className={`shrink-0 z-40 flex flex-col border-t shadow-[0_-10px_30px_rgba(0,0,0,0.05)] ${bgHeader}`}>
        {editingMessageId && (
          <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 flex justify-between items-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
            <span className="flex items-center gap-1.5"><Edit2 className="w-3.5 h-3.5" /> メッセージを編集中...</span>
            <button onClick={() => { setEditingMessageId(null); setNewMessage(''); }} className="p-1 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"><X className="w-4 h-4"/></button>
          </div>
        )}
        
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showStamps ? 'max-h-24 opacity-100 border-b' : 'max-h-0 opacity-0 border-transparent'} ${isDarkMode ? 'bg-[#0a0a0a]/50 border-[#2c2c2e]' : 'bg-slate-50/50 border-slate-200'}`}>
          <div className="p-4 flex gap-6 overflow-x-auto no-scrollbar w-full items-center">
            {stampList.map(s => <button key={s} onClick={() => sendStamp(s)} className="text-4xl hover:scale-125 transition-transform shrink-0 active:scale-95">{s}</button>)}
          </div>
        </div>
        <form onSubmit={sendMessage} className="p-3 pb-safe flex items-center gap-2 w-full">
          <button type="button" onClick={() => setShowStamps(!showStamps)} className={`p-3.5 rounded-2xl transition-all shrink-0 active:scale-95 ${showStamps ? 'bg-indigo-100 text-indigo-600 scale-110 shadow-sm' : (isDarkMode ? 'text-slate-400 hover:bg-[#2c2c2e]' : 'text-slate-400 hover:bg-slate-100')}`}>
            <Smile className="w-6 h-6" />
          </button>
          <input 
            type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onFocus={() => setShowStamps(false)} 
            placeholder="メッセージを入力..." 
            className={`flex-1 min-w-0 px-5 py-4 rounded-[1.5rem] text-sm font-bold outline-none border-2 focus:border-indigo-500 transition-all ${isDarkMode ? 'bg-[#0a0a0a] border-[#2c2c2e] text-white placeholder-slate-500' : 'bg-slate-100 border-transparent text-slate-800'}`} 
          />
          <button type="submit" disabled={!newMessage.trim()} className="bg-indigo-600 text-white p-4 rounded-[1.5rem] active:scale-90 transition-all disabled:opacity-30 shadow-lg shadow-indigo-600/20 shrink-0">
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </form>
      </div>

      {/* 設定モーダル */}
      {showSettingsModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] animate-in fade-in duration-200" onClick={() => setShowSettingsModal(false)}></div>
          <div 
            style={{ transform: `translateY(${modalDragY}px)`, transition: modalTouchStartY.current ? 'none' : 'transform 0.3s ease-out' }}
            className={`fixed bottom-0 left-0 right-0 z-[101] rounded-t-[2.5rem] shadow-2xl h-[90vh] flex flex-col ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-white'}`}
          >
            <div 
              className="pt-5 pb-4 shrink-0 cursor-grab active:cursor-grabbing touch-none"
              onTouchStart={handleModalTouchStart} onTouchMove={handleModalTouchMove} onTouchEnd={() => handleModalTouchEnd(() => setShowSettingsModal(false))}
            >
              <div className="w-16 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>
              <div className="flex justify-between items-center px-6">
                <h2 className={`text-lg font-black flex items-center gap-2 ${textMain}`}><Settings className="w-5 h-5 text-slate-500" /> ルーム設定</h2>
              </div>
            </div>

            <div className="overflow-y-auto space-y-6 px-6 pb-12 no-scrollbar">
              {isHost && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-2xl border ${bgCard}`}>
                    <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${textSub}`}>ルーム名</label>
                    <input type="text" value={editRoomName} onChange={e => setEditRoomName(e.target.value)} className={`w-full p-3 rounded-xl text-sm font-bold outline-none border transition-all ${isDarkMode ? 'bg-[#0a0a0a] border-[#38383a] text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500'}`} />
                  </div>
                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${bgCard}`}>
                    <span className={`text-sm font-bold ${textMain}`}>ランキング機能を有効にする</span>
                    <input type="checkbox" checked={editRankingEnabled} onChange={e => setEditRankingEnabled(e.target.checked)} className="w-5 h-5 accent-indigo-600" />
                  </div>
                  <button onClick={saveRoomSettings} className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-black active:scale-95 transition-all shadow-md">設定を保存する</button>
                </div>
              )}
              <div className="pt-4 border-t border-slate-200 dark:border-[#38383a]">
                <button onClick={handleLeaveOrDeleteRoom} className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl font-black text-rose-500 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 active:scale-95 transition-all">
                  <LogOut className="w-5 h-5" /> {isHost ? "このルームを削除する" : "ルームから退出する"}
                </button>
              </div>
              {isHost && (
                <div className="pt-4">
                  <h3 className={`text-sm font-black mb-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>メンバー管理</h3>
                  <div className="space-y-2">
                    {members.map(m => (
                      <div key={m.user_id} className={`flex items-center justify-between p-3 rounded-xl border ${bgCard}`}>
                        <div className="flex items-center gap-3">
                          <AvatarImage url={m.profiles?.avatar_url} name={m.profiles?.display_name || "U"} className="w-8 h-8 rounded-full object-cover border shadow-sm" />
                          <span className={`text-sm font-bold ${textMain}`}>{m.profiles?.display_name}</span>
                        </div>
                        {m.user_id !== currentUser?.id && <button onClick={() => handleKickMember(m.user_id)} className="px-3 py-1.5 bg-rose-100 dark:bg-rose-500/20 text-rose-600 rounded-lg text-xs font-black active:scale-95">強制退出</button>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* メンバー一覧モーダル */}
      {showMembersModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] animate-in fade-in duration-200" onClick={() => setShowMembersModal(false)}></div>
          <div 
            style={{ transform: `translateY(${modalDragY}px)`, transition: modalTouchStartY.current ? 'none' : 'transform 0.3s ease-out' }}
            className={`fixed bottom-0 left-0 right-0 z-[101] rounded-t-[2.5rem] shadow-2xl h-[85vh] flex flex-col ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-white'}`}
          >
            <div 
              className="pt-5 pb-4 shrink-0 cursor-grab active:cursor-grabbing touch-none"
              onTouchStart={handleModalTouchStart} onTouchMove={handleModalTouchMove} onTouchEnd={() => handleModalTouchEnd(() => setShowMembersModal(false))}
            >
              <div className="w-16 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>
              <div className="flex justify-between items-center px-6">
                <h2 className={`text-lg font-black flex items-center gap-2 ${textMain}`}><Users className="w-5 h-5 text-indigo-500" /> 参加メンバー</h2>
                <span className={`text-xs font-bold ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'} px-3 py-1 rounded-full`}>{members.length}人</span>
              </div>
            </div>
            
            <div className="overflow-y-auto space-y-3 px-6 pb-12 no-scrollbar">
              {members.map((member) => {
                const isMe = member.user_id === currentUser?.id;
                const isOnline = activeUsers.includes(member.user_id);
                const isFollowing = follows.includes(member.user_id);
                const displayName = member.profiles?.display_name || "ユーザー";

                return (
                  <div key={member.user_id} className={`flex items-center justify-between p-4 rounded-[1.5rem] border transition-colors ${bgCard}`}>
                    <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => { if (!isMe) router.push(`/user/${member.user_id}`); }}>
                      <div className="relative">
                        <AvatarImage url={member.profiles?.avatar_url} name={displayName} className="w-12 h-12 rounded-full overflow-hidden shrink-0 border shadow-sm object-cover" />
                        {isOnline && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-[#2c2c2e] rounded-full"></div>}
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-sm font-black line-clamp-1 ${textMain}`}>{displayName} {isMe && <span className="text-[10px] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded ml-2">あなた</span>}</span>
                        {isOnline && <span className="text-[10px] font-bold text-emerald-500 mt-0.5 tracking-wider">ONLINE</span>}
                      </div>
                    </div>
                    {!isMe && (
                      <button onClick={() => toggleFollow(member.user_id)} className={`p-2.5 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-90 shadow-sm ${isFollowing ? (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500') : 'bg-indigo-600 text-white shadow-indigo-600/20'}`}>
                        {isFollowing ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* 🌟 Study Run モーダル */}
      {showRankingModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] animate-in fade-in duration-200" onClick={() => setShowRankingModal(false)}></div>
          <div 
            style={{ transform: `translateY(${modalDragY}px)`, transition: modalTouchStartY.current ? 'none' : 'transform 0.3s ease-out' }}
            className={`fixed bottom-0 left-0 right-0 z-[101] rounded-t-[2.5rem] shadow-2xl h-[92vh] flex flex-col overflow-hidden ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-slate-50'}`}
          >
            
            <div 
              className={`pt-5 pb-3 px-4 shadow-sm z-10 shrink-0 touch-none cursor-grab active:cursor-grabbing ${isDarkMode ? 'bg-[#1c1c1e] border-b border-[#2c2c2e]' : 'bg-white border-b border-slate-100'}`}
              onTouchStart={handleModalTouchStart} onTouchMove={handleModalTouchMove} onTouchEnd={() => handleModalTouchEnd(() => setShowRankingModal(false))}
            >
              <div className="w-16 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-5"></div>
              <h2 className={`text-lg font-black flex items-center gap-2 mb-4 ${textMain}`}><Trophy className="w-5 h-5 text-amber-500" /> スタラン (Study Run)</h2>
              
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                {staruns.map((st) => (
                  <button 
                    key={st.id} 
                    onClick={() => { setSelectedStarunId(st.id); setIsCreatingStarun(false); }}
                    className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border flex items-center gap-1.5 shadow-sm active:scale-95 ${selectedStarunId === st.id && !isCreatingStarun ? 'bg-amber-500 text-white border-transparent' : (isDarkMode ? 'bg-[#2c2c2e] text-slate-300 border-[#38383a]' : 'bg-white text-slate-600 border-slate-200')}`}
                  >
                    <Flag className={`w-3.5 h-3.5 ${selectedStarunId === st.id && !isCreatingStarun ? 'text-white' : 'text-amber-500'}`} />
                    {st.name}
                  </button>
                ))}
                {isHost && (
                  <button 
                    onClick={() => setIsCreatingStarun(true)}
                    className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border border-dashed flex items-center gap-1 shadow-sm active:scale-95 ${isCreatingStarun ? 'bg-amber-500 text-white border-transparent' : (isDarkMode ? 'bg-transparent text-amber-500 border-amber-500/50' : 'bg-transparent text-amber-600 border-amber-300')}`}
                  >
                    <Plus className="w-3.5 h-3.5" /> 新規開催
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6">
              {isCreatingStarun ? (
                <div className={`p-6 rounded-[2rem] shadow-sm border ${bgCard}`}>
                  <h3 className={`text-base font-black mb-6 ${textMain}`}>新しいスタランを開催</h3>
                  <div className="space-y-4">
                    <div>
                      <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${textSub}`}>イベント名</label>
                      <input type="text" value={newStarunName} onChange={e => setNewStarunName(e.target.value)} placeholder="例：春の猛勉強カップ" className={`w-full p-4 rounded-2xl text-sm font-bold outline-none border transition-all ${isDarkMode ? 'bg-[#0a0a0a] border-[#38383a] text-white focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-amber-500'}`} />
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${textSub}`}>開始日</label>
                        <input type="date" value={newStarunStart} onChange={e => setNewStarunStart(e.target.value)} onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()} style={{ colorScheme: isDarkMode ? 'dark' : 'light' }} className={`w-full p-4 rounded-2xl text-sm font-bold outline-none border transition-all cursor-pointer ${isDarkMode ? 'bg-[#0a0a0a] border-[#38383a] text-white focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-amber-500'}`} />
                      </div>
                      <div className="flex-1">
                        <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${textSub}`}>終了日</label>
                        <input type="date" value={newStarunEnd} onChange={e => setNewStarunEnd(e.target.value)} onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()} style={{ colorScheme: isDarkMode ? 'dark' : 'light' }} className={`w-full p-4 rounded-2xl text-sm font-bold outline-none border transition-all cursor-pointer ${isDarkMode ? 'bg-[#0a0a0a] border-[#38383a] text-white focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-amber-500'}`} />
                      </div>
                    </div>
                    <button onClick={handleCreateStarun} className="w-full bg-amber-500 text-white mt-4 py-4 rounded-2xl font-black shadow-lg shadow-amber-500/20 active:scale-95 transition-all">開催する</button>
                  </div>
                </div>
              ) : staruns.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <Trophy className={`w-16 h-16 mb-4 opacity-50 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                  <p className={`text-lg font-black mb-2 ${textMain}`}>まだスタランがありません</p>
                  <p className={`text-sm font-bold mb-8 ${textSub}`}>ホストがイベントを作成すると、<br/>ここにランキングが表示されます。</p>
                  {isHost && <button onClick={() => setIsCreatingStarun(true)} className="bg-amber-500 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-amber-500/20 active:scale-95">最初のスタランを開催する</button>}
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className={`flex p-1.5 rounded-[1.5rem] mb-6 shrink-0 shadow-inner ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-slate-200/50'}`}>
                    <button onClick={() => setRankingTab('ranking')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 ${rankingTab === 'ranking' ? (isDarkMode ? 'bg-[#2c2c2e] text-amber-500 shadow-sm' : 'bg-white text-amber-600 shadow-sm') : 'text-slate-400 hover:text-slate-500'}`}>
                      <Trophy className="w-4 h-4" /> ランキング
                    </button>
                    <button onClick={() => setRankingTab('timeline')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 ${rankingTab === 'timeline' ? (isDarkMode ? 'bg-[#2c2c2e] text-amber-500 shadow-sm' : 'bg-white text-amber-600 shadow-sm') : 'text-slate-400 hover:text-slate-500'}`}>
                      <History className="w-4 h-4" /> タイムライン
                    </button>
                  </div>

                  <div className={`flex items-center justify-between p-3 rounded-xl mb-6 border ${bgCard}`}>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-500" />
                      <span className={`text-xs font-black ${textMain}`}>{selectedStarunData?.start_date.replace(/-/g, '/')} 〜 {selectedStarunData?.end_date.replace(/-/g, '/')}</span>
                    </div>
                    {isParticipating ? (
                      <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">参加中</span>
                    ) : (
                      <button onClick={handleJoinRanking} className="text-[10px] font-black text-white bg-amber-500 px-3 py-1.5 rounded-lg active:scale-95 shadow-sm">参加する</button>
                    )}
                  </div>

                  {!isParticipating ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                      <Trophy className={`w-12 h-12 mb-3 opacity-30 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} />
                      <p className={`text-sm font-bold ${textSub}`}>ランキングとタイムラインを見るには、<br/>右上の「参加する」ボタンを押してください。</p>
                    </div>
                  ) : isLogsLoading ? (
                    <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
                  ) : rankingTab === 'ranking' ? (
                    <div className="flex flex-col h-full overflow-hidden">
                      <div className="flex justify-center gap-2 mb-6 shrink-0">
                        <button onClick={() => setRankingPeriod('daily')} className={`px-4 py-2 rounded-xl text-xs font-black transition-colors ${rankingPeriod === 'daily' ? 'bg-amber-500 text-white shadow-sm' : (isDarkMode ? 'bg-[#2c2c2e] text-slate-400' : 'bg-white border text-slate-500')}`}>今日</button>
                        <button onClick={() => setRankingPeriod('weekly')} className={`px-4 py-2 rounded-xl text-xs font-black transition-colors ${rankingPeriod === 'weekly' ? 'bg-amber-500 text-white shadow-sm' : (isDarkMode ? 'bg-[#2c2c2e] text-slate-400' : 'bg-white border text-slate-500')}`}>今週</button>
                        <button onClick={() => setRankingPeriod('total')} className={`px-4 py-2 rounded-xl text-xs font-black transition-colors ${rankingPeriod === 'total' ? 'bg-amber-500 text-white shadow-sm' : (isDarkMode ? 'bg-[#2c2c2e] text-slate-400' : 'bg-white border text-slate-500')}`}>総合(全期間)</button>
                      </div>

                      <div className="space-y-3 pb-24">
                        {rankings.length === 0 ? (
                          <p className={`text-center text-sm font-bold py-10 ${textSub}`}>まだ記録がありません</p>
                        ) : (
                          rankings.map((rank, index) => {
                            const isTop3 = index < 3;
                            const badgeColors = ['bg-amber-400', 'bg-slate-300', 'bg-orange-400'];
                            return (
                              <div key={rank.id} className={`flex items-center p-4 rounded-[1.5rem] border ${isTop3 ? (isDarkMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200') : bgCard}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 mr-4 ${isTop3 ? badgeColors[index] + ' text-white shadow-md' : (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500')}`}>{index + 1}</div>
                                <AvatarImage url={rank.avatarUrl} name={rank.name} className="w-10 h-10 rounded-full shrink-0 mr-4 object-cover border shadow-sm" />
                                <div className="flex-1">
                                  <p className={`text-sm font-black line-clamp-1 ${textMain}`}>{rank.name} {rank.id === currentUser?.id && <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded ml-2">あなた</span>}</p>
                                  <p className={`text-xs font-bold mt-0.5 flex items-center gap-1 ${textSub}`}><Clock className="w-3 h-3"/> {Math.floor(rank.totalTime / 60)}h {rank.totalTime % 60}m</p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 pb-24">
                      {studyLogs.length === 0 ? (
                        <p className={`text-center text-sm font-bold py-10 ${textSub}`}>まだタイムラインがありません</p>
                      ) : (
                        studyLogs.map((log) => {
                          const timeAgo = (dateStr: string) => {
                            const mins = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 60000);
                            if (mins < 60) return `${mins}分前`;
                            if (mins < 1440) return `${Math.floor(mins / 60)}時間前`;
                            return `${Math.floor(mins / 1440)}日前`;
                          };
                          return (
                            <div key={log.id} className={`p-4 rounded-[1.5rem] border ${bgCard}`}>
                              <div className="flex items-center gap-3 mb-3">
                                <AvatarImage url={log.avatar_url} name={log.display_name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                                <div className="flex-1">
                                  <p className={`text-xs font-black ${textMain}`}>{log.display_name}</p>
                                  <p className="text-[10px] font-bold text-slate-400">{timeAgo(log.created_at)}</p>
                                </div>
                                <div className="px-2.5 py-1 bg-amber-500/10 text-amber-500 rounded-lg text-[10px] font-black flex items-center gap-1"><Flame className="w-3 h-3" /> {log.duration_minutes}m</div>
                              </div>
                              {log.materials?.title && (
                                <div className={`flex items-center gap-2 mb-2 text-[10px] font-bold px-3 py-2 rounded-xl w-fit max-w-full ${isDarkMode ? 'bg-[#1c1c1e] text-slate-300 border border-[#2c2c2e]' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                  {log.materials?.image_url ? (
                                    <img src={log.materials.image_url} alt="icon" className="w-4 h-5 object-cover rounded-sm shrink-0" />
                                  ) : (
                                    <BookOpen className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                  )}
                                  <span className="truncate">{log.materials.title}</span>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  );
}