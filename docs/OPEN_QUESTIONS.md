# Remaining Decisions

Schema v1 and the initial authentication model are now established. These items remain intentionally open because they do not require redesigning the current schema.

## 1. Official program list

Needed before production account onboarding:

- canonical program names to import into `programs`;
- confirmation that duplicate/display-name cleanup has been completed.

No LEA/PSA/CBO or GSRP/Blend classification is required for the current version.

## 2. Initial school-year configuration

Before real calendars are created, admins need the initial values for:

- active school year;
- minimum/maximum Session Days by calendar type;
- minimum/maximum Half Days if applicable;
- Conference Day thresholds;
- Professional Learning Day thresholds;
- Home Visit Day thresholds;
- any Break thresholds if Oakland Schools decides to validate them.

## 3. Initial blocked dates

Determine the district-wide fixed dates for the first live school year and whether each is `NO_SESSION` or `NO_ACTIVITY`.

## 4. First admin bootstrap

The first administrator must be deliberately promoted/approved in Supabase before the admin UI can manage later account requests. The exact bootstrap procedure should be documented and tested once, then normal account administration should happen through the application.

## 5. Admin approval transaction

Before implementing the approval UI, decide whether approving a user should always approve both the `profiles` account and selected `program_memberships` row in one database transaction. The recommended design is one transactional database function to avoid a partially approved state.

## 6. Calendar editing UX details

The schema supports the agreed date editor. Remaining UI decisions include:

- exact calendar colors/icons;
- whether users can bulk-edit date ranges after initial generation;
- whether notes appear directly on calendar cells or only in the side panel;
- how warnings vs blocking errors are displayed before submission.
