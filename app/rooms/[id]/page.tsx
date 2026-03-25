"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase"; 
import { ChevronLeft, Send, Users, Loader2, Smile, Trash2, UserPlus, UserMinus, Trophy, Clock, Flame, History, BookOpen, LogOut } from "lucide-react";

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

  const [showRankingModal, setShowRankingModal] = useState(false);
  const [rankingTab, setRankingTab] = useState<'ranking' | 'timeline'>('ranking');
  const [rankingPeriod, setRankingPeriod] = useState<'daily' | 'weekly'>('daily');
  const [studyLogs, setStudyLogs] = useState<any[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const stampList = ["👍", "🔥", "🎉", "👀", "🚀", "🙏", "💯", "✅", "💡", "😭"];

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
      const { data: membersData } = await supabase.from('group_members').select('user_id').eq('group_id', roomId);
      const { data: msgsData } = await supabase.from('messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true });

      let currentMemberIds = membersData ? membersData.map(m => m.user_id) : [];
      let currentMsgsData = msgsData || [];

      const { data: myProf } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      const myDisplayName = myProf?.nickname || myProf?.name || myProf?.full_name || "ユーザー";
      setMyProfile({ ...myProf, display_name: myDisplayName });

      if (!currentMemberIds.includes(user.id)) {
        await supabase.from('group_members').insert([{ group_id: roomId, user_id: user.id }]);
        currentMemberIds.push(user.id);
        
        await supabase.from('messages').insert([{
          room_id: roomId,
          user_id: user.id,
          content: `${myDisplayName} が参加しました 👋`,
          is_system: true,
          is_stamp: false
        }]);

        const { data: newMsgsData } = await supabase.from('messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true });
        if (newMsgsData) {
          currentMsgsData = newMsgsData;
        }
      }

      const allUserIds = Array.from(new Set([...currentMemberIds, ...currentMsgsData.map(m => m.user_id)]));
      const { data: profilesData } = await supabase.from('profiles').select('*').in('id', allUserIds);

      const profileMap: Record<string, any> = {};
      if (profilesData) {
        profilesData.forEach(p => {
          profileMap[p.id] = { ...p, display_name: p.nickname || p.name || p.full_name || "ユーザー" };
        });
      }

      const finalMembers = currentMemberIds.map(id => ({ user_id: id, profiles: profileMap[id] || { display_name: "ユーザー" } }));
      const finalMessages = currentMsgsData.map(m => ({ ...m, profiles: profileMap[m.user_id] || { display_name: "ユーザー" } }));

      if (groupData) setRoom(groupData);
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

  const fetchStudyLogs = async () => {
    setIsLogsLoading(true);
    const memberIds = members.map(m => m.user_id);
    if (memberIds.length === 0) { setIsLogsLoading(false); return; }

    const { data: logsData } = await supabase
      .from('study_logs')
      .select(`
        id, student_id, material_id, duration_minutes, thoughts, studied_at, created_at,
        profiles:student_id (nickname, name, full_name, avatar_url),
        materials:material_id (title)
      `)
      .in('student_id', memberIds)
      .order('created_at', { ascending: false })
      .limit(100);

    if (logsData) {
      const formattedLogs = logsData.map((log: any) => ({
        ...log,
        display_name: log.profiles?.nickname || log.profiles?.name || log.profiles?.full_name || "ユーザー",
        avatar_url: log.profiles?.avatar_url
      }));
      setStudyLogs(formattedLogs);
    }
    setIsLogsLoading(false);
  };

  useEffect(() => {
    if (showRankingModal) fetchStudyLogs();
  }, [showRankingModal]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;
    const content = newMessage;
    setNewMessage(""); setShowStamps(false);
    const { data: insertedMsg, error } = await supabase.from('messages').insert([{ room_id: roomId, user_id: currentUser.id, content, is_stamp: false }]).select().single();
    if (!error && insertedMsg) setMessages(prev => [...prev, { ...insertedMsg, profiles: myProfile }]);
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
    await supabase.from('messages').delete().eq('id', id);
  };

  // 🌟 ルームの退出・削除処理
  const handleLeaveOrDeleteRoom = async () => {
    if (!room || !currentUser) return;
    
    // 自分自身が作成者かどうかを判定
    const isHost = room.created_by === currentUser.id;
    const confirmMessage = isHost 
      ? "⚠️ あなたが作成したルームです。\n本当に「ルームごと削除」しますか？\n（参加者やメッセージも全て消去されます）"
      : "このルームから「退出」しますか？";

    if (!window.confirm(confirmMessage)) return;

    if (isHost) {
      // ルームごと削除 (DB側で CASCADE 設定があれば連動して消えます)
      const { error } = await supabase.from('groups').delete().eq('id', roomId);
      if (error) {
        alert("削除に失敗しました: " + error.message);
        return;
      }
    } else {
      // 自分だけ退出する
      const { error } = await supabase.from('group_members').delete().eq('group_id', roomId).eq('user_id', currentUser.id);
      if (error) {
        alert("退室に失敗しました: " + error.message);
        return;
      }
      
      // 退室メッセージを残す
      await supabase.from('messages').insert([{
        room_id: roomId,
        user_id: currentUser.id,
        content: `${myProfile?.display_name} が退室しました 🏃💨`,
        is_system: true,
        is_stamp: false
      }]);
    }

    router.push('/rooms');
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

  const AvatarImage = ({ url, name, className }: { url: string | null, name: string, className: string }) => {
    const [imgError, setImgError] = useState(false);
    const isBgClass = url?.startsWith('bg-');
    
    if (url && !isBgClass && !imgError) {
      return <img src={url} alt={name} className={className} onError={() => setImgError(true)} />;
    }
    return (
      <div className={`${className} flex items-center justify-center font-black ${isBgClass ? url : (isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-500')}`}>
        {name.charAt(0).toUpperCase()}
      </div>
    );
  };

  const getRankings = () => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const aggregated: Record<string, { totalTime: number, name: string, avatarUrl: string | null, id: string }> = {};

    studyLogs.forEach(log => {
      const isTarget = rankingPeriod === 'daily' ? log.studied_at === todayStr : new Date(log.created_at) >= weekAgo;
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

  if (isLoading) return <div className={`h-[100dvh] w-full flex items-center justify-center ${bgPage}`}><Loader2 className="animate-spin text-indigo-500" /></div>;

  const rankings = getRankings();

  return (
    <div className={`flex flex-col h-[100dvh] w-full font-sans transition-colors duration-300 overflow-hidden ${bgPage}`}>
      
      <header className={`shrink-0 z-50 px-4 py-3 flex items-center justify-between border-b shadow-sm ${bgHeader}`}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/rooms')} className={`p-2.5 rounded-2xl transition-all flex items-center justify-center shrink-0 border shadow-sm active:scale-95 ${bgCard}`}>
            <ChevronLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-base font-black leading-tight line-clamp-1">{room?.name || "ルーム"}</h1>
            <p className="text-[10px] font-bold text-indigo-500 mt-0.5 tracking-wider">直近10件以降は3日で消滅します ⏳</p>
          </div>
        </div>
        
        {/* 🌟 退出・削除ボタンを追加 */}
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowRankingModal(true)} className={`p-2.5 rounded-xl border shadow-sm transition-all active:scale-95 ${isDarkMode ? 'bg-[#2c2c2e] border-[#38383a] text-amber-500' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
            <Trophy className="w-5 h-5" />
          </button>
          <button onClick={() => setShowMembersModal(true)} className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border shadow-sm transition-all active:scale-95 ${bgCard}`}>
            <Users className={`w-4 h-4 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-500'}`} />
            <span className="text-xs font-black">{members.length}</span>
          </button>
          <button onClick={handleLeaveOrDeleteRoom} className={`p-2.5 rounded-xl border shadow-sm transition-all active:scale-95 text-rose-500 ${isDarkMode ? 'bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20' : 'bg-rose-50 border-rose-100 hover:bg-rose-100'}`}>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

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
              <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                {m.is_stamp ? (
                  <div className="text-6xl py-1 filter drop-shadow-sm">{m.content}</div>
                ) : (
                  <div className={`max-w-[260px] p-4 rounded-[1.5rem] text-sm font-bold shadow-sm break-words whitespace-pre-wrap leading-relaxed ${isMine ? 'bg-indigo-600 text-white rounded-tr-sm' : (isDarkMode ? 'bg-[#1c1c1e] text-white border border-[#2c2c2e]' : 'bg-white text-slate-800 border border-slate-100') + ' rounded-tl-sm'}`}>
                    {m.content}
                  </div>
                )}
                {isMine && <button onClick={() => deleteMessage(m.id)} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors mb-1 shrink-0 bg-transparent rounded-full active:bg-rose-500/10"><Trash2 className="w-4 h-4" /></button>}
              </div>
            </div>
          );
        })}
      </div>

      <div className={`shrink-0 z-50 flex flex-col border-t shadow-[0_-10px_30px_rgba(0,0,0,0.05)] ${bgHeader}`}>
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

      {showMembersModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] animate-in fade-in duration-200" onClick={() => setShowMembersModal(false)}></div>
          <div className={`fixed bottom-0 left-0 right-0 z-[101] rounded-t-[2.5rem] p-6 pb-12 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-white'}`}>
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-6 shrink-0"></div>
            <div className="flex justify-between items-center mb-6 shrink-0 px-2">
              <h2 className={`text-lg font-black flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}><Users className="w-5 h-5 text-indigo-500" /> 参加メンバー</h2>
              <span className={`text-xs font-bold ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'} px-3 py-1 rounded-full`}>{members.length}人</span>
            </div>

            <div className="overflow-y-auto space-y-3 px-2 no-scrollbar">
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
                        <span className={`text-sm font-black line-clamp-1 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                          {displayName} {isMe && <span className="text-[10px] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded ml-2">あなた</span>}
                        </span>
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

      {showRankingModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] animate-in fade-in duration-200" onClick={() => setShowRankingModal(false)}></div>
          <div className={`fixed bottom-0 left-0 right-0 z-[101] rounded-t-[2.5rem] p-6 pb-12 shadow-2xl animate-in slide-in-from-bottom duration-300 h-[85vh] flex flex-col ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-white'}`}>
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-6 shrink-0"></div>
            
            <div className={`flex p-1.5 rounded-2xl mb-6 shrink-0 ${isDarkMode ? 'bg-[#2c2c2e]' : 'bg-slate-100'}`}>
              <button onClick={() => setRankingTab('ranking')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 ${rankingTab === 'ranking' ? (isDarkMode ? 'bg-[#1c1c1e] text-amber-500 shadow-sm' : 'bg-white text-amber-600 shadow-sm') : 'text-slate-400 hover:text-slate-500'}`}>
                <Trophy className="w-4 h-4" /> ランキング
              </button>
              <button onClick={() => setRankingTab('timeline')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 ${rankingTab === 'timeline' ? (isDarkMode ? 'bg-[#1c1c1e] text-indigo-400 shadow-sm' : 'bg-white text-indigo-600 shadow-sm') : 'text-slate-400 hover:text-slate-500'}`}>
                <History className="w-4 h-4" /> タイムライン
              </button>
            </div>

            {isLogsLoading ? (
              <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
            ) : rankingTab === 'ranking' ? (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="flex justify-center gap-4 mb-6 shrink-0">
                  <button onClick={() => setRankingPeriod('daily')} className={`px-5 py-2 rounded-full text-xs font-black transition-colors ${rankingPeriod === 'daily' ? 'bg-indigo-600 text-white' : (isDarkMode ? 'bg-[#2c2c2e] text-slate-400' : 'bg-slate-100 text-slate-500')}`}>今日</button>
                  <button onClick={() => setRankingPeriod('weekly')} className={`px-5 py-2 rounded-full text-xs font-black transition-colors ${rankingPeriod === 'weekly' ? 'bg-indigo-600 text-white' : (isDarkMode ? 'bg-[#2c2c2e] text-slate-400' : 'bg-slate-100 text-slate-500')}`}>直近7日間</button>
                </div>

                <div className="overflow-y-auto space-y-3 px-2 pb-4 no-scrollbar">
                  {rankings.length === 0 ? (
                    <p className="text-center text-sm font-bold text-slate-400 py-10">まだ学習記録がありません</p>
                  ) : (
                    rankings.map((rank, index) => {
                      const isTop3 = index < 3;
                      const badgeColors = ['bg-amber-400', 'bg-slate-300', 'bg-orange-400'];
                      return (
                        <div key={rank.id} className={`flex items-center p-4 rounded-[1.5rem] border ${isTop3 ? (isDarkMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200') : bgCard}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 mr-4 ${isTop3 ? badgeColors[index] + ' text-white shadow-md' : (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500')}`}>
                            {index + 1}
                          </div>
                          <AvatarImage url={rank.avatarUrl} name={rank.name} className="w-10 h-10 rounded-full shrink-0 mr-4 object-cover border shadow-sm" />
                          <div className="flex-1">
                            <p className={`text-sm font-black line-clamp-1 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{rank.name}</p>
                            <p className={`text-xs font-bold mt-0.5 flex items-center gap-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}><Clock className="w-3 h-3"/> {Math.floor(rank.totalTime / 60)}h {rank.totalTime % 60}m</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto space-y-4 px-2 pb-4 no-scrollbar">
                {studyLogs.length === 0 ? (
                  <p className="text-center text-sm font-bold text-slate-400 py-10">まだ学習記録がありません</p>
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
                            <p className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{log.display_name}</p>
                            <p className="text-[10px] font-bold text-slate-400">{timeAgo(log.created_at)}</p>
                          </div>
                          <div className="px-2.5 py-1 bg-indigo-500/10 text-indigo-500 rounded-lg text-[10px] font-black flex items-center gap-1">
                            <Flame className="w-3 h-3" /> {log.duration_minutes}m
                          </div>
                        </div>
                        {log.materials?.title && (
                          <div className="flex items-center gap-1.5 mb-2 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg w-fit max-w-full">
                            <BookOpen className="w-3 h-3 shrink-0" />
                            <span className="truncate">{log.materials.title}</span>
                          </div>
                        )}
                        {log.thoughts && (
                          <p className={`text-sm font-bold leading-relaxed whitespace-pre-wrap ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            {log.thoughts}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
}