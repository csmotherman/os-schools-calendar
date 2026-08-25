-- Oakland Schools GSRP Calendar
-- Migration 021: preserve calendar deletion audit history without violating the
-- audit_log.calendar_id -> calendars.id foreign key after the parent row is gone.
--
-- The deleted calendar ID remains in audit_log.entity_id. audit_log.program_id
-- remains populated for filtering/history, while audit_log.calendar_id is null
-- for the calendar DELETE event because that foreign-key target no longer exists.

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_before jsonb;
  row_after jsonb;
  resolved_entity_id uuid;
  resolved_program_id uuid;
  resolved_calendar_id uuid;
  source_program_id uuid;
  source_calendar_id uuid;
  source_day_id uuid;
begin
  if tg_op = 'INSERT' then
    row_after := to_jsonb(new);
    resolved_entity_id := new.id;
  elsif tg_op = 'UPDATE' then
    row_before := to_jsonb(old);
    row_after := to_jsonb(new);
    resolved_entity_id := new.id;
  else
    row_before := to_jsonb(old);
    resolved_entity_id := old.id;
  end if;

  if tg_table_name = 'calendars' then
    if tg_op = 'DELETE' then
      source_program_id := old.program_id;
      -- Do not reference the deleted parent through audit_log.calendar_id.
      -- entity_id still preserves the deleted calendar's UUID.
      resolved_calendar_id := null;
    else
      source_program_id := new.program_id;
      resolved_calendar_id := resolved_entity_id;
    end if;
    resolved_program_id := source_program_id;
  elsif tg_table_name = 'calendar_days' then
    if tg_op = 'DELETE' then
      source_calendar_id := old.calendar_id;
    else
      source_calendar_id := new.calendar_id;
    end if;
    select c.id, c.program_id
      into resolved_calendar_id, resolved_program_id
    from public.calendars c
    where c.id = source_calendar_id;
  elsif tg_table_name = 'calendar_day_activities' then
    if tg_op = 'DELETE' then
      source_day_id := old.calendar_day_id;
    else
      source_day_id := new.calendar_day_id;
    end if;
    select c.id, c.program_id
      into resolved_calendar_id, resolved_program_id
    from public.calendar_days cd
    join public.calendars c on c.id = cd.calendar_id
    where cd.id = source_day_id;
  elsif tg_table_name = 'programs' then
    resolved_program_id := resolved_entity_id;
  elsif tg_table_name = 'program_memberships' then
    if tg_op = 'DELETE' then
      resolved_program_id := old.program_id;
    else
      resolved_program_id := new.program_id;
    end if;
  end if;

  insert into public.audit_log (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    program_id,
    calendar_id,
    before_data,
    after_data
  )
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    resolved_entity_id,
    resolved_program_id,
    resolved_calendar_id,
    row_before,
    row_after
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
