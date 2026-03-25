"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase"; 
import { ChevronLeft, Send, Users, Loader2, Smile, Trash2, UserPlus, UserMinus } from "lucide-react";

export default function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const roomId = resolvedParams.id;

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [room, setRoom] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]); // DB上の全メンバー
  const [activeUsers, setActiveUsers] = useState<any[]>([]); // 現在開いている（オンライン）のメンバー
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showStamps, setShowStamps] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false); 
  const [follows, setFollows] = useState<string[]>([]); 

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

      // プロフィール取得
      const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url, nickname, name').eq('id', user.id).single();
      const myDisplayName = profile?.nickname || profile?.name || profile?.full_name || "ユーザー";
      setMyProfile({ ...profile, display_name: myDisplayName });

      // フォロー情報の取得
      const { data: followData } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
      if (followData) setFollows(followData.map(f => f.following_id));

      // ルーム情報と全メンバー取得 (リレーションを明示的に指定)
      const { data: groupData } = await supabase.from('groups').select('*').eq('id', roomId).single();
      const { data: membersData } = await supabase.from('group_members').select(`user_id, profiles ( full_name, name, nickname, avatar_url )`).eq('group_id', roomId);
      
      let currentMembers: any[] = membersData || [];
      const isMeInRoom = currentMembers.some(m => m.user_id === user.id);
      
      // 🌟 修正1: 「初めて」参加した1度目だけ、データベースにメッセージを記録する
      if (!isMeInRoom) {
        await supabase.from('group_members').insert([{ group_id: roomId, user_id: user.id }]);
        
        // 参加システムメッセージをDBに保存
        await supabase.from('messages').insert([{
          room_id: roomId,
          user_id: user.id,
          content: `${myDisplayName} が参加しました 👋`,
          is_system: true,
          is_stamp: false
        }]);

        currentMembers = [...currentMembers, { user_id: user.id, profiles: profile }];
      }

      // メッセージ取得
      const { data: msgs } = await supabase.from('messages').select(`*, profiles ( full_name, name, nickname, avatar_url )`).eq('room_id', roomId).order('created_at', { ascending: true });

      if (groupData) setRoom(groupData);
      setMembers(currentMembers);
      if (msgs) setMessages(msgs);
      setIsLoading(false);

      // Realtime Presence (オンライン検知)
      const channel = supabase.channel(`room-${roomId}`, {
        config: { presence: { key: user.id } }
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const newState = channel.presenceState();
          const onlineIds = Object.keys(newState);
          setActiveUsers(onlineIds);
        })
        // 🌟 修正2: 開くたびにメッセージが出る問題を防ぐため、presence の join イベントでのメッセージ追加を削除しました
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, async (p) => {
          if (p.new.user_id === user.id) return;
          const { data: userData } = await supabase.from('profiles').select('full_name, name, nickname, avatar_url').eq('id', p.new.user_id).single();
          setMessages(prev => {
            if (prev.some(m => m.id === p.new.id)) return prev;
            return [...prev, { ...p.new, profiles: userData }];
          });
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, (p) => {
          setMessages(prev => prev.filter(m => m.id !== p.old.id));
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ name: myDisplayName, online_at: new Date().toISOString() });
          }
        });

      return () => { supabase.removeChannel(channel); };
    };

    initRoom();
  }, [roomId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;
    const content = newMessage;
    setNewMessage(""); 
    setShowStamps(false);

    const { data: insertedMsg, error } = await supabase.from('messages').insert([{ 
      room_id: roomId,
      user_id: currentUser.id, 
      content, 
      is_stamp: false 
    }]).select().single();

    if (!error && insertedMsg) {
      setMessages(prev => [...prev, { ...insertedMsg, profiles: myProfile }]);
    }
  };

  const sendStamp = async (stamp: string) => {
    if (!currentUser) return;
    setShowStamps(false);
    const { data: insertedMsg, error } = await supabase.from('messages').insert([{ 
      room_id: roomId,
      user_id: currentUser.id, 
      content: stamp, 
      is_stamp: true 
    }]).select().single();

    if (!error && insertedMsg) {
      setMessages(prev => [...prev, { ...insertedMsg, profiles: myProfile }]);
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("送信を取り消しますか？")) return;
    setMessages(prev => prev.filter(m => m.id !== id));
    await supabase.from('messages').delete().eq('id', id);
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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showStamps]);

  const bgPage = isDarkMode ? "bg-[#0a0a0a] text-slate-100" : "bg-slate-50 text-slate-900";
  const bgHeader = isDarkMode ? "bg-[#1c1c1e] border-[#2c2c2e]" : "bg-white border-slate-100";
  const bgCard = isDarkMode ? "bg-[#2c2c2e] border-[#38383a]" : "bg-white border-slate-100";

  if (isLoading) return <div className={`h-[100dvh] w-full flex items-center justify-center ${bgPage}`}><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <div className={`flex flex-col h-[100dvh] w-full font-sans transition-colors duration-300 overflow-hidden ${bgPage}`}>
      
      <header className={`shrink-0 z-50 px-4 py-3 flex items-center justify-between border-b shadow-sm ${bgHeader}`}>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/rooms')} 
            className={`p-2.5 rounded-2xl transition-all flex items-center justify-center shrink-0 border shadow-sm active:scale-95 ${bgCard}`}
          >
            <ChevronLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-base font-black leading-tight line-clamp-1">{room?.name || "ルーム"}</h1>
            <p className="text-[10px] font-bold text-indigo-500 mt-0.5 tracking-wider">直近10件以降は3日で消滅します ⏳</p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowMembersModal(true)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border shadow-sm transition-all active:scale-95 ${bgCard}`}
        >
          <Users className={`w-4 h-4 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-500'}`} />
          <span className="text-xs font-black">{members.length}</span>
        </button>
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
          const displayName = m.profiles?.nickname || m.profiles?.name || m.profiles?.full_name || "ユーザー";
          
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
            type="text" 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)} 
            onFocus={() => setShowStamps(false)} 
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
              <h2 className={`text-lg font-black flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                <Users className="w-5 h-5 text-indigo-500" /> 参加メンバー
              </h2>
              <span className={`text-xs font-bold ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'} px-3 py-1 rounded-full`}>{members.length}人</span>
            </div>

            <div className="overflow-y-auto space-y-3 px-2 no-scrollbar">
              {members.map((member) => {
                const isMe = member.user_id === currentUser?.id;
                const isOnline = activeUsers.includes(member.user_id);
                const isFollowing = follows.includes(member.user_id);
                const displayName = member.profiles?.nickname || member.profiles?.name || member.profiles?.full_name || "ユーザー";

                return (
                  <div key={member.user_id} className={`flex items-center justify-between p-4 rounded-[1.5rem] border transition-colors ${isDarkMode ? 'bg-[#2c2c2e] border-[#38383a]' : 'bg-slate-50 border-slate-100'}`}>
                    <div 
                      className="flex items-center gap-4 cursor-pointer flex-1"
                      onClick={() => {
                        if (!isMe) router.push(`/user/${member.user_id}`);
                      }}
                    >
                      <div className="relative">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg overflow-hidden shrink-0 ${isDarkMode ? 'bg-[#1c1c1e] text-slate-300' : 'bg-white text-slate-600 border shadow-sm'}`}>
                          {member.profiles?.avatar_url ? (
                            <img src={member.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                          ) : displayName.charAt(0).toUpperCase()}
                        </div>
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
                      <button 
                        onClick={() => toggleFollow(member.user_id)}
                        className={`p-2.5 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-90 shadow-sm ${isFollowing ? (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500') : 'bg-indigo-600 text-white shadow-indigo-600/20'}`}
                      >
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

    </div>
  );
}