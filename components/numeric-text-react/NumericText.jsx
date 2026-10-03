/**
 * NumericText
 * -----------
 * A content transition for text views displaying numeric text.
 *
 * When the value changes, each digit column performs an odometer roll in the
 * direction of travel: counting up, the new digit rises from below and pushes
 * the old one out the top; counting down, it descends from above. Digits that
 * did not change do not move. Non-digit glyphs (currency symbols, grouping
 * separators, decimal points, signs) are held static.
 *
 * Columns are keyed by place value from the right, so 999 -> 1,000 preserves
 * the identity of the existing digits and animates only the new leading column
 * and the separator into existence.
 *
 * All structural/motion CSS is inline. The component ships no class names and
 * no stylesheet, so it composes with Tailwind, CSS modules, vanilla CSS, or
 * anything else — pass `className` and `style` to control type, color, size.
 *
 * Two variants ship:
 *
 *   odometer   the roll alone — a clean mechanical flip
 *   blur       the roll plus a motion blur whose strength tracks the strip's
 *              actual vertical velocity, sampled from the derivative of
 *              whatever easing curve you pass. The smear builds as the digit
 *              accelerates, peaks where it is moving fastest, and resolves to
 *              zero before it lands, so the glyph is always crisp at rest.
 *
 * Usage
 * -----
 *   <NumericText value={revenue} format={{ style: 'currency', currency: 'USD' }} />
 *   <NumericText value={count} direction="down" className="text-6xl font-semibold" />
 *   <NumericText value={views} variant="blur" blurAmount={0.1} />
 *
 * Props
 * -----
 *   value      number    the value to display
 *   locale     string    BCP 47 tag for Intl.NumberFormat          default 'en-US'
 *   format     object    Intl.NumberFormatOptions                  default undefined
 *   direction  string    'auto' | 'up' | 'down'                    default 'auto'
 *                        'auto' derives direction from the sign of the delta
 *   variant    string    'odometer' | 'blur'                       default 'odometer'
 *   blurAmount number    peak blur radius in em, so it scales with
 *                        font-size. Only read when variant='blur'.
 *                        The column clips to its own advance width, so
 *                        keep this under ~0.15em or the smear squares
 *                        off against the column edge                 default 0.08
 *   duration   number    roll duration in ms                       default 420
 *   easing     string    any CSS timing function                   default a soft ease-out
 *   stagger    number    ms of delay added per place value, so the
 *                        ones column leads and higher places follow default 28
 *   as         elem      element type for the root                 default 'span'
 *   label      string    overrides the text announced to AT
 *   className  string
 *   style      object
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/* ------------------------------------------------------------------ config */

// Cell height. Slightly over 1em so no font clips its numerals at the baseline
// or the cap line when the column sets overflow: hidden.
const CELL_H = "1.15em";

// Resting max-width for a column. Any value wider than the widest glyph works:
// max-width does not stretch the box, it only caps it, so the column still
// sizes to its content. It exists purely as an animatable end state for the
// collapse/expand that runs when the number gains or loses a place.
const OPEN_W = "3ch";

const SR_ONLY = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

/* ------------------------------------------------------------------- utils */

/**
 * Split a formatted string into columns and give each one a stable key.
 *
 * The string is cut into three zones, because they anchor differently:
 *
 *   prefix   everything before the first digit — "$", "-", "€ "
 *            Anchored LEFT. A prefix is not a place value; if it were keyed
 *            from the right it would collapse and re-expand every time the
 *            number gained a digit, which reads as a glitch.
 *
 *   core     first digit through last digit, separators included
 *            Anchored RIGHT, measured from the last digit, so place value is
 *            preserved. The ones column is d0 in "999" and still d0 in
 *            "1,000"; the decimal point is s2 in "$999.99" and still s2 in
 *            "$1,000.00". React reuses those nodes and their roll state, so
 *            only genuinely new columns mount.
 *
 *   suffix   everything after the last digit — "%", " kg", " M"
 *            Anchored RIGHT from the end of the string.
 *
 * Non-digit glyphs fold their character into the key, so a separator replacing
 * a different symbol at the same position is treated as a swap rather than a
 * silent mutation of the same node.
 *
 * `r` is the sort rank and the stagger rank: higher is further left, so the
 * ones column leads the cascade and higher places follow.
 */
