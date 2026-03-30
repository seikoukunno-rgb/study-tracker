import { createClient } from '../utils/supabase/server';
import { redirect } from 'next/navigation';
import { toggleAdminRole } from '../actions/admin';
import { Activity } from 'lucide-react';
import DashboardClient from './DashboardClient'; 

export default async function AdminPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/');

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
  
  // 📊 全データを一括取得（統計計算用）
  const [
    { data: allUsers },
    { data: allStudyLogs },
    { data: allActivityLogs },
    { data: todayStudyRecords }
  ] = await Promise.all([
    supabase.from('profiles').select('*'),
    // 🌟 統計計算のために全ユーザーの「日付」と「ユーザーID」だけを取得
    supabase.from('study_logs').select('student_id, studied_at'), 
    supabase.from('activity_logs').select('user_id, active_date'),
    supabase.from('study_logs').select('duration_minutes').gte('created_at', `${todayStr}T00:00:00Z`)
  ]);

  // 🧮 ユーザーごとの統計計算（ここが修正のキモ！）
  const enrichedUsers = allUsers?.map(u => {
    // このユーザーの学習ログだけを抽出
    const userLogs = allStudyLogs?.filter(log => log.student_id === u.id) || [];
    const uniqueStudyDates = Array.from(new Set(userLogs.map(l => l.studied_at))).sort().reverse();
    
    // 1. 総学習日数
    const total_study_days = uniqueStudyDates.length;

    // 2. 最大連続日数の計算
    let max_streak = 0;
    let current_streak = 0;
    if (uniqueStudyDates.length > 0) {
      current_streak = 1;
      max_streak = 1;
      for (let i = 0; i < uniqueStudyDates.length - 1; i++) {
        const curr = new Date(uniqueStudyDates[i]);
        const prev = new Date(uniqueStudyDates[i+1]);
        const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        
        if (diff === 1) {
          current_streak++;
          max_streak = Math.max(max_streak, current_streak);
        } else {
          current_streak = 1;
        }
      }
    }

    // 3. 今日のログイン判定
    const userActivities = allActivityLogs?.filter(log => log.user_id === u.id) || [];
    const is_online_today = userActivities.some(act => act.active_date === todayStr);

    return {
      ...u,
      total_study_days, // DashboardClient で表示する変数
      max_streak,       // DashboardClient で表示する変数
      is_online_today   // ログイン状態
    };
  });

  // KPI計算
  const totalUsers = allUsers?.length || 0;
  const dauCount = allActivityLogs?.filter(log => log.active_date === todayStr).length || 0;
  const newUsersToday = allUsers?.filter(u => u.created_at && u.created_at.startsWith(todayStr)).length || 0;
  const totalStudyMinutesToday = todayStudyRecords?.reduce((sum, record) => sum + (record.duration_minutes || 0), 0) || 0;

  // グラフ用データの生成
  const chartDataMap: Record<string, any> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    chartDataMap[dateStr] = { date: dateStr.slice(5).replace('-', '/'), DAU: 0, NewUsers: 0 };
  }
  allActivityLogs?.forEach(log => { if (chartDataMap[log.active_date]) chartDataMap[log.active_date].DAU += 1; });
  allUsers?.forEach(u => {
    const d = u.created_at?.split('T')[0];
    if (d && chartDataMap[d]) chartDataMap[d].NewUsers += 1;
  });
  const chartData = Object.values(chartDataMap);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-black mb-8 text-slate-800 dark:text-white flex items-center gap-3">
        <Activity className="w-8 h-8 text-indigo-500" />
        Growth Dashboard
      </h1>
      
      <DashboardClient 
        allUsers={enrichedUsers} // 🌟 統計情報を入れた enrichedUsers を渡す
        totalUsers={totalUsers}
        dauCount={dauCount}
        mauCount={new Set(allActivityLogs?.map(l => l.user_id)).size}
        newUsersToday={newUsersToday}
        totalStudyMinutesToday={totalStudyMinutesToday}
        totalStudyRecordsToday={todayStudyRecords?.length || 0}
        chartData={chartData}
        toggleAdminRoleAction={toggleAdminRole}
      />
    </div>
  );
}