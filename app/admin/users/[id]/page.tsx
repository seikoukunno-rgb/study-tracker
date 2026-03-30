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

  // 安全なデータ取得関数
  const fetchSafely = async (table: string) => {
    let res = await supabase.from(table).select('*').eq('student_id', targetUserId).order('created_at', { ascending: false }).limit(50);
    if (res.error && res.error.message.includes('does not exist')) {
      res = await supabase.from(table).select('*').eq('user_id', targetUserId).order('created_at', { ascending: false }).limit(50);
    }
    return res;
  };

  const [logsRes, recordsRes, calRes, matRes] = await Promise.all([
    fetchSafely('study_logs'),
    fetchSafely('study_records'),
    fetchSafely('calendar_events'),
    fetchSafely('materials')
  ]);

  const studyRecords = [...(logsRes.data || []), ...(recordsRes.data || [])];
  const materials = matRes.data || [];

  // グループとメッセージの取得
  const { data: groupMembers } = await supabase.from('group_members').select('group_id').eq('user_id', targetUserId);
  let groupsWithMessages: any[] = [];
  
  if (groupMembers && groupMembers.length > 0) {
    const { data: groups } = await supabase.from('groups').select('*').in('id', groupMembers.map(gm => gm.group_id));
    
    if (groups) {
      groupsWithMessages = await Promise.all(groups.map(async (group) => {
        
        // 🌟 修正：TypeScriptエラーを避けるため、変数を分けて定義
        let messagesData: any[] = [];
        let msgErrorMessage: string | undefined | null = null;

        // 1. プロフィール名付きで取得を試みる
        const primaryMsgRes = await supabase.from('messages').select('id, content, created_at, user_id, profiles(nickname)').eq('group_id', group.id).order('created_at', { ascending: false }).limit(30);
        
        if (primaryMsgRes.error) {
          // 2. エラーが起きたら、シンプルな取得に切り替える（フォールバック）
          const fallbackMsgRes = await supabase.from('messages').select('id, content, created_at, user_id').eq('group_id', group.id).order('created_at', { ascending: false }).limit(30);
          messagesData = fallbackMsgRes.data || [];
          msgErrorMessage = fallbackMsgRes.error?.message || primaryMsgRes.error.message;
        } else {
          // 3. 成功したらそのまま使う
          messagesData = primaryMsgRes.data || [];
        }

        return { 
          ...group, 
          messages: messagesData,
          msgError: msgErrorMessage
        };
      }));
    }
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
        materials={materials}
        groupsWithMessages={groupsWithMessages}
        targetUserId={targetUserId}
      />
    </div>
  );
}