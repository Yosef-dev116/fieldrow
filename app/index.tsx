import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { listFields, listTables } from "../src/baserow/client";
import {
  clearConnectionState,
  normalizeServerUrl,
  readConnectionState,
  writeConnectionState,
} from "../src/connection/storage";
import type { FieldSummary, TableSummary } from "../src/baserow/types";
import type { Connection } from "../src/types";

type Step =
  | { name: "loading" }
  | { name: "connect"; serverUrl: string; token: string; error: string | null; submitting: boolean }
  | { name: "selectTable"; connection: Connection; tables: TableSummary[]; error: string | null }
  | {
      name: "selectFields";
      connection: Connection;
      tableId: string;
      fields: FieldSummary[];
      barcodeFieldId: string | null;
      editableFieldIds: string[];
      photoFieldId: string | null;
      error: string | null;
      submitting: boolean;
    };

export default function ConnectScreen() {
  const router = useRouter();
  const { reconfigure } = useLocalSearchParams<{ reconfigure?: string }>();
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? darkColors : lightColors;
  const [step, setStep] = useState<Step>({ name: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await readConnectionState();
      if (cancelled) {
        return;
      }
      if (stored && reconfigure !== "1") {
        router.replace("/scan");
        return;
      }
      setStep({
        name: "connect",
        serverUrl: stored?.connection.serverUrl ?? "",
        token: "",
        error: null,
        submitting: false,
      });
    })();
    return () => {
      cancelled = true;
    };
    // Re-run only when the reconfigure intent changes, not on every router/step identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reconfigure]);

  const handleConnect = useCallback(async () => {
    if (step.name !== "connect") {
      return;
    }
    const connection: Connection = {
      serverUrl: normalizeServerUrl(step.serverUrl.trim()),
      token: step.token.trim(),
    };
    if (!connection.serverUrl || !connection.token) {
      setStep({ ...step, error: "Enter both the server URL and the database token." });
      return;
    }
    setStep({ ...step, submitting: true, error: null });
    try {
      const tables = await listTables(connection);
      setStep({ name: "selectTable", connection, tables, error: null });
    } catch (error) {
      setStep({ ...step, submitting: false, error: (error as Error).message });
    }
  }, [step]);

  const handleSelectTable = useCallback(
    async (table: TableSummary) => {
      if (step.name !== "selectTable") {
        return;
      }
      try {
        const fields = await listFields(step.connection, String(table.id));
        setStep({
          name: "selectFields",
          connection: step.connection,
          tableId: String(table.id),
          fields,
          barcodeFieldId: null,
          editableFieldIds: [],
          photoFieldId: null,
          error: null,
          submitting: false,
        });
      } catch (error) {
        setStep({ ...step, error: (error as Error).message });
      }
    },
    [step]
  );

  const handleSave = useCallback(async () => {
    if (step.name !== "selectFields" || !step.barcodeFieldId) {
      return;
    }
    setStep({ ...step, submitting: true, error: null });
    try {
      await writeConnectionState(step.connection, {
        tableId: step.tableId,
        barcodeFieldId: step.barcodeFieldId,
        editableFieldIds: step.editableFieldIds,
        photoFieldId: step.photoFieldId,
      });
      router.replace("/scan");
    } catch (error) {
      setStep({ ...step, submitting: false, error: (error as Error).message });
    }
  }, [step, router]);

  const handleClear = useCallback(async () => {
    await clearConnectionState();
    setStep({ name: "connect", serverUrl: "", token: "", error: null, submitting: false });
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Connect to Baserow</Text>

        {step.name === "loading" && <ActivityIndicator accessibilityLabel="Loading" />}

        {step.name === "connect" && (
          <View>
            <Text style={[styles.label, { color: colors.text }]}>Server URL</Text>
            <TextInput
              accessibilityLabel="Baserow server URL"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="https://api.baserow.io"
              placeholderTextColor={colors.placeholder}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={step.serverUrl}
              onChangeText={(serverUrl) => setStep({ ...step, serverUrl })}
            />
            <Text style={[styles.label, { color: colors.text }]}>Database token</Text>
            <TextInput
              accessibilityLabel="Baserow database token"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={step.token}
              onChangeText={(token) => setStep({ ...step, token })}
            />
            {step.error && <Text style={styles.error}>{step.error}</Text>}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Connect"
              disabled={step.submitting}
              style={[styles.button, step.submitting && styles.buttonDisabled]}
              onPress={handleConnect}
            >
              {step.submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Connect</Text>
              )}
            </Pressable>
          </View>
        )}

        {step.name === "selectTable" && (
          <View>
            <Text style={[styles.label, { color: colors.text }]}>Choose a table</Text>
            {step.error && <Text style={styles.error}>{step.error}</Text>}
            {step.tables.map((table) => (
              <Pressable
                key={table.id}
                accessibilityRole="button"
                accessibilityLabel={`Table: ${table.name}`}
                style={[styles.row, { borderColor: colors.border }]}
                onPress={() => handleSelectTable(table)}
              >
                <Text style={{ color: colors.text }}>{table.name}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {step.name === "selectFields" && (
          <View>
            <Text style={[styles.label, { color: colors.text }]}>Barcode field (required)</Text>
            {step.fields.map((field) => (
              <Pressable
                key={`barcode-${field.id}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: step.barcodeFieldId === String(field.id) }}
                accessibilityLabel={`Barcode field: ${field.name}`}
                style={[
                  styles.row,
                  { borderColor: colors.border },
                  step.barcodeFieldId === String(field.id) && styles.rowSelected,
                ]}
                onPress={() => setStep({ ...step, barcodeFieldId: String(field.id) })}
              >
                <Text style={{ color: colors.text }}>{field.name}</Text>
              </Pressable>
            ))}

            <Text style={[styles.label, { color: colors.text }]}>Editable fields</Text>
            {step.fields.map((field) => {
              const id = String(field.id);
              const selected = step.editableFieldIds.includes(id);
              return (
                <Pressable
                  key={`editable-${field.id}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`Editable field: ${field.name}`}
                  style={[styles.row, { borderColor: colors.border }, selected && styles.rowSelected]}
                  onPress={() =>
                    setStep({
                      ...step,
                      editableFieldIds: selected
                        ? step.editableFieldIds.filter((existing) => existing !== id)
                        : [...step.editableFieldIds, id],
                    })
                  }
                >
                  <Text style={{ color: colors.text }}>{field.name}</Text>
                </Pressable>
              );
            })}

            <Text style={[styles.label, { color: colors.text }]}>Photo field (optional)</Text>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: step.photoFieldId === null }}
              accessibilityLabel="No photo field"
              style={[styles.row, { borderColor: colors.border }, step.photoFieldId === null && styles.rowSelected]}
              onPress={() => setStep({ ...step, photoFieldId: null })}
            >
              <Text style={{ color: colors.text }}>None</Text>
            </Pressable>
            {step.fields.map((field) => (
              <Pressable
                key={`photo-${field.id}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: step.photoFieldId === String(field.id) }}
                accessibilityLabel={`Photo field: ${field.name}`}
                style={[
                  styles.row,
                  { borderColor: colors.border },
                  step.photoFieldId === String(field.id) && styles.rowSelected,
                ]}
                onPress={() => setStep({ ...step, photoFieldId: String(field.id) })}
              >
                <Text style={{ color: colors.text }}>{field.name}</Text>
              </Pressable>
            ))}

            {step.error && <Text style={styles.error}>{step.error}</Text>}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save configuration"
              disabled={!step.barcodeFieldId || step.submitting}
              style={[
                styles.button,
                (!step.barcodeFieldId || step.submitting) && styles.buttonDisabled,
              ]}
              onPress={handleSave}
            >
              {step.submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Save configuration</Text>
              )}
            </Pressable>
          </View>
        )}

        {step.name !== "loading" && reconfigure === "1" && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear configuration"
            style={styles.clearButton}
            onPress={handleClear}
          >
            <Text style={styles.clearButtonText}>Clear configuration</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const lightColors = {
  background: "#ffffff",
  text: "#111111",
  border: "#cccccc",
  placeholder: "#888888",
};

const darkColors = {
  background: "#111111",
  text: "#ffffff",
  border: "#444444",
  placeholder: "#888888",
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 8 },
  label: { fontSize: 16, fontWeight: "600", marginTop: 16, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 44,
    fontSize: 16,
  },
  row: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 44,
    marginBottom: 8,
    justifyContent: "center",
  },
  rowSelected: { borderWidth: 2 },
  error: { color: "#d33", marginTop: 8 },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    minHeight: 44,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  clearButton: { marginTop: 24, minHeight: 44, alignItems: "center", justifyContent: "center" },
  clearButtonText: { color: "#d33", fontSize: 16 },
});
