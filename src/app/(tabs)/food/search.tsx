import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
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
import { getRecentFoods, searchBasicFoods, searchMyFoods, upsertOffFood } from '../../../lib/foods';
import { searchByName, type OffFood } from '../../../lib/openFoodFacts';
import type { Food, MealType } from '../../../types/domain';

// My/basic foods are already in the database; OFF results get saved when picked.
type Result = { kind: 'db'; food: Food } | { kind: 'off'; food: OffFood };

export default function FoodSearch() {
  const { session } = useSession();
  // Set when opened from a meal's "+" so the food page starts on that meal.
  const { meal } = useLocalSearchParams<{ meal?: MealType }>();
  const mealQuery = meal ? `?meal=${meal}` : '';
  const { data: recentFoods } = useQuery({
    queryKey: ['recentFoods', session?.user.id],
    queryFn: () => getRecentFoods(session?.user.id as string),
    enabled: !!session,
  });
  const [query, setQuery] = useState('');
  const [myFoods, setMyFoods] = useState<Food[]>([]);
  const [basicFoods, setBasicFoods] = useState<Food[]>([]);
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
      // Any source can fail on its own without hiding the others' results.
      Promise.allSettled([
        searchMyFoods(session.user.id, query.trim()),
        searchBasicFoods(query),
        searchByName(query),
      ])
        .then(([mine, basic, off]) => {
          setMyFoods(mine.status === 'fulfilled' ? mine.value : []);
          setBasicFoods(basic.status === 'fulfilled' ? basic.value : []);
          setOffResults(off.status === 'fulfilled' ? off.value : []);
          if ([mine, basic, off].some((r) => r.status === 'rejected')) {
            setError('Some results failed to load. Check your connection.');
          }
        })
        .finally(() => setIsSearching(false));
    }, 400);

    return () => clearTimeout(timeout);
  }, [query, session]);

  const hasQuery = query.trim().length >= 2;
  const myBarcodes = new Set(myFoods.map((f) => f.barcode).filter(Boolean));
  const myIds = new Set(myFoods.map((f) => f.id));
  const sections = hasQuery
    ? [
        {
          title: 'My foods',
          data: myFoods.map((food): Result => ({ kind: 'db', food })),
        },
        {
          title: 'Basic foods',
          data: basicFoods
            .filter((f) => !myIds.has(f.id))
            .map((food): Result => ({ kind: 'db', food })),
        },
        {
          title: 'Branded products',
          data: offResults
            .filter((f) => !f.barcode || !myBarcodes.has(f.barcode))
            .map((food): Result => ({ kind: 'off', food })),
        },
      ].filter((section) => section.data.length > 0)
    : [
        {
          title: 'Recent',
          data: (recentFoods ?? []).map((food): Result => ({ kind: 'db', food })),
        },
      ].filter((section) => section.data.length > 0);

  function resultKey(item: Result, index: number): string {
    return item.kind === 'db' ? item.food.id : (item.food.barcode ?? `${item.food.name}-${index}`);
  }

  async function handleSelect(item: Result, key: string) {
    if (item.kind === 'db') {
      router.push(`/(tabs)/food/food/${item.food.id}${mealQuery}`);
      return;
    }
    setSelectingKey(key);
    try {
      const saved = await upsertOffFood(item.food);
      router.push(`/(tabs)/food/food/${saved.id}${mealQuery}`);
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

      <Pressable
        style={styles.scanButton}
        onPress={() => router.push(`/(tabs)/food/scan${mealQuery}`)}
      >
        <Text style={styles.scanButtonText}>Scan Barcode</Text>
      </Pressable>

      <View style={styles.shortcutRow}>
        <Pressable
          style={styles.shortcut}
          onPress={() => router.push(`/(tabs)/food/saved-meals${mealQuery}`)}
        >
          <Text style={styles.shortcutText}>Saved meals</Text>
        </Pressable>
        <Pressable
          style={styles.shortcut}
          onPress={() => router.push(`/(tabs)/food/custom-food/new${mealQuery}`)}
        >
          <Text style={styles.shortcutText}>Custom food</Text>
        </Pressable>
      </View>

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
  shortcutRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  shortcut: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  shortcutText: { color: '#2563eb', fontSize: 15, fontWeight: '600' },
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
  resultCalories: { fontSize: 13, color: '#555' },});
