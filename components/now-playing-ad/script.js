/* Now Playing ad
   One clock drives everything: render(t) sets the shot, the overlay and the
   sign-off from a single time in seconds, so pause, seek and replay are exact.
   Add ?t=3.2 to freeze a moment, and ?format=portrait|square|landscape to pick a layout. */
(() => {
  'use strict';

  const root = document.getElementById('ui-npad');
  if (!root) return;

  const $ = (sel, el = root) => el.querySelector(sel);
  const $$ = (sel, el = root) => Array.from(el.querySelectorAll(sel));

  const ORIGINAL = JSON.parse(document.getElementById('ui-npad-config').textContent);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  let cfg = clone(ORIGINAL);

  const ad = $('#ui-npad-ad');
  const viewport = $('.ui-npad__viewport');
  const scenesEl = $('.ui-npad__scenes');
  const player = $('.ui-npad__player');
  const seek = $('.ui-npad__seek');
  const rail = $('.ui-npad__rail');
  const elapsedEl = $('.ui-npad__time--elapsed');
  const remainEl = $('.ui-npad__time--remain');
  const clockEl = $('.ui-npad__clock');
  const statusEl = $('#ui-npad-status');
  const soundBtn = $('[data-action="sound"]');
  const formatSel = $('[data-action="format"]');
  const logoBox = $('.ui-npad__logo');
  const logoImg = $('.ui-npad__logo-img');
  const logoText = $('.ui-npad__logo-text');

  const params = new URLSearchParams(location.search);
  const frozenAt = params.has('t') ? parseFloat(params.get('t')) : null;
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const STILL_T = 3.2; // the settled frame shown with reduced motion: player over the duck plate

  // ---------- state ----------
  let shots = [];          // [{ at, el, scene, isVideo }]
  let order = [];          // slot -> shot element index (shuffle permutes the middle)
  let t = 0;
  let playing = false;
  let ended = false;
  let lastNow = 0;
  let cur = -1;
  let shuffleOn = false;
  let soundOn = false;
  let userPaused = false;
  let visible = true;
  let audio = null;
  let lastText = '';
  let ready = false;       // autoplay waits for the opening shot
  let review = frozenAt !== null; // a ?t= frame shows the playing look until someone interacts

  const isVideoSrc = (src, type) =>
    (type && type.startsWith('video')) || /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(src || '');

  const fmt = (s) => {
    s = Math.max(0, Math.floor(s));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const say = (msg) => {
    statusEl.textContent = '';
    requestAnimationFrame(() => { statusEl.textContent = msg; });
  };

  // ---------- build ----------
  function build() {
    scenesEl.textContent = '';
    cfg.scenes.sort((a, b) => a.at - b.at);
    shots = cfg.scenes.map((scene) => {
      const video = isVideoSrc(scene.src, scene.type);
      const el = document.createElement(video ? 'video' : 'img');
      el.className = 'ui-npad__scene';
      if (video) {
        el.muted = true;
        el.playsInline = true;
        el.setAttribute('muted', '');
        el.setAttribute('playsinline', '');
        el.preload = 'auto';
        el.disablePictureInPicture = true;
        if (scene.poster) el.poster = scene.poster;
        // Once a clip can show frames, put the visible one back on the clock
        el.addEventListener('loadeddata', () => {
          if (el.classList.contains('is-active') && !playing) { cur = -1; render(t); }
        });
        // MP4 (H.264) for Safari and most browsers; WebM (VP9) for builds without H.264
        const add = (src, type) => {
          const so = document.createElement('source');
          so.src = src;
          if (type) so.type = type;
          el.appendChild(so);
        };
        if (scene.webm && /\.mp4(\?|#|$)/i.test(scene.src)) {
          add(scene.src, 'video/mp4; codecs="avc1.64001F"');
          add(scene.webm, 'video/webm; codecs="vp9"');
        } else {
          el.src = scene.src;
        }
      } else {
        el.alt = '';
        el.decoding = 'async';
        el.src = scene.src;
      }
      el.style.setProperty('--focus', scene.focus || '50% 50%');
      scenesEl.appendChild(el);
      return { at: +scene.at || 0, el, scene, isVideo: video };
    });
    makeOrder();

    $$('[data-bind="title"]').forEach((n) => { n.textContent = cfg.track.title; });
    $$('[data-bind="artist"]').forEach((n) => { n.textContent = cfg.track.artist; });
    $('[data-action="save"]').setAttribute('aria-label', `Save ${cfg.track.title}`);

    const brand = cfg.logo.label || 'the brand';
    logoBox.setAttribute('aria-label', brand);
    if (cfg.logo.text) {
      logoText.textContent = cfg.logo.text;
      logoText.hidden = false;
      logoBox.classList.add('has-text');
    } else {
      logoText.hidden = true;
      logoBox.classList.remove('has-text');
      if (cfg.logo.src) logoImg.src = cfg.logo.src;
    }

    $('#ui-npad-title').textContent =
      `${brand}: a ${Math.round(cfg.duration)}-second ad set to ${cfg.track.title} by ${cfg.track.artist}`;
    $('#ui-npad-desc').textContent =
      `Shots: ${cfg.scenes.map((s) => s.alt).filter(Boolean).join('; ')}. It ends on the ${brand} logo.`;

    seek.max = String(cfg.duration);

    if (audio) { audio.pause(); audio = null; }
    if (cfg.track.audio) {
      audio = new Audio();
      audio.preload = 'auto';
      audio.src = cfg.track.audio;
      audio.muted = !soundOn;
    }
    soundBtn.hidden = !cfg.track.audio;
    cur = -1;
  }

  function makeOrder() {
    order = shots.map((_, i) => i);
    if (shuffleOn && shots.length > 3) {
      // Keep the opening shot and the sign-off shot; shuffle the rest
      const mid = order.slice(1, -1);
      for (let i = mid.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mid[i], mid[j]] = [mid[j], mid[i]];
      }
      order = [order[0], ...mid, order[order.length - 1]];
    }
  }

  // ---------- timeline ----------
  const slotAt = (time) => {
    let i = 0;
    while (i + 1 < shots.length && time >= shots[i + 1].at) i++;
    return i;
  };

  const shotFor = (slot) => shots[order[slot]];
  const localTime = (slot, time) => Math.max(0, time - shots[slot].at + (+shotFor(slot).scene.in || 0));

  function prime(slot) {
    const s = slot < shots.length ? shotFor(slot) : null;
    if (!s || !s.isVideo) return;
    s.el.pause();
    const start = +s.scene.in || 0;
    if (Math.abs(s.el.currentTime - start) > 0.02) {
      try { s.el.currentTime = start; } catch (e) { /* not loaded yet */ }
    }
  }

  function enter(slot, time) {
    const next = shotFor(slot);
    next.el.classList.add('is-active');
    if (next.isVideo) {
      const lt = localTime(slot, time);
      if (Math.abs(next.el.currentTime - lt) > 0.05) {
        try { next.el.currentTime = lt; } catch (e) { /* not loaded yet */ }
      }
      if (playing) next.el.play().catch(() => {});
      else next.el.pause();
    }
    shots.forEach((s) => {
      if (s !== next) {
        s.el.classList.remove('is-active');
        if (s.isVideo && !s.el.paused) s.el.pause();
      }
    });
    cur = slot;
    prime(slot + 1);
  }

  function render(time) {
    const slot = slotAt(time);
    if (slot !== cur) enter(slot, time);
    else if (playing) {
      const s = shotFor(slot);
      if (s.isVideo) {
        const lt = localTime(slot, time);
        if (s.el.paused && !s.el.ended && lt < (s.el.duration || Infinity) - 0.05) s.el.play().catch(() => {});
        if (s.el.readyState >= 2 && Math.abs(s.el.currentTime - lt) > 0.15) s.el.currentTime = lt;
      }
    }

    root.dataset.player = time >= cfg.player.in && time < cfg.player.out ? 'on' : 'off';
    root.dataset.logo = time >= cfg.logo.in ? 'on' : 'off';

    // The song counter: elapsed counts up, remaining counts down
    const songT = Math.max(0, time + (+cfg.track.start || 0));
    const length = Math.max(1, +cfg.track.length || 1);
    const e = fmt(songT);
    const r = `-${fmt(length - songT)}`;
    if (e !== elapsedEl.textContent) elapsedEl.textContent = e;
    if (r !== remainEl.textContent) remainEl.textContent = r;
    rail.style.setProperty('--pos', Math.min(1, songT / length).toFixed(5));

    if (document.activeElement !== seek) seek.value = time.toFixed(2);
    const text = `${e} of ${fmt(length)}, ad ${time.toFixed(1)} of ${cfg.duration} seconds`;
    if (text !== lastText) { seek.setAttribute('aria-valuetext', text); lastText = text; }
    clockEl.textContent = `${time.toFixed(1)}s`;

    // If the overlay hides while a control in it has focus, keep focus on the page
    if (root.dataset.player === 'off' && player.contains(document.activeElement)) {
      $('.ui-npad__bar [data-action="toggle"]').focus();
    }

    syncAudio(time);
  }

  function syncAudio(time) {
    if (!audio) return;
    const at = time + (+cfg.track.start || 0);
    const should = playing && soundOn && at >= 0 && at < (audio.duration || Infinity);
    if (!should) { if (!audio.paused) audio.pause(); return; }
    if (audio.paused) {
      try { audio.currentTime = at; } catch (e) { /* not loaded yet */ }
      audio.play().catch(() => {});
    } else if (Math.abs(audio.currentTime - at) > 0.12) {
      audio.currentTime = at;
    }
  }

  function tick(now) {
    if (playing) {
      const dt = Math.min(0.1, (now - lastNow) / 1000);
      // With sound on, the audio is the master clock so cuts stay on the beat
      const at = audio && soundOn && !audio.paused && audio.readyState >= 2
        ? audio.currentTime - (+cfg.track.start || 0)
        : null;
      t = at !== null && Math.abs(at - (t + dt)) < 0.25 ? at : t + dt;
      if (t >= cfg.duration) {
        if (cfg.loop) {
          if (shuffleOn) makeOrder();
          t = 0;
          cur = -1;
          if (audio) audio.pause();
        } else {
          t = cfg.duration - 0.001;
          finish();
        }
      }
      render(t);
    }
    lastNow = now;
    requestAnimationFrame(tick);
  }

  // ---------- transport ----------
  function setState() {
    // A ?t= review frame shows the ad as it looks while playing
    root.dataset.state = ended ? 'ended' : playing || review ? 'playing' : 'paused';
    const label = ended ? 'Replay ad' : playing ? 'Pause ad' : 'Play ad';
    $$('[data-action="toggle"]').forEach((b) => b.setAttribute('aria-label', label));
  }

  function play() {
    if (ended || t >= cfg.duration - 0.01) { t = 0; cur = -1; ended = false; if (shuffleOn) makeOrder(); }
    playing = true;
    lastNow = performance.now();
    cur = -1;
    render(t);
    setState();
  }

  function pause() {
    playing = false;
    shots.forEach((s) => s.isVideo && s.el.pause());
    if (audio) audio.pause();
    setState();
  }

  function finish() {
    playing = false;
    ended = true;
    shots.forEach((s) => s.isVideo && s.el.pause());
    if (audio) audio.pause();
    setState();
    say('Ad finished.');
  }

  function seekTo(time) {
    t = Math.min(Math.max(0, time), cfg.duration - 0.001);
    ended = false;
    cur = -1;
    render(t);
    setState();
  }

  function stepScene(dir) {
    const slot = slotAt(t);
    if (dir < 0) {
      // Like a music player: restart the shot, or go back one if it has just started
      const target = t - shots[slot].at > 0.35 || slot === 0 ? shots[slot].at : shots[slot - 1].at;
      seekTo(target);
    } else if (slot + 1 < shots.length) {
      seekTo(shots[slot + 1].at);
    } else {
      seekTo(cfg.duration);
      finish();
    }
  }

  const actions = {
    toggle() {
      if (playing) { userPaused = true; pause(); say('Ad paused.'); }
      else { userPaused = false; play(); say('Ad playing.'); }
    },
    replay() { userPaused = false; ended = false; t = 0; cur = -1; if (shuffleOn) makeOrder(); play(); say('Ad restarted.'); },
    prev() { stepScene(-1); },
    next() { stepScene(1); },
    shuffle(btn) {
      shuffleOn = !shuffleOn;
      btn.setAttribute('aria-pressed', String(shuffleOn));
      makeOrder();
      cur = -1;
      render(t);
      say(shuffleOn ? 'Shuffle on. The middle scenes play in a random order.' : 'Shuffle off.');
    },
    repeat(btn) {
      cfg.loop = !cfg.loop;
      btn.setAttribute('aria-pressed', String(cfg.loop));
      say(cfg.loop ? 'The ad will loop.' : 'The ad will stop on the logo.');
    },
    save(btn) {
      const saved = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(saved));
      say(saved ? `${cfg.track.title} saved.` : `${cfg.track.title} removed.`);
      root.dispatchEvent(new CustomEvent('ui-npad:save', { bubbles: true, detail: { saved, track: cfg.track } }));
    },
    sound(btn) {
      soundOn = !soundOn;
      btn.setAttribute('aria-pressed', String(soundOn));
      btn.setAttribute('aria-label', soundOn ? 'Sound on. Turn sound off' : 'Sound off. Turn sound on');
      if (audio) audio.muted = !soundOn;
      if (soundOn && !playing) { userPaused = false; play(); }
      syncAudio(t);
    },
    customise() { openEditor(); },
  };

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn || !root.contains(btn)) return;
    const fn = actions[btn.dataset.action];
    review = false;
    if (fn) fn(btn);
    setState();
  });

  // Scrub: the range input seeks the ad; playback carries on from the new spot
  seek.addEventListener('input', () => { review = false; seekTo(parseFloat(seek.value)); });
  seek.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 0.5, ArrowUp: 0.5, ArrowLeft: -0.5, ArrowDown: -0.5 }[e.key];
    if (step) { e.preventDefault(); seekTo(t + step); }
    else if (e.key === 'PageUp') { e.preventDefault(); stepScene(-1); }
    else if (e.key === 'PageDown') { e.preventDefault(); stepScene(1); }
  });

  // Keyboard shortcuts while focus is in the ad section (not in form fields)
  root.addEventListener('keydown', (e) => {
    if (e.target.closest('input, select, textarea') || e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key.toLowerCase();
    review = false;
    if (k === 'k' || (k === ' ' && !e.target.closest('button'))) { e.preventDefault(); actions.toggle(); }
    else if (k === 'j') stepScene(-1);
    else if (k === 'l') stepScene(1);
    else if (e.key === 'Home' || k === '0') { e.preventDefault(); seekTo(0); }
  });

  // ---------- layout ----------
  function layout() {
    const want = formatSel.value;
    let fmtName = want;
    if (want === 'auto') {
      const r = viewport.clientWidth / Math.max(1, viewport.clientHeight);
      fmtName = r >= 1.15 ? 'landscape' : r >= 0.8 ? 'square' : 'portrait';
    }
    root.dataset.layout = fmtName;
    // Auto on a phone or tall window: the story layout fills the screen edge to edge
    const fill = want === 'auto' && fmtName === 'portrait';
    root.toggleAttribute('data-fill', fill);
    if (fill) root.style.setProperty('--ar', (viewport.clientWidth / Math.max(1, viewport.clientHeight)).toFixed(4));
    else root.style.removeProperty('--ar');
  }
  formatSel.addEventListener('change', layout);
  new ResizeObserver(layout).observe(viewport);

  // ---------- lifecycle: pause off screen and in background tabs ----------
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    autoplayCheck();
  }, { threshold: 0.25 }).observe(ad);
  document.addEventListener('visibilitychange', autoplayCheck);

  function autoplayCheck() {
    const may = ready && visible && !document.hidden && !userPaused && !ended && !reduceMQ.matches && frozenAt === null;
    if (may && !playing) play();
    else if (!may && playing) pause();
  }

  reduceMQ.addEventListener('change', () => {
    if (reduceMQ.matches && playing) { pause(); seekTo(STILL_T); }
  });

  // ---------- editor ----------
  const dialog = document.getElementById('ui-npad-editor');
  const form = dialog.querySelector('form');
  const sceneList = dialog.querySelector('.ui-npad-editor__scenes');
  const editorStatus = dialog.querySelector('[data-editor="status"]');
  const fileNames = new Map(); // object URL -> original file name, for the exported config
  let restartTimer = 0;

  const field = (name) => form.elements[name];
  const parseLen = (v) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(v).trim());
    return m ? +m[1] * 60 + +m[2] : null;
  };

  function fillEditor() {
    field('title').value = cfg.track.title;
    field('artist').value = cfg.track.artist;
    field('songLength').value = fmt(cfg.track.length);
    field('start').value = cfg.track.start;
    field('duration').value = cfg.duration;
    field('playerIn').value = cfg.player.in;
    field('playerOut').value = cfg.player.out;
    field('logoIn').value = cfg.logo.in;
    field('bpm').value = cfg.bpm;
    field('beats').value = cfg.beats;
    field('beatOffset').value = cfg.beatOffset;
    field('brand').value = cfg.logo.label;
    field('wordmark').value = cfg.logo.text || '';
    renderSceneRows();
  }

  function renderSceneRows() {
    sceneList.textContent = '';
    cfg.scenes.forEach((scene, i) => {
      const li = document.createElement('li');
      li.className = 'ui-npad-editor__scene';
      const thumbSrc = scene.poster || (!isVideoSrc(scene.src, scene.type) ? scene.src : '');
      li.innerHTML = `
        ${thumbSrc ? `<img class="ui-npad-editor__thumb" alt="" src="${thumbSrc}">` : '<video class="ui-npad-editor__thumb" muted playsinline preload="metadata" aria-hidden="true"></video>'}
        <label class="is-at">Scene ${i + 1} cuts in at (s)<input type="number" step="0.01" min="0" data-k="at"></label>
        <label class="is-desc">Description<input type="text" data-k="alt" autocomplete="off"></label>
        <label class="is-file">Clip or still<input type="file" accept="video/*,image/*" data-k="file"></label>
        <button class="ui-npad-editor__remove" type="button" aria-label="Remove scene ${i + 1}">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 7h14M10 11v6M14 11v6M8 7l1-3h6l1 3M7 7l1 13h8l1-13"/></svg>
        </button>`;
      const vid = li.querySelector('video');
      if (vid) vid.src = scene.src;
      const at = li.querySelector('[data-k="at"]');
      at.value = scene.at;
      if (i === 0) { at.disabled = true; at.title = 'The first scene starts at 0'; }
      li.querySelector('[data-k="alt"]').value = scene.alt || '';
      li.dataset.index = String(i);
      sceneList.appendChild(li);
    });
  }

  function openEditor() {
    fillEditor();
    editorStatus.textContent = '';
    dialog.querySelector('.ui-npad-editor__out')?.remove();
    if (playing) { userPaused = true; pause(); }
    dialog.showModal();
  }

  dialog.addEventListener('close', () => {
    $('[data-action="customise"]').focus();
  });

  // Live apply: rebuild and replay from the start shortly after edits settle
  function applyAndReplay() {
    clearTimeout(restartTimer);
    restartTimer = setTimeout(() => {
      build();
      ended = false;
      seekTo(0);
    }, 250);
  }

  form.addEventListener('input', (e) => {
    const el = e.target;
    const row = el.closest('.ui-npad-editor__scene');
    if (row) {
      const scene = cfg.scenes[+row.dataset.index];
      if (el.dataset.k === 'at') { const v = parseFloat(el.value); if (!Number.isNaN(v)) scene.at = v; }
      if (el.dataset.k === 'alt') scene.alt = el.value;
      if (el.dataset.k !== 'file') { applyAndReplay(); return; }
    }
    const num = (v, d) => { const n = parseFloat(v); return Number.isNaN(n) ? d : n; };
    switch (el.name) {
      case 'title': cfg.track.title = el.value; break;
      case 'artist': cfg.track.artist = el.value; break;
      case 'songLength': { const s = parseLen(el.value); if (s !== null) cfg.track.length = s; break; }
      case 'start': cfg.track.start = num(el.value, cfg.track.start); break;
      case 'duration': cfg.duration = Math.max(1, num(el.value, cfg.duration)); break;
      case 'playerIn': cfg.player.in = num(el.value, cfg.player.in); break;
      case 'playerOut': cfg.player.out = num(el.value, cfg.player.out); break;
      case 'logoIn': cfg.logo.in = num(el.value, cfg.logo.in); break;
      case 'bpm': cfg.bpm = num(el.value, cfg.bpm); return;
      case 'beats': cfg.beats = Math.max(1, Math.round(num(el.value, cfg.beats))); return;
      case 'beatOffset': cfg.beatOffset = num(el.value, cfg.beatOffset); return;
      case 'brand': cfg.logo.label = el.value; break;
      case 'wordmark': cfg.logo.text = el.value.trim(); break;
      default: return;
    }
    applyAndReplay();
  });

  form.addEventListener('change', (e) => {
    const el = e.target;
    if (el.type !== 'file' || !el.files[0]) return;
    const file = el.files[0];
    const url = URL.createObjectURL(file);
    fileNames.set(url, file.name);
    const row = el.closest('.ui-npad-editor__scene');
    if (row) {
      const scene = cfg.scenes[+row.dataset.index];
      scene.src = url;
      scene.type = file.type;
      delete scene.poster;
      delete scene.webm;
      if (!scene.alt) scene.alt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      renderSceneRows();
      editorStatus.textContent = `Scene ${+row.dataset.index + 1} now uses ${file.name}.`;
    } else if (el.name === 'audio') {
      cfg.track.audio = url;
      if (!cfg.track.start || cfg.track.start < 0) cfg.track.start = 0;
      const probe = new Audio(url);
      probe.addEventListener('loadedmetadata', () => {
        if (Number.isFinite(probe.duration)) {
          cfg.track.length = Math.round(probe.duration);
          field('songLength').value = fmt(cfg.track.length);
          field('start').value = cfg.track.start;
          applyAndReplay();
        }
      }, { once: true });
      if (!soundOn) actions.sound(soundBtn);
      editorStatus.textContent = `${file.name} loaded. Sound is on.`;
    } else if (el.name === 'logo') {
      cfg.logo.src = url;
      cfg.logo.text = '';
      field('wordmark').value = '';
      editorStatus.textContent = `Logo replaced with ${file.name}.`;
    }
    applyAndReplay();
  });

  sceneList.addEventListener('click', (e) => {
    const btn = e.target.closest('.ui-npad-editor__remove');
    if (!btn) return;
    if (cfg.scenes.length <= 1) { editorStatus.textContent = 'An ad needs at least one scene.'; return; }
    const i = +btn.closest('.ui-npad-editor__scene').dataset.index;
    cfg.scenes.splice(i, 1);
    cfg.scenes[0].at = 0;
    renderSceneRows();
    const next = sceneList.querySelectorAll('.ui-npad-editor__remove')[Math.min(i, cfg.scenes.length - 1)];
    if (next) next.focus();
    editorStatus.textContent = `Scene ${i + 1} removed.`;
    applyAndReplay();
  });

  const beatLen = () => (60 / Math.max(1, cfg.bpm)) * Math.max(1, cfg.beats);

  dialog.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-editor]');
    if (!btn) return;
    const what = btn.dataset.editor;

    if (what === 'add-scene') {
      const last = cfg.scenes[cfg.scenes.length - 1];
      cfg.scenes.push({ at: +(last.at + beatLen()).toFixed(2), src: last.src, webm: last.webm, poster: last.poster, type: last.type, focus: '50% 50%', alt: '' });
      renderSceneRows();
      sceneList.lastElementChild.querySelector('input[type="file"]').focus();
      editorStatus.textContent = `Scene ${cfg.scenes.length} added. Choose its clip.`;
      applyAndReplay();
    }

    if (what === 'snap') {
      // Scene 1 opens at 0; every later scene cuts on the beat grid.
      // The sign-off keeps its original length, so the player and logo move with the last cut.
      const tail = ORIGINAL.duration - ORIGINAL.scenes[ORIGINAL.scenes.length - 1].at;
      const step = beatLen();
      cfg.scenes.forEach((s, i) => { s.at = i === 0 ? 0 : +(cfg.beatOffset + (i - 1) * step).toFixed(3); });
      const lastAt = cfg.scenes[cfg.scenes.length - 1].at;
      cfg.duration = +(lastAt + tail).toFixed(2);
      cfg.player.out = +(cfg.duration - (ORIGINAL.duration - ORIGINAL.player.out)).toFixed(2);
      cfg.logo.in = +(cfg.duration - (ORIGINAL.duration - ORIGINAL.logo.in)).toFixed(2);
      fillEditor();
      editorStatus.textContent = `Cuts every ${step.toFixed(2)} seconds. The ad is now ${cfg.duration} seconds.`;
      applyAndReplay();
    }

    if (what === 'reset') {
      cfg = clone(ORIGINAL);
      soundOn = false;
      soundBtn.setAttribute('aria-pressed', 'false');
      fillEditor();
      editorStatus.textContent = 'The original ad is back.';
      applyAndReplay();
    }

    if (what === 'copy') {
      const out = exportConfig();
      let copied = false;
      try { await navigator.clipboard.writeText(out); copied = true; } catch (err) { /* fall back below */ }
      let box = dialog.querySelector('.ui-npad-editor__out');
      if (!box) {
        box = document.createElement('textarea');
        box.className = 'ui-npad-editor__out';
        box.readOnly = true;
        box.setAttribute('aria-label', 'Config JSON');
        btn.closest('form').appendChild(box);
      }
      box.value = out;
      if (!copied) { box.focus(); box.select(); }
      editorStatus.textContent = copied
        ? 'Config copied. Paste it over the config block at the bottom of index.html, and put your files in the folders it names.'
        : 'Copy the config below and paste it over the config block in index.html.';
    }
  });

  function exportConfig() {
    const c = clone(cfg);
    const local = (url, dir) => (fileNames.has(url) ? `${dir}/${fileNames.get(url)}` : url);
    c.scenes = c.scenes.map((s) => {
      const o = { at: s.at, src: local(s.src, 'scenes') };
      if (s.webm) o.webm = s.webm;
      if (s.poster) o.poster = s.poster;
      if (s.in) o.in = s.in;
      o.focus = s.focus || '50% 50%';
      o.alt = s.alt || '';
      return o;
    });
    c.track.audio = c.track.audio ? local(c.track.audio, 'audio') : '';
    c.logo.src = local(c.logo.src, 'images');
    return JSON.stringify(c, null, 2);
  }

  // ---------- start ----------
  formatSel.value = ['auto', 'landscape', 'square', 'portrait'].includes(params.get('format')) ? params.get('format') : 'auto';
  layout();
  build();
  setState();

  if (frozenAt !== null && !Number.isNaN(frozenAt)) {
    seekTo(frozenAt);
  } else if (reduceMQ.matches) {
    seekTo(STILL_T);
  } else {
    seekTo(0);
    // Start once the opening shot can play (or after 2s), so the first cuts land on time
    const first = shotFor(0);
    const go = () => { if (!ready) { ready = true; autoplayCheck(); } };
    if (!first.isVideo || first.el.readyState >= 3) go();
    else {
      first.el.addEventListener('canplaythrough', go, { once: true });
      setTimeout(go, 2000);
    }
  }
  requestAnimationFrame((now) => { lastNow = now; requestAnimationFrame(tick); });
})();
