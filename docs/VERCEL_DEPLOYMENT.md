# Vercel Deployment Plan

## Prototype

The Next.js application can be connected to this GitHub repository for preview/prototype deployments. Environment variables must be configured in Vercel rather than committed to GitHub.

## Required Vercel environment variables

Configure these for the appropriate Vercel environments:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

For production, `NEXT_PUBLIC_SITE_URL` should be the canonical production origin, for example `https://calendar.example.org` with no trailing slash.

The current application foundation does not require a Supabase service-role key.

## Supabase Auth redirect configuration

Before testing email confirmation/password recovery on a deployed Vercel URL, add the intended application origins/redirect URLs to Supabase Auth URL configuration. The application sends users back through `/auth/callback`.

Keep localhost allowed while developing locally and remove obsolete preview origins when they are no longer needed.

## GitHub deployment behavior

Vercel should build the Next.js application from the repository. Supabase schema deployment is a separate concern; do not assume a successful Vercel build means database migrations have been applied.

## Production caution

Production hosting for Oakland Schools should be approved by Oakland Schools IT/security before real organizational data is used. A Vercel/Supabase prototype is not itself production approval.

## Planned deployment flow

1. GitHub contains application source and migration history.
2. Vercel builds the Next.js project from the approved branch.
3. Vercel environment variables provide the public Supabase connection values.
4. Supabase provides Auth/database/RLS separately from Vercel.
5. Auth redirect URLs are configured for the deployed origin.
6. Production domain/ownership/data practices are finalized only after IT/security approval.
