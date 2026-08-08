-- Oakland Schools Calendar
-- Migration 001: core relational schema

create extension if not exists pgcrypto;

create type public.user_role as enum ('PROGRAM_USER', 'ADMIN');
create type public.account_status as enum ('PENDING', 'APPROVED', 'DECLINED', 'DISABLED');
create type public.membership_status as enum ('PENDING', 'APPROVED', 'DECLINED');
create type public.calendar_status as enum ('DRAFT', 'PENDING', 'APPROVED', 'CHANGES_REQUESTED');
create type public.day_length as enum ('PART', 'FULL');
create type public.requirement_metric as enum ('SESSION_DAYS', 'ACTIVITY_DAYS');
create type public.requirement_severity as enum ('BLOCK', 'WARNING');
create type public.blocked_date_restriction as enum ('NO_SESSION', 'NO_ACTIVITY');

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint programs_name_not_blank check (btrim(name) <> '')
);

create unique index programs_name_unique_ci on public.programs (lower(name));

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  first_name text not null,
  last_name text not null,
  role public.user_role not null default 'PROGRAM_USER',
  account_status public.account_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_first_name_not_blank check (btrim(first_name) <> ''),
  constraint profiles_last_name_not_blank check (btrim(last_name) <> '')
);

create table public.program_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  program_id uuid not null references public.programs(id) on delete restrict,
  status public.membership_status not null default 'PENDING',
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_memberships_user_program_unique unique (user_id, program_id),
  constraint program_memberships_approval_consistency check (
    (status = 'APPROVED' and approved_by is not null and approved_at is not null)
    or
    (status <> 'APPROVED' and approved_by is null and approved_at is null)
  )
);

create table public.school_years (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  start_date date not null,
  end_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_years_name_not_blank check (btrim(name) <> ''),
  constraint school_years_date_order check (start_date <= end_date)
);

create table public.calendar_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  days_per_week smallint not null,
  day_length public.day_length not null,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_types_code_not_blank check (btrim(code) <> ''),
  constraint calendar_types_name_not_blank check (btrim(name) <> ''),
  constraint calendar_types_days_per_week check (days_per_week between 1 and 7)
);

create table public.activity_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  allowed_when_in_session boolean not null default true,
  allowed_when_not_in_session boolean not null default true,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_types_code_not_blank check (btrim(code) <> ''),
  constraint activity_types_name_not_blank check (btrim(name) <> ''),
  constraint activity_types_allowed_somewhere check (allowed_when_in_session or allowed_when_not_in_session)
);

create table public.calendars (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete restrict,
  school_year_id uuid not null references public.school_years(id) on delete restrict,
  calendar_type_id uuid not null references public.calendar_types(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  status public.calendar_status not null default 'DRAFT',
  created_by uuid not null references public.profiles(id) on delete restrict,
  submitted_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendars_date_order check (start_date <= end_date),
  constraint calendars_program_year_type_unique unique (program_id, school_year_id, calendar_type_id),
  constraint calendars_submission_pair check (
    (submitted_by is null and submitted_at is null) or
    (submitted_by is not null and submitted_at is not null)
  ),
  constraint calendars_approval_pair check (
    (approved_by is null and approved_at is null) or
    (approved_by is not null and approved_at is not null)
  )
);

create table public.calendar_days (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  date date not null,
  in_session boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_days_calendar_date_unique unique (calendar_id, date)
);

create table public.calendar_day_activities (
  id uuid primary key default gen_random_uuid(),
  calendar_day_id uuid not null references public.calendar_days(id) on delete cascade,
  activity_type_id uuid not null references public.activity_types(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint calendar_day_activities_unique unique (calendar_day_id, activity_type_id)
);

create table public.requirements (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references public.school_years(id) on delete restrict,
  calendar_type_id uuid not null references public.calendar_types(id) on delete restrict,
  metric_type public.requirement_metric not null,
  activity_type_id uuid references public.activity_types(id) on delete restrict,
  minimum_count integer,
  maximum_count integer,
  severity public.requirement_severity not null default 'BLOCK',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint requirements_nonnegative_min check (minimum_count is null or minimum_count >= 0),
  constraint requirements_nonnegative_max check (maximum_count is null or maximum_count >= 0),
  constraint requirements_has_bound check (minimum_count is not null or maximum_count is not null),
  constraint requirements_min_max_order check (
    minimum_count is null or maximum_count is null or minimum_count <= maximum_count
  ),
  constraint requirements_metric_activity_consistency check (
    (metric_type = 'SESSION_DAYS' and activity_type_id is null)
    or
    (metric_type = 'ACTIVITY_DAYS' and activity_type_id is not null)
  )
);

create unique index requirements_session_unique
  on public.requirements (school_year_id, calendar_type_id)
  where metric_type = 'SESSION_DAYS';

create unique index requirements_activity_unique
  on public.requirements (school_year_id, calendar_type_id, activity_type_id)
  where metric_type = 'ACTIVITY_DAYS';

create table public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references public.school_years(id) on delete restrict,
  date date not null,
  name text not null,
  restriction_type public.blocked_date_restriction not null default 'NO_SESSION',
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blocked_dates_name_not_blank check (btrim(name) <> ''),
  constraint blocked_dates_year_date_unique unique (school_year_id, date)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  program_id uuid references public.programs(id) on delete set null,
  calendar_id uuid references public.calendars(id) on delete set null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now(),
  constraint audit_log_action_not_blank check (btrim(action) <> ''),
  constraint audit_log_entity_type_not_blank check (btrim(entity_type) <> '')
);

create index program_memberships_user_status_idx on public.program_memberships (user_id, status);
create index program_memberships_program_status_idx on public.program_memberships (program_id, status);
create index calendars_program_idx on public.calendars (program_id);
create index calendars_school_year_idx on public.calendars (school_year_id);
create index calendars_status_idx on public.calendars (status);
create index calendar_days_calendar_date_idx on public.calendar_days (calendar_id, date);
create index calendar_day_activities_activity_idx on public.calendar_day_activities (activity_type_id);
create index requirements_lookup_idx on public.requirements (school_year_id, calendar_type_id, active);
create index blocked_dates_lookup_idx on public.blocked_dates (school_year_id, date, active);
create index audit_log_program_created_idx on public.audit_log (program_id, created_at desc);
create index audit_log_calendar_created_idx on public.audit_log (calendar_id, created_at desc);
create index audit_log_actor_created_idx on public.audit_log (actor_user_id, created_at desc);
