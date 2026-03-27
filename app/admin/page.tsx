import { createClient } from '../utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminPage() {
  const supabase = await createClient(); // 🌟 ここに await を追加！
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login'); // 未ログインならログイン画面へ

  // 2. アクセス制御（バックエンドの要！）
  // プロフィールから role を取得し、'admin' じゃなければ追い出す
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    // 管理者ではないので、トップページ（/）へ強制送還
    redirect('/'); 
  }

  // --- ここから下は管理者しか絶対に見られない領域 ---
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-red-600">🛡️ 管理者ダッシュボード</h1>
      <p className="mb-4">ここは管理者（role: admin）専用のページです。</p>
      
      <div className="bg-white p-6 shadow rounded-lg">
        {/* ここに今後、ユーザー一覧やKPIグラフを追加していきます */}
        <p>現在、機能を作成中です...</p>
        <Link href="/" className="text-blue-500 hover:underline mt-4 inline-block">
          アプリに戻る
        </Link>
      </div>
    </div>
  );
}