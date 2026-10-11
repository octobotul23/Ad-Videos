// Lays the film out on the voice: reads each line's real duration (assets/vo/<lang>/NN.wav),
// or estimates it until the recording exists, then writes
//   lib/cues.js           line + scene times the scenes animate against
//   index.html            scene slots (data-start/duration), root duration, <audio> block
// Effects come from tools/sfx-cues.json, anchored to lines, so they move with the voice.
// usage (from the project folder; ffprobe on PATH):  node tools/build.cjs en|ro
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const lang = process.argv[2] || "en";
if (!["en", "ro"].includes(lang)) throw new Error("language must be en or ro");

const lines = JSON.parse(fs.readFileSync(path.join(ROOT, "vo/lines.json"), "utf8"));
const ids = Object.keys(lines.en).sort();

const FIRST = 1.3; // the clock ticks before the first word
// silence after each line (seconds) — the film's rhythm; scene turns get the longer gaps
const GAP = {
  "01": 0.35, "02": 0.45, "03": 0.5, "04": 1.0, "05": 0.55, "06": 0.6, "07": 0.95, "08": 0.35, "09": 0.75,
  "10": 0.3, "11": 1.0, "12": 0.4, "13": 0.8, "14": 0.7, "15": 0.4, "16": 0.85, "17": 0.6, "18": 0.7,
  "19": 0.9, "20": 0.6, "21": 0.8, "22": 0.4, "23": 0.5, "24": 0.8, "25": 0.3, "26": 0.6, "27": 2.2
};
// scene id, its first line, and how long before that line the scene starts
const SCENES = [
  ["s1-hook", "01", null], ["s2-trouble", "05", 0.45], ["s3-reveal", "08", 0.62], ["s4-order", "10", 0.45],
  ["s5-frozen", "12", 0.4], ["s6-baked", "15", 0.4], ["s7-same", "18", 0.38], ["s8-send", "19", 0.42],
  ["s9-full", "22", 0.45], ["s10-end", "25", 0.6]
];
const LEVEL = {
  blip: 0.26, tone: 0.24, bell: 0.24, thump: 0.4, slam: 0.42, shatter: 0.42, strike: 0.4, chord: 0.3,
  whoosh: 0.2, zip: 0.2, sigh: 0.22, slide: 0.2, rise: 0.22, swell: 0.28, riser: 0.2, drone: 0.34, drip: 0.24,
  bubble: 0.28, tick: 0.24, tock: 0.22, key: 0.3, typing: 0.18, sparkle: 0.1, tabs: 0.24, arp: 0.24,
  doorbell: 0.26, ding: 0.26, deflate: 0.26, freeze: 0.3, crystal: 0.24, "ice": 0.26, snow: 0.14,
  ignite: 0.34, crackle: 0.22, steam: 0.16, drive: 0.24, stamp: 0.42, melt: 0.24
};

function probe(file) {
  return parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString());
}
function estimate(text) {
  const k = lang === "ro" ? 0.064 : 0.058;
  return Math.round((text.length * k + 0.28) * 100) / 100;
}

const voDir = path.join(ROOT, "assets/vo", lang);
const measuredFile = path.join(ROOT, "vo", `durations-${lang}.json`);
const measured = fs.existsSync(measuredFile) ? JSON.parse(fs.readFileSync(measuredFile, "utf8")) : {};
const L = {};
let t = FIRST, real = 0;
for (const id of ids) {
  const f = path.join(voDir, id + ".wav");
  let d;
  if (fs.existsSync(f)) { d = Math.round(probe(f) * 1000) / 1000; real++; } else d = measured[id] || estimate(lines[lang][id]);
  L[id] = { t: Math.round(t * 1000) / 1000, d, file: fs.existsSync(f) ? `assets/vo/${lang}/${id}.wav` : null };
  t += d + GAP[id];
}
const TOTAL = Math.round(t * 100) / 100;

const S = {};
SCENES.forEach(([sid, first, pre], i) => {
  const start = pre == null ? 0 : Math.round((L[first].t - pre) * 1000) / 1000;
  S[sid] = { start };
  if (i > 0) S[SCENES[i - 1][0]].dur = Math.round((start - S[SCENES[i - 1][0]].start) * 1000) / 1000;
});
S["s10-end"].dur = Math.round((TOTAL - S["s10-end"].start) * 1000) / 1000;

// ---- effects ----
const palette = JSON.parse(fs.readFileSync(path.join(ROOT, "assets/sfx/palette.json"), "utf8"));
const cues = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/sfx-cues.json"), "utf8"));
function anchorTime(a) {
  if (a.startsWith("s")) return S[a].start;
  if (a.endsWith(">")) { const l = L[a.slice(0, -1)]; return l.t + l.d; }
  return L[a].t;
}
// every second use of a sound that has a "-b" variant plays the variant, so nothing repeats much
const seen = {};
const fx = cues.map(([a, off, name, note]) => {
  if (!palette[name]) throw new Error("unknown effect " + name);
  seen[name] = (seen[name] || 0) + 1;
  if (seen[name] % 2 === 0 && palette[name + "-b"] && !name.endsWith("-b")) name = name + "-b";
  const fam = name.split("-")[0];
  const at = anchorTime(a) + off;
  return { at, name, note, vol: LEVEL[fam] ?? 0.24, dur: palette[name].duration, start: Math.max(0, at - palette[name].lead) };
}).sort((x, y) => x.at - y.at);
for (let i = 1; i < fx.length; i++) {
  if (fx[i].at - fx[i - 1].at < 0.095) {
    const shift = 0.095 - (fx[i].at - fx[i - 1].at);
    fx[i].at += shift; fx[i].start += shift;
  }
}
fx.forEach((e) => { e.dur = Math.round(Math.min(e.dur, TOTAL - e.start) * 1000) / 1000; });
const ends = [];
fx.forEach((e) => {
  let k = ends.findIndex((x) => x <= e.start - 0.01);
  if (k < 0) { ends.push(0); k = ends.length - 1; }
  ends[k] = e.start + e.dur;
  e.track = 11 + k;
});

