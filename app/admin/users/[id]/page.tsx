import { createClient } from '../../../utils/supabase/server';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import UserDetailClient from './UserDetailClient';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const resolvedParams = await params;
  const targetUserId = resolvedParams.id;

  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) redirect('/login');

  const { data: requesterProfile } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single();
  if (requesterProfile?.role !== 'admin') redirect('/');

  const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', targetUserId).single();
  if (!userProfile) return <div className="p-8 text-white">ユーザーが見つかりませんでした。</div>;

  // 1. 学習記録の取得 (study_records)
  const { data: studyRecords, error: studyError } = await supabase
    .from('study_records')
    .select('*')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false })
    .limit(30);

  // 2. カレンダー予定の取得 (calendar_events) 🌟新規追加
  const { data: calendarEvents, error: calendarError } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', targetUserId) // ※もしカラム名がstudent_idなら適宜変更してください
    .order('created_at', { ascending: false })
    .limit(30);

  // 3. 教材の取得 (materials)
  const { data: materials, error: materialsError } = await supabase
    .from('materials')
    .select('*')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false })
    .limit(30);

  // 4. グループ（旧ルーム）とメッセージの取得 (groups, group_members, messages) 🌟名前を修正
  const { data: groupMembers, error: groupError } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', targetUserId);
    
  let groupsWithMessages: any[] = [];
  
  if (groupMembers && groupMembers.length > 0) {
    const groupIds = groupMembers.map(gm => gm.group_id);
    const { data: groups } = await supabase.from('groups').select('*').in('id', groupIds);
    
    if (groups) {
      groupsWithMessages = await Promise.all(groups.map(async (group) => {
        const { data: messages } = await supabase
          .from('messages') // 🌟 messagesテーブルから取得
          .select('id, content, created_at, user_id, profiles(nickname)')
          .eq('group_id', group.id)
          .order('created_at', { ascending: false })
          .limit(20);
        return { ...group, messages: messages || [] };
      }));
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-20">
      <div className="mb-6">
        <a href="/admin" className="text-slate-500 hover:text-white flex items-center gap-2 text-sm font-bold transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> ダッシュボードに戻る
        </a>
      </div>

      <UserDetailClient 
        userProfile={userProfile}
        studyRecords={studyRecords}
        studyError={studyError}
        calendarEvents={calendarEvents}  // 🌟 新規追加
        calendarError={calendarError}    // 🌟 新規追加
        materials={materials}
        materialsError={materialsError}
        groupsWithMessages={groupsWithMessages} // 🌟 修正
        groupError={groupError}                 // 🌟 修正
        targetUserId={targetUserId}
      />
    </div>
  );
}