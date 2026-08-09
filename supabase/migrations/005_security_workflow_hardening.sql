-- Oakland Schools Calendar
-- Migration 005: security/workflow hardening after the initial foundation.
-- Run this migration after 001-004 and reference_data.sql.

-- ---------------------------------------------------------------------------
-- Blocked-date integrity and history
-- ---------------------------------------------------------------------------

create or replace function public.validate_blocked_date_year()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  year_start date;
  year_end date;
begin
  select sy.start_date, sy.end_date
    into year_start, year_end
  from public.school_years sy
  where sy.id = new.school_year_id;

  if year_start is null then
    raise exception 'Selected school year does not exist';
  end if;

  if new.date < year_start or new.date > year_end then
    raise exception 'Blocked date must fall within the selected school year';
  end if;

  return new;
end;
$$;

drop trigger if exists blocked_dates_validate_year on public.blocked_dates;
create trigger blocked_dates_validate_year
before insert or update of school_year_id, date on public.blocked_dates
for each row execute function public.validate_blocked_date_year();

-- Retain inactive historical rows while allowing one replacement active rule
-- for the same date.
alter table public.blocked_dates
  drop constraint if exists blocked_dates_year_date_unique;

create unique index if not exists blocked_dates_active_year_date_unique
  on public.blocked_dates (school_year_id, date)
  where active = true;

-- ---------------------------------------------------------------------------
-- Clearer Auth profile bootstrap failures
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  first_name_value text;
  last_name_value text;
begin
  first_name_value := nullif(btrim(new.raw_user_meta_data ->> 'first_name'), '');
  last_name_value := nullif(btrim(new.raw_user_meta_data ->> 'last_name'), '');

  if first_name_value is null then
    raise exception 'first_name is required for new application users';
  end if;

  if last_name_value is null then
    raise exception 'last_name is required for new application users';
  end if;

  insert into public.profiles (id, first_name, last_name, role, account_status)
  values (new.id, first_name_value, last_name_value, 'PROGRAM_USER', 'PENDING');

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Controlled account approval workflow
-- ---------------------------------------------------------------------------

create or replace function public.admin_approve_access(target_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  select pm.user_id
    into target_user_id
  from public.program_memberships pm
  where pm.id = target_membership_id
  for update;

  if target_user_id is null then
    raise exception 'Program membership not found';
  end if;

  update public.profiles
  set account_status = 'APPROVED'
  where id = target_user_id
    and role = 'PROGRAM_USER';

  update public.program_memberships
  set status = 'APPROVED',
      approved_by = auth.uid(),
      approved_at = now()
  where id = target_membership_id;
end;
$$;

create or replace function public.admin_decline_access(target_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  select pm.user_id
    into target_user_id
  from public.program_memberships pm
  where pm.id = target_membership_id
  for update;

  if target_user_id is null then
    raise exception 'Program membership not found';
  end if;

  update public.program_memberships
  set status = 'DECLINED',
      approved_by = null,
      approved_at = null
  where id = target_membership_id;

  if not exists (
    select 1
    from public.program_memberships pm
    where pm.user_id = target_user_id
      and pm.status = 'APPROVED'
  ) then
    update public.profiles
    set account_status = 'DECLINED'
    where id = target_user_id
      and role = 'PROGRAM_USER';
  end if;
end;
$$;

create or replace function public.admin_disable_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Administrators cannot disable their own account';
  end if;

  update public.profiles
  set account_status = 'DISABLED'
  where id = target_user_id;

  if not found then
    raise exception 'User profile not found';
  end if;
end;
$$;

revoke all on function public.admin_approve_access(uuid) from public;
revoke all on function public.admin_decline_access(uuid) from public;
revoke all on function public.admin_disable_user(uuid) from public;
grant execute on function public.admin_approve_access(uuid) to authenticated;
grant execute on function public.admin_decline_access(uuid) to authenticated;
grant execute on function public.admin_disable_user(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Calendar workflow hardening
-- ---------------------------------------------------------------------------

-- Program users may create only clean DRAFT rows for their approved program.
-- Admins may create rows through the normal table API when needed.
drop policy if exists calendars_insert_program on public.calendars;
create policy calendars_insert_program on public.calendars
for insert to authenticated
with check (
  public.is_admin()
  or (
    public.has_program_access(program_id)
    and created_by = auth.uid()
    and status = 'DRAFT'
    and submitted_by is null
    and submitted_at is null
    and approved_by is null
    and approved_at is null
    and review_notes is null
  )
);

-- Direct table updates are admin-only. Program-user metadata/status changes go
-- through the controlled functions below so approval fields cannot be forged.
drop policy if exists calendars_update_program on public.calendars;
drop policy if exists calendars_update_admin on public.calendars;
create policy calendars_update_admin on public.calendars
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.update_calendar_details(
  target_calendar_id uuid,
  new_start_date date,
  new_end_date date,
  new_calendar_type_id uuid
)
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

  update public.calendars
  set start_date = new_start_date,
      end_date = new_end_date,
      calendar_type_id = new_calendar_type_id,
      status = case when current_status = 'APPROVED' then 'PENDING' else current_status end,
      approved_by = case when current_status = 'APPROVED' then null else approved_by end,
      approved_at = case when current_status = 'APPROVED' then null else approved_at end
  where id = target_calendar_id;
end;
$$;

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

  update public.calendars
  set status = 'APPROVED',
      approved_by = auth.uid(),
      approved_at = now(),
      review_notes = nullif(btrim(notes), '')
  where id = target_calendar_id;
end;
$$;

create or replace function public.request_calendar_changes(
  target_calendar_id uuid,
  notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status public.calendar_status;
  clean_notes text;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  clean_notes := nullif(btrim(notes), '');
  if clean_notes is null then
    raise exception 'Review notes are required when requesting changes';
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
    raise exception 'Only pending calendars can have changes requested';
  end if;

  update public.calendars
  set status = 'CHANGES_REQUESTED',
      approved_by = null,
      approved_at = null,
      review_notes = clean_notes
  where id = target_calendar_id;
end;
$$;

revoke all on function public.update_calendar_details(uuid, date, date, uuid) from public;
revoke all on function public.submit_calendar(uuid) from public;
revoke all on function public.approve_calendar(uuid, text) from public;
revoke all on function public.request_calendar_changes(uuid, text) from public;
grant execute on function public.update_calendar_details(uuid, date, date, uuid) to authenticated;
grant execute on function public.submit_calendar(uuid) to authenticated;
grant execute on function public.approve_calendar(uuid, text) to authenticated;
grant execute on function public.request_calendar_changes(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Expand audit coverage for identity/reference-data administration
-- ---------------------------------------------------------------------------

drop trigger if exists audit_profiles on public.profiles;
create trigger audit_profiles
after update on public.profiles
for each row execute function public.write_audit_log();

drop trigger if exists audit_school_years on public.school_years;
create trigger audit_school_years
after insert or update or delete on public.school_years
for each row execute function public.write_audit_log();

drop trigger if exists audit_calendar_types on public.calendar_types;
create trigger audit_calendar_types
after insert or update or delete on public.calendar_types
for each row execute function public.write_audit_log();

drop trigger if exists audit_activity_types on public.activity_types;
create trigger audit_activity_types
after insert or update or delete on public.activity_types
for each row execute function public.write_audit_log();
