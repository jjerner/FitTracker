# FitTrack — Handover

Workout + food (calorie/macro) tracker. Expo (React Native + TypeScript) app, Supabase backend.
Full plan: `C:\Users\jerne\.claude\plans\help-me-plan-what-mellow-sketch.md`

## Status

**Phase 1 (Foundation) — done.** Expo Router, Supabase email/password auth, tab shell.
**Phase 2 (Food logging) — done.** Manual search, barcode scanning, diary, custom foods, nutrition goals.
**Phase 3 (Workout logging) — done.** Exercise catalog (seeded + custom), template CRUD, active workout logging, session summary + history. Tested on-device by user.
**Phase 4 (Progress & polish) — done, except forgot password (parked).** Everything below is tested on-device by the user.
**UX pass + exercise swap — done** (plan: `C:\Users\jerne\.claude\plans\lets-explore-the-ux-ui-indexed-lynx.md`). All steps tested on-device by the user. See "UX pass features" below.
**Food search improvements — done.** My foods first + Livsmedelsverket basic foods. Tested on-device by the user. See "Food search" below.

### Phase 4 features

- **Progress tab**: body weight log + chart (last 30 days); **nutrition averages** table (`NutritionAveragesCard`: kcal/P/C/F over last 7 / 30 / 90 *logged* days, empty days skipped, today excluded); **Workouts card** (`WorkoutsCard`, replaced the old volume chart): completed-workout count with a dropdown (last 30 / 90 days / year, incl. today) + month calendar with green dot = workout, grey = none, no dot on future days (‹ › up to 12 months back).
- **Exercise detail** (`workouts/exercises/[exerciseId].tsx`): strength/cardio trend chart + per-workout set history. Charts use `react-native-gifted-charts` (+ `react-native-svg`, `expo-linear-gradient`, all Expo Go-compatible).
- **Template tools**: reorder exercises (↑/↓), duplicate, archive/unarchive (behind "Show archived").
- **Nutrition goals**: calorie goal is derived, protein×4 + carbs×4 + fat×9 (`profile/goals.tsx`). Food tab totals show macro goals.
- **Past-days food diary** (no separate `food/day/[date].tsx` route): a centered `‹ Today ›` row at the top of `food/index.tsx` (the header just says "Food"); tapping the date opens a modal `MonthCalendar` to jump to any past day. View, delete (✕ per entry + confirm dialog) and "+ Log Food" work on any day. The selected day lives in `DiaryDateProvider`, which wraps the whole tab navigator in `(tabs)/_layout.tsx`; `food/[foodId].tsx` logs to that day.
- **Profile**: editable display name (inline box + Save). User only wanted name — not height/sex/DOB/units — so no `profile/settings.tsx`. Settings section: Nutrition Goals row + "Vibrate when rest ends" switch.

### Food search (`food/search.tsx`)

