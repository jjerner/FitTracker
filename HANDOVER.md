# FitTrack — Handover

Workout + food (calorie/macro) tracker. Expo (React Native + TypeScript) app, Supabase backend.
Full plan: `C:\Users\jerne\.claude\plans\help-me-plan-what-mellow-sketch.md`

## Status

**Phase 1 (Foundation) — done.** Expo Router, Supabase email/password auth, tab shell.
**Phase 2 (Food logging) — done.** Manual search, barcode scanning, diary, custom foods, nutrition goals.
**Phase 3 (Workout logging) — done.** Exercise catalog (seeded + custom), template CRUD, active workout logging, session summary + history. Tested on-device by user.
**Phase 4 (Progress & polish) — in progress.** Done: Progress tab (body weight log + chart for last 30 days, nutrition averages table, Workouts card — see below) and exercise detail screen (`workouts/exercises/[exerciseId].tsx`: strength/cardio trend chart + per-workout set history, tap an exercise in the catalog). Charts use `react-native-gifted-charts` (+ `react-native-svg`, `expo-linear-gradient`, all Expo Go-compatible). Template tools: reorder exercises (↑/↓), duplicate (copies unsaved form state), archive/unarchive (hidden behind "Show archived"). All tested on-device by user.

### Progress tab details

- **Nutrition averages** (`NutritionAveragesCard`): kcal/protein/carbs/fat averaged over the last 7 / 30 / 90 *logged* days (empty days skipped, today excluded). Confirmed by user.
- **Nutrition goals**: calorie goal is calculated as protein×4 + carbs×4 + fat×9 (`profile/goals.tsx`); Food tab totals show macro goals. Confirmed by user.
- **Workouts card** (`WorkoutsCard`, replaced the workout volume chart at user's request): count of completed workouts with a dropdown (last 30 days / 90 days / year, including today) + month calendar (Monday-first, ‹ › up to 12 months back) with a green dot on days with a workout, grey on days without, no dot on future days. Tested on-device by user.
- **Past-days food diary**: instead of a separate `food/day/[date].tsx` route, the Food tab's stack header shows a centered `‹ Today ›` (set via `<Stack.Screen options={{ headerTitle }}>` in `food/index.tsx`); tapping the date opens a modal `MonthCalendar` to jump to any past day. View, delete (✕ per entry + confirm dialog; replaced the old hidden long-press) and "+ Log Food" work on any day: the selected day lives in `DiaryDateProvider` (`src/context/`, wraps the food stack in `food/_layout.tsx`) and `food/[foodId].tsx` logs to it. `src/components/MonthCalendar.tsx` is shared with the Progress Workouts card. Tested on-device by user.
- UX note: user found the Profile → "Nutrition Goals" button hard to see.

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
- `0005_body_weights.sql` (body_weights, one row per user per day)
- `0006_archive_templates.sql` (workout_templates.archived_at)

For any new tables, write new numbered migration files and ask the user to run them the same way.

## Known gotchas hit this session

- Supabase's default "Site URL" is `localhost:3000`, so the email-verification link redirects to a dead localhost page after confirming. Cosmetic only — verification succeeds before the redirect. Planned fix: point it at a proper deep link in Phase 4 polish.
- A `.upsert(..., { onConflict: 'barcode' })` needs a **non-partial** unique constraint on that column — a partial index (`WHERE barcode IS NOT NULL`) doesn't work as an ON CONFLICT target. Fixed in `0003`. Keep this in mind for any future upsert-by-nullable-column tables.
- `npm install` currently fails with ERESOLVE: the lockfile has optional `react-dom@19.3.0` (web-only) vs `react@19.2.3`. Workaround: `npx expo install <pkg> -- --legacy-peer-deps`.
- New files sometimes aren't picked up by a normal reload in Expo Go — if the user doesn't see a change, have them restart with `npx expo start -c`.
- After any direct Supabase write that isn't done through a React Query mutation hook, remember to `queryClient.invalidateQueries(...)` the relevant key or the UI won't reflect it (hit this with the food diary).

## Architecture quick reference

- `src/app/` — Expo Router routes only (see plan doc for full intended tree)
- `src/lib/supabase.ts` — Supabase client
- `src/lib/foods.ts` — data access for foods/food_log_entries/nutrition_goals
- `src/lib/openFoodFacts.ts` — Open Food Facts API client
- `src/lib/progress.ts` — body weights + chart data (daily nutrition, workout dates); hooks in `src/hooks/useProgress.ts`
- `src/lib/workouts.ts` — data access for exercises/templates/workout logs (+ `formatSet` helper)
- `src/components/workouts/` — `ExerciseList` (search list) and `ExercisePicker` (modal wrapper)
- `src/hooks/` — React Query hooks per feature
- `src/context/AuthProvider.tsx` — session state
- No Redux/Zustand — React Query + Context only, per plan.

## Workout design notes

- An **in-progress workout** is a `workout_logs` row with `completed_at = null`. Sets are inserted as soon as they're added (not batched on finish), so a killed app loses nothing; the Workouts home shows a "Resume" button for it. Starting a new workout is hidden while one is in progress.
- Templates are saved by deleting and re-inserting all `workout_template_exercises` rows (simpler than diffing).
- Cardio sets store `duration_s` / `distance_m`; the UI shows minutes / km.
- Query keys: `['exercises', userId]`, `['workoutTemplates', userId]`, `['workoutTemplate', id]`, `['workoutHistory', userId]`, `['workoutLog', id]`, `['exerciseHistory', userId, exerciseId]`. Progress: `['bodyWeights', userId]`, `['dailyNutrition', userId]`, `['workoutDates', userId]` (the latter two are invalidated whenever the Progress tab gains focus).

## Next session should

1. Read the plan doc's Phase 4 section.
2. (done) Workouts card confirmed.
3. Profile settings: user only wanted **name** (not height/sex/DOB/units). Built as an inline name box + Save on the Profile tab (`profiles.display_name`, `src/lib/profile.ts`, `useDisplayName`, key `['displayName', userId]`); Home shows "Hi, <name>!". Tested on-device by user. No separate `profile/settings.tsx`.
4. **Forgot password — parked, user is deciding.** Code-based version is built on branch `forgot-password` (not merged). Blocker: Supabase only allows editing email templates (needed to put `{{ .Token }}` in the Reset Password email) with custom SMTP. Options discussed: a dedicated Gmail (e.g. a new app-only account) + app password as SMTP (recommended), Resend, or the default link email + deep linking (flaky in Expo Go). Custom SMTP would also lift the built-in sender's low hourly email limit.
5. Deferred polish items: Supabase Site URL deep link for email verification (see gotchas).
