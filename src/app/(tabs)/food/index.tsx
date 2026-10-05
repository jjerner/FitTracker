import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CalorieRing, MacroBar } from '../../../components/CalorieRing';
import { MonthCalendar } from '../../../components/MonthCalendar';
import { useSession } from '../../../context/AuthProvider';
import { useDiaryDate } from '../../../context/DiaryDateProvider';
import { useFoodDiary } from '../../../hooks/useFoodDiary';
import { useNutritionGoals } from '../../../hooks/useNutritionGoals';
import { localDateOf, todayLocalDate } from '../../../lib/dateUtils';
import { copyEntriesToDate, saveMealFromEntries } from '../../../lib/foods';
import type { FoodLogEntry, MealType, NutritionGoals } from '../../../types/domain';
import { colors } from '../../../theme';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "2026-09-23" -> "Wed 23 Sep"
function formatDay(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const weekday = new Date(year, month - 1, day).getDay();
  return `${WEEKDAYS[weekday]} ${day} ${MONTHS[month - 1]}`;
}

// ("2026-09-23", 1) -> "2026-09-24"
function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return localDateOf(new Date(year, month - 1, day + days));
}

export default function FoodDiary() {
  const today = todayLocalDate();
  const { date, setDate } = useDiaryDate();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const isToday = date === today;
  const dayLabel = isToday ? 'Today' : date === addDays(today, -1) ? 'Yesterday' : formatDay(date);
  const { data: entries, isLoading, deleteEntry } = useFoodDiary(date);
  const { data: goals } = useNutritionGoals();
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [isCopying, setIsCopying] = useState(false);
  const { data: previousEntries } = useFoodDiary(addDays(date, -1));

  async function copyMeal(mealType: MealType) {
    if (!session || isCopying) return;
    setIsCopying(true);
    try {
      await copyEntriesToDate(
        session.user.id,
        (previousEntries ?? []).filter((e) => e.mealType === mealType),
        date
      );
      await queryClient.invalidateQueries({ queryKey: ['foodDiary', session.user.id, date] });
    } catch {
      Alert.alert('Could not copy', 'Check your connection and try again.');
    } finally {
      setIsCopying(false);
    }
  }

  // Meal being saved as a reusable meal (asks for a name first).
  const [savingMeal, setSavingMeal] = useState<MealType | null>(null);
  const [mealName, setMealName] = useState('');
  const [isSavingMeal, setIsSavingMeal] = useState(false);

  async function handleSaveMeal() {
    const name = mealName.trim();
    if (!session || !savingMeal || !name || isSavingMeal) return;
    setIsSavingMeal(true);
    try {
      await saveMealFromEntries(
        session.user.id,
        name,
        (entries ?? []).filter((e) => e.mealType === savingMeal)
      );
      await queryClient.invalidateQueries({ queryKey: ['savedMeals', session.user.id] });
      setSavingMeal(null);
      setMealName('');
    } catch {
      Alert.alert('Could not save meal', 'Check your connection and try again.');
    } finally {
      setIsSavingMeal(false);
    }
  }

  const totals = useMemo(() => {
    return (entries ?? []).reduce(
      (acc, e) => ({
        calories: acc.calories + e.caloriesKcal,
        protein: acc.protein + e.proteinG,
        carbs: acc.carbs + e.carbsG,
        fat: acc.fat + e.fatG,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [entries]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.dayRow}>
        <Pressable onPress={() => setDate(addDays(date, -1))} hitSlop={12}>
          <Text style={styles.dayArrow}>‹</Text>
        </Pressable>
        <Pressable onPress={() => setCalendarOpen(true)} hitSlop={8}>
          <Text style={styles.dayLabel}>{dayLabel}</Text>
        </Pressable>
        <Pressable onPress={() => setDate(addDays(date, 1))} disabled={isToday} hitSlop={12}>
          <Text style={[styles.dayArrow, isToday && styles.dayArrowDisabled]}>›</Text>
        </Pressable>
      </View>

      <Modal
        visible={calendarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarOpen(false)}
      >
        {/* Tapping outside the calendar closes it. */}
        <Pressable style={styles.modalBackdrop} onPress={() => setCalendarOpen(false)}>
          <Pressable style={styles.modalCard}>
            <MonthCalendar
              selectedDate={date}
              onSelectDate={(d) => {
                setDate(d);
                setCalendarOpen(false);
              }}
            />
            <Pressable
              style={styles.modalTodayButton}
              onPress={() => {
                setDate(today);
                setCalendarOpen(false);
              }}
            >
              <Text style={styles.modalTodayText}>Go to today</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={savingMeal != null}
        transparent
        animationType="fade"
        onRequestClose={() => setSavingMeal(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSavingMeal(null)}>
          <Pressable style={styles.modalCard}>
            <Text style={styles.modalTitle}>Save as meal</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Name, e.g. Overnight oats"
              value={mealName}
              onChangeText={setMealName}
              autoFocus
            />
            <Pressable
              style={[styles.logButton, !mealName.trim() && styles.buttonDisabled]}
              onPress={handleSaveMeal}
              disabled={!mealName.trim() || isSavingMeal}
            >
              {isSavingMeal ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.logButtonText}>Save</Text>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {isLoading ? (
        <ActivityIndicator style={styles.loading} />
      ) : (
        <DiaryContent
          entries={entries ?? []}
          totals={totals}
          goals={goals}
          onDelete={deleteEntry}
          previousEntries={previousEntries ?? []}
          onCopyMeal={copyMeal}
          isCopying={isCopying}
          onSaveMeal={setSavingMeal}
        />
      )}
    </ScrollView>
  );
}

function DiaryContent({
  entries,
  totals,
  goals,
  onDelete,
  previousEntries,
  onCopyMeal,
  isCopying,
  onSaveMeal,
}: {
  entries: FoodLogEntry[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
  goals: NutritionGoals | null | undefined;
  onDelete: (id: string) => void;
  previousEntries: FoodLogEntry[];
  onCopyMeal: (mealType: MealType) => void;
  isCopying: boolean;
  onSaveMeal: (mealType: MealType) => void;
}) {
  return (
    <>
      <View style={styles.totalsCard}>
        <CalorieRing eaten={totals.calories} goal={goals?.caloriesKcal ?? null} />
        <View style={styles.macroList}>
          <MacroBar label="Protein" value={totals.protein} goal={goals?.proteinG} />
          <MacroBar label="Carbs" value={totals.carbs} goal={goals?.carbsG} />
          <MacroBar label="Fat" value={totals.fat} goal={goals?.fatG} />
        </View>
      </View>

      {MEAL_TYPES.map((mealType) => {
        const mealEntries = entries.filter((e) => e.mealType === mealType);
        const mealCalories = mealEntries.reduce((sum, e) => sum + e.caloriesKcal, 0);
        const canCopy =
          mealEntries.length === 0 && previousEntries.some((e) => e.mealType === mealType);
        return (
          <View key={mealType} style={styles.mealSection}>
            <View style={styles.mealHeader}>
              <Text style={styles.mealTitle}>{MEAL_LABELS[mealType]}</Text>
              <View style={styles.mealHeaderRight}>
                {mealEntries.length > 0 ? (
                  <>
                    {mealEntries.some((e) => e.foodId != null) && (
                      <Pressable onPress={() => onSaveMeal(mealType)} hitSlop={8}>
                        <Text style={styles.copyText}>Save as meal</Text>
                      </Pressable>
                    )}
                    <Text style={styles.mealCalories}>{Math.round(mealCalories)} kcal</Text>
                  </>
                ) : canCopy ? (
                  <Pressable onPress={() => onCopyMeal(mealType)} disabled={isCopying} hitSlop={8}>
                    <Text style={styles.copyText}>Copy from previous day</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={styles.addButton}
                  onPress={() =>
                    router.push({ pathname: '/(tabs)/food/search', params: { meal: mealType } })
                  }
                  hitSlop={8}
                >
                  <Text style={styles.addButtonText}>+</Text>
                </Pressable>
              </View>
            </View>
            {mealEntries.length === 0 ? (
              <Text style={styles.emptyText}>Nothing logged</Text>
            ) : (
              mealEntries.map((entry) => (
                <EntryRow key={entry.id} entry={entry} onDelete={() => onDelete(entry.id)} />
              ))
            )}
          </View>
        );
      })}
    </>
  );
}

function EntryRow({ entry, onDelete }: { entry: FoodLogEntry; onDelete: () => void }) {
  return (
    <View style={styles.entryRow}>
      <Pressable
        style={styles.entryTap}
        onPress={() =>
          entry.foodId == null
            ? router.push({
                pathname: '/(tabs)/food/quick-add',
                params: {
                  entryId: entry.id,
                  name: entry.foodName,
                  kcal: String(Math.round(entry.caloriesKcal * 10) / 10),
                  protein: String(Math.round(entry.proteinG * 10) / 10),
                  carbs: String(Math.round(entry.carbsG * 10) / 10),
                  fat: String(Math.round(entry.fatG * 10) / 10),
                  meal: entry.mealType,
                },
              })
            : router.push({
                pathname: '/(tabs)/food/food/[foodId]',
                params: {
                  foodId: entry.foodId,
                  entryId: entry.id,
                  quantity: String(entry.quantity),
                  unit: entry.quantityUnit,
                  servingG: entry.servingG != null ? String(entry.servingG) : undefined,
                  meal: entry.mealType,
                },
              })
        }
      >
        <Text style={styles.entryName}>{entry.foodName}</Text>
        <Text style={styles.entryCalories}>{Math.round(entry.caloriesKcal)} kcal</Text>
      </Pressable>
      <Pressable
        onPress={() =>
          Alert.alert('Delete entry?', entry.foodName, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: onDelete },
          ])
        }
        hitSlop={10}
      >
        <Text style={styles.entryDelete}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  dayLabel: { fontSize: 17, fontWeight: '600', minWidth: 110, textAlign: 'center' },
  dayArrow: { fontSize: 28, color: colors.primary, paddingHorizontal: 8 },
  dayArrowDisabled: { color: colors.disabled },
  loading: { paddingVertical: 40 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: { backgroundColor: colors.background, borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 17, fontWeight: '600', marginBottom: 12 },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  buttonDisabled: { opacity: 0.5 },
  modalTodayButton: { alignItems: 'center', paddingTop: 12 },
  modalTodayText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  content: { padding: 16, paddingBottom: 40 },
  totalsCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  macroList: { flex: 1, gap: 12 },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { color: colors.onPrimary, fontSize: 20, lineHeight: 22, fontWeight: '600' },
  mealSection: { marginBottom: 20 },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mealTitle: { fontSize: 16, fontWeight: '600' },
  mealCalories: { fontSize: 14, color: colors.textSecondary },
  copyText: { fontSize: 14, color: colors.primary },
  emptyText: { color: colors.subtle, fontSize: 14 },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  entryTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  entryName: { flex: 1, fontSize: 15 },
  entryCalories: { fontSize: 15, color: colors.textSecondary },
  entryDelete: { fontSize: 16, color: colors.subtle, paddingHorizontal: 4 },
  logButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  logButtonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
});
