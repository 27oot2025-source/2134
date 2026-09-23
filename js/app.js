/* ══════════════════════════════════════════════════════════════
   СССР://2077 — логика Государственного Терминала
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  let flashT; // таймер тоста — объявлен заранее: makeId() зовёт flash() до «Тоста»

  /* ───────── Навигация по вкладкам ───────── */
  const tabs = $$(".tab-btn");
  const panels = $$(".panel");

  function openTab(id, push) {
    tabs.forEach(b => {
      const on = b.dataset.tab === id;
      b.classList.toggle("on", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    panels.forEach(p => {
      const on = p.id === "panel-" + id;
      p.classList.toggle("on", on);
      if (on) { p.scrollTop = 0; }
    });
    if (push !== false) location.hash = "#/" + id;
    document.body.classList.remove("nav-open");
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    // спецовые инициализации
    if (id === "game") initGame();
    if (id === "terminal") initTerminal();
    if (id === "map") renderMap();
    bootLazy(id);
  }

  tabs.forEach(b => b.addEventListener("click", () => openTab(b.dataset.tab)));
  const burger = $("#burger");
  if (burger) burger.addEventListener("click", () => document.body.classList.toggle("nav-open"));
  // закрыть мобильное меню по клику вне рейки
  document.addEventListener("click", e => {
    if (document.body.classList.contains("nav-open") &&
        !e.target.closest("#rail") && !e.target.closest("#burger")) {
      document.body.classList.remove("nav-open");
    }
  });

  function fromHash() {
    const h = (location.hash || "").replace("#/", "");
    const valid = tabs.some(b => b.dataset.tab === h);
    openTab(valid ? h : "home", false);
  }
  window.addEventListener("hashchange", fromHash);

  /* ───────── Часы штаба ───────── */
  function tickClock() {
    const el = $("#clock");
    if (!el) return;
    const d = new Date();
    const p = n => String(n).padStart(2, "0");
    el.textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }
  setInterval(tickClock, 1000); tickClock();

  /* ───────── Бегущая строка ───────── */
  function buildTicker() {
    const t = $("#ticker-track");
    if (!t) return;
    const line = DATA.ticker.join("   ✦   ");
    t.innerHTML = `<span>${line}   ✦   ${line}   ✦   </span>`;
  }

  /* ───────── Счётчики главной ───────── */
  function animateCounters() {
    $$(".stat-num").forEach(el => {
      const target = +el.dataset.num;
      const suf = el.dataset.suf || "";
      let cur = 0;
      const step = Math.max(1, Math.ceil(target / 60));
      const t0 = performance.now();
      function frame(t) {
        const k = Math.min(1, (t - t0) / 1400);
        cur = Math.floor(target * (1 - Math.pow(1 - k, 3)));
        el.textContent = cur + suf;
        if (k < 1) requestAnimationFrame(frame);
        else el.textContent = target + suf;
      }
      requestAnimationFrame(frame);
    });
  }

  /* ───────── ЛОР: хроника + фракции ───────── */
  function renderTimeline() {
    const box = $("#timeline");
    if (!box) return;
    box.innerHTML = DATA.timeline.map((e, i) => `
      <article class="tl-item ${e.era}" style="--i:${i}">
        <div class="tl-year">${e.y}</div>
        <div class="tl-card">
          <h3>${e.t}</h3>
          <p>${e.d}</p>
        </div>
      </article>`).join("");
  }
  function renderFactions() {
    const box = $("#factions");
    if (!box) return;
    box.innerHTML = DATA.factions.map(f => `
      <div class="fac ${f.side}">
        <h4>${f.name}</h4><p>${f.d}</p>
      </div>`).join("");
  }

  /* ───────── КАРТА ───────── */
  const MAP_FILTERS = { cur: "all" };
  function renderMap() {
    const layer = $("#map-pins");
    const list = $("#country-list");
    if (!layer || !list) return;

    const countries = DATA.countries.filter(c =>
      MAP_FILTERS.cur === "all" || c.bloc === MAP_FILTERS.cur);

    list.innerHTML = countries.map(c => `
      <button class="cl-item bloc-${c.bloc}" data-id="${c.id}">
        <img src="${c.flag}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
        <span class="cl-name">${c.name}</span>
        <span class="cl-ideo">${c.ideology.split(",")[0]}</span>
      </button>`).join("");

    layer.innerHTML = DATA.countries.map(c => {
      const dim = MAP_FILTERS.cur !== "all" && c.bloc !== MAP_FILTERS.cur;
      return `<button class="pin bloc-${c.bloc} ${dim ? "dim" : ""}" data-id="${c.id}"
        style="left:${c.x}%; top:${c.y}%" title="${c.name}">
        <span class="pin-dot"></span><span class="pin-label">${c.name}</span>
      </button>`;
    }).join("");

    $$(".cl-item,.pin").forEach(el => el.addEventListener("click", () => showCountry(el.dataset.id)));
    if (!$("#country-card").dataset.id) showCountry("ussr", true);
    else showCountry($("#country-card").dataset.id, true);
  }

  function showCountry(id, silent) {
    const c = DATA.countries.find(x => x.id === id);
    if (!c) return;
    $$(".pin,.cl-item").forEach(el => el.classList.toggle("sel", el.dataset.id === id));
    const card = $("#country-card");
    card.dataset.id = id;
    card.className = "country-card bloc-" + c.bloc;
    card.innerHTML = `
      <div class="cc-head">
        <img class="cc-flag" src="${c.flag}" alt="Флаг: ${c.full}" onerror="this.style.opacity=.2">
        <div>
          <div class="cc-abbr">${c.name}</div>
          <div class="cc-full">${c.full}</div>
        </div>
      </div>
      <div class="cc-ideo"><span>ИДЕОЛОГИЯ:</span> ${c.ideology}</div>
      <p class="cc-desc">${c.desc}</p>
      <dl class="cc-meta">
        <div><dt>СТОЛИЦА</dt><dd>${c.capital}</dd></div>
        <div><dt>НАСЕЛЕНИЕ</dt><dd>${c.pop}</dd></div>
        <div><dt>РУКОВОДСТВО</dt><dd>${c.leader}</dd></div>
        <div><dt>ОТНОШЕНИЯ</dt><dd>${c.rel}</dd></div>
      </dl>`;
    if (!silent) card.animate([{ opacity: 0.2, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 260 });
  }

  $$(".map-filter").forEach(b => b.addEventListener("click", () => {
    MAP_FILTERS.cur = b.dataset.bloc;
    $$(".map-filter").forEach(x => x.classList.toggle("on", x === b));
    renderMap();
  }));

  /* ───────── ПЕРСОНАЖИ ───────── */
  function renderChars() {
    const box = $("#chars-grid");
    if (!box) return;
    box.innerHTML = DATA.chars.map(c => `
      <article class="char-card" data-id="${c.id}" tabindex="0">
        <div class="char-photo">
          <img src="${c.photo}" alt="${c.name}" loading="lazy">
          <div class="char-scan"></div>
          <span class="char-rank">${c.rank}</span>
        </div>
        <div class="char-body">
          <h3>${c.name}</h3>
          <div class="char-sub">${c.faction} · ${c.born}</div>
          <p>${c.bio.slice(0, 140)}…</p>
          <span class="char-more">ЧИТАТЬ ДОСЬЕ →</span>
        </div>
      </article>`).join("");
    $$(".char-card").forEach(el => {
      const go = () => openChar(el.dataset.id);
      el.addEventListener("click", go);
      el.addEventListener("keydown", e => { if (e.key === "Enter") go(); });
    });
  }

  function openChar(id) {
    const c = DATA.chars.find(x => x.id === id);
    if (!c) return;
    const m = $("#modal");
    m.innerHTML = `
      <div class="modal-card char-modal">
        <button class="modal-x" aria-label="Закрыть">✕</button>
        <div class="cm-grid">
          <div class="cm-photo"><img src="${c.photo}" alt="${c.name}">
            <div class="cm-stamp">ЛИЧНОЕ ДОСЬЕ<br>КОНТУР-ОХРАНА</div>
          </div>
          <div class="cm-info">
            <div class="cm-kicker">ДОСЬЕ · ${c.id.toUpperCase()}-2077</div>
            <h2>${c.name}</h2>
            <div class="cm-rank">${c.rank}</div>
            <dl class="cm-meta">
              <div><dt>Год рождения</dt><dd>${c.born}</dd></div>
              <div><dt>Фракция</dt><dd>${c.faction}</dd></div>
            </dl>
            <p class="cm-bio">${c.bio}</p>
            <blockquote>«${c.quote}»</blockquote>
            <div class="cm-stats">${c.stats.map(s => `
              <div class="cm-stat"><span>${s[0]}</span>
                <div class="bar"><i style="width:${s[1]}%"></i></div>
                <b>${s[1]}</b>
              </div>`).join("")}
            </div>
          </div>
        </div>
      </div>`;
    showModal();
  }

  /* ───────── МАГАЗИН ───────── */
  const cart = [];
  let shopCat = "all";

  function money(n) { return n.toLocaleString("ru-RU") + " ₽"; }

  function renderShop() {
    const box = $("#shop-grid");
    if (!box) return;
    const items = DATA.products.filter(p => shopCat === "all" || p.cat === shopCat);
    const note = $("#shop-note");
    if (note) note.textContent = `${DATA.products.length} позиций · оплата рублём, трудоднем или «грантом» контура`;
    box.innerHTML = items.map(p => `
      <article class="prod" data-id="${p.id}" tabindex="0">
        <div class="prod-img">
          <img src="${p.img}" alt="${p.name}" loading="lazy">
          <span class="prod-badge">${p.badge}</span>
        </div>
        <div class="prod-body">
          <div class="prod-cat">${p.cat}</div>
          <h3>${p.name}</h3>
          <div class="prod-foot">
            <span class="prod-price">${money(p.price)}</span>
            <button class="btn-mini add" data-id="${p.id}">В КОРЗИНУ</button>
          </div>
        </div>
      </article>`).join("");
    $$(".prod .add").forEach(b => b.addEventListener("click", e => {
      e.stopPropagation(); addToCart(b.dataset.id);
    }));
    $$(".prod").forEach(el => {
      el.addEventListener("click", () => openProd(el.dataset.id));
      el.addEventListener("keydown", e => { if (e.key === "Enter") openProd(el.dataset.id); });
    });
  }

  $$(".cat-chip").forEach(b => b.addEventListener("click", () => {
    shopCat = b.dataset.cat;
    $$(".cat-chip").forEach(x => x.classList.toggle("on", x === b));
    renderShop();
  }));

  function addToCart(id) {
    const p = DATA.products.find(x => x.id === id);
    if (!p) return;
    const row = cart.find(x => x.id === id);
    if (row) row.q++; else cart.push({ id, q: 1, name: p.name, price: p.price });
    updateCart();
    flash(`«${p.name}» — в корзине ГОСТОРГа`);
    const btn = $("#cart-btn");
    btn.animate([{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }], { duration: 320 });
  }

  function updateCart() {
    const n = cart.reduce((s, x) => s + x.q, 0);
    $("#cart-count").textContent = n;
    const box = $("#cart-items");
    if (!box) return;
    if (!cart.length) {
      box.innerHTML = `<p class="cart-empty">Корзина пуста. Даже Гагарин начинал с нуля.</p>`;
    } else {
      box.innerHTML = cart.map(x => `
        <div class="cart-row" data-id="${x.id}">
          <span class="cr-n">${x.name}</span>
          <span class="cr-q">
            <button data-act="minus">−</button><b>${x.q}</b><button data-act="plus">+</button>
          </span>
          <span class="cr-p">${money(x.price * x.q)}</span>
          <button class="cr-x" data-act="del" title="Убрать">✕</button>
        </div>`).join("");
      $$(".cart-row button", box).forEach(b => b.addEventListener("click", () => {
        const id = b.closest(".cart-row").dataset.id;
        const row = cart.find(x => x.id === id);
        const act = b.dataset.act;
        if (act === "plus") row.q++;
        if (act === "minus") { row.q--; if (row.q <= 0) cart.splice(cart.indexOf(row), 1); }
        if (act === "del") cart.splice(cart.indexOf(row), 1);
        updateCart();
      }));
    }
    const sum = cart.reduce((s, x) => s + x.price * x.q, 0);
    $("#cart-sum").textContent = money(sum);
  }

  $("#cart-btn") && $("#cart-btn").addEventListener("click", () => {
    $("#cart-drawer").classList.toggle("open");
  });
  $("#cart-close") && $("#cart-close").addEventListener("click", () =>
    $("#cart-drawer").classList.remove("open"));
  $("#cart-order") && $("#cart-order").addEventListener("click", () => {
    if (!cart.length) { flash("Сначала положите что-нибудь в корзину."); return; }
    const n = cart.reduce((s, x) => s + x.q, 0);
    cart.length = 0; updateCart();
    $("#cart-drawer").classList.remove("open");
    flash(`Заказ № ГС-${Math.floor(Math.random() * 90000 + 10000)} принят! Позиций: ${n}. Ожидайте курьера «Ласточку».`);
  });

  function openProd(id) {
    const p = DATA.products.find(x => x.id === id);
    if (!p) return;
    const m = $("#modal");
    m.innerHTML = `
      <div class="modal-card prod-modal">
        <button class="modal-x">✕</button>
        <div class="pm-grid">
          <div class="pm-img"><img src="${p.img}" alt="${p.name}"><span class="prod-badge">${p.badge}</span></div>
          <div class="pm-info">
            <div class="prod-cat">${p.cat} · ГОСТ-2077</div>
            <h2>${p.name}</h2>
            <p class="pm-desc">${p.desc}</p>
            <ul class="pm-specs">${p.specs.map(s => `<li>${s}</li>`).join("")}</ul>
            <div class="pm-buy">
              <span class="prod-price">${money(p.price)}</span>
              <button class="btn add-modal" data-id="${p.id}">ДОБАВИТЬ В КОРЗИНУ</button>
            </div>
          </div>
        </div>
      </div>`;
    $(".add-modal", m).addEventListener("click", () => { addToCart(p.id); hideModal(); });
    showModal();
  }

  /* ───────── Модальное окно ───────── */
  function showModal() {
    const m = $("#modal");
    m.classList.add("on");
    document.body.style.overflow = "hidden";
    $(".modal-x", m).addEventListener("click", hideModal);
  }
  function hideModal() {
    $("#modal").classList.remove("on");
    document.body.style.overflow = "";
  }
  $("#modal") && $("#modal").addEventListener("click", e => {
    if (e.target.id === "modal") hideModal();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") hideModal(); });

  /* ───────── Газета ───────── */
  function renderNews() {
    const box = $("#news-grid");
    if (!box) return;
    box.innerHTML = DATA.news.map((a, i) => `
      <article class="news-card ${i === 0 ? "lead" : ""}" data-id="${a.id}" tabindex="0">
        <div class="news-date">${a.date}</div>
        <h3>${a.head}</h3>
        <p>${a.lead}</p>
        <div class="news-tags">${a.tags.map(t => `<span>#${t}</span>`).join("")}</div>
        <span class="char-more">ЧИТАТЬ В ПОЛНОТЕ →</span>
      </article>`).join("");
    $$(".news-card").forEach(el => el.addEventListener("click", () => openNews(el.dataset.id)));
  }
  function openNews(id) {
    const a = DATA.news.find(x => x.id === id);
    if (!a) return;
    const m = $("#modal");
    m.innerHTML = `
      <div class="modal-card news-modal">
        <button class="modal-x">✕</button>
        <div class="paper">
          <div class="paper-masthead">ПРАВДА·2077</div>
          <div class="paper-date">${a.date} · цена 3 коп. · ГОСЗНАК</div>
          <h2>${a.head}</h2>
          <div class="paper-lead">${a.lead}</div>
          <p>${a.body}</p>
          <div class="paper-sign">— ТАСС, ГАС «Пресса» · подписано в набор в 04:12</div>
        </div>
      </div>`;
    showModal();
  }

  /* ───────── Радио ───────── */
  let radioOn = false;
  function renderRadio() {
    const box = $("#radio-list");
    if (!box) return;
    box.innerHTML = DATA.radio.map((r, i) => `
      <div class="radio-row" data-i="${i}">
        <span class="rr-n">${String(i + 1).padStart(2, "0")}</span>
        <span class="rr-t">${r.t}</span>
        <span class="rr-a">${r.a}</span>
        <span class="rr-mood">${r.mood}</span>
        <span class="rr-len">${r.len}</span>
      </div>`).join("");
    $$(".radio-row").forEach(row => row.addEventListener("click", () => {
      $$(".radio-row").forEach(r => r.classList.remove("playing"));
      row.classList.add("playing");
      const r = DATA.radio[+row.dataset.i];
      $("#radio-now").textContent = r.t + " — " + r.a;
      radioOn = true;
      $("#eq").classList.add("on");
      flash(`В эфире «Маяк-77»: ${r.t}`);
    }));
  }
  $("#radio-power") && $("#radio-power").addEventListener("click", () => {
    radioOn = !radioOn;
    $("#eq").classList.toggle("on", radioOn);
    $("#radio-power").textContent = radioOn ? "◉ ВКЛ" : "○ ВЫКЛ";
    $("#radio-now").textContent = radioOn ? "Настраиваю волну…" : "— затише на волне —";
    if (radioOn) flash("Приёмник «Маяк-77» включён. Антенна поднята.");
  });

  /* ───────── Кино ───────── */
  function renderCinema() {
    const box = $("#cinema-grid");
    if (!box) return;
    box.innerHTML = DATA.cinema.map(f => `
      <article class="film">
        <div class="film-poster"><img src="${f.img}" alt="${f.t}" loading="lazy">
          <span class="film-rate">★ ${f.rate}</span></div>
        <div class="film-info">
          <div class="film-y">${f.y} · ${f.g}</div>
          <h3>${f.t}</h3><p>${f.d}</p>
          <button class="btn-mini ticket">КУПИТЬ БИЛЕТ</button>
        </div>
      </article>`).join("");
    $$(".ticket").forEach(b => b.addEventListener("click", () =>
      flash("Билет электронный. Покажите жетон на входе в «Космос».")));
  }

  /* ───────── Архив ───────── */
  function renderArchive() {
    const box = $("#archive-list");
    if (!box) return;
    box.innerHTML = DATA.archive.map(d => `
      <details class="doc">
        <summary>
          <span class="doc-id">${d.id}</span>
          <span class="doc-t">${d.t}</span>
          <span class="doc-lvl">${d.lvl}</span>
        </summary>
        <div class="doc-body">
          <p>${d.d}</p>
          <div class="doc-stamp">${d.stamp}</div>
        </div>
      </details>`).join("");
  }

  /* ───────── Библиотека ───────── */
  function renderBooks() {
    const box = $("#books-grid");
    if (!box) return;
    box.innerHTML = DATA.books.map((b, i) => `
      <div class="book" style="--h:${i % 4}">
        <div class="book-spine">${b.t}</div>
        <div class="book-face">
          <div class="book-y">${b.y}</div>
          <h4>${b.t}</h4>
          <div class="book-a">${b.a}</div>
          <p>${b.d}</p>
        </div>
      </div>`).join("");
  }

  /* ───────── Кухня ───────── */
  function renderRecipes() {
    const box = $("#recipes-grid");
    if (!box) return;
    box.innerHTML = DATA.recipes.map(r => `
      <details class="recipe">
        <summary>
          <span class="rc-n">${r.n}</span>
          <span class="rc-meta">${r.time} · ${r.lvl}</span>
        </summary>
        <div class="rc-body">
          <p>${r.d}</p>
          <ul class="rc-ing">${r.ing.map(x => `<li>${x}</li>`).join("")}</ul>
        </div>
      </details>`).join("");
  }

  /* ───────── Транспорт ───────── */
  function renderTransport() {
    const box = $("#transport-grid");
    if (!box) return;
    box.innerHTML = DATA.transport.map(t => `
      <article class="veh">
        <div class="veh-img"><img src="${t.img}" alt="${t.n}" loading="lazy"></div>
        <div class="veh-c">${t.c}</div>
        <h3>${t.n}</h3><p>${t.d}</p>
      </article>`).join("");
  }

  /* ───────── Космос ───────── */
  function renderSpace() {
    const box = $("#space-tl");
    if (!box) return;
    box.innerHTML = DATA.space.map(s => `
      <div class="sp-item"><div class="sp-y">${s.y}</div>
        <div class="sp-d"><h4>${s.t}</h4><p>${s.d}</p></div></div>`).join("");
  }

  /* ───────── Наука ───────── */
  function renderScience() {
    const box = $("#labs-grid");
    if (box) box.innerHTML = DATA.science.map(l => `
      <div class="lab"><span class="lab-tag">${l.tag}</span><h4>${l.n}</h4><p>${l.d}</p></div>`).join("");
    const inv = $("#inv-list");
    if (inv) inv.innerHTML = DATA.inventions.map(i => `
      <div class="inv"><b>${i.y}</b><span>${i.n}</span><em>${i.who}</em></div>`).join("");
  }

  /* ───────── Погода ───────── */
  function renderWeather() {
    const box = $("#weather-grid");
    if (!box) return;
    box.innerHTML = DATA.weather.map(w => `
      <div class="wcard">
        <div class="w-i">${w.i}</div>
        <div class="w-c">${w.c}</div>
        <div class="w-t">${w.t}</div>
        <div class="w-s">${w.s}</div>
        <div class="w-w">ветер: ${w.w}</div>
      </div>`).join("");
  }

  /* ───────── Курсы ───────── */
  function renderRates() {
    const box = $("#rates-body");
    if (!box) return;
    box.innerHTML = DATA.rates.map(r => `
      <tr><td>${r.n}</td><td>${r.b}</td><td>${r.r}</td>
      <td class="${r.d.startsWith("−") || r.d.startsWith("-") ? "dn" : r.d === "0.0%" ? "" : "up"}">${r.d}</td>
      <td class="nt">${r.note}</td></tr>`).join("");
    const chart = $("#rate-chart");
    if (chart) {
      const max = Math.max(...DATA.chart);
      chart.innerHTML = DATA.chart.map((v, i) =>
        `<i style="height:${(v / max) * 100}%; animation-delay:${i * 40}ms" title="м${i + 1}: ${v}"></i>`).join("");
    }
  }

  /* ───────── Доска почёта ───────── */
  function renderHonor() {
    const box = $("#honor-body");
    if (!box) return;
    box.innerHTML = DATA.honor.map((h, i) => `
      <tr><td>${String(i + 1).padStart(2, "0")}</td><td class="hn">${h.n}</td>
      <td>${h.w}</td><td>${h.m}</td><td>${h.y}</td></tr>`).join("");
  }

  /* ───────── Удостоверение ───────── */
  const ID_FORM = $("#id-form");
  function makeId() {
    const name = ($("#id-name").value || "ГРАЖДАНИН СОЮЗА").toUpperCase();
    const rank = $("#id-rank").value || "рабочий";
    const city = $("#id-city").value || "Москва";
    const num = String(Math.floor(Math.random() * 900000 + 100000));
    $("#id-card-name").textContent = name;
    $("#id-card-rank").textContent = rank;
    $("#id-card-city").textContent = city;
    $("#id-card-num").textContent = "РП-" + num;
    $("#id-card-date").textContent = new Date().toLocaleDateString("ru-RU");
    // псевдо-qr
    let s = "";
    for (let i = 0; i < 49; i++) s += Math.random() > 0.45 ? "1" : "0";
    $("#id-qr").innerHTML = s.split("").map(c =>
      `<i class="${c === "1" ? "f" : ""}"></i>`).join("");
    flash("Рабочий Профиль сгенерирован. Храните удостоверение бережно.");
  }
  if (ID_FORM) {
    ID_FORM.addEventListener("submit", e => { e.preventDefault(); makeId(); });
    makeId();
  }

  /* ───────── Форма связи ───────── */
  const C_FORM = $("#contact-form");
  if (C_FORM) C_FORM.addEventListener("submit", e => {
    e.preventDefault();
    const n = $("#ct-name").value.trim();
    const msg = $("#ct-msg").value.trim();
    if (!n || !msg) { flash("Заполните имя и текст — иначе Центр не поймёт."); return; }
    $("#contact-ok").classList.add("on");
    C_FORM.reset();
    setTimeout(() => $("#contact-ok").classList.remove("on"), 5000);
  });

  /* ───────── Тост ───────── */
  function flash(text) {
    const el = $("#flash");
    if (!el) return;
    el.textContent = text;
    el.classList.add("on");
    clearTimeout(flashT);
    flashT = setTimeout(() => el.classList.remove("on"), 3200);
  }

  /* ───────── Терминал ───────── */
  let termReady = false;
  function initTerminal() {
    if (termReady) return;
    termReady = true;
    const out = $("#term-out");
    const inp = $("#term-in");
    const print = (html, cls) => {
      const d = document.createElement("div");
      if (cls) d.className = cls;
      d.innerHTML = html;
      out.appendChild(d);
      out.scrollTop = out.scrollHeight;
    };
    print("ГОСТЕРМИНАЛ СССР/77 v4.1 — (с) КОНТУР-ОХРАНА", "t-green");
    print("Соединение с узлом «Москва-1» установлено. Доступ: гражданин.");
    print(`Введите <b>помощь</b> для списка команд.`);
    $("#term-form").addEventListener("submit", e => {
      e.preventDefault();
      const raw = inp.value.trim();
      if (!raw) return;
      print("» " + escapeHtml(raw), "t-cmd");
      const [cmd, ...args] = raw.split(/\s+/);
      const c = cmd.toLowerCase();
      if (c === "помощь" || c === "help") {
        print(`Команды:<br>
          &nbsp;<b>помощь</b> — этот список<br>
          &nbsp;<b>лор</b> — краткая хроника<br>
          &nbsp;<b>страны</b> — список стран карты<br>
          &nbsp;<b>страна N</b> — досье страны<br>
          &nbsp;<b>магазин</b> — ассортимент ГОСТОРГа<br>
          &nbsp;<b>персонажи</b> — герои эпохи<br>
          &nbsp;<b>флаг ID</b> — показать флаг<br>
          &nbsp;<b>дата</b> — текущее время Союза<br>
          &nbsp;<b>эхо ТЕКСТ</b> — повтор<br>
          &nbsp;<b>очистить</b> — стереть экран<br>
          &nbsp;<b>секрет</b> — ?`);
      } else if (c === "лор") {
        DATA.timeline.slice(0, 6).forEach(t => print(`<b>${t.y}</b> — ${t.t}`));
        print("… полная хроника — во вкладке ЛОР", "t-dim");
      } else if (c === "страны") {
        DATA.countries.forEach((x, i) => print(`${i + 1}. ${x.name} — ${x.full}`));
        print("Запрос: страна N", "t-dim");
      } else if (c === "страна") {
        const n = parseInt(args[0], 10);
        const x = DATA.countries[n - 1];
        if (!x) print("Нет такой страны. Введите страны.", "t-red");
        else print(`<b>${x.name}</b> · ${x.capital} · ${x.pop}<br>${x.ideology}<br>${x.desc}`);
      } else if (c === "магазин") {
        DATA.products.forEach(p => print(`[${p.cat}] ${p.name} — ${p.price} ₽`));
      } else if (c === "персонажи") {
        DATA.chars.forEach(p => print(`${p.name} — ${p.rank}`));
      } else if (c === "флаг") {
        const x = DATA.countries.find(y => y.id === (args[0] || "").toLowerCase());
        if (!x) print("Использование: флаг ussr | usa | knr …", "t-red");
        else print(`<img src="${x.flag}" style="width:160px;border:1px solid #7f8c;image-rendering:auto" alt="">`);
      } else if (c === "дата" || c === "время") {
        print(new Date().toLocaleString("ru-RU"));
      } else if (c === "эхо") {
        print(escapeHtml(args.join(" ")));
      } else if (c === "очистить" || c === "clear") {
        out.innerHTML = "";
      } else if (c === "секрет") {
        print("17 марта 1991-го Союз спросили: «Будем?» — 87% ответили: «Да, и дайте ещё 50 лет».", "t-gold");
      } else {
        print(`Команда не найдена: ${escapeHtml(c)}. Попробуйте: помощь`, "t-red");
      }
      inp.value = "";
    });
  }
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  /* ───────── Игра «ГАДЮКА-8» ───────── */
  let gameStarted = false;
  function initGame() {
    if (gameStarted) return;
    gameStarted = true;
    const cv = $("#game-canvas");
    const ctx = cv.getContext("2d");
    const CELL = 20, COLS = cv.width / CELL, ROWS = cv.height / CELL;
    let sn, dir, ndir, food, score, best = +(localStorage.getItem("gadv_best") || 0), timer, dead;
    $("#game-best").textContent = best;

    function reset() {
      sn = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
      dir = { x: 1, y: 0 }; ndir = dir; score = 0; dead = false;
      placeFood(); updScore();
      clearInterval(timer);
      timer = setInterval(tick, 110);
      draw();
    }
    function placeFood() {
      do {
        food = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
      } while (sn.some(s => s.x === food.x && s.y === food.y));
    }
    function updScore() {
      $("#game-score").textContent = score;
      $("#game-best").textContent = best;
    }
    function tick() {
      if (dead) return;
      dir = ndir;
      const h = { x: sn[0].x + dir.x, y: sn[0].y + dir.y };
      if (h.x < 0 || h.y < 0 || h.x >= COLS || h.y >= ROWS || sn.some(s => s.x === h.x && s.y === h.y)) {
        dead = true;
        clearInterval(timer);
        $("#game-over").classList.add("on");
        if (score > best) { best = score; localStorage.setItem("gadv_best", best); }
        updScore();
        draw();
        return;
      }
      sn.unshift(h);
      if (h.x === food.x && h.y === food.y) { score += 10; placeFood(); }
      else sn.pop();
      updScore(); draw();
    }
    function draw() {
      ctx.fillStyle = "#0a0e10"; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.strokeStyle = "rgba(0,229,255,.05)";
      for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, cv.height); ctx.stroke(); }
      for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(cv.width, y * CELL); ctx.stroke(); }
      // еда — звезда
      ctx.fillStyle = "#f5c518";
      const fx = food.x * CELL + CELL / 2, fy = food.y * CELL + CELL / 2;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 4 : 9, a = Math.PI / 2 * (i / 5) * 2 - Math.PI / 2; // simplified
        const ang = -Math.PI / 2 + i * Math.PI / 5;
        ctx.lineTo(fx + Math.cos(ang) * r, fy + Math.sin(ang) * r);
      }
      ctx.closePath(); ctx.fill();
      // змея
      sn.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? "#ff2a2a" : `rgba(225,10,10,${1 - i / (sn.length + 6)})`;
        ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
      });
      if (dead) {
        ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(0, 0, cv.width, cv.height);
      }
    }
    $("#game-restart").addEventListener("click", () => {
      $("#game-over").classList.remove("on"); reset();
    });
    function setDir(x, y) {
      if (dir.x === -x && dir.y === -y) return;
      ndir = { x, y };
    }
    document.addEventListener("keydown", e => {
      if (!$("#panel-game").classList.contains("on")) return;
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase()) || ["w", "a", "s", "d", "ц", "ф", "ы", "в"].includes(k)) e.preventDefault();
      if (k === "arrowup" || k === "w" || k === "ц") setDir(0, -1);
      if (k === "arrowdown" || k === "s" || k === "ы") setDir(0, 1);
      if (k === "arrowleft" || k === "a" || k === "ф") setDir(-1, 0);
      if (k === "arrowright" || k === "d" || k === "в") setDir(1, 0);
      if ((dead || !sn) && k === " ") { $("#game-over").classList.remove("on"); reset(); }
    });
    // свайпы
    let tx = 0, ty = 0;
    cv.addEventListener("touchstart", e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
    cv.addEventListener("touchend", e => {
      const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) > Math.abs(dy)) setDir(Math.sign(dx), 0);
      else setDir(0, Math.sign(dy));
    }, { passive: true });
    reset();
  }

  /* ───────── Кибертехника (справочник) ───────── */
  function renderTech() {
    const g = $("#tech-grid");
    if (!g || !DATA.tech) return;
    g.innerHTML = DATA.tech.map(t => `
      <div class="tech"><h4>${t.n}</h4><p>${t.d}</p><span class="tag">${t.tag}</span></div>`).join("");
  }

  /* ───────── Ленивые анимации при открытии вкладок ───────── */
  function bootLazy(id) {
    if (id === "tech") renderTech();
    if (id === "exchange") renderRates();
    if (id === "honor") renderHonor();
    if (id === "weather") renderWeather();
    if (id === "science") renderScience();
    if (id === "space") renderSpace();
    if (id === "transport") renderTransport();
    if (id === "kitchen") renderRecipes();
    if (id === "library") renderBooks();
    if (id === "archive") renderArchive();
    if (id === "cinema") renderCinema();
    if (id === "radio") renderRadio();
    if (id === "news") renderNews();
    if (id === "shop") renderShop();
    if (id === "chars") renderChars();
    if (id === "lore") { renderTimeline(); renderFactions(); }
    if (id === "home") animateCounters();
  }

  /* ───────── Инициализация ───────── */
  let inited = false;
  function init() {
    if (inited) return;
    inited = true;
    buildTicker();
    updateCart();
    fromHash();
    if (!location.hash) openTab("home", false);
  }
  document.addEventListener("DOMContentLoaded", init);
  if (document.readyState !== "loading") init();
})();
