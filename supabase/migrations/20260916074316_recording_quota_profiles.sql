-- Per-user recording quota. Free default is 10 minutes (600 seconds).
-- Raise a user's limit by editing profiles.quota_seconds in Table Editor
-- or by calling public.set_recording_quota(user_id, seconds) in SQL Editor.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.profiles (
  user_id text primary key,
  quota_seconds integer not null default 600 check (quota_seconds >= 0),
  used_seconds integer not null default 0 check (used_seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Recording quota per Clerk user id. Free default is 600 seconds. Increase quota_seconds to raise a user limit. used_seconds is not restored when notes are deleted.';
comment on column public.profiles.quota_seconds is
  'Total allowed recording time in seconds. Default 600 (10 minutes). Edit this column to raise a user''s quota.';
comment on column public.profiles.used_seconds is
  'Consumed recording time in seconds. Incremented on each saved recording and never decreased.';

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

revoke all on table public.profiles from anon, public;
grant select on table public.profiles to authenticated;
grant select, insert, update, delete on table public.profiles to service_role;

insert into public.profiles (user_id, used_seconds)
select user_id, coalesce(sum(duration_seconds), 0)::integer
from public.notes
group by user_id
on conflict (user_id) do update
set used_seconds = greatest(public.profiles.used_seconds, excluded.used_seconds);

create or replace function private.ensure_profile(p_user_id text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
begin
  if p_user_id is null or btrim(p_user_id) = '' then
    raise exception 'Missing user id';
  end if;

  insert into public.profiles (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into strict result
  from public.profiles
  where user_id = p_user_id;

  return result;
end;
$$;

create or replace function private.consume_recording_quota(p_user_id text, p_seconds integer)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
  remaining integer;
begin
  if p_seconds is null or p_seconds < 1 then
    raise exception 'Invalid recording duration';
  end if;

  result := private.ensure_profile(p_user_id);
  remaining := result.quota_seconds - result.used_seconds;

  if remaining <= 0 then
    raise exception 'Recording time limit reached';
  end if;

  update public.profiles
  set used_seconds = used_seconds + p_seconds
  where user_id = p_user_id
  returning * into strict result;

  return result;
end;
$$;

create or replace function public.ensure_my_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.jwt()->>'sub';
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  return private.ensure_profile(uid);
end;
$$;

create or replace function public.consume_my_recording_quota(p_seconds integer)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.jwt()->>'sub';
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  return private.consume_recording_quota(uid, p_seconds);
end;
$$;

create or replace function public.set_recording_quota(p_user_id text, p_quota_seconds integer)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
begin
  if p_user_id is null or btrim(p_user_id) = '' then
    raise exception 'Missing user id';
  end if;
  if p_quota_seconds is null or p_quota_seconds < 0 then
    raise exception 'Quota must be zero or more seconds';
  end if;

  insert into public.profiles (user_id, quota_seconds)
  values (btrim(p_user_id), p_quota_seconds)
  on conflict (user_id) do update
    set quota_seconds = excluded.quota_seconds
  returning * into strict result;

  return result;
end;
$$;

comment on function public.set_recording_quota(text, integer) is
  'Admin helper: set a Clerk user''s total recording quota in seconds. Example: select set_recording_quota(''user_2abc'', 3600);';

revoke all on function public.ensure_my_profile() from public, anon;
revoke all on function public.consume_my_recording_quota(integer) from public, anon;
revoke all on function public.set_recording_quota(text, integer) from public, anon, authenticated;

grant execute on function public.ensure_my_profile() to authenticated, service_role;
grant execute on function public.consume_my_recording_quota(integer) to authenticated, service_role;
grant execute on function public.set_recording_quota(text, integer) to service_role;
