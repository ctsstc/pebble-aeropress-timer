# AeroPress Timer (Pebble Time 2 / Alloy + TypeScript)

Inverted-method AeroPress timer with **manual advance**. Timed steps buzz (and
chime) at 0:00 and then wait for you. Nothing auto-advances.

Default recipe: Setup, 30s steep, Stir, 90s steep, Flip & press, Done.

## Buttons

| Button | Action |
| ------ | ------ |
| UP     | Back one step |
| SELECT | Restart current step (re-arms its timer) |
| DOWN   | Next step (any time, also skips a running timer) |
| BACK   | Exit (system default) |
| TAP    | Anywhere on screen = next step (touch-enabled firmware/SDK only) |

On the last step, DOWN starts over from the top. The layout follows the
Pebble convention of moving down through a list: down to progress, up to go
back, middle to act on the current step.

## Customize

Both live at the top of `src/embeddedjs/main.ts`:

- `RECIPE`: the steps. `seconds: 0` = untimed step (shows `--:--`, waits for DOWN).
- `CHIME`: notes played at 0:00 (MIDI numbers, 60 = C4), note length in ms,
  and volume 0-100. Default is C5, E5, G5 at 120 ms each.

## Chime

Timed steps play a short ascending chirp through the speaker in addition to the
double-pulse vibe. The vibe always fires. The chime is skipped when the watch is
muted (Settings > Sounds & Haptics) or Quiet Time is active, and it silently
does nothing if the speaker API is unavailable.

Alloy has no speaker module yet, so the chime goes through FFI: `src/c/chime.c`
wraps `speaker_play_notes()` and `speaker_is_muted()`, and the `ffi` block in
`src/embeddedjs/manifest.json` declares the functions. The build generates
`src/c/mc.ffi.c` (gitignored), and `src/c/mdbl.c` passes `fxBuildFFI` to the
VM, matching the official `helloffi` example.

> [!WARNING]
> The bindings are integer-only on purpose. On PebbleOS 4.33 / SDK 4.33.1 an
> FFI pointer or string argument faults the app as soon as the generated glue
> dereferences the handle XS returns (it points into the XS slot heap, which
> the app apparently cannot read). That is why JS stages notes one index at a
> time with `chime_set_note()` and then calls `chime_play()`. The official
> `helloffi` example, which passes strings and buffers, also wedges the
> emulator on this SDK.

## Build & run

Prereqs (once):

```sh
uv tool install pebble-tool --python 3.13
pebble sdk install latest
npm install -g typescript      # the Alloy build shells out to `tsc`
```

Then from this directory:

```sh
pebble build
pebble install --emulator emery      # try it in the emulator
pebble install --phone <PHONE_IP>    # or sideload via the Pebble app's Developer Connection
```

Handy while iterating in the emulator:

```sh
pebble emu-button --emulator emery click select   # also: up, down, back
pebble screenshot --emulator emery --no-open shot.png
pebble logs --emulator emery                      # console.log output only
```

## Notes / caveats

- Built and verified against SDK 4.33.1 (Sept 2026). Alloy is young and APIs
  are still being fleshed out; if the build complains, the authoritative
  reference is the official examples repo:
  https://github.com/Moddable-OpenSource/pebble-examples
  (this project's structure mirrors `hellotypescript`; button API from
  `hellobutton`, vibration API from `hellovibes`, FFI from `helloffi`, Piu
  text/styles from `hellopiu-pebbletext` and the `piu/watchfaces` examples).
- Touch: taps need an SDK with the Moddable touch driver integrated and a
  firmware with the touchscreen app API (May 2026 or later). If your SDK
  predates that, taps just do nothing (buttons still work). If the build itself
  errors on touch, set `touchCount: 1` back to `0` in `main.ts` and remove
  `active: true, Behavior: TapBehavior`. The emulator has no touch input.
- Targets `emery` (Time 2) only. Round 2 owners could add `gabbro` to
  `targetPlatforms` in `package.json`, but the top/bottom labels would clip on
  the round display without layout tweaks.
- `wscript` is the standard Alloy boilerplate. `src/c/mdbl.c` is the boilerplate
  plus the one `fxBuildFFI` line the chime needs.
- `pebble logs` on the emulator shows `console.log` output only, never
  vibration or speaker events. Verify those on the wrist.
- The countdown is driven by `Time.ticks` from the Moddable `time` module, not
  `Date.now()`. On PebbleOS 4.33 `Date.now()` reads a full second ahead for the
  first ~250 ms after every second boundary and then drops back, which made the
  countdown flicker between two values.
- Iterating with an AI? Open this folder in Claude Code and let it run
  `pebble build` and fix errors in place. (`pebble new-project --ai` exists for
  the same workflow on fresh projects.)
