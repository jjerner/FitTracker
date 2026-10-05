import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { useExerciseHistory, useExercises } from '../../../../hooks/useWorkouts';
import { bestOf } from '../../../../lib/records';
import { formatSet } from '../../../../lib/workouts';
import type { ExerciseSession } from '../../../../types/domain';
import { colors } from '../../../../theme';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// The number we chart per session: heaviest set for strength,
// total distance (or minutes if no distance) for cardio.
function sessionValue(
  session: ExerciseSession,
  isCardio: boolean,
  useDistance: boolean,
  metric: 'weight' | 'oneRM'
): number {
  if (!isCardio) {
    const best = bestOf(session.sets);
    return metric === 'oneRM' ? best.oneRM : best.weightKg;
  }
  if (useDistance) {
    return session.sets.reduce((sum, s) => sum + Number(s.distanceM ?? 0), 0) / 1000;
  }
  return session.sets.reduce((sum, s) => sum + Number(s.durationS ?? 0), 0) / 60;
}

export default function ExerciseDetail() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const { width } = useWindowDimensions();
  const { data: exercises } = useExercises();
  const { data: sessions, isLoading } = useExerciseHistory(exerciseId);
  const [metric, setMetric] = useState<'weight' | 'oneRM'>('weight');

  const exercise = exercises?.find((e) => e.id === exerciseId);
  const isCardio = exercise?.category === 'cardio';
  const history = sessions ?? [];
  const useDistance = history.some((s) => s.sets.some((set) => set.distanceM != null));
  const unit = !isCardio ? 'kg' : useDistance ? 'km' : 'min';
  const chartLabel = !isCardio
    ? metric === 'oneRM'
      ? 'Estimated 1RM per workout (kg)'
      : 'Heaviest set per workout (kg)'
    : useDistance
      ? 'Total distance per workout (km)'
      : 'Total time per workout (min)';

  // Chart runs oldest -> newest, the list newest -> oldest.
  const values = [...history].reverse().map((s) => ({
    value: Math.round(sessionValue(s, isCardio, useDistance, metric) * 10) / 10,
    date: s.startedAt,
  }));
  const records = bestOf(history.flatMap((s) => s.sets));
  const best = values.length > 0 ? Math.max(...values.map((v) => v.value)) : null;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: exercise?.name ?? 'Exercise' }} />
      <FlatList
        data={history}
        keyExtractor={(item, index) => `${item.logId}-${index}`}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.card}>
            {!isCardio && history.length > 0 ? (
              <View style={styles.recordsRow}>
                <View style={styles.record}>
                  <Text style={styles.recordValue}>🏆 {records.weightKg} kg</Text>
                  <Text style={styles.recordLabel}>Heaviest weight</Text>
                </View>
                <View style={styles.record}>
                  <Text style={styles.recordValue}>🏆 {Math.round(records.oneRM)} kg</Text>
                  <Text style={styles.recordLabel}>Best est. 1RM</Text>
                </View>
              </View>
            ) : null}
            {!isCardio ? (
              <View style={styles.toggleRow}>
                {(['weight', 'oneRM'] as const).map((m) => (
                  <Pressable
                    key={m}
                    style={[styles.toggle, metric === m && styles.toggleActive]}
                    onPress={() => setMetric(m)}
                  >
                    <Text style={metric === m ? styles.toggleTextActive : styles.toggleText}>
                      {m === 'weight' ? 'Weight' : 'Est. 1RM'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <Text style={styles.cardTitle}>{chartLabel}</Text>
            {best != null && (
              <Text style={styles.cardSubtitle}>
                Best: {best} {unit} · {history.length} workout{history.length === 1 ? '' : 's'}
              </Text>
            )}
            {values.length < 2 ? (
              <Text style={styles.empty}>
                {values.length === 0
                  ? 'No completed workouts with this exercise yet.'
                  : 'Do this exercise in one more workout to see a trend.'}
              </Text>
            ) : (
              <LineChart
                data={values.map((v, i) => ({
                  value: v.value,
                  label:
                    i % Math.max(1, Math.ceil(values.length / 5)) === 0
                      ? new Date(v.date).toLocaleDateString(undefined, {
                          month: 'numeric',
                          day: 'numeric',
                        })
                      : '',
                }))}
                width={width - 110}
                height={160}
                adjustToWidth
                noOfSections={4}
                color={colors.primary}
                dataPointsColor={colors.primary}
                thickness={2}
                xAxisLabelTextStyle={styles.axisLabel}
                yAxisTextStyle={styles.axisLabel}
              />
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.session}
            onPress={() => router.push(`/(tabs)/workouts/log/${item.logId}`)}
          >
            <Text style={styles.sessionDate}>{formatDate(item.startedAt)}</Text>
            {item.sets.map((set) => (
              <Text key={set.id} style={styles.setText}>
                Set {set.setNumber}: {formatSet(set)}
              </Text>
            ))}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: colors.background, borderRadius: 12, padding: 16, gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSubtitle: { fontSize: 13, color: colors.muted },
  recordsRow: { flexDirection: 'row', gap: 12 },
  record: { flex: 1, backgroundColor: colors.surface, borderRadius: 8, padding: 12 },
  recordValue: { fontSize: 16, fontWeight: '700' },
  recordLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggle: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  toggleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleText: { color: colors.textSecondary, fontSize: 13 },
  toggleTextActive: { color: colors.onPrimary, fontSize: 13 },
  empty: { fontSize: 14, color: colors.muted, paddingVertical: 16 },
  axisLabel: { fontSize: 10, color: colors.muted },
  session: { backgroundColor: colors.background, borderRadius: 12, padding: 16, gap: 4 },
  sessionDate: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  setText: { fontSize: 14, color: colors.textSecondary },
});
