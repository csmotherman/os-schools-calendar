# Supabase Setup

Supabase provides PostgreSQL, Auth, persistent sessions, Row Level Security, database functions/triggers, and the application's controlled RPC layer.

## Repository locations

- `supabase/config.toml` — committed local Supabase configuration
- `supabase/migrations/` — canonical versioned schema changes
- `supabase/seed/reference_data.sql` — stable local/reference seed values
- `supabase/tests/database/` — pgTAP security/workflow integration tests
- `lib/supabase/client.ts` — browser client
- `lib/supabase/server.ts` — cookie-aware server client
- `lib/supabase/proxy.ts` — session refresh/cookie propagation
- `proxy.ts` — Next.js request proxy
- `types/database.ts` — application database/RPC types

## Environment variables

Copy `.env.example` to `.env.local` and populate:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

The application intentionally does not require a service-role key. Do not place privileged keys or database passwords in a `NEXT_PUBLIC_*` variable.

## Canonical migration sequence

The current repository contains migrations `001` through `020`:

1. `001_initial_schema.sql`
2. `002_database_functions.sql`
3. `003_row_level_security.sql`
4. `004_auth_profile_trigger.sql`
5. `005_security_workflow_hardening.sql`
6. `006_calendar_application_api.sql`
7. `007_pending_calendar_immutability.sql`
8. `008_requirement_workflow_enforcement.sql`
9. `009_account_self_service.sql`
10. `010_final_security_refinements.sql`
11. `011_atomic_generation_enforcement.sql`
12. `012_official_program_directory.sql`
13. `013_program_directory_api.sql`
14. `014_program_request_api.sql`
15. `015_access_state_api.sql`
16. `016_explicit_authenticated_table_privileges.sql`
17. `017_fix_program_request_role_comparison.sql`
18. `018_fix_program_request_current_role_collision.sql`
19. `019_calendar_workflow_transaction_hardening.sql`
20. `020_admin_calendar_deletion.sql`

Run `npm run migrations:verify` to reject duplicate or missing numbered migration files.

## Fresh local database

Install Docker and Supabase CLI, then run:

```bash
supabase start
supabase db reset
supabase test db --local
supabase db lint --local --level error --fail-on error
```

`supabase db reset` must be able to rebuild the database entirely from repository migrations and configured seed files. If it cannot, production deployment is blocked.

## Existing hosted project

Do not manually decide that only a subset of migrations "probably" needs to run. Compare the hosted migration history to Git:

```bash
supabase login
supabase link --project-ref <PROJECT_REF>
supabase migration list --linked
supabase db push --linked --dry-run
```

Review the output before applying anything. After approval:

```bash
supabase db push --linked
```

Never run `supabase db reset --linked` against production.

## Database security verification

The pgTAP test suite directly simulates authenticated users and verifies:

- cross-program RLS isolation;
- pending-account isolation;
- controlled calendar creation;
- blocked-date enforcement;
- blocking-requirement enforcement;
- pending-calendar immutability;
- denial of program-user approval;
- admin cross-program review;
- audit history;
- controlled deletion.

These tests are intentionally database-level so UI behavior cannot hide a broken policy or RPC.

## Migration discipline

Applied migrations are historical records. Do not patch the hosted schema with one-off SQL that is absent from the repository. Add the next migration, validate it against a fresh local database, run pgTAP/lint, and then apply it through the controlled deployment process.

See `PRODUCTION_READINESS.md` for the complete release gate.
