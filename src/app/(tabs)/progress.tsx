import { useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { MonthCalendar } from '../../components/MonthCalendar';
import { TextLink } from '../../components/TextLink';
import { ExercisePicker } from '../../components/workouts/ExercisePicker';
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
import {
  smoothedMaintenance,
  weeklyMaintenance,
  weeklyMuscleSets,
  weeksAgoLabel,
  weightTrend,
} from '../../lib/progress';
import { trackedStats } from '../../lib/records';
import { colors, radius, spacing, typography } from '../../theme';

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
      <NutritionAveragesCard />
      <MaintenanceCard chartWidth={chartWidth} />
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
        <Pressable
          key={r.days}
          style={styles.rangeTab}
          onPress={() => onChange(r.days)}
          accessibilityRole="button"
          accessibilityState={{ selected: r.days === value }}
        >
          <AppText
            variant={r.days === value ? 'labelSmall' : 'small'}
            style={r.days === value ? styles.rangeOptionActive : styles.rangeOptionText}
          >
            {r.label}
          </AppText>
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
  const isValid = parsed >= 20 && parsed <= 400;

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
      <AppText variant="heading">Body weight</AppText>
      {latest && (
        <AppText variant="small">
          Latest: {latest.weightKg} kg ({shortDate(latest.date)})
        </AppText>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          placeholder="Today's weight (kg)"
          value={input}
          onChangeText={setInput}
        />
        <Button title="Log" onPress={handleSave} disabled={!isValid} loading={isSaving} />
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
            // Not adjustToWidth: it puts the last point on the right edge and clips its date. 40 = default initialSpacing + endSpacing.
            spacing={(chartWidth - 40) / (points.length - 1)}
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
          <AppText variant="caption" style={styles.legend}>
            <Text style={styles.legendTrend}>━</Text> 7-day average{'   '}
            <Text style={styles.legendDaily}>━</Text> daily weigh-ins
          </AppText>
        </>
      )}
    </Card>
  );
}

