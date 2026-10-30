/* LuccAlfa Immobiliare — legal.js
   Pagine privacy e cookie: stessa scelta di lingua della home (luccalfa-lang). */
(() => {
  "use strict";
  const blocks = document.querySelectorAll("[data-l]");
  const btns = document.querySelectorAll(".lang button");
  const sw = document.querySelector(".lang");
  const titles = {};
  blocks.forEach((b) => { titles[b.dataset.l] = b.querySelector("h1").textContent + " – LuccAlfa Immobiliare"; });

  const apply = (l) => {
    const lang = l === "en" ? "en" : "it";
    document.documentElement.lang = lang;
    blocks.forEach((b) => { b.hidden = b.dataset.l !== lang; });
    btns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    if (sw) sw.classList.toggle("is-en", lang === "en");
    document.title = titles[lang];
    try { localStorage.setItem("luccalfa-lang", lang); } catch (e) { /* storage non disponibile */ }
  };

  btns.forEach((b) => b.addEventListener("click", () => apply(b.dataset.lang)));

  let initial = "it";
  try {
    const q = new URLSearchParams(location.search).get("lang");
    const saved = localStorage.getItem("luccalfa-lang");
    initial = q || saved || ((navigator.language || "it").toLowerCase().startsWith("it") ? "it" : "en");
  } catch (e) { /* default it */ }
  apply(initial);
})();
