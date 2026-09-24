import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
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
import { BarChart, LineChart } from 'react-native-gifted-charts';

import { useNutritionGoals } from '../../hooks/useNutritionGoals';
import { useBodyWeights, useDailyCalories, useWorkoutVolumes } from '../../hooks/useProgress';
import { todayLocalDate } from '../../lib/dateUtils';

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
      queryClient.invalidateQueries({ queryKey: ['dailyCalories'] });
      queryClient.invalidateQueries({ queryKey: ['workoutVolumes'] });
    }, [queryClient])
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <WeightCard chartWidth={chartWidth} />
      <CaloriesCard chartWidth={chartWidth} />
      <VolumeCard chartWidth={chartWidth} />
    </ScrollView>
  );
}

function WeightCard({ chartWidth }: { chartWidth: number }) {
  const { data: weights, isLoading, saveWeight, isSaving } = useBodyWeights();
  const [input, setInput] = useState('');

  const parsed = Number(input.replace(',', '.'));
  const isValid = input !== '' && parsed > 0;

  function handleSave() {
    if (!isValid) return;
    saveWeight({ date: todayLocalDate(), weightKg: parsed }, { onSuccess: () => setInput('') });
  }

  const points = weights ?? [];
  const latest = points[points.length - 1];
  const values = points.map((p) => Number(p.weightKg));
  const minValue = Math.floor(Math.min(...values)) - 1;
  const maxValue = Math.ceil(Math.max(...values)) + 1;

  return (
    <View style={styles.card}>
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
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Log</Text>
          )}
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator />
      ) : points.length < 2 ? (
        <Text style={styles.empty}>Log your weight on at least 2 days to see a trend.</Text>
      ) : (
        <LineChart
          data={points.map((p, i) => ({
            value: Number(p.weightKg),
            label: sparseLabel(i, points.length, p.date),
          }))}
          width={chartWidth}
          height={160}
          adjustToWidth
          yAxisOffset={minValue}
          maxValue={maxValue - minValue}
          noOfSections={4}
          color="#2563eb"
          dataPointsColor="#2563eb"
          thickness={2}
          xAxisLabelTextStyle={styles.axisLabel}
          yAxisTextStyle={styles.axisLabel}
        />
      )}
    </View>
  );
}

function CaloriesCard({ chartWidth }: { chartWidth: number }) {
  const { data: days, isLoading } = useDailyCalories();
  const { data: goals } = useNutritionGoals();

  const points = days ?? [];
  const goal = goals?.caloriesKcal;
  const maxValue =
    Math.ceil((Math.max(goal ?? 0, ...points.map((d) => d.caloriesKcal)) * 1.1) / 100) * 100;
  const barSpacing = 4;
  const barWidth = Math.max(4, chartWidth / Math.max(points.length, 1) - barSpacing);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Calories (last 30 days)</Text>
      {goal != null && <Text style={styles.cardSubtitle}>Dashed line = goal ({goal} kcal)</Text>}

      {isLoading ? (
        <ActivityIndicator />
      ) : points.length === 0 ? (
        <Text style={styles.empty}>No food logged in the last 30 days.</Text>
      ) : (
        <BarChart
          data={points.map((d, i) => ({
            value: Math.round(d.caloriesKcal),
            label: sparseLabel(i, points.length, d.date),
            frontColor: goal != null && d.caloriesKcal > goal ? '#f97316' : '#22c55e',
          }))}
          width={chartWidth}
          height={160}
          barWidth={barWidth}
          spacing={barSpacing}
          initialSpacing={barSpacing}
          maxValue={maxValue}
          noOfSections={4}
          showReferenceLine1={goal != null}
          referenceLine1Position={goal ?? 0}
          referenceLine1Config={{ color: '#6b7280', dashWidth: 4, dashGap: 4 }}
          xAxisLabelTextStyle={styles.axisLabel}
          yAxisTextStyle={styles.axisLabel}
        />
      )}
    </View>
  );
}

function VolumeCard({ chartWidth }: { chartWidth: number }) {
  const { data: workouts, isLoading } = useWorkoutVolumes();

  const points = workouts ?? [];
  const barSpacing = 8;
  const barWidth = Math.min(
    32,
    Math.max(6, chartWidth / Math.max(points.length, 1) - barSpacing)
  );

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Workout volume (kg × reps)</Text>
      <Text style={styles.cardSubtitle}>One bar per completed workout, last 30 days</Text>

      {isLoading ? (
        <ActivityIndicator />
      ) : points.length === 0 ? (
        <Text style={styles.empty}>No completed workouts in the last 30 days.</Text>
      ) : (
        <BarChart
          data={points.map((w, i) => ({
            value: Math.round(w.volumeKg),
            label: sparseLabel(i, points.length, w.startedAt),
          }))}
          width={chartWidth}
          height={160}
          barWidth={barWidth}
          spacing={barSpacing}
          initialSpacing={barSpacing}
          noOfSections={4}
          frontColor="#2563eb"
          xAxisLabelTextStyle={styles.axisLabel}
          yAxisTextStyle={styles.axisLabel}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 16, gap: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSubtitle: { fontSize: 13, color: '#6b7280' },
  empty: { fontSize: 14, color: '#6b7280', paddingVertical: 16 },
  axisLabel: { fontSize: 10, color: '#6b7280' },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
