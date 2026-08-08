# Development / Implementation Sequence

The project is intentionally not coding features yet.

## Phase 0 — architecture

- Confirm program/calendar access model
- Receive official program list and categories
- Freeze schema v1.0
- Freeze reference/dropdown values
- Document business rules

## Phase 1 — application foundation

- Initialize Next.js + TypeScript
- Add styling/component system
- Add Supabase dependencies
- Configure browser/server Supabase clients
- Configure cookie-based sessions
- Establish environment handling

## Phase 2 — database/auth security

- Create schema migrations
- Seed reference data
- Configure email/password authentication
- Create profile/access model
- Enable/test RLS on every exposed table
- Implement admin authorization

## Phase 3 — calendar core

- Calendar generation engine
- Calendar grid
- Day side-panel editor
- Activity compatibility rules
- Requirement validation
- Blocked-date enforcement
- Counts/summary

## Phase 4 — workflow/admin

- Submission and approval flow
- Re-approval after edits
- Program/user administration
- Requirements and blocked-date administration
- Audit history

## Phase 5 — reporting

- Admin reporting queries/views
- Filters
- CSV/Excel-friendly export
- Validation/compliance dashboard

Each phase should be working and testable before the next one adds complexity.
