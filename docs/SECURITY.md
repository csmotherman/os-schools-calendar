# Security Requirements

Security is a design constraint, not a later feature.

## Required controls

1. Email/password authentication through Supabase Auth.
2. Persistent secure sessions; users should not sign in every visit unnecessarily.
3. Self-registration may create identity and a **pending** program request, but selecting a program must never grant calendar access by itself.
4. Row Level Security on every exposed application table.
5. Program users cannot read/write unrelated program/calendar data even through direct API requests.
6. Admin authorization must be checked server-side/database-side, not only through hidden navigation.
7. Avoid privileged Supabase keys when user-session + RLS access is sufficient. If a privileged key is ever added, it must remain server-only.
8. `.env.local` and deployment secrets must never be committed.
9. Important calendar/admin changes must be auditable.
10. The audit log must retain meaningful before/after history when the current calendar is changed.
11. Production hosting/domain/data use requires Oakland Schools IT/security approval.
12. The initial administrator must be bootstrapped deliberately; admin role must never be selectable during public registration.

## Data minimization

The application currently needs program/calendar operational data, not child/student records. Do not add student names, DOBs, UICs, addresses, medical/IEP information, or other child-level data without a separate security/privacy review.

## Authentication vs authorization

A valid Supabase session proves identity. It does **not** grant program data access.

Program calendar access requires both:

- approved application profile;
- approved membership for that program;
- successful RLS evaluation for the requested row.

## Defense in depth

The UI should prevent invalid actions for usability, server logic should validate requests and route users appropriately, and PostgreSQL constraints/functions/RLS provide the final data-access/integrity enforcement layer.
