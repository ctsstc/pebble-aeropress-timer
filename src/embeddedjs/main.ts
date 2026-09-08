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
	seconds: number; // 0 = untimed step (no countdown); overridden when `time` is set
	instr: string;
	time?: "bloom" | "steep"; // take the duration from this setting instead
}

// ---- Your recipe -----------------------------------------------------------
const RECIPE: Step[] = [
	{ name: "POUR",  seconds: 0,  instr: "Invert press. Add coffee, pour water." },
	{ name: "BLOOM", seconds: 30, instr: "Let it sit.", time: "bloom" },
	{ name: "STIR",  seconds: 0,  instr: "Give it a good stir." },
	{ name: "STEEP", seconds: 90, instr: "Almost there...", time: "steep" },
	{ name: "PRESS", seconds: 0,  instr: "Cap on, flip onto mug, press slow." },
	{ name: "DONE",  seconds: 0,  instr: "Enjoy your coffee!" },
];

// Chime at 0:00. MIDI note numbers (60 = C4); the vibe pulses once per note in the same rhythm.
// Which melody plays, the volume, and on/off live in settings.
type Melody = "single" | "triple" | "teapot" | "kettle" | "tada";
const MELODY_ORDER: Melody[] = ["single", "tada", "triple", "teapot", "kettle"]; // CHIME_MELODY index, shared with src/pkjs/index.js

interface Note {
	midi: number;
	ms: number;
}

const MELODIES: Record<Melody, Note[]> = {
	single: [{ midi: 79, ms: 500 }],
	tada: [ // short pickup, then a held fourth above it
		{ midi: 79, ms: 140 }, { midi: 84, ms: 560 },
	],
	triple: [{ midi: 72, ms: 120 }, { midi: 76, ms: 120 }, { midi: 79, ms: 120 }],
	teapot: [ // a rising run that lands an octave up
		{ midi: 72, ms: 280 }, { midi: 74, ms: 280 }, { midi: 76, ms: 140 },
		{ midi: 77, ms: 140 }, { midi: 79, ms: 280 }, { midi: 84, ms: 420 },
	],
	kettle: [ // a kettle coming to the boil, then two warbles
		{ midi: 76, ms: 90 }, { midi: 83, ms: 90 }, { midi: 88, ms: 340 },
		{ midi: 86, ms: 100 }, { midi: 88, ms: 300 },
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
const nameStyle     = new Style({ font: "bold 36px Gothic", color: COLOR_TEXT, horizontal: "center", vertical: "middle" });
const timeStyle     = new Style({ font: "bold 49px Roboto", color: COLOR_TIME, horizontal: "center", vertical: "middle" });
const timeDoneStyle = new Style({ font: "bold 49px Roboto", color: COLOR_DONE, horizontal: "center", vertical: "middle" });
const timeIdleStyle = new Style({ font: "bold 42px Bitham", color: COLOR_DIM,  horizontal: "center", vertical: "middle" }); // Roboto 49 has no hyphen glyph
const instrStyle    = new Style({ font: "bold 24px Gothic", color: COLOR_TEXT, horizontal: "center" });
const footStyle     = new Style({ font: "18px Gothic",      color: COLOR_DIM,  horizontal: "center", vertical: "middle" });
const railStyle     = new Style({ font: "bold 24px Gothic", color: COLOR_DIM,  horizontal: "center" });
const railSkin      = new Skin({ fill: COLOR_DIM });

// A thin overlay down the right edge naming each tap zone, lined up with the
// physical buttons. The zones themselves are full-width thirds of the screen.
const RAIL_W = 22;
const FOOT_H = 22;
const TIME_H = 58;
const TIME_TOP = Math.round((screen.height - TIME_H) / 2); // the countdown is pinned to the centre
const NAME_H = 42;
const NAME_TOP = Math.round((TIME_TOP - NAME_H) / 2);
const INSTR_TOP = TIME_TOP + TIME_H + 6;
const INSTR_H = screen.height - INSTR_TOP - FOOT_H - 4;
const INSET = RAIL_W;
const zoneCenter = (zone: number): number => Math.round(screen.height * (2 * zone + 1) / 6);
const RailIcon = (($: any, glyph: string, zone: number) => Label($, {
	left: 0, width: RAIL_W, top: zoneCenter(zone) - 14, height: 28,
	style: railStyle, string: glyph,
}));

// The built-in fonts carry no up or down triangle, so stack bars into one.
const RailArrow = (($: any, pointUp: boolean, zone: number): any[] => {
	const widths = pointUp ? [3, 7, 11, 15] : [15, 11, 7, 3];
	const cx = RAIL_W >> 1;
	const top = zoneCenter(zone) - widths.length;
	return widths.map((w, i) => Content($, {
		left: cx - (w >> 1), top: top + i * 2, width: w, height: 2, skin: railSkin,
	}));
});

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
		Label($, { anchor: "NAME",  left: INSET, right: INSET, top: NAME_TOP,  height: NAME_H,  style: nameStyle,  string: "" }),
		Label($, { anchor: "TIME",  left: INSET, right: INSET, top: TIME_TOP,  height: TIME_H,  style: timeStyle,  string: "" }),
		Text($,  { anchor: "INSTR", left: INSET, right: INSET, top: INSTR_TOP, height: INSTR_H, style: instrStyle, string: "" }),
		Label($, { anchor: "FOOT",  left: 0,     right: 0,     bottom: 2,     height: FOOT_H,  style: footStyle,  string: "" }),
		Container($, { anchor: "RAIL", right: 0, width: RAIL_W, top: 0, bottom: 0, contents: [
			...RailArrow($, true, 0),
			RailIcon($, "\u267B", 1),
			...RailArrow($, false, 2),
		]}),
	],
}));

