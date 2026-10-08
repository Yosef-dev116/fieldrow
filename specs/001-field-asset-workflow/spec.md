# Feature Specification: Mobile Field Asset Workflow

**Feature Branch**: `Yosef-dev116/pasted-text-file`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "Enable a mobile user to scan a barcode or QR code, retrieve an exact
matching Baserow record, update selected fields, attach a photo, and persist the changes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find the Correct Asset (Priority: P1)

A field worker connects the app to an authorized Baserow table, scans an asset's barcode or QR
code, and sees the one record whose configured barcode value exactly matches the scan.

**Why this priority**: Every later action depends on identifying the correct record. Showing the
wrong record is more harmful than declining to show one.

**Independent Test**: Configure a test table containing unique, missing, and duplicate barcode
values, scan each value, and verify that only a unique exact match opens a record.

**Acceptance Scenarios**:

1. **Given** valid connection and table configuration with one exact match, **When** the user scans
   the matching code, **Then** the matching record opens within five seconds under a working
   network connection.
2. **Given** valid configuration with no exact match, **When** the user scans a code, **Then** the
   app shows a not-found state and does not open another record.
3. **Given** valid configuration with multiple exact matches, **When** the user scans that code,
   **Then** the app reports a duplicate-barcode error and does not choose a record.
4. **Given** invalid connection or table configuration, **When** the user attempts to connect,
   **Then** the app explains what must be corrected without exposing the database token.

---

### User Story 2 - Update Field Data (Priority: P2)

After finding an asset, a field worker changes one or more fields selected during configuration
and saves those changes to the same Baserow record.

**Why this priority**: Updating field state is the core value beyond mobile record lookup.

**Independent Test**: Open a known test record, change configured fields, save, and verify in
Baserow that those fields changed while non-editable fields did not.

**Acceptance Scenarios**:

1. **Given** a uniquely matched record, **When** the user changes configured fields and saves,
   **Then** Baserow contains the new values and the app confirms success.
2. **Given** a uniquely matched record, **When** the save fails, **Then** the app retains the
   user's unsaved values, reports the failure, and does not claim success.
3. **Given** a displayed record, **When** the user reviews it, **Then** only configured editable
   fields can be changed.

---

### User Story 3 - Attach Current Photo Evidence (Priority: P3)

After finding an asset, a field worker captures a photo and attaches it to the configured photo
field on the same Baserow record.

**Why this priority**: A current photo adds useful field evidence but does not block lookup or
ordinary status updates.

**Independent Test**: Capture a photo for a known test record, save it, and verify in Baserow that
the photo appears on that record.

**Acceptance Scenarios**:

1. **Given** a uniquely matched record and configured photo field, **When** the user captures and
   saves a photo, **Then** the photo is attached to that record and success is confirmed.
2. **Given** a photo upload failure, **When** the user saves, **Then** the app reports that the
   photo was not attached and does not imply a complete save.
3. **Given** camera permission is unavailable, **When** the user requests a photo, **Then** the app
   explains how to grant access while leaving record editing usable.

### Edge Cases

- The server URL contains a trailing slash or refers to a supported self-hosted installation.
- The token is invalid, expired, revoked, or lacks read, update, or file permissions.
- The configured table or field was deleted, renamed, or changed to an incompatible type.
- A scan is empty, unsupported, repeated rapidly, or canceled before a value is captured.
- The device loses connectivity during lookup, update, upload, or final record attachment.
- The server returns malformed or unexpected data.
- The captured photo exceeds a server limit or uses an unsupported format.
- The app moves to the background while a save or upload is in progress.
- An update succeeds but a later photo upload or attachment fails.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST let a user provide a Baserow server URL and database token.
- **FR-002**: The app MUST validate connection details before treating the connection as usable.
- **FR-003**: The app MUST store the token in device-protected storage and MUST NOT expose it in
  logs, errors, analytics, test data, or screenshots.
