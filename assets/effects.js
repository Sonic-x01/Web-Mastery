/* Web Mastery: visual polish layer — hero live editor, tag rain, reading size, back-to-top. */
(function () {
  "use strict";
  var reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---- hero: an editor that types HTML while a sandboxed preview renders it ---- */
  function heroLive() {
    var codeEl = document.getElementById("heroCode"), frame = document.getElementById("heroFrame"), alertEl = document.getElementById("heroAlert");
    if (!codeEl || !frame || !window.WM) return;
    var WM = window.WM;
    var SRC = [
      '<form action="/login" method="post">',
      "  <h3>Sign in to Shop</h3>",
      '  <input name="user" placeholder="username">',
      '  <input name="pass" type="password" placeholder="••••••">',
      "  <button>Login</button>",
      "</form>",
      "<!-- server reflects ?msg= below, unescaped -->",
      "<p>msg: <img src=x onerror=alert('XSS')></p>"
    ].join("\n");
    var STYLE = "<style>body{font:14px system-ui,sans-serif;margin:14px 18px;color:#1f2937}form{display:flex;flex-wrap:wrap;gap:8px;align-items:center}h3{width:100%;margin:0 0 2px;font-size:16px}input{padding:6px 9px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;width:140px}button{padding:6px 14px;border:0;border-radius:7px;background:#f0602a;color:#fff;font-weight:700}p{margin:12px 0 0;color:#475569}img{display:none}</style>";
    var tok = "", done = 0, timer = null, visible = true;
    window.addEventListener("message", function (e) {
      if (e.source !== frame.contentWindow || !e.data || e.data.__wm !== tok) return;
      if (e.data.type === "alert") {
        alertEl.innerHTML = "🚨 <b>alert('" + WM.esc(e.data.data.msg) + "')</b> اتنفّذ!<br><small>الـ input اتحط في الصفحة من غير encoding ⇒ <code>&lt;img onerror&gt;</code> شغّل JavaScript.</small>";
        alertEl.hidden = false;
      }
    });
    function render(upto) {
      tok = WM.uid();
      frame.srcdoc = WM.buildDoc(STYLE + SRC.slice(0, upto), { tok: tok, mode: "xss", pageURL: "https://shop.example/login" });
    }
    function paint(n) { codeEl.innerHTML = WM.highlight(SRC.slice(0, n), "html"); }
    function restart() { done = 0; alertEl.hidden = true; paint(0); render(0); tick(); }
    function tick() {
      clearTimeout(timer);
      if (!visible) { timer = null; return; }
      if (done >= SRC.length) { timer = setTimeout(restart, 5200); return; }
      done++;
      paint(done);
      var ch = SRC[done - 1];
      if (ch === "\n" || done === SRC.length) render(done);
      timer = setTimeout(tick, ch === "\n" ? 380 : 26 + Math.random() * 34);
    }
    if (reduced) { paint(SRC.length); render(SRC.length); return; }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
        if (visible && !timer) timer = setTimeout(tick, 400);
      }).observe(frame);
    }
    restart();
  }

  function start() {
    if (fine) {
      document.addEventListener("pointermove", function (e) {
        var c = e.target.closest && e.target.closest(".card, .source");
        if (!c) return;
        var b = c.getBoundingClientRect();
        c.style.setProperty("--mx", e.clientX - b.left + "px");
        c.style.setProperty("--my", e.clientY - b.top + "px");
      }, { passive: true });
    }
    var term = document.querySelector(".hero .terminal");
    if (term && fine && !reduced) {
      term.addEventListener("pointermove", function (e) {
        var b = term.getBoundingClientRect();
        term.style.setProperty("--ry", (((e.clientX - b.left) / b.width - 0.5) * 4).toFixed(2) + "deg");
        term.style.setProperty("--rx", (-((e.clientY - b.top) / b.height - 0.5) * 4).toFixed(2) + "deg");
      });
      term.addEventListener("pointerleave", function () { term.style.setProperty("--ry", "0deg"); term.style.setProperty("--rx", "0deg"); });
    }
    heroLive();

    var secs = document.querySelectorAll(".section");
    if ("IntersectionObserver" in window) {
      var seen = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("fx-seen"); seen.unobserve(x.target); } }); }, { rootMargin: "0px 0px -15% 0px" });
      secs.forEach(function (s) { seen.observe(s); });
    } else secs.forEach(function (s) { s.classList.add("fx-seen"); });

    // reading size
    var SIZES = ["sm", "md", "lg", "xl"], root = document.documentElement, cur = "md";
    var apply = function (s) { if (s === "md") root.removeAttribute("data-size"); else root.setAttribute("data-size", s); };
    try { cur = localStorage.getItem("webMastery.size") || "md"; } catch (e) {}
    if (SIZES.indexOf(cur) === -1) cur = "md";
    apply(cur);
    document.querySelectorAll("[data-size-step]").forEach(function (b) {
      b.addEventListener("click", function () {
        var i = SIZES.indexOf(cur) + Number(b.getAttribute("data-size-step"));
        cur = SIZES[Math.max(0, Math.min(SIZES.length - 1, i))]; apply(cur);
        try { localStorage.setItem("webMastery.size", cur); } catch (e) {}
      });
    });

    // hero backdrop: falling markup
    var canvas = document.getElementById("tagRain");
    if (canvas && !reduced && canvas.getContext) {
      var ctx = canvas.getContext("2d"), cols = [], colW = 62, rowH = 22, dpr = Math.min(window.devicePixelRatio || 1, 2), vis = true, last = 0;
      var BITS = ["<div>", "</a>", "href=", "<form>", "&lt;", "src=", "onerror=", "<svg>", "<!--", "-->", "{ }", "=>", "#id", ".cls", "fetch()", "%3C", "<p>", "</>", "alt=", "<iframe>", "action=", "&amp;", "<script>", "name=", "::before", "const", "DOM", "rel=", "<td>", "type="];
      var resize = function () {
        var b = canvas.getBoundingClientRect();
        canvas.width = Math.max(1, b.width * dpr); canvas.height = Math.max(1, b.height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cols = []; for (var i = 0; i < Math.ceil(b.width / colW); i++) cols.push({ y: Math.random() * b.height, sp: 7 + Math.random() * 18, hot: Math.random() < 0.14 });
      };
      resize(); window.addEventListener("resize", resize);
      if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { vis = e[0].isIntersecting; }).observe(canvas);
      var frame = function (now) {
        requestAnimationFrame(frame);
        if (!vis || document.hidden) { last = now; return; }
        var dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
        var h = canvas.height / dpr, w = canvas.width / dpr;
        ctx.clearRect(0, 0, w, h); ctx.font = "11.5px 'JetBrains Mono', Consolas, monospace";
        for (var i = 0; i < cols.length; i++) {
          var c = cols[i]; c.y += c.sp * dt;
          if (c.y > h + rowH * 7) { c.y = -rowH * 4; c.hot = Math.random() < 0.14; }
          for (var k = 0; k < 7; k++) {
            var y = c.y - k * rowH; if (y < -rowH || y > h + rowH) continue;
            var seed = (i * 31 + Math.floor(y / rowH) * 17) % BITS.length;
            var a = (1 - k / 7) * (k === 0 ? 0.55 : 0.2);
            ctx.fillStyle = c.hot ? "rgba(180,140,255," + a + ")" : "rgba(255,122,69," + a + ")";
            ctx.fillText(BITS[seed], i * colW, y);
          }
        }
      };
      requestAnimationFrame(frame);
    }

    var top = document.createElement("button");
    top.type = "button"; top.className = "fx-top"; top.setAttribute("aria-label", "الرجوع لأعلى الصفحة"); top.textContent = "↑";
    top.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }); });
    document.body.appendChild(top);
    var tk = false;
    window.addEventListener("scroll", function () { if (tk) return; tk = true; requestAnimationFrame(function () { top.classList.toggle("show", window.scrollY > 900); tk = false; }); }, { passive: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
