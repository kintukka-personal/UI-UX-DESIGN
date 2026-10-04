"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";

/* ------------------------------------------------------------------ */
/*  Geometry (design px, before the fit-to-viewport scale)             */
/* ------------------------------------------------------------------ */

const LAPTOP_W = 512;
const LID_H = 326; // 8px bezel around a 496 x 310 (16:10) display
const BASE_H = 352;
const LID_TILT = -42; // deg; negative leans the lid's top edge toward the viewer
const PERSPECTIVE = 1200;

// Where the tilted lid's top edge lands once projected, so the layout can
// reserve exactly the space the lid takes on screen.
const LID_RISE = LID_H * Math.sin((-LID_TILT * Math.PI) / 180);
const LID_FLARE = PERSPECTIVE / (PERSPECTIVE - LID_RISE);
const LID_DEPTH = LID_H * Math.cos((LID_TILT * Math.PI) / 180) * LID_FLARE; // hinge -> projected top
const LID_TOP_W = LAPTOP_W * LID_FLARE;
const RIG_H = LID_DEPTH + BASE_H;

const TITLE_GAP = 32;
const MAX_SCREEN_W = 1280;

/* ------------------------------------------------------------------ */
/*  Choreography, in scroll progress (0 = section pinned, 1 = released) */
/* ------------------------------------------------------------------ */

const PHASE = {
  title: [0, 0.1], // headline lifts and blurs away
  release: [0.03, 0.12], // screen unseats from the lid
  flight: [0.1, 0.52], // screen stands up, grows and centres
  laptop: [0.14, 0.46], // laptop recedes out of focus
  land: 0.52, // impact fires here; the rest is a hold on the landed screen
  spotlight: [0.4, 0.58],
};

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;
const within = (p, [a, b]) => clamp01((p - a) / (b - a));
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeInQuad = (t) => t * t;
const blur = (px) => (px > 0.05 ? `blur(${px.toFixed(2)}px)` : "none");
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Fit the laptop to the viewport and work out where the screen lands. */
function measure(vw, vh, titleH) {
  const fit = Math.min(1, (vw - 32) / LID_TOP_W, (vh - titleH - TITLE_GAP - 48) / RIG_H);
  const total = titleH + TITLE_GAP + RIG_H * fit;
  const titleTop = Math.max(16, (vh - total) / 2);
  const rigTop = titleTop + titleH + TITLE_GAP;
  const rigLeft = (vw - LAPTOP_W * fit) / 2;

  const gutter = Math.max(16, Math.min(vw, vh) * 0.07);
  const landedW = Math.min(vw - gutter * 2, ((vh - gutter * 2) * LAPTOP_W) / LID_H, MAX_SCREEN_W);
  const scale = landedW / (LAPTOP_W * fit);

  // The screen scales from its bottom edge (the hinge). Solve for the
  // translate that puts its centre in the middle of the viewport.
  const x = (vw / 2 - rigLeft) / fit - LAPTOP_W / 2;
  const y = (vh / 2 - rigTop) / fit - LID_DEPTH + (LID_H * scale) / 2;

  return { fit, titleTop, rigTop, rigLeft, land: { x, y, scale } };
}

function screenTransform(p, land) {
  const lift = easeOutCubic(within(p, PHASE.release));
  const t = within(p, PHASE.flight);
  const move = easeInOutCubic(t);
  const turn = easeOutCubic(Math.min(1, t / 0.7)); // stand up early, then travel

  const rotate = lerp(lerp(LID_TILT, LID_TILT * 0.85, lift), 0, turn);
  const scale = lerp(1 + 0.03 * lift, land.scale, move);
  const x = lerp(0, land.x, move);
  const y = lerp(-10 * lift, land.y, move);

  return `translate3d(${x}px, ${y}px, 0) perspective(${PERSPECTIVE}px) rotateX(${rotate}deg) scale(${scale})`;
}

