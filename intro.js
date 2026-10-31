/* LuccAlfa Immobiliare — intro.js
   L'omino arancione della scena d'ingresso, in stile Street View.
   Lo scorrimento decide SOLO quando l'omino cade (e quando torna su): la caduta ha tempi
   propri, come un oggetto vero (gravità, schiacciamento all'atterraggio, anello, ombra),
   così non dipende da quanto velocemente gira la rotella. Braccia e gambe sono attaccate al
   corpo con giunti nascosti dentro il busto e si muovono con piccole molle. */
(() => {
  "use strict";
  const intro = document.querySelector(".intro"), peg = document.getElementById("peg");
  if (!intro || !peg) return;
  const css = window.CSS && CSS.supports && CSS.supports("animation-timeline: view()");
  if (!css || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const body = peg.querySelector(".peg__body");
  const armL = peg.querySelector(".peg__arm--l"), armR = peg.querySelector(".peg__arm--r");
  const legL = peg.querySelector(".peg__leg--l"), legR = peg.querySelector(".peg__leg--r");
  const ring = peg.querySelector(".peg__ring"), shadow = peg.querySelector(".peg__shadow"); // taste-skill-ignore

  // tappe della scena (frazioni dello scorrimento dell'intro, come nel CSS)
  const DROP = 0.25, ZOOM = 0.38, DIVE = 0.48, GONE = 0.53;
  const T = [0.66, 0.31];            // dove poggiano i piedi, in frazioni dello schermo
  const FALL = 0.62, LIFT = 0.42;    // secondi
  const FEET = [30, 94], VB = [-20, -10, 100]; // piedi nel disegno, origine e larghezza del viewBox

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = (t) => t * t * (3 - 2 * t);

  let W = innerWidth, H = innerHeight, k = 0.5;
  const measure = () => { W = innerWidth; H = innerHeight; k = peg.getBoundingClientRect().width / VB[2] || 0.5; };
  addEventListener("resize", measure);

  // stato: "up" (nascosto in alto), "fall", "ground", "lift"
  let state = "up", t0 = 0, y = -0.3, vy = 0, squash = 0, sv = 0;
  // angoli con le loro velocità (molle)
  const A = { th: [0, 0], aL: [0, 0], aR: [0, 0], lL: [0, 0], lR: [0, 0] };
  const spring = (s, target, dt, K = 140, C = 14) => { s[1] += (K * (target - s[0]) - C * s[1]) * dt; s[0] += s[1] * dt; return s[0]; };
  let last = performance.now(), running = false, clock = 0;

  const progress = () => {
    const r = intro.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - H), 0, 1);
  };

  const frame = (now) => {
    const dt = Math.min(0.04, (now - last) / 1000); last = now; clock += dt;
    const p = progress();

    // lo scorrimento decide solo l'evento
    if (p >= DROP && (state === "up" || state === "lift")) { state = "fall"; t0 = now; }
    if (p < DROP && (state === "fall" || state === "ground")) { state = "lift"; t0 = now; }

    const ground = T[1];                       // y dei piedi a terra (frazione)
    const top = -0.12;                         // da dove cade: appena sopra lo schermo
    let air = 0;                               // 1 in volo, 0 a terra
    if (state === "fall") {
      const t = (now - t0) / 1000 / FALL;
      if (t >= 1) {
        state = "ground"; y = ground; sv = -2.2; // atterraggio: lo schiacciamento parte con una spinta
        ring.classList.remove("is-on"); void ring.getBBox(); ring.classList.add("is-on");
      } else { y = top + (ground - top) * t * t; air = 1; }
    } else if (state === "lift") {
      const t = clamp((now - t0) / 1000 / LIFT, 0, 1);
      const e = t * t;                         // si stacca lentamente, poi vola via
      y = ground + (top - 0.1 - ground) * e; air = 1;
      if (t >= 1) state = "up";
    } else if (state === "ground") { y = ground; }

    // schiacciamento con una molla smorzata (rimbalza una volta e si ferma)
    sv += (-260 * squash - 18 * sv) * dt; squash += sv * dt;

    // corpo: in caduta oscilla appena, a terra sta dritto e respira
    const height = clamp((ground - y) / (ground - top), 0, 1);
    const th = spring(A.th, air ? Math.sin(clock * 7) * 4 * height : 0, dt, 90, 10);
    // braccia alzate in volo (come quando si lascia andare l'omino), giù a terra
    const breathe = Math.sin(clock * 2.2) * 1.5;
    const aL = spring(A.aL, air ? 48 : 6 + breathe, dt, 120, 12);
    const aR = spring(A.aR, air ? -48 : -6 - breathe, dt, 120, 12);
    const lL = spring(A.lL, air ? 10 + Math.sin(clock * 9) * 4 : 0, dt);
    const lR = spring(A.lR, air ? -10 - Math.sin(clock * 9 + 1) * 4 : 0, dt);

    const sq = clamp(squash, -0.28, 0.28);
    body.setAttribute("transform", `rotate(${th.toFixed(2)} 30 40) translate(30 94) scale(${(1 - sq * 0.7).toFixed(3)} ${(1 + sq).toFixed(3)}) translate(-30 -94)`);
    armL.setAttribute("transform", `rotate(${aL.toFixed(2)} 17 29)`);
    armR.setAttribute("transform", `rotate(${aR.toFixed(2)} 43 29)`);
    legL.setAttribute("transform", `rotate(${lL.toFixed(2)} 25 60)`);
    legR.setAttribute("transform", `rotate(${lR.toFixed(2)} 35 60)`);

    // l'ombra resta a terra: piccola e chiara quando l'omino è in alto, piena quando arriva
    const fy = (ground - y) * H / k;           // distanza dal suolo in unità del disegno
    shadow.setAttribute("transform", `translate(0 ${fy.toFixed(1)}) translate(30 95) scale(${(0.45 + 0.55 * (1 - height)).toFixed(3)}) translate(-30 -95)`);
    shadow.style.opacity = (state === "up" ? 0 : 0.15 + 0.5 * (1 - height)).toFixed(3);
    ring.setAttribute("transform", `translate(0 ${fy.toFixed(1)})`);

    // la città si avvicina (zoom del CSS) e poi la camera si tuffa: l'omino segue la stessa scala
    let sc = 1, op = state === "up" ? 0 : clamp((y - top) / 0.08, 0, 1);
    if (p > ZOOM) sc = 1 + 0.18 * clamp((p - ZOOM) / (DIVE - ZOOM), 0, 1);
    if (p > DIVE) { const d = clamp((p - DIVE) / (GONE - DIVE), 0, 1); sc *= 1 + d * 1.2; op *= 1 - ease(d); }
    peg.style.opacity = op.toFixed(3);
    const fx = T[0] * W, fyPx = y * H;         // posizione dei piedi sullo schermo
    const ox = (FEET[0] - VB[0]) * k, oy = (FEET[1] - VB[1]) * k;
    peg.style.transformOrigin = `${ox.toFixed(1)}px ${oy.toFixed(1)}px`;
    peg.style.transform = `translate(${(fx - ox).toFixed(1)}px, ${(fyPx - oy).toFixed(1)}px) scale(${sc.toFixed(3)})`;

    if (running) requestAnimationFrame(frame);
  };

  // gira solo mentre la scena è vicina
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !running) { running = true; measure(); last = performance.now(); requestAnimationFrame(frame); }
    else if (!e.isIntersecting) running = false;
  });
  io.observe(intro);
})();
