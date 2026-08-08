# Admin Rules and Reference Data

The website should favor dropdowns, toggles, and controlled reference data over free-text configuration.

## Programs

The `programs` table contains the official program/site names used for account affiliation and calendar ownership. Users select an existing program rather than typing a name.

LEA/PSA/CBO, GSRP/Blend, and other program classifications are intentionally out of scope for the current version.

## Calendar types

Initial calendar types:

- 4-Day Part Day
- 4-Day Full Day
- 5-Day Part Day
- 5-Day Full Day

These are reference rows, not hard-coded TypeScript branches.

## Activity types

Initial activity types:

- Half Day
- Conference
- Professional Learning
- Home Visit
- Break

Activities contain compatibility settings indicating whether they are allowed when children are or are not in session. This allows later activity additions without creating a new database column.

Current expected behavior includes:

- Half Day: allowed only when `In Session = Yes`
- Break: intended for non-session dates
- Conference / Professional Learning / Home Visit: may coexist with session state where configured

## Requirements

Admins configure requirements by **school year + calendar type**.

Supported requirement concepts:

- minimum Session Days;
- maximum Session Days;
- minimum/maximum activity-day count for any configured activity;
- severity: `BLOCK` or `WARNING`.

Blank minimum or maximum values mean there is no bound on that side.

Requirements are database-driven so changing a threshold does not require a code deployment.

## Blocked dates

Admins maintain district-wide fixed dates by school year.

Restriction types:

- `NO_SESSION` — children cannot be in session;
- `NO_ACTIVITY` — no session or tracked activity may be scheduled.

Examples include Thanksgiving and Christmas Day. Blocked dates are applied during calendar generation and enforced on later edits by database logic.

## Deactivation instead of deletion

Reference/configuration data should normally be deactivated rather than hard-deleted so historical relationships remain valid.
