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

  // 🌟 新規追加：フォローとフォロワーの取得（カラム名のブレを防ぐ安全設計）
  let followersRes = await supabase.from('follows').select('*').eq('following_id', targetUserId);
  if (followersRes.error) followersRes = await supabase.from('follows').select('*').eq('followed_id', targetUserId);
  
  let followingRes = await supabase.from('follows').select('*').eq('follower_id', targetUserId);
  if (followingRes.error) followingRes = await supabase.from('follows').select('*').eq('user_id', targetUserId);

  const followerIds = (followersRes.data || []).map(f => f.follower_id || f.user_id).filter(Boolean);
  const followingIds = (followingRes.data || []).map(f => f.following_id || f.followed_id || f.target_id).filter(Boolean);

  const { data: followerProfiles } = await supabase.from('profiles').select('id, nickname').in('id', followerIds.length > 0 ? followerIds : ['dummy']);
  const { data: followingProfiles } = await supabase.from('profiles').select('id, nickname').in('id', followingIds.length > 0 ? followingIds : ['dummy']);

  const followers = followerIds.map(id => followerProfiles?.find(p => p.id === id) || { id, nickname: '不明なユーザー' });
  const following = followingIds.map(id => followingProfiles?.find(p => p.id === id) || { id, nickname: '不明なユーザー' });


  // 🌟 修正：グループ、メンバー、メッセージの取得
  const { data: groupMembers } = await supabase.from('group_members').select('group_id, user_id').eq('user_id', targetUserId);
  let groupsWithMessages: any[] = [];
  
  if (groupMembers && groupMembers.length > 0) {
    const groupIds = groupMembers.map(gm => gm.group_id);
    const { data: groups } = await supabase.from('groups').select('*').in('id', groupIds);
    
    // グループの全メンバーIDを一括取得
    const { data: allMembersData } = await supabase.from('group_members').select('*').in('group_id', groupIds);
    const allMemberUserIds = [...new Set((allMembersData || []).map(m => m.user_id).filter(Boolean))];
    const { data: allMemberProfiles } = await supabase.from('profiles').select('id, nickname').in('id', allMemberUserIds.length > 0 ? allMemberUserIds : ['dummy']);

    if (groups) {
      groupsWithMessages = await Promise.all(groups.map(async (group) => {
        let messagesData: any[] = [];
        let msgErrorMessage: string | undefined | null = null;

        const primaryMsgRes = await supabase.from('messages').select('id, content, created_at, user_id, profiles(nickname)').eq('room_id', group.id).order('created_at', { ascending: false }).limit(30);
        
        if (primaryMsgRes.error) {
          const fallbackMsgRes = await supabase.from('messages').select('id, content, created_at, user_id').eq('room_id', group.id).order('created_at', { ascending: false }).limit(30);
          messagesData = fallbackMsgRes.data || [];
          msgErrorMessage = fallbackMsgRes.error?.message || primaryMsgRes.error.message;
        } else {
          messagesData = primaryMsgRes.data || [];
        }

        // このグループのメンバーを割り当て
        const membersOfThisGroup = (allMembersData || [])
          .filter(m => m.group_id === group.id)
          .map(m => ({
            ...m,
            profiles: allMemberProfiles?.find(p => p.id === m.user_id) || { nickname: 'ユーザー' }
          }));

        return { 
          ...group, 
          messages: messagesData,
          msgError: msgErrorMessage,
          members: membersOfThisGroup // 🌟 追加
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
        followers={followers} // 🌟 追加
        following={following} // 🌟 追加
        targetUserId={targetUserId}
      />
    </div>
  );
}