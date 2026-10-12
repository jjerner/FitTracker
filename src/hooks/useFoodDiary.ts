import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

import { useSession } from '../context/AuthProvider';
import { deleteFoodLogEntry, deleteFoodLogGroup, getDiaryForDate } from '../lib/foods';

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
    onError: () => Alert.alert('Could not delete', 'Check your connection and try again.'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foodDiary', userId, date] });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: deleteFoodLogGroup,
    onError: () => Alert.alert('Could not delete', 'Check your connection and try again.'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foodDiary', userId, date] });
    },
  });

  return {
    ...query,
    deleteEntry: deleteMutation.mutate,
    deleteGroup: deleteGroupMutation.mutate,
  };
}
