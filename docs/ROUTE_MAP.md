# Planned Route Map

## Authentication

- `/login` — email/password sign in
- `/forgot-password` — request password reset
- `/reset-password` — set a new password

There is intentionally no Google, Microsoft, or other social login in the initial design.

## Program user

- `/dashboard` — affiliated program, calendar statuses, next action
- `/calendars` — calendars available to the user's program/access assignment
- `/calendars/[calendarId]` — calendar editing screen
- `/summary` — counts and validation summary
- `/profile` — first name, last name, email, basic account information

## Admin

- `/admin/dashboard` — system-wide status summary
- `/admin/programs` — program directory
- `/admin/programs/[programId]` — program detail, users, calendars
- `/admin/calendars` — all calendars with filters
- `/admin/calendars/[calendarId]` — inspect/edit a calendar
- `/admin/approvals` — pending calendar review queue
- `/admin/reports` — cross-program reporting and exports
- `/admin/users` — user administration
- `/admin/settings/program-types` — 4/5-Day Part/Full Day reference data
- `/admin/settings/activity-types` — Half Day, Conference, Professional Learning, Home Visit, Break
- `/admin/settings/program-categories` — LEA/PSA/CBO/etc. reference data
- `/admin/settings/requirements` — min/max thresholds by school year and program type
- `/admin/settings/blocked-dates` — district-wide no-session/no-activity dates
- `/admin/settings/school-years` — school-year setup
- `/admin/audit-log` — administrative history

Routes are placeholders only in the architecture phase; no page implementation exists yet.
