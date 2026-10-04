import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ensureReminderPermission, refreshFoodReminders } from '../lib/reminders';
import { DEFAULT_FOOD_REMINDER_MINUTES, getFoodReminder, setFoodReminder } from '../lib/settings';

// Daily reminder when no food is logged. Off by default; turning it on asks for permission.
export function useFoodReminder() {
  const queryClient = useQueryClient();

  const query = useQuery({ queryKey: ['foodReminder'], queryFn: getFoodReminder });
  const current = query.data ?? { enabled: false, minutes: DEFAULT_FOOD_REMINDER_MINUTES };

  const saveMutation = useMutation({
    mutationFn: async (next: { enabled: boolean; minutes: number }) => {
      // Not allowed by the phone -> stay off.
      const allowed = next.enabled ? await ensureReminderPermission() : true;
      await setFoodReminder({ ...next, enabled: next.enabled && allowed });
      await refreshFoodReminders();
      return allowed;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['foodReminder'] }),
  });

  return {
    enabled: current.enabled,
    minutes: current.minutes,
    // Resolves to false if the user refused the permission.
    setEnabled: (enabled: boolean) => saveMutation.mutateAsync({ ...current, enabled }),
    setMinutes: (minutes: number) => saveMutation.mutate({ ...current, minutes }),
  };
}
