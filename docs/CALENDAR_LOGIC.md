# Calendar Logic

## User-facing day model

Every calendar date has:

1. `In Session`: Yes / No
2. Zero or more activity checkboxes
3. Optional notes

Initial activities:

- Half Day
- Conference
- Professional Learning
- Home Visit
- Break

The intended editing interaction is a calendar grid. Clicking a date opens a right-side drawer/modal containing the Yes/No session control and activity checkboxes.

## Rule example

Half Day is valid only when `In Session = Yes`.

If a user attempts `In Session = No` while Half Day is selected, the UI should explain the conflict and remove/block Half Day. The same rule must also be enforced server/database-side where practical so it cannot be bypassed through a crafted request.

## Calendar generation

When a calendar is created, the program selects or receives:

- School year
- Program type
- First session date
- Last session date
- Normal weekdays in session

The TypeScript calendar engine will generate dates, mark normal session weekdays, apply district blocked dates, calculate counts, and evaluate requirements.

No instructional minutes/hours are part of this project's current scope.

## Counts

Counts should be derived live from the calendar:

- Total days in session = count of calendar days where `in_session = true`
- Half days = count of dates tagged Half Day
- Conference days = count of dates tagged Conference
- Professional Learning days = count of dates tagged Professional Learning
- Home Visit days = count of dates tagged Home Visit
- Break days = count of dates tagged Break

## Status workflow

Planned statuses:

- `DRAFT`
- `PENDING`
- `APPROVED`
- `CHANGES_REQUESTED`

Typical workflow: Draft → Pending → Approved.

If an approved calendar is edited, the current design returns it to Pending and creates a new review cycle while retaining the previously approved version.
