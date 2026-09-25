import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '../context/AuthProvider';
import { getDisplayName, updateDisplayName } from '../lib/profile';

export function useDisplayName() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['displayName', userId],
    queryFn: () => getDisplayName(userId as string),
    enabled: !!userId,
  });

  const saveMutation = useMutation({
    mutationFn: (displayName: string | null) => updateDisplayName(userId as string, displayName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['displayName', userId] });
    },
  });

  return { ...query, saveName: saveMutation.mutate, isSaving: saveMutation.isPending };
}
