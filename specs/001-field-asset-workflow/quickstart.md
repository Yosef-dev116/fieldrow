# Quickstart: Mobile Field Asset Workflow

Phase 1 output for [plan.md](./plan.md). Validates the three user stories end-to-end against a
live Baserow test table, as required by the constitution's Development Workflow gate. See
[data-model.md](./data-model.md) for entity shapes and
[contracts/baserow-client.md](./contracts/baserow-client.md) for the service boundary this guide
exercises indirectly through the UI.

## Prerequisites

- A Baserow test table (Cloud or self-hosted) with: a text column used for barcode values (not
  required to be unique — the duplicate-match seed row below depends on a repeated value), at
  least one editable column, and a file/attachment column for photos — per the spec's
  Assumptions.
- Seed rows covering all three lookup outcomes: one row with a barcode value found nowhere else
  in the table (for the unique-match scan), one barcode value entered on no row at all (for the
  no-match scan), and one barcode value duplicated across two rows (for the duplicate-match scan)
  (needed for User Story 1's three outcomes).
- A restricted Baserow database token scoped to that table with read, update, and file
  permissions.
- iOS simulator or device, and/or Android emulator or device, with Expo Go or a dev build
  installed.

## Setup

```bash
npm install
npx expo start
```

Open the app on a simulator/device/emulator from the Expo CLI output.

## Scenario: User Story 1 — Find the Correct Asset

1. On the Connect/Configure screen, enter the test server URL and token, then select the test
   table, barcode field, editable fields, and photo field.
2. Expect: configuration succeeds and the app proceeds to Scan (FR-002, SC-005: under 3 minutes
   for a new user).
3. Scan the unique barcode. Expect: the matching record opens within 5 seconds (SC-001).
4. Scan the no-match barcode value. Expect: a not-found state; no record opens (Acceptance
   Scenario 1.2).
5. Scan the duplicated barcode value. Expect: a duplicate-barcode error; no record opens
   (Acceptance Scenario 1.3, SC-002).
6. Re-run Configure with an invalid token or URL. Expect: a corrective message that does not
   display the token (Acceptance Scenario 1.4).

## Scenario: User Story 2 — Update Field Data

1. From the unique-match record opened above, change each configured editable field.
2. Save. Expect: Baserow's table (checked directly, outside the app) shows the new values; the
   app confirms success; non-editable fields are unchanged (Acceptance Scenario 2.1, SC-003).
3. Disconnect the network (or point at an unreachable server), repeat a field change, and save.
   Expect: the app reports failure, keeps the unsaved input visible, and does not claim success
   (Acceptance Scenario 2.2, FR-016).
4. Confirm fields outside the configured editable set are not presented as changeable
   (Acceptance Scenario 2.3).

## Scenario: User Story 3 — Attach Current Photo Evidence

1. From a unique-match record, capture a photo and save.
2. Expect: the photo appears on the configured photo field in Baserow; the app confirms success
   (Acceptance Scenario 3.1, SC-004).
3. Simulate an upload failure (e.g. disconnect network after capture, before save completes).
   Expect: the app reports the photo was not attached without implying a complete save
   (Acceptance Scenario 3.2).
4. Deny camera permission and attempt to capture a photo. Expect: the app explains how to grant
   access, and record editing (User Story 2) remains usable (Acceptance Scenario 3.3).

## Accessibility and appearance pass (SC-007, FR-020)

On both the iOS and Android test devices, repeat the Scan → Find → Update → Photo → Save loop
once with the system text size enlarged, once with a screen reader (VoiceOver / TalkBack)
enabled, once in the device's light appearance, and once in dark appearance. Expect: no step is
blocked and no content is unreadable in any of the four runs.

## Credential-safety check (SC-008)

Review any logs, crash reports, and screenshots captured during the above runs. Expect: no
database token appears in any of them.
