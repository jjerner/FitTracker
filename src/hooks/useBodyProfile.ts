import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

import { useSession } from '../context/AuthProvider';
import { getBodyProfile, updateBodyProfile } from '../lib/profile';

export function useBodyProfile() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['bodyProfile', userId],
    queryFn: () => getBodyProfile(userId as string),
    enabled: !!userId,
  });

  const saveMutation = useMutation({
    mutationFn: (body: Parameters<typeof updateBodyProfile>[1]) => updateBodyProfile(userId as string, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bodyProfile', userId] });
    },
    // Here, not per call: hook-level callbacks still run after the caller unmounts.
    onError: () => Alert.alert('Could not remember your details', 'The suggestion is still filled in.'),
  });

  return { ...query, saveBody: saveMutation.mutate };
}
