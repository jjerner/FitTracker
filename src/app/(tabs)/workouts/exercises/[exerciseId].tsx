import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { AppText } from '../../../../components/AppText';
import { Card } from '../../../../components/Card';
import { Chips } from '../../../../components/Chips';
import { EmptyState } from '../../../../components/EmptyState';
import { useExerciseHistory, useExercises } from '../../../../hooks/useWorkouts';
import { bestOf, setLabels, workingSets } from '../../../../lib/records';
import { formatSet } from '../../../../lib/workouts';
import type { ExerciseSession } from '../../../../types/domain';
import { colors, radius, spacing } from '../../../../theme';

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
  // A warm-up-only workout has nothing to chart for strength.
  const charted = isCardio ? history : history.filter((s) => workingSets(s.sets).length > 0);
  const values = [...charted].reverse().map((s) => ({
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
          <Card style={styles.card}>
            {!isCardio && charted.length > 0 ? (
              <View style={styles.recordsRow}>
                <View style={styles.record}>
                  <AppText variant="label">🏆 {records.weightKg} kg</AppText>
                  <AppText variant="caption" style={styles.recordLabel}>
                    Heaviest weight
                  </AppText>
                </View>
                <View style={styles.record}>
                  <AppText variant="label">🏆 {Math.round(records.oneRM)} kg</AppText>
                  <AppText variant="caption" style={styles.recordLabel}>
                    Best est. 1RM
                  </AppText>
                </View>
              </View>
            ) : null}
            {!isCardio ? (
              <Chips
                labels={['Weight', 'Est. 1RM']}
                selected={metric === 'weight' ? 0 : 1}
                onSelect={(i) => setMetric(i === 0 ? 'weight' : 'oneRM')}
                style={styles.chips}
              />
            ) : null}
            <AppText variant="label">{chartLabel}</AppText>
            {best != null && (
              <AppText variant="small">
                Best: {best} {unit} · {charted.length} workout{charted.length === 1 ? '' : 's'}
              </AppText>
            )}
            {values.length < 2 ? (
              <EmptyState
                message={
                  values.length === 0
                    ? 'No completed workouts with this exercise yet.'
                    : 'Do this exercise in one more workout to see a trend.'
                }
              />
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
                // Not adjustToWidth: it puts the last point on the right edge and clips its date.
                spacing={(width - 150) / (values.length - 1)}
                noOfSections={4}
                color={colors.primary}
                dataPointsColor={colors.primary}
                thickness={2}
                xAxisLabelTextStyle={styles.axisLabel}
                yAxisTextStyle={styles.axisLabel}
              />
            )}
          </Card>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(tabs)/workouts/log/${item.logId}`)}>
            <Card style={styles.session}>
              <AppText variant="label" style={styles.sessionDate}>
                {formatDate(item.startedAt)}
              </AppText>
              {setLabels(item.sets.map((s) => s.setType)).map((label, i) => (
                <AppText key={item.sets[i].id} variant="small" style={styles.setText}>
                  {label === 'W' ? 'Warm-up' : `Set ${label}`}: {formatSet(item.sets[i])}
                </AppText>
              ))}
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  content: { padding: spacing.lg, gap: spacing.md },
  card: { marginBottom: spacing.xs },
  recordsRow: { flexDirection: 'row', gap: spacing.md },
  record: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md },
  recordLabel: { color: colors.textSecondary, marginTop: spacing.xs },
  chips: { marginBottom: 0 },
  axisLabel: { fontSize: 10, color: colors.muted },
  session: { gap: spacing.xs },
  sessionDate: { marginBottom: spacing.xs },
  setText: { color: colors.textSecondary },
});
