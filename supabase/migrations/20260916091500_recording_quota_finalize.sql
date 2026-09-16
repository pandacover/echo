-- Insert the note and consume quota in one locked transaction.
-- used_seconds is capped so it cannot pass quota_seconds.

create or replace function private.consume_recording_quota(p_user_id text, p_seconds integer)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
  remaining integer;
  billed integer;
begin
  if p_seconds is null or p_seconds < 1 then
    raise exception 'Invalid recording duration';
  end if;

  perform private.ensure_profile(p_user_id);

  select * into strict result
  from public.profiles
  where user_id = p_user_id
  for update;

  remaining := result.quota_seconds - result.used_seconds;
  if remaining <= 0 then
    raise exception 'Recording time limit reached';
  end if;

  billed := least(p_seconds, remaining);

  update public.profiles
  set used_seconds = used_seconds + billed
  where user_id = p_user_id
  returning * into strict result;

  return result;
end;
$$;

create or replace function private.finalize_recording(
  p_user_id text,
  p_title text,
  p_raw_transcript text,
  p_polished_transcript text,
  p_duration_seconds integer,
  p_word_count integer
)
returns public.notes
language plpgsql
security definer
set search_path = public
as $$
declare
  profile public.profiles;
  remaining integer;
  billed integer;
  note public.notes;
begin
  if p_user_id is null or btrim(p_user_id) = '' then
    raise exception 'Missing user id';
  end if;

  perform private.ensure_profile(p_user_id);

  select * into strict profile
  from public.profiles
  where user_id = p_user_id
  for update;

  remaining := profile.quota_seconds - profile.used_seconds;
  if remaining <= 0 then
    raise exception 'Recording time limit reached';
  end if;

  billed := least(greatest(coalesce(p_duration_seconds, 1), 1), remaining);

  insert into public.notes (
    user_id,
    title,
    raw_transcript,
    polished_transcript,
    duration_seconds,
    word_count
  ) values (
    p_user_id,
    coalesce(nullif(btrim(p_title), ''), 'Untitled note'),
    coalesce(p_raw_transcript, ''),
    coalesce(p_polished_transcript, ''),
    billed,
    coalesce(p_word_count, 0)
  ) returning * into strict note;

  update public.profiles
  set used_seconds = used_seconds + billed
  where user_id = p_user_id;

  return note;
end;
$$;

create or replace function public.finalize_my_recording(
  p_title text,
  p_raw_transcript text,
  p_polished_transcript text,
  p_duration_seconds integer,
  p_word_count integer
)
returns public.notes
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
  return private.finalize_recording(
    uid,
    p_title,
    p_raw_transcript,
    p_polished_transcript,
    p_duration_seconds,
    p_word_count
  );
end;
$$;

create or replace function public.finalize_recording_for(
  p_user_id text,
  p_title text,
  p_raw_transcript text,
  p_polished_transcript text,
  p_duration_seconds integer,
  p_word_count integer
)
returns public.notes
language plpgsql
security definer
set search_path = public
as $$
begin
  return private.finalize_recording(
    p_user_id,
    p_title,
    p_raw_transcript,
    p_polished_transcript,
    p_duration_seconds,
    p_word_count
  );
end;
$$;

do $$
declare
  rec record;
begin
  for rec in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('finalize_my_recording', 'finalize_recording_for')
  loop
    execute format('revoke all on function %s from public, anon', rec.sig);
    if rec.proname = 'finalize_recording_for' then
      execute format('revoke all on function %s from authenticated', rec.sig);
      execute format('grant execute on function %s to service_role', rec.sig);
    else
      execute format('grant execute on function %s to authenticated, service_role', rec.sig);
    end if;
  end loop;
end;
$$;
