import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, spacing } from '../theme';

const RING_SIZE = 120;
const RING_STROKE = 12;

export function CalorieRing({ eaten, goal }: { eaten: number; goal: number | null }) {
  const r = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const share = goal ? Math.min(1, eaten / goal) : 0;
  const over = goal != null && eaten > goal;
  const left = goal != null ? Math.round(goal - eaten) : null;

  return (
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
        {left != null ? (
          <>
            <Text style={styles.ringNumber}>{Math.abs(left)}</Text>
            <Text style={styles.muted}>{over ? 'kcal over' : 'kcal left'}</Text>
          </>
        ) : (
          <>
            <Text style={styles.ringNumber}>{Math.round(eaten)}</Text>
            <Text style={styles.muted}>kcal</Text>
          </>
        )}
      </View>
    </View>
  );
}

export function MacroBar({
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
      <Text style={styles.macroText}>
        {label} <Text style={styles.muted}>{Math.round(value)}{goal ? `/${goal}` : ''}g</Text>
      </Text>
      {goal ? (
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${share * 100}%` }]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  muted: { fontSize: 13, color: colors.muted },
  ring: { width: RING_SIZE, height: RING_SIZE },
  ringCenter: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringNumber: { fontSize: 22, fontWeight: '700', color: colors.text },
  macroText: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: colors.primary },
});
