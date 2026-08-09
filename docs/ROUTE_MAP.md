# Route Map

## Authentication/account

- `/` — redirects to login or dashboard based on session
- `/login` — email/password sign in
- `/register` — first name, last name, email, password
- `/check-email` — email-confirmation instructions
- `/auth/callback` — exchanges Supabase auth code for a cookie-backed session
- `/select-program` — authenticated program dropdown and pending access request
- `/pending` — pending/declined/disabled account state and declined-request resubmission
- `/forgot-password` — request password reset
- `/reset-password` — set a new password from a recovery session
- `/profile` — account information and safe first/last-name update

There is intentionally no Google, Microsoft, or other social login.

## Program user

- `/dashboard` — program status and navigation
- `/calendars` — calendars for the user's approved program
- `/calendars/new` — calendar generation wizard
- `/calendars/[calendarId]` — month grid, day editor, counts, validation, and submission
- `/summary` — cross-calendar session/activity totals for the program

## Admin

- `/admin/dashboard` — system-wide workflow summary and navigation
- `/admin/programs` — official program directory and active/inactive control
- `/admin/programs/[programId]` — program users and calendars
- `/admin/users` — account/program-access administration
- `/admin/approvals` — pending user-access and calendar-review queues
- `/admin/calendars` — all calendars with status filtering
- `/admin/calendars/[calendarId]` — inspect/edit/review a calendar
- `/admin/reports` — cross-program reporting and CSV export
- `/admin/reports/export` — authenticated CSV route
- `/admin/settings` — settings hub
- `/admin/settings/calendar-types` — calendar-type reference data
- `/admin/settings/activity-types` — activity-type reference data
- `/admin/settings/requirements` — min/max thresholds by school year and calendar type
- `/admin/settings/blocked-dates` — district-wide no-session/no-activity dates
- `/admin/settings/school-years` — school-year setup
- `/admin/audit-log` — latest audited database changes
