# Oakland Schools GSRP Calendar

Secure web application for creating, reviewing, approving, and reporting Oakland Schools program calendars.

## Current implementation

The repository now contains a working Next.js/Supabase application foundation plus the first complete calendar-management workflow.

Implemented:

- Next.js 16 App Router + TypeScript
- typed Supabase browser/server clients using `@supabase/ssr`
- cookie-based persistent email/password authentication
- email confirmation and password recovery
- self-registration with pending program-access approval
- declined-request resubmission and safe profile-name updates
- program-level Row Level Security
- admin user-access approval/decline/disable workflow
- official program directory administration
- calendar generation from school year, calendar type, date range, and normal weekdays
- automatic blocked-date handling during generation
- month calendar grid with right-side day editor
- In Session, activities, and notes editing
- live session/activity-day counts
- configurable blocking/warning requirements
- draft → pending → approved / changes-requested workflow
- approved-calendar edits automatically reopening review
- pending calendars frozen from program-user edits
- admin calendar review and correction
- school-year, blocked-date, requirement, calendar-type, and activity-type settings
- cross-program reporting with CSV export
- audit-log viewer
- calendar-engine unit tests
- GitHub Actions typecheck/lint/test/build workflow

## Database migration status

If the Supabase project already has migrations `001` through `004` plus `supabase/seed/reference_data.sql`, do **not** rerun them.

Run the newer migrations in order:

1. `supabase/migrations/005_security_workflow_hardening.sql`
2. `supabase/migrations/006_calendar_application_api.sql`
3. `supabase/migrations/007_pending_calendar_immutability.sql`
4. `supabase/migrations/008_requirement_workflow_enforcement.sql`
5. `supabase/migrations/009_account_self_service.sql`
6. `supabase/migrations/010_final_security_refinements.sql`
7. `supabase/migrations/011_atomic_generation_enforcement.sql`

These migrations are additive/hardening migrations for an already-created database. GitHub remains the source of truth; do not make one-off SQL changes in Supabase that are not represented in the repository.

## Local setup

1. Install Node.js 20.9 or newer.
2. Clone/pull the repository.
3. Run `npm install`.
4. Copy `.env.example` to `.env.local`.
5. Add the Supabase Project URL and publishable key from the Supabase Connect dialog.
6. Keep `NEXT_PUBLIC_SITE_URL=http://localhost:3000` for local development.
7. Run `npm run check`.
8. Run `npm run dev`.
9. Open `http://localhost:3000`.

Available checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run check
```

## User workflow

A new program user:

1. enters first name, last name, email, and password;
2. confirms their email when email confirmation is enabled;
3. selects an official program;
4. submits a pending program-access request;
5. receives no calendar access until an administrator approves the request;
6. creates one calendar per school-year/calendar-type combination;
7. edits dates through the calendar day drawer;
8. resolves blocking requirements and submits the calendar;
9. receives approval or requested changes from an administrator.

Approved calendars remain editable, but any saved day change automatically returns the calendar to `PENDING` for re-review. A program user cannot edit a calendar while it is already `PENDING`.

## Security model

Supabase RLS, PostgreSQL constraints, triggers, and narrowly scoped `SECURITY DEFINER` functions are the authoritative security/integrity layer. UI redirects and hidden controls are not treated as security boundaries.

Program users cannot directly create raw calendar rows, manipulate approval fields, approve their own calendars, or edit pending calendars. Atomic application functions create the complete generated date set and save day/activity changes transactionally.

Never commit real credentials. `.env.local` is ignored by Git. The current application does not require a Supabase service-role key.

## Documentation

See [`docs/`](docs/) for architecture, database, authentication, authorization, calendar rules, security, reporting, testing, and deployment notes.
