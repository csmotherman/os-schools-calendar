-- Oakland Schools Calendar
-- Migration 016: make PostgREST table privileges explicit.
--
-- RLS policies decide WHICH rows an authenticated user may access. PostgreSQL
-- table privileges decide whether PostgREST may attempt the operation at all.
-- The original migrations enabled RLS and created policies but relied on
-- project/default grants. That made direct application reads dependent on
-- environment defaults and caused authenticated pages to receive permission
-- errors that the UI sometimes rendered as empty data.
--
-- These grants do NOT bypass RLS. Every direct operation below remains subject
-- to the policies already defined on the table.

grant usage on schema public to authenticated;

-- Authenticated application pages need to read reference/configuration data,
-- their own scoped program/calendar data, and (for admins) system-wide data.
-- Existing RLS policies continue to enforce self/program/admin boundaries.
grant select on table
  public.programs,
  public.profiles,
  public.program_memberships,
  public.school_years,
  public.calendar_types,
  public.activity_types,
  public.calendars,
  public.calendar_days,
  public.calendar_day_activities,
  public.requirements,
  public.blocked_dates,
  public.audit_log
to authenticated;

-- These reference/configuration tables are intentionally maintained from the
-- admin UI with direct INSERT/UPDATE operations. Their write policies require
-- public.is_admin(), so granting the SQL privilege does not let program users
-- modify them.
grant insert, update on table
  public.programs,
  public.school_years,
  public.calendar_types,
  public.activity_types,
  public.requirements,
  public.blocked_dates
to authenticated;

-- Retain the narrowly-scoped membership/calendar write APIs. Do not broadly
-- grant direct writes to profiles, memberships, calendars, calendar days, or
-- audit data here.

-- Reassert function execution needed by RLS predicates. This is deliberately
-- explicit so later privilege changes cannot make SELECT policies unusable.
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.has_program_access(uuid, uuid) to authenticated;
