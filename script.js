/* LuccAlfa Immobiliare — script.js
   Scroll 3D, liquid glass, filtri, form. Nessuna dipendenza. */
(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const isMobile = () => matchMedia("(max-width: 760px)").matches;

  /* ═════ IMMOBILI ═════
     Sostituisci questo array con i tuoi annunci reali.
     img: percorso foto (es. "assets/img/p1.jpg"); se manca resta il gradiente.
     demo: true mostra il badge "Esempio" → rimuovilo sugli annunci veri.
     url: link alla scheda sul portale o pagina dedicata. */
  const LISTINGS = [
    { type: "vendita", title: "Appartamento nel centro storico", loc: "Lucca · Dentro le Mura", mq: 110, rooms: 4, price: "Prezzo su richiesta", c1: "#cdd5cb", c2: "#eadfcc", demo: true },
    { type: "vendita", title: "Villa con giardino e uliveto", loc: "Colline di Lucca", mq: 260, rooms: 7, price: "Prezzo su richiesta", c1: "#c9d3c2", c2: "#e8d3b2", demo: true },
    { type: "affitto", title: "Trilocale ristrutturato", loc: "Pisa · Centro", mq: 85, rooms: 3, price: "Canone su richiesta", c1: "#d4d8dc", c2: "#efe6d6", demo: true },
    { type: "vendita", title: "Casale in pietra da ristrutturare", loc: "Capannori", mq: 320, rooms: 9, price: "Prezzo su richiesta", c1: "#bfc9bd", c2: "#e1c9a6", demo: true },
    { type: "affitto", title: "Bilocale vicino al mare", loc: "Viareggio", mq: 55, rooms: 2, price: "Canone su richiesta", c1: "#cfdbe0", c2: "#f0e8d8", demo: true },
    { type: "vendita", title: "Villetta a schiera con box", loc: "Porcari", mq: 140, rooms: 5, price: "Prezzo su richiesta", c1: "#d3d6c8", c2: "#ecdcc0", demo: true }
  ];

  /* ═════ ANNO ═════ */
  const yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();

  /* ═════ RENDER IMMOBILI + FILTRI ═════ */
  const listEl = $("#listings");
  if (listEl) {
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    listEl.innerHTML = LISTINGS.map((p, i) => {
      const tag = p.url ? "a" : "article";
      const href = p.url ? ` href="${esc(p.url)}" target="_blank" rel="noopener noreferrer"` : "";
      return `<${tag} class="lcard rv rv--d${i % 3}" data-type="${esc(p.type)}" data-tilt${href}>
        <div class="lcard__img" style="--c1:${esc(p.c1 || "#cfd6cf")};--c2:${esc(p.c2 || "#e9e0d0")}">
          ${p.img ? `<img src="${esc(p.img)}" alt="${esc(p.title)}" loading="lazy" onerror="this.remove()">` : ""}
          <span class="lcard__badge">${p.type === "affitto" ? "Affitto" : "Vendita"}</span>
          ${p.demo ? '<span class="lcard__demo">Esempio</span>' : ""}
        </div>
        <div class="lcard__body">
          <span class="lcard__loc">${esc(p.loc)}</span>
          <h3>${esc(p.title)}</h3>
          <span class="lcard__price">${esc(p.price)}</span>
          <div class="lcard__meta"><span>${esc(p.mq)} m²</span><span>${esc(p.rooms)} locali</span></div>
        </div>
      </${tag}>`;
    }).join("");

    $$(".chip").forEach((chip) => chip.addEventListener("click", () => {
      const f = chip.dataset.filter;
      $$(".chip").forEach((c) => { c.classList.toggle("is-on", c === chip); c.setAttribute("aria-selected", c === chip); });
      $$(".lcard", listEl).forEach((card) => card.classList.toggle("is-hidden", f !== "all" && card.dataset.type !== f));
    }));
  }

  /* ═════ MANIFESTO: parole che si illuminano ═════ */
  const scrub = $("[data-scrub]");
  let words = [];
  if (scrub) {
    words = scrub.textContent.trim().split(/\s+/).map((w) => { const s = document.createElement("span"); s.className = "w"; s.textContent = w + " "; return s; });
    scrub.textContent = ""; words.forEach((w) => scrub.appendChild(w));
  }

  /* ═════ STACK: indice per top sticky ═════ */
  const steps = $$("#stack .step");
  steps.forEach((s, i) => s.style.setProperty("--i", i));

  /* ═════ REVEAL (IntersectionObserver) ═════ */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  $$(".rv").forEach((el) => io.observe(el));

  /* ═════ TAB BAR / NAV: sezione attiva ═════ */
  const tabs = $$(".tabbar a");
  const navLinks = $$(".nav__links a");
  const map = { top: "top", hero: "top", manifesto: "top", immobili: "immobili", servizi: "servizi", metodo: "servizi", zone: "servizi", portali: "servizi", international: "faq", faq: "faq", contatti: "contatti" };
  const secObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const t = map[e.target.id] || "top";
      tabs.forEach((a) => a.classList.toggle("is-on", a.dataset.tab === t));
      navLinks.forEach((a) => a.classList.toggle("is-on", a.getAttribute("href") === "#" + e.target.id));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  $$("main section[id]").forEach((s) => secObs.observe(s));

  /* ═════ SCROLL LOOP (rAF) ═════ */
  const nav = $("#nav"), bar = $("#progress");
  const heroMedia = $(".hero__media"), heroInner = $(".hero__inner"), hero = $("#hero");
  const orbA = $(".orb--a"), orbB = $(".orb--b");
  const marquees = $$("[data-marquee]");
  const zonesSec = $(".zones");
  let lastY = 0, ticking = false;

  const update = () => {
    ticking = false;
    const y = scrollY, vh = innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    nav.classList.toggle("is-scrolled", y > 20);

    if (!reduce) {
      /* hero: parallax e dissolvenza */
      if (y < vh * 1.2) {
        const p = clamp(y / vh);
        if (heroMedia) heroMedia.style.transform = `translate3d(0, ${y * 0.3}px, 0) scale(${1 + p * 0.08})`;
        if (heroInner) { heroInner.style.transform = `translate3d(0, ${y * -0.12}px, 0)`; heroInner.style.opacity = String(1 - p * 1.2); }
      }
      /* orbs ambientali */
      if (orbA) orbA.style.transform = `translate3d(${y * 0.03}px, ${y * -0.06}px, 0)`;
      if (orbB) orbB.style.transform = `translate3d(${y * -0.04}px, ${y * -0.09}px, 0)`;

      /* manifesto */
      if (words.length) {
        const r = scrub.getBoundingClientRect();
        const p = clamp((vh * 0.85 - r.top) / (vh * 0.55 + r.height * 0.4));
        const n = Math.round(p * words.length);
        words.forEach((w, i) => w.classList.toggle("is-lit", i < n));
      }

      /* stack sticky: la card sotto si "inclina" mentre la successiva la copre */
      steps.forEach((s, i) => {
        const next = steps[i + 1];
        if (!next) return;
        const top = parseFloat(getComputedStyle(s).top) || 100;
        const h = s.offsetHeight;
        const over = clamp((top + h - next.getBoundingClientRect().top) / h);
        s.style.transform = `perspective(1200px) translate3d(0, ${over * -10}px, ${over * -70}px) rotateX(${over * 5}deg) scale(${1 - over * 0.05})`;
        s.style.filter = over > 0 ? `brightness(${1 - over * 0.05})` : "";
      });

      /* marquee zone */
      if (zonesSec) {
        const r = zonesSec.getBoundingClientRect();
        if (r.bottom > 0 && r.top < vh) {
          const prog = (vh - r.top) * 0.28;
          marquees.forEach((m) => { m.style.transform = `translate3d(${(+m.dataset.marquee) * prog - (m.dataset.marquee > 0 ? 400 : 0)}px,0,0)`; });
        }
      }
    }
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  update();

  /* ═════ TILT 3D + RIFLESSO GLASS (solo puntatore preciso) ═════ */
  if (finePointer && !reduce) {
    $$("[data-tilt]").forEach((el) => {
      let raf = 0;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          el.style.setProperty("--mx", `${x * 100}%`); el.style.setProperty("--my", `${y * 100}%`);
          el.style.transform = `perspective(900px) rotateY(${(x - 0.5) * 9}deg) rotateX(${(0.5 - y) * 9}deg) translateZ(8px)`;
        });
      });
      el.addEventListener("pointerleave", () => { cancelAnimationFrame(raf); el.style.transform = ""; });
    });
    /* riflesso anche su pillola nav, finder e portali */
    $$(".nav__pill, .finder, .portal").forEach((el) => el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
      el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
    }));
  }

  /* ═════ FINDER: precompila il modulo contatti ═════ */
  const finder = $("#finder");
  if (finder) finder.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = new FormData(finder);
    const msg = $("#message");
    if (msg) msg.value = `Buongiorno, sono interessato/a a: ${d.get("mode")} · ${d.get("type")} · zona ${d.get("zone")}. Vorrei ricevere proposte.`;
    $("#contatti").scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    setTimeout(() => { const n = $("#name"); if (n) n.focus({ preventScroll: true }); }, 700);
  });

  /* ═════ FAQ: una sola aperta ═════ */
  const faqs = $$(".faq details");
  faqs.forEach((d) => d.addEventListener("toggle", () => { if (d.open) faqs.forEach((o) => { if (o !== d) o.open = false; }); }));

  /* ═════ FORM ═════ */
  const form = $("#contact-form"), status = $("#form-status");
  if (form) form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const say = (t, err) => { status.textContent = t; status.className = "form-status" + (err ? " error" : ""); };
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const endpoint = form.dataset.endpoint || "";
    const data = new FormData(form);

    /* finché l'endpoint Formspree non è configurato, apre il client email */
    if (!endpoint || endpoint.includes("YOUR_FORM_ID")) {
      const body = `Nome: ${data.get("name")}\nEmail: ${data.get("_replyto")}\nTelefono: ${data.get("phone") || "-"}\n\n${data.get("message")}`;
      location.href = `mailto:info@luccalfa-immobiliare.it?subject=${encodeURIComponent("Richiesta dal sito")}&body=${encodeURIComponent(body)}`;
      return;
    }
    say("Invio in corso…");
    try {
      const res = await fetch(endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } });
      if (res.ok) { form.reset(); say("Grazie! Ti risponderemo al più presto."); }
      else say("Si è verificato un errore. Riprova o chiamaci.", true);
    } catch { say("Errore di connessione. Riprova più tardi.", true); }
  });
})();
