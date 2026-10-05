import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { supabase } from './supabase';

// Sets that could not be saved (no signal) wait here, on the phone, until they can be sent.
// Each has its own id, so sending the same set twice never creates a duplicate.
export type PendingSet = {
  id: string;
  logId: string;
  logExerciseId: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  durationS: number | null;
  distanceM: number | null;
};

const STORAGE_KEY = 'pendingSets';

let pending: PendingSet[] = [];
let loaded: Promise<void> | null = null;
const listeners = new Set<() => void>();

function load(): Promise<void> {
  loaded ??= (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) pending = JSON.parse(raw) as PendingSet[];
    } catch {
      // Unreadable storage: start empty rather than block logging.
    }
    emit();
  })();
  return loaded;
}

function emit() {
  listeners.forEach((l) => l());
}

async function setPending(next: PendingSet[]) {
  pending = next;
  emit();
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Still held in memory; it will be tried again.
  }
}

// Random v4-style id, made on the phone so a retry can't create a second row.
function newId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function newSetId(): string {
  return newId();
}

export async function queueSet(set: PendingSet): Promise<void> {
  await load();
  await setPending([...pending.filter((p) => p.id !== set.id), set]);
}

export async function removePending(id: string): Promise<void> {
  await load();
  if (pending.some((p) => p.id === id)) await setPending(pending.filter((p) => p.id !== id));
}

// Forget pending sets that now show up in the saved workout.
async function pruneSaved(savedIds: Set<string>): Promise<void> {
  await load();
  if (pending.some((p) => savedIds.has(p.id))) {
    await setPending(pending.filter((p) => !savedIds.has(p.id)));
  }
}

let inFlight: Promise<{ sent: boolean; allSent: boolean }> | null = null;

// Tries to send every waiting set, oldest first. Stops at the first failure that looks like
// "no signal"; drops a set only if the database says it can never be saved (for example the
// workout was deleted). `sent`: at least one set went through. `allSent`: nothing is left waiting.
export function flushPendingSets(): Promise<{ sent: boolean; allSent: boolean }> {
  inFlight ??= doFlush().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function doFlush(): Promise<{ sent: boolean; allSent: boolean }> {
  await load();
  let sent = false;
  for (const set of [...pending]) {
    const { error } = await supabase.from('workout_log_sets').upsert(
      {
        id: set.id,
        log_exercise_id: set.logExerciseId,
        set_number: set.setNumber,
        weight_kg: set.weightKg,
        reps: set.reps,
        duration_s: set.durationS,
        distance_m: set.distanceM,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );
    if (error) {
      if (error.code?.startsWith('23')) {
        await removePending(set.id);
        continue;
      }
      return { sent, allSent: false };
    }
    sent = true;
  }
  return { sent, allSent: true };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Pending sets for one workout. Sent sets stay listed until the saved workout shows them.
export function usePendingSets(logId: string): PendingSet[] {
  useEffect(() => {
    load();
  }, []);
  const all = useSyncExternalStore(subscribe, () => pending);
  return all.filter((p) => p.logId === logId);
}

// While the workout screen is open: send waiting sets on open, when the app comes back to the
// front, and every 10 seconds while any are waiting. `savedSetIds` are the sets the saved
// workout already contains.
export function usePendingSync(
  logId: string,
  savedSetIds: Set<string>,
  onSent: () => void
) {
  const waiting = usePendingSets(logId).length;

  useEffect(() => {
    pruneSaved(savedSetIds);
  }, [savedSetIds]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const { sent } = await flushPendingSets();
      if (sent && !cancelled) onSent();
    }
    run();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    const interval = waiting > 0 ? setInterval(run, 10_000) : null;
    return () => {
      cancelled = true;
      subscription.remove();
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logId, waiting > 0]);
}
