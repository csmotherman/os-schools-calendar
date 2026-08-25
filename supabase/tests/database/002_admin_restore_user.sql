begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(8);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11000000-0000-0000-0000-000000000001', 'restore-admin@test.local', '{"first_name":"Restore","last_name":"Admin"}'::jsonb),
  ('11000000-0000-0000-0000-000000000002', 'restore-approved@test.local', '{"first_name":"Restore","last_name":"Approved"}'::jsonb),
  ('11000000-0000-0000-0000-000000000003', 'restore-pending@test.local', '{"first_name":"Restore","last_name":"Pending"}'::jsonb);

update public.profiles
set role = 'ADMIN', account_status = 'APPROVED'
where id = '11000000-0000-0000-0000-000000000001';

update public.profiles
set account_status = 'APPROVED'
where id = '11000000-0000-0000-0000-000000000002';

insert into public.programs (id, name)
values ('22000000-0000-0000-0000-000000000001', 'Restore Test Program');

insert into public.program_memberships (
  id, user_id, program_id, status, approved_by, approved_at
)
values (
  '23000000-0000-0000-0000-000000000001',
  '11000000-0000-0000-0000-000000000002',
  '22000000-0000-0000-0000-000000000001',
  'APPROVED',
  '11000000-0000-0000-0000-000000000001',
  now()
);

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000001';

select lives_ok(
  $$ select public.admin_disable_user('11000000-0000-0000-0000-000000000002') $$,
  'admin can disable an approved program user'
);
select is(
  (select account_status::text from public.profiles where id = '11000000-0000-0000-0000-000000000002'),
  'DISABLED',
  'approved-member user becomes DISABLED'
);
select lives_ok(
  $$ select public.admin_restore_user('11000000-0000-0000-0000-000000000002') $$,
  'admin can restore a disabled user with an approved membership'
);
select is(
  (select account_status::text from public.profiles where id = '11000000-0000-0000-0000-000000000002'),
  'APPROVED',
  'restored user with approved membership returns to APPROVED'
);

select lives_ok(
  $$ select public.admin_disable_user('11000000-0000-0000-0000-000000000003') $$,
  'admin can disable a pending program user'
);
select is(
  (select account_status::text from public.profiles where id = '11000000-0000-0000-0000-000000000003'),
  'DISABLED',
  'pending user becomes DISABLED'
);
select lives_ok(
  $$ select public.admin_restore_user('11000000-0000-0000-0000-000000000003') $$,
  'admin can restore a disabled user without an approved membership'
);
select is(
  (select account_status::text from public.profiles where id = '11000000-0000-0000-0000-000000000003'),
  'PENDING',
  'restored user without approved membership returns to PENDING'
);

select * from finish();
rollback;
