# Supabase Setup Plan

No Supabase project credentials are committed yet.

## Supabase responsibilities

- PostgreSQL database
- Email/password Auth
- Persistent sessions used by the Next.js application
- Row Level Security
- Schema migrations
- Seed/reference data

## Repository locations

- `src/lib/supabase/client/` — future browser client setup
- `src/lib/supabase/server/` — future server client setup
- `src/lib/supabase/middleware/` — future session/request helpers if required by the chosen Next.js/Supabase pattern
- `supabase/migrations/` — versioned schema migrations
- `supabase/seed/` — reference/initial data
- `supabase/policies/` — policy design/support files if policies are not kept entirely inside migrations

## Environment variables

`.env.example` contains variable names only. Real local values belong in `.env.local`, which is ignored by Git.

Expected public variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

A privileged service-role key may be needed for tightly controlled server-only admin operations. If used, it must never be exposed to the browser or stored under a `NEXT_PUBLIC_` variable.

## RLS rule

Every table exposed through Supabase's public API schema must have Row Level Security enabled before production use. Policies should explicitly target authenticated users and constrain program users to their authorized records while allowing admins only the access they require.
