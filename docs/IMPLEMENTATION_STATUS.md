# Implementation Status

## Implemented

- authentication/session foundation
- pending program-access registration and admin approval
- program-level authorization/RLS
- typed Supabase clients
- atomic calendar generation and range updates
- month calendar/day editing and bulk edits
- activities, notes, session state, and derived counts
- configurable blocked dates and requirements
- database-enforced submission/approval rules
- pending-calendar edit lock
- approved-edit re-review behavior
- admin programs/users/approvals/calendars/settings/reporting/audit screens
- controlled admin calendar deletion
- CSV reporting export
- official program directory migration
- migrations through `020`
- calendar-engine unit tests
- pgTAP RLS/security/workflow integration tests
- migration continuity verification
- GitHub Actions application + database verification
- baseline production HTTP security headers
- production-readiness runbook

## Technical validation required for every release

The repository is not considered releasable unless:

1. `npm run check` passes.
2. `supabase db reset` succeeds against a clean local database.
3. `supabase test db --local` passes.
4. `supabase db lint --local --level error --fail-on error` passes.
5. hosted staging migration history is compared with `supabase migration list --linked`.
6. `supabase db push --linked --dry-run` shows only understood/approved changes.
7. staging authentication and major user/admin workflows are accepted.

## Production organizational gates

Code completion does not authorize production use. Before real organizational use, complete:

- Oakland Schools IT/security review and hosting/domain approval;
- canonical production Supabase Auth URL/redirect configuration;
- approved SMTP configuration;
- backup/recovery ownership and restore testing;
- accessibility/UX acceptance with representative users;
- production support, access-approval, database, deployment, and incident ownership.

See `PRODUCTION_READINESS.md` for the complete go/no-go checklist.

## Data boundary

The application is designed for program/calendar operational data. Do not add child/student names, DOBs, UICs, addresses, medical/IEP information, or other child-level records without a separate privacy/security design review.
