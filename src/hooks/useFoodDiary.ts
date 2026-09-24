import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '../context/AuthProvider';
import { deleteFoodLogEntry, getDiaryForDate } from '../lib/foods';

export function useFoodDiary(date: string) {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['foodDiary', userId, date],
    queryFn: () => getDiaryForDate(userId as string, date),
    enabled: !!userId,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFoodLogEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foodDiary', userId, date] });
    },
  });

  return { ...query, deleteEntry: deleteMutation.mutate };
}
