# Architectural Decision Record

## ADR-001 — Days, not instructional hours
The application tracks total session days and activity-day counts. Instructional minutes/hours are out of scope.

## ADR-002 — Activity types are reference data
Half Day, Conference, Professional Learning, Home Visit, and Break are rows/reference values rather than permanent boolean columns on the calendar table. This allows future activities without a schema migration.

## ADR-003 — Day editing uses a side panel
Clicking a calendar date opens a right-side editor containing In Session Yes/No, activity checkboxes, and notes.

## ADR-004 — Rules are configurable
Min/max thresholds live in database configuration by school year and program type instead of being hard-coded in TypeScript.

## ADR-005 — Blocked dates are admin-controlled
Admins define district-wide dates that prohibit session or all tracked activity.

## ADR-006 — Approved edits require re-review
Editing an approved calendar changes its workflow back to pending review while retaining the prior approved submission.

## ADR-007 — Authentication is email/password only
No Google/Microsoft/social login in the initial design.

## ADR-008 — Sessions persist
Users should remain signed in across normal repeat visits while their session remains valid.

## ADR-009 — Dropdown/reference data over free text
Official program names, categories, program types, activity types, school years, and similar fields should come from controlled data wherever practical.

## ADR-010 — Database security is authoritative
RLS/constraints enforce access and integrity; hiding controls in the UI is not considered sufficient security.
