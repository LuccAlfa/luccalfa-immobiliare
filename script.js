/* LuccAlfa Immobiliare — script.js
   GSAP + ScrollTrigger + Lenis (da CDN). Se le librerie non caricano,
   il sito resta completo e leggibile, solo senza animazioni. */
(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const G = window.gsap, ST = window.ScrollTrigger;
  const anim = !!(G && ST) && !reduce;
  if (G && ST) G.registerPlugin(ST);

  /* ═════ IMMOBILI ═════
     Sostituisci con gli annunci reali.
     img: foto (es. "assets/img/p1.webp"); senza foto resta la grafica ad arco.
     demo: true mostra il badge "Esempio".  url: link alla scheda sul portale. */
  const LISTINGS = [
    { type: "vendita", title: { it: "Appartamento nel centro storico", en: "Apartment in the historic centre" }, loc: { it: "Lucca · Dentro le Mura", en: "Lucca · Inside the Walls" }, mq: 110, rooms: 4, price: { it: "Prezzo su richiesta", en: "Price on request" }, c1: "#3b2414", c2: "#8a4a1c", demo: true },
    { type: "vendita", title: { it: "Villa con giardino e uliveto", en: "Villa with garden and olive grove" }, loc: { it: "Colline di Lucca", en: "Lucca hills" }, mq: 260, rooms: 7, price: { it: "Prezzo su richiesta", en: "Price on request" }, c1: "#2a2a1c", c2: "#6e6a3a", demo: true },
    { type: "affitto", title: { it: "Trilocale ristrutturato", en: "Renovated two-bedroom flat" }, loc: { it: "Pisa · Centro", en: "Pisa · City centre" }, mq: 85, rooms: 3, price: { it: "Canone su richiesta", en: "Rent on request" }, c1: "#231c1a", c2: "#6b4434", demo: true },
    { type: "vendita", title: { it: "Casale in pietra da ristrutturare", en: "Stone farmhouse to restore" }, loc: { it: "Capannori", en: "Capannori" }, mq: 320, rooms: 9, price: { it: "Prezzo su richiesta", en: "Price on request" }, c1: "#2c2016", c2: "#9a6a38", demo: true },
    { type: "affitto", title: { it: "Bilocale vicino al mare", en: "One-bedroom flat near the sea" }, loc: { it: "Viareggio", en: "Viareggio" }, mq: 55, rooms: 2, price: { it: "Canone su richiesta", en: "Rent on request" }, c1: "#16201f", c2: "#3f5d58", demo: true },
    { type: "vendita", title: { it: "Villetta a schiera con box", en: "Terraced house with garage" }, loc: { it: "Porcari", en: "Porcari" }, mq: 140, rooms: 5, price: { it: "Prezzo su richiesta", en: "Price on request" }, c1: "#2a1a10", c2: "#b0621e", demo: true }
  ];

  /* Comuni sulla mappa (lon/lat reali, proiezione semplice) */
  const TOWNS = [
    { n: "Lucca", lon: 10.505, lat: 43.843, a: "centro", dx: -24, dy: -16, anchor: "end" },
    { n: "Capannori", lon: 10.573, lat: 43.842, a: "piana", dx: 0, dy: -16, anchor: "middle" },
    { n: "Porcari", lon: 10.616, lat: 43.838, a: "piana", dx: 0, dy: 22, anchor: "middle" },
    { n: "Montecarlo", lon: 10.668, lat: 43.852, a: "piana", dx: 0, dy: -16, anchor: "middle" },
    { n: "Altopascio", lon: 10.677, lat: 43.815, a: "piana", dx: 0, dy: 22, anchor: "middle" },
    { n: "Pisa", lon: 10.401, lat: 43.716, a: "pisa", dx: -12, dy: 4, anchor: "end" },
    { n: "San Giuliano T.", lon: 10.441, lat: 43.762, a: "pisa", dx: 12, dy: 4, anchor: "start" },
    { n: "Cascina", lon: 10.553, lat: 43.676, a: "pisa", dx: 12, dy: 4, anchor: "start" },
    { n: "Viareggio", lon: 10.250, lat: 43.872, a: "versilia", dx: 12, dy: 4, anchor: "start" },
    { n: "Camaiore", lon: 10.303, lat: 43.939, a: "versilia", dx: 12, dy: 4, anchor: "start" },
    { n: "Pietrasanta", lon: 10.227, lat: 43.959, a: "versilia", dx: 12, dy: 4, anchor: "start" }
  ];
  const project = (lon, lat) => [Math.round((lon - 10.15) * 1000), Math.round((44 - lat) * 1380)];

  /* ═════ LINGUA ═════ */
  const EN = window.I18N_EN || {};
  const UI = window.I18N_UI || { it: {}, en: {} };
  const IT = {};
  let lang = "it";
  const metaDesc = $('meta[name="description"]');

  // l'italiano viene letto dall'HTML, così c'è una sola fonte per i testi IT
  $$("[data-i18n]").forEach((el) => { IT[el.dataset.i18n] = el.textContent.trim(); });
  $$("[data-i18n-html]").forEach((el) => { IT[el.dataset.i18nHtml] = el.innerHTML.trim(); });
  $$("[data-i18n-alt]").forEach((el) => { IT[el.dataset.i18nAlt] = el.alt; });
  $$("[data-i18n-aria]").forEach((el) => { IT[el.dataset.i18nAria] = el.getAttribute("aria-label"); });
  IT["meta.title"] = document.title;
  IT["meta.desc"] = metaDesc ? metaDesc.content : "";

  const t = (k) => (UI[lang] || UI.it)[k];

  /* titoli spezzati in parole per le animazioni */
  const splitWords = (el) => {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
            const o = document.createElement("span"); o.className = "sw";
            const i = document.createElement("span"); i.textContent = p;
            o.appendChild(i); frag.appendChild(o);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
      });
    };
    walk(el);
  };
  const splitScrub = (el) => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="tw">${esc(w)}</span>`).join(" ");
  };
  const splitAll = () => {
    $$("[data-split]").forEach(splitWords);
    $$("[data-scrub]").forEach(splitScrub);
  };

  const applyLang = (l) => {
    lang = l === "en" ? "en" : "it";
    const src = lang === "en" ? EN : IT;
    document.documentElement.lang = lang;
    $$("[data-i18n]").forEach((el) => { const v = src[el.dataset.i18n]; if (v != null) el.textContent = v; });
    $$("[data-i18n-html]").forEach((el) => { const v = src[el.dataset.i18nHtml]; if (v != null) el.innerHTML = v; });
    $$("[data-i18n-alt]").forEach((el) => { const v = src[el.dataset.i18nAlt]; if (v != null) el.alt = v; });
    $$("[data-i18n-aria]").forEach((el) => { const v = src[el.dataset.i18nAria]; if (v != null) el.setAttribute("aria-label", v); });
    if (src["meta.title"]) document.title = src["meta.title"];
    if (metaDesc && src["meta.desc"]) metaDesc.content = src["meta.desc"];

    $$(".lang button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    $(".lang").classList.toggle("is-en", lang === "en");
    try { localStorage.setItem("luccalfa-lang", lang); } catch (e) { /* storage non disponibile */ }

    renderListings();
    splitAll();
    formatStats();
    if (anim) { buildTextAnims(); ST.refresh(); }
  };

  /* ═════ RENDER IMMOBILI ═════ */
  const listEl = $("#listings");
  let filter = "all";
  const archArt = (i) => {
    const inner = i % 2 ? '<path d="M50 200V120a30 30 0 0 1 60 0v80"/>' : '<path d="M40 200v-60h80v60M40 140l40-34 40 34"/>';
    return `<svg viewBox="0 0 160 200" aria-hidden="true"><path d="M10 200V90a70 70 0 0 1 140 0v110"/>${inner}</svg>`;
  };
  function renderListings() {
    if (!listEl) return;
    const cards = LISTINGS.map((p, i) => {
      const tag = p.url ? "a" : "article";
      const href = p.url ? ` href="${esc(p.url)}" target="_blank" rel="noopener noreferrer"` : "";
      const hidden = filter !== "all" && p.type !== filter ? " is-hidden" : "";
      return `<${tag} class="card${hidden}" data-type="${esc(p.type)}" data-cursor="${esc(t("view"))}"${href}>
        <div class="card__vis" style="--c1:${esc(p.c1)};--c2:${esc(p.c2)}">
          ${p.img ? `<img src="${esc(p.img)}" alt="${esc(p.title[lang])}" loading="lazy">` : `<div class="card__art">${archArt(i)}</div><span class="card__photo mono">${esc(t("photo"))}</span>`}
          <span class="card__badge mono">${esc(p.type === "affitto" ? t("rent") : t("sale"))}${p.demo ? " · " + esc(t("sample")) : ""}</span>
          <span class="card__num" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>
        </div>
        <div class="card__body">
          <span class="card__loc mono">${esc(p.loc[lang])}</span>
          <h3 class="card__title">${esc(p.title[lang])}</h3>
          <div class="card__meta"><span>${esc(p.mq)} m² · ${esc(p.rooms)} ${esc(t("rooms"))}</span><b>${esc(p.price[lang])}</b></div>
        </div>
      </${tag}>`;
    }).join("");
    listEl.innerHTML = cards + `<div class="card card--all">
        <h3>${esc(t("allTitle"))}</h3><p>${esc(t("allText"))}</p>
        <a class="btn btn--accent" href="#contatti">${esc(t("allCta"))}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
      </div>`;
  }

  $$(".filter").forEach((b) => b.addEventListener("click", () => {
    filter = b.dataset.filter;
    $$(".filter").forEach((x) => { x.classList.toggle("is-on", x === b); x.setAttribute("aria-pressed", String(x === b)); });
    $$(".card[data-type]", listEl).forEach((c) => c.classList.toggle("is-hidden", filter !== "all" && c.dataset.type !== filter));
    if (anim) {
      G.fromTo($$(".card:not(.is-hidden)", listEl), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, stagger: 0.06, duration: 0.6, ease: "power3.out" });
      ST.refresh();
    }
  }));

  /* ═════ NUMERI ═════ */
  const stats = $$("[data-count]");
  const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, lang === "en" ? "," : ".");
  function formatStats() { stats.forEach((s) => { if (!s._counting) s.textContent = fmt(+s.dataset.count); }); }

  /* ═════ MAPPA ═════ */
  const map = $("#map");
  if (map) {
    const NS = "http://www.w3.org/2000/svg";
    const [lx, ly] = project(10.505, 43.843);
    const links = $("#mapLinks"), dots = $("#mapDots");
    TOWNS.forEach((tw) => {
      const [x, y] = project(tw.lon, tw.lat);
      if (tw.n !== "Lucca") {
        const p = document.createElementNS(NS, "path");
        const mx = (lx + x) / 2, my = (ly + y) / 2 - Math.hypot(x - lx, y - ly) * 0.18;
        p.setAttribute("d", `M${lx} ${ly} Q${mx} ${my} ${x} ${y}`);
        p.setAttribute("class", "map__link"); p.dataset.a = tw.a;
        links.appendChild(p);
      }
      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", "map__dot"); g.dataset.a = tw.a;
      g.innerHTML = `<circle class="halo" cx="${x}" cy="${y}" r="14"/><circle cx="${x}" cy="${y}" r="${tw.n === "Lucca" ? 5 : 3.5}"/><text x="${x + tw.dx}" y="${y + tw.dy}" text-anchor="${tw.anchor}">${esc(tw.n)}</text>`;
      dots.appendChild(g);
    });
    const fig = map.closest(".map");
    const setArea = (a) => {
      fig.classList.toggle("has-focus", !!a);
      $$(".map__dot, .map__link", map).forEach((el) => el.classList.toggle("is-on", el.dataset.a === a));
      $$(".area").forEach((el) => el.classList.toggle("is-on", el.dataset.area === a));
    };
    $$(".area").forEach((el) => {
      el.addEventListener("pointerenter", () => setArea(el.dataset.area));
      el.addEventListener("focus", () => setArea(el.dataset.area));
      el.addEventListener("pointerleave", () => setArea(null));
      el.addEventListener("blur", () => setArea(null));
    });
  }

  /* ═════ ORA DI LUCCA ═════ */
  const clock = $("#clock");
  const tick = () => { if (clock) clock.textContent = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" }).format(new Date()); };
  tick(); setInterval(tick, 15000);
  const yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();

  /* ═════ FORM ═════ */
  const picks = { mode: "buy", zone: "centro" };
  $$(".pick__row").forEach((row) => row.addEventListener("click", (e) => {
    const b = e.target.closest(".pill"); if (!b) return;
    picks[row.dataset.group] = b.dataset.v;
    $$(".pill", row).forEach((x) => { x.classList.toggle("is-on", x === b); x.setAttribute("aria-pressed", String(x === b)); });
  }));
  $$(".pill").forEach((p) => p.setAttribute("aria-pressed", String(p.classList.contains("is-on"))));

  const form = $("#contact-form"), status = $("#form-status");
  if (form) form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const say = (m, err) => { status.textContent = m; status.className = "form-status" + (err ? " error" : ""); };
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const interest = `${t("mode")[picks.mode]} · ${t("zone")[picks.zone]}`;
    $("#f-interest").value = interest;
    const endpoint = form.dataset.endpoint || "";
    const data = new FormData(form);
    // finché l'endpoint Formspree non è configurato, apre il client email
    if (!endpoint || endpoint.includes("YOUR_FORM_ID")) {
      const body = `${interest}\n\n${data.get("name")} <${data.get("_replyto")}>\nTel: ${data.get("phone") || "-"}\n\n${data.get("message")}`;
      location.href = `mailto:immobiliare@luccalfa.it?subject=${encodeURIComponent(t("subject"))}&body=${encodeURIComponent(body)}`;
      return;
    }
    const btn = $("button[type=submit]", form); btn.disabled = true;
    say(t("sending"));
    try {
      const res = await fetch(endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } });
      if (res.ok) { form.reset(); say(t("ok")); } else say(t("err"), true);
    } catch { say(t("net"), true); }
    btn.disabled = false;
  });

  /* ═════ MENU ═════ */
  const menu = $("#menu"), burger = $("#burger"), burgerTxt = $(".burger__txt");
  let menuOpen = false, menuTl = null, lenis = null;
  menu.inert = true;
  const setMenu = (open) => {
    if (open === menuOpen) return;
    menuOpen = open;
    document.body.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-hidden", String(!open));
    menu.inert = !open;
    burgerTxt.textContent = open ? t("menuClose") : t("menuOpen");
    if (lenis) open ? lenis.stop() : lenis.start();
    if (menuTl) open ? menuTl.timeScale(1).play() : menuTl.timeScale(1.6).reverse();
    else menu.style.visibility = open ? "visible" : "hidden";
    if (open) setTimeout(() => { const a = $(".menu__nav a"); if (a) a.focus({ preventScroll: true }); }, 350);
    else burger.focus({ preventScroll: true });
  };
  burger.addEventListener("click", () => setMenu(!menuOpen));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && menuOpen) setMenu(false); });

  /* ancore: chiude il menu e scorre (con Lenis se presente) */
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const id = a.getAttribute("href"); const target = id === "#top" ? document.body : $(id);
    if (!target) return;
    e.preventDefault();
    if (menuOpen) setMenu(false);
    if (lenis) lenis.scrollTo(id === "#top" ? 0 : target, { duration: 1.6 });
    else target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  });

  /* ═════ SWITCH LINGUA (con tenda arancio) ═════ */
  const curtain = $("#curtain"), curtainLabel = $("#curtainLabel");
  let switching = false;
  $$(".lang button").forEach((b) => b.addEventListener("click", () => {
    const l = b.dataset.lang;
    if (l === lang || switching) return;
    if (!anim) { applyLang(l); return; }
    switching = true;
    $(".lang").classList.toggle("is-en", l === "en");
    curtainLabel.textContent = l === "en" ? "English" : "Italiano";
    G.timeline({ onComplete: () => { switching = false; } })
      .set(curtain, { transformOrigin: "50% 100%" })
      .to(curtain, { scaleY: 1, duration: 0.6, ease: "power4.inOut" })
      .fromTo(curtainLabel, { autoAlpha: 0, yPercent: 40 }, { autoAlpha: 1, yPercent: 0, duration: 0.45, ease: "power3.out" }, "-=0.2")
      .add(() => applyLang(l))
      .set(curtain, { transformOrigin: "50% 0%" }, "+=0.15")
      .to(curtainLabel, { autoAlpha: 0, yPercent: -30, duration: 0.3, ease: "power2.in" })
      .to(curtain, { scaleY: 0, duration: 0.7, ease: "power4.inOut" }, "-=0.15");
  }));

  /* lingua iniziale: scelta salvata › ?lang= › lingua del browser */
  let initial = "it";
  try {
    const q = new URLSearchParams(location.search).get("lang");
    const saved = localStorage.getItem("luccalfa-lang");
    initial = q || saved || ((navigator.language || "it").toLowerCase().startsWith("it") ? "it" : "en");
  } catch (e) { /* default it */ }

  /* ═════ SENZA ANIMAZIONI: stato finale e stop ═════ */
  const loader = $("#loader");
  if (!anim) {
    applyLang(initial);
    if (loader) loader.classList.add("is-done");
    menu.style.visibility = "hidden";
    initGL(true);
    return;
  }

  /* ════════════════════════════════════════════
     DA QUI: solo con GSAP e movimento consentito
  ════════════════════════════════════════════ */
  document.body.classList.add("is-loading");
  G.defaults({ ease: "power3.out" });

  /* Lenis smooth scroll collegato a ScrollTrigger */
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on("scroll", ST.update);
    G.ticker.add((time) => lenis.raf(time * 1000));
    G.ticker.lagSmoothing(0);
    lenis.stop();
  }

  /* animazioni dei testi (ricostruite al cambio lingua) */
  let textAnims = [];
  function buildTextAnims() {
    textAnims.forEach((a) => { if (a.scrollTrigger) a.scrollTrigger.kill(); a.kill(); });
    textAnims = [];
    $$("[data-split]").forEach((el) => {
      if (el.closest(".hero, .door")) return;
      textAnims.push(G.from($$(".sw > span", el), {
        yPercent: 115, rotate: 4, duration: 1.2, ease: "power4.out", stagger: 0.07,
        scrollTrigger: { trigger: el, start: "top 88%", once: true }
      }));
    });
    $$("[data-scrub]").forEach((el) => {
      textAnims.push(G.to($$(".tw", el), {
        opacity: 1, stagger: 0.12, ease: "none",
        scrollTrigger: { trigger: el, start: "top 78%", end: "bottom 40%", scrub: true }
      }));
    });
  }

  applyLang(initial);

  /* ── menu timeline ── */
  menuTl = G.timeline({ paused: true })
    .set(menu, { visibility: "visible" })
    .fromTo(".menu__bg", { clipPath: "circle(0% at calc(100% - 60px) 40px)" }, { clipPath: "circle(150% at calc(100% - 60px) 40px)", duration: 0.9, ease: "power4.inOut" })
    .from(".menu__nav b", { yPercent: 110, duration: 0.8, stagger: 0.05, ease: "power4.out" }, "-=0.45")
    .from(".menu__nav span", { autoAlpha: 0, x: -10, duration: 0.5, stagger: 0.05 }, "<0.1")
    .from(".menu__foot > *", { autoAlpha: 0, y: 14, duration: 0.5, stagger: 0.06 }, "-=0.5");

  /* ── PRELOADER → INTRO ── */
  const count = $("#loaderCount");
  const counter = { v: 0 };
  const intro = G.timeline({ paused: true })
    .from(".hero__gl", { scale: 1.25, autoAlpha: 0, duration: 2, ease: "power2.out" })
    .from(".hero__title .sw > span", { yPercent: 120, rotate: 6, duration: 1.4, stagger: 0.08, ease: "power4.out" }, 0.1)
    .from(".hero__kicker", { autoAlpha: 0, y: 16, duration: 0.8 }, 0.5)
    .from([".hero__sub", ".hero__actions"], { autoAlpha: 0, y: 24, duration: 1, stagger: 0.1 }, 0.8)
    .from(".hero__meta", { autoAlpha: 0, duration: 1 }, 1)
    .from(".nav > *", { autoAlpha: 0, y: -20, duration: 0.9, stagger: 0.08 }, 0.6);

  const pre = G.timeline({
    onComplete: () => {
      loader.classList.add("is-done");
      document.body.classList.remove("is-loading");
      if (lenis) lenis.start();
      ST.refresh();
    }
  });
  pre.to(".loader__arch path", { strokeDashoffset: 0, duration: 1.8, ease: "power2.inOut" })
    .to(counter, { v: 100, duration: 1.8, ease: "power2.inOut", onUpdate: () => { count.textContent = String(Math.round(counter.v)).padStart(3, "0"); } }, 0)
    .from(".loader__line", { autoAlpha: 0, y: 10, duration: 0.6 }, 0.3)
    .to([".loader__arch", ".loader__row", ".loader__line"], { autoAlpha: 0, y: -20, duration: 0.5, stagger: 0.04, ease: "power2.in" }, "+=0.1")
    .to(loader, { yPercent: -100, duration: 1, ease: "power4.inOut" }, "-=0.15")
    .add(() => intro.play(), "-=0.55");
  // sicurezza: non bloccare mai il sito sul preloader
  setTimeout(() => { if (pre.progress() < 1) pre.progress(1); }, 7000);

  /* ── nav: si nasconde scendendo, ricompare salendo ── */
  const nav = $("#nav");
  ST.create({
    start: 0, end: "max",
    onUpdate: (s) => nav.classList.toggle("is-hidden", !menuOpen && s.direction === 1 && s.scroll() > innerHeight * 0.6)
  });
  G.to("#progress", { scaleY: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });

  /* ── hero: uscita in parallasse ── */
  G.to(".hero__content", { yPercent: -18, autoAlpha: 0.2, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  G.to(".hero__gl", { yPercent: 20, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

  /* ── la soglia: l'arco si spalanca ── */
  const mm = G.matchMedia();
  mm.add({ mobile: "(max-width: 760px)", desktop: "(min-width: 761px)" }, (ctx) => {
    const start = ctx.conditions.mobile ? "inset(30% 22% 0% 22% round 999px 999px 0px 0px)" : "inset(22% 38% 0% 38% round 999px 999px 0px 0px)";
    const door = G.timeline({ scrollTrigger: { trigger: ".door", start: "top top", end: "+=200%", pin: true, scrub: 1 } });
    door.fromTo(".door__frame", { clipPath: start }, { clipPath: "inset(0% 0% 0% 0% round 0px 0px 0px 0px)", ease: "power2.inOut", duration: 1 })
      .fromTo(".door__frame img", { scale: 1.35, xPercent: ctx.conditions.mobile ? 0 : 19 }, { scale: 1, xPercent: 0, ease: "power2.inOut", duration: 1 }, 0)
      .to(".door__head", { yPercent: -50, autoAlpha: 0, ease: "power2.in", duration: 0.45 }, 0.05)
      .from(".door__big", { yPercent: 50, autoAlpha: 0, duration: 0.35 }, 0.75)
      .from(".door__p", { y: 30, autoAlpha: 0, duration: 0.3 }, 0.9)
      .to({}, { duration: 0.35 });
  });

  /* ── chi siamo ── */
  G.fromTo(".about__img", { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.6, ease: "power4.inOut", scrollTrigger: { trigger: ".about__img", start: "top 80%", once: true } });
  G.fromTo(".about__img img", { yPercent: -16 }, { yPercent: 0, ease: "none", scrollTrigger: { trigger: ".about__media", start: "top bottom", end: "bottom top", scrub: true } });
  stats.forEach((s) => {
    const o = { v: 0 };
    ST.create({
      trigger: s, start: "top 88%", once: true,
      onEnter: () => {
        s._counting = true;
        G.to(o, { v: +s.dataset.count, duration: 2, ease: "power2.out", onUpdate: () => { s.textContent = fmt(o.v); }, onComplete: () => { s._counting = false; } });
      }
    });
  });
  G.from(".stats li", { autoAlpha: 0, y: 40, stagger: 0.1, duration: 1, scrollTrigger: { trigger: ".stats", start: "top 85%", once: true } });

  /* ── immobili: scorrimento orizzontale (desktop) ── */
  mm.add("(min-width: 761px)", () => {
    const dist = () => Math.max(0, listEl.scrollWidth - innerWidth);
    G.to(listEl, {
      x: () => -dist(), ease: "none",
      scrollTrigger: { trigger: ".estates", start: "top top", end: () => "+=" + dist(), pin: true, scrub: 1, invalidateOnRefresh: true }
    });
  });
  G.from(".estates__head > *", { autoAlpha: 0, y: 30, stagger: 0.1, duration: 1, scrollTrigger: { trigger: ".estates", start: "top 75%", once: true } });

  /* ── servizi: righe che entrano ── */
  G.from(".srv", { autoAlpha: 0, y: 50, stagger: 0.08, duration: 1, scrollTrigger: { trigger: ".srv-list", start: "top 85%", once: true } });

  /* ── metodo: linea che si riempie, passi che si accendono ── */
  G.to(".method__fill", { scaleY: 1, ease: "none", scrollTrigger: { trigger: ".method__steps", start: "top 60%", end: "bottom 60%", scrub: true } });
  $$(".step").forEach((s) => {
    ST.create({ trigger: s, start: "top 60%", toggleClass: { targets: s, className: "is-on" } });
    G.from(s.children[1], { autoAlpha: 0, x: 40, duration: 1, scrollTrigger: { trigger: s, start: "top 85%", once: true } });
  });

  /* ── mappa: collegamenti che si disegnano da Lucca ── */
  const mapLinks = $$(".map__link");
  mapLinks.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
  G.timeline({ scrollTrigger: { trigger: ".map", start: "top 75%", once: true } })
    .from(".map__walls", { scale: 0, transformOrigin: "50% 50%", duration: 0.8, ease: "back.out(2)" })
    .to(mapLinks, { strokeDashoffset: 0, duration: 1.4, stagger: 0.06, ease: "power2.inOut" }, 0.2)
    .from(".map__dot", { autoAlpha: 0, scale: 0, transformOrigin: "50% 50%", stagger: 0.06, duration: 0.6, ease: "back.out(2)" }, 0.5)
    .from(".area", { autoAlpha: 0, x: 30, stagger: 0.1, duration: 0.8 }, 0.3);

  /* ── marquee infinito, accelera con la velocità di scroll ── */
  const rows = $$(".marquee__row");
  const loops = rows.map((r) => (+r.dataset.dir < 0
    ? G.to(r, { xPercent: -50, duration: 40, ease: "none", repeat: -1 })
    : G.fromTo(r, { xPercent: -50 }, { xPercent: 0, duration: 46, ease: "none", repeat: -1 })));
  const skew = G.quickTo(rows, "skewX", { duration: 0.4, ease: "power3" });
  ST.create({
    trigger: ".marquee", start: "top bottom", end: "bottom top",
    onUpdate: (s) => {
      const v = s.getVelocity();
      skew(G.utils.clamp(-12, 12, v / -250));
      G.to(loops, { timeScale: 1 + Math.min(Math.abs(v) / 220, 6), duration: 0.2, overwrite: true, onComplete: () => G.to(loops, { timeScale: 1, duration: 1.2 }) });
    },
    onToggle: (s) => loops.forEach((l) => (s.isActive ? l.play() : l.pause()))
  });

  /* ── portali, faq, contatti, footer ── */
  G.from(".portal-list li", { autoAlpha: 0, y: 40, stagger: 0.05, duration: 0.9, scrollTrigger: { trigger: ".portal-list", start: "top 88%", once: true } });
  G.from(".acc details", { autoAlpha: 0, y: 30, stagger: 0.05, duration: 0.8, scrollTrigger: { trigger: ".acc", start: "top 85%", once: true } });
  G.from([".contact__info", ".form"], { autoAlpha: 0, y: 50, stagger: 0.12, duration: 1.1, scrollTrigger: { trigger: ".contact__grid", start: "top 85%", once: true } });
  G.from(".footer__word span", { yPercent: 70, ease: "none", scrollTrigger: { trigger: ".footer", start: "top bottom", end: "bottom bottom", scrub: true } });

  /* ── FAQ: apertura animata, una alla volta ── */
  const faqs = $$(".acc details");
  const closeFaq = (d) => {
    const body = $(".acc__body", d);
    G.to(body, { height: 0, duration: 0.45, ease: "power3.inOut", onComplete: () => { d.open = false; G.set(body, { clearProps: "height" }); } });
  };
  faqs.forEach((d) => $("summary", d).addEventListener("click", (e) => {
    e.preventDefault();
    if (d.open) { closeFaq(d); return; }
    faqs.forEach((o) => { if (o !== d && o.open) closeFaq(o); });
    d.open = true;
    G.from($(".acc__body", d), { height: 0, duration: 0.55, ease: "power3.inOut", onComplete: () => ST.refresh() });
  }));

  /* ── cursore personalizzato + bottoni magnetici ── */
  if (finePointer) {
    document.documentElement.classList.add("has-cursor");
    const cur = $(".cursor"), label = $(".cursor__label");
    const dx = G.quickTo(".cursor__dot", "x", { duration: 0.12, ease: "power3" });
    const dy = G.quickTo(".cursor__dot", "y", { duration: 0.12, ease: "power3" });
    const rx = G.quickTo(".cursor__ring", "x", { duration: 0.5, ease: "power3" });
    const ry = G.quickTo(".cursor__ring", "y", { duration: 0.5, ease: "power3" });
    addEventListener("pointermove", (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); window.__mx = e.clientX / innerWidth; window.__my = e.clientY / innerHeight; });
    document.addEventListener("pointerover", (e) => {
      const lab = e.target.closest("[data-cursor]");
      const hov = e.target.closest("a, button, summary, .area, input, textarea");
      cur.classList.toggle("is-label", !!lab);
      cur.classList.toggle("is-hover", !lab && !!hov);
      if (lab) label.textContent = lab.dataset.cursor;
    });
    document.addEventListener("pointerleave", () => G.to(cur, { autoAlpha: 0, duration: 0.2 }));
    document.addEventListener("pointerenter", () => G.to(cur, { autoAlpha: 1, duration: 0.2 }));

    $$(".magnetic").forEach((el) => {
      const mx = G.quickTo(el, "x", { duration: 0.6, ease: "power3" });
      const my = G.quickTo(el, "y", { duration: 0.6, ease: "power3" });
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * 0.3); my((e.clientY - r.top - r.height / 2) * 0.4);
      });
      el.addEventListener("pointerleave", () => { mx(0); my(0); });
    });
  }

  /* ── cambio tema chiaro/scuro per sezione (creato dopo i pin, così le posizioni sono corrette) ── */
  const lightTriggers = $$("main section[data-theme='light']").map((sec) => ST.create({
    trigger: sec, start: "top 55%", end: "bottom 55%", refreshPriority: -1,
    onToggle: () => { document.body.dataset.theme = lightTriggers.some((x) => x.isActive) ? "light" : "dark"; }
  }));

  addEventListener("load", () => ST.refresh());
  initGL(false);

  /* ═════ HERO WEBGL: rilievi toscani in luce arancio ═════
     Shader leggero (nessuna libreria): rumore fbm + curve di livello,
     reagisce al mouse e si ferma quando l'hero non è visibile. */
  function initGL(still) {
    const cv = $("#gl"); if (!cv) return;
    const gl = cv.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return; // resta il gradiente CSS
    const vs = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
    const fs = `precision mediump float;
      uniform vec2 r;uniform float t;uniform vec2 m;
      vec2 h(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.+2.*fract(sin(p)*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
        return mix(mix(dot(h(i),f),dot(h(i+vec2(1,0)),f-vec2(1,0)),u.x),mix(dot(h(i+vec2(0,1)),f-vec2(0,1)),dot(h(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);}
      float fb(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
      void main(){
        vec2 uv=gl_FragCoord.xy/r;vec2 p=(gl_FragCoord.xy-.5*r)/r.y;
        vec2 mo=(m-.5)*vec2(r.x/r.y,1.);
        float tt=t*.045;
        vec2 q=vec2(fb(p*1.3+tt),fb(p*1.3-tt+3.1));
        float f=fb(p*1.5+1.8*q+vec2(tt*.6,-tt*.4));
        float d=length(p-mo);float gl=exp(-d*2.4);
        vec3 night=vec3(.055,.047,.039),ember=vec3(.30,.12,.03),orng=vec3(.965,.525,.133);
        vec3 c=mix(night,ember,smoothstep(-.15,.45,f));
        c=mix(c,orng,smoothstep(.22,.62,f+gl*.22)*.85);
        float k=abs(fract(f*9.+tt)-.5);
        float line=1.-smoothstep(.0,.04,k);
        c+=orng*line*(.05+.25*gl)*smoothstep(-.2,.3,f);
        c*=1.-.55*smoothstep(.35,1.1,length(uv-vec2(.62,.6)));
        gl_FragColor=vec4(c,1.);
      }`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "p");
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(pr, "r"), uT = gl.getUniformLocation(pr, "t"), uM = gl.getUniformLocation(pr, "m");
    const scale = Math.min(devicePixelRatio || 1, 1.5) * 0.6;
    const size = () => { cv.width = Math.round(cv.clientWidth * scale); cv.height = Math.round(cv.clientHeight * scale); gl.viewport(0, 0, cv.width, cv.height); };
    size(); addEventListener("resize", size);
    let mx = 0.62, my = 0.45, visible = true, t0 = performance.now();
    const draw = (now) => {
      const tx = window.__mx != null ? window.__mx : 0.62, ty = window.__my != null ? 1 - window.__my : 0.45;
      mx += (tx - mx) * 0.04; my += (ty - my) * 0.04;
      gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uT, (now - t0) / 1000 + 20); gl.uniform2f(uM, mx, my);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    if (still) { draw(t0); return; }
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(cv);
    const loop = (now) => { if (visible && !document.hidden) draw(now); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
})();
