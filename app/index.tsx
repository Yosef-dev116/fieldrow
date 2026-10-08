import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { listFields, listTables } from "../src/baserow/client";
import {
  clearConnectionState,
  normalizeServerUrl,
  writeConnectionState,
} from "../src/connection/storage";
import { useStoredConnection } from "../src/connection/useStoredConnection";
import { getErrorMessage } from "../src/errors";
import { useThemeColors } from "../src/theme";
import { isEditableFieldType } from "../src/baserow/types";
import type { FieldSummary, TableSummary } from "../src/baserow/types";
import type { Connection } from "../src/types";

type Step =
  | { name: "loading" }
  | { name: "connect"; serverUrl: string; token: string; error: string | null; submitting: boolean }
  | { name: "selectTable"; connection: Connection; tables: TableSummary[]; error: string | null; submitting: boolean }
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
  const colors = useThemeColors();
  const stored = useStoredConnection();
  const [step, setStep] = useState<Step>({ name: "loading" });
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (stored.status !== "ready") {
      return;
    }
    if (stored.state && reconfigure !== "1") {
      router.replace("/scan");
      return;
    }
    setStep({
      name: "connect",
      serverUrl: stored.state?.connection.serverUrl ?? "",
      token: "",
      error: null,
      submitting: false,
    });
  }, [stored, reconfigure, router]);

  const handleConnect = useCallback(async () => {
    if (step.name !== "connect" || inFlightRef.current) {
      return;
    }
    const connection: Connection = {
      serverUrl: normalizeServerUrl(step.serverUrl.trim()),
      token: step.token.trim(),
    };
    if (!connection.serverUrl || !connection.token) {
      setStep((prev) =>
        prev.name !== "connect"
          ? prev
          : { ...prev, error: "Enter both the server URL and the database token." }
      );
      return;
    }
    inFlightRef.current = true;
    setStep((prev) => (prev.name !== "connect" ? prev : { ...prev, submitting: true, error: null }));
    try {
      const tables = await listTables(connection);
      inFlightRef.current = false;
      setStep({ name: "selectTable", connection, tables, error: null, submitting: false });
    } catch (error) {
      inFlightRef.current = false;
      setStep((prev) =>
        prev.name !== "connect" ? prev : { ...prev, submitting: false, error: getErrorMessage(error) }
      );
    }
  }, [step]);

  const handleSelectTable = useCallback(
    async (table: TableSummary) => {
      if (step.name !== "selectTable" || inFlightRef.current) {
        return;
      }
      const { connection } = step;
      inFlightRef.current = true;
      setStep((prev) => (prev.name !== "selectTable" ? prev : { ...prev, submitting: true, error: null }));
      try {
        const fields = await listFields(connection, String(table.id));
        inFlightRef.current = false;
        setStep({
          name: "selectFields",
          connection,
          tableId: String(table.id),
          fields,
          barcodeFieldId: null,
          editableFieldIds: [],
          photoFieldId: null,
          error: null,
          submitting: false,
        });
      } catch (error) {
        inFlightRef.current = false;
        setStep((prev) =>
          prev.name !== "selectTable"
            ? prev
            : { ...prev, submitting: false, error: getErrorMessage(error) }
        );
      }
    },
    [step]
  );

  const handleSave = useCallback(async () => {
    if (step.name !== "selectFields" || !step.barcodeFieldId || inFlightRef.current) {
      return;
    }
    const { connection, tableId, barcodeFieldId, editableFieldIds, photoFieldId } = step;
    inFlightRef.current = true;
    setStep((prev) => (prev.name !== "selectFields" ? prev : { ...prev, submitting: true, error: null }));
    try {
      await writeConnectionState(connection, { tableId, barcodeFieldId, editableFieldIds, photoFieldId });
      inFlightRef.current = false;
      router.replace("/scan");
    } catch (error) {
      inFlightRef.current = false;
      setStep((prev) =>
        prev.name !== "selectFields"
          ? prev
          : { ...prev, submitting: false, error: getErrorMessage(error) }
      );
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
                accessibilityState={{ disabled: step.submitting }}
                disabled={step.submitting}
                style={[styles.row, { borderColor: colors.border }, step.submitting && styles.buttonDisabled]}
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
              <FieldOptionRow
                key={`barcode-${field.id}`}
                role="radio"
                label={field.name}
                accessibilityLabel={`Barcode field: ${field.name}`}
                selected={step.barcodeFieldId === String(field.id)}
                color={colors.text}
                borderColor={colors.border}
                onPress={() => setStep({ ...step, barcodeFieldId: String(field.id) })}
              />
            ))}

            <Text style={[styles.label, { color: colors.text }]}>Editable fields</Text>
            {step.fields.filter((field) => isEditableFieldType(field.type)).map((field) => {
              const id = String(field.id);
              const selected = step.editableFieldIds.includes(id);
              return (
                <FieldOptionRow
                  key={`editable-${field.id}`}
                  role="checkbox"
                  label={field.name}
                  accessibilityLabel={`Editable field: ${field.name}`}
                  selected={selected}
                  color={colors.text}
                  borderColor={colors.border}
                  onPress={() =>
                    setStep({
                      ...step,
                      editableFieldIds: selected
                        ? step.editableFieldIds.filter((existing) => existing !== id)
                        : [...step.editableFieldIds, id],
                    })
                  }
                />
              );
            })}

            <Text style={[styles.label, { color: colors.text }]}>Photo field (optional)</Text>
            <FieldOptionRow
              role="radio"
              label="None"
              accessibilityLabel="No photo field"
              selected={step.photoFieldId === null}
              color={colors.text}
              borderColor={colors.border}
              onPress={() => setStep({ ...step, photoFieldId: null })}
            />
            {step.fields.map((field) => (
              <FieldOptionRow
                key={`photo-${field.id}`}
                role="radio"
                label={field.name}
                accessibilityLabel={`Photo field: ${field.name}`}
                selected={step.photoFieldId === String(field.id)}
                color={colors.text}
                borderColor={colors.border}
                onPress={() => setStep({ ...step, photoFieldId: String(field.id) })}
              />
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

function FieldOptionRow({
  role,
  label,
  accessibilityLabel,
  selected,
  color,
  borderColor,
  onPress,
}: {
  role: "radio" | "checkbox";
  label: string;
  accessibilityLabel: string;
  selected: boolean;
  color: string;
  borderColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={role === "radio" ? { selected } : { checked: selected }}
      accessibilityLabel={accessibilityLabel}
      style={[styles.row, { borderColor }, selected && styles.rowSelected]}
      onPress={onPress}
    >
      <Text style={{ color }}>{label}</Text>
    </Pressable>
  );
}

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
