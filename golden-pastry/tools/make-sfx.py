# Builds the effect palette in assets/sfx/ from the Pixabay sounds bundled with the
# hyperframes media-use skill (assets/sfx/src/*.mp3), the same way the LiraPay film did:
# re-pitched pops, pings and chimes on C-major notes, thumps, zips and swells, plus
# Golden Pastry's own ice, snow, fire and kitchen sounds. No downloads, no generation.
# usage: python3 -I tools/make-sfx.py   (from the project folder; needs numpy, scipy, soundfile, ffmpeg)
import json
import pathlib
import subprocess

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "sfx" / "src"
OUT = ROOT / "assets" / "sfx"
SR = 48000
PEAK = 0.5  # -6 dBFS
SOURCE_HZ = {"pop": 663.0, "ping": 2347.0, "chime": 3513.0}
NOTE = {"C5": 523.25, "E5": 659.26, "G5": 783.99, "A5": 880.0, "C6": 1046.5, "D6": 1174.66,
        "E6": 1318.51, "G6": 1567.98, "A6": 1760.0, "C7": 2093.0, "D7": 2349.32, "E7": 2637.02}


def load(name):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(SRC / f"{name}.mp3"), "-ac", "1", "-ar", str(SR),
                          "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def repitch(x, ratio):
    pos = np.arange(0, len(x) - 1, ratio)
    return np.interp(pos, np.arange(len(x)), x)


def glide(x, r0, r1):
    n = int(len(x) / ((r0 + r1) / 2))
    rate = np.linspace(r0, r1, max(n, 2))
    pos = np.cumsum(rate)
    pos = pos[pos < len(x) - 1]
    return np.interp(pos, np.arange(len(x)), x)


def filt(x, kind, hz, order=4):
    return sosfilt(butter(order, hz, btype=kind, fs=SR, output="sos"), x)


def band(x, lo, hi):
    return sosfilt(butter(4, [lo, hi], btype="bandpass", fs=SR, output="sos"), x)


def cut(x, a, b):
    return x[int(a * SR):int(b * SR)]


def fade(x, inn=0.002, out=0.03):
    x = x.copy()
    i, o = int(inn * SR), int(out * SR)
    if i:
        x[:i] *= np.linspace(0, 1, i)
    if o and o < len(x):
        x[-o:] *= np.linspace(1, 0, o)
    return x


def trim(x, floor_db=-60):
    mag = np.abs(x)
    thr = mag.max() * 10 ** (floor_db / 20)
    idx = np.nonzero(mag > thr)[0]
    return x[idx[0]: idx[-1] + 1] if len(idx) else x


def mix(*parts):
    # parts: (signal, offset_seconds, gain)
    end = max(int(o * SR) + len(s) for s, o, g in parts)
    y = np.zeros(end)
    for s, o, g in parts:
        k = int(o * SR)
        y[k:k + len(s)] += s * g
    return y


def norm(x, peak=PEAK):
    m = np.abs(x).max()
    return x * (peak / m) if m else x


def noise(seconds, seed):
    return np.random.default_rng(seed).standard_normal(int(seconds * SR))


def shaped(sig, attack, release):
    n = len(sig)
    a = max(int(attack * SR), 1)
    curve = np.concatenate([np.linspace(0, 1, a), np.exp(-np.linspace(0, 1, n - a) * (n - a) / (release * SR))])
    return sig * curve


S = {k: load(k) for k in ["pop", "ping", "chime", "click", "key-press", "whoosh", "sparkle", "typing",
                           "impact-bass-1", "riser", "glitch-3", "glitch-1", "whoosh-cinematic"]}

pal = {}
lead = {}


def put(name, x, swell=False, peak=PEAK):
    x = norm(fade(trim(x)), peak)
    pal[name] = x
    lead[name] = (len(x) / SR - 0.01) if swell else 0.004


def note_of(src, n):
    return repitch(S[src], NOTE[n] / SOURCE_HZ[src])


# --- LiraPay palette -------------------------------------------------------
for n in ["E5", "G5", "C6", "E6", "G6", "A6", "C7"]:
    put(f"blip-{n}", note_of("pop", n))
for n in ["C6", "E6", "G6", "C7"]:
    put(f"tone-{n}", note_of("ping", n))
for n in ["G6", "C7"]:
    put(f"bell-{n}", filt(note_of("chime", n), "highpass", 300))

thump = filt(repitch(S["pop"], 118 / 663), "lowpass", 420)
put("thump", thump)
put("slam", mix((norm(thump), 0, 1), (norm(S["key-press"]), 0, 0.55)))
put("shatter", mix((norm(thump), 0, 1), (norm(repitch(S["sparkle"], 0.6)), 0, 0.7),
                   (norm(cut(S["glitch-3"], 1.74, 2.0)), 0.01, 0.6)))
put("strike", mix((norm(thump), 0, 1), (norm(note_of("chime", "G5")), 0, 0.7)))
put("chord", mix(*[(norm(note_of("ping", n)), i * 0.035, 0.7) for i, n in enumerate(["C6", "E6", "G6"])],
                 (norm(note_of("pop", "C7")), 0.105, 0.6)))