// ---- screenshots: per-language file, else the other language, else a fallback screen ----
const SCREENS = {
  "shop-hero": [], "shop-hero-full": ["shop-hero"],
  "shop-catalog-frozen": ["shop-catalog-baked", "shop-hero"], "shop-catalog-baked": ["shop-catalog-frozen", "shop-hero"],
  "shop-catalog-frozen-full": ["shop-catalog-baked-full", "shop-hero-full"], "shop-catalog-baked-full": ["shop-catalog-frozen-full", "shop-hero-full"],
  "shop-cart": ["shop-catalog-baked"], "shop-trial-pack": ["shop-catalog-baked"], "shop-order-form": ["shop-cart"],
  "shop-order-sent": ["shop-order-form", "shop-cart"], "lab-board": [], "lab-board-tablet": ["lab-board"], "driver-route": [], "admin-orders": []
};
function findScreen(key) {
  for (const l of [lang, lang === "en" ? "ro" : "en"]) for (const ext of ["png", "jpg", "webp"]) {
    const rel = `assets/screens/${key}-${l}.${ext}`;
    if (fs.existsSync(path.join(ROOT, rel))) return rel;
  }
  return null;
}
const screens = {};
// optional crop per screen (source pixels): tools/screens.json {"lab-board-tablet": {"top": 260, "width": 1640}}
const cropFile = path.join(ROOT, "tools/screens.json");
const screenCrop = fs.existsSync(cropFile) ? JSON.parse(fs.readFileSync(cropFile, "utf8")) : {};
for (const [key, fb] of Object.entries(SCREENS)) {
  screens[key] = findScreen(key);
  for (const f of fb) if (!screens[key]) screens[key] = findScreen(f);
}

// ---- write lib/cues.js ----
const cueJs = "// generated by tools/build.cjs — do not edit\nwindow.GP_CUES = " +
  JSON.stringify({ lang, total: TOTAL, screens, screenCrop, lines: Object.fromEntries(Object.entries(L).map(([k, v]) => [k, { t: v.t, d: v.d }])), scenes: S }, null, 1) + ";\n";
fs.writeFileSync(path.join(ROOT, "lib/cues.js"), cueJs);

// ---- rewrite index.html ----
const idxPath = path.join(ROOT, "index.html");
let html = fs.readFileSync(idxPath, "utf8");
const r3 = (x) => Math.round(x * 1000) / 1000;
const sceneTags = SCENES.map(([sid], i) =>
  `      <div id="el-${sid}" data-composition-id="${sid}" data-composition-src="compositions/${sid}.html" data-start="${S[sid].start}" data-duration="${S[sid].dur}" data-track-index="1" data-width="1080" data-height="1920"></div>`).join("\n");
const vo = ids.filter((id) => L[id].file).map((id) =>
  `      <audio id="vo-${id}" src="${L[id].file}" data-start="${L[id].t}" data-duration="${L[id].d}" data-track-index="10" data-volume="1"></audio>`);
const fxTags = fx.map((e, i) =>
  `      <audio id="fx-${String(i + 1).padStart(2, "0")}" src="assets/sfx/${e.name}.wav" data-start="${r3(e.start)}" data-duration="${e.dur}" data-track-index="${e.track}" data-volume="${e.vol}"></audio> <!-- ${e.note} -->`);
html = html.replace(/<!-- BUILD:scenes -->[\s\S]*?<!-- \/BUILD:scenes -->/, `<!-- BUILD:scenes -->\n${sceneTags}\n      <!-- /BUILD:scenes -->`);
html = html.replace(/<!-- BUILD:audio[^>]*-->[\s\S]*?<!-- \/BUILD:audio -->/,
  `<!-- BUILD:audio (${lang}: ${vo.length} voice lines, ${fx.length} effects) -->\n${vo.join("\n")}\n${fxTags.join("\n")}\n      <!-- /BUILD:audio -->`);
html = html.replace(/(<div\s+id="root"[^>]*?data-duration=")[^"]*(")/, `$1${TOTAL}$2`);
html = html.replace(/<html lang="[a-z]+"/, `<html lang="${lang}"`);
fs.writeFileSync(idxPath, html);

console.log(`screens: ${Object.entries(screens).map(([k, v]) => k + (v ? "" : " (none)")).filter((x) => x.includes("none")).join(", ") || "all found"}`);
console.log(`${lang}: ${real}/${ids.length} voice lines from files${real < ids.length ? (Object.keys(measured).length > 1 ? " (rest from vo/durations-" + lang + ".json)" : " (rest estimated)") : ""}, ${fx.length} effects on ${ends.length} tracks, film ${TOTAL}s`);
SCENES.forEach(([sid]) => console.log(`  ${sid.padEnd(11)} ${S[sid].start.toFixed(2).padStart(6)}  +${S[sid].dur.toFixed(2)}`));
