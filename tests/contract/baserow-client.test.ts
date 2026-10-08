import { listFields, listTables, lookupByBarcode } from "../../src/baserow/client";
import type { Connection, FieldConfiguration } from "../../src/types";

const connection: Connection = {
  serverUrl: "https://example.baserow.io",
  token: "super-secret-token",
};

function mockFetchResolve(status: number, body: unknown) {
  (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

function mockFetchRejectNetwork() {
  (globalThis.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network request failed"));
}

async function captureRejection(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise;
  } catch (error) {
    return error as Error;
  }
  throw new Error("expected promise to reject");
}

beforeEach(() => {
  globalThis.fetch = jest.fn();
});

describe("listTables", () => {
  it("returns the table summaries Baserow reports", async () => {
    mockFetchResolve(200, [{ id: 1, name: "Assets" }]);
    await expect(listTables(connection)).resolves.toEqual([{ id: 1, name: "Assets" }]);
  });

  it("fails without exposing the token when the token is invalid", async () => {
    mockFetchResolve(401, {});
    const error = await captureRejection(listTables(connection));
    expect(error.message).toMatch(/token/i);
    expect(error.message).not.toContain(connection.token);
  });

  it("fails with a network message when the server is unreachable", async () => {
    mockFetchRejectNetwork();
    const error = await captureRejection(listTables(connection));
    expect(error.message).toMatch(/couldn't reach/i);
  });
});

describe("listFields", () => {
  it("returns the field summaries Baserow reports", async () => {
    mockFetchResolve(200, [{ id: 10, name: "Barcode", type: "text" }]);
    await expect(listFields(connection, "5")).resolves.toEqual([
      { id: 10, name: "Barcode", type: "text" },
    ]);
  });

  it("fails as a configuration error, not a crash, when the table no longer exists", async () => {
    mockFetchResolve(404, {});
    const error = await captureRejection(listFields(connection, "999"));
    expect(error.message).toMatch(/could not be found/i);
  });
});

describe("lookupByBarcode", () => {
  const fieldConfig: FieldConfiguration = {
    tableId: "5",
    barcodeFieldId: "10",
    editableFieldIds: ["11"],
    photoFieldId: "12",
  };

  it("returns none when there are zero matches", async () => {
    mockFetchResolve(200, { results: [] });
    await expect(lookupByBarcode(connection, fieldConfig, "MISSING")).resolves.toEqual({
      kind: "none",
    });
  });

  it("returns found with the row mapped onto an AssetRecord when there is exactly one match", async () => {
    mockFetchResolve(200, {
      results: [{ id: 42, field_10: "ABC123", field_11: "old value", field_12: [] }],
    });
    await expect(lookupByBarcode(connection, fieldConfig, "ABC123")).resolves.toEqual({
      kind: "found",
      record: {
        rowId: 42,
        displayFields: { id: 42, field_10: "ABC123", field_11: "old value", field_12: [] },
        editableValues: { field_11: "old value" },
      },
    });
  });

  it("returns duplicate when more than one row matches, without picking either", async () => {
    mockFetchResolve(200, { results: [{ id: 1 }, { id: 2 }] });
    await expect(lookupByBarcode(connection, fieldConfig, "DUP")).resolves.toEqual({
      kind: "duplicate",
    });
  });

  it("filters by the barcode field's id, not its name", async () => {
    mockFetchResolve(200, { results: [] });
    await lookupByBarcode(connection, fieldConfig, "ABC123");
    const [url] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain("filter__field_10__equal=ABC123");
  });

  it("fails with a network message on connectivity loss", async () => {
    mockFetchRejectNetwork();
    const error = await captureRejection(lookupByBarcode(connection, fieldConfig, "ABC123"));
    expect(error.message).toMatch(/couldn't reach/i);
  });

  it("fails with a malformed-response message when the body isn't valid JSON", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("bad json");
      },
    });
    const error = await captureRejection(lookupByBarcode(connection, fieldConfig, "ABC123"));
    expect(error.message).toMatch(/unexpected response/i);
  });
});