put("whoosh", S["whoosh"])
put("whoosh-low", repitch(S["whoosh"], 0.7))
put("whoosh-hi", repitch(S["whoosh"], 1.26))
put("whoosh-b", repitch(S["whoosh"], 1.1))
put("whoosh-low-b", repitch(S["whoosh"], 0.62))
put("whoosh-hi-b", repitch(S["whoosh"], 1.4))
put("slam-b", mix((norm(filt(repitch(S["pop"], 104 / 663), "lowpass", 380)), 0, 1), (norm(repitch(S["key-press"], 0.9)), 0, 0.55)))
put("stamp-b", mix((norm(thump), 0, 1), (norm(repitch(S["key-press"], 1.15)), 0, 0.7), (norm(note_of("pop", "E6")), 0.02, 0.25)))
put("zip-up", glide(S["pop"], 0.8, 2.3))
put("zip-up-b", glide(S["pop"], 0.9, 2.6))
put("zip-down", glide(S["pop"], 2.1, 0.7))
put("zip-down-b", glide(S["pop"], 2.4, 0.8))
put("sigh", glide(S["ping"], 0.62, 0.38))
put("slide-down", glide(S["ping"], 1.0, 0.5))
put("rise", glide(S["ping"], 0.5, 1.1)[::-1], swell=True)
put("swell", S["chime"][::-1], swell=True)
put("riser-short", cut(S["riser"], 2.05, 3.5), swell=True)
put("drone", filt(cut(S["impact-bass-1"], 0, 1.9), "lowpass", 200))
put("drip", glide(S["pop"], 1.6, 0.9))
put("drip-lo", glide(S["pop"], 1.2, 0.7))
put("bubble", glide(S["pop"], 0.9, 1.6))
put("bubble-b", glide(S["pop"], 1.0, 1.8))
put("tick", filt(repitch(S["click"], 1.6), "highpass", 800))
put("tock", filt(repitch(S["click"], 1.15), "highpass", 500))
put("key", S["key-press"])
put("typing", S["typing"])
put("sparkle", filt(S["sparkle"], "highpass", 1500))


def run(notes, gap, src="pop"):
    return mix(*[(norm(note_of(src, n)), i * gap, 0.8) for i, n in enumerate(notes)])


put("arp-up", run(["C6", "E6", "G6", "C7"], 0.07))
put("arp-down", run(["C7", "G6", "E6", "C6"], 0.07))
put("tabs-run", run(["C5", "E5", "G5", "C6", "E6", "G6", "C7"], 0.105))

# --- Golden Pastry: shop, ice, fire, kitchen --------------------------------
put("doorbell", mix((norm(filt(note_of("chime", "E6"), "highpass", 300)), 0, 0.9),
                    (norm(filt(note_of("chime", "C6"), "highpass", 300)), 0.2, 0.8)))
put("ding", filt(note_of("chime", "C7"), "highpass", 400))
put("deflate", filt(glide(S["ping"], 0.9, 0.22), "lowpass", 2500))
put("freeze", mix((norm(glide(S["chime"], 0.6, 1.4)[::-1]), 0, 0.7),
                  (norm(filt(S["sparkle"], "highpass", 3000)), 0.15, 0.6)), swell=True)
put("crystal", mix((norm(note_of("ping", "C7")), 0, 0.7), (norm(filt(note_of("chime", "G6"), "highpass", 500)), 0.05, 0.6),
                   (norm(note_of("pop", "A6")), 0.1, 0.4)))
crack = filt(cut(S["glitch-1"], 0.2, 0.42), "highpass", 2200)
put("ice-crack", mix((norm(crack), 0, 0.8), (norm(repitch(S["key-press"], 1.5)), 0, 0.6)))
put("snow", filt(repitch(filt(S["sparkle"], "highpass", 2500), 0.8), "lowpass", 7000))

ign = shaped(band(noise(0.9, 7), 150, 1600), 0.03, 0.35)
put("ignite", mix((norm(repitch(S["whoosh"], 0.6)), 0, 0.8), (norm(ign), 0.04, 0.9)))
rng = np.random.default_rng(11)
crk = np.zeros(int(1.6 * SR))
for _ in range(46):
    t = rng.uniform(0.0, 1.5)
    c = repitch(S["pop"], rng.uniform(3.5, 6.5))[: int(0.02 * SR)]
    c = filt(c, "highpass", 1200) * rng.uniform(0.25, 1.0)
    k = int(t * SR)
    crk[k:k + len(c)] += c[: len(crk) - k]
bed = shaped(band(noise(1.6, 13), 300, 2500), 0.12, 1.0) * 0.08
put("crackle", fade(crk + bed, 0.05, 0.3))
put("steam", fade(shaped(band(noise(1.3, 17), 2500, 9000), 0.35, 0.9), 0.3, 0.4), peak=0.35)
put("drive", filt(repitch(cut(S["whoosh-cinematic"], 0, 3.0), 0.85), "lowpass", 3500))
put("stamp", mix((norm(thump), 0, 1), (norm(S["key-press"]), 0, 0.7), (norm(note_of("pop", "C6")), 0.02, 0.25)))
put("melt", glide(S["pop"], 1.4, 0.6))

for name, x in pal.items():
    sf.write(OUT / f"{name}.wav", x.astype(np.float32), SR, subtype="PCM_16")
json.dump({k: {"duration": round(len(v) / SR, 3), "lead": round(lead[k], 3)} for k, v in pal.items()},
          open(OUT / "palette.json", "w"), indent=1)
print(len(pal), "sounds:", " ".join(pal))
