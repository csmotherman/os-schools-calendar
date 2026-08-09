-- Oakland Schools Calendar
-- Migration 014: controlled program access request creation.
-- Pending users need to request a program before they have program access. Keep
-- the write behind a narrow SECURITY DEFINER function instead of relying on a
-- direct table INSERT from the application.

create or replace function public.request_program_access(target_program_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_role public.user_role;
  current_account_status public.account_status;
  existing_membership_id uuid;
  new_membership_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select p.role, p.account_status
    into current_role, current_account_status
  from public.profiles p
  where p.id = current_user_id;

  if current_role is null then
    raise exception 'Profile not found';
  end if;

  if current_role <> 'PROGRAM_USER' then
    raise exception 'Administrator accounts do not request program access';
  end if;

  if current_account_status = 'DISABLED' then
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
    into existing_membership_id
  from public.program_memberships pm
  where pm.user_id = current_user_id
  order by pm.created_at desc
  limit 1;

  if existing_membership_id is not null then
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
    current_user_id,
    target_program_id,
    'PENDING',
    null,
    null
  )
  returning id into new_membership_id;

  update public.profiles
  set account_status = 'PENDING'
  where id = current_user_id
    and role = 'PROGRAM_USER';

  return new_membership_id;
end;
$$;

revoke all on function public.request_program_access(uuid) from public;
grant execute on function public.request_program_access(uuid) to authenticated;
