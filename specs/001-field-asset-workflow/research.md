# Research: Mobile Field Asset Workflow

Phase 0 output for [plan.md](./plan.md). The Technical Context contained no open
`NEEDS CLARIFICATION` markers — the architecture was already agreed with the project owner before
planning began. This document records the decisions and the alternatives rejected, so the
rationale survives independent of that conversation.

## Decision: Direct Baserow integration, no backend proxy

- **Decision**: The Expo app calls the Baserow REST API directly over HTTPS using the user's own
  token; there is no intermediary server.
- **Rationale**: v0's only job is Connect → Scan → Find → Update → Photo → Save against one
  Baserow table. A proxy would duplicate Baserow's own auth and row-filtering, add a deployable
  component with its own hosting/ops burden, and still store the same token somewhere. The
  constitution's Native Simplicity principle favors the smallest dependable implementation.
- **Alternatives considered**: A backend proxy (rejected — unnecessary moving part for v0, no
  multi-tenant or server-side secret requirement exists yet); a Baserow SDK/client library
  (rejected — v0 needs five endpoints: table listing, field listing, row filter/list, row update,
  file upload; native `fetch` covers this without a new dependency).

## Decision: Expo Router for navigation

- **Decision**: Use `expo-router`'s file-based routing for the three screens.
- **Rationale**: It is the Expo-recommended default, needs no extra navigation dependency beyond
  what a new Expo project already includes, and file-based routes map 1:1 to the three user
  stories (Connect/Configure, Scan, Record).
- **Alternatives considered**: React Navigation configured manually (rejected — same capability,
  more setup code for no v0 benefit).

## Decision: `expo-secure-store` as the only persistence mechanism

- **Decision**: Store the token together with the non-secret connection/field configuration
  (server URL, table id, barcode field, editable fields, photo field) as one JSON blob in
  `expo-secure-store`.
- **Rationale**: Constitution IV requires the token in secure storage. The configuration object is
  small (a handful of string/id fields) and well under SecureStore's per-key size limit, so
  splitting it across SecureStore (token) and AsyncStorage (everything else) would add a second
  storage dependency purely for data that has no confidentiality requirement of its own — a
  complexity the constitution's Native Simplicity principle rejects without a demonstrated need.
- **Alternatives considered**: SecureStore for the token + AsyncStorage for config (rejected — a
  second dependency for no functional gain at this scale); unencrypted storage for config
  (rejected — no reason to weaken protection when one mechanism already covers both needs).

## Decision: `expo-camera` for both barcode scanning and photo capture

- **Decision**: Use `expo-camera`'s `CameraView` — its `barcodeScannerSettings={{ barcodeTypes:
  [...] }}` prop (listing QR, Code 128, and EAN, per the spec's device-capability Assumption) with
  `onBarcodeScanned` for Scan, and its photo-capture method for the Record screen's attachment
  step.
- **Rationale**: One camera dependency covers both FR-008 (scan) and FR-017 (photo capture)
  instead of pairing a barcode-only library with a separate camera/image-picker library.
- **Alternatives considered**: `expo-barcode-scanner` + `expo-image-picker` (rejected —
  `expo-barcode-scanner`'s scanning capability has moved into `expo-camera`'s `CameraView`, and a
  second capture library is redundant once `expo-camera` is already present).

## Decision: `jest-expo` + React Native Testing Library for automated tests; live table for integration

- **Decision**: Unit/contract tests run under `jest-expo` (Expo's Jest preset) with
  `@testing-library/react-native`, against the Baserow service boundary and connection storage
  module. End-to-end verification of the three user stories runs manually against a live Baserow
  test table, per the spec's Assumptions and the constitution's Development Workflow gate.
- **Rationale**: `jest-expo` is Expo's own documented test setup, not a competing framework
  choice — but it and `@testing-library/react-native` are still two new dev dependencies, counted
  in plan.md's Constitution Check rather than waved away as "no new dependency." The Baserow
  service boundary (`src/baserow/client.ts`) is the one place HTTP behavior can be verified
  without a live server, using mocked `fetch` responses for the three lookup outcomes and
  update/upload failure paths. The constitution explicitly requires live-table verification
  before release, so that step is not replaced by mocks, only supplemented by them.
- **Alternatives considered**: End-to-end device automation (e.g. Detox) (rejected — out of scope
  for v0's size; the constitution calls for "the smallest runnable automated check that proves
  [each] behavior," and manual live-table verification already covers the end-to-end path).
