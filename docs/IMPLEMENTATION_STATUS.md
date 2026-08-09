# Implementation Status

## Implemented and ready for validation

- authentication/session foundation
- pending program-access registration and admin approval
- program-level authorization/RLS
- typed Supabase clients
- atomic calendar generation
- month calendar/day drawer editing
- activities, notes, session state, and derived counts
- configurable blocked dates and requirements
- database-enforced submission/approval rules
- pending-calendar edit lock
- approved-edit re-review behavior
- admin programs/users/approvals/calendars/settings/reporting/audit screens
- CSV reporting export
- calendar-engine unit tests and CI workflow

## Required before real data

1. Apply migrations `005` through `011` to the existing Supabase project in numeric order.
2. Run `npm install` and `npm run check` locally.
3. Complete `docs/TEST_PLAN.md` with Test Program A/B and controlled accounts.
4. Verify cross-program RLS isolation with direct Supabase requests, not only UI navigation.
5. Import the official program list only after the security/workflow tests pass.

## Production still requires

- final real reference data and requirement values
- Oakland Schools IT/security review and hosting/domain approval
- operational ownership/backups/support decisions
- accessibility/UX acceptance testing with actual users
