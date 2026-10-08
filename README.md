# Fieldrow

A focused, open-source mobile field client for [Baserow](https://baserow.io). Fieldrow turns a
barcode scan into a safe, explicit record update — without recreating the Baserow web app.

**Workflow**: Connect → Scan → Find → Edit → Photo → Save

A field worker connects the app to one Baserow table, scans an asset's barcode or QR code, opens
the single exact-matching record, edits the fields configured as editable, optionally attaches a
current photo, and saves — all directly against their own Baserow instance (Cloud or
self-hosted), with no backend proxy in between.

## Status

This is v0: all three user stories (scan & find, update fields, attach a photo) are implemented,
tested, and reviewed. What's **not** yet done is the live-device validation against a real
Baserow table — see
[`specs/001-field-asset-workflow/tasks.md`](specs/001-field-asset-workflow/tasks.md)'s T021 for
exactly what's verified so far (including real on-device checks) and what's still outstanding.

## Tech stack

- Expo SDK 57 (React Native 0.86) + TypeScript, Expo Router for navigation
- Direct calls to the Baserow REST API (`src/baserow/client.ts`) — no backend proxy
- `expo-camera` for barcode scanning and photo capture
- `expo-secure-store` for the connection token and field configuration
- Jest + `@testing-library/react-native` for contract/unit tests

## Getting started

```bash
npm ci --legacy-peer-deps
npx expo start
```

Open the app on a **physical** iOS or Android device via Expo Go — `expo-camera`'s `CameraView`
does not run on the iOS Simulator or Android Emulator, and every screen in this app uses the
camera.

You'll need a Baserow server URL and a database token (with read, update, and file permissions)
for a table that has a text column for barcodes, at least one editable column, and a file column
for photos.

## Project layout

```text
app/                  Expo Router screens (Connect/Configure, Scan, Record)
src/baserow/          The Baserow service boundary: client.ts + response types
src/connection/       Secure storage for the connection + field configuration
src/types.ts          Shared domain types
tests/contract/       Tests for the Baserow service boundary
tests/unit/           Tests for connection storage
specs/001-field-asset-workflow/
  spec.md             Feature specification
  plan.md              Implementation plan
  data-model.md         Entities and validation rules
  contracts/            The Baserow client's function-level contract
  quickstart.md          Manual validation scenarios
  tasks.md                Full task breakdown and completion status
```

## Development

```bash
npx tsc --noEmit   # type-check
npm test            # run the test suite
npx expo-doctor     # project health check
```

## License

[MIT](LICENSE)
