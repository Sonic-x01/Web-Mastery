/* ============================================================
   Web Mastery — interactive widgets
   scene stepper · URL inspector · encoder/decoder chain ·
   HTML tokenizer stepper (WHATWG states) · parser playground
   ============================================================ */
(function () {
  "use strict";
  var WM = window.WM;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = WM.esc;
  var API = {};
  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ================= scene stepper ================= */
  function parseSet(s) {
    var out = new Set();
    String(s || "").split(",").forEach(function (p) {
      var m = /^\s*(\d+)\s*(?:-\s*(\d+))?\s*$/.exec(p);
      if (!m) return;
      var a = +m[1], b = m[2] ? +m[2] : a;
      for (var i = a; i <= b; i++) out.add(i);
    });
    return out;
  }
  function initScenes() {
    $$(".scene").forEach(function (sc) {
      var steps = $$(".sc-step", sc).map(function (s) { return s.innerHTML; });
      var n = steps.length, k = 0, timer = null;
      var cap = $(".sc-cap", sc), dots = $(".sc-dots", sc), play = $(".sc-play", sc);
      var act = $$("[data-s]", sc).map(function (el) { return [el, parseSet(el.getAttribute("data-s"))]; });
      var from = $$("[data-from]", sc).map(function (el) { return [el, +el.getAttribute("data-from"), el.hasAttribute("data-to") ? +el.getAttribute("data-to") : 1e9]; });
      dots.innerHTML = steps.map(function (_, i) { return '<button type="button" aria-label="خطوة ' + (i + 1) + '"></button>'; }).join("");
      var show = function (i) {
        k = Math.max(0, Math.min(n - 1, i));
        var s = k + 1;
        act.forEach(function (p) { p[0].classList.toggle("on", p[1].has(s)); p[0].classList.toggle("off", !p[1].has(s)); });
        from.forEach(function (p) { p[0].classList.toggle("shown", s >= p[1] && s <= p[2]); });
        cap.innerHTML = '<span class="sc-num">' + s + " / " + n + "</span>" + steps[k];
        if (API.highlightAll) API.highlightAll(cap);
        $$("button", dots).forEach(function (b, j) { b.classList.toggle("on", j === k); b.classList.toggle("past", j < k); });
        sc.classList.toggle("sc-end", k === n - 1);
      };
      var stop = function () { clearInterval(timer); timer = null; play.textContent = "▶"; play.classList.remove("on"); };
      $(".sc-prev", sc).addEventListener("click", function () { stop(); show(k - 1); });
      $(".sc-next", sc).addEventListener("click", function () { stop(); show(k + 1); });
      $$("button", dots).forEach(function (b, j) { b.addEventListener("click", function () { stop(); show(j); }); });
      play.addEventListener("click", function () {
        if (timer) { stop(); return; }
        if (k === n - 1) show(0);
        play.textContent = "❚❚"; play.classList.add("on");
        timer = setInterval(function () { if (k >= n - 1) { stop(); return; } show(k + 1); }, 3400);
      });
      sc.setAttribute("tabindex", "0");
      sc.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") { e.preventDefault(); stop(); show(k + 1); }
        if (e.key === "ArrowRight") { e.preventDefault(); stop(); show(k - 1); }
      });
      show(0);
    });
  }

  /* ================= URL inspector ================= */
  function urlWidget(box) {
    var def = box.dataset.url || "https://admin:s3cret@shop.example:8443/app/../account/orders.php?id=42&sort=desc#invoice";
    box.innerHTML =
      '<div class="w-head"><span class="w-ico">🔗</span><div><b>URL Inspector</b><small>اكتب أي URL وشوف المتصفح بيفهمه إزاي — بالظبط بالـ URL parser بتاعه</small></div></div>' +
      '<div class="w-grid2"><label class="w-field"><span>الـ URL (absolute أو relative)</span><input class="u-in" dir="ltr" spellcheck="false"></label>' +
      '<label class="w-field"><span>الـ base (عنوان الصفحة الحالية — لو الـ URL relative)</span><input class="u-base" dir="ltr" spellcheck="false" value="https://shop.example/products/shoes/index.html"></label></div>' +
      '<div class="u-presets"></div><div class="u-bar" dir="ltr"></div><div class="u-table"></div><div class="u-notes"></div>' +
      '<label class="w-field"><span>قارن الـ origin مع URL تاني (Same-Origin Policy)</span><input class="u-cmp" dir="ltr" spellcheck="false" value="https://shop.example/login"></label><div class="u-origin"></div>';
    var inp = $(".u-in", box), base = $(".u-base", box), cmp = $(".u-cmp", box);
    inp.value = def;
    var presets = [
      ["كامل", def], ["relative ../", "../../cart/checkout.html?step=2"], ["/ من الـ root", "/login?next=/admin"], ["// protocol-relative", "//evil.example/steal.js"],
      ["@ trick", "https://shop.example@evil.example/login"], ["backslash", "https:\\\\evil.example\\path"], ["IP عشري", "http://2130706433/"], ["javascript:", "javascript:alert(document.domain)"],
      ["fragment بس", "#reviews"], ["query بس", "?page=3"], ["مسافات وعربي", "https://shop.example/بحث?q=hello world&x=1"], ["punycode", "https://аpple.example/"]
    ];
    $(".u-presets", box).innerHTML = presets.map(function (p, i) { return '<button type="button" class="chip-btn" data-i="' + i + '">' + esc(p[0]) + "</button>"; }).join("");
    $$(".u-presets button", box).forEach(function (b) { b.addEventListener("click", function () { inp.value = presets[+b.dataset.i][1]; upd(); }); });
    function upd() {
      var raw = inp.value, U = null, err = "";
      try { U = base.value.trim() ? new URL(raw, base.value.trim()) : new URL(raw); } catch (e) { err = e.message; }
      var bar = $(".u-bar", box), tbl = $(".u-table", box), notes = $(".u-notes", box);
      if (!U) { bar.innerHTML = ""; tbl.innerHTML = '<div class="w-err">❌ URL مش صالح: ' + esc(err) + "</div>"; notes.innerHTML = ""; $(".u-origin", box).innerHTML = ""; return; }
      var special = /^(https?|ftp|wss?|file):$/.test(U.protocol);
      var seg = [["scheme", U.protocol + (special ? "//" : "")]];
      if (U.username || U.password) seg.push(["user", U.username + (U.password ? ":" + U.password : "") + "@"]);
      if (U.hostname) seg.push(["host", U.hostname]);
      if (U.port) seg.push(["port", ":" + U.port]);
      seg.push(["path", U.pathname]);
      if (U.search) seg.push(["query", U.search]);
      if (U.hash) seg.push(["frag", U.hash]);
      bar.innerHTML = seg.map(function (s) { return '<span class="us us-' + s[0] + '"><b>' + esc(s[1]) + "</b><i>" + s[0] + "</i></span>"; }).join("");
      var rows = [["href (النتيجة النهائية)", U.href], ["protocol", U.protocol], ["username", U.username], ["password", U.password], ["hostname", U.hostname], ["port", U.port || (special ? "(الافتراضي: " + ({ "http:": 80, "https:": 443, "ftp:": 21, "ws:": 80, "wss:": 443 }[U.protocol] || "—") + ")" : "")], ["pathname", U.pathname], ["search", U.search], ["hash", U.hash], ["origin", U.origin]];
      var params = []; U.searchParams.forEach(function (v, k) { params.push([k, v]); });
      tbl.innerHTML = '<table class="ref u-ref"><tbody>' + rows.map(function (r) { return "<tr><td>" + esc(r[0]) + '</td><td dir="ltr"><code>' + (r[1] === "" ? '<span class="muted">""</span>' : esc(r[1])) + "</code></td></tr>"; }).join("") +
        (params.length ? '<tr><td>searchParams (بعد الـ decode)</td><td dir="ltr">' + params.map(function (p) { return "<code>" + esc(p[0]) + "</code> = <code>" + esc(p[1]) + "</code>"; }).join("<br>") + "</td></tr>" : "") + "</tbody></table>";
      var N = [];
      var absolute = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw.trim());
      if (!absolute) {
        if (/^\s*[\/\\]{2}/.test(raw)) N.push(["warn", "بيبدأ بـ <code>//</code>: ده <b>protocol-relative URL</b> — بياخد الـ scheme من الصفحة بس، و<b>الـ host بيتغيّر لـ</b> <code>" + esc(U.host) + "</code>. ده ثغرة open-redirect كلاسيك لو السيرفر بيتشيك إن الـ URL «بيبدأ بـ /»."]);
        else if (/^\s*\//.test(raw)) N.push(["info", "بيبدأ بـ <code>/</code>: path من الـ root بتاع نفس الـ host."]);
        else if (/^\s*\?/.test(raw)) N.push(["info", "query بس: نفس الـ path، والـ query القديمة اتشالت واتحط مكانها الجديدة."]);
        else if (/^\s*#/.test(raw)) N.push(["info", "fragment بس: نفس الصفحة بالظبط، والـ fragment <b>مبيتبعتش للسيرفر خالص</b>."]);
        else N.push(["info", "relative path: اتحسب من الـ <b>directory</b> بتاع الـ base (آخر <code>/</code>)، و<code>../</code> بتطلع directory لفوق."]);
      }
      if (U.username || U.password) N.push(["danger", "فيه <b>userinfo</b> قبل الـ <code>@</code>: الـ host الحقيقي هو <code>" + esc(U.hostname) + "</code> مش اللي قبل الـ @. حيلة phishing/open-redirect مشهورة: <code>https://bank.example@evil.example</code>."]);
      if (/\\/.test(raw) && special) N.push(["warn", "الـ <code>\\</code> في URL «special» (http/https…) المتصفح بيعاملها زي <code>/</code>. لو الـ backend مبيعملش كده → <b>parser differential</b> بيتستغل في bypass للـ validation."]);
      if (/^(javascript|data|vbscript):$/.test(U.protocol)) N.push(["danger", "الـ scheme ده <code>" + esc(U.protocol) + "</code>: لو اتحط في <code>href</code> أو <code>src</code> ممكن يشغّل كود. أي input بيتحط في URL لازم يتعمله allow-list للـ schemes (<code>https:</code> و<code>mailto:</code>…)."]);
      if (/^\d+$/.test(raw.replace(/^[a-z]+:\/\//i, "").split(/[\/:?#]/)[0]) || (/^\d{1,3}(\.\d{1,3}){3}$/.test(U.hostname) && !/\d{1,3}(\.\d{1,3}){3}/.test(raw))) N.push(["warn", "الـ host اتكتب كرقم واتحوّل لـ IPv4: <code>" + esc(U.hostname) + "</code>. فلاتر بتمنع <code>127.0.0.1</code> كنص بتتعدّى بـ <code>2130706433</code> أو <code>0x7f.1</code> (مهم في SSRF)."]);
      if (/xn--/.test(U.hostname)) N.push(["warn", "الـ host فيه حروف مش ASCII فاتحوّل لـ <b>punycode</b>: <code>" + esc(U.hostname) + "</code>. ده أساس هجمات الـ <b>IDN homograph</b> (حرف «а» السيريلي شبه «a»)."]);
      if (/(^|\/)\.\.?(\/|$)/.test(raw)) N.push(["info", "الـ dot-segments (<code>./</code> و<code>../</code>) اتحلّت والـ path النهائي <code>" + esc(U.pathname) + "</code>."]);
      if (/%[0-9a-f]{2}/i.test(U.pathname + U.search) && !/%[0-9a-f]{2}/i.test(raw)) N.push(["info", "الـ parser عمل <b>percent-encoding</b> للحروف اللي مينفعش تتبعت زي ما هي (مسافات، عربي…)."]);
      if (special && U.port === "" && /:(80|443)(?=[\/?#]|$)/.test(raw)) N.push(["info", "البورت الافتراضي اتشال من الـ URL النهائي (80 لـ http، 443 لـ https)."]);
      notes.innerHTML = N.map(function (x) { return '<div class="u-note ' + x[0] + '">' + x[1] + "</div>"; }).join("");
      var C = null; try { C = new URL(cmp.value.trim(), base.value.trim() || undefined); } catch (e) {}
      var o = $(".u-origin", box);
      if (!C) { o.innerHTML = '<div class="w-err">URL المقارنة مش صالح</div>'; return; }
      var same = U.origin === C.origin && U.origin !== "null";
      var why = [];
      if (U.protocol !== C.protocol) why.push("الـ scheme مختلف (" + esc(U.protocol) + " ≠ " + esc(C.protocol) + ")");
      if (U.hostname !== C.hostname) why.push("الـ host مختلف (" + esc(U.hostname) + " ≠ " + esc(C.hostname) + ")");
      if ((U.port || "d") !== (C.port || "d")) why.push("الـ port مختلف");
      if (U.origin === "null") why.push("الـ origin بتاع الـ scheme ده <b>opaque</b> (<code>null</code>) — مبيساويش أي حاجة حتى نفسه");
      o.innerHTML = '<div class="u-o ' + (same ? "same" : "cross") + '"><b>' + (same ? "✅ Same-origin" : "⛔ Cross-origin") + '</b> <code dir="ltr">' + esc(U.origin) + '</code> vs <code dir="ltr">' + esc(C.origin) + "</code>" + (why.length ? '<div class="small">' + why.join(" · ") + "</div>" : '<div class="small">نفس الـ scheme + host + port ⇒ نفس الـ origin (الـ path والـ query مالهمش دعوة).</div>') + "</div>";
    }
    [inp, base, cmp].forEach(function (e) { e.addEventListener("input", upd); });
    upd();
  }

  /* ================= encoder / decoder chain (mini CyberChef) ================= */
  var u8 = function (s) { return new TextEncoder().encode(s); };
  var fromU8 = function (b) { try { return new TextDecoder("utf-8", { fatal: true }).decode(b); } catch (e) { return Array.from(b, function (c) { return String.fromCharCode(c); }).join(""); } };
  var hex2 = function (n) { return ("0" + n.toString(16)).slice(-2); };
  var decTA = document.createElement("textarea");
  var OPS = {
    "html-enc": ["HTML encode (& < > \" ')", function (s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }],
    "html-hex": ["HTML encode كل حرف (&#xHH;)", function (s) { return Array.from(s, function (c) { return "&#x" + c.codePointAt(0).toString(16) + ";"; }).join(""); }],
    "html-dec-all": ["HTML encode كل حرف (&#DD;)", function (s) { return Array.from(s, function (c) { return "&#" + c.codePointAt(0) + ";"; }).join(""); }],
    "html-dec": ["HTML decode (entities → حروف)", function (s) { decTA.innerHTML = s; return decTA.value; }],
    "url-enc": ["URL encode (encodeURIComponent)", function (s) { return encodeURIComponent(s); }],
    "url-all": ["URL encode كل byte (%HH)", function (s) { return Array.from(u8(s), function (b) { return "%" + hex2(b).toUpperCase(); }).join(""); }],
    "url-dec": ["URL decode (%HH → حروف)", function (s) { try { return decodeURIComponent(s.replace(/\+/g, "%20")); } catch (e) { return s.replace(/(%[0-9a-f]{2})+/gi, function (m) { try { return decodeURIComponent(m); } catch (e2) { return m; } }); } }],
    "b64-enc": ["Base64 encode (UTF-8)", function (s) { var b = u8(s), t = ""; for (var i = 0; i < b.length; i++) t += String.fromCharCode(b[i]); return btoa(t); }],
    "b64-dec": ["Base64 decode", function (s) { var c = s.replace(/[\s]/g, "").replace(/-/g, "+").replace(/_/g, "/"); while (c.length % 4) c += "="; var bin = atob(c); return fromU8(Uint8Array.from(bin, function (ch) { return ch.charCodeAt(0); })); }],
    "js-x": ["JS escape (\\xHH / \\uHHHH)", function (s) { return Array.from(s, function (c) { var n = c.codePointAt(0); return n < 256 ? "\\x" + hex2(n) : n < 0x10000 ? "\\u" + ("000" + n.toString(16)).slice(-4) : "\\u{" + n.toString(16) + "}"; }).join(""); }],
    "js-unesc": ["JS unescape (\\x \\u \\n …)", function (s) {
      return s.replace(/\\(?:x([0-9a-fA-F]{2})|u\{([0-9a-fA-F]{1,6})\}|u([0-9a-fA-F]{4})|([0-7]{1,3})|([\s\S]))/g, function (m, x, ub, u, oct, ch) {
        if (x) return String.fromCharCode(parseInt(x, 16));
        if (ub) return String.fromCodePoint(parseInt(ub, 16));
        if (u) return String.fromCharCode(parseInt(u, 16));
        if (oct) return String.fromCharCode(parseInt(oct, 8));
        return { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", v: "\v", 0: "\0" }[ch] != null ? { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", v: "\v", 0: "\0" }[ch] : ch;
      });
    }],
    "unescape": ["unescape() القديمة (%uHHHH و %HH)", function (s) { return unescape(s); }],
    "fcc": ["String.fromCharCode (أرقام → نص)", function (s) { var nums = (s.match(/0x[0-9a-f]+|\d+/gi) || []).map(function (n) { return parseInt(n, n.slice(0, 2).toLowerCase() === "0x" ? 16 : 10); }); return nums.map(function (n) { return String.fromCharCode(n); }).join(""); }],
    "tcc": ["نص → char codes", function (s) { return Array.from(s, function (c) { return c.codePointAt(0); }).join(","); }],
    "hex-enc": ["Hex encode (bytes)", function (s) { return Array.from(u8(s), hex2).join(" "); }],
    "hex-dec": ["Hex decode", function (s) { var h = s.replace(/0x|\\x|%|[\s,:]/gi, ""); if (h.length % 2) h = "0" + h; var b = new Uint8Array(h.length / 2); for (var i = 0; i < b.length; i++) b[i] = parseInt(h.substr(i * 2, 2), 16); return fromU8(b); }],
    "rev": ["Reverse (اعكس النص)", function (s) { return Array.from(s).reverse().join(""); }],
    "rot13": ["ROT13", function (s) { return s.replace(/[a-z]/gi, function (c) { var b = c <= "Z" ? 65 : 97; return String.fromCharCode((c.charCodeAt(0) - b + 13) % 26 + b); }); }],
    "lower": ["lowercase", function (s) { return s.toLowerCase(); }]
  };
  WM.OPS = OPS;
  function encoderWidget(box) {
    var initial = box.dataset.input || "<img src=x onerror=alert('XSS')>";
    var recipe = (box.dataset.recipe || "html-enc").split(",").filter(function (k) { return OPS[k]; });
    box.innerHTML =
      '<div class="w-head"><span class="w-ico">🧪</span><div><b>Encoder / Decoder Chain</b><small>ابني «وصفة» خطوات ورا بعض — زي CyberChef المصغّر. كل خطوة بتاخد ناتج اللي قبلها.</small></div></div>' +
      '<label class="w-field"><span>الـ input</span><textarea class="e-in" dir="ltr" rows="3" spellcheck="false"></textarea></label>' +
      '<div class="e-steps"></div><div class="e-add"><select class="e-sel" aria-label="عملية جديدة">' + Object.keys(OPS).map(function (k) { return '<option value="' + k + '">' + esc(OPS[k][0]) + "</option>"; }).join("") + '</select><button type="button" class="mini-btn e-plus">+ أضف خطوة</button><button type="button" class="mini-btn e-swap" title="خلّي الناتج النهائي هو الـ input">⇅ الناتج → input</button><button type="button" class="mini-btn e-clear">مسح الخطوات</button></div>';
    var inp = $(".e-in", box), stepsEl = $(".e-steps", box);
    inp.value = initial;
    function run() {
      var cur = inp.value;
      stepsEl.innerHTML = "";
      recipe.forEach(function (k, i) {
        var out, bad = false;
        try { out = OPS[k][1](cur); } catch (e) { out = "⚠ " + e.message; bad = true; }
        var d = document.createElement("div"); d.className = "e-step" + (bad ? " bad" : "");
        d.innerHTML = '<div class="e-sh"><span class="e-n">' + (i + 1) + "</span><b>" + esc(OPS[k][0]) + '</b><span class="e-len">' + (bad ? "" : out.length + " حرف") + '</span><button type="button" class="e-x" aria-label="شيل الخطوة">✕</button></div><pre dir="ltr"></pre>';
        d.querySelector("pre").textContent = out;
        d.querySelector(".e-x").addEventListener("click", function () { recipe.splice(i, 1); run(); });
        stepsEl.appendChild(d);
        if (!bad) cur = out;
      });
      box._out = cur;
      if (!recipe.length) stepsEl.innerHTML = '<div class="muted small">مفيش خطوات — اختار عملية وضيفها.</div>';
    }
    $(".e-plus", box).addEventListener("click", function () { recipe.push($(".e-sel", box).value); run(); });
    $(".e-swap", box).addEventListener("click", function () { if (box._out != null) { inp.value = box._out; recipe = []; run(); } });
    $(".e-clear", box).addEventListener("click", function () { recipe = []; run(); });
    inp.addEventListener("input", run);
    run();
  }

  /* ================= HTML tokenizer (WHATWG §13.2.5, focused subset) ================= */
  var NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", copy: "©", reg: "®", AMP: "&", LT: "<", GT: ">", QUOT: '"', COPY: "©", REG: "®", colon: ":", lpar: "(", rpar: ")", sol: "/", bsol: "\\", Tab: "\t", NewLine: "\n", excl: "!", quest: "?", equals: "=", period: ".", comma: ",", semi: ";", num: "#", lsqb: "[", rsqb: "]", lcub: "{", rcub: "}", grave: "`", plus: "+", percnt: "%", dollar: "$", hellip: "…", mdash: "—", larr: "←", rarr: "→" };
  var LEGACY_EXTRA = { not: "¬", shy: "­", deg: "°", para: "¶", sect: "§", middot: "·", times: "×", divide: "÷", plusmn: "±", laquo: "«", raquo: "»", cent: "¢", pound: "£", yen: "¥", micro: "µ", sup1: "¹", sup2: "²", sup3: "³", frac12: "½", frac14: "¼", frac34: "¾", iexcl: "¡", iquest: "¿", brvbar: "¦", curren: "¤", ordf: "ª", ordm: "º", uml: "¨", macr: "¯", acute: "´", cedil: "¸" };
  Object.keys(LEGACY_EXTRA).forEach(function (k) { NAMED[k] = LEGACY_EXTRA[k]; });
  var LEGACY = new Set(["amp", "lt", "gt", "quot", "nbsp", "copy", "reg", "AMP", "LT", "GT", "QUOT", "COPY", "REG"].concat(Object.keys(LEGACY_EXTRA)));
  var NAMES_SORTED = Object.keys(NAMED).sort(function (a, b) { return b.length - a.length; });
  var C1 = { 0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x0192, 0x84: 0x201e, 0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02c6, 0x89: 0x2030, 0x8a: 0x0160, 0x8b: 0x2039, 0x8c: 0x0152, 0x8e: 0x017d, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014, 0x98: 0x02dc, 0x99: 0x2122, 0x9a: 0x0161, 0x9b: 0x203a, 0x9c: 0x0153, 0x9e: 0x017e, 0x9f: 0x0178 };
    var WS = /[\t\n\f ]/, ALPHA = /[A-Za-z]/, UP = /[A-Z]/, ALNUM = /[A-Za-z0-9]/;
  var RAW_SWITCH = { textarea: "RCDATA", title: "RCDATA", style: "RAWTEXT", xmp: "RAWTEXT", iframe: "RAWTEXT", noembed: "RAWTEXT", noframes: "RAWTEXT", noscript: "RAWTEXT", script: "Script data", plaintext: "PLAINTEXT" };

  function tokenize(input) {
    var trace = [], tokens = [], errors = [];
    var state = "Data", ret = "Data", pos = 0, tok = null, attr = null, buf = "", lastStart = "", foreign = 0, chars = "";
    var n = input.length, guard = 0;
    function flushChars() { if (chars) { tokens.push({ type: "Character", data: chars }); chars = ""; } }
    function emit(t) {
      if (t.type === "Character") { chars += t.data; return; }
      flushChars();
      if (t.type === "StartTag") {
        lastStart = t.name;
        if (t.name === "svg" || t.name === "math") { if (!t.selfClosing) foreign++; }
        else if (!foreign && RAW_SWITCH[t.name]) state = RAW_SWITCH[t.name];
      } else if (t.type === "EndTag" && foreign && (t.name === "svg" || t.name === "math")) foreign--;
      tokens.push(t);
    }
    function err(code) { errors.push({ pos: pos, code: code }); }
    function newAttr(name) { attr = { name: name || "", value: "", dup: false }; tok.attrs.push(attr); }
    function checkDup() {
      if (!attr) return;
      var same = tok.attrs.filter(function (a) { return a !== attr && a.name === attr.name && !a.dup; });
      if (same.length) { attr.dup = true; err("duplicate-attribute (" + attr.name + ") — اتشال، والأولاني هو اللي بيكسب"); }
    }
    function appropriate() { return tok && tok.type === "EndTag" && tok.name === lastStart; }
    function emitTag() {
      if (tok.type === "StartTag") tok.attrs = tok.attrs.filter(function (a) { return !a.dup; });
      else { if (tok.attrs.length) err("end-tag-with-attributes"); tok.attrs = []; }
      var t = tok; tok = null; attr = null; emit(t);
    }
    function snap(note, ch, startPos, st) {
      trace.push({ pos: startPos, end: pos, ch: ch, state: st, next: state, note: note || "", tokens: tokens.length + (chars ? 1 : 0), cur: tok ? JSON.parse(JSON.stringify(tok)) : null, chars: chars, errs: errors.length });
    }
    function charRef(inAttr) {
      // pos is just after '&'
      var start = pos, rest = input.slice(pos);
      var m = /^#[xX]([0-9a-fA-F]+)(;?)/.exec(rest) || /^#([0-9]+)(;?)/.exec(rest);
      if (m) {
        var code = parseInt(m[1], /^#[xX]/.test(m[0]) ? 16 : 10);
        if (!m[2]) err("missing-semicolon-after-character-reference (بيتفك برضه)");
        if (code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) { err("invalid code point → U+FFFD"); code = 0xfffd; }
        else if (C1[code]) { err("control-character-reference (" + code + " → جدول C1)"); code = C1[code]; }
        pos += m[0].length;
        return { text: String.fromCodePoint(code), raw: "&" + m[0] };
      }
      if (/^#/.test(rest)) { err("absence-of-digits-in-numeric-character-reference"); return null; }
      for (var i = 0; i < NAMES_SORTED.length; i++) {
        var nm = NAMES_SORTED[i];
        if (rest.slice(0, nm.length + 1) === nm + ";") { pos += nm.length + 1; return { text: NAMED[nm], raw: "&" + nm + ";" }; }
      }
      for (i = 0; i < NAMES_SORTED.length; i++) {
        nm = NAMES_SORTED[i];
        if (LEGACY.has(nm) && rest.slice(0, nm.length) === nm) {
          var nx = rest[nm.length] || "";
          if (inAttr && (nx === "=" || ALNUM.test(nx))) return null;     // historical rule: "&amp=..." inside attributes stays literal
          err("missing-semicolon-after-character-reference");
          pos += nm.length;
          return { text: NAMED[nm], raw: "&" + nm };
        }
      }
      return null;
    }
    function attrAppend(s) { if (attr) attr.value += s; }
    while (guard++ < 20000) {
      var st = state, startPos = pos, c = pos < n ? input[pos] : null, note = "";
      if (c !== null) pos++;
      var reconsume = function () { if (c !== null) pos--; };
      switch (st) {
        case "Data":
          if (c === "&") { var r = charRef(false); if (r) { emit({ type: "Character", data: r.text }); note = "character reference <code>" + esc(r.raw) + "</code> → <code>" + esc(r.text) + "</code>"; } else { emit({ type: "Character", data: "&" }); note = "& عادية (مش reference)"; } }
          else if (c === "<") { state = "Tag open"; }
          else if (c === null) { flushChars(); tokens.push({ type: "EOF" }); }
          else emit({ type: "Character", data: c });
          break;
        case "RCDATA":
          if (c === "&") { r = charRef(false); emit({ type: "Character", data: r ? r.text : "&" }); if (r) note = "حتى جوه RCDATA الـ entities بتتفك"; }
          else if (c === "<") state = "RCDATA less-than sign";
          else if (c === null) { flushChars(); tokens.push({ type: "EOF" }); }
          else emit({ type: "Character", data: c });
          break;
        case "RAWTEXT": case "Script data":
          if (c === "<") state = st + " less-than sign";
          else if (c === null) { flushChars(); tokens.push({ type: "EOF" }); }
          else emit({ type: "Character", data: c });
          break;
        case "PLAINTEXT":
          if (c === null) { flushChars(); tokens.push({ type: "EOF" }); } else emit({ type: "Character", data: c });
          break;
        case "Tag open":
          if (c === "!") state = "Markup declaration open";
          else if (c === "/") state = "End tag open";
          else if (c !== null && ALPHA.test(c)) { tok = { type: "StartTag", name: "", attrs: [], selfClosing: false }; reconsume(); state = "Tag name"; note = "بدأ start tag جديد"; }
          else if (c === "?") { err("unexpected-question-mark-instead-of-tag-name"); tok = { type: "Comment", data: "" }; reconsume(); state = "Bogus comment"; }
          else if (c === null) { emit({ type: "Character", data: "<" }); flushChars(); tokens.push({ type: "EOF" }); }
          else { err("invalid-first-character-of-tag-name"); emit({ type: "Character", data: "<" }); reconsume(); state = "Data"; note = "<b>مش tag!</b> الـ &lt; اتعاملت كنص عادي"; }
          break;
        case "End tag open":
          if (c !== null && ALPHA.test(c)) { tok = { type: "EndTag", name: "", attrs: [] }; reconsume(); state = "Tag name"; }
          else if (c === ">") { err("missing-end-tag-name"); state = "Data"; note = "<code>&lt;/&gt;</code> اتشالت خالص"; }
          else if (c === null) { emit({ type: "Character", data: "</" }); flushChars(); tokens.push({ type: "EOF" }); }
          else { err("invalid-first-character-of-tag-name"); tok = { type: "Comment", data: "" }; reconsume(); state = "Bogus comment"; note = "اتحوّلت لـ <b>bogus comment</b>"; }
          break;
        case "Tag name":
          if (c !== null && WS.test(c)) state = "Before attribute name";
          else if (c === "/") state = "Self-closing start tag";
          else if (c === ">") { state = "Data"; note = "الـ tag خلص واتبعت"; emitTag(); }
          else if (c === null) { err("eof-in-tag"); flushChars(); tokens.push({ type: "EOF" }); }
          else tok.name += UP.test(c) ? c.toLowerCase() : c;
          break;
        case "RCDATA less-than sign": case "RAWTEXT less-than sign": case "Script data less-than sign":
          var base = st.replace(" less-than sign", "");
          if (c === "/") { buf = ""; state = base + " end tag open"; }
          else { emit({ type: "Character", data: "<" }); reconsume(); state = base; }
          break;
        case "RCDATA end tag open": case "RAWTEXT end tag open": case "Script data end tag open":
          base = st.replace(" end tag open", "");
          if (c !== null && ALPHA.test(c)) { tok = { type: "EndTag", name: "", attrs: [] }; reconsume(); state = base + " end tag name"; }
          else { emit({ type: "Character", data: "</" }); reconsume(); state = base; }
          break;
        case "RCDATA end tag name": case "RAWTEXT end tag name": case "Script data end tag name":
          base = st.replace(" end tag name", "");
          if (c !== null && (WS.test(c) || c === "/" || c === ">") && appropriate()) {
            if (c === ">") { state = "Data"; note = "<b>appropriate end tag</b> <code>&lt;/" + esc(tok.name) + "&gt;</code> — رجعنا لـ Data"; emitTag(); }
            else state = WS.test(c) ? "Before attribute name" : "Self-closing start tag";
          } else if (c !== null && ALPHA.test(c)) { tok.name += c.toLowerCase(); buf += c; }
          else { emit({ type: "Character", data: "</" + buf }); tok = null; reconsume(); state = base; note = "مش الـ end tag بتاع <code>" + esc(lastStart) + "</code> ⇒ كله نص"; }
          break;
        case "Before attribute name":
          if (c !== null && WS.test(c)) { /* ignore */ }
          else if (c === "/" || c === ">" || c === null) { reconsume(); state = "After attribute name"; }
          else if (c === "=") { err("unexpected-equals-sign-before-attribute-name"); newAttr("="); state = "Attribute name"; }
          else { newAttr(""); reconsume(); state = "Attribute name"; note = "attribute جديد"; }
          break;
        case "Attribute name":
          if (c === null || WS.test(c) || c === "/" || c === ">") { checkDup(); reconsume(); state = "After attribute name"; }
          else if (c === "=") { checkDup(); state = "Before attribute value"; }
          else { if (c === '"' || c === "'" || c === "<") err("unexpected-character-in-attribute-name (" + c + ")"); attr.name += UP.test(c) ? c.toLowerCase() : c; }
          break;
        case "After attribute name":
          if (c !== null && WS.test(c)) { /* ignore */ }
          else if (c === "/") state = "Self-closing start tag";
          else if (c === "=") state = "Before attribute value";
          else if (c === ">") { state = "Data"; emitTag(); note = "الـ tag خلص واتبعت"; }
          else if (c === null) { err("eof-in-tag"); flushChars(); tokens.push({ type: "EOF" }); }
          else { newAttr(""); reconsume(); state = "Attribute name"; }
          break;
        case "Before attribute value":
          if (c !== null && WS.test(c)) { /* ignore */ }
          else if (c === '"') state = "Attribute value (double-quoted)";
          else if (c === "'") state = "Attribute value (single-quoted)";
          else if (c === ">") { err("missing-attribute-value"); state = "Data"; emitTag(); }
          else { reconsume(); state = "Attribute value (unquoted)"; note = "قيمة <b>من غير quotes</b> — هتخلص عند أول مسافة أو &gt;"; }
          break;
        case "Attribute value (double-quoted)": case "Attribute value (single-quoted)":
          var q = st.indexOf("double") > 0 ? '"' : "'";
          if (c === q) state = "After attribute value (quoted)";
          else if (c === "&") { r = charRef(true); attrAppend(r ? r.text : "&"); if (r) note = "entity جوه attribute: <code>" + esc(r.raw) + "</code> → <code>" + esc(r.text === "\t" ? "\\t" : r.text === "\n" ? "\\n" : r.text) + "</code> (بتتفك <b>قبل</b> ما الـ JS أو الـ URL يشوفوا القيمة)"; }
          else if (c === null) { err("eof-in-tag"); flushChars(); tokens.push({ type: "EOF" }); }
          else attrAppend(c);
          break;
        case "Attribute value (unquoted)":
          if (c !== null && WS.test(c)) state = "Before attribute name";
          else if (c === "&") { r = charRef(true); attrAppend(r ? r.text : "&"); }
          else if (c === ">") { state = "Data"; emitTag(); note = "الـ tag خلص واتبعت"; }
          else if (c === null) { err("eof-in-tag"); flushChars(); tokens.push({ type: "EOF" }); }
          else { if (/["'<=`]/.test(c)) err("unexpected-character-in-unquoted-attribute-value (" + c + ")"); attrAppend(c); }
          break;
        case "After attribute value (quoted)":
          if (c !== null && WS.test(c)) state = "Before attribute name";
          else if (c === "/") state = "Self-closing start tag";
          else if (c === ">") { state = "Data"; emitTag(); note = "الـ tag خلص واتبعت"; }
          else if (c === null) { err("eof-in-tag"); flushChars(); tokens.push({ type: "EOF" }); }
          else { err("missing-whitespace-between-attributes"); reconsume(); state = "Before attribute name"; note = "مفيش مسافة بين الـ attributes — parse error بس <b>عادي، بيكمّل</b>"; }
          break;
        case "Self-closing start tag":
          if (c === ">") { tok.selfClosing = true; state = "Data"; emitTag(); note = "self-closing flag — في HTML مالوش أي تأثير على عنصر عادي زي div"; }
          else if (c === null) { err("eof-in-tag"); flushChars(); tokens.push({ type: "EOF" }); }
          else { err("unexpected-solidus-in-tag"); reconsume(); state = "Before attribute name"; note = "الـ / اتعاملت كأنها <b>مسافة</b> (فاصل بين attributes)"; }
          break;
        case "Markup declaration open":
          reconsume();
          var rest = input.slice(pos);
          if (rest.slice(0, 2) === "--") { pos += 2; tok = { type: "Comment", data: "" }; state = "Comment start"; }
          else if (/^doctype/i.test(rest)) { pos += 7; state = "DOCTYPE"; tok = { type: "DOCTYPE", name: "" }; }
          else if (rest.slice(0, 7) === "[CDATA[") {
            pos += 7;
            if (foreign) { state = "CDATA section"; note = "CDATA مسموح هنا لأننا جوه svg/math"; }
            else { err("cdata-in-html-content"); tok = { type: "Comment", data: "[CDATA[" }; state = "Bogus comment"; note = "في HTML العادي الـ CDATA = <b>bogus comment</b>"; }
          } else { err("incorrectly-opened-comment"); tok = { type: "Comment", data: "" }; state = "Bogus comment"; }
          break;
        case "Bogus comment":
          if (c === ">") { state = "Data"; emit(tok); tok = null; }
          else if (c === null) { emit(tok); tok = null; flushChars(); tokens.push({ type: "EOF" }); }
          else tok.data += c;
          break;
        case "Comment start":
          if (c === "-") state = "Comment start dash";
          else if (c === ">") { err("abrupt-closing-of-empty-comment"); state = "Data"; emit(tok); tok = null; note = "<code>&lt;!--&gt;</code> = comment فاضي وخلص"; }
          else { reconsume(); state = "Comment"; }
          break;
        case "Comment start dash":
          if (c === "-") state = "Comment end";
          else if (c === ">") { err("abrupt-closing-of-empty-comment"); state = "Data"; emit(tok); tok = null; }
          else if (c === null) { err("eof-in-comment"); emit(tok); tok = null; flushChars(); tokens.push({ type: "EOF" }); }
          else { tok.data += "-"; reconsume(); state = "Comment"; }
          break;
        case "Comment":
          if (c === "<") { tok.data += "<"; state = "Comment less-than sign"; }
          else if (c === "-") state = "Comment end dash";
          else if (c === null) { err("eof-in-comment"); emit(tok); tok = null; flushChars(); tokens.push({ type: "EOF" }); }
          else tok.data += c;
          break;
        case "Comment less-than sign":
          if (c === "!") { tok.data += "!"; state = "Comment less-than sign bang"; }
          else if (c === "<") tok.data += "<";
          else { reconsume(); state = "Comment"; }
          break;
        case "Comment less-than sign bang":
          if (c === "-") state = "Comment less-than sign bang dash"; else { reconsume(); state = "Comment"; }
          break;
        case "Comment less-than sign bang dash":
          if (c === "-") state = "Comment less-than sign bang dash dash"; else { reconsume(); state = "Comment end dash"; }
          break;
        case "Comment less-than sign bang dash dash":
          if (c !== ">" && c !== null) err("nested-comment");
          reconsume(); state = "Comment end";
          break;
        case "Comment end dash":
          if (c === "-") state = "Comment end";
          else if (c === null) { err("eof-in-comment"); emit(tok); tok = null; flushChars(); tokens.push({ type: "EOF" }); }
          else { tok.data += "-"; reconsume(); state = "Comment"; }
          break;
        case "Comment end":
          if (c === ">") { state = "Data"; emit(tok); tok = null; note = "<code>--&gt;</code> قفل الـ comment"; }
          else if (c === "!") state = "Comment end bang";
          else if (c === "-") tok.data += "-";
          else if (c === null) { err("eof-in-comment"); emit(tok); tok = null; flushChars(); tokens.push({ type: "EOF" }); }
          else { tok.data += "--"; reconsume(); state = "Comment"; }
          break;
        case "Comment end bang":
          if (c === "-") { tok.data += "--!"; state = "Comment end dash"; }
          else if (c === ">") { err("incorrectly-closed-comment"); state = "Data"; emit(tok); tok = null; note = "<b>⚠ <code>--!&gt;</code> قفلت الـ comment!</b> parse error بس الـ comment خلص فعلًا — فلتر بيدور على <code>--&gt;</code> بس هيتخدع"; }
          else if (c === null) { err("eof-in-comment"); emit(tok); tok = null; flushChars(); tokens.push({ type: "EOF" }); }
          else { tok.data += "--!"; reconsume(); state = "Comment"; }
          break;
        case "DOCTYPE":
          if (c === ">") { tok.name = tok.name.trim().split(/\s+/)[0].toLowerCase(); state = "Data"; emit(tok); tok = null; }
          else if (c === null) { flushChars(); tokens.push({ type: "EOF" }); }
          else tok.name += c;
          break;
        case "CDATA section":
          if (c === "]" && input.slice(pos, pos + 2) === "]>") { pos += 2; state = "Data"; note = "<code>]]&gt;</code> قفل الـ CDATA"; }
          else if (c === null) { flushChars(); tokens.push({ type: "EOF" }); }
          else emit({ type: "Character", data: c });
          break;
        default:
          state = "Data";
      }
      snap(note, c, startPos, st);
      if (c === null && tokens.length && tokens[tokens.length - 1].type === "EOF") break;
    }
    flushChars();
    return { trace: trace, tokens: tokens, errors: errors };
  }
  WM.tokenize = tokenize;

  var STATE_AR = {
    "Data": "الحالة العادية: أي حرف نص، لحد ما يقابل <code>&lt;</code> (ممكن tag) أو <code>&amp;</code> (ممكن entity).",
    "Tag open": "شاف <code>&lt;</code>: هل اللي جاي حرف (start tag)، ولا <code>/</code> (end tag)، ولا <code>!</code> (comment/doctype)؟",
    "End tag open": "شاف <code>&lt;/</code> ومستني اسم الـ tag.",
    "Tag name": "بيقرا اسم الـ tag لحد مسافة أو <code>/</code> أو <code>&gt;</code>. الحروف الكابيتال بتتحول small.",
    "Before attribute name": "بين الـ attributes: المسافات بتتجاهل.",
    "Attribute name": "بيقرا اسم attribute لحد <code>=</code> أو مسافة أو <code>/</code> أو <code>&gt;</code>.",
    "After attribute name": "خلص اسم الـ attribute: هل فيه <code>=</code> وقيمة؟ ولا attribute من غير قيمة؟",
    "Before attribute value": "بعد الـ <code>=</code>: القيمة هتبدأ بـ quote ولا من غيرها؟",
    "Attribute value (double-quoted)": "جوه <code>\"…\"</code>: <b>مفيش حاجة</b> بتقفل القيمة غير <code>\"</code> (حتى <code>&gt;</code> عادي هنا).",
    "Attribute value (single-quoted)": "جوه <code>'…'</code>: مفيش حاجة بتقفل القيمة غير <code>'</code>.",
    "Attribute value (unquoted)": "قيمة من غير quotes: بتخلص عند <b>أول مسافة</b> أو <code>&gt;</code>.",
    "After attribute value (quoted)": "القيمة اتقفلت: مستني مسافة أو <code>/</code> أو <code>&gt;</code>.",
    "Self-closing start tag": "شاف <code>/</code> جوه الـ tag.",
    "Markup declaration open": "شاف <code>&lt;!</code>: comment؟ doctype؟ CDATA؟",
    "Bogus comment": "حاجة شبه tag بس غلط ⇒ بتتحول comment لحد أول <code>&gt;</code>.",
    "Comment start": "بداية comment بعد <code>&lt;!--</code>.", "Comment start dash": "بداية comment بعد شرطة.",
    "Comment": "جوه comment: كل حاجة نص لحد <code>--&gt;</code> (أو <code>--!&gt;</code>).",
    "Comment end dash": "شاف <code>-</code> جوه comment — يمكن نهايته.", "Comment end": "شاف <code>--</code> — لو جه <code>&gt;</code> الـ comment يخلص.",
    "Comment end bang": "شاف <code>--!</code> — لو جه <code>&gt;</code> الـ comment <b>يخلص برضه</b>.",
    "Comment less-than sign": "شاف <code>&lt;</code> جوه comment (فحص للـ nested comments).",
    "Comment less-than sign bang": "شاف <code>&lt;!</code> جوه comment.", "Comment less-than sign bang dash": "شاف <code>&lt;!-</code> جوه comment.", "Comment less-than sign bang dash dash": "شاف <code>&lt;!--</code> جوه comment = nested comment (parse error بس).",
    "DOCTYPE": "بيقرا الـ DOCTYPE (مبسّط في الأداة دي).",
    "RCDATA": "<b>RCDATA</b> (جوه textarea/title): مفيش tags خالص، بس الـ entities بتتفك. الحاجة الوحيدة اللي بتخرّجك هي <code>&lt;/textarea&gt;</code> نفسها.",
    "RAWTEXT": "<b>RAWTEXT</b> (جوه style/xmp/iframe/noembed/noframes/noscript): نص خام — لا tags ولا entities، لحد الـ end tag المناسب.",
    "Script data": "<b>Script data</b>: كود الـ JS خام. أول <code>&lt;/script&gt;</code> بيقفل الـ script — <b>حتى لو جوه string</b> في الـ JS!",
    "PLAINTEXT": "<b>PLAINTEXT</b>: كل حاجة لآخر الملف بقت نص. مفيش رجوع.",
    "RCDATA less-than sign": "شاف <code>&lt;</code> جوه RCDATA — يمكن end tag.", "RAWTEXT less-than sign": "شاف <code>&lt;</code> جوه RAWTEXT.", "Script data less-than sign": "شاف <code>&lt;</code> جوه script.",
    "RCDATA end tag open": "شاف <code>&lt;/</code> جوه RCDATA.", "RAWTEXT end tag open": "شاف <code>&lt;/</code> جوه RAWTEXT.", "Script data end tag open": "شاف <code>&lt;/</code> جوه script.",
    "RCDATA end tag name": "بيقارن اسم الـ end tag بآخر start tag — لازم يطابقه عشان يخرج.", "RAWTEXT end tag name": "بيقارن اسم الـ end tag بآخر start tag.", "Script data end tag name": "بيقارن الاسم بـ script — لو طابق، الـ script خلص هنا.",
    "CDATA section": "جوه <code>&lt;![CDATA[</code> (مسموح بس جوه svg/math)."
  };
  function tokView(t) {
    if (!t) return "";
    if (t.type === "StartTag") return '<span class="tk tk-s">StartTag <b>' + esc(t.name) + "</b>" + t.attrs.map(function (a) { return ' <i class="' + (a.dup ? "dup" : "") + '">' + esc(a.name) + (a.value !== "" ? '=<q>' + esc(a.value).replace(/\t/g, "\\t").replace(/\n/g, "\\n") + "</q>" : "") + "</i>"; }).join("") + (t.selfClosing ? " <em>/</em>" : "") + "</span>";
    if (t.type === "EndTag") return '<span class="tk tk-e">EndTag <b>' + esc(t.name) + "</b></span>";
    if (t.type === "Comment") return '<span class="tk tk-c">Comment <q>' + esc(t.data) + "</q></span>";
    if (t.type === "DOCTYPE") return '<span class="tk tk-d">DOCTYPE <b>' + esc(t.name) + "</b></span>";
    if (t.type === "Character") return '<span class="tk tk-t">Characters <q>' + esc(t.data).replace(/\n/g, "⏎") + "</q></span>";
    if (t.type === "EOF") return '<span class="tk tk-eof">EOF</span>';
    return "";
  }
  function tokenizerWidget(box) {
    var PRE = [
      ['<img src=x onerror="alert(1)">', "tag + attributes"],
      ['<a href="java&#x09;script:alert(1)">click</a>', "entity جوه attribute"],
      ["<textarea><img src=x onerror=alert(1)></textarea>", "RCDATA"],
      ['<script>var s = "</script><b>bye</b>";</script>', "script data"],
      ["<!-- hidden --!><b>closed!</b> -->", "--!> بتقفل"],
      ['<div id="a" ID="b" class=x/y>dup</div>', "duplicate + unquoted"],
      ['<a href="/x"title="t"/onclick=go()>', "من غير مسافات"],
      ["<svg><style><img src=x onerror=alert(1)></style></svg>", "foreign content"],
      ["5 < 6 &amp;&ampx &notanentity; &#65;&#x42;", "نص و entities"],
      ["<p>a</p ><br/><//x>", "حالات غريبة"]
    ];
    box.innerHTML =
      '<div class="w-head"><span class="w-ico">⚙️</span><div><b>HTML Tokenizer — خطوة بخطوة</b><small>نفس الـ states اللي في الـ HTML Standard. اكتب أي حاجة وامشي حرف حرف.</small></div></div>' +
      '<div class="u-presets t-presets">' + PRE.map(function (p, i) { return '<button type="button" class="chip-btn" data-i="' + i + '">' + esc(p[1]) + "</button>"; }).join("") + "</div>" +
      '<textarea class="t-in" dir="ltr" rows="2" spellcheck="false"></textarea>' +
      '<div class="t-ctl"><button type="button" class="mini-btn" data-a="reset">⏮</button><button type="button" class="mini-btn" data-a="back">◀ رجوع</button><button type="button" class="btn btn-primary btn-sm" data-a="step">خطوة ▶</button><button type="button" class="mini-btn" data-a="play">▶▶ تشغيل</button><button type="button" class="mini-btn" data-a="end">⏭ للآخر</button><span class="t-pos"></span></div>' +
      '<div class="t-tape" dir="ltr"></div>' +
      '<div class="t-grid"><div class="t-state"><div class="t-lbl">الـ state الحالية</div><div class="t-sname" dir="ltr"></div><div class="t-sdesc"></div><div class="t-note"></div><div class="t-lbl">الـ token اللي بيتبني</div><div class="t-cur" dir="ltr"></div></div>' +
      '<div class="t-out"><div class="t-lbl">الـ tokens اللي طلعت (للـ tree builder)</div><div class="t-toks" dir="ltr"></div><div class="t-lbl">parse errors (المتصفح بيكمّل عادي!)</div><div class="t-errs" dir="ltr"></div></div></div>' +
      '<p class="t-foot small muted">مبسّط عن الـ spec في: الـ DOCTYPE، الـ script-escape states (<code>&lt;!--</code> جوه script)، وجدول الـ named references (فيه حوالي 75 من أشهرها بس — الـ spec فيه أكتر من 2000). الـ switch لـ RCDATA/RAWTEXT بيعمله الـ tree builder في الحقيقة، والأداة بتقلّده.</p>';
    var inp = $(".t-in", box), R = null, k = 0, timer = null;
    inp.value = box.dataset.input || PRE[0][0];
    function compute() { R = tokenize(inp.value); k = 0; paint(); }
    function paint() {
      var s = R.trace[Math.min(k, R.trace.length - 1)], src = inp.value;
      var tape = "";
      for (var i = 0; i < src.length; i++) {
        var cls = i < s.pos ? "done" : "";
        if (i >= s.pos && i < Math.max(s.end, s.pos + 1)) cls = "cur";
        var ch = src[i] === " " ? "␣" : src[i] === "\n" ? "⏎" : src[i] === "\t" ? "⇥" : src[i];
        tape += '<span class="' + cls + '">' + esc(ch) + "</span>";
      }
      tape += '<span class="' + (s.pos >= src.length ? "cur eof" : "eof") + '">EOF</span>';
      $(".t-tape", box).innerHTML = tape;
      $(".t-sname", box).textContent = s.state + (s.next !== s.state ? "  →  " + s.next : "");
      $(".t-sdesc", box).innerHTML = STATE_AR[s.state] || "";
      $(".t-note", box).innerHTML = s.note ? "💡 " + s.note : "";
      $(".t-cur", box).innerHTML = s.cur ? tokView(s.cur) + (s.cur.type === "StartTag" || s.cur.type === "EndTag" ? "" : "") : '<span class="muted">—</span>';
      var toks = R.tokens.slice(0, s.tokens);
      if (s.chars && toks.length && toks[toks.length - 1].type === "Character") toks = toks.slice(0, -1);
      var html = toks.map(tokView).join("");
      if (s.chars) html += tokView({ type: "Character", data: s.chars });
      $(".t-toks", box).innerHTML = html || '<span class="muted">لسه مفيش</span>';
      $(".t-errs", box).innerHTML = R.errors.slice(0, s.errs).map(function (e) { return "<div>⚠ " + esc(e.code) + " <span class='muted'>@" + e.pos + "</span></div>"; }).join("") || '<span class="muted">مفيش</span>';
      $(".t-pos", box).textContent = "خطوة " + (k + 1) + " / " + R.trace.length;
    }
    function stop() { clearInterval(timer); timer = null; $('[data-a="play"]', box).textContent = "▶▶ تشغيل"; }
    $$(".t-ctl button", box).forEach(function (b) {
      b.addEventListener("click", function () {
        var a = b.dataset.a;
        if (a !== "play") stop();
        if (a === "reset") k = 0;
        if (a === "back") k = Math.max(0, k - 1);
        if (a === "step") k = Math.min(R.trace.length - 1, k + 1);
        if (a === "end") k = R.trace.length - 1;
        if (a === "play") {
          if (timer) { stop(); return; }
          if (k >= R.trace.length - 1) k = 0;
          b.textContent = "❚❚ وقف";
          timer = setInterval(function () { if (k >= R.trace.length - 1) { stop(); return; } k++; paint(); }, REDUCED ? 600 : 260);
        }
        paint();
      });
    });
    $$(".t-presets button", box).forEach(function (b) { b.addEventListener("click", function () { stop(); inp.value = PRE[+b.dataset.i][0]; compute(); }); });
    inp.addEventListener("input", function () { stop(); compute(); });
    compute();
  }

  /* ================= parser playground (tree builder) ================= */
  function parserWidget(box) {
    var PRE = [
      ["<p>one<p>two<div>three</div>", "p بتقفل نفسها"],
      ["<b><i>bold-italic</b> just italic?</i>", "misnested tags"],
      ["<table><b>hi</b><tr><td>cell</td></tr></table>", "foster parenting"],
      ["<ul><li>a<li>b</ul><title>T</title>", "optional end tags"],
      ['<a href="/1">one<a href="/2">two</a>', "a جوه a"],
      ["<svg><p>escape</p><style>s{}</style></svg>", "الخروج من svg"],
      ["<template><tr><td>x</td></tr></template>", "template"],
      ['<noscript><p title="</noscript><img src=x onerror=alert(1)>"></noscript>', "noscript differential"],
      ["<form><form><input name=a></form><input name=b>", "nested forms"],
      ["</br><p></p></p>", "end tags غريبة"]
    ];
    box.innerHTML =
      '<div class="w-head"><span class="w-ico">🌳</span><div><b>Parser Playground — المتصفح فهم إيه؟</b><small>اكتب HTML (حتى لو غلط) وشوف الـ DOM اللي المتصفح بناه فعلًا، والـ HTML بعد الـ re-serialize.</small></div></div>' +
      '<div class="u-presets p-presets">' + PRE.map(function (p, i) { return '<button type="button" class="chip-btn" data-i="' + i + '">' + esc(p[1]) + "</button>"; }).join("") + "</div>" +
      '<textarea class="p-in" dir="ltr" rows="3" spellcheck="false"></textarea>' +
      '<div class="p-opts"><label><input type="radio" name="pm-' + WM.uid() + '" value="frag" checked> كـ <code>innerHTML</code> لـ div (fragment)</label><label><input type="radio" name="pm2" value="doc"> كـ document كامل</label><label><input type="checkbox" class="p-script"> scripting <b>شغّال</b> (صفحة حية في sandbox)</label><label><input type="checkbox" class="p-ws"> إظهار الـ whitespace</label></div>' +
      '<div class="p-grid"><div><div class="t-lbl">🌳 شجرة الـ DOM</div><div class="p-tree"></div></div><div><div class="t-lbl">🔁 الـ HTML بعد ما المتصفح عمله serialize تاني</div><pre class="p-ser" dir="ltr"><code></code></pre><div class="p-diff"></div></div></div>';
    var radios = $$('.p-opts input[type="radio"]', box);
    radios.forEach(function (r) { r.name = "pm-" + box.id; });
    var inp = $(".p-in", box), live = null;
    inp.value = box.dataset.input || PRE[0][0];
    var paint = function (tree, ser) {
      $(".p-tree", box).innerHTML = WM.renderTree(tree, { hideWS: !$(".p-ws", box).checked });
      var code = $(".p-ser code", box); code.innerHTML = WM.highlight(ser, "html");
      var same = ser.replace(/\s+/g, "") === inp.value.replace(/\s+/g, "");
      $(".p-diff", box).innerHTML = same ? '<div class="u-note info">الـ serialization مطابقة للـ input تقريبًا — الكود كان «سليم».</div>' : '<div class="u-note warn">⚠ الناتج <b>مختلف</b> عن اللي كتبته: المتصفح صلّح/نقل/قفل حاجات. أي sanitizer بيـ parse وبعدين يـ serialize ممكن يقع في نفس الفرق ده (ده أساس <b>mXSS</b>).</div>';
    };
    function upd() {
      var frag = radios[0].checked, scripting = $(".p-script", box).checked, src = inp.value;
      if (!scripting) {
        if (frag) {
          // a <div> owned by a DOMParser document: scripting disabled, no browsing context ⇒ nothing runs or loads
          var div = WM.parseHTML("").createElement("div");
          div.innerHTML = src;
          paint({ t: 11, c: WM.serialize(div).c }, div.innerHTML);
        } else {
          var d = WM.parseHTML(src);
          paint(WM.serialize(d), (d.doctype ? "<!DOCTYPE " + d.doctype.name + ">" : "") + d.documentElement.outerHTML);
        }
        return;
      }
      if (!live) { var h = document.createElement("div"); h.className = "p-live"; box.appendChild(h); live = new WM.Preview(h, { mode: "xss", min: 50, max: 160 }); }
      var page = frag ? "<!DOCTYPE html><body>" + src : src;
      live.run(page).then(function () { return live.tree(); }).then(function (tr) {
        if (!tr) return;
        var body = null;
        (function find(n) { if (body) return; if (n.t === 1 && n.n === "body") { body = n; return; } (n.c || []).forEach(find); })(tr);
        var shown = frag && body ? { t: 11, c: body.c } : tr;
        paint(shown, "(serialization من الصفحة الحية — شوف الشجرة)");
        $(".p-diff", box).innerHTML = '<div class="u-note info">الشجرة دي من صفحة حية والـ scripting شغّال (زي المتصفح الحقيقي). قارنها بنفس الـ input والـ scripting مقفول — خصوصًا مع <code>&lt;noscript&gt;</code>.</div>';
      });
    }
    $$(".p-presets button", box).forEach(function (b) { b.addEventListener("click", function () { inp.value = PRE[+b.dataset.i][0]; upd(); }); });
    inp.addEventListener("input", WM.debounce(upd, 250));
    $$(".p-opts input", box).forEach(function (i) { i.addEventListener("change", upd); });
    upd();
  }

  /* ================= smuggling demo (harmless) ================= */
  function smuggleWidget(box) {
    box.innerHTML =
      '<div class="w-head"><span class="w-ico">📦</span><div><b>HTML Smuggling — demo آمن</b><small>الملف بيتبني <b>جوه المتصفح</b> من JavaScript — مفيش request بيعدّي على الـ proxy أو الـ email gateway بالملف.</small></div></div>' +
      '<label class="w-field"><span>محتوى الملف (هنا نص بريء)</span><textarea class="s-in" dir="ltr" rows="3">This file was assembled in your browser from a Base64 string.\nNo network request carried it.\n</textarea></label>' +
      '<div class="t-ctl"><button type="button" class="btn btn-primary btn-sm s-go">ابني الـ Blob</button><span class="s-info small"></span></div><pre class="s-out" dir="ltr" hidden></pre>';
    $(".s-go", box).addEventListener("click", function () {
      var txt = $(".s-in", box).value, b64 = OPS["b64-enc"][1](txt);
      var bin = atob(b64), bytes = Uint8Array.from(bin, function (c) { return c.charCodeAt(0); });
      var blob = new Blob([bytes], { type: "text/plain" }), url = URL.createObjectURL(blob);
      var out = $(".s-out", box); out.hidden = false;
      out.textContent = "1) payload stored as Base64 inside the page:\n   " + b64.slice(0, 80) + (b64.length > 80 ? "…" : "") +
        "\n2) atob() → " + bytes.length + " bytes → new Blob([...], {type:'text/plain'})\n3) URL.createObjectURL(blob) → " + url +
        "\n4) <a href=\"" + url + "\" download=\"invoice.txt\"> + a.click() → the browser 'downloads' a file it built itself";
      $(".s-info", box).innerHTML = '<a href="' + url + '" download="smuggled-demo.txt">⬇ نزّل الملف التجريبي (نص)</a>';
    });
  }

  WM.initWidgets = function (api) {
    API = api || {};
    initScenes();
    $$("[data-widget]").forEach(function (box, i) {
      if (!box.id) box.id = "w" + i;
      var w = box.dataset.widget;
      try {
        if (w === "url") urlWidget(box);
        else if (w === "encoder") encoderWidget(box);
        else if (w === "tokenizer") tokenizerWidget(box);
        else if (w === "parser") parserWidget(box);
        else if (w === "smuggle") smuggleWidget(box);
      } catch (e) { box.textContent = "widget error: " + e.message; console.error(e); }
    });
  };
})();
