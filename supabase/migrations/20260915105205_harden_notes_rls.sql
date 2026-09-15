create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create index if not exists dictionary_entries_note_id_idx
  on public.dictionary_entries (note_id);

drop policy if exists "Users can view their own notes" on public.notes;
create policy "Users can view their own notes"
  on public.notes
  for select
  to authenticated
  using ((((select auth.jwt()) ->> 'sub')) = user_id);

drop policy if exists "Users can insert their own notes" on public.notes;
create policy "Users can insert their own notes"
  on public.notes
  for insert
  to authenticated
  with check ((((select auth.jwt()) ->> 'sub')) = user_id);

drop policy if exists "Users can update their own notes" on public.notes;
create policy "Users can update their own notes"
  on public.notes
  for update
  to authenticated
  using ((((select auth.jwt()) ->> 'sub')) = user_id)
  with check ((((select auth.jwt()) ->> 'sub')) = user_id);

drop policy if exists "Users can delete their own notes" on public.notes;
create policy "Users can delete their own notes"
  on public.notes
  for delete
  to authenticated
  using ((((select auth.jwt()) ->> 'sub')) = user_id);

drop policy if exists "Users can view their own dictionary" on public.dictionary_entries;
create policy "Users can view their own dictionary"
  on public.dictionary_entries
  for select
  to authenticated
  using ((((select auth.jwt()) ->> 'sub')) = user_id);

drop policy if exists "Users can insert their own dictionary" on public.dictionary_entries;
create policy "Users can insert their own dictionary"
  on public.dictionary_entries
  for insert
  to authenticated
  with check ((((select auth.jwt()) ->> 'sub')) = user_id);

drop policy if exists "Users can update their own dictionary" on public.dictionary_entries;
create policy "Users can update their own dictionary"
  on public.dictionary_entries
  for update
  to authenticated
  using ((((select auth.jwt()) ->> 'sub')) = user_id)
  with check ((((select auth.jwt()) ->> 'sub')) = user_id);

drop policy if exists "Users can delete their own dictionary" on public.dictionary_entries;
create policy "Users can delete their own dictionary"
  on public.dictionary_entries
  for delete
  to authenticated
  using ((((select auth.jwt()) ->> 'sub')) = user_id);
