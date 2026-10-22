-- ============================================================
-- 本名(real_name)・年齢(age)を、本人と管理者だけが見られるようにする
-- ============================================================
-- 方針: 本名・年齢を profiles から、保護テーブル profiles_private に分離する。
--       profiles_private は RLS で「本人 + 管理者」しか読めない。
--       それ以外の項目(nickname, 大学, 学年, 職業 など)は profiles に残り、従来通り公開。
--
-- 実行順序(重要):
--   STEP 1 を先に実行 → アプリのコードをデプロイ → 最後に STEP 2 を実行。
--   STEP 2(列削除)を先にやると、デプロイ前のアプリが壊れます。
-- ============================================================


-- ============================================================
-- STEP 1 : いま実行する(アプリは壊れない)
-- ============================================================

-- 管理者判定の関数(RLSの無限ループを避けるため SECURITY DEFINER)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 本名・年齢を入れる保護テーブル
create table if not exists public.profiles_private (
  id         uuid primary key references public.profiles(id) on delete cascade,
  real_name  text,
  age        text,
  updated_at timestamptz default now()
);

-- RLS を有効化(有効化しないと誰でも読めてしまう)
alter table public.profiles_private enable row level security;

-- 読み取り: 本人、または管理者のみ
drop policy if exists pp_select_own_or_admin on public.profiles_private;
create policy pp_select_own_or_admin on public.profiles_private
  for select
  using ( auth.uid() = id or public.is_admin() );

-- 追加: 本人のみ(自分の行だけ作れる)
drop policy if exists pp_insert_own on public.profiles_private;
create policy pp_insert_own on public.profiles_private
  for insert
  with check ( auth.uid() = id );

-- 更新: 本人のみ
drop policy if exists pp_update_own on public.profiles_private;
create policy pp_update_own on public.profiles_private
  for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id );

-- アプリ(ログインユーザー)がアクセスできるように権限を付与
grant select, insert, update on public.profiles_private to authenticated;

-- 既存データを profiles から保護テーブルへコピー(本名か年齢が入っている人だけ)
insert into public.profiles_private (id, real_name, age)
select id, real_name, age::text
from public.profiles
where real_name is not null or age is not null
on conflict (id) do update
  set real_name = excluded.real_name,
      age       = excluded.age,
      updated_at = now();


-- ============================================================
-- STEP 2 : アプリのコードをデプロイした「後」に実行する
-- ============================================================
-- これを実行すると、公開されている profiles から本名・年齢が消えます。
-- デプロイ前に実行すると、旧コードが real_name / age を読み書きできず壊れます。
--
-- 準備ができたら、下の2行の先頭の "-- " を外して実行してください:
--
-- alter table public.profiles drop column if exists real_name;
-- alter table public.profiles drop column if exists age;
