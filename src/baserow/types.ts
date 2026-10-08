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
 * A Baserow row, requested with `user_field_names=true` so keys are field names. `id` is
 * Baserow's own row identifier, always present.
 */
export type BaserowRow = { id: number } & Record<string, unknown>;

/**
 * A file reference as Baserow stores it on a file field and returns from
 * `POST /api/user-files/upload-file/` — `name` is the only field this app relies on; the rest
 * passes through untouched.
 */
export type BaserowFile = { name: string } & Record<string, unknown>;
