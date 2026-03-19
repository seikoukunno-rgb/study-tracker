"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase"; 
import { ChevronLeft, Send, Users, Loader2, Smile, Trash2 } from "lucide-react";

export default function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const roomId = resolvedParams.id;

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [room, setRoom] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showStamps, setShowStamps] = useState(false);
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

      const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single();
      setMyProfile(profile);

      const { data: groupData } = await supabase.from('groups').select('*').eq('id', roomId).single();
      const { data: membersData } = await supabase.from('group_members').select(`user_id, profiles:user_id ( full_name, avatar_url )`).eq('group_id', roomId);
      let currentMembers: any[] = membersData || [];

      const isMeInRoom = currentMembers.some(m => m.user_id === user.id);
      if (!isMeInRoom) {
        await supabase.from('group_members').insert([{ group_id: roomId, user_id: user.id }]);
        currentMembers = [...currentMembers, { user_id: user.id, profiles: profile }];
      }

      const { data: msgs } = await supabase.from('messages').select(`*, profiles:user_id ( full_name, avatar_url )`).eq('room_id', roomId).order('created_at', { ascending: true });

      if (groupData) setRoom(groupData);
      setMembers(currentMembers);
      if (msgs) setMessages(msgs);
      setIsLoading(false);
    };

    initRoom();

    const channel = supabase.channel(`room-${roomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, async (p) => {
        if (p.new.user_id === currentUser?.id) return;
        const { data: userData } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', p.new.user_id).single();
        setMessages(prev => {
          if (prev.some(m => m.id === p.new.id)) return prev;
          return [...prev, { ...p.new, profiles: userData }];
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, (p) => {
        setMessages(prev => prev.filter(m => m.id !== p.old.id));
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, currentUser?.id]);

  // メッセージ送信
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

  // スタンプ送信
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showStamps]);

  const bgPage = isDarkMode ? "bg-[#0a0a0a] text-slate-100" : "bg-slate-50 text-slate-900";

if (isLoading) return <div className={`h-[100dvh] w-full flex items-center justify-center ${bgPage}`}><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    // 🌟 外枠は固定せず、通常のページとして扱います
    <div className={`min-h-screen font-sans transition-colors duration-300 ${bgPage}`}>
      
      {/* 🌟 【改善1】ヘッダーを画面上部に完全固定（fixed top-0） */}
      <header className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between border-b ${isDarkMode ? 'bg-[#1c1c1e]/90 backdrop-blur-md border-[#2c2c2e]' : 'bg-white/90 backdrop-blur-md border-slate-100'}`}>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/rooms')} // 🌟 404エラー修正！ ('/room' → '/rooms')
            className={`p-2.5 rounded-full transition-colors flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-[#2c2c2e] text-white hover:bg-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-lg font-black leading-tight">{room?.name || "ルーム"}</h1>
            <p className="text-[10px] font-bold text-indigo-500">直近10件以降は3日で消滅します ⏳</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-400/10 border border-slate-400/20">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-black text-slate-500">{members.length}</span>
        </div>
      </header>

      {/* 🌟 【改善2】メッセージエリア（上下の固定要素に隠れないように pt と pb で余白を作る） */}
      <div ref={scrollRef} className="pt-24 pb-[160px] px-4 space-y-6 overflow-y-auto">
        {messages.map((m) => {
          const isMine = m.user_id === currentUser?.id;
          return (
            <div key={m.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] font-bold text-slate-400 mb-1.5 px-2">{m.profiles?.full_name}</span>
              <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                {m.is_stamp ? (
                  <div className="text-6xl py-1 filter drop-shadow-sm animate-in zoom-in duration-300">{m.content}</div>
                ) : (
                  <div className={`max-w-[260px] p-3.5 rounded-2xl text-sm font-bold shadow-sm break-words whitespace-pre-wrap leading-relaxed ${isMine ? 'bg-indigo-600 text-white rounded-tr-none' : (isDarkMode ? 'bg-[#2c2c2e] text-white border border-[#38383a]' : 'bg-white text-slate-800 border border-slate-100') + ' rounded-tl-none'}`}>
                    {m.content}
                  </div>
                )}
                {isMine && <button onClick={() => deleteMessage(m.id)} className="p-1 text-slate-300 hover:text-rose-500 transition-colors mb-1 shrink-0"><Trash2 className="w-4 h-4" /></button>}
              </div>
            </div>
          );
        })}
      </div>

      {/* 🌟 【改善3】入力フォームを画面下部に完全固定（bottom-[72px] で下のメニューバーを避ける） */}
      <div className={`fixed bottom-[72px] left-0 right-0 z-50 flex flex-col border-t shadow-[0_-10px_20px_rgba(0,0,0,0.03)] ${isDarkMode ? 'bg-[#1c1c1e] border-[#2c2c2e]' : 'bg-white border-slate-100'}`}>
        {showStamps && (
          <div className="p-4 border-b flex gap-5 overflow-x-auto no-scrollbar bg-slate-50/50 dark:bg-black/20 w-full">
            {stampList.map(s => <button key={s} onClick={() => sendStamp(s)} className="text-4xl hover:scale-125 transition-transform shrink-0">{s}</button>)}
          </div>
        )}
        <form onSubmit={sendMessage} className="p-3 flex items-center gap-2 w-full">
          <button type="button" onClick={() => setShowStamps(!showStamps)} className={`p-3 rounded-xl transition-all shrink-0 ${showStamps ? 'bg-indigo-100 text-indigo-600 scale-110' : 'text-slate-400 hover:bg-slate-100'}`}><Smile className="w-6 h-6" /></button>
          <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onFocus={() => setShowStamps(false)} placeholder="メッセージを入力..." className={`flex-1 min-w-0 p-3.5 rounded-2xl text-sm font-bold outline-none border-2 focus:border-indigo-500 transition-all ${isDarkMode ? 'bg-[#2c2c2e] border-transparent' : 'bg-slate-50 border-transparent'}`} />
          <button type="submit" disabled={!newMessage.trim()} className="bg-indigo-600 text-white p-3.5 rounded-2xl active:scale-90 transition-all disabled:opacity-30 shadow-lg shadow-indigo-600/20 shrink-0"><Send className="w-5 h-5" /></button>
        </form>
      </div>

    </div>
  );
}