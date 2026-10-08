import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { lookupByBarcode } from "../src/baserow/client";
import { useStoredConnection } from "../src/connection/useStoredConnection";
import { getErrorMessage } from "../src/errors";
import { useThemeColors } from "../src/theme";
import type { Connection, FieldConfiguration } from "../src/types";

type ScanState =
  | { phase: "scanning" }
  | { phase: "lookingUp" }
  | { phase: "none" }
  | { phase: "duplicate" }
  | { phase: "error"; message: string };

export default function ScanScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const stored = useStoredConnection();
  const [permission, requestPermission] = useCameraPermissions();
  const [config, setConfig] = useState<
    { connection: Connection; fieldConfiguration: FieldConfiguration } | null
  >(null);
  const [state, setState] = useState<ScanState>({ phase: "scanning" });
  // Synchronous lock, independent of React's render timing: CameraView can fire
  // onBarcodeScanned more than once for the same code before a state update commits and
  // unmounts it, so the guard against re-entrant lookups can't live in render-derived state.
  const scanLockRef = useRef(false);

  useEffect(() => {
    if (stored.status !== "ready") {
      return;
    }
    if (!stored.state) {
      router.replace("/");
      return;
    }
    setConfig(stored.state);
  }, [stored, router]);

  const handleScanned = useCallback(
    async (scannedValue: string) => {
      if (!config || scanLockRef.current) {
        return;
      }
      scanLockRef.current = true;
      setState({ phase: "lookingUp" });
      try {
        const outcome = await lookupByBarcode(config.connection, config.fieldConfiguration, scannedValue);
        if (outcome.kind === "found") {
          router.push({
            pathname: "/record",
            params: { record: JSON.stringify(outcome.record) },
          });
          scanLockRef.current = false;
          setState({ phase: "scanning" });
        } else if (outcome.kind === "none") {
          setState({ phase: "none" });
        } else {
          setState({ phase: "duplicate" });
        }
      } catch (error) {
        setState({ phase: "error", message: getErrorMessage(error) });
      }
    },
    [config, router]
  );

  const resetToScanning = useCallback(() => {
    scanLockRef.current = false;
    setState({ phase: "scanning" });
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change connection"
          onPress={() => router.push("/?reconfigure=1")}
          style={styles.headerButton}
        >
          <Text style={[styles.headerButtonText, { color: colors.text }]}>Change connection</Text>
        </Pressable>
      </View>

      {!permission && <ActivityIndicator accessibilityLabel="Loading" />}

      {permission && !permission.granted && (
        <RetryPanel
          message="Fieldrow needs camera access to scan barcodes."
          buttonLabel="Grant camera access"
          textColor={colors.text}
          onRetry={requestPermission}
        />
      )}

      {permission?.granted && state.phase === "scanning" && (
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr", "code128", "ean13", "ean8"] }}
          onBarcodeScanned={(result) => handleScanned(result.data)}
        />
      )}

      {permission?.granted && state.phase === "lookingUp" && (
        <View style={styles.centered}>
          <ActivityIndicator accessibilityLabel="Looking up record" />
        </View>
      )}

      {state.phase === "none" && (
        <RetryPanel
          message="No record matches that code."
          buttonLabel="Scan again"
          textColor={colors.text}
          onRetry={resetToScanning}
        />
      )}

      {state.phase === "duplicate" && (
        <RetryPanel
          message="More than one record has this code. Fix the duplicate in Baserow before scanning it again."
          buttonLabel="Scan again"
          textColor={colors.text}
          onRetry={resetToScanning}
        />
      )}

      {state.phase === "error" && (
        <RetryPanel
          message={state.message}
          buttonLabel="Try again"
          textColor="#d33"
          onRetry={resetToScanning}
        />
      )}
    </SafeAreaView>
  );
}

function RetryPanel({
  message,
  buttonLabel,
  textColor,
  onRetry,
}: {
  message: string;
  buttonLabel: string;
  textColor: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.centered}>
      <Text style={[styles.message, { color: textColor }]}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
        style={styles.button}
        onPress={onRetry}
      >
        <Text style={styles.buttonText}>{buttonLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "flex-end", padding: 8 },
  headerButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  headerButtonText: { fontSize: 14 },
  camera: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  message: { fontSize: 16, textAlign: "center" },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
});
