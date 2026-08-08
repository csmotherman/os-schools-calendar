# Supabase Setup

The Supabase project is created and the initial database migrations/reference seed have been applied.

## Supabase responsibilities

- PostgreSQL database
- Email/password Auth
- Persistent sessions used by the Next.js application
- Row Level Security
- Database functions/triggers
- Schema migrations
- Reference data

## Repository locations

- `lib/supabase/client.ts` — browser client
- `lib/supabase/server.ts` — cookie-aware server client
- `lib/supabase/proxy.ts` — session refresh/cookie propagation
- `proxy.ts` — Next.js 16 request proxy that calls the Supabase session helper
- `supabase/migrations/` — versioned executable database migrations
- `supabase/seed/` — reference/test data
- `supabase/policies/` — policy documentation/support files; canonical executable RLS remains in migrations

## Environment variables

Copy `.env.example` to `.env.local` and populate values from the Supabase project **Connect** dialog.

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

The current application foundation intentionally does not use a service-role key. Add one only if a future server-only operation cannot be safely implemented using the authenticated user's session and RLS.

## Authentication flow

`@supabase/ssr` is used for browser/server clients. The root `proxy.ts` refreshes auth state and propagates cookies. Server-side authorization decisions should use a validated user (`getUser`/appropriate verified auth state), then rely on RLS for row access.

## RLS rule

Every exposed application table has RLS enabled. Program users require an approved profile plus approved program membership. Admin access is granted through the database `is_admin()` helper and related policies.

## Migration discipline

Applied migration files are historical records. Do not edit an already-applied migration and assume the live database changes with GitHub. Future database changes should be added as a new migration and then applied to Supabase.
