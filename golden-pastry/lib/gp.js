// Shared helpers for the Golden Pastry film (window.GP). Every scene builds on these.
// All motion is deterministic: seeded randomness, proxy tweens with onUpdate, finite repeats.
(function () {
  const GP = (window.GP = window.GP || {});
  GP.W = 1080;
  GP.H = 1920;
  GP.C = {
    cream: "#FFFBF3", cream2: "#F8F0E2", cream3: "#F1E6D4", cream4: "#E7D9C2",
    honey: "#F2A63B", honey3: "#F7C46B", honey5: "#E08B22", honey6: "#C4741A",
    crust: "#C9561B", crust6: "#B34A16", crust7: "#9A3610",
    cocoa: "#2B1D13", cocoa7: "#4A3627", cocoa9: "#1B120B",
    ice: "#BFE6FF", ice2: "#7CC6F2", ice3: "#3E8FD1", frost: "#EAF7FF",
    green: "#3E9B5B", red: "#D9433B"
  };

  // ---- cues: line and scene times written by tools/build.cjs into lib/cues.js ----
  GP.cues = function () { return window.GP_CUES; };
  // Local time (seconds from scene start) of a voice line, plus its duration.
  GP.line = function (scene, id) {
    const c = window.GP_CUES, l = c.lines[id];
    return { t: l.t - c.scenes[scene].start, d: l.d, end: l.t + l.d - c.scenes[scene].start };
  };
  GP.sceneDur = function (scene) { return window.GP_CUES.scenes[scene].dur; };
  GP.t = function (key) {
    const lang = (window.GP_CUES && window.GP_CUES.lang) || "en";
    return window.GP_COPY[lang][key];
  };

  GP.seeded = function (seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  };

  GP.mk = function (tag, cls, parent, css, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (css) e.style.cssText = css;
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  };
  GP.svg = function (tag, attrs, parent) {
    const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };

  // Split an element's text into word (or char) spans; <em> words keep their class.
  GP.split = function (el, mode) {
    const parts = [];
    const nodes = Array.from(el.childNodes);
    el.innerHTML = "";
    nodes.forEach(function (n) {
      const isEm = n.nodeType === 1 && n.tagName === "EM";
      const text = n.textContent;
      const units = mode === "chars" ? Array.from(text) : text.split(/(\s+)/);
      units.forEach(function (u) {
        if (u === "") return;
        if (/^\s+$/.test(u)) { el.appendChild(document.createTextNode(" ")); return; }
        const s = document.createElement("span");
        s.className = "w" + (isEm ? " em" : "");
        s.style.display = "inline-block";
        s.textContent = u;
        el.appendChild(s);
        parts.push(s);
      });
    });
    return parts;
  };

  // Blur-pop entrance, the LiraPay house move.
  GP.wordsIn = function (tl, els, at, o) {
    o = o || {};
    tl.fromTo(els, { opacity: 0, y: o.y == null ? 46 : o.y, scale: o.scale == null ? 0.82 : o.scale, filter: "blur(10px)" },
      { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", duration: o.dur || 0.36, ease: o.ease || "back.out(2)",
        stagger: o.stagger == null ? 0.085 : o.stagger, immediateRender: o.ir !== false }, at);
  };
  GP.wordsOut = function (tl, els, at, o) {
    o = o || {};
    tl.to(els, { opacity: 0, y: o.y == null ? -30 : o.y, filter: "blur(8px)", duration: o.dur || 0.25,
      ease: "power2.in", stagger: o.stagger == null ? 0.03 : o.stagger }, at);
  };

  GP.ring = function (tl, parent, x, y, at, o) {
    o = o || {};
    const size = o.size || 220;
    const r = GP.mk("div", "gp-ring", parent, "position:absolute;left:" + (x - size / 2) + "px;top:" + (y - size / 2) +
      "px;width:" + size + "px;height:" + size + "px;border-radius:50%;border:" + (o.width || 10) + "px solid " +
      (o.color || GP.C.honey) + ";opacity:0;pointer-events:none;");
    tl.fromTo(r, { scale: 0.2, opacity: 0.95 }, { scale: o.scale || 2.2, opacity: 0, duration: o.dur || 0.6, ease: "power2.out", immediateRender: false }, at);
    return r;
  };

  const STAR = "M50 0 C55 38 62 45 100 50 C62 55 55 62 50 100 C45 62 38 55 0 50 C38 45 45 38 50 0 Z";
  GP.star = function (parent, size, color, css) {
    const s = GP.svg("svg", { viewBox: "0 0 100 100", width: size, height: size }, parent);
    s.style.cssText = "position:absolute;overflow:visible;" + (css || "");
    GP.svg("path", { d: STAR, fill: color || "#fff" }, s);
    return s;
  };
  GP.sparkles = function (tl, parent, x, y, at, o) {
    o = o || {};
    const n = o.n || 6, rnd = GP.seeded(o.seed || 7), R = o.radius || 170;
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd() * 0.6, d = R * (0.6 + rnd() * 0.6), sz = (o.size || 46) * (0.6 + rnd() * 0.7);
      const s = GP.star(parent, sz, o.color || GP.C.honey3, "left:" + (x + Math.cos(a) * d - sz / 2) + "px;top:" + (y + Math.sin(a) * d - sz / 2) + "px;opacity:0;");
      tl.fromTo(s, { scale: 0, rotation: -40, opacity: 1 }, { scale: 1, rotation: 0, duration: 0.28, ease: "back.out(3)", immediateRender: false }, at + i * 0.035);
      tl.to(s, { scale: 0, opacity: 0, duration: 0.3, ease: "power2.in" }, at + 0.42 + i * 0.035);
      out.push(s);
    }
    return out;
  };

  // Gravity debris (confetti, crumbs, shards) driven by one proxy tween: seek-safe.
  GP.burst = function (tl, parent, x, y, at, o) {
    o = o || {};
    const n = o.n || 24, rnd = GP.seeded(o.seed || 3), colors = o.colors || [GP.C.honey, GP.C.crust, GP.C.honey3, GP.C.cream];
    const ps = [];
    for (let i = 0; i < n; i++) {
      const a = (o.angle == null ? -Math.PI / 2 : o.angle) + (rnd() - 0.5) * (o.spread || Math.PI * 1.6);
      const v = (o.speed || 1300) * (0.45 + rnd() * 0.75);
      const w = (o.size || 22) * (0.5 + rnd()), h = o.round ? w : w * (0.4 + rnd() * 0.5);
      const e = GP.mk("div", "", parent, "position:absolute;left:" + x + "px;top:" + y + "px;width:" + w + "px;height:" + h +
        "px;margin:-" + h / 2 + "px 0 0 -" + w / 2 + "px;border-radius:" + (o.round ? "50%" : "4px") + ";background:" + colors[i % colors.length] + ";opacity:0;");
      ps.push({ e: e, vx: Math.cos(a) * v, vy: Math.sin(a) * v, spin: (rnd() - 0.5) * 900 });
    }
    const p = { t: 0 }, D = o.dur || 1.4, g = o.gravity == null ? 2200 : o.gravity;
    tl.to(p, {
      t: D, duration: D, ease: "none",
      onUpdate: function () {
        const t = p.t;
        ps.forEach(function (q) {
          const k = t / D;
          q.e.style.opacity = t <= 0 ? 0 : String(Math.max(0, 1 - Math.pow(k, 2.2)));
          q.e.style.transform = "translate(" + q.vx * t + "px," + (q.vy * t + 0.5 * g * t * t) + "px) rotate(" + q.spin * t + "deg)";
        });
      }
    }, at);
    return ps;
  };

  // Falling snow over a region, one proxy tween.
  GP.snow = function (tl, parent, at, dur, o) {
    o = o || {};
    const n = o.n || 60, rnd = GP.seeded(o.seed || 21), W = o.w || GP.W, H = o.h || GP.H;
    const fl = [];
    for (let i = 0; i < n; i++) {
      const sz = 8 + rnd() * (o.big || 26);
      const e = o.flakes && rnd() < 0.35 ? GP.flake(parent, sz * 1.6, "#fff") :
        GP.mk("div", "", parent, "position:absolute;width:" + sz + "px;height:" + sz + "px;border-radius:50%;background:#fff;box-shadow:0 0 12px rgba(255,255,255,.9);");
      e.style.left = "0px"; e.style.top = "0px"; e.style.opacity = "0";
      fl.push({ e: e, x: rnd() * W, y0: -60 - rnd() * H, v: 160 + rnd() * 260, sw: 20 + rnd() * 50, ph: rnd() * 6.28, rot: (rnd() - 0.5) * 200 });
    }
    const p = { t: 0 };
    tl.to(p, {
      t: dur, duration: dur, ease: "none",
      onUpdate: function () {
        const t = p.t;
        fl.forEach(function (f) {
          const y = ((f.y0 + f.v * (t + 3)) % (H + 120)) - 60;
          const x = f.x + Math.sin(f.ph + t * 1.7) * f.sw;
          f.e.style.opacity = t <= 0.001 ? 0 : String(Math.min(1, t * 3) * (o.alpha || 0.95));
          f.e.style.transform = "translate(" + x + "px," + y + "px) rotate(" + f.rot * t + "deg)";
        });
      }
    }, at);
    return fl;
  };

  // Six-armed snowflake / ice crystal.
  GP.flake = function (parent, size, color, css) {
    const s = GP.svg("svg", { viewBox: "-50 -50 100 100", width: size, height: size }, parent);
    s.style.cssText = "position:absolute;overflow:visible;" + (css || "");
    const g = GP.svg("g", { stroke: color || "#fff", "stroke-width": 7, "stroke-linecap": "round", fill: "none" }, s);
    for (let i = 0; i < 6; i++) {
      const arm = GP.svg("g", { transform: "rotate(" + i * 60 + ")" }, g);
      GP.svg("path", { d: "M0 0 L0 -44 M0 -26 L-12 -38 M0 -26 L12 -38 M0 -12 L-9 -21 M0 -12 L9 -21" }, arm);
    }
    return s;
  };

  // Ambient edge specks, static (the scene animates them if it wants).
  GP.specks = function (parent, n, seed, colors) {
    const rnd = GP.seeded(seed || 5), out = [];
    colors = colors || [GP.C.honey3, GP.C.crust, GP.C.cream4];
    for (let i = 0; i < n; i++) {
      const edge = rnd(), sz = 8 + rnd() * 16;
      const x = edge < 0.5 ? (rnd() < 0.5 ? 40 + rnd() * 140 : GP.W - 180 + rnd() * 140) : rnd() * GP.W;
      const y = edge < 0.5 ? rnd() * GP.H : (rnd() < 0.5 ? 120 + rnd() * 160 : GP.H - 300 + rnd() * 200);
      out.push(GP.mk("div", "", parent, "position:absolute;left:" + x + "px;top:" + y + "px;width:" + sz + "px;height:" + sz +
        "px;border-radius:50%;background:" + colors[i % colors.length] + ";opacity:.55;"));
    }
    return out;
  };

  GP.shake = function (tl, target, at, o) {
    o = o || {};
    const amp = o.amp || 18, n = o.n || 6, d = (o.dur || 0.3) / n;
    const rnd = GP.seeded(o.seed || 9);
    for (let i = 0; i < n; i++) {
      const k = 1 - i / n;
      tl.to(target, { x: (rnd() - 0.5) * 2 * amp * k, y: (rnd() - 0.5) * 2 * amp * k, duration: d, ease: "none" }, at + i * d);
    }
    tl.to(target, { x: 0, y: 0, duration: d, ease: "power1.out" }, at + n * d);
  };

  // Finite floating bob for decorative orbs.
  GP.bob = function (tl, els, at, dur, o) {
    o = o || {};
    const rnd = GP.seeded(o.seed || 13);
    els.forEach(function (e, i) {
      const per = 1.4 + rnd() * 1.2, reps = Math.max(0, Math.floor(dur / per) - 1);
      tl.to(e, { y: "+=" + 0, duration: 0.001 }, at); // anchor (no-op)
      tl.fromTo(e, { y: -(o.amp || 16) }, { y: o.amp || 16, duration: per, ease: "sine.inOut", yoyo: true, repeat: reps, immediateRender: false }, at + rnd() * 0.5);
    });
  };

  // Glossy clay orb (CSS radial gradient), the film's recurring decoration.
  GP.orb = function (parent, x, y, size, tone, css) {
    const tones = {
      honey: "radial-gradient(circle at 34% 28%, #fff7e0 0%, #F7C46B 22%, #F2A63B 52%, #C4741A 100%)",
      crust: "radial-gradient(circle at 34% 28%, #ffd9c2 0%, #E9814E 24%, #C9561B 56%, #7E2A0C 100%)",
      cream: "radial-gradient(circle at 34% 28%, #ffffff 0%, #FFFBF3 30%, #F1E6D4 70%, #DAC7AC 100%)",
      cocoa: "radial-gradient(circle at 34% 28%, #a58a72 0%, #6A5442 26%, #4A3627 60%, #1B120B 100%)",
      ice: "radial-gradient(circle at 34% 28%, #ffffff 0%, #EAF7FF 26%, #BFE6FF 58%, #3E8FD1 100%)"
    };
    return GP.mk("div", "gp-orb", parent, "position:absolute;left:" + (x - size / 2) + "px;top:" + (y - size / 2) + "px;width:" + size +
      "px;height:" + size + "px;border-radius:50%;background:" + (tones[tone] || tones.honey) +
      ";box-shadow:0 " + size * 0.08 + "px " + size * 0.22 + "px rgba(74,54,39,.22), inset -" + size * 0.06 + "px -" + size * 0.08 + "px " + size * 0.16 + "px rgba(0,0,0,.12);" + (css || ""));
  };

  // A clay croissant character (SVG) with eyes and a mouth. Returns parts for animation.
  // Drawn in a 400x260 box, centred on its own origin via the wrapper.
  let uid = 0;
  GP.croissant = function (parent, w, o) {
    o = o || {};
    uid++;
    const id = "gpc" + uid + (o.id || "");
    const wrap = GP.mk("div", "gp-croissant", parent, "position:absolute;width:" + w + "px;height:" + w * 0.65 + "px;" + (o.css || ""));
    const s = GP.svg("svg", { viewBox: "0 0 400 260", width: "100%", height: "100%" }, wrap);
    s.style.overflow = "visible";
    const defs = GP.svg("defs", {}, s);
    const gr = GP.svg("radialGradient", { id: id + "g", cx: "40%", cy: "30%", r: "75%" }, defs);
    const stops = o.frozen ? [["0%", "#ffffff"], ["35%", "#d9f0ff"], ["75%", "#8fc9ef"], ["100%", "#4f8fc4"]]
      : [["0%", "#ffe9b8"], ["30%", "#F7C46B"], ["65%", "#E08B22"], ["100%", "#9A3610"]];
    stops.forEach(function (st) { GP.svg("stop", { offset: st[0], "stop-color": st[1] }, gr); });
    GP.svg("ellipse", { cx: 200, cy: 236, rx: 150, ry: 16, fill: "rgba(43,29,19,.18)" }, s);
    const body = GP.svg("g", {}, s);
    // lobes: ends small, middle big
    const lobes = [[62, 168, 40, 30, -38], [108, 128, 52, 44, -24], [200, 108, 76, 70, 0], [292, 128, 52, 44, 24], [338, 168, 40, 30, 38]];
    lobes.forEach(function (l, i) {
      GP.svg("ellipse", { cx: l[0], cy: l[1], rx: l[2], ry: l[3], transform: "rotate(" + l[4] + " " + l[0] + " " + l[1] + ")", fill: "url(#" + id + "g)",
        stroke: o.frozen ? "#4f8fc4" : "#9A3610", "stroke-width": 3 }, body);
      if (i > 0 && i < 4) GP.svg("path", { d: "M" + (l[0] - l[2] * 0.5) + " " + (l[1] - l[3] * 0.6) + " Q" + l[0] + " " + (l[1] - l[3] * 0.95) + " " + (l[0] + l[2] * 0.5) + " " + (l[1] - l[3] * 0.6),
        stroke: "rgba(255,255,255,.55)", "stroke-width": 6, fill: "none", "stroke-linecap": "round" }, body);
    });
    const face = GP.svg("g", {}, s);
    const eyes = [], pupils = [];
    [[172, 104], [228, 104]].forEach(function (p) {
      const eg = GP.svg("g", { transform: "translate(" + p[0] + " " + p[1] + ")" }, face);
      const ew = GP.svg("ellipse", { cx: 0, cy: 0, rx: 15, ry: 19, fill: "#fff" }, eg);
      const pu = GP.svg("g", {}, eg);
      GP.svg("circle", { cx: 0, cy: 3, r: 9, fill: "#2B1D13" }, pu);
      GP.svg("circle", { cx: 3, cy: -1, r: 3, fill: "#fff" }, pu);
      eyes.push(eg); pupils.push(pu);
    });
    const cheeks = [GP.svg("ellipse", { cx: 150, cy: 132, rx: 13, ry: 8, fill: "rgba(217,67,59,.35)" }, face),
      GP.svg("ellipse", { cx: 250, cy: 132, rx: 13, ry: 8, fill: "rgba(217,67,59,.35)" }, face)];
    const smile = GP.svg("path", { d: "M184 134 Q200 150 216 134", stroke: "#2B1D13", "stroke-width": 6, fill: "none", "stroke-linecap": "round" }, face);
    const frown = GP.svg("path", { d: "M186 144 Q200 132 214 144", stroke: "#2B1D13", "stroke-width": 6, fill: "none", "stroke-linecap": "round", opacity: 0 }, face);
    return { el: wrap, svg: s, body: body, face: face, eyes: eyes, pupils: pupils, smile: smile, frown: frown, cheeks: cheeks };
  };

  // A round clay "blob" person (customer / dough) with eyes.
  GP.blob = function (parent, size, tone, o) {
    o = o || {};
    const b = GP.orb(parent, 0, 0, size, tone, "left:0;top:0;" + (o.css || ""));
    const s = GP.svg("svg", { viewBox: "0 0 100 100", width: size, height: size }, b);
    s.style.cssText = "position:absolute;left:0;top:0;overflow:visible";
    const eyes = [];
    [[38, 44], [62, 44]].forEach(function (p) {
      const g = GP.svg("g", { transform: "translate(" + p[0] + " " + p[1] + ")" }, s);
      GP.svg("ellipse", { cx: 0, cy: 0, rx: 6.5, ry: 8, fill: "#fff" }, g);
      GP.svg("circle", { cx: 0, cy: 1.5, r: 3.8, fill: "#2B1D13" }, g);
      eyes.push(g);
    });
    const mouth = GP.svg("path", { d: o.happy ? "M40 62 Q50 72 60 62" : "M40 68 Q50 60 60 68", stroke: "#2B1D13", "stroke-width": 3.5, fill: "none", "stroke-linecap": "round" }, s);
    return { el: b, eyes: eyes, mouth: mouth, svg: s };
  };

  // Steam wisps (SVG strokes) drawn on with dashoffset; returns paths.
  GP.steam = function (tl, parent, x, y, at, o) {
    o = o || {};
    const s = GP.svg("svg", { viewBox: "0 0 240 300", width: o.w || 240, height: (o.w || 240) * 1.25 }, parent);
    s.style.cssText = "position:absolute;left:" + (x - (o.w || 240) / 2) + "px;top:" + (y - (o.w || 240) * 1.25) + "px;overflow:visible";
    const ds = ["M60 290 C20 230 100 200 60 140 C20 80 100 60 70 10", "M120 290 C80 230 160 200 120 140 C80 80 160 60 130 10", "M180 290 C140 230 220 200 180 140 C140 80 220 60 190 10"];
    const ps = ds.map(function (d, i) {
      const p = GP.svg("path", { d: d, stroke: o.color || "rgba(255,255,255,.85)", "stroke-width": 14, fill: "none", "stroke-linecap": "round", "stroke-dasharray": "420", "stroke-dashoffset": "420" }, s);
      tl.fromTo(p, { strokeDashoffset: 420, opacity: 0.95 }, { strokeDashoffset: 0, duration: 0.9, ease: "power1.out", immediateRender: false }, at + i * 0.14);
      tl.to(p, { opacity: 0, y: -40, duration: 0.6, ease: "power1.in" }, at + 0.95 + i * 0.14);
      return p;
    });
    return { svg: s, paths: ps };
  };

  // Goo filter markup (LiraPay): blur → alpha contrast → composite.
  GP.gooDefs = function (parent, id, blur) {
    const s = GP.svg("svg", { width: 0, height: 0 }, parent);
    s.style.cssText = "position:absolute";
    const f = GP.svg("filter", { id: id }, GP.svg("defs", {}, s));
    GP.svg("feGaussianBlur", { in: "SourceGraphic", stdDeviation: blur || 14, result: "b" }, f);
    GP.svg("feColorMatrix", { in: "b", mode: "matrix", values: "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 26 -11", result: "goo" }, f);
    GP.svg("feComposite", { in: "SourceGraphic", in2: "goo", operator: "atop" }, f);
    return s;
  };

  // Circular product "badge": photo crop in a cream ring with a soft shadow.
  GP.badge = function (parent, src, size, o) {
    o = o || {};
    const b = GP.mk("div", "gp-badge", parent, "position:absolute;width:" + size + "px;height:" + size + "px;border-radius:50%;" +
      "background:#FFFBF3;padding:" + size * 0.045 + "px;box-shadow:0 " + size * 0.06 + "px " + size * 0.16 + "px rgba(43,29,19,.28);" + (o.css || ""));
    GP.mk("div", "", b, "width:100%;height:100%;border-radius:50%;background:url(" + src + ") " + (o.pos || "50% 46%") + "/" + (o.zoom || 150) + "% no-repeat;");
    return b;
  };
})();

