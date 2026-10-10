"""Record the emery emulator through part of a brew as an animated GIF.

Scenes: "brew" runs the whole recipe, "finish" is the plunge through to the
steaming cup. Start with the app open on POUR, then run with pebble-tool's
Python, which has Pillow and pebble_tool importable:

    ~/.local/share/uv/tools/pebble-tool/bin/python -I store/capture-brew.py brew|finish [out.gif]
"""
import json
import os
import socket
import sys
import tempfile
import threading
import time

from PIL import Image
from pebble_tool.commands.screenshot import ScreenshotCommand

FPS = 15
# setup: keys pressed before recording. script: (seconds to hold, then the key
# to press); each hold lets that step's tween finish. rest: extra ms on the last frame.
SCENES = {
    "brew": {
        "setup": [],
        "script": [
            (1.6, "down"),  # -> BLOOM
            (2.2, "down"),  # -> STIR
            (1.6, "down"),  # -> STEEP
            (2.4, "down"),  # -> PRESS
            (2.8, "down"),  # -> DONE
            (3.4, None),
        ],
        "rest": 1200,
        "out": "emery_1_brew.gif",
    },
    "finish": {
        "setup": ["down", "down", "down"],  # -> STEEP
        "script": [
            (0.0, "down"),  # -> PRESS
            (2.6, "down"),  # -> DONE
            (6.6, None),
        ],
        "rest": 300,
        "out": "emery_5_finish.gif",
    },
}
LEVELS = (0, 85, 170, 255)
TITLE = (50, 8, 172, 60)  # the step name, clear of the art column and the rail

scene = SCENES[sys.argv[1] if len(sys.argv) > 1 else "brew"]
here = os.path.dirname(os.path.abspath(__file__))
out_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(here, "screenshots", scene["out"])
with open(os.path.join(tempfile.gettempdir(), "pb-emulator.json")) as f:
    port = next(iter(json.load(f)["emery"].values()))["qemu"]["monitor"]


def drain(s):
    try:
        s.recv(4096)
    except OSError:
        pass


def monitor(cmd):
    with socket.create_connection(("127.0.0.1", port), timeout=1.0) as s:
        s.settimeout(0.3)
        drain(s)
        s.sendall((cmd + "\n").encode())
        drain(s)


def drive(done):
    for hold, key in scene["script"]:
        time.sleep(hold)
        if key:
            monitor("sendkey " + key)
    done.set()


# screendump records the panel unlit and uncorrected. Normalise each frame to
# full brightness, snap to the 64-colour palette, then apply the same colour
# correction `pebble screenshot` does so the GIF matches the static shots.
correct = ScreenshotCommand()._correct_colours


def load(path):
    img = Image.open(path).convert("RGB")
    w, h = img.size
    data = img.tobytes()
    scale = 255.0 / (max(data) or 255)
    px = [min(LEVELS, key=lambda lv: abs(lv - c * scale)) for c in data]
    rows = correct([px[y * w * 3:(y + 1) * w * 3] for y in range(h)])
    return Image.frombytes("RGB", (w, h), bytes(v for row in rows for v in row))


def landed(path):
    deadline = time.time() + 1.0
    while time.time() < deadline:
        if os.path.exists(path) and os.path.getsize(path) > 0:
            return True
        time.sleep(0.01)
    return False


frames_dir = tempfile.mkdtemp(prefix="brew-gif-")
before = None
if scene["setup"]:
    for key in scene["setup"]:
        monitor("sendkey " + key)
        time.sleep(0.35)
    time.sleep(1.5)
    ref = os.path.join(frames_dir, "before.ppm")
    monitor("screendump " + ref)
    if landed(ref):
        before = load(ref).crop(TITLE).tobytes()

done = threading.Event()
threading.Thread(target=drive, args=(done,), daemon=True).start()
raw = []
start = time.perf_counter()
while not done.is_set():
    wait = start + len(raw) / FPS - time.perf_counter()
    if wait > 0:
        time.sleep(wait)
    path = os.path.join(frames_dir, "{:04d}.ppm".format(len(raw)))
    monitor("screendump " + path)
    raw.append((time.perf_counter() - start, path))
time.sleep(0.5)

frames = [(t, load(p)) for t, p in raw if os.path.exists(p) and os.path.getsize(p) > 0]
# A scene that starts mid-brew opens on the step it lands on, not the one it set up from.
while before and frames and frames[0][1].crop(TITLE).tobytes() == before:
    frames.pop(0)

kept, durations = [], []
for i, (t, img) in enumerate(frames):
    nxt = frames[i + 1][0] if i + 1 < len(frames) else t + 1.0 / FPS
    ms = max(20, round((nxt - t) * 1000))
    if kept and img.tobytes() == kept[-1].tobytes():
        durations[-1] += ms
    else:
        kept.append(img)
        durations.append(ms)
durations[-1] += scene["rest"]

kept[0].save(out_path, save_all=True, append_images=kept[1:], duration=durations, loop=0, disposal=1)
print("{} frames, {} kept, {:.1f}s -> {}".format(len(frames), len(kept), sum(durations) / 1000.0, out_path))
