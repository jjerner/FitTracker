import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { upsertOffFood } from '../../../lib/foods';
import { searchByName, type OffFood } from '../../../lib/openFoodFacts';

export default function FoodSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OffFood[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectingBarcode, setSelectingBarcode] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) return;

    // Debounced search: flip loading state immediately, fetch after the delay below.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSearching(true);
    setError(null);
    const timeout = setTimeout(() => {
      searchByName(query)
        .then(setResults)
        .catch(() => setError('Search failed. Check your connection.'))
        .finally(() => setIsSearching(false));
    }, 400);

    return () => clearTimeout(timeout);
  }, [query]);

  const visibleResults = query.trim().length < 2 ? [] : results;

  async function handleSelect(food: OffFood) {
    setSelectingBarcode(food.barcode);
    try {
      const saved = await upsertOffFood(food);
      router.push(`/(tabs)/food/food/${saved.id}`);
    } catch {
      setError('Could not select this food. Try again.');
    } finally {
      setSelectingBarcode(null);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search foods..."
        value={query}
        onChangeText={setQuery}
        autoFocus
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {isSearching ? <ActivityIndicator style={styles.loader} /> : null}

      <FlatList
        data={visibleResults}
        keyExtractor={(item, index) => item.barcode ?? `${item.name}-${index}`}
        renderItem={({ item }) => (
          <Pressable
            style={styles.resultRow}
            onPress={() => handleSelect(item)}
            disabled={selectingBarcode === item.barcode}
          >
            <View style={styles.resultInfo}>
              <Text style={styles.resultName}>{item.name}</Text>
              {item.brand ? <Text style={styles.resultBrand}>{item.brand}</Text> : null}
            </View>
            {selectingBarcode === item.barcode ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.resultCalories}>{Math.round(item.caloriesKcal)} kcal/100g</Text>
            )}
          </Pressable>
        )}
      />

      <Link href="/(tabs)/food/custom-food/new" style={styles.customLink}>
        <Text>Can&apos;t find it? Add a custom food</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  loader: { marginBottom: 12 },
  error: { color: '#dc2626', marginBottom: 12 },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultInfo: { flex: 1, marginRight: 8 },
  resultName: { fontSize: 15, fontWeight: '500' },
  resultBrand: { fontSize: 13, color: '#888' },
  resultCalories: { fontSize: 13, color: '#555' },
  customLink: { marginTop: 16, textAlign: 'center' },
});