// Phone mockup holding a real app screenshot (shown as is, never redrawn).
// The screenshot fills the screen width; GP.scr(key) resolves the per-language file.
(function () {
  const GP = window.GP;
  GP.scr = function (key) { return (window.GP_CUES.screens || {})[key]; };
  GP.phone = function (parent, w, src, o) {
    o = o || {};
    const h = Math.round(w * 2.164);
    const el = GP.mk("div", "gp-phone", parent, "position:absolute;width:" + w + "px;height:" + h + "px;border-radius:" + w * 0.14 + "px;background:#1B120B;" +
      "box-shadow:0 " + w * 0.06 + "px " + w * 0.16 + "px rgba(43,29,19,.38), inset 0 0 0 " + w * 0.012 + "px #6A5442;" + (o.css || ""));
    const screen = GP.mk("div", "", el, "position:absolute;left:" + w * 0.035 + "px;top:" + w * 0.035 + "px;right:" + w * 0.035 + "px;bottom:" + w * 0.035 + "px;border-radius:" + w * 0.11 + "px;overflow:hidden;background:#F8F0E2;");
    const img = GP.mk("img", "", screen, "position:absolute;left:0;top:0;width:100%;display:block;");
    if (src) img.src = src;
    GP.mk("div", "", el, "position:absolute;left:50%;top:" + w * 0.06 + "px;width:" + w * 0.27 + "px;height:" + w * 0.075 + "px;margin-left:-" + w * 0.135 + "px;border-radius:" + w * 0.04 + "px;background:#1B120B;");
    return { el: el, screen: screen, img: img, w: w, h: h, sw: w * 0.93 };
  };
  // A tap: a soft ring + dot at (x, y) in the parent's frame.
  GP.tap = function (tl, parent, x, y, at) {
    const d = GP.mk("div", "", parent, "position:absolute;left:" + (x - 45) + "px;top:" + (y - 45) + "px;width:90px;height:90px;border-radius:50%;background:rgba(43,29,19,.28);border:6px solid rgba(255,251,243,.9);opacity:0;");
    tl.fromTo(d, { scale: 1.6, opacity: 0 }, { scale: 0.8, opacity: 1, duration: 0.12, ease: "power2.in" }, at);
    tl.to(d, { scale: 1.9, opacity: 0, duration: 0.3, ease: "power2.out" }, at + 0.14);
    return d;
  };
})();

