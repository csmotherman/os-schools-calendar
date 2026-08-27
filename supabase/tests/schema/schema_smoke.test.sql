begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(12);

select has_table('public', 'programs', 'programs table exists');
select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'program_memberships', 'program_memberships table exists');
select has_table('public', 'calendars', 'calendars table exists');
select has_table('public', 'calendar_days', 'calendar_days table exists');
select has_table('public', 'calendar_day_activities', 'calendar_day_activities table exists');
select col_is_pk('public', 'calendars', 'id', 'calendars.id is the primary key');
select col_is_pk('public', 'calendar_days', 'id', 'calendar_days.id is the primary key');
select has_function('public', 'has_program_access', array['uuid','uuid'], 'has_program_access exists');
select has_function('public', 'save_calendar_day', array['uuid','boolean','text','uuid[]'], 'save_calendar_day exists');
select is_definer('public', 'save_calendar_day', array['uuid','boolean','text','uuid[]'], 'save_calendar_day is SECURITY DEFINER');
select is_definer('public', 'approve_calendar', array['uuid','text'], 'approve_calendar is SECURITY DEFINER');

select * from finish();
rollback;
