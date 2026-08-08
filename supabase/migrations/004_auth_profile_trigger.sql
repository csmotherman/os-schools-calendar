-- Oakland Schools Calendar
-- Migration 004: create a pending application profile for each new Auth user.
-- The signup form must send first_name and last_name in user metadata.
-- Program affiliation is NOT trusted from Auth metadata; the application creates
-- a separate PENDING program_memberships row after authentication.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, role, account_status)
  values (
    new.id,
    nullif(btrim(new.raw_user_meta_data ->> 'first_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'last_name'), ''),
    'PROGRAM_USER',
    'PENDING'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();
