# AeroPress Timer (Pebble Time 2 / Alloy + TypeScript)

Inverted-method AeroPress timer with **manual advance**. Timed steps buzz (and
chime) at 0:00 and then wait for you. Nothing auto-advances.

Default recipe: Pour, 30s bloom, Stir, 90s steep, Flip & press, Done.

## Buttons

| Button | Action |
| ------ | ------ |
| UP     | Back one step |
| SELECT | Restart current step (re-arms its timer) |
| DOWN   | Next step (any time, also skips a running timer) |
| BACK   | Exit (system default) |
| TAP    | Zones mirror the buttons: top third = back, middle = reset, bottom = next (touch-enabled firmware/SDK only; can be turned off in Settings) |

A thin rail down the right edge marks the three tap zones with an up arrow, a
recycle mark and a down arrow, sitting at the centre of each zone. The arrows
are drawn from small bars because the built-in fonts carry no vertical
triangles; the recycle glyph does exist and is used as-is. The rest of the
screen stays centred, with symmetric insets so the rail never crowds the text.

Settings also has "Simplified steps", which drops everything but the timed
steps, leaving just the two timers. When a timer ends there, the message names
the untimed steps it skipped, so the bloom finishing reads "Time! Stir." rather
than sending you to a step that is no longer in the list. It filters `RECIPE` rather than replacing
it, so a step you add with a duration shows up in both modes and an
instructional one shows up only in the full flow. Switching modes resets to the
first step, since the old position may no longer exist.

Settings can hide the rail, under "Show tap/button icons". The icons label the
physical buttons as much as the tap zones, which is why the setting is not
phrased as a touch-only option. Hiding them only removes the hints: the buttons
and the zones keep working, and the layout holds its position so nothing
reflows. Tapping itself is a separate setting.

On the last step, DOWN starts over from the top. The layout follows the
Pebble convention of moving down through a list: down to progress, up to go
back, middle to act on the current step.

## Customize

Both live at the top of `src/embeddedjs/main.ts`:

- `RECIPE`: the steps. `seconds: 0` = untimed step (shows `--:--`, waits for DOWN).
- `MELODIES`: the five chime options (MIDI numbers, 60 = C4, and ms per
  note). The vibration pulses once per note in the same rhythm. Which one
  plays, the volume, and on/off are settings.

A step with `time: "bloom"` or `"steep"` takes its length from settings and
ignores its own `seconds`, which stays as the fallback. A new length applies the
next time you enter that step, so press SELECT to re-arm a running one.

## Settings

In the Pebble phone app, open AeroPress Timer and tap Settings. The page has
chime on/off, chime melody, vibration on/off, chime volume, tap-to-advance
on/off, and the two steep lengths, plus a reset that refills the form with stock
values without applying them until you save. Values travel to the watch as an App Message and are saved on the watch,
so they hold without the phone.

The play button beside the melody auditions the tune through the phone speaker
using Web Audio. Saving also plays it once on the watch, which is the only 1:1
preview: a config page can reach the watch solely by closing and handing its
answer to PebbleKit JS, so nothing can be sent mid-session. The Save message
carries a `PREVIEW` flag that tells the watch to play; ordinary settings pushes
do not set it.

- Page: `docs/index.html`, served by GitHub Pages at
  https://ctsstc.github.io/pebble-aeropress-timer/
- Phone side: `src/pkjs/index.js` opens the page and forwards the result.
- Watch side: the `Message` listener in `src/embeddedjs/main.ts`, persisted
  with `localStorage`.
- Emulator: `pebble emu-app-config --emulator emery --file docs/index.html`
  drives the page, or push values directly:
  `pebble send-app-message --emulator emery --int 10000=0 10001=1 10002=70`
  (numeric keys in `build/appinfo.json` order: chime, vibe, volume, touch, ...)

## Graphics

An AeroPress and cup are drawn down the left edge, filling and emptying as you
move through the brew. Only the outlines ship as bitmaps: liquid levels, the
plunger and the stirrer are geometry the app positions, so transitions
interpolate rather than swapping frames, and adding a fill level costs nothing.

Settings offers animated, static or none. Animated tweens between steps and
loops the steam on a finished cup, giving up after three minutes. Static draws
each step without motion. None hides the column, and the text reclaims the
width at its full size, since the art column is what forces the smaller
instruction face.

## Chime

Timed steps play a chime through the speaker while the vibe pulses in the same
rhythm. Settings picks one of five: a single tone, a three-note chirp, Teapot
(a rising run landing an octave up), Kettle whistle (a kettle coming to the
boil, the default) or Tada. Both teapot-flavoured options are original motifs
rather than the 1939 song, so nothing here reproduces a copyrighted melody.
Either alert can be turned off.
The chime is also
skipped when the watch is muted (Settings > Sounds & Haptics) or Quiet Time is
active, and it silently does nothing if the speaker API is unavailable.

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
