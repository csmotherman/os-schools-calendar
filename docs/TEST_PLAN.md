# Application Test Plan

Run these tests before real Oakland Schools program data is imported.

## Automated local checks

```bash
npm install
npm run check
```

`npm run check` runs TypeScript checking, ESLint, calendar-engine unit tests, and a production Next.js build. The same stages are represented in `.github/workflows/ci.yml`.

## Required database state

For an existing Supabase project that already ran `001`-`004` and `reference_data.sql`, run migrations `005` through `011` in numeric order before testing the current application.

## Registration and access approval

1. Open `/register` and create Test User A.
2. Confirm email if Supabase email confirmation is enabled.
3. Verify `profiles` contains a `PROGRAM_USER / PENDING` profile.
4. Select Test Program A.
5. Verify a `PENDING` membership exists and `/pending` is shown.
6. Sign in as the test admin and open `/admin/approvals`.
7. Approve Test User A.
8. Verify both profile and membership are approved.
9. Sign back in as Test User A and verify `/dashboard` is available.

Repeat with a second user/program and prove User A cannot read User B's calendar data through the application or direct Supabase requests.

## Decline / resubmit

1. Create another pending test user.
2. Decline the request from `/admin/approvals`.
3. Verify the user sees the declined state.
4. Use **Resubmit access request**.
5. Verify profile/membership return to `PENDING` and reappear in the admin queue.

## Calendar generation

1. Create a calendar from `/calendars/new`.
2. Verify exactly one `calendar_days` row exists for every date in the selected range.
3. Verify normal selected weekdays are in session.
4. Verify active `NO_SESSION` and `NO_ACTIVITY` dates are not in session.
5. Try to create the same program + school year + calendar type again and verify it is rejected.
6. Attempt raw program-user insertion into `calendars`/`calendar_days` and verify RLS rejects it.

## Day editing

Verify:

- Half Day is rejected when In Session = No;
- Break can be used only in the configured session states;
- `NO_SESSION` dates cannot be changed to In Session;
- `NO_ACTIVITY` dates reject tracked activities;
- duplicate activity types on one day are rejected;
- notes/session/activity changes are saved atomically.

## Requirements and submission

1. Configure a blocking session-day requirement.
2. Put the calendar outside the allowed count.
3. Verify the UI reports the failure.
4. Attempt `submit_calendar` directly and verify PostgreSQL also rejects it.
5. Correct the count and submit.
6. Verify status becomes `PENDING` and submitter/timestamp are populated.
7. Verify the program user cannot edit the pending calendar.

## Review / re-review

1. Open the pending calendar from `/admin/approvals`.
2. Request changes with review notes.
3. Verify the user can edit the `CHANGES_REQUESTED` calendar and resubmit it.
4. Approve the corrected calendar.
5. Edit one approved calendar day.
6. Verify status automatically returns to `PENDING` and approval fields clear.
7. Verify the change appears in `audit_log`.

## Admin/settings/reporting

Verify admins can create/deactivate programs, school years, blocked dates, requirements, calendar types, and activity types while normal program users cannot.

Open `/admin/reports`, compare counts to the source calendar, and download the CSV export. Verify the report totals are derived from the relational day/activity data rather than stored duplicate totals.

## Session behavior

Sign in once, close/reopen the browser while the session remains valid, and verify the application restores the session. Then sign out and verify protected pages return to login.

Do not use real program data until authentication, cross-program RLS isolation, workflow restrictions, and database integrity tests all pass.
