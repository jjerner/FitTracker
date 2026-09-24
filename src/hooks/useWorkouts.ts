import { useQuery } from '@tanstack/react-query';

import { useSession } from '../context/AuthProvider';
import {
  getExercises,
  getTemplate,
  getTemplates,
  getWorkoutHistory,
  getWorkoutLog,
} from '../lib/workouts';

export function useExercises() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ['exercises', userId],
    queryFn: getExercises,
    enabled: !!userId,
  });
}

export function useWorkoutTemplates() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ['workoutTemplates', userId],
    queryFn: () => getTemplates(userId as string),
    enabled: !!userId,
  });
}

export function useWorkoutTemplate(id: string | null) {
  return useQuery({
    queryKey: ['workoutTemplate', id],
    queryFn: () => getTemplate(id as string),
    enabled: !!id,
  });
}

export function useWorkoutHistory() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ['workoutHistory', userId],
    queryFn: () => getWorkoutHistory(userId as string),
    enabled: !!userId,
  });
}

export function useWorkoutLog(id: string | undefined) {
  return useQuery({
    queryKey: ['workoutLog', id],
    queryFn: () => getWorkoutLog(id as string),
    enabled: !!id,
  });
}
