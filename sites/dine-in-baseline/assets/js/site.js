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

  /* ---- Enquiry form (test version: validates, does not send) ---------- */
  document.querySelectorAll('form.form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll('[data-required]').forEach(function (wrap) {
        var valid;
        if (wrap.tagName === 'FIELDSET') valid = !!wrap.querySelector('input:checked');
        else {
          var f = wrap.querySelector('input, textarea');
          valid = f.value.trim() !== '' && (f.type !== 'email' || /\S+@\S+\.\S+/.test(f.value));
        }
        wrap.classList.toggle('invalid', !valid);
        if (!valid) ok = false;
      });
      if (!ok) { var first = form.querySelector('.invalid'); if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      form.classList.add('is-sent');
      form.nextElementSibling.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

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
