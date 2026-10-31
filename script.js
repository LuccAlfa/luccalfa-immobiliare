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
    if (burger) burger.firstElementChild.textContent = menuOpen ? t("menuClose") : t("menuOpen");
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
    burger.setAttribute("aria-expanded", String(open));
    burger.firstElementChild.textContent = open ? t("menuClose") : t("menuOpen");
    if (mqPhone.matches) menu.inert = !open;
  };
  const syncMenu = () => { menu.inert = mqPhone.matches && !menuOpen; if (!mqPhone.matches && menuOpen) setMenu(false); };
  syncMenu(); mqPhone.addEventListener("change", syncMenu);
  burger.addEventListener("click", () => setMenu(!menuOpen));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && menuOpen) { setMenu(false); burger.focus(); } });

  /* ═════ NAV: fondo pieno dopo l'hero, si nasconde scendendo ═════ */
  const nav = $("#nav"), hero = $(".hero"), wa = $("#wa");
  let lastY = scrollY, ticking = false;
  const onScroll = () => {
    const y = scrollY, past = y > (hero ? hero.offsetHeight - 80 : 40);
    nav.classList.toggle("is-solid", y > 40);
    nav.classList.toggle("is-away", past && y > lastY + 4 && !menuOpen);
    if (y < lastY - 4 || !past) nav.classList.remove("is-away");
    if (wa) wa.classList.toggle("is-on", past);
    lastY = y; ticking = false;
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
    if (fig) { fig.classList.remove("is-anim"); void fig.offsetWidth; fig.classList.add("is-on", "is-anim"); }
  };
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  lots.forEach((li) => {
    const head = $(".lot__head", li);
    head.addEventListener("click", () => activate(li));
    head.addEventListener("focus", () => activate(li));
    if (fine) li.addEventListener("pointerenter", () => activate(li));
  });
  $$(".filter").forEach((b) => b.addEventListener("click", () => {
    const f = b.dataset.filter;
    $$(".filter").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    lots.forEach((li) => li.classList.toggle("is-hidden", f !== "all" && li.dataset.type !== f));
    if (active && active.classList.contains("is-hidden")) activate(lots.find((li) => !li.classList.contains("is-hidden")));
  }));

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

  /* ═════ MISURE DELLE SCENE ═════
     Porta: scala finale perché il vano copra tutto lo schermo.
     Servizi: di quanto scorre la galleria orizzontale. */
  const measure = () => {
    const stage = $(".door__stage"), leaves = $(".door__leaves"), scene = $(".door__scene");
    if (stage && leaves && scene && getComputedStyle(stage).position === "sticky") {
      const W = stage.clientWidth, H = stage.clientHeight;
      const sw = scene.offsetWidth, sh = scene.offsetHeight;
      const hw = sw * 0.22865, hh = sh * 0.28103;
      const cx = scene.offsetLeft + sw * 0.49531, cy = scene.offsetTop + sh * 0.61018;
      const s = Math.max(cx / hw, (W - cx) / hw, cy / hh, (H - cy) / hh) * 1.1;
      stage.style.setProperty("--s-end", s.toFixed(3));
    }
    const track = $(".srv__track"), view = $(".srv__viewport"), sstage = $(".srv__stage");
    if (track && view && sstage) sstage.style.setProperty("--tx", Math.max(0, track.scrollWidth - view.clientWidth) + "px");
  };
  addEventListener("load", measure); addEventListener("resize", measure); measure();

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
})();