Three sections, fetched in parallel with `Promise.allSettled` (one failing doesn't hide the others):
1. **My foods** — `searchMyFoods`: foods the user has logged (most recent first, matched on `food_log_entries.food_name`) + their custom foods.
2. **Basic foods** — `searchBasicFoods`: Livsmedelsverket foods (`source = 'slv'`). Every query word must match; ranked exact → whole words at start → whole words anywhere → prefix → contains, then shorter names first (so "mjölk" gives "Mjölk fett 3%" before "Mjölkchoklad").
3. **Branded products** — Open Food Facts, still the legacy `cgi/search.pl` endpoint. It often returns HTTP 503; the newer `search.openfoodfacts.org` (search-a-licious) was faster and reliable in testing, but the user chose not to switch for now.

### UX pass features

- **Templates** can be just a list of exercises: new exercises start without targets; "+ Targets" reveals Sets/Reps/kg.
- **Exercise swap** (`SwapExercisePicker`, "⇄ Swap" on each exercise in `workouts/active.tsx`): suggests exercises with the same `exercises.movement_pattern` (fallback: same muscle group; plus a "Show all exercises" button). No sets yet → `swapLogExercise` replaces in place; sets logged → `insertExerciseAfter` adds the new one below. Never changes the template (user's call). Custom exercises can pick a movement (`MOVEMENT_PATTERNS` in `src/lib/workouts.ts`).
- **Active workout, StrengthLog-style**: per-exercise table Set | Previous | kg | reps | ✓ (cardio: min | km). Unsaved rows are local state; grey placeholders = previous session's same set → template target → last set; ✓ with empty inputs uses the placeholder. ✓ saves immediately via `addSet`; tapping a green ✓ deletes the set and puts its numbers back in a row. Rest timer bar (90 s, −15/+15/Skip) after strength sets; elapsed clock under the title.
- **Rest vibration**: off by default; device-only setting in AsyncStorage (`src/lib/settings.ts`, hook `useRestVibration`, query key `['restVibration']`).
- **Home**: calorie ring (`react-native-svg`, kcal left/over) + P/C/F bars; "This week" card (Mon–Sun dots, count, 🔥 streak = consecutive weeks with ≥1 workout; an empty current week doesn't break it); "+ Log Food" and "Start Workout", which becomes "Resume: <name>" during a workout (`withAnchor` + `unstable_settings` anchor in both `food/_layout.tsx` and `workouts/_layout.tsx` so Back lands on the tab's list). User now **wants** workouts on Home (reverses the earlier food-only decision). Weight is still not on Home.
- **Look & feel**: tab bar icons via `expo-symbols` (`@expo/vector-icons` is deprecated per the docs; `expo-font` is its peer dep). `src/theme.ts` = shared colors/spacing/radius; only the tab layout, Profile, active workout and Home use it so far, so move other screens over as they're touched. Food/Workouts/Profile tabs set `headerShown: false` so only their stack header shows.

### On hold (user's call — don't change unless asked)

- **Forgot password** — built on branch `forgot-password` (not merged): code-based flow, `resetPasswordForEmail` → user types code + new password → `verifyOtp({ type: 'recovery' })` → `updateUser({ password })`. Blocker: the Reset Password email must contain `{{ .Token }}`, and Supabase only allows editing email templates with **custom SMTP**. Options discussed: a dedicated app-only Gmail + app password as SMTP (recommended; also lifts the built-in sender's low hourly limit), Resend, or the default link email + deep linking (flaky in Expo Go). User is deciding which.
- **Food diary redesign (Lifesum-style)** — offered in the UX pass (calorie ring on the Food tab, "+" per meal, meal kcal totals, recent foods); user didn't pick it this round.
- **Go live (installable APK, no Expo Go)** — Android only (OnePlus Nord 5), just for the user, no Play Store. Plan: EAS cloud build of an APK + sideload; Supabase keys as EAS env vars (`.env` isn't uploaded); `expo-updates` recommended for updates without reinstalling. Full steps in the plan doc, Phase 5. User wants it planned but not started.
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
- `0007_movement_patterns.sql` (exercises.movement_pattern + 28 extra seeded exercises, e.g. Chest Press, Hack Squat)
- `0008_slv_foods.sql` (foods.source may be `'slv'`, foods.slv_number; 2,606 Livsmedelsverket generic foods, per 100 g, fetched once from their open API)

For any new tables, write new numbered migration files and ask the user to run them the same way.

## Known gotchas hit this session

- Supabase's default "Site URL" is `localhost:3000`, so the email-verification link redirects to a dead localhost page after confirming. Cosmetic only — verification succeeds before the redirect. Fix is tied to the SMTP/email decision (see On hold).
- A `.upsert(..., { onConflict: 'barcode' })` needs a **non-partial** unique constraint on that column — a partial index (`WHERE barcode IS NOT NULL`) doesn't work as an ON CONFLICT target. Fixed in `0003`. Keep this in mind for any future upsert-by-nullable-column tables.
- `npm install` currently fails with ERESOLVE: the lockfile has optional `react-dom@19.3.0` (web-only) vs `react@19.2.3`. Workaround: `npx expo install <pkg> -- --legacy-peer-deps`.
- New files sometimes aren't picked up by a normal reload in Expo Go — if the user doesn't see a change, have them restart with `npx expo start -c`.
- `StyleSheet.absoluteFillObject` no longer exists (RN 0.86) — use explicit `position: 'absolute', top/right/bottom/left: 0`.
- The `react-hooks/refs` lint rule rejects reading a ref during render, including inside a `useState` initializer. Use a module-level counter or state instead (see `newRow` in `workouts/active.tsx`).
- `expo-symbols` on Android takes Material Symbols names (`{ ios: 'house.fill', android: 'home' }`); tsc checks the names.
- The Livsmedelsverket import script isn't in the repo (it was a one-off). To re-fetch: `GET https://dataportal.livsmedelsverket.se/livsmedel/api/v1/livsmedel?offset=0&limit=3000&sprak=1` for the list, then `.../livsmedel/{nummer}/naringsvarden?sprak=1` per food (kcal = `forkortning` `Ener` with `enhet` `kcal`; `Prot`, `Kolh`, `Fett`, `Fibe`, `Mono/disack`, `Na`).
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
- `src/lib/settings.ts` — device-only settings (AsyncStorage)
- `src/theme.ts` — shared colors/spacing/radius
- `src/components/workouts/` — `ExerciseList` (search list), `ExercisePicker` (modal wrapper), `SwapExercisePicker` (similar-exercise modal)
- `src/hooks/` — React Query hooks per feature
- `src/context/AuthProvider.tsx` — session state
- `src/context/DiaryDateProvider.tsx` — which day the food diary shows / logs to
- No Redux/Zustand — React Query + Context only, per plan.

## Workout design notes

- An **in-progress workout** is a `workout_logs` row with `completed_at = null`. Sets are inserted as soon as they're ticked ✓ (not batched on finish), so a killed app loses nothing; the Workouts home shows a "Resume" button for it. Starting a new workout is hidden while one is in progress.
- Templates are saved by deleting and re-inserting all `workout_template_exercises` rows (simpler than diffing).
- Cardio sets store `duration_s` / `distance_m`; the UI shows minutes / km.
- Query keys: `['exercises', userId]`, `['workoutTemplates', userId]`, `['workoutTemplate', id]`, `['workoutHistory', userId]`, `['workoutLog', id]`, `['exerciseHistory', userId, exerciseId]`. Progress: `['bodyWeights', userId]`, `['dailyNutrition', userId]`, `['workoutDates', userId]` (the latter two are invalidated whenever the Progress tab gains focus; Home invalidates `workoutDates` + `workoutHistory` on focus; finishing a workout invalidates `exerciseHistory`). Food/profile: `['foodDiary', userId, date]`, `['nutritionGoals', userId]`, `['displayName', userId]`, `['restVibration']` (device setting).

## Next session should

1. Ask the user what they want next. Candidates: forgot password once they've chosen an email route (`git switch forgot-password`, rebase onto master), going live (APK), the Lifesum-style food diary, switching Open Food Facts to the newer search endpoint, moving remaining screens onto `src/theme.ts`, or new features.
2. Don't touch the "On hold" items above unless the user brings them up.
