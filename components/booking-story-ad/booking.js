/* ==========================================================================
   Booking UI
   The search bar, date picker, guest stepper, results and Reserve button
   the ad shows, built as a working, accessible form. No dependencies.
   ========================================================================== */
(function () {
  'use strict';

  var form = document.querySelector('[data-bk-form]');
  if (!form) return;

  var cfg = (window.UI_BSA && window.UI_BSA.config) || { year: 2025, month: 9, brand: 'tomaru' };
  var status = document.querySelector('[data-bk-status]');
  var results = document.querySelector('[data-bk-results]');
  var cards = document.querySelector('[data-bk-cards]');
  var where = form.querySelector('#bk-where');
  var checkin = form.querySelector('[data-checkin]'), checkout = form.querySelector('[data-checkout]'), guestsLabel = form.querySelector('[data-guests-label]');

  var STAYS = [
    { title: 'Room in Shimogyo Ward, Japan', facts: '2 guests · 1 bedroom · 2 beds · 1 private bath', price: 142, img: 'images/01-onsen-street-night.webp', alt: 'A wooden onsen inn lit up at night beside a river' },
    { title: 'Machiya in Nakagyo Ward, Japan', facts: '4 guests · 2 bedrooms · 3 futons · 1 bath', price: 188, img: 'images/09-machiya.webp', alt: 'A traditional Kyoto townhouse with a tiled roof and lattice front' },
    { title: 'Ryokan room in Higashiyama, Japan', facts: '2 guests · 1 tatami room · 2 futons · shared bath', price: 126, img: 'images/03-tatami-shoji.webp', alt: 'A tatami room with a low table and floor chairs before shoji screens' },
    { title: 'Garden suite in Sakyo Ward, Japan', facts: '3 guests · 1 bedroom · 2 beds · private cedar bath', price: 236, img: 'images/11-cedar-bath.webp', alt: 'A cedar soaking tub open to a green garden' },
    { title: 'Inn room in Gion, Japan', facts: '2 guests · 1 tatami room · 2 futons · 1 bath', price: 159, img: 'images/10-futon-room.webp', alt: 'Two futons laid out on tatami under paper screens' },
    { title: 'Riverside ryokan near Arashiyama, Japan', facts: '5 guests · 2 rooms · 4 futons · 2 baths', price: 274, img: 'images/04-ryokan-hillside.webp', alt: 'A tall inn among wooded hills above a river' }
  ];

  /* ---------------------------------------------------------------- State */
  var state = { start: null, end: null, view: new Date(cfg.year, cfg.month, 1), adults: 0, children: 0 };
  // The demo opens on the ad's month, and the days before the ad's
  // check-in read as past, as in the ad's calendar.
  var floor = new Date(cfg.year, cfg.month, Math.max(1, (cfg.checkIn || 6) - 2));

  function sameDay(a, b) { return !!(a && b && a.getTime() === b.getTime()); }
  function fmt(d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  function longFmt(d) { return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); }
  function nights() { return state.start && state.end ? Math.round((state.end - state.start) / 864e5) : 0; }
  function guests() { return state.adults + state.children; }

  /* ---------------------------------------------------------------- Popovers */
  var openers = Array.prototype.slice.call(form.querySelectorAll('[data-open]'));
  var pops = { dates: form.querySelector('#bk-dates'), guests: form.querySelector('#bk-guests') };
  var current = null, lastOpener = null;

  function openPop(name, opener) {
    if (current && current !== name) closePop(false);
    current = name; lastOpener = opener;
    pops[name].hidden = false;
    openers.forEach(function (b) { b.setAttribute('aria-expanded', String(b.getAttribute('data-open') === name)); });
    if (name === 'dates') { renderCal(); focusDay(state.start || firstOpenDay()); }
    else pops.guests.querySelector('[data-inc]').focus();
  }
  function closePop(restore) {
    if (!current) return;
    pops[current].hidden = true;
    openers.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    current = null;
    if (restore !== false && lastOpener) lastOpener.focus();
  }
  openers.forEach(function (b) {
    b.addEventListener('click', function () {
      var name = b.getAttribute('data-open');
      if (current === name) closePop(); else openPop(name, b);
    });
  });
  Array.prototype.forEach.call(form.querySelectorAll('[data-close]'), function (b) { b.addEventListener('click', function () { closePop(); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && current) { e.preventDefault(); closePop(); } });
  document.addEventListener('pointerdown', function (e) {
    if (!current) return;
    if (pops[current].contains(e.target) || e.target.closest('[data-open]')) return;
    closePop(false);
  });

  /* ---------------------------------------------------------------- Tabs (Dates / Months / Flexible) */
  var tabs = Array.prototype.slice.call(form.querySelectorAll('[role="tab"]'));
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var to = null;
      if (e.key === 'ArrowRight') to = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') to = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') to = tabs[0];
      if (e.key === 'End') to = tabs[tabs.length - 1];
      if (to) { e.preventDefault(); selectTab(to, true); }
    });
  });
  var monthsIn = form.querySelector('[data-months]'), monthsOut = form.querySelector('[data-months-out]');
  monthsIn.addEventListener('input', function () { monthsOut.textContent = monthsIn.value + (monthsIn.value === '1' ? ' month' : ' months'); });

  /* ---------------------------------------------------------------- Calendar (an ARIA grid with roving focus) */
  var body = form.querySelector('[data-cal-body]');
  var title = form.querySelector('[data-cal-title]');
  var hint = form.querySelector('[data-cal-hint]');
  var prev = form.querySelector('[data-cal-prev]'), next = form.querySelector('[data-cal-next]');
  var focusDate = null;

  function firstOpenDay() {
    var d = new Date(state.view);
    if (d < floor) d = new Date(floor);
    return d;
  }
  function renderCal() {
    var y = state.view.getFullYear(), m = state.view.getMonth();
    title.textContent = state.view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    prev.disabled = new Date(y, m, 1) <= new Date(floor.getFullYear(), floor.getMonth(), 1);
    var first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
    body.textContent = '';
    var tr = document.createElement('tr');
    for (var i = 0; i < first; i++) tr.appendChild(document.createElement('td'));
    for (var d = 1; d <= days; d++) {
      var date = new Date(y, m, d), td = document.createElement('td'), b = document.createElement('button');
      td.setAttribute('role', 'gridcell');
      b.type = 'button';
      b.className = 'bk-day';
      b.textContent = d;
      b.dataset.time = date.getTime();
      var past = date < floor;
      b.disabled = past;
      var label = longFmt(date);
      var isStart = sameDay(date, state.start), isEnd = sameDay(date, state.end);
      if (isStart) label += ', check-in';
      if (isEnd) label += ', check-out';
      if (past) label += ', unavailable';
      b.setAttribute('aria-label', label);
      b.setAttribute('aria-pressed', String(isStart || isEnd));
      b.tabIndex = -1;
      if (state.start && state.end && date > state.start && date < state.end) td.className = 'is-in-range';
      if (isStart && state.end) td.className = 'is-start';
      if (isEnd) td.className = (td.className ? td.className + ' ' : '') + 'is-end';
      td.appendChild(b);
      tr.appendChild(td);
      if ((first + d) % 7 === 0 || d === days) { body.appendChild(tr); tr = document.createElement('tr'); }
    }
    Array.prototype.forEach.call(body.querySelectorAll('tr'), function (r) { r.setAttribute('role', 'row'); });
    hint.textContent = !state.start ? 'Select a check-in date.' : !state.end ? 'Select a check-out date.' :
      nights() + (nights() === 1 ? ' night: ' : ' nights: ') + fmt(state.start) + ' – ' + fmt(state.end) + '.';
  }
  function dayButton(date) { return body.querySelector('[data-time="' + date.getTime() + '"]'); }
  function focusDay(date) {
    if (date.getMonth() !== state.view.getMonth() || date.getFullYear() !== state.view.getFullYear()) {
      state.view = new Date(date.getFullYear(), date.getMonth(), 1);
      renderCal();
    }
    focusDate = date;
    Array.prototype.forEach.call(body.querySelectorAll('.bk-day'), function (b) { b.tabIndex = -1; });
    var b = dayButton(date);
    if (b) { b.tabIndex = 0; b.focus(); }
  }
  function pick(date) {
    if (date < floor) return;
    if (!state.start || (state.start && state.end) || date <= state.start) { state.start = date; state.end = null; }
    else state.end = date;
    renderCal();
    syncLabels();
    focusDay(date);
    if (state.end) announce('Check-out ' + longFmt(state.end) + '. ' + nights() + (nights() === 1 ? ' night.' : ' nights.'));
    else announce('Check-in ' + longFmt(state.start) + '. Now select a check-out date.');
  }
  body.addEventListener('click', function (e) {
    var b = e.target.closest('.bk-day');
    if (b && !b.disabled) pick(new Date(+b.dataset.time));
  });
  body.addEventListener('keydown', function (e) {
    var b = e.target.closest('.bk-day');
    if (!b) return;
    var d = new Date(+b.dataset.time), to = null;
    if (e.key === 'ArrowRight') to = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    else if (e.key === 'ArrowLeft') to = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
    else if (e.key === 'ArrowDown') to = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7);
    else if (e.key === 'ArrowUp') to = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7);
    else if (e.key === 'Home') to = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
    else if (e.key === 'End') to = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 6 - d.getDay());
    else if (e.key === 'PageDown') to = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
    else if (e.key === 'PageUp') to = new Date(d.getFullYear(), d.getMonth() - 1, d.getDate());
    if (!to) return;
    e.preventDefault();
    if (to < floor) to = new Date(floor);
    focusDay(to);
  });
  prev.addEventListener('click', function () { state.view = new Date(state.view.getFullYear(), state.view.getMonth() - 1, 1); renderCal(); });
  next.addEventListener('click', function () { state.view = new Date(state.view.getFullYear(), state.view.getMonth() + 1, 1); renderCal(); });
  form.querySelector('[data-cal-clear]').addEventListener('click', function () {
    state.start = state.end = null; renderCal(); syncLabels(); announce('Dates cleared.'); focusDay(firstOpenDay());
  });

  /* ---------------------------------------------------------------- Guests */
  Array.prototype.forEach.call(form.querySelectorAll('[data-step]'), function (row) {
    var key = row.getAttribute('data-step'), out = row.querySelector('[data-val]');
    var dec = row.querySelector('[data-dec]'), inc = row.querySelector('[data-inc]');
    function sync() {
      out.textContent = state[key];
      dec.disabled = state[key] <= 0;
      inc.disabled = state[key] >= (key === 'adults' ? 16 : 10);
      syncLabels();
    }
    dec.addEventListener('click', function () { state[key] = Math.max(0, state[key] - 1); sync(); if (dec.disabled) inc.focus(); });
    inc.addEventListener('click', function () {
      // a child needs an adult with them
      if (key === 'children' && state.adults === 0) { state.adults = 1; row.parentNode.querySelector('[data-step="adults"] [data-val]').textContent = 1; row.parentNode.querySelector('[data-step="adults"] [data-dec]').disabled = false; }
      state[key] += 1; sync(); if (inc.disabled) dec.focus();
    });
    sync();
  });

  /* ---------------------------------------------------------------- Labels and search */
  function syncLabels() {
    checkin.textContent = state.start ? fmt(state.start) : 'Add dates';
    checkout.textContent = state.end ? fmt(state.end) : 'Add dates';
    checkin.classList.toggle('is-set', !!state.start);
    checkout.classList.toggle('is-set', !!state.end);
    var g = guests();
    guestsLabel.textContent = g ? g + (g === 1 ? ' guest' : ' guests') : 'Add guests';
    guestsLabel.classList.toggle('is-set', g > 0);
  }
  var liveTimer;
  function announce(msg) { clearTimeout(liveTimer); status.textContent = ''; liveTimer = setTimeout(function () { status.textContent = msg; }, 60); }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    closePop(false);
    var place = where.value.trim() || 'Kyoto, Japan';
    var g = Math.max(1, guests());
    var n = nights();
    var list = STAYS.filter(function (s) { return parseInt(s.facts, 10) >= g; });
    cards.textContent = '';
    list.forEach(function (s, i) {
      var li = document.createElement('li'); li.className = 'bk-card';
      var img = document.createElement('img'); img.className = 'bk-card__img'; img.src = s.img; img.alt = s.alt; img.loading = 'lazy'; img.width = 400; img.height = 380;
      var h = document.createElement('h4'); h.id = 'bk-card-' + i; h.textContent = s.title;
      var p = document.createElement('p'); p.textContent = s.facts;
      var price = document.createElement('p'); price.className = 'bk-card__price';
      price.innerHTML = '<b>$' + s.price + '</b> night' + (n ? ' · $' + (s.price * n).toLocaleString('en-US') + ' total for ' + n + (n === 1 ? ' night' : ' nights') : '');
      var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'bk-reserve'; btn.textContent = 'Reserve';
      btn.setAttribute('aria-describedby', h.id);
      var note = document.createElement('p'); note.className = 'bk-card__note'; note.setAttribute('aria-live', 'polite');
      btn.addEventListener('click', function () {
        if (btn.getAttribute('aria-disabled') === 'true') return;
        btn.setAttribute('aria-disabled', 'true');
        btn.textContent = 'Request sent';
        note.textContent = 'This is not a confirmed booking - at least not yet. You’ll get a response within 24 hours.';
        setTimeout(function () {
          btn.textContent = 'Confirmed';
          note.textContent = 'Your reservation is confirmed. You’re going to ' + (place.split(',').pop().trim() || 'Japan') + '.';
        }, 2400);
      });
      li.appendChild(img); li.appendChild(h); li.appendChild(p); li.appendChild(price); li.appendChild(btn); li.appendChild(note);
      cards.appendChild(li);
    });
    results.hidden = false;
    announce(list.length + (list.length === 1 ? ' stay' : ' stays') + ' in ' + place + (n ? ', ' + n + (n === 1 ? ' night' : ' nights') : '') + ', for ' + g + (g === 1 ? ' guest.' : ' guests.'));
  });

  renderCal();
  syncLabels();
})();