// Settings arrive from the phone config page (src/pkjs/index.js) and persist on the watch.
interface Settings {
	chime: boolean;
	vibe: boolean;
	volume: number;
	touch: boolean;
	railIcons: boolean;
	simplified: boolean;
	melody: Melody;
	bloom: number; // seconds
	steep: number;
}

function isTimed(step: Step): boolean {
	return step.seconds > 0 || step.time !== undefined;
}

function activeRecipe(): Step[] {
	return settings.simplified ? RECIPE.filter(isTimed) : RECIPE;
}

const MIN_SECONDS = 5;
const MAX_SECONDS = 600;

const DEFAULT_SETTINGS: Settings = { chime: true, vibe: true, volume: 40, touch: true, railIcons: true, simplified: false, melody: "kettle", bloom: 30, steep: 90 };
const SETTINGS_KEY = "settings";

function loadSettings(): Settings {
	try {
		const raw = localStorage.getItem(SETTINGS_KEY);
		if (raw) {
			const saved: Settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
			if (!MELODY_ORDER.includes(saved.melody)) saved.melody = DEFAULT_SETTINGS.melody;
			const old = saved as unknown as { steep1?: number; steep2?: number };
			if (old.steep1 !== undefined) saved.bloom = old.steep1; // pre-1.11 names
			if (old.steep2 !== undefined) saved.steep = old.steep2;
			return saved;
		}
	}
	catch {}
	return { ...DEFAULT_SETTINGS };
}

let settings = loadSettings();

const inbox: Message = new Message({
	keys: ["CHIME_ENABLED", "VIBE_ENABLED", "CHIME_VOLUME", "TOUCH_ENABLED", "CHIME_MELODY", "PREVIEW", "BLOOM_SECONDS", "STEEP_SECONDS", "RAIL_ICONS", "SIMPLE_STEPS"],
	input: 256, // a handful of int tuples; the default is 8 KB each way
	output: 32,
	onReadable: () => {
		const msg = inbox.read();
		const num = (key: string): number | undefined => msg.has(key) ? Number(msg.get(key)) : undefined;
		const chime = num("CHIME_ENABLED");
		const vibe = num("VIBE_ENABLED");
		const volume = num("CHIME_VOLUME");
		const touch = num("TOUCH_ENABLED");
		const railIcons = num("RAIL_ICONS");
		const simplified = num("SIMPLE_STEPS");
		const melody = num("CHIME_MELODY");
		const duration = (key: string, current: number): number => {
			const value = num(key);
			return value === undefined ? current : Math.max(MIN_SECONDS, Math.min(MAX_SECONDS, value));
		};
		settings = {
			chime: chime === undefined ? settings.chime : chime !== 0,
			vibe: vibe === undefined ? settings.vibe : vibe !== 0,
			volume: volume === undefined ? settings.volume : Math.max(0, Math.min(100, volume)),
			touch: touch === undefined ? settings.touch : touch !== 0,
			railIcons: railIcons === undefined ? settings.railIcons : railIcons !== 0,
			simplified: simplified === undefined ? settings.simplified : simplified !== 0,
			melody: melody === undefined ? settings.melody : (MELODY_ORDER[melody] ?? settings.melody),
			bloom: duration("BLOOM_SECONDS", settings.bloom),
			steep: duration("STEEP_SECONDS", settings.steep),
		};
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
		console.log(`settings: chime=${settings.chime} vibe=${settings.vibe} volume=${settings.volume} touch=${settings.touch} railIcons=${settings.railIcons} simplified=${settings.simplified} melody=${settings.melody} bloom=${settings.bloom} steep=${settings.steep}`);
		controller?.applyChrome();
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
	private steps: Step[] = activeRecipe();
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
		this.applyChrome();
		this.enterStep(0);
	}

	applyChrome(): void {
		this.ui.RAIL.visible = settings.railIcons;
		const next = activeRecipe();
		if (next.length !== this.steps.length) {
			this.steps = next;
			this.enterStep(0);
		}
	}

	next(): void {
		const last = this.steps.length - 1;
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
		const step = this.steps[i];
		const seconds = step.time ? settings[step.time] : step.seconds;

		this.ui.NAME.string = step.name;
		this.ui.INSTR.string = step.instr;
		this.ui.FOOT.string = (i === this.steps.length - 1)
			? "start over"
			: `step ${i + 1} of ${this.steps.length}`;
		this.ui.TIME.style = timeStyle;

		if (seconds > 0) {
			this.startTicks = Time.ticks;
			this.durationMs = seconds * 1000;
			this.ui.TIME.string = formatTime(seconds);
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
			// A timer on the final step means the brew is over, not that another step waits.
			this.ui.INSTR.string = (this.index === this.steps.length - 1)
				? "Time! Enjoy your cup."
				: "Time! DN for next step.";
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