// The oven character and the Frozen / Ready-to-serve switch (scenes 5 and 6).
(function () {
  const GP = window.GP;
  GP.oven = function (parent, w, o) {
    o = o || {};
    const h = w * 0.96;
    const el = GP.mk("div", "gp-oven", parent, "position:absolute;width:" + w + "px;height:" + h + "px;" + (o.css || ""));
    GP.mk("div", "", el, "position:absolute;left:" + w * 0.12 + "px;bottom:-" + w * 0.035 + "px;width:" + w * 0.14 + "px;height:" + w * 0.07 + "px;border-radius:50%;background:#1B120B;");
    GP.mk("div", "", el, "position:absolute;right:" + w * 0.12 + "px;bottom:-" + w * 0.035 + "px;width:" + w * 0.14 + "px;height:" + w * 0.07 + "px;border-radius:50%;background:#1B120B;");
    GP.mk("div", "", el, "position:absolute;inset:0;border-radius:" + w * 0.12 + "px;background:linear-gradient(160deg,#6A5442,#4A3627 55%,#2B1D13);box-shadow:0 " + w * 0.07 + "px " + w * 0.14 + "px rgba(43,29,19,.4), inset 0 " + w * 0.02 + "px 0 rgba(255,255,255,.18);");
    // control panel: two knob eyes
    const eyes = [];
    [0.3, 0.7].forEach(function (fx) {
      const k = GP.mk("div", "", el, "position:absolute;left:" + (w * fx - w * 0.075) + "px;top:" + w * 0.06 + "px;width:" + w * 0.15 + "px;height:" + w * 0.15 + "px;border-radius:50%;background:#FFFBF3;box-shadow:0 0 0 " + w * 0.018 + "px #F2A63B;");
      eyes.push(GP.mk("div", "", k, "position:absolute;left:30%;top:34%;width:40%;height:40%;border-radius:50%;background:#2B1D13;"));
    });
    GP.mk("div", "", el, "position:absolute;left:" + w * 0.2 + "px;right:" + w * 0.2 + "px;top:" + w * 0.255 + "px;height:" + w * 0.035 + "px;border-radius:" + w * 0.02 + "px;background:#F2A63B;");
    const win = GP.mk("div", "", el, "position:absolute;left:" + w * 0.13 + "px;right:" + w * 0.13 + "px;top:" + w * 0.33 + "px;bottom:" + w * 0.1 + "px;border-radius:" + w * 0.07 + "px;background:#1B120B;overflow:hidden;box-shadow:inset 0 0 0 " + w * 0.02 + "px #2B1D13;");
    const glow = GP.mk("div", "", win, "position:absolute;inset:0;background:radial-gradient(circle at 50% 80%,#FFE39A 0%,#F2A63B 35%,#C9561B 70%,#7E2A0C 100%);opacity:0;");
    GP.mk("div", "", win, "position:absolute;left:8%;top:10%;width:22%;height:70%;transform:skewX(-14deg);background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.22),rgba(255,255,255,0));");
    return { el: el, eyes: eyes, win: win, glow: glow, w: w, h: h };
  };

  GP.toggle = function (parent, o) {
    o = o || {};
    const el = GP.mk("div", "gp-toggle", parent, "position:absolute;width:880px;height:140px;border-radius:70px;background:#F1E6D4;box-shadow:inset 0 6px 12px rgba(43,29,19,.14), 0 10px 0 #E7D9C2;" + (o.css || ""));
    const knob = GP.mk("div", "", el, "position:absolute;left:12px;top:12px;width:428px;height:116px;border-radius:58px;background:#FFFBF3;box-shadow:0 8px 18px rgba(43,29,19,.2);");
    const iceK = GP.mk("div", "", knob, "position:absolute;inset:0;border-radius:58px;background:linear-gradient(160deg,#EAF7FF,#7CC6F2);opacity:0;");
    const hotK = GP.mk("div", "", knob, "position:absolute;inset:0;border-radius:58px;background:linear-gradient(160deg,#FBE7CE,#F2A63B);opacity:0;");
    const st = "position:absolute;top:0;height:140px;width:440px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:46px;color:#4A3627;";
    const a = GP.mk("div", "", el, st + "left:0;", GP.t("frozen"));
    const b = GP.mk("div", "", el, st + "left:440px;", GP.t("baked"));
    return { el: el, knob: knob, iceK: iceK, hotK: hotK, a: a, b: b };
  };
})();

