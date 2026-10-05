import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { todayLocalDate } from '../lib/dateUtils';
import { colors } from '../theme';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const pad = (n: number) => String(n).padStart(2, '0');

// Month grid, Monday-first, with ‹ › to change month. Future days are greyed
// out and can't be picked.
// - dotDays: show a green dot on these days and a grey dot on other past days.
// - selectedDate / onSelectDate: make days tappable and highlight the chosen one.
export function MonthCalendar({
  dotDays,
  selectedDate,
  onSelectDate,
  maxMonthsBack,
}: {
  dotDays?: Set<string>;
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
  maxMonthsBack?: number;
}) {
  const now = new Date();
  // 0 = current month, 1 = last month, ... Starts on the selected date's month.
  const [monthsBack, setMonthsBack] = useState(() => {
    if (!selectedDate) return 0;
    const [y, m] = selectedDate.split('-').map(Number);
    return (now.getFullYear() - y) * 12 + now.getMonth() - (m - 1);
  });

  const today = todayLocalDate();
  const canGoBack = maxMonthsBack === undefined || monthsBack < maxMonthsBack;

  const first = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const year = first.getFullYear();
  const month = first.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (first.getDay() + 6) % 7; // Monday-first week
  const cells: (number | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <View>
      <View style={styles.monthRow}>
        <Pressable onPress={() => setMonthsBack(monthsBack + 1)} disabled={!canGoBack} hitSlop={12}>
          <Text style={[styles.monthArrow, !canGoBack && styles.monthArrowDisabled]}>‹</Text>
        </Pressable>
        <Text style={styles.monthTitle}>
          {MONTH_NAMES[month]} {year}
        </Text>
        <Pressable onPress={() => setMonthsBack(monthsBack - 1)} disabled={monthsBack === 0} hitSlop={12}>
          <Text style={[styles.monthArrow, monthsBack === 0 && styles.monthArrowDisabled]}>›</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={[styles.cell, styles.weekday]}>
            {w}
          </Text>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <View key={`blank-${i}`} style={styles.cell} />;
          const date = `${year}-${pad(month + 1)}-${pad(day)}`;
          const isFuture = date > today;
          const isSelected = date === selectedDate;
          return (
            <Pressable
              key={date}
              style={styles.cell}
              onPress={() => onSelectDate?.(date)}
              disabled={!onSelectDate || isFuture}
            >
              <View style={[styles.dayCircle, isSelected && styles.daySelected]}>
                <Text
                  style={[
                    styles.dayNumber,
                    date === today && styles.dayToday,
                    isFuture && styles.dayFuture,
                    isSelected && styles.dayNumberSelected,
                  ]}
                >
                  {day}
                </Text>
              </View>
              {dotDays && !isFuture && (
                <View style={[styles.dot, dotDays.has(date) ? styles.dotDone : styles.dotMissed]} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  monthTitle: { fontSize: 15, fontWeight: '600' },
  monthArrow: { fontSize: 24, color: colors.primary, paddingHorizontal: 8 },
  monthArrowDisabled: { color: colors.disabled },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4, gap: 3 },
  weekday: { fontSize: 12, color: colors.subtle, textAlign: 'center' },
  dayCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: colors.primary },
  dayNumber: { fontSize: 13, color: colors.textSecondary },
  dayNumberSelected: { color: colors.onPrimary, fontWeight: '700' },
  dayToday: { color: colors.primary, fontWeight: '700' },
  dayFuture: { color: colors.disabled },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotDone: { backgroundColor: colors.success },
  dotMissed: { backgroundColor: colors.disabled },
});
