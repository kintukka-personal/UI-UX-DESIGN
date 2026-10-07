/* Dine In — site behaviour (test rebuild). No dependencies. */
(function () {
  'use strict';
  var FORMS = window.DINE_IN_FORMS || {};

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
  // openPanel(btn, open, instant): instant skips the height animation (used by
  // FAQ search, Expand all and deep links).
  function openPanel(btn, open, instant) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    if ((btn.getAttribute('aria-expanded') === 'true') === open) return;
    btn.setAttribute('aria-expanded', String(open));
    if (instant || reduceMotion) { panel.style.height = open ? 'auto' : '0px'; return; }
    if (!open) {
      panel.style.height = panel.scrollHeight + 'px';
      requestAnimationFrame(function () { panel.style.height = '0px'; });
    } else {
      panel.style.height = panel.scrollHeight + 'px';
      panel.addEventListener('transitionend', function done() {
        if (btn.getAttribute('aria-expanded') === 'true') panel.style.height = 'auto';
        panel.removeEventListener('transitionend', done);
      });
    }
  }
  document.querySelectorAll('.accordion button').forEach(function (btn) {
    btn.addEventListener('click', function () { openPanel(btn, btn.getAttribute('aria-expanded') !== 'true'); });
  });

  /* ---- Menu tabs ------------------------------------------------------ */
  var tabs = document.querySelectorAll('.menu-tabs [role="tab"]');
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab, true); });
    tab.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { var t = tabs[(i + d + tabs.length) % tabs.length]; t.focus(); selectTab(t, true); }
    });
  });
  // All panels are visible in the HTML (so the page works without JS); show one.
  function selectTab(tab, push) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (push && tab.dataset.slug && history.replaceState) history.replaceState(null, '', location.pathname + location.search + '#' + tab.dataset.slug);
    if (tab.scrollIntoView && tab.parentNode.scrollWidth > tab.parentNode.clientWidth) tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  if (tabs.length) selectTab(document.querySelector('.menu-tabs [aria-selected="true"]') || tabs[0]);

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

  /* ---- eGift card: occasion, amount, personalise, live preview ------- */
  var giftForm = document.querySelector('[data-gift-form]');
  if (giftForm) {
    var OCCASIONS = {
      birthday: ['Happy birthday', 'Happy birthday! Enjoy a night in with Chef Brooke.'],
      anniversary: ['Happy anniversary', 'Here’s to us. A special night in, cooked by Chef Brooke.'],
      'thank-you': ['Thank you', 'A small thank you for everything. Enjoy a Dine In experience.'],
      christmas: ['Merry Christmas', 'Merry Christmas! A night of great food, without the washing up.'],
      'just-because': ['Just because', 'Just because you deserve a night off from the kitchen.']
    };
    var gp = new URLSearchParams(location.search);
    var giftSrc = (gp.get('src') || '').replace(/[^a-z0-9-]/gi, '').slice(0, 30);
    var gMsg = giftForm.querySelector('#gift-message');
    var gDate = giftForm.querySelector('#gift-date');
    var gStatus = giftForm.querySelector('[data-gift-status]');
    var gSubmit = giftForm.querySelector('[data-gift-submit]');
    var amountGroup = giftForm.querySelector('[data-amount-group]');
    var preview = document.querySelector('[data-gift-preview]');
    var pv = function (k) { return preview.querySelector('[data-preview="' + k + '"]'); };
    var msgTouched = false;
    var gVal = function (n) { var c = giftForm.querySelector('input[name="' + n + '"]:checked'); return c ? c.value : ''; };
    if (gDate) {
      var gToday = new Date(); gToday.setMinutes(gToday.getMinutes() - gToday.getTimezoneOffset());
      gDate.min = gToday.toISOString().slice(0, 10);
    }
    var pick = function (name, value) {
      var r = giftForm.querySelector('input[name="' + name + '"][value="' + String(value).replace(/[^a-z0-9-]/gi, '') + '"]');
      if (r) r.checked = true;
    };
    pick('amount', gp.get('amount') || '');
    pick('occasion', gp.get('occasion') || '');

    var giftUpdate = function (e) {
      var occ = OCCASIONS[gVal('occasion')];
      if (e && e.target.name === 'occasion' && occ && !msgTouched) gMsg.value = occ[1];
      if (!e && occ && !gMsg.value) gMsg.value = occ[1];
      var amount = gVal('amount');
      pv('headline').textContent = occ ? occ[0] : 'Here’s a gift!';
      pv('amount').textContent = amount ? 'A$' + amount : 'from A$50';
      pv('to').textContent = giftForm.querySelector('#gift-to').value.trim() || 'someone special';
      var from = giftForm.querySelector('#gift-from').value.trim();
      pv('from').textContent = from;
      preview.querySelector('[data-preview-line="from"]').hidden = !from;
      pv('message').textContent = gMsg.value.trim();
      pv('message').hidden = !gMsg.value.trim();
      preview.querySelector('.gift-card-art').dataset.occasion = gVal('occasion');
      giftForm.querySelector('[data-gift-count]').textContent = gMsg.value.length + ' / 200';
      gSubmit.textContent = amount ? 'Add gift card — A$' + amount : 'Add gift card';
      if (amount) amountGroup.classList.remove('invalid');
    };
    gMsg.addEventListener('input', function () { msgTouched = gMsg.value.length > 0; });
    giftForm.addEventListener('input', giftUpdate);
    giftForm.addEventListener('change', giftUpdate);
    giftUpdate();

    giftForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var amount = +gVal('amount');
      if (!amount) {
        amountGroup.classList.add('invalid');
        giftForm.querySelector('input[name="amount"]').focus();
        gStatus.textContent = '';
        return;
      }
      var field = function (id) { return giftForm.querySelector(id).value.trim(); };
      var cart = readCart();
      cart.push({
        name: 'eGift Card — A$' + amount.toFixed(2), price: amount, qty: 1, img: 'assets/images/shop-egift-card.webp',
        gift: { occasion: gVal('occasion'), to: field('#gift-to'), from: field('#gift-from'), message: field('#gift-message'), email: field('#gift-email'), date: gDate.value, src: giftSrc }
      });
      writeCart(cart);
      gStatus.innerHTML = 'Added to cart. <a href="../cart.html">View cart</a> · <button type="button" class="text-link" data-gift-again>Add another gift</button>';
      gStatus.querySelector('[data-gift-again]').addEventListener('click', function () {
        giftForm.reset(); msgTouched = false; gStatus.textContent = ''; giftUpdate();
        giftForm.querySelector('input[name="occasion"]').focus();
      });
    });
  }

  // Cart lines include text people typed (gift messages), so escape everything.
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function giftDetails(g) {
    if (!g) return '';
    var parts = [];
    if (g.to) parts.push('For ' + g.to);
    if (g.from) parts.push('From ' + g.from);
    if (/^\d{4}-\d{2}-\d{2}$/.test(g.date || '')) parts.push('Send on ' + new Date(g.date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }));
    if (g.email) parts.push('To ' + g.email);
    return (parts.length ? '<span class="cart-gift">' + esc(parts.join(' · ')) + '</span>' : '') +
      (g.message ? '<span class="cart-gift cart-gift-msg">“' + esc(g.message) + '”</span>' : '');
  }
  var cartList = document.getElementById('cartList');
  if (cartList) renderCart();
  function renderCart() {
    var cart = readCart();
    if (!cart.length) { cartList.innerHTML = '<p>You have nothing in your shopping cart. <a href="shop.html">Continue Shopping</a></p>'; return; }
    var total = 0;
    cartList.innerHTML = cart.map(function (i, n) {
      total += i.price * i.qty;
      return '<div class="cart-row"><img src="' + esc(i.img) + '" alt=""><div>' + esc(i.name) + '<br><small>Qty ' + i.qty +
        '</small>' + giftDetails(i.gift) + '</div><div>A$' + (i.price * i.qty).toFixed(2) + '</div><button type="button" data-remove="' + n + '">Remove</button></div>';
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
    // Menu page: ?menu=banquet ("Enquire with this menu") and ?dishes=… (the shortlist)
    var menuSlug = (params.get('menu') || '').replace(/[^a-z-]/g, '').slice(0, 20);
    if (srcEl && menuSlug) srcEl.value = (srcEl.value || 'menu') + ':' + menuSlug;
    // Contact page hand-off: ?name=Sam Taylor fills first and last name
    var fullName = (params.get('name') || '').trim().slice(0, 80).split(/\s+/).filter(Boolean);
    var fEl = booking.querySelector('#fname'), lEl = booking.querySelector('#lname');
    if (fullName.length && fEl && !fEl.value) fEl.value = fullName[0];
    if (fullName.length > 1 && lEl && !lEl.value) lEl.value = fullName.slice(1).join(' ');
    var hasGift = params.get('gift') === '1';
    if (msg && hasGift && !msg.value) msg.value = 'I have a Dine In gift card.';
    if (msg && params.get('dishes') && !msg.value) msg.value = ('Dishes I\'d love: ' + params.get('dishes')).slice(0, 600);
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
      if (hasGift) rows.push(['Gift card', 'Yes']);
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
      var subject = chosen().join(', ') + ' for ' + booking.querySelector('#guests').value + ' guests';
      booking.querySelector('#subject').value = subject;
      booking.querySelector('#mail-subject').value = 'Booking enquiry: ' + subject;
      var done = booking.nextElementSibling;
      var name = booking.querySelector('#fname').value.trim();
      var showDone = function () {
        done.querySelector('[data-name]').textContent = name ? ', ' + name : '';
        booking.classList.add('is-sent');
        done.focus();
        done.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      };
      if (booking.querySelector('[name="_gotcha"]').value) { showDone(); return; }
      var status = booking.querySelector('[data-send-status]');
      if (!FORMS.booking) {
        var val = function (id) { var el = booking.querySelector(id); return el ? el.value.trim() : ''; };
        var lines = [['Experience', chosen().join(', ')], ['Date', val('#date') || 'Not set yet'], ['Flexible date', booking.querySelector('#flexible').checked ? 'Yes' : ''],
          ['Guests', val('#guests')], ['Location', val('#location')], ['Occasion', val('#occasion')], ['Name', name + ' ' + val('#lname')],
          ['Mobile', val('#phone')], ['Email', val('#email')], ['Message', val('#message')], ['Source', val('#source')]];
        var body = lines.filter(function (l) { return l[1]; }).map(function (l) { return l[0] + ': ' + l[1]; }).join('\n');
        booking.dataset.mailto = 'mailto:dineinbybrooke@gmail.com?subject=' + encodeURIComponent('Booking enquiry: ' + subject) + '&body=' + encodeURIComponent(body);
        sendStatus(status, 'Your email app has opened with your enquiry ready to send. Press send there, or call Brooke on 0432 804 952.', false);
        window.location.href = booking.dataset.mailto;
        return;
      }
      postForm(booking, FORMS.booking, status, showDone);
    });
  }

  /* ---- Sending forms (Formspree endpoints in assets/js/forms-config.js) */
  function sendStatus(el, text, isError) {
    el.textContent = text;
    el.classList.toggle('is-error', !!isError);
    el.hidden = !text;
  }
  function postForm(form, url, status, onSent) {
    var btn = form.querySelector('button[type="submit"]'), label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Sending…';
    sendStatus(status, '', false);
    var reset = function () { btn.disabled = false; btn.textContent = label; };
    fetch(url, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); reset(); onSent(); })
      .catch(function () {
        reset();
        sendStatus(status, 'Sorry, that didn’t send. Please try again, or email dineinbybrooke@gmail.com or call 0432 804 952. Your answers are still here.', true);
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
  // It starts only when scrolled into view, so it costs nothing above the fold.
  document.querySelectorAll('video[data-motion-video]').forEach(function (v) {
    v.removeAttribute('autoplay');
    if (reduceMotion) { v.pause(); return; }
    var play = function () { var p = v.play(); if (p && p.catch) p.catch(function () {}); };
    if (!('IntersectionObserver' in window)) { play(); return; }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) play(); else v.pause(); });
    }, { rootMargin: '100px 0px' }).observe(v);
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

  }

  /* ---- "Which experience suits me?" picker (Experiences + homepage) --- */
  // "Which experience suits me?" picker. Rules use the site's own minimums:
  // hands-on -> class (min 6); standing -> canapés at 20+, else grazing;
  // shared -> banquet at 12+, else private dining; seated -> private dining,
  // with the degustation as runner-up.
  var picker = document.querySelector('[data-picker]');
  if (picker) {
    var result = picker.querySelector('[data-picker-result]');
    var pickCards = document.querySelectorAll('.exp-card');
    var pickSrc = picker.getAttribute('data-picker-src') || 'experiences-picker';
    var pickBase = picker.getAttribute('data-picker-base') || '';
    var INFO = {
      'private-dining': { img: 'assets/images/exp-private-dining-480.webp', name: 'Private Dining', price: 'from $95 per person', why: 'A restaurant-quality meal in your home or venue, seated and served.', min: 6, minText: 'Minimum 6 guests (or equivalent minimum charge).' },
      'degustation': { img: 'assets/images/exp-degustation-480.webp', name: '5 Course Degustation', price: 'from $130 per person', why: 'Five refined courses for a milestone or a special night.', min: 6 },
      'cooking-classes': { img: 'assets/images/exp-cooking-classes-480.webp', name: 'Private Cooking Class', price: 'from $110 per person', why: 'Cook, learn and eat together, with every ingredient included.', min: 6, minText: 'Classes have a minimum of 6 guests.' },
      'party-packs': { img: 'assets/images/exp-banquets-480.webp', name: 'Banquets', price: '$110 per person', why: 'A relaxed shared feast served to the centre of the table.', min: 12, minText: 'Banquets are for 12 or more guests.' },
      'canapes': { img: 'assets/images/exp-canapes-480.webp', name: 'Canapés', price: '$6–8 per canapé', why: 'Chef-made canapés that keep guests mingling.', min: 20, minText: 'Canapés have a minimum of 20 guests.' },
      'grazing-boards': { img: 'assets/images/exp-grazing-boards-480.webp', name: 'Grazing Boards', price: 'from $28 per person', why: 'Styled boards for a relaxed, graze-as-you-go event.', min: 1 }
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
      [].forEach.call(pickCards, function (c) { c.classList.toggle('is-recommended', c.id === picks[0]); });
      var extra = occasion === 'wedding' ? '<a class="text-link" href="weddings.html">Wedding catering options</a>'
        : occasion === 'work' ? '<a class="text-link" href="corporate-events.html">Corporate event options</a>' : '';
      result.innerHTML = picks.map(function (id, i) {
        var info = INFO[id];
        var img = info.img;
        var note = FLOOR[guests] < info.min && info.minText ? '<p class="pick-note">' + info.minText + '</p>' : '';
        var href = 'book.html?exp=' + id + '&guests=' + guests + '&src=' + pickSrc + (occasion ? '&occasion=' + encodeURIComponent(picker.querySelector('input[name="occasion"]:checked').nextElementSibling.textContent) : '');
        return '<div class="pick' + (i ? ' pick--alt' : '') + '"><img src="' + img + '" alt=""><div><span class="label">' + (i ? 'Also consider' : 'Best match') + '</span><h3>' + info.name + '</h3><p>' + info.why + ' ' + info.price + '.</p>' + note + '</div>' +
          '<div class="actions">' + (i ? '' : '<a class="btn" href="' + href + '" data-cta="' + pickSrc + '-' + id + '">Check your date</a>') + '<a class="text-link" href="' + pickBase + '#' + id + '">See ' + info.name + '</a>' + (i ? '' : extra) + '</div></div>';
      }).join('');
      result.hidden = false;
    };
    picker.addEventListener('change', render);
    picker.addEventListener('submit', function (e) { e.preventDefault(); });
  }

  /* ---- Menu: open a tab from the URL hash (menu.html#banquet) --------- */
  if (document.querySelector('.menu-tabs')) {
    var openHashTab = function (e) {
      var slug = location.hash.slice(1);
      var tab = slug && document.querySelector('.menu-tabs [data-slug="' + slug.replace(/[^a-z-]/g, '') + '"]');
      if (!tab) return;
      selectTab(tab);
      var head = document.getElementById(slug);
      if (e && head) head.scrollIntoView({ block: 'start' });
    };
    openHashTab();
    window.addEventListener('hashchange', openHashTab);

    var printBtn = document.querySelector('[data-menu-print]');
    if (printBtn && window.print) {
      printBtn.hidden = false;
      printBtn.addEventListener('click', function () { document.body.classList.add('print-one'); window.print(); });
      window.addEventListener('afterprint', function () { document.body.classList.remove('print-one'); });
    }
  }

  /* ---- Menu shortlist: + dishes, tray, hand-off to the booking form --- */
  var shortlist = document.querySelector('[data-shortlist]');
  if (shortlist) {
    var SL_KEY = 'dinein-shortlist';
    var dishes = {}, order = [];
    document.querySelectorAll('.menu-item[data-dish]').forEach(function (li) { dishes[li.dataset.dish] = li; order.push(li.dataset.dish); });
    var panelOf = function (id) { return dishes[id].closest('.menu-panel'); };
    var menuLabel = function (panel) { var t = document.getElementById(panel.getAttribute('aria-labelledby')); return t ? t.querySelector('.tab-name').textContent : panel.dataset.slug; };
    var slPicks = [];
    try { slPicks = JSON.parse(localStorage.getItem(SL_KEY)) || []; } catch (e) {}
    slPicks = Array.isArray(slPicks) ? slPicks.filter(function (id) { return dishes[id]; }) : [];
    var save = function () { try { localStorage.setItem(SL_KEY, JSON.stringify(slPicks)); } catch (e) {} };
    var slStatus = document.querySelector('[data-shortlist-status]');
    var list = shortlist.querySelector('[data-shortlist-list]');
    var send = shortlist.querySelector('[data-shortlist-send]');
    var view = shortlist.querySelector('[data-shortlist-view]');
    var body = shortlist.querySelector('.shortlist-body');
    var slCta = document.querySelector('[data-shortlist-cta]');
    var PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
    var TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

    order.forEach(function (id) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'shortlist-add';
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-label', 'Shortlist ' + dishes[id].dataset.name);
      b.addEventListener('click', function () { slToggle(id); });
      dishes[id].appendChild(b);
    });

    var slHref = function () {
      var exps = [], groups = [];
      slPicks.slice().sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); }).forEach(function (id) {
        var panel = panelOf(id), label = menuLabel(panel), g = groups[groups.length - 1];
        if (panel.dataset.exp && exps.indexOf(panel.dataset.exp) < 0) exps.push(panel.dataset.exp);
        if (!g || g.label !== label) groups.push(g = { label: label, names: [] });
        g.names.push(dishes[id].dataset.name);
      });
      var text = groups.map(function (g) { return g.label + ': ' + g.names.join(', '); }).join('; ');
      return 'book.html?' + (exps.length ? 'exp=' + exps.join(',') + '&' : '') + 'src=menu-shortlist&dishes=' + encodeURIComponent(text);
    };

    var slRender = function () {
      order.forEach(function (id) {
        var on = slPicks.indexOf(id) > -1, b = dishes[id].querySelector('.shortlist-add');
        dishes[id].classList.toggle('is-picked', on);
        b.setAttribute('aria-pressed', String(on));
        b.innerHTML = (on ? TICK : PLUS) + '<span class="label">' + (on ? 'Shortlisted' : 'Shortlist') + '</span>';
      });
      document.querySelectorAll('.menu-section').forEach(function (sec) {
        var c = sec.querySelector('[data-count]');
        if (!c) return;
        var n = sec.querySelectorAll('.menu-item.is-picked').length;
        c.hidden = !n;
        c.textContent = c.dataset.of ? n + ' of ' + c.dataset.of + ' shortlisted' : n + ' shortlisted';
      });
      shortlist.hidden = !slPicks.length;
      shortlist.querySelector('[data-shortlist-count]').textContent = slPicks.length;
      list.textContent = '';
      var last = null, ul;
      slPicks.slice().sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); }).forEach(function (id) {
        var panel = panelOf(id);
        if (panel !== last) {
          last = panel;
          var g = document.createElement('div'); g.className = 'shortlist-group';
          var h = document.createElement('h3'); h.textContent = menuLabel(panel);
          ul = document.createElement('ul');
          g.appendChild(h); g.appendChild(ul); list.appendChild(g);
        }
        var li = document.createElement('li'), name = dishes[id].dataset.name;
        li.textContent = name;
        var x = document.createElement('button');
        x.type = 'button'; x.textContent = '×'; x.setAttribute('aria-label', 'Remove ' + name);
        x.addEventListener('click', function () {
          slToggle(id);
          var next = list.querySelector('button');
          (next || document.querySelector('.menu-tabs [aria-selected="true"]')).focus();
        });
        li.appendChild(x); ul.appendChild(li);
      });
      var to = slHref();
      send.href = to;
      if (slCta) {
        slCta.textContent = slPicks.length ? 'Send my shortlist (' + slPicks.length + ')' : 'Build your menu';
        slCta.href = slPicks.length ? to : 'book.html?src=menu';
      }
    };

    var slToggle = function (id) {
      var i = slPicks.indexOf(id), first = !slPicks.length;
      if (i > -1) slPicks.splice(i, 1); else slPicks.push(id);
      save();
      if (first && window.matchMedia('(max-width: 767px)').matches) { body.hidden = true; view.setAttribute('aria-expanded', 'false'); }
      slRender();
      slStatus.textContent = (i > -1 ? 'Removed ' : 'Added ') + dishes[id].dataset.name + ' · ' + slPicks.length + (slPicks.length === 1 ? ' dish' : ' dishes') + ' shortlisted';
    };

    view.addEventListener('click', function () {
      var open = view.getAttribute('aria-expanded') !== 'true';
      view.setAttribute('aria-expanded', String(open));
      body.hidden = !open;
    });
    shortlist.querySelector('[data-shortlist-clear]').addEventListener('click', function () {
      slPicks = []; save(); slRender();
      slStatus.textContent = 'Shortlist cleared';
      document.querySelector('.menu-tabs [aria-selected="true"]').focus();
    });
    if (slPicks.length && window.matchMedia('(max-width: 767px)').matches) { body.hidden = true; view.setAttribute('aria-expanded', 'false'); }
    slRender();
  }

  /* ---- Reviews: Brooke's hand-picked Google reviews ------------------- */
  /* Data lives in assets/js/reviews-data.js. Anything missing or malformed is
     skipped, and every block that has nothing real to show stays hidden. */
  var REV_OCC = { dinner: 'Dinner party', celebration: 'Celebration', wedding: 'Wedding', corporate: 'Work event', 'class': 'Cooking class', catering: 'Catering & events' };
  var REV_EXP = { 'private-dining': 'Private Dining', 'grazing-boards': 'Grazing Boards', 'cooking-classes': 'Private Cooking Class', 'party-packs': 'Banquets', canapes: 'Canapés', degustation: '5 Course Degustation' };
  var REV_PAGE = { wedding: 'weddings.html', corporate: 'corporate-events.html', 'class': 'cooking-classes.html' };
  var REV_LOC = { wollongong: 1, 'south-coast': 1, 'southern-highlands': 1, sydney: 1 };
  var revData = window.DINE_IN_REVIEWS && typeof window.DINE_IN_REVIEWS === 'object' ? window.DINE_IN_REVIEWS : {};
  var isHttps = function (u) { return typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/.test(u); };
  var revReviews = (Array.isArray(revData.reviews) ? revData.reviews : []).filter(function (r) {
    return r && typeof r.text === 'string' && r.text.trim() && typeof r.name === 'string' && r.name.trim() &&
      (!r.occasion || REV_OCC.hasOwnProperty(r.occasion)) && (!r.experience || REV_EXP.hasOwnProperty(r.experience)) &&
      (!r.location || REV_LOC.hasOwnProperty(r.location));
  });
  var siteJs = document.querySelector('script[src$="assets/js/site.js"]');
  var revBase = siteJs ? siteJs.getAttribute('src').replace(/assets\/js\/site\.js$/, '') : '';
  var el = function (tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  var revStars = function (r) {
    var n = Math.max(1, Math.min(5, Math.round(+r.rating || 5)));
    var p = el('p', 'rev-stars', '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n));
    p.setAttribute('aria-label', n + ' out of 5 stars');
    return p;
  };
  var revWhen = function (r) {
    return /^\d{4}-\d{2}$/.test(r.date || '') ? new Date(r.date + '-01T00:00').toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }) : '';
  };
  var revCard = function (r, big) {
    var card = el('article', 'rev-card' + (big ? ' rev-card--featured' : ''));
    card.dataset.occasion = r.occasion || '';
    card.appendChild(revStars(r));
    var q = el('blockquote', 'rev-text'); q.appendChild(el('p', null, r.text.trim())); card.appendChild(q);
    if (!big && r.text.trim().length > 260) {
      var more = el('button', 'rev-readmore text-link', 'Read more');
      more.type = 'button'; more.setAttribute('aria-expanded', 'false');
      more.addEventListener('click', function () {
        var open = card.classList.toggle('is-open');
        more.setAttribute('aria-expanded', String(open)); more.textContent = open ? 'Show less' : 'Read more';
      });
      card.appendChild(more);
    }
    var meta = el('p', 'rev-meta');
    meta.appendChild(el('span', 'rev-name', r.name.trim()));
    [r.occasion ? REV_OCC[r.occasion] : '', revWhen(r)].forEach(function (t) { if (t) meta.appendChild(document.createTextNode(' · ' + t)); });
    card.appendChild(meta);
    var src = el('p', 'rev-source');
    if (isHttps(r.url)) { var a = el('a', null, 'Posted on Google'); a.href = r.url; a.target = '_blank'; a.rel = 'noopener'; src.appendChild(a); }
    else src.textContent = 'Posted on Google';
    card.appendChild(src);
    if (big && r.experience) {
      var book = el('a', 'btn btn--secondary', 'Book ' + REV_EXP[r.experience]);
      book.href = revBase + 'book.html?exp=' + r.experience + '&src=reviews';
      book.setAttribute('data-cta', 'review-book-' + r.experience);
      card.appendChild(book);
    }
    return card;
  };

  // Reviews page: score, Google links, featured stories, occasion filter
  var ratingEl = document.querySelector('[data-rev-rating]');
  if (ratingEl && typeof revData.rating === 'number' && revData.rating > 0 && revData.rating <= 5) ratingEl.textContent = revData.rating.toFixed(1);
  var countEl = document.querySelector('[data-rev-count]');
  if (countEl && Math.round(+revData.count) > 0) countEl.textContent = Math.round(+revData.count);
  var gBox = document.querySelector('[data-rev-google]');
  if (gBox) {
    [['[data-rev-google-read]', revData.googleUrl], ['[data-rev-google-leave]', revData.leaveReviewUrl]].forEach(function (pair) {
      var a = gBox.querySelector(pair[0]);
      if (isHttps(pair[1])) { a.href = pair[1]; a.hidden = false; gBox.hidden = false; }
    });
  }
  var featBox = document.querySelector('[data-rev-featured]');
  if (featBox) {
    var feat = revReviews.filter(function (r) { return r.featured === true; }).slice(0, 3);
    feat.forEach(function (r) { featBox.querySelector('[data-rev-featured-list]').appendChild(revCard(r, true)); });
    featBox.hidden = !feat.length;
  }
  var allBox = document.querySelector('[data-rev-all]');
  if (allBox && revReviews.length) {
    var grid = allBox.querySelector('[data-rev-grid]'), chipBox = allBox.querySelector('[data-rev-chips]');
    var revStatus = allBox.querySelector('[data-rev-status]'), moreBox = allBox.querySelector('[data-rev-more]');
    var cardsR = revReviews.map(function (r) { var c = revCard(r, false); grid.appendChild(c); return c; });
    var occs = Object.keys(REV_OCC).filter(function (o) { return revReviews.some(function (r) { return r.occasion === o; }); });
    ['all'].concat(occs).forEach(function (o) {
      var n = o === 'all' ? revReviews.length : revReviews.filter(function (r) { return r.occasion === o; }).length;
      var b = el('button', 'chip', o === 'all' ? 'All' : REV_OCC[o]);
      b.type = 'button'; b.dataset.revFilter = o; b.setAttribute('aria-pressed', 'false');
      b.appendChild(el('span', 'count', String(n)));
      b.addEventListener('click', function () { revFilter(o, true); });
      chipBox.appendChild(b);
    });
    var revFilter = function (o, push) {
      if (o !== 'all' && occs.indexOf(o) < 0) o = 'all';
      var shown = 0;
      cardsR.forEach(function (c) { c.hidden = o !== 'all' && c.dataset.occasion !== o; if (!c.hidden) shown++; });
      chipBox.querySelectorAll('[data-rev-filter]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.revFilter === o)); });
      revStatus.textContent = 'Showing ' + shown + ' of ' + cardsR.length;
      moreBox.textContent = '';
      moreBox.hidden = !REV_PAGE[o];
      if (REV_PAGE[o]) {
        var a = el('a', 'text-link', 'See ' + REV_OCC[o].toLowerCase() + ' options'); a.href = REV_PAGE[o];
        moreBox.appendChild(a);
      }
      if (push && history.replaceState) {
        var u = new URL(location.href);
        if (o === 'all') u.searchParams.delete('occasion'); else u.searchParams.set('occasion', o);
        history.replaceState(null, '', u.pathname + u.search + u.hash);
      }
    };
    allBox.hidden = false;
    revFilter(new URLSearchParams(location.search).get('occasion') || 'all', false);
  }

  // Review quotes on Experiences, Menu, gift and landing pages
  document.querySelectorAll('[data-review-slot]').forEach(function (slot) {
    var exp = slot.dataset.experience, occ = slot.dataset.occasion, loc = slot.dataset.location;
    var pool = revReviews.filter(function (r) {
      if (slot.hasAttribute('data-any')) return true;
      return (exp && r.experience === exp) || (occ && r.occasion === occ) || (loc && r.location === loc);
    }).sort(function (a, b) { return (b.featured === true) - (a.featured === true); });
    if (!pool.length) return;
    var r = pool[0];
    slot.textContent = '';
    slot.appendChild(revStars(r));
    var q = el('blockquote', 'rev-text'); q.appendChild(el('p', null, r.text.trim())); slot.appendChild(q);
    var meta = el('p', 'rev-meta'); meta.appendChild(el('span', 'rev-name', r.name.trim()));
    meta.appendChild(document.createTextNode(' · Google review'));
    slot.appendChild(meta);
    var link = el('a', 'text-link', 'Read more reviews');
    var o = occ || r.occasion;
    link.href = revBase + 'testimonials.html' + (o ? '?occasion=' + o : '');
    slot.appendChild(link);
    slot.hidden = false;
  });

  /* ---- FAQ: search, topic chips, expand all, deep links --------------- */
  var faqTools = document.querySelector('[data-faq-tools]');
  if (faqTools) {
    var faqItems = [].slice.call(document.querySelectorAll('.faq-group .accordion > li'));
    var faqGroups = [].slice.call(document.querySelectorAll('.faq-group[data-group]'));
    var faqQ = faqTools.querySelector('[data-faq-q]');
    var faqStatus = faqTools.querySelector('[data-faq-status]');
    var faqChipBox = faqTools.querySelector('[data-faq-chips]');
    var faqAllBtn = faqTools.querySelector('[data-faq-all]');
    var faqEmpty = document.querySelector('[data-faq-empty]');
    var FAQ_LABEL = { discover: 'Discover Dine In', planning: 'Planning your event', experience: 'Your dining experience' };
    var faqNorm = function (t) { return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
    var faqText = faqItems.map(function (li) { return faqNorm(li.textContent); });
    var faqBtnOf = function (li) { return li.querySelector('h3 button'); };
    var faqTopic = 'all', faqSearching = false;
    ['all'].concat(faqGroups.map(function (g) { return g.dataset.group; })).forEach(function (key) {
      var n = key === 'all' ? faqItems.length : faqItems.filter(function (li) { return li.closest('.faq-group').dataset.group === key; }).length;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.dataset.faqTopic = key;
      b.setAttribute('aria-pressed', String(key === 'all'));
      b.textContent = key === 'all' ? 'All' : (FAQ_LABEL[key] || key);
      var c = document.createElement('span'); c.className = 'count'; c.textContent = n; b.appendChild(c);
      b.addEventListener('click', function () { faqTopic = key; faqApply(); });
      faqChipBox.appendChild(b);
    });
    var faqApply = function () {
      var raw = faqQ.value.trim(), words = faqNorm(raw).split(/\s+/).filter(Boolean), shown = 0;
      faqItems.forEach(function (li, i) {
        var inTopic = faqTopic === 'all' || li.closest('.faq-group').dataset.group === faqTopic;
        var match = inTopic && words.every(function (w) { return faqText[i].indexOf(w) > -1; });
        li.hidden = !match;
        if (match) shown++;
        if (words.length) openPanel(faqBtnOf(li), match, true);
        else if (faqSearching) openPanel(faqBtnOf(li), false, true);
      });
      faqSearching = words.length > 0;
      faqGroups.forEach(function (g) { g.hidden = !g.querySelector('.accordion > li:not([hidden])'); });
      faqChipBox.querySelectorAll('[data-faq-topic]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.faqTopic === faqTopic)); });
      faqStatus.textContent = words.length ? shown + (shown === 1 ? ' answer matches' : ' answers match') + ' “' + raw + '”' : 'Showing ' + shown + ' of ' + faqItems.length;
      faqEmpty.hidden = shown > 0;
      if (!shown) {
        faqEmpty.textContent = (words.length ? 'No answers match “' + raw + '”. ' : 'No answers in this topic. ');
        var ask = document.createElement('a'); ask.className = 'text-link'; ask.href = 'contact.html#ask'; ask.textContent = 'Ask Brooke directly';
        var tel = document.createElement('a'); tel.className = 'text-link'; tel.href = 'tel:+61432804952'; tel.textContent = '0432 804 952';
        faqEmpty.appendChild(ask); faqEmpty.appendChild(document.createTextNode(' or call ')); faqEmpty.appendChild(tel);
      }
    };
    faqQ.addEventListener('input', faqApply);
    faqAllBtn.addEventListener('click', function () {
      var expand = faqAllBtn.getAttribute('aria-pressed') !== 'true';
      faqItems.forEach(function (li) { if (!li.hidden) openPanel(faqBtnOf(li), expand, true); });
      faqAllBtn.setAttribute('aria-pressed', String(expand));
      faqAllBtn.textContent = expand ? 'Collapse all' : 'Expand all';
    });
    var faqFromHash = function () {
      var id = decodeURIComponent(location.hash.slice(1));
      var target = id && document.getElementById(id);
      var li = target && target.closest && target.closest('.accordion > li');
      if (!li) return;
      if (li.hidden) { faqQ.value = ''; faqTopic = 'all'; faqApply(); }
      openPanel(faqBtnOf(li), true, true);
      li.scrollIntoView({ block: 'start' });
      faqBtnOf(li).focus({ preventScroll: true });
    };
    faqTools.hidden = false;
    faqApply();
    faqFromHash();
    window.addEventListener('hashchange', faqFromHash);
  }

  /* ---- Contact: live hours status (Sydney time) and quick question ---- */
  var hoursEl = document.querySelector('[data-hours-status]');
  if (hoursEl && window.Intl && Intl.DateTimeFormat) {
    try {
      var hp = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
      var hget = function (t) { var x = hp.filter(function (p) { return p.type === t; })[0]; return x ? x.value : ''; };
      var hday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(hget('weekday').slice(0, 3));
      var hmins = (+hget('hour') % 24) * 60 + (+hget('minute'));
      if (hday > -1 && !isNaN(hmins)) {
        var weekday = hday >= 1 && hday <= 5, isOpen = weekday && hmins >= 600 && hmins < 1020, htext;
        if (isOpen) htext = 'Open now · until 5pm';
        else if (weekday && hmins < 600) htext = 'Closed now · opens today 10am';
        else {
          var nd = hday;
          do { nd = (nd + 1) % 7; } while (nd === 0 || nd === 6);
          htext = 'Closed now · opens ' + ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][nd] + ' 10am';
        }
        hoursEl.textContent = htext;
        hoursEl.classList.toggle('is-open', isOpen);
        hoursEl.hidden = false;
      }
    } catch (e) {}
  }
  var askForm = document.querySelector('[data-ask-form]');
  if (askForm) {
    var askTopic = askForm.querySelector('#ask-topic');
    var askBook = askForm.querySelector('[data-ask-book]');
    var askBookLink = askForm.querySelector('[data-ask-book-link]');
    var askVal = function (id) { return askForm.querySelector(id).value.trim(); };
    var askSync = function () {
      askBook.hidden = askTopic.value !== 'Checking a date';
      askBookLink.href = 'book.html?src=contact' + (askVal('#ask-name') ? '&name=' + encodeURIComponent(askVal('#ask-name')) : '');
    };
    askForm.addEventListener('input', askSync);
    askForm.addEventListener('change', askSync);
    askSync();
    askForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      ['#ask-name', '#ask-email', '#ask-message'].forEach(function (id) {
        var f = askForm.querySelector(id), v = f.value.trim();
        var good = !!v && (f.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
        f.closest('.field').classList.toggle('invalid', !good);
        f.setAttribute('aria-invalid', String(!good));
        if (!good && !firstBad) firstBad = f;
      });
      if (firstBad) { firstBad.focus(); return; }
      askForm.querySelector('#ask-subject').value = 'Website question: ' + askTopic.value;
      var askSent = askForm.nextElementSibling;
      var askDone = function () {
        askSent.querySelector('[data-ask-sent-name]').textContent = ', ' + askVal('#ask-name').split(/\s+/)[0];
        askSent.querySelector('[data-ask-sent-email]').textContent = askVal('#ask-email');
        askForm.hidden = true;
        askSent.hidden = false;
        askSent.focus();
      };
      if (askForm.querySelector('[name="_gotcha"]').value) { askDone(); return; }
      if (FORMS.ask) { postForm(askForm, FORMS.ask, askForm.querySelector('[data-send-status]'), askDone); return; }
      var url = 'mailto:dineinbybrooke@gmail.com?subject=' + encodeURIComponent('Website question: ' + askTopic.value) +
        '&body=' + encodeURIComponent(askVal('#ask-message') + '\n\n' + askVal('#ask-name') + '\n' + askVal('#ask-email'));
      askForm.dataset.mailto = url;
      window.location.href = url;
    });
    // With a form endpoint set, the button sends directly instead of opening email
    if (FORMS.ask) {
      askForm.querySelector('[data-ask-send]').textContent = 'Send question';
      askForm.querySelector('[data-ask-hint]').textContent = 'Your question goes straight to Brooke, and she replies to the email above.';
    }
  }

  /* ---- Area pages: "Check your drive time" opens Google Maps directions */
  // The form is a plain GET to Google Maps (works without JS); JS only stops
  // an empty submit and shows the inline error.
  document.querySelectorAll('[data-drive-check]').forEach(function (f) {
    var input = f.querySelector('input[name="destination"]');
    f.addEventListener('submit', function (e) {
      var empty = !input.value.trim();
      f.classList.toggle('invalid', empty);
      input.setAttribute('aria-invalid', String(empty));
      if (empty) { e.preventDefault(); input.focus(); }
    });
    input.addEventListener('input', function () { if (input.value.trim()) { f.classList.remove('invalid'); input.removeAttribute('aria-invalid'); } });
  });

  /* ---- Featured video (HLS stream from the live site's video CDN) ----- */
  var video = document.querySelector('video[data-hls]');
  if (video) {
    var src = video.dataset.hls;
    var setPoster = function () { if (video.dataset.poster && !video.poster) video.poster = video.dataset.poster; };
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      setPoster();
      video.src = src;
    } else {
      // hls.js is ~400 KB: fetch it only when the video is about to be seen or played.
      var hlsLoading = false;
      var loadHls = function (playAfter) {
        if (hlsLoading) return;
        hlsLoading = true;
        var s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';
        s.onload = function () {
          if (window.Hls && window.Hls.isSupported()) {
            var h = new window.Hls(); h.loadSource(src); h.attachMedia(video);
            if (playAfter) h.on(window.Hls.Events.MANIFEST_PARSED, function () { var p = video.play(); if (p && p.catch) p.catch(function () {}); });
          }
        };
        document.head.appendChild(s);
      };
      video.addEventListener('play', function () { if (!window.Hls) loadHls(true); });
      video.addEventListener('click', function () { setPoster(); loadHls(true); });
      if ('IntersectionObserver' in window) {
        var hlsIo = new IntersectionObserver(function (entries) {
          if (entries.some(function (en) { return en.isIntersecting; })) { hlsIo.disconnect(); setPoster(); loadHls(false); }
        }, { rootMargin: '200px 0px' });
        hlsIo.observe(video);
      } else {
        setPoster();
        loadHls(false);
      }
    }
  }

  /* ---- Homepage "From the menu": add dishes to the Menu shortlist ------ */
  var homeDishes = document.querySelectorAll('[data-home-dish]');
  if (homeDishes.length) {
    var HS_KEY = 'dinein-shortlist';
    var HS_PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
    var HS_TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
    var hsRead = function () { try { var v = JSON.parse(localStorage.getItem(HS_KEY)); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
    var hsWrite = function (v) { try { localStorage.setItem(HS_KEY, JSON.stringify(v)); } catch (e) {} };
    var hsNote = document.querySelector('[data-home-shortlist-note]');
    var hsMemory = hsRead();   // keeps the page working when storage is blocked
    var hsSync = function () {
      var any = false;
      [].forEach.call(homeDishes, function (card) {
        var on = hsMemory.indexOf(card.dataset.homeDish) > -1, b = card.querySelector('.shortlist-add');
        if (on) any = true;
        b.setAttribute('aria-pressed', String(on));
        b.innerHTML = (on ? HS_TICK : HS_PLUS) + '<span class="label">' + (on ? 'Shortlisted' : 'Shortlist') + '</span>';
        card.classList.toggle('is-picked', on);
      });
      if (hsNote) hsNote.hidden = !any;
    };
    [].forEach.call(homeDishes, function (card) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'shortlist-add';
      b.setAttribute('aria-label', 'Shortlist ' + card.dataset.homeName);
      b.addEventListener('click', function () {
        var id = card.dataset.homeDish, stored = hsRead();
        if (stored.length || hsMemory.length === 0) hsMemory = stored;
        var i = hsMemory.indexOf(id);
        if (i > -1) hsMemory.splice(i, 1); else hsMemory.push(id);
        hsWrite(hsMemory);
        hsSync();
      });
      card.querySelector('.home-dish-actions').appendChild(b);
    });
    hsSync();
  }
})();
