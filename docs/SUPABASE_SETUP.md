# Supabase Setup

The Supabase project is created and the initial `001`-`004` migrations plus reference seed were applied during the foundation setup.

## Supabase responsibilities

- PostgreSQL database
- email/password Auth
- persistent sessions used by the Next.js application
- Row Level Security
- database functions/triggers
- atomic application RPCs
- schema migrations
- reference data

## Repository locations

- `lib/supabase/client.ts` — typed browser client
- `lib/supabase/server.ts` — typed cookie-aware server client
- `lib/supabase/proxy.ts` — session refresh/cookie propagation
- `proxy.ts` — Next.js 16 request proxy
- `types/database.ts` — application database/RPC types
- `supabase/migrations/` — versioned executable database migrations
- `supabase/seed/` — reference/test data
- `supabase/policies/` — policy documentation/support files; canonical executable RLS remains in migrations

## Environment variables

Copy `.env.example` to `.env.local` and populate values from the Supabase project Connect dialog.

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

The application intentionally does not require a service-role key. Privileged operations are implemented as narrowly-scoped PostgreSQL functions that verify the authenticated user/admin before mutating data.

## Current migration sequence

Fresh database:

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
12. `seed/reference_data.sql`

For the existing project where `001`-`004` and reference data were already applied, run only `005` through `011` now. The existing seed data does not need to be rerun.

## Security behavior added after the initial schema

The hardening migrations add blocked-date/year validation, controlled admin access approval, calendar workflow RPCs, pending-calendar immutability, database-enforced blocking requirements, safe account self-service, additional audit coverage, and atomic calendar generation. Program users cannot create raw calendar records or manipulate approval fields directly.

## Migration discipline

Applied migration files are historical records. Do not change live Supabase manually to work around an application error. Add/fix the next migration in GitHub, then apply it deliberately to Supabase so repository history remains the source of truth.
