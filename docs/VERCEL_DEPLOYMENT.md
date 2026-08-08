# Vercel Deployment Plan

## Prototype

The Next.js application can be connected to this GitHub repository for preview/prototype deployments. Environment variables must be configured in Vercel rather than committed to GitHub.

## Production caution

Production hosting for Oakland Schools should be approved by Oakland Schools IT/security before real organizational data is used. The prototype hosting choice should not be treated as permanent production approval.

## Planned deployment flow

1. GitHub repository contains application source and migrations.
2. Vercel builds the Next.js project from the approved branch.
3. Vercel environment variables provide Supabase project values.
4. Supabase provides Auth/database/RLS separately from Vercel.
5. Production domains and organizational ownership are configured only after IT approval.
