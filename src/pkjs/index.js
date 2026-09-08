var CONFIG_URL = "https://ctsstc.github.io/pebble-aeropress-timer/";
var STORAGE_KEY = "settings";
var GRAPHICS = ["none", "static", "animated"]; // GRAPHICS index, shared with main.ts
var MELODIES = ["single", "tada", "triple", "teapot", "kettle"]; // CHIME_MELODY index, shared with main.ts

function loadSettings() {
  try {
    var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) return saved;
  } catch (e) {}
  return null;
}

function toMessage(s, preview) {
  var melody = MELODIES.indexOf(s.melody);
  return {
    PREVIEW: preview ? 1 : 0,
    CHIME_ENABLED: s.chime ? 1 : 0,
    VIBE_ENABLED: s.vibe ? 1 : 0,
    CHIME_VOLUME: Number(s.volume),
    TOUCH_ENABLED: s.touch === false ? 0 : 1,
    RAIL_ICONS: s.railIcons === false ? 0 : 1,
    SIMPLE_STEPS: s.simplified ? 1 : 0,
    GRAPHICS: GRAPHICS.indexOf(s.graphics) < 0 ? 2 : GRAPHICS.indexOf(s.graphics),
    CHIME_MELODY: melody < 0 ? 4 : melody,
    BLOOM_SECONDS: Number(s.bloom !== undefined ? s.bloom : s.steep1) || 30,
    STEEP_SECONDS: Number(s.steep !== undefined ? s.steep : s.steep2) || 90
  };
}

function send(s, preview) {
  Pebble.sendAppMessage(toMessage(s, preview),
    function () { console.log("settings sent to watch"); },
    function (err) { console.log("settings send failed: " + JSON.stringify(err)); });
}

Pebble.addEventListener("ready", function () {
  var saved = loadSettings();
  if (saved) send(saved);
});

Pebble.addEventListener("showConfiguration", function () {
  var saved = loadSettings();
  var url = CONFIG_URL + (saved ? "?settings=" + encodeURIComponent(JSON.stringify(saved)) : "");
  Pebble.openURL(url);
});

Pebble.addEventListener("webviewclosed", function (e) {
  if (!e || !e.response) return;
  var s;
  try {
    s = JSON.parse(decodeURIComponent(e.response));
  } catch (err) {
    console.log("settings: unreadable response");
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  send(s, true); // saving from the page also plays the chime on the watch
});
