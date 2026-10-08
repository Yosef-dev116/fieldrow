# Data Model: Mobile Field Asset Workflow

Phase 1 output for [plan.md](./plan.md). Entities extracted from [spec.md](./spec.md)'s Key
Entities section, with fields and validation rules drawn from the Functional Requirements.
These are in-memory/local TypeScript shapes (`src/types.ts` and `src/baserow/types.ts`); there is
no app-owned database.

## Connection

A Baserow server address and secret token used to access one user's authorized data. Persisted
whole (with Field Configuration) as a single `expo-secure-store` entry (FR-003, FR-006).

| Field | Type | Validation |
|---|---|---|
| `serverUrl` | `string` | Non-empty; trailing slash normalized away; must be a Baserow Cloud URL or a reachable self-hosted base URL (FR-004, Edge Case: trailing slash). |
| `token` | `string` | Non-empty; never rendered in logs, errors, or UI (FR-003, FR-019). |

**State**: unset → validating → usable → (replaced | cleared). FR-002 requires validation before
"usable"; validation is the contract's `listTables` call (see
[contracts/baserow-client.md](./contracts/baserow-client.md)) — success moves the Connection to
`usable` and populates the table picker, failure keeps it non-usable with a corrective,
non-credential-revealing message (FR-004 Edge Case, FR-019).

## Field Configuration

The selected table and field roles that define the app's permitted workflow (FR-005). Persisted
alongside Connection; replacing or clearing the Connection clears this too (FR-006).

| Field | Type | Validation |
|---|---|---|
| `tableId` | `string` | Must identify a table the token can read/update (FR-005). |
| `barcodeFieldId` | `string` | Exactly one field; must support exact-text comparison (FR-009, Assumption). |
| `editableFieldIds` | `string[]` | Zero or more; only field types supported by the v0 editor are selectable — unsupported types are shown read-only and excluded from this list (Assumption). |
| `photoFieldId` | `string \| null` | Zero or one; omitted when the workflow has no photo step (FR-005, FR-017). |

**Validation rule**: if the configured table/barcode/editable/photo field was deleted, renamed, or
changed to an incompatible type since configuration, the app surfaces this as a configuration
error rather than attempting a lookup (Edge Case).

## Asset Record

The uniquely matched Baserow row displayed and updated by the user (FR-013).

| Field | Type | Validation |
|---|---|---|
| `rowId` | `string \| number` | Baserow row identifier; set only after a `found` Lookup Outcome. |
| `displayFields` | `Record<string, unknown>` | All row values, for identification/context (FR-013). |
| `editableValues` | `Record<string, unknown>` | Subset keyed by `editableFieldIds`; only this subset can be changed (FR-014). |

**Rule**: saving writes only `editableValues` back to Baserow; all other row values are preserved
untouched (FR-014, FR-015).

## Lookup Outcome

The result of comparing one scanned value against the configured barcode field across the table
(FR-009, FR-010).

```ts
type LookupOutcome =
  | { kind: "none" }
  | { kind: "found"; record: AssetRecord }
  | { kind: "duplicate" };
```

**Rule**: exactly one of these three variants is produced per scan; the `found` variant is the
only one that may open a record for editing (FR-011, FR-012).

## Photo Attachment

A captured image plus its upload and attachment state for one Asset Record (FR-017, FR-018).

| Field | Type | Validation |
|---|---|---|
| `localUri` | `string` | Result of `expo-camera` capture; held in memory only, never persisted beyond the current save flow. |
| `uploadState` | `"idle" \| "uploading" \| "uploaded" \| "upload_failed"` | Distinguishes upload failure from a later attachment failure (FR-018). |
| `attachState` | `"idle" \| "attaching" \| "attached" \| "attach_failed"` | Set only after `uploadState` is `"uploaded"`; never implies success when either state is in a failed/idle state (FR-018, Edge Case: update succeeds but photo fails). |

**Rule**: the Record screen reports field-update success independently from photo
upload/attachment success — a save is never presented as fully complete unless both the field
update (if any fields changed) and the photo attachment (if a photo was captured) succeeded
(FR-018).
