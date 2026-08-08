# Architecture Documentation

This directory is the source of truth for the application's planned architecture before implementation begins.

## Documents

- `PROJECT_STRUCTURE.md` — repository organization and ownership of each directory
- `ROUTE_MAP.md` — planned program and admin pages
- `DATABASE_SCHEMA.md` — draft data model and relationships
- `AUTHENTICATION.md` — email/password identity and persistent sessions
- `AUTHORIZATION.md` — program-user vs admin access rules
- `CALENDAR_LOGIC.md` — day model, generation, editing, and status workflow
- `ADMIN_RULES.md` — configurable thresholds, program types, activities, and blocked dates
- `REPORTING.md` — admin reporting goals
- `SUPABASE_SETUP.md` — planned Supabase responsibilities and environment structure
- `VERCEL_DEPLOYMENT.md` — planned deployment model
- `DEVELOPMENT_SETUP.md` — implementation sequence once coding starts
- `SECURITY.md` — security requirements that implementation must satisfy
- `DECISIONS.md` — architectural decision record
- `OPEN_QUESTIONS.md` — remaining decisions that should be resolved before schema v1.0 is frozen

No file in this directory should be treated as implemented behavior until the corresponding code/migration exists.
