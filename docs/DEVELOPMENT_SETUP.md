# Development / Implementation Status

## Implemented

- Supabase schema v1, helper functions/triggers, RLS, Auth profile trigger, and reference seed data
- security/workflow hardening migrations through `011`
- typed Next.js/Supabase application foundation
- persistent email/password authentication and recovery
- pending program-access registration and admin approval/decline
- declined-request resubmission and profile self-service
- program/admin dashboards
- program directory administration
- atomic calendar generation
- month calendar UI with right-side date editor
- activities, notes, and session-state editing
- live counts and requirement evaluation
- database-enforced blocking requirements at submit/approve
- pending-calendar immutability for program users
- admin review, approve, and changes-requested workflow
- re-review after approved-calendar edits
- school-year, blocked-date, requirement, calendar-type, and activity-type administration
- cross-program reporting and CSV export
- audit viewer
- unit tests for generation/count/requirement logic
- GitHub Actions verification workflow

## Local development setup

1. Install Node.js 20.9+.
2. Clone/pull the repository and enter the project folder.
3. Run `npm install`.
4. Copy `.env.example` to `.env.local`.
5. Populate `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
6. Run `npm run check`.
7. Run `npm run dev`.

## Existing Supabase project upgrade

If `001`-`004` and `reference_data.sql` were already applied, run only `005` through `011` in numeric order. Do not edit the live schema manually to work around a migration error; fix the repository migration first.

## Current validation priority

Before importing the official program list, complete the end-to-end test plan in `TEST_PLAN.md` with Test Program A/B and controlled test accounts. The critical acceptance gates are:

- cross-program RLS isolation;
- program user cannot manipulate approval state;
- pending calendars cannot be edited by program users;
- blocked dates/activity compatibility cannot be bypassed;
- blocking requirements prevent submission/approval through direct RPC as well as UI;
- approved edits reopen review;
- reporting totals match source calendar rows.

## Next product polish after validation

Once the foundation passes those tests, remaining work is refinement rather than missing core architecture: official program/reference-data import, UX/accessibility review, richer admin filters, optional Excel-format export, deployment/domain configuration, operational documentation, and Oakland Schools IT/security review for production use.
