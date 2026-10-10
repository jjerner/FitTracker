import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { DEFAULT_REST_SECONDS, getDefaultRest, setDefaultRest } from '../lib/settings';

// How long the rest timer runs after each set (seconds).
export function useDefaultRest() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['defaultRest'],
    queryFn: getDefaultRest,
  });

  const saveMutation = useMutation({
    mutationFn: setDefaultRest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defaultRest'] });
    },
  });

  return { seconds: query.data ?? DEFAULT_REST_SECONDS, setSeconds: saveMutation.mutate };
}
