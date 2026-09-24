# FitTrack — Handover

Workout + food (calorie/macro) tracker. Expo (React Native + TypeScript) app, Supabase backend.
Full plan: `C:\Users\jerne\.claude\plans\help-me-plan-what-mellow-sketch.md`

## Status

**Phase 1 (Foundation) — done.** Expo Router, Supabase email/password auth, tab shell.
**Phase 2 (Food logging) — done.** Manual search, barcode scanning, diary, custom foods, nutrition goals.
**Phase 3 (Workout logging) — done.** Exercise catalog (seeded + custom), template CRUD, active workout logging, session summary + history. Tested on-device by user.
**Phase 4 (Progress & polish) — not started.** Next up.

## Environment

- Node: managed via **nvm-windows** (`nvm use 22`). The standalone system Node install was removed — don't reinstall Node directly, always go through nvm.
- Each new terminal/tool session needs its PATH refreshed to see nvm's Node:
  ```powershell
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
  ```
- `.env` (gitignored, not committed) holds `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` — already set up, no action needed unless rotating keys.
- Run: `npx expo start` in the `FitTrack` folder, scan QR with Expo Go.
- Before considering any change done: `npx tsc --noEmit` and `npx expo lint` must both be clean (project convention, see `AGENTS.md`).
- `npx expo-doctor` after adding any native dependency.

## Database

Migrations live in `supabase/migrations/*.sql`, applied manually by pasting into the Supabase SQL Editor (no CLI link set up — I don't have DB credentials, only the anon key). Applied so far:
- `0001_profiles.sql`
- `0002_food.sql`
- `0003_fix_foods_barcode_unique.sql`
- `0004_workouts.sql` (exercises + 34 seeded rows, workout_templates/_exercises, workout_logs/_exercises/_sets)

For any new tables, write new numbered migration files and ask the user to run them the same way.

## Known gotchas hit this session

- Supabase's default "Site URL" is `localhost:3000`, so the email-verification link redirects to a dead localhost page after confirming. Cosmetic only — verification succeeds before the redirect. Planned fix: point it at a proper deep link in Phase 4 polish.
- A `.upsert(..., { onConflict: 'barcode' })` needs a **non-partial** unique constraint on that column — a partial index (`WHERE barcode IS NOT NULL`) doesn't work as an ON CONFLICT target. Fixed in `0003`. Keep this in mind for any future upsert-by-nullable-column tables.
- After any direct Supabase write that isn't done through a React Query mutation hook, remember to `queryClient.invalidateQueries(...)` the relevant key or the UI won't reflect it (hit this with the food diary).

## Architecture quick reference

- `src/app/` — Expo Router routes only (see plan doc for full intended tree)
- `src/lib/supabase.ts` — Supabase client
- `src/lib/foods.ts` — data access for foods/food_log_entries/nutrition_goals
- `src/lib/openFoodFacts.ts` — Open Food Facts API client
- `src/lib/workouts.ts` — data access for exercises/templates/workout logs (+ `formatSet` helper)
- `src/components/workouts/` — `ExerciseList` (search list) and `ExercisePicker` (modal wrapper)
- `src/hooks/` — React Query hooks per feature
- `src/context/AuthProvider.tsx` — session state
- No Redux/Zustand — React Query + Context only, per plan.

## Workout design notes

- An **in-progress workout** is a `workout_logs` row with `completed_at = null`. Sets are inserted as soon as they're added (not batched on finish), so a killed app loses nothing; the Workouts home shows a "Resume" button for it. Starting a new workout is hidden while one is in progress.
- Templates are saved by deleting and re-inserting all `workout_template_exercises` rows (simpler than diffing).
- Cardio sets store `duration_s` / `distance_m`; the UI shows minutes / km.
- Query keys: `['exercises', userId]`, `['workoutTemplates', userId]`, `['workoutTemplate', id]`, `['workoutHistory', userId]`, `['workoutLog', id]`.

## Next session should

1. Read the plan doc's Phase 4 section.
2. Pick a charting library — verify the current best option against SDK 57 docs (candidates in plan: `victory-native`, `react-native-gifted-charts`); install with `npx expo install`, run `npx expo-doctor`.
3. Build: Progress tab charts (body weight — needs a weight table/migration, macro trends, workout volume), exercise detail screen with per-exercise history (`src/app/(tabs)/workouts/exercises/[exerciseId].tsx`), template duplicate/reorder/archive.
4. Deferred polish items: Supabase Site URL deep link for email verification (see gotchas).
