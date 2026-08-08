# Project Documentation

This directory records both implemented architecture and intentionally deferred decisions. Code and applied migrations remain the final source of truth for runtime behavior.

## Documents

- `PROJECT_STRUCTURE.md` — current repository organization
- `ROUTE_MAP.md` — implemented and planned routes
- `DATABASE_SCHEMA.md` — implemented Schema v1 and relationships
- `AUTHENTICATION.md` — email/password registration, confirmation, persistent sessions, and pending access flow
- `AUTHORIZATION.md` — program-user vs admin access rules
- `ADMIN_BOOTSTRAP.md` — one-time first-admin bootstrap procedure
- `CALENDAR_LOGIC.md` — day model, generation, editing, and status workflow
- `ADMIN_RULES.md` — configurable thresholds, calendar types, activities, and blocked dates
- `REPORTING.md` — admin reporting goals
- `SUPABASE_SETUP.md` — active Supabase responsibilities and environment structure
- `VERCEL_DEPLOYMENT.md` — deployment/environment/Auth redirect plan
- `DEVELOPMENT_SETUP.md` — current implementation status and next development slices
- `SECURITY.md` — required security controls
- `DECISIONS.md` — architectural decision record
- `OPEN_QUESTIONS.md` — remaining decisions that do not block the current foundation

When documentation conflicts with executable code or an applied migration, treat that as a defect to fix rather than guessing which behavior is intended.
