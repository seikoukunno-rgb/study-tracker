import { createClient } from '../../../utils/supabase/server';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
// 🌟 画面の動き（タブや一覧）を担当する別ファイルを読み込む
import UserDetailClient from './UserDetailClient';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const resolvedParams = await params;
  const targetUserId = resolvedParams.id;

  // 1. 管理者チェック
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) redirect('/login');

  const { data: requesterProfile } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single();
  if (requesterProfile?.role !== 'admin') redirect('/');

  // 2. ユーザー情報取得
  const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', targetUserId).single();
  if (!userProfile) return <div className="p-8 text-white">ユーザーが見つかりませんでした。</div>;

  // 🌟 3. 学習記録の取得（※ここを正しいテーブル名に修正しました！）
  const { data: studyRecords, error: studyError } = await supabase
    .from('calendar_events') // ← study_records から calendar_events に修正
    .select('*')
    .eq('student_id', targetUserId) // ← user_id から student_id に修正
    .order('created_at', { ascending: false })
    .limit(30);

  // 4. 追加した教材の取得 (※仮のテーブル名 materials)
  const { data: materials, error: materialsError } = await supabase
    .from('materials')
    .select('*')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false })
    .limit(30);

  // 5. 所属ルームとメッセージの取得 (※仮のテーブル名 room_members, rooms, room_messages)
  const { data: roomMembers, error: roomError } = await supabase
    .from('room_members')
    .select('room_id')
    .eq('user_id', targetUserId);
    
  let roomsWithMessages: any[] = [];
  
  if (roomMembers && roomMembers.length > 0) {
    const roomIds = roomMembers.map(rm => rm.room_id);
    const { data: rooms } = await supabase.from('rooms').select('*').in('id', roomIds);
    
    if (rooms) {
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

  // 6. 取得したデータをすべてクライアントコンポーネント（UserDetailClient）に渡す
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
        materials={materials}
        materialsError={materialsError}
        roomsWithMessages={roomsWithMessages}
        roomError={roomError}
        targetUserId={targetUserId}
      />
    </div>
  );
}