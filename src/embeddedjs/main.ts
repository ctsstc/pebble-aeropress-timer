/*
 * AeroPress Timer: inverted method, manual advance.
 * Timed steps count down, vibrate (and chime) at 0:00, then wait for SELECT.
 * Button map, touch caveats, and build notes are in README.md.
 */

import {} from "piu/MC";
import Button from "pebble/button";
import Vibes from "pebble/vibes";
import Time from "time";

interface Step {
	name: string;
	seconds: number; // 0 = untimed step (no countdown)
	instr: string;
}

// ---- Your recipe -----------------------------------------------------------
const RECIPE: Step[] = [
	{ name: "SETUP", seconds: 0,  instr: "Invert press. Add coffee, pour water." },
	{ name: "STEEP", seconds: 30, instr: "Let it sit." },
	{ name: "STIR",  seconds: 0,  instr: "Give it a good stir." },
	{ name: "STEEP", seconds: 90, instr: "Almost there..." },
	{ name: "PRESS", seconds: 0,  instr: "Cap on, flip onto mug, press slow." },
	{ name: "DONE",  seconds: 0,  instr: "Enjoy your coffee!" },
];

// Chime at 0:00, alongside the vibe. MIDI note numbers (60 = C4), volume 0-100.
const CHIME = { notes: [72, 76, 79], noteMs: 120, volume: 40 };
// ----------------------------------------------------------------------------

// 64-color display: stick to palette-aligned values (00 / 55 / AA / FF per channel)
const COLOR_BG   = "black";
const COLOR_TEXT = "white";
const COLOR_DIM  = "#AAAAAA";
const COLOR_TIME = "#FFAA00"; // amber while counting
const COLOR_DONE = "#00FF00"; // green at 0:00

const bgSkin        = new Skin({ fill: COLOR_BG });
const stepNumStyle  = new Style({ font: "14px Gothic",      color: COLOR_DIM,  horizontal: "center" });
const nameStyle     = new Style({ font: "bold 28px Gothic", color: COLOR_TEXT, horizontal: "center" });
const timeStyle     = new Style({ font: "bold 42px Bitham", color: COLOR_TIME, horizontal: "center" });
const timeDoneStyle = new Style({ font: "bold 42px Bitham", color: COLOR_DONE, horizontal: "center" });
const instrStyle    = new Style({ font: "bold 18px Gothic", color: COLOR_TEXT, horizontal: "center" });
const hintStyle     = new Style({ font: "14px Gothic",      color: COLOR_DIM,  horizontal: "center" });

let controller: AeroPressTimer | undefined;

class TapBehavior extends Behavior {
	onTouchEnded(_content: any): void {
		controller?.next();
	}
}

const AeroApplication = Application.template(($: any) => ({
	skin: bgSkin, active: true, Behavior: TapBehavior,
	contents: [
		Label($, { anchor: "STEPNUM", left: 0, right: 0, top: 6,    height: 18, style: stepNumStyle, string: "" }),
		Label($, { anchor: "NAME",    left: 0, right: 0, top: 26,   height: 32, style: nameStyle,    string: "" }),
		Label($, { anchor: "TIME",    left: 0, right: 0, top: 62,   height: 48, style: timeStyle,    string: "" }),
		Text($,  { anchor: "INSTR",   left: 6, right: 6, top: 118,  height: 84, style: instrStyle,   string: "" }),
		Label($, { anchor: "HINT",    left: 0, right: 0, bottom: 2, height: 18, style: hintStyle,    string: "" }),
	],
}));

// FFI bindings from src/c/chime.c. All three are absent when the mod was built without FFI.
declare const Natives: {
	chime_muted?(): number;
	chime_set_note?(index: number, midi: number): number;
	chime_play?(count: number, durationMs: number, volume: number): number;
} | undefined;

function chime(): void {
	try {
		if (typeof Natives === "undefined" || !Natives.chime_muted || !Natives.chime_set_note || !Natives.chime_play) return;
		if (Natives.chime_muted()) return;
		for (let i = 0; i < CHIME.notes.length; i++)
			Natives.chime_set_note(i, CHIME.notes[i]);
		Natives.chime_play(CHIME.notes.length, CHIME.noteMs, CHIME.volume);
	}
	catch {
		// Speaker unavailable: the vibe is the alert.
	}
}

function formatTime(totalSeconds: number): string {
	const m = Math.floor(totalSeconds / 60);
	const s = totalSeconds % 60;
	return `${m}:${s.toString().padStart(2, "0")}`;
}

class AeroPressTimer {
	private index = 0;
	private startTicks = 0;
	private durationMs = 0;
	private ticker: ReturnType<typeof setInterval> | undefined;
	private readonly ui: any;

	constructor(ui: any) {
		this.ui = ui;
		new Button({
			types: ["select", "up", "down"],
			onPush: (down: number, type: string): void => {
				if (!down) return;
				if (type === "select") this.next();
				else if (type === "up") this.restartStep();
				else if (type === "down") this.previous();
			},
		});
		this.enterStep(0);
	}

	next(): void {
		const last = RECIPE.length - 1;
		this.enterStep(this.index >= last ? 0 : this.index + 1);
	}

	private previous(): void {
		if (this.index > 0)
			this.enterStep(this.index - 1);
	}

	private restartStep(): void {
		this.enterStep(this.index);
	}

	private enterStep(i: number): void {
		this.stopTicker();
		this.index = i;
		const step = RECIPE[i];

		this.ui.STEPNUM.string = `step ${i + 1} of ${RECIPE.length}`;
		this.ui.NAME.string = step.name;
		this.ui.INSTR.string = step.instr;
		this.ui.HINT.string = (i === RECIPE.length - 1)
			? "SEL start over"
			: "SEL next  UP redo  DN back";
		this.ui.TIME.style = timeStyle;

		if (step.seconds > 0) {
			this.startTicks = Time.ticks;
			this.durationMs = step.seconds * 1000;
			this.ui.TIME.string = formatTime(step.seconds);
			this.ticker = setInterval(() => this.tick(), 250);
		}
		else {
			this.ui.TIME.string = "--:--";
		}
	}

	private tick(): void {
		// Time.ticks is monotonic. Date.now() on PebbleOS 4.33 reads a full second ahead for ~250 ms after each second boundary.
		const remaining = Math.max(0, Math.ceil((this.durationMs - Time.delta(this.startTicks)) / 1000));
		this.ui.TIME.string = formatTime(remaining);
		if (remaining <= 0) {
			this.stopTicker();
			this.ui.TIME.style = timeDoneStyle;
			this.ui.INSTR.string = "Time! SEL for next step.";
			Vibes.doublePulse();
			chime();
		}
	}

	private stopTicker(): void {
		if (undefined !== this.ticker) {
			clearInterval(this.ticker);
			this.ticker = undefined;
		}
	}
}

const model: any = {};
const application = new AeroApplication(model, {
	displayListLength: 4096,
	touchCount: 1,
	pixels: screen.width * 4,
});
controller = new AeroPressTimer(model);

export default application;
