import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import type { NutritionGoals } from '../types/domain';
import { colors, spacing } from '../theme';

const RING_SIZE = 110;
const RING_STROKE = 10;

function CalorieRing({ eaten, goal }: { eaten: number; goal: number | null }) {
  const r = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const share = goal ? Math.min(1, eaten / goal) : 0;
  const over = goal != null && eaten > goal;
  const left = goal != null ? Math.round(goal - eaten) : null;

  const eatenKcal = Math.round(eaten);
  const a11yLabel =
    left == null
      ? `${eatenKcal} calories eaten`
      : `${eatenKcal} of ${goal} calories eaten, ${Math.abs(left)} ${over ? 'over' : 'left'}`;

  return (
    <View style={styles.ringBlock} accessible accessibilityLabel={a11yLabel}>
      <View style={styles.ring}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={r}
            stroke={colors.border}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={r}
            stroke={over ? colors.danger : colors.success}
            strokeWidth={RING_STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - share)}
            // Start at 12 o'clock instead of 3.
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={styles.ringNumber}>{eatenKcal}</Text>
          <Text style={styles.ringSub}>{goal != null ? `of ${goal} kcal` : 'kcal'}</Text>
        </View>
      </View>
      {left != null ? (
        <Text style={[styles.leftLine, over && styles.overLine]}>
          {Math.abs(left)} {over ? 'kcal over' : 'kcal left'}
        </Text>
      ) : null}
    </View>
  );
}

function MacroBar({
  label,
  value,
  goal,
}: {
  label: string;
  value: number;
  goal?: number;
}) {
  const share = goal ? Math.min(1, value / goal) : 0;
  return (
    <View>
      <Text style={styles.macroText}>{label}</Text>
      <Text style={[styles.muted, styles.macroValue]}>
        {Math.round(value)}
        {goal ? `/${goal}` : ''} g
      </Text>
      {goal ? (
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${share * 100}%` }]} />
        </View>
      ) : null}
    </View>
  );
}

export function NutritionSummary({
  totals,
  goals,
}: {
  totals: { calories: number; protein: number; carbs: number; fat: number };
  goals: NutritionGoals | null | undefined;
}) {
  return (
    <View style={styles.summary}>
      <CalorieRing eaten={totals.calories} goal={goals?.caloriesKcal ?? null} />
      <View style={styles.macroList}>
        <MacroBar label="Carbs" value={totals.carbs} goal={goals?.carbsG} />
        <MacroBar label="Protein" value={totals.protein} goal={goals?.proteinG} />
        <MacroBar label="Fat" value={totals.fat} goal={goals?.fatG} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  muted: { fontSize: 13, color: colors.muted },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  macroList: { flex: 1, gap: spacing.sm },
  ringBlock: { alignItems: 'center', gap: spacing.sm },
  ring: { width: RING_SIZE, height: RING_SIZE },
  ringCenter: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    // Keep the text inside the hole so big font sizes wrap instead of running over the stroke.
    paddingHorizontal: RING_STROKE,
  },
  ringNumber: { fontSize: 28, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'], textAlign: 'center' },
  ringSub: { fontSize: 13, color: colors.muted, textAlign: 'center' },
  leftLine: { fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'center' },
  overLine: { color: colors.danger },
  macroText: { fontSize: 14, fontWeight: '600', color: colors.text },
  macroValue: { marginBottom: spacing.xs, fontVariant: ['tabular-nums'] },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: colors.primary },
});