function tokenize(str) {
  const n = str.length;

  let first = -1;
  let last = -1;
  for (let i = 0; i < n; i++) {
    const c = str[i];
    if (c >= "0" && c <= "9") {
      if (first < 0) first = i;
      last = i;
    }
  }

  const out = [];
  for (let i = 0; i < n; i++) {
    const char = str[i];
    const isDigit = char >= "0" && char <= "9";

    let key;
    let r;

    if (first < 0) {
      // No digits at all — "NaN", "∞". Treat the whole string as prefix.
      r = n - 1 - i;
      key = `p${i}:${char}`;
    } else if (i < first) {
      r = last - i;
      key = `p${i}:${char}`;
    } else if (i > last) {
      r = last - i;
      key = `x${n - 1 - i}:${char}`;
    } else {
      r = last - i;
      key = isDigit ? `d${r}` : `s${r}:${char}`;
    }

    out.push({ char, isDigit, r, key, exiting: false });
  }
  return out;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    if (mq.addEventListener) {
      mq.addEventListener("change", sync);
      return () => mq.removeEventListener("change", sync);
    }
    mq.addListener(sync);
    return () => mq.removeListener(sync);
  }, []);
  return reduced;
}

/* ------------------------------------------------------------ motion blur */

const NAMED_EASINGS = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
};

/**
 * Pull the four control points out of a CSS timing function.
 *
 * Returns null for anything that is not a cubic bezier — steps(), linear()
 * with stops, a custom ident. Those have no useful derivative to sample, and
 * the caller falls back to a symmetric ramp rather than guessing.
 */
function parseEasing(easing) {
  if (typeof easing !== "string") return null;
  const e = easing.trim().toLowerCase();
  if (NAMED_EASINGS[e]) return NAMED_EASINGS[e];
  const m = /^cubic-bezier\(([^)]+)\)$/.exec(e);
  if (!m) return null;
  const parts = m[1].split(",").map((s) => parseFloat(s));
  if (parts.length !== 4 || parts.some((p) => !Number.isFinite(p))) return null;
  return parts;
}

/**
 * Evaluate a cubic bezier easing at time t.
 *
 * A CSS bezier is a parametric curve, so progress is not a closed-form
 * function of time — x(s) must be inverted first. Newton-Raphson converges in
 * a handful of iterations at this precision; bisection catches the flat spots
 * where the derivative vanishes and Newton would stall.
 */
function cubicBezier(x1, y1, x2, y2) {
  const A = (a, b) => 1 - 3 * b + 3 * a;
  const B = (a, b) => 3 * b - 6 * a;
  const C = (a) => 3 * a;
  const calc = (s, a, b) => ((A(a, b) * s + B(a, b)) * s + C(a)) * s;
  const slope = (s, a, b) => 3 * A(a, b) * s * s + 2 * B(a, b) * s + C(a);

  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;

    let s = t;
    for (let i = 0; i < 8; i++) {
      const d = slope(s, x1, x2);
      if (Math.abs(d) < 1e-6) break;
      const x = calc(s, x1, x2) - t;
      if (Math.abs(x) < 1e-6) return calc(s, y1, y2);
      s -= x / d;
    }

    let lo = 0;
    let hi = 1;
    s = t;
    for (let i = 0; i < 20; i++) {
      const x = calc(s, x1, x2);
      if (Math.abs(x - t) < 1e-6) break;
      if (x > t) hi = s;
      else lo = s;
      s = (lo + hi) / 2;
    }
    return calc(s, y1, y2);
  };
}

/**
 * Build the blur keyframes for a roll.
 *
 * Blur is proportional to speed, and speed is the derivative of the easing
 * curve — so the curve is sampled, differenced, and normalised against its own
 * maximum. A soft ease-out peaks early and trails off; an ease-in-out peaks in
 * the middle. The blur therefore follows whatever motion the caller actually
 * asked for instead of assuming a shape.
 *
 * The first and last frames are pinned to zero regardless: a digit must be
 * legible the instant it stops, and a filter left on the element would also
 * keep a compositing layer alive for no reason.
 */
function blurRamp(easing, amount, samples = 14) {
  const pts = parseEasing(easing);
  const f = pts ? cubicBezier(pts[0], pts[1], pts[2], pts[3]) : null;

  const v = [];
  let peak = 0;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    let speed;
    if (f) {
      const h = 0.5 / samples;
      speed = Math.abs(f(Math.min(1, t + h)) - f(Math.max(0, t - h)));
    } else {
      // Unparseable easing — assume a symmetric arc peaking mid-roll.
      speed = Math.sin(Math.PI * t);
    }
    if (speed > peak) peak = speed;
    v.push(speed);
  }

  if (peak <= 0) {
    return [
      { offset: 0, filter: "blur(0em)" },
      { offset: 1, filter: "blur(0em)" },
    ];
  }

  return v.map((speed, i) => {
    const offset = i / samples;
    const edge = i === 0 || i === samples;
    const px = edge ? 0 : (speed / peak) * amount;
    return { offset, filter: `blur(${px.toFixed(4)}em)` };
  });
}

