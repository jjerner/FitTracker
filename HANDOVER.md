# FitTrack — Handover

Workout + food (calorie/macro) tracker. Expo (React Native + TypeScript) app, Supabase backend.
Full plan: `C:\Users\jerne\.claude\plans\help-me-plan-what-mellow-sketch.md`

## Status

**Phase 1 (Foundation) — done.** Expo Router, Supabase email/password auth, tab shell.
**Phase 2 (Food logging) — done.** Manual search, barcode scanning, diary, custom foods, nutrition goals.
**Phase 3 (Workout logging) — done.** Exercise catalog (seeded + custom), template CRUD, active workout logging, session summary + history. Tested on-device by user.
**Phase 4 (Progress & polish) — done, except forgot password (parked).** Everything below is tested on-device by the user.

### Phase 4 features

- **Progress tab**: body weight log + chart (last 30 days); **nutrition averages** table (`NutritionAveragesCard`: kcal/P/C/F over last 7 / 30 / 90 *logged* days, empty days skipped, today excluded); **Workouts card** (`WorkoutsCard`, replaced the old volume chart): completed-workout count with a dropdown (last 30 / 90 days / year, incl. today) + month calendar with green dot = workout, grey = none, no dot on future days (‹ › up to 12 months back).
- **Exercise detail** (`workouts/exercises/[exerciseId].tsx`): strength/cardio trend chart + per-workout set history. Charts use `react-native-gifted-charts` (+ `react-native-svg`, `expo-linear-gradient`, all Expo Go-compatible).
- **Template tools**: reorder exercises (↑/↓), duplicate, archive/unarchive (behind "Show archived").
- **Nutrition goals**: calorie goal is derived, protein×4 + carbs×4 + fat×9 (`profile/goals.tsx`). Food tab totals show macro goals.
- **Past-days food diary** (no separate `food/day/[date].tsx` route): the Food tab's stack header shows a centered `‹ Today ›` (via `<Stack.Screen options={{ headerTitle }}>` in `food/index.tsx`); tapping the date opens a modal `MonthCalendar` to jump to any past day. View, delete (✕ per entry + confirm dialog) and "+ Log Food" work on any day. The selected day lives in `DiaryDateProvider`, which wraps the whole tab navigator in `(tabs)/_layout.tsx`; `food/[foodId].tsx` logs to that day.
- **Home tab**: "Hi, <name>!" + "Today's food" card (kcal vs goal with bar, P/C/F vs goals; tap → today's diary) + quick buttons "+ Log Food" (→ food search for today; `withAnchor` + `unstable_settings = { anchor: 'index' }` in `food/_layout.tsx` so Back lands on the diary) and "Start Workout" (→ Workouts tab). User deliberately chose only these (no workouts/weight on Home).
- **Profile**: editable display name (inline box + Save). User only wanted name — not height/sex/DOB/units — so no `profile/settings.tsx`.

### On hold (user's call — don't change unless asked)

- **Forgot password** — built on branch `forgot-password` (not merged): code-based flow, `resetPasswordForEmail` → user types code + new password → `verifyOtp({ type: 'recovery' })` → `updateUser({ password })`. Blocker: the Reset Password email must contain `{{ .Token }}`, and Supabase only allows editing email templates with **custom SMTP**. Options discussed: a dedicated app-only Gmail + app password as SMTP (recommended; also lifts the built-in sender's low hourly limit), Resend, or the default link email + deep linking (flaky in Expo Go). User is deciding which.
- **UX/UI polish** — user will do a UX pass later. Known items: Profile → "Nutrition Goals" button hard to see; Food tab shows two headers ("Food" tab header + stack header). Don't fix now.
- **Email-verification link** redirects to a dead `localhost:3000` page (see gotchas). Likely solved together with the SMTP/email decision.

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
- `src/lib/profile.ts` — display name (`profiles.display_name`); hook `useDisplayName`
- `src/lib/dateUtils.ts` — local-date helpers (`todayLocalDate`, `localDateDaysAgo`, `localDateOf`); dates are `YYYY-MM-DD` strings in device time
- `src/components/MonthCalendar.tsx` — shared month grid (dots mode for Progress, select mode for the diary date picker)
- `src/components/workouts/` — `ExerciseList` (search list) and `ExercisePicker` (modal wrapper)
- `src/hooks/` — React Query hooks per feature
- `src/context/AuthProvider.tsx` — session state
- `src/context/DiaryDateProvider.tsx` — which day the food diary shows / logs to
- No Redux/Zustand — React Query + Context only, per plan.

## Workout design notes

- An **in-progress workout** is a `workout_logs` row with `completed_at = null`. Sets are inserted as soon as they're added (not batched on finish), so a killed app loses nothing; the Workouts home shows a "Resume" button for it. Starting a new workout is hidden while one is in progress.
- Templates are saved by deleting and re-inserting all `workout_template_exercises` rows (simpler than diffing).
- Cardio sets store `duration_s` / `distance_m`; the UI shows minutes / km.
- Query keys: `['exercises', userId]`, `['workoutTemplates', userId]`, `['workoutTemplate', id]`, `['workoutHistory', userId]`, `['workoutLog', id]`, `['exerciseHistory', userId, exerciseId]`. Progress: `['bodyWeights', userId]`, `['dailyNutrition', userId]`, `['workoutDates', userId]` (the latter two are invalidated whenever the Progress tab gains focus). Food/profile: `['foodDiary', userId, date]`, `['nutritionGoals', userId]`, `['displayName', userId]`.

## Next session should

1. Ask the user what they want next — the plan's phases are complete. Candidates: pick forgot password back up once they've chosen an email route (`git switch forgot-password`, rebase onto master), the UX/UI pass, or new features.
2. Don't touch the "On hold" items above unless the user brings them up.
