# FitTrack

A mobile app for tracking workouts and food (calories & macros).

Built with [Expo](https://expo.dev) (React Native + TypeScript) and [Supabase](https://supabase.com) (Postgres, Auth).

## Status

- ✅ Auth (email/password) + tab shell
- ✅ Food logging: manual search, barcode scanning, daily diary, custom foods, nutrition goals
- 🚧 Workout logging: exercise catalog, templates, active sessions — not started
- 🚧 Progress charts — not started

See `HANDOVER.md` for detailed session notes and next steps.

## Setup

### Requirements

- Node 22 (managed via [nvm-windows](https://github.com/coreybutler/nvm-windows) — run `nvm use 22`)
- [Expo Go](https://expo.dev/go) app on your phone
- A Supabase project (free tier)

### Environment variables

Create a `.env` file in the project root (not committed):

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

Find these in your Supabase project under **Settings → API**. Use the **anon/publishable key**, never the secret key.

### Database

Run the SQL files in `supabase/migrations/` in order, in the Supabase dashboard's **SQL Editor**.

### Run

```
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone.

## Development

```
npx tsc --noEmit    # typecheck
npx expo lint       # lint
npx expo-doctor     # check native dependency config after installing new packages
```

See `AGENTS.md` for project conventions (Expo Router structure, dependency install rules, etc.).
