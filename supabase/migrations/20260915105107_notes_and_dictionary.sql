-- Notes + dictionary, scoped to Clerk user IDs via JWT `sub`.

create extension if not exists pgcrypto;

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt()->>'sub'),
  title text not null default 'Untitled note',
  raw_transcript text not null default '',
  polished_transcript text not null default '',
  duration_seconds integer not null default 0,
  word_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dictionary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt()->>'sub'),
  note_id uuid references public.notes(id) on delete set null,
  word text not null,
  definition text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists notes_user_created_idx
  on public.notes (user_id, created_at desc);

create unique index if not exists dictionary_user_word_idx
  on public.dictionary_entries (user_id, word);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
  before update on public.notes
  for each row
  execute function public.set_updated_at();

alter table public.notes enable row level security;
alter table public.dictionary_entries enable row level security;

drop policy if exists "Users can view their own notes" on public.notes;
create policy "Users can view their own notes"
  on public.notes
  for select
  to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

drop policy if exists "Users can insert their own notes" on public.notes;
create policy "Users can insert their own notes"
  on public.notes
  for insert
  to authenticated
  with check ((select auth.jwt()->>'sub') = user_id);

drop policy if exists "Users can update their own notes" on public.notes;
create policy "Users can update their own notes"
  on public.notes
  for update
  to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);

drop policy if exists "Users can delete their own notes" on public.notes;
create policy "Users can delete their own notes"
  on public.notes
  for delete
  to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

drop policy if exists "Users can view their own dictionary" on public.dictionary_entries;
create policy "Users can view their own dictionary"
  on public.dictionary_entries
  for select
  to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

drop policy if exists "Users can insert their own dictionary" on public.dictionary_entries;
create policy "Users can insert their own dictionary"
  on public.dictionary_entries
  for insert
  to authenticated
  with check ((select auth.jwt()->>'sub') = user_id);

drop policy if exists "Users can update their own dictionary" on public.dictionary_entries;
create policy "Users can update their own dictionary"
  on public.dictionary_entries
  for update
  to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);

drop policy if exists "Users can delete their own dictionary" on public.dictionary_entries;
create policy "Users can delete their own dictionary"
  on public.dictionary_entries
  for delete
  to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

grant select, insert, update, delete on public.notes to authenticated;
grant select, insert, update, delete on public.dictionary_entries to authenticated;
