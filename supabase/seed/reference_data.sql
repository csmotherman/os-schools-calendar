-- Oakland Schools Calendar
-- Stable reference/dropdown values.

insert into public.calendar_types (code, name, days_per_week, day_length, display_order)
values
  ('4_DAY_PART', '4-Day Part Day', 4, 'PART', 10),
  ('4_DAY_FULL', '4-Day Full Day', 4, 'FULL', 20),
  ('5_DAY_PART', '5-Day Part Day', 5, 'PART', 30),
  ('5_DAY_FULL', '5-Day Full Day', 5, 'FULL', 40)
on conflict (code) do update set
  name = excluded.name,
  days_per_week = excluded.days_per_week,
  day_length = excluded.day_length,
  display_order = excluded.display_order,
  active = true;

insert into public.activity_types (
  code,
  name,
  allowed_when_in_session,
  allowed_when_not_in_session,
  display_order
)
values
  ('HALF_DAY', 'Half Day', true, false, 10),
  ('CONFERENCE', 'Conference', true, true, 20),
  ('PROFESSIONAL_LEARNING', 'Professional Learning', true, true, 30),
  ('HOME_VISIT', 'Home Visit', true, true, 40),
  ('BREAK', 'Break', false, true, 50)
on conflict (code) do update set
  name = excluded.name,
  allowed_when_in_session = excluded.allowed_when_in_session,
  allowed_when_not_in_session = excluded.allowed_when_not_in_session,
  display_order = excluded.display_order,
  active = true;
