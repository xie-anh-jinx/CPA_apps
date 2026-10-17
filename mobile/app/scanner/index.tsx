/**
 * CPA Platform — Mobile Barcode & QR Scanner Screen
 */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useThemeStore } from "../../stores/useThemeStore";
import { colors } from "../../theme";
import { X, Flashlight, ArrowLeft } from "lucide-react-native";

export default function ScannerScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const theme = isDark ? colors.dark : colors.light;

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);

    Alert.alert(
      "Barcode Terdeteksi",
      `Kode: ${data}\nFormat: ${type}`,
      [
        {
          text: "Scan Lagi",
          onPress: () => setScanned(false),
          style: "cancel",
        },
        {
          text: "Cari di Stok",
          onPress: () => {
            router.push({
              pathname: "/(tabs)/inventory",
              params: { search: data },
            });
          },
        },
      ]
    );
  };

  if (!permission) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textSecondary }}>Memeriksa izin kamera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.permText, { color: theme.textPrimary }]}>
          Izin kamera belum diberikan.
        </Text>
        <TouchableOpacity onPress={requestPermission} style={styles.permButton}>
          <Text style={styles.permButtonText}>Berikan Izin Kamera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39", "upc_a"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Overlay Frame */}
      <View style={styles.overlay}>
        {/* Top Controls */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Scan Barcode Produk / DO</Text>
          <TouchableOpacity onPress={() => setTorch(!torch)} style={styles.iconBtn}>
            <Flashlight size={22} color={torch ? "#f59e0b" : "#fff"} />
          </TouchableOpacity>
        </View>

        {/* Center Scanner Window */}
        <View style={styles.centerTarget}>
          <View style={styles.targetBox}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.targetHint}>
            Arahkan kamera ke barcode SKU atau QR Surat Jalan
          </Text>
        </View>

        {/* Bottom Status */}
        <View style={styles.bottomBar}>
          {scanned && (
            <TouchableOpacity onPress={() => setScanned(false)} style={styles.rescanBtn}>
              <Text style={styles.rescanText}>Ketuk untuk Scan Ulang</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  permText: {
    fontSize: 15,
    marginBottom: 16,
    textAlign: "center",
  },
  permButton: {
    backgroundColor: "#0ea5e9",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  permButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  centerTarget: {
    alignItems: "center",
  },
  targetBox: {
    width: 250,
    height: 250,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "#0ea5e9",
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  targetHint: {
    color: "#fff",
    fontSize: 13,
    marginTop: 20,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  bottomBar: {
    paddingBottom: 40,
    alignItems: "center",
  },
  rescanBtn: {
    backgroundColor: "#0ea5e9",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  rescanText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