function MaintenanceCard({ chartWidth }: { chartWidth: number }) {
  const weights = useBodyWeights();
  const days = useDailyNutrition();
  const { data: goals, isLoading: goalsLoading } = useNutritionGoals();
  const [showHistory, setShowHistory] = useState(false);

  const today = todayLocalDate();
  // Runs estimateMaintenance 12 times, so a "Show history" tap shouldn't redo it.
  const weekly = useMemo(
    () => weeklyMaintenance(weights.data ?? [], days.data ?? [], today, 12),
    [weights.data, days.data, today]
  );
  const smoothed = smoothedMaintenance(weekly, today);
  const estimate = smoothed?.latest;
  const change = estimate ? Math.round(estimate.trendChangeKg * 10) / 10 : 0;
  const changeText = `${change > 0 ? '+' : change < 0 ? '−' : '±'}${Math.abs(change)} kg`;

  const kcals = weekly.map((w) => w.estimate.kcal);
  const minValue = Math.floor(Math.min(...kcals) / 100) * 100 - 100;
  const maxValue = Math.ceil(Math.max(...kcals) / 100) * 100 + 100;

  return (
    <Card>
      <AppText variant="heading">Estimated maintenance</AppText>
      {weights.isLoading || days.isLoading || goalsLoading ? (
        <ActivityIndicator />
      ) : weights.isError || days.isError ? (
        <AppText variant="small" style={styles.empty}>
          Couldn&apos;t load your data. Try again later.
        </AppText>
      ) : !smoothed || !estimate ? (
        <EmptyState message="Needs 14 days of food logged and weigh-ins at least 14 days apart, within the last 4 weeks. Half-logged days don't count." />
      ) : (
        <>
          <View
            style={styles.countRow}
            accessible
            accessibilityLabel={`About ${smoothed.kcal} kilocalories per day`}
          >
            <AppText variant="title" selectable>
              ≈ {smoothed.kcal}
            </AppText>
            <AppText variant="small">kcal / day</AppText>
          </View>
          <AppText variant="small">Smoothed over the last 3 weeks.</AppText>
          <AppText variant="small">
            From {estimate.loggedDays} logged days and your weight trend ({changeText}) over{' '}
            {Math.round(estimate.daysBetween)} days.
          </AppText>
          {estimate.skippedDays > 0 ? (
            <AppText variant="small">
              {estimate.skippedDays} {estimate.skippedDays === 1 ? 'day' : 'days'} skipped (looked incomplete)
            </AppText>
          ) : null}
          {goals ? <AppText variant="small" style={styles.goalLine}>Your goal: {goals.caloriesKcal} kcal</AppText> : null}
          <View style={styles.linkRow}>
            <TextLink
              title="Set goals ›"
              // Puts Profile under Goals so the stack has a back arrow.
              onPress={() => router.push('/(tabs)/profile/goals', { withAnchor: true })}
            />
            {/* A single point makes no chart, and the spacing divides by points − 1. */}
            {weekly.length >= 2 ? (
              <TextLink
                title={showHistory ? 'Hide history' : 'Show history'}
                onPress={() => setShowHistory(!showHistory)}
              />
            ) : null}
          </View>
          {showHistory && weekly.length >= 2 ? (
            <View style={styles.historyBox}>
              <View accessible accessibilityLabel={`Maintenance by week: ${kcals.join(', ')} kcal`}>
                <LineChart
                  data={kcals.map((value) => ({ value }))}
                  width={chartWidth}
                  height={160}
                  // Same as the weight chart: 40 = default initialSpacing + endSpacing.
                  spacing={(chartWidth - 40) / (weekly.length - 1)}
                  yAxisOffset={minValue}
                  maxValue={maxValue - minValue}
                  noOfSections={4}
                  color={colors.primary}
                  dataPointsColor={colors.primary}
                  thickness={3}
                  yAxisTextStyle={styles.axisLabel}
                />
                {/* Under the chart, not as x-axis labels, so they can't run into the y-axis numbers. */}
                <View style={styles.weekLabels}>
                  <AppText variant="caption">{weeksAgoLabel(weekly[0].date, today)}</AppText>
                  <AppText variant="caption">{weeksAgoLabel(weekly[weekly.length - 1].date, today)}</AppText>
                </View>
              </View>
              <AppText variant="caption">One point per week. Weeks without enough data are left out.</AppText>
            </View>
          ) : null}
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
      <AppText variant="heading">Nutrition averages (per day)</AppText>
      <AppText variant="small">Over your last 7 / 30 / 90 logged days, excluding today</AppText>

      {isLoading ? (
        <ActivityIndicator />
      ) : pastDays.length === 0 ? (
        <EmptyState message="No food logged before today yet." />
      ) : (
        <View>
          <View style={styles.tableRow}>
            <AppText variant="small" style={styles.tableLabel} />
            {WINDOWS.map((n) => (
              <AppText key={n} variant="small" style={styles.tableHeader}>
                {n} days
              </AppText>
            ))}
          </View>
          {NUTRIENTS.map((nutrient) => (
            <View key={nutrient.key} style={styles.tableRow}>
              <AppText variant="small" style={styles.tableLabel}>{nutrient.label}</AppText>
              {windows.map((w, i) => (
                <AppText key={WINDOWS[i]} variant="labelSmall" style={styles.tableCell}>
                  {Math.round(w.reduce((sum, d) => sum + d[nutrient.key], 0) / w.length)}{' '}
                  {nutrient.unit}
                </AppText>
              ))}
            </View>
          ))}
          <View style={styles.tableRow}>
            <AppText variant="small" style={styles.tableLabel} />
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
      <AppText variant="heading">Workouts</AppText>

      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <>
          <RangeTabs value={rangeDays} onChange={setRangeDays} />
          <View style={styles.countRow}>
            <AppText variant="title">{count}</AppText>
            <AppText variant="small">completed</AppText>
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
      <AppText variant="heading">Sets per muscle group</AppText>

      {isLoading ? (
        <ActivityIndicator />
      ) : groups.length === 0 ? (
        <EmptyState message="No strength sets logged in the last 4 weeks." />
      ) : (
        <View>
          <View style={styles.tableRow}>
            <AppText variant="small" style={styles.tableLabel} />
            {WEEK_LABELS.map((label, i) => (
              <AppText
                key={label}
                variant="small"
                style={[styles.tableHeader, i === thisWeek && styles.thisWeek]}
              >
                {label}
              </AppText>
            ))}
          </View>
          {groups.map(({ group, counts }) => (
            <View key={group} style={styles.tableRow}>
              <AppText variant="small" style={styles.tableLabel}>
                {group[0].toUpperCase() + group.slice(1)}
              </AppText>
              {counts.map((count, i) => (
                <AppText
                  key={i}
                  variant="labelSmall"
                  style={[
                    styles.tableCell,
                    i === thisWeek && styles.thisWeek,
                    count === 0 && styles.zeroSets,
                  ]}
                >
                  {count}
                </AppText>
              ))}
            </View>
          ))}
          <AppText variant="small" style={styles.muscleFootnote}>
            Weeks start Monday. Finished workouts only.
          </AppText>
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
      <AppText variant="heading">Tracked exercises</AppText>
      <AppText variant="small">Heaviest weight you have logged</AppText>

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

      <Button title="+ Add exercise" onPress={() => setPickerOpen(true)} />
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
        <AppText variant="label">{name}</AppText>
        {isLoading ? (
          <ActivityIndicator />
        ) : !stats.current || !stats.pr ? (
          <AppText variant="small">Nothing logged yet</AppText>
        ) : (
          <>
            <AppText variant="heading" accessibilityRole="text">
              {stats.current.weightKg} kg × {stats.current.reps}
            </AppText>
            <AppText variant="small">
              🏆 {stats.pr.weightKg} kg × {stats.pr.reps} ({shortDate(stats.pr.date)})
            </AppText>
            <AppText variant="small">
              30d {formatChange(stats.change30)} · 90d {formatChange(stats.change90)}
            </AppText>
          </>
        )}
      </View>
      <Pressable
        style={styles.removeButton}
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${name}`}
      >
        <AppText style={styles.trackedRemove}>✕</AppText>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, gap: spacing.lg },
  empty: { paddingVertical: spacing.lg },
  axisLabel: { fontSize: 10, color: colors.muted },
  tableRow: { flexDirection: 'row', paddingVertical: spacing.sm },
  tableLabel: { flex: 1.2, color: colors.textSecondary },
  tableHeader: { flex: 1, textAlign: 'right' },
  tableCell: { flex: 1, textAlign: 'right' },
  thisWeek: { color: colors.primary },
  // Dimmed so a skipped muscle group stands out.
  zeroSets: { color: colors.subtle },
  muscleFootnote: { marginTop: spacing.sm },
  tableFootnote: { flex: 1, fontSize: 11, color: colors.subtle, textAlign: 'right' },
  countRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  rangeOptionText: { color: colors.textSecondary },
  rangeOptionActive: { color: colors.primary },
  rangeTabs: { flexDirection: 'row', gap: spacing.xl },
  // A real 48 dp box: hitSlop can't reach past the card's edge.
  rangeTab: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' },
  legend: { color: colors.textSecondary, marginTop: spacing.sm },
  legendTrend: { color: colors.primary },
  legendDaily: { color: colors.subtle },
  trackedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  trackedMain: { flex: 1, gap: spacing.xs },
  trackedRemove: { color: colors.muted },
  // 48 dp tap box that grows left and down, so the ✕ stays top-right.
  removeButton: { minWidth: 48, minHeight: 48, alignItems: 'flex-end', justifyContent: 'flex-start' },
  inputRow: { flexDirection: 'row', gap: spacing.sm },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.body,
  },
  goalLine: { color: colors.textSecondary },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xl },
  historyBox: { borderTopWidth: 1, borderTopColor: colors.surface, paddingTop: spacing.md, gap: spacing.sm },
  weekLabels: { flexDirection: 'row', justifyContent: 'space-between' },
});
