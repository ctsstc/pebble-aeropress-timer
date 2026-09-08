/*
 * AeroPress Timer: inverted method, manual advance.
 * Timed steps count down, vibrate (and chime) at 0:00, then wait for DOWN.
 * Button map, touch caveats, and build notes are in README.md.
 */

import {} from "piu/MC";
import Button from "pebble/button";
import Vibes from "pebble/vibes";
import Time from "time";
import Message from "pebble/message";

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

// Chime at 0:00. MIDI note numbers (60 = C4); the vibe pulses once per note in the same rhythm.
// Which melody plays, the volume, and on/off live in settings.
type Melody = "single" | "triple" | "teapot";
const MELODY_ORDER: Melody[] = ["single", "triple", "teapot"]; // CHIME_MELODY index, shared with src/pkjs/index.js

interface Note {
	midi: number;
	ms: number;
}

const MELODIES: Record<Melody, Note[]> = {
	single: [{ midi: 79, ms: 500 }],
	triple: [{ midi: 72, ms: 120 }, { midi: 76, ms: 120 }, { midi: 79, ms: 120 }],
	teapot: [ // "I'm a lit-tle tea-pot"
		{ midi: 72, ms: 280 }, { midi: 74, ms: 280 }, { midi: 76, ms: 140 },
		{ midi: 77, ms: 140 }, { midi: 79, ms: 280 }, { midi: 84, ms: 420 },
	],
};
// ----------------------------------------------------------------------------

// 64-color display: stick to palette-aligned values (00 / 55 / AA / FF per channel)
const COLOR_BG   = "black";
const COLOR_TEXT = "white";
const COLOR_DIM  = "#AAAAAA";
const COLOR_TIME = "#FFAA00"; // amber while counting
const COLOR_DONE = "#00FF00"; // green at 0:00

const bgSkin        = new Skin({ fill: COLOR_BG });
const stepNumStyle  = new Style({ font: "18px Gothic",      color: COLOR_DIM,  horizontal: "center" });
const nameStyle     = new Style({ font: "bold 36px Gothic", color: COLOR_TEXT, horizontal: "center" });
const timeStyle     = new Style({ font: "bold 49px Roboto", color: COLOR_TIME, horizontal: "center" });
const timeDoneStyle = new Style({ font: "bold 49px Roboto", color: COLOR_DONE, horizontal: "center" });
const timeIdleStyle = new Style({ font: "bold 42px Bitham", color: COLOR_DIM,  horizontal: "center" }); // Roboto 49 has no hyphen glyph
const instrStyle    = new Style({ font: "bold 24px Gothic", color: COLOR_TEXT, horizontal: "center" });
const hintStyle     = new Style({ font: "18px Gothic",      color: COLOR_DIM,  horizontal: "center" });

let controller: AeroPressTimer | undefined;

// Tap zones mirror the buttons beside the screen: top third = back, middle = reset, bottom = next.
class TapBehavior extends Behavior {
	onTouchEnded(_content: any, _id: number, _x: number, y: number): void {
		if (!settings.touch || !controller) return;
		const zone = Math.min(2, Math.floor((3 * y) / screen.height));
		if (zone === 0) controller.previous();
		else if (zone === 1) controller.restartStep();
		else controller.next();
	}
}

const AeroApplication = Application.template(($: any) => ({
	skin: bgSkin, active: true, Behavior: TapBehavior,
	contents: [
		Label($, { anchor: "STEPNUM", left: 0, right: 0, top: 0,    height: 20, style: stepNumStyle, string: "" }),
		Label($, { anchor: "NAME",    left: 0, right: 0, top: 20,   height: 38, style: nameStyle,    string: "" }),
		Label($, { anchor: "TIME",    left: 0, right: 0, top: 58,   height: 56, style: timeStyle,    string: "" }),
		Text($,  { anchor: "INSTR",   left: 4, right: 4, top: 116,  height: 90, style: instrStyle,   string: "" }),
		Label($, { anchor: "HINT",    left: 0, right: 0, bottom: 0, height: 20, style: hintStyle,    string: "" }),
	],
}));

// Settings arrive from the phone config page (src/pkjs/index.js) and persist on the watch.
interface Settings {
	chime: boolean;
	vibe: boolean;
	volume: number;
	touch: boolean;
	melody: Melody;
}

