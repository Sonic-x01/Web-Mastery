/* ============================================================
   Web Mastery for Pentesters — course engine
   Fully static & offline: every preview runs in a sandboxed iframe
   (allow-scripts allow-forms, opaque origin) inside your browser.
   ============================================================ */
(function () {
  "use strict";
  var WM = window.WM;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SELFTEST = /[?&]selftest\b/.test(location.search);

  /* ---------------- state ---------------- */
  var STORE_KEY = "webMastery.v1", THEME_KEY = "webMastery.theme";
  var BAGS = ["quizzes", "labs", "tasks", "xss", "projects", "code"];
  function loadState() {
    var s = { pg: null, celebrated: false };
    try {
      var r = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      BAGS.forEach(function (b) { s[b] = r[b] || {}; });
      s.pg = r.pg || null; s.celebrated = !!r.celebrated;
    } catch (e) { BAGS.forEach(function (b) { s[b] = {}; }); }
    return s;
  }
  var state = SELFTEST ? (function () { var s = { pg: null, celebrated: true }; BAGS.forEach(function (b) { s[b] = {}; }); return s; })() : loadState();
  var saveState = function () { if (SELFTEST) return; try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ } };

  /* ---------------- toast / theme ---------------- */
  var toastEl = $("#toast"), toastTxt = $("#toastTxt"), toastTimer = null;
  function toast(msg, icon) {
    if (!toastEl) return;
    var ico = toastEl.querySelector(".t-ico"); if (ico) ico.textContent = icon || "✓";
    toastTxt.textContent = msg; toastEl.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2800);
  }
  var themeBtn = $("#themeBtn");
  function applyTheme(t, persist) {
    document.documentElement.dataset.theme = t;
    if (themeBtn) { themeBtn.textContent = t === "light" ? "☀️" : "🌙"; themeBtn.setAttribute("aria-label", t === "light" ? "تفعيل الوضع الداكن" : "تفعيل الوضع الفاتح"); }
    var meta = $('meta[name="theme-color"]'); if (meta) meta.setAttribute("content", t === "light" ? "#f4f7fb" : "#060911");
    if (persist) { try { localStorage.setItem(THEME_KEY, t); } catch (e) {} }
  }
  function initTheme() {
    var t = "dark"; try { t = localStorage.getItem(THEME_KEY) || "dark"; } catch (e) {}
    applyTheme(t === "light" ? "light" : "dark", false);
    if (themeBtn) themeBtn.addEventListener("click", function () { applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light", true); });
  }
  var yearEl = $("#year"); if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------- highlighting & copy ---------------- */
  function highlightAll(root) {
    $$("code[class*='language-']:not([data-hl])", root).forEach(function (c) {
      var lang = (/language-([\w-]+)/.exec(c.className) || [])[1] || "text";
      c.innerHTML = WM.highlight(c.textContent, lang);
      c.setAttribute("data-hl", "1");
    });
  }
  function buildGutter(block) {
    var pre = block.querySelector("pre.code-pre"), body = block.querySelector(".code-body");
    if (!pre || !body || body.querySelector(".gutter")) return;
    var n = pre.textContent.replace(/\n$/, "").split("\n").length;
    var g = document.createElement("div"); g.className = "gutter"; g.setAttribute("aria-hidden", "true");
    var t = ""; for (var i = 1; i <= n; i++) t += i + "\n"; g.textContent = t;
    body.insertBefore(g, pre);
  }
  function copyText(txt, btn) {
    var done = function () { if (btn) { var o = btn.textContent; btn.textContent = "✓ اتنسخ"; setTimeout(function () { btn.textContent = o; }, 1300); } };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(done, function () { fallbackCopy(txt); done(); });
    else { fallbackCopy(txt); done(); }
  }
  function fallbackCopy(t) { var ta = document.createElement("textarea"); ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e) {} ta.remove(); }
  function rawCode(block) { var r = block.querySelector("script.raw"); return r ? JSON.parse(r.textContent) : (block.querySelector("pre.code-pre code") || {}).textContent || ""; }
  function initCodeBlocks() {
    $$(".code-block").forEach(function (b) {
      buildGutter(b);
      var cp = b.querySelector(".copy");
      if (cp) cp.addEventListener("click", function () { copyText(rawCode(b), cp); });
    });
  }

  /* ---------------- navigation ---------------- */
  var sections = $$("main .section[data-nav]"), nav = $("#nav"), navLinks = new Map();
  function initNav() {
    if (!nav) return;
    var part = null;
    sections.forEach(function (s) {
      if (s.dataset.part && s.dataset.part !== part) {
        part = s.dataset.part;
        var h = document.createElement("div"); h.className = "nav-part"; h.textContent = part;
        if (s.dataset.pk) h.dataset.pk = s.dataset.pk;
        nav.appendChild(h);
      }
      var a = document.createElement("a"); a.href = "#" + s.id; a.dataset.target = s.id;
      if (s.dataset.pk) a.dataset.pk = s.dataset.pk;
      var idx = s.querySelector(".section-index");
      a.innerHTML = '<span class="num"></span><span class="ico"></span><span class="txt"></span><span class="tick">✓</span>';
      a.querySelector(".num").textContent = idx ? idx.textContent.trim() : "";
      a.querySelector(".ico").textContent = s.dataset.icon || "•";
      a.querySelector(".txt").textContent = s.dataset.nav || s.id;
      nav.appendChild(a); navLinks.set(s.id, a);
    });
  }
  function initActive() {
    var upd = function () { var cur = null; sections.forEach(function (s) { if (s.getBoundingClientRect().top <= 150) cur = s.id; }); navLinks.forEach(function (l, id) { l.classList.toggle("active", id === cur); }); };
    var tk = false;
    window.addEventListener("scroll", function () { if (tk) return; tk = true; requestAnimationFrame(function () { upd(); tk = false; }); }, { passive: true });
    upd();
  }
  function initSearch() {
    var input = $("#navSearch"); if (!input) return;
    input.addEventListener("input", function () {
      var q = input.value.trim().toLowerCase();
      $$(".nav a").forEach(function (l) { var s = document.getElementById(l.dataset.target); var hay = (l.textContent + " " + (s ? s.dataset.keywords || "" : "")).toLowerCase(); l.classList.toggle("hide", q !== "" && hay.indexOf(q) === -1); });
      $$(".nav .nav-part").forEach(function (p) { p.classList.toggle("hide", q !== ""); });
    });
  }
  function initDrawer() {
    var sb = $("#sidebar"), scrim = $("#scrim"), mb = $("#menuBtn"), cb = $("#sidebarClose");
    var open = function () { sb.classList.add("open"); scrim.classList.add("show"); mb.setAttribute("aria-expanded", "true"); document.body.style.overflow = "hidden"; };
    var close = function () { sb.classList.remove("open"); scrim.classList.remove("show"); mb.setAttribute("aria-expanded", "false"); document.body.style.overflow = ""; };
    if (mb) mb.addEventListener("click", open); if (cb) cb.addEventListener("click", close); if (scrim) scrim.addEventListener("click", close);
    if (nav) nav.addEventListener("click", function (e) { if (e.target.closest("a") && window.innerWidth <= 980) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && sb.classList.contains("open")) close(); });
  }

  /* ---------------- progress ---------------- */
  var KINDS = [[".quiz[data-ex]", "quizzes"], [".lab[data-ex]", "labs"], [".task[data-ex]", "tasks"], [".xss[data-ex]", "xss"], [".project[data-ex]", "projects"]];
  var allItems = [];
  KINDS.forEach(function (k) { $$(k[0]).forEach(function (el) { allItems.push([el, k[1]]); }); });
  function updateProgress() {
    var n = allItems.filter(function (p) { return state[p[1]][p[0].dataset.ex]; }).length, total = allItems.length;
    var ratio = total ? n / total : 0, pct = Math.round(ratio * 100);
    var set = function (id, v) { var el = $(id); if (el) el.textContent = v; };
    set("#topProgress", pct + "%"); set("#sidePercent", pct + "%"); set("#sideCount", n + " من " + total + " تمرين");
    set("#finalSolved", n); set("#finalTotal", total);
    var tr = $("#topRing"), sr = $("#sideRing");
    if (tr) tr.style.strokeDashoffset = String(63 - 63 * ratio);
    if (sr) sr.style.strokeDashoffset = String(163 - 163 * ratio);
    var ds = 0;
    sections.forEach(function (s) {
      var any = false, all = true;
      KINDS.forEach(function (k) { $$(k[0], s).forEach(function (el) { any = true; if (!state[k[1]][el.dataset.ex]) all = false; }); });
      if (!any) return;
      if (all) ds++;
      var l = navLinks.get(s.id); if (l) l.classList.toggle("done", all);
    });
    set("#finalSections", ds);
    if (ratio === 1 && total && !state.celebrated) { state.celebrated = true; saveState(); confetti(); toast("🎉 مبروك! خلصت كل تمارين الكورس", "🏆"); }
  }
  function markDone(bag, id, msg, icon) {
    if (state[bag][id]) return;
    state[bag][id] = true; saveState(); updateProgress();
    if (msg) toast(msg, icon);
  }

  /* ---------------- quizzes ---------------- */
  function initQuizzes() {
    $$(".quiz[data-ex]").forEach(function (q) {
      var id = q.dataset.ex, ans = Number(q.dataset.answer), opts = $$(".option", q), fb = q.querySelector(".quiz-feedback");
      var markCorrect = function (o) { o.classList.add("correct"); var m = o.querySelector(".mark"); if (m) m.textContent = "✓"; };
      if (state.quizzes[id]) {
        q.classList.add("solved");
        opts.forEach(function (o) { o.disabled = true; if (Number(o.dataset.i) === ans) markCorrect(o); });
        if (fb) { fb.className = "quiz-feedback show good"; fb.innerHTML = "<strong>تم حلها قبل كده ✓</strong> " + (fb.dataset.good || ""); highlightAll(fb); }
      }
      opts.forEach(function (o) {
        o.addEventListener("click", function () {
          if (q.classList.contains("solved") || o.disabled) return;
          if (Number(o.dataset.i) === ans) {
            opts.forEach(function (x) { x.disabled = true; x.classList.remove("wrong"); });
            markCorrect(o); q.classList.add("solved");
            if (fb) { fb.className = "quiz-feedback show good"; fb.innerHTML = "<strong>إجابة صحيحة ✅</strong> " + (fb.dataset.good || ""); highlightAll(fb); }
            markDone("quizzes", id, "إجابة صحيحة — اتسجلت", "✅");
          } else {
            o.classList.add("wrong"); o.disabled = true;
            var m = o.querySelector(".mark"); if (m) m.textContent = "✗";
            if (fb) { fb.className = "quiz-feedback show bad"; fb.innerHTML = "<strong>مش صح ❌</strong> " + (fb.dataset.bad || ""); highlightAll(fb); }
          }
        });
      });
    });
  }

  /* ---------------- live examples ---------------- */
  function parseCookies(spec) {   // "session=7f3a; HttpOnly | theme=dark"  →  simulated server-set cookies
    if (!spec) return undefined;
    return spec.split("|").map(function (c) {
      var parts = c.split(";").map(function (x) { return x.trim(); }), nv = parts.shift(), i = nv.indexOf("=");
      return { name: nv.slice(0, i), value: nv.slice(i + 1), httpOnly: parts.some(function (a) { return /^httponly$/i.test(a); }) };
    });
  }
  function initExamples() {
    var lazy = [];
    $$(".hx").forEach(function (hx) {
      var block = hx.querySelector(".code-block"), out = hx.querySelector(".hx-out"), pv = null, treeBox = null;
      var src = function () { return rawCode(block); };
      var run = function () {
        if (!pv) pv = new WM.Preview(out, { mode: hx.dataset.mode || "play", pageURL: hx.dataset.url || undefined, min: Number(hx.dataset.min || 60), max: Number(hx.dataset.max || 460), height: Number(hx.dataset.h || 0) || undefined, cookies: parseCookies(hx.dataset.cookies) });
        out.hidden = false;
        var b = hx.querySelector(".hx-run"); if (b) b.textContent = "⟳ أعد التشغيل";
        return pv.run(src());
      };
      hx._run = run;
      hx._pv = function () { return pv; };
      var rb = hx.querySelector(".hx-run"); if (rb) rb.addEventListener("click", run);
      var tb = hx.querySelector(".hx-tree");
      if (tb) tb.addEventListener("click", function () {
        if (treeBox && !treeBox.hidden) { treeBox.hidden = true; tb.classList.remove("on"); return; }
        if (!treeBox) { treeBox = document.createElement("div"); treeBox.className = "hx-treebox"; hx.appendChild(treeBox); }
        tb.classList.add("on");
        var show = function (json, live) {
          treeBox.innerHTML = '<div class="hx-tree-head"><span>🌳 شجرة الـ DOM ' + (live ? "(من الصفحة الحية بعد تنفيذ الـ scripts)" : "(زي ما الـ parser بناها)") + '</span><label><input type="checkbox" class="ws"> إظهار الـ whitespace</label></div><div class="hx-tree-body"></div>';
          var body = treeBox.querySelector(".hx-tree-body"), ws = treeBox.querySelector(".ws");
          var paint = function () { body.innerHTML = WM.renderTree(json, { hideWS: !ws.checked }); };
          ws.addEventListener("change", paint); paint();
          treeBox.hidden = false;
        };
        if (pv && pv.readyInfo) pv.tree().then(function (t) { show(t || WM.serialize(WM.parseHTML(src())), !!t); });
        else show(WM.serialize(WM.parseHTML(src())), false);
      });
      var lb = hx.querySelector(".hx-lab");
      if (lb) lb.addEventListener("click", function () { openPlayground({ html: src(), css: "", js: "", from: hx.dataset.file || "مثال", url: hx.dataset.url }); });
      if (hx.hasAttribute("data-auto")) lazy.push(hx);
    });
    if (!lazy.length) return;
    if (!("IntersectionObserver" in window)) { lazy.forEach(function (h) { h._run(); }); return; }
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { io.unobserve(x.target); x.target._run(); } }); }, { rootMargin: "300px 0px" });
    lazy.forEach(function (h) { io.observe(h); });
  }

  /* ---------------- playground (overlay) ---------------- */
  var PG_DEFAULT = {
    html: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>My Lab</title>\n</head>\n<body>\n  <h1>Hello, Web!</h1>\n  <p>Edit me — the preview updates as you type.</p>\n\n  <form action="/login" method="post">\n    <input name="user" placeholder="username">\n    <input name="pass" type="password" placeholder="password">\n    <button>Login</button>\n  </form>\n</body>\n</html>\n',
    css: "", js: "", url: "https://victim.example/app/index.html"
  };
  var PG = { built: false, file: "html", files: null, ed: null, pv: null, nC: 0, nN: 0 };
  function pgBuild() {
    if (PG.built) return;
    PG.built = true;
    var saved = state.pg || {};
    PG.files = { html: saved.html != null ? saved.html : PG_DEFAULT.html, css: saved.css || "", js: saved.js || "" };
    $("#pgUrl").value = saved.url || PG_DEFAULT.url;
    var views = $("#pgViews");
    views.innerHTML = '<div class="pgv on" data-v="view"></div><div class="pgv" data-v="dom"><div class="pg-dom-bar"><button type="button" class="mini-btn" id="pgDomRef">⟳ تحديث</button><label><input type="checkbox" id="pgWS"> إظهار الـ whitespace</label><span class="muted small">الشجرة دي من الصفحة الحية (بعد تنفيذ الـ JavaScript)</span></div><div class="pg-dom"></div></div><div class="pgv" data-v="console"><div class="pg-log" id="pgCon"></div></div><div class="pgv" data-v="net"><div class="pg-log" id="pgNet"></div></div>';
    PG.pv = new WM.Preview(views.querySelector('[data-v="view"]'), { fixed: true, log: false, cls: "pv-fill", onEvent: pgEvent });
    PG.ed = new WM.Editor($("#pgEditor"), { value: PG.files.html, lang: "html", fill: true, label: "محرر المعمل", onChange: function (v) { PG.files[PG.file] = v; pgSave(); if ($("#pgAuto").checked) pgAutoRun(); }, onRun: pgRun });
    $$("#pgFiles button").forEach(function (b) {
      b.addEventListener("click", function () {
        $$("#pgFiles button").forEach(function (x) { x.classList.toggle("on", x === b); });
        PG.file = b.dataset.file; PG.ed.setLang(PG.file); PG.ed.value = PG.files[PG.file]; PG.ed.focus();
      });
    });
    $$("#pgTabs button").forEach(function (b) {
      b.addEventListener("click", function () {
        $$("#pgTabs button").forEach(function (x) { x.classList.toggle("on", x === b); });
        $$(".pgv", views).forEach(function (v) { v.classList.toggle("on", v.dataset.v === b.dataset.tab); });
        if (b.dataset.tab === "dom") pgTree();
      });
    });
    $("#pgDomRef").addEventListener("click", pgTree);
    $("#pgWS").addEventListener("change", pgTree);
    $("#pgRun").addEventListener("click", pgRun);
    $("#pgClose").addEventListener("click", closePlayground);
    $("#pgFmt").addEventListener("click", function () {
      if (!confirm("ترجّع القالب الافتراضي؟ الكود الحالي هيتمسح.")) return;
      PG.files = { html: PG_DEFAULT.html, css: "", js: "" }; PG.ed.value = PG.files[PG.file]; pgSave(); pgRun();
    });
    $("#pgLayout").addEventListener("click", function () { $("#pg").classList.toggle("stack"); });
    $("#pgUrl").addEventListener("change", function () { pgSave(); pgRun(); });
    $("#pg").addEventListener("keydown", function (e) { if (e.key === "Escape") closePlayground(); });
  }
  var pgAutoRun = WM.debounce(function () { pgRun(); }, 650);
  function pgSave() { state.pg = { html: PG.files.html, css: PG.files.css, js: PG.files.js, url: $("#pgUrl").value }; saveState(); }
  function pgRun() {
    PG.nC = 0; PG.nN = 0; $("#pgNC").textContent = ""; $("#pgNN").textContent = "";
    $("#pgCon").innerHTML = '<div class="pg-empty">الـ console فاضي — استخدم <code>console.log()</code> في الـ JavaScript.</div>';
    $("#pgNet").innerHTML = '<div class="pg-empty">مفيش requests لسه — دوس على لينك أو ابعت فورم في المعاينة.</div>';
    var url = $("#pgUrl").value.trim();
    try { new URL(url); } catch (e) { url = PG_DEFAULT.url; }
    PG.pv.pageURL = url;
    PG.pv.run(WM.combine(PG.files)).then(function () { if ($('#pgTabs button[data-tab="dom"]').classList.contains("on")) pgTree(); });
  }
  function pgEvent(t, d) {
    if (t === "ready") return;
    var isNet = t === "nav" || t === "submit";
    var box = $(isNet ? "#pgNet" : "#pgCon");
    var empty = box.querySelector(".pg-empty"); if (empty) empty.remove();
    box.appendChild(WM.eventView(t, d));
    box.scrollTop = box.scrollHeight;
    if (isNet) { PG.nN++; $("#pgNN").textContent = PG.nN; toast(t === "submit" ? "الفورم اتبعتت — شوف تاب Requests" : "اتسجل في تاب Requests", t === "submit" ? "📨" : "🔗"); }
    else { PG.nC++; $("#pgNC").textContent = PG.nC; if (t === "alert") toast(d.kind + "(" + (d.msg || "") + ") اتنفّذ في المعاينة", "🚨"); }
  }
  function pgTree() {
    var box = $("#pgViews .pg-dom");
    PG.pv.tree().then(function (t) {
      box.innerHTML = t ? WM.renderTree(t, { hideWS: !$("#pgWS").checked }) : '<div class="pg-empty">الصفحة لسه بتحمّل…</div>';
    });
  }
  var lastFocus = null;
  function openPlayground(opts) {
    pgBuild();
    if (opts && (opts.html != null)) {
      if (PG.files.html.trim() && PG.files.html !== opts.html && state.pg && state.pg.html && state.pg.html !== PG_DEFAULT.html && !SELFTEST) {
        if (!confirm("هتستبدل الكود اللي في المعمل بكود المثال؟")) opts = null;
      }
      if (opts) {
        PG.files = { html: opts.html, css: opts.css || "", js: opts.js || "" };
        if (opts.url) $("#pgUrl").value = opts.url;
        PG.file = "html"; $$("#pgFiles button").forEach(function (x) { x.classList.toggle("on", x.dataset.file === "html"); });
        PG.ed.setLang("html"); PG.ed.value = PG.files.html; pgSave();
      }
    }
    $("#pgFrom").textContent = opts && opts.from ? "— " + opts.from : "";
    lastFocus = document.activeElement;
    $("#pg").hidden = false; document.body.classList.add("pg-lock");
    requestAnimationFrame(function () { $("#pg").classList.add("show"); });
    pgRun(); PG.ed.focus();
  }
  function closePlayground() {
    var pg = $("#pg"); pg.classList.remove("show"); document.body.classList.remove("pg-lock");
    setTimeout(function () { pg.hidden = true; }, REDUCED ? 0 : 220);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function initPlayground() {
    $$("#pgOpen, [data-pg-open]").forEach(function (b) { b.addEventListener("click", function () { openPlayground(null); }); });
  }

  /* ---------------- graded HTML labs ---------------- */
  var fnCache = {};
  function compile(expr) {
    if (!fnCache[expr]) fnCache[expr] = new Function("doc", "src", "S", "$", "$$", "text", "has", "count", "attr", '"use strict"; return (' + expr + ");");
    return fnCache[expr];
  }
  function staticCheck(expr, src) {
    var doc = WM.parseHTML(src);
    var q = function (s) { return doc.querySelector(s); }, qa = function (s) { return Array.prototype.slice.call(doc.querySelectorAll(s)); };
    var text = function (x) { var e = typeof x === "string" ? q(x) : x; return e ? e.textContent.replace(/\s+/g, " ").trim() : ""; };
    var S = src.replace(/<!--[\s\S]*?-->/g, "").toLowerCase();
    try { return { ok: !!compile(expr)(doc, src, S, q, qa, text, function (s) { return !!q(s); }, function (s) { return qa(s).length; }, function (s, a) { var e = q(s); return e ? e.getAttribute(a) : null; }) }; }
    catch (e) { return { ok: false, err: e.message }; }
  }
  function runTests(data, src, pv) {
    var needLive = data.tests.some(function (t) { return t.live; });
    var ready = needLive ? pv.run(src) : Promise.resolve();
    return ready.then(function () {
      return Promise.all(data.tests.map(function (t) {
        if (!t.live) return Promise.resolve(staticCheck(t.expr, src));
        return new Promise(function (res) { setTimeout(function () { pv.evalLive(t.expr).then(function (r) { res(r || { ok: false, err: "timeout" }); }); }, 60); });
      }));
    });
  }
  function initLabs() {
    $$(".lab[data-ex]").forEach(function (lab) {
      var id = lab.dataset.ex, data = JSON.parse(lab.querySelector("script.lab-data").textContent), ui = lab.querySelector(".lab-ui");
      lab._data = data;
      ui.innerHTML = '<div class="lab-ed"></div><div class="lab-actions"><button type="button" class="btn btn-primary btn-sm lab-check">✔ تحقق من الحل</button><button type="button" class="mini-btn lab-run">▶ معاينة</button><button type="button" class="mini-btn lab-pg">🧪 افتح في المعمل</button>' + (data.hint ? '<button type="button" class="mini-btn lab-hint">💡 تلميح</button>' : "") + '<button type="button" class="mini-btn lab-sol">👁 الحل</button><button type="button" class="mini-btn lab-reset">⟲ البداية</button><span class="lab-msg"></span></div><ul class="lab-tests"></ul><div class="lab-hint-box" hidden></div><div class="lab-sol-box" hidden></div><div class="lab-pv" hidden></div>';
      var ed = new WM.Editor(ui.querySelector(".lab-ed"), { value: state.code[id] != null ? state.code[id] : data.starter, lang: data.lang || "html", minLines: 8, maxHeight: 460, label: "محرر المعمل: " + lab.querySelector("h4").textContent, onChange: WM.debounce(function (v) { state.code[id] = v; saveState(); }, 400), onRun: function () { check(); } });
      var list = ui.querySelector(".lab-tests"), msg = ui.querySelector(".lab-msg"), pvBox = ui.querySelector(".lab-pv"), pv = null;
      var getPv = function () { if (!pv) pv = new WM.Preview(pvBox, { min: 60, max: 420, pageURL: data.url || undefined }); return pv; };
      list.innerHTML = data.tests.map(function (t) { return '<li><span class="lt-i">○</span><span>' + t.label + "</span></li>"; }).join("");
      var paint = function (res) {
        $$("li", list).forEach(function (li, i) {
          var ok = res[i] && res[i].ok; li.className = ok ? "ok" : "bad";
          li.querySelector(".lt-i").textContent = ok ? "✓" : "✗";
        });
      };
      var solvedUI = function () { lab.classList.add("done"); lab.querySelector(".lab-state").textContent = "✓ اتحل"; };
      if (state.labs[id]) solvedUI();
      var check = function () {
        var src = ed.value;
        pvBox.hidden = false;
        msg.className = "lab-msg"; msg.textContent = "⏳ بيتحقق…";
        var p = getPv();
        runTests(data, src, p).then(function (res) {
          if (!data.tests.some(function (t) { return t.live; })) p.run(src);
          paint(res);
          var n = res.filter(function (r) { return r.ok; }).length;
          if (n === res.length) {
            msg.className = "lab-msg ok"; msg.textContent = "✅ ممتاز! كل الاختبارات عدّت (" + n + "/" + n + ")";
            solvedUI(); markDone("labs", id, "معمل اتحل! 🧪", "🧪");
          } else { msg.className = "lab-msg bad"; msg.textContent = "❌ " + n + " من " + res.length + " — بص على العلامات ✗ تحت"; }
        });
      };
      ui.querySelector(".lab-check").addEventListener("click", check);
      ui.querySelector(".lab-run").addEventListener("click", function () { pvBox.hidden = false; getPv().run(ed.value); });
      ui.querySelector(".lab-pg").addEventListener("click", function () { openPlayground({ html: ed.value, from: lab.querySelector("h4").textContent, url: data.url }); });
      var hb = ui.querySelector(".lab-hint");
      if (hb) hb.addEventListener("click", function () { var b = ui.querySelector(".lab-hint-box"); b.innerHTML = "💡 " + data.hint; b.hidden = !b.hidden; highlightAll(b); });
      ui.querySelector(".lab-sol").addEventListener("click", function () {
        var b = ui.querySelector(".lab-sol-box");
        if (b.hidden && !state.labs[id] && !confirm("متأكد إنك عايز تشوف الحل؟ جرّب الأول — التعلم بيحصل وانت بتحاول.")) return;
        if (!b.innerHTML) {
          b.innerHTML = '<div class="sol-head">الحل المرجعي <button type="button" class="mini-btn sol-use">انسخه للمحرر</button></div><pre><code class="language-' + (data.lang || "html") + '"></code></pre>';
          b.querySelector("code").textContent = data.solution; highlightAll(b);
          b.querySelector(".sol-use").addEventListener("click", function () { ed.value = data.solution; state.code[id] = data.solution; saveState(); });
        }
        b.hidden = !b.hidden;
      });
      ui.querySelector(".lab-reset").addEventListener("click", function () { if (!confirm("ترجّع كود البداية؟")) return; ed.value = data.starter; delete state.code[id]; saveState(); });
    });
  }

  /* ---------------- analysis tasks (answers stored as SHA-256) ---------------- */
  function initTasks() {
    $$(".task[data-ex]").forEach(function (t) {
      var id = t.dataset.ex, hashes = (t.dataset.hash || "").split(","), kind = t.dataset.norm || "text";
      var input = t.querySelector(".task-ans input"), btn = t.querySelector(".task-check"), msg = t.querySelector(".task-msg"), ex = t.querySelector(".task-explain");
      var solvedUI = function () { t.classList.add("done"); msg.className = "task-msg ok"; msg.textContent = "✅ صح! اتسجلت."; if (ex) { ex.hidden = false; highlightAll(ex); } };
      if (state.tasks[id]) { solvedUI(); msg.textContent = "✅ تم حلها قبل كده"; }
      t._check = function (v) { var n = WM.normAnswer(v, kind); return n !== null && n !== "" && hashes.indexOf(WM.sha256(id + ":" + n)) >= 0; };
      var check = function () {
        var n = WM.normAnswer(input.value, kind);
        if (n === null || n === "") { msg.className = "task-msg bad"; msg.textContent = kind === "int" ? "اكتب رقم" : "اكتب إجابة"; return; }
        if (t._check(input.value)) { solvedUI(); markDone("tasks", id, "مهمة اتحلت! 🔎", "🔎"); }
        else { msg.className = "task-msg bad"; msg.textContent = "❌ مش هي — ارجع للكود ودوّر تاني"; if (t.animate && !REDUCED) t.animate([{ transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "none" }], { duration: 260 }); }
      };
      if (btn) btn.addEventListener("click", check);
      if (input) input.addEventListener("keydown", function (e) { if (e.key === "Enter") check(); });
      // listings that can be "detonated" in the no-network analysis sandbox
      $$(".code-block[data-detonate]", t).forEach(function (b) {
        var tools = b.querySelector(".code-tools"), out = document.createElement("div");
        out.className = "det-out"; out.hidden = true; b.after(out);
        var bt = document.createElement("button"); bt.type = "button"; bt.className = "run-mini"; bt.textContent = "🧪 شغّل في sandbox التحليل";
        tools.insertBefore(bt, tools.firstChild);
        var pv = null;
        bt.addEventListener("click", function () {
          out.hidden = false;
          if (!pv) {
            out.innerHTML = '<div class="det-head">🧪 <b>Analysis sandbox</b> — مفيش network (CSP: <code>default-src \'none\'</code>)، وكل sink خطير بيتسجّل هنا بدل ما يتنفّذ.</div>';
            pv = new WM.Preview(out, { mode: "analysis", min: 40, max: 260, pageURL: b.dataset.url || undefined });
          }
          pv.run(rawCode(b));
        });
      });
    });
  }

  /* ---------------- XSS Range ---------------- */
  function initXSS() {
    $$(".xss[data-ex]").forEach(function (x) {
      var id = x.dataset.ex, data = JSON.parse(x.querySelector("script.xss-data").textContent), ui = x.querySelector(".xss-ui");
      var server; try { server = new Function("input", data.server); } catch (e) { ui.textContent = "server error: " + e.message; return; }
      x._server = server; x._data = data;
      ui.innerHTML = '<div class="xss-src"><div class="xss-lbl">📄 كود السيرفر (white-box) — بيرجّع الصفحة دي لأي input:</div><pre><code class="language-js"></code></pre></div>' +
        '<div class="xss-in"><label class="xss-lbl" for="' + id + '-in">💉 الـ payload بتاعك (هيتحط مكان <code>input</code>):</label><div class="xss-row"><textarea id="' + id + '-in" dir="ltr" rows="2" spellcheck="false" placeholder="مثال: hello"></textarea><button type="button" class="btn btn-primary btn-sm xss-go">أرسل ▶</button></div></div>' +
        '<div class="xss-resp" hidden><div class="xss-lbl">📥 الـ response اللي رجع من السيرفر (اللي المتصفح هيـ parse ـه):</div><pre class="xss-html"><code class="language-html"></code></pre></div><div class="xss-pv" hidden></div><div class="xss-msg"></div>' +
        '<div class="xss-more">' + (data.hint ? '<button type="button" class="mini-btn xss-hint">💡 تلميح</button>' : "") + '<button type="button" class="mini-btn xss-sol">👁 حل مرجعي</button></div><div class="xss-hint-box" hidden></div><div class="xss-sol-box" hidden></div>';
      ui.querySelector(".xss-src code").textContent = "function server(input) {\n" + data.server.replace(/^/gm, "  ") + "\n}";
      highlightAll(ui);
      var ta = ui.querySelector("textarea"), pvBox = ui.querySelector(".xss-pv"), msg = ui.querySelector(".xss-msg"), pv = null, hit = false;
      var solvedUI = function () { x.classList.add("done"); x.querySelector(".xss-state").textContent = "🏴 اتكسر"; };
      if (state.xss[id]) solvedUI();
      var go = function () {
        var payload = ta.value, html;
        try { html = String(server(payload)); } catch (e) { msg.className = "xss-msg bad"; msg.textContent = "السيرفر رجّع error: " + e.message; return; }
        var resp = ui.querySelector(".xss-resp"); resp.hidden = false;
        var code = resp.querySelector("code"); code.removeAttribute("data-hl"); code.textContent = html; highlightAll(resp);
        pvBox.hidden = false; hit = false;
        if (!pv) pv = new WM.Preview(pvBox, { mode: "xss", min: 60, max: 300, pageURL: data.url || "https://victim.example/search", onEvent: function (t, d) {
          if (t === "alert" && !hit) { hit = true; msg.className = "xss-msg ok"; msg.innerHTML = "🏴 <b>XSS!</b> الـ <code>" + WM.esc(d.kind) + "()</code> اتنفّذ جوه الصفحة — المستوى اتكسر. " + (data.explain ? '<div class="xss-explain">' + data.explain + "</div>" : ""); highlightAll(msg); solvedUI(); markDone("xss", id, "مستوى XSS اتكسر! 🏴", "🏴"); }
        } });
        msg.className = "xss-msg"; msg.textContent = x.dataset.click ? "⏳ الصفحة اتحمّلت — المستوى ده محتاج تفاعل (" + x.dataset.click + ")، اعمله في المعاينة." : "⏳ مستني الـ payload يشتغل…";
        pv.run(html).then(function () { setTimeout(function () { if (!hit && !x.dataset.click) { msg.className = "xss-msg bad"; msg.textContent = "❌ الصفحة اتعرضت بس مفيش alert اتنفّذ. بص على الـ response: الـ input بتاعك وقع فين؟ وإيه اللي اتشال أو اتعمله encode؟"; } }, 900); });
      };
      ui.querySelector(".xss-go").addEventListener("click", go);
      ta.addEventListener("keydown", function (e) { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); go(); } });
      var hb = ui.querySelector(".xss-hint");
      if (hb) hb.addEventListener("click", function () { var b = ui.querySelector(".xss-hint-box"); b.innerHTML = "💡 " + data.hint; b.hidden = !b.hidden; highlightAll(b); });
      ui.querySelector(".xss-sol").addEventListener("click", function () {
        var b = ui.querySelector(".xss-sol-box");
        if (b.hidden && !state.xss[id] && !confirm("هتشوف حل مرجعي؟ حاول الأول — فيه أكتر من payload صح.")) return;
        if (!b.innerHTML) { b.innerHTML = '<div class="sol-head">payload مرجعي (فيه غيره كتير):</div><pre dir="ltr"><code class="language-html"></code></pre>'; b.querySelector("code").textContent = data.solution; highlightAll(b); }
        b.hidden = !b.hidden;
      });
    });
  }

  /* ---------------- projects / cheat ---------------- */
  function initProjects() {
    $$(".project-head").forEach(function (h) {
      var tg = function () { var p = h.parentElement; var o = p.classList.toggle("open"); h.setAttribute("aria-expanded", o ? "true" : "false"); };
      h.addEventListener("click", tg);
      h.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tg(); } });
    });
    $$(".project[data-ex]").forEach(function (p) {
      var id = p.dataset.ex, btn = p.querySelector(".btn-done");
      var sync = function () { var d = !!state.projects[id]; p.classList.toggle("done", d); if (btn) btn.textContent = d ? "✓ المشروع مكتمل (اضغط للتراجع)" : "علّم المشروع كمكتمل"; };
      sync();
      if (btn) btn.addEventListener("click", function () { state.projects[id] = !state.projects[id]; saveState(); sync(); updateProgress(); if (state.projects[id]) toast("مشروع مكتمل! 🛠️", "🏗️"); });
    });
  }
  function initCheat() {
    var input = $("#cheatSearch"), grid = $("#cheatGrid"); if (!input || !grid) return;
    input.addEventListener("input", function () { var q = input.value.trim().toLowerCase(); $$(".cheat-card", grid).forEach(function (c) { c.classList.toggle("hide", q !== "" && c.textContent.toLowerCase().indexOf(q) === -1); }); });
  }

  /* ---------------- scroll ui / reveal / counters ---------------- */
  function initScroll() {
    var bar = $("#scrollBar");
    var on = function () { var d = document.documentElement, max = d.scrollHeight - d.clientHeight; if (bar) bar.style.width = ((max > 0 ? Math.min(1, d.scrollTop / max) : 0) * 100).toFixed(2) + "%"; };
    window.addEventListener("scroll", on, { passive: true }); on();
  }
  function observe(els, cls, th) {
    if (!els.length) return;
    if (!("IntersectionObserver" in window) || REDUCED) { els.forEach(function (e) { e.classList.add(cls); }); return; }
    var o = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add(cls); o.unobserve(x.target); } }); }, { threshold: th || 0.08, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (e) { o.observe(e); });
  }
  function initCounters() {
    var els = $$(".stat b[data-count]");
    var anim = function (el) { var t = Number(el.dataset.count) || 0; if (REDUCED) { el.textContent = t; return; } var s = performance.now(); var tick = function (n) { var p = Math.min(1, (n - s) / 1100); el.textContent = Math.round(t * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); };
    if (!("IntersectionObserver" in window)) { els.forEach(anim); return; }
    var o = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { anim(x.target); o.unobserve(x.target); } }); }, { threshold: 0.6 });
    els.forEach(function (e) { o.observe(e); });
  }
  function initReset() {
    var b = $("#resetProgress"); if (!b) return;
    b.addEventListener("click", function () {
      if (!window.confirm("متأكد؟ هيتم مسح كل إجاباتك والكود المحفوظ.")) return;
      BAGS.forEach(function (k) { state[k] = {}; }); state.pg = null; state.celebrated = false; saveState(); window.location.reload();
    });
  }
  function confetti() {
    if (REDUCED) return;
    var cv = $("#confetti"), ctx = cv && cv.getContext("2d"); if (!ctx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var cols = ["#ff7a45", "#b48cff", "#ffb454", "#4ade80", "#38bdf8", "#ffffff"];
    var ps = Array.from({ length: 160 }, function () { return { x: innerWidth / 2 + (Math.random() - 0.5) * 260, y: innerHeight * 0.28 + Math.random() * 80, vx: (Math.random() - 0.5) * 11, vy: -Math.random() * 12 - 3, s: 5 + Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)], r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3 }; });
    var st = performance.now();
    var draw = function (now) {
      var el = now - st; ctx.clearRect(0, 0, innerWidth, innerHeight);
      ps.forEach(function (p) { p.vy += 0.24; p.vx *= 0.995; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.globalAlpha = Math.max(0, 1 - el / 4200); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); ctx.restore(); });
      if (el < 4200) requestAnimationFrame(draw); else ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    requestAnimationFrame(draw);
  }
  function initShortcuts() {
    var ns = $("#navSearch");
    document.addEventListener("keydown", function (e) {
      var el = document.activeElement, typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (e.key === "/" && !typing && $("#pg").hidden) { e.preventDefault(); if (innerWidth <= 980) { $("#sidebar").classList.add("open"); $("#scrim").classList.add("show"); } if (ns) ns.focus(); }
      if (e.key === "Escape" && el === ns) { ns.value = ""; ns.dispatchEvent(new Event("input")); ns.blur(); }
    });
    var pb = $("#printBtn"); if (pb) pb.addEventListener("click", function () { window.print(); });
  }

  /* ---------------- self-test (index.html?selftest) ---------------- */
  function selftest() {
    var R = { pass: 0, fail: 0, fails: [], log: [] };
    var ok = function (cond, what) { if (cond) R.pass++; else { R.fail++; R.fails.push(what); } };
    var host = document.createElement("div"); host.style.cssText = "position:fixed;left:-9999px;top:0;width:800px;height:600px;overflow:hidden"; document.body.appendChild(host);
    var panel = document.createElement("div"); panel.className = "selftest"; panel.innerHTML = "<b>🧪 Self-test شغال…</b>"; document.body.appendChild(panel);
    var chain = Promise.resolve();
    var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var step = function (label, f) {   // every step is labelled and time-boxed, so one hang cannot stall the whole run
      chain = chain.then(function () {
        panel.firstChild.textContent = "🧪 " + label;
        var done = false;
        return Promise.race([Promise.resolve().then(f).then(function () { done = true; }), sleep(20000).then(function () { if (!done) ok(false, "timeout (20s): " + label); })]);
      });
    };
    $$(".lab[data-ex]").forEach(function (lab) {
      step("lab " + lab.dataset.ex, function () {
        var data = lab._data, pv = new WM.Preview(host, {});
        return runTests(data, data.solution, pv).then(function (res) {
          res.forEach(function (r, i) { ok(r.ok, "lab " + lab.dataset.ex + ": solution fails test #" + (i + 1) + " (" + data.tests[i].label.replace(/<[^>]+>/g, "") + ")" + (r.err ? " — " + r.err : "")); });
          return runTests(data, data.starter, pv);
        }).then(function (res) {
          ok(res.some(function (r) { return !r.ok; }), "lab " + lab.dataset.ex + ": starter already passes every test");
          pv.destroy();
        });
      });
    });
    step("task answers", function () {
      return fetch("tools/.work/selftest.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (J) {
        $$(".task[data-ex]").forEach(function (t) {
          var ans = J.tasks[t.dataset.ex];
          ok(ans && ans.length, "task " + t.dataset.ex + ": no answers in selftest.json");
          (ans || []).forEach(function (a) { ok(t._check(a), "task " + t.dataset.ex + ": answer '" + a + "' does not match its hash (norm mismatch?)"); });
          ok(!t._check("definitely wrong answer 123"), "task " + t.dataset.ex + ": accepts a wrong answer");
          (J.reject[t.dataset.ex] || []).forEach(function (a) { ok(!t._check(a), "task " + t.dataset.ex + ": accepts rejected answer '" + a + "'"); });
        });
      }, function () { ok(false, "could not load tools/.work/selftest.json (serve the folder over http)"); });
    });
    $$(".xss[data-ex]").forEach(function (x) {
      var run = function (payload) {
        return new Promise(function (res) {
          var got = false, pv = new WM.Preview(host, { mode: "xss", onEvent: function (t) { if (t === "alert") got = true; } });
          pv.run(String(x._server(payload))).then(function () {
            return sleep(250).then(function () { return x.dataset.click ? pv.click(x.dataset.click) : null; });
          }).then(function () { return sleep(500); }).then(function () { pv.destroy(); res(got); });
        });
      };
      step(x.dataset.ex + " reference payload", function () { return run(x._data.solution).then(function (g) { ok(g, "xss " + x.dataset.ex + ": reference payload did not fire alert"); }); });
      step(x.dataset.ex + " benign input", function () { return run("hello <b>world</b> 'quote\" & test").then(function (g) { ok(!g, "xss " + x.dataset.ex + ": benign input fires alert"); }); });
      (x._data.blocked || []).forEach(function (p) { step(x.dataset.ex + " blocked " + p, function () { return run(p).then(function (g) { ok(!g, "xss " + x.dataset.ex + ": payload that the filter should stop fired: " + p); }); }); });
    });
    $$(".hx").forEach(function (hx) {
      step("example " + (hx.dataset.file || "?") + " @" + ((hx.closest(".section") || {}).id || "?"), function () {
        var errs = [], pv = new WM.Preview(host, { mode: hx.dataset.mode || "play", cookies: parseCookies(hx.dataset.cookies), onEvent: function (t, d) { if (t === "console" && d.level === "error") errs.push(d.args.join(" ")); } });
        return pv.run(rawCode(hx.querySelector(".code-block"))).then(function () { return sleep(80); }).then(function () {
          ok(hx.hasAttribute("data-errors-ok") || !errs.length, "example " + (hx.dataset.file || "?") + " in " + (hx.closest(".section") || {}).id + ": console error: " + errs.join(" | "));
          pv.destroy();
        });
      });
    });
    step("quiz indices", function () {
      var bad = $$(".quiz[data-ex]").filter(function (q) { var n = $$(".option", q).length, a = Number(q.dataset.answer); return !(a >= 0 && a < n); });
      ok(!bad.length, "quiz answer index out of range: " + bad.map(function (q) { return q.dataset.ex; }).join(","));
    });
    chain.then(function () {
      window.__selftest = R;
      panel.innerHTML = "<b>" + (R.fail ? "✗" : "✓") + " Self-test: " + R.pass + " pass · " + R.fail + " fail</b>" + (R.fails.length ? "<ol>" + R.fails.map(function (f) { return "<li>" + WM.esc(f) + "</li>"; }).join("") + "</ol>" : "");
      panel.classList.add(R.fail ? "bad" : "ok");
      console.log("SELFTEST", JSON.stringify(R));
      host.remove();
    }, function (e) { window.__selftest = { error: String(e && e.stack || e) }; panel.textContent = "selftest crashed: " + e; });
  }

  function boot() {
    initTheme(); initNav(); initActive(); initSearch(); initDrawer();
    highlightAll(document); initCodeBlocks(); initQuizzes(); initExamples(); initPlayground();
    initLabs(); initTasks(); initXSS(); initProjects(); initCheat();
    initScroll(); observe($$(".reveal"), "in"); initCounters(); initReset(); initShortcuts();
    if (WM.initWidgets) WM.initWidgets({ toast: toast, highlightAll: highlightAll, openPlayground: openPlayground });
    updateProgress();
    requestAnimationFrame(function () { $$(".hero .reveal").forEach(function (el) { el.classList.add("in"); }); });
    if (SELFTEST) setTimeout(selftest, 300);
  }
  WM.openPlayground = openPlayground;
  WM.highlightAll = highlightAll;
  WM.toast = toast;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
