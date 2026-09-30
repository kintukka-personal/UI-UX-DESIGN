/* UI Turntable — turn a product by dragging, built from a handful of photos.

   Each <img data-angle="…"> inside [data-ui-turn] is one photographed view.
   Add data-mirror to reuse a photo flipped (for symmetric products), and
   data-label for the dial caption.

   Between two photos a WebGL shader treats each image as if it were wrapped
   around a vertical cylinder: the outgoing view turns away, the incoming view
   turns in from the other side, and they meet along a soft edge that sweeps
   in the direction of travel. A little motion blur hides the join while the
   product moves, and it always comes to rest exactly on a real photo.

   Controls: drag / swipe, horizontal trackpad scroll, ← →, and the dial. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---- WebGL renderer ------------------------------------------------ */

  var VERT = [
    "attribute vec2 aPos;",
    "varying vec2 vUv;",
    "void main() {",
    "  vUv = aPos * 0.5 + 0.5;",
    "  vUv.y = 1.0 - vUv.y;",
    "  gl_Position = vec4(aPos, 0.0, 1.0);",
    "}"
  ].join("\n");

  var FRAG = [
    "precision mediump float;",
    "varying vec2 vUv;",
    "uniform sampler2D uA;",      // photo A
    "uniform sampler2D uB;",      // photo B
    "uniform sampler2D uEA;",     // silhouette extents of A (rows: L,R  columns: T,B)
    "uniform sampler2D uEB;",
    "uniform sampler2D uMA;",     // soft product mask of A (1 = product)
    "uniform sampler2D uMB;",
    "uniform float uMirA;",
    "uniform float uMirB;",
    "uniform float uT;",          // 0..1 progress from A to B
    "uniform float uStep;",       // radians between A and B
    "uniform float uBlur;",       // horizontal motion blur, in uv units
    "uniform vec2 uScale;",       // canvas uv -> image uv (contain + zoom)
    "uniform vec3 uBg;",          // page colour for the edge feather
    "",
    // Turn a point on a cylinder (s in -1..1) by d radians, keeping the edges pinned.
    "float cyl(float s, float d) {",
    "  float k = 1.0 - smoothstep(0.6, 1.0, abs(s));",
    "  float phi = clamp(asin(clamp(s, -1.0, 1.0)) + d, -1.5707, 1.5707);",
    "  return mix(s, sin(phi), k);",
    "}",
    "",
    // Map a coordinate so the current (morphed) silhouette span lands on the source span.
    "float remap(float v, float lo, float hi, float slo, float shi, float d) {",
    "  if (v <= lo) return v / max(lo, 0.0001) * slo;",
    "  if (v >= hi) return shi + (v - hi) / max(1.0 - hi, 0.0001) * (1.0 - shi);",
    "  float s = (v - lo) / max(hi - lo, 0.0001) * 2.0 - 1.0;",
    "  s = cyl(s, d);",
    "  return slo + (s * 0.5 + 0.5) * (shi - slo);",
    "}",
    "",
    "float mask(sampler2D tex, vec2 uv) {",
    "  return texture2D(tex, clamp(uv, 0.0, 1.0)).r;",
    "}",
    "",
    "vec4 tap(sampler2D tex, float mir, vec2 uv) {",
    "  uv = clamp(uv, 0.0, 1.0);",
    "  if (mir > 0.5) uv.x = 1.0 - uv.x;",
    "  return texture2D(tex, uv);",
    "}",
    "",
    "vec4 look(sampler2D tex, float mir, vec2 uv) {",
    "  if (uBlur < 0.0004) return tap(tex, mir, uv);",
    "  vec4 c = vec4(0.0);",
    "  c += tap(tex, mir, uv + vec2(-3.0 * uBlur, 0.0)) * 0.06;",
    "  c += tap(tex, mir, uv + vec2(-2.0 * uBlur, 0.0)) * 0.12;",
    "  c += tap(tex, mir, uv + vec2(-1.0 * uBlur, 0.0)) * 0.18;",
    "  c += tap(tex, mir, uv) * 0.28;",
    "  c += tap(tex, mir, uv + vec2( 1.0 * uBlur, 0.0)) * 0.18;",
    "  c += tap(tex, mir, uv + vec2( 2.0 * uBlur, 0.0)) * 0.12;",
    "  c += tap(tex, mir, uv + vec2( 3.0 * uBlur, 0.0)) * 0.06;",
    "  return c;",
    "}",
    "",
    "void main() {",
    "  vec2 uv = (vUv - 0.5) * uScale + 0.5;",
    "  vec2 q = clamp(uv, 0.0, 1.0);",
    "",
    // Silhouette extents for this row (L,R) and this column (T,B)
    "  vec2 rA = texture2D(uEA, vec2(q.y, 0.5)).rg;",
    "  vec2 rB = texture2D(uEB, vec2(q.y, 0.5)).rg;",
    "  vec2 cA = texture2D(uEA, vec2(q.x, 0.5)).ba;",
    "  vec2 cB = texture2D(uEB, vec2(q.x, 0.5)).ba;",
    "  float e = smoothstep(0.0, 1.0, uT);",
    "  vec2 rT = mix(rA, rB, e);",
    "  vec2 cT = mix(cA, cB, e);",
    "",
    "  float dA =  uT * uStep * 0.55;",
    "  float dB = -(1.0 - uT) * uStep * 0.55;",
    "  vec2 uvA = vec2(remap(uv.x, rT.x, rT.y, rA.x, rA.y, dA), remap(uv.y, cT.x, cT.y, cA.x, cA.y, 0.0));",
    "  vec2 uvB = vec2(remap(uv.x, rT.x, rT.y, rB.x, rB.y, dB), remap(uv.y, cT.x, cT.y, cB.x, cB.y, 0.0));",
    "",
    "  vec3 a = look(uA, uMirA, uvA).rgb;",
    "  vec3 b = look(uB, uMirB, uvB).rgb;",
    "  float fA = mask(uMA, uvA);",
    "  float fB = mask(uMB, uvB);",
    "  float aA = smoothstep(0.35, 0.65, fA);",
    "  float aB = smoothstep(0.35, 0.65, fB);",
    "",
    // The outline morphs continuously; the surface swaps in the middle.
    "  float mS = e;",
    "  float mC = smoothstep(0.25, 0.75, uT);",
    "  float shape = smoothstep(0.47, 0.53, mix(fA, fB, mS));",
    "",
    // Inside the outline: solid product from whichever photo clearly has product here
    // (edge pixels are skipped so no halo leaks in); soft weights only as a fallback.
    "  float hA = smoothstep(0.62, 0.8, fA) * (1.0 - mC), hB = smoothstep(0.62, 0.8, fB) * mC;",
    "  float sA = fA * (1.0 - mC), sB = fB * mC;",
    "  vec3 prodSoft = (a * sA + b * sB + mix(a, b, mC) * 0.0001) / (sA + sB + 0.0001);",
    "  vec3 prod = (a * hA + b * hB + prodSoft * 0.002) / (hA + hB + 0.002);",
    "",
    // Outside: backdrop from whichever photo clearly shows backdrop here.
    "  vec3 plateA = mix(tap(uA, uMirA, vec2(0.015, uvA.y)).rgb, tap(uA, uMirA, vec2(0.985, uvA.y)).rgb, clamp(uvA.x, 0.0, 1.0));",
    "  vec3 plateB = mix(tap(uB, uMirB, vec2(0.015, uvB.y)).rgb, tap(uB, uMirB, vec2(0.985, uvB.y)).rgb, clamp(uvB.x, 0.0, 1.0));",
    "  float gA = (1.0 - smoothstep(0.15, 0.35, fA)) * (1.0 - mC), gB = (1.0 - smoothstep(0.15, 0.35, fB)) * mC;",
    "  float tA = (1.0 - fA) * (1.0 - mC), tB = (1.0 - fB) * mC;",
    "  vec3 backSoft = (a * tA + b * tB + mix(plateA, plateB, mC) * 0.001) / (tA + tB + 0.001);",
    "  vec3 back = (a * gA + b * gB + backSoft * 0.002) / (gA + gB + 0.002);",
    "",
    // A soft contact shadow that follows the morphing outline (only mid-turn,
    // so the real photos stay untouched at rest).
    "  float up = 0.035;",
    "  float fS = mix(mask(uMA, uvA - vec2(0.0, up)), mask(uMB, uvB - vec2(0.0, up)), mS);",
    "  float mid = 4.0 * uT * (1.0 - uT);",
    "  float shadow = smoothstep(0.3, 0.75, fS) * (1.0 - shape) * mid;",
    "  back *= 1.0 - 0.16 * shadow;",
    "",
    "  vec3 col = mix(back, prod, shape);",
    "",
    // Feather the frame into the page (rounded-rectangle falloff)
    "  vec2 o = max(-uv, uv - 1.0);",
    "  col = mix(col, uBg, smoothstep(-0.02, 0.03, max(o.x, o.y)));",
    "  vec2 p = abs(vUv - 0.5) * 2.0;",
    "  float r = pow(pow(p.x, 6.0) + pow(p.y, 6.0), 1.0 / 6.0);",
    "  col = mix(col, uBg, smoothstep(0.86, 1.0, r));",
    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  function GLRenderer(canvas, frames) {
    var gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error("no webgl");
    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var u = {};
    ["uA", "uB", "uEA", "uEB", "uMA", "uMB", "uMirA", "uMirB", "uT", "uStep", "uBlur", "uScale", "uBg"].forEach(function (n) {
      u[n] = gl.getUniformLocation(prog, n);
    });
    gl.uniform1i(u.uA, 0);
    gl.uniform1i(u.uB, 1);
    gl.uniform1i(u.uEA, 2);
    gl.uniform1i(u.uEB, 3);
    gl.uniform1i(u.uMA, 4);
    gl.uniform1i(u.uMB, 5);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    function makeTexture(filter) {
      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      return tex;
    }

    // One texture per distinct photo, one small extents texture per frame
    var textures = {};
    frames.forEach(function (f) {
      if (!textures[f.img.src]) {
        textures[f.img.src] = makeTexture(gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, f.img);
      }
      f.extTex = makeTexture(gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, EXT_N, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, f.ext);
      f.maskTex = makeTexture(gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, EXT_N, EXT_N, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, f.mask);
    });

    this.draw = function (s) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textures[s.a.img.src]);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, textures[s.b.img.src]);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, s.a.extTex);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, s.b.extTex);
      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(gl.TEXTURE_2D, s.a.maskTex);
      gl.activeTexture(gl.TEXTURE5);
      gl.bindTexture(gl.TEXTURE_2D, s.b.maskTex);
      gl.uniform1f(u.uMirA, s.a.mirror ? 1 : 0);
      gl.uniform1f(u.uMirB, s.b.mirror ? 1 : 0);
      gl.uniform1f(u.uT, s.t);
      gl.uniform1f(u.uStep, s.step * Math.PI / 180);
      gl.uniform1f(u.uBlur, s.blur);
      gl.uniform2f(u.uScale, s.scale[0], s.scale[1]);
      gl.uniform3f(u.uBg, s.bg[0], s.bg[1], s.bg[2]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
  }

  /* ---- Silhouette extents ------------------------------------------- */

  // For each row: where the product starts and ends (L, R).
  // For each column: where it starts and ends vertically (T, B).
  // Found by colour saturation against the neutral backdrop.
  var EXT_N = 256;

  function computeExtents(img, mirror) {
    var n = EXT_N;
    var c = document.createElement("canvas");
    c.width = n; c.height = n;
    var ctx = c.getContext("2d", { willReadFrequently: true });
    if (mirror) { ctx.translate(n, 0); ctx.scale(-1, 1); }
    ctx.drawImage(img, 0, 0, n, n);
    var d = ctx.getImageData(0, 0, n, n).data;
    var raw = new Float32Array(n * n);
    for (var i = 0; i < n * n; i++) {
      var r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
      var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      var sat = mx ? (mx - mn) / mx : 0;
      raw[i] = sat > SAT_THRESHOLD || mx < 90 ? 1 : 0;
    }
    // Close small holes (highlights, deep folds) and drop specks: dilate, then erode.
    var closed = threshold(boxBlur(threshold(boxBlur(raw, n, 3), 0.2), n, 3), 0.85);
    closed = threshold(boxBlur(closed, n, 2), 0.5);
    // A wide, smooth field (1 inside, 0 outside, 0.5 on the outline). Blending two
    // of these and cutting at 0.5 morphs one outline into the other.
    var soft = boxBlur(boxBlur(closed, n, 6), n, 6);
    var mask = new Uint8Array(n * n);
    var maskBytes = new Uint8Array(n * n);
    for (i = 0; i < n * n; i++) {
      mask[i] = closed[i] > 0.5 ? 1 : 0;
      maskBytes[i] = Math.round(soft[i] * 255);
    }
    function scan(isRow) {
      var lo = new Float32Array(n), hi = new Float32Array(n), ok = new Uint8Array(n);
      for (var a = 0; a < n; a++) {
        var first = -1, last = -1, count = 0;
        for (var b2 = 0; b2 < n; b2++) {
          var on = isRow ? mask[a * n + b2] : mask[b2 * n + a];
          if (on) { count++; if (first < 0) first = b2; last = b2; }
        }
        if (count >= 3) { lo[a] = first / (n - 1); hi[a] = last / (n - 1); ok[a] = 1; }
      }

      // Fill gaps from the nearest valid entry
      var any = false;
      for (a = 0; a < n; a++) if (ok[a]) { any = true; break; }
      if (!any) { for (a = 0; a < n; a++) { lo[a] = 0.25; hi[a] = 0.75; } return [lo, hi]; }
      for (a = 0; a < n; a++) {
        if (ok[a]) continue;
        for (var off = 1; off < n; off++) {
          if (a - off >= 0 && ok[a - off]) { lo[a] = lo[a - off]; hi[a] = hi[a - off]; break; }
          if (a + off < n && ok[a + off]) { lo[a] = lo[a + off]; hi[a] = hi[a + off]; break; }
        }
      }
      // Smooth so the morph flows instead of stepping
      function blur(arr) {
        var out = new Float32Array(n);
        for (var k = 0; k < n; k++) {
          var sum = 0, w = 0;
          for (var j = -4; j <= 4; j++) {
            var idx = Math.min(n - 1, Math.max(0, k + j));
            sum += arr[idx]; w++;
          }
          out[k] = sum / w;
        }
        return out;
      }
      return [blur(lo), blur(hi)];
    }
    var rows = scan(true), cols = scan(false);
    var out = new Uint8Array(n * 4);
    for (var k = 0; k < n; k++) {
      out[k * 4] = Math.round(rows[0][k] * 255);
      out[k * 4 + 1] = Math.round(rows[1][k] * 255);
      out[k * 4 + 2] = Math.round(cols[0][k] * 255);
      out[k * 4 + 3] = Math.round(cols[1][k] * 255);
    }
    return { ext: out, mask: maskBytes };
  }

  // Separable box blur on an n*n float field
  function boxBlur(src, n, r) {
    var tmp = new Float32Array(n * n), out = new Float32Array(n * n);
    var x, y, k, sum;
    for (y = 0; y < n; y++) {
      for (x = 0; x < n; x++) {
        sum = 0;
        for (k = -r; k <= r; k++) sum += src[y * n + Math.min(n - 1, Math.max(0, x + k))];
        tmp[y * n + x] = sum / (2 * r + 1);
      }
    }
    for (x = 0; x < n; x++) {
      for (y = 0; y < n; y++) {
        sum = 0;
        for (k = -r; k <= r; k++) sum += tmp[Math.min(n - 1, Math.max(0, y + k)) * n + x];
        out[y * n + x] = sum / (2 * r + 1);
      }
    }
    return out;
  }

  function threshold(src, t) {
    var out = new Float32Array(src.length);
    for (var i = 0; i < src.length; i++) out[i] = src[i] > t ? 1 : 0;
    return out;
  }

  var SAT_THRESHOLD = 0.28;

  /* ---- Canvas 2D fallback: a clean crossfade ------------------------- */

  function CanvasRenderer(canvas) {
    var ctx = canvas.getContext("2d");
    function drawOne(f, alpha, s) {
      var w = canvas.width / s.scale[0], h = canvas.height / s.scale[1];
      var x = (canvas.width - w) / 2, y = (canvas.height - h) / 2;
      ctx.save();
      ctx.globalAlpha = alpha;
      if (f.mirror) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
      ctx.drawImage(f.img, x, y, w, h);
      ctx.restore();
    }
    this.draw = function (s) {
      ctx.fillStyle = "rgb(" + s.bg.map(function (v) { return Math.round(v * 255); }).join(",") + ")";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawOne(s.a, 1, s);
      if (s.t > 0.001) drawOne(s.b, s.t, s);
    };
  }

  /* ---- Helpers -------------------------------------------------------- */

  function mod(a, n) { return ((a % n) + n) % n; }

  function parseColor(str) {
    var m = /rgba?\(([^)]+)\)/.exec(str);
    if (!m) return [0.906, 0.871, 0.835];
    var p = m[1].split(",").map(function (v) { return parseFloat(v) / 255; });
    return [p[0], p[1], p[2]];
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () {
        if (img.decode) img.decode().then(function () { resolve(img); }, function () { resolve(img); });
        else resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  /* ---- Component ------------------------------------------------------ */

  function init(root) {
    if (root.dataset.uiTurnReady) return;
    root.dataset.uiTurnReady = "true";

    var stage = root.querySelector(".ui-turn__stage");
    var canvas = root.querySelector(".ui-turn__canvas");
    var poster = root.querySelector(".ui-turn__poster");
    var hint = root.querySelector(".ui-turn__hint");
    var dial = root.querySelector(".ui-turn__dial");
    var caption = root.querySelector(".ui-turn__caption");
    var sources = Array.prototype.slice.call(root.querySelectorAll(".ui-turn__frames img"));
    if (!stage || !canvas || !sources.length) return;

    var frames = sources.map(function (el) {
      return {
        angle: mod(parseFloat(el.dataset.angle) || 0, 360),
        mirror: el.hasAttribute("data-mirror"),
        label: el.dataset.label || el.alt || "",
        src: el.currentSrc || el.src
      };
    }).sort(function (a, b) { return a.angle - b.angle; });

    var dragPerStage = parseFloat(root.dataset.dragDegrees) || 180; // degrees per stage width
    var zoom = parseFloat(root.dataset.zoom) || 0.86; // product size within the stage

    var state = {
      angle: frames[0].angle,
      vel: 0,           // degrees per ms
      target: null,
      spring: 0.011,    // natural frequency (1/ms)
      dragging: false,
      interacted: false
    };

    var renderer = null;
    var bg = parseColor(getComputedStyle(stage).backgroundColor);
    var scale = [1, 1];
    var dpr = 1;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = stage.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      // "contain" the square-ish photo inside the stage
      var img = frames[0].img;
      var ia = img ? img.naturalWidth / img.naturalHeight : 1;
      var ca = r.width / r.height;
      scale = ca > ia ? [ca / ia / zoom, 1 / zoom] : [1 / zoom, ia / ca / zoom];
      needsDraw = true;
    }

    // Find the two photos either side of an angle
    function pair(angle) {
      var a = mod(angle, 360);
      for (var i = 0; i < frames.length; i++) {
        var A = frames[i];
        var B = frames[(i + 1) % frames.length];
        var span = mod(B.angle - A.angle, 360) || 360;
        var into = mod(a - A.angle, 360);
        if (into < span) return { a: A, b: B, t: into / span, step: span };
      }
      return { a: frames[0], b: frames[0], t: 0, step: 360 };
    }

    function nearestFrameAngle(angle) {
      var best = null;
      frames.forEach(function (f) {
        var d = mod(f.angle - angle + 180, 360) - 180;
        if (best === null || Math.abs(d) < Math.abs(best)) best = d;
      });
      return angle + best;
    }

    var needsDraw = true;
    function draw() {
      if (!renderer) return;
      var p = pair(state.angle);
      var blur = reduceMotion.matches ? 0 : Math.min(0.012, Math.abs(state.vel) * 0.006);
      renderer.draw({
        a: p.a, b: p.b, t: p.t, step: p.step,
        blur: blur, scale: scale, bg: bg
      });
      updateDial();
      needsDraw = false;
    }

    /* ---- Motion loop ---- */

    var last = performance.now();
    var idle = null; // idle sway animation
    function loop(now) {
      var dt = Math.min(48, now - last);
      last = now;

      if (idle && !state.interacted) {
        var k = (now - idle.start) / idle.dur;
        if (k >= 1) { idle = null; state.target = nearestFrameAngle(state.angle); }
        else {
          var prev = state.angle;
          state.angle = idle.base + Math.sin(k * Math.PI * 2) * idle.amp * Math.sin(k * Math.PI);
          state.vel = (state.angle - prev) / Math.max(dt, 1);
          needsDraw = true;
        }
      } else if (!state.dragging && state.target !== null) {
        // Critically damped spring toward the target photo
        var w = state.spring;
        var acc = w * w * (state.target - state.angle) - 2 * w * state.vel;
        state.vel += acc * dt;
        state.angle += state.vel * dt;
        if (Math.abs(state.target - state.angle) < 0.02 && Math.abs(state.vel) < 0.0005) {
          state.angle = state.target;
          state.vel = 0;
          state.target = null;
          announce();
        }
        needsDraw = true;
      } else if (!state.dragging && Math.abs(state.vel) > 0) {
        state.vel *= Math.pow(0.9, dt / 16);
        if (Math.abs(state.vel) < 0.0005) state.vel = 0;
        needsDraw = true;
      }

      // Holding still mid-drag: let the motion blur fade out
      if (state.dragging && drag && drag.hist.length && now - drag.hist[drag.hist.length - 1].t > 40 && Math.abs(state.vel) > 0.0005) {
        state.vel *= Math.pow(0.7, dt / 16);
        needsDraw = true;
      }

      if (needsDraw) draw();
      requestAnimationFrame(loop);
    }

    function settle(projectMs) {
      var projected = state.angle + state.vel * (projectMs || 0);
      state.target = nearestFrameAngle(projected);
      state.spring = 0.011;
    }

    function goTo(angle, slow) {
      interact();
      var d = mod(angle - state.angle + 180, 360) - 180; // short way round
      state.target = state.angle + d;
      state.spring = reduceMotion.matches ? 0.05 : (slow ? 0.0065 : 0.011);
    }

    function step(dir) {
      var base = state.target !== null ? state.target : nearestFrameAngle(state.angle);
      var idx = 0;
      frames.forEach(function (f, i) { if (mod(f.angle - base, 360) < 0.01 || mod(base - f.angle, 360) < 0.01) idx = i; });
      var next = frames[mod(idx + dir, frames.length)];
      var d = mod(next.angle - base + 180, 360) - 180;
      if (dir > 0 && d <= 0) d += 360;
      if (dir < 0 && d >= 0) d -= 360;
      interact();
      state.target = base + d;
      state.spring = reduceMotion.matches ? 0.05 : 0.009;
    }

    function interact() {
      if (state.interacted) return;
      state.interacted = true;
      idle = null;
      if (hint) hint.classList.add("is-hidden");
    }

    /* ---- Pointer: drag / swipe ---- */

    var drag = null;
    stage.addEventListener("pointerdown", function (e) {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, angle: state.angle, moved: false, locked: e.pointerType === "mouse", hist: [] };
      if (e.pointerType === "mouse") startDrag(e);
    });

    function startDrag(e) {
      interact();
      state.dragging = true;
      state.target = null;
      stage.classList.add("is-dragging");
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    }

    stage.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x;
      var dy = e.clientY - drag.y;
      if (!drag.locked) {
        // Touch: only take over for a mostly horizontal gesture, so the page still scrolls
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
        drag.locked = true;
        startDrag(e);
      }
      var width = stage.getBoundingClientRect().width || 1;
      var prev = state.angle;
      state.angle = drag.angle - (dx / width) * dragPerStage;
      var now = performance.now();
      drag.hist.push({ t: now, a: state.angle });
      while (drag.hist.length > 2 && now - drag.hist[0].t > 90) drag.hist.shift();
      state.vel = state.angle - prev === 0 ? state.vel * 0.8 : state.vel;
      if (drag.hist.length > 1) {
        var h0 = drag.hist[0], h1 = drag.hist[drag.hist.length - 1];
        state.vel = (h1.a - h0.a) / Math.max(h1.t - h0.t, 1);
      }
      needsDraw = true;
    });

    function endDrag(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      var lastHist = drag.hist[drag.hist.length - 1];
      var wasDragging = state.dragging;
      drag = null;
      state.dragging = false;
      stage.classList.remove("is-dragging");
      if (!wasDragging) return;
      var lastMove = lastHist ? lastHist.t : 0;
      if (performance.now() - lastMove > 70) state.vel = 0; // paused before letting go
      var v = Math.max(-1.2, Math.min(1.2, state.vel));
      state.vel = reduceMotion.matches ? 0 : v;
      settle(reduceMotion.matches ? 0 : 260);
    }
    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);

    /* ---- Trackpad horizontal scroll ---- */

    var wheelTimer = null;
    stage.addEventListener("wheel", function (e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      interact();
      state.target = null;
      var width = stage.getBoundingClientRect().width || 1;
      var da = (e.deltaX / width) * dragPerStage * 0.6;
      state.angle += da;
      state.vel = da / 16;
      needsDraw = true;
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(function () { settle(120); }, 120);
    }, { passive: false });

    /* ---- Keyboard ---- */

    stage.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); step(1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); step(-1); }
      else if (e.key === "Home") { e.preventDefault(); goTo(frames[0].angle, true); }
    });

    /* ---- Dial ---- */

    var dialIcon = dial && dial.querySelector(".ui-turn__dial-icon");
    var dialTicks = [];
    if (dial) {
      var ticksGroup = dial.querySelector(".ui-turn__dial-ticks");
      frames.forEach(function (f) {
        var a = (f.angle - 90) * Math.PI / 180;
        var cx = 50 + Math.cos(a) * 40, cy = 50 + Math.sin(a) * 40;
        var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "ui-turn__tick");
        g.setAttribute("tabindex", "0");
        g.setAttribute("role", "button");
        g.setAttribute("aria-label", "Show " + (f.label || f.angle + "°") + " view");
        g.innerHTML = '<circle class="ui-turn__tick-hit" cx="' + cx + '" cy="' + cy + '" r="8"></circle>' +
                      '<circle class="ui-turn__tick-dot" cx="' + cx + '" cy="' + cy + '" r="2.2"></circle>';
        g.addEventListener("click", function () { goTo(f.angle, true); });
        g.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goTo(f.angle, true); }
        });
        ticksGroup.appendChild(g);
        dialTicks.push({ el: g, frame: f });
      });
    }

    var lastCaption = "";
    function updateDial() {
      var a = mod(state.angle, 360);
      if (dialIcon) dialIcon.setAttribute("transform", "rotate(" + (-a).toFixed(2) + " 50 50)");
      var nearest = null, nd = 999;
      frames.forEach(function (f) {
        var d = Math.abs(mod(f.angle - a + 180, 360) - 180);
        if (d < nd) { nd = d; nearest = f; }
      });
      dialTicks.forEach(function (t) { t.el.classList.toggle("is-current", t.frame === nearest && nd < 12); });
      if (caption && nearest && nearest.label !== lastCaption) {
        lastCaption = nearest.label;
        caption.textContent = nearest.label;
      }
    }

    function announce() {
      stage.setAttribute("aria-label", (root.dataset.name || "Product") + ", " + (lastCaption || "") + " view. Drag or use arrow keys to turn.");
    }

    /* ---- Start ---- */

    stage.classList.add("is-loading");
    var unique = {};
    frames.forEach(function (f) { unique[f.src] = unique[f.src] || loadImage(f.src); });
    Promise.all(frames.map(function (f) { return unique[f.src].then(function (img) { f.img = img; }); })).then(function () {
      frames.forEach(function (f) { var r = computeExtents(f.img, f.mirror); f.ext = r.ext; f.mask = r.mask; });
      try { renderer = new GLRenderer(canvas, frames); root.classList.add("is-webgl"); }
      catch (err) { renderer = new CanvasRenderer(canvas); }
      resize();
      draw();
      stage.classList.remove("is-loading");
      root.classList.add("is-ready");
      if (poster) poster.setAttribute("aria-hidden", "true");
      announce();
      if (!reduceMotion.matches) {
        setTimeout(function () {
          if (!state.interacted) idle = { start: performance.now(), dur: 3400, base: state.angle, amp: 28 };
        }, 700);
      }
      requestAnimationFrame(function (t) { last = t; loop(t); });
    }, function () {
      stage.classList.remove("is-loading");
    });

    if (window.ResizeObserver) new ResizeObserver(function () { if (renderer) resize(); }).observe(stage);
    else window.addEventListener("resize", function () { if (renderer) resize(); });

    root.uiTurn = { goTo: goTo, next: function () { step(1); }, prev: function () { step(-1); }, frames: frames };
  }

  function initAll() { document.querySelectorAll("[data-ui-turn]").forEach(init); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
  else initAll();
})();
