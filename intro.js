/* LuccAlfa Immobiliare — intro.js
   L'omino arancione della scena d'ingresso, in stile Street View.
   Lo scorrimento decide DOVE dovrebbe essere (un percorso: preso a sinistra, portato
   ad arco sopra i tetti, lasciato cadere nella strada); una molla decide dove È davvero.
   Dalla velocità della molla nascono l'oscillazione del corpo (appeso per la testa),
   il ciondolare di braccia e gambe e lo schiacciamento all'atterraggio. */
(() => {
  "use strict";
  const intro = document.querySelector(".intro"), peg = document.getElementById("peg");
  if (!intro || !peg) return;
  const css = window.CSS && CSS.supports && CSS.supports("animation-timeline: view()");
  if (!css || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const body = peg.querySelector(".peg__body");
  const armL = peg.querySelector(".peg__arm--l"), armR = peg.querySelector(".peg__arm--r");
  const legL = peg.querySelector(".peg__leg--l"), legR = peg.querySelector(".peg__leg--r");
  const shadow = peg.querySelector(".peg__shadow"), ring = peg.querySelector(".peg__ring"); // taste-skill-ignore

  // tappe della scena (frazioni dello scorrimento dell'intro, come nel CSS)
  const P0 = 0.24, LAND = 0.37, DIVE = 0.48, GONE = 0.53;
  // percorso, in frazioni dello schermo; T = dove poggiano i piedi (la strada tra i palazzi)
  const A = [-0.06, 0.10], B = [0.30, 0.15], C = [0.50, 0.00], D = [0.66, 0.12], T = [0.66, 0.31];

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t * t * (3 - 2 * t);

  let W = innerWidth, H = innerHeight, k = 1; // k: px per unità del viewBox (120 di larghezza)
  const measure = () => { W = innerWidth; H = innerHeight; k = peg.getBoundingClientRect().width / 120 || 0.6; };
  addEventListener("resize", measure);

  // offset nel disegno: testa (30,13) e piedi (30,108); il viewBox parte da (-30,-8)
  const headX = () => 60 * k, headY = () => 21 * k, feetToHead = () => 95 * k;

  const target = (u) => {
    // dove dovrebbe stare la TESTA a questo punto del percorso
    let x, y;
    if (u < 0.22) { const t = ease(u / 0.22); x = lerp(A[0], B[0], t) * W; y = lerp(A[1], B[1], t) * H; }
    else if (u < 0.78) {
      const t = ease((u - 0.22) / 0.56), s = 1 - t;
      x = (s * s * B[0] + 2 * s * t * C[0] + t * t * D[0]) * W;
      y = (s * s * B[1] + 2 * s * t * C[1] + t * t * D[1]) * H;
    } else {
      const t = (u - 0.78) / 0.22, g = t * t; // caduta: accelera
      x = D[0] * W; y = lerp(D[1] * H, T[1] * H - feetToHead(), g);
    }
    return [x, y];
  };

  let px = A[0] * innerWidth, py = A[1] * innerHeight, vx = 0, vy = 0;
  let th = 0, tv = 0;          // oscillazione del corpo (gradi) e sua velocità
  let squash = 0, landed = false, last = performance.now(), running = false, clock = 0;

  const progress = () => {
    const r = intro.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - H), 0, 1);
  };

  const frame = (now) => {
    const dt = Math.min(0.04, (now - last) / 1000); last = now; clock += dt;
    const p = progress();
    const u = clamp((p - P0) / (LAND - P0), 0, 1);
    const [tx, ty] = target(u);
    const onGround = u >= 1;

    // molla sulla posizione: un po' sotto-smorzata, così l'omino arriva in ritardo e oscilla
    const K = onGround ? 260 : 85, Cd = onGround ? 30 : 15;
    vx += (K * (tx - px) - Cd * vx) * dt; vy += (K * (ty - py) - Cd * vy) * dt;
    px += vx * dt; py += vy * dt;

    // corpo appeso per la testa: si inclina contro il movimento, come un pendolo
    const thT = onGround ? 0 : clamp(-vx * 0.05, -42, 42);
    tv += (60 * (thT - th) - 7 * tv) * dt; th += tv * dt;

    // atterraggio: schiacciamento rapido + anello arancione
    if (onGround && !landed) { landed = true; squash = clamp(Math.abs(vy) / 900, 0.12, 0.3); ring.classList.remove("is-on"); void ring.getBBox(); ring.classList.add("is-on"); }
    if (!onGround) landed = false;
    squash *= Math.pow(0.0008, dt);

    // arti: in volo ciondolano (fase diversa per destra e sinistra), a terra respirano
    const air = onGround ? 0 : 1;
    const swing = Math.sin(clock * 6.2) * 7 * air, swing2 = Math.sin(clock * 5.1 + 1.3) * 9 * air;
    const aL = th * 0.7 + swing + clamp(-vy * 0.02, -25, 25) * air + Math.sin(clock * 2) * 1.5;
    const aR = th * 0.7 - swing - clamp(-vy * 0.02, -25, 25) * air - Math.sin(clock * 2) * 1.5;
    const lL = -th * 0.45 + swing2, lR = -th * 0.45 - swing2 * 0.8;
    body.setAttribute("transform", `rotate(${th.toFixed(2)} 30 13) translate(30 108) scale(${(1 + squash).toFixed(3)} ${(1 - squash).toFixed(3)}) translate(-30 -108)`);
    armL.setAttribute("transform", `rotate(${aL.toFixed(2)} 12.5 32)`);
    armR.setAttribute("transform", `rotate(${aR.toFixed(2)} 47.5 32)`);
    legL.setAttribute("transform", `rotate(${lL.toFixed(2)} 24 66)`);
    legR.setAttribute("transform", `rotate(${lR.toFixed(2)} 36 66)`);

    // ombra a terra: più piccola e chiara quanto più l'omino è in alto
    const feetY = py + feetToHead(), ground = T[1] * H;
    const height = clamp((ground - feetY) / (H * 0.25), 0, 1);
    shadow.setAttribute("cy", ((ground - (py - headY())) / k - 8).toFixed(1));
    shadow.setAttribute("rx", (16 * (1 - height * 0.6)).toFixed(1));
    shadow.setAttribute("opacity", (u > 0.6 ? 1 - height * 0.8 : 0).toFixed(2));
    ring.setAttribute("cy", ((ground - (py - headY())) / k - 8).toFixed(1));

    // comparsa, e poi la camera si avvicina all'omino durante la picchiata
    let op = clamp((p - P0) / 0.012, 0, 1), sc = 1;
    if (p > DIVE) { const d = clamp((p - DIVE) / (GONE - DIVE), 0, 1); sc = 1 + d * 2.6; op *= 1 - ease(d); }
    peg.style.opacity = op.toFixed(3);
    peg.style.transform = `translate(${(px - headX()).toFixed(1)}px, ${(py - headY()).toFixed(1)}px) scale(${sc.toFixed(3)})`;
    peg.style.transformOrigin = `${headX()}px ${116 * k}px`;

    if (running) requestAnimationFrame(frame);
  };

  // gira solo mentre la scena dell'omino è vicina
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !running) { running = true; measure(); last = performance.now(); requestAnimationFrame(frame); }
    else if (!e.isIntersecting) running = false;
  });
  io.observe(intro);
})();
