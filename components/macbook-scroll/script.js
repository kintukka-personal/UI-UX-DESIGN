/* GENERATED from MacbookScroll.jsx and MacbookScrollDemo.jsx by build.mjs. Do not edit by hand. */
var MacbookScrollKit = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod2) => function __require() {
    try {
      return mod2 || (0, cb[__getOwnPropNames(cb)[0]])((mod2 = { exports: {} }).exports, mod2), mod2.exports;
    } catch (e) {
      throw mod2 = 0, e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod2, isNodeMode, target) => (target = mod2 != null ? __create(__getProtoOf(mod2)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod2 || !mod2.__esModule ? __defProp(target, "default", { value: mod2, enumerable: true }) : target,
    mod2
  ));
  var __toCommonJS = (mod2) => __copyProps(__defProp({}, "__esModule", { value: true }), mod2);

  // global:react
  var require_react = __commonJS({
    "global:react"(exports, module) {
      module.exports = window.React;
    }
  });

  // global:motion/react
  var require_react2 = __commonJS({
    "global:motion/react"(exports, module) {
      module.exports = window.Motion;
    }
  });

  // global:react/jsx-runtime
  var require_jsx_runtime = __commonJS({
    "global:react/jsx-runtime"(exports, module) {
      var R = window.React;
      var jsx3 = (type, props, key) => R.createElement(type, key === void 0 ? props : { ...props, key });
      module.exports = { jsx: jsx3, jsxs: jsx3, Fragment: R.Fragment };
    }
  });

  // <stdin>
  var stdin_exports = {};
  __export(stdin_exports, {
    MacbookScroll: () => MacbookScroll,
    MacbookScrollDemo: () => MacbookScrollDemo
  });

  // MacbookScroll.jsx
  var import_react = __toESM(require_react());
  var import_react2 = __toESM(require_react2());
  var import_jsx_runtime = __toESM(require_jsx_runtime());
  var LAPTOP_W = 512;
  var LID_H = 326;
  var BASE_H = 352;
  var LID_TILT = -42;
  var PERSPECTIVE = 1200;
  var LID_RISE = LID_H * Math.sin(-LID_TILT * Math.PI / 180);
  var LID_FLARE = PERSPECTIVE / (PERSPECTIVE - LID_RISE);
  var LID_DEPTH = LID_H * Math.cos(LID_TILT * Math.PI / 180) * LID_FLARE;
  var LID_TOP_W = LAPTOP_W * LID_FLARE;
  var RIG_H = LID_DEPTH + BASE_H;
  var TITLE_GAP = 32;
  var MAX_SCREEN_W = 1280;
  var PHASE = {
    title: [0, 0.1],
    // headline lifts and blurs away
    release: [0.03, 0.12],
    // screen unseats from the lid
    flight: [0.1, 0.52],
    // screen stands up, grows and centres
    laptop: [0.14, 0.46],
    // laptop recedes out of focus
    land: 0.52,
    // impact fires here; the rest is a hold on the landed screen
    spotlight: [0.4, 0.58]
  };
  var clamp01 = (v) => Math.min(1, Math.max(0, v));
  var lerp = (a, b, t) => a + (b - a) * t;
  var within = (p, [a, b]) => clamp01((p - a) / (b - a));
  var easeOutCubic = (t) => 1 - (1 - t) ** 3;
  var easeInQuad = (t) => t * t;
  var blur = (px) => px > 0.05 ? `blur(${px.toFixed(2)}px)` : "none";
  var easeInOutCubic = (t) => t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
  var useIsoLayoutEffect = typeof window === "undefined" ? import_react.useEffect : import_react.useLayoutEffect;
  function measure(vw, vh, titleH) {
    const fit = Math.min(1, (vw - 32) / LID_TOP_W, (vh - titleH - TITLE_GAP - 48) / RIG_H);
    const total = titleH + TITLE_GAP + RIG_H * fit;
    const titleTop = Math.max(16, (vh - total) / 2);
    const rigTop = titleTop + titleH + TITLE_GAP;
    const rigLeft = (vw - LAPTOP_W * fit) / 2;
    const gutter = Math.max(16, Math.min(vw, vh) * 0.07);
    const landedW = Math.min(vw - gutter * 2, (vh - gutter * 2) * LAPTOP_W / LID_H, MAX_SCREEN_W);
    const scale = landedW / (LAPTOP_W * fit);
    const x = (vw / 2 - rigLeft) / fit - LAPTOP_W / 2;
    const y = (vh / 2 - rigTop) / fit - LID_DEPTH + LID_H * scale / 2;
    return { fit, titleTop, rigTop, rigLeft, land: { x, y, scale } };
  }
  function screenTransform(p, land) {
    const lift = easeOutCubic(within(p, PHASE.release));
    const t = within(p, PHASE.flight);
    const move = easeInOutCubic(t);
    const turn = easeOutCubic(Math.min(1, t / 0.7));
    const rotate = lerp(lerp(LID_TILT, LID_TILT * 0.85, lift), 0, turn);
    const scale = lerp(1 + 0.03 * lift, land.scale, move);
    const x = lerp(0, land.x, move);
    const y = lerp(-10 * lift, land.y, move);
    return `translate3d(${x}px, ${y}px, 0) perspective(${PERSPECTIVE}px) rotateX(${rotate}deg) scale(${scale})`;
  }
  function MacbookScroll({ src, alt = "", title, badge, showGradient = false, className = "", children }) {
    const sectionRef = (0, import_react.useRef)(null);
    const stageRef = (0, import_react.useRef)(null);
    const titleRef = (0, import_react.useRef)(null);
    const reduceMotion = (0, import_react2.useReducedMotion)();
    const reduceRef = (0, import_react.useRef)(reduceMotion);
    reduceRef.current = reduceMotion;
    const [layout, setLayout] = (0, import_react.useState)(null);
    const land = (0, import_react2.useMotionValue)({ x: 0, y: 0, scale: 1 });
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
    const { scrollYProgress } = (0, import_react2.useScroll)({ target: sectionRef, offset: ["start start", "end end"] });
    const smooth = (0, import_react2.useSpring)(scrollYProgress, { stiffness: 160, damping: 32, mass: 0.5, restDelta: 2e-4 });
    const progress = (0, import_react2.useTransform)(smooth, (p) => reduceRef.current ? 0 : p);
    const titleOpacity = (0, import_react2.useTransform)(progress, [0, PHASE.title[1] * 0.8], [1, 0]);
    const titleY = (0, import_react2.useTransform)(progress, PHASE.title, [0, -40]);
    const titleFilter = (0, import_react2.useTransform)(progress, (p) => blur(within(p, PHASE.title) * 6));
    const laptopT = (0, import_react2.useTransform)(progress, (p) => within(p, PHASE.laptop));
    const laptopOpacity = (0, import_react2.useTransform)(laptopT, (t) => 1 - easeInQuad(t));
    const laptopScale = (0, import_react2.useTransform)(laptopT, [0, 1], [1, 0.86]);
    const laptopY = (0, import_react2.useTransform)(laptopT, [0, 1], [0, 70]);
    const laptopFilter = (0, import_react2.useTransform)(laptopT, (t) => blur(t * 8));
    const laptopPointer = (0, import_react2.useTransform)(laptopT, (t) => t > 0.9 ? "none" : "auto");
    const afterglow = (0, import_react2.useTransform)(progress, [0.06, 0.16, 0.34], [0, 0.9, 0]);
    const transform = (0, import_react2.useTransform)([progress, land], ([p, l]) => screenTransform(p, l));
    const shadow = (0, import_react2.useTransform)(progress, [0.04, 0.2, 0.5, 0.6], [0, 1, 1, 0.6]);
    const dim = (0, import_react2.useTransform)(progress, [0.08, 0.2, 0.46, PHASE.land + 0.02], [0, 0.35, 0.35, 0]);
    const bump = (0, import_react2.useMotionValue)(1);
    const ring = (0, import_react2.useMotionValue)(0);
    const sheen = (0, import_react2.useMotionValue)(0);
    const flash = (0, import_react2.useMotionValue)(0);
    const ringOpacity = (0, import_react2.useTransform)(ring, [0, 0.02, 1], [0, 0.7, 0]);
    const ringScale = (0, import_react2.useTransform)(ring, [0, 1], [1, 1.08]);
    const sheenX = (0, import_react2.useTransform)(sheen, [0, 1], ["-110%", "110%"]);
    const glow = (0, import_react2.useTransform)(
      [progress, flash],
      ([p, f]) => clamp01(within(p, PHASE.spotlight) * 0.55 + f * 0.45)
    );
    const landed = (0, import_react.useRef)(false);
    (0, import_react2.useMotionValueEvent)(progress, "change", (p) => {
      if (!landed.current && p >= PHASE.land) {
        landed.current = true;
        (0, import_react2.animate)(bump, [1, 1.035, 0.992, 1], { duration: 0.8, times: [0, 0.22, 0.6, 1], ease: "easeOut" });
        (0, import_react2.animate)(ring, [0, 1], { duration: 0.9, ease: [0.22, 1, 0.36, 1] });
        (0, import_react2.animate)(sheen, [0, 1], { duration: 1.1, delay: 0.05, ease: [0.65, 0, 0.35, 1] });
        (0, import_react2.animate)(flash, [0, 1, 0], { duration: 1.2, times: [0, 0.15, 1] });
      } else if (landed.current && p < PHASE.land - 0.05) {
        landed.current = false;
      }
    });
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { ref: sectionRef, className: `relative ${reduceMotion ? "" : "h-[400vh]"} ${className}`, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        ref: stageRef,
        className: "sticky top-0 h-svh w-full overflow-hidden",
        style: { visibility: layout ? "visible" : "hidden" },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            import_react2.motion.h2,
            {
              ref: titleRef,
              style: { top: layout == null ? void 0 : layout.titleTop, opacity: titleOpacity, y: titleY, filter: titleFilter },
              className: "absolute inset-x-0 px-4 text-center text-2xl font-bold text-neutral-800 sm:text-3xl dark:text-white",
              children: title != null ? title : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
                "Add the main hook of your ",
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
                " software/app."
              ] })
            }
          ),
          layout && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "div",
            {
              className: "absolute",
              style: {
                left: layout.rigLeft,
                top: layout.rigTop,
                width: LAPTOP_W,
                height: RIG_H,
                transform: `scale(${layout.fit})`,
                transformOrigin: "0 0"
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                  import_react2.motion.div,
                  {
                    className: "absolute inset-0",
                    style: {
                      opacity: laptopOpacity,
                      scale: laptopScale,
                      y: laptopY,
                      filter: laptopFilter,
                      pointerEvents: laptopPointer,
                      transformOrigin: `50% ${LID_DEPTH}px`
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lid, { afterglow }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Base, { badge, showGradient })
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                  import_react2.motion.div,
                  {
                    className: "absolute left-0 z-10",
                    style: { top: LID_DEPTH - LID_H, width: LAPTOP_W, height: LID_H, transform, transformOrigin: "50% 100%" },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        import_react2.motion.div,
                        {
                          "aria-hidden": true,
                          className: "absolute -inset-x-[10%] -bottom-[18%] h-1/2",
                          style: { opacity: shadow, background: "radial-gradient(closest-side, rgba(0,0,0,0.7), transparent)" }
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        import_react2.motion.div,
                        {
                          "aria-hidden": true,
                          className: "absolute -inset-[18%]",
                          style: {
                            opacity: glow,
                            background: "radial-gradient(closest-side, rgba(129,140,248,0.32), rgba(129,140,248,0.08) 60%, transparent)"
                          }
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react2.motion.div, { style: { scale: bump }, className: "relative h-full w-full rounded-2xl bg-[#010101] p-2", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "relative h-full w-full overflow-hidden rounded-lg bg-[#272729]", children: [
                          children != null ? children : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                            "img",
                            {
                              src,
                              alt,
                              draggable: false,
                              className: "absolute inset-0 h-full w-full object-cover object-left-top"
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.motion.div, { "aria-hidden": true, className: "pointer-events-none absolute inset-0 bg-black", style: { opacity: dim } }),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                            import_react2.motion.div,
                            {
                              "aria-hidden": true,
                              className: "pointer-events-none absolute inset-0",
                              style: {
                                x: sheenX,
                                background: "linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.14) 50%, transparent 62%)"
                              }
                            }
                          )
                        ] }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                          import_react2.motion.div,
                          {
                            "aria-hidden": true,
                            className: "pointer-events-none absolute -inset-px rounded-2xl border border-indigo-200/70",
                            style: { opacity: ringOpacity, scale: ringScale }
                          }
                        )
                      ] })
                    ]
                  }
                )
              ]
            }
          )
        ]
      }
    ) });
  }
  function Lid({ afterglow }) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "div",
      {
        className: "absolute left-0 rounded-2xl bg-[#010101] p-2",
        style: {
          top: LID_DEPTH - LID_H,
          width: LAPTOP_W,
          height: LID_H,
          transform: `perspective(${PERSPECTIVE}px) rotateX(${LID_TILT}deg)`,
          transformOrigin: "50% 100%"
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "div",
          {
            className: "relative h-full w-full overflow-hidden rounded-lg bg-[#050507]",
            style: { boxShadow: "0 2px 0 2px #171717 inset" },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-transparent" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                import_react2.motion.div,
                {
                  className: "absolute inset-0",
                  style: {
                    opacity: afterglow,
                    background: "radial-gradient(70% 80% at 50% 100%, rgba(165,180,252,0.35), transparent)"
                  }
                }
              )
            ]
          }
        )
      }
    );
  }
  function Base({ badge, showGradient }) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        className: "absolute left-0 overflow-hidden rounded-2xl bg-gray-200 dark:bg-[#272729]",
        style: { top: LID_DEPTH, width: LAPTOP_W, height: BASE_H },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "relative h-10 w-full", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-x-0 mx-auto h-4 w-[80%] bg-[#050505]" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "relative flex", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpeakerGrid, {}),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Keyboard, {}),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpeakerGrid, {})
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "div",
            {
              className: "mx-auto my-1 h-32 w-[40%] rounded-xl",
              style: { boxShadow: "0 0 1px 1px #00000020 inset" }
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-x-0 bottom-0 mx-auto h-2 w-20 rounded-t-3xl bg-gradient-to-t from-[#272729] to-[#050505]" }),
          showGradient && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-x-0 bottom-0 z-50 h-40 w-full bg-gradient-to-t from-white via-white to-transparent dark:from-black dark:via-black" }),
          badge && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute bottom-4 left-4", children: badge })
        ]
      }
    );
  }
  function SpeakerGrid() {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "div",
      {
        className: "mx-auto mt-2 h-40 w-[10%] px-[0.5px]",
        style: {
          backgroundImage: "radial-gradient(circle, #08080A 0.5px, transparent 0.5px)",
          backgroundSize: "3px 3px"
        }
      }
    );
  }
  var ICON = {
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
    down: "M6 9l6 6l6-6"
  };
  var fn = (n, icon) => ({ top: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { d: icon }), label: `F${n}` });
  var mod = (label, top, w, align = "start") => ({ label, top, w, align });
  var ROWS = [
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
      { power: true }
    ],
    [
      ["~", "`"],
      ["!", "1"],
      ["@", "2"],
      ["#", "3"],
      ["$", "4"],
      ["%", "5"],
      ["^", "6"],
      ["&", "7"],
      ["*", "8"],
      ["(", "9"],
      [")", "0"],
      ["\u2014", "_"],
      ["+", "="],
      mod("delete", null, "w-10", "end")
    ],
    [
      mod("tab", null, "w-10"),
      ..."QWERTYUIOP",
      ["{", "["],
      ["}", "]"],
      ["|", "\\"]
    ],
    [
      mod("caps lock", null, "w-[2.8rem]"),
      ..."ASDFGHJKL",
      [":", ";"],
      ['"', "'"],
      mod("return", null, "w-[2.85rem]", "end")
    ],
    [
      mod("shift", null, "w-[3.65rem]"),
      ..."ZXCVBNM",
      ["<", ","],
      [">", "."],
      ["?", "/"],
      mod("shift", null, "w-[3.65rem]", "end")
    ]
  ];
  var BOTTOM_ROW = [
    mod("fn", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { d: ICON.globe }), "w-6"),
    mod("control", "\u2303", "w-6"),
    mod("option", "\u2325", "w-6"),
    mod("command", "\u2318", "w-8"),
    { label: "", w: "w-[8.2rem]" },
    mod("command", "\u2318", "w-8"),
    mod("option", "\u2325", "w-6")
  ];
  function Keyboard() {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "mx-auto h-full w-[80%] rounded-md p-1 [&>div]:mb-[2px] [&>div]:flex [&>div]:gap-[2px]", children: [
      ROWS.map((row, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: row.map((k, j) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Key, { k }, j)) }, i)),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "items-end", children: [
        BOTTOM_ROW.map((k, j) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Key, { k }, j)),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Key, { k: { label: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { d: ICON.left }), h: "h-3" } }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col gap-px", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Key, { k: { label: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { d: ICON.up }), h: "h-[11.5px]" } }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Key, { k: { label: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { d: ICON.down }), h: "h-[11.5px]" } })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Key, { k: { label: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { d: ICON.right }), h: "h-3" } })
      ] })
    ] });
  }
  function Key({ k }) {
    const spec = typeof k === "string" ? { label: k } : Array.isArray(k) ? { top: k[0], label: k[1] } : k;
    const { label, top, w = "w-6", h = "h-6", align, power } = spec;
    const layout = align === "start" ? "items-start justify-end pb-[2px] pl-[4px]" : align === "end" ? "items-end justify-end pb-[2px] pr-[4px]" : "items-center justify-center";
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "rounded-[4px] bg-white/[0.2] p-[0.5px] shadow-xl shadow-white/60", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "div",
      {
        className: `flex ${h} ${w} items-center justify-center rounded-[3.5px] bg-[#0A090D]`,
        style: { boxShadow: "0 -0.5px 2px 0 #0D0D0F inset, -0.5px 0 2px 0 #0D0D0F inset" },
        children: power ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-4 w-4 rounded-full bg-gradient-to-b from-neutral-900 via-black to-neutral-900 p-px", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-full w-full rounded-full bg-black" }) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `flex h-full w-full flex-col gap-[1px] text-[5px] leading-none text-white ${layout}`, children: [
          top && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: align ? "" : "mb-[1px]", children: top }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label })
        ] })
      }
    ) });
  }
  function Icon({ d }) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { viewBox: "0 0 24 24", className: "h-[6px] w-[6px]", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d }) });
  }

  // MacbookScrollDemo.jsx
  var import_jsx_runtime2 = __toESM(require_jsx_runtime());
  function MacbookScrollDemo({ src = "/linear.webp" }) {
    return (
      // overflow-clip, not overflow-hidden: a hidden-overflow ancestor turns into
      // a scroll container and stops the sticky stage from pinning.
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "w-full overflow-clip bg-white dark:bg-[#0B0B0F]", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        MacbookScroll,
        {
          title: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
            "Add the main hook of your ",
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("br", {}),
            " software/app."
          ] }),
          badge: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
            "a",
            {
              href: "https://www.google.com",
              target: "_blank",
              rel: "noopener noreferrer",
              className: "flex h-10 w-10 -rotate-12 items-center justify-center rounded-full bg-white text-center text-[9px] leading-[1.05] font-semibold text-neutral-900 shadow-lg transition-colors hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
              children: [
                "Click",
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("br", {}),
                "me"
              ]
            }
          ),
          src,
          showGradient: false
        }
      ) })
    );
  }
  return __toCommonJS(stdin_exports);
})();
window.MacbookScroll = MacbookScrollKit.MacbookScroll;
window.MacbookScrollDemo = MacbookScrollKit.MacbookScrollDemo;
