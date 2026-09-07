# AeroPress Timer (Pebble Time 2 / Alloy + TypeScript)

Inverted-method AeroPress timer with **manual advance** — timed steps buzz at
0:00 and then wait for you. Nothing auto-advances.

Default recipe: Setup → 30s steep → Stir → 90s steep → Flip & press → Done.

## Buttons

| Button | Action |
| ------ | ------ |
| SELECT | Next step (any time — also skips a running timer) |
| UP     | Restart current step (re-arms its timer) |
| DOWN   | Back one step |
| BACK   | Exit (system default) |
| TAP    | Anywhere on screen = SELECT (touch-enabled firmware/SDK only) |

On the last step, SELECT starts over from the top.

## Customize the recipe

Edit the `RECIPE` array at the top of `src/embeddedjs/main.ts`.
`seconds: 0` = untimed step (shows `--:--`, waits for SELECT).

## Build & run

Prereqs (once):

```sh
uv tool install pebble-tool --python 3.13
pebble sdk install latest
```

Then from this directory:

```sh
pebble build
pebble install --emulator emery      # try it in the emulator
pebble install --phone <PHONE_IP>    # or sideload via the Pebble app's Developer Connection
```

## Notes / caveats

- Written against SDK 4.9.x-era Alloy (mid-2026). Alloy is young and APIs are
  still being fleshed out; if the build complains, the authoritative reference
  is the official examples repo:
  https://github.com/Moddable-OpenSource/pebble-examples
  (this project's structure mirrors `hellotypescript`; button API from
  `hellobutton`, vibration API from `hellovibes`, Piu text/styles from
  `hellopiu-pebbletext` and the `piu/watchfaces` examples).
- Touch: PebbleOS only gained a touchscreen app API in May 2026, and Alloy's
  touch events (`onTouchEnded` etc.) require an SDK release with the Moddable
  touch driver integrated. If your SDK predates that, taps just do nothing
  (buttons still work). If the build itself errors, set `touchCount: 1` back
  to `0` in `main.ts` and remove `active: true, Behavior: TapBehavior`.
- Targets `emery` (Time 2) only. Round 2 owners could add `gabbro` to
  `targetPlatforms` in `package.json`, but the top/bottom labels would clip on
  the round display without layout tweaks.
- `src/c/mdbl.c` and `wscript` are the standard Alloy boilerplate — no need to
  touch them.
- Iterating with an AI? Open this folder in Claude Code and let it run
  `pebble build` and fix errors in place. (`pebble new-project --ai` exists for
  the same workflow on fresh projects.)
