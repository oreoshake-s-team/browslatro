---
name: verify
description: Drive the running Browslatro app in a headless browser to verify gameplay/scoring changes end-to-end. Use after changing scoring, jokers, enhancements, or hooks to observe real behavior instead of only running tests.
---

# Verifying Browslatro changes in a live browser

## Launch

- `yarn start` serves the dev build at http://localhost:3000 (dev builds enable all dev affordances automatically).
- Drive it with Playwright via the repo's own dependency: `createRequire("<repo>/package.json")` then `require("@playwright/test").chromium`. In the remote environment launch with `executablePath: "/opt/pw-browsers/chromium"` — never run `playwright install`.

## Getting into a scorable state

1. Before `page.goto`, seed localStorage via `addInitScript`:
   - `browslatro:adminMode` = `"true"` — renders the dev Apply-modifiers panel (normally toggled by the Konami code).
   - `browslatro:animationSpeed` = `"fast"`, `browslatro:muted` = `"true"`.
2. Dismiss the `.new-run-overlay` dialog ("Start Run →"), then the blind-select modal (`blind-select-play` testid, or the first button in `.modal-overlay`).

## Dev affordances (Apply modifiers panel)

Open the `Apply modifiers` disclosure, then:

- `.force-probabilities-button` — force every probability roll to hit (lucky cards, glass, etc.).
- `Add a specific Joker` → paginated grid, buttons carry `data-joker-id` (e.g. `lucky-cat`); page with `modifier-joker-picker-next`.
- `Add a specific Tarot` → buttons carry `data-tarot-id` (e.g. `the-magician` applies the Lucky enhancement to selected hand cards).
- Hand cards: `[data-testid="hand-cards"] button[aria-pressed]`; aria-labels include enhancement info after applying a tarot.
- Consumables are used via a button named `Use <name> (tarot)...`.

## Observing results

- The dev Scoring Trace panel (left sidebar) prints per-hand math lines like `+20 Mult (Lucky proc on K♦)`, `×1.5 Mult (Lucky Cat)`, `15 Chips × 31.5 Mult = 472` — grep `page.innerText("body")` for them after the animation settles (~6-7s at fast speed).
- Joker tooltips (`joker-tile-filled-<id>` hover) show `Currently: X… Mult` badges.

## Gotchas

- Winning the blind pops a Round Won `.modal-overlay` that intercepts all pointer events — sequence multi-hand scenarios so the round doesn't end early (blind requirement is 300 at ante 1).
- Each `chromium.launch()` gets a fresh profile, so runs don't inherit saved games.
