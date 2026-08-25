# Project Documentation

This directory records implemented architecture, validation procedures, and remaining production decisions. Executable code and versioned migrations remain the final source of truth for runtime behavior.

## Documents

- `PROJECT_STRUCTURE.md` — repository organization
- `ROUTE_MAP.md` — application routes
- `DATABASE_SCHEMA.md` — schema and relationships
- `AUTHENTICATION.md` — registration, confirmation, persistent sessions, recovery, and pending access
- `AUTHORIZATION.md` — program-user vs admin access rules
- `ADMIN_BOOTSTRAP.md` — one-time first-admin bootstrap procedure
- `CALENDAR_LOGIC.md` — day model, generation, editing, and status workflow
- `ADMIN_RULES.md` — configurable thresholds, calendar types, activities, and blocked dates
- `REPORTING.md` — admin reporting behavior
- `SUPABASE_SETUP.md` — migration, local database, and hosted Supabase workflow
- `VERCEL_DEPLOYMENT.md` — deployment/environment/Auth redirect plan
- `DEVELOPMENT_SETUP.md` — development and validation commands
- `TEST_PLAN.md` — automated and staging acceptance tests
- `SECURITY.md` — required security controls and data boundary
- `PRODUCTION_READINESS.md` — production go/no-go runbook
- `DECISIONS.md` — architectural decision record
- `OPEN_QUESTIONS.md` — remaining production/operational decisions
- `IMPLEMENTATION_STATUS.md` — implemented scope and release gates

When documentation conflicts with executable code or a migration, treat the mismatch as a defect to fix rather than guessing which behavior is intended.
