# Authorization

Authentication answers **who the user is**. Authorization answers **what that user may access**.

## Program user

Planned capabilities:

- View only authorized program/calendar data
- Edit authorized calendar data
- View summary/count validation
- Submit a calendar for review
- Edit an approved calendar, which returns it to pending review
- Maintain basic own profile information where allowed

Planned restrictions:

- No access to unrelated programs
- No system-wide reports
- No admin rule changes
- No blocked-date changes
- No approvals
- No user/role administration

## Admin

Planned capabilities:

- View and edit all programs/calendars
- Review and approve pending submissions
- View historical submissions
- Configure program types and activity types
- Configure school-year thresholds
- Configure blocked dates
- Manage users/program affiliations
- Run reports and exports
- View audit history

## Enforcement

UI hiding is not security. Supabase Row Level Security must enforce access directly at the database level on every exposed application table. Server-side privileged operations must separately verify admin authorization before using privileged credentials.
