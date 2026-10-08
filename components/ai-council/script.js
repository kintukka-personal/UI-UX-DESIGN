/* AI Council
   A ring of persona orbs (one per agent) on the Rotating cards ring, and a
   side panel to configure each member. window.Council is the plug-in point
   for real agents: see README.md. */
(function () {
  "use strict";

  var root = document.getElementById("council");
  if (!root) return;

  var STORE_KEY = "ui-council:v1";
  var MAX_MEMBERS = 10;
  var MIN_MEMBERS = 3;
  var SPIN_SPEED = 9; // degrees a second: one turn in 40s

  // The ten tints from Rotating cards
  var PALETTE = [
    "142, 249, 252", "142, 252, 204", "142, 252, 157", "215, 252, 142",
    "252, 252, 142", "252, 208, 142", "252, 142, 142", "252, 142, 239",
    "204, 142, 252", "142, 202, 252"
  ];

  var ENGINES = [
    { id: "large", label: "Reasoning (large model)" },
    { id: "medium", label: "Balanced (medium model)" },
    { id: "small", label: "Fast (small model)" },
    { id: "custom", label: "Custom endpoint" }
  ];

  var ICONS = {
    idle: '<circle cx="12" cy="12" r="9"/>',
    listening: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
    thinking: '<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M12 5v13"/>',
    speaking: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    asleep: '<path d="M2 8a10.6 10.6 0 0 0 20 0"/><path d="m4 15 1.7-2"/><path d="m20 15-1.7-2"/><path d="m9 18 .7-3.2"/><path d="m15 18-.7-3.2"/>'
  };

  var STATES = [
    { id: "idle", label: "Idle" },
    { id: "listening", label: "Listening" },
    { id: "thinking", label: "Thinking" },
    { id: "speaking", label: "Speaking" },
    { id: "asleep", label: "Asleep" }
  ];

  // How each state draws the orb. Values blend smoothly on a change.
  var LOOKS = {
    idle:      { amp: 1.6, spd: 0.6, breathe: 0.035, alpha: 1,    arcs: 0, inR: 0, outR: 0, sleep: 0, glow: 14 },
    listening: { amp: 2.6, spd: 1.1, breathe: 0.015, alpha: 1,    arcs: 0, inR: 1, outR: 0, sleep: 0, glow: 18 },
    thinking:  { amp: 1.0, spd: 1.6, breathe: 0.01,  alpha: 1,    arcs: 1, inR: 0, outR: 0, sleep: 0, glow: 16 },
    speaking:  { amp: 6.5, spd: 2.6, breathe: 0.02,  alpha: 1,    arcs: 0, inR: 0, outR: 1, sleep: 0, glow: 24 },
    asleep:    { amp: 0.8, spd: 0.25, breathe: 0.05, alpha: 0.35, arcs: 0, inR: 0, outR: 0, sleep: 1, glow: 6 }
  };

  var PRESETS = [
    { id: "juno", name: "Juno", role: "Strategist", tint: PALETTE[0], engine: "large", lean: 30, weight: 3,
      brief: "Frame the decision. Name the goal, the options and what we give up with each." },
    { id: "vex", name: "Vex", role: "Sceptic", tint: PALETTE[6], engine: "large", lean: -60, weight: 2,
      brief: "Attack the proposal. Find the failure case, the hidden cost and the missing evidence." },
    { id: "sol", name: "Sol", role: "Optimist", tint: PALETTE[5], engine: "medium", lean: 70, weight: 2,
      brief: "Find the upside and the fastest path to it. Argue for momentum." },
    { id: "moss", name: "Moss", role: "Ethicist", tint: PALETTE[2], engine: "large", lean: -10, weight: 2,
      brief: "Who is affected, and who is not in the room? Flag harms, consent and fairness." },
    { id: "iris", name: "Iris", role: "Designer", tint: PALETTE[7], engine: "medium", lean: 40, weight: 2,
      brief: "Speak for the user. Judge clarity, delight and the cost of confusion." },
    { id: "quill", name: "Quill", role: "Analyst", tint: PALETTE[9], engine: "small", lean: 0, weight: 1,
      brief: "Bring numbers. Estimate impact and confidence, and say what data would change the call." },
    { id: "rook", name: "Rook", role: "Risk officer", tint: PALETTE[8], engine: "medium", lean: -35, weight: 2,
      brief: "Size the downside. What is reversible, what is not, and what is the rollback plan?" }
  ];

  // Lines for the Convene demo, by role. {m} is the motion.
  var LINES = {
    strategist: ["Let's frame it: “{m}” trades speed for certainty. Which one matters more this quarter?",
                 "Two options on the table. I'd pick the one we can still change our mind about."],
    sceptic: ["What breaks if we're wrong? I haven't seen the failure case for “{m}” yet.",
              "Every reason I've heard is a hope, not evidence. Show me one number."],
    optimist: ["This is the window. If we wait, we lose the momentum we've built.",
               "“{m}” gets real feedback a week sooner. That's worth a rough edge or two."],
    ethicist: ["Who hasn't been asked? The people this lands on should hear about it before we decide.",
               "I can support it if we're open about the trade-offs with the people it affects."],
    designer: ["Users won't read the release notes. If it's confusing on day one, it's confusing forever.",
               "The core flow is ready. The edges can follow in a patch."],
    analyst: ["On current numbers the upside is modest but real. Confidence: medium.",
              "If the error rate stays under one percent in the first hour, the risk is small."],
    "risk officer": ["Can we roll it back in ten minutes? If yes, I'm comfortable. If no, I'm not.",
                     "Friday launches cost us the weekend when something slips. Plan the on-call first."],
    member: ["I've heard enough to make up my mind.",
             "My brief points one way, but I'll listen to the room."]
  };

  /* ---------- State ---------- */

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var agents = load() || PRESETS.map(clone);
  var selectedId = agents[0].id;
  var angle = 0;          // ring rotation, degrees
  var target = null;      // angle the ring is easing to
  var spinning = !reduced;
  var held = false;       // a selection holds the ring still
  var hovering = false;
  var drag = null;
  var session = null;     // the running Convene, if any
  var listeners = {};
  var orbs = {};          // id -> orb renderer
  var cards = {};         // id -> card element

  var el = {
    stage: root.querySelector(".ui-council__stage"),
    scene: root.querySelector("[data-scene]"),
    ring: root.querySelector("[data-ring]"),
    floor: root.querySelector("[data-floor]"),
    floorDot: root.querySelector("[data-floor-dot]"),
    floorName: root.querySelector("[data-floor-name]"),
    floorLine: root.querySelector("[data-floor-line]"),
    spin: root.querySelector("[data-spin]"),
    spinLabel: root.querySelector("[data-spin-label]"),
    motion: root.querySelector("[data-motion]"),
    convene: root.querySelector("[data-convene]"),
    vote: root.querySelector("[data-vote]"),
    voteResult: root.querySelector("[data-vote-result]"),
    voteList: root.querySelector("[data-vote-list]"),
    count: root.querySelector("[data-count]"),
    add: root.querySelector("[data-add]"),
    roster: root.querySelector("[data-roster]"),
    detail: root.querySelector("[data-detail]"),
    dSwatch: root.querySelector("[data-d-swatch]"),
    dName: root.querySelector("[data-d-name]"),
    dRole: root.querySelector("[data-d-role]"),
    dStates: root.querySelector("[data-d-states]"),
    dTints: root.querySelector("[data-d-tints]"),
    dEngine: root.querySelector("[data-d-engine]"),
    dBrief: root.querySelector("[data-d-brief]"),
    dLean: root.querySelector("[data-d-lean]"),
    dLeanOut: root.querySelector("[data-d-lean-out]"),
    dWeight: root.querySelector("[data-d-weight]"),
    dWeightOut: root.querySelector("[data-d-weight-out]"),
    reset: root.querySelector("[data-reset]"),
    remove: root.querySelector("[data-remove]")
  };

  /* ---------- Helpers ---------- */

  function clone(o) {
    var c = {};
    for (var k in o) c[k] = o[k];
    if (!c.state) c.state = "idle";
    return c;
  }

  function byId(id) {
    for (var i = 0; i < agents.length; i++) if (agents[i].id === id) return agents[i];
    return null;
  }

  function indexOf(id) {
    for (var i = 0; i < agents.length; i++) if (agents[i].id === id) return i;
    return -1;
  }

  function stateLabel(id) {
    for (var i = 0; i < STATES.length; i++) if (STATES[i].id === id) return STATES[i].label;
    return id;
  }

  function step() {
    return 360 / agents.length;
  }

  function radius() {
    // Wide enough that the cards never touch, whatever the count
    return Math.max(270, Math.round((agents.length * 196) / (2 * Math.PI)));
  }

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 4294967295;
  }

  function wrap(deg) {
    deg = deg % 360;
    return deg < 0 ? deg + 360 : deg;
  }

  function emit(type, detail) {
    (listeners[type] || []).forEach(function (fn) {
      try { fn(detail); } catch (e) { console.error(e); }
    });
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(agents.map(function (a) {
        var c = clone(a);
        if (c.state !== "asleep") c.state = "idle";
        return c;
      })));
    } catch (e) { /* storage unavailable: fine */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      var list = JSON.parse(raw);
      if (!Array.isArray(list) || list.length < MIN_MEMBERS) return null;
      return list.map(clone);
    } catch (e) {
      return null;
    }
  }

  function linesFor(agent) {
    var key = String(agent.role || "").toLowerCase();
    return LINES[key] || LINES.member;
  }

  function wait(ms, token) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () {
        if (token.cancelled) reject(new Error("adjourned"));
        else resolve();
      }, reduced ? Math.min(ms, 700) : ms);
      token.timers.push(t);
    });
  }

  /* ---------- Orb renderer ----------
     A halo persona drawn on a canvas. Each agent gets its own lobe count,
     speed and phase from its id, so no two orbs move alike. */

  function makeOrb(canvas, agent) {
    var seed = hash(agent.id);
    var base = 2 + Math.floor(seed * 3); // 2–4 lobes
    return {
      canvas: canvas,
      ctx: canvas.getContext("2d"),
      seed: seed * 100,
      lobes: [base, base + 2, base + 3],
      rate: 0.8 + seed * 0.5,
      thick: 2 + seed * 1.4,
      look: clone(LOOKS[agent.state] || LOOKS.idle),
      size: 0
    };
  }

  function sizeOrb(orb) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var css = 120;
    orb.canvas.width = css * dpr;
    orb.canvas.height = css * dpr;
    orb.size = css;
    orb.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function speakEnvelope(t, s) {
    var gate = Math.sin(t * 2.3 + s) > -0.35 ? 1 : 0.25;
    var v = Math.abs(Math.sin(t * 7.3 + s)) * 0.6 + Math.abs(Math.sin(t * 3.1 + s * 2)) * 0.4;
    return v * gate;
  }

  function drawOrb(orb, agent, t, dt) {
    var goal = LOOKS[agent.state] || LOOKS.idle;
    var k = reduced ? 1 : 1 - Math.exp(-dt * 5);
    var p = orb.look;
    for (var key in goal) p[key] += (goal[key] - p[key]) * k;

    var ctx = orb.ctx;
    var S = orb.size;
    var cx = S / 2;
    var cy = S / 2;
    var tt = t * orb.rate;
    var col = agent.tint;
    var r = S * 0.3 * (1 + p.breathe * Math.sin(tt * 1.4 + orb.seed)) * (1 - 0.12 * p.sleep);
    var env = speakEnvelope(tt, orb.seed);
    var amp = p.amp * (1 + p.outR * (env * 1.6 - 1));

    ctx.clearRect(0, 0, S, S);

    // Inner glass
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.15);
    g.addColorStop(0, "rgba(" + col + "," + 0.22 * p.alpha + ")");
    g.addColorStop(1, "rgba(" + col + ",0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.15, 0, Math.PI * 2);
    ctx.fill();

    // Listening: rings drawn in toward the halo
    if (p.inR > 0.02) {
      for (var i = 0; i < 2; i++) {
        var ph = (tt * 0.6 + i / 2) % 1;
        ctx.strokeStyle = "rgba(" + col + "," + p.inR * ph * 0.5 * p.alpha + ")";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx, cy, r * (1.62 - 0.6 * ph), 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Speaking: rings pushed out from the halo
    if (p.outR > 0.02) {
      for (var j = 0; j < 3; j++) {
        var po = (tt * 0.9 + j / 3) % 1;
        ctx.strokeStyle = "rgba(" + col + "," + p.outR * (1 - po) * (0.25 + env * 0.35) * p.alpha + ")";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r * (1.05 + 0.65 * po), 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.save();
    ctx.shadowBlur = p.glow;
    ctx.shadowColor = "rgba(" + col + "," + 0.9 * p.alpha + ")";
    ctx.lineCap = "round";

    // The halo itself, faded out while thinking
    var ringAlpha = p.alpha * (1 - p.arcs);
    if (ringAlpha > 0.01) {
      ctx.beginPath();
      for (var n = 0; n <= 96; n++) {
        var a = (n / 96) * Math.PI * 2;
        var w = 0;
        for (var l = 0; l < 3; l++) {
          w += Math.sin(orb.lobes[l] * a + tt * p.spd * (1 + l * 0.37) + orb.seed * (l + 1));
        }
        var rr = r + (amp * w) / 3;
        var x = cx + Math.cos(a) * rr;
        var y = cy + Math.sin(a) * rr;
        if (n === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.lineWidth = orb.thick;
      ctx.strokeStyle = "rgba(" + col + "," + ringAlpha + ")";
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255,255,255," + 0.55 * ringAlpha + ")";
      ctx.stroke();
      ctx.shadowBlur = p.glow;
    }

    // Thinking: the halo breaks into arcs that chase each other
    if (p.arcs > 0.01) {
      var arcA = p.alpha * p.arcs;
      ctx.lineWidth = orb.thick + 0.5;
      ctx.strokeStyle = "rgba(" + col + "," + arcA + ")";
      for (var m = 0; m < 3; m++) {
        var start = tt * 2.2 + (m * Math.PI * 2) / 3 + orb.seed;
        ctx.beginPath();
        ctx.arc(cx, cy, r, start, start + 1.15);
        ctx.stroke();
      }
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(" + col + "," + arcA * 0.7 + ")";
      var s2 = -tt * 3.1 + orb.seed;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.66, s2, s2 + 2.1);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255," + arcA * 0.85 + ")";
      for (var d = 0; d < 3; d++) {
        var da = tt * 1.4 + (d * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(da) * r * 1.3, cy + Math.sin(da) * r * 1.3, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Asleep: a few z's drifting up
    if (p.sleep > 0.02) {
      for (var z = 0; z < 3; z++) {
        var pz = (tt * 0.25 + z / 3) % 1;
        ctx.globalAlpha = p.sleep * (pz < 0.15 ? pz / 0.15 : 1 - pz) * 0.8;
        ctx.fillStyle = "rgb(220,222,235)";
        ctx.font = "600 " + (8 + pz * 6) + "px system-ui, sans-serif";
        ctx.fillText("z", cx + r * 0.55 + pz * S * 0.14, cy - r * 0.35 - pz * S * 0.3);
      }
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- Building the DOM ---------- */

  function buildRing() {
    el.ring.innerHTML = "";
    cards = {};
    orbs = {};
    el.ring.style.setProperty("--step", step() + "deg");
    el.ring.style.setProperty("--radius", radius() + "px");

    agents.forEach(function (agent, i) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "ui-council__card";
      card.style.setProperty("--index", i);
      card.dataset.id = agent.id;
      card.innerHTML =
        '<canvas aria-hidden="true"></canvas>' +
        '<span class="ui-council__card-text">' +
        '<span class="ui-council__card-name"></span>' +
        '<span class="ui-council__card-role"></span>' +
        '<span class="ui-council__card-state"></span>' +
        "</span>";
      card.addEventListener("click", function () {
        if (drag && drag.moved) return;
        select(agent.id);
      });
      el.ring.appendChild(card);
      cards[agent.id] = card;
      orbs[agent.id] = makeOrb(card.querySelector("canvas"), agent);
      sizeOrb(orbs[agent.id]);
      paintCard(agent);
    });
    fitScene();
  }

  function paintCard(agent) {
    var card = cards[agent.id];
    if (!card) return;
    card.style.setProperty("--tint", agent.tint);
    card.dataset.state = agent.state;
    card.querySelector(".ui-council__card-name").textContent = agent.name;
    card.querySelector(".ui-council__card-role").textContent = agent.role;
    card.querySelector(".ui-council__card-state").textContent = stateLabel(agent.state);
    card.setAttribute("aria-label", agent.name + ", " + agent.role + ", " + stateLabel(agent.state));
    card.classList.toggle("is-selected", agent.id === selectedId);
  }

  function buildRoster() {
    el.roster.innerHTML = "";
    agents.forEach(function (agent) {
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "ui-council__member";
      b.dataset.id = agent.id;
      b.innerHTML =
        '<span class="ui-council__swatch"></span>' +
        '<span><span class="ui-council__member-name"></span><span class="ui-council__member-role"></span></span>' +
        '<span class="ui-council__badge"></span>';
      b.addEventListener("click", function () { select(agent.id); });
      li.appendChild(b);
      el.roster.appendChild(li);
    });
    paintRoster();
  }

  function paintRoster() {
    el.count.textContent = agents.length;
    el.add.disabled = agents.length >= MAX_MEMBERS;
    el.remove.disabled = agents.length <= MIN_MEMBERS;
    Array.prototype.forEach.call(el.roster.querySelectorAll(".ui-council__member"), function (b) {
      var agent = byId(b.dataset.id);
      if (!agent) return;
      b.style.setProperty("--tint", agent.tint);
      b.querySelector(".ui-council__member-name").textContent = agent.name;
      b.querySelector(".ui-council__member-role").textContent = agent.role;
      var badge = b.querySelector(".ui-council__badge");
      badge.textContent = stateLabel(agent.state);
      badge.dataset.state = agent.state;
      b.setAttribute("aria-current", agent.id === selectedId ? "true" : "false");
    });
  }

  function buildDetailControls() {
    el.dStates.innerHTML = "";
    STATES.forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "ui-council__state";
      b.dataset.state = s.id;
      b.dataset.tip = s.label;
      b.setAttribute("aria-label", s.label);
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[s.id] + "</svg>";
      b.addEventListener("click", function () { setState(selectedId, s.id); });
      el.dStates.appendChild(b);
    });

    el.dTints.innerHTML = "";
    PALETTE.forEach(function (tint, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "ui-council__tint";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-label", "Tint " + (i + 1));
      b.style.setProperty("--t", tint);
      b.dataset.tint = tint;
      b.addEventListener("click", function () { update(selectedId, { tint: tint }); });
      el.dTints.appendChild(b);
    });

    el.dEngine.innerHTML = ENGINES.map(function (e) {
      return '<option value="' + e.id + '">' + e.label + "</option>";
    }).join("");
  }

  function paintDetail() {
    var agent = byId(selectedId);
    if (!agent) return;
    el.detail.style.setProperty("--tint", agent.tint);
    root.style.setProperty("--accent", agent.tint);
    if (document.activeElement !== el.dName) el.dName.value = agent.name;
    if (document.activeElement !== el.dRole) el.dRole.value = agent.role;
    if (document.activeElement !== el.dBrief) el.dBrief.value = agent.brief || "";
    el.dEngine.value = agent.engine;
    el.dLean.value = agent.lean;
    el.dLeanOut.textContent = (agent.lean > 0 ? "+" : "") + agent.lean;
    el.dWeight.value = agent.weight;
    el.dWeightOut.textContent = agent.weight;
    Array.prototype.forEach.call(el.dStates.children, function (b) {
      b.setAttribute("aria-pressed", b.dataset.state === agent.state ? "true" : "false");
    });
    Array.prototype.forEach.call(el.dTints.children, function (b) {
      var on = b.dataset.tint === agent.tint;
      b.setAttribute("aria-checked", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
    });
  }

  function paintAll() {
    agents.forEach(paintCard);
    paintRoster();
    paintDetail();
  }

  /* ---------- Actions ---------- */

  function select(id, opts) {
    if (!byId(id)) return;
    selectedId = id;
    held = true;
    syncSpin();
    bringToFront(id);
    paintAll();
    if (!(opts && opts.silent)) emit("select", { agent: clone(byId(id)) });
  }

  function bringToFront(id) {
    var i = indexOf(id);
    if (i < 0) return;
    var goal = -i * step();
    var diff = wrap(goal - angle + 180) - 180; // shortest way round
    target = angle + diff;
    if (reduced) {
      angle = target;
      target = null;
    }
  }

  function setState(id, state) {
    var agent = byId(id);
    if (!agent || !LOOKS[state] || agent.state === state) return;
    var from = agent.state;
    agent.state = state;
    paintCard(agent);
    paintRoster();
    if (id === selectedId) paintDetail();
    if (state === "asleep" || from === "asleep") save();
    emit("state", { id: id, from: from, to: state });
  }

  function update(id, patch) {
    var agent = byId(id);
    if (!agent) return;
    for (var k in patch) if (k !== "id" && k !== "state") agent[k] = patch[k];
    paintCard(agent);
    paintRoster();
    if (id === selectedId) paintDetail();
    save();
    emit("change", { agent: clone(agent) });
  }

  function addAgent() {
    if (agents.length >= MAX_MEMBERS) return;
    var used = agents.map(function (a) { return a.tint; });
    var tint = PALETTE.filter(function (t) { return used.indexOf(t) < 0; })[0] || PALETTE[agents.length % PALETTE.length];
    var n = agents.length + 1;
    var id = "agent-" + Date.now().toString(36);
    agents.push({
      id: id, name: "Agent " + n, role: "Member", tint: tint, engine: "medium",
      lean: 0, weight: 1, state: "idle",
      brief: "Describe what this member cares about and how they should argue."
    });
    rebuild();
    select(id);
    save();
    emit("change", { added: id });
  }

  function removeAgent(id) {
    if (agents.length <= MIN_MEMBERS) return;
    var i = indexOf(id);
    if (i < 0) return;
    agents.splice(i, 1);
    var next = agents[Math.min(i, agents.length - 1)].id;
    rebuild();
    select(next);
    save();
    emit("change", { removed: id });
  }

  function reset() {
    adjourn();
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* fine */ }
    agents = PRESETS.map(clone);
    el.vote.hidden = true;
    rebuild();
    select(agents[0].id);
    floor(null);
  }

  function rebuild() {
    // Keep the ring where it is so adding or removing doesn't jump
    buildRing();
    buildRoster();
  }

  function floor(agent, line) {
    if (!agent) {
      el.floor.style.removeProperty("--floor");
      el.floorName.textContent = "The council is in session.";
      el.floorLine.textContent = line || "Pick a member to tune them, or put a motion to the floor.";
      return;
    }
    el.floor.style.setProperty("--floor", agent.tint);
    el.floorName.textContent = agent.name + " · " + agent.role;
    el.floorLine.textContent = line || "";
  }

  function say(id, text) {
    var agent = byId(id);
    if (agent) floor(agent, text);
  }

  function syncSpin() {
    var on = spinning && !held;
    el.spin.setAttribute("aria-pressed", on ? "true" : "false");
    el.spinLabel.textContent = on ? "Pause rotation" : "Resume rotation";
  }

  /* ---------- Convene: a scripted demo of a deliberation ---------- */

  function convene() {
    if (session) return adjourn();
    var motion = (el.motion.value || "").trim() || "the motion";
    var token = { cancelled: false, timers: [] };
    session = token;
    el.convene.textContent = "Adjourn";
    el.convene.setAttribute("aria-pressed", "true");
    el.vote.hidden = true;

    var present = agents.filter(function (a) { return a.state !== "asleep"; });
    var order = present.slice().sort(function (a, b) { return b.weight - a.weight; });
    present.forEach(function (a) { setState(a.id, "listening"); });
    floor(null, "The floor is open on “" + motion + "”.");
    emit("convene", { motion: motion, order: order.map(function (a) { return a.id; }) });

    var run = order.reduce(function (p, agent) {
      return p.then(function () {
        if (!byId(agent.id) || byId(agent.id).state === "asleep") return;
        select(agent.id, { silent: true });
        setState(agent.id, "thinking");
        floor(agent, "…");
        return wait(1100, token).then(function () {
          var lines = linesFor(agent);
          var line = lines[Math.floor(Math.random() * lines.length)].replace("{m}", motion);
          setState(agent.id, "speaking");
          return typeLine(agent, line, token);
        }).then(function () {
          return wait(500, token);
        }).then(function () {
          setState(agent.id, "listening");
        });
      });
    }, Promise.resolve());

    run.then(function () {
      tally(motion, present.filter(function (a) { return byId(a.id); }));
    }).catch(function () { /* adjourned */ }).then(function () {
      if (session === token) endSession();
    });
  }

  function typeLine(agent, line, token) {
    var words = line.split(" ");
    var shown = 0;
    return new Promise(function (resolve, reject) {
      (function next() {
        if (token.cancelled) return reject(new Error("adjourned"));
        shown++;
        floor(agent, words.slice(0, shown).join(" "));
        if (shown >= words.length) return resolve();
        token.timers.push(setTimeout(next, reduced ? 0 : 150 + Math.random() * 90));
      })();
    }).then(function () {
      return wait(Math.max(900, words.length * 60), token);
    });
  }

  function tally(motion, voters) {
    var ayes = 0;
    var nays = 0;
    el.voteList.innerHTML = "";
    voters.forEach(function (a) {
      var aye = a.lean / 100 + (Math.random() - 0.5) * 0.7 > 0;
      if (aye) ayes += a.weight;
      else nays += a.weight;
      var li = document.createElement("li");
      li.style.setProperty("--tint", a.tint);
      li.dataset.vote = aye ? "aye" : "nay";
      li.innerHTML = '<span class="ui-council__swatch"></span>';
      li.appendChild(document.createTextNode(a.name + (aye ? " ✓" : " ✗")));
      el.voteList.appendChild(li);
    });
    var carried = ayes > nays;
    el.voteResult.textContent = (carried ? "Carried " : "Not carried ") + ayes + "–" + nays;
    el.vote.hidden = false;
    floor(null, "“" + motion + "” is " + (carried ? "carried" : "not carried") + ", " + ayes + " to " + nays + " (weighted).");
    emit("vote", { motion: motion, ayes: ayes, nays: nays, carried: carried });
  }

  function adjourn() {
    if (!session) return;
    session.cancelled = true;
    session.timers.forEach(clearTimeout);
    endSession();
    floor(null, "Adjourned.");
  }

  function endSession() {
    session = null;
    el.convene.textContent = "Convene";
    el.convene.setAttribute("aria-pressed", "false");
    agents.forEach(function (a) {
      if (a.state !== "asleep") setState(a.id, "idle");
    });
  }

  /* ---------- Layout ---------- */

  function fitScene() {
    var w = el.stage.clientWidth;
    var h = el.stage.clientHeight;
    var span = radius() * 2 + 190;
    var scale = Math.min(1, (w - 24) / span, (h * 0.95) / (span * 0.62));
    el.scene.style.setProperty("--scale", Math.max(0.42, scale).toFixed(3));
  }

  /* ---------- Input ---------- */

  el.stage.addEventListener("pointerenter", function () { hovering = true; });
  el.stage.addEventListener("pointerleave", function () { hovering = false; });

  el.scene.addEventListener("pointerdown", function (e) {
    if (e.button !== 0) return;
    drag = { x: e.clientX, start: angle, moved: false, id: e.pointerId };
    target = null;
  });

  window.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 5) {
      drag.moved = true;
      el.stage.classList.add("is-dragging");
      try { el.scene.setPointerCapture(drag.id); } catch (err) { /* fine */ }
    }
    if (drag.moved) angle = drag.start + dx * 0.35;
  });

  function endDrag() {
    if (!drag) return;
    var d = drag;
    el.stage.classList.remove("is-dragging");
    if (d.moved) {
      // Settle on the nearest card and select it
      var i = ((Math.round(-angle / step()) % agents.length) + agents.length) % agents.length;
      select(agents[i].id);
    }
    // Let the click that follows a drag see `moved`, then clear
    setTimeout(function () { if (drag === d) drag = null; }, 0);
  }

  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  el.stage.addEventListener("keydown", function (e) {
    var i = indexOf(selectedId);
    if (e.key === "ArrowRight") { select(agents[(i + 1) % agents.length].id); e.preventDefault(); }
    if (e.key === "ArrowLeft") { select(agents[(i - 1 + agents.length) % agents.length].id); e.preventDefault(); }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && held) {
      held = false;
      spinning = !reduced;
      syncSpin();
    }
  });

  el.spin.addEventListener("click", function () {
    if (spinning && !held) {
      spinning = false;
    } else {
      spinning = true;
      held = false;
    }
    target = null;
    syncSpin();
  });

  el.convene.addEventListener("click", convene);
  el.motion.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !session) convene();
  });

  el.add.addEventListener("click", addAgent);
  el.remove.addEventListener("click", function () { removeAgent(selectedId); });
  el.reset.addEventListener("click", reset);

  el.dName.addEventListener("input", function () {
    update(selectedId, { name: el.dName.value.trim() || "Unnamed" });
  });
  el.dRole.addEventListener("input", function () {
    update(selectedId, { role: el.dRole.value.trim() || "Member" });
  });
  el.dBrief.addEventListener("input", function () { update(selectedId, { brief: el.dBrief.value }); });
  el.dEngine.addEventListener("change", function () { update(selectedId, { engine: el.dEngine.value }); });
  el.dLean.addEventListener("input", function () { update(selectedId, { lean: +el.dLean.value }); });
  el.dWeight.addEventListener("input", function () { update(selectedId, { weight: +el.dWeight.value }); });

  el.dTints.addEventListener("keydown", function (e) {
    var dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    var agent = byId(selectedId);
    var i = PALETTE.indexOf(agent.tint);
    var tint = PALETTE[(i + dir + PALETTE.length) % PALETTE.length];
    update(selectedId, { tint: tint });
    el.dTints.querySelector('[data-tint="' + tint + '"]').focus();
  });

  window.addEventListener("resize", function () {
    fitScene();
    for (var id in orbs) sizeOrb(orbs[id]);
  });

  /* ---------- The loop ---------- */

  var last = performance.now();
  var clock = 0;

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!reduced) clock += dt;

    if (drag && drag.moved) {
      // the pointer is steering
    } else if (target !== null) {
      angle += (target - angle) * (1 - Math.exp(-dt * 6));
      if (Math.abs(target - angle) < 0.05) {
        angle = target;
        target = null;
      }
    } else if (spinning && !held) {
      angle += SPIN_SPEED * (hovering ? 0.35 : 1) * dt;
    }

    el.ring.style.setProperty("--angle", angle.toFixed(3) + "deg");

    var s = step();
    agents.forEach(function (agent, i) {
      var card = cards[agent.id];
      if (!card) return;
      var facing = Math.cos(((angle + i * s) * Math.PI) / 180);
      card.style.setProperty("--facing", facing.toFixed(3));
      // Cards facing away stay in the ring but drop out of the tab order
      card.tabIndex = facing > 0.2 ? 0 : -1;
      // Orbs on the far side are hidden by the glass; skip the work
      if (facing > -0.35 || agent.state === "speaking") drawOrb(orbs[agent.id], agent, clock, dt);
    });

    requestAnimationFrame(frame);
  }

  /* ---------- Start ---------- */

  buildDetailControls();
  buildRing();
  buildRoster();
  held = false;
  selectedId = agents[0].id;
  paintAll();
  syncSpin();
  requestAnimationFrame(frame);

  /* ---------- Public API: plug real agents in here ---------- */

  window.Council = {
    agents: function () { return agents.map(clone); },
    get: function (id) { var a = byId(id); return a ? clone(a) : null; },
    select: function (id) { select(id); },
    setState: setState,
    update: update,
    say: say,
    convene: convene,
    adjourn: adjourn,
    on: function (type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
      return function off() {
        listeners[type] = (listeners[type] || []).filter(function (f) { return f !== fn; });
      };
    }
  };
})();
