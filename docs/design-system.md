# Plucky design system

Plucky's own look-and-feel rules. Read this before you design, build or review any UI.
The global `ux-ui-guidelines` skill covers general usability, and its hard rules always apply.
On taste (tone, colours, components) this file wins.

Plucky ships on **Android only** (sideloaded APK). Skip iOS-only advice (HIG, SF Symbols).

## Tone

Friendly and plain. Plucky is a gym-and-food buddy, not a dashboard: short, everyday words, no
jargon, no shouting. The look is calm and clear first. Fun is a small extra, never decoration that
pushes the task down the screen.

## Colour

All colours live in `colors` in `src/theme.ts`. Never write a hex value in a screen or component.

- **Blue `primary` (#2563eb)** means "you can act here": buttons, links, the selected tab. It stays
  because it is calm, reads well with white text, and is already everywhere.
- **Yellow `accent` (#ffd23f)** is the mascot's colour, used only for small fun touches (badges,
  mascot moments). Text on yellow uses `onAccent`, never white. Never use yellow for buttons or as a
  big background. Streaks keep their own orange `streak`.
- `success` / `danger` / `warning` carry meaning (done, delete, careful). Don't use them as decoration.
- **Dark mode is planned** (issue #26). Taking every colour from `colors` keeps that job to one
  place, but it is not free. Styles built with `StyleSheet.create` at import time read `colors` once,
  so dark mode will need a `useColors()` hook (or similar), and screens will read colours at render
  time. Keep colours in `colors` so that change stays mechanical.

## Text ladder

Use `<AppText variant="...">` (`src/components/AppText.tsx`), not `fontSize`. The steps live in
`typography` in `src/theme.ts`:

| Variant   | Size / weight | Use for                       |
|-----------|---------------|-------------------------------|
| `title`   | 28 / 700      | big numbers, hero text        |
| `heading` | 20 / 600      | section titles (announced as a heading) |
| `body`    | 16 / 400      | normal text (default)         |
| `label`   | 16 / 600      | button text, row titles       |
| `labelSmall` | 14 / 600   | field labels, table numbers, active tab |
| `small`   | 14 / 400 grey | secondary text                |
| `caption` | 12 / 400 grey | hints, timestamps             |

- Only the weights 400, 600 and 700 are used.
- Screen titles come from the navigation header, not from `title`. Exception: the Auth screens hide the header, so their in-screen heading uses `title`.
- To colour text, pass a token: `<AppText style={{ color: colors.danger }}>`.
- When an old screen moves over, 15 rounds to 16 and 13 rounds to 14. Check that table columns
  still fit.
- **Exception:** chart axis labels and tiny footnotes (10–11) may stay as they are, and glyph icons
  (‹ › + ✕ ✓ ★ ☆ ▾ ▸) until the app has an icon set.

## Spacing and corners

- `spacing`: xs 4, sm 8, md 12, lg 16, xl 24, xxl 32. Use `gap` with these for layout.
- `radius`: sm 6, md 8 (buttons, inputs), lg 12 (cards), full 999 (pills and chips).
- If a value falls between two steps, use the nearest step. If a screen really needs a new step, add
  it to the theme first.

## Shared components (`src/components/`)

| Component    | Use it for |
|--------------|------------|
| `AppText`    | All text. Pick a `variant`. |
| `Button`     | Full-width or stand-alone actions. `variant`: `primary` (the main action: one per screen, or one per card on dashboard screens like Home and Progress), `secondary` (other actions; white with an outline), `success` (dark green `successDark` with white text), `danger` (only the Delete account screen's main button; see Destructive actions). Handles the pressed look, `disabled`, and `loading` (shows a spinner, keeps its width, blocks taps). At least 48 dp tall. `style` is for layout only. |
| `Card`       | A white rounded box grouping one topic on a grey screen. Pass content as children. Don't wrap every list row in a card: use list rows with separators for that. |
| `EmptyState` | "Nothing here yet" text, with optional children for one action below it (usually a `Button`). Only for *empty*, never for loading or errors. |
| `TextLink`   | A blue text link (`label` in `primary`) with a 48 dp tap area that hugs the text. Read by TalkBack as "…, link". Handles the pressed look and `disabled`. `tone="danger"` makes it red (`dangerDark`) for deletes and removes. Pass `onPress` (e.g. `router.navigate(href)`). `style` is for layout only. |

There is **no small button size yet**. Compact in-row buttons (like Progress's "Log" next to the
weight box) stay as they are, until a migration ticket adds `size="sm"`. Do that through the system,
not by hand in one screen.

Older shared pieces are still in use: `LabeledInput`, `Chips`, `SettingsList`, `CalorieRing`,
`MonthCalendar`, `RestTimeInput`, `src/components/workouts/*`.

## States

Every screen or card that loads data has three different states. Don't mix them up:

- **Loading:** a spinner (`ActivityIndicator`). Never flash "nothing here" while data is still coming.
- **Empty:** `EmptyState`. The message says what to do next ("Add an exercise to follow your
  strength."), not just that nothing is there.
- **Error:** plain text that says what went wrong in everyday words and what to do next ("Couldn't
  load your data. Pull down to try again."). Errors are not `EmptyState`. Form errors get
  `accessibilityLiveRegion="polite"` so TalkBack reads them.

A `disabled` button should make the reason clear: say what is missing ("Enter a weight"), or keep
the button enabled and show the error on tap.

## Destructive actions

Deletes and removes are quiet red links: `TextLink tone="danger"`. They always ask first with a
confirm dialog, or offer undo right after. Never delete on a single tap. A red `danger` `Button` is
only for the Delete account screen's main button.

The danger link uses `dangerDark`, so it reads on both grey and white. Plain `danger` error text
still sits on white only (4.4:1 on grey).

## Accessibility

- Every tappable thing has a TalkBack label, including icon-only taps like ✕. `Button` does this for you.
- Tap targets are at least 48 dp, including plain `Pressable`s and links (use `hitSlop` if the visible
  part is smaller).
- Text grows with the phone's font-size setting. Never turn off `allowFontScaling`. Layouts wrap
  instead of cutting text off.
- Grey ladder text (`small`, `caption`) goes on white (cards), not directly on the grey screen,
  where it is too faint. Never use `subtle` or `disabled` for text that must be read.

## Rules for new UI

1. **Use the bricks and tokens.** No raw hex colour, `fontSize`, or off-scale spacing or radius in new
   code. A reviewer treats this as must-fix.
2. **Missing something? Add it to the system first.** Need a new colour, text step or button kind?
   Add it to `src/theme.ts` or the component (and to this file), then use it. Don't make a one-off
   copy in the screen.
3. **Callers change layout, not identity.** Passing margins or flex through `style` is fine. If a
   caller has to change a component's colours, the component is missing a variant.
4. **Promote, don't predict.** A view becomes a shared component once two screens need it, not before.

## Moving old screens over

Most screens still use hand-made buttons, cards and font sizes. They move over one area at a time
through the "[DS] Design system: migrate …" issues on the Plucky roadmap (#64–#68). So far
**Auth (Login, Signup, Forgot password)**, **Food** and **Progress's cards and empty texts** have
moved. The rest of Progress is still old style, so don't copy it as an example.
