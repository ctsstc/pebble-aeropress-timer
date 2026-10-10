# Changelog

Newest first. Each version was installed to the watch on the date shown, and
from 1.18.0 on also published to the app store, where its entry is the
release notes. Entries before 1.18.2 were reconstructed from the git history.

## 1.18.2 (2026-10-10)

- Steam swaps frames on the same beat as the countdown again. The fix first
  shipped in 1.17.4, but 1.18.0 and 1.18.1 were built without it.
- Store listing: the full brew animation ends on the steaming cup, and the
  finish animation comes last, after the stills.

## 1.18.1 (2026-10-10)

- Store listing: new screenshots, with Stir added and a closer animation of the
  press through to the finished cup. They went up out of order.
- No changes on the watch.

## 1.18.0 (2026-10-10)

- First release on the app store.
- The app has its own icon in the watch's app list instead of the generic one.
- Built without the 1.17.4 steam fix by mistake.

## 1.17.4 (2026-09-11)

- Steam frames swap on the countdown's second boundaries instead of landing
  about 700 ms off the digit change. This build never reached the main branch,
  so 1.18.0 and 1.18.1 went out without it.

## 1.17.3 (2026-09-10)

- The first frame no longer flashes the steam, stirrer and plunger in their
  default spots before the art draws.

## 1.17.2 (2026-09-10)

- Steam curls keep their ends still while the middles sway, centred on the press.

## 1.17.1 (2026-09-10)

- Steam is centred on the same line as the press and cup.

## 1.17.0 (2026-09-09)

- Steam follows the heat through the whole brew: inside the chamber while there
  is room, above the press once it is full, then over the cup.
- A wider plunger rod.

## 1.16.0 (2026-09-09)

- The press shows the flip: the lip moves from the top of the chamber to the
  bottom when the press step opens.

## 1.15.2 (2026-09-09)

- The plunger rod sits above the seal instead of hanging down into the coffee.

## 1.15.1 (2026-09-09)

- The plunger pulls back out on its own after the press.
- Steam moves on a round second.

## 1.15.0 (2026-09-09)

- The cup matches the chamber's width, and liquid fills each vessel exactly.
- The plunge goes all the way home in one slower motion, with the coffee fully
  in the cup.
- Steam drifts at a calmer pace.

## 1.14.1 (2026-09-09)

- The cup and chamber share one centre line.

## 1.14.0 (2026-09-08)

- An AeroPress and cup drawn down the left edge. They stay put while the levels
  inside tell the story: filling for the bloom, topping up for the steep,
  draining into the cup on the press.
- Steps animate into each other, and a finished cup steams for up to three
  minutes.
- Graphics setting: animated, static or none. None gives the text its full
  width back.

## 1.13.0 (2026-09-08)

- A brew that ends on a timer closes with "Time! Enjoy your cup."
- In simplified mode, a finished timer names the steps it skipped, such as
  "Time! Stir."
- The steep has a one in ten chance of saying "Wait for it..." instead.

## 1.12.0 (2026-09-08)

- When the last step is a timer, as in simplified mode, its closing message no
  longer points you to a next step.

## 1.11.0 (2026-09-07)

- The timers are named Bloom and Steep, and the opening step is Pour. Saved
  lengths carry over.

## 1.10.0 (2026-09-07)

- Simplified steps setting: just the two timers, for people who know the
  method.
- The icon setting is named for buttons as well as taps.

## 1.9.0 (2026-09-07)

- The countdown is pinned to the centre, with the step name above and the
  instruction below, so nothing shifts between steps.
- The step counter moves to the footer and reads "start over" on the last step.

## 1.8.0 (2026-09-07)

- Setting to show or hide the tap icons. The buttons and tap zones work either
  way.

## 1.7.0 (2026-09-07)

- A rail down the right edge marks the tap zones with an up arrow, a recycle
  mark and a down arrow, lined up with the buttons.
- Chime volume sits with the other chime settings.

## 1.6.0 (2026-09-07)

- Tada chime.
- Settings page: a reset button that restores the stock values when you save,
  and the play button lines up with its dropdown.

## 1.5.0 (2026-09-07)

- Kettle whistle chime, now the default. Teapot becomes an original rising run
  rather than a phrase of the 1939 song.
- Bloom and steep lengths are settings: 30 and 90 seconds by default, anywhere
  from 5 to 600.

## 1.4.0 (2026-09-07)

- Tap zones mirror the buttons: the top third goes back, the middle restarts
  the step, the bottom advances.
- Saving settings plays the chosen chime once on the watch, and the settings
  page can play it through the phone.

## 1.3.0 (2026-09-07)

- Setting to turn tap to advance off.
- Chime melody setting, with a teapot jingle as the default. The vibration
  pulses in the melody's rhythm.

## 1.2.0 (2026-09-07)

- Settings in the Pebble phone app for the chime, vibration and volume, saved
  on the watch.
- A rounder countdown typeface.

## 1.1.0 (2026-09-07)

- First build on the watch: the inverted method, step by step, with timed steps
  that buzz at zero and then wait for you.
- A chime at 0:00 alongside the vibration, skipped when the watch is muted.
- Down for the next step, Up to go back, Select to restart the step.
- Larger type, and a countdown that no longer flickers between two values.
