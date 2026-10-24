import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSetsHintOpen, setSetsHintOpen } from '../lib/settings';

// Whether the "how sets save" tip is open. `open` is undefined while it loads, so the tip doesn't flash.
export function useSetsHint() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['setsHintOpen'],
    queryFn: getSetsHintOpen,
  });

  const saveMutation = useMutation({
    mutationFn: setSetsHintOpen,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setsHintOpen'] });
    },
  });

  return { open: query.data, setOpen: saveMutation.mutate };
}