/* ------------------------------------------------------------------ */
/*  MacbookScroll                                                       */
/* ------------------------------------------------------------------ */

export function MacbookScroll({ src, alt = "", title, badge, showGradient = false, className = "", children }) {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const titleRef = useRef(null);

  const reduceMotion = useReducedMotion();
  const reduceRef = useRef(reduceMotion);
  reduceRef.current = reduceMotion;

  const [layout, setLayout] = useState(null);
  const land = useMotionValue({ x: 0, y: 0, scale: 1 });

  useIsoLayoutEffect(() => {
    const stage = stageRef.current;
    const update = () => {
      const next = measure(stage.clientWidth, stage.clientHeight, titleRef.current.offsetHeight);
      land.set(next.land);
      setLayout(next);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [land]);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 160, damping: 32, mass: 0.5, restDelta: 0.0002 });
  const progress = useTransform(smooth, (p) => (reduceRef.current ? 0 : p));

  // Headline
  const titleOpacity = useTransform(progress, [0, PHASE.title[1] * 0.8], [1, 0]);
  const titleY = useTransform(progress, PHASE.title, [0, -40]);
  const titleFilter = useTransform(progress, (p) => blur(within(p, PHASE.title) * 6));

  // Laptop recedes: it lingers, then falls away out of focus
  const laptopT = useTransform(progress, (p) => within(p, PHASE.laptop));
  const laptopOpacity = useTransform(laptopT, (t) => 1 - easeInQuad(t));
  const laptopScale = useTransform(laptopT, [0, 1], [1, 0.86]);
  const laptopY = useTransform(laptopT, [0, 1], [0, 70]);
  const laptopFilter = useTransform(laptopT, (t) => blur(t * 8));
  const afterglow = useTransform(progress, [0.06, 0.16, 0.34], [0, 0.9, 0]);

  // Screen flight
  const transform = useTransform([progress, land], ([p, l]) => screenTransform(p, l));
  const shadow = useTransform(progress, [0.04, 0.2, 0.5, 0.6], [0, 1, 1, 0.6]);
  const dim = useTransform(progress, [0.08, 0.2, 0.46, PHASE.land + 0.02], [0, 0.35, 0.35, 0]);

  // Landing impact: time-based, so it hits the same however fast you scroll
  const bump = useMotionValue(1);
  const ring = useMotionValue(0);
  const sheen = useMotionValue(0);
  const flash = useMotionValue(0);
  const ringOpacity = useTransform(ring, [0, 0.02, 1], [0, 0.7, 0]);
  const ringScale = useTransform(ring, [0, 1], [1, 1.08]);
  const sheenX = useTransform(sheen, [0, 1], ["-110%", "110%"]);
  const glow = useTransform([progress, flash], ([p, f]) =>
    clamp01(within(p, PHASE.spotlight) * 0.55 + f * 0.45)
  );

  const landed = useRef(false);
  useMotionValueEvent(progress, "change", (p) => {
    if (!landed.current && p >= PHASE.land) {
      landed.current = true;
      animate(bump, [1, 1.035, 0.992, 1], { duration: 0.8, times: [0, 0.22, 0.6, 1], ease: "easeOut" });
      animate(ring, [0, 1], { duration: 0.9, ease: [0.22, 1, 0.36, 1] });
      animate(sheen, [0, 1], { duration: 1.1, delay: 0.05, ease: [0.65, 0, 0.35, 1] });
      animate(flash, [0, 1, 0], { duration: 1.2, times: [0, 0.15, 1] });
    } else if (landed.current && p < PHASE.land - 0.05) {
      landed.current = false; // re-arm so the landing replays on the way back down
    }
  });

  return (
    <section ref={sectionRef} className={`relative ${reduceMotion ? "" : "h-[400vh]"} ${className}`}>
      <div
        ref={stageRef}
        className="sticky top-0 h-svh w-full overflow-hidden"
        style={{ visibility: layout ? "visible" : "hidden" }}
      >
        <motion.h2
          ref={titleRef}
          style={{ top: layout?.titleTop, opacity: titleOpacity, y: titleY, filter: titleFilter }}
          className="absolute inset-x-0 px-4 text-center text-2xl font-bold text-neutral-800 sm:text-3xl dark:text-white"
        >
          {title ?? (
            <span>
              This Macbook is built with Tailwindcss. <br /> No kidding.
            </span>
          )}
        </motion.h2>

        {layout && (
          <div
            className="absolute"
            style={{
              left: layout.rigLeft,
              top: layout.rigTop,
              width: LAPTOP_W,
              height: RIG_H,
              transform: `scale(${layout.fit})`,
              transformOrigin: "0 0",
            }}
          >
            <motion.div
              className="absolute inset-0"
              style={{
                opacity: laptopOpacity,
                scale: laptopScale,
                y: laptopY,
                filter: laptopFilter,
                transformOrigin: `50% ${LID_DEPTH}px`,
              }}
            >
              <Lid afterglow={afterglow} />
              <Base badge={badge} showGradient={showGradient} />
            </motion.div>

            <motion.div
              className="absolute left-0 z-10"
              style={{ top: LID_DEPTH - LID_H, width: LAPTOP_W, height: LID_H, transform, transformOrigin: "50% 100%" }}
            >
              {/* contact shadow while it flies, then a soft glow once it lands */}
              <motion.div
                aria-hidden
                className="absolute -inset-x-[10%] -bottom-[18%] h-1/2"
                style={{ opacity: shadow, background: "radial-gradient(closest-side, rgba(0,0,0,0.7), transparent)" }}
              />
              <motion.div
                aria-hidden
                className="absolute -inset-[18%]"
                style={{
                  opacity: glow,
                  background: "radial-gradient(closest-side, rgba(129,140,248,0.32), rgba(129,140,248,0.08) 60%, transparent)",
                }}
              />

              <motion.div style={{ scale: bump }} className="relative h-full w-full rounded-2xl bg-[#010101] p-2">
                <div className="relative h-full w-full overflow-hidden rounded-lg bg-[#272729]">
                  {children ?? (
                    <img
                      src={src}
                      alt={alt}
                      draggable={false}
                      className="absolute inset-0 h-full w-full object-cover object-left-top"
                    />
                  )}
                  <motion.div aria-hidden className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: dim }} />
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      x: sheenX,
                      background: "linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.14) 50%, transparent 62%)",
                    }}
                  />
                </div>
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute -inset-px rounded-2xl border border-indigo-200/70"
                  style={{ opacity: ringOpacity, scale: ringScale }}
                />
              </motion.div>
            </motion.div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Laptop                                                              */
