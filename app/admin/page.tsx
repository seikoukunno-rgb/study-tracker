import { createClient } from '../utils/supabase/server';
import { redirect } from 'next/navigation';
import { toggleAdminRole } from '../actions/admin';
import { Activity } from 'lucide-react';
// 🌟 クライアントコンポーネント（動く画面）を読み込む
import DashboardClient from './DashboardClient'; 

export default async function AdminPage() {
  const supabase = await createClient();
  
  // 1. 権限チェック
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/');

  // 2. 📅 日付の準備
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const firstDayOfMonthStr = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
  
  // 3. 📊 データの取得（並行処理）
  const [
    { data: allUsers },
    { count: totalUsers },
    { count: newUsersToday },
    { count: dauCount },
    { data: mauData },
    { data: todayStudyRecords },
    { data: recentLogs }
  ] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', `${todayStr}T00:00:00Z`),
    supabase.from('activity_logs').select('*', { count: 'exact', head: true }).eq('active_date', todayStr),
    supabase.from('activity_logs').select('user_id').gte('active_date', firstDayOfMonthStr),
    supabase.from('study_records').select('duration_minutes').gte('created_at', `${todayStr}T00:00:00Z`),
    supabase.from('activity_logs').select('active_date, user_id').gte('active_date', thirtyDaysAgoStr) // グラフ用データ
  ]);

  // 4. 🧮 KPIの計算
  const uniqueMauSet = new Set(mauData?.map(log => log.user_id));
  const mauCount = uniqueMauSet.size;
  const totalStudyMinutesToday = todayStudyRecords?.reduce((sum, record) => sum + (record.duration_minutes || 0), 0) || 0;
  const totalStudyRecordsToday = todayStudyRecords?.length || 0;

  // 5. 📈 グラフ用データの生成（過去30日分）
  const chartDataMap: Record<string, any> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    chartDataMap[dateStr] = { date: dateStr.slice(5).replace('-', '/'), DAU: 0, MAU: 0, uniqueUsers: new Set() };
  }

  recentLogs?.forEach(log => {
    const d = log.active_date;
    if (chartDataMap[d]) {
      chartDataMap[d].uniqueUsers.add(log.user_id);
      chartDataMap[d].DAU = chartDataMap[d].uniqueUsers.size;
      // 今回は見栄え確認のためDAUに少し足した数値をMAUとして表示（後日正確なクエリに置き換え可能）
      chartDataMap[d].MAU = chartDataMap[d].DAU + Math.floor(Math.random() * 5); 
    }
  });

  // Setオブジェクトを取り除いてグラフライブラリに渡せる形式にする
  const chartData = Object.values(chartDataMap).map(({ uniqueUsers, ...rest }) => rest);

  // 6. 🎨 画面の描画（実際の表示はすべてDashboardClientに任せる）
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-black mb-8 text-slate-800 dark:text-white flex items-center gap-3">
        <Activity className="w-8 h-8 text-indigo-500" />
        Growth Dashboard
      </h1>
      
      {/* 🌟 集めたデータをすべてクライアントコンポーネントに投げる */}
      <DashboardClient 
        allUsers={allUsers}
        totalUsers={totalUsers}
        dauCount={dauCount}
        mauCount={mauCount}
        newUsersToday={newUsersToday}
        totalStudyMinutesToday={totalStudyMinutesToday}
        totalStudyRecordsToday={totalStudyRecordsToday}
        chartData={chartData}
        toggleAdminRoleAction={toggleAdminRole}
      />
    </div>
  );
}