import { createClient } from '../../../utils/supabase/server';
import { redirect } from 'next/navigation';
import { ArrowLeft, MessageSquare, ShieldAlert } from 'lucide-react';

export default async function GroupChatPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const resolvedParams = await params;
  const groupId = resolvedParams.id;

  // 管理者チェック
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/');

  // グループ情報の取得
  const { data: group } = await supabase.from('groups').select('*').eq('id', groupId).single();
  
  // メッセージ履歴の取得（profilesと結合して名前も出す）
  const { data: messages } = await supabase
    .from('messages')
    .select('*, profiles(nickname)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <a href="/admin" className="text-slate-500 hover:text-indigo-500 flex items-center gap-2 text-sm font-bold mb-6 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> 管理画面へ戻る
        </a>

        <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl shadow-xl border border-slate-100 dark:border-[#2c2c2e] overflow-hidden flex flex-col h-[80vh]">
          {/* ヘッダー */}
          <div className="p-6 border-b border-slate-100 dark:border-[#2c2c2e] bg-slate-50/50 dark:bg-[#2c2c2e]/20 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-pink-500/10 rounded-2xl text-pink-500"><MessageSquare className="w-6 h-6" /></div>
              <div>
                <h1 className="text-xl font-black text-slate-800 dark:text-white">{group?.name || 'グループチャット'}</h1>
                <p className="text-xs text-slate-400 font-mono italic">Group ID: {groupId}</p>
              </div>
            </div>
            <div className="px-4 py-1.5 bg-amber-500/10 text-amber-500 rounded-full text-[10px] font-black tracking-tighter flex items-center gap-2">
              <ShieldAlert className="w-3 h-3" /> 調査モード (閲覧専用)
            </div>
          </div>

          {/* チャットエリア */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 dark:bg-transparent">
            {messages && messages.length > 0 ? (
              messages.map((msg: any) => (
                <div key={msg.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-500 dark:text-slate-400">{msg.profiles?.nickname || '不明なユーザー'}</span>
                    <span className="text-[9px] text-slate-300 font-mono">{new Date(msg.created_at).toLocaleString()}</span>
                  </div>
                  <div className="max-w-[80%] px-4 py-3 bg-white dark:bg-[#2c2c2e] border border-slate-100 dark:border-[#38383a] rounded-2xl rounded-tl-none shadow-sm text-sm text-slate-700 dark:text-slate-200">
                    {msg.content}
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 font-bold text-sm">メッセージ履歴がありません</div>
            )}
          </div>
          
          <div className="p-4 bg-slate-100 dark:bg-[#151515] text-center text-[10px] text-slate-400 font-bold border-t border-slate-200 dark:border-[#2c2c2e]">
            ※管理者権限により全てのメッセージを表示しています。送信はできません。
          </div>
        </div>
      </div>
    </div>
  );
}