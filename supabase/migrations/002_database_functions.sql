-- Oakland Schools Calendar
-- Migration 002: helper functions, integrity triggers, and audit capture

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger programs_set_updated_at before update on public.programs for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger program_memberships_set_updated_at before update on public.program_memberships for each row execute function public.set_updated_at();
create trigger school_years_set_updated_at before update on public.school_years for each row execute function public.set_updated_at();
create trigger calendar_types_set_updated_at before update on public.calendar_types for each row execute function public.set_updated_at();
create trigger activity_types_set_updated_at before update on public.activity_types for each row execute function public.set_updated_at();
create trigger calendars_set_updated_at before update on public.calendars for each row execute function public.set_updated_at();
create trigger calendar_days_set_updated_at before update on public.calendar_days for each row execute function public.set_updated_at();
create trigger requirements_set_updated_at before update on public.requirements for each row execute function public.set_updated_at();
create trigger blocked_dates_set_updated_at before update on public.blocked_dates for each row execute function public.set_updated_at();

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = check_user_id and p.role = 'ADMIN' and p.account_status = 'APPROVED');
$$;

create or replace function public.has_program_access(check_program_id uuid, check_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin(check_user_id) or exists (
    select 1 from public.profiles p
    join public.program_memberships pm on pm.user_id = p.id
    join public.programs pr on pr.id = pm.program_id
    where p.id = check_user_id and p.role = 'PROGRAM_USER' and p.account_status = 'APPROVED'
      and pm.status = 'APPROVED' and pm.program_id = check_program_id and pr.active = true
  );
$$;

revoke all on function public.is_admin(uuid) from public;
revoke all on function public.has_program_access(uuid, uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.has_program_access(uuid, uuid) to authenticated;

create or replace function public.validate_calendar_dates()
returns trigger language plpgsql set search_path = public as $$
declare year_start date; year_end date;
begin
  select sy.start_date, sy.end_date into year_start, year_end from public.school_years sy where sy.id = new.school_year_id;
  if year_start is null then raise exception 'Selected school year does not exist'; end if;
  if new.start_date < year_start or new.end_date > year_end then raise exception 'Calendar dates must fall within the selected school year'; end if;
  return new;
end;
$$;
create trigger calendars_validate_dates before insert or update of school_year_id, start_date, end_date on public.calendars for each row execute function public.validate_calendar_dates();

create or replace function public.validate_calendar_day_date()
returns trigger language plpgsql set search_path = public as $$
declare calendar_start date; calendar_end date;
begin
  select c.start_date, c.end_date into calendar_start, calendar_end from public.calendars c where c.id = new.calendar_id;
  if calendar_start is null then raise exception 'Selected calendar does not exist'; end if;
  if new.date < calendar_start or new.date > calendar_end then raise exception 'Calendar day must fall within the calendar start and end dates'; end if;
  return new;
end;
$$;
create trigger calendar_days_validate_date before insert or update of calendar_id, date on public.calendar_days for each row execute function public.validate_calendar_day_date();

create or replace function public.validate_activity_compatibility()
returns trigger language plpgsql set search_path = public as $$
declare session_value boolean; allowed_in boolean; allowed_out boolean;
begin
  select cd.in_session into session_value from public.calendar_days cd where cd.id = new.calendar_day_id;
  select at.allowed_when_in_session, at.allowed_when_not_in_session into allowed_in, allowed_out from public.activity_types at where at.id = new.activity_type_id;
  if session_value is null or allowed_in is null then raise exception 'Calendar day or activity type does not exist'; end if;
  if session_value and not allowed_in then raise exception 'This activity is not allowed on an in-session day'; end if;
  if not session_value and not allowed_out then raise exception 'This activity is not allowed on a non-session day'; end if;
  return new;
end;
$$;
create trigger calendar_day_activities_validate_compatibility before insert or update of calendar_day_id, activity_type_id on public.calendar_day_activities for each row execute function public.validate_activity_compatibility();

create or replace function public.validate_session_change()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.in_session is distinct from old.in_session and exists (
    select 1 from public.calendar_day_activities cda join public.activity_types at on at.id = cda.activity_type_id
    where cda.calendar_day_id = new.id and ((new.in_session and not at.allowed_when_in_session) or (not new.in_session and not at.allowed_when_not_in_session))
  ) then raise exception 'Change would make an existing activity invalid for this session state'; end if;
  return new;
end;
$$;
create trigger calendar_days_validate_session_change before update of in_session on public.calendar_days for each row execute function public.validate_session_change();

create or replace function public.enforce_blocked_date()
returns trigger language plpgsql set search_path = public as $$
declare restriction public.blocked_date_restriction;
begin
  select bd.restriction_type into restriction from public.calendars c join public.blocked_dates bd on bd.school_year_id = c.school_year_id
  where c.id = new.calendar_id and bd.date = new.date and bd.active = true;
  if restriction in ('NO_SESSION', 'NO_ACTIVITY') and new.in_session then raise exception 'Children cannot be in session on this blocked date'; end if;
  return new;
end;
$$;
create trigger calendar_days_enforce_blocked_date before insert or update of calendar_id, date, in_session on public.calendar_days for each row execute function public.enforce_blocked_date();

create or replace function public.enforce_blocked_date_activity()
returns trigger language plpgsql set search_path = public as $$
declare restriction public.blocked_date_restriction;
begin
  select bd.restriction_type into restriction from public.calendar_days cd
  join public.calendars c on c.id = cd.calendar_id
  join public.blocked_dates bd on bd.school_year_id = c.school_year_id and bd.date = cd.date
  where cd.id = new.calendar_day_id and bd.active = true;
  if restriction = 'NO_ACTIVITY' then raise exception 'Activities cannot be scheduled on this blocked date'; end if;
  return new;
end;
$$;
create trigger calendar_day_activities_enforce_blocked_date before insert or update of calendar_day_id on public.calendar_day_activities for each row execute function public.enforce_blocked_date_activity();

create or replace function public.mark_approved_calendar_pending()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_calendar_id uuid; target_day_id uuid;
begin
  if tg_table_name = 'calendar_days' then
    if tg_op = 'DELETE' then target_calendar_id := old.calendar_id; else target_calendar_id := new.calendar_id; end if;
  elsif tg_table_name = 'calendar_day_activities' then
    if tg_op = 'DELETE' then target_day_id := old.calendar_day_id; else target_day_id := new.calendar_day_id; end if;
    select cd.calendar_id into target_calendar_id from public.calendar_days cd where cd.id = target_day_id;
  end if;
  update public.calendars set status = 'PENDING', approved_by = null, approved_at = null, updated_at = now()
  where id = target_calendar_id and status = 'APPROVED';
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;
create trigger calendar_days_reopen_approved_calendar after insert or update or delete on public.calendar_days for each row execute function public.mark_approved_calendar_pending();
create trigger calendar_day_activities_reopen_approved_calendar after insert or update or delete on public.calendar_day_activities for each row execute function public.mark_approved_calendar_pending();

create or replace function public.write_audit_log()
returns trigger language plpgsql security definer set search_path = public as $$
declare row_before jsonb; row_after jsonb; resolved_entity_id uuid; resolved_program_id uuid; resolved_calendar_id uuid; source_program_id uuid; source_calendar_id uuid; source_day_id uuid;
begin
  if tg_op = 'INSERT' then row_after := to_jsonb(new); resolved_entity_id := new.id;
  elsif tg_op = 'UPDATE' then row_before := to_jsonb(old); row_after := to_jsonb(new); resolved_entity_id := new.id;
  else row_before := to_jsonb(old); resolved_entity_id := old.id; end if;

  if tg_table_name = 'calendars' then
    if tg_op = 'DELETE' then source_program_id := old.program_id; else source_program_id := new.program_id; end if;
    resolved_calendar_id := resolved_entity_id; resolved_program_id := source_program_id;
  elsif tg_table_name = 'calendar_days' then
    if tg_op = 'DELETE' then source_calendar_id := old.calendar_id; else source_calendar_id := new.calendar_id; end if;
    select c.id, c.program_id into resolved_calendar_id, resolved_program_id from public.calendars c where c.id = source_calendar_id;
  elsif tg_table_name = 'calendar_day_activities' then
    if tg_op = 'DELETE' then source_day_id := old.calendar_day_id; else source_day_id := new.calendar_day_id; end if;
    select c.id, c.program_id into resolved_calendar_id, resolved_program_id from public.calendar_days cd join public.calendars c on c.id = cd.calendar_id where cd.id = source_day_id;
  elsif tg_table_name = 'programs' then resolved_program_id := resolved_entity_id;
  elsif tg_table_name = 'program_memberships' then
    if tg_op = 'DELETE' then resolved_program_id := old.program_id; else resolved_program_id := new.program_id; end if;
  end if;

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, program_id, calendar_id, before_data, after_data)
  values (auth.uid(), tg_op, tg_table_name, resolved_entity_id, resolved_program_id, resolved_calendar_id, row_before, row_after);
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;
create trigger audit_programs after insert or update or delete on public.programs for each row execute function public.write_audit_log();
create trigger audit_program_memberships after insert or update or delete on public.program_memberships for each row execute function public.write_audit_log();
create trigger audit_calendars after insert or update or delete on public.calendars for each row execute function public.write_audit_log();
create trigger audit_calendar_days after insert or update or delete on public.calendar_days for each row execute function public.write_audit_log();
create trigger audit_calendar_day_activities after insert or update or delete on public.calendar_day_activities for each row execute function public.write_audit_log();
create trigger audit_requirements after insert or update or delete on public.requirements for each row execute function public.write_audit_log();
create trigger audit_blocked_dates after insert or update or delete on public.blocked_dates for each row execute function public.write_audit_log();
