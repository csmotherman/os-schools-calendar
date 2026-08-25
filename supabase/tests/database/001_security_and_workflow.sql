begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(36);

-- Stable fixture identities. Everything rolls back at the end of this file.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('10000000-0000-0000-0000-000000000001', 'admin@test.local', '{"first_name":"Admin","last_name":"Test"}'::jsonb),
  ('10000000-0000-0000-0000-000000000002', 'user-a@test.local', '{"first_name":"User","last_name":"A"}'::jsonb),
  ('10000000-0000-0000-0000-000000000003', 'user-b@test.local', '{"first_name":"User","last_name":"B"}'::jsonb),
  ('10000000-0000-0000-0000-000000000004', 'pending@test.local', '{"first_name":"Pending","last_name":"User"}'::jsonb);

update public.profiles
set role = 'ADMIN', account_status = 'APPROVED'
where id = '10000000-0000-0000-0000-000000000001';

update public.profiles
set account_status = 'APPROVED'
where id in (
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003'
);

insert into public.programs (id, name)
values
  ('20000000-0000-0000-0000-000000000001', 'Test Program A'),
  ('20000000-0000-0000-0000-000000000002', 'Test Program B');

insert into public.program_memberships (id, user_id, program_id, status, approved_by, approved_at)
values
  (
    '21000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    'APPROVED',
    '10000000-0000-0000-0000-000000000001',
    now()
  ),
  (
    '21000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000002',
    'APPROVED',
    '10000000-0000-0000-0000-000000000001',
    now()
  ),
  (
    '21000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000001',
    'PENDING',
    null,
    null
  );

insert into public.school_years (id, name, start_date, end_date)
values ('30000000-0000-0000-0000-000000000001', 'Test 2026-27', '2026-09-01', '2027-06-30');

insert into public.calendar_types (id, code, name, days_per_week, day_length, display_order)
values ('40000000-0000-0000-0000-000000000001', 'TEST_5_DAY', 'Test 5-Day Full Day', 5, 'FULL', 999);

insert into public.blocked_dates (id, school_year_id, date, name, restriction_type, created_by)
values (
  '60000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '2026-09-02',
  'Test blocked date',
  'NO_SESSION',
  '10000000-0000-0000-0000-000000000001'
);

-- A valid A calendar has two session days; B has only one, so B cannot submit.
insert into public.requirements (
  id, school_year_id, calendar_type_id, metric_type,
  minimum_count, maximum_count, severity
)
values (
  '70000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  'SESSION_DAYS',
  2,
  null,
  'BLOCK'
);

create temp table test_ids (
  key text primary key,
  id uuid not null
);
grant select on test_ids to authenticated;

-- 1-6: migration/RLS baseline.
select is(
  (select max(version) from supabase_migrations.schema_migrations),
  '020',
  'fresh database applies migrations through 020'
);
select is((select relrowsecurity from pg_class where oid = 'public.calendars'::regclass), true, 'calendars has RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.calendar_days'::regclass), true, 'calendar_days has RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.calendar_day_activities'::regclass), true, 'calendar_day_activities has RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.program_memberships'::regclass), true, 'program_memberships has RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.audit_log'::regclass), true, 'audit_log has RLS enabled');

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';

-- 7-12: Program A access and atomic creation.
select ok(public.has_program_access('20000000-0000-0000-0000-000000000001'), 'User A has access to Program A');
select is(public.has_program_access('20000000-0000-0000-0000-000000000002'), false, 'User A has no access to Program B');

select throws_ok(
  $$
    insert into public.calendars (
      program_id, school_year_id, calendar_type_id, start_date, end_date, status, created_by
    ) values (
      '20000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000001',
      '2026-09-01', '2026-09-03', 'DRAFT',
      '10000000-0000-0000-0000-000000000002'
    )
  $$,
  '42501',
  null,
  'program users cannot bypass the atomic calendar creation RPC'
);

select lives_ok(
  $$
    select public.create_calendar_with_days(
      '20000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000001',
      '2026-09-01',
      '2026-09-03',
      '[
        {"date":"2026-09-01","in_session":true},
        {"date":"2026-09-02","in_session":false},
        {"date":"2026-09-03","in_session":true}
      ]'::jsonb
    )
  $$,
  'approved program user can create a complete calendar atomically'
);

select is(
  (
    select count(*)::integer
    from public.calendar_days cd
    join public.calendars c on c.id = cd.calendar_id
    where c.program_id = '20000000-0000-0000-0000-000000000001'
  ),
  3,
  'atomic creation creates exactly one row per date'
);

select is(
  (
    select cd.in_session
    from public.calendar_days cd
    join public.calendars c on c.id = cd.calendar_id
    where c.program_id = '20000000-0000-0000-0000-000000000001'
      and cd.date = '2026-09-02'
  ),
  false,
  'blocked date is out of session'
);

-- Capture known IDs outside RLS so later tests can deliberately attack them.
reset role;
insert into test_ids (key, id)
select 'a_calendar', id
from public.calendars
where program_id = '20000000-0000-0000-0000-000000000001';
insert into test_ids (key, id)
select 'a_day_1', cd.id
from public.calendar_days cd
join public.calendars c on c.id = cd.calendar_id
where c.program_id = '20000000-0000-0000-0000-000000000001'
  and cd.date = '2026-09-01';
insert into test_ids (key, id)
select 'a_day_blocked', cd.id
from public.calendar_days cd
join public.calendars c on c.id = cd.calendar_id
where c.program_id = '20000000-0000-0000-0000-000000000001'
  and cd.date = '2026-09-02';

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';