const DEFAULT_SETTINGS: Settings = { chime: true, vibe: true, volume: 40, touch: true, melody: "teapot" };
const SETTINGS_KEY = "settings";

function loadSettings(): Settings {
	try {
		const raw = localStorage.getItem(SETTINGS_KEY);
		if (raw) {
			const saved: Settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
			if (!MELODY_ORDER.includes(saved.melody)) saved.melody = DEFAULT_SETTINGS.melody;
			return saved;
		}
	}
	catch {}
	return { ...DEFAULT_SETTINGS };
}

let settings = loadSettings();

const inbox: Message = new Message({
	keys: ["CHIME_ENABLED", "VIBE_ENABLED", "CHIME_VOLUME", "TOUCH_ENABLED", "CHIME_MELODY", "PREVIEW"],
	input: 96, // a handful of int tuples; the default is 8 KB each way
	output: 32,
	onReadable: () => {
		const msg = inbox.read();
		const num = (key: string): number | undefined => msg.has(key) ? Number(msg.get(key)) : undefined;
		const chime = num("CHIME_ENABLED");
		const vibe = num("VIBE_ENABLED");
		const volume = num("CHIME_VOLUME");
		const touch = num("TOUCH_ENABLED");
		const melody = num("CHIME_MELODY");
		settings = {
			chime: chime === undefined ? settings.chime : chime !== 0,
			vibe: vibe === undefined ? settings.vibe : vibe !== 0,
			volume: volume === undefined ? settings.volume : Math.max(0, Math.min(100, volume)),
			touch: touch === undefined ? settings.touch : touch !== 0,
			melody: melody === undefined ? settings.melody : (MELODY_ORDER[melody] ?? settings.melody),
		};
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
		console.log(`settings: chime=${settings.chime} vibe=${settings.vibe} volume=${settings.volume} touch=${settings.touch} melody=${settings.melody}`);
		if (num("PREVIEW")) alert(); // Save on the phone plays the new choice once
	},
});

// FFI bindings from src/c/chime.c. All three are absent when the mod was built without FFI.
declare const Natives: {
	chime_muted?(): number;
	chime_set_note?(index: number, midi: number, durationMs: number): number;
	chime_play?(count: number, volume: number): number;
} | undefined;

function chime(melody: Note[]): boolean {
	try {
		if (typeof Natives === "undefined" || !Natives.chime_muted || !Natives.chime_set_note || !Natives.chime_play) return false;
		if (Natives.chime_muted()) return false;
		for (let i = 0; i < melody.length; i++)
			Natives.chime_set_note(i, melody[i].midi, melody[i].ms);
		return 0 !== Natives.chime_play(melody.length, settings.volume);
	}
	catch {
		return false; // Speaker unavailable: the vibe is the alert.
	}
}

// [on, off, on, off, ...] in ms. Pulses under 150 ms barely register on the wrist.
const VIBE_GAP_MS = 60;
function vibePattern(melody: Note[]): number[] {
	const pattern: number[] = [];
	for (const note of melody) {
		if (pattern.length) pattern.push(VIBE_GAP_MS);
		pattern.push(Math.max(note.ms - VIBE_GAP_MS, 150));
	}
	return pattern;
}

function alert(): void {
	const melody = MELODIES[settings.melody];
	if (settings.vibe) Vibes.pattern(vibePattern(melody));
	const played = settings.chime && chime(melody);
	console.log(`alert: melody=${settings.melody} vibe=${settings.vibe} chime=${settings.chime} played=${played}`);
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
				if (type === "down") this.next();
				else if (type === "select") this.restartStep();
				else if (type === "up") this.previous();
			},
		});
		this.enterStep(0);
	}

	next(): void {
		const last = RECIPE.length - 1;
		this.enterStep(this.index >= last ? 0 : this.index + 1);
	}

	previous(): void {
		if (this.index > 0)
			this.enterStep(this.index - 1);
	}

	restartStep(): void {
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
			? "DN start over"
			: "UP back  SEL redo  DN next";
		this.ui.TIME.style = timeStyle;

		if (step.seconds > 0) {
			this.startTicks = Time.ticks;
			this.durationMs = step.seconds * 1000;
			this.ui.TIME.string = formatTime(step.seconds);
			this.ticker = setInterval(() => this.tick(), 250);
		}
		else {
			this.ui.TIME.style = timeIdleStyle;
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
			this.ui.INSTR.string = "Time! DN for next step.";
			alert();
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
