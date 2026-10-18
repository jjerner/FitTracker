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

**Session 2026-10-10 (NOT yet tested on the phone — user will test over time):**
- **Bundle D (C1–C6)** shipped via `eas update` (preview channel): `hitSlop` on small text links, food search fixes (word-based "my foods" match, higher limits), shared `LabeledInput` in new `CreateExerciseForm` (also in `ExercisePicker` → create custom exercise mid-workout), default rest time setting (Profile, `useDefaultRest`), "+" removed from Log Food / New Routine.
- **C7** shipped: meal cards in the food diary (tap to expand), saved meals logged as one group row (`group_id`/`group_name`, migration `0012` **applied**), `deleteFoodLogGroup`.
- **C11 done:** app renamed **Plucky**, new mascot icon (chicken with broccoli hat on yellow; chosen after a simulated 8-persona A/B panel). Icons regenerated in `assets/`, `app.json` name + adaptive background `#ffd23f`. `slug` and package id `com.jjerner.fittrack` kept on purpose. New APK built (EAS build 8517256c-4cae-4515-a4c8-047dfdad47ff, preview profile, finished) — **user installs it manually**; check adaptive/monochrome icon and the notification icon on the phone.
- **To test:** see the list in the session's last messages: rest-time setting, create exercise from picker, search multi-word, tap targets, meal cards, saved-meal groups, new name/icon.
- **Next:** C8 (missing-meal reminder 20:30, needs the new build already installed), then C9/C10 research, C12 later.
- **Audit fixes (2026-10-11, commit e635209):** progress averages now read the `daily_nutrition` view (migration `0013`, **applied**) instead of 365 days of raw rows (Supabase caps a request at 1000 rows); `upsertOffFood` skips existing barcodes (`ignoreDuplicates`) because RLS refuses updates to ownerless shared `foods` rows; `saveTemplate` inserts new exercises before deleting the old ones; unused `searchCachedFoods` removed. **Tests:** `npm test` (jest-expo + `@react-native/jest-preset` pinned to 0.86.3 to match jest-expo's peer range), tests in `src/lib/__tests__/`.
- **Runtime version is now `fingerprint`** (was `appVersion`). Each build gets a label from its native contents and `eas update` only reaches builds with the same label. So **the Plucky APK built before 2026-10-11 gets no more updates** and still has the three audit bugs. Any change to native packages or `app.json` means a new build before the next update.
- **`npx expo install --fix` done** (commit fdba4c2); `expo-doctor` is 21/21. New APK build started 2026-10-11: https://expo.dev/accounts/jjerner/projects/FitTrack/builds/52094a9e-8509-43d3-ad5e-dd221644d252 — **user installs it manually** over the old app, **installed 2026-10-12 and all three checks passed** (Progress tab loads, same branded food picked/scanned twice, routine stays intact when saving offline). C8 (missing-meal reminder) can ship as a plain `eas update` after that.

**Session 2026-10-05 (all shipped via `eas update`, all confirmed on the phone):**
- **Tracked exercises** card on Progress (migration 0010, `tracked_exercises`). Shows only *logged* values, never an estimated 1RM (user's call): current best (heaviest set of the latest session, kg × reps), all-time PR + date, change vs 30/90 days ago. Stats in `trackedStats` (`src/lib/records.ts`); data in `src/lib/progress.ts` + `useTrackedExercises`; reuses `ExercisePicker` (new `title` prop) and `useExerciseHistory`. Commit ed405a9.
- **Saved meals + quick add** (migration 0011: `food_log_entries.food_id` now nullable, `saved_meals`, `saved_meal_items`). "Save as meal" link on each diary meal (name modal) → Log Food → "Saved meals" logs one entry per food, recalculated from the foods as they are now (quick-add entries are skipped when saving). Quick-add screen (`food/quick-add.tsx`) still exists but has **no button leading to it** any more (user found it pointless); it only serves editing old quick-add entries (tap an entry with `foodId == null`). Commit b21aa32.
- **Lifesum-style diary (2.4)**: calorie ring + macro bars on the Food tab (shared `src/components/CalorieRing.tsx`, also used by Home), blue "+" per meal opens Log Food with `?meal=` pre-selected (carried through search, scan, saved meals, custom food), "Recent" foods list on Log Food (`getRecentFoods`). The bottom "+ Log Food" button on the diary was removed. Log Food's shortcut row is now **Saved meals | Custom food** (custom food was moved up from the bottom of the screen). Commits 3dff940, 249533a.
- **Theme cleanup (1.8)**: no hard-coded hex colors left in `src/**/*.tsx`; everything uses `colors` from `src/theme.ts` (new tokens: onPrimary, primaryLight, successBg, dangerLight, warning*, streak, textSecondary, subtle, disabled, borderStrong, black). Near-identical greys were merged. Commit 07e1a41. Dark mode (5.6) is now possible by swapping those values (screens would still need a hook to read the active palette instead of the static import).
- Commit 8055033 fixed a garbled 🔥 on Home (see gotcha below).

**Go live (installable APK) — done.** Installed on the user's phone 2026-10-01 and working; user is beta testing it. Android only (OnePlus Nord 5), just for the user, no Play Store. Done: Expo account `jjerner` (Google login), `eas init` (project `@jjerner/FitTrack`), `android.package` = `com.jjerner.fittrack`, `eas.json` `preview` profile (internal APK, `environment: preview`, `channel: preview`), `expo-updates` + `eas update:configure` (`runtimeVersion` policy `appVersion`), Supabase URL/anon key set as EAS env vars in the `preview` environment, keystore generated in the cloud. Mic permission disabled (`recordAudioAndroid: false`). Build #1 failed (npm ci, fixed by `.npmrc`); build #2 `59501503-f0f1-4d39-842a-cfdd5c602949` was the first installed one; build #3 `cb263946-1335-4e68-9a3f-108e17a90cb6` (2026-10-04, finished) adds bundle A, the food reminder and the new icon — **user is about to install and test it**. Rebuild: `npx eas-cli@latest build -p android --profile preview`. JS-only changes later: `npx eas-cli@latest update --channel preview --environment preview --message "..."` (no reinstall; app picks it up after 1–2 restarts). Native changes (new native package, app.json plugins, version bump) need a new build.

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
- **Look & feel**: tab bar icons via `expo-symbols` (`@expo/vector-icons` is deprecated per the docs; `expo-font` is its peer dep). `src/theme.ts` = shared colors/spacing/radius, now used by every screen (see 2026-10-05 session above). Food/Workouts/Profile tabs set `headerShown: false` so only their stack header shows.

### On hold (user's call — don't change unless asked)

- **Email-verification** — fixed 2026-10-13 (1.10): signup now uses a typed code (`verifyOtp({ type: 'signup' })`); the "Confirm signup" template holds only `{{ .Token }}`.

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

### Testing the app on web (Claude in Chrome)
- Start: `npx expo start --web --port 8081` (run in background), open `http://localhost:8081` with Claude in Chrome. Web deps: `react-dom`, `react-native-web`, `@expo/metro-runtime` (JS only, native fingerprint unchanged).
- Log in with the **test account** in `.env.test.local` (gitignored; `TEST_EMAIL` / `TEST_PASSWORD`, user created it in the Supabase dashboard 2026-10-12). Never use the user's own account. It sees shared foods but not the user's diary.
- Smoke test done 2026-10-12: login, Home, food search (Basic foods), clear search (no stuck spinner), log a food → shows in the diary, Workouts/Progress/Profile open with no console errors.
- **Can't be tested on web:** branded search (`search.openfoodfacts.org` sends no CORS header, so the browser blocks it; fine on the phone), barcode camera, notifications/reminders, vibration. Test those on the phone.
- Chrome window stays maximized (resize didn't work), so screens show wide, not phone-sized. Ignore the Myki password-manager popup at the bottom left; it's not the app.

### PM loop + software factory (set up 2026-10-18, not yet used on a real item)
- **`/pm`** (standup from this roadmap) → **`/pm <ids>`** (specs for a batch, user is grilled on open questions, then each item is built on its own branch `factory/<id>-<slug>` and opened as a PR with a "ship card") → **`/pm ship <ids>`** (merge, mark done here; `eas update`/`eas build` only on the user's explicit yes). **`/factory <idea>`** = the same line for one off-roadmap item.
- Lives in the user's global `~/.claude`: `commands/pm.md`, `commands/factory.md`, `agents/` (spec-writer, builder, ux/ui/security/code-quality reviewers), `factory/` (live dashboard at http://127.0.0.1:7777/, fed by Agent hooks in `~/.claude/settings.json`). Skills used: `grilling` (mattpocock), Expo plugin (`expo@claude-plugins-official`; its MCP server needs `/mcp` login before use, the skills work without it), `security-audit` (Cloudflare, for occasional full audits only, not in the factory).
- **CI** (`.github/workflows/ci.yml`, since PR #4): tsc, lint and jest on every PR and push to master. No secrets needed.
- The roadmap pointer for `/pm` is in CLAUDE.md → "Roadmap".

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
- `0009_food_servings.sql` (food_servings: personal named servings per food, RLS own rows; food_log_entries.serving_g = grams per serving the entry was logged in)

- `0010_tracked_exercises.sql` (tracked_exercises: user_id + exercise_id, RLS own rows)
- `0011_saved_meals_quick_add.sql` (food_log_entries.food_id nullable for quick-add; saved_meals + saved_meal_items, RLS own rows / via parent meal)
- `0012_food_entry_groups.sql` (food_log_entries.group_id + group_name; saved meals log as one diary group) — applied 2026-10-10
- `0013_daily_nutrition_view.sql` (`daily_nutrition` view, one row per user per day, `security_invoker` so RLS still applies) — applied 2026-10-11
- `0015_favourite_foods.sql` (favourite_foods: user_id + food_id, RLS own rows) — applied 2026-10-12
- `0017_warmup_sets.sql` (workout_log_sets.set_type normal|warmup) — applied 2026-10-18
- `0018_template_rest_seconds.sql` (workout_template_exercises.rest_seconds) — applied 2026-10-18
- `0019_delete_account.sql` (PR #50) and `0020_app_releases.sql` (PR #51) — NOT applied yet
- `0016_saved_meal_portions.sql` (saved_meals.portions, default 1, 0 < portions ≤ 1000; F6 recipes) — applied 2026-10-18

For any new tables, write new numbered migration files and ask the user to run them the same way.

## Known gotchas hit this session

- **Updates must match the installed APK's runtime (checked 2026-10-18).** The APK on the phones (build 2026-10-11) has runtime `9b3806424e…`. Since 1.11 web testing (Oct 12) the app config also lists `"web"` as a platform, which changes the fingerprint, so every update from Oct 12 to Oct 18 went to runtime `f59ad7ee…` and **never reached the phones**. Fixed on 2026-10-18 by publishing once to `9b38064…`. **Until the next APK build, publish like this:** temporarily add `"platforms": ["ios", "android"]` under `expo` in `app.json`, check `npx eas-cli@latest fingerprint:compare 9b3806424e09b94e953d24b2dc87aa7b860ae825` says they match, run `eas update ... --platform android`, then `git checkout app.json`. Also keep `eas.json` with LF line endings (CRLF changes the fingerprint too). After the next `eas build` the new APK includes "web" and this workaround is no longer needed.
$//' eas.json`).
- Supabase's default "Site URL" is still `localhost:3000`. No email links remain since 1.10 (signup and reset both use codes), so it only matters if a link-based email is added later. Fix with the SMTP/email decision (see On hold).
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
- **Never rewrite source files with PowerShell `Get-Content`/`Set-Content`** — it mangles UTF-8 (the 🔥 on Home turned into `ðŸ”¥` and the BOM crept in). Use the Edit/Write tools or a Node script with explicit `utf8`. Quick check for damage: grep `src` for `Ã|â€|ðŸ`.
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
- `src/components/CalorieRing.tsx` — `CalorieRing` + `MacroBar`, shared by Home and the Food diary
- `src/app/(tabs)/food/` also holds `quick-add.tsx` (edit-only now) and `saved-meals.tsx`; `src/lib/foods.ts` has the saved-meal / quick-entry / `getRecentFoods` functions
- `src/components/workouts/` — `ExerciseList` (search list), `ExercisePicker` (modal wrapper), `SwapExercisePicker` (similar-exercise modal)
- `src/hooks/` — React Query hooks per feature
- `src/context/AuthProvider.tsx` — session state
- `src/context/DiaryDateProvider.tsx` — which day the food diary shows / logs to
- No Redux/Zustand — React Query + Context only, per plan.

## Workout design notes

- An **in-progress workout** is a `workout_logs` row with `completed_at = null`. Sets are inserted as soon as they're ticked ✓ (not batched on finish), so a killed app loses nothing; the Workouts home shows a "Resume" button for it. Starting a new workout is hidden while one is in progress.
- Templates are saved by deleting and re-inserting all `workout_template_exercises` rows (simpler than diffing).
- Cardio sets store `duration_s` / `distance_m`; the UI shows minutes / km.
- Query keys: `['exercises', userId]`, `['workoutTemplates', userId]`, `['workoutTemplate', id]`, `['workoutHistory', userId]`, `['workoutLog', id]`, `['exerciseHistory', userId, exerciseId]`. Progress: `['bodyWeights', userId]`, `['dailyNutrition', userId]`, `['workoutDates', userId]` (the latter two are invalidated whenever the Progress tab gains focus; Home invalidates `workoutDates` + `workoutHistory` on focus; finishing a workout invalidates `exerciseHistory`). Also `['trackedExercises', userId]`, `['savedMeals', userId]`, `['recentFoods', userId]`. Food/profile: `['foodDiary', userId, date]`, `['nutritionGoals', userId]`, `['displayName', userId]`, `['restVibration']` (device setting).

## Next session should

- **Session 2026-10-19 (planned by the user):** look at the roadmap board (https://github.com/users/jjerner/projects/1) together and go over the **Refinement** column. Note: as of 2026-10-18 the board's Status field only has Todo / In Progress / Done (all 29 items in Todo); if the user hasn't added a "Refinement" status yet, offer to add it and ask which items go there. Phone tests from F3/F4/F5 (item 1 below) are still open — ask about them first.
- **Session 2026-10-18 (later):** shipped F3/F4/F5 via `/pm` (PRs #5–#7, `eas update`), moved the roadmap to the GitHub Project board (issues #8–#36), README rewritten, factory dashboard shows ticket names (`~/.claude/factory/titles.json`).

- **Start of next session (2026-10-13):** first ask the user about the phone tests in item 1 below (**1.10 signup code is shipped but NOT tested yet**). Then show the remaining plan and let them pick. Dark mode waits on branch `dark-mode` (0c) — don't merge or ship it unless the user says so; they may do a bigger UX overhaul first. The review + web-test routine was used for 5.6 and 1.10 and worked (sign-up UI can be tested by "signing up" with the test account's email: Supabase returns no session and sends nothing, so the code screen shows without creating an account; don't tap "Send again" there).
- **Session 2026-10-17/18 (tooling only, no app changes):** set up the PM loop + factory, CI and the Expo skills (see Environment → "PM loop + software factory"); added roadmap item 1.14 (UI/UX review pass, later). Open new items from `beta_test_feedback_2026-10-17.md` (comma resets weight to 0, double dinner reminder, etc.) are not on the roadmap tables yet; `/pm` reads that file too. Try `/pm` first next session.
- **Rule (user, 2026-10-12): every feature or fix gets a `/ponytail-review` and, when it has something to see or tap, a test by Claude in the real app on web** (see "Testing the app on web" and the "Definition of done" in CLAUDE.md). Only what web can't run goes on the user's phone test list.
0. **Session 2026-10-12 shipped (all via `eas update`, preview channel; NOT yet tested on the phone — ask the user):** audit follow-ups A1 (migration `0014` **applied**), A3, A6 (A2 accepted as a risk, A4 skipped); C8 missing-meal reminder (20:30, offline-safe); C10 program gallery (Upper/Lower, Push/Pull/Legs); `saveTemplate` now removes a half-saved new routine. C9 is parked. Last commit before this handover: see `git log`.
0a. **Session 2026-10-12 (later), all shipped via `eas update`:** user confirmed on the phone: "Could not delete" alert, program gallery, Workouts range buttons (4.5). Shipped: **1.5 edit past workouts** (tap a set on the workout summary → edit kg/reps or min/km, or delete the set; Save is disabled when both boxes are empty; `updateSet` in `lib/workouts.ts`; adding sets to a past workout not done); **4.1 weight trend** (7-day average line over the daily weigh-ins; `weightTrend` in `lib/progress.ts`, tested; the weight query now fetches 371 days; chart scale includes the trend line); **4.5** shared `RangeTabs` row (30 days · 90 days · 1 year) on the weight and workouts cards, old dropdown removed; **2.6 favourite foods** (migration `0015` **applied**; ☆/★ on the food page; search order is Favourites → My foods → Basic → Branded, Favourites also above Recent when the box is empty) and **most logged first** in My foods (`searchMyFoods` counts the 500 latest matching entries; ties = most recent). Each feature got a `/ponytail-review` and its fixes shipped.
0b. **Session 2026-10-12 (evening):** shipped via `eas update`: **1.9** branded search on `search.openfoodfacts.org` (`langs=sv,en`; tapping a hit fetches the full product by barcode so the serving size is saved) and a **stuck search spinner** fix (clearing the box within 0.4 s). User tested search on the phone: OK. Dropped 2.5 water and 2.7 fiber/sugar. Added plan items **1.12** APK update banner and **1.13** app email sender. **1.11 web part done**: web deps, test account, "Testing the app on web" section, rule in CLAUDE.md.
0c. **Dark mode (5.6) lives on branch `dark-mode` (commit a5b5c88), NOT merged or shipped (user, 2026-10-12):** the user may do a bigger UX overhaul first that could change it. Follows the system theme, picked once at app start (`shortcut:` in `theme.ts`); needs a new APK build (`expo-system-ui`). Tested on web in dark; phone checks: placeholder hint text readable in dark. Merge only when the user says so.
1. **To test on the phone (ask the user):** **Shipped 2026-10-18 (evening) via `eas update` (PRs #45–#48, #52):** S42 Profile is a menu (Goals / Workouts / Reminders / Account): rows fit on the phone, turn the food reminder off and on from Reminders and check it still fires. 4.4 "🎯 N days on target" fits next to "Today's food". 4.2 sets-per-muscle table readable on the phone. 3.4 warm-ups: tap the set number → W; in flight mode tick a W set, signal back on → summary shows "Warm-up"; badge easy to tap mid-workout. 3.6 routine "+ Rest time" min/sec boxes open the number pad; timer uses the routine's rest; Profile → Workouts default rest row fits. **Shipped 2026-10-18 via `eas update` (PRs #37–#39, #41):** B1 eye icon shows on login/signup/new-password and toggles; TalkBack says "Show password, button"; toggling keeps the cursor and keyboard. F1 sign up with a fresh address, skip the code, go back and log in → code screen opens ("Your email isn't confirmed yet") and a new code arrives; enter it → Home. F2 calorie ring + macro row readable on the phone, also with big system font. F6 Saved meals → New recipe → + Add ingredient → Scan Barcode → "Add to Recipe" returns to the recipe with earlier ingredients kept; unknown barcode → custom food → back to the recipe; back with unsaved changes asks "Discard changes?"; log 2,5 portions with the Swedish keyboard. 3.5 plate calculator was scrapped by the user (PR #40 closed, issue #12 not planned). **Shipped 2026-10-18 via `eas update` (PRs #5–#7):** F4 type a comma with the Swedish keyboard in food amount and the custom food form (kcal preview not 0); F3 meal reminder on, log breakfast + lunch, close/reopen the app a few times, log a snack → exactly one "Nothing logged for dinner yet." at 20:30, and next day log dinner before 20:30 → none; F5 "Save as meal" popup with the keyboard open (Save reachable, tick rows work). Older: missing-meal reminder at 20:30 (watch for OnePlus battery saver). Everything else from 2026-10-12 was confirmed OK by the user. Also test **1.10**: sign up with a fresh address (e.g. a Gmail `+alias`), type the emailed code → lands on Home; try "Send again". Also test 1.9: branded search (e.g. "mellanmjölk", "oatly") returns results.
2. **Remaining plan:** C12 usage dashboard (needs a sharing decision); step 7 "bigger bets to discuss" (5.2 goal helper / 2.9 adaptive goal, 2.8 AI logging); **1.11 testing strategy (Claude tests the real app itself; decide web vs emulator first)**; **1.12 APK update banner for testers** (do before the next 🔁 build, so it ships in it); **1.13 app emails from an app address, not the personal Gmail** (decide Gmail vs email service + domain); smaller items: 5.6 dark mode (theme groundwork done). B5 Withings is deliberately later. Migration workflow for 🗄 items: write the next `00NN_*.sql` (next free: `0017`), ask the user to paste it into Supabase **before** shipping the JS.
2b. **When the current plan is done (user's request, 2026-10-12):** run a full audit of the whole app (`/ponytail-audit`), then make a plan for a release to the **App Store and Google Play**. Things that plan must cover at least: store accounts (Apple developer + Play Console), iOS build (never built so far), production EAS profile/channel, privacy policy + data-safety forms (the app stores food/weight/workout data), account deletion in-app (required by both stores), the Gmail SMTP and Site URL items under "On hold", A2 (shared OFF cache) since strangers would use it, and C12 if usage stats are wanted.
3. Don't touch the "On hold" items above unless the user brings them up.
4. Remember: JS-only changes reach the phone with `eas update` (see Status → Go live); 🔁 items need a new APK build.
5. Run it as `npx eas-cli@latest update --channel preview --environment preview --message "..." --non-interactive` (`--environment` is required in non-interactive mode). `runtimeVersion` (policy `fingerprint` since 2026-10-11; it was `appVersion`/`1.0.0`) now lives at the top level of `app.json`; before, it sat under `android` and `eas update` rewrote `app.json` (duplicate CAMERA permission + a second `runtimeVersion`). Fixed in 9d522d2 and verified: no more rewrites. If `app.json` shows as modified after an update, `git checkout app.json`.

## Proposed roadmap (for review — not approved yet)

> **Moved 2026-10-18:** open items now live on the GitHub Project board "Plucky roadmap" (https://github.com/users/jjerner/projects/1, issues #8–#36). The board is the source of truth; the tables below are history and background detail. New items go on the board, not here.

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
| B6 | **No-food-logged reminder** (promotes 5.4) — **done in code, needs APK build + on-device test.** Schedules 14 one-off notifications (`src/lib/reminders.ts`), refreshed on app open and on every food log/delete; setting in Profile. Not yet handled: signing out doesn't cancel reminders. | One daily local notification, default 19:00, toggle + time picker in Profile → Settings. `expo-notifications`. When any food is logged for today, reschedule today's reminder to tomorrow, so it only fires when nothing is logged. Asks for notification permission. 🔁 | M |
| B7 | **Easier set removal in an active workout** — **done, sent via `eas update` (preview, 2026-10-05), commit 8b11a93; needs on-device test.** | A ✕ button at the right of every set row in `workouts/active.tsx`. Logged (green) sets ask "Delete set N?" (Cancel / Delete); unfinished rows are removed instantly with no popup. Before, you had to un-tick a set (which left an empty row) and unfinished rows couldn't be removed at all. | S |

Bundles: **A** (JS-only, one `eas update`): B1 + B2 + B3 + B4 — do first. **B** (next native build): B6 + 1.7 icon, optionally 3.9. **C** (moved back — a new feature no competitor seems to have, so it comes after the polish and gym-safety items): B5.

### 0b. Beta-test feedback, round 2 (collected 2026-10-08, source: `beta_test_feedback.md`)
| # | Item | Details | Effort |
|---|---|---|---|
| C1 | **Whole button tappable** | Some buttons only react when the text is tapped. Audit Pressables where padding/style sits on the inner Text instead of the Pressable. | ✅ done |
| C2 | **Food search may miss matches** | Check result limits / Supabase 1000-row cap in `searchMyFoods` / `searchBasicFoods` (`src/lib/foods.ts`) and OFF 503s. Related to 1.9. | ✅ done |
| C3 | **Create-exercise inputs unreadable** | Text/placeholders not visible. Same fix as B3 / B2+B3: labels + explicit placeholder colour, ideally one shared labelled-input component. | ✅ done |
| C4 | **Default rest time** | Setting replaces the fixed 90 s. = 5.1; per-exercise stays 3.6. | ✅ done |
| C5 | **Remove redundant "+"** | In the "Log food" and "New routine" buttons. | ✅ done |
| C6 | **Create custom exercise from "Add exercise"** | During an ongoing workout; extends `ExercisePicker`. | ✅ done |
| C7 | **Saved meal as one row + meal cards** | **Decided: per-meal card** with kcal + macros highlights, tap expands inline; saved meals logged as a group row (the accordion idea is dropped). Likely 🗄 `0012` (group id on `food_log_entries`). Extends 2.2 / 2.4. | M — ✅ coded, shipped 2026-10-10 |
| C8 | **Missing-meal reminder** — ✅ coded 2026-10-12: own switch in Profile (off by default), fixed 20:30, scheduled with the food reminder in `refreshFoodReminders` (prefix `meal-reminder-`), message from `missingMealsMessage` (tested). Needs on-device test. | **Decided: 20:30.** One notification if any of breakfast / lunch / dinner has nothing logged for today (names the missing ones); snacks ignored. Extends B6 / 5.4 (same schedule-ahead + reschedule-on-log approach). 🔁 | M |
| C9 | **Unilateral vs bilateral exercises** — **parked 2026-10-12 (user's call).** Research done: StrengthLog marks exercises "one side only" and doubles volume; MacroFactor has an L/R toggle per exercise; Hevy has nothing. Our sets are plain kg × reps and we show no volume. Options if revived: (1) `per_side` flag on exercises → "kg / side" labels (S, 🗄), (2) L/R rows per set (M–L, 🗄). Ask the user what the actual pain was first. | **Research + plan first.** 🗄 | M–L |
| C10 | **Default gallery of training programs** — ✅ coded 2026-10-12, no migration: programs live in `src/lib/programs.ts` (Upper/Lower all 5×5; Push/Pull/Legs with 5×5 main / 4×5 secondary-on-same-muscle, exercises picked by the user). Workouts → "Browse Programs" → "Add to my routines" copies each routine via `saveTemplate` (names like "Upper/Lower – Upper"). Test checks every name exists in the seed SQL. No folders, filters or week progression. Needs on-device test. | **Research UX + which programs first.** 🗄 | L |
| C11 | **Rename app + new logo** | Dumbbell with a chicken on one side, broccoli on the other. 🔁 new build; extends 1.7. | S–M — ✅ decided: name **Plucky**, mascot logo (chicken with broccoli hat); assets + app.json done, needs next APK build (slug and package id unchanged on purpose) |

| C12 | **Usage dashboard (admin)** | For the owner only, to see how friends use the app once shared: sign-ups, daily/weekly active users, food entries and workouts logged per day, last seen per user, retention. Needs a decision: Supabase SQL views + an admin-only screen (admin flag/RLS) vs an external dashboard. Friends should be told what is counted (aggregates, not their food/workout contents). 🗄 | M–L |

Bundle **D** (JS-only, one `eas update`): C1, C2, C3, C4, C5, C6. Later: C7 (after the pattern decision + migration), C8 + C11 (next native build), C12 (after sharing plans are clear). C9/C10 start as research, no code.

### 0c. Audit follow-ups (code audit + review 2026-10-11, **do next session**)
Left over from `/ponytail-audit` and `/ponytail-review`; the three must-fix items and the tests/runtime/dead-code items already shipped (commit e635209). The app is shared with a few people, so these now matter.
| # | Item | Details | Effort |
|---|---|---|---|
| A1 | **Foods are visible and writable across users** 🗄 — **migration `0014_foods_private_custom.sql` written 2026-10-12** (select = shared or own). App only ever shows your own custom foods, so no code change. | `foods` select policy is `using (true)` (0002), so every user reads every other user's custom foods. Change to `created_by is null or created_by = auth.uid()` (check the SLV and OFF rows have `created_by` null so they stay visible). Needs `0014`. Check `getFoodById` and saved meals/log entries still resolve foods that another user created (a saved meal item's `foods(*)` join). | S–M |
| A2 | **Any user can insert fake shared food rows** 🗄 — **decided 2026-10-12: accept the risk** (only a few friends). Revisit (per-user cache or Edge Function) if the app is shared wider. | Insert policy allows `source = 'off'` with any numbers and no owner, so one user can poison the shared barcode cache for everyone (the first insert wins now that `upsertOffFood` skips existing barcodes). Options: only allow `source = 'custom'` inserts from the app and cache OFF foods through an Edge Function, or accept the risk and re-fetch from OFF at log time. Decide with the user. Same migration as A1. | M |
| A3 | **`startWorkout` is two requests** — ✅ done 2026-10-12 (deletes the log row if the exercise insert fails). | `lib/workouts.ts:startWorkout` creates the `workout_logs` row, then inserts the exercises. A failure between leaves an empty in-progress workout (discard fixes it). Fix: delete the log row if the second insert fails, like `saveMealFromEntries` does. | S |
| A4 | **Workout date filter is a few hours off** — skipped on purpose (no effect today). | `getWorkoutDates` (`lib/progress.ts`) uses `started_at >= 'YYYY-MM-DD'`, which is UTC midnight, not local. No effect with the 365-day window; fix only if the window is ever shortened. | S |
| A5 | **Tests for the two data fixes** | `upsertOffFood` and `saveTemplate` have no automated test (a mock would only echo the code). Do a manual check instead after each APK: pick/scan the same branded food twice, edit a routine and save it offline. Or add a test against a real Supabase test project. | S |
| A6 | **Failed deletes show no message** — ✅ done 2026-10-12: routine delete, discard workout, delete past workout, delete set, food diary entry/meal delete now show the alert. | Found on-device 2026-10-12 (no connection, nothing happens). `handleDelete` in `workouts/[templateId].tsx` and `handleDiscard` in `workouts/active.tsx` await the delete with no try/catch, so a failure is silent and the screen stays put. Add `try/catch` with `Alert.alert('Could not delete', 'Check your connection and try again.')`, same wording as `food/[foodId].tsx`. Check other delete buttons for the same gap. | S |

On-device results 2026-10-12: with no connection, listing exercises, saving a routine and deleting a routine all fail without changing data (routine stayed intact). Routines are online-only by design; only set logging is queued offline.

### 1. Known gaps in our own app (quick wins, high value)
| # | Improvement | Why | Effort |
|---|---|---|---|
| 1.1 | **done 2026-10-05, tap a diary row to edit (recalculates from the food as it is now)** — **Edit a logged food entry** (tap a row → change grams/meal). Today you can only delete. | Every competitor has it; fixing a typo now means delete + re-log. | S–M |
| 1.2 | **done 2026-10-05** — **Smart default meal** from time of day (breakfast before 10, lunch 10–14, dinner 17–21, else snack). Today it always defaults to "Snack". | One less tap on every log. | S |
| 1.3 | **done 2026-10-05; also serving size on custom foods (new-food form + "Add/Edit serving size" on the food page, creator only)** — **Log in servings, not only grams** (`serving_size_g` is already stored; `quantity_unit` already allows `'serving'`). E.g. "1 bar (45 g)". | Branded products are eaten in pieces, not grams. | S–M |
| 1.4 | **done 2026-10-05** — **Meal totals** (kcal per breakfast/lunch/...) in the diary. | Lifesum/MFP show it; helps see where calories go. | S |
| 1.5 | **Edit past workouts** (fix a weight/reps after finishing). Today only delete. | Common mistake after the session. | M |
| 1.6 | **done 2026-10-05, `src/lib/pendingSets.ts`; sets only, starting/finishing a workout still needs signal** — **Offline-safe set logging.** Sets are saved over the network on ✓; in a basement gym with no signal that fails. Queue failed saves locally and retry. | Data loss risk in a real gym. Check during beta. | M |
| 1.7 | **App icon + splash screen** — done in code (generated blue dumbbell, `assets/`); ships with the next APK build. 🔁 | Feels like a real app on the home screen. | S (+ rebuild) |
| 1.8 | **done 2026-10-05, no hex colors left in screens** — Move the remaining screens onto `src/theme.ts` (food, progress, workouts list, auth). | Consistent look; needed for dark mode later. | M |
| 1.9 | Switch Open Food Facts search to `search.openfoodfacts.org` (old endpoint often returns 503). | Branded search often fails today. | ✅ done 2026-10-12 (`search.openfoodfacts.org`, `langs=sv,en`) |
| 1.10 | **done 2026-10-12, shipped via `eas update`; "Confirm signup" template now holds only `{{ .Token }}`** — Email-verification link → code (same approach as forgot password). SMTP is already set up. | The current link lands on a dead localhost page. Only matters for new accounts. | S |
| 1.11 | **Web part done 2026-10-12, see "Testing the app on web" under Environment; Maestro/emulator (b) not started** — **Testing strategy so Claude can test the real app itself** (added 2026-10-12, user's request). Today only jest unit tests exist; every screen change waits for the user to try it on the phone. Options to decide: **(a)** web build in Chrome (`expo start --web`, driven by Claude in Chrome): cheapest, but camera/barcode, notifications and vibration don't run on web, and `react-native-web`/`react-dom` aren't installed yet; **(b)** Android emulator + Maestro flows (tap/type/assert scripts in YAML): the real native app, but needs the Android SDK (not installed on this PC) and a dev build 🔁; **(c)** both, web for quick checks and Maestro for a few key flows (log food, finish a workout). Either way: a separate Supabase test account with seed data, so tests never touch the user's real diary. | Catch bugs before they reach the phone; fewer "please test this" rounds. | M–L |
| 1.12 | **APK update banner for testers** (added 2026-10-12; user chose this over Play internal testing and plain link-sharing; recipients = user + a few friends). Problem: after a 🔁 build, phones on the old APK silently stop getting `eas update`s (different runtime fingerprint) and nobody knows a new APK exists. Plan: 🗄 `0017` table `app_releases` (`version_code int`, `install_url text`, `notes text`, `created_at`), select for signed-in users, no app writes (rows added by SQL after each build). App reads its own build number (`expo-application` `nativeBuildVersion`, check the SDK docs; needs `"autoIncrement": true` on the `preview` profile so every build gets a higher number) and, if the newest row is higher, shows a banner on Home: "New version available → Download", which opens the EAS install page (`Linking.openURL`). Release step after each `eas build`: insert a row with the build's install link. The banner itself needs one APK build 🔁 to reach phones; friends install that one by link. | Testers never get stuck on an old version without knowing. | M |
| 1.13 | **Send app emails from an app address, not the user's personal Gmail** (added 2026-10-12, user's request). Today Supabase custom SMTP uses the user's own Gmail (app password "FitTrack", `smtp.gmail.com:465`), so reset codes come from their private address. Options: **(a)** a new free Gmail just for the app (e.g. a "Plucky" account) with its own app password: same setup, 5 minutes, but still looks like a hobby address and Gmail caps sending at ~500/day; **(b)** an email service such as Resend or Brevo (free tier) with your own domain: looks professional and is the right choice for the store release, but needs a domain (~100 kr/year) and DNS records (SPF/DKIM). Either way it's a dashboard change only (Supabase → Authentication → SMTP), no app code; then send a test reset code. Ties into the "On hold" email items and 2b. | Privacy: strangers shouldn't see the user's personal email; needed before the store release. | S |
| 1.14 | **UI/UX review pass of the whole app** (added 2026-10-18, user's request, do later). Go screen by screen with the Expo design skills (`expo:expo-design-system`, `expo:expo-native-ui`; Android only, so skip Apple-only advice) and Nielsen's 10 usability heuristics (same lists the factory's ui-reviewer and ux-reviewer use). Output first: a ranked findings list + suggested fixes per screen, no code; the user picks what to build (then via `/pm`). Also decide here whether the "bigger UX overhaul" happens, since dark mode (5.6, branch `dark-mode`) waits on it. Optional input: UI/UX Pro Max skill for a design direction. | Consistent, native-feeling app before more features and before the store release. | M–L |

### 2. Food — features competitors have that we don't
| # | Feature | Seen in | Effort |
|---|---|---|---|
| 2.1 | **done 2026-10-05, per-meal "Copy from previous day" (no whole-day button yet)** — **Copy meal / copy yesterday** ("same breakfast as yesterday"). | MFP, Lifesum | S–M |
| 2.2 | **done 2026-10-05, migration 0011** — **Saved meals / recipes** (a group of foods logged in one tap, e.g. "Overnight oats"). 🗄 | MFP "My Meals", Lifesum, Cronometer | M |
| 2.3 | **done 2026-10-05 but the entry button was removed (user found it pointless); only editing old entries remains** — **Quick add** (type kcal + macros directly, no food needed). 🗄 (`food_id` is required today) | MFP, MacroFactor | S–M |
| 2.4 | **done 2026-10-05** — **Lifesum-style diary** (calorie ring on the Food tab, "+" per meal that pre-selects the meal, recent foods). Reuses the Home ring. | Lifesum | M |
| 2.5 | **Water tracker** (glasses per day on Home/Food). 🗄 | Lifesum, MFP | ❌ dropped (user, 2026-10-12) |
| 2.6 | **done 2026-10-12, migration 0015 (`favourite_foods`, own rows only)** — ☆/★ on the food page; search shows Favourites, then My foods (now **most logged first**, counted over the 500 latest matching entries), then Basic + Branded. Favourites also sit above Recent when the search box is empty. — **Favourites** (star a food; shown first in "My foods"). 🗄 | most apps | S |
| 2.7 | Fiber/sugar/sodium on the food page + optional fiber goal (fields already exist). | Cronometer | ❌ dropped (user, 2026-10-12) |
| 2.8 | *Later / bigger:* AI photo or text logging ("2 eggs and a toast") via the Claude API. Needs a server-side key (Supabase Edge Function) and costs money per call. | MFP Meal Scan, MacroFactor, Lifesum | L |
| 2.9 | *Later / bigger:* adaptive calorie goal from weight trend + intake (MacroFactor's main idea). We already have both data series. | MacroFactor | L |

### 3. Workouts — features competitors have that we don't
| # | Feature | Seen in | Effort |
|---|---|---|---|
| 3.1 | **done 2026-10-05, `src/lib/records.ts`; 🏆 on the exercise page, in the active workout and on the summary** — **Personal records** (🏆 when a set beats your best weight / estimated 1RM; list per exercise). Data is all there. | Strong, Hevy, StrengthLog | M |
| 3.2 | **done 2026-10-05, Weight / Est. 1RM switch on the exercise chart** — **Estimated 1RM trend** on the exercise page (Epley formula) next to max weight. | Strong | S |
| 3.3 | **Workout notes** + per-exercise notes ("seat at 4"). 🗄 | Strong, Hevy | S–M |
| 3.4 | **Set types**: warm-up / drop set / failure; warm-ups excluded from PRs and volume. 🗄 | Strong, Hevy | M |
| 3.5 | **Plate calculator** (tap a weight → plates per side). | Strong | S |
| 3.6 | **Per-exercise rest time** (today a fixed 90 s for everything). 🗄 | Strong, Hevy | S–M |
| 3.7 | **Supersets** (group 2 exercises, rest after the pair). 🗄 | Strong, Hevy | M–L |
| 3.8 | **done 2026-10-05, volume vs last workout of the same name + new-records box** — **Finish summary with highlights** (duration, volume vs last time, new PRs). Extends `log/[logId].tsx`. | Hevy | S–M |
| 3.9 | *Later:* rest-timer notification while the phone is locked (expo-notifications). 🔁 | Strong, Hevy | M |

### 4. Progress & motivation
Withings scale sync is B5 in section 0 (deprioritised: new feature, do after the quick wins).

| # | Feature | Effort |
|---|---|---|
| 4.1 | Weight chart: 7-day moving average line + range (30/90/365 days). Daily weight jumps around; the trend is what matters. | S–M |
| 4.2 | Weekly sets per muscle group. | M |
| 4.3 | Body measurements (waist, etc.) and progress photos. 🗄 (photos need Supabase Storage) | M–L |
| 4.4 | Calorie/protein goal hit-streak on Home (like the workout streak). | S |
| 4.5 | **done 2026-10-12** — Same range picker on the weight and workouts cards: a row of 30 days · 90 days · 1 year (`RangeTabs` in `progress.tsx`) instead of the old dropdown on Workouts. | S |

### 5. Settings that are missing
| # | Setting | Effort |
|---|---|---|
| 5.1 | **Default rest time** (and per exercise, see 3.6). | S |
| 5.2 | **Goal helper**: suggest calories/macros from weight, height, age, activity and goal (lose/keep/gain). `profiles` already has `height_cm`, `sex`, `date_of_birth` (user earlier said they only wanted name in Profile — ask before adding these fields to the UI). | M |
| 5.3 | **Different goals on training vs rest days.** 🗄 | M |
| 5.4 | **Reminders** ("log your lunch", "weigh in Monday morning"). 🔁 expo-notifications. Food reminder promoted — see B6. | M |
| 5.5 | **Export my data** (CSV of food log, workouts, weight) via share sheet. | M |
| 5.6 | Dark mode (after 1.8). **Built on branch `dark-mode`, not merged (see 0c).** 🔁 | M |
| 5.7 | Change password / delete account (from Profile). | S–M |
| 5.8 | **Swedish language** (added 2026-10-18, user's request, later). Move all on-screen text into translation files (English + Swedish) and pick the language from the phone setting, maybe with a switch in Profile. Open: which i18n library (check Expo docs, e.g. `expo-localization` + i18n-js; may need 🔁 if it adds native code), whether food names/notifications/emails are translated too, number/date format (decimal comma, see F4). Best done before the store release. | M–L |

### 6. Deliberately not proposed
Social feed/friends (Hevy), diet-pattern scores (Lifesum), 80+ micronutrients (Cronometer), coaching programs (StrengthLog), wearables — too big or not useful for a single user.

### 7. Later — feature ideas (added 2026-10-14, when there's time)
Not scheduled. **Before building any of these, grill the user on the open questions one at a time.** Builds on C10 (program gallery has no week progression yet).

| # | Feature | Details | Effort |
|---|---|---|---|
| 7.1 | **Program scheduling** (routines over time) | Run a program (premade like Push/Pull/Legs, or own selected routines) for a set number of weeks or indefinitely. 🗄 | M–L |
| 7.2 | **Preload last performance** | Remember last-used sets, reps and weight from the last time the program/routine was used; preload them when starting it again. Foundation for 7.3–7.5. | M |
| 7.3 | **Linear progression** | All sets unchanged from preload and all marked completed → next session weight += **X** (Profile setting). | M |
| 7.4 | **Double progression** | Same trigger → next session reps += **A** while reps are between **Y** and **Z**; at the top of the range reset reps to Y and weight += X. A, Y, Z = Profile settings. (User wrote "if A >= Z, reset A = Y" — confirm meaning.) | M |
| 7.5 | **Triple progression** | Like 7.4 but increase reps first, then sets, then weight. | M |
| 7.6 | **Kids / parents sports app** (branch off Plucky) | Training app for kids, or parents training their kids in sports (soccer, tennis etc.). Drills/skills and milestones instead of load; multiple kids per account; gamification. Risks: child data/GDPR (parent-owned accounts, photos/video), age-appropriate load, drill content per sport. | L+ |

**Suggested build order for 7.1–7.5:** lock spec → data model (schedule, progression settings, last-performance lookup) 🗄 → 7.2 preload → progression engine as pure functions + unit tests → 7.1 scheduling UI → Profile settings (X, A, Y, Z, set range) → on-device test.

**Open questions (ask one at a time):**
- Q1: 7.4 — confirm the logic; does +A apply to all sets or one set per session?
- Q2: progression gated per exercise or per whole routine?
- Q3: global progression settings or per exercise?
- Q4: user changes preload (more/less) — what happens next session?
- Q5: 7.5 — set range and reset rules?
- Q6: schedule model — rotation vs fixed weekdays; what happens when the program ends?
- Q7: 7.6 primary user — parent with 1–3 kids or youth coach with a team?
- Q8: 7.6 separate app with shared core (monorepo) vs a mode inside Plucky?
- Q9: 7.6 which sports first?
- Q10: 7.6 progression model for kids (skill levels/milestones)?
- Q11: 7.6 child data/GDPR approach?
- Q12: 7.6 drill content source (own library, demo videos)?

### Suggested order (recommendation)
1. Beta-test fixes (section 0, bundle A: B1–B4) →
2. ~~Quick food wins: 1.1, 1.2, 1.3, 1.4, 2.1~~ (done) →
3. ~~Gym safety + motivation: 1.6, 3.1, 3.2, 3.8~~ (done) →
4. ~~Saved meals (2.2) + quick add (2.3)~~ (done) →
5. ~~Look & feel: 1.8 theme, 2.4 Lifesum diary~~ (done; 1.7 icon already built) →
6. ~~Beta round 2, bundle D (C1–C6)~~ (done) → then C7, C8, C11, research C9/C10 (section 0b) →
7. Bigger bets to discuss: 5.2 goal helper / 2.9 adaptive goal, 2.8 AI logging.
8. When there's time: section 7 (program scheduling, progression, kids app).

Sources: MyFitnessPal (Meal Scan, Quick Add, My Meals), MacroFactor (adaptive targets), Cronometer (micronutrients), Lifesum (diet patterns, water/habits), Strong (plate calculator, PRs, 1RM, CSV export), Hevy (social, set types), StrengthLog (programs) — 2026 comparison articles.
