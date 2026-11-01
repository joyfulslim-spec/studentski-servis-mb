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

  /* ---------- »Baza« v brskalniku ----------
     Prototip nima strežnika, zato so računi, oglasi, prijave in napotnice shranjeni v localStorage.
     Podatki veljajo na napravi in v brskalniku, kjer so bili vpisani. V pravi aplikaciji bi te
     funkcije klicale API (/api/prijava, /api/dela, /api/napotnica – glej dokumentacijo, pogl. 7.3). */
  const KEY = "ssmb-prototip-v2";

  // Zgoščevanje gesla (cyrb53). V pravi aplikaciji: bcrypt/argon2 na strežniku.
  function hash(str) {
    let h1 = 0xdeadbeef ^ 7, h2 = 0x41c6ce57 ^ 7;
    for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
  const salted = (email, pass) => hash(email.toLowerCase() + "|" + pass);

  function seed() {
    return {
      piskotki: null, session: null,
      users: SS.DEMO_ACCOUNTS.map(a => { const { geslo, ...u } = a; return { ...u, geslo: salted(a.email, geslo) }; }),
      jobs: [], applications: SS.DEMO_APPLICATIONS.map(a => ({ ...a })), referrals: [],
    };
  }
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && s.users) return s; } catch (e) {}
    return seed();
  }
  let state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* zasebni način – podatki veljajo do osvežitve */ } }
  save();
  SS.reset = () => { try { localStorage.removeItem(KEY); } catch (e) {} location.href = "index.html"; };

  const uid = p => p + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const me = () => state.users.find(u => u.id === state.session) || null;
  const isStudent = () => (me() || {}).tip === "student";
  const isCompany = () => (me() || {}).tip === "podjetje";
  const findUser = email => state.users.find(u => u.email.toLowerCase() === String(email).trim().toLowerCase());
  const allJobs = () => state.jobs.filter(j => j.aktiven !== false).concat(SS.JOBS);
  const jobById = id => state.jobs.concat(SS.JOBS).find(j => String(j.id) === String(id));
  const companyJobs = c => state.jobs.concat(SS.JOBS).filter(j => j.ownerId === c.id || j.podjetje === c.naziv);
  const myApplication = jobId => { const u = me(); return u && state.applications.find(a => a.jobId === jobId && a.studentId === u.id); };
  const fullName = u => u.tip === "podjetje" ? u.naziv : `${u.ime} ${u.priimek || ""}`.trim();
  const login = u => { state.session = u.id; save(); };
  const nextUrl = fallback => { const n = params.get("next"); return n && /^[a-z0-9-]+\.html(\?[\w=&%.-]*)?$/i.test(n) ? n : fallback; };
  const here_q = () => encodeURIComponent((location.pathname.split("/").pop() || "index.html") + location.search);

  /* Kartica »prijavi se«, ko stran zahteva račun */
  function needLogin(el, title, text, tip) {
    const next = here_q();
    el.innerHTML = `<div class="card form-card stack"><h2>${title}</h2><p class="muted">${text}</p><div class="form-actions">
      <a class="btn btn-primary" href="prijava.html?next=${next}">Prijava</a>
      <a class="btn btn-outline" href="${tip === "podjetje" ? "vpis-partnerja.html" : "vclani-se.html"}?next=${next}">${tip === "podjetje" ? "Vpis podjetja" : "Včlani se"}</a></div></div>`;
  }
  const statusBadge = s => s === "Sprejeta" ? "tag-ok" : s === "Zavrnjena" ? "tag-red" : "tag-warn";

  /* Število stvari, ki čakajo uporabnika (testiranje s personami, ugotovitev U4):
     podjetje – nove prijave; študent – sprejete prijave, za katere še ni napotnice */
  function notifCount(u = me()) {
    if (!u) return 0;
    if (u.tip === "podjetje") { const ids = companyJobs(u).map(j => j.id); return state.applications.filter(a => ids.includes(a.jobId) && a.status === "Oddana").length; }
    return state.applications.filter(a => a.studentId === u.id && a.status === "Sprejeta" && !state.referrals.some(r => r.studentId === u.id && r.jobId === a.jobId)).length;
  }
  const badgeHTML = n => n ? `<span class="badge" aria-label="${n} novih obvestil">${n}</span>` : "";

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
    const u = me();
    const acc = u
      ? `<a class="btn btn-outline account-btn" href="moj-racun.html${notifCount(u) ? "#prijave" : ""}" aria-label="Moj račun">${I.user}<span class="label">${esc(u.tip === "podjetje" ? u.naziv : u.ime)}</span>${badgeHTML(notifCount(u))}</a>`
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
    const items = [["index.html", "Domov", I.home], ["prosta-dela.html", "Dela", I.search],
      isCompany() ? ["oddaja-oglasa.html", "Nov oglas", I.doc] : ["napotnica.html", "Napotnica", I.doc],
      [me() ? "moj-racun.html" : "prijava.html", "Moj račun", I.user]];
    return `<nav class="bottom-bar" aria-label="Hitri meni">${items.map((x, k) => `<a href="${x[0]}" class="${x[0] === here ? "active" : ""}">${k === 3 ? `<span class="ico-wrap">${x[2]}${badgeHTML(notifCount())}</span>` : x[2]}${x[1]}</a>`).join("")}</nav>`;
  }

  function cookieHTML() {
    return `<div class="cookie" role="region" aria-label="Piškotki"><div class="container cookie-inner">
      <p>Uporabljamo nujne piškotke za delovanje strani. Analitične piškotke uporabimo le z vašim soglasjem.</p>
      <div class="row"><button class="btn btn-primary btn-sm" data-cookie="vse">Sprejmi vse</button><button class="btn btn-outline btn-sm" data-cookie="nujni">Samo nujni</button></div>
    </div></div>`;
  }

  /* Glava in pas za piškotke se vstavita takoj (skripta je na začetku <body>), preden se izriše vsebina,
     zato se nič ne premakne (Lighthouse CLS). Noga in ostalo pride ob DOMContentLoaded. */
  function mountChrome() {
    // Obvestilo o piškotkih je pas pod glavo (ni plavajoče), zato nikoli ne prekrije obrazca.
    document.body.insertAdjacentHTML("afterbegin", headerHTML() + (state.piskotki ? "" : cookieHTML()));

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
  }

  function mountBottom() {
    document.body.insertAdjacentHTML("beforeend", footerHTML() + bottomBarHTML());
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
      if (!b || reduceMotion || b.classList.contains("account-btn")) return;
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
    const app = typeof j.id === "number" ? myApplication(j.id) : null;
    const applied = !!app;
    return `<a class="job-card" href="delo.html?id=${j.id}">
      <div class="job-top">
        <div class="stack-sm" style="gap:4px;min-width:0"><span class="job-code">Šifra ${j.id} · ${esc(j.objavljeno)}</span><h3>${esc(j.naziv)}</h3></div>
        <div class="pay"><b>${eur(j.urna)}</b><small>na uro, bruto</small></div>
      </div>
      <div class="meta"><span>${I.building}${esc(j.podjetje)}</span><span>${I.pin}${esc(j.kraj)}</span><span>${I.clock}${esc(j.cas)}</span></div>
      <div class="tags"><span class="tag">${esc(j.kat)}</span>${j.dijaki ? '<span class="tag tag-ok">Tudi za dijake</span>' : ""}${applied ? `<span class="tag ${statusBadge(app.status)}">Prijava: ${esc(app.status.toLowerCase())}</span>` : ""}${j.ownerId ? '<span class="tag tag-red">Novo</span>' : ""}</div>
    </a>`;
  }
  const statusText = (u = me()) => !u || !u.status ? "" : u.status.veljaven ? `Status veljaven do ${u.status.do}` : `Status je potekel ${u.status.do}`;

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
      else if (v && el.dataset.minlen && v.length < Number(el.dataset.minlen)) msg = `Geslo mora imeti vsaj ${el.dataset.minlen} znakov.`;
      else if (el.dataset.match && el.value !== $(el.dataset.match).value) msg = "Gesli se ne ujemata.";
      else if (v && "uniqueEmail" in el.dataset && findUser(v)) msg = "Račun s tem e-naslovom že obstaja. Prijavi se ali uporabi drug naslov.";
      el.setAttribute("aria-invalid", msg ? "true" : "false");
      if (msg) {
        const p = document.createElement("p"); p.className = "error"; p.dataset.auto = ""; p.textContent = msg;
        (el.closest(".field") || el.closest(".check") || el.parentElement).appendChild(p);
        firstBad = firstBad || el;
      }
    });
    const fileReq = $$("[data-file-required]", scope).find(z => !z.closest("[hidden]") && !z.dataset.name);
    if (fileReq) { toast(fileReq.dataset.fileMsg || "Najprej naloži datoteko."); firstBad = firstBad || fileReq; }
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

  /* Po prijavi ali odjavi osveži gumb za račun in spodnjo vrstico brez ponovnega nalaganja strani */
  function refreshChrome() {
    const a = $(".account-btn"), u = me();
    if (a) {
      a.href = u ? "moj-racun.html" : "prijava.html"; $(".label", a).textContent = u ? (u.tip === "podjetje" ? u.naziv : u.ime) : "Prijava";
      const old = $(".badge", a); if (old) old.remove(); a.insertAdjacentHTML("beforeend", badgeHTML(notifCount(u)));
    }
    const bb = $(".bottom-bar"); if (bb) bb.outerHTML = bottomBarHTML();
  }

  function successHTML(title, text, actions) {
    return `<div class="success"><div class="tick">${I.tick}</div><h2>${title}</h2><p class="lead">${text}</p><div class="form-actions" style="width:100%;max-width:520px">${actions}</div></div>`;
  }

  /* ============ STRANI ============ */
  const PAGES = {};

  PAGES.home = () => {
    $("#latestJobs").innerHTML = allJobs().slice(0, 4).map(jobCard).join("");
    $("#homeNews").innerHTML = SS.NEWS.slice(0, 3).map(n => `<a class="news-card" href="novice.html#n${n.id}"><time>${n.datum}</time><span class="tag" style="justify-self:start">${esc(n.kat)}</span><h3>${esc(n.naslov)}</h3><p class="muted small">${esc(n.povzetek)}</p></a>`).join("");
    $("#jobCount").textContent = allJobs().length;
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
    const u = me(), sb = $("#statusBanner");
    if (u && u.tip === "student") {
      sb.hidden = false; sb.classList.toggle("ok", u.status.veljaven);
      sb.innerHTML = `<div class="stack-sm" style="gap:2px"><b>Živjo, ${esc(u.ime)}!</b><span class="small">${statusText(u)}${u.status.veljaven ? "" : " – brez veljavnega statusa ne moreš naročiti napotnice."}</span></div>
        ${u.status.veljaven ? `<a class="btn btn-outline btn-sm" href="moj-racun.html">Moj račun</a>` : `<a class="btn btn-primary btn-sm" href="podaljsaj-status.html">Podaljšaj status</a>`}`;
    } else if (u) {
      const ids = companyJobs(u).map(j => j.id), nove = state.applications.filter(a => ids.includes(a.jobId) && a.status === "Oddana").length;
      sb.hidden = false; sb.classList.add("ok");
      sb.innerHTML = `<div class="stack-sm" style="gap:2px"><b>Pozdravljeni, ${esc(u.naziv)}!</b><span class="small">${nove ? `Imate ${nove} ${nove === 1 ? "novo prijavo" : nove === 2 ? "novi prijavi" : "nove prijave"} na vaše oglase.` : "Ni novih prijav."}</span></div>
        <div class="row"><a class="btn btn-primary btn-sm" href="moj-racun.html#prijave">Poglej prijave</a><a class="btn btn-outline btn-sm" href="oddaja-oglasa.html">Nov oglas</a></div>`;
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
    // »Za dijake« je prvi gumb, ker ga dijaki na telefonu niso našli v skritih filtrih (testiranje s personami, ugotovitev U1)
    chips.innerHTML = `<button type="button" class="chip" data-dijaki aria-pressed="${f.dijaki}">Za dijake</button>` +
      topKats.map(k => `<button type="button" class="chip" data-kat="${k}" aria-pressed="${f.kat === k}">${k.split(",")[0]}</button>`).join("");
    chips.addEventListener("click", e => {
      const c = e.target.closest(".chip"); if (!c) return;
      if ("dijaki" in c.dataset) { f.dijaki = !f.dijaki; $("#fDijaki").checked = f.dijaki; }
      else { f.kat = f.kat === c.dataset.kat ? "" : c.dataset.kat; katSel.value = f.kat; }
      run();
    });

    function run() {
      const q = f.q.trim().toLowerCase();
      let list = allJobs().filter(j =>
        (!q || `${j.naziv} ${j.podjetje} ${j.kat} ${j.kraj} ${j.id}`.toLowerCase().includes(q)) &&
        (!f.regija || j.regija === f.regija) && (!f.kat || j.kat === f.kat) &&
        (!f.min || j.urna >= Number(f.min)) && (!f.dijaki || j.dijaki));
      if (f.sort === "urna") list = list.slice().sort((a, b) => b.urna - a.urna);
      $("#count").textContent = list.length;
      const jl = $("#jobList");
      jl.classList.remove("anim-in"); void jl.offsetWidth; jl.classList.add("anim-in");
      jl.innerHTML = list.length ? list.map((j, k) => jobCard(j).replace('class="job-card"', `class="job-card" style="--i:${Math.min(k, 8)}"`)).join("")
        : `<div class="card empty stack" style="align-items:center"><h3>Ni del, ki ustrezajo izbiri.</h3><p class="muted">Odstrani kakšen filter ali poišči z drugo besedo.</p><button class="btn btn-outline" id="clearAll" type="button">Počisti vse filtre</button></div>`;
      $$(".chip", chips).forEach(c => c.setAttribute("aria-pressed", String("dijaki" in c.dataset ? f.dijaki : c.dataset.kat === f.kat)));
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
    const j = jobById(params.get("id")) || SS.JOBS[0];
    document.title = `${j.naziv} – Prosta dela – Študentski servis Maribor`;
    $("#jTitle").textContent = j.naziv; $("#jCrumb").textContent = j.naziv;
    $("#jSub").textContent = `${j.podjetje} · ${j.kraj}`;
    $("#jPhoto").src = "img/" + (j.img || "podjetja.jpg");
    const list = (t, arr) => arr && arr.length ? `<h3>${t}</h3><ul>${arr.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
    $("#jBody").innerHTML = `
      <div class="tags"><span class="tag">${esc(j.kat)}</span>${j.dijaki ? '<span class="tag tag-ok">Tudi za dijake</span>' : '<span class="tag tag-warn">Samo za študente</span>'}<span class="tag">Šifra ${j.id}</span>${j.aktiven === false ? '<span class="tag tag-red">Oglas je zaključen</span>' : ""}</div>
      <p style="white-space:pre-line">${esc(j.opis)}</p>
      ${list("Kaj boš delal", j.naloge)}${list("Kaj pričakujemo", j.pogoji)}`;
    $("#jFacts").innerHTML = `<dt>Plačilo</dt><dd>${eur(j.urna)} /h bruto<br><span class="muted small">≈ ${eur(j.urna * (1 - SS.STOPNJE.prispevkiStudent))} /h neto</span></dd>
      <dt>Kraj</dt><dd>${esc(j.kraj)}</dd><dt>Delovni čas</dt><dd>${esc(j.cas)}</dd><dt>Trajanje</dt><dd>${esc(j.trajanje || "Po dogovoru")}</dd><dt>Začetek</dt><dd>${esc(j.od || "takoj")}</dd><dt>Objavljeno</dt><dd>${esc(j.objavljeno)}</dd>`;
    const others = allJobs().filter(x => x.id !== j.id);
    $("#similar").innerHTML = others.filter(x => x.kat === j.kat).concat(others.filter(x => x.regija === j.regija && x.kat !== j.kat)).slice(0, 2).map(jobCard).join("");

    const box = $("#applyBox"), u = me();
    const showApp = a => {
      const next = a.status === "Sprejeta"
        ? `<p class="small"><b>Delodajalec te je izbral.</b> Zdaj naroči e-napotnico – brez nje dela ne smeš začeti.</p><a class="btn btn-primary btn-block" href="napotnica.html?job=${j.id}">Naroči e-napotnico</a>`
        : a.status === "Zavrnjena" ? `<p class="small">Delodajalec je izbral drugega kandidata. Poglej podobna dela spodaj.</p>`
        : `<p class="small">Delodajalec je prejel tvojo prijavo. Ko te izbere, boš to videl tukaj in v Mojem računu.</p>`;
      box.innerHTML = `<div class="stack"><span class="tag ${statusBadge(a.status)}" style="align-self:flex-start">Prijava: ${esc(a.status.toLowerCase())}</span><h3>Oddano ${esc(a.datum)}</h3>${next}<a class="btn btn-outline btn-block" href="moj-racun.html#prijave">Moje prijave</a></div>`;
    };
    if (j.aktiven === false) { box.innerHTML = `<p class="muted">Oglas je zaključen in ne sprejema novih prijav.</p>`; return; }
    if (u && u.tip === "podjetje") {
      const owner = j.ownerId === u.id || j.podjetje === u.naziv, n = state.applications.filter(a => a.jobId === j.id).length;
      box.innerHTML = owner
        ? `<div class="stack"><span class="tag" style="align-self:flex-start">Vaš oglas</span><h3>${n} ${n === 1 ? "prijava" : n === 2 ? "prijavi" : n < 5 ? "prijave" : "prijav"}</h3><a class="btn btn-primary btn-block" href="moj-racun.html#prijave">Poglej kandidate</a></div>`
        : `<p class="muted">Prijavljeni ste kot podjetje. Na dela se lahko prijavijo samo študenti in dijaki.</p>`;
      return;
    }
    if (!u) { needLogin(box, "Prijavi se na delo", "Za prijavo potrebuješ račun. Tako boš v Mojem računu videl, ali te je delodajalec izbral.", "student"); return; }
    const existing = myApplication(j.id);
    if (existing) { showApp(existing); return; }
    $("#apIme").value = fullName(u); $("#apEmail").value = u.email; $("#apTel").value = u.tel || "";
    $("#applyForm").addEventListener("submit", e => {
      e.preventDefault();
      if (!validate(e.target)) return;
      const a = { id: uid("a"), jobId: j.id, studentId: u.id, ime: $("#apIme").value.trim(), tel: $("#apTel").value.trim(), email: $("#apEmail").value.trim(), sporocilo: $("#apMsg").value.trim(), datum: today(), status: "Oddana" };
      state.applications.unshift(a); save(); showApp(a); toast("Prijava je oddana.");
    });
  };

  PAGES.join = () => {
    if (me()) { $("#joinWrap").innerHTML = `<div class="card form-card stack"><h2>Že si prijavljen</h2><p class="muted">Prijavljen si kot ${esc(fullName(me()))}. Za nov račun se najprej odjavi.</p><div class="form-actions"><a class="btn btn-primary" href="moj-racun.html">Moj račun</a></div></div>`; return; }
    const form = $("#joinForm"); const file = dropzone($("#jnPotrdilo"));
    // Mladoletni potrebujejo soglasje staršev (testiranje s personami, ugotovitev U2)
    const consent = dropzone($("#jnSoglasje")), minor = $("#jnMlad"), minorBox = $("#jnMladBox");
    minor.addEventListener("change", () => { minorBox.hidden = !minor.checked; });
    wizard(form, {
      onStep: i => { if (i === 2) $("#joinSummary").innerHTML = `<dt>Ime</dt><dd>${esc($("#jnIme").value)} ${esc($("#jnPriimek").value)}</dd><dt>E-pošta</dt><dd>${esc($("#jnEmail").value)}</dd><dt>Šola</dt><dd>${esc($("#jnSola").value)}</dd><dt>Potrdilo</dt><dd>${esc(file())}</dd>${minor.checked ? `<dt>Soglasje staršev</dt><dd>${esc(consent())}</dd>` : ""}<dt>TRR</dt><dd>${esc($("#jnTrr").value)}</dd>`; },
      onFinish: () => {
        const email = $("#jnEmail").value.trim();
        const u = { id: uid("u"), tip: "student", email, geslo: salted(email, $("#jnGeslo").value),
          ime: $("#jnIme").value.trim(), priimek: $("#jnPriimek").value.trim(), tel: $("#jnTel").value.replace(/\s/g, ""),
          naslov: $("#jnNaslov").value.trim(), sola: $("#jnSola").value.trim(), trr: $("#jnTrr").value.replace(/\s/g, ""),
          clanska: "SS-" + (100000 + Math.floor(Math.random() * 899999)).toString().replace(/(\d{3})(\d{3})/, "$1 $2"),
          mladoleten: minor.checked, status: { veljaven: true, do: "30. 9. 2027" }, zasluzki: [] };
        state.users.push(u); login(u);
        const next = nextUrl("");
        $("#joinWrap").innerHTML = successHTML(`Dobrodošel med člani, ${esc(u.ime)}!`, `Tvoja članska številka je <b>${u.clanska}</b>. Status velja do 30. 9. 2027. Prijavljen si in se lahko prijaviš na dela.`,
          next ? `<a class="btn btn-primary" href="${esc(next)}">Nadaljuj</a><a class="btn btn-outline" href="moj-racun.html">Moj račun</a>` : `<a class="btn btn-primary" href="prosta-dela.html">Poišči delo</a><a class="btn btn-outline" href="moj-racun.html">Moj račun</a>`);
        refreshChrome();
      }
    });
  };

  PAGES.status = () => {
    const wrap = $("#statusWrap");
    const next = params.get("next");
    const u = me();
    if (!u) { needLogin(wrap, "Prijavi se za podaljšanje statusa", "Status je vezan na tvoj račun. Prijavi se, pa ga podaljšaš v treh korakih.", "student"); return; }
    if (u.tip !== "student") { wrap.innerHTML = `<div class="card form-card"><p class="muted">Prijavljeni ste kot podjetje. Status podaljšujejo študenti in dijaki.</p></div>`; return; }
    if (u.status.veljaven) {
      wrap.innerHTML = `<div class="card form-card stack"><span class="tag tag-ok" style="align-self:flex-start">Veljaven do ${u.status.do}</span><h2>Tvoj status je veljaven</h2><p class="muted">Ni ti treba storiti ničesar. Status boš podaljšal ob začetku naslednjega šolskega leta – opomnili te bomo po e-pošti.</p><div class="form-actions">${next === "napotnica" ? `<a class="btn btn-primary" href="napotnica.html${params.get("job") ? "?job=" + encodeURIComponent(params.get("job")) : ""}">Nadaljuj z napotnico</a>` : `<a class="btn btn-primary" href="prosta-dela.html">Poišči delo</a>`}<a class="btn btn-outline" href="moj-racun.html">Moj račun</a></div></div>`;
      return;
    }
    $("#stIme").value = fullName(u); $("#stEmail").value = u.email; $("#stClan").value = u.clanska || "";
    const form = $("#statusForm"); const file = dropzone($(".dropzone", form));
    wizard(form, {
      onStep: i => { if (i === 2) $("#stSummary").innerHTML = `<dt>Ime</dt><dd>${esc($("#stIme").value)}</dd><dt>Članska št.</dt><dd>${esc($("#stClan").value)}</dd><dt>Šola</dt><dd>${esc($("#stSola").value)}</dd><dt>Šolsko leto</dt><dd>${esc($("#stLeto").value)}</dd><dt>Potrdilo</dt><dd>${esc(file())}</dd>`; },
      onFinish: () => {
        const leto = $("#stLeto").value;
        u.status = { veljaven: true, do: leto === "2027/28" ? "30. 9. 2028" : "30. 9. 2027" };
        u.sola = $("#stSola").value; save();
        wrap.innerHTML = `<div class="card form-card">${successHTML("Status je podaljšan", `Status velja do <b>${u.status.do}</b>. Potrdilo smo poslali na ${esc($("#stEmail").value)}.`,
          next === "napotnica" ? `<a class="btn btn-primary" href="napotnica.html${params.get("job") ? "?job=" + encodeURIComponent(params.get("job")) : ""}">Nadaljuj z napotnico</a>` : `<a class="btn btn-primary" href="prosta-dela.html">Poišči delo</a><a class="btn btn-outline" href="index.html">Na začetno stran</a>`)}</div>`;
        toast("Status je podaljšan.");
      }
    });
  };

  PAGES.referral = () => {
    const wrap = $("#napWrap"), jobId = Number(params.get("job")) || "";
    const u = me();
    if (!u) { needLogin(wrap, "Prijavi se za naročilo napotnice", "Napotnica je vezana na tvoj račun in veljaven status. Prijavi se ali se včlani.", "student"); return; }
    if (u.tip !== "student") { wrap.innerHTML = `<div class="card form-card stack"><p class="muted">Prijavljeni ste kot podjetje. Napotnice naročajo študenti; naročene napotnice za vaše oglase vidite v <a href="moj-racun.html">Mojem računu</a>.</p></div>`; return; }
    if (!u.status.veljaven) {
      wrap.innerHTML = `<div class="card form-card stack"><span class="tag tag-warn" style="align-self:flex-start">${statusText(u)}</span><h2>Najprej podaljšaj status</h2><p>Napotnico lahko izdamo le z veljavnim statusom dijaka ali študenta. Podaljšanje traja približno 2 minuti, potem te vrnemo sem in podatki o delu ostanejo izbrani.</p><div class="form-actions"><a class="btn btn-primary" href="podaljsaj-status.html?next=napotnica${jobId ? "&job=" + jobId : ""}">Podaljšaj status</a></div></div>`;
      return;
    }
    const sel = $("#npDelo");
    sel.innerHTML = `<option value="">Izberi delo …</option>` + allJobs().map(j => `<option value="${j.id}">${esc(j.naziv)} – ${esc(j.podjetje)} (šifra ${j.id})</option>`).join("") + `<option value="drugo">Delo, ki ga ni na seznamu</option>`;
    sel.value = String(jobId || "");
    const other = $("#npOther");
    const syncOther = () => { other.hidden = sel.value !== "drugo"; $$("input", other).forEach(i => { i.required = sel.value === "drugo"; i.disabled = sel.value !== "drugo"; }); };
    sel.addEventListener("change", syncOther); syncOther();
    $("#npIme").value = fullName(u); $("#npEmail").value = u.email;
    const form = $("#napForm");
    const jobLabel = () => sel.value === "drugo" ? `${$("#npPodjetje").value} – ${$("#npNaziv").value}` : (jobById(sel.value) || {}).podjetje;
    wizard(form, {
      onStep: i => { if (i === 2) $("#npSummary").innerHTML = `<dt>Ime</dt><dd>${esc($("#npIme").value)}</dd><dt>Delodajalec</dt><dd>${esc(jobLabel())}</dd><dt>Začetek</dt><dd>${esc($("#npZacetek").value || "po dogovoru")}</dd><dt>EMŠO</dt><dd>${esc($("#npEmso").value.slice(0, 4))}•••••••••</dd><dt>Prevzem</dt><dd>${esc($("input[name=prevzem]:checked").value)}</dd>`; },
      onFinish: () => {
        const st = "EN-2026-" + String(Math.floor(10000 + Math.random() * 89999));
        // EMŠO se ne shrani – v bazo gre le, kar je potrebno za prikaz napotnice (GDPR, minimizacija podatkov)
        state.referrals.unshift({ st, studentId: u.id, ime: $("#npIme").value.trim(), jobId: sel.value === "drugo" ? null : Number(sel.value), podjetje: jobLabel(), datum: today(), zacetek: $("#npZacetek").value, status: "V obdelavi" }); save();
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
    const j = params.get("job") && jobById(params.get("job")); if (j) $("#cUrna").value = j.urna;
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
    if (me()) { location.replace(nextUrl("moj-racun.html")); return; }
    const fill = acc => { $("#lgEmail").value = acc.email; $("#lgPass").value = acc.geslo; $("#lgErr").hidden = true; $("#lgEmail").focus(); };
    $("#demoStudent").addEventListener("click", () => fill(SS.DEMO_ACCOUNTS[0]));
    $("#demoCompany").addEventListener("click", () => fill(SS.DEMO_ACCOUNTS[1]));
    const n = params.get("next"); if (n) $$("[data-keep-next]").forEach(a => a.href += "?next=" + encodeURIComponent(n));
    $("#loginForm").addEventListener("submit", e => {
      e.preventDefault(); if (!validate(e.target)) return;
      const u = findUser($("#lgEmail").value);
      if (!u || u.geslo !== salted(u.email, $("#lgPass").value)) { $("#lgErr").hidden = false; $("#lgPass").value = ""; $("#lgPass").focus(); return; }
      login(u); location.href = nextUrl("moj-racun.html");
    });
  };

  PAGES.account = () => {
    const u = me();
    if (!u) { location.replace("prijava.html?next=moj-racun.html"); return; }
    $("#logout").onclick = () => { state.session = null; save(); location.href = "index.html"; };
    const root = $("#accRoot");
    // Moji podatki: urejanje profila in menjava gesla
    const fld = (id, label, val, extra = "") => `<div class="field"><label for="${id}">${label}</label><input type="text" id="${id}" value="${esc(val || "")}" ${extra}></div>`;
    const profileCard = () => `<form class="card stack" id="podatki" novalidate>
        <h2 style="font-size:1.3rem">Moji podatki</h2>
        <div class="form-grid two">
          ${u.tip === "student"
            ? fld("pfIme", "Ime", u.ime, "required autocomplete=\"given-name\"") + fld("pfPriimek", "Priimek", u.priimek, "required autocomplete=\"family-name\"") + fld("pfTel", "Telefon", u.tel, "required inputmode=\"tel\" data-pattern=\"^\\+?[0-9]{8,12}$\" data-msg=\"Vpiši telefonsko številko, npr. 041123456.\"") + fld("pfSola", "Šola ali fakulteta", u.sola, "required")
            : fld("pfOseba", "Kontaktna oseba", u.oseba, "required") + fld("pfTel", "Telefon", u.tel, "required inputmode=\"tel\" data-pattern=\"^\\+?[0-9]{8,12}$\" data-msg=\"Vpiši telefonsko številko, npr. 022345678.\"") + `<div class="span-2">${fld("pfNaslov", "Naslov sedeža", u.naslov, "required")}</div>`}
          <div class="field span-2"><span class="label">E-pošta</span><span>${esc(u.email)} <span class="small muted">(za spremembo nas kontaktirajte)</span></span></div>
        </div>
        <details class="accordion"><summary>Spremeni geslo</summary><div class="acc-body form-grid two">
          <div class="field"><label for="pfOld">Trenutno geslo</label><input type="password" id="pfOld" autocomplete="current-password"></div>
          <div class="field"><label for="pfNew">Novo geslo</label><input type="password" id="pfNew" autocomplete="new-password" data-minlen="8"></div>
        </div></details>
        <div class="form-actions" style="margin-top:0"><button class="btn btn-primary" type="submit">Shrani podatke</button></div>
      </form>`;
    root.onsubmit = e => {
      if (e.target.id !== "podatki") return;
      e.preventDefault(); if (!validate(e.target)) return;
      const nw = $("#pfNew").value;
      if (nw && u.geslo !== salted(u.email, $("#pfOld").value)) { toast("Trenutno geslo ni pravilno."); $("#pfOld").focus(); return; }
      if (u.tip === "student") { u.ime = $("#pfIme").value.trim(); u.priimek = $("#pfPriimek").value.trim(); u.sola = $("#pfSola").value.trim(); }
      else { u.oseba = $("#pfOseba").value.trim(); u.naslov = $("#pfNaslov").value.trim(); }
      u.tel = $("#pfTel").value.replace(/\s/g, "");
      if (nw) u.geslo = salted(u.email, nw);
      save(); toast(nw ? "Podatki in geslo so shranjeni." : "Podatki so shranjeni."); PAGES.account(); refreshChrome();
    };
    const kpi = (label, val, sub, color) => `<div class="kpi"><span class="small muted">${label}</span><b${color ? ` style="font-size:1.05rem;color:${color}"` : ""}>${val}</b><span class="small muted">${sub}</span></div>`;
    const nav = items => `<nav class="dash-nav" aria-label="Moj račun">${items.map(x => `<a href="#${x[0]}">${x[1]}</a>`).join("")}</nav>`;

    if (u.tip === "student") {
      $("#accName").textContent = fullName(u);
      $("#accMeta").textContent = `Članska številka ${u.clanska} · ${u.sola || "šola ni vpisana"}`;
      const apps = state.applications.filter(a => a.studentId === u.id);
      const refs = state.referrals.filter(r => r.studentId === u.id);
      const z = u.zasluzki || [], letos = z.reduce((s, x) => s + x[1], 0), max = Math.max(...z.map(x => x[1]), 1);
      root.innerHTML = `<div class="dash">${nav([["pregled", "Pregled"], ["prijave", "Prijave na dela"], ["napotnice", "Napotnice"], ["zasluzek", "Zaslužek"], ["podatki", "Moji podatki"]])}
        <div class="stack">
          ${u.status.veljaven ? "" : `<div class="status-banner"><span><b>${statusText(u)}.</b> Brez veljavnega statusa ne moreš naročiti napotnice.</span><a class="btn btn-primary btn-sm" href="podaljsaj-status.html">Podaljšaj status</a></div>`}
          ${apps.some(a => a.status === "Sprejeta") && !refs.length ? `<div class="status-banner ok"><span><b>Delodajalec te je izbral!</b> Naroči napotnico, preden začneš z delom.</span><a class="btn btn-primary btn-sm" href="napotnica.html?job=${apps.find(a => a.status === "Sprejeta").jobId}">Naroči napotnico</a></div>` : ""}
          <div id="pregled"><div class="kpis">
            ${kpi("Status", u.status.veljaven ? "Veljaven" : "Potekel", (u.status.veljaven ? "do " : "") + u.status.do, u.status.veljaven ? "var(--ok)" : "var(--warn)")}
            ${kpi("Prijave na dela", apps.length, `${apps.filter(a => a.status === "Sprejeta").length} sprejetih`)}
            ${kpi("Napotnice", refs.length, "naročene")}
            ${kpi("Neto zaslužek 2026", eur(letos), z.length ? "jun–nov" : "še ni izplačil")}
          </div></div>
          <div class="card stack" id="prijave">
            <div class="row between"><h2 style="font-size:1.3rem">Moje prijave na dela</h2><a class="btn btn-outline btn-sm" href="prosta-dela.html">Poišči delo</a></div>
            ${apps.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Delo</th><th>Podjetje</th><th>Oddano</th><th>Stanje</th><th></th></tr></thead><tbody>
              ${apps.map(a => { const j = jobById(a.jobId) || {}; return `<tr><td><a href="delo.html?id=${a.jobId}">${esc(j.naziv || "Delo " + a.jobId)}</a></td><td>${esc(j.podjetje || "")}</td><td>${esc(a.datum)}</td><td><span class="tag ${statusBadge(a.status)}">${esc(a.status)}</span></td>
                <td>${a.status === "Sprejeta" ? `<a class="btn btn-primary btn-sm" href="napotnica.html?job=${a.jobId}">Napotnica</a>` : a.status === "Oddana" ? `<button class="link-btn small" data-withdraw="${a.id}">Umakni</button>` : ""}</td></tr>`; }).join("")}
              </tbody></table></div>` : `<p class="muted">Še nisi oddal nobene prijave. <a href="prosta-dela.html">Poglej prosta dela</a>.</p>`}
          </div>
          <div class="card stack" id="napotnice">
            <div class="row between"><h2 style="font-size:1.3rem">Moje napotnice</h2><a class="btn btn-primary btn-sm" href="napotnica.html">Nova napotnica</a></div>
            <div class="table-wrap"><table class="tbl"><thead><tr><th>Številka</th><th>Delodajalec</th><th>Datum</th><th>Stanje</th></tr></thead><tbody>
              ${refs.length ? refs.map(n => `<tr><td>${esc(n.st)}</td><td>${esc(n.podjetje)}</td><td>${esc(n.datum)}</td><td><span class="tag ${n.status === "Potrjena" ? "tag-ok" : "tag-warn"}">${esc(n.status)}</span></td></tr>`).join("")
                : `<tr><td colspan="4" class="muted">Še nimaš naročenih napotnic.</td></tr>`}
            </tbody></table></div>
          </div>
          <div class="card stack" id="zasluzek">
            <div class="row between"><h2 style="font-size:1.3rem">Neto zaslužek po mesecih</h2><span class="small muted">v evrih</span></div>
            ${z.length ? `<div class="bars">${z.map((x, k) => `<div class="bar ${k === z.length - 1 ? "cur" : ""}" title="${x[0]}: ${eur(x[1])}"><span class="v">${Math.round(x[1])}</span><i style="height:${Math.max(2, (x[1] / max) * 110)}px;--i:${k}"></i>${x[0]}</div>`).join("")}</div>`
              : `<p class="muted">Ko boš opravil prvo delo, boš tukaj videl zaslužek po mesecih.</p>`}
          </div>
          ${profileCard()}
        </div></div>`;
      root.onclick = e => {
        const b = e.target.closest("[data-withdraw]"); if (!b) return;
        state.applications = state.applications.filter(a => a.id !== b.dataset.withdraw); save();
        toast("Prijava je umaknjena."); PAGES.account();
      };
      return;
    }

    // Podjetje
    $("#accName").textContent = u.naziv;
    $("#accMeta").textContent = `Poslovni partner · ${u.oseba || ""} · ${u.email}`;
    const jobs = companyJobs(u), ids = jobs.map(j => j.id);
    const apps = state.applications.filter(a => ids.includes(a.jobId));
    const refs = state.referrals.filter(r => ids.includes(r.jobId));
    const nove = apps.filter(a => a.status === "Oddana").length;
    root.innerHTML = `<div class="dash">${nav([["pregled", "Pregled"], ["prijave", "Prijave kandidatov"], ["oglasi", "Moji oglasi"], ["napotnice", "Napotnice"], ["podatki", "Podatki podjetja"]])}
      <div class="stack">
        <div id="pregled"><div class="kpis">
          ${kpi("Aktivni oglasi", jobs.filter(j => j.aktiven !== false).length, "objavljeni")}
          ${kpi("Nove prijave", nove, "čakajo na odgovor")}
          ${kpi("Sprejeti kandidati", apps.filter(a => a.status === "Sprejeta").length, "skupaj")}
          ${kpi("Napotnice", refs.length, "za vaše oglase")}
        </div></div>
        <div class="card stack" id="prijave">
          <h2 style="font-size:1.3rem">Prijave kandidatov</h2>
          ${apps.length ? apps.map(a => { const j = jobById(a.jobId) || {}; return `<div class="file-row" style="align-items:flex-start;flex-wrap:wrap">
              <span class="stack-sm" style="gap:2px;flex:1 1 260px"><b>${esc(a.ime)}</b><span class="small muted">za »${esc(j.naziv || "")}« · ${esc(a.datum)}</span>
                ${a.sporocilo ? `<span class="small">»${esc(a.sporocilo)}«</span>` : ""}
                ${a.status === "Sprejeta" ? `<span class="small">Kontakt: <b>${esc(a.tel)}</b> · <b>${esc(a.email)}</b></span>` : ""}</span>
              ${a.status === "Oddana" ? `<span class="row" style="gap:8px"><button class="btn btn-primary btn-sm" data-decide="Sprejeta" data-id="${a.id}">Sprejmi</button><button class="btn btn-outline btn-sm" data-decide="Zavrnjena" data-id="${a.id}">Zavrni</button></span>`
                : `<span class="tag ${statusBadge(a.status)}">${esc(a.status)}</span>`}
            </div>`; }).join("") : `<p class="muted">Na vaše oglase še ni prijav.</p>`}
        </div>
        <div class="card stack" id="oglasi">
          <div class="row between"><h2 style="font-size:1.3rem">Moji oglasi</h2><a class="btn btn-red btn-sm" href="oddaja-oglasa.html">Nov oglas</a></div>
          ${jobs.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Oglas</th><th>Objavljeno</th><th class="num">Prijave</th><th>Stanje</th><th></th></tr></thead><tbody>
            ${jobs.map(j => `<tr><td><a href="delo.html?id=${j.id}">${esc(j.naziv)}</a><br><span class="small muted">Šifra ${j.id} · ${eur(j.urna)}/h</span></td><td>${esc(j.objavljeno)}</td><td class="num">${apps.filter(a => a.jobId === j.id).length}</td>
              <td><span class="tag ${j.aktiven === false ? "tag-red" : "tag-ok"}">${j.aktiven === false ? "Zaključen" : "Aktiven"}</span></td>
              <td>${j.ownerId === u.id ? `<span class="row" style="gap:10px"><a class="small" href="oddaja-oglasa.html?uredi=${j.id}">Uredi</a><button class="link-btn small" data-toggle-job="${j.id}">${j.aktiven === false ? "Ponovno objavi" : "Zaključi"}</button></span>` : ""}</td></tr>`).join("")}
          </tbody></table></div>` : `<p class="muted">Še nimate oglasov. <a href="oddaja-oglasa.html">Oddajte prvi oglas</a>.</p>`}
        </div>
        <div class="card stack" id="napotnice">
          <h2 style="font-size:1.3rem">Napotnice za vaše oglase</h2>
          <div class="table-wrap"><table class="tbl"><thead><tr><th>Številka</th><th>Študent</th><th>Delo</th><th>Stanje</th></tr></thead><tbody>
            ${refs.length ? refs.map(n => `<tr><td>${esc(n.st)}</td><td>${esc(n.ime || "")}</td><td>${esc((jobById(n.jobId) || {}).naziv || "")}</td><td>${n.status === "V obdelavi" ? `<button class="btn btn-primary btn-sm" data-confirm-ref="${esc(n.st)}">Potrdi</button>` : `<span class="tag tag-ok">${esc(n.status)}</span>`}</td></tr>`).join("")
              : `<tr><td colspan="4" class="muted">Ko izbrani študent naroči napotnico, jo boste videli tukaj.</td></tr>`}
          </tbody></table></div>
        </div>
        ${profileCard()}
      </div></div>`;
    root.onclick = e => {
      const d = e.target.closest("[data-decide]"), t = e.target.closest("[data-toggle-job]"), r = e.target.closest("[data-confirm-ref]");
      if (d && d.dataset.decide === "Zavrnjena" && !d.dataset.armed) {
        // Zavrnitev zahteva drugi klik, da je kandidat ne zavrne po nesreči (ugotovitev U5)
        d.dataset.armed = "1"; d.textContent = "Res zavrni?"; d.classList.add("btn-red"); d.classList.remove("btn-outline");
        setTimeout(() => { if (d.isConnected) { delete d.dataset.armed; d.textContent = "Zavrni"; d.classList.remove("btn-red"); d.classList.add("btn-outline"); } }, 4000);
        return;
      }
      if (d) { const a = state.applications.find(x => x.id === d.dataset.id); a.status = d.dataset.decide; save(); toast(a.status === "Sprejeta" ? `${a.ime} je sprejet(a). Študent to vidi v svojem računu.` : "Prijava je zavrnjena."); }
      else if (t) { const j = state.jobs.find(x => String(x.id) === t.dataset.toggleJob); j.aktiven = j.aktiven === false; save(); toast(j.aktiven ? "Oglas je ponovno objavljen." : "Oglas je zaključen in ni več med prostimi deli."); }
      else if (r) { const n = state.referrals.find(x => x.st === r.dataset.confirmRef); n.status = "Potrjena"; save(); toast("Napotnica je potrjena."); }
      else return;
      PAGES.account(); refreshChrome();
    };
  };

  PAGES.jobPost = () => {
    const u = me();
    if (!u || u.tip !== "podjetje") {
      needLogin($("#postWrap"), u ? "Oglase oddajajo podjetja" : "Prijavite se kot podjetje",
        u ? "Prijavljeni ste kot študent. Za oddajo oglasa se odjavite in prijavite z računom podjetja." : "Za oddajo oglasa potrebujete račun poslovnega partnerja. Vpis traja 2 minuti.", "podjetje");
      return;
    }
    $("#ogPodjetje").value = u.naziv; $("#ogDavcna").value = u.davcna || ""; $("#ogOseba").value = u.oseba || ""; $("#ogEmail").value = u.email;
    const katSel = $("#ogKat"); katSel.innerHTML = `<option value="">Izberi …</option>` + SS.KATEGORIJE.map(k => `<option>${k}</option>`).join("");
    const regSel = $("#ogRegija"); regSel.innerHTML = SS.REGIJE.map(k => `<option>${k}</option>`).join("");
    const prev = () => {
      const j = { id: "nova", naziv: $("#ogNaziv").value || "Naziv dela", podjetje: $("#ogPodjetje").value || "Vaše podjetje", kraj: $("#ogKraj").value || "Kraj dela", cas: $("#ogCas").value || "Delovni čas", urna: parseFloat($("#ogUrna").value) || 0, kat: katSel.value || "Vrsta dela", dijaki: $("#ogDijaki").checked, objavljeno: "danes" };
      $("#ogPreview").innerHTML = jobCard(j).replace(/href="[^"]*"/, 'href="#" tabindex="-1" aria-hidden="true"').replace("Šifra nova", "Predogled");
      // Delodajalec takoj vidi strošek in kaj dobi študent (testiranje s personami, ugotovitev U3)
      $("#ogCost").innerHTML = j.urna > 0
        ? `Vas stane <b>${eur(j.urna * (1 + SS.STOPNJE.dajatveDelodajalec))}</b> na uro z dajatvami. Študent prejme <b>${eur(j.urna * (1 - SS.STOPNJE.prispevkiStudent))}</b> neto. <a href="izracun-stroska.html">Podroben izračun</a>`
        : "Najmanj zakonska minimalna urna postavka.";
    };
    // Urejanje obstoječega oglasa (?uredi=šifra) – samo za oglase tega podjetja
    const editing = params.get("uredi") ? state.jobs.find(j => String(j.id) === params.get("uredi") && j.ownerId === u.id) : null;
    if (editing) {
      $("h1").textContent = "Uredi oglas"; $("#ogNaziv").value = editing.naziv; katSel.value = editing.kat; regSel.value = editing.regija;
      $("#ogKraj").value = editing.kraj; $("#ogUrna").value = editing.urna; $("#ogCas").value = editing.cas; $("#ogOpis").value = editing.opis;
      $("#ogDijaki").checked = editing.dijaki; $("#postForm button[type=submit]").textContent = "Shrani spremembe";
    }
    $$("#postForm input, #postForm select, #postForm textarea").forEach(el => el.addEventListener("input", prev));
    prev();
    $("#postForm").addEventListener("submit", e => {
      e.preventDefault(); if (!validate(e.target)) return;
      const imgByKat = { "Strežba": "strezba.jpg", "Skladiščna dela": "skladisce.jpg", "Proizvodna dela": "skladisce.jpg", "Računalniška dela, informatika": "it.jpg" };
      if (editing) {
        Object.assign(editing, { naziv: $("#ogNaziv").value.trim(), kat: katSel.value, regija: regSel.value, kraj: $("#ogKraj").value.trim(),
          urna: parseFloat($("#ogUrna").value) || 0, cas: $("#ogCas").value.trim(), opis: $("#ogOpis").value.trim(), dijaki: $("#ogDijaki").checked,
          img: imgByKat[katSel.value] || "podjetja.jpg", pogoji: [$("#ogDijaki").checked ? "status dijaka ali študenta" : "status študenta"] });
        save();
        $("#postWrap").innerHTML = `<div class="card form-card">${successHTML("Oglas je posodobljen", `Spremembe oglasa »${esc(editing.naziv)}« (šifra ${editing.id}) so takoj vidne med prostimi deli.`, `<a class="btn btn-primary" href="delo.html?id=${editing.id}">Poglej oglas</a><a class="btn btn-outline" href="moj-racun.html#oglasi">Moji oglasi</a>`)}</div>`;
        window.scrollTo({ top: 0 }); return;
      }
      const ids = state.jobs.concat(SS.JOBS).map(j => Number(j.id));
      const j = { id: Math.max(...ids) + 1, ownerId: u.id, aktiven: true, naziv: $("#ogNaziv").value.trim(), podjetje: u.naziv, kat: katSel.value,
        regija: regSel.value, kraj: $("#ogKraj").value.trim(), urna: parseFloat($("#ogUrna").value) || 0, cas: $("#ogCas").value.trim(),
        trajanje: "Po dogovoru", dijaki: $("#ogDijaki").checked, od: "takoj", objavljeno: today(), img: imgByKat[katSel.value] || "podjetja.jpg",
        opis: $("#ogOpis").value.trim(), naloge: [], pogoji: [$("#ogDijaki").checked ? "status dijaka ali študenta" : "status študenta"] };
      state.jobs.unshift(j); save();
      $("#postWrap").innerHTML = `<div class="card form-card">${successHTML("Oglas je objavljen", `Oglas »${esc(j.naziv)}« (šifra ${j.id}) je zdaj med prostimi deli. Prijave kandidatov boste videli v Mojem računu.`, `<a class="btn btn-primary" href="delo.html?id=${j.id}">Poglej oglas</a><a class="btn btn-outline" href="moj-racun.html#oglasi">Moji oglasi</a>`)}</div>`;
      window.scrollTo({ top: 0 });
    });
  };

  PAGES.partner = () => {
    if (me()) { $("#partnerWrap").innerHTML = `<div class="card form-card stack"><h2>Že ste prijavljeni</h2><p class="muted">Prijavljeni ste kot ${esc(fullName(me()))}. Za nov račun podjetja se najprej odjavite.</p><div class="form-actions"><a class="btn btn-primary" href="moj-racun.html">Moj račun</a></div></div>`; return; }
    $("#partnerForm").addEventListener("submit", e => {
      e.preventDefault(); if (!validate(e.target)) return;
      const email = $("#ptEmail").value.trim();
      const u = { id: uid("u"), tip: "podjetje", email, geslo: salted(email, $("#ptGeslo").value), naziv: $("#ptNaziv").value.trim(),
        davcna: $("#ptDavcna").value.replace(/\s/g, ""), maticna: $("#ptMaticna").value.trim(), naslov: $("#ptNaslov").value.trim(),
        dejavnost: $("#ptDejavnost").value.trim(), oseba: $("#ptOseba").value.trim(), tel: $("#ptTel").value.replace(/\s/g, "") };
      state.users.push(u); login(u); refreshChrome();
      $("#partnerWrap").innerHTML = `<div class="card form-card">${successHTML("Račun podjetja je ustvarjen", `Dobrodošli, ${esc(u.naziv)}! Prijavljeni ste in lahko takoj objavite oglas. Pogodbo o sodelovanju boste prejeli na ${esc(email)}.`, `<a class="btn btn-red" href="${esc(nextUrl("oddaja-oglasa.html"))}">Oddaj prvi oglas</a><a class="btn btn-outline" href="moj-racun.html">Moj račun</a>`)}</div>`;
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

  PAGES.reset = () => {
    let target = null;
    $("#resetForm").addEventListener("submit", e => {
      e.preventDefault(); if (!validate(e.target)) return;
      // Isto sporočilo ne glede na to, ali račun obstaja – tako stran ne izda, kateri naslovi so registrirani
      target = findUser($("#rsEmail").value);
      e.target.hidden = true; $("#resetSent").hidden = false;
    });
    $("#resetOpen").addEventListener("click", () => {
      if (!target) { toast("Za ta naslov ni računa, zato povezava ni bila poslana."); return; }
      $("#resetSent").hidden = true; $("#newPassForm").hidden = false; $("#rsFor").textContent = target.email; $("#rsGeslo").focus();
    });
    $("#newPassForm").addEventListener("submit", e => {
      e.preventDefault(); if (!validate(e.target)) return;
      target.geslo = salted(target.email, $("#rsGeslo").value); login(target);
      location.href = "moj-racun.html";
    });
  };

  PAGES.docs = () => {
    $$("[data-download]").forEach(b => b.addEventListener("click", () => toast("V prototipu prenos dokumentov ni na voljo.")));
  };

  /* ---------- Zagon ---------- */
  mountChrome();
  const start = () => {
    mountBottom();
    const page = document.body.dataset.page;
    if (PAGES[page]) PAGES[page]();
    setupReveal();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
