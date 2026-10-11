# Golden Pastry promo — finishing on the PC

The film is a HyperFrames project (1080×1920, 30 fps). Picture, timing and effects are done;
what this cloud build could not have is the real voice and the 2.7.5 screenshots, which live on the PC.
`node tools/build.cjs <lang>` re-times every scene and every sound effect to the voice files it finds.

## What is in the project

| Path | What |
| --- | --- |
| `index.html` | host: 10 scene slots + the audio block (both written by `tools/build.cjs`) |
| `compositions/s1-hook.html … s10-end.html` | the scenes; every beat is anchored to a voice line |
| `lib/gp.js` | shared helpers (characters, phone/tablet, snow, flame pieces, bursts, rings) |
| `lib/copy.js` | on-screen words, EN + RO |
| `lib/cues.js` | generated: line + scene times, screenshot paths, crops |
| `vo/lines.json` | the 27 lines (EN + RO) and how they were grouped into takes |
| `vo/durations-en.json` | measured lengths of the Tara lines, used until the wav files are in place |
| `tools/sfx-cues.json` | 117 effect cues, anchored to lines (`"13"` = start of line 13, `"13>"` = its end, `"s5-frozen"` = scene start) |
| `tools/make-sfx.py` | builds `assets/sfx/*.wav` (committed) from the Pixabay sounds bundled with hyperframes: copy `~/.claude/skills/media-use/audio/assets/sfx/*.mp3` to `assets/sfx/src/` first if you rebuild them |
| `tools/screens.json` | optional crop per screenshot (e.g. start the lab board below the test announcement) |
| `assets/screens/` | **stand-ins captured from v2.0.3** — replace with the 2.7.5 shots |

## Steps (from `golden-pastry/`)

1. `git pull` on branch `ccr-9459c5ac-gs597d`.
2. Voice: copy `inbox/vo/en/01.wav … 27.wav` to `assets/vo/en/`.
3. Screens: copy the 2.7.5 shots from `inbox/screens/` to `assets/screens/`, keeping their names
   (`shop-catalog-frozen-full-en.png`, `shop-order-form-en.png`, `shop-order-sent-en.png`, `lab-board-tablet-ro.png`, …).
   The build picks `<name>-<lang>`, else the other language (staff pages are RO-only), else a fallback screen.
   Delete the old v2.0.3 stand-ins that the 2.7.5 set replaces (same names are simply overwritten).
4. Lab board: open `lab-board-tablet-ro.png`, note how many pixel rows the "SUS · Fondator Demo" announcement
   takes from the top, and put that number in `tools/screens.json` → `"lab-board-tablet": {"top": N, "width": 1640}`.
5. `node tools/build.cjs en` — prints "27/27 voice lines from files" and the new scene layout.
6. `npx hyperframes check` — must end with 0 errors.
7. `npx hyperframes snapshot --at 2,9,15,19,24,30,35,39,47,55 --no-end --describe false` and look at the contact sheet.
8. `npx hyperframes render --output renders/golden-pastry-en.mp4 --fps 30 --quality delivery`
9. Romanian: put the chosen voice's lines in `assets/vo/ro/01.wav … 27.wav` (16-bit 48 kHz mono, trimmed,
   same loudness chain as the Tara lines), then `node tools/build.cjs ro` and render `renders/golden-pastry-ro.mp4`.
   Run `node tools/build.cjs en` again afterwards if you go back to the English film.

## Rules kept from LiraPay

- Screenshots are shown as they are, figures untouched; nothing is redrawn.
- No invented claims: 24–48 h, −18 °C cold chain, bake-off straight from the freezer, finished product
  thawed and sold, trial pack of 3 per product — all from goldenpastry.ro.
- Effects: re-pitched pops/pings/chimes on C-major notes; every second use of a sound with a `-b` variant plays the variant.
