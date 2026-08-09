-- Oakland Schools Calendar
-- Migration 008: enforce blocking requirements in the database workflow.

create or replace function public.calendar_has_blocking_requirement_failures(target_calendar_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target_school_year_id uuid;
  target_calendar_type_id uuid;
  requirement_row record;
  actual_count integer;
begin
  select c.school_year_id, c.calendar_type_id
    into target_school_year_id, target_calendar_type_id
  from public.calendars c
  where c.id = target_calendar_id;

  if target_school_year_id is null then
    raise exception 'Calendar not found';
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
      select count(*)::integer
        into actual_count
      from public.calendar_days cd
      where cd.calendar_id = target_calendar_id
        and cd.in_session = true;
    else
      select count(distinct cd.id)::integer
        into actual_count
      from public.calendar_days cd
      join public.calendar_day_activities cda on cda.calendar_day_id = cd.id
      where cd.calendar_id = target_calendar_id
        and cda.activity_type_id = requirement_row.activity_type_id;
    end if;

    if requirement_row.minimum_count is not null and actual_count < requirement_row.minimum_count then
      return true;
    end if;

    if requirement_row.maximum_count is not null and actual_count > requirement_row.maximum_count then
      return true;
    end if;
  end loop;

  return false;
end;
$$;

revoke all on function public.calendar_has_blocking_requirement_failures(uuid) from public;
grant execute on function public.calendar_has_blocking_requirement_failures(uuid) to authenticated;

create or replace function public.submit_calendar(target_calendar_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_program_id uuid;
  current_status public.calendar_status;
begin
  select c.program_id, c.status
    into target_program_id, current_status
  from public.calendars c
  where c.id = target_calendar_id
  for update;

  if target_program_id is null then
    raise exception 'Calendar not found';
  end if;

  if not public.has_program_access(target_program_id) then
    raise exception 'Calendar access denied' using errcode = '42501';
  end if;

  if current_status not in ('DRAFT', 'CHANGES_REQUESTED') then
    raise exception 'Only draft or changes-requested calendars can be submitted';
  end if;

  if public.calendar_has_blocking_requirement_failures(target_calendar_id) then
    raise exception 'Calendar has blocking requirement failures and cannot be submitted';
  end if;

  update public.calendars
  set status = 'PENDING',
      submitted_by = auth.uid(),
      submitted_at = now(),
      approved_by = null,
      approved_at = null,
      review_notes = null
  where id = target_calendar_id;
end;
$$;

create or replace function public.approve_calendar(
  target_calendar_id uuid,
  notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status public.calendar_status;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  select c.status
    into current_status
  from public.calendars c
  where c.id = target_calendar_id
  for update;

  if current_status is null then
    raise exception 'Calendar not found';
  end if;

  if current_status <> 'PENDING' then
    raise exception 'Only pending calendars can be approved';
  end if;

  if public.calendar_has_blocking_requirement_failures(target_calendar_id) then
    raise exception 'Calendar has blocking requirement failures and cannot be approved';
  end if;

  update public.calendars
  set status = 'APPROVED',
      approved_by = auth.uid(),
      approved_at = now(),
      review_notes = nullif(btrim(notes), '')
  where id = target_calendar_id;
end;
$$;
