# Plucky design system

Plucky's own look-and-feel rules. Read this before you design, build or review any UI.
The global `ux-ui-guidelines` skill covers general usability. Where the two disagree, this file wins.

## Tone

Friendly and plain. Plucky is a gym-and-food buddy, not a dashboard: short, everyday words, no
jargon, no shouting. The look is calm and clear first. Fun is a small extra, never decoration that
pushes the task down the screen.

## Colour

All colours live in `colors` in `src/theme.ts`. Never write a hex value in a screen or component.

- **Blue `primary` (#2563eb)** means "you can act here": buttons, links, the selected tab. It stays
  because it is calm, reads well with white text, and is already everywhere.
- **Yellow `accent` (#ffd23f)** is the mascot's colour, used only for small fun touches (streaks,
  badges, empty-state art). White text on yellow is hard to read, so text on yellow uses `colors.text`.
  Never use yellow for buttons or as a big background.
- `success` / `danger` / `warning` carry meaning (done, delete, careful). Don't use them as decoration.
- **Dark mode is planned** (issue #26). That's why every colour has to come from `colors`: turning dark
  mode on should only mean swapping that one list.

## Text ladder

Use `<AppText variant="...">` (`src/components/AppText.tsx`), not `fontSize`. The steps live in
`typography` in `src/theme.ts`:

| Variant   | Size / weight | Use for                       |
|-----------|---------------|-------------------------------|
| `title`   | 28 / 700      | big numbers, hero text        |
| `heading` | 20 / 600      | section titles                |
| `body`    | 16 / 400      | normal text (default)         |
| `label`   | 16 / 600      | button text, row titles       |
| `small`   | 14 / 400 grey | secondary text                |
| `caption` | 12 / 400 grey | hints, timestamps             |

Only the weights 400, 600 and 700 are used. Screen titles come from the navigation header, not from
`title`. Text grows with the phone's font-size setting, so never turn off `allowFontScaling`.
When an old screen moves over, 15 rounds to 16 and 13 rounds to 14.

## Spacing and corners

- `spacing`: xs 4, sm 8, md 12, lg 16, xl 24, xxl 32. Use `gap` with these for layout.
- `radius`: sm 6, md 8 (buttons, inputs), lg 12 (cards), full 999 (pills and chips).
- If a value falls between two steps, use the nearest step. If a screen really needs a new step, add
  it to the theme first.

## Shared components (`src/components/`)

| Component    | Use it for |
|--------------|------------|
| `AppText`    | All text. Pick a `variant`. |
| `Button`     | Any full-size action. `variant`: `primary` (main action, one per screen), `secondary` (other actions), `danger` (delete or irreversible). Handles the pressed look, `disabled`, and `loading` (shows a spinner and blocks taps). At least 48 px tall. `style` is for layout only. |
| `Card`       | A white rounded box grouping one topic on a grey screen. Pass content as children. Don't wrap every list row in a card: use list rows with separators for that. |
| `EmptyState` | "Nothing here yet" text. Optional children for one action below it (usually a `Button`). Loading and error states are different from empty: don't show an empty message while data is still loading. |

Older shared pieces are still in use: `LabeledInput`, `Chips`, `SettingsList`, `CalorieRing`,
`MonthCalendar`.

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
through the "Design system: migrate …" issues on the Plucky roadmap. Login (Button) and Progress (Card,
EmptyState) are already done.
