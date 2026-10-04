# FitTrack — Handover

Workout + food (calorie/macro) tracker. Expo (React Native + TypeScript) app, Supabase backend.
Full plan: `C:\Users\jerne\.claude\plans\help-me-plan-what-mellow-sketch.md`

## Status

**Phase 1 (Foundation) — done.** Expo Router, Supabase email/password auth, tab shell.
**Phase 2 (Food logging) — done.** Manual search, barcode scanning, diary, custom foods, nutrition goals.
**Phase 3 (Workout logging) — done.** Exercise catalog (seeded + custom), template CRUD, active workout logging, session summary + history. Tested on-device by user.
**Phase 4 (Progress & polish) — done.** Everything below is tested on-device by the user.
**Forgot password — done** (`(auth)/forgot-password.tsx`, linked from login). Code-based: `resetPasswordForEmail` → user types emailed code + new password → `verifyOtp({ type: 'recovery' })` → `updateUser({ password })`. Supabase uses **custom SMTP via the user's own Gmail** (app password "FitTrack", `smtp.gmail.com:465`); the Reset Password template contains only `{{ .Token }}` (no link — Gmail's link scanner could burn the code). Swap the SMTP settings in the dashboard if the app is ever shared. Tested on-device by the user.
**UX pass + exercise swap — done** (plan: `C:\Users\jerne\.claude\plans\lets-explore-the-ux-ui-indexed-lynx.md`). All steps tested on-device by the user. See "UX pass features" below.
**Food search improvements — done.** My foods first + Livsmedelsverket basic foods. Tested on-device by the user. See "Food search" below.

**Go live (installable APK) — done.** Installed on the user's phone 2026-10-01 and working; user is beta testing it. Android only (OnePlus Nord 5), just for the user, no Play Store. Done: Expo account `jjerner` (Google login), `eas init` (project `@jjerner/FitTrack`), `android.package` = `com.jjerner.fittrack`, `eas.json` `preview` profile (internal APK, `environment: preview`, `channel: preview`), `expo-updates` + `eas update:configure` (`runtimeVersion` policy `appVersion`), Supabase URL/anon key set as EAS env vars in the `preview` environment, keystore generated in the cloud. Mic permission disabled (`recordAudioAndroid: false`). Build #1 failed (npm ci, fixed by `.npmrc`); build #2 `59501503-f0f1-4d39-842a-cfdd5c602949` is the installed one. Rebuild: `npx eas-cli@latest build -p android --profile preview`. JS-only changes later: `npx eas-cli@latest update --channel preview --environment preview --message "..."` (no reinstall; app picks it up after 1–2 restarts). Native changes (new native package, app.json plugins, version bump) need a new build.

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

- **Food diary redesign (Lifesum-style)** — offered in the UX pass (calorie ring on the Food tab, "+" per meal, meal kcal totals, recent foods); user didn't pick it this round.
- **Email-verification link** redirects to a dead `localhost:3000` page (see gotchas). Custom SMTP is now set up, so the "Confirm signup" template could be switched to a code too (same approach as forgot password).

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
- `npm install` used to fail with ERESOLVE (optional web-only `react-dom@19.3.0` vs `react@19.2.3`). Now `.npmrc` has `legacy-peer-deps=true`, so plain `npx expo install <pkg>` works. **Don't remove `.npmrc`**: EAS Build runs strict `npm ci`, which fails ("Missing: react-dom@19.3.0 from lock file") without it.
- EAS build logs (`build:view --json` → `logFiles`) are gzipped JSON lines; PowerShell's `Invoke-WebRequest` mangles them, so fetch with Node's `fetch` + `zlib.gunzipSync`.
- Free-tier EAS builds can sit **in the queue for 1–2+ hours** in the evening (Europe). Not an error.
- New files sometimes aren't picked up by a normal reload in Expo Go — if the user doesn't see a change, have them restart with `npx expo start -c`.
- `StyleSheet.absoluteFillObject` no longer exists (RN 0.86) — use explicit `position: 'absolute', top/right/bottom/left: 0`.
- The `react-hooks/refs` lint rule rejects reading a ref during render, including inside a `useState` initializer. Use a module-level counter or state instead (see `newRow` in `workouts/active.tsx`).
- `expo-symbols` on Android takes Material Symbols names (`{ ios: 'house.fill', android: 'home' }`); tsc checks the names.
- The Livsmedelsverket import script isn't in the repo (it was a one-off). To re-fetch: `GET https://dataportal.livsmedelsverket.se/livsmedel/api/v1/livsmedel?offset=0&limit=3000&sprak=1` for the list, then `.../livsmedel/{nummer}/naringsvarden?sprak=1` per food (kcal = `forkortning` `Ener` with `enhet` `kcal`; `Prot`, `Kolh`, `Fett`, `Fibe`, `Mono/disack`, `Na`).
- Reset codes: each new send invalidates the previous code, and Gmail threads same-subject emails with the **oldest first** — "token has expired or is invalid" was the user copying an old code.
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

