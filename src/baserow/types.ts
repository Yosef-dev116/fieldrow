/**
 * A table the connection's token can access, from `GET /api/database/tables/all-tables/`. `id`
 * is a Baserow integer id — convert explicitly (e.g. `String(table.id)`) when storing it in
 * `FieldConfiguration`'s string-typed `tableId`.
 */
export type TableSummary = {
  id: number;
  name: string;
};

/**
 * A field on a table, from `GET /api/database/fields/table/{tableId}/`. `id` is a Baserow
 * integer id — convert explicitly when storing it in `FieldConfiguration`'s string-typed field
 * ids.
 */
export type FieldSummary = {
  id: number;
  name: string;
  type: string;
};

/**
 * A Baserow row, requested without `user_field_names` so keys are Baserow's default
 * `field_<id>` form (see `src/baserow/client.ts`'s `rowFieldKey`) — this keeps row keys aligned
 * with `FieldConfiguration`'s id-based fields. `id` is Baserow's own row identifier, always
 * present.
 */
export type BaserowRow = { id: number } & Record<string, unknown>;

/**
 * A file reference as Baserow stores it on a file field and returns from
 * `POST /api/user-files/upload-file/` — `name` is the only field this app relies on; the rest
 * passes through untouched.
 */
export type BaserowFile = { name: string } & Record<string, unknown>;

/**
 * Baserow field types the v0 record editor can render/save as a plain string with no type
 * coercion risk (data-model.md: "unsupported types remain readable but cannot be selected for
 * editing"). The Configure screen's editable-field picker filters to this set; number, boolean,
 * date, select, and relation types are excluded for v0 rather than risk writing a value Baserow
 * rejects or silently coerces.
 */
const EDITABLE_FIELD_TYPES: ReadonlySet<string> = new Set([
  "text",
  "long_text",
  "url",
  "email",
  "phone_number",
]);

export function isEditableFieldType(type: string): boolean {
  return EDITABLE_FIELD_TYPES.has(type);
}
