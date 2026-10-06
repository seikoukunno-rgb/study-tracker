-- スタラン関連の権限とルール（Supabase の SQL Editor で1回実行する）
-- 何度実行しても安全（drop ... if exists → create）。既存のポリシーは消さず「追加」するだけ。
--
-- やること
--  1) ルームのメンバーなら誰でもスタランを閲覧・開催できる（ホスト限定をやめる）
--  2) ランキング参加者どうしは、互いの学習記録（study_logs）と教材名（materials）を読める
--     → ランキング・タイムラインに全員の学習時間が出る
--  3) ルール強制（アプリを改造されても破れない）
--     - ルーム内で同時に開催できるスタランは1つまで（終了後に次を開催できる）
--     - 開催は1人あたり週1回まで（開始日が7日未満の間隔では開催できない）

-- ---------- 1) staruns ----------
drop policy if exists starun_select_members on public.staruns;
create policy starun_select_members on public.staruns
  for select to authenticated
  using (exists (
    select 1 from public.group_members gm
    where gm.group_id = staruns.group_id and gm.user_id = auth.uid()
  ));

-- 週1回ルールの判定用（他のルームでの自分の開催も読める）
drop policy if exists starun_select_own on public.staruns;
create policy starun_select_own on public.staruns
  for select to authenticated
  using (created_by::text = auth.uid()::text);

drop policy if exists starun_insert_members on public.staruns;
create policy starun_insert_members on public.staruns
  for insert to authenticated
  with check (
    created_by::text = auth.uid()::text
    and exists (
      select 1 from public.group_members gm
      where gm.group_id = staruns.group_id and gm.user_id = auth.uid()
    )
  );

-- ---------- 2) 学習記録・教材名の共有（ランキング参加者どうしのみ） ----------
drop policy if exists study_logs_select_ranking_peers on public.study_logs;
create policy study_logs_select_ranking_peers on public.study_logs
  for select to authenticated
  using (exists (
    select 1
    from public.group_members me
    join public.group_members peer on peer.group_id = me.group_id
    where me.user_id = auth.uid()
      and me.is_ranking_participant
      and peer.user_id = study_logs.student_id
      and peer.is_ranking_participant
  ));

drop policy if exists materials_select_ranking_peers on public.materials;
create policy materials_select_ranking_peers on public.materials
  for select to authenticated
  using (exists (
    select 1
    from public.group_members me
    join public.group_members peer on peer.group_id = me.group_id
    where me.user_id = auth.uid()
      and me.is_ranking_participant
      and peer.user_id = materials.student_id
      and peer.is_ranking_participant
  ));

-- ---------- 3) 開催ルールの強制 ----------
create or replace function public.enforce_starun_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'Asia/Tokyo')::date;
begin
  -- ルーム内で同時開催は1つまで（終了日が今日以降のスタランがあれば開催不可）
  if exists (
    select 1 from public.staruns s
    where s.group_id = new.group_id and s.end_date::date >= today
  ) then
    raise exception 'STARUN: このルームでは開催中のスタランがあります。終了後に開催できます';
  end if;

  -- 1人あたり週1回まで（全ルーム通算。開始日が7日未満の間隔は不可）
  if exists (
    select 1 from public.staruns s
    where s.created_by::text = new.created_by::text
      and abs(s.start_date::date - new.start_date::date) < 7
  ) then
    raise exception 'STARUN: スタランの開催は1人週1回までです';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_starun_rules on public.staruns;
create trigger trg_enforce_starun_rules
  before insert on public.staruns
  for each row execute function public.enforce_starun_rules();
