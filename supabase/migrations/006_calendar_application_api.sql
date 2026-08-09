-- Oakland Schools Calendar
-- Migration 006: atomic application-facing calendar operations.
-- TypeScript remains responsible for deciding which dates are normally in session;
-- PostgreSQL performs the write in one transaction and re-validates every row.

create or replace function public.create_calendar_with_days(
  target_program_id uuid,
  target_school_year_id uuid,
  target_calendar_type_id uuid,
  target_start_date date,
  target_end_date date,
  generated_days jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_calendar_id uuid;
  day_item jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.has_program_access(target_program_id) then
    raise exception 'Program access denied' using errcode = '42501';
  end if;

  if jsonb_typeof(generated_days) <> 'array' then
    raise exception 'generated_days must be a JSON array';
  end if;

  insert into public.calendars (
    program_id,
    school_year_id,
    calendar_type_id,
    start_date,
    end_date,
    status,
    created_by
  )
  values (
    target_program_id,
    target_school_year_id,
    target_calendar_type_id,
    target_start_date,
    target_end_date,
    'DRAFT',
    auth.uid()
  )
  returning id into new_calendar_id;

  for day_item in select value from jsonb_array_elements(generated_days)
  loop
    insert into public.calendar_days (calendar_id, date, in_session)
    values (
      new_calendar_id,
      (day_item ->> 'date')::date,
      coalesce((day_item ->> 'in_session')::boolean, false)
    );
  end loop;

  return new_calendar_id;
end;
$$;

create or replace function public.save_calendar_day(
  target_day_id uuid,
  new_in_session boolean,
  new_notes text,
  new_activity_type_ids uuid[] default '{}'::uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_program_id uuid;
  activity_id uuid;
begin
  select c.program_id
    into target_program_id
  from public.calendar_days cd
  join public.calendars c on c.id = cd.calendar_id
  where cd.id = target_day_id
  for update of cd;

  if target_program_id is null then
    raise exception 'Calendar day not found';
  end if;

  if not public.has_program_access(target_program_id) then
    raise exception 'Calendar access denied' using errcode = '42501';
  end if;

  -- Remove old tags first so changing In Session cannot be blocked by a tag
  -- the user is intentionally removing in this same save operation.
  delete from public.calendar_day_activities
  where calendar_day_id = target_day_id;

  update public.calendar_days
  set in_session = new_in_session,
      notes = nullif(btrim(new_notes), '')
  where id = target_day_id;

  foreach activity_id in array coalesce(new_activity_type_ids, '{}'::uuid[])
  loop
    insert into public.calendar_day_activities (calendar_day_id, activity_type_id)
    values (target_day_id, activity_id);
  end loop;
end;
$$;

revoke all on function public.create_calendar_with_days(uuid, uuid, uuid, date, date, jsonb) from public;
revoke all on function public.save_calendar_day(uuid, boolean, text, uuid[]) from public;
grant execute on function public.create_calendar_with_days(uuid, uuid, uuid, date, date, jsonb) to authenticated;
grant execute on function public.save_calendar_day(uuid, boolean, text, uuid[]) to authenticated;
