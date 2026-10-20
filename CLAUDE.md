@AGENTS.md

## Design system

Before designing, building or reviewing any UI, read `docs/design-system.md`. It covers Plucky's tone, colours, text ladder, shared components (`AppText`, `Button`, `Card`, `EmptyState`) and the rules for new UI. It wins over the global ux-ui-guidelines skill.

## Definition of done for every feature or fix

Before calling a change done (and before `eas update` or a build):

1. Run `npx tsc --noEmit` and `npx expo lint`.
2. Run `/ponytail-review` on the change and fix what it finds (or ask the user about anything that needs a decision).
3. When the change has something to see or tap, test it yourself in the real app on web: `npx expo start --web --port 8081`, open `http://localhost:8081` with Claude in Chrome, log in with the test account from `.env.test.local` (never the user's own account). Click through the changed flow and check the console for errors.
4. Things web can't run (barcode camera, notifications/reminders, vibration, branded Open Food Facts search because of CORS) go on the user's phone test list in HANDOVER.md instead.
5. Tell the user what was reviewed and what was tested, and what still needs the phone.

Setup details and known web limits: HANDOVER.md → "Testing the app on web".

## Roadmap (read by /pm)

- Roadmap: GitHub Project "Plucky roadmap" (https://github.com/users/jjerner/projects/1), one issue per item in `jjerner/FitTracker`. Read it with `gh project item-list 1 --owner jjerner --format json` (fields: Status Todo/In Progress/Done, Area, Effort, Roadmap ID). Labels: `sql` = migration the user pastes into Supabase, `apk-build` = needs a new APK build, `needs-decision` = open question first, `beta-feedback`. Item ids are the "Roadmap ID" (e.g. B1, 5.8) or the issue number. Add new items as issues on the board. HANDOVER.md → "Proposed roadmap" is the older history (done items, background).
- New feedback: the newest `beta_test_feedback_*.md` (unchecked `- [ ]` lines).
- Shipping is `eas update` / `eas build` (see HANDOVER.md). Only run them when the user says so.