/* ------------------------------------------------------------------ */

/** The lid the screen ejects from: bezel, empty glass, and the light it leaves behind. */
function Lid({ afterglow }) {
  return (
    <div
      className="absolute left-0 rounded-2xl bg-[#010101] p-2"
      style={{
        top: LID_DEPTH - LID_H,
        width: LAPTOP_W,
        height: LID_H,
        transform: `perspective(${PERSPECTIVE}px) rotateX(${LID_TILT}deg)`,
        transformOrigin: "50% 100%",
      }}
    >
      <div
        className="relative h-full w-full overflow-hidden rounded-lg bg-[#050507]"
        style={{ boxShadow: "0 2px 0 2px #171717 inset" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-transparent" />
        <motion.div
          className="absolute inset-0"
          style={{
            opacity: afterglow,
            background: "radial-gradient(70% 80% at 50% 100%, rgba(165,180,252,0.35), transparent)",
          }}
        />
      </div>
    </div>
  );
}

function Base({ badge, showGradient }) {
  return (
    <div
      className="absolute left-0 overflow-hidden rounded-2xl bg-gray-200 dark:bg-[#272729]"
      style={{ top: LID_DEPTH, width: LAPTOP_W, height: BASE_H }}
    >
      <div className="relative h-10 w-full">
        <div className="absolute inset-x-0 mx-auto h-4 w-[80%] bg-[#050505]" />
      </div>
      <div className="relative flex">
        <SpeakerGrid />
        <Keyboard />
        <SpeakerGrid />
      </div>
      <div
        className="mx-auto my-1 h-32 w-[40%] rounded-xl"
        style={{ boxShadow: "0 0 1px 1px #00000020 inset" }}
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto h-2 w-20 rounded-t-3xl bg-gradient-to-t from-[#272729] to-[#050505]" />
      {showGradient && (
        <div className="absolute inset-x-0 bottom-0 z-50 h-40 w-full bg-gradient-to-t from-white via-white to-transparent dark:from-black dark:via-black" />
      )}
      {badge && <div className="absolute bottom-4 left-4">{badge}</div>}
    </div>
  );
}

function SpeakerGrid() {
  return (
    <div
      className="mx-auto mt-2 h-40 w-[10%] px-[0.5px]"
      style={{
        backgroundImage: "radial-gradient(circle, #08080A 0.5px, transparent 0.5px)",
        backgroundSize: "3px 3px",
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Keyboard                                                            */
/* ------------------------------------------------------------------ */

/* Hairline function-row icons on a 24px grid, stroked. */
const ICON = {
  sunDim: "M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0M12 5h.01M17 7h.01M19 12h.01M17 17h.01M12 19h.01M7 17h.01M5 12h.01M7 7h.01",
  sun: "M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4",
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  search: "M4 10a6 6 0 1 0 12 0a6 6 0 1 0-12 0M21 21l-6-6",
  mic: "M9 5a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0zM5 10a7 7 0 0 0 14 0M8 21h8M12 17v4",
  moon: "M12 3a7.5 7.5 0 0 0 8.3 12.4A9 9 0 1 1 12 3z",
  prev: "M21 5v14l-8-7zM10 5v14l-8-7z",
  play: "M3 5v14l8-7zM15 5v14M20 5v14",
  next: "M3 5v14l8-7zM14 5v14l8-7z",
  mute: "M6 15H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h2l3.5-4.5A.8.8 0 0 1 11 5v14a.8.8 0 0 1-1.5.5zM16 10l4 4m0-4l-4 4",
  volDown: "M6 15H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h2l3.5-4.5A.8.8 0 0 1 11 5v14a.8.8 0 0 1-1.5.5zM15 8a5 5 0 0 1 0 8",
  volUp: "M6 15H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h2l3.5-4.5A.8.8 0 0 1 11 5v14a.8.8 0 0 1-1.5.5zM15 8a5 5 0 0 1 0 8M17.7 5a9 9 0 0 1 0 14",
  globe: "M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M3.6 9h16.8M3.6 15h16.8M11.5 3a17 17 0 0 0 0 18M12.5 3a17 17 0 0 1 0 18",
  left: "M15 6l-6 6l6 6",
  right: "M9 6l6 6l-6 6",
  up: "M6 15l6-6l6 6",
  down: "M6 9l6 6l6-6",
};

// A key is "Q" (one centred legend), ["!", "1"] (shifted over unshifted),
// or an object for modifiers and function keys.
const fn = (n, icon) => ({ top: <Icon d={icon} />, label: `F${n}` });
const mod = (label, top, w, align = "start") => ({ label, top, w, align });

const ROWS = [
  [
    { label: "esc", w: "w-10", align: "start" },
    fn(1, ICON.sunDim),
    fn(2, ICON.sun),
    fn(3, ICON.grid),
    fn(4, ICON.search),
    fn(5, ICON.mic),
    fn(6, ICON.moon),
    fn(7, ICON.prev),
    fn(8, ICON.play),
    fn(9, ICON.next),
    fn(10, ICON.mute),
    fn(11, ICON.volDown),
    fn(12, ICON.volUp),
    { power: true },
  ],
  [
    ["~", "`"], ["!", "1"], ["@", "2"], ["#", "3"], ["$", "4"], ["%", "5"], ["^", "6"],
    ["&", "7"], ["*", "8"], ["(", "9"], [")", "0"], ["—", "_"], ["+", "="],
    mod("delete", null, "w-10", "end"),
  ],
  [
    mod("tab", null, "w-10"),
    ..."QWERTYUIOP",
    ["{", "["], ["}", "]"], ["|", "\\"],
  ],
  [
    mod("caps lock", null, "w-[2.8rem]"),
    ..."ASDFGHJKL",
    [":", ";"], ['"', "'"],
    mod("return", null, "w-[2.85rem]", "end"),
  ],
  [
    mod("shift", null, "w-[3.65rem]"),
    ..."ZXCVBNM",
    ["<", ","], [">", "."], ["?", "/"],
    mod("shift", null, "w-[3.65rem]", "end"),
  ],
];

const BOTTOM_ROW = [
  mod("fn", <Icon d={ICON.globe} />, "w-6"),
  mod("control", "⌃", "w-6"),
  mod("option", "⌥", "w-6"),
  mod("command", "⌘", "w-8"),
  { label: "", w: "w-[8.2rem]" },
  mod("command", "⌘", "w-8"),
  mod("option", "⌥", "w-6"),
];

function Keyboard() {
  return (
    <div className="mx-auto h-full w-[80%] rounded-md p-1 [&>div]:mb-[2px] [&>div]:flex [&>div]:gap-[2px]">
      {ROWS.map((row, i) => (
        <div key={i}>
          {row.map((k, j) => (
            <Key key={j} k={k} />
          ))}
        </div>
      ))}
      <div className="items-end">
        {BOTTOM_ROW.map((k, j) => (
          <Key key={j} k={k} />
        ))}
        <Key k={{ label: <Icon d={ICON.left} />, h: "h-3" }} />
        <div className="flex flex-col gap-px">
          <Key k={{ label: <Icon d={ICON.up} />, h: "h-[11.5px]" }} />
          <Key k={{ label: <Icon d={ICON.down} />, h: "h-[11.5px]" }} />
        </div>
        <Key k={{ label: <Icon d={ICON.right} />, h: "h-3" }} />
      </div>
    </div>
  );
}

function Key({ k }) {
  const spec = typeof k === "string" ? { label: k } : Array.isArray(k) ? { top: k[0], label: k[1] } : k;
  const { label, top, w = "w-6", h = "h-6", align, power } = spec;

  const layout =
    align === "start"
      ? "items-start justify-end pb-[2px] pl-[4px]"
      : align === "end"
        ? "items-end justify-end pb-[2px] pr-[4px]"
        : "items-center justify-center";

  return (
    <div className="rounded-[4px] bg-white/[0.2] p-[0.5px] shadow-xl shadow-white/60">
      <div
        className={`flex ${h} ${w} items-center justify-center rounded-[3.5px] bg-[#0A090D]`}
        style={{ boxShadow: "0 -0.5px 2px 0 #0D0D0F inset, -0.5px 0 2px 0 #0D0D0F inset" }}
      >
        {power ? (
          <div className="h-4 w-4 rounded-full bg-gradient-to-b from-neutral-900 via-black to-neutral-900 p-px">
            <div className="h-full w-full rounded-full bg-black" />
          </div>
        ) : (
          <div className={`flex h-full w-full flex-col gap-[1px] text-[5px] leading-none text-white ${layout}`}>
            {top && <span className={align ? "" : "mb-[1px]"}>{top}</span>}
            <span>{label}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Icon({ d }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[6px] w-[6px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export default MacbookScroll;