- **FR-004**: The app MUST support both Baserow Cloud and compatible self-hosted server URLs.
- **FR-005**: The app MUST let the user configure one table, one barcode field, zero or more
  editable fields, and zero or one photo field.
- **FR-006**: The app MUST retain valid connection and field configuration between launches and
  let the user replace or clear it.
- **FR-007**: The app MUST request camera access only when needed and explain denied access.
- **FR-008**: The app MUST scan supported barcode and QR-code values using the device camera.
- **FR-009**: The app MUST compare the scanned value with the configured barcode field using an
  exact match.
- **FR-010**: A lookup MUST produce exactly one of three user-visible outcomes: no match, one
  match, or duplicate matches.
- **FR-011**: The app MUST open a record only when exactly one matching row exists.
- **FR-012**: The app MUST NOT silently select a row when duplicate exact matches exist.
- **FR-013**: The record view MUST identify the asset and distinguish readable fields from the
  configured editable fields.
- **FR-014**: The app MUST allow changes only to configured editable fields and preserve all
  other row values.
- **FR-015**: The app MUST persist field changes to the uniquely matched row and confirm success
  only after Baserow accepts them.
- **FR-016**: When a save fails, the app MUST preserve unsaved input and provide an actionable
  retry or correction path.
- **FR-017**: When a photo field is configured, the app MUST let the user capture a photo and
  attach it to the uniquely matched row.
- **FR-018**: The app MUST distinguish field-update, photo-upload, and photo-attachment failures
  so that partial completion is never presented as full success.
- **FR-019**: Connection, configuration, lookup, update, permission, and photo errors MUST use
  clear user-facing language without revealing credentials or raw response bodies.
- **FR-020**: The primary workflow MUST support scalable text, screen readers, light and dark
  appearances, platform minimum touch targets, safe areas, and native system back behavior.

### Key Entities

- **Connection**: A Baserow server address and secret database token used to access one user's
  authorized data.
- **Field Configuration**: The selected table, barcode field, editable fields, and optional photo
  field that define the app's permitted workflow.
- **Asset Record**: The uniquely matched Baserow row displayed and updated by the user.
- **Lookup Outcome**: A no-match, single-match, or duplicate-match result for an exact scanned
  value.
- **Photo Attachment**: A captured image plus its upload and attachment state for one asset
  record.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In release validation, at least 95% of successful scans show the unique matching
  record within five seconds on a working network connection.
- **SC-002**: In release validation, 100% of known no-match and duplicate-match cases block record
  editing and display the correct outcome.
- **SC-003**: At least 95% of valid field-update attempts in the live test environment persist on
  the first attempt; every failed attempt is reported without a false success message.
- **SC-004**: At least 95% of supported photo attempts in the live test environment upload and
  attach successfully; every failed or partial attempt identifies the incomplete step.
- **SC-005**: A new user with valid Baserow details can complete configuration and retrieve a known
  asset in under three minutes without external assistance.
- **SC-006**: A user can complete Scan -> Find -> Update -> Photo -> Save in under two minutes once
  configuration is complete.
- **SC-007**: Accessibility verification finds no blocked primary workflow at enlarged system text
  sizes or with a screen reader on the supported iOS and Android test devices.
- **SC-008**: Release validation artifacts contain no database tokens or other credentials.

## Assumptions

- Users obtain a restricted Baserow database token and the necessary table permissions before
  configuration.
- v0 targets connected use; offline viewing, queues, and conflict resolution are out of scope.
- The device has a rear camera capable of scanning at least QR Code, Code 128, and EAN formats.
- The configured barcode field stores values that can be compared as exact text.
- The configured editable fields use field types supported by the v0 record editor; unsupported
  types remain readable but cannot be selected for editing.
- Workflow metrics are measured during release validation rather than collected through product
  analytics.
- A dedicated Baserow test table with fake assets is available before live integration testing.
- v0 does not recreate general Baserow browsing, row creation, schema editing, collaboration, or
  administration features.
