# Plucky (FitTrack)

A mobile app for tracking food (calories and macros) and gym workouts. Android, shared with a few beta testers.

Built with [Expo](https://expo.dev) SDK 57 (React Native + TypeScript, Expo Router) and [Supabase](https://supabase.com) (Postgres, Auth).

## Features

- **Food:** search (basic foods + Open Food Facts), barcode scan, daily diary with calorie ring and meal cards, custom foods, servings, favourites, saved meals, copy a meal from yesterday, nutrition goals, reminders when food or a meal is missing
- **Workouts:** exercise catalog, routines, program gallery (Upper/Lower, Push/Pull/Legs), active workout with rest timer, offline-safe set logging, personal records, estimated 1RM, edit past workouts
- **Progress:** body weight with 7-day trend, workout history, nutrition over time
- **Account:** email sign-up with a code, password reset

Roadmap: [Plucky roadmap board](https://github.com/users/jjerner/projects/1). Project notes (setup, shipping, gotchas): `docs/PROJECT_NOTES.md`.

## Setup

### Requirements

- Node 22 ([nvm-windows](https://github.com/coreybutler/nvm-windows): `nvm use 22`)
- A Supabase project (free tier)
- The installed APK or a development build on your phone (the app uses native modules such as notifications, so Expo Go is not enough)

### Environment variables

Create a `.env` file in the project root (not committed):

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

Find these in Supabase under **Settings → API**. Use the anon/publishable key, never the secret key.

### Database

Run the SQL files in `supabase/migrations/` in order in the Supabase **SQL Editor**.

### Run

```
npm install
npx expo start          # phone (dev build)
npx expo start --web    # browser, for quick checks
```

## Development

```
npx tsc --noEmit    # typecheck
npx expo lint       # lint
npm test            # unit tests (jest)
npx expo-doctor     # check native dependency config after installing packages
```

CI (`.github/workflows/ci.yml`) runs typecheck, lint and tests on every pull request.

Web can't run the barcode camera, notifications, vibration or branded Open Food Facts search (CORS); those are tested on the phone.

See `AGENTS.md` for project conventions and `CLAUDE.md` for the definition of done.

## Shipping

- **JS-only changes:** `npx eas-cli@latest update --channel preview --environment preview --message "..." --non-interactive`. Phones pick it up after a restart or two.
- **Native changes** (new native module, app.json config): a new APK with `npx eas-cli@latest build --profile preview --platform android`, installed by link.
- **SQL migrations:** paste them into Supabase before shipping the JS that needs them.
