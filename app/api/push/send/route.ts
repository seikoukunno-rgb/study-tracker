import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ビルド時に実行されないよう動的インポート
  const webpush = (await import('web-push')).default;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const now = new Date();
  const windowStart = new Date(now.getTime() - 60 * 1000).toISOString();
  const windowEnd = now.toISOString();

  const { data: dueReminders } = await supabase
    .from('reminders')
    .select('*')
    .gte('remind_at', windowStart)
    .lte('remind_at', windowEnd);

  const { data: dueEvents } = await supabase
    .from('calendar_events')
    .select('*')
    .gte('notify_time', windowStart)
    .lte('notify_time', windowEnd)
    .eq('is_completed', false);

  const notifications: { userId: string; title: string; body: string }[] = [
    ...(dueReminders || []).map((r: any) => ({
      userId: r.student_id,
      title: 'Mercury リマインダー',
      body: `📚「${r.title}」の学習時間です！`,
    })),
    ...(dueEvents || []).map((e: any) => {
      const dateStr = e.date
        ? new Date(e.date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })
        : '';
      return {
        userId: e.student_id,
        title: 'Mercury リマインダー',
        body: `📅 ${dateStr}「${e.title}」の予定時刻です🔥`,
      };
    }),
  ];

  let sent = 0;
  let failed = 0;

  for (const notif of notifications) {
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', notif.userId);

    if (!subs || subs.length === 0) continue;

    for (const sub of subs) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      try {
        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify({ title: notif.title, body: notif.body, url: '/calendar' })
        );
        sent++;
      } catch (err: any) {
        console.error('Push failed:', err.statusCode, sub.endpoint);
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
        failed++;
      }
    }
  }

  return NextResponse.json({ sent, failed, total: notifications.length });
}
