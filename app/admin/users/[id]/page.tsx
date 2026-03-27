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
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single();
  if (profile?.role !== 'admin') redirect('/');

  const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', targetUserId).single();
  if (!userProfile) return <div className="p-8 text-white">ユーザーが見つかりませんでした。</div>;

  // 🌟 改良：教材名を取得するために materials テーブルと結合して取得
  const fetchStudyData = async (table: string) => {
    // まず普通に取得（materialsテーブルとの結合を試みる）
    let res = await supabase
      .from(table)
      .select('*, materials(name, title)') // 🌟 教材テーブルから名前を結合
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(50);

    // user_id がない場合は student_id で再試行
    if (res.error && res.error.message.includes('user_id')) {
      res = await supabase
        .from(table)
        .select('*, materials(name, title)')
        .eq('student_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(50);
    }
    return res;
  };

  const [logsRes, recordsRes, calRes, matRes] = await Promise.all([
    fetchStudyData('study_logs'),
    fetchStudyData('study_records'),
    supabase.from('calendar_events').select('*').eq('student_id', targetUserId).order('created_at', { ascending: false }),
    supabase.from('materials').select('*').eq('user_id', targetUserId)
  ]);

  const studyRecords = [...(logsRes.data || []), ...(recordsRes.data || [])];

  // グループ情報の取得
  const { data: groupMembers } = await supabase.from('group_members').select('group_id').eq('user_id', targetUserId);
  let groupsWithMessages: any[] = [];
  if (groupMembers && groupMembers.length > 0) {
    const { data: groups } = await supabase.from('groups').select('*').in('id', groupMembers.map(gm => gm.group_id));
    groupsWithMessages = groups || [];
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-20">
      <div className="mb-6">
        <a href="/admin" className="text-slate-500 hover:text-white flex items-center gap-2 text-sm font-bold transition-colors w-fit"><ArrowLeft className="w-4 h-4" /> 戻る</a>
      </div>
      <UserDetailClient 
        userProfile={userProfile}
        studyRecords={studyRecords}
        calendarEvents={calRes.data}
        materials={matRes.data}
        groupsWithMessages={groupsWithMessages}
        targetUserId={targetUserId}
      />
    </div>
  );
}