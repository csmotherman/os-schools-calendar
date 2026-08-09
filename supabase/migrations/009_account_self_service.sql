-- Oakland Schools Calendar
-- Migration 009: narrowly-scoped account self-service operations.

create or replace function public.update_own_profile_names(
  new_first_name text,
  new_last_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_first_name text;
  clean_last_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  clean_first_name := nullif(btrim(new_first_name), '');
  clean_last_name := nullif(btrim(new_last_name), '');
  if clean_first_name is null or clean_last_name is null then
    raise exception 'First and last name are required';
  end if;

  update public.profiles
  set first_name = clean_first_name,
      last_name = clean_last_name
  where id = auth.uid();

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

create or replace function public.resubmit_program_request(target_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_account_status public.account_status;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select p.account_status
    into current_account_status
  from public.profiles p
  where p.id = auth.uid();

  if current_account_status = 'DISABLED' then
    raise exception 'Disabled accounts cannot submit access requests';
  end if;

  update public.program_memberships
  set status = 'PENDING',
      approved_by = null,
      approved_at = null
  where id = target_membership_id
    and user_id = auth.uid()
    and status = 'DECLINED';

  if not found then
    raise exception 'Declined membership request not found';
  end if;

  update public.profiles
  set account_status = 'PENDING'
  where id = auth.uid()
    and role = 'PROGRAM_USER';
end;
$$;

revoke all on function public.update_own_profile_names(text, text) from public;
revoke all on function public.resubmit_program_request(uuid) from public;
grant execute on function public.update_own_profile_names(text, text) to authenticated;
grant execute on function public.resubmit_program_request(uuid) to authenticated;
