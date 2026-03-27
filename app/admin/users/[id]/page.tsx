import { createClient } from '../../../utils/supabase/server';
import { redirect } from 'next/navigation';
import { Shield, ArrowLeft, User, Target, BookOpen, Clock, Users, MessageSquare } from 'lucide-react';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const resolvedParams = await params;
  const targetUserId = resolvedParams.id;

  // 1. 【防衛ライン】アクセスしてきた本人が管理者かチェック
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) redirect('/login');

  const { data: requesterProfile } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single();
  if (requesterProfile?.role !== 'admin') redirect('/');

  // 2. ターゲットユーザー情報
  const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', targetUserId).single();
  if (!userProfile) return <div className="p-8 text-white">ユーザーが見つかりませんでした。</div>;

  // 3. 学習記録の取得 (study_records)
  const { data: studyRecords, error: studyError } = await supabase
    .from('study_records')
    .select('*')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false })
    .limit(30);

  // 4. 追加した教材の取得 (※テーブル名を materials と仮定)
  const { data: materials, error: materialsError } = await supabase
    .from('materials')
    .select('*')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false })
    .limit(30);

  // 5. 所属ルームとメッセージの取得 (※ room_members, rooms, room_messages と仮定)
  const { data: roomMembers, error: roomError } = await supabase
    .from('room_members')
    .select('room_id')
    .eq('user_id', targetUserId);
    
  let roomsWithMessages: any[] = [];
  
  if (roomMembers && roomMembers.length > 0) {
    const roomIds = roomMembers.map(rm => rm.room_id);
    const { data: rooms } = await supabase.from('rooms').select('*').in('id', roomIds);
    
    if (rooms) {
      // 各ルームの最新メッセージ20件を取得
      roomsWithMessages = await Promise.all(rooms.map(async (room) => {
        const { data: messages } = await supabase
          .from('room_messages')
          .select('id, content, created_at, user_id, profiles(nickname)')
          .eq('room_id', room.id)
          .order('created_at', { ascending: false })
          .limit(20);
        return { ...room, messages: messages || [] };
      }));
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto pb-20">
      <div className="mb-6">
        <a href="/admin" className="text-slate-500 hover:text-white flex items-center gap-2 text-sm font-bold transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> ダッシュボードに戻る
        </a>
      </div>

      {/* --- プロフィールヘッダー --- */}
      <div className="bg-white dark:bg-[#1c1c1e] p-8 rounded-3xl shadow-lg border border-slate-100 dark:border-[#2c2c2e] mb-8 flex items-start gap-6">
        <div className="w-24 h-24 rounded-2xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 shrink-0">
           <User className="w-12 h-12 text-slate-400" />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-1">
                {userProfile.nickname || '名前未設定'}
              </h1>
              <p className="text-xs font-mono text-slate-400 mb-2">ID: {userProfile.id}</p>
            </div>
            {userProfile.role === 'admin' && (
              <span className="px-3 py-1 bg-red-500/20 text-red-500 rounded-full text-xs font-black tracking-widest uppercase">
                ADMIN
              </span>
            )}
          </div>
          <div className="flex gap-4 mt-2">
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">合計利用: {userProfile.total_active_days || 0}日</span>
            <span className="text-sm font-bold text-orange-600 dark:text-orange-400">最大連続: {userProfile.max_consecutive_days || 0}日</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* ====================================
            左カラム：学習記録 ＆ 教材履歴
            ==================================== */}
        <div className="space-y-8">
          
          {/* --- 学習記録 --- */}
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" /> 学習記録 (最新30件)
            </h2>
            <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e] overflow-hidden">
              {studyError ? (
                <div className="p-4 text-xs text-red-500">学習記録テーブルが見つかりません。</div>
              ) : studyRecords && studyRecords.length > 0 ? (
                <ul className="divide-y divide-slate-100 dark:divide-[#2c2c2e] max-h-96 overflow-y-auto">
                  {studyRecords.map((record) => (
                    <li key={record.id} className="p-4 hover:bg-slate-50 dark:hover:bg-[#2c2c2e]/30">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1">{record.title}</p>
                        <span className="text-xs font-bold text-indigo-500">{record.duration_minutes || 0} 分</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {new Date(record.created_at).toLocaleString('ja-JP')}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-8 text-center text-slate-400 text-sm font-bold">記録がありません</div>
              )}
            </div>
          </div>

          {/* --- 追加した教材履歴 --- */}
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-500" /> 追加した教材履歴
            </h2>
            <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e] overflow-hidden">
              {materialsError ? (
                <div className="p-4 text-xs text-slate-500">※教材テーブル(materials)が存在しないか、まだデータがありません。</div>
              ) : materials && materials.length > 0 ? (
                <ul className="divide-y divide-slate-100 dark:divide-[#2c2c2e] max-h-96 overflow-y-auto">
                  {materials.map((mat) => (
                    <li key={mat.id} className="p-4 hover:bg-slate-50 dark:hover:bg-[#2c2c2e]/30">
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{mat.title || 'タイトルなし'}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-1">
                        {new Date(mat.created_at).toLocaleString('ja-JP')}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-8 text-center text-slate-400 text-sm font-bold">教材の追加履歴がありません</div>
              )}
            </div>
          </div>
        </div>

        {/* ====================================
            右カラム：所属グループ（ルーム）とチャットログ
            ==================================== */}
        <div>
          <h2 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-pink-500" /> 所属ルームと会話ログ (調査用)
          </h2>
          
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e] overflow-hidden p-2">
            {roomError ? (
              <div className="p-4 text-xs text-slate-500">※ルーム機能のテーブル(room_members等)が存在しないか構成が異なります。</div>
            ) : roomsWithMessages.length > 0 ? (
              <div className="space-y-2">
                {roomsWithMessages.map((room) => (
                  // 👇 details タグを使うことで、JSを使わずにクリック開閉できる
                  <details key={room.id} className="group bg-slate-50 dark:bg-[#2c2c2e]/30 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-[#38383a] transition-colors list-none">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="w-4 h-4 text-pink-500" />
                        <span className="font-bold text-sm text-slate-800 dark:text-white">{room.name || '名称未設定ルーム'}</span>
                      </div>
                      <span className="text-xs text-slate-400 group-open:hidden">タップして会話を表示 ▼</span>
                      <span className="text-xs text-slate-400 hidden group-open:block">閉じる ▲</span>
                    </summary>
                    
                    {/* ルーム内のチャットログ */}
                    <div className="p-4 border-t border-slate-100 dark:border-[#38383a] bg-white dark:bg-[#1c1c1e] max-h-[500px] overflow-y-auto flex flex-col-reverse gap-3">
                      {room.messages.length > 0 ? (
                        room.messages.map((msg: any) => {
                          const isTargetUser = msg.user_id === targetUserId;
                          return (
                            <div key={msg.id} className={`flex flex-col max-w-[85%] ${isTargetUser ? 'self-end items-end' : 'self-start items-start'}`}>
                              <span className="text-[10px] text-slate-400 mb-1">{msg.profiles?.nickname || '不明なユーザー'}</span>
                              <div className={`px-4 py-2 rounded-2xl text-sm ${isTargetUser ? 'bg-indigo-500 text-white rounded-br-sm' : 'bg-slate-100 dark:bg-[#2c2c2e] text-slate-800 dark:text-white rounded-bl-sm'}`}>
                                {msg.content}
                              </div>
                              <span className="text-[9px] text-slate-400 mt-1">{new Date(msg.created_at).toLocaleString('ja-JP')}</span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center text-xs text-slate-400 py-4">メッセージがありません</div>
                      )}
                    </div>
                    {/* 管理者は書き込めないという警告 */}
                    <div className="p-3 bg-slate-100 dark:bg-[#2c2c2e]/80 text-center text-xs text-slate-500 font-bold border-t border-slate-200 dark:border-[#38383a]">
                      🚨 調査モード（閲覧のみ・書き込み不可）
                    </div>
                  </details>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-sm font-bold">所属しているルームがありません</div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}