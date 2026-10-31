/* LuccAlfa Immobiliare — script.js
   Nessuna libreria esterna: il sito si legge tutto anche senza JavaScript.
   Qui: lingua, menu, comparse, elenco immobili, modulo contatti. */
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
  };

  $$(".lang button").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.lang === lang) return;
    const main = $("#main");
    if (reduce || !main.animate) { applyLang(b.dataset.lang); return; }
    // breve dissolvenza, così il testo non "salta" sotto gli occhi
    main.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: "ease-out", fill: "forwards" }).finished.then(() => {
      applyLang(b.dataset.lang);
      main.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: "ease-out", fill: "forwards" });
    });
  }));

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
  const revealables = $$("[data-reveal], .door__frame");
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
    figs.forEach((f) => f.classList.toggle("is-on", f.dataset.lot === li.dataset.lot));
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

  /* lingua iniziale: ?lang= › scelta salvata › lingua del browser */
  let initial = "it";
  try {
    const q = new URLSearchParams(location.search).get("lang");
    const saved = localStorage.getItem("luccalfa-lang");
    initial = q || saved || ((navigator.language || "it").toLowerCase().startsWith("it") ? "it" : "en");
  } catch (e) { /* default it */ }
  if (initial !== "it") applyLang(initial);
})();