1. Beta-test feedback is collected (roadmap section 0, B1–B6). Start with bundle A (B1–B4); more feedback may come.
2. Go through the **Proposed roadmap** below together and pick what's next. Nothing in it is approved yet.
3. Don't touch the "On hold" items above unless the user brings them up.
4. Remember: JS-only changes reach the phone with `eas update` (see Status → Go live); 🔁 items need a new APK build.

## Proposed roadmap (for review — not approved yet)

Made 2026-10-02 from our known gaps + a look at MyFitnessPal, Lifesum, MacroFactor, Cronometer, Strong, Hevy and StrengthLog.
Effort: **S** = under an hour, **M** = a session, **L** = several sessions.
🔁 = native change → needs a new APK build (`eas build`). Everything else ships with `eas update`.
🗄 = needs a new SQL migration (user pastes it into Supabase).

### 0. Beta-test feedback (do first)
From the user's own use of the installed APK, collected 2026-10-04.
| # | Item | Details | Effort |
|---|---|---|---|
| B1 | **Show/hide password** toggle | Login, signup and the new-password box in forgot-password (`src/app/(auth)/*.tsx`). User asked about login; the other two are for consistency (confirm). | S |
| B2 | **Clear field labels** on auth screens | The "Email" placeholder is faint and vanishes when typing, so it was unclear what to enter. Add a visible label above each box ("Email address", "Password") and a clearer placeholder (`you@example.com`). | S |
| B3 | **New Food form is unclear** | `food/custom-food/new.tsx`: the placeholders are invisible on the device (colour probably too faint or same as the background). Add labels ("Calories per 100 g (kcal)") and set an explicit placeholder colour. | S |
| B2+B3 | *Option:* one shared labelled-input component with an explicit placeholder colour, used on all screens | Overlaps with 1.8 (theme). | M |
| B4 | **Rename "Templates" to "Routines"** (user's choice) | On-screen words only, ~69 occurrences in 6 files (`workouts/index.tsx`, `workouts/[templateId].tsx`, `workouts/active.tsx`, `workouts/_layout.tsx`, `home.tsx`; check the one in `forgot-password.tsx` is a false match). Code names, file names and DB tables stay. | S |
| B5 | **Withings scale sync** (new feature) | Withings OAuth2 public API. Needs a Supabase Edge Function (holds the client secret, login + token refresh), a 🗄 migration for tokens, a "Connect Withings" button in Profile, and a pull of new weights into `body_weights` when Progress opens (webhook push later). User must register a free Withings developer app. 🔁 may be needed for the redirect. Open: scale wins over a manual entry on the same day (suggested); weight only at first, body fat later. | L |
| B6 | **No-food-logged reminder** (promotes 5.4) | One daily local notification, default 19:00, toggle + time picker in Profile → Settings. `expo-notifications`. When any food is logged for today, reschedule today's reminder to tomorrow, so it only fires when nothing is logged. Asks for notification permission. 🔁 | M |

Bundles: **A** (JS-only, one `eas update`): B1 + B2 + B3 + B4 — do first. **B** (next native build): B6 + 1.7 icon, optionally 3.9. **C** (moved back — a new feature no competitor seems to have, so it comes after the polish and gym-safety items): B5.

### 1. Known gaps in our own app (quick wins, high value)
| # | Improvement | Why | Effort |
|---|---|---|---|
| 1.1 | **Edit a logged food entry** (tap a row → change grams/meal). Today you can only delete. | Every competitor has it; fixing a typo now means delete + re-log. | S–M |
| 1.2 | **Smart default meal** from time of day (breakfast before 10, lunch 10–14, dinner 17–21, else snack). Today it always defaults to "Snack". | One less tap on every log. | S |
| 1.3 | **Log in servings, not only grams** (`serving_size_g` is already stored; `quantity_unit` already allows `'serving'`). E.g. "1 bar (45 g)". | Branded products are eaten in pieces, not grams. | S–M |
| 1.4 | **Meal totals** (kcal per breakfast/lunch/...) in the diary. | Lifesum/MFP show it; helps see where calories go. | S |
| 1.5 | **Edit past workouts** (fix a weight/reps after finishing). Today only delete. | Common mistake after the session. | M |
| 1.6 | **Offline-safe set logging.** Sets are saved over the network on ✓; in a basement gym with no signal that fails. Queue failed saves locally and retry. | Data loss risk in a real gym. Check during beta. | M |
| 1.7 | **App icon + splash screen** (still the Expo default). 🔁 | Feels like a real app on the home screen. | S (+ rebuild) |
| 1.8 | Move the remaining screens onto `src/theme.ts` (food, progress, workouts list, auth). | Consistent look; needed for dark mode later. | M |
| 1.9 | Switch Open Food Facts search to `search.openfoodfacts.org` (old endpoint often returns 503). | Branded search often fails today. | S |
| 1.10 | Email-verification link → code (same approach as forgot password). SMTP is already set up. | The current link lands on a dead localhost page. Only matters for new accounts. | S |

### 2. Food — features competitors have that we don't
| # | Feature | Seen in | Effort |
|---|---|---|---|
| 2.1 | **Copy meal / copy yesterday** ("same breakfast as yesterday"). | MFP, Lifesum | S–M |
| 2.2 | **Saved meals / recipes** (a group of foods logged in one tap, e.g. "Overnight oats"). 🗄 | MFP "My Meals", Lifesum, Cronometer | M |
| 2.3 | **Quick add** (type kcal + macros directly, no food needed). 🗄 (`food_id` is required today) | MFP, MacroFactor | S–M |
| 2.4 | **Lifesum-style diary** (calorie ring on the Food tab, "+" per meal that pre-selects the meal, recent foods). Reuses the Home ring. | Lifesum | M |
| 2.5 | **Water tracker** (glasses per day on Home/Food). 🗄 | Lifesum, MFP | S–M |
| 2.6 | **Favourites** (star a food; shown first in "My foods"). 🗄 | most apps | S |
| 2.7 | Fiber/sugar/sodium on the food page + optional fiber goal (fields already exist). | Cronometer | S |
| 2.8 | *Later / bigger:* AI photo or text logging ("2 eggs and a toast") via the Claude API. Needs a server-side key (Supabase Edge Function) and costs money per call. | MFP Meal Scan, MacroFactor, Lifesum | L |
| 2.9 | *Later / bigger:* adaptive calorie goal from weight trend + intake (MacroFactor's main idea). We already have both data series. | MacroFactor | L |

### 3. Workouts — features competitors have that we don't
| # | Feature | Seen in | Effort |
|---|---|---|---|
| 3.1 | **Personal records** (🏆 when a set beats your best weight / estimated 1RM; list per exercise). Data is all there. | Strong, Hevy, StrengthLog | M |
| 3.2 | **Estimated 1RM trend** on the exercise page (Epley formula) next to max weight. | Strong | S |
| 3.3 | **Workout notes** + per-exercise notes ("seat at 4"). 🗄 | Strong, Hevy | S–M |
| 3.4 | **Set types**: warm-up / drop set / failure; warm-ups excluded from PRs and volume. 🗄 | Strong, Hevy | M |
| 3.5 | **Plate calculator** (tap a weight → plates per side). | Strong | S |
| 3.6 | **Per-exercise rest time** (today a fixed 90 s for everything). 🗄 | Strong, Hevy | S–M |
| 3.7 | **Supersets** (group 2 exercises, rest after the pair). 🗄 | Strong, Hevy | M–L |
| 3.8 | **Finish summary with highlights** (duration, volume vs last time, new PRs). Extends `log/[logId].tsx`. | Hevy | S–M |
| 3.9 | *Later:* rest-timer notification while the phone is locked (expo-notifications). 🔁 | Strong, Hevy | M |

### 4. Progress & motivation
Withings scale sync is B5 in section 0 (deprioritised: new feature, do after the quick wins).

| # | Feature | Effort |
|---|---|---|
| 4.1 | Weight chart: 7-day moving average line + range (30/90/365 days). Daily weight jumps around; the trend is what matters. | S–M |
| 4.2 | Weekly sets per muscle group. | M |
| 4.3 | Body measurements (waist, etc.) and progress photos. 🗄 (photos need Supabase Storage) | M–L |
| 4.4 | Calorie/protein goal hit-streak on Home (like the workout streak). | S |

### 5. Settings that are missing
| # | Setting | Effort |
|---|---|---|
| 5.1 | **Default rest time** (and per exercise, see 3.6). | S |
| 5.2 | **Goal helper**: suggest calories/macros from weight, height, age, activity and goal (lose/keep/gain). `profiles` already has `height_cm`, `sex`, `date_of_birth` (user earlier said they only wanted name in Profile — ask before adding these fields to the UI). | M |
| 5.3 | **Different goals on training vs rest days.** 🗄 | M |
| 5.4 | **Reminders** ("log your lunch", "weigh in Monday morning"). 🔁 expo-notifications. Food reminder promoted — see B6. | M |
| 5.5 | **Export my data** (CSV of food log, workouts, weight) via share sheet. | M |
| 5.6 | Dark mode (after 1.8). | M |
| 5.7 | Change password / delete account (from Profile). | S–M |

### 6. Deliberately not proposed
Social feed/friends (Hevy), diet-pattern scores (Lifesum), 80+ micronutrients (Cronometer), coaching programs (StrengthLog), wearables — too big or not useful for a single user.

### Suggested order (recommendation)
1. Beta-test fixes (section 0, bundle A: B1–B4) →
2. Quick food wins: 1.1, 1.2, 1.3, 1.4, 2.1 (one session) →
3. Gym safety + motivation: 1.6, 3.1, 3.2, 3.8 →
4. Saved meals (2.2) + quick add (2.3) →
5. Look & feel: 1.7 icon (bundle with the next native build), 1.8 theme, 2.4 Lifesum diary →
6. Bigger bets to discuss: 5.2 goal helper / 2.9 adaptive goal, 2.8 AI logging.

Sources: MyFitnessPal (Meal Scan, Quick Add, My Meals), MacroFactor (adaptive targets), Cronometer (micronutrients), Lifesum (diet patterns, water/habits), Strong (plate calculator, PRs, 1RM, CSV export), Hevy (social, set types), StrengthLog (programs) — 2026 comparison articles.
