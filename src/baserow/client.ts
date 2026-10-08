import type {
  AssetRecord,
  Connection,
  FieldConfiguration,
  LookupOutcome,
  PhotoAttachResult,
  UpdateResult,
} from "../types";
import type { BaserowFile, BaserowRow, FieldSummary, TableSummary } from "./types";

/**
 * Rows are read and written using Baserow's `field_<id>` keys (user_field_names is left off),
 * not field names — this keeps every row key aligned with FieldConfiguration's id-based
 * barcodeFieldId/editableFieldIds/photoFieldId, so no id-to-name resolution step is needed to
 * read or write a row. Field *names* (for on-screen labels) come from listFields separately,
 * which also means labels stay correct if a field is renamed after configuration.
 */
export function rowFieldKey(fieldId: string): string {
  return `field_${fieldId}`;
}

/** Inverse of `rowFieldKey`: recovers the field id from a row key, passing non-field keys (e.g. `id`) through untouched. */
export function fieldIdFromRowKey(key: string): string {
  return key.startsWith("field_") ? key.slice("field_".length) : key;
}

async function baserowRequest(
  connection: Connection,
  path: string,
  init?: RequestInit,
  notFoundMessage = "The Baserow server returned an unexpected error."
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${connection.serverUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Token ${connection.token}`,
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new Error(
      "Couldn't reach the Baserow server. Check the server URL and your network connection."
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error("This token isn't valid for this server. Check that it hasn't expired or been revoked.");
  }
  if (response.status === 404) {
    throw new Error(notFoundMessage);
  }
  if (!response.ok) {
    throw new Error("The Baserow server returned an unexpected error.");
  }

  try {
    return await response.json();
  } catch {
    throw new Error("The Baserow server returned an unexpected response.");
  }
}

/** Lists the tables the connection's token can access (FR-002, FR-005). */
export async function listTables(connection: Connection): Promise<TableSummary[]> {
  const body = (await baserowRequest(
    connection,
    "/api/database/tables/all-tables/"
  )) as Array<{ id: number; name: string }>;
  return body.map(({ id, name }) => ({ id, name }));
}

/** Lists a table's fields with id, name, and type, for the Configure screen's pickers (FR-005). */
export async function listFields(
  connection: Connection,
  tableId: string
): Promise<FieldSummary[]> {
  const body = (await baserowRequest(
    connection,
    `/api/database/fields/table/${tableId}/`,
    undefined,
    "That table could not be found. It may have been deleted or renamed."
  )) as Array<{ id: number; name: string; type: string }>;
  return body.map(({ id, name, type }) => ({ id, name, type }));
}

function rowToAssetRecord(row: BaserowRow, fieldConfig: FieldConfiguration): AssetRecord {
  const editableValues: Record<string, unknown> = {};
  for (const fieldId of fieldConfig.editableFieldIds) {
    const key = rowFieldKey(fieldId);
    if (key in row) {
      editableValues[key] = row[key];
    }
  }
  return { rowId: row.id, displayFields: row, editableValues };
}

/**
 * Looks up the one row whose configured barcode field exactly equals `scannedValue`, returning
 * a discriminated outcome instead of ever picking an arbitrary row (FR-009–FR-012).
 */
export async function lookupByBarcode(
  connection: Connection,
  fieldConfig: FieldConfiguration,
  scannedValue: string
): Promise<LookupOutcome> {
  const params = new URLSearchParams({
    [`filter__${rowFieldKey(fieldConfig.barcodeFieldId)}__equal`]: scannedValue,
  });
  const body = (await baserowRequest(
    connection,
    `/api/database/rows/table/${fieldConfig.tableId}/?${params.toString()}`,
    undefined,
    "That table could not be found. It may have been deleted or renamed."
  )) as { results: BaserowRow[] };

  if (body.results.length === 0) {
    return { kind: "none" };
  }
  if (body.results.length > 1) {
    return { kind: "duplicate" };
  }
  return { kind: "found", record: rowToAssetRecord(body.results[0], fieldConfig) };
}

/**
 * Persists exactly `editableValues` to the row — the request body contains only those keys, so
 * no other row value can be overwritten (FR-014, FR-015). Never throws: failures resolve to
 * `{ ok: false }` so the caller can keep the user's unsaved input on screen (FR-016).
 */
export async function updateRecord(
  connection: Connection,
  fieldConfig: FieldConfiguration,
  rowId: string | number,
  editableValues: Record<string, unknown>
): Promise<UpdateResult> {
  try {
    await baserowRequest(
      connection,
      `/api/database/rows/table/${fieldConfig.tableId}/${rowId}/`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editableValues),
      },
      "This record could not be found. It may have been deleted."
    );
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: (error as Error).message };
  }
}

async function uploadFile(connection: Connection, localUri: string): Promise<BaserowFile> {
  const filename = localUri.split("/").pop() || "photo.jpg";
  const formData = new FormData();
  // React Native's FormData accepts this { uri, name, type } shape at runtime; the DOM lib's
  // FormData.append type only knows about string/Blob, hence the cast.
  formData.append(
    "file",
    { uri: localUri, name: filename, type: "image/jpeg" } as unknown as Blob
  );

  let response: Response;
  try {
    response = await fetch(`${connection.serverUrl}/api/user-files/upload-file/`, {
      method: "POST",
      headers: { Authorization: `Token ${connection.token}` },
      body: formData,
    });
  } catch {
    throw new Error("Couldn't reach the Baserow server. Check your network connection.");
  }

  if (response.status === 413) {
    throw new Error("This photo is too large for the server to accept.");
  }
  if (!response.ok) {
    throw new Error("The Baserow server rejected the photo upload.");
  }
  try {
    return (await response.json()) as BaserowFile;
  } catch {
    throw new Error("The Baserow server returned an unexpected response.");
  }
}

/**
 * Uploads `localUri`, then attaches it to the configured photo field alongside
 * `existingAttachments` — Baserow replaces a file field's whole array on write, so omitting the
 * prior attachments would silently delete them (FR-014's "preserve all other row values"
 * extends to the photo field's own prior contents). `failedStep` distinguishes which half
 * failed so a partial failure is never presented as a complete save (FR-017, FR-018).
 */
export async function uploadAndAttachPhoto(
  connection: Connection,
  fieldConfig: FieldConfiguration,
  rowId: string | number,
  localUri: string,
  existingAttachments: BaserowFile[]
): Promise<PhotoAttachResult> {
  if (!fieldConfig.photoFieldId) {
    return { ok: false, failedStep: "attach", reason: "No photo field is configured." };
  }
  let uploadedFile: BaserowFile;
  try {
    uploadedFile = await uploadFile(connection, localUri);
  } catch (error) {
    return { ok: false, failedStep: "upload", reason: (error as Error).message };
  }
  try {
    await baserowRequest(
      connection,
      `/api/database/rows/table/${fieldConfig.tableId}/${rowId}/`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [rowFieldKey(fieldConfig.photoFieldId)]: [...existingAttachments, uploadedFile],
        }),
      },
      "This record could not be found. It may have been deleted."
    );
    return { ok: true };
  } catch (error) {
    return { ok: false, failedStep: "attach", reason: (error as Error).message };
  }
}
