# Development / Implementation Sequence

## Current state

### Completed foundation

- Schema v1 created in Supabase
- Database helper functions/triggers applied
- Row Level Security applied
- Auth profile trigger applied
- Calendar/activity reference data seeded
- Next.js + TypeScript project initialized
- Supabase SSR browser/server clients added
- Next.js 16 session `proxy.ts` added
- Email/password registration and login added
- Email confirmation callback added
- Authenticated program-selection step added
- Pending account/access state added
- Protected program/admin dashboard foundations added

## Local development setup

1. Install Node.js 20.9+.
2. Clone the repository and enter the project folder.
3. Run `npm install`.
4. Copy `.env.example` to `.env.local`.
5. Populate:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
6. Run `npm run dev`.
7. Run `npm run typecheck`, `npm run lint`, and `npm run build` before pushing significant application changes.

## Next implementation slice — validate authentication

Before building calendars, prove the real account flow end to end:

- Sign up through `/register`
- Confirm email if enabled
- Verify `profiles` row is created as `PENDING`
- Select Test Program A through `/select-program`
- Verify `program_memberships` row is `PENDING`
- Bootstrap a test admin account
- Approve the test user/account affiliation
- Verify the program user can access only the approved program
- Verify the admin can see system-wide data
- Verify logout and persistent login behavior

## Following slice — admin account approval

After auth/RLS validation:

- Pending-account queue
- Approve/decline account and membership together
- Clear user-facing status messages
- Audit approval decisions
- Avoid partial approval states through a transactional database function if needed

## Calendar core

Only after authorization passes:

- Create one calendar per program + school year + calendar type
- Ask for start/end dates and normal session weekdays
- Auto-generate calendar dates
- Calendar grid
- Click day → right-side editor
- In Session Yes/No
- Activity checkboxes
- Notes
- Requirement validation
- Blocked-date enforcement
- Live counts

## Workflow/admin

- Calendar submission
- Admin review/approval
- Approved-calendar edit → Pending
- Requirements administration
- Blocked-date administration
- Program/user administration
- Audit history

## Reporting

- Cross-program admin summary
- Filters by school year/calendar type/status
- Session/activity counts
- Compliance reporting
- CSV/Excel-friendly export

Each slice should be tested before adding the next one. The calendar UI should not be used to compensate for authorization or integrity problems in the database.
