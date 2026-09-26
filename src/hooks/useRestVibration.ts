import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getRestVibration, setRestVibration } from '../lib/settings';

// Whether the phone vibrates when the rest timer ends. Off by default.
export function useRestVibration() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['restVibration'],
    queryFn: getRestVibration,
  });

  const saveMutation = useMutation({
    mutationFn: setRestVibration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restVibration'] });
    },
  });

  return { enabled: query.data ?? false, setEnabled: saveMutation.mutate };
}
