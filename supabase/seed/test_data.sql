-- Oakland Schools Calendar
-- Optional non-production test data.
--
-- Deliberately contains no auth users. Supabase auth.users records should be
-- created through Auth or a controlled local-test workflow, not fabricated
-- here with production-like credentials.

insert into public.programs (name)
values
  ('Test Program A'),
  ('Test Program B'),
  ('Test Program C')
on conflict do nothing;

insert into public.school_years (name, start_date, end_date)
values ('2026-27', '2026-07-01', '2027-06-30')
on conflict (name) do nothing;
