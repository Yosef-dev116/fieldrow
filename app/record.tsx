import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { listFields, rowFieldKey, updateRecord } from "../src/baserow/client";
import { useStoredConnection } from "../src/connection/useStoredConnection";
import { getErrorMessage } from "../src/errors";
import { useThemeColors } from "../src/theme";
import type { FieldSummary } from "../src/baserow/types";
import type { AssetRecord } from "../src/types";

function parseRecord(raw: string | string[] | undefined): AssetRecord | null {
  if (typeof raw !== "string") {
    return null;
  }
  try {
    return JSON.parse(raw) as AssetRecord;
  } catch {
    return null;
  }
}

export default function RecordScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const stored = useStoredConnection();
  const { record: recordParam } = useLocalSearchParams<{ record?: string }>();
  const [record] = useState<AssetRecord | null>(() => parseRecord(recordParam));
  const [fields, setFields] = useState<FieldSummary[] | null>(null);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const [key, value] of Object.entries(record?.editableValues ?? {})) {
      initial[key] = value === null || value === undefined ? "" : String(value);
    }
    return initial;
  });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (stored.status !== "ready" || !stored.state) {
      return;
    }
    listFields(stored.state.connection, stored.state.fieldConfiguration.tableId).then(
      setFields,
      () => setFields([])
    );
  }, [stored]);

  const fieldNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const field of fields ?? []) {
      map.set(String(field.id), field.name);
    }
    return map;
  }, [fields]);

  const editableFieldIds = stored.status === "ready" ? stored.state?.fieldConfiguration.editableFieldIds ?? [] : [];

  const handleSave = useCallback(async () => {
    if (stored.status !== "ready" || !stored.state || !record || inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;
    setSaveState("saving");
    setSaveError(null);
    const result = await updateRecord(
      stored.state.connection,
      stored.state.fieldConfiguration,
      record.rowId,
      values
    );
    inFlightRef.current = false;
    if (result.ok) {
      setSaveState("saved");
    } else {
      setSaveState("error");
      setSaveError(result.reason);
    }
  }, [stored, record, values]);

  if (!record) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <Text style={[styles.message, { color: colors.text }]}>No record to show.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const rows = Object.entries(record.displayFields).filter(([key]) => key !== "id");

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Asset Record</Text>

        {rows.map(([key, value]) => {
          const fieldId = key.startsWith("field_") ? key.slice("field_".length) : key;
          const label = fieldNameById.get(fieldId) ?? fieldId;
          const editable = editableFieldIds.includes(fieldId);
          return (
            <View key={key}>
              <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
              {editable ? (
                <TextInput
                  accessibilityLabel={`Edit ${label}`}
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  value={values[rowFieldKey(fieldId)] ?? ""}
                  onChangeText={(text) =>
                    setValues((prev) => ({ ...prev, [rowFieldKey(fieldId)]: text }))
                  }
                />
              ) : (
                <Text style={[styles.readOnlyValue, { color: colors.text }]}>
                  {value === null || value === undefined ? "" : String(value)}
                </Text>
              )}
            </View>
          );
        })}

        {saveError && <Text style={styles.error}>{saveError}</Text>}
        {saveState === "saved" && <Text style={styles.success}>Saved.</Text>}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save changes"
          disabled={saveState === "saving"}
          style={[styles.button, saveState === "saving" && styles.buttonDisabled]}
          onPress={handleSave}
        >
          {saveState === "saving" ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save changes</Text>
          )}
        </Pressable>

        {saveState === "saved" && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Done"
            style={styles.doneButton}
            onPress={() => router.back()}
          >
            <Text style={[styles.doneButtonText, { color: colors.text }]}>Done</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, gap: 8 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 8 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 12 },
  readOnlyValue: { fontSize: 16, paddingVertical: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 44,
    fontSize: 16,
    marginTop: 4,
  },
  message: { fontSize: 16, textAlign: "center" },
  error: { color: "#d33", marginTop: 12 },
  success: { color: "#2a7a2a", marginTop: 12 },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    minHeight: 44,
    marginTop: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  doneButton: { marginTop: 16, minHeight: 44, alignItems: "center", justifyContent: "center" },
  doneButtonText: { fontSize: 16 },
});
