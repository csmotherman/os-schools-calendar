# Foundation Test Plan

Run these tests before calendar implementation begins.

## Local application checks

- `npm install`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run dev`

## Registration

1. Open `/register`.
2. Create a test account with first name, last name, email, and password.
3. Confirm email if Supabase email confirmation is enabled.
4. Verify `public.profiles` contains the Auth user with:
   - `role = PROGRAM_USER`
   - `account_status = PENDING`
5. Verify the user is directed to `/select-program` after authentication.
6. Select Test Program A.
7. Verify `public.program_memberships` contains one `PENDING` row for that user/program.
8. Verify the user sees `/pending` and cannot access program calendars.

## First admin

Follow `ADMIN_BOOTSTRAP.md` to promote one controlled test account to `ADMIN` + `APPROVED`.

Verify `/dashboard` redirects that account to `/admin/dashboard`.

## Approval/RLS test

Until the approval UI is implemented, use controlled Supabase admin/SQL changes to approve the test program user and membership.

Then verify:

- approved Test User A can read Test Program A and its calendars;
- Test User A cannot read Test Program B calendars;
- Test User A cannot access admin-only configuration/history;
- pending/declined users cannot read calendar rows;
- admin can read all test programs/calendars.

## Session behavior

- sign in once;
- close/reopen the browser while the session remains valid;
- verify the application restores the session instead of asking for credentials every visit;
- sign out and verify protected pages return to login.

## Database integrity tests before calendar UI

Verify the database rejects or enforces:

- duplicate program + school year + calendar type;
- calendar outside the selected school year;
- calendar day outside the calendar range;
- Half Day on a non-session date;
- session on an active `NO_SESSION` blocked date;
- any tracked activity on an active `NO_ACTIVITY` date;
- change to an approved calendar returning it to `PENDING`;
- duplicate activity type on the same calendar day.

Do not import production program data or build around a failing authorization test. Fix the database/application foundation first.
