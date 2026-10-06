/* Dine In — site behaviour (test rebuild). No dependencies. */
(function () {
  'use strict';

  /* ---- Mobile menu ---------------------------------------------------- */
  var burger = document.querySelector('.burger');
  if (burger) {
    burger.addEventListener('click', function () {
      var open = document.body.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', open);
      burger.setAttribute('aria-label', open ? 'Close Menu' : 'Open Menu');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) burger.click();
    });
  }

  /* ---- Scroll reveal (the "Read Our Reviews" poster) ------------------ */
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.2 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---- FAQ accordions ------------------------------------------------- */
  document.querySelectorAll('.accordion button').forEach(function (btn) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      if (open) {
        panel.style.height = panel.scrollHeight + 'px';
        requestAnimationFrame(function () { panel.style.height = '0px'; });
      } else {
        panel.style.height = panel.scrollHeight + 'px';
        panel.addEventListener('transitionend', function done() {
          if (btn.getAttribute('aria-expanded') === 'true') panel.style.height = 'auto';
          panel.removeEventListener('transitionend', done);
        });
      }
    });
  });

  /* ---- Menu tabs ------------------------------------------------------ */
  var tabs = document.querySelectorAll('.menu-tabs [role="tab"]');
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab); });
    tab.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { var t = tabs[(i + d + tabs.length) % tabs.length]; t.focus(); selectTab(t); }
    });
  });
  function selectTab(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
  }

  /* ---- Product gallery ------------------------------------------------ */
  document.querySelectorAll('.gallery').forEach(function (g) {
    var main = g.querySelector('.gallery-main img');
    var thumbs = g.querySelectorAll('.gallery-thumbs button');
    var idx = 0;
    function show(i) {
      if (!thumbs.length) return;
      idx = (i + thumbs.length) % thumbs.length;
      main.src = thumbs[idx].dataset.full;
      thumbs.forEach(function (t, j) { t.setAttribute('aria-current', String(j === idx)); });
    }
    thumbs.forEach(function (t, i) { t.addEventListener('click', function () { show(i); }); });
    var prev = g.querySelector('.prev'), next = g.querySelector('.next');
    if (prev) prev.addEventListener('click', function () { show(idx - 1); });
    if (next) next.addEventListener('click', function () { show(idx + 1); });
  });

  /* ---- Quantity steppers ---------------------------------------------- */
  document.querySelectorAll('.qty').forEach(function (q) {
    var input = q.querySelector('input');
    q.querySelector('.dec').addEventListener('click', function () { input.value = Math.max(1, (+input.value || 1) - 1); });
    q.querySelector('.inc').addEventListener('click', function () { input.value = (+input.value || 0) + 1; });
  });

  /* ---- Cart (test version: stored in this browser only) --------------- */
  var CART_KEY = 'dinein-test-cart';
  function readCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; } }
  function writeCart(c) { try { localStorage.setItem(CART_KEY, JSON.stringify(c)); } catch (e) {} updateCartBadge(); }
  function updateCartBadge() {
    var n = readCart().reduce(function (s, i) { return s + i.qty; }, 0);
    document.querySelectorAll('.header-cart').forEach(function (el) {
      el.classList.toggle('has-items', n > 0);
      var c = el.querySelector('.count'); if (c) c.textContent = n;
    });
  }
  updateCartBadge();

  document.querySelectorAll('[data-add-to-cart]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var box = btn.closest('.product-info');
      var msg = box.querySelector('.added-msg');
      var price = parseFloat(btn.dataset.price);
      var name = btn.dataset.name;
      var select = box.querySelector('select');
      if (select) {
        if (!select.value) { msg.textContent = 'Please select a value.'; return; }
        price = parseFloat(select.value); name += ' — A$' + price.toFixed(2);
      }
      var qtyEl = box.querySelector('.qty input');
      var qty = qtyEl ? Math.max(1, +qtyEl.value || 1) : 1;
      var cart = readCart();
      var line = cart.filter(function (i) { return i.name === name; })[0];
      if (line) line.qty += qty; else cart.push({ name: name, price: price, qty: qty, img: btn.dataset.img });
      writeCart(cart);
      msg.innerHTML = 'Added to cart. <a href="' + btn.dataset.cart + '">View cart</a>';
    });
  });

  var cartList = document.getElementById('cartList');
  if (cartList) renderCart();
  function renderCart() {
    var cart = readCart();
    if (!cart.length) { cartList.innerHTML = '<p>You have nothing in your shopping cart. <a href="shop.html">Continue Shopping</a></p>'; return; }
    var total = 0;
    cartList.innerHTML = cart.map(function (i, n) {
      total += i.price * i.qty;
      return '<div class="cart-row"><img src="' + i.img + '" alt=""><div>' + i.name + '<br><small>Qty ' + i.qty +
        '</small></div><div>A$' + (i.price * i.qty).toFixed(2) + '</div><button type="button" data-remove="' + n + '">Remove</button></div>';
    }).join('') + '<p class="cart-total">Subtotal A$' + total.toFixed(2) + '</p>' +
      '<p class="text-small" style="text-align:right">Checkout is disabled in this test version.</p>';
    cartList.querySelectorAll('[data-remove]').forEach(function (b) {
      b.addEventListener('click', function () { var c = readCart(); c.splice(+b.dataset.remove, 1); writeCart(c); renderCart(); });
    });
  }

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Booking enquiry: three steps, pre-filled from the URL ---------- */
  /* Links can pre-select an experience and fill the date and guest count:
     book.html?exp=private-dining&date=2026-12-12&guests=8  (exp may be a
     comma-separated list of the data-key values on the experience tiles). */
  var booking = document.querySelector('[data-booking]');
  if (booking) {
    var steps = [].slice.call(booking.querySelectorAll('.step'));
    var progress = booking.querySelectorAll('[data-progress]');
    var current = 0;
    var params = new URLSearchParams(location.search);
    var aliases = { 'private dining': 'private-dining', degustation: 'degustation', classes: 'cooking-classes', banquet: 'party-packs', banquets: 'party-packs', grazing: 'grazing-boards', wedding: 'wedding', weddings: 'wedding' };
    (params.get('exp') || '').split(',').forEach(function (k) {
      k = k.trim().toLowerCase(); k = aliases[k] || k;
      var box = booking.querySelector('[data-key="' + k + '"]');
      if (box) box.checked = true;
    });
    var dateEl = booking.querySelector('#date');
    if (dateEl) {
      var today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
      dateEl.min = today.toISOString().slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(params.get('date') || '')) dateEl.value = params.get('date');
    }
    if (+params.get('guests') > 0) booking.querySelector('#guests').value = Math.round(+params.get('guests'));
    // Landing-page attribution: ?src=weddings&occasion=Wedding&package=1
    var srcEl = booking.querySelector('#source'), occEl = booking.querySelector('#occasion');
    if (srcEl && params.get('src')) srcEl.value = params.get('src').slice(0, 40);
    if (occEl && params.get('occasion')) occEl.value = params.get('occasion').slice(0, 80);
    var msg = booking.querySelector('#message');
    if (msg && params.get('package') === '1' && !msg.value) msg.value = 'Please send me the wedding package.';
    var flexible = booking.querySelector('#flexible');
    if (flexible) flexible.addEventListener('change', function () { dateEl.disabled = flexible.checked; });

    function validStep(step) {
      var ok = true;
      var group = step.matches('[data-group-required]') ? step : null;
      if (group) {
        var any = !!group.querySelector('input[name="experience"]:checked');
        group.classList.toggle('invalid', !any);
        if (!any) ok = false;
      }
      step.querySelectorAll('input[required], textarea[required], select[required]').forEach(function (el) {
        var v = el.value.trim();
        var good = v !== '' && el.checkValidity();
        if (el.type === 'tel') good = good && v.replace(/\D/g, '').length >= 8;
        var wrap = el.closest('.field') || el.parentElement;
        wrap.classList.toggle('invalid', !good);
        el.setAttribute('aria-invalid', String(!good));
        if (!good) ok = false;
      });
      if (!ok) {
        var first = step.querySelector('.invalid input, .invalid textarea, [data-group-required].invalid input');
        if (first) first.focus({ preventScroll: true });
        (step.querySelector('.invalid') || step).scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      }
      return ok;
    }
    // Clear an error as soon as the visitor fixes it
    booking.addEventListener('input', function (e) {
      var wrap = e.target.closest('.invalid');
      if (!wrap) return;
      if (e.target.name === 'experience' ? booking.querySelector('input[name="experience"]:checked') : e.target.checkValidity() && e.target.value.trim()) {
        wrap.classList.remove('invalid'); e.target.removeAttribute('aria-invalid');
      }
    });
    booking.addEventListener('change', function (e) { if (e.target.name === 'experience') { var g = e.target.closest('.invalid'); if (g) g.classList.remove('invalid'); } });

    function show(i) {
      current = Math.max(0, Math.min(steps.length - 1, i));
      steps.forEach(function (st, j) { st.classList.toggle('is-current', j === current); });
      progress.forEach(function (li, j) {
        li.classList.toggle('is-active', j === current);
        li.classList.toggle('is-done', j < current);
        if (j === current) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      });
      if (current === steps.length - 1) fillSummary();
      var legend = steps[current].querySelector('legend');
      booking.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      if (legend) { legend.tabIndex = -1; legend.focus({ preventScroll: true }); }
    }
    function chosen() {
      return [].map.call(booking.querySelectorAll('input[name="experience"]:checked'), function (b) { return b.value; });
    }
    function fillSummary() {
      var d = dateEl && dateEl.value ? new Date(dateEl.value + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : '';
      if (flexible && flexible.checked) d = d ? d + ' (flexible)' : 'Flexible';
      var rows = [['Experience', chosen().join(', ')], ['Date', d || 'Not set yet'], ['Guests', booking.querySelector('#guests').value], ['Location', booking.querySelector('#location').value]];
      if (occEl && occEl.value) rows.unshift(['Occasion', occEl.value]);
      booking.querySelector('[data-summary]').innerHTML = rows.map(function (r) {
        var dd = document.createElement('dd'); dd.textContent = r[1];
        return '<dt>' + r[0] + '</dt>' + dd.outerHTML;
      }).join('');
    }
    booking.querySelectorAll('[data-next]').forEach(function (b) { b.addEventListener('click', function () { if (validStep(steps[current])) show(current + 1); }); });
    booking.querySelectorAll('[data-back]').forEach(function (b) { b.addEventListener('click', function () { show(current - 1); }); });
    booking.querySelectorAll('[data-goto]').forEach(function (b) { b.addEventListener('click', function () { show(+b.dataset.goto - 1); }); });
    booking.addEventListener('submit', function (e) {
      e.preventDefault();
      // Without the stepper (e.g. JS on but CSS failed) validate every step
      for (var i = 0; i < steps.length; i++) { if (!validStep(steps[i])) { show(i); return; } }
      booking.querySelector('#subject').value = chosen().join(', ') + ' for ' + booking.querySelector('#guests').value + ' guests';
      var done = booking.nextElementSibling;
      var name = booking.querySelector('#fname').value.trim();
      done.querySelector('[data-name]').textContent = name ? ', ' + name : '';
      booking.classList.add('is-sent');
      done.focus();
      done.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
  }

  /* ---- Landing-page budget estimator --------------------------------- */
  /* Options carry data-price ("110", "6-8" or "grazing"), data-unit ("pp" or
     "canape"), data-min (minimum guests) and data-waitress. Waitress service
     applies above six guests: $135 for the first 2 hours, then $25 an hour. */
  var money = function (n) { return '$' + Math.round(n).toLocaleString('en-AU'); };
  document.querySelectorAll('[data-estimator]').forEach(function (form) {
    var pkg = form.querySelector('[name="pkg"]'), guests = form.querySelector('[name="guests"]');
    var each = form.querySelector('[name="each"]'), hours = form.querySelector('[name="hours"]');
    var out = { total: form.querySelector('[data-total]'), lines: form.querySelector('[data-lines]'), warn: form.querySelector('[data-warn]') };
    var cta = form.querySelector('[data-estimate-cta]');
    function grazingRate(g) { return g <= 4 ? 35 : g <= 10 ? 30 : 28; }
    function calc() {
      var o = pkg.options[pkg.selectedIndex];
      var min = +o.dataset.min || 1, unit = o.dataset.unit, waitress = o.dataset.waitress === 'true';
      var g = Math.max(1, Math.round(+guests.value || 0)), billed = Math.max(g, min);
      form.querySelector('[data-canapes]').hidden = unit !== 'canape';
      var lo, hi, lines = [], warn = '';
      if (o.dataset.price === 'grazing') {
        lo = hi = billed * grazingRate(billed);
        lines.push(billed + ' guests × ' + money(grazingRate(billed)) + ' grazing = ' + money(lo));
      } else {
        var r = o.dataset.price.split('-').map(Number), a = r[0], b = r[1] || r[0];
        var per = unit === 'canape' ? Math.max(6, Math.round(+each.value || 6)) : 1;
        lo = billed * per * a; hi = billed * per * b;
        lines.push(billed + ' guests' + (unit === 'canape' ? ' × ' + per + ' canapés' : '') + ' × ' + (a === b ? money(a) : money(a) + '–' + money(b)) + ' = ' + (lo === hi ? money(lo) : money(lo) + '–' + money(hi)));
      }
      var needsStaff = waitress && billed > 6;
      form.querySelector('[data-hours]').hidden = !needsStaff;
      if (needsStaff) {
        var h = Math.max(2, Math.round(+hours.value || 2)), staff = 135 + (h - 2) * 25;
        lo += staff; hi += staff;
        lines.push('Waitress service, ' + h + ' hours = ' + money(staff));
      }
      if (g < min) warn = 'Minimum ' + min + ' guests, so this is priced for ' + min + '.';
      out.total.textContent = lo === hi ? money(lo) : money(lo) + '–' + money(hi);
      out.lines.textContent = lines.join('\n');
      out.warn.textContent = warn;
      var label = o.dataset.label.replace(/\s*\(.*\)$/, '');
      cta.href = 'book.html?exp=' + encodeURIComponent(o.value) + '&guests=' + billed + '&src=' + encodeURIComponent(form.dataset.src) + '&occasion=' + encodeURIComponent(label);
      return { lo: lo, hi: hi };
    }
    form.addEventListener('input', calc);
    form.addEventListener('change', calc);
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    form.calc = calc;
    calc();
  });

  /* ---- Sticky booking bar: appears once the visitor is past the top --- */
  var bar = document.querySelector('[data-sticky-bar]');
  if (bar && !document.querySelector('[data-booking]')) {
    var hero = document.querySelector('.hero, .site-header');
    var ticking = false;
    var onScroll = function () {
      var show = window.scrollY > (hero ? hero.offsetTop + hero.offsetHeight : 400);
      bar.classList.toggle('is-visible', show);
      if (show) bar.removeAttribute('inert'); else bar.setAttribute('inert', '');
      ticking = false;
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();
  }

  /* ---- Decorative looping video: honour reduced motion ---------------- */
  document.querySelectorAll('video[data-motion-video]').forEach(function (v) {
    if (reduceMotion) { v.removeAttribute('autoplay'); v.pause(); }
  });

  /* ---- Experiences: filter chips, picker, compare table, details dialog */
  var expGrid = document.querySelector('[data-exp-grid]');
  if (expGrid) {
    var cards = [].slice.call(expGrid.querySelectorAll('.exp-card'));
    var chipsEls = document.querySelectorAll('[data-filter]');
    var status = document.querySelector('[data-exp-status]');
    var applyFilter = function (type, push) {
      var shown = 0;
      cards.forEach(function (c) { var on = type === 'all' || c.dataset.category === type; c.hidden = !on; if (on) shown++; });
      chipsEls.forEach(function (ch) { ch.setAttribute('aria-pressed', String(ch.dataset.filter === type)); });
      status.textContent = 'Showing ' + shown + ' of ' + cards.length;
      if (push) {
        var u = new URL(location.href);
        if (type === 'all') u.searchParams.delete('type'); else u.searchParams.set('type', type);
        u.hash = ''; history.replaceState(null, '', u);
      }
    };
    chipsEls.forEach(function (ch) { ch.addEventListener('click', function () { applyFilter(ch.dataset.filter, true); }); });
    var startType = new URLSearchParams(location.search).get('type');
    if (startType && document.querySelector('[data-filter="' + startType + '"]')) applyFilter(startType, false);

    // Compare table toggle
    var cmpBtn = document.querySelector('.compare-toggle'), cmp = document.getElementById('compare');
    if (cmpBtn && cmp) cmpBtn.addEventListener('click', function () {
      var open = cmp.classList.toggle('is-open');
      cmpBtn.setAttribute('aria-expanded', String(open));
      cmpBtn.textContent = open ? 'Hide comparison' : 'Compare all six';
    });

    // Details: in-page sections without JS, a native <dialog> with it
    var dialog = document.getElementById('exp-dialog');
    if (dialog && typeof dialog.showModal === 'function') {
      var dBody = dialog.querySelector('[data-dialog-body]'), lastTrigger = null;
      document.querySelectorAll('[data-details]').forEach(function (a) {
        a.addEventListener('click', function (e) {
          var src = document.getElementById('details-' + a.dataset.details);
          if (!src) return;
          e.preventDefault();
          lastTrigger = a;
          var copy = src.cloneNode(true);
          copy.removeAttribute('id');
          var h = copy.querySelector('h3'); if (h) { h.id = 'exp-dialog-title'; }
          copy.removeAttribute('aria-labelledby');
          dBody.innerHTML = ''; dBody.appendChild(copy);
          dialog.showModal();
          dialog.scrollTop = 0;
        });
      });
      dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
      dialog.addEventListener('close', function () { if (lastTrigger) lastTrigger.focus(); });
    }

    // "Which experience suits me?" picker. Rules use the site's own minimums:
    // hands-on -> class (min 6); standing -> canapés at 20+, else grazing;
    // shared -> banquet at 12+, else private dining; seated -> private dining,
    // with the degustation as runner-up.
    var picker = document.querySelector('[data-picker]');
    if (picker) {
      var result = picker.querySelector('[data-picker-result]');
      var INFO = {
        'private-dining': { name: 'Private Dining', price: 'from $95 per person', why: 'A restaurant-quality meal in your home or venue, seated and served.', min: 6, minText: 'Minimum 6 guests (or equivalent minimum charge).' },
        'degustation': { name: '5 Course Degustation', price: 'from $130 per person', why: 'Five refined courses for a milestone or a special night.', min: 6 },
        'cooking-classes': { name: 'Private Cooking Class', price: 'from $110 per person', why: 'Cook, learn and eat together, with every ingredient included.', min: 6, minText: 'Classes have a minimum of 6 guests.' },
        'party-packs': { name: 'Banquets', price: '$110 per person', why: 'A relaxed shared feast served to the centre of the table.', min: 12, minText: 'Banquets are for 12 or more guests.' },
        'canapes': { name: 'Canapés', price: '$6–8 per canapé', why: 'Chef-made canapés that keep guests mingling.', min: 20, minText: 'Canapés have a minimum of 20 guests.' },
        'grazing-boards': { name: 'Grazing Boards', price: 'from $28 per person', why: 'Styled boards for a relaxed, graze-as-you-go event.', min: 1 }
      };
      var choose = function (style, guests) {
        if (style === 'hands-on') return ['cooking-classes', 'private-dining'];
        if (style === 'standing') return guests >= 20 ? ['canapes', 'grazing-boards'] : ['grazing-boards', 'canapes'];
        if (style === 'shared') return guests >= 12 ? ['party-packs', 'grazing-boards'] : ['private-dining', 'grazing-boards'];
        return ['private-dining', 'degustation'];
      };
      // Lowest head count in each guest bucket (up to 6 / 7–11 / 12–19 / 20+).
      var FLOOR = { 6: 1, 10: 7, 15: 12, 25: 20 };
      var render = function (e) {
        var v = function (n) { var c = picker.querySelector('input[name="' + n + '"]:checked'); return c ? c.value : ''; };
        var occasion = v('occasion'), guests = +v('guests'), style = v('style');
        if (occasion === 'learn' && e && e.target.name === 'occasion') {
          var hands = picker.querySelector('input[name="style"][value="hands-on"]');
          hands.checked = true; style = 'hands-on';
        }
        if (!guests || !style) { result.hidden = true; return; }
        var picks = choose(style, guests);
        cards.forEach(function (c) { c.classList.toggle('is-recommended', c.id === picks[0]); });
        var extra = occasion === 'wedding' ? '<a class="text-link" href="weddings.html">Wedding catering options</a>'
          : occasion === 'work' ? '<a class="text-link" href="corporate-events.html">Corporate event options</a>' : '';
        result.innerHTML = picks.map(function (id, i) {
          var info = INFO[id];
          var img = (document.querySelector('#' + id + ' img') || {}).getAttribute ? document.querySelector('#' + id + ' img').getAttribute('src') : '';
          var note = FLOOR[guests] < info.min && info.minText ? '<p class="pick-note">' + info.minText + '</p>' : '';
          var href = 'book.html?exp=' + id + '&guests=' + guests + '&src=experiences-picker' + (occasion ? '&occasion=' + encodeURIComponent(picker.querySelector('input[name="occasion"]:checked').nextElementSibling.textContent) : '');
          return '<div class="pick' + (i ? ' pick--alt' : '') + '"><img src="' + img + '" alt=""><div><span class="label">' + (i ? 'Also consider' : 'Best match') + '</span><h3>' + info.name + '</h3><p>' + info.why + ' ' + info.price + '.</p>' + note + '</div>' +
            '<div class="actions">' + (i ? '' : '<a class="btn" href="' + href + '" data-cta="exp-picker-' + id + '">Check your date</a>') + '<a class="text-link" href="#' + id + '">See ' + info.name + '</a>' + (i ? '' : extra) + '</div></div>';
        }).join('');
        result.hidden = false;
      };
      picker.addEventListener('change', render);
      picker.addEventListener('submit', function (e) { e.preventDefault(); });
    }
  }

  /* ---- Menu: open a tab from the URL hash (menu.html#banquet) --------- */
  if (document.querySelector('.menu-tabs')) {
    var openHashTab = function () {
      var tab = location.hash && document.querySelector('.menu-tabs [data-slug="' + location.hash.slice(1) + '"]');
      if (tab) tab.click();
    };
    openHashTab();
    window.addEventListener('hashchange', openHashTab);
  }

  /* ---- Featured video (HLS stream from the live site's video CDN) ----- */
  var video = document.querySelector('video[data-hls]');
  if (video) {
    var src = video.dataset.hls;
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    } else {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';
      s.onload = function () {
        if (window.Hls && window.Hls.isSupported()) { var h = new window.Hls(); h.loadSource(src); h.attachMedia(video); }
      };
      document.head.appendChild(s);
    }
  }
})();
