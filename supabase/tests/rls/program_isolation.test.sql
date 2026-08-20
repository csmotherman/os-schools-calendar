begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(13);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated', 'admin@test.local', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Test","last_name":"Admin"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated', 'program-a@test.local', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Program","last_name":"A"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000a3', 'authenticated', 'authenticated', 'program-b@test.local', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Program","last_name":"B"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000a4', 'authenticated', 'authenticated', 'pending@test.local', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Pending","last_name":"User"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000a5', 'authenticated', 'authenticated', 'disabled@test.local', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Disabled","last_name":"User"}', now(), now());

update public.profiles set role = 'ADMIN', account_status = 'APPROVED'
where id = '00000000-0000-0000-0000-0000000000a1';
update public.profiles set account_status = 'APPROVED'
where id in ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3');
update public.profiles set account_status = 'DISABLED'
where id = '00000000-0000-0000-0000-0000000000a5';

insert into public.programs (id, name) values
  ('00000000-0000-0000-0000-0000000000b1', 'RLS Test Program A'),
  ('00000000-0000-0000-0000-0000000000b2', 'RLS Test Program B');

insert into public.program_memberships (id, user_id, program_id, status, approved_by, approved_at) values
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000b1', 'APPROVED', '00000000-0000-0000-0000-0000000000a1', now()),
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000b2', 'APPROVED', '00000000-0000-0000-0000-0000000000a1', now()),
  ('00000000-0000-0000-0000-0000000000b5', '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000b1', 'PENDING', null, null),
  ('00000000-0000-0000-0000-0000000000b6', '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000b1', 'APPROVED', '00000000-0000-0000-0000-0000000000a1', now());

insert into public.school_years (id, name, start_date, end_date)
values ('00000000-0000-0000-0000-0000000000c1', 'RLS Test 2026-27', '2026-09-01', '2027-06-30');

insert into public.calendar_types (id, code, name, days_per_week, day_length)
values ('00000000-0000-0000-0000-0000000000d1', 'RLS5', 'RLS Five Day', 5, 'FULL');

insert into public.calendars (id, program_id, school_year_id, calendar_type_id, start_date, end_date, status, created_by) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', '2026-09-01', '2026-09-01', 'DRAFT', '00000000-0000-0000-0000-0000000000a2'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', '2026-09-01', '2026-09-01', 'DRAFT', '00000000-0000-0000-0000-0000000000a3');

insert into public.calendar_days (id, calendar_id, date, in_session) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1', '2026-09-01', true),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000e2', '2026-09-01', true);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select results_eq('select count(*)::bigint from public.calendars', 'values (1::bigint)', 'Program A sees exactly its own calendar');
select results_eq('select count(*)::bigint from public.calendar_days', 'values (1::bigint)', 'Program A sees exactly its own calendar days');
select results_eq($$select count(*)::bigint from public.calendars where id = '00000000-0000-0000-0000-0000000000e2'$$, 'values (0::bigint)', 'Program A cannot read Program B calendar');
select throws_ok(
  $$select public.save_calendar_day('00000000-0000-0000-0000-0000000000f2'::uuid, false, 'forbidden', '{}'::uuid[])$$,
  '42501', 'Calendar access denied', 'Program A cannot mutate Program B calendar day'
);
select lives_ok(
  $$select public.save_calendar_day('00000000-0000-0000-0000-0000000000f1'::uuid, true, 'own note', '{}'::uuid[])$$,
  'Program A can mutate its own draft calendar day'
);
select results_eq($$select notes from public.calendar_days where id = '00000000-0000-0000-0000-0000000000f1'$$, $$values ('own note'::text)$$, 'Program A own-day update persisted');
select throws_ok(
  $$select public.approve_calendar('00000000-0000-0000-0000-0000000000e1'::uuid, null)$$,
  '42501', 'Administrator access required', 'Program user cannot approve a calendar'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a3', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select results_eq('select count(*)::bigint from public.calendars', 'values (1::bigint)', 'Program B sees exactly its own calendar');
select results_eq($$select count(*)::bigint from public.calendars where id = '00000000-0000-0000-0000-0000000000e1'$$, 'values (0::bigint)', 'Program B cannot read Program A calendar');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a4', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select results_eq('select count(*)::bigint from public.calendars', 'values (0::bigint)', 'Pending user sees no calendars');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a5', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select results_eq('select count(*)::bigint from public.calendars', 'values (0::bigint)', 'Disabled user sees no calendars even with an approved membership');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select results_eq('select count(*)::bigint from public.calendars', 'values (2::bigint)', 'Admin sees calendars across both programs');
select results_eq('select count(*)::bigint from public.calendar_days', 'values (2::bigint)', 'Admin sees calendar days across both programs');

select * from finish();
rollback;
