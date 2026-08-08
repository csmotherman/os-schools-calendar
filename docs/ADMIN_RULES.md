# Admin Rules and Reference Data

The website should favor dropdowns, toggles, and controlled reference data over free-text configuration.

## Program types

Initial program types:

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

Activities should contain compatibility settings such as whether they are allowed when children are or are not in session. This prevents a future activity from requiring a new calendar table column.

## Requirements

Admins configure requirements by **school year + program type**.

Supported requirement concepts should include:

- Minimum session days
- Maximum session days
- Minimum/maximum activity-day count for any configured activity
- Severity: blocking error or warning

Blank minimum or maximum values mean no bound on that side.

Requirements should be data-driven so changing a threshold does not require a deployment.

## Blocked dates

Admins maintain district-wide fixed dates by school year.

Initial restriction types:

- `NO_SESSION` — children cannot be in session
- `NO_ACTIVITY` — no session or tracked activity may be scheduled

Examples include Thanksgiving and Christmas Day.

Blocked dates should be applied during calendar generation and enforced during later edits.
