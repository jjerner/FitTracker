import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useSession } from '../../../context/AuthProvider';
import { searchMyFoods, upsertOffFood } from '../../../lib/foods';
import { searchByName, type OffFood } from '../../../lib/openFoodFacts';
import type { Food } from '../../../types/domain';

// My foods are already in the database; OFF results get saved when picked.
type Result = { kind: 'mine'; food: Food } | { kind: 'off'; food: OffFood };

export default function FoodSearch() {
  const { session } = useSession();
  const [query, setQuery] = useState('');
  const [myFoods, setMyFoods] = useState<Food[]>([]);
  const [offResults, setOffResults] = useState<OffFood[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectingKey, setSelectingKey] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2 || !session) return;

    // Debounced search: flip loading state immediately, fetch after the delay below.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSearching(true);
    setError(null);
    const timeout = setTimeout(() => {
      // Either source can fail on its own without hiding the other's results.
      Promise.allSettled([searchMyFoods(session.user.id, query.trim()), searchByName(query)])
        .then(([mine, off]) => {
          setMyFoods(mine.status === 'fulfilled' ? mine.value : []);
          setOffResults(off.status === 'fulfilled' ? off.value : []);
          if (mine.status === 'rejected' || off.status === 'rejected') {
            setError('Some results failed to load. Check your connection.');
          }
        })
        .finally(() => setIsSearching(false));
    }, 400);

    return () => clearTimeout(timeout);
  }, [query, session]);

  const hasQuery = query.trim().length >= 2;
  const myBarcodes = new Set(myFoods.map((f) => f.barcode).filter(Boolean));
  const sections = hasQuery
    ? [
        {
          title: 'My foods',
          data: myFoods.map((food): Result => ({ kind: 'mine', food })),
        },
        {
          title: 'All foods',
          data: offResults
            .filter((f) => !f.barcode || !myBarcodes.has(f.barcode))
            .map((food): Result => ({ kind: 'off', food })),
        },
      ].filter((section) => section.data.length > 0)
    : [];

  function resultKey(item: Result, index: number): string {
    return item.kind === 'mine' ? item.food.id : (item.food.barcode ?? `${item.food.name}-${index}`);
  }

  async function handleSelect(item: Result, key: string) {
    if (item.kind === 'mine') {
      router.push(`/(tabs)/food/food/${item.food.id}`);
      return;
    }
    setSelectingKey(key);
    try {
      const saved = await upsertOffFood(item.food);
      router.push(`/(tabs)/food/food/${saved.id}`);
    } catch {
      setError('Could not select this food. Try again.');
    } finally {
      setSelectingKey(null);
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

      <Pressable style={styles.scanButton} onPress={() => router.push('/(tabs)/food/scan')}>
        <Text style={styles.scanButtonText}>Scan Barcode</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {isSearching ? <ActivityIndicator style={styles.loader} /> : null}

      <SectionList
        sections={sections}
        keyExtractor={resultKey}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        renderItem={({ item, index }) => {
          const key = resultKey(item, index);
          return (
            <Pressable
              style={styles.resultRow}
              onPress={() => handleSelect(item, key)}
              disabled={selectingKey != null}
            >
              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{item.food.name}</Text>
                {item.food.brand ? (
                  <Text style={styles.resultBrand}>{item.food.brand}</Text>
                ) : null}
              </View>
              {selectingKey === key ? (
                <ActivityIndicator />
              ) : (
                <Text style={styles.resultCalories}>
                  {Math.round(item.food.caloriesKcal)} kcal/100g
                </Text>
              )}
            </Pressable>
          );
        }}
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
  scanButton: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  scanButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  loader: { marginBottom: 12 },
  error: { color: '#dc2626', marginBottom: 12 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 4,
  },
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
