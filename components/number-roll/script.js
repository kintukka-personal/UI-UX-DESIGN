/* Number Roll: rolling digit strips for numeric text.

   Each digit that changes rolls through every number in between, like an
   odometer: up when the value climbs, down when it falls. Digits that didn't
   change hold still; separators and signs cross-fade.

   Usage:
     <link rel="stylesheet" href="style.css">
     <span id="views"></span>
     <script src="script.js"></script>
     <script>
       var counter = new NumberRoll(document.querySelector("#views"), {
         format: function (v) { return v.toLocaleString("en-AU"); }
       });
       counter.set(1024);   // first call paints, no animation
       counter.set(1025);   // the ones column rolls up one notch
     </script>

   Options: duration (900), stagger (45), easing ("smooth" | "overshoot" |
   "mechanical" | "linear"), lead ("right" | "left"), reduced (null follows the
   OS; true forces instant), format (number in, display string out).
   counter.set(value, { direction: 1 | -1 }) forces the roll direction. */
(function () {
  const EASINGS = {
    smooth:     'cubic-bezier(.22,.78,.2,1)',
    overshoot:  'cubic-bezier(.3,1.46,.5,1)',
    mechanical: 'cubic-bezier(.76,0,.24,1)',
    linear:     'linear'
  };

  const mod10 = n => ((n % 10) + 10) % 10;
  const isDigit = c => c >= '0' && c <= '9';

  class Column {
    constructor(char, host) {
      this.host = host;
      this.char = char;
      this.digit = isDigit(char) ? +char : null;
      this.el = document.createElement('span');
      this.el.className = 'nr-col' + (this.digit === null ? ' nr-sep' : '');
      this.strip = document.createElement('span');
      this.strip.className = 'nr-strip';
      this.el.appendChild(this.strip);
      this.paint([char], 0);
    }

    paint(chars, offset) {
      this.strip.textContent = '';
      for (const c of chars) {
        const cell = document.createElement('span');
        cell.className = 'nr-cell';
        cell.textContent = c;
        this.strip.appendChild(cell);
      }
      this.strip.style.transform = `translateY(${-offset * 100 / chars.length}%)`;
    }

    settle(char) {
      if (this.anim) { this.anim.cancel(); this.anim = null; }
      this.char = char;
      this.digit = isDigit(char) ? +char : null;
      this.strip.style.transform = 'none';
      this.paint([char], 0);
    }

    update(char, dir, delay) {
      if (char === this.char) return;
      const o = this.host.options;
      if (this.host.still()) { this.settle(char); return; }
      if (this.anim) { this.anim.cancel(); this.anim = null; this.paint([this.char], 0); }

      if (this.digit === null || !isDigit(char)) return this.fade(char, o, delay);

      const from = this.digit, to = +char, s = dir >= 0 ? 1 : -1;
      const steps = s > 0 ? mod10(to - from) : mod10(from - to);

      // The run of digits actually travelled, plus one past the target so an
      // overshooting curve reveals a real number instead of a gap.
      const run = [];
      for (let i = 0; i <= steps + 1; i++) run.push(String(mod10(from + s * i)));

      let cells, startIdx, endIdx;
      if (s > 0) { cells = run;                   startIdx = 0;         endIdx = steps; }
      else       { cells = run.slice().reverse(); startIdx = steps + 1; endIdx = 1;     }

      this.paint(cells, startIdx);
      const h = this.el.offsetHeight;
      const anim = this.strip.animate(
        [{ transform: `translateY(${-startIdx * h}px)` },
         { transform: `translateY(${-endIdx   * h}px)` }],
        { duration: o.duration, delay, easing: EASINGS[o.easing] || EASINGS.smooth, fill: 'both' }
      );
      this.anim = anim;
      anim.finished.then(() => { if (this.anim === anim) this.settle(char); }).catch(() => {});
      this.char = char;
      this.digit = to;
    }

    // Separators and signs don't roll — they trade places.
    fade(char, o, delay) {
      const d = Math.min(o.duration, 280);
      const a = this.strip.animate(
        [{ opacity: 1 }, { opacity: 0, offset: .45 }, { opacity: 0, offset: .55 }, { opacity: 1 }],
        { duration: d, delay, easing: 'ease-in-out' }
      );
      setTimeout(() => this.paint([char], 0), delay + d * .5);
      this.char = char;
      this.digit = isDigit(char) ? +char : null;
      a.finished.catch(() => {});
    }

    enter(dir, delay) {
      if (this.host.still()) return;
      const o = this.host.options, w = this.el.offsetWidth;
      this.el.animate(
        [{ width: '0px', opacity: 0, transform: `translateY(${dir >= 0 ? 55 : -55}%)` },
         { width: w + 'px', opacity: 1, transform: 'translateY(0)' }],
        { duration: o.duration * .8, delay, easing: EASINGS.smooth, fill: 'backwards' }
      ).finished.catch(() => {});
    }

    exit(dir, delay, done) {
      if (this.host.still()) { done(); return; }
      const o = this.host.options, w = this.el.offsetWidth;
      const a = this.el.animate(
        [{ width: w + 'px', opacity: 1, transform: 'translateY(0)' },
         { width: '0px', opacity: 0, transform: `translateY(${dir >= 0 ? -55 : 55}%)` }],
        { duration: o.duration * .7, delay, easing: EASINGS.smooth, fill: 'forwards' }
      );
      a.finished.then(done).catch(done);
    }
  }

  class NumberRoll {
    constructor(el, options = {}) {
      this.el = el;
      this.el.classList.add('nr');
      this.options = Object.assign({
        duration: 900,
        stagger: 45,
        easing: 'smooth',
        lead: 'right',
        reduced: null,
        format: v => String(v)
      }, options);
      this.cols = [];
      this.value = null;
    }

    still() {
      if (this.options.reduced !== null) return this.options.reduced;
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    set(value, { direction } = {}) {
      const text = String(this.options.format(value));
      const dir = direction !== undefined ? direction
                : (this.value === null ? 1 : (value >= this.value ? 1 : -1));
      const first = this.value === null;
      this.value = value;
      this.render(text, dir, first);
    }

    render(text, dir, instant) {
      const next = [...text];
      const prev = this.cols;
      const grow = next.length - prev.length;

      // Right-hand columns stay anchored; only the left end grows or shrinks.
      if (grow > 0) {
        // Insert in reading order ahead of the existing columns. Inserting each
        // one before the current first child would reverse them.
        const anchor = this.el.firstChild;
        for (let i = 0; i < grow; i++) {
          const col = new Column(next[i], this);
          this.el.insertBefore(col.el, anchor);
          this.cols.splice(i, 0, col);
          if (!instant) col.enter(dir, this.delay(i, next.length));
        }
      } else if (grow < 0) {
        const leaving = this.cols.splice(0, -grow);
        leaving.forEach((col, i) => {
          if (instant) { col.el.remove(); return; }
          col.exit(dir, this.delay(i, prev.length), () => col.el.remove());
        });
      }

      const base = grow > 0 ? grow : 0;
      this.cols.forEach((col, i) => {
        const char = next[i];
        if (instant || (grow > 0 && i < base)) col.settle(char);
        else col.update(char, dir, this.delay(i, next.length));
      });
    }

    delay(i, len) {
      const from = this.options.lead === 'left' ? i : (len - 1 - i);
      return from * this.options.stagger;
    }
  }

  window.NumberRoll = NumberRoll;
})();
