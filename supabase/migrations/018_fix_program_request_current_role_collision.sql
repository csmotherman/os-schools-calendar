-- Oakland Schools Calendar
-- Migration 018: fix request_program_access() variable naming collision.
--
-- PostgreSQL CURRENT_ROLE is a built-in SQL construct that returns the current
-- database role (for example, "postgres"). Migration 017 used current_role as a
-- PL/pgSQL variable name, so references could resolve to PostgreSQL CURRENT_ROLE
-- instead of the profile's public.user_role value.
--
-- Use unambiguous variable names and compare the typed enum directly.

create or replace function public.request_program_access(target_program_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile_role public.user_role;
  v_account_status public.account_status;
  v_existing_membership_id uuid;
  v_new_membership_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select p.role, p.account_status
    into v_profile_role, v_account_status
  from public.profiles p
  where p.id = v_user_id;

  if not found then
    raise exception 'Profile not found';
  end if;

  if v_profile_role <> 'PROGRAM_USER'::public.user_role then
    raise exception 'Program access requests require PROGRAM_USER role; profile role is %', v_profile_role;
  end if;

  if v_account_status = 'DISABLED'::public.account_status then
    raise exception 'Disabled accounts cannot submit access requests' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.programs pr
    where pr.id = target_program_id
      and pr.active = true
  ) then
    raise exception 'Selected program is not available';
  end if;

  select pm.id
    into v_existing_membership_id
  from public.program_memberships pm
  where pm.user_id = v_user_id
  order by pm.created_at desc
  limit 1;

  if v_existing_membership_id is not null then
    raise exception 'A program access request already exists';
  end if;

  insert into public.program_memberships (
    user_id,
    program_id,
    status,
    approved_by,
    approved_at
  )
  values (
    v_user_id,
    target_program_id,
    'PENDING',
    null,
    null
  )
  returning id into v_new_membership_id;

  update public.profiles
  set account_status = 'PENDING'
  where id = v_user_id
    and role = 'PROGRAM_USER'::public.user_role;

  return v_new_membership_id;
end;
$$;

revoke all on function public.request_program_access(uuid) from public;
grant execute on function public.request_program_access(uuid) to authenticated;
