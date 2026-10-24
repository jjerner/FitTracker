# Plucky — project notes

How the project works: setup, testing, shipping, database, gotchas and design decisions. Change this file only when something lasting changes.
What to build next lives on the [Plucky roadmap board](https://github.com/users/jjerner/projects/1); phone tests are issues labelled `phone-test`; what was built is in the PRs and `git log`. UI rules: `docs/design-system.md`.

## Environment

- Node: managed via **nvm-windows** (`nvm use 22`). The standalone system Node install was removed — don't reinstall Node directly, always go through nvm.
- Each new terminal/tool session needs its PATH refreshed to see nvm's Node:
  ```powershell
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
  ```
- `.env` (gitignored) holds `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` — already set up, no action needed unless rotating keys.
- The installed APK (or a development build) is needed on the phone; the app uses native modules, so Expo Go is not enough.
- `npx expo-doctor` after adding any native dependency.

## Testing the app on web (Claude in Chrome)

- Start: `npx expo start --web --port 8081` (run in background), open `http://localhost:8081` with Claude in Chrome. Web deps: `react-dom`, `react-native-web`, `@expo/metro-runtime` (JS only, native fingerprint unchanged).
- Log in with the **test account** in `.env.test.local` (gitignored; `TEST_EMAIL` / `TEST_PASSWORD`). Never use the owner's own account. It sees shared foods but not the owner's diary.
- Sign-up UI can be tested by "signing up" with the test account's email: Supabase returns no session and sends nothing, so the code screen shows without creating an account. Don't tap "Send again" there.
- **Can't be tested on web:** branded search (`search.openfoodfacts.org` sends no CORS header), barcode camera, notifications/reminders, vibration. These become `phone-test` issues.
- **Past-dated test data** (e.g. weeks of weigh-ins): the app can only log today's weight, and Claude can't insert rows itself (the permission guard blocks using the app's key/session from a script). Write a one-off SQL for the test account for the owner to paste, or test that part on the phone.
- Chrome screenshots sometimes time out right after a click; a fresh tab fixes it. The Chrome window stays maximized, so screens show wide, not phone-sized. Ignore the Myki password-manager popup at the bottom left.

## Workflow

- **`/pm`** = standup from the board; **`/pm <ids>`** = specs for a batch, one grilling, then each item is built on its own branch `factory/<id>-<slug>` and opened as a PR; low-risk PRs auto-merge, the rest wait in "Validation / Demo"; **`/pm close`** = ship (`eas update`), board check, left-behind check. **`/factory <idea>`** = the same line for one off-roadmap item.
- Lives in the owner's global `~/.claude`: `commands/pm.md`, `commands/factory.md`, `agents/`, `factory/` (live dashboard at http://127.0.0.1:7777/, events in `factory/events.jsonl`).
- **CI** (`.github/workflows/ci.yml`): tsc, lint and jest on every PR and push to master. Tests: `npm test`, in `src/lib/__tests__/`.
- New feedback from testers goes on the board as an issue with the `beta-feedback` label.

## Shipping

- **JS-only changes:** `npx eas-cli@latest update --channel preview --environment preview --message "..." --non-interactive` (`--environment` is required in non-interactive mode). Phones pick it up after 1–2 restarts.
- **Native changes** (new native package, `app.json` plugins, version bump) need a new APK: `npx eas-cli@latest build -p android --profile preview`, installed by link. Free-tier builds can sit in the queue for 1–2+ hours in the evening (Europe); not an error.
- **SQL migrations:** the owner pastes them into Supabase **before** the JS that needs them ships.
- **Updates must match the installed APK's runtime.** `runtimeVersion` policy is `fingerprint` (top level of `app.json`): each build gets a label from its native contents and `eas update` only reaches builds with the same label. APK build 1 (2026-10-11) = `9b3806424e…`, APK build 2 (2026-10-18) = `f04d8d342b…`; normal updates target build 2, so every tester should be on build 2. Check a fingerprint with `npx eas-cli@latest fingerprint:compare <hash>`.
- Keep JSON files on LF (`.gitattributes`): CRLF in `eas.json`/`app.json` changes the fingerprint. If `app.json` shows as modified after an update, `git checkout app.json`.
- Setup: Expo account `jjerner`, project `@jjerner/FitTrack`, package id `com.jjerner.fittrack` (kept on purpose after the rename to Plucky), `preview` profile = internal APK, channel `preview`, environment `preview` (Supabase URL/anon key are EAS env vars there), keystore in the cloud. Mic permission disabled (`recordAudioAndroid: false`).

### After each `eas build`

- `autoIncrement` is on for the preview profile. Paste one row per new APK into the Supabase SQL editor; phones on an older build then see "New version available → Download" on Home. The `versionCode` is on the EAS build page or from `npx eas-cli build:version:get -p android`.
  `insert into public.app_releases (version_code, install_url, notes) values (<versionCode>, 'https://expo.dev/accounts/jjerner/projects/FitTrack/builds/<build-id>', '<short note>');`

## Database

- Migrations live in `supabase/migrations/*.sql`, applied by the owner pasting them into the Supabase SQL Editor (no CLI link; Claude has only the anon key). **`0001`–`0020` and `0022` are applied** (0022 confirmed 2026-10-24). `0023` is FIX-3: paste it only after its `eas update` (merge → `eas update` → paste 0023), because old app versions can't save OFF foods under the 0023 rule.
- Next free number: **`0024`** (`0021` is planned by the drop-sets spec, `specs/3.4b-drop-sets.md`; `0022` is AU-1; `0023` is FIX-3).
- Supabase auth: custom SMTP via the owner's own Gmail (app password "FitTrack", `smtp.gmail.com:465`; moving off it is #17). Sign-up and reset templates hold only `{{ .Token }}` (no links — Gmail's link scanner could burn the code); the app uses `verifyOtp`. The "Site URL" is still `localhost:3000`; it only matters if a link-based email is added.
- OFF foods are saved per user (0023). Old shared OFF rows stay readable for old diary entries, but scans never pick them.

## Known gotchas

- **Never rewrite source files with PowerShell `Get-Content`/`Set-Content`** — it mangles UTF-8 (🔥 turned into `ðŸ”¥`, a BOM crept in). Use the Edit/Write tools or a Node script with explicit `utf8`. Check for damage: grep `src` for `Ã|â€|ðŸ`.
- **Don't remove `.npmrc`** (`legacy-peer-deps=true`): EAS Build runs strict `npm ci`, which fails on the optional web-only `react-dom` peer without it.
- `foods` barcodes are unique **per owner** (partial index `foods_barcode_owner_key`, migration 0022), and a partial index doesn't work as a PostgREST `onConflict` target. So `upsertOffFood` does a plain insert and ignores `23505` (barcode already saved) instead of an upsert.
- Supabase caps a request at 1000 rows: read aggregates from the `daily_nutrition` view, not raw rows.
- After any direct Supabase write that isn't done through a React Query mutation hook, `queryClient.invalidateQueries(...)` the relevant key or the UI won't update.
- `StyleSheet.absoluteFillObject` no longer exists (RN 0.86) — use explicit `position: 'absolute', top/right/bottom/left: 0`.
- The `react-hooks/refs` lint rule rejects reading a ref during render, including inside a `useState` initializer. Use a module-level counter or state instead (see `newRow` in `workouts/active.tsx`).
- `expo-symbols` on Android takes Material Symbols names (`{ ios: 'house.fill', android: 'home' }`); tsc checks the names.
- EAS build logs (`build:view --json` → `logFiles`) are gzipped JSON lines; PowerShell's `Invoke-WebRequest` mangles them, so fetch with Node's `fetch` + `zlib.gunzipSync`.
- Reset/sign-up codes: each new send invalidates the previous code, and Gmail threads same-subject emails with the **oldest first** — "token has expired or is invalid" usually means an old code.
- The Livsmedelsverket import script isn't in the repo (one-off). To re-fetch: `GET https://dataportal.livsmedelsverket.se/livsmedel/api/v1/livsmedel?offset=0&limit=3000&sprak=1` for the list, then `.../livsmedel/{nummer}/naringsvarden?sprak=1` per food (kcal = `forkortning` `Ener` with `enhet` `kcal`; `Prot`, `Kolh`, `Fett`, `Fibe`, `Mono/disack`, `Na`).

## Architecture quick reference

- `src/app/` — Expo Router routes only. `src/components/` shared UI, `src/hooks/` React Query hooks per feature, `src/context/` (`AuthProvider` session, `DiaryDateProvider` = which day the food diary shows / logs to, wraps the whole tab navigator).
- `src/lib/` data access: `supabase.ts` client, `foods.ts` (foods, diary, goals, saved meals, recent foods), `openFoodFacts.ts`, `workouts.ts` (exercises, routines, workout logs, `MOVEMENT_PATTERNS`), `progress.ts` (body weights, chart data), `records.ts` (PRs), `pendingSets.ts` (offline set queue), `reminders.ts`, `programs.ts` (program gallery), `settings.ts` (device-only settings in AsyncStorage), `dateUtils.ts` (dates are `YYYY-MM-DD` strings in device time).
- `src/theme.ts` — design tokens; see `docs/design-system.md`.
- No Redux/Zustand — React Query + Context only.

## Design decisions (owner's calls, keep unless asked)

- **Food search** order: Favourites → My foods (most logged first) → Basic foods (Livsmedelsverket, every query word must match) → Branded (Open Food Facts). Sections are fetched with `Promise.allSettled` so one failing doesn't hide the others.
- Quick add has no entry button any more (owner found it pointless); `food/quick-add.tsx` only edits old quick-add entries.
- Tracked exercises on Progress show only *logged* values, never an estimated 1RM.
- Exercise swap never changes the routine (template).
- Weight is not on Home.
- Dark mode (#26) lives on branch `dark-mode`, not merged; it waits on the UI/UX pass (#28).

## Workout design notes

- An **in-progress workout** is a `workout_logs` row with `completed_at = null`. Sets are inserted as soon as they're ticked ✓ (queued offline if there's no signal), so a killed app loses nothing; the Workouts home shows a "Resume" button. Starting a new workout is hidden while one is in progress.
- Active workout: unsaved rows are local state; grey placeholders = previous session's same set → routine target → last set. Tapping a green ✓ deletes the set and puts its numbers back in a row.
- Routines are saved by deleting and re-inserting all `workout_template_exercises` rows (simpler than diffing); new exercises are inserted before the old ones are deleted. Routines are online-only by design.
- Cardio sets store `duration_s` / `distance_m`; the UI shows minutes / km.
- Query keys: `['exercises', userId]`, `['workoutTemplates', userId]`, `['workoutTemplate', id]`, `['workoutHistory', userId]`, `['workoutLog', id]`, `['exerciseHistory', userId, exerciseId]`. Progress: `['bodyWeights', userId]`, `['dailyNutrition', userId]`, `['workoutDates', userId]` (the latter two are invalidated whenever the Progress tab gains focus; Home invalidates `workoutDates` + `workoutHistory` on focus; finishing a workout invalidates `exerciseHistory`). Also `['trackedExercises', userId]`, `['savedMeals', userId]`, `['recentFoods', userId]`. Food/profile: `['foodDiary', userId, date]`, `['nutritionGoals', userId]`, `['displayName', userId]`, `['restVibration']` (device setting).
