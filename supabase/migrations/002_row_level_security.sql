-- Oakland Schools Calendar
-- Migration 002: Row Level Security
-- Apply after 001_initial_schema.sql and 003_database_functions.sql.

alter table public.programs enable row level security;
alter table public.profiles enable row level security;
alter table public.program_memberships enable row level security;
alter table public.school_years enable row level security;
alter table public.calendar_types enable row level security;
alter table public.activity_types enable row level security;
alter table public.calendars enable row level security;
alter table public.calendar_days enable row level security;
alter table public.calendar_day_activities enable row level security;
alter table public.requirements enable row level security;
alter table public.blocked_dates enable row level security;
alter table public.audit_log enable row level security;

-- Reference data is readable by authenticated users. Only admins may modify it.
create policy programs_select_authenticated
on public.programs for select
to authenticated
using (active = true or public.is_admin());

create policy programs_admin_write
on public.programs for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy school_years_select_authenticated
on public.school_years for select
to authenticated
using (active = true or public.is_admin());

create policy school_years_admin_write
on public.school_years for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy calendar_types_select_authenticated
on public.calendar_types for select
to authenticated
using (active = true or public.is_admin());

create policy calendar_types_admin_write
on public.calendar_types for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy activity_types_select_authenticated
on public.activity_types for select
to authenticated
using (active = true or public.is_admin());

create policy activity_types_admin_write
on public.activity_types for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy requirements_select_authenticated
on public.requirements for select
to authenticated
using (active = true or public.is_admin());

create policy requirements_admin_write
on public.requirements for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy blocked_dates_select_authenticated
on public.blocked_dates for select
to authenticated
using (active = true or public.is_admin());

create policy blocked_dates_admin_write
on public.blocked_dates for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Users may read their own profile; admins may read and manage all profiles.
create policy profiles_select_self_or_admin
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy profiles_update_admin
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Membership requests are visible to their owner and admins.
create policy memberships_select_self_or_admin
on public.program_memberships for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy memberships_insert_self_pending
on public.program_memberships for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'PENDING'
  and approved_by is null
  and approved_at is null
);

create policy memberships_admin_update
on public.program_memberships for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Calendar access follows approved program membership. Admins are covered by has_program_access().
create policy calendars_select_program
on public.calendars for select
to authenticated
using (public.has_program_access(program_id));

create policy calendars_insert_program
on public.calendars for insert
to authenticated
with check (
  public.has_program_access(program_id)
  and (created_by = auth.uid() or public.is_admin())
);

create policy calendars_update_program
on public.calendars for update
to authenticated
using (public.has_program_access(program_id))
with check (public.has_program_access(program_id));

create policy calendar_days_select_program
on public.calendar_days for select
to authenticated
using (
  exists (
    select 1
    from public.calendars c
    where c.id = calendar_days.calendar_id
      and public.has_program_access(c.program_id)
  )
);

create policy calendar_days_insert_program
on public.calendar_days for insert
to authenticated
with check (
  exists (
    select 1
    from public.calendars c
    where c.id = calendar_days.calendar_id
      and public.has_program_access(c.program_id)
  )
);

create policy calendar_days_update_program
on public.calendar_days for update
to authenticated
using (
  exists (
    select 1
    from public.calendars c
    where c.id = calendar_days.calendar_id
      and public.has_program_access(c.program_id)
  )
)
with check (
  exists (
    select 1
    from public.calendars c
    where c.id = calendar_days.calendar_id
      and public.has_program_access(c.program_id)
  )
);

create policy calendar_day_activities_select_program
on public.calendar_day_activities for select
to authenticated
using (
  exists (
    select 1
    from public.calendar_days cd
    join public.calendars c on c.id = cd.calendar_id
    where cd.id = calendar_day_activities.calendar_day_id
      and public.has_program_access(c.program_id)
  )
);

create policy calendar_day_activities_insert_program
on public.calendar_day_activities for insert
to authenticated
with check (
  exists (
    select 1
    from public.calendar_days cd
    join public.calendars c on c.id = cd.calendar_id
    where cd.id = calendar_day_activities.calendar_day_id
      and public.has_program_access(c.program_id)
  )
);

create policy calendar_day_activities_delete_program
on public.calendar_day_activities for delete
to authenticated
using (
  exists (
    select 1
    from public.calendar_days cd
    join public.calendars c on c.id = cd.calendar_id
    where cd.id = calendar_day_activities.calendar_day_id
      and public.has_program_access(c.program_id)
  )
);

-- Normal application flows do not hard-delete calendars or calendar days.
-- Admin-only cleanup can be performed through controlled server/service operations if ever required.

create policy audit_log_select_admin
on public.audit_log for select
to authenticated
using (public.is_admin());

-- Audit rows are written by security-definer database triggers, not directly by clients.
