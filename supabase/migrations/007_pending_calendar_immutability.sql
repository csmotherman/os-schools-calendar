-- Oakland Schools Calendar
-- Migration 007: freeze program-user edits while a calendar is pending review.
-- Admins retain system-wide edit authority. Approved calendars remain editable;
-- the existing triggers immediately return them to PENDING for re-review.

create or replace function public.calendar_is_program_editable(target_calendar_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.calendars c
      where c.id = target_calendar_id
        and public.has_program_access(c.program_id)
        and c.status in ('DRAFT', 'CHANGES_REQUESTED', 'APPROVED')
    );
$$;

revoke all on function public.calendar_is_program_editable(uuid) from public;
grant execute on function public.calendar_is_program_editable(uuid) to authenticated;

drop policy if exists calendar_days_insert_program on public.calendar_days;
create policy calendar_days_insert_program on public.calendar_days
for insert to authenticated
with check (public.calendar_is_program_editable(calendar_id));

drop policy if exists calendar_days_update_program on public.calendar_days;
create policy calendar_days_update_program on public.calendar_days
for update to authenticated
using (public.calendar_is_program_editable(calendar_id))
with check (public.calendar_is_program_editable(calendar_id));

drop policy if exists calendar_day_activities_insert_program on public.calendar_day_activities;
create policy calendar_day_activities_insert_program on public.calendar_day_activities
for insert to authenticated
with check (
  exists (
    select 1 from public.calendar_days cd
    where cd.id = calendar_day_activities.calendar_day_id
      and public.calendar_is_program_editable(cd.calendar_id)
  )
);

drop policy if exists calendar_day_activities_delete_program on public.calendar_day_activities;
create policy calendar_day_activities_delete_program on public.calendar_day_activities
for delete to authenticated
using (
  exists (
    select 1 from public.calendar_days cd
    where cd.id = calendar_day_activities.calendar_day_id
      and public.calendar_is_program_editable(cd.calendar_id)
  )
);

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
  target_calendar_id uuid;
  target_status public.calendar_status;
  activity_id uuid;
begin
  select c.program_id, c.id, c.status
    into target_program_id, target_calendar_id, target_status
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

  if not public.is_admin() and target_status = 'PENDING' then
    raise exception 'Pending calendars cannot be edited until review is complete';
  end if;

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

  if not public.is_admin() and current_status = 'PENDING' then
    raise exception 'Pending calendars cannot be edited until review is complete';
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
