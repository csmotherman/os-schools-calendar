# Application Test Plan

This plan has two layers: automated database/application gates and deployed staging acceptance. Both are required before production.

## 1. Automated application checks

```bash
npm ci
npm run check
```

`npm run check` runs migration-sequence verification, TypeScript checking, ESLint, calendar-engine unit tests, and a production Next.js build.

## 2. Automated database security/workflow checks

Requires Docker and Supabase CLI.

```bash
supabase start
supabase db reset
supabase test db --local
supabase db lint --local --level error --fail-on error
supabase stop --no-backup
```

The pgTAP suite in `supabase/tests/database/` directly verifies the critical database security/workflow layer, including:

- migrations apply through `021`;
- RLS remains enabled;
- program users cannot bypass controlled calendar creation;
- program users cannot directly delete calendar-day rows;
- cross-program reads and RPC mutations are denied;
- pending accounts receive no calendar data access;
- blocked dates cannot be bypassed through direct RPC calls;
- blocking requirements prevent direct submission;
- pending calendars are immutable to program users;
- program users cannot approve calendars;
- admins can review across programs;
- approved edits reopen review;
- audit history is visible to admins;
- controlled admin deletion works without violating audit foreign keys.

These tests roll back their fixture data.

## 3. Hosted migration validation

Before staging acceptance:

```bash
supabase link --project-ref <STAGING_PROJECT_REF>
supabase migration list --linked
supabase db push --linked --dry-run
supabase db lint --linked --level error --fail-on error
```

The hosted migration history must match the repository through `021` after approved migrations are applied.

## 4. Registration and access approval — staging

1. Open `/register` and create Test User A.
2. Confirm email if confirmation is enabled.
3. Verify the account proceeds to program selection, not directly to calendar access.
4. Select Test Program A.
5. Verify `/pending` is shown.
6. Sign in as the test admin and open `/admin/approvals`.
7. Approve Test User A.
8. Sign back in as Test User A and verify `/dashboard` is available.
9. Repeat with Test User B/Test Program B.
10. Spot-check that User A cannot open a known Program B calendar URL and User B cannot open a known Program A URL.

The database suite already attacks the underlying RLS/RPC boundary; this staging test validates the deployed routing/session experience.

## 5. Decline / resubmit — staging

1. Create another pending test user.
2. Decline the request from `/admin/approvals`.
3. Verify the user sees the declined state.
4. Use **Resubmit access request**.
5. Verify the request returns to the admin queue.

## 6. Authentication lifecycle — staging

Test:

- registration email delivery;
- confirmation callback;
- login with correct credentials;
- generic failure with incorrect credentials;
- persistent session after browser close/reopen while session remains valid;
- explicit sign-out;
- password-reset email;
- reset callback;
- successful login with the new password;
- disabled-account behavior.

Also verify production/staging callback URLs do not redirect to localhost or an obsolete preview origin.

## 7. Calendar generation — staging

1. Create a calendar from `/calendars/new`.
2. Verify every date in the selected range appears exactly once.
3. Verify normal selected weekdays are initially in session.
4. Verify configured `NO_SESSION` / `NO_ACTIVITY` dates are handled correctly.
5. Attempt to create the same program + school year + calendar type again and verify it is rejected.
6. Change the date range and verify existing in-range edits are preserved while added/removed dates are correct.

## 8. Day and bulk editing — staging

Verify:

- Half Day is rejected when incompatible with session state;
- Break obeys configured session-state compatibility;
- `NO_SESSION` dates cannot be set to In Session;
- `NO_ACTIVITY` dates reject tracked activities;
- duplicate activity types are not created;
- notes/session/activity changes save atomically;
- bulk edits apply to the selected dates only;
- bulk edit limits and error messages behave correctly;
- refresh after save reflects persisted database state.

## 9. Requirements and submission — staging

1. Configure a blocking session-day requirement.
2. Put a calendar outside the allowed count.
3. Verify the UI reports the failure.
4. Verify submission is rejected.
5. Correct the count and submit.
6. Verify status becomes `PENDING` and submission metadata is populated.
7. Verify the program user cannot edit the pending calendar.

The pgTAP suite separately proves the blocking rule cannot be bypassed by calling the database RPC directly.

## 10. Review / re-review — staging

1. Open the pending calendar from `/admin/approvals`.
2. Request changes with review notes.
3. Verify the program user can edit the `CHANGES_REQUESTED` calendar and resubmit it.
4. Approve the corrected calendar.
5. Edit one approved calendar day as the program user.
6. Verify status automatically returns to `PENDING` and approval metadata clears.
7. Verify the change appears in the audit log.

## 11. Admin/settings/reporting — staging

Verify admins can create/deactivate programs, school years, blocked dates, requirements, calendar types, and activity types while normal program users cannot perform those actions.

Open `/admin/reports`, compare counts to known source calendars, and download CSV. Verify totals are derived from relational day/activity data and match the source calendars.

Test controlled admin calendar deletion with test-only data. Verify the calendar is removed and the DELETE audit row preserves the deleted calendar UUID as `entity_id` without retaining an invalid `calendar_id` foreign-key reference.

## 12. Accessibility / usability acceptance

With representative users, test:

- desktop and common mobile widths;
- keyboard-only navigation;
- visible focus;
- form labels and error association;
- calendar/day-editor usability;
- status communication without relying only on color;
- screen-reader navigation through the primary workflows;
- confirmation dialogs/destructive-action clarity.

## 13. Production gate

Do not use real organizational data until all automated checks pass and the staging, operational, backup/recovery, accessibility, auth/SMTP, domain, and Oakland Schools IT/security gates in `PRODUCTION_READINESS.md` are complete.
