/* ============================================================
   Web Mastery — CSS widgets (Part 2)
   selector tester · specificity calculator · box model · flexbox & grid playgrounds
   ============================================================ */
(function () {
  "use strict";
  var WM = window.WM;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = WM.esc;
  var REG = (WM.widgetRegistry = WM.widgetRegistry || {});

  /* ================= specificity (Selectors Level 4) ================= */
  function splitList(s) {        // split a selector list on top-level commas
    var out = [], depth = 0, cur = "", q = null;
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (q) { cur += c; if (c === "\\") { cur += s[++i] || ""; } else if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; cur += c; continue; }
      if (c === "(" || c === "[") depth++;
      if (c === ")" || c === "]") depth--;
      if (c === "," && depth === 0) { out.push(cur.trim()); cur = ""; continue; }
      cur += c;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function maxOf(list) {
    var best = [0, 0, 0];
    splitList(list).forEach(function (s) { var v = spec(s); if (cmp(v, best) > 0) best = v; });
    return best;
  }
  function cmp(x, y) { for (var i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; }
  var LEGACY_PE = /^(before|after|first-line|first-letter)$/i;
  function spec(sel) {
    var a = 0, b = 0, c = 0, i = 0, n = sel.length;
    var ident = function () { var m = /^-?(?:[_a-zA-Z -￿]|\\.)(?:[-\w -￿]|\\.)*/.exec(sel.slice(i)); if (!m) return ""; i += m[0].length; return m[0]; };
    var args = function () {   // at "(" → returns the inside, i after ")"
      var depth = 0, start = i + 1, q = null;
      for (; i < n; i++) {
        var ch = sel[i];
        if (q) { if (ch === "\\") i++; else if (ch === q) q = null; continue; }
        if (ch === '"' || ch === "'") { q = ch; continue; }
        if (ch === "(") depth++;
        else if (ch === ")") { depth--; if (depth === 0) { var inner = sel.slice(start, i); i++; return inner; } }
      }
      return sel.slice(start);
    };
    while (i < n) {
      var ch = sel[i];
      if (/[\s>+~]/.test(ch) || ch === "&") { i++; continue; }
      if (ch === "*") { i++; continue; }
      if (ch === "|") { i++; continue; }
      if (ch === "#") { i++; ident(); a++; continue; }
      if (ch === ".") { i++; ident(); b++; continue; }
      if (ch === "[") {
        var q = null; for (i++; i < n; i++) { var x = sel[i]; if (q) { if (x === "\\") i++; else if (x === q) q = null; } else if (x === '"' || x === "'") q = x; else if (x === "]") { i++; break; } }
        b++; continue;
      }
      if (ch === ":") {
        if (sel[i + 1] === ":") {        // pseudo-element
          i += 2; var pe = ident(); c++;
          if (sel[i] === "(") { var pa = args(); if (/^slotted$/i.test(pe)) { var s1 = maxOf(pa); a += s1[0]; b += s1[1]; c += s1[2]; } }
          continue;
        }
        i++; var pc = ident();
        if (LEGACY_PE.test(pc)) { c++; continue; }
        if (sel[i] === "(") {
          var inner = args(), name = pc.toLowerCase(), s2;
          if (name === "where") continue;
          if (name === "is" || name === "not" || name === "has" || name === "matches" || name === "-webkit-any") { s2 = maxOf(inner); a += s2[0]; b += s2[1]; c += s2[2]; continue; }
          if (name === "nth-child" || name === "nth-last-child") {
            b++;
            var m = /\bof\s+([\s\S]+)$/i.exec(inner);
            if (m) { s2 = maxOf(m[1]); a += s2[0]; b += s2[1]; c += s2[2]; }
            continue;
          }
          b++; continue;
        }
        b++; continue;
      }
      var t = ident();
      if (t) { c++; continue; }
      i++;   // anything else (stray char)
    }
    return [a, b, c];
  }
  WM.specificity = function (selector) { return maxOf(selector); };
  WM.specificityOf = spec;
  WM.specCmp = cmp;

  REG.specificity = function (box) {
    var DEF = box.dataset.input || "#login .btn\nform button.btn:hover\nbutton[type=\"submit\"]\n.card > p:first-child\n:is(#main, .sidebar) a\n:where(#main) a\nul li::before\ninput:not([disabled]):focus";
    box.innerHTML =
      '<div class="w-head"><span class="w-ico">⚖️</span><div><b>Specificity Calculator</b><small>selector واحد في كل سطر — الأداة بتحسب الوزن (A, B, C) وبتقولك مين بيكسب لو كلهم على نفس العنصر.</small></div></div>' +
      '<textarea class="t-in sp-in" dir="ltr" rows="6" spellcheck="false"></textarea><div class="sp-out"></div>' +
      '<div class="sp-legend small"><span class="sp-a">A = ids</span> · <span class="sp-b">B = classes، attributes، pseudo-classes</span> · <span class="sp-c">C = types، pseudo-elements</span> · <code>*</code> و<code>:where()</code> = 0 · <code>:is()/:not()/:has()</code> = أقوى واحد جواهم</div>';
    var inp = $(".sp-in", box), out = $(".sp-out", box);
    inp.value = DEF;
    function upd() {
      var rows = inp.value.split("\n").map(function (l) { return l.trim(); }).filter(Boolean).map(function (s, idx) {
        var valid = true; try { document.createDocumentFragment().querySelector(s); } catch (e) { valid = false; }
        return { s: s, v: valid ? maxOf(s) : null, idx: idx };
      });
      var ok = rows.filter(function (r) { return r.v; });
      var best = ok.slice().sort(function (x, y) { return cmp(y.v, x.v) || y.idx - x.idx; })[0];
      out.innerHTML = '<table class="ref sp-table"><thead><tr><th>Selector</th><th>A</th><th>B</th><th>C</th><th></th></tr></thead><tbody>' + rows.map(function (r) {
        if (!r.v) return '<tr class="bad"><td dir="ltr"><code>' + esc(r.s) + '</code></td><td colspan="4" class="t-no">selector مش صالح</td></tr>';
        var win = best && r === best;
        return "<tr" + (win ? ' class="win"' : "") + '><td dir="ltr"><code>' + esc(r.s) + '</code></td><td class="sp-a">' + r.v[0] + '</td><td class="sp-b">' + r.v[1] + '</td><td class="sp-c">' + r.v[2] + "</td><td>" + (win ? "🏆 بيكسب" : "") + "</td></tr>";
      }).join("") + "</tbody></table>" + (best ? '<div class="small muted">لو اتعادلوا في الوزن، اللي <b>مكتوب أخيرًا</b> هو اللي بيكسب (ترتيب الظهور).</div>' : "");
    }
    inp.addEventListener("input", upd); upd();
  };

  /* ================= selector tester ================= */
  var SAMPLE = [
    '<header class="top">',
    '  <nav><a href="/">Home</a> <a href="https://docs.example/" class="ext">Docs</a> <a href="/files/report.pdf">Report</a></nav>',
    '</header>',
    '<main id="main">',
    '  <h2>Login</h2>',
    '  <form action="/session" method="post">',
    '    <input type="hidden" name="csrf" value="a7f3c9">',
    '    <input name="user" required>',
    '    <input name="pass" type="password" required>',
    '    <input name="otp" disabled>',
    '    <button class="btn primary">Sign in</button>',
    '  </form>',
    '  <ul class="findings">',
    '    <li class="high">XSS</li><li>CSRF</li><li class="high">IDOR</li><li>Info leak</li>',
    '  </ul>',
    '  <p>First paragraph</p>',
    '  <p data-role="admin">Admin note</p>',
    '</main>'
  ].join("\n");
  REG.selector = function (box) {
    var PRE = ['input[type="hidden"]', 'a[href^="http"]', 'a[href$=".pdf"]', '[class~="primary"]', 'li:nth-child(odd)', 'li.high + li', 'h2 ~ p', 'form :is(input, button):not([disabled])', 'input[name="csrf"][value^="a"]', 'main:has(> form)', 'p:not([data-role])', '[data-role="admin" i]'];
    box.innerHTML =
      '<div class="w-head"><span class="w-ico">🎯</span><div><b>Selector Tester</b><small>اكتب selector وشوف هو بيختار أنهي عناصر بالظبط — بنفس محرك المتصفح (<code>querySelectorAll</code>).</small></div></div>' +
      '<div class="u-presets">' + PRE.map(function (p, i) { return '<button type="button" class="chip-btn" data-i="' + i + '" dir="ltr">' + esc(p) + "</button>"; }).join("") + "</div>" +
      '<label class="w-field"><span>الـ selector</span><input class="sel-in" dir="ltr" spellcheck="false"></label>' +
      '<div class="sel-info"></div>' +
      '<div class="p-grid"><div><div class="t-lbl">🌳 العناصر اللي اتختارت (◀)</div><div class="p-tree sel-tree"></div></div>' +
      '<div><div class="t-lbl">الـ HTML (تقدر تعدّله)</div><textarea class="t-in sel-html" dir="ltr" rows="16" spellcheck="false"></textarea></div></div>';
    var inp = $(".sel-in", box), html = $(".sel-html", box);
    inp.value = box.dataset.input || PRE[0];
    html.value = SAMPLE;
    function upd() {
      var doc = WM.parseHTML("<body>" + html.value), sel = inp.value.trim(), info = $(".sel-info", box), hits = [];
      if (sel) {
        try { hits = Array.prototype.slice.call(doc.body.querySelectorAll(sel)); }
        catch (e) { info.innerHTML = '<div class="w-err">❌ selector مش صالح: ' + esc(e.message.split(":").pop().trim()) + "</div>"; $(".sel-tree", box).innerHTML = ""; return; }
      }
      hits.forEach(function (h) { h.setAttribute("data-wm-hit", ""); });
      var v = sel ? maxOf(sel) : [0, 0, 0];
      info.innerHTML = '<div class="u-note ' + (hits.length ? "info" : "warn") + '"><b>' + hits.length + "</b> عنصر اتختار · الـ specificity: <code dir=\"ltr\">(" + v.join(", ") + ")</code></div>";
      $(".sel-tree", box).innerHTML = WM.renderTree({ t: 11, c: WM.serialize(doc.body).c }, { hideWS: true });
    }
    $$(".u-presets button", box).forEach(function (b) { b.addEventListener("click", function () { inp.value = PRE[+b.dataset.i]; upd(); }); });
    inp.addEventListener("input", upd); html.addEventListener("input", WM.debounce(upd, 200));
    upd();
  };

  /* ================= box model ================= */
  REG.box = function (box) {
    box.innerHTML =
      '<div class="w-head"><span class="w-ico">📦</span><div><b>Box Model</b><small>غيّر القيم وشوف المساحة اللي العنصر بياخدها فعلًا — زي اللي في DevTools.</small></div></div>' +
      '<div class="bx-ctl">' +
      ["width:240:0:400", "padding:20:0:60", "border:6:0:30", "margin:24:0:60"].map(function (d) { var p = d.split(":"); return '<label><span>' + p[0] + ' <b class="bx-v" data-k="' + p[0] + '">' + p[1] + 'px</b></span><input type="range" data-k="' + p[0] + '" min="' + p[2] + '" max="' + p[3] + '" value="' + p[1] + '"></label>'; }).join("") +
      '<label><span>box-sizing</span><select class="bx-sizing" dir="ltr"><option>content-box</option><option>border-box</option></select></label></div>' +
      '<div class="bx-stage" dir="ltr"><div class="bx-m"><i>margin</i><div class="bx-b"><i>border</i><div class="bx-p"><i>padding</i><div class="bx-c"><span class="bx-cw"></span></div></div></div></div></div>' +
      '<div class="bx-sum"></div>';
    function upd() {
      var v = {}; $$("input[type=range]", box).forEach(function (r) { v[r.dataset.k] = +r.value; $('.bx-v[data-k="' + r.dataset.k + '"]', box).textContent = r.value + "px"; });
      var sizing = $(".bx-sizing", box).value;
      var content = sizing === "border-box" ? Math.max(0, v.width - 2 * v.padding - 2 * v.border) : v.width;
      var outer = content + 2 * v.padding + 2 * v.border;
      $(".bx-m", box).style.padding = Math.max(14, v.margin / 2) + "px";
      $(".bx-b", box).style.padding = Math.max(14, v.border) + "px";
      $(".bx-p", box).style.padding = Math.max(14, v.padding / 1.5) + "px";
      $(".bx-cw", box).textContent = content + " × auto";
      $(".bx-sum", box).innerHTML = '<div class="u-note info" dir="rtl">' +
        (sizing === "content-box"
          ? "<b>content-box</b> (الافتراضي): الـ <code>width</code> = المحتوى بس ⇒ العرض الظاهر = " + v.width + " + 2×" + v.padding + " + 2×" + v.border + " = <b>" + outer + "px</b>"
          : "<b>border-box</b>: الـ <code>width</code> شامل الـ padding والـ border ⇒ العرض الظاهر = <b>" + outer + "px</b> بالظبط، والمحتوى اتقلّص لـ " + content + "px") +
        " · والمساحة الكلية بالـ margin = <b>" + (outer + 2 * v.margin) + "px</b></div>";
    }
    $$("input, select", box).forEach(function (e) { e.addEventListener("input", upd); });
    upd();
  };

  /* ================= flexbox playground ================= */
  var FLEX_OPTS = {
    "flex-direction": ["row", "row-reverse", "column", "column-reverse"],
    "flex-wrap": ["nowrap", "wrap", "wrap-reverse"],
    "justify-content": ["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"],
    "align-items": ["stretch", "flex-start", "center", "flex-end", "baseline"],
    "align-content": ["normal", "flex-start", "center", "space-between", "stretch"],
    "gap": ["0", "8px", "16px", "24px"]
  };
  var sel = function (k, opts, val) { return '<label><span dir="ltr">' + k + '</span><select data-k="' + k + '" dir="ltr">' + opts.map(function (o) { return "<option" + (o === val ? " selected" : "") + ">" + o + "</option>"; }).join("") + "</select></label>"; };
  REG.flex = function (box) {
    box.innerHTML =
      '<div class="w-head"><span class="w-ico">↔️</span><div><b>Flexbox Playground</b><small>غيّر خصائص الـ container والعنصر رقم 2 وشوف النتيجة والكود.</small></div></div>' +
      '<div class="fx-ctl">' + Object.keys(FLEX_OPTS).map(function (k) { return sel(k, FLEX_OPTS[k], k === "gap" ? "8px" : FLEX_OPTS[k][0]); }).join("") +
      '<label><span>عدد العناصر</span><input type="number" class="fx-n" min="1" max="10" value="4"></label></div>' +
      '<div class="fx-ctl fx-item"><b class="small">العنصر 2:</b>' + sel("flex-grow", ["0", "1", "2", "3"], "0") + sel("flex-basis", ["auto", "0", "120px", "50%"], "auto") + sel("order", ["0", "-1", "1", "5"], "0") + sel("align-self", ["auto", "flex-start", "center", "flex-end", "stretch"], "auto") + "</div>" +
      '<div class="fx-stage" dir="ltr"></div><pre class="p-ser fx-code" dir="ltr"><code></code></pre>';
    function upd() {
      var c = {}, it = {};
      $$(".fx-ctl:not(.fx-item) select", box).forEach(function (s) { c[s.dataset.k] = s.value; });
      $$(".fx-item select", box).forEach(function (s) { it[s.dataset.k] = s.value; });
      var n = Math.max(1, Math.min(10, +$(".fx-n", box).value || 4));
      var st = $(".fx-stage", box);
      st.style.cssText = "display:flex;" + Object.keys(c).map(function (k) { return k + ":" + c[k]; }).join(";");
      st.innerHTML = "";
      for (var i = 1; i <= n; i++) {
        var d = document.createElement("div"); d.className = "fx-it" + (i === 2 ? " fx-two" : ""); d.textContent = i;
        d.style.fontSize = (12 + (i % 3) * 4) + "px";
        if (i === 2) Object.keys(it).forEach(function (k) { d.style.setProperty(k, it[k]); });
        st.appendChild(d);
      }
      var code = ".container {\n  display: flex;\n" + Object.keys(c).map(function (k) { return "  " + k + ": " + c[k] + ";"; }).join("\n") + "\n}\n.item-2 {\n" + Object.keys(it).map(function (k) { return "  " + k + ": " + it[k] + ";"; }).join("\n") + "\n}";
      $(".fx-code code", box).innerHTML = WM.highlight(code, "css");
    }
    $$("select, input", box).forEach(function (e) { e.addEventListener("input", upd); });
    upd();
  };

  /* ================= grid playground ================= */
  var GRID_PRE = [
    ["3 أعمدة متساوية", "repeat(3, 1fr)", "auto", "", 6],
    ["sidebar + محتوى", "200px 1fr", "auto", "", 4],
    ["auto-fit responsive", "repeat(auto-fit, minmax(110px, 1fr))", "auto", "", 7],
    ["Holy grail (areas)", "160px 1fr", "auto 1fr auto", '"head head" "side main" "foot foot"', 4]
  ];
  REG.grid = function (box) {
    box.innerHTML =
      '<div class="w-head"><span class="w-ico">▦</span><div><b>Grid Playground</b><small>اكتب الـ templates بنفسك أو اختار preset، واتحكم في العنصر رقم 1.</small></div></div>' +
      '<div class="u-presets">' + GRID_PRE.map(function (p, i) { return '<button type="button" class="chip-btn" data-i="' + i + '">' + esc(p[0]) + "</button>"; }).join("") + "</div>" +
      '<div class="fx-ctl"><label class="gr-wide"><span dir="ltr">grid-template-columns</span><input class="gr-cols" dir="ltr"></label><label class="gr-wide"><span dir="ltr">grid-template-rows</span><input class="gr-rows" dir="ltr"></label>' +
      '<label class="gr-wide"><span dir="ltr">grid-template-areas</span><input class="gr-areas" dir="ltr" placeholder="(اختياري)"></label>' +
      sel("gap", ["0", "8px", "12px", "20px"], "8px") + sel("justify-items", ["stretch", "start", "center", "end"], "stretch") + sel("align-items", ["stretch", "start", "center", "end"], "stretch") + sel("grid-auto-flow", ["row", "column", "row dense"], "row") +
      '<label><span>عدد العناصر</span><input type="number" class="gr-n" min="1" max="12" value="6"></label></div>' +
      '<div class="fx-ctl fx-item"><b class="small">العنصر 1:</b>' + sel("grid-column", ["auto", "span 2", "1 / -1", "2 / 4"], "auto") + sel("grid-row", ["auto", "span 2"], "auto") + "</div>" +
      '<div class="gr-stage" dir="ltr"></div><pre class="p-ser fx-code" dir="ltr"><code></code></pre>';
    var cols = $(".gr-cols", box), rows = $(".gr-rows", box), areas = $(".gr-areas", box), nIn = $(".gr-n", box);
    function apply(i) { var p = GRID_PRE[i]; cols.value = p[1]; rows.value = p[2]; areas.value = p[3]; nIn.value = p[4]; upd(); }
    function upd() {
      var c = {}; $$(".fx-ctl:not(.fx-item) select", box).forEach(function (s) { c[s.dataset.k] = s.value; });
      var it = {}; $$(".fx-item select", box).forEach(function (s) { it[s.dataset.k] = s.value; });
      var st = $(".gr-stage", box), n = Math.max(1, Math.min(12, +nIn.value || 6));
      st.style.cssText = "display:grid;grid-template-columns:" + cols.value + ";grid-template-rows:" + rows.value + ";" + (areas.value.trim() ? "grid-template-areas:" + areas.value + ";" : "") + Object.keys(c).map(function (k) { return k + ":" + c[k]; }).join(";");
      st.innerHTML = "";
      var names = (areas.value.match(/[a-z][\w-]*/gi) || []).filter(function (v, i2, arr) { return arr.indexOf(v) === i2; });
      for (var i = 1; i <= n; i++) {
        var d = document.createElement("div"); d.className = "fx-it" + (i === 1 ? " fx-two" : "");
        if (names.length && names[i - 1]) { d.style.gridArea = names[i - 1]; d.textContent = names[i - 1]; } else d.textContent = i;
        if (i === 1 && !names.length) Object.keys(it).forEach(function (k) { if (it[k] !== "auto") d.style.setProperty(k, it[k]); });
        st.appendChild(d);
      }
      var code = ".grid {\n  display: grid;\n  grid-template-columns: " + cols.value + ";\n  grid-template-rows: " + rows.value + ";\n" + (areas.value.trim() ? "  grid-template-areas: " + areas.value + ";\n" : "") + Object.keys(c).map(function (k) { return "  " + k + ": " + c[k] + ";"; }).join("\n") + "\n}" +
        (names.length ? "\n" + names.map(function (nm) { return "." + nm + " { grid-area: " + nm + "; }"; }).join("\n") : "\n.item-1 {\n" + Object.keys(it).map(function (k) { return "  " + k + ": " + it[k] + ";"; }).join("\n") + "\n}");
      $(".fx-code code", box).innerHTML = WM.highlight(code, "css");
    }
    $$(".u-presets button", box).forEach(function (b) { b.addEventListener("click", function () { apply(+b.dataset.i); }); });
    $$("select, input", box).forEach(function (e) { e.addEventListener("input", upd); });
    apply(0);
  };

  /* ================= contrast checker (WCAG 2.x) ================= */
  var probe = null;
  function toRGB(v) {
    if (!probe) { probe = document.createElement("i"); probe.hidden = true; document.body.appendChild(probe); }
    probe.style.color = "";
    probe.style.color = String(v || "").trim();
    if (!probe.style.color) return null;
    var m = getComputedStyle(probe).color.match(/[\d.]+/g);
    return m ? m.slice(0, 3).map(Number) : null;
  }
  function lum(rgb) {
    var W = [0.2126, 0.7152, 0.0722];
    return rgb.reduce(function (s, c, i) { c /= 255; return s + W[i] * (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)); }, 0);
  }
  WM.contrastRatio = function (a, b) {
    var x = toRGB(a), y = toRGB(b);
    if (!x || !y) return NaN;
    var l1 = lum(x), l2 = lum(y);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  function hex(rgb) { return "#" + rgb.map(function (c) { return ("0" + Math.round(c).toString(16)).slice(-2); }).join(""); }
  REG.contrast = function (box) {
    var PRE = [["#767676", "#ffffff"], ["#999999", "#ffffff"], ["#ffffff", "#2563eb"], ["#ffffff", "#3b82f6"], ["#64748b", "#ffffff"], ["#ff7a45", "#0b1322"], ["#ffffff", "#dc2626"]];
    function field(k, lbl) { return '<label class="w-field ct-f"><span>' + lbl + '</span><span class="ct-row"><input type="color" class="ct-pick" data-k="' + k + '"><input class="ct-in" data-k="' + k + '" dir="ltr" spellcheck="false"></span></label>'; }
    box.innerHTML =
      '<div class="w-head"><span class="w-ico">🌗</span><div><b>Contrast Checker (WCAG 2)</b><small>اكتب أي لون CSS (hex، rgb، hsl، اسم) أو اختار من الـ presets. الألوان المعتمة بس (من غير شفافية).</small></div></div>' +
      '<div class="u-presets">' + PRE.map(function (p, i) { return '<button type="button" class="chip-btn" data-i="' + i + '" dir="ltr">' + p[0] + " / " + p[1] + "</button>"; }).join("") + "</div>" +
      '<div class="ct-ctl">' + field("fg", "لون النص") + field("bg", "لون الخلفية") + "</div>" +
      '<div class="ct-demo" dir="ltr"><p class="ct-big">Large text 24px</p><p>Normal body text, 16px — the quick brown fox.</p><span class="ct-btn">Button</span></div>' +
      '<div class="ct-out"></div>';
    var ins = {}; $$(".ct-in", box).forEach(function (e) { ins[e.dataset.k] = e; });
    var picks = {}; $$(".ct-pick", box).forEach(function (e) { picks[e.dataset.k] = e; });
    function badge(ok, lbl, need) { return '<span class="ct-b ' + (ok ? "ok" : "no") + '">' + (ok ? "✓" : "✗") + " " + lbl + " <small>≥ " + need + "</small></span>"; }
    function upd() {
      var fg = toRGB(ins.fg.value), bg = toRGB(ins.bg.value), out = $(".ct-out", box);
      if (!fg || !bg) { out.innerHTML = '<div class="w-err">❌ لون مش صالح</div>'; return; }
      picks.fg.value = hex(fg); picks.bg.value = hex(bg);
      var demo = $(".ct-demo", box); demo.style.color = hex(fg); demo.style.background = hex(bg);
      $(".ct-btn", demo).style.borderColor = hex(fg);
      var r = WM.contrastRatio(ins.fg.value, ins.bg.value);
      out.innerHTML = '<div class="ct-ratio" dir="ltr"><b>' + r.toFixed(2) + "</b>:1</div>" +
        '<div class="ct-badges">' + badge(r >= 4.5, "AA نص عادي", "4.5") + badge(r >= 3, "AA نص كبير / UI", "3") + badge(r >= 7, "AAA نص عادي", "7") + badge(r >= 4.5, "AAA نص كبير", "4.5") + "</div>";
    }
    function set(f, b) { ins.fg.value = f; ins.bg.value = b; upd(); }
    $$(".u-presets button", box).forEach(function (b) { b.addEventListener("click", function () { var p = PRE[+b.dataset.i]; set(p[0], p[1]); }); });
    $$(".ct-in", box).forEach(function (e) { e.addEventListener("input", WM.debounce(upd, 150)); });
    $$(".ct-pick", box).forEach(function (e) { e.addEventListener("input", function () { ins[e.dataset.k].value = e.value; upd(); }); });
    set(box.dataset.fg || PRE[0][0], box.dataset.bg || PRE[0][1]);
  };
})();