/* -------------------------------------------------------------------- cell */

/**
 * One column of the number.
 *
 * A digit column holds a two-cell strip and animates the strip's transform.
 * Only two cells are ever rendered — the outgoing digit and the incoming one —
 * so a change never spins through the intervening digits. 7 -> 2 is a single
 * roll, not five.
 *
 * The cell order is a function of direction, which lets one transform cover
 * both cases and sidesteps the 9 -> 0 wrap problem entirely:
 *
 *   counting up    strip = [old, new]   translateY   0%  ->  -50%
 *   counting down  strip = [new, old]   translateY  -50% ->    0%
 *
 * At rest the strip holds the same digit twice and sits at 0%, so settling
 * after a transition is glyph-identical to the animated end state and there is
 * no flash.
 */
function Cell({
  token,
  dir,
  duration,
  easing,
  delay,
  reduced,
  animateEnter,
  variant,
  blurAmount,
}) {
  const outerRef = useRef(null);
  const stripRef = useRef(null);
  const settleTimer = useRef(null);
  const anims = useRef([]);

  const [roll, setRoll] = useState(() => ({
    from: token.char,
    to: token.char,
    d: 1,
    run: 0,
  }));

  const idle = roll.from === roll.to;

  /* -- expand on mount, when the number gains a place ---------------------- */
  useLayoutEffect(() => {
    const el = outerRef.current;
    if (!el || !animateEnter || reduced) return;
    el.style.transition = "none";
    el.style.maxWidth = "0ch";
    el.style.opacity = "0";
    void el.offsetWidth; // flush, so the browser has a start value to tween from
    el.style.transition =
      `max-width ${duration}ms ${easing}, opacity ${duration}ms ${easing}`;
    el.style.maxWidth = OPEN_W;
    el.style.opacity = "1";
    // Mount-only on purpose: this is the enter animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -- collapse, when the number loses a place ----------------------------- */
  useLayoutEffect(() => {
    const el = outerRef.current;
    if (!el || !token.exiting) return;
    el.style.transition = reduced
      ? "none"
      : `max-width ${duration}ms ${easing}, opacity ${duration}ms ${easing}`;
    el.style.maxWidth = "0ch";
    el.style.opacity = "0";
  }, [token.exiting, duration, easing, reduced]);

  /* -- queue a roll whenever the digit changes ----------------------------- */
  useEffect(() => {
    if (!token.isDigit || token.exiting) return;
    if (token.char === roll.to) return;
    setRoll((p) => ({ from: p.to, to: token.char, d: dir, run: p.run + 1 }));
  }, [token.char, token.isDigit, token.exiting, dir, roll.to]);

  const settle = useCallback(() => {
    if (settleTimer.current) {
      clearTimeout(settleTimer.current);
      settleTimer.current = null;
    }
    setRoll((p) => (p.from === p.to ? p : { ...p, from: p.to }));
  }, []);

  /* -- run the roll -------------------------------------------------------- */
  // The Web Animations API rather than a CSS transition, because transform and
  // filter need to run as two independent animations on one element.
  //
  // The effect-level `easing` remaps iteration progress BEFORE keyframes are
  // looked up, so offsets are read in warped-progress space, not in time. Fold
  // the blur ramp into the roll and its offsets get eased a second time: under
  // the default curve the 0.50 keyframe fires at 13% of the duration, and 76%
  // of the ramp is spent before the quarter mark. The transform is unharmed by
  // that remap — it is what the curve is for — but the ramp's offsets already
  // encode the velocity profile and must be read on a clock. Split apart, the
  // roll keeps the caller's curve, the ramp runs linear, and the compositor
  // composes the two.
  useLayoutEffect(() => {
    if (!token.isDigit || roll.run === 0) return;
    const el = stripRef.current;
    if (!el) return;

    const start = roll.d > 0 ? "0%" : "-50%";
    const end = roll.d > 0 ? "-50%" : "0%";

    anims.current.forEach((a) => a.cancel());
    anims.current = [];

    // The resting state is written first, so whatever happens to the animation
    // — finished, cancelled, unsupported — the element holds the end position.
    el.style.transition = "none";
    el.style.filter = "";
    el.style.transform = `translateY(${end})`;

    if (reduced || typeof el.animate !== "function") {
      settle();
      return;
    }

    const roller = el.animate(
      [{ transform: `translateY(${start})` }, { transform: `translateY(${end})` }],
      { duration, easing, delay, fill: "backwards" }
    );
    anims.current.push(roller);

    if (variant === "blur" && blurAmount > 0) {
      // Linear timing on purpose: the ramp's own offsets already encode the
      // velocity profile of `easing`. Easing it again would double-apply.
      anims.current.push(
        el.animate(blurRamp(easing, blurAmount), {
          duration,
          easing: "linear",
          delay,
          fill: "backwards",
        })
      );
    }

    roller.onfinish = settle;

    // onfinish does not fire for an animation cancelled by a detached or
    // display:none element. Belt and braces so a column can never strand.
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(settle, duration + delay + 80);
    // Keyed on run so a repeat change to the same digit still retriggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roll.run]);

  /* -- normalise to the resting position ----------------------------------- */
  useLayoutEffect(() => {
    if (!idle) return;
    const el = stripRef.current;
    if (!el) return;
    anims.current.forEach((a) => a.cancel());
    anims.current = [];
    el.style.transition = "none";
    el.style.filter = "";
    el.style.transform = "translateY(0%)";
  }, [idle, roll.from]);

  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
      anims.current.forEach((a) => a.cancel());
      anims.current = [];
    },
    []
  );

  const shell = {
    display: "inline-block",
    maxWidth: OPEN_W,
    overflow: "hidden",
    height: CELL_H,
    lineHeight: CELL_H,
    verticalAlign: "bottom",
  };

  const face = { display: "block", height: CELL_H, lineHeight: CELL_H };

  if (!token.isDigit) {
    return (
      <span ref={outerRef} aria-hidden="true" style={{ ...shell, whiteSpace: "pre" }}>
        {token.char}
      </span>
    );
  }

  const cells = roll.d > 0 ? [roll.from, roll.to] : [roll.to, roll.from];

  return (
    <span ref={outerRef} aria-hidden="true" style={shell}>
      <span
        ref={stripRef}
        style={{
          display: "block",
          willChange: variant === "blur" ? "transform, filter" : "transform",
          transform: "translateY(0%)",
        }}
      >
        <span style={face}>{cells[0]}</span>
        <span style={face}>{cells[1]}</span>
      </span>
    </span>
  );
}

/* ---------------------------------------------------------------- component */

export default function NumericText({
  value,
  locale = "en-US",
  format,
  direction = "auto",
  variant = "odometer",
  blurAmount = 0.08,
  duration = 420,
  easing = "cubic-bezier(0.22, 1, 0.36, 1)",
  stagger = 28,
  as: Tag = "span",
  label,
  className,
  style,
  ...rest
}) {
  const reduced = useReducedMotion();

  const formatKey = JSON.stringify(format || {});
  const formatter = useMemo(
    () => new Intl.NumberFormat(locale, format),
    // formatKey stands in for the object identity of `format`
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale, formatKey]
  );

  const text = useMemo(() => formatter.format(value), [formatter, value]);

  // Direction of travel. Read during render against the previous committed
  // value, then the ref catches up after commit.
  const prevValue = useRef(value);
  const dir =
    direction === "up"
      ? 1
      : direction === "down"
      ? -1
      : value >= prevValue.current
      ? 1
      : -1;
  useEffect(() => {
    prevValue.current = value;
  }, [value]);

  const next = useMemo(() => tokenize(text), [text]);

  // Columns that have dropped out are kept in the list one beat longer so they
  // can collapse rather than vanish.
  const [tokens, setTokens] = useState(next);
  const firstRender = useRef(true);

  useEffect(() => {
    const live = new Set(next.map((t) => t.key));
    setTokens((prev) => {
      const dying = prev
        .filter((t) => !live.has(t.key))
        .map((t) => ({ ...t, exiting: true }));
      if (dying.length === 0) return next;
      return [...next, ...dying].sort(
        (a, b) => b.r - a.r || (a.exiting ? 1 : 0) - (b.exiting ? 1 : 0)
      );
    });

    const id = setTimeout(
      () => setTokens((cur) => (cur.some((t) => t.exiting) ? cur.filter((t) => !t.exiting) : cur)),
      duration + stagger * 6 + 80
    );
    return () => clearTimeout(id);
  }, [next, duration, stagger]);

  const mountedOnce = !firstRender.current;
  useEffect(() => {
    firstRender.current = false;
  }, []);

  return (
    <Tag
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "flex-end",
        fontVariantNumeric: "tabular-nums",
        fontFeatureSettings: '"tnum" 1',
        position: "relative",
        ...style,
      }}
      {...rest}
    >
      {tokens.map((t) => (
        <Cell
          key={t.key}
          token={t}
          dir={dir}
          duration={duration}
          easing={easing}
          delay={Math.max(0, Math.min(t.r, 8)) * stagger}
          reduced={reduced}
          animateEnter={mountedOnce}
          variant={variant}
          blurAmount={blurAmount}
        />
      ))}
      <span style={SR_ONLY}>{label ?? text}</span>
    </Tag>
  );
}

export { tokenize };
