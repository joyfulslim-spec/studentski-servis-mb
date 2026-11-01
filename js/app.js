/* =========================================================
   Skupni JavaScript: glava, noga, stanje uporabnika in logika posameznih strani.
   Vsaka stran ima na <body> atribut data-page, po katerem se zažene ustrezna funkcija.
   ========================================================= */
(function () {
  "use strict";
  const SS = window.SS;
  document.documentElement.classList.add("js");
  const reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Pomožne funkcije ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const eur = n => (Number(n) || 0).toLocaleString("sl-SI", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  const params = new URLSearchParams(location.search);
  const today = () => new Date().toLocaleDateString("sl-SI", { day: "numeric", month: "numeric", year: "numeric" });

  function toast(msg) {
    $$(".toast").forEach(t => t.remove());
    const t = document.createElement("div");
    t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2800);
  }

  /* ---------- Stanje (shranjeno v brskalniku, simulira strežnik) ---------- */
  const KEY = "ssmb-prototip";
  const DEFAULT = { prijavljen: false, clan: true, status: { veljaven: false, do: "30. 9. 2026" }, prijave: [], napotnice: [], piskotki: null };
  function load() {
    try { return Object.assign({}, DEFAULT, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { return { ...DEFAULT }; }
  }
  let state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* zasebni način – stanje velja le do osvežitve */ } }
  SS.reset = () => { try { localStorage.removeItem(KEY); } catch (e) {} location.href = "index.html"; };

  /* ---------- Ikone ---------- */
  const I = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-7-6.4-7-12a7 7 0 0 1 14 0c0 5.6-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    building: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h6"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
    tick: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
    upload: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg>',
  };
  SS.I = I;

  /* ---------- Glava in noga ---------- */
  const NAV = [
    { naslov: "Za študente", items: [
      ["prosta-dela.html", "Prosta dela", "Išči po kraju, vrsti dela in plačilu"],
      ["vclani-se.html", "Včlani se", "Spletna včlanitev v 3 korakih"],
      ["podaljsaj-status.html", "Podaljšaj status", "Naloži potrdilo o vpisu"],
      ["napotnica.html", "Naroči napotnico", "E-napotnica brez obiska poslovalnice"],
      ["kalkulator.html", "Kalkulator zaslužka", "Koliko dobiš neto"],
      ["dohodnina-obrazci.html", "Dohodnina in obrazci", "Pogosta vprašanja in dokumenti"],
    ] },
    { naslov: "Za podjetja", items: [
      ["podjetja.html", "Pregled za podjetja", "Kako poteka sodelovanje"],
      ["oddaja-oglasa.html", "Oddaja oglasa za delo", "Objava v nekaj minutah"],
      ["vpis-partnerja.html", "Vpis poslovnega partnerja", "Pogodba in dostop"],
      ["izracun-stroska.html", "Izračun stroška dela", "Informativni bruto strošek"],
      ["predpisi.html", "Predpisi in informacije", "Zakonodaja o študentskem delu"],
    ] },
  ];
  const SIMPLE = [["novice.html", "Novice"], ["poslovalnice.html", "Poslovalnice"], ["kontakti.html", "Kontakt"]];
  const here = location.pathname.split("/").pop() || "index.html";

  function headerHTML() {
    const acc = state.prijavljen
      ? `<a class="btn btn-outline account-btn" href="moj-racun.html" aria-label="Moj račun">${I.user}<span class="label">Moj račun</span></a>`
      : `<a class="btn btn-outline account-btn" href="prijava.html" aria-label="Prijava">${I.user}<span class="label">Prijava</span></a>`;
    return `
<a class="skip" href="#main">Skoči na vsebino</a>
<header class="site-header">
  <div class="container header-inner">
    <a class="logo" href="index.html" aria-label="Študentski servis Maribor – domov"><img src="img/logo.svg" alt="Študentski servis Maribor" width="138" height="44"></a>
    <nav class="main-nav" aria-label="Glavni meni">
      ${NAV.map((g, i) => `
        <div class="nav-item">
          <button class="nav-link ${g.items.some(x => x[0] === here) ? "active" : ""}" aria-expanded="false" aria-controls="dd${i}">${g.naslov} ${I.chev}</button>
          <div class="dropdown" id="dd${i}">${g.items.map(x => `<a href="${x[0]}">${x[1]}<small>${x[2]}</small></a>`).join("")}</div>
        </div>`).join("")}
      ${SIMPLE.map(x => `<a class="nav-link ${x[0] === here ? "active" : ""}" href="${x[0]}">${x[1]}</a>`).join("")}
    </nav>
    <div class="header-actions">
      ${acc}
      <button class="menu-toggle" aria-label="Odpri meni" aria-expanded="false" aria-controls="drawer">${I.menu}</button>
    </div>
  </div>
</header>
<div class="drawer" id="drawer" role="dialog" aria-modal="true" aria-label="Meni">
  <div class="drawer-head">
    <a href="index.html"><img src="img/logo.svg" alt="Študentski servis Maribor" height="40" style="height:40px;width:auto"></a>
    <button class="menu-toggle" data-close aria-label="Zapri meni">${I.close}</button>
  </div>
  <div class="drawer-body">
    <a class="btn btn-accent btn-block" href="prosta-dela.html">${I.search} Poišči delo</a>
    ${NAV.map(g => `<div class="drawer-group"><h3>${g.naslov}</h3>${g.items.map(x => `<a href="${x[0]}">${x[1]}</a>`).join("")}</div>`).join("")}
    <div class="drawer-group"><h3>Informacije</h3>${SIMPLE.map(x => `<a href="${x[0]}">${x[1]}</a>`).join("")}<a href="o-nas.html">O podjetju</a></div>
  </div>
</div>`;
  }

  function footerHTML() {
    return `
<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <img src="img/logo_white.svg" alt="Študentski servis Maribor" width="145" height="46">
        <p class="small">Z vami že od leta 1961. Posredujemo dijaška in študentska dela v Mariboru in vzhodni Sloveniji.</p>
        <p class="small">Gregorčičeva ulica 23, 2000 Maribor</p>
      </div>
      <div><h4>Za študente</h4><ul>${NAV[0].items.slice(0, 5).map(x => `<li><a href="${x[0]}">${x[1]}</a></li>`).join("")}</ul></div>
      <div><h4>Za podjetja</h4><ul>${NAV[1].items.map(x => `<li><a href="${x[0]}">${x[1]}</a></li>`).join("")}</ul></div>
      <div><h4>Servis</h4><ul><li><a href="o-nas.html">O podjetju</a></li><li><a href="poslovalnice.html">Poslovalnice</a></li><li><a href="novice.html">Novice</a></li><li><a href="kontakti.html">Kontakt</a></li></ul></div>
    </div>
    <div class="footer-bottom">
      <p class="proto-note">Študentski projekt – prototip prenove spletne strani (avtor: Timi Svenšek). To ni uradna stran Študentskega servisa Maribor; podatki o delih, osebah in urnikih so izmišljeni.</p>
      <p>Logotip: Študentski servis Maribor. Fotografije: <a href="https://unsplash.com" target="_blank" rel="noopener">Unsplash</a> (brezplačna licenca). <button class="link-btn" style="color:#e3ecf6" data-reset>Ponastavi prototip</button></p>
    </div>
  </div>
</footer>`;
  }

  function bottomBarHTML() {
    const items = [["index.html", "Domov", I.home], ["prosta-dela.html", "Dela", I.search], ["napotnica.html", "Napotnica", I.doc], [state.prijavljen ? "moj-racun.html" : "prijava.html", "Moj račun", I.user]];
    return `<nav class="bottom-bar" aria-label="Hitri meni">${items.map(x => `<a href="${x[0]}" class="${x[0] === here ? "active" : ""}">${x[2]}${x[1]}</a>`).join("")}</nav>`;
  }

  function cookieHTML() {
    return `<div class="cookie" role="region" aria-label="Piškotki"><div class="container cookie-inner">
      <p>Uporabljamo nujne piškotke za delovanje strani. Analitične piškotke uporabimo le z vašim soglasjem.</p>
      <div class="row"><button class="btn btn-primary btn-sm" data-cookie="vse">Sprejmi vse</button><button class="btn btn-outline btn-sm" data-cookie="nujni">Samo nujni</button></div>
    </div></div>`;
  }

  function mountChrome() {
    // Obvestilo o piškotkih je pas pod glavo (ni plavajoče), zato nikoli ne prekrije obrazca.
    document.body.insertAdjacentHTML("afterbegin", headerHTML() + (state.piskotki ? "" : cookieHTML()));
    document.body.insertAdjacentHTML("beforeend", footerHTML() + bottomBarHTML());

    // Spustni meniji na računalniku
    $$(".nav-item").forEach(item => {
      const btn = $(".nav-link", item);
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const open = !item.classList.contains("open");
        $$(".nav-item").forEach(i => { i.classList.remove("open"); $(".nav-link", i).setAttribute("aria-expanded", "false"); });
        item.classList.toggle("open", open); btn.setAttribute("aria-expanded", String(open));
      });
    });
    document.addEventListener("click", () => $$(".nav-item.open").forEach(i => { i.classList.remove("open"); $(".nav-link", i).setAttribute("aria-expanded", "false"); }));

    // Mobilni meni
    const drawer = $("#drawer"), openBtn = $(".header-actions .menu-toggle");
    const setDrawer = open => { drawer.classList.toggle("open", open); document.body.classList.toggle("no-scroll", open); openBtn.setAttribute("aria-expanded", String(open)); if (open) $("[data-close]", drawer).focus(); else openBtn.focus(); };
    openBtn.addEventListener("click", () => setDrawer(true));
    $("[data-close]", drawer).addEventListener("click", () => setDrawer(false));
    document.addEventListener("keydown", e => { if (e.key === "Escape") { if (drawer.classList.contains("open")) setDrawer(false); $$(".nav-item.open").forEach(i => i.classList.remove("open")); } });

    $$("[data-cookie]").forEach(b => b.addEventListener("click", () => { state.piskotki = b.dataset.cookie; save(); $(".cookie").remove(); }));
    $("[data-reset]").addEventListener("click", SS.reset);

    // Senca glave, trak napredka drsenja in gumb »na vrh«
    const header = $(".site-header");
    header.insertAdjacentHTML("beforeend", '<div class="scroll-progress" aria-hidden="true"></div>');
    document.body.insertAdjacentHTML("beforeend", `<button class="to-top" type="button" aria-label="Na vrh strani"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg></button>`);
    const topBtn = $(".to-top"), bar = $(".scroll-progress");
    topBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));
    let ticking = false;
    const onScroll = () => {
      const y = window.scrollY, max = document.documentElement.scrollHeight - innerHeight;
      header.classList.toggle("scrolled", y > 8);
      topBtn.classList.toggle("show", y > 600);
      bar.style.setProperty("--p", max > 0 ? Math.min(1, y / max) : 0);
      ticking = false;
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();

    // Valovanje ob kliku na gumb
    document.addEventListener("pointerdown", e => {
      const b = e.target.closest(".btn, .chip, .quick");
      if (!b || reduceMotion) return;
      const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height);
      const rip = document.createElement("span");
      rip.className = "ripple";
      rip.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
      if (getComputedStyle(b).position === "static") b.style.position = "relative";
      b.style.overflow = "hidden";
      b.appendChild(rip);
      setTimeout(() => rip.remove(), 600);
    });
  }

  /* ---------- Animacije: pojav ob drsenju, štetje številk ---------- */
  function countUp(el) {
    const txt = el.textContent.trim();
    if (!/^\d{1,4}$/.test(txt) || reduceMotion) return;
    const to = Number(txt), from = to > 1000 ? to - 65 : 0, t0 = performance.now(), dur = 1100;
    const step = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function setupReveal() {
    const targets = $$("main .section h2, main .quick, main .job-card, main .news-card, main .stat, main .split > *, main .office, main .kpi, main .file-row, main .accordion details, main .card:not(.form-card):not(.filters-panel), main .status-banner");
    if (!("IntersectionObserver" in window) || reduceMotion) { $$(".stat b, .kpi b, #jobCount").forEach(countUp); return; }
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add("in");
      $$(".stat b, .kpi b, #jobCount", en.target).forEach(countUp);
      io.unobserve(en.target);
    }), { rootMargin: "0px 0px -8% 0px", threshold: .08 });
    targets.forEach(el => {
      if (el.closest(".step, .home-hero, .page-hero, #jobList")) return;
      const sibs = [...el.parentElement.children].filter(c => targets.includes(c));
      el.style.setProperty("--d", Math.min(sibs.indexOf(el), 6) * 0.07 + "s");
      el.classList.add("reveal");
      io.observe(el);
    });
    const jc = $("#jobCount"); if (jc) countUp(jc);
  }

  /* Gladko štetje zneska v evrih (kalkulator) */
  function tweenEur(el, to) {
    const from = Number(el.dataset.v || 0); el.dataset.v = to;
    if (reduceMotion) { el.textContent = eur(to); return; }
    const t0 = performance.now(), dur = 450;
    cancelAnimationFrame(el._raf);
    const step = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = eur(from + (to - from) * e);
      if (k < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
    el.classList.add("bump"); setTimeout(() => el.classList.remove("bump"), 200);
  }

  /* ---------- Skupni gradniki ---------- */
  function jobCard(j) {
    const applied = state.prijave.includes(j.id);
    return `<a class="job-card" href="delo.html?id=${j.id}">
      <div class="job-top">
        <div class="stack-sm" style="gap:4px;min-width:0"><span class="job-code">Šifra ${j.id} · ${esc(j.objavljeno)}</span><h3>${esc(j.naziv)}</h3></div>
        <div class="pay"><b>${eur(j.urna)}</b><small>na uro, bruto</small></div>
      </div>
      <div class="meta"><span>${I.building}${esc(j.podjetje)}</span><span>${I.pin}${esc(j.kraj)}</span><span>${I.clock}${esc(j.cas)}</span></div>
      <div class="tags"><span class="tag">${esc(j.kat)}</span>${j.dijaki ? '<span class="tag tag-ok">Tudi za dijake</span>' : ""}${applied ? '<span class="tag tag-red">Prijavljen</span>' : ""}</div>
    </a>`;
  }
  const statusText = () => state.status.veljaven ? `Status veljaven do ${state.status.do}` : `Status je potekel ${state.status.do}`;

  /* Večkoračni obrazec: koraki so <section class="step">, števec je <ol class="stepper"> */
  function wizard(form, { onStep, onFinish }) {
    const steps = $$(".step", form), stepper = $(".stepper", form.parentElement) || $(".stepper", form);
    let i = 0;
    const show = () => {
      steps.forEach((s, k) => s.hidden = k !== i);
      if (stepper) $$("li", stepper).forEach((li, k) => { li.className = k < i ? "done" : k === i ? "current" : ""; li.toggleAttribute("aria-current", k === i); });
      $("[data-prev]", form).hidden = i === 0;
      $("[data-next]", form).textContent = steps[i].dataset.nextLabel || "Naprej";
      onStep && onStep(i);
    };
    $("[data-prev]", form).addEventListener("click", () => { i--; show(); form.scrollIntoView({ block: "start" }); });
    form.addEventListener("submit", e => {
      e.preventDefault();
      if (!validate(steps[i])) return;
      if (i < steps.length - 1) { i++; show(); form.scrollIntoView({ block: "start" }); }
      else onFinish();
    });
    show();
  }

  /* Preverjanje polj: required, pattern, data-len, checkbox */
  function validate(scope) {
    let firstBad = null;
    $$(".error[data-auto]", scope).forEach(e => e.remove());
    $$("input, select, textarea", scope).forEach(el => {
      if (el.disabled || el.type === "file") return;
      let msg = "";
      const v = el.type === "checkbox" ? el.checked : el.value.trim();
      if (el.required && !v) msg = el.type === "checkbox" ? "To polje je obvezno." : "Izpolni to polje.";
      else if (v && el.dataset.pattern && !new RegExp(el.dataset.pattern).test(el.value.replace(/\s/g, ""))) msg = el.dataset.msg || "Preveri vnos.";
      else if (v && el.type === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) msg = "Vpiši veljaven e-poštni naslov (npr. ime@primer.si).";
      el.setAttribute("aria-invalid", msg ? "true" : "false");
      if (msg) {
        const p = document.createElement("p"); p.className = "error"; p.dataset.auto = ""; p.textContent = msg;
        (el.closest(".field") || el.closest(".check") || el.parentElement).appendChild(p);
        firstBad = firstBad || el;
      }
    });
    const fileReq = $("[data-file-required]", scope);
    if (fileReq && !fileReq.dataset.name) { toast("Najprej naloži datoteko."); firstBad = firstBad || fileReq; }
    if (firstBad) { firstBad.focus(); return false; }
    return true;
  }
  document.addEventListener("input", e => { if (e.target.getAttribute && e.target.getAttribute("aria-invalid") === "true") { e.target.setAttribute("aria-invalid", "false"); const er = e.target.closest(".field, .check")?.querySelector(".error[data-auto]"); if (er) er.remove(); } });

  /* Nalaganje datoteke (klik ali povleci in spusti) */
  function dropzone(zone) {
    const input = $("input[type=file]", zone), title = $("[data-title]", zone);
    const setFile = name => { zone.dataset.name = name; zone.classList.add("has-file"); title.textContent = name; $("[data-sub]", zone).textContent = "Datoteka je naložena. Lahko jo zamenjaš."; };
    input.addEventListener("change", () => input.files[0] && setFile(input.files[0].name));
    ["dragenter", "dragover"].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add("drag"); }));
    ["dragleave", "drop"].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.remove("drag"); }));
    zone.addEventListener("drop", e => e.dataTransfer.files[0] && setFile(e.dataTransfer.files[0].name));
    const demo = $("[data-demo-file]", zone); if (demo) demo.addEventListener("click", () => setFile(demo.dataset.demoFile));
    return () => zone.dataset.name || "";
  }

  function successHTML(title, text, actions) {
    return `<div class="success"><div class="tick">${I.tick}</div><h2>${title}</h2><p class="lead">${text}</p><div class="form-actions" style="width:100%;max-width:520px">${actions}</div></div>`;
  }

  /* ============ STRANI ============ */
  const PAGES = {};

  PAGES.home = () => {
    $("#latestJobs").innerHTML = SS.JOBS.slice(0, 4).map(jobCard).join("");
    $("#homeNews").innerHTML = SS.NEWS.slice(0, 3).map(n => `<a class="news-card" href="novice.html#n${n.id}"><time>${n.datum}</time><span class="tag" style="justify-self:start">${esc(n.kat)}</span><h3>${esc(n.naslov)}</h3><p class="muted small">${esc(n.povzetek)}</p></a>`).join("");
    $("#jobCount").textContent = SS.JOBS.length;
    const sel = $("#hRegija"); sel.innerHTML += SS.REGIJE.map(r => `<option>${r}</option>`).join("");
    const kat = $("#hKat"); kat.innerHTML += SS.KATEGORIJE.map(r => `<option>${r}</option>`).join("");

    // Iskalno polje »tipka« primere, dokler ga uporabnik ne izbere
    const q = $("#hQ"), examples = ["strežba", "programer", "inventura", "inštrukcije", "dostava s kolesom"];
    if (!reduceMotion) {
      let w = 0, c = 0, del = false, timer;
      const tick = () => {
        if (document.activeElement === q || q.value) { q.placeholder = "npr. strežba, programer, inventura"; timer = setTimeout(tick, 1200); return; }
        const word = examples[w];
        c += del ? -1 : 1;
        q.placeholder = "npr. " + word.slice(0, c) + (c % 2 ? "|" : "");
        let wait = del ? 45 : 90;
        if (!del && c === word.length) { del = true; wait = 1400; }
        else if (del && c === 0) { del = false; w = (w + 1) % examples.length; wait = 300; }
        timer = setTimeout(tick, wait);
      };
      timer = setTimeout(tick, 1200);
    }
    if (state.prijavljen) {
      const sb = $("#statusBanner"); sb.hidden = false;
      sb.classList.toggle("ok", state.status.veljaven);
      sb.innerHTML = `<div class="stack-sm" style="gap:2px"><b>Živjo, ${esc(SS.DEMO_USER.ime.split(" ")[0])}!</b><span class="small">${statusText()}${state.status.veljaven ? "" : " – brez veljavnega statusa ne moreš naročiti napotnice."}</span></div>
        ${state.status.veljaven ? `<a class="btn btn-outline btn-sm" href="moj-racun.html">Moj račun</a>` : `<a class="btn btn-primary btn-sm" href="podaljsaj-status.html">Podaljšaj status</a>`}`;
    }
  };

  PAGES.jobs = () => {
    const f = { q: params.get("q") || "", regija: params.get("regija") || "", kat: params.get("kat") || "", min: params.get("min") || "", dijaki: params.get("dijaki") === "1", sort: params.get("sort") || "novo" };
    const regSel = $("#fRegija"), katSel = $("#fKat");
    regSel.innerHTML = `<option value="">Vse regije</option>` + SS.REGIJE.map(r => `<option>${r}</option>`).join("");
    katSel.innerHTML = `<option value="">Vse vrste dela</option>` + SS.KATEGORIJE.map(r => `<option>${r}</option>`).join("");
    $("#fQ").value = f.q; regSel.value = f.regija; katSel.value = f.kat; $("#fMin").value = f.min; $("#fDijaki").checked = f.dijaki; $("#fSort").value = f.sort;

    const chips = $("#chips");
    const topKats = ["Strežba", "Delo v trgovini", "Računalniška dela, informatika", "Skladiščna dela", "Poučevanje"];
    chips.innerHTML = topKats.map(k => `<button type="button" class="chip" data-kat="${k}" aria-pressed="${f.kat === k}">${k.split(",")[0]}</button>`).join("");
    chips.addEventListener("click", e => { const c = e.target.closest(".chip"); if (!c) return; f.kat = f.kat === c.dataset.kat ? "" : c.dataset.kat; katSel.value = f.kat; run(); });

    function run() {
      const q = f.q.trim().toLowerCase();
      let list = SS.JOBS.filter(j =>
        (!q || `${j.naziv} ${j.podjetje} ${j.kat} ${j.kraj} ${j.id}`.toLowerCase().includes(q)) &&
        (!f.regija || j.regija === f.regija) && (!f.kat || j.kat === f.kat) &&
        (!f.min || j.urna >= Number(f.min)) && (!f.dijaki || j.dijaki));
      if (f.sort === "urna") list = list.slice().sort((a, b) => b.urna - a.urna);
      $("#count").textContent = list.length;
      const jl = $("#jobList");
      jl.classList.remove("anim-in"); void jl.offsetWidth; jl.classList.add("anim-in");
      jl.innerHTML = list.length ? list.map((j, k) => jobCard(j).replace('class="job-card"', `class="job-card" style="--i:${Math.min(k, 8)}"`)).join("")
        : `<div class="card empty stack" style="align-items:center"><h3>Ni del, ki ustrezajo izbiri.</h3><p class="muted">Odstrani kakšen filter ali poišči z drugo besedo.</p><button class="btn btn-outline" id="clearAll" type="button">Počisti vse filtre</button></div>`;
      $$(".chip", chips).forEach(c => c.setAttribute("aria-pressed", String(c.dataset.kat === f.kat)));
      const p = new URLSearchParams(); Object.entries(f).forEach(([k, v]) => { if (v && !(k === "sort" && v === "novo")) p.set(k, v === true ? "1" : v); });
      history.replaceState(null, "", "prosta-dela.html" + (p.toString() ? "?" + p : ""));
      const n = [f.regija, f.kat, f.min, f.dijaki].filter(Boolean).length;
      $("#filterCount").textContent = n ? `(${n})` : "";
    }
    $("#fQ").addEventListener("input", e => { f.q = e.target.value; run(); });
    regSel.addEventListener("change", e => { f.regija = e.target.value; run(); });
    katSel.addEventListener("change", e => { f.kat = e.target.value; run(); });
    $("#fMin").addEventListener("change", e => { f.min = e.target.value; run(); });
    $("#fDijaki").addEventListener("change", e => { f.dijaki = e.target.checked; run(); });
    $("#fSort").addEventListener("change", e => { f.sort = e.target.value; run(); });
    $("#searchForm").addEventListener("submit", e => e.preventDefault());
    document.addEventListener("click", e => { if (e.target.id === "clearAll" || e.target.id === "clearFilters") { Object.assign(f, { q: "", regija: "", kat: "", min: "", dijaki: false }); $("#fQ").value = ""; regSel.value = ""; katSel.value = ""; $("#fMin").value = ""; $("#fDijaki").checked = false; run(); } });
    const panel = $("#filtersPanel"), tgl = $("#filterToggle");
    tgl.addEventListener("click", () => { panel.hidden = !panel.hidden; tgl.setAttribute("aria-expanded", String(!panel.hidden)); });
    run();
  };

  PAGES.job = () => {
    const j = SS.JOBS.find(x => x.id === Number(params.get("id"))) || SS.JOBS[0];
    document.title = `${j.naziv} – Prosta dela – Študentski servis Maribor`;
    $("#jTitle").textContent = j.naziv; $("#jCrumb").textContent = j.naziv;
    $("#jSub").textContent = `${j.podjetje} · ${j.kraj}`;
    $("#jPhoto").src = "img/" + j.img;
    $("#jBody").innerHTML = `
      <div class="tags"><span class="tag">${esc(j.kat)}</span>${j.dijaki ? '<span class="tag tag-ok">Tudi za dijake</span>' : '<span class="tag tag-warn">Samo za študente</span>'}<span class="tag">Šifra ${j.id}</span></div>
      <p>${esc(j.opis)}</p>
      <h3>Kaj boš delal</h3><ul>${j.naloge.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      <h3>Kaj pričakujemo</h3><ul>${j.pogoji.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
    $("#jFacts").innerHTML = `<dt>Plačilo</dt><dd>${eur(j.urna)} /h bruto<br><span class="muted small">≈ ${eur(j.urna * (1 - SS.STOPNJE.prispevkiStudent))} /h neto</span></dd>
      <dt>Kraj</dt><dd>${esc(j.kraj)}</dd><dt>Delovni čas</dt><dd>${esc(j.cas)}</dd><dt>Trajanje</dt><dd>${esc(j.trajanje)}</dd><dt>Začetek</dt><dd>${esc(j.od)}</dd><dt>Objavljeno</dt><dd>${esc(j.objavljeno)}</dd>`;
    $("#similar").innerHTML = SS.JOBS.filter(x => x.kat === j.kat && x.id !== j.id).concat(SS.JOBS.filter(x => x.regija === j.regija && x.kat !== j.kat && x.id !== j.id)).slice(0, 2).map(jobCard).join("");

    const box = $("#applyBox");
    const done = () => { box.innerHTML = `<div class="stack"><span class="tag tag-ok" style="justify-self:start;align-self:flex-start">Prijava oddana</span><h3>Kaj sledi?</h3><p class="small">Delodajalec te bo poklical v 2 delovnih dneh. Ko te izbere, naroči e-napotnico – brez nje dela ne smeš začeti.</p><a class="btn btn-primary btn-block" href="napotnica.html?job=${j.id}">Naroči e-napotnico</a><a class="btn btn-outline btn-block" href="prosta-dela.html">Nazaj na seznam del</a></div>`; };
    if (state.prijave.includes(j.id)) { done(); return; }
    if (state.prijavljen) { $("#apIme").value = SS.DEMO_USER.ime; $("#apEmail").value = SS.DEMO_USER.email; }
    $("#applyForm").addEventListener("submit", e => {
      e.preventDefault();
      if (!validate(e.target)) return;
      state.prijave.push(j.id); save(); done(); toast("Prijava je oddana.");
    });
  };

  PAGES.join = () => {
    const form = $("#joinForm"); const file = dropzone($(".dropzone", form));
    wizard(form, {
      onStep: i => { if (i === 2) $("#joinSummary").innerHTML = `<dt>Ime</dt><dd>${esc($("#jnIme").value)} ${esc($("#jnPriimek").value)}</dd><dt>E-pošta</dt><dd>${esc($("#jnEmail").value)}</dd><dt>Šola</dt><dd>${esc($("#jnSola").value)}</dd><dt>Potrdilo</dt><dd>${esc(file())}</dd><dt>TRR</dt><dd>${esc($("#jnTrr").value)}</dd>`; },
      onFinish: () => {
        state.clan = true; state.prijavljen = true; state.status = { veljaven: true, do: "30. 9. 2027" }; save();
        $("#joinWrap").innerHTML = successHTML("Dobrodošel med člani!", "Tvoja članska številka je <b>SS-104 552</b>. Status velja do 30. 9. 2027. Zdaj se lahko prijaviš na dela in naročaš napotnice.", `<a class="btn btn-primary" href="prosta-dela.html">Poišči delo</a><a class="btn btn-outline" href="moj-racun.html">Moj račun</a>`);
      }
    });
  };

  PAGES.status = () => {
    const wrap = $("#statusWrap");
    const next = params.get("next");
    if (state.status.veljaven) {
      wrap.innerHTML = `<div class="card form-card stack"><span class="tag tag-ok" style="align-self:flex-start">Veljaven do ${state.status.do}</span><h2>Tvoj status je veljaven</h2><p class="muted">Ni ti treba storiti ničesar. Status boš podaljšal ob začetku naslednjega šolskega leta – opomnili te bomo po e-pošti.</p><div class="form-actions"><a class="btn btn-primary" href="prosta-dela.html">Poišči delo</a><a class="btn btn-outline" href="moj-racun.html">Moj račun</a></div></div>`;
      return;
    }
    if (state.prijavljen) { $("#stIme").value = SS.DEMO_USER.ime; $("#stEmail").value = SS.DEMO_USER.email; $("#stClan").value = SS.DEMO_USER.clanska; }
    const form = $("#statusForm"); const file = dropzone($(".dropzone", form));
    wizard(form, {
      onStep: i => { if (i === 2) $("#stSummary").innerHTML = `<dt>Ime</dt><dd>${esc($("#stIme").value)}</dd><dt>Članska št.</dt><dd>${esc($("#stClan").value)}</dd><dt>Šola</dt><dd>${esc($("#stSola").value)}</dd><dt>Šolsko leto</dt><dd>${esc($("#stLeto").value)}</dd><dt>Potrdilo</dt><dd>${esc(file())}</dd>`; },
      onFinish: () => {
        const leto = $("#stLeto").value;
        state.status = { veljaven: true, do: leto === "2027/28" ? "30. 9. 2028" : "30. 9. 2027" }; save();
        wrap.innerHTML = `<div class="card form-card">${successHTML("Status je podaljšan", `Status velja do <b>${state.status.do}</b>. Potrdilo smo poslali na ${esc($("#stEmail").value)}.`,
          next === "napotnica" ? `<a class="btn btn-primary" href="napotnica.html${params.get("job") ? "?job=" + params.get("job") : ""}">Nadaljuj z napotnico</a>` : `<a class="btn btn-primary" href="prosta-dela.html">Poišči delo</a><a class="btn btn-outline" href="index.html">Na začetno stran</a>`)}</div>`;
        toast("Status je podaljšan.");
      }
    });
  };

  PAGES.referral = () => {
    const wrap = $("#napWrap"), jobId = Number(params.get("job")) || "";
    if (!state.status.veljaven) {
      wrap.innerHTML = `<div class="card form-card stack"><span class="tag tag-warn" style="align-self:flex-start">${statusText()}</span><h2>Najprej podaljšaj status</h2><p>Napotnico lahko izdamo le z veljavnim statusom dijaka ali študenta. Podaljšanje traja približno 2 minuti, potem te vrnemo sem in podatki o delu ostanejo izbrani.</p><div class="form-actions"><a class="btn btn-primary" href="podaljsaj-status.html?next=napotnica${jobId ? "&job=" + jobId : ""}">Podaljšaj status</a><a class="btn btn-outline" href="vclani-se.html">Še nisem član</a></div></div>`;
      return;
    }
    const sel = $("#npDelo");
    sel.innerHTML = `<option value="">Izberi delo …</option>` + SS.JOBS.map(j => `<option value="${j.id}">${esc(j.naziv)} – ${esc(j.podjetje)} (šifra ${j.id})</option>`).join("") + `<option value="drugo">Delo, ki ga ni na seznamu</option>`;
    sel.value = String(jobId || "");
    const other = $("#npOther");
    const syncOther = () => { other.hidden = sel.value !== "drugo"; $$("input", other).forEach(i => { i.required = sel.value === "drugo"; i.disabled = sel.value !== "drugo"; }); };
    sel.addEventListener("change", syncOther); syncOther();
    if (state.prijavljen) { $("#npIme").value = SS.DEMO_USER.ime; $("#npEmail").value = SS.DEMO_USER.email; }
    const form = $("#napForm");
    const jobLabel = () => sel.value === "drugo" ? `${$("#npPodjetje").value} – ${$("#npNaziv").value}` : (SS.JOBS.find(j => j.id === Number(sel.value)) || {}).podjetje;
    wizard(form, {
      onStep: i => { if (i === 2) $("#npSummary").innerHTML = `<dt>Ime</dt><dd>${esc($("#npIme").value)}</dd><dt>Delodajalec</dt><dd>${esc(jobLabel())}</dd><dt>Začetek</dt><dd>${esc($("#npZacetek").value || "po dogovoru")}</dd><dt>EMŠO</dt><dd>${esc($("#npEmso").value.slice(0, 4))}•••••••••</dd><dt>Prevzem</dt><dd>${esc($("input[name=prevzem]:checked").value)}</dd>`; },
      onFinish: () => {
        const st = "EN-2026-" + String(Math.floor(10000 + Math.random() * 89999));
        state.napotnice.unshift({ st, podjetje: jobLabel(), datum: today(), status: "V obdelavi" }); save();
        wrap.innerHTML = `<div class="card form-card">${successHTML("Napotnica je naročena", `Številka napotnice: <b>${st}</b>. Delodajalec jo prejme elektronsko, ti pa obvestilo po e-pošti, ko bo potrjena (običajno isti delovni dan).`, `<a class="btn btn-primary" href="moj-racun.html">Poglej v Mojem računu</a><a class="btn btn-outline" href="prosta-dela.html">Poišči še eno delo</a>`)}</div>`;
        toast("Napotnica je naročena.");
      }
    });
  };

  PAGES.calc = () => {
    let mode = "bruto";
    const p = SS.STOPNJE.prispevkiStudent;
    const run = () => {
      const urna = parseFloat($("#cUrna").value) || 0, ure = parseFloat($("#cUre").value) || 0;
      let bruto = urna * ure;
      if (mode === "neto") bruto = (urna * ure) / (1 - p);
      const pr = bruto * p, neto = bruto - pr;
      if (!$("#cNeto")) $("#cOut").innerHTML = `
        <div class="result-row"><span>Bruto zaslužek</span><b id="cBruto"></b></div>
        <div class="result-row"><span>Prispevki (${(p * 100).toLocaleString("sl-SI")} %)</span><b id="cPr"></b></div>
        <div class="stack-sm" style="gap:2px"><span>Neto izplačilo</span><span class="result-total" id="cNeto"></span></div>`;
      $("#cBruto").textContent = eur(bruto); $("#cPr").textContent = "−" + eur(pr);
      tweenEur($("#cNeto"), neto);
      $("#cUrnaLbl").textContent = mode === "neto" ? "Neto urna postavka (€)" : "Bruto urna postavka (€)";
    };
    $$(".seg button").forEach(b => b.addEventListener("click", () => { mode = b.dataset.mode; $$(".seg button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); run(); }));
    $$("#calcForm input").forEach(i => i.addEventListener("input", run));
    $("#calcForm").addEventListener("submit", e => e.preventDefault());
    const jid = Number(params.get("job")); const j = SS.JOBS.find(x => x.id === jid); if (j) $("#cUrna").value = j.urna;
    run();
  };

  PAGES.costCalc = () => {
    const d = SS.STOPNJE.dajatveDelodajalec;
    const run = () => {
      const urna = parseFloat($("#kUrna").value) || 0, ure = parseFloat($("#kUre").value) || 0, st = parseInt($("#kSt").value) || 1;
      const bruto = urna * ure * st, daj = bruto * d;
      if (!$("#kTot")) $("#kOut").innerHTML = `<div class="result-row"><span>Bruto za študente</span><b id="kBruto"></b></div><div class="result-row"><span>Dajatve in prispevki (${(d * 100).toLocaleString("sl-SI")} %)</span><b id="kDaj"></b></div><div class="stack-sm" style="gap:2px"><span>Skupni strošek podjetja</span><span class="result-total" id="kTot"></span></div><p class="small" style="color:#c8d6e8">Študent prejme neto <span id="kNeto"></span>.</p>`;
      $("#kBruto").textContent = eur(bruto); $("#kDaj").textContent = eur(daj);
      $("#kNeto").textContent = eur(bruto * (1 - SS.STOPNJE.prispevkiStudent));
      tweenEur($("#kTot"), bruto + daj);
    };
    $$("#costForm input").forEach(i => i.addEventListener("input", run));
    $("#costForm").addEventListener("submit", e => e.preventDefault());
    run();
  };

  PAGES.login = () => {
    if (state.prijavljen) { location.replace("moj-racun.html"); return; }
    $("#demoLogin").addEventListener("click", () => { $("#lgEmail").value = SS.DEMO_USER.email; $("#lgPass").value = "testno-geslo"; $("#lgEmail").focus(); });
    $("#loginForm").addEventListener("submit", e => {
      e.preventDefault(); if (!validate(e.target)) return;
      state.prijavljen = true; save(); location.href = params.get("next") || "moj-racun.html";
    });
  };

  PAGES.account = () => {
    if (!state.prijavljen) { location.replace("prijava.html?next=moj-racun.html"); return; }
    const u = SS.DEMO_USER;
    $("#accName").textContent = u.ime;
    $("#accMeta").textContent = `Članska številka ${u.clanska} · ${u.sola}`;
    const letos = u.zasluzki.reduce((s, x) => s + x[1], 0);
    $("#kpis").innerHTML = `
      <div class="kpi"><span class="small muted">Status</span><b style="font-size:1.05rem;color:${state.status.veljaven ? "var(--ok)" : "var(--warn)"}">${state.status.veljaven ? "Veljaven" : "Potekel"}</b><span class="small muted">${state.status.veljaven ? "do " : ""}${state.status.do}</span></div>
      <div class="kpi"><span class="small muted">Napotnice</span><b>${state.napotnice.length}</b><span class="small muted">naročene</span></div>
      <div class="kpi"><span class="small muted">Prijave na dela</span><b>${state.prijave.length}</b><span class="small muted">oddane</span></div>
      <div class="kpi"><span class="small muted">Neto zaslužek 2026</span><b>${eur(letos)}</b><span class="small muted">jun–nov</span></div>`;
    if (!state.status.veljaven) $("#accAlert").innerHTML = `<div class="status-banner"><span><b>${statusText()}.</b> Brez veljavnega statusa ne moreš naročiti napotnice.</span><a class="btn btn-primary btn-sm" href="podaljsaj-status.html">Podaljšaj status</a></div>`;
    const max = Math.max(...u.zasluzki.map(x => x[1]), 1);
    $("#bars").innerHTML = u.zasluzki.map((x, k) => `<div class="bar ${k === u.zasluzki.length - 1 ? "cur" : ""}" title="${x[0]}: ${eur(x[1])}"><span class="v">${Math.round(x[1])}</span><i style="height:${Math.max(2, (x[1] / max) * 110)}px;--i:${k}"></i>${x[0]}</div>`).join("");
    $("#napTable").innerHTML = state.napotnice.length
      ? state.napotnice.map(n => `<tr><td>${esc(n.st)}</td><td>${esc(n.podjetje)}</td><td>${esc(n.datum)}</td><td><span class="tag tag-warn">${esc(n.status)}</span></td></tr>`).join("")
      : `<tr><td colspan="4" class="muted">Še nimaš naročenih napotnic. <a href="napotnica.html">Naroči prvo napotnico</a>.</td></tr>`;
    const apps = state.prijave.map(id => SS.JOBS.find(j => j.id === id)).filter(Boolean);
    $("#appList").innerHTML = apps.length ? apps.map(jobCard).join("") : `<p class="muted">Še nisi oddal nobene prijave. <a href="prosta-dela.html">Poglej prosta dela</a>.</p>`;
    $("#logout").addEventListener("click", () => { state.prijavljen = false; save(); location.href = "index.html"; });
  };

  PAGES.jobPost = () => {
    const katSel = $("#ogKat"); katSel.innerHTML = `<option value="">Izberi …</option>` + SS.KATEGORIJE.map(k => `<option>${k}</option>`).join("");
    const regSel = $("#ogRegija"); regSel.innerHTML = SS.REGIJE.map(k => `<option>${k}</option>`).join("");
    const prev = () => {
      const j = { id: "nova", naziv: $("#ogNaziv").value || "Naziv dela", podjetje: $("#ogPodjetje").value || "Vaše podjetje", kraj: $("#ogKraj").value || "Kraj dela", cas: $("#ogCas").value || "Delovni čas", urna: parseFloat($("#ogUrna").value) || 0, kat: katSel.value || "Vrsta dela", dijaki: $("#ogDijaki").checked, objavljeno: "danes" };
      $("#ogPreview").innerHTML = jobCard(j).replace(/href="[^"]*"/, 'href="#" tabindex="-1" aria-hidden="true"').replace("Šifra nova", "Predogled");
    };
    $$("#postForm input, #postForm select, #postForm textarea").forEach(el => el.addEventListener("input", prev));
    prev();
    $("#postForm").addEventListener("submit", e => {
      e.preventDefault(); if (!validate(e.target)) return;
      $("#postWrap").innerHTML = `<div class="card form-card">${successHTML("Oglas je oddan", `Oglas »${esc($("#ogNaziv").value)}« bo po pregledu objavljen v 1 delovnem dnevu. Potrditev smo poslali na ${esc($("#ogEmail").value)}.`, `<a class="btn btn-primary" href="podjetja.html">Nazaj na stran za podjetja</a><a class="btn btn-outline" href="oddaja-oglasa.html">Oddaj nov oglas</a>`)}</div>`;
      window.scrollTo({ top: 0 });
    });
  };

  PAGES.partner = () => {
    $("#partnerForm").addEventListener("submit", e => {
      e.preventDefault(); if (!validate(e.target)) return;
      $("#partnerWrap").innerHTML = `<div class="card form-card">${successHTML("Vloga je oddana", `Pogodbo o sodelovanju in dostop do e-poslovalnice boste prejeli na ${esc($("#ptEmail").value)} v 2 delovnih dneh.`, `<a class="btn btn-primary" href="oddaja-oglasa.html">Oddaj prvi oglas</a>`)}</div>`;
      window.scrollTo({ top: 0 });
    });
  };

  PAGES.news = () => {
    const kats = ["Vse", ...new Set(SS.NEWS.map(n => n.kat))];
    let cur = "Vse";
    const chips = $("#newsChips");
    chips.innerHTML = kats.map(k => `<button type="button" class="chip" aria-pressed="${k === cur}" data-k="${k}">${k}</button>`).join("");
    const run = () => {
      $("#newsList").innerHTML = SS.NEWS.filter(n => cur === "Vse" || n.kat === cur).map(n => `<article class="news-card" id="n${n.id}"><time>${n.datum}</time><span class="tag" style="justify-self:start">${esc(n.kat)}</span><h3>${esc(n.naslov)}</h3><p class="muted">${esc(n.povzetek)}</p></article>`).join("");
      $$(".chip", chips).forEach(c => c.setAttribute("aria-pressed", String(c.dataset.k === cur)));
    };
    chips.addEventListener("click", e => { const c = e.target.closest(".chip"); if (c) { cur = c.dataset.k; run(); } });
    run();
  };

  PAGES.offices = () => {
    $("#offices").innerHTML = SS.OFFICES.map(o => `
      <article class="card office">
        <h3>${esc(o.mesto)}</h3>
        <p class="meta"><span>${I.pin}${esc(o.naslov)}</span></p>
        <dl class="hours">${o.urnik.map(u => `<dt>${u[0]}</dt><dd>${u[1]}</dd>`).join("")}</dl>
        <p class="small">Telefon: <b>${esc(o.tel)}</b></p>
        <a class="btn btn-outline btn-sm" style="justify-self:start" href="https://www.google.com/maps/search/${encodeURIComponent(o.naslov)}" target="_blank" rel="noopener">Pokaži na zemljevidu</a>
      </article>`).join("");
  };

  PAGES.contact = () => {
    $("#contactForm").addEventListener("submit", e => {
      e.preventDefault(); if (!validate(e.target)) return;
      e.target.outerHTML = successHTML("Sporočilo je poslano", "Odgovorili vam bomo v 1 delovnem dnevu.", `<a class="btn btn-outline" href="index.html">Na začetno stran</a>`);
    });
  };

  PAGES.docs = () => {
    $$("[data-download]").forEach(b => b.addEventListener("click", () => toast("V prototipu prenos dokumentov ni na voljo.")));
  };

  /* ---------- Zagon ---------- */
  mountChrome();
  const page = document.body.dataset.page;
  if (PAGES[page]) PAGES[page]();
  setupReveal();
})();
