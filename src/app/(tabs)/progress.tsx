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

import { useBodyWeights, useDailyNutrition, useWorkoutVolumes } from '../../hooks/useProgress';
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
      queryClient.invalidateQueries({ queryKey: ['dailyNutrition'] });
      queryClient.invalidateQueries({ queryKey: ['workoutVolumes'] });
    }, [queryClient])
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <WeightCard chartWidth={chartWidth} />
      <NutritionAveragesCard />
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
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Nutrition averages (per day)</Text>
      <Text style={styles.cardSubtitle}>Over your last 7 / 30 / 90 logged days, excluding today</Text>

      {isLoading ? (
        <ActivityIndicator />
      ) : pastDays.length === 0 ? (
        <Text style={styles.empty}>No food logged before today yet.</Text>
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
  tableRow: { flexDirection: 'row', paddingVertical: 6 },
  tableLabel: { flex: 1.2, fontSize: 14, color: '#374151' },
  tableHeader: { flex: 1, fontSize: 13, color: '#6b7280', textAlign: 'right' },
  tableCell: { flex: 1, fontSize: 14, fontWeight: '600', textAlign: 'right' },
  tableFootnote: { flex: 1, fontSize: 11, color: '#9ca3af', textAlign: 'right' },
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
