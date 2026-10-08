# Implementation Plan: Mobile Field Asset Workflow

**Branch**: `Yosef-dev116/field-asset-workflow-plan` | **Date**: 2026-10-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-field-asset-workflow/spec.md`

**Note**: This template is filled in by the `$speckit-plan` command; its definition describes the execution workflow.

## Summary

Build one adaptive Expo Router + React Native + TypeScript app that lets a field worker connect
to a Baserow table, scan a barcode/QR code, open the one exact-matching record, edit configured
fields, attach a photo, and save — all via direct calls to the Baserow REST API behind a single
service boundary. No backend proxy, accounts, or offline sync.

## Technical Context

**Language/Version**: TypeScript, Expo SDK 57 (React Native 0.86), managed workflow

**Primary Dependencies**: `expo-router` (navigation/screens), `expo-camera` (barcode scan + photo
capture via `CameraView`), `expo-secure-store` (all persisted connection/config data), native
`fetch` for Baserow HTTP calls. No state-management library, no backend proxy, no additional
storage dependency.

**Storage**: `expo-secure-store` only — the database token, server URL, and field configuration
(table id, barcode field, editable fields, photo field) are stored together as one secured JSON
blob. A single storage mechanism satisfies Constitution IV without adding a second dependency
(e.g. AsyncStorage) for the non-secret parts.

**Testing**: `jest-expo` + `@testing-library/react-native` for unit/contract tests of the Baserow
service boundary and connection storage module — these are new dev dependencies, not already in a
default Expo project (see Constitution Check). A live Baserow test table (per spec Assumptions)
is used for manual verification of the quickstart scenarios before release, as required by the
constitution's Development Workflow gate.

**Target Platform**: iOS 16.4+ (Expo SDK 57's floor) and Android API 26+ through one adaptive
Expo app; no web target.

**Project Type**: Mobile app, single Expo project, no separate backend/API project.

**Performance Goals**: Matching record visible within 5s of a successful scan on a working
network (SC-001); full Scan → Find → Update → Photo → Save loop under 2 minutes once configured
(SC-006).

**Constraints**: Exact-match lookup only (no fuzzy/partial matching); token and raw response
bodies MUST NOT appear in logs, errors, or UI; no offline queueing — all operations require a live
connection; v0 supports exactly one table/barcode/field-set configuration at a time.

**Scale/Scope**: Three screens (Connect/Configure, Scan, Record) and one record workflow; no
multi-table, multi-user, or administrative surface.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Field Workflow First** — PASS. Scope is exactly Connect → Scan → Find → Update → Photo →
  Save; no accounts, offline sync, analytics, or extra data sources are introduced.
- **II. Service Boundary** — PASS. All Baserow HTTP, auth headers, response shaping, and upload
  mechanics live in `src/baserow/client.ts`; screens call that module only. One real caller
  (the app) and one real implementation (Baserow) — no extra abstraction layer added.
- **III. Exact Matches and Explicit Outcomes** — PASS. The client's lookup function returns a
  discriminated `LookupOutcome` (`none | found | duplicate`); screens branch on it explicitly and
  never pick an arbitrary row.
- **IV. Credential Safety** — PASS. The token is written only to `expo-secure-store`, read only by
  `src/connection/storage.ts`, and never interpolated into logs or error messages (errors are
  mapped to user-facing strings before display).
- **V. Native Simplicity** — PASS. Five dependencies beyond Expo's defaults: `expo-router`,
  `expo-camera`, `expo-secure-store` for the app; `jest-expo` and `@testing-library/react-native`
  as dev-only dependencies for the smallest runnable automated check per service contract. Native
  `fetch` for HTTP, no Redux/MobX/Zustand, no custom native modules.

No violations — Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-field-asset-workflow/
├── plan.md              # This file ($speckit-plan command output)
├── research.md          # Phase 0 output ($speckit-plan command)
├── data-model.md        # Phase 1 output ($speckit-plan command)
├── quickstart.md        # Phase 1 output ($speckit-plan command)
├── contracts/           # Phase 1 output ($speckit-plan command)
│   └── baserow-client.md
└── tasks.md             # Phase 2 output ($speckit-tasks command - NOT created by $speckit-plan)
```

### Source Code (repository root)

```text
app/
├── _layout.tsx           # Expo Router root layout
├── index.tsx              # Connect/Configure screen (User Story 1 setup)
├── scan.tsx                # Scan screen (barcode/QR capture, User Story 1)
└── record.tsx              # Record screen (edit + photo + save, User Stories 2 & 3)

src/
├── baserow/
│   ├── client.ts          # Service boundary: lookup, update, photo upload (Constitution II)
│   └── types.ts            # Baserow row/field response shapes
├── connection/
│   └── storage.ts          # SecureStore read/write for token + field configuration
└── types.ts                 # Shared domain types (LookupOutcome, FieldConfig, AssetRecord)

tests/
├── contract/
│   └── baserow-client.test.ts   # Lookup outcomes, update success/failure, photo upload
└── unit/
    └── connection-storage.test.ts
```

**Structure Decision**: Single Expo project (no monorepo, no separate backend). Three screens
under Expo Router's file-based `app/` directory map directly to the three user stories; all
Baserow-specific logic is isolated in `src/baserow/` so screens stay presentation-only, per
Constitution II.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations to justify.
