import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '../context/AuthProvider';
import { getNutritionGoals, upsertNutritionGoals } from '../lib/foods';
import type { NutritionGoals } from '../types/domain';

export function useNutritionGoals() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['nutritionGoals', userId],
    queryFn: () => getNutritionGoals(userId as string),
    enabled: !!userId,
  });

  const saveMutation = useMutation({
    mutationFn: (goals: NutritionGoals) => upsertNutritionGoals(userId as string, goals),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutritionGoals', userId] });
    },
  });

  return { ...query, saveGoals: saveMutation.mutate };
}
