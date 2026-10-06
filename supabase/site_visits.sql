-- サイト訪問者数の計測（Supabase の SQL Editor で1回実行する。何度実行しても安全）
--
-- 仕組み
--  - ブラウザごとにランダムな visitor_id（localStorage）を発行。個人情報（IP・メール等）は保存しない
--  - 1日1ブラウザにつき1行だけ保存（その日の訪問回数は sessions に加算）→ 行数が膨らまない
--  - 書き込みは record_visit() 経由のみ。テーブルは直接読み書きできない（RLS・ポリシー無し）
--  - 集計は管理者(profiles.role = 'admin')だけが get_visit_stats() で取得できる

create table if not exists public.site_visits (
  visitor_id text not null,
  visit_date date not null,
  sessions   int  not null default 1,
  first_path text,
  created_at timestamptz not null default now(),
  primary key (visitor_id, visit_date)
);

alter table public.site_visits enable row level security;
-- ポリシーは作らない（= 直接の select/insert/update は全員不可。下の関数だけが触れる）

create index if not exists site_visits_visit_date_idx on public.site_visits (visit_date);

-- 訪問を記録（未ログインの訪問者も呼べる）
create or replace function public.record_visit(p_visitor text, p_path text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'Asia/Tokyo')::date;
begin
  if p_visitor is null or length(p_visitor) < 8 or length(p_visitor) > 64 then
    return;
  end if;

  insert into public.site_visits (visitor_id, visit_date, first_path)
  values (p_visitor, today, left(p_path, 200))
  on conflict (visitor_id, visit_date)
  do update set sessions = public.site_visits.sessions + 1;
end;
$$;

revoke all on function public.record_visit(text, text) from public;
grant execute on function public.record_visit(text, text) to anon, authenticated;

-- 管理者用の集計（過去30日）
create or replace function public.get_visit_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'Asia/Tokyo')::date;
  result json;
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'forbidden';
  end if;

  select json_build_object(
    'today',        (select count(*) from public.site_visits where visit_date = today),
    'yesterday',    (select count(*) from public.site_visits where visit_date = today - 1),
    'week_unique',  (select count(*) from (select distinct visitor_id from public.site_visits where visit_date > today - 7)  a),
    'month_unique', (select count(*) from (select distinct visitor_id from public.site_visits where visit_date > today - 30) b),
    'total_unique', (select count(distinct visitor_id) from public.site_visits),
    'daily', (
      select coalesce(json_agg(json_build_object(
        'date', to_char(d, 'YYYY-MM-DD'),
        'visitors', coalesce(v.visitors, 0),
        'sessions', coalesce(v.sessions, 0)
      ) order by d), '[]'::json)
      from generate_series(today - 29, today, interval '1 day') as d
      left join (
        select visit_date, count(*) as visitors, sum(sessions) as sessions
        from public.site_visits
        where visit_date > today - 30
        group by visit_date
      ) v on v.visit_date = d::date
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_visit_stats() from public;
grant execute on function public.get_visit_stats() to authenticated;
