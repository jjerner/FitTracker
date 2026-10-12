@AGENTS.md

## Definition of done for every feature or fix

Before calling a change done (and before `eas update` or a build):

1. Run `npx tsc --noEmit` and `npx expo lint`.
2. Run `/ponytail-review` on the change and fix what it finds (or ask the user about anything that needs a decision).
3. When the change has something to see or tap, test it yourself in the real app on web: `npx expo start --web --port 8081`, open `http://localhost:8081` with Claude in Chrome, log in with the test account from `.env.test.local` (never the user's own account). Click through the changed flow and check the console for errors.
4. Things web can't run (barcode camera, notifications/reminders, vibration, branded Open Food Facts search because of CORS) go on the user's phone test list in HANDOVER.md instead.
5. Tell the user what was reviewed and what was tested, and what still needs the phone.

Setup details and known web limits: HANDOVER.md → "Testing the app on web".
