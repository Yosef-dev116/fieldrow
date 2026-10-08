# Contract: Baserow Service Boundary (`src/baserow/client.ts`)

Phase 1 output for [plan.md](./plan.md). This is the one module (Constitution II) that screens may
call for Baserow access — no screen performs HTTP, builds auth headers, or parses Baserow
responses directly. Three functions cover the full v0 workflow.

## `lookupByBarcode(connection, fieldConfig, scannedValue): Promise<LookupOutcome>`

- **Input**: `connection` (server URL + token), `fieldConfig` (table id + barcode field id),
  `scannedValue: string`.
- **Behavior**: Filters the configured table for rows where the barcode field exactly equals
  `scannedValue`. Returns `{ kind: "none" }` for zero rows, `{ kind: "found", record }` for
  exactly one row, `{ kind: "duplicate" }` for more than one (FR-009, FR-010, FR-011, FR-012).
- **Failure modes**: network/timeout, invalid/expired/revoked token, malformed server response.
  Each maps to a distinct user-facing error string; none expose the token or raw response body
  (FR-019). An empty, unsupported, or canceled scan never reaches this function (Edge Case).

## `updateRecord(connection, fieldConfig, rowId, editableValues): Promise<UpdateResult>`

- **Input**: `rowId`, and only the changed subset of `editableValues` (never the full row).
- **Behavior**: `PATCH`/`PUT`s the row with exactly `editableValues`; all other row fields are
  left untouched by construction (the request body contains no other keys) (FR-014, FR-015).
- **Output**: `{ ok: true }` only after Baserow confirms the write; `{ ok: false; reason }` on any
  failure, with the caller's unsaved input left intact for retry (FR-015, FR-016).
- **Failure modes**: network loss mid-update, permission denial, validation rejection from
  Baserow, app backgrounded mid-request (Edge Cases) — all surface as `{ ok: false }`, never a
  false success.

## `uploadAndAttachPhoto(connection, fieldConfig, rowId, localUri): Promise<PhotoAttachResult>`

- **Input**: `localUri` from `expo-camera` capture.
- **Behavior**: Two sequential steps — upload the file to Baserow, then attach it to the row's
  configured photo field. The result distinguishes which step failed (FR-017, FR-018).
- **Output**:
  ```ts
  type PhotoAttachResult =
    | { ok: true }
    | { ok: false; failedStep: "upload"; reason: string }
    | { ok: false; failedStep: "attach"; reason: string };
  ```
- **Failure modes**: file exceeds server size limit, unsupported format, network loss between
  upload and attach, server rejects the attach call after a successful upload (Edge Cases). A
  successful field update elsewhere in the same save flow is never implied or overwritten by a
  photo failure here (FR-018, Edge Case: update succeeds but photo fails).

## Cross-cutting rules

- Every function receives `connection`/`fieldConfig` as plain data, not a shared mutable client
  instance — callers (screens) hold no Baserow-specific state.
- No function logs `connection.token` or a raw response body; errors are translated to the
  user-facing strings referenced above before leaving this module (FR-019, Constitution IV).
