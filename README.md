# Oakland Schools GSRP Calendar

Secure Next.js/Supabase application for creating, reviewing, approving, and reporting Oakland Schools program calendars.

## Current implementation

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
- month calendar grid with date editor
- In Session, activities, notes, and bulk day editing
- live session/activity-day counts
- configurable blocking/warning requirements
- draft → pending → approved / changes-requested workflow
- approved-calendar edits automatically reopening review
- pending calendars frozen from program-user edits
- admin calendar review and controlled deletion
- school-year, blocked-date, requirement, calendar-type, and activity-type settings
- cross-program reporting with CSV export
- audit-log viewer
- calendar-engine unit tests
- pgTAP RLS/security/workflow integration tests
- GitHub Actions application + database verification

## Database migrations

`supabase/migrations/` is the schema source of truth. The current sequence is `001` through `020`.

Do not manually recreate the schema from selected SQL snippets. For a clean local database, let the Supabase CLI apply the full migration history in order.

Verify the repository migration sequence:

```bash
npm run migrations:verify
```

Verify a clean database:

```bash
supabase start
supabase db reset
supabase test db --local
supabase db lint --local --level error --fail-on error
```

For an existing hosted project, use `supabase migration list --linked` and `supabase db push --linked --dry-run` before applying pending migrations. Never use `supabase db reset --linked` against production.

## Local setup

Requirements:

- Node.js 20.9+
- Docker-compatible container runtime for local Supabase database testing
- Supabase CLI for database integration tests

Setup:

```bash
npm ci
cp .env.example .env.local
npm run check
npm run dev
```

Populate `.env.local` with:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

The application does not require a Supabase service-role key.

## Automated checks

```bash
npm run migrations:verify
npm run typecheck
npm run lint
npm test
npm run build
npm run check
```

Database security/workflow verification:

```bash
supabase start
supabase test db --local
supabase db lint --local --level error --fail-on error
supabase stop --no-backup
```

CI runs the application checks and database checks as separate jobs.

## User workflow

A new program user:

1. creates an email/password account;
2. confirms email when confirmation is enabled;
3. selects an official program;
4. submits a pending access request;
5. receives no calendar access until an administrator approves the request;
6. creates one calendar per school-year/calendar-type combination;
7. edits dates and activities;
8. resolves blocking requirements and submits the calendar;
9. receives approval or requested changes from an administrator.

Approved calendars remain editable, but a saved calendar change returns the calendar to `PENDING` for re-review. Program users cannot edit a calendar while it is already `PENDING`.

## Security model

Supabase RLS, PostgreSQL constraints, triggers, and narrowly scoped `SECURITY DEFINER` functions are the authoritative security/integrity layer. UI redirects and hidden controls are not security boundaries.

The pgTAP suite directly tests cross-program isolation, pending-user access, blocked-date enforcement, requirement enforcement, pending-calendar immutability, self-approval denial, admin approval, audit history, and controlled deletion.

Never commit credentials. `.env.local` is ignored by Git. Keep privileged credentials out of all `NEXT_PUBLIC_*` variables.

The application currently handles program/calendar operational data, not child/student records. Adding child-level information requires a separate privacy/security review.

## Production release

Read [`docs/PRODUCTION_READINESS.md`](docs/PRODUCTION_READINESS.md) before any live deployment. Production still requires successful automated gates, hosted migration verification, staging acceptance, approved auth/SMTP configuration, backup/recovery ownership, accessibility testing, and Oakland Schools IT/security approval.

## Documentation

See [`docs/`](docs/) for architecture, authentication, authorization, database rules, security, reporting, testing, deployment, and production-readiness guidance.
