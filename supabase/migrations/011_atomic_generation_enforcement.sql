-- Oakland Schools Calendar
-- Migration 011: require program users to create calendars through the atomic
-- generation RPC and validate that the generated payload covers every date.

-- Raw calendar creation is admin-only. Program users use create_calendar_with_days().
drop policy if exists calendars_insert_program on public.calendars;
drop policy if exists calendars_insert_admin on public.calendars;
create policy calendars_insert_admin on public.calendars
for insert to authenticated
with check (public.is_admin());

-- The generated calendar owns a complete fixed date set. Program users edit
-- existing dates but do not add arbitrary calendar_days through the table API.
drop policy if exists calendar_days_insert_program on public.calendar_days;
drop policy if exists calendar_days_insert_admin on public.calendar_days;
create policy calendar_days_insert_admin on public.calendar_days
for insert to authenticated
with check (public.is_admin());

-- Calendar-range/type changes require a future atomic regeneration workflow.
-- Do not expose the earlier low-level metadata-update RPC to normal clients.
revoke execute on function public.update_calendar_details(uuid, date, date, uuid) from authenticated;

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
  expected_count integer;
  supplied_count integer;
  active_year boolean;
  active_type boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.has_program_access(target_program_id) then
    raise exception 'Program access denied' using errcode = '42501';
  end if;

  if target_start_date > target_end_date then
    raise exception 'Calendar start date must be on or before end date';
  end if;

  select sy.active into active_year from public.school_years sy where sy.id = target_school_year_id;
  select ct.active into active_type from public.calendar_types ct where ct.id = target_calendar_type_id;
  if coalesce(active_year, false) = false or coalesce(active_type, false) = false then
    raise exception 'Calendar must use an active school year and calendar type';
  end if;

  if jsonb_typeof(generated_days) <> 'array' then
    raise exception 'generated_days must be a JSON array';
  end if;

  expected_count := (target_end_date - target_start_date) + 1;
  supplied_count := jsonb_array_length(generated_days);
  if supplied_count <> expected_count then
    raise exception 'Generated calendar must contain exactly one row for every date in the calendar range';
  end if;

  if exists (
    select 1
    from generate_series(target_start_date, target_end_date, interval '1 day') expected(day)
    left join lateral (
      select count(*) as matches
      from jsonb_array_elements(generated_days) item
      where (item ->> 'date')::date = expected.day::date
    ) supplied on true
    where supplied.matches <> 1
  ) then
    raise exception 'Generated calendar dates must exactly cover the calendar range without duplicates';
  end if;

  insert into public.calendars (
    program_id, school_year_id, calendar_type_id, start_date, end_date, status, created_by
  ) values (
    target_program_id, target_school_year_id, target_calendar_type_id,
    target_start_date, target_end_date, 'DRAFT', auth.uid()
  ) returning id into new_calendar_id;

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
