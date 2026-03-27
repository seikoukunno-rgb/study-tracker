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

  // 🌟 無敵のデータ取得関数（user_id が無ければ student_id を自動で探す）
  const fetchSafely = async (table: string) => {
    let res = await supabase.from(table).select('*').eq('user_id', targetUserId).order('created_at', { ascending: false }).limit(30);
    if (res.error && res.error.message.includes('does not exist')) {
      res = await supabase.from(table).select('*').eq('student_id', targetUserId).order('created_at', { ascending: false }).limit(30);
    }
    return res;
  };

  // 4つのテーブルから並行して安全にデータ取得
  const [logsRes, recordsRes, calRes, matRes] = await Promise.all([
    fetchSafely('study_logs'),
    fetchSafely('study_records'),
    fetchSafely('calendar_events'),
    fetchSafely('materials')
  ]);

  // study_logs と study_records のデータを合体
  const studyRecords = [...(logsRes.data || []), ...(recordsRes.data || [])];
  
  // エラー文言の整理
  let studyErrorMsg = null;
  if (logsRes.error && recordsRes.error) studyErrorMsg = `${logsRes.error.message} / ${recordsRes.error.message}`;

  // グループとメッセージ
  const { data: groupMembers, error: groupError } = await supabase.from('group_members').select('group_id').eq('user_id', targetUserId);
  let groupsWithMessages: any[] = [];
  
  if (groupMembers && groupMembers.length > 0) {
    const groupIds = groupMembers.map(gm => gm.group_id);
    const { data: groups } = await supabase.from('groups').select('*').in('id', groupIds);
    
    if (groups) {
      groupsWithMessages = await Promise.all(groups.map(async (group) => {
        const { data: messages, error: msgError } = await supabase
          .from('messages')
          .select('id, content, created_at, user_id') 
          .eq('group_id', group.id)
          .order('created_at', { ascending: false })
          .limit(20);
          
        return { 
          ...group, 
          messages: messages || [],
          msgError: msgError?.message
        };
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
        studyError={studyErrorMsg}
        calendarEvents={calRes.data}
        calendarError={calRes.error?.message}
        materials={matRes.data}
        materialsError={matRes.error?.message}
        groupsWithMessages={groupsWithMessages}
        groupError={groupError?.message}
        targetUserId={targetUserId}
      />
    </div>
  );
}