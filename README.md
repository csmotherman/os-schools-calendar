# Oakland Schools GSRP Calendar

Planning repository for a secure, user-friendly web application that replaces the current Excel-based Oakland Schools GSRP calendar workflow.

## Current phase

**Architecture and documentation only.** No application logic, UI implementation, database migrations, or production credentials are included yet.

The initial architecture is designed around:

- Next.js + TypeScript
- Vercel hosting
- Supabase PostgreSQL
- Supabase email/password authentication
- Persistent login sessions
- Row Level Security (RLS)
- Program-level access for normal users
- Oakland Schools system-wide admin access
- Multiple calendars per program when different program types are offered
- Click-a-day calendar editing through a side panel
- Admin-configurable program requirements and blocked dates
- Submission / approval / re-approval workflow
- Admin reporting and exports

## Documentation

See [`docs/`](docs/) for the architectural decisions, route map, database plan, authentication model, authorization model, calendar behavior, admin rules, reporting plan, security model, and deployment notes.

## Important security rule

Never commit real credentials or environment secrets to this repository. Local secrets will live in `.env.local` and deployment secrets will live in the approved hosting environment.
