import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { lookupByBarcode } from "../src/baserow/client";
import { readConnectionState } from "../src/connection/storage";
import type { Connection, FieldConfiguration } from "../src/types";

type ScanState =
  | { phase: "loadingConfig" }
  | { phase: "scanning" }
  | { phase: "lookingUp" }
  | { phase: "none" }
  | { phase: "duplicate" }
  | { phase: "error"; message: string };

export default function ScanScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? darkColors : lightColors;
  const [permission, requestPermission] = useCameraPermissions();
  const [config, setConfig] = useState<
    { connection: Connection; fieldConfiguration: FieldConfiguration } | null
  >(null);
  const [state, setState] = useState<ScanState>({ phase: "loadingConfig" });

  useEffect(() => {
    (async () => {
      const stored = await readConnectionState();
      if (!stored) {
        router.replace("/");
        return;
      }
      setConfig(stored);
      setState({ phase: "scanning" });
    })();
  }, [router]);

  const handleScanned = useCallback(
    async (scannedValue: string) => {
      if (!config || state.phase !== "scanning") {
        return;
      }
      setState({ phase: "lookingUp" });
      try {
        const outcome = await lookupByBarcode(config.connection, config.fieldConfiguration, scannedValue);
        if (outcome.kind === "found") {
          router.push({
            pathname: "/record",
            params: { record: JSON.stringify(outcome.record) },
          });
          setState({ phase: "scanning" });
        } else if (outcome.kind === "none") {
          setState({ phase: "none" });
        } else {
          setState({ phase: "duplicate" });
        }
      } catch (error) {
        setState({ phase: "error", message: (error as Error).message });
      }
    },
    [config, state.phase, router]
  );

  const resetToScanning = useCallback(() => setState({ phase: "scanning" }), []);

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
        <View style={styles.centered}>
          <Text style={[styles.message, { color: colors.text }]}>
            Fieldrow needs camera access to scan barcodes.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Grant camera access"
            style={styles.button}
            onPress={requestPermission}
          >
            <Text style={styles.buttonText}>Grant camera access</Text>
          </Pressable>
        </View>
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
        <View style={styles.centered}>
          <Text style={[styles.message, { color: colors.text }]}>
            No record matches that code.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan again"
            style={styles.button}
            onPress={resetToScanning}
          >
            <Text style={styles.buttonText}>Scan again</Text>
          </Pressable>
        </View>
      )}

      {state.phase === "duplicate" && (
        <View style={styles.centered}>
          <Text style={[styles.message, { color: colors.text }]}>
            More than one record has this code. Fix the duplicate in Baserow before scanning it
            again.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan again"
            style={styles.button}
            onPress={resetToScanning}
          >
            <Text style={styles.buttonText}>Scan again</Text>
          </Pressable>
        </View>
      )}

      {state.phase === "error" && (
        <View style={styles.centered}>
          <Text style={styles.error}>{state.message}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try again"
            style={styles.button}
            onPress={resetToScanning}
          >
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const lightColors = { background: "#ffffff", text: "#111111" };
const darkColors = { background: "#111111", text: "#ffffff" };

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "flex-end", padding: 8 },
  headerButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  headerButtonText: { fontSize: 14 },
  camera: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  message: { fontSize: 16, textAlign: "center" },
  error: { fontSize: 16, textAlign: "center", color: "#d33" },
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
