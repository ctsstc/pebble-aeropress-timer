var CONFIG_URL = "https://ctsstc.github.io/pebble-aeropress-timer/";
var STORAGE_KEY = "settings";

function loadSettings() {
  try {
    var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) return saved;
  } catch (e) {}
  return null;
}

function toMessage(s) {
  return {
    CHIME_ENABLED: s.chime ? 1 : 0,
    VIBE_ENABLED: s.vibe ? 1 : 0,
    CHIME_VOLUME: Number(s.volume)
  };
}

function send(s) {
  Pebble.sendAppMessage(toMessage(s),
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
  send(s);
});
