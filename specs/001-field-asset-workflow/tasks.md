# Tasks: Mobile Field Asset Workflow

**Input**: Design documents from `/specs/001-field-asset-workflow/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/baserow-client.md](./contracts/baserow-client.md),
[quickstart.md](./quickstart.md)

**Tests**: Included. The constitution's Development Workflow gate requires "the smallest
runnable automated check that proves [each service contract's] behavior," and research.md
already locked in `jest-expo` + `@testing-library/react-native` for this purpose — so contract
and unit tests are in scope, not optional extras.

**Organization**: Tasks are grouped by user story (spec.md's P1/P2/P3) to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in every description

## Path Conventions

Single Expo project per plan.md's Project Structure: `app/` (Expo Router screens), `src/`
(service boundary + shared types), `tests/` (contract + unit).

## Phase 1: Setup

**Purpose**: Project initialization matching plan.md's Technical Context and Project Structure.

- [X] T001 Initialize the Expo SDK 57 (React Native 0.86) TypeScript app at the repository root
      so the result matches plan.md's `app/`, `src/`, `tests/` layout exactly.
- [X] T002 Install and configure `expo-router`, `expo-camera`, `expo-secure-store` — add the
      `expo-router` scheme and the `expo-camera` config plugin to `app.json` per research.md's
      Decision entries for navigation and camera.
- [X] T003 Install and configure `jest-expo` + `@testing-library/react-native` (test script
      in `package.json`, `jest-expo` preset in jest config) per plan.md's Testing section — these
      are the two dev-only dependencies counted in the Constitution Check. Not `[P]` with T002:
      both edit `package.json` and the lockfile.

**Checkpoint**: `npx expo start` runs; `npm test` runs (no tests yet).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types and infrastructure every user story's screens and service-boundary
calls depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Create shared domain types in `src/types.ts`: `Connection` (`serverUrl: string` —
      "Non-empty; trailing slash normalized away"; `token: string` — "Non-empty; never rendered
      in logs, errors, or UI"), `FieldConfiguration` (`tableId`, `barcodeFieldId`,
      `editableFieldIds: string[]`, `photoFieldId: string | null`), `AssetRecord`, `LookupOutcome`
      (`{ kind: "none" } | { kind: "found"; record } | { kind: "duplicate" }`), and
      `PhotoAttachment` (`uploadState`, `attachState` as the enums in data-model.md) — field
      shapes and constraints exactly as specified in [data-model.md](./data-model.md).
- [X] T005 [P] Create Baserow response types in `src/baserow/types.ts`: table/field summary
      shapes returned by `listTables`/`listFields`, and the row/file shapes `lookupByBarcode`,
      `updateRecord`, and `uploadAndAttachPhoto` consume, per
      [contracts/baserow-client.md](./contracts/baserow-client.md).
- [X] T006 Implement connection + field-configuration persistence in `src/connection/storage.ts`:
      read/write/clear a single `expo-secure-store` JSON blob holding `Connection` and
      `FieldConfiguration` together (plan.md's Storage decision). Writing or replacing the
      configuration MUST let the user later "replace or clear it" (FR-006), and no function in
      this module may log or return the token in an error (FR-003, FR-019).
- [X] T007 [P] Create the Expo Router root layout in `app/_layout.tsx` wiring the three screens
      (`index` → `scan` → `record`) per plan.md's Project Structure.

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Find the Correct Asset (Priority: P1) 🎯 MVP

**Goal**: A field worker connects to a Baserow table, scans a code, and sees the one record whose
configured barcode field exactly matches the scan.

**Independent Test**: Configure a test table containing unique, missing, and duplicate barcode
values, scan each value, and verify that only a unique exact match opens a record (per spec.md).

### Tests for User Story 1

- [X] T008 [US1] Contract tests for `listTables` and `listFields` in
      `tests/contract/baserow-client.test.ts`: success returns the expected summaries; an
      unreachable `serverUrl` or an invalid/expired/revoked token fails without ever including
      the token in the error (FR-002, FR-019); a `tableId` that no longer exists fails as a
      configuration error, not a crash (Edge Case).
- [X] T009 [US1] Contract tests for `lookupByBarcode`'s three outcomes in
      `tests/contract/baserow-client.test.ts` (same file as T008 — sequential, not `[P]`):
      zero matches → `{ kind: "none" }`, one match → `{ kind: "found", record }`, more than one
      → `{ kind: "duplicate" }` (FR-009–FR-012); plus network/timeout and malformed-response
      failure modes mapped to distinct, token-free error strings (FR-019).
- [X] T010 [P] [US1] Unit test for connection storage in
      `tests/unit/connection-storage.test.ts`: write → read round-trip returns the same
      `Connection`/`FieldConfiguration`; `serverUrl` trailing slash is normalized away; clearing
      removes the stored blob; no assertion ever logs or snapshots the token value (FR-003).

### Implementation for User Story 1

- [X] T011 [US1] Implement `listTables(connection)` and `listFields(connection, tableId)` in
      `src/baserow/client.ts` per [contracts/baserow-client.md](./contracts/baserow-client.md) —
      satisfies T008.
- [X] T012 [US1] Implement `lookupByBarcode(connection, fieldConfig, scannedValue)` in
      `src/baserow/client.ts`, filtering for an exact text match on the configured barcode field
      and returning the discriminated `LookupOutcome` from T004 — never picks an arbitrary row on
      duplicates (FR-009–FR-012) — satisfies T009.
- [X] T013 [US1] Build the Connect/Configure screen in `app/index.tsx`: on launch, load any
      persisted connection/configuration via `src/connection/storage.ts` (T006) and skip straight
      to Scan if it's already usable; otherwise show server URL + token entry, call
      `listTables`/`listFields` (T011) to validate the connection (FR-002) and populate the
      table/barcode/editable/photo field pickers (FR-005), and persist the result via T006. Also
      provide a visible "replace connection" / "clear configuration" action that calls T006's
      clear, satisfying FR-006's "retain... between launches and let the user replace or clear
      it." On failure, show a corrective message that never displays the token (FR-004 Edge
      Case, FR-019). FR-020 applies to this and every other screen: scalable text, screen-reader
      labels, light and dark appearances, platform minimum touch targets, safe areas, and native
      system back behavior.
- [X] T014 [US1] Build the Scan screen in `app/scan.tsx`: `expo-camera`'s `CameraView` with
      `barcodeScannerSettings={{ barcodeTypes: [...] }}` (QR, Code 128, EAN per spec.md's
      Assumptions) and `onBarcodeScanned` calling `lookupByBarcode` (T012); branches explicitly
      on the `LookupOutcome` — opens Record only on `found`, shows a not-found state on `none`,
      and a duplicate-barcode error on `duplicate`, never opening a record for the latter two
      (FR-007, FR-008, FR-011, FR-012). Same accessibility/appearance requirements as T013
      (FR-020).

**Checkpoint**: User Story 1's own scope — connect, configure, scan, and get the correct
no-match/found/duplicate outcome — is functional and independently testable. On `found`, Scan
navigates to `/record`; that screen's content is built in User Story 2 (T017), so
[quickstart.md](./quickstart.md)'s User Story 1 scenario can be run through step 3 (the record
opens) but steps that inspect the record's content depend on that later phase.

---

## Phase 4: User Story 2 - Update Field Data (Priority: P2)

**Goal**: After finding an asset, a field worker changes configured fields and saves those
changes to the same Baserow record.

**Independent Test**: Open a known test record, change configured fields, save, and verify in
Baserow that those fields changed while non-editable fields did not (per spec.md).

### Tests for User Story 2

- [X] T015 [US2] Contract tests for `updateRecord` in `tests/contract/baserow-client.test.ts`
      (same file as T008/T009 — sequential): a successful write returns `{ ok: true }` only after
      Baserow confirms it; network loss mid-update, permission denial, and Baserow-side
      validation rejection all return `{ ok: false; reason }` without ever reporting success
      (FR-015, FR-016).

### Implementation for User Story 2

- [X] T016 [US2] Implement `updateRecord(connection, fieldConfig, rowId, editableValues)` in
      `src/baserow/client.ts`: the request body contains exactly the changed `editableValues`
      keys — no other row field is ever sent, so no other value can be overwritten (FR-014,
      FR-015) — satisfies T015.
- [X] T017 [US2] Build the field-editing UI in `app/record.tsx`: render `AssetRecord.displayFields`
      read-only except the configured `editableFieldIds` (FR-013, FR-014); on save, call
      `updateRecord` (T016); on failure, keep the user's unsaved input visible and show an
      actionable retry/correction path without claiming success (FR-016); on success, confirm it
      explicitly (FR-015). Same accessibility/appearance requirements as T013 (FR-020).

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Attach Current Photo Evidence (Priority: P3)

**Goal**: After finding an asset, a field worker captures a photo and attaches it to the
configured photo field on the same record.

**Independent Test**: Capture a photo for a known test record, save it, and verify in Baserow
that the photo appears on that record (per spec.md).

### Tests for User Story 3

- [X] T018 [US3] Contract tests for `uploadAndAttachPhoto` in
      `tests/contract/baserow-client.test.ts` (same file as prior contract tests — sequential):
      a successful run attaches `[...existingAttachments, uploadedFile]`, never dropping prior
      attachments (FR-014, data-model.md's Photo Attachment preservation rule); upload failure
      and attach failure are reported as distinct `failedStep` values (FR-018); oversized or
      unsupported-format files fail the upload step (Edge Case).

### Implementation for User Story 3

- [X] T019 [US3] Implement `uploadAndAttachPhoto(connection, fieldConfig, rowId, localUri,
      existingAttachments)` in `src/baserow/client.ts`: upload the file, then `PATCH` the photo
      field with the existing attachments plus the new one (never the new one alone) — satisfies
      T018.
- [X] T020 [US3] Build photo capture in `app/record.tsx`: request camera permission only when the
      user initiates capture and explain denied access without blocking record editing (FR-007,
      Acceptance Scenario 3.3); on capture, call `uploadAndAttachPhoto` (T019) with the
      `existingAttachments` already present in the loaded `AssetRecord.displayFields`; report
      upload vs. attach failure distinctly so a partial photo failure never implies a complete
      save (FR-018). Same accessibility/appearance requirements as T013 (FR-020).

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Release validation the constitution's Development Workflow gate requires before
this feature can ship.

- [ ] T021 [P] Run every scenario in [quickstart.md](./quickstart.md) on a physical iOS and a
      physical Android test device against a live Baserow test table: all three user-story
      scenarios, the light/dark + enlarged-text + screen-reader accessibility pass (FR-020,
      SC-007), and the credential-safety check across logs/crash reports/screenshots (SC-008).
      **Partially verified, left unchecked — no live Baserow table available.** A physical Android
      tablet (connected via adb) and the iOS Simulator were found in this environment and used for
      real, non-mocked verification: the app was built and run for real (not just `tsc`/`jest`) on
      both platforms via Expo Go, confirmed:
      - Connect screen renders correctly in light **and** dark mode, on both platforms (live
        `useColorScheme` switching, not just a snapshot).
      - A real `fetch()` against an unreachable server URL produces the exact safe error string
        ("Couldn't reach the Baserow server...") end-to-end on hardware — confirms the FR-019
        token-safety behavior isn't just unit-tested, it holds under a real network stack.
      - Camera permission flow is real on the Android device: the OS permission dialog is backed
        by a genuine `android.permission.CAMERA` grant, and — independently confirming the
        `recordAudioAndroid: false` app.json choice — `RECORD_AUDIO` is never requested/granted.
      - Large system font scale (1.3x) didn't clip or break the Scan screen layout.
      - No crash on launch on either platform.
      What's still missing and needs a human: the actual barcode-lookup/field-update/photo-attach
      flow against a live Baserow table (no account could be created autonomously — Baserow
      signup requires email verification), scanning a real physical barcode (requires physically
      moving a camera, which this environment cannot do), and TalkBack/VoiceOver screen-reader
      verification. A temporary local stub of `readConnectionState()` was used to reach the Scan
      screen for the above checks and was fully reverted before this commit (see commit history —
      never part of any committed diff).
- [X] T022 [P] Review every error path added in T011–T020 for credential safety: confirm no
      function logs or displays `connection.token` or a raw Baserow response body (FR-019,
      Constitution IV). Audited: zero `console.*` calls anywhere in `app/` or `src/`; the token
      is interpolated only into the two `Authorization: Token ${connection.token}` header
      constructions in `src/baserow/client.ts`; every thrown/returned error message is a static,
      hand-written string (never `response` text or a caught error's raw body); the token input
      on the Connect screen uses `secureTextEntry`. No violations found.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup. Blocks all user stories.
- **User Stories (Phase 3–5)**: All depend on Foundational. Nominally independent per spec.md's
  priorities, but every story's implementation and contract-test tasks touch the same two files
  — `src/baserow/client.ts` and `tests/contract/baserow-client.test.ts` — by design, since
  Constitution II requires one Baserow service-boundary module. Treat the three stories as
  **sequential** (P1 → P2 → P3) rather than parallelizable across multiple developers, to avoid
  merge conflicts in those two files.
- **Polish (Phase 6)**: Depends on all three user stories being complete.

### Within Each User Story

- Contract/unit tests are written first and must fail before the matching implementation task.
- `src/baserow/client.ts` functions (T011, T012, T016, T019) before the screen that calls them
  (T013/T014, T017, T020 respectively).

### Parallel Opportunities

- T005 and T007 (Foundational) can run in parallel with each other, but T004 (shared types) is a
  dependency for both and should land first.
- T010 (connection storage unit test) can run in parallel with T008/T009 (contract tests) — they
  touch different files.
- T021 and T022 (Polish) can run in parallel.

---

## Parallel Example: Foundational

```bash
# After T004 (shared types):
Task: "Create Baserow response types in src/baserow/types.ts"
Task: "Create the Expo Router root layout in app/_layout.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1 (T008–T014).
4. **STOP and VALIDATE**: run quickstart.md's User Story 1 scenario on a physical device against
   the live Baserow test table (SC-001, SC-002, SC-005).

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. User Story 1 → validate independently → this is the MVP (scan, find, and surface the three
   lookup outcomes).
3. User Story 2 → validate independently → field edits persist to Baserow.
4. User Story 3 → validate independently → photo evidence attaches without dropping prior files.
5. Phase 6 → full quickstart pass + credential-safety review before release.
