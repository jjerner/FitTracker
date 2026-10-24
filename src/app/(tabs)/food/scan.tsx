import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useSession } from '../../../context/AuthProvider';
import { getFoodByBarcode, upsertOffFood } from '../../../lib/foods';
import { getByBarcode } from '../../../lib/openFoodFacts';
import { AppText } from '../../../components/AppText';
import { Button } from '../../../components/Button';
import { colors } from '../../../theme';

export default function ScanBarcode() {
  const { meal, recipe } = useLocalSearchParams<{ meal?: string; recipe?: string }>();
  const { session } = useSession();
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleScanned(barcode: string) {
    if (isProcessing) return;
    setIsProcessing(true);
    setError(null);

    try {
      let saved = await getFoodByBarcode(session?.user.id as string, barcode);

      if (!saved) {
        const off = await getByBarcode(barcode);

        if (!off) {
          router.replace(
            `/(tabs)/food/custom-food/new?barcode=${encodeURIComponent(barcode)}${recipe ? '&recipe=1' : ''}`
          );
          return;
        }

        saved = await upsertOffFood(session?.user.id as string, off);
      }
      router.replace(
        `/(tabs)/food/food/${saved.id}${recipe ? '?recipe=1' : meal ? `?meal=${meal}` : ''}`
      );
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
        <AppText style={{ textAlign: 'center' }}>Camera access is needed to scan barcodes.</AppText>
        <Button title="Grant Access" onPress={requestPermission} style={{ alignSelf: 'stretch' }} />
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
          <AppText style={{ color: colors.onPrimary }}>Point the camera at a barcode</AppText>
        )}
        {error ? (
          <AppText variant="small" style={styles.error}>
            {error}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  camera: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  overlay: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
  },
  error: { color: colors.dangerLight, paddingHorizontal: 24, textAlign: 'center' },
});
