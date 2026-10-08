const mockStore = new Map<string, string>();

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    mockStore.delete(key);
    return Promise.resolve();
  }),
}));

import * as SecureStore from "expo-secure-store";

import {
  clearConnectionState,
  normalizeServerUrl,
  readConnectionState,
  writeConnectionState,
} from "../../src/connection/storage";
import type { Connection, FieldConfiguration } from "../../src/types";

const connection: Connection = { serverUrl: "https://example.baserow.io", token: "super-secret-token" };
const fieldConfiguration: FieldConfiguration = {
  tableId: "5",
  barcodeFieldId: "10",
  editableFieldIds: ["11", "13"],
  photoFieldId: "12",
};

beforeEach(() => {
  mockStore.clear();
});

describe("normalizeServerUrl", () => {
  it("strips a trailing slash", () => {
    expect(normalizeServerUrl("https://example.baserow.io/")).toBe("https://example.baserow.io");
  });

  it("leaves a URL without a trailing slash unchanged", () => {
    expect(normalizeServerUrl("https://example.baserow.io")).toBe("https://example.baserow.io");
  });
});

describe("readConnectionState", () => {
  it("returns null when nothing is stored", async () => {
    await expect(readConnectionState()).resolves.toBeNull();
  });

  it("round-trips a write through a read, with the server URL normalized", async () => {
    await writeConnectionState(
      { ...connection, serverUrl: "https://example.baserow.io/" },
      fieldConfiguration
    );
    await expect(readConnectionState()).resolves.toEqual({
      connection: { ...connection, serverUrl: "https://example.baserow.io" },
      fieldConfiguration,
    });
  });

  it("returns null instead of throwing when the stored blob is corrupt", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce("{not valid json");
    await expect(readConnectionState()).resolves.toBeNull();
  });
});

describe("clearConnectionState", () => {
  it("removes the stored state so a later read returns null", async () => {
    await writeConnectionState(connection, fieldConfiguration);
    await clearConnectionState();
    await expect(readConnectionState()).resolves.toBeNull();
  });
});

// No test here uses console.log or toMatchSnapshot on anything containing `connection.token` —
// a snapshot file is a committed artifact, so snapshotting the token would leak it (FR-003).
