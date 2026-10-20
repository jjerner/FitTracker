import { useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { Card } from '../../components/Card';
import { Chips } from '../../components/Chips';
import { EmptyState } from '../../components/EmptyState';
import { MonthCalendar } from '../../components/MonthCalendar';
import { ExercisePicker } from '../../components/workouts/ExercisePicker';
import { useBodyProfile } from '../../hooks/useBodyProfile';
import { useNutritionGoals } from '../../hooks/useNutritionGoals';
import {
  useBodyWeights,
  useDailyNutrition,
  useMuscleSets,
  useTrackedExercises,
  useWorkoutDates,
} from '../../hooks/useProgress';
import { useExerciseHistory, useExercises } from '../../hooks/useWorkouts';
import { addDays, localDateDaysAgo, mondayOf, todayLocalDate } from '../../lib/dateUtils';
import { MIN_KCAL, PACES, targetKcal } from '../../lib/goalHelper';
import { estimateMaintenance, weeklyMuscleSets, weightTrend } from '../../lib/progress';
import { trackedStats } from '../../lib/records';
import { colors } from '../../theme';

// "2026-09-24" -> "24/9"
function shortDate(date: string): string {
  const [, month, day] = date.slice(0, 10).split('-');
  return `${Number(day)}/${Number(month)}`;
}

// Label only every nth point so 30 days of labels don't overlap.
function sparseLabel(index: number, count: number, date: string): string {
  const step = Math.max(1, Math.ceil(count / 5));
  return index % step === 0 ? shortDate(date) : '';
}

export default function Progress() {
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  // Screen padding + card padding + y-axis labels.
  const chartWidth = width - 110;

  // Food and workouts are logged on other tabs, so refresh when coming back here.
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['dailyNutrition'] });
      queryClient.invalidateQueries({ queryKey: ['workoutDates'] });
      queryClient.invalidateQueries({ queryKey: ['exerciseHistory'] });
      queryClient.invalidateQueries({ queryKey: ['muscleSets'] });
    }, [queryClient])
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <WeightCard chartWidth={chartWidth} />
      <MaintenanceCard />
      <NutritionAveragesCard />
      <WorkoutsCard />
      <MuscleSetsCard />
      <TrackedExercisesCard />
    </ScrollView>
  );
}

const RANGES = [
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '1 year' },
];

