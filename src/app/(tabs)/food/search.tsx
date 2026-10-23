import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { useSession } from '../../../context/AuthProvider';
import {
  getFavouriteFoods,
  getRecentFoods,
  searchBasicFoods,
  searchMyFoods,
  upsertOffFood,
} from '../../../lib/foods';
import { getByBarcode, searchByName, type OffFood } from '../../../lib/openFoodFacts';
import { AppText } from '../../../components/AppText';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import type { Food, MealType } from '../../../types/domain';
import { colors, spacing } from '../../../theme';

// My/basic foods are already in the database; OFF results get saved when picked.
type Result = { kind: 'db'; food: Food } | { kind: 'off'; food: OffFood };

export default function FoodSearch() {
  const { session } = useSession();
  // Set when opened from a meal's "+" so the food page starts on that meal.
  // `recipe` is set when adding an ingredient from the Recipe screen; it is passed on instead.
  const { meal, recipe } = useLocalSearchParams<{ meal?: MealType; recipe?: string }>();
  const mealQuery = recipe ? '?recipe=1' : meal ? `?meal=${meal}` : '';
  const { data: recentFoods } = useQuery({
    queryKey: ['recentFoods', session?.user.id],
    queryFn: () => getRecentFoods(session?.user.id as string),
    enabled: !!session,
  });
  const { data: favouriteFoods } = useQuery({
    queryKey: ['favouriteFoods', session?.user.id],
    queryFn: () => getFavouriteFoods(session?.user.id as string),
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
    const willSearch = query.trim().length >= 2 && !!session;
    // Debounced search: flip loading state immediately, fetch after the delay below.
    // Also turn it off when the box is cleared, since the cleanup cancels the pending fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSearching(willSearch);
    if (!willSearch) return;
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
  // Same rule as the database search: every word somewhere in the name.
  const words = hasQuery ? query.toLowerCase().split(/\s+/).filter(Boolean) : [];
  const favourites = (favouriteFoods ?? []).filter((f) =>
    words.every((w) => f.name.toLowerCase().includes(w))
  );
  const favouriteIds = new Set(favourites.map((f) => f.id));
  const shownMyFoods = myFoods.filter((f) => !favouriteIds.has(f.id));
  const myBarcodes = new Set([...favourites, ...myFoods].map((f) => f.barcode).filter(Boolean));
  const myIds = new Set([...favouriteIds, ...myFoods.map((f) => f.id)]);
  const favouritesSection = {
    title: 'Favourites',
    data: favourites.map((food): Result => ({ kind: 'db', food })),
  };
  const sections = hasQuery
    ? [
        favouritesSection,
        {
          title: 'My foods',
          data: shownMyFoods.map((food): Result => ({ kind: 'db', food })),
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
        favouritesSection,
        {
          title: 'Recent',
          data: (recentFoods ?? [])
            .filter((f) => !favouriteIds.has(f.id))
            .map((food): Result => ({ kind: 'db', food })),
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
      // Search hits have no serving size; the first save sticks for everyone, so save the full product.
      const full = item.food.barcode ? await getByBarcode(item.food.barcode) : null;
      const saved = await upsertOffFood(full ?? item.food);
      router.push(`/(tabs)/food/food/${saved.id}${mealQuery}`);
    } catch {
      setError('Could not select this food. Try again.');
    } finally {
      setSelectingKey(null);
    }
  }

  return (
    <View style={styles.container}>
      {recipe ? <Stack.Screen options={{ title: 'Add Ingredient' }} /> : null}
      <TextInput
        style={styles.input}
        placeholder="Search foods..."
        value={query}
        onChangeText={setQuery}
        autoFocus
      />

      <Button
        title="Scan Barcode"
        onPress={() => router.push(`/(tabs)/food/scan${mealQuery}`)}
        style={{ marginBottom: spacing.md }}
      />

      <View style={styles.shortcutRow}>
        {recipe ? null : (
          <Button
            title="Saved meals"
            variant="secondary"
            onPress={() => router.push(`/(tabs)/food/saved-meals${mealQuery}`)}
            style={{ flex: 1 }}
          />
        )}
        <Button
          title="Custom food"
          variant="secondary"
          onPress={() => router.push(`/(tabs)/food/custom-food/new${mealQuery}`)}
          style={{ flex: 1 }}
        />
      </View>

      {error ? (
        <Card style={{ marginBottom: spacing.md }}>
          <AppText style={{ color: colors.danger }}>{error}</AppText>
        </Card>
      ) : null}
      {isSearching ? <ActivityIndicator style={styles.loader} /> : null}

      {sections.length > 0 ? (
        <Card style={{ flexShrink: 1 }}>
          <SectionList
            sections={sections}
            keyExtractor={resultKey}
            keyboardShouldPersistTaps="handled"
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) => (
              <AppText variant="small" style={styles.sectionTitle}>
                {section.title}
              </AppText>
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
                    <AppText variant="label">{item.food.name}</AppText>
                    {item.food.brand ? <AppText variant="small">{item.food.brand}</AppText> : null}
                  </View>
                  {selectingKey === key ? (
                    <ActivityIndicator />
                  ) : (
                    <AppText variant="small">
                      {Math.round(item.food.caloriesKcal)} kcal/100g
                    </AppText>
                  )}
                </Pressable>
              );
            }}
          />
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  shortcutRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  loader: { marginBottom: 12 },
  sectionTitle: {
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
    borderBottomColor: colors.border,
  },
  resultInfo: { flex: 1, marginRight: 8 },
});
