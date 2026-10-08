/** Server address and token for one Baserow connection (data-model.md's Connection). */
export type Connection = {
  serverUrl: string;
  token: string;
};

/** Selected table and field roles for the workflow (data-model.md's Field Configuration). */
export type FieldConfiguration = {
  tableId: string;
  barcodeFieldId: string;
  editableFieldIds: string[];
  photoFieldId: string | null;
};

/** The uniquely matched Baserow row displayed and updated by the user. */
export type AssetRecord = {
  rowId: string | number;
  displayFields: Record<string, unknown>;
  editableValues: Record<string, unknown>;
};

/** Result of comparing one scanned value against the configured barcode field (FR-009–FR-012). */
export type LookupOutcome =
  | { kind: "none" }
  | { kind: "found"; record: AssetRecord }
  | { kind: "duplicate" };

export type PhotoUploadState = "idle" | "uploading" | "uploaded" | "upload_failed";
export type PhotoAttachState = "idle" | "attaching" | "attached" | "attach_failed";

/** A captured image plus its upload and attachment state for one Asset Record (FR-017, FR-018). */
export type PhotoAttachment = {
  localUri: string;
  uploadState: PhotoUploadState;
  attachState: PhotoAttachState;
};
