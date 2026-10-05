import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { upsertOffFood } from '../../../lib/foods';
import { getByBarcode } from '../../../lib/openFoodFacts';
import { colors } from '../../../theme';

export default function ScanBarcode() {
  const { meal } = useLocalSearchParams<{ meal?: string }>();
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
      router.replace(`/(tabs)/food/food/${saved.id}${meal ? `?meal=${meal}` : ''}`);
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
          <ActivityIndicator color={colors.onPrimary} size="large" />
        ) : (
          <Text style={styles.hint}>Point the camera at a barcode</Text>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  camera: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  permissionText: { textAlign: 'center', fontSize: 16 },
  permissionButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  permissionButtonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  overlay: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
  },
  hint: { color: colors.onPrimary, fontSize: 15 },
  error: { color: colors.dangerLight, fontSize: 14, paddingHorizontal: 24, textAlign: 'center' },
});
