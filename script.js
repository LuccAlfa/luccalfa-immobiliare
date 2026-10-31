/* LuccAlfa Immobiliare — script.js
   Il sito si legge tutto anche senza JavaScript. Le scene di scorrimento sono CSS
   (animation-timeline); qui: lingua, menu, comparse, misure delle scene, elenco
   immobili, modulo contatti e, solo su computer, lo scorrimento morbido di Lenis. */
(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    const fl = $("#f-lang"); if (fl) fl.value = lang;
    if (burger) burger.setAttribute("aria-label", menuOpen ? t("menuClose") : t("menuOpen"));
    try { localStorage.setItem("luccalfa-lang", lang); } catch (e) { /* storage non disponibile */ }
    splitText();
  };

  /* titoli: ogni parola sale dalla sua riga; paragrafo [data-scrub]: le parole si accendono scorrendo */
  function splitText() {
    $$("[data-words]").forEach((el) => {
      let i = 0;
      const walk = (node) => [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.append(" "); return; }
            const o = document.createElement("span"); o.className = "w";
            const inner = document.createElement("span"); inner.textContent = p; inner.style.setProperty("--wi", String(i++));
            o.append(inner); frag.append(o);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
      });
      walk(el); el.classList.add("is-split");
    });
    $$("[data-scrub]").forEach((el) => {
      const words = el.textContent.trim().split(/\s+/);
      el.innerHTML = words.map((w, i) => `<span class="sw" style="--f:${(i / Math.max(1, words.length - 1)).toFixed(3)}">${w.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]))}</span>`).join(" ");
      el.classList.add("is-split");
    });
  }

  $$(".lang button").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.lang === lang) return;
    const next = b.dataset.lang, curtain = $("#curtain"), label = $("#curtainLabel");
    if (reduce || !curtain || !curtain.animate || switching) { applyLang(next); return; }
    // tenda arancio: sale, mostra la lingua, cambia i testi, si ritira verso l'alto
    switching = true;
    label.textContent = next === "en" ? "English" : "Italiano";
    const io = "cubic-bezier(0.77, 0, 0.175, 1)", out = "cubic-bezier(0.23, 1, 0.32, 1)";
    curtain.style.transformOrigin = "50% 100%";
    curtain.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: 520, easing: io, fill: "forwards" }).finished
      .then(() => label.animate([{ opacity: 0, transform: "translateY(30%)" }, { opacity: 1, transform: "none" }], { duration: 360, easing: out, fill: "forwards" }).finished)
      .then(() => { applyLang(next); curtain.style.transformOrigin = "50% 0%"; })
      .then(() => label.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(-30%)" }], { duration: 240, delay: 120, easing: out, fill: "forwards" }).finished)
      .then(() => curtain.animate([{ transform: "scaleY(1)" }, { transform: "scaleY(0)" }], { duration: 560, easing: io, fill: "forwards" }).finished)
      .then(() => { switching = false; });
  }));
  let switching = false;

  /* ═════ MENU (telefono) ═════ */
  const burger = $("#burger"), menu = $("#menu");
  let menuOpen = false;
  const mqPhone = matchMedia("(max-width: 899px)");
  const setMenu = (open) => {
    menuOpen = open;
    document.body.classList.toggle("menu-open", open);
    // lo scorrimento si blocca sulla radice: bloccarlo sul body farebbe ripartire le scene da capo
    document.documentElement.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? t("menuClose") : t("menuOpen"));
    menu.inert = !open;
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  menu.inert = true;
  burger.addEventListener("click", () => setMenu(!menuOpen));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && menuOpen) { setMenu(false); burger.focus(); } });

  /* ═════ NAV: fondo pieno dopo l'hero, si nasconde scendendo ═════ */
  const nav = $("#nav"), hero = $(".intro"), wa = $("#wa");
  let lastY = scrollY, ticking = false;
  const onScroll = () => {
    const y = scrollY, d = y - lastY, past = y > (hero ? hero.offsetHeight - 80 : 40);
    // finché si è nell'intro la barra resta senza fondo (sopra la foto e poi sopra la nebbia)
    nav.classList.toggle("is-solid", y > (hero ? hero.offsetHeight - nav.offsetHeight : 40));
    if (y < 120 || menuOpen) nav.classList.remove("is-away");
    else if (d > 6) nav.classList.add("is-away");
    else if (d < -6) nav.classList.remove("is-away");
    if (wa) wa.classList.toggle("is-on", past);
    if (Math.abs(d) > 6 || y < 120) lastY = y;
    ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ═════ COMPARSE: una volta sola, a cascata dentro ogni gruppo ═════ */
  splitText();
  const revealables = $$("[data-reveal], [data-words]");
  const groups = new Map();
  $$("[data-reveal]").forEach((el) => {
    const p = el.parentElement; const n = groups.get(p) || 0;
    el.style.setProperty("--i", String(Math.min(n, 4))); groups.set(p, n + 1);
  });
  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }), { rootMargin: "0px 0px -12% 0px" });
    revealables.forEach((el) => io.observe(el));
  } else revealables.forEach((el) => el.classList.add("is-in"));

  /* ═════ IMMOBILI: la riga attiva cambia la foto ═════ */
  const lots = $$(".lot"), figs = $$(".lots__fig");
  let active = lots[0];
  const activate = (li) => {
    if (!li || li === active) return;
    if (active) { active.classList.remove("is-on"); $(".lot__head", active).setAttribute("aria-expanded", "false"); }
    active = li;
    li.classList.add("is-on"); $(".lot__head", li).setAttribute("aria-expanded", "true");
    figs.forEach((f) => {
      const on = f.dataset.lot === li.dataset.lot;
      f.classList.toggle("was-on", f.classList.contains("is-on") && !on);
      if (!on) f.classList.remove("is-on", "is-anim");
    });
    const fig = figs.find((f) => f.dataset.lot === li.dataset.lot);
    if (fig) fig.classList.add("is-on");
  };
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  // chi sceglie un annuncio lo sta guardando: lo scorrimento automatico si ferma 21 secondi e poi riparte
  lots.forEach((li) => {
    const head = $(".lot__head", li);
    head.addEventListener("click", () => { activate(li); pauseLots(); });
    head.addEventListener("focus", () => { activate(li); pauseLots(); });
    if (fine) li.addEventListener("pointerenter", () => { activate(li); pauseLots(); });
  });
  $$(".filter").forEach((b) => b.addEventListener("click", () => {
    const f = b.dataset.filter;
    $$(".filter").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    lots.forEach((li) => li.classList.toggle("is-hidden", f !== "all" && li.dataset.type !== f));
    if (active && active.classList.contains("is-hidden")) activate(lots.find((li) => !li.classList.contains("is-hidden")));
  }));

  // gli annunci scorrono da soli, piano, finché l'elenco è in vista; un clic li ferma per 21 secondi
  const lotsSec = $(".lots");
  const LOT_STEP = 4600, LOT_PAUSE = 21000;
  let inView = false, lotTimer = 0;
  function scheduleLots(ms) { clearTimeout(lotTimer); if (!reduce) lotTimer = setTimeout(nextLot, ms); }
  function nextLot() {
    if (inView && !document.hidden) {
      const vis = lots.filter((li) => !li.classList.contains("is-hidden"));
      if (vis.length > 1) activate(vis[(vis.indexOf(active) + 1) % vis.length]);
    }
    scheduleLots(LOT_STEP);
  }
  function pauseLots() { scheduleLots(LOT_PAUSE); }
  if (lotsSec) {
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { threshold: 0.35 }).observe(lotsSec);
    scheduleLots(LOT_STEP);
  }

  /* ═════ MODULO ═════ */
  const picks = { mode: "buy", zone: "centro" };
  const setPick = (group, v) => {
    const row = $(`.pick__row[data-group="${group}"]`); if (!row) return;
    picks[group] = v;
    $$(".pill", row).forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.v === v)));
  };
  $$(".pick__row").forEach((row) => row.addEventListener("click", (e) => {
    const b = e.target.closest(".pill"); if (b) setPick(row.dataset.group, b.dataset.v);
  }));

  // "Chiedi informazioni" precompila il modulo con l'immobile scelto
  $$(".lot__ask").forEach((a) => a.addEventListener("click", () => {
    const li = a.closest(".lot");
    setPick("mode", li.dataset.mode); setPick("zone", li.dataset.zone);
    const msg = $("#message");
    if (msg && !msg.value.trim()) msg.value = t("about") + $(".lot__name", li).textContent.trim() + " (" + $(".lot__meta span", li).textContent.trim() + ")";
  }));

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
      const body = `${interest}\n\n${data.get("name")} <${data.get("email")}>\nTel: ${data.get("phone") || "-"}\n\n${data.get("message")}`;
      location.href = `mailto:immobiliare@luccalfa.it?subject=${encodeURIComponent(t("subject"))}&body=${encodeURIComponent(body)}`;
      return;
    }
    const btn = $("button[type=submit]", form); btn.disabled = true;
    say(t("sending"));
    try {
      const res = await fetch(endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } });
      if (res.ok) { location.href = "thanks.html" + (lang === "en" ? "?lang=en" : ""); return; }
      say(t("err"), true);
    } catch { say(t("net"), true); }
    btn.disabled = false;
  });

  /* ═════ FAQ: una risposta aperta alla volta ═════ */
  const faqs = $$(".acc details");
  faqs.forEach((d) => d.addEventListener("toggle", () => { if (d.open) faqs.forEach((o) => { if (o !== d) o.open = false; }); }));

  const yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();

  /* ═════ CARICAMENTO: solo alla prima visita della sessione ═════
     Il simbolo si disegna; poi (come su RIO) il pannello sparisce in un fondo pietra identico che copre la foto,
     le lettere del titolo compaiono in ordine sparso, il fondo scorre via a sinistra e scopre i tetti. */
  const root = document.documentElement;
  const loader = $("#loader");
  const firstVisit = !!(loader && root.classList.contains("is-loading"));
  if (firstVisit) {
    let finished = false;
    const done = () => {
      if (finished) return; finished = true;
      loader.classList.add("is-out");                     // il pannello svanisce nel fondo uguale dell'hero
      root.classList.add("is-revealing");                 // le lettere del titolo arrivano
      setTimeout(() => root.classList.add("is-unveiled", "is-leaving"), 1650);   // il fondo scorre via
      setTimeout(() => { root.classList.remove("is-loading"); loader.hidden = true; }, 3000);
      setTimeout(() => root.classList.remove("is-leaving", "is-revealing"), 4300);
      try { sessionStorage.setItem("la-loaded", "1"); } catch (e) { /* storage non disponibile */ }
    };
    const start = performance.now();
    const ready = () => setTimeout(done, Math.max(0, 2500 - (performance.now() - start)));
    const hero = $(".hero__pic img");
    if (hero && !hero.complete) { hero.addEventListener("load", ready, { once: true }); setTimeout(done, 3500); } else ready();
  }


  /* ═════ MISURE DELLE SCENE ═════
     Servizi: di quanto scorre la galleria orizzontale. */
  const measure = () => {
    const track = $(".srv__track"), view = $(".srv__viewport"), sstage = $(".srv__stage");
    if (track && view && sstage) sstage.style.setProperty("--tx", Math.max(0, track.scrollWidth - view.clientWidth) + "px");
  };
  addEventListener("load", measure); addEventListener("resize", measure); measure();
  $$(".srv__track img").forEach((im) => { if (!im.complete) im.addEventListener("load", measure, { once: true }); });

  /* ═════ SCORRIMENTO MORBIDO: solo computer con mouse ═════ */
  let lenis = null;
  if (!reduce && matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)").matches) {
    const tag = document.createElement("script");
    tag.src = "assets/vendor/lenis.min.js"; tag.async = true;
    tag.onload = () => {
      if (!window.Lenis) return;
      lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
      const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    };
    document.head.append(tag);
  }
  document.addEventListener("click", (e) => {
    const top = e.target.closest('a[href="#top"]');
    if (top && !reduce && scrollY > innerHeight) {
      e.preventDefault();
      const curtain = $("#curtain"), label = $("#curtainLabel");
      const io = "cubic-bezier(0.77, 0, 0.175, 1)";
      label.textContent = "LuccAlfa";
      curtain.style.transformOrigin = "50% 100%";
      curtain.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: 620, easing: io, fill: "forwards" }).finished
        .then(() => label.animate([{ opacity: 0, transform: "translateY(20%)" }, { opacity: 1, transform: "none" }], { duration: 300, easing: "ease-out", fill: "forwards" }).finished)
        .then(() => { if (lenis) lenis.scrollTo(0, { immediate: true, force: true }); else window.scrollTo(0, 0); curtain.style.transformOrigin = "50% 0%"; })
        .then(() => label.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, delay: 160, easing: "ease-out", fill: "forwards" }).finished)
        .then(() => curtain.animate([{ transform: "scaleY(1)" }, { transform: "scaleY(0)" }], { duration: 760, easing: io, fill: "forwards" }));
      return;
    }
    const a = e.target.closest('a[href^="#"]'); if (!a || !lenis) return;
    const id = a.getAttribute("href"); const target = id === "#top" ? 0 : $(id);
    if (target == null) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: id === "#top" ? 0 : -60, duration: 1.4 });
  });

  /* lingua iniziale: ?lang= › scelta salvata › lingua del browser */
  let initial = "it";
  try {
    const q = new URLSearchParams(location.search).get("lang");
    const saved = localStorage.getItem("luccalfa-lang");
    initial = q || saved || ((navigator.language || "it").toLowerCase().startsWith("it") ? "it" : "en");
  } catch (e) { /* default it */ }
  if (initial !== "it") applyLang(initial);

  /* ═════ TITOLO DELL'HERO: alla prima visita lettere in ordine sparso (RIO), poi parole che salgono (FIND) ═════ */
  const heroTitle = $(".hero__title");
  if (heroTitle && !reduce) {
    const wrapText = (fn) => {
      const walk = (node) => [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) { const frag = document.createDocumentFragment(); fn(n.textContent, frag); n.replaceWith(frag); }
        else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
      });
      walk(heroTitle);
    };
    if (firstVisit) {
      const letters = [];
      wrapText((text, frag) => text.split(/(\s+)/).forEach((w) => {
        if (!w) return; if (/^\s+$/.test(w)) { frag.append(" "); return; }
        const word = document.createElement("span"); word.className = "hl-word";
        [...w].forEach((ch) => { const l = document.createElement("span"); l.className = "hl"; l.textContent = ch; word.append(l); letters.push(l); });
        frag.append(word);
      }));
      // ordine sparso ma uniforme: ogni lettera ha un istante a caso dentro 0,8 secondi
      letters.forEach((l) => l.style.setProperty("--hd", (Math.random() * 1.0).toFixed(3) + "s"));
    } else {
      let i = 0;
      wrapText((text, frag) => text.split(/(\s+)/).forEach((w) => {
        if (!w) return; if (/^\s+$/.test(w)) { frag.append(" "); return; }
        const o = document.createElement("span"); o.className = "hw";
        const inner = document.createElement("span"); inner.textContent = w; inner.style.setProperty("--wi", String(i++));
        o.append(inner); frag.append(o);
      }));
      root.classList.add("hero-words");
    }
  }
  // due fotogrammi dopo: la frase parte davvero chiusa e la sua apertura si vede
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("hero-wait")));
})();