// Tablet frame, screenshot cropping, and the delivery van (scene 8).
(function () {
  const GP = window.GP;
  // Shift a screenshot <img> up by the configured crop (tools/screens.json), scaled to its shown width.
  GP.cropTop = function (img, key, shownWidth) {
    const c = (window.GP_CUES.screenCrop || {})[key];
    if (c && c.top) img.style.top = -Math.round(c.top * shownWidth / (c.width || 1170)) + "px";
  };
  GP.tablet = function (parent, w, src, o) {
    o = o || {};
    const h = Math.round(w * 1.44);
    const el = GP.mk("div", "gp-tablet", parent, "position:absolute;width:" + w + "px;height:" + h + "px;border-radius:" + w * 0.06 + "px;background:#1B120B;" +
      "box-shadow:0 " + w * 0.05 + "px " + w * 0.12 + "px rgba(43,29,19,.38), inset 0 0 0 " + w * 0.008 + "px #6A5442;" + (o.css || ""));
    const screen = GP.mk("div", "", el, "position:absolute;left:" + w * 0.035 + "px;top:" + w * 0.035 + "px;right:" + w * 0.035 + "px;bottom:" + w * 0.035 + "px;border-radius:" + w * 0.03 + "px;overflow:hidden;background:#F8F0E2;");
    const img = GP.mk("img", "", screen, "position:absolute;left:0;top:0;width:100%;display:block;");
    if (src) img.src = src;
    return { el: el, screen: screen, img: img, w: w, h: h, sw: w * 0.93 };
  };
  GP.van = function (parent, w, o) {
    o = o || {};
    const el = GP.mk("div", "gp-van", parent, "position:absolute;width:" + w + "px;height:" + w * 0.62 + "px;" + (o.css || ""));
    const s = GP.svg("svg", { viewBox: "0 0 300 186", width: "100%", height: "100%" }, el);
    s.style.overflow = "visible";
    GP.svg("ellipse", { cx: 150, cy: 178, rx: 130, ry: 9, fill: "rgba(43,29,19,.2)" }, s);
    GP.svg("path", { d: "M14 40 Q14 20 34 20 L190 20 Q204 20 212 32 L262 92 Q286 98 286 120 L286 150 Q286 162 274 162 L26 162 Q14 162 14 150 Z", fill: "#FFFBF3", stroke: "#4A3627", "stroke-width": 6 }, s);
    GP.svg("path", { d: "M204 40 L246 92 L204 92 Z", fill: "#BFE6FF", stroke: "#4A3627", "stroke-width": 5, "stroke-linejoin": "round" }, s);
    GP.svg("rect", { x: 14, y: 118, width: 272, height: 16, fill: "#F2A63B" }, s);
    // the gold flower on the side
    const fg = GP.svg("g", { transform: "translate(100 76)" }, s);
    for (let i = 0; i < 8; i++) GP.svg("path", { d: "M0 -4 C6 -12 6 -26 0 -34 C-6 -26 -6 -12 0 -4 Z", fill: "#E0B060", transform: "rotate(" + i * 45 + ")" }, fg);
    GP.svg("circle", { cx: 0, cy: 0, r: 4, fill: "#C48E3E" }, fg);
    const wheels = [];
    [70, 230].forEach(function (x) {
      const g = GP.svg("g", { transform: "translate(" + x + " 162)" }, s);
      const r = GP.svg("g", {}, g);
      GP.svg("circle", { cx: 0, cy: 0, r: 26, fill: "#2B1D13" }, r);
      GP.svg("circle", { cx: 0, cy: 0, r: 11, fill: "#DAC7AC" }, r);
      GP.svg("rect", { x: -3, y: -24, width: 6, height: 14, fill: "#6A5442" }, r);
      r.style.transformOrigin = "0px 0px";
      wheels.push(r);
    });
    return { el: el, wheels: wheels };
  };
})();
