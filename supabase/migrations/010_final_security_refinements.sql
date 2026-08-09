-- Oakland Schools Calendar
-- Migration 010: final foundation security refinements.

create or replace function public.calendar_has_blocking_requirement_failures(target_calendar_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target_program_id uuid;
  target_school_year_id uuid;
  target_calendar_type_id uuid;
  requirement_row record;
  actual_count integer;
begin
  select c.program_id, c.school_year_id, c.calendar_type_id
    into target_program_id, target_school_year_id, target_calendar_type_id
  from public.calendars c
  where c.id = target_calendar_id;

  if target_program_id is null then
    raise exception 'Calendar not found';
  end if;

  if not public.has_program_access(target_program_id) then
    raise exception 'Calendar access denied' using errcode = '42501';
  end if;

  for requirement_row in
    select r.metric_type, r.activity_type_id, r.minimum_count, r.maximum_count
    from public.requirements r
    where r.school_year_id = target_school_year_id
      and r.calendar_type_id = target_calendar_type_id
      and r.active = true
      and r.severity = 'BLOCK'
  loop
    if requirement_row.metric_type = 'SESSION_DAYS' then
      select count(*)::integer into actual_count
      from public.calendar_days cd
      where cd.calendar_id = target_calendar_id and cd.in_session = true;
    else
      select count(distinct cd.id)::integer into actual_count
      from public.calendar_days cd
      join public.calendar_day_activities cda on cda.calendar_day_id = cd.id
      where cd.calendar_id = target_calendar_id
        and cda.activity_type_id = requirement_row.activity_type_id;
    end if;

    if requirement_row.minimum_count is not null and actual_count < requirement_row.minimum_count then return true; end if;
    if requirement_row.maximum_count is not null and actual_count > requirement_row.maximum_count then return true; end if;
  end loop;

  return false;
end;
$$;

create or replace function public.admin_restore_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  has_approved_membership boolean;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if exists (select 1 from public.profiles p where p.id = target_user_id and p.role = 'ADMIN') then
    raise exception 'Use controlled administrator provisioning for administrator accounts';
  end if;

  select exists (
    select 1 from public.program_memberships pm
    where pm.user_id = target_user_id and pm.status = 'APPROVED'
  ) into has_approved_membership;

  update public.profiles
  set account_status = case when has_approved_membership then 'APPROVED' else 'PENDING' end
  where id = target_user_id and role = 'PROGRAM_USER';

  if not found then
    raise exception 'Program user profile not found';
  end if;
end;
$$;

revoke all on function public.admin_restore_user(uuid) from public;
grant execute on function public.admin_restore_user(uuid) to authenticated;
