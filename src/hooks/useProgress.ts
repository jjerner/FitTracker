import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '../context/AuthProvider';
import { localDateDaysAgo } from '../lib/dateUtils';
import {
  getBodyWeights,
  getDailyNutrition,
  getWorkoutDates,
  upsertBodyWeight,
} from '../lib/progress';

// Window for the weight chart.
const RANGE_DAYS = 30;

export function useBodyWeights() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['bodyWeights', userId],
    queryFn: () => getBodyWeights(userId as string, localDateDaysAgo(RANGE_DAYS)),
    enabled: !!userId,
  });

  const saveMutation = useMutation({
    mutationFn: (input: { date: string; weightKg: number }) =>
      upsertBodyWeight({ userId: userId as string, ...input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bodyWeights', userId] });
    },
  });

  return { ...query, saveWeight: saveMutation.mutate, isSaving: saveMutation.isPending };
}

export function useDailyNutrition() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ['dailyNutrition', userId],
    // Averages use the last 90 *logged* days, which can stretch further back
    // than 90 calendar days; a year is plenty.
    queryFn: () => getDailyNutrition(userId as string, localDateDaysAgo(365)),
    enabled: !!userId,
  });
}

export function useWorkoutDates() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ['workoutDates', userId],
    // The calendar and the counts go back at most a year.
    queryFn: () => getWorkoutDates(userId as string, localDateDaysAgo(365)),
    enabled: !!userId,
  });
}
