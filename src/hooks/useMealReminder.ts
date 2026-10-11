import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ensureReminderPermission, refreshFoodReminders } from '../lib/reminders';
import { getMealReminder, setMealReminder } from '../lib/settings';

// 20:30 reminder for missing main meals. Off by default; turning it on asks for permission.
export function useMealReminder() {
  const queryClient = useQueryClient();

  const query = useQuery({ queryKey: ['mealReminder'], queryFn: getMealReminder });

  const saveMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      // Not allowed by the phone -> stay off.
      const allowed = enabled ? await ensureReminderPermission() : true;
      await setMealReminder(enabled && allowed);
      await refreshFoodReminders();
      return allowed;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mealReminder'] }),
  });

  return {
    enabled: query.data ?? false,
    // Resolves to false if the user refused the permission.
    setEnabled: saveMutation.mutateAsync,
  };
}
