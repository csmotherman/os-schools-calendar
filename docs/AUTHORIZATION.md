# Authorization

Authentication answers **who the user is**. Authorization answers **what that user may access**.

## Program user

Access prerequisites:

- authenticated Supabase user;
- `profiles.account_status = APPROVED`;
- approved `program_memberships` row for the target program.

Capabilities after approval:

- view the approved program;
- view all calendars belonging to that program;
- create allowed calendar types for that program/year;
- edit authorized calendar data;
- view counts/validation;
- submit calendars for review;
- edit an approved calendar, which returns it to `PENDING`;
- view their own account/access state.

Restrictions:

- no access to unrelated program/calendar rows;
- no system-wide reports;
- no admin rule changes;
- no blocked-date changes;
- no calendar approvals;
- no user/role administration.

## Pending user

An authenticated user with a pending profile or pending membership may use only the account-setup/status data allowed by RLS. Selecting a program does not grant calendar access.

## Admin

An approved profile with role `ADMIN` receives system-wide access through the database `is_admin()` authorization helper/policies.

Planned/allowed capabilities:

- view/edit all programs and calendars;
- review/approve user access and calendar submissions;
- configure calendar types/activity types where allowed;
- configure school-year thresholds;
- configure blocked dates;
- manage users/program affiliations;
- run reports/exports;
- view audit history.

## Enforcement

UI hiding and route redirects are not security. Supabase RLS enforces row access directly in PostgreSQL.

Application server code should still verify the signed-in user's account/role for navigation and sensitive workflows. Privileged service credentials should not be introduced merely to bypass RLS.
