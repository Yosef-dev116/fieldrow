import type { AssetRecord, Connection, FieldConfiguration, LookupOutcome } from "../types";
import type { BaserowRow, FieldSummary, TableSummary } from "./types";

/**
 * Rows are read and written using Baserow's `field_<id>` keys (user_field_names is left off),
 * not field names — this keeps every row key aligned with FieldConfiguration's id-based
 * barcodeFieldId/editableFieldIds/photoFieldId, so no id-to-name resolution step is needed to
 * read or write a row. Field *names* (for on-screen labels) come from listFields separately,
 * which also means labels stay correct if a field is renamed after configuration.
 */
function rowFieldKey(fieldId: string): string {
  return `field_${fieldId}`;
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
