import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { upsertOffFood } from '../../../lib/foods';
import { getByBarcode } from '../../../lib/openFoodFacts';

export default function ScanBarcode() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleScanned(barcode: string) {
    if (isProcessing) return;
    setIsProcessing(true);
    setError(null);

    try {
      const off = await getByBarcode(barcode);

      if (!off) {
        router.replace(`/(tabs)/food/custom-food/new?barcode=${encodeURIComponent(barcode)}`);
        return;
      }

      const saved = await upsertOffFood(off);
      router.replace(`/(tabs)/food/food/${saved.id}`);
    } catch {
      setError('Lookup failed. Point the camera at the barcode again.');
      setIsProcessing(false);
    }
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>Camera access is needed to scan barcodes.</Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Access</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'],
        }}
        onBarcodeScanned={({ data }) => handleScanned(data)}
      />
      <View style={styles.overlay}>
        {isProcessing ? (
          <ActivityIndicator color="#fff" size="large" />
        ) : (
          <Text style={styles.hint}>Point the camera at a barcode</Text>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  permissionText: { textAlign: 'center', fontSize: 16 },
  permissionButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  permissionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  overlay: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
  },
  hint: { color: '#fff', fontSize: 15 },
  error: { color: '#f87171', fontSize: 14, paddingHorizontal: 24, textAlign: 'center' },
});
