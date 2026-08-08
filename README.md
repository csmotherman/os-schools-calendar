# Oakland Schools GSRP Calendar

Planning repository for a secure, user-friendly web application that replaces the current Excel-based Oakland Schools GSRP calendar workflow.

## Current phase

**Architecture and documentation only.** No application logic, UI implementation, database migrations, or production credentials are included yet.

The architecture is planned around Next.js + TypeScript, Vercel, Supabase PostgreSQL, Supabase email/password authentication, persistent sessions, Row Level Security, program-level access, Oakland Schools admin access, configurable rules, blocked dates, reporting, and calendar approval/re-approval.

## Documentation

See [`docs/`](docs/) for the architectural decisions, route map, draft database plan, authentication model, authorization model, calendar behavior, admin rules, reporting plan, security model, and deployment notes.

## Security

Never commit real credentials or environment secrets. Local secrets belong in `.env.local`; deployment secrets belong in the approved hosting environment.