-- 13-16: controlled day editing and database rules.
select throws_ok(
  $$
    delete from public.calendar_days
    where calendar_id = (select id from test_ids where key = 'a_calendar')
  $$,
  '42501',
  null,
  'program users cannot directly delete calendar days'
);

select lives_ok(
  $$
    select public.save_calendar_day(
      (select id from test_ids where key = 'a_day_1'),
      true,
      'saved through controlled RPC',
      '{}'::uuid[]
    )
  $$,
  'controlled day-save RPC accepts a valid own-program edit'
);

select is(
  (select notes from public.calendar_days where id = (select id from test_ids where key = 'a_day_1')),
  'saved through controlled RPC',
  'controlled day save persists the note'
);

select throws_ok(
  $$
    select public.save_calendar_day(
      (select id from test_ids where key = 'a_day_blocked'),
      true,
      '',
      '{}'::uuid[]
    )
  $$,
  'P0001',
  'Children cannot be in session on this blocked date',
  'database trigger rejects session on a blocked date'
);

-- 17-20: Program B cannot see or mutate Program A, but can create its own calendar.
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';

select is(
  (select count(*)::integer from public.calendars where program_id = '20000000-0000-0000-0000-000000000001'),
  0,
  'cross-program RLS hides Program A calendars from User B'
);

select throws_ok(
  $$
    select public.save_calendar_day(
      (select id from test_ids where key = 'a_day_1'),
      true,
      'attack',
      '{}'::uuid[]
    )
  $$,
  '42501',
  'Calendar access denied',
  'cross-program direct RPC attack is denied'
);

select lives_ok(
  $$
    select public.create_calendar_with_days(
      '20000000-0000-0000-0000-000000000002',
      '30000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000001',
      '2026-09-01',
      '2026-09-02',
      '[
        {"date":"2026-09-01","in_session":true},
        {"date":"2026-09-02","in_session":false}
      ]'::jsonb
    )
  $$,
  'User B can create a calendar only for Program B'
);

select is(
  (
    select count(*)::integer
    from public.calendar_days cd
    join public.calendars c on c.id = cd.calendar_id
    where c.program_id = '20000000-0000-0000-0000-000000000002'
  ),
  2,
  'Program B calendar has its complete two-day range'
);

-- 21-22: pending identity does not mean authorized data access.
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000004';
select is(public.has_program_access('20000000-0000-0000-0000-000000000001'), false, 'pending user has no program access');
select is((select count(*)::integer from public.calendars), 0, 'pending user cannot read calendars');

-- 23-24: blocking requirement is enforced by PostgreSQL, not only UI.
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';
select throws_ok(
  $$
    select public.submit_calendar(
      (select id from public.calendars where program_id = '20000000-0000-0000-0000-000000000002')
    )
  $$,
  'P0001',
  'Calendar has blocking requirement failures and cannot be submitted',
  'blocking requirement prevents submission through a direct RPC call'
);
select is(
  (select status::text from public.calendars where program_id = '20000000-0000-0000-0000-000000000002'),
  'DRAFT',
  'failed submission leaves Program B calendar in DRAFT'
);

-- 25-28: valid A calendar submits, locks, and cannot self-approve.
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';
select lives_ok(
  $$ select public.submit_calendar((select id from test_ids where key = 'a_calendar')) $$,
  'valid Program A calendar submits successfully'
);
select is(
  (select status::text from public.calendars where id = (select id from test_ids where key = 'a_calendar')),
  'PENDING',
  'submitted calendar enters PENDING review'
);
select throws_ok(
  $$
    select public.save_calendar_day(
      (select id from test_ids where key = 'a_day_1'),
      true,
      'should fail while pending',
      '{}'::uuid[]
    )
  $$,
  'P0001',
  'Pending calendars cannot be edited until review is complete',
  'program user cannot edit a pending calendar'
);
select throws_ok(
  $$ select public.approve_calendar((select id from test_ids where key = 'a_calendar'), null) $$,
  '42501',
  'Administrator access required',
  'program user cannot approve a calendar'
);

-- 29-31: approved administrator reviews across programs.
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
select is((select count(*)::integer from public.calendars), 2, 'admin can read calendars across programs');
select lives_ok(
  $$ select public.approve_calendar((select id from test_ids where key = 'a_calendar'), 'validated') $$,
  'admin can approve a valid pending calendar'
);
select is(
  (select status::text from public.calendars where id = (select id from test_ids where key = 'a_calendar')),
  'APPROVED',
  'approved calendar has APPROVED status'
);

-- 32-33: a later program correction automatically reopens review.
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';
select lives_ok(
  $$
    select public.save_calendar_day(
      (select id from test_ids where key = 'a_day_1'),
      true,
      'post-approval correction',
      '{}'::uuid[]
    )
  $$,
  'program user may correct an approved calendar'
);
select is(
  (select status::text from public.calendars where id = (select id from test_ids where key = 'a_calendar')),
  'PENDING',
  'editing an approved calendar automatically reopens review'
);

-- 34-36: auditability and controlled destructive administration.
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
select ok(
  (select count(*) > 0 from public.audit_log where calendar_id = (select id from test_ids where key = 'a_calendar')),
  'admin can see audit history for calendar changes'
);
select lives_ok(
  $$ select public.delete_calendar((select id from test_ids where key = 'a_calendar')) $$,
  'admin can use the controlled calendar deletion RPC'
);
select is(
  (select count(*)::integer from public.calendars where id = (select id from test_ids where key = 'a_calendar')),
  0,
  'controlled admin deletion removes the selected calendar'
);

select * from finish();
rollback;
