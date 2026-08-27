begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(6);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
('00000000-0000-0000-0000-0000000001a1','authenticated','authenticated','workflow-admin@test.local',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"first_name":"Workflow","last_name":"Admin"}',now(),now()),
('00000000-0000-0000-0000-0000000001a2','authenticated','authenticated','workflow-user@test.local',crypt('password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"first_name":"Workflow","last_name":"User"}',now(),now());

update public.profiles set role='ADMIN', account_status='APPROVED' where id='00000000-0000-0000-0000-0000000001a1';
update public.profiles set account_status='APPROVED' where id='00000000-0000-0000-0000-0000000001a2';
insert into public.programs(id,name) values ('00000000-0000-0000-0000-0000000001b1','Workflow Test Program');
insert into public.program_memberships(id,user_id,program_id,status,approved_by,approved_at)
values ('00000000-0000-0000-0000-0000000001b2','00000000-0000-0000-0000-0000000001a2','00000000-0000-0000-0000-0000000001b1','APPROVED','00000000-0000-0000-0000-0000000001a1',now());
insert into public.school_years(id,name,start_date,end_date) values ('00000000-0000-0000-0000-0000000001c1','Workflow Test Year','2026-09-01','2027-06-30');
insert into public.calendar_types(id,code,name,days_per_week,day_length) values ('00000000-0000-0000-0000-0000000001d1','WF5','Workflow Five Day',5,'FULL');
insert into public.calendars(id,program_id,school_year_id,calendar_type_id,start_date,end_date,status,created_by)
values ('00000000-0000-0000-0000-0000000001e1','00000000-0000-0000-0000-0000000001b1','00000000-0000-0000-0000-0000000001c1','00000000-0000-0000-0000-0000000001d1','2026-09-01','2026-09-02','DRAFT','00000000-0000-0000-0000-0000000001a2');
insert into public.calendar_days(id,calendar_id,date,in_session) values
('00000000-0000-0000-0000-0000000001f1','00000000-0000-0000-0000-0000000001e1','2026-09-01',true),
('00000000-0000-0000-0000-0000000001f2','00000000-0000-0000-0000-0000000001e1','2026-09-02',true);
insert into public.requirements(id,school_year_id,calendar_type_id,metric_type,minimum_count,severity)
values ('00000000-0000-0000-0000-0000000001f3','00000000-0000-0000-0000-0000000001c1','00000000-0000-0000-0000-0000000001d1','SESSION_DAYS',3,'BLOCK');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000001a2',true);
select set_config('request.jwt.claim.role','authenticated',true);
select throws_ok($$select public.submit_calendar('00000000-0000-0000-0000-0000000001e1'::uuid)$$, 'Calendar has blocking requirement failures and cannot be submitted', 'Blocking requirement prevents submission');

reset role;
update public.requirements set minimum_count=2 where id='00000000-0000-0000-0000-0000000001f3';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000001a2',true);
select lives_ok($$select public.submit_calendar('00000000-0000-0000-0000-0000000001e1'::uuid)$$, 'Valid draft can be submitted');
select results_eq($$select status::text from public.calendars where id='00000000-0000-0000-0000-0000000001e1'$$, $$values ('PENDING'::text)$$, 'Submission moves calendar to PENDING');
select throws_ok($$select public.save_calendar_day('00000000-0000-0000-0000-0000000001f1'::uuid,true,'locked','{}'::uuid[])$$, 'Pending calendars cannot be edited until review is complete', 'Pending calendar is immutable for program user');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000001a1',true);
select set_config('request.jwt.claim.role','authenticated',true);
select lives_ok($$select public.approve_calendar('00000000-0000-0000-0000-0000000001e1'::uuid,null)$$, 'Admin can approve valid pending calendar');
select results_eq($$select status::text from public.calendars where id='00000000-0000-0000-0000-0000000001e1'$$, $$values ('APPROVED'::text)$$, 'Approval moves calendar to APPROVED');

select * from finish();
rollback;
