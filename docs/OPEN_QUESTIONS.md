# Open Questions Before Schema v1.0

The directory architecture does not depend on these answers, so implementation can remain paused while they are resolved.

## 1. Regular-user assignment level

Confirmed: multiple employees can be associated with the same program and admins have system-wide access.

Still to define precisely: if a program has multiple calendars (for example a 4-Day Full Day and 5-Day Full Day calendar), does every employee affiliated with that program edit all of its calendars, or is each employee assigned to one specific calendar?

This determines whether access is represented by a simple program affiliation or an explicit calendar membership/assignment table.

## 2. Half Day counting

Working assumption: Half Day requires `In Session = Yes`; the date counts as one session day and one half-day count. Confirm before schema/business rules are frozen.

## 3. Activity counting

Working assumption: activity checkboxes represent activity-days, not individual occurrences. If Conference is checked on October 14, reporting counts one conference day regardless of the number of conferences held that date.

## 4. Account provisioning

Security default is admin-created/invited accounts rather than unrestricted self-registration. Confirm the preferred operational process before authentication UI is implemented.

## 5. Official reference data

Needed before seed data is finalized:

- Official program names
- LEA/PSA/CBO/etc. classification for each program
- Any official program codes/IDs that should be retained
- Final activity labels
- Initial school-year requirement values
- Initial blocked dates
