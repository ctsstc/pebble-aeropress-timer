# App store listing

Everything the Rebble app store listing needs, plus the sources to regenerate it.
Live at https://apps.repebble.com/cc90e8a3e8324eb1a31a90cd since 1.18.0.

| File | Size | Used for |
| ---- | ---- | -------- |
| `icon-large.png` | 144×144 | Large app icon |
| `icon-small.png` | 80×80 | Small app icon |
| `banner.png` | 720×320 | Marketing banner (web dashboard only, the CLI has no flag for it) |
| `screenshots/emery_*` | 200×228 | Listing screenshots. The store shows them in upload order, so they are numbered by brew step. It allows 5 per platform |
| `../resources/img/menu-icon.png` | 25×25 | Watch launcher icon, built into the app |

The `emery_` prefix is how `pebble publish` picks the platform for each screenshot.

## Regenerating

- Graphics: `./build.sh` renders every PNG from `src/*.svg`. It needs `rsvg-convert` and `magick`.
- Static screenshots: open the app in the emery emulator, step with
  `pebble emu-button --emulator emery click down`, and capture with
  `pebble screenshot --emulator emery --no-open <file>`. That applies the same
  colour correction the store's own capture uses.
- The brew GIF: open the app on POUR in the emulator, then run
  `~/.local/share/uv/tools/pebble-tool/bin/python -I store/capture-brew.py`.
- The banner embeds `screenshots/emery_3_steep.png`, so rerun `./build.sh` after replacing it.

## Listing copy

**Name:** AeroPress Timer

**Category:** Tools & Utilities (Daily also fits)

**Source:** https://github.com/ctsstc/pebble-aeropress-timer

**Description** (1120 of 1600 characters):

```text
A step-by-step timer for the inverted AeroPress method, made for Pebble Time 2.

Pour, bloom, stir, steep, flip and press. Each step tells you what to do, and the two timed steps count down, then buzz and chime at zero. Nothing moves on by itself: the timer waits for you, so a slow pour or an extra stir never throws off the brew.

An AeroPress and mug down the side of the screen fill, plunge and steam as you go.

Buttons
• Down: next step (also skips a running timer)
• Up: back one step
• Select: restart the current step
On watches with touch, tapping the top, middle or bottom of the screen does the same.

Settings, in the Pebble phone app
• Bloom and steep lengths (30 and 90 seconds by default)
• Five chime melodies and a volume, previewed on the watch when you save
• Chime and vibration on or off
• Simplified steps: just the two timers
• Graphics animated, static or off
• Show or hide the button hints
• Tap to advance on or off

Settings are saved on the watch, so it works with your phone out of reach. The chime stays quiet when the watch is muted or in Quiet Time.

Not affiliated with AeroPress, Inc.
```

## Publishing

> [!WARNING]
> In pebble-tool 5.0.40, `pebble publish` makes the app public immediately. The
> `--is-published` flag is accepted but never read: both the create and the
> release requests always send `isPublished: true`.

The app already exists, so a release only needs the version bump in
`package.json` and notes. `--no-gif-all-platforms` matters: without it,
`pebble publish` records a 7 second GIF of the POUR step and adds it to the
listing.

```sh
pebble publish --non-interactive --no-gif-all-platforms --release-notes "<notes>"
```

To refresh the screenshots in the same release, add
`--screenshots store/screenshots/emery_* --replace-screenshots`. Without
`--replace-screenshots` they are appended, and the store holds 5 per platform.

The banner, developer name and listing text are edited in the dashboard at
https://appstore-api.repebble.com/dashboard.
