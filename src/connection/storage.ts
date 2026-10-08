import * as SecureStore from "expo-secure-store";

import type { Connection, FieldConfiguration } from "../types";

const STORAGE_KEY = "fieldrow.connection";

export type StoredConnectionState = {
  connection: Connection;
  fieldConfiguration: FieldConfiguration;
};

function normalizeServerUrl(serverUrl: string): string {
  return serverUrl.replace(/\/+$/, "");
}

/** Reads the persisted connection + field configuration, or null if none is stored (FR-006). */
export async function readConnectionState(): Promise<StoredConnectionState | null> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  if (raw === null) {
    return null;
  }
  return JSON.parse(raw) as StoredConnectionState;
}

/** Persists the connection + field configuration as one secured blob (FR-003, FR-006). */
export async function writeConnectionState(
  connection: Connection,
  fieldConfiguration: FieldConfiguration
): Promise<void> {
  const state: StoredConnectionState = {
    connection: { ...connection, serverUrl: normalizeServerUrl(connection.serverUrl) },
    fieldConfiguration,
  };
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(state));
}

/** Clears the persisted connection + field configuration (FR-006's "let the user... clear it"). */
export async function clearConnectionState(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}