// Row of 30 days · 90 days · 1 year, shared by the weight and workouts cards.
function RangeTabs({ value, onChange }: { value: number; onChange: (days: number) => void }) {
  return (
    <View style={styles.rangeTabs}>
      {RANGES.map((r) => (
        <Pressable key={r.days} onPress={() => onChange(r.days)} hitSlop={8}>
          <Text style={[styles.rangeOptionText, r.days === value && styles.rangeOptionActive]}>
            {r.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function WeightCard({ chartWidth }: { chartWidth: number }) {
  const { data: weights, isLoading, saveWeight, isSaving } = useBodyWeights();
  const [input, setInput] = useState('');
  const [rangeDays, setRangeDays] = useState(30);

  const parsed = Number(input.replace(',', '.'));
  const isValid = input !== '' && parsed > 0;

  function handleSave() {
    if (!isValid) return;
    saveWeight({ date: todayLocalDate(), weightKg: parsed }, { onSuccess: () => setInput('') });
  }

  const all = weights ?? [];
  const latest = all[all.length - 1];
  // Trend is worked out on everything fetched, so the first days in range still average a full week.
  const trendAll = weightTrend(all);
  const rangeStart = localDateDaysAgo(rangeDays - 1);
  const firstInRange = all.findIndex((p) => p.date >= rangeStart);
  const points = firstInRange === -1 ? [] : all.slice(firstInRange);
  const trend = firstInRange === -1 ? [] : trendAll.slice(firstInRange);
  const values = [...points.map((p) => Number(p.weightKg)), ...trend];
  const minValue = Math.floor(Math.min(...values)) - 1;
  const maxValue = Math.ceil(Math.max(...values)) + 1;

  return (
    <Card>
      <Text style={styles.cardTitle}>Body weight</Text>
      {latest && (
        <Text style={styles.cardSubtitle}>
          Latest: {latest.weightKg} kg ({shortDate(latest.date)})
        </Text>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          placeholder="Today's weight (kg)"
          value={input}
          onChangeText={setInput}
        />
        <Pressable
          style={[styles.button, !isValid && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={!isValid || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.buttonText}>Log</Text>
          )}
        </Pressable>
      </View>

      <RangeTabs value={rangeDays} onChange={setRangeDays} />

      {isLoading ? (
        <ActivityIndicator />
      ) : points.length < 2 ? (
        <EmptyState message="Log your weight on at least 2 days to see a trend." />
      ) : (
        <>
          <LineChart
            data={points.map((p, i) => ({
              value: Number(p.weightKg),
              label: sparseLabel(i, points.length, p.date),
            }))}
            data2={trend.map((value) => ({ value }))}
            width={chartWidth}
            height={160}
            adjustToWidth
            yAxisOffset={minValue}
            maxValue={maxValue - minValue}
            noOfSections={4}
            color={colors.subtle}
            dataPointsColor={colors.subtle}
            hideDataPoints={points.length > 40}
            thickness={1}
            color2={colors.primary}
            hideDataPoints2
            thickness2={3}
            xAxisLabelTextStyle={styles.axisLabel}
            yAxisTextStyle={styles.axisLabel}
          />
          <Text style={styles.legend}>
            <Text style={styles.legendTrend}>━</Text> 7-day average{'   '}
            <Text style={styles.legendDaily}>━</Text> daily weigh-ins
          </Text>
        </>
      )}
    </Card>
  );
}

const KEEP_INDEX = PACES.findIndex((p) => p.kgPerWeek === 0);
// Macros are rounded to 5 g, so a saved goal lands a few kcal off the suggestion.
const GOAL_MATCH_KCAL = 50;

function MaintenanceCard() {
  const weights = useBodyWeights();
  const days = useDailyNutrition();
  const { data: goals, isLoading: goalsLoading } = useNutritionGoals();
  const { data: body, isLoading: bodyLoading } = useBodyProfile();
  const [paceIndex, setPaceIndex] = useState(KEEP_INDEX);

  const estimate = estimateMaintenance(weights.data ?? [], days.data ?? [], todayLocalDate());
  const pace = PACES[paceIndex];
  const sex = body?.sex ?? undefined;
  const target = estimate && targetKcal({ maintenanceKcal: estimate.kcal, kgPerWeek: pace.kgPerWeek, sex });
  const change = estimate ? Math.round(estimate.trendChangeKg * 10) / 10 : 0;
  const changeText = `${change > 0 ? '+' : change < 0 ? '−' : '±'}${Math.abs(change)} kg`;
  const goalMatches = !!goals && !!target && Math.abs(goals.caloriesKcal - target.kcal) <= GOAL_MATCH_KCAL;

  return (
    <Card>
      <Text style={styles.cardTitle}>Estimated maintenance</Text>
      {weights.isLoading || days.isLoading || goalsLoading || bodyLoading ? (
        <ActivityIndicator />
      ) : weights.isError || days.isError ? (
        <Text style={styles.empty}>Couldn&apos;t load your data. Try again later.</Text>
      ) : !estimate || !target ? (
        <EmptyState message="Needs 14 days of food logged and weigh-ins at least 14 days apart, within the last 4 weeks. Half-logged days don't count." />
      ) : (
        <>
          <View
            style={styles.countRow}
            accessible
            accessibilityLabel={`About ${estimate.kcal} kilocalories per day`}
          >
            <Text style={styles.countValue} selectable>
              ≈ {estimate.kcal}
            </Text>
            <Text style={styles.cardSubtitle}>kcal / day</Text>
          </View>
          <Text style={styles.cardSubtitle}>
            From {estimate.loggedDays} logged days and your weight trend ({changeText}) over{' '}
            {Math.round(estimate.daysBetween)} days.
          </Text>
          {estimate.skippedDays > 0 ? (
            <Text style={styles.cardSubtitle}>
              {estimate.skippedDays} {estimate.skippedDays === 1 ? 'day' : 'days'} skipped (looked incomplete)
            </Text>
          ) : null}
          {goals ? <Text style={styles.goalLine}>Your goal: {goals.caloriesKcal} kcal</Text> : null}

          <Text style={styles.goalLine}>Pace for your goal</Text>
          {/* The card's gap already spaces the next line. */}
          <Chips
            labels={PACES.map((p) => p.label)}
            selected={paceIndex}
            onSelect={setPaceIndex}
            style={{ marginBottom: 0 }}
          />
          {target.clamped ? (
            <Text style={styles.clampNote}>
              Raised to the {MIN_KCAL[sex ?? 'female']} kcal minimum. A slower pace is easier to keep.
            </Text>
          ) : null}
          {goalMatches ? (
            <Text style={styles.goalLine}>Your goal already matches this.</Text>
          ) : (
            <Pressable
              style={[styles.button, styles.applyButton]}
              accessibilityRole="button"
              onPress={() =>
                router.push(
                  {
                    pathname: '/(tabs)/profile/goals',
                    params: { maintenance: estimate.kcal, kgPerWeek: pace.kgPerWeek },
                  },
                  // Puts Profile under Goals so the stack has a back arrow.
                  { withAnchor: true }
                )
              }
            >
              <Text style={styles.buttonText}>Use {target.kcal} kcal as my goal</Text>
            </Pressable>
          )}
        </>
      )}
    </Card>
  );
}

const NUTRIENTS = [
  { key: 'caloriesKcal', label: 'Calories', unit: 'kcal' },
  { key: 'proteinG', label: 'Protein', unit: 'g' },
  { key: 'carbsG', label: 'Carbs', unit: 'g' },
  { key: 'fatG', label: 'Fat', unit: 'g' },
] as const;

const WINDOWS = [7, 30, 90];

function NutritionAveragesCard() {
  const { data: days, isLoading } = useDailyNutrition();

  // Averages over the last N *logged* days (today excluded, it's still being
  // logged). With fewer logged days than N, all of them are used.
  const today = todayLocalDate();
  const pastDays = (days ?? []).filter((d) => d.date < today);
  const windows = WINDOWS.map((n) => pastDays.slice(-n));

  return (
    <Card>
      <Text style={styles.cardTitle}>Nutrition averages (per day)</Text>
      <Text style={styles.cardSubtitle}>Over your last 7 / 30 / 90 logged days, excluding today</Text>

      {isLoading ? (
        <ActivityIndicator />
      ) : pastDays.length === 0 ? (
        <EmptyState message="No food logged before today yet." />
      ) : (
        <View>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel} />
            {WINDOWS.map((n) => (
              <Text key={n} style={styles.tableHeader}>
                {n} days
              </Text>
            ))}
          </View>
          {NUTRIENTS.map((nutrient) => (
            <View key={nutrient.key} style={styles.tableRow}>
              <Text style={styles.tableLabel}>{nutrient.label}</Text>
              {windows.map((w, i) => (
                <Text key={WINDOWS[i]} style={styles.tableCell}>
                  {Math.round(w.reduce((sum, d) => sum + d[nutrient.key], 0) / w.length)}{' '}
                  {nutrient.unit}
                </Text>
              ))}
            </View>
          ))}
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel} />
            {windows.map((w, i) => (
              <Text key={WINDOWS[i]} style={styles.tableFootnote}>
                {w.length} logged
              </Text>
            ))}
          </View>
        </View>
      )}
    </Card>
  );
}

// Workout data goes back a year, so the calendar does too.
const MAX_MONTHS_BACK = 12;

function WorkoutsCard() {
  const { data, isLoading } = useWorkoutDates();
  const [rangeDays, setRangeDays] = useState(30);

  const dates = data ?? [];
  const workoutDays = new Set(dates);

  // Last N days including today.
  const rangeStart = localDateDaysAgo(rangeDays - 1);
  const count = dates.filter((d) => d >= rangeStart).length;

  return (
    <Card>
      <Text style={styles.cardTitle}>Workouts</Text>

      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <>
          <RangeTabs value={rangeDays} onChange={setRangeDays} />
          <View style={styles.countRow}>
            <Text style={styles.countValue}>{count}</Text>
            <Text style={styles.cardSubtitle}>completed</Text>
          </View>

          <MonthCalendar dotDays={workoutDays} maxMonthsBack={MAX_MONTHS_BACK} />
        </>
      )}
    </Card>
  );
}

// Oldest week first; the last column is this week.
const WEEK_LABELS = ['3 wk ago', '2 wk', 'Last', 'This'];

function MuscleSetsCard() {
  const { data, isLoading } = useMuscleSets();
  const thisMonday = mondayOf(todayLocalDate());
  const weekStarts = [-21, -14, -7, 0].map((days) => addDays(thisMonday, days));
  const groups = weeklyMuscleSets(data ?? [], weekStarts);
  const thisWeek = WEEK_LABELS.length - 1;

  return (
    <Card>
      <Text style={styles.cardTitle}>Sets per muscle group</Text>

      {isLoading ? (
        <ActivityIndicator />
      ) : groups.length === 0 ? (
        <EmptyState message="No strength sets logged in the last 4 weeks." />
      ) : (
        <View>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel} />
            {WEEK_LABELS.map((label, i) => (
              <Text
                key={label}
                numberOfLines={1}
                style={[styles.tableHeader, i === thisWeek && styles.thisWeek]}
              >
                {label}
              </Text>
            ))}
          </View>
          {groups.map(({ group, counts }) => (
            <View key={group} style={styles.tableRow}>
              <Text style={styles.tableLabel}>{group[0].toUpperCase() + group.slice(1)}</Text>
              {counts.map((count, i) => (
                <Text
                  key={i}
                  style={[
                    styles.tableCell,
                    i === thisWeek && styles.thisWeek,
                    count === 0 && styles.zeroSets,
                  ]}
                >
                  {count}
                </Text>
              ))}
            </View>
          ))}
          <Text style={[styles.cardSubtitle, styles.muscleFootnote]}>
            Weeks start Monday. Finished workouts only.
          </Text>
        </View>
      )}
    </Card>
  );
}

function formatChange(change: number | null): string {
  if (change === null) return '–';
  if (change === 0) return '±0 kg';
  return `${change > 0 ? '▲' : '▼'} ${Math.abs(Math.round(change * 10) / 10)} kg`;
}

function TrackedExercisesCard() {
  const { data: ids, isLoading, add, remove } = useTrackedExercises();
  const { data: exercises } = useExercises();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <Card>
      <Text style={styles.cardTitle}>Tracked exercises</Text>
      <Text style={styles.cardSubtitle}>Heaviest weight you have logged</Text>

      {isLoading ? (
        <ActivityIndicator />
      ) : (ids ?? []).length === 0 ? (
        <EmptyState message="Add an exercise to follow your strength." />
      ) : (
        (ids ?? []).map((id) => (
          <TrackedRow
            key={id}
            exerciseId={id}
            name={exercises?.find((e) => e.id === id)?.name ?? '…'}
            onRemove={() => remove(id)}
          />
        ))
      )}

      <Pressable style={styles.button} onPress={() => setPickerOpen(true)}>
        <Text style={styles.buttonText}>+ Add exercise</Text>
      </Pressable>
      <ExercisePicker
        visible={pickerOpen}
        title="Track Exercise"
        onClose={() => setPickerOpen(false)}
        onSelect={(exercise) => add(exercise.id)}
      />
    </Card>
  );
}

function TrackedRow({
  exerciseId,
  name,
  onRemove,
}: {
  exerciseId: string;
  name: string;
  onRemove: () => void;
}) {
  const { data: sessions, isLoading } = useExerciseHistory(exerciseId);
  const stats = trackedStats(sessions ?? []);

  return (
    <Pressable
      style={styles.trackedRow}
      onPress={() => router.push(`/(tabs)/workouts/exercises/${exerciseId}`)}
    >
      <View style={styles.trackedMain}>
        <Text style={styles.trackedName}>{name}</Text>
        {isLoading ? (
          <ActivityIndicator />
        ) : !stats.current || !stats.pr ? (
          <Text style={styles.cardSubtitle}>Nothing logged yet</Text>
        ) : (
          <>
            <Text style={styles.trackedValue}>
              {stats.current.weightKg} kg × {stats.current.reps}
            </Text>
            <Text style={styles.cardSubtitle}>
              🏆 {stats.pr.weightKg} kg × {stats.pr.reps} ({shortDate(stats.pr.date)})
            </Text>
            <Text style={styles.cardSubtitle}>
              30d {formatChange(stats.change30)} · 90d {formatChange(stats.change90)}
            </Text>
          </>
        )}
      </View>
      <Pressable onPress={onRemove} hitSlop={12}>
        <Text style={styles.trackedRemove}>✕</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, gap: 16 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSubtitle: { fontSize: 13, color: colors.muted },
  empty: { fontSize: 14, color: colors.muted, paddingVertical: 16 },
  axisLabel: { fontSize: 10, color: colors.muted },
  tableRow: { flexDirection: 'row', paddingVertical: 6 },
  tableLabel: { flex: 1.2, fontSize: 14, color: colors.textSecondary },
  tableHeader: { flex: 1, fontSize: 13, color: colors.muted, textAlign: 'right' },
  tableCell: { flex: 1, fontSize: 14, fontWeight: '600', textAlign: 'right' },
  thisWeek: { color: colors.primary },
  // Dimmed so a skipped muscle group stands out.
  zeroSets: { color: colors.subtle },
  muscleFootnote: { marginTop: 8 },
  tableFootnote: { flex: 1, fontSize: 11, color: colors.subtle, textAlign: 'right' },
  countRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  countValue: { fontSize: 28, fontWeight: '700' },
  rangeOptionText: { fontSize: 14, color: colors.textSecondary },
  rangeOptionActive: { color: colors.primary, fontWeight: '600' },
  rangeTabs: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  legend: { fontSize: 12, color: colors.textSecondary, marginTop: 8 },
  legendTrend: { color: colors.primary },
  legendDaily: { color: colors.subtle },
  trackedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  trackedMain: { flex: 1, gap: 2 },
  trackedName: { fontSize: 15, fontWeight: '600' },
  trackedValue: { fontSize: 20, fontWeight: '700' },
  trackedRemove: { fontSize: 16, color: colors.subtle, paddingHorizontal: 4 },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  applyButton: { minHeight: 44, alignItems: 'center' },
  goalLine: { fontSize: 14, color: colors.textSecondary },
  clampNote: { fontSize: 13, color: colors.warningText },
  buttonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
});
