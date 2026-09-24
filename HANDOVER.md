# FitTrack — Handover

Workout + food (calorie/macro) tracker. Expo (React Native + TypeScript) app, Supabase backend.
Full plan: `C:\Users\jerne\.claude\plans\help-me-plan-what-mellow-sketch.md`

## Status

**Phase 1 (Foundation) — done.** Expo Router, Supabase email/password auth, tab shell.
**Phase 2 (Food logging) — done.** Manual search, barcode scanning, diary, custom foods, nutrition goals.
**Phase 3 (Workout logging) — not started.** Next up: exercise catalog, templates, active workout sessions, session history. See plan doc for schema/screens.
**Phase 4 (Progress & polish) — not started.**

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

**When adding Phase 3 tables**, write new numbered migration files and ask the user to run them the same way.

## Known gotchas hit this session

- Supabase's default "Site URL" is `localhost:3000`, so the email-verification link redirects to a dead localhost page after confirming. Cosmetic only — verification succeeds before the redirect. Planned fix: point it at a proper deep link in Phase 4 polish.
- A `.upsert(..., { onConflict: 'barcode' })` needs a **non-partial** unique constraint on that column — a partial index (`WHERE barcode IS NOT NULL`) doesn't work as an ON CONFLICT target. Fixed in `0003`. Keep this in mind for any future upsert-by-nullable-column tables.
- After any direct Supabase write that isn't done through a React Query mutation hook, remember to `queryClient.invalidateQueries(...)` the relevant key or the UI won't reflect it (hit this with the food diary).

## Architecture quick reference

- `src/app/` — Expo Router routes only (see plan doc for full intended tree)
- `src/lib/supabase.ts` — Supabase client
- `src/lib/foods.ts` — data access for foods/food_log_entries/nutrition_goals
- `src/lib/openFoodFacts.ts` — Open Food Facts API client
- `src/hooks/` — React Query hooks per feature
- `src/context/AuthProvider.tsx` — session state
- No Redux/Zustand — React Query + Context only, per plan.

## Next session should

1. Read the plan doc's Phase 3 section (exercise catalog, templates, active workout logging, schema for `exercises`/`workout_templates`/`workout_logs`/`workout_log_sets`).
2. Write `0004_workouts.sql` migration, have user run it.
3. Build exercise catalog + template CRUD + active workout screen, following the same pattern as food logging (lib data-access file, hooks, screens under `src/app/(tabs)/workouts/`).
