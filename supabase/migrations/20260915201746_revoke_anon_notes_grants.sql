-- Default table grants include PUBLIC/anon. RLS then fails with a confusing
-- "new row violates row-level security policy" instead of a permission error
-- when the Clerk JWT is missing. Keep writes on authenticated + service_role.

revoke all on table public.notes from anon, public;
revoke all on table public.dictionary_entries from anon, public;

grant select, insert, update, delete on table public.notes to authenticated, service_role;
grant select, insert, update, delete on table public.dictionary_entries to authenticated, service_role;
