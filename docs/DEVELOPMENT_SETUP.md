# Development / Validation Setup

## Implemented

- Supabase schema, helper functions/triggers, RLS, Auth profile trigger, and reference data
- migrations through `021`
- typed Next.js/Supabase application foundation
- persistent email/password authentication and recovery
- pending program-access registration and admin approval/decline
- declined-request resubmission and profile self-service
- program/admin dashboards
- official program directory administration
- atomic calendar generation and range updates
- month calendar UI with day editing and bulk editing
- activities, notes, and session-state editing
- live counts and requirement evaluation
- database-enforced blocking requirements at submit/approve
- pending-calendar immutability for program users
- admin review, approval, changes-requested workflow, and controlled deletion with deletion-safe audit capture
- re-review after approved-calendar edits
- school-year, blocked-date, requirement, calendar-type, and activity-type administration
- cross-program reporting and CSV export
- audit viewer
- application unit tests
- pgTAP database security/workflow tests
- GitHub Actions application + database verification

## Local application setup

1. Install Node.js 20.9+.
2. Clone/pull the repository.
3. Run `npm ci`.
4. Copy `.env.example` to `.env.local`.
5. Populate the three documented public environment variables.
6. Run `npm run check`.
7. Run `npm run dev`.

## Local database validation

Install a Docker-compatible runtime and Supabase CLI. The repository already contains `supabase/config.toml`.

```bash
supabase start
supabase db reset
supabase test db --local
supabase db lint --local --level error --fail-on error
supabase stop --no-backup
```

A clean reset is mandatory before treating a migration set as releasable.

## Hosted project upgrade

Do not use old instructions that stop at migration `011`. The repository currently contains migrations through `021`.

For any hosted staging/production project:

```bash
supabase link --project-ref <PROJECT_REF>
supabase migration list --linked
supabase db push --linked --dry-run
```

Only apply migrations after reviewing the hosted-vs-repository history.

## Critical acceptance gates

Automated and manual validation must prove:

- cross-program RLS isolation;
- pending accounts receive no calendar access;
- program users cannot manipulate approval state;
- pending calendars cannot be edited by program users;
- blocked dates/activity compatibility cannot be bypassed;
- blocking requirements prevent direct RPC submission/approval;
- approved edits reopen review;
- audit history is preserved, including controlled calendar deletion;
- reporting totals match source calendar rows;
- auth confirmation/reset/session flows work on the deployed staging origin.

## Production

Passing code and database tests makes the application technically releasable; it does not replace Oakland Schools organizational approval. Production also requires the operational, backup/recovery, accessibility, SMTP/auth, domain, and IT/security gates in `PRODUCTION_READINESS.md`.
