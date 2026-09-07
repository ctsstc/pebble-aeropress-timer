# HANDOFF — AeroPress Timer (Pebble Time 2, Alloy + TypeScript)

Read this first. You are picking up a Pebble watchapp that was drafted in a
chat session and has **never been compiled against the real Pebble SDK**. It
type-checks under `tsc --strict` against stub declarations, and every API call
was copied from the official examples repo — but first contact with
`pebble build` is your job.

## What this is

A manual-advance AeroPress timer for the owner's daily inverted-method brew:
Setup → 30s steep → Stir → 90s steep → Flip & press → Done. Timed steps count
down, double-pulse the vibe at 0:00, then **wait** for SELECT. Nothing
auto-advances. Full button map and layout notes are in `README.md`; the recipe
is the `RECIPE` array at the top of `src/embeddedjs/main.ts`.

Project layout mirrors the official `hellotypescript` example exactly
(`package.json`, `wscript`, `src/c/mdbl.c`, `src/embeddedjs/{main.ts,manifest.json}`).
Do not restructure it or port it to C — the owner chose Alloy + TypeScript on
purpose.

## Phase 1 — get it building (do this first, nothing else until green)

1. Toolchain (the owner may already have it; check before installing):
   ```sh
   uv tool install pebble-tool --python 3.13   # or: uv tool upgrade pebble-tool
   pebble sdk install latest
   pebble --version && pebble sdk list
   ```
   Make sure the SDK is a **post-July-2026** release — that's when the Touch,
   Speaker, and RGB Backlight APIs shipped. `pebble sdk install latest` again if
   unsure.
2. `pebble build` from the project root. Fix whatever it complains about.
3. `pebble install --emulator emery`. Confirm: countdown runs, vibration fires
   at 0:00 (emulator logs it), SELECT/UP/DOWN behave per README.

If an API has drifted, the authoritative reference is
https://github.com/Moddable-OpenSource/pebble-examples — specifically
`hellotypescript` (project shape), `hellobutton` (`pebble/button`),
`hellovibes` (`pebble/vibes`), `hellopiu-pebbletext` and `piu/watchfaces/*`
(Piu styles/fonts/`Application` params). Clone it next to this project and
diff against it rather than guessing. Alloy guides live at
https://developer.repebble.com/guides/alloy/.

Known soft spots to check first if the build fails:
- `import {} from "piu/MC"` and the Piu globals (`Application`, `Label`,
  `Text`, `Skin`, `Style`, `Behavior`, `screen`) — typed via
  `$(MODDABLE)/examples/manifest_typings.json`, which the manifest includes.
- Font strings: `"14px Gothic"`, `"bold 28px Gothic"`, `"bold 42px Bitham"`
  — official examples use `"bold 18px Gothic"` and `"black 30px Bitham"`, so
  the plain-weight and 42px variants are the least-verified.
- `touchCount: 1` + `active: true, Behavior: TapBehavior` on the root: if the
  SDK's Piu build lacks touch, taps are inert (fine); if it errors, set
  `touchCount: 0` and drop those two properties.

## Phase 2 — on the wrist

`pebble install --phone <IP>` (Developer Connection in the Pebble mobile app)
or however the current pebble-tool sideloads. Verify on the physical watch:
readability of the 42px countdown, vibe strength at 0:00, and whether
tap-to-advance actually works on the current firmware (PebbleOS 4.33.x as of
Aug 2026). Report which of those pass.

## Phase 3 — stretch: speaker chime (the owner wants to try audio)

Goal: a short ascending three-note chirp (e.g. C5 → E5 → G5, ~120 ms each,
modest volume) **in addition to** the vibration when a timed step hits 0:00.
Untimed steps stay silent.

1. Check whether a native Alloy speaker module now exists — look in the SDK's
   Moddable typings / modules for anything like `pebble/speaker` (as of
   Sept 2026 the examples repo had none, but the SDK may be ahead of it).
   If it exists, use it and skip step 2.
2. Otherwise use FFI, following the `helloffi` example: a small C shim in
   `src/c/` that wraps the C Speaker API — `speaker_play_tone(freq_hz,
   duration_ms, volume, waveform)` or `speaker_play_notes(...)` — exported to
   TypeScript. C API docs:
   https://developer.repebble.com/docs/c/User_Interface/Speaker/
3. Respect the system mute: the OS enforces Sounds & Haptics mute and Quiet
   Time (apps cannot override), but call the mute-status check anyway so the
   app can skip audio cleanly. Vibration must still fire when muted.
4. Wrap the whole audio path so a missing API degrades to "no sound" rather
   than a crash or build failure.

## Guardrails

- Keep it TypeScript, keep `RECIPE` trivially editable, keep manual advance.
- No PebbleKit JS / phone-side code — this app is watch-only.
- `git init` and commit the working baseline before Phase 3.
- Ask before adding config pages, settings, or any feature not listed here.
