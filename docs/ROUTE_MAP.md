# Route Map

## Implemented authentication/account routes

- `/` — redirects to login or dashboard based on session
- `/login` — email/password sign in
- `/register` — first name, last name, email, password
- `/check-email` — email-confirmation instructions
- `/auth/callback` — exchanges Supabase auth code for a cookie-backed session
- `/select-program` — authenticated program dropdown and pending access request
- `/pending` — account/program approval status
- `/forgot-password` — request password reset
- `/reset-password` — set a new password from a recovery session

There is intentionally no Google, Microsoft, or other social login.

## Implemented dashboard foundations

- `/dashboard` — protected program-user landing page; redirects pending/unapproved users appropriately
- `/admin/dashboard` — protected admin landing page with basic pending/calendar counts

## Planned program-user routes

- `/calendars` — calendars for the user's approved program
- `/calendars/[calendarId]` — calendar grid/editing screen
- `/summary` — calendar counts and validation summary
- `/profile` — basic account information

## Planned admin routes

- `/admin/programs` — official program directory
- `/admin/programs/[programId]` — program detail, users, calendars
- `/admin/users` — account/program-access administration
- `/admin/approvals` — pending user access and pending calendar review queues
- `/admin/calendars` — all calendars with filters
- `/admin/calendars/[calendarId]` — inspect/edit a calendar
- `/admin/reports` — cross-program reporting and export
- `/admin/settings/calendar-types` — 4/5-Day Part/Full Day reference data
- `/admin/settings/activity-types` — Half Day, Conference, Professional Learning, Home Visit, Break
- `/admin/settings/requirements` — min/max thresholds by school year and calendar type
- `/admin/settings/blocked-dates` — district-wide no-session/no-activity dates
- `/admin/settings/school-years` — school-year setup
- `/admin/audit-log` — administrative history
