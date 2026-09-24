import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '../context/AuthProvider';
import { localDateDaysAgo } from '../lib/dateUtils';
import {
  getBodyWeights,
  getDailyCalories,
  getWorkoutVolumes,
  upsertBodyWeight,
} from '../lib/progress';

// All progress charts cover the same window.
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

export function useDailyCalories() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ['dailyCalories', userId],
    queryFn: () => getDailyCalories(userId as string, localDateDaysAgo(RANGE_DAYS)),
    enabled: !!userId,
  });
}

export function useWorkoutVolumes() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ['workoutVolumes', userId],
    queryFn: () => getWorkoutVolumes(userId as string, localDateDaysAgo(RANGE_DAYS)),
    enabled: !!userId,
  });
}
