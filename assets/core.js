/* ============================================================
   Web Mastery — core runtime
   - syntax highlighters (HTML / CSS / JS / HTTP)
   - DOM serializer + tree renderer
   - WM.Preview: sandboxed iframe (opaque origin, no same-origin) with a
     hook that reports console, dialogs, navigation, form submissions
     (as the exact HTTP request), meta refresh, validation, live DOM,
     and — in "analysis" mode — dangerous sinks with a no-network CSP.
   - WM.Editor: textarea with a highlighted overlay.
   ============================================================ */
(function () {
  "use strict";
  var WM = (window.WM = window.WM || {});

  /* ---------------- small utils ---------------- */
  var esc = (WM.esc = function (s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  });
  WM.debounce = function (fn, ms) {
    var t;
    return function () { var a = arguments, me = this; clearTimeout(t); t = setTimeout(function () { fn.apply(me, a); }, ms); };
  };
  WM.uid = function () { return Math.random().toString(36).slice(2) + Date.now().toString(36); };

  /* ---------------- SHA-256 (answers are stored hashed) ---------------- */
  WM.sha256 = function (str) {
    var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    var bytes = Array.from(new TextEncoder().encode(str));
    var l = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (var i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (l >>> (i * 8)) & 0xff);
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var r = function (x, n) { return (x >>> n) | (x << (32 - n)); };
    for (var o = 0; o < bytes.length; o += 64) {
      var w = new Array(64);
      for (i = 0; i < 16; i++) w[i] = (bytes[o + 4 * i] << 24) | (bytes[o + 4 * i + 1] << 16) | (bytes[o + 4 * i + 2] << 8) | bytes[o + 4 * i + 3];
      for (i = 16; i < 64; i++) {
        var s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (i = 0; i < 64; i++) {
        var t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        var t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H = [H[0] + a, H[1] + b, H[2] + c, H[3] + d, H[4] + e, H[5] + f, H[6] + g, H[7] + h].map(function (x) { return x | 0; });
    }
    return H.map(function (x) { return (x >>> 0).toString(16).padStart(8, "0"); }).join("");
  };
  /* must match norm_answer() in tools/build.py */
  WM.normAnswer = function (v, kind) {
    v = String(v).trim();
    if (kind === "exact") return v;
    if (kind === "int") {
      var s = v.replace(/^\+/, "").replace(/_/g, "");
      var n = /^-?0x[0-9a-f]+$/i.test(s) ? parseInt(s, 16) : /^-?\d+$/.test(s) ? parseInt(s, 10) : NaN;
      return isNaN(n) ? null : String(n);
    }
    v = v.replace(/^(["'`])([\s\S]*)\1$/, "$2").trim();
    return v.toLowerCase().replace(/\s+/g, " ");
  };

  /* ---------------- highlighters ---------------- */
  var span = function (c, html) { return '<span class="tok-' + c + '">' + html + "</span>"; };
  var entText = function (s) {
    return esc(s).replace(/&amp;(#[xX][0-9a-fA-F]+;?|#\d+;?|[A-Za-z][A-Za-z0-9]{1,31};?)/g, function (m) { return span("ent", m); });
  };
  var JS_KW = new Set("break case catch class const continue debugger default delete do else export extends finally for function if import in instanceof let new of return static super switch this throw try typeof var void while with yield async await get set".split(" "));
  var JS_LIT = new Set("null undefined true false NaN Infinity".split(" "));
  var JS_BI = new Set("window document console alert prompt confirm print location navigator history localStorage sessionStorage fetch XMLHttpRequest JSON Math Object Array String Number Boolean Promise Date RegExp Error TypeError Map Set WeakMap Symbol BigInt eval atob btoa setTimeout setInterval clearTimeout clearInterval requestAnimationFrame parseInt parseFloat isNaN decodeURIComponent encodeURIComponent decodeURI encodeURI escape unescape globalThis self top parent opener frames require module exports process Buffer URL URLSearchParams Blob File FileReader FormData Image Event CustomEvent HTMLElement Element Node DOMParser MutationObserver TextEncoder TextDecoder Uint8Array ArrayBuffer Reflect Proxy crypto structuredClone queueMicrotask".split(" "));
  var JS_RE = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*|`(?:\\[\s\S]|[^`\\])*`?|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?|\b0[xX][0-9a-fA-F]+n?\b|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?n?\b|[A-Za-z_$][\w$]*|=>|[=!]==?|&&|\|\||\?\?)/g;
  function hlJS(code) {
    var out = "", last = 0;
    code.replace(JS_RE, function (m, _g, off) {
      out += esc(code.slice(last, off));
      var c = "";
      if (m.slice(0, 2) === "/*" || m.slice(0, 2) === "//") c = "com";
      else if (m[0] === '"' || m[0] === "'" || m[0] === "`") c = "str";
      else if (/^\d/.test(m)) c = "num";
      else if (/^[=!&|?]/.test(m)) c = "op";
      else if (JS_KW.has(m)) c = "kw";
      else if (JS_LIT.has(m)) c = "num";
      else if (JS_BI.has(m)) c = "builtin";
      else if (/^\s*\(/.test(code.slice(off + m.length, off + m.length + 3))) c = "fn";
      else if (off > 0 && code[off - 1] === ".") c = "prop";
      out += c ? span(c, esc(m)) : esc(m);
      last = off + m.length;
      return m;
    });
    return out + esc(code.slice(last));
  }
  var CSS_RE = /(\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|@[\w-]+|#[0-9a-fA-F]{3,8}\b|-?(?:\d*\.)?\d+(?:%|[a-zA-Z]+)?|!important|[{};:(),]|--[\w-]+|[\w-]+)/g;
  function hlCSS(code) {
    var out = "", last = 0, depth = 0, inVal = false, parenD = 0;
    code.replace(CSS_RE, function (m, _g, off) {
      var gap = code.slice(last, off);
      out += depth === 0 && !/^\s*$/.test(gap) ? span("sel", esc(gap)) : esc(gap);
      var c = "";
      if (m.slice(0, 2) === "/*") c = "com";
      else if (m[0] === '"' || m[0] === "'") c = "str";
      else if (m[0] === "@") c = "kw";
      else if (m === "{") { depth++; inVal = false; c = "punc"; }
      else if (m === "}") { depth = Math.max(0, depth - 1); inVal = false; c = "punc"; }
      else if (m === ";") { inVal = false; c = "punc"; }
      else if (m === "(") { parenD++; }
      else if (m === ")") { parenD = Math.max(0, parenD - 1); }
      else if (m === ":") { if (depth > 0 && !inVal && parenD === 0) { inVal = true; c = "punc"; } else c = depth === 0 ? "sel" : ""; }
      else if (depth === 0) c = "sel";
      else if (!inVal) c = m === "," ? "" : "prop";
      else if (m === "!important") c = "kw";
      else if (m[0] === "#" || /^-?(?:\d*\.)?\d/.test(m)) c = "num";
      else if (/^--/.test(m)) c = "prop";
      else if (/^\s*\(/.test(code.slice(off + m.length, off + m.length + 2))) c = "fn";
      else c = "val";
      out += c ? span(c, esc(m)) : esc(m);
      last = off + m.length;
      return m;
    });
    var tail = code.slice(last);
    return out + (depth === 0 && tail.trim() ? span("sel", esc(tail)) : esc(tail));
  }
  function hlHTML(s) {
    var out = "", i = 0, n = s.length, m, e;
    while (i < n) {
      if (s.startsWith("<!--", i)) {
        e = s.indexOf("-->", i + 4); e = e < 0 ? n : e + 3;
        out += span("com", esc(s.slice(i, e))); i = e; continue;
      }
      if (s[i] === "<" && (s[i + 1] === "!" || s[i + 1] === "?")) {
        e = s.indexOf(">", i); e = e < 0 ? n : e + 1;
        out += span("doc", esc(s.slice(i, e))); i = e; continue;
      }
      if (s[i] === "<" && /[A-Za-z\/]/.test(s[i + 1] || "") && (m = /^<\/?[A-Za-z][^\s\/>]*/.exec(s.slice(i, i + 64)))) {
        var closing = m[0][1] === "/", name = m[0].replace(/^<\/?/, "");
        out += span("punc", closing ? "&lt;/" : "&lt;") + span("tag", esc(name));
        i += m[0].length;
        while (i < n && s[i] !== ">") {
          var rest = s.slice(i, i + 4000);
          if ((m = /^\s+/.exec(rest))) { out += m[0]; i += m[0].length; continue; }
          if (s[i] === "/") { out += span("punc", "/"); i++; continue; }
          if ((m = /^[^\s\/>=]+/.exec(rest))) {
            out += span("attr", esc(m[0])); i += m[0].length;
            var eq = /^\s*=\s*/.exec(s.slice(i, i + 200));
            if (eq) {
              out += span("punc", eq[0]); i += eq[0].length;
              if (s[i] === '"' || s[i] === "'") {
                e = s.indexOf(s[i], i + 1); e = e < 0 ? n : e + 1;
                out += span("str", entText(s.slice(i, e))); i = e;
              } else if ((m = /^[^\s>]+/.exec(s.slice(i, i + 4000)))) { out += span("str", entText(m[0])); i += m[0].length; }
            }
            continue;
          }
          out += esc(s[i]); i++;
        }
        if (i < n) { out += span("punc", "&gt;"); i++; }
        var low = name.toLowerCase();
        if (!closing && /^(script|style|textarea|title|xmp|noembed|noframes|iframe|plaintext)$/.test(low)) {
          var em = new RegExp("</" + low + "[\\s/>]", "i").exec(s.slice(i));
          var e2 = low === "plaintext" ? n : em ? i + em.index : n;
          var body = s.slice(i, e2);
          out += low === "script" ? hlJS(body) : low === "style" ? hlCSS(body) : low === "textarea" || low === "title" ? entText(body) : esc(body);
          i = e2;
        }
        continue;
      }
      e = s.indexOf("<", i + 1); if (e < 0) e = n;
      out += entText(s.slice(i, e)); i = e;
    }
    return out;
  }
  function hlHTTP(s) {
    var parts = s.split(/\r?\n\r?\n/), head = parts.shift(), body = parts.join("\n\n");
    var lines = head.split(/\r?\n/);
    var out = lines.map(function (l, k) {
      if (k === 0) {
        var m = /^([A-Z]+)(\s+)(\S+)(.*)$/.exec(l);
        if (m && !/^HTTP\//.test(m[1])) return span("kw", esc(m[1])) + m[2] + span("str", esc(m[3])) + span("com", esc(m[4]));
        m = /^(HTTP\/[\d.]+)(\s+)(\d{3})(.*)$/.exec(l);
        if (m) return span("com", esc(m[1])) + m[2] + span("num", esc(m[3])) + span("kw", esc(m[4]));
        return esc(l);
      }
      var h = /^([\w-]+)(:)(.*)$/.exec(l);
      return h ? span("attr", esc(h[1])) + span("punc", ":") + span("val", esc(h[3])) : esc(l);
    }).join("\n");
    if (parts.length || body) out += "\n\n" + (/^\s*</.test(body) ? hlHTML(body) : /^\s*[{\[]/.test(body) ? hlJS(body) : esc(body));
    return out;
  }
  WM.highlight = function (code, lang) {
    lang = (lang || "html").toLowerCase();
    if (lang === "html" || lang === "svg" || lang === "xml" || lang === "hta") return hlHTML(code);
    if (lang === "css") return hlCSS(code);
    if (lang === "js" || lang === "javascript" || lang === "json") return hlJS(code);
    if (lang === "http") return hlHTTP(code);
    return esc(code);
  };

  /* ---------------- DOM serializer (also injected into the sandbox) ---------------- */
  function SER(root, max) {
    var count = 0, NS = { "http://www.w3.org/2000/svg": "svg", "http://www.w3.org/1998/Math/MathML": "math" };
    function walk(n) {
      if (++count > max) return null;
      var t = n.nodeType, o = { t: t }, kids = null, i;
      if (t === 1) {
        o.n = n.localName;
        if (NS[n.namespaceURI]) o.ns = NS[n.namespaceURI];
        o.a = [];
        for (i = 0; i < n.attributes.length; i++) {
          var at = n.attributes[i], v = at.value;
          if (at.name === "http-equiv" && v === "x-wm-refresh") v = "refresh";
          o.a.push([at.name, v]);
        }
        if (n.localName === "template" && n.content) { o.frag = 1; kids = n.content.childNodes; } else kids = n.childNodes;
      } else if (t === 3 || t === 4 || t === 8) o.v = n.nodeValue;
      else if (t === 7) { o.n = n.target; o.v = n.nodeValue; }
      else if (t === 10) { o.n = n.name; o.pub = n.publicId; o.sys = n.systemId; }
      else if (t === 9 || t === 11) kids = n.childNodes;
      if (kids) {
        o.c = [];
        for (i = 0; i < kids.length; i++) { var k = walk(kids[i]); if (!k) { o.more = 1; break; } o.c.push(k); }
      }
      return o;
    }
    return walk(root);
  }
  WM.serialize = function (node, max) { return SER(node, max || 4000); };

  var VOID = new Set("area base br col embed hr img input link meta source track wbr".split(" "));
  WM.VOID = VOID;
  function wsVis(v) { return esc(v).replace(/\n/g, "⏎").replace(/\t/g, "⇥").replace(/ /g, "·"); }
  WM.renderTree = function (o, opts) {
    opts = opts || {};
    var hideWS = !!opts.hideWS, out = [];
    function line(cls, html) { return '<div class="dt-l ' + cls + '">' + html + "</div>"; }
    function attrs(a) {
      return a.map(function (p) { return ' <span class="dt-an">' + esc(p[0]) + '</span>=<span class="dt-av">"' + esc(p[1]) + '"</span>'; }).join("");
    }
    function node(n, depth) {
      if (n.t === 3) {
        if (/^[\s]*$/.test(n.v)) return hideWS ? "" : line("dt-text dt-ws", '<span class="dt-k">#text</span> <span class="dt-wsv">' + wsVis(n.v) + "</span>");
        return line("dt-text", '<span class="dt-k">#text</span> <span class="dt-tx">"' + esc(n.v.length > 600 ? n.v.slice(0, 600) + "…" : n.v) + '"</span>');
      }
      if (n.t === 8) return line("dt-cm", "&lt;!--" + esc(n.v) + "--&gt;");
      if (n.t === 4) return line("dt-cm", "&lt;![CDATA[" + esc(n.v) + "]]&gt;");
      if (n.t === 7) return line("dt-cm", "&lt;?" + esc(n.n + " " + n.v) + "&gt;");
      if (n.t === 10) return line("dt-doc", "&lt;!DOCTYPE " + esc(n.n) + (n.pub ? ' PUBLIC "' + esc(n.pub) + '"' : "") + (n.sys ? ' "' + esc(n.sys) + '"' : "") + "&gt;");
      if (n.t === 9 || n.t === 11) {
        return '<div class="dt-root"><div class="dt-l dt-k">' + (n.t === 9 ? "#document" : "#document-fragment") + "</div>" + kids(n, depth) + "</div>";
      }
      var badge = n.ns ? ' <span class="dt-ns">' + n.ns + "</span>" : "";
      var open = '<span class="dt-tag">&lt;' + esc(n.n) + "</span>" + attrs(n.a) + '<span class="dt-tag">&gt;</span>' + badge;
      var hasKids = n.c && n.c.some(function (k) { return !(hideWS && k.t === 3 && /^\s*$/.test(k.v)); });
      if (!hasKids && !n.frag) {
        var close = VOID.has(n.n) && !n.ns ? "" : '<span class="dt-tag">&lt;/' + esc(n.n) + "&gt;</span>";
        return line("dt-el", open + close);
      }
      var body = n.frag ? '<div class="dt-kids"><div class="dt-l dt-k">#document-fragment <small>(template.content)</small></div>' + kids(n, depth + 1) + "</div>" : kids(n, depth);
      return '<details class="dt-el"' + (depth < (opts.openDepth || 8) ? " open" : "") + "><summary>" + open + "</summary>" + body + '<div class="dt-l dt-end"><span class="dt-tag">&lt;/' + esc(n.n) + "&gt;</span></div></details>";
    }
    function kids(n, depth) {
      return '<div class="dt-kids">' + (n.c || []).map(function (k) { return node(k, depth + 1); }).join("") + (n.more ? '<div class="dt-l dt-k">… (اتقطع: عدد nodes كبير)</div>' : "") + "</div>";
    }
    out.push(node(o, 0));
    return '<div class="dtree" dir="ltr">' + out.join("") + "</div>";
  };
  WM.parseHTML = function (src) { return new DOMParser().parseFromString(src, "text/html"); };

  /* ---------------- the sandbox hook (runs INSIDE the iframe) ---------------- */
  function HOOK(CFG, SER) {
    var TOK = CFG.tok, P = window.parent, W = window, D = document;
    var me = D.currentScript, csp = D.getElementById("__wm_csp");
    var EVAL = W.eval;
    function send(type, data) { try { P.postMessage({ __wm: TOK, type: type, data: data }, "*"); } catch (e) { /* uncloneable */ try { P.postMessage({ __wm: TOK, type: type, data: JSON.parse(JSON.stringify(data)) }, "*"); } catch (e2) {} } }
    function fmt(v) {
      try {
        if (typeof v === "string") return v;
        if (v === undefined) return "undefined";
        if (typeof v === "function") return "ƒ " + (v.name || "anonymous") + "()";
        if (typeof v === "symbol" || typeof v === "bigint") return String(v) + (typeof v === "bigint" ? "n" : "");
        if (v instanceof Error) return v.name + ": " + v.message;
        if (v && v.nodeType === 1) return "<" + v.localName + Array.prototype.map.call(v.attributes, function (a) { return " " + a.name + '="' + a.value + '"'; }).join("") + ">";
        if (v && v.nodeType) return v.nodeName;
        var seen = [];
        var s = JSON.stringify(v, function (k, x) { if (typeof x === "object" && x) { if (seen.indexOf(x) >= 0) return "[Circular]"; seen.push(x); } if (typeof x === "function") return "ƒ " + (x.name || "") + "()"; if (x === undefined) return "undefined"; return x; });
        return s === undefined ? String(v) : s;
      } catch (e) { return String(v); }
    }
    ["log", "info", "warn", "error", "debug", "table", "dir"].forEach(function (k) {
      var o = console[k];
      console[k] = function () { send("console", { level: k === "table" || k === "dir" ? "log" : k, args: Array.prototype.map.call(arguments, fmt) }); try { o.apply(console, arguments); } catch (e) {} };
    });
    W.addEventListener("error", function (e) {
      if (e.target && e.target !== W && e.target.nodeType === 1) return;
      send("console", { level: "error", args: [String(e.message || "Error") + (e.lineno ? "  (line " + e.lineno + ")" : "")] });
    });
    W.addEventListener("unhandledrejection", function (e) { send("console", { level: "error", args: ["Uncaught (in promise) " + fmt(e.reason)] }); });
    W.alert = function (m) { send("alert", { kind: "alert", msg: m === undefined ? "" : fmt(m) }); };
    W.confirm = function (m) { send("alert", { kind: "confirm", msg: m === undefined ? "" : fmt(m) }); return true; };
    W.prompt = function (m, d) { send("alert", { kind: "prompt", msg: m === undefined ? "" : fmt(m) }); return d == null ? "" : String(d); };
    W.print = function () { send("alert", { kind: "print", msg: "" }); };

    /* storage + cookies: an opaque-origin sandbox has none, so simulate them in memory */
    function mkStore() {
      var m = new Map();
      return { getItem: function (k) { k = String(k); return m.has(k) ? m.get(k) : null; }, setItem: function (k, v) { m.set(String(k), String(v)); }, removeItem: function (k) { m.delete(String(k)); }, clear: function () { m.clear(); }, key: function (i) { return Array.from(m.keys())[i] || null; }, get length() { return m.size; } };
    }
    ["localStorage", "sessionStorage"].forEach(function (k) { try { void W[k]; } catch (e) { try { Object.defineProperty(W, k, { value: mkStore(), configurable: true }); } catch (e2) {} } });
    var JAR = (CFG.cookies || []).map(function (c) { return { n: c.name, v: c.value, http: !!c.httpOnly }; });
    try { void D.cookie; } catch (e) {
      try {
        Object.defineProperty(D, "cookie", {
          configurable: true,
          get: function () { return JAR.filter(function (c) { return !c.http; }).map(function (c) { return c.n ? c.n + "=" + c.v : c.v; }).join("; "); },
          set: function (str) {
            str = String(str);
            if (CFG.mode === "analysis") send("sink", { sink: "document.cookie =", v: str });
            var parts = str.split(";"), nv = parts.shift(), eqi = nv.indexOf("=");
            var name = eqi < 0 ? "" : nv.slice(0, eqi).trim(), val = eqi < 0 ? nv.trim() : nv.slice(eqi + 1).trim();
            var attrs = parts.map(function (p) { return p.trim().toLowerCase(); });
            if (attrs.some(function (a) { return a === "httponly"; })) return;           // JS can't set HttpOnly cookies
            var del = attrs.some(function (a) { return /^max-age=\s*-?0*$/.test(a) || /^max-age=\s*-/.test(a); }) || attrs.some(function (a) { return /^expires=/.test(a) && Date.parse(a.slice(8)) < Date.now(); });
            var i = JAR.findIndex(function (c) { return c.n === name; });
            if (i >= 0 && JAR[i].http) return;                                            // can't overwrite an HttpOnly cookie from JS
            if (del) { if (i >= 0) JAR.splice(i, 1); return; }
            if (i >= 0) JAR[i].v = val; else JAR.push({ n: name, v: val, http: false });
          }
        });
      } catch (e2) {}
    }

    /* ---- URL helpers: resolve against the simulated page URL (+ the first <base href>) ---- */
    var PAGE = CFG.pageURL || "https://victim.example/";
    function baseURL() {
      var b = D.querySelector("base[href]");
      if (b) { try { return new URL(b.getAttribute("href"), PAGE).href; } catch (e) {} }
      return PAGE;
    }
    function resolve(u) { try { return new URL(u, baseURL()).href; } catch (e) { return null; } }
    function docPolicy() {
      var ok = /^(no-referrer|no-referrer-when-downgrade|same-origin|origin|strict-origin|origin-when-cross-origin|strict-origin-when-cross-origin|unsafe-url)$/, pol = "";
      Array.prototype.forEach.call(D.querySelectorAll('meta[name="referrer" i]'), function (m) { var c = (m.getAttribute("content") || "").trim().toLowerCase(); if (ok.test(c)) pol = c; });
      return pol;
    }
    function referrer(policy, from, to) {
      try {
        var F = new URL(from), T = new URL(to);
        if (!/^https?:$/.test(T.protocol)) return null;
        F.hash = ""; F.username = ""; F.password = "";
        var full = F.href, origin = F.origin + "/", same = F.origin === T.origin, down = F.protocol === "https:" && T.protocol !== "https:";
        switch (policy) {
          case "no-referrer": return null;
          case "no-referrer-when-downgrade": return down ? null : full;
          case "same-origin": return same ? full : null;
          case "origin": return origin;
          case "strict-origin": return down ? null : origin;
          case "origin-when-cross-origin": return same ? full : origin;
          case "unsafe-url": return full;
          default: return same ? full : down ? null : origin;
        }
      } catch (e) { return null; }
    }
    function elPolicy(el) {
      var rel = (el.getAttribute("rel") || "").toLowerCase().split(/\s+/);
      if (rel.indexOf("noreferrer") >= 0) return "no-referrer";
      var rp = (el.getAttribute("referrerpolicy") || "").trim().toLowerCase();
      return rp || docPolicy();
    }
    function isJS(u) { try { return new URL(u, PAGE).protocol === "javascript:"; } catch (e) { return false; } }
    // Chrome refuses javascript: navigations inside sandboxed srcdoc frames, so run them the way a normal
    // page would: URL-parse (drops tabs/newlines), strip the scheme, percent-decode, evaluate globally.
    function pctDecode(s) {
      var bytes = [], i = 0, enc = new TextEncoder();
      while (i < s.length) {
        if (s[i] === "%" && /^[0-9a-fA-F]{2}$/.test(s.substr(i + 1, 2))) { bytes.push(parseInt(s.substr(i + 1, 2), 16)); i += 3; }
        else { var cp = s.codePointAt(i), ch = String.fromCodePoint(cp); enc.encode(ch).forEach(function (b) { bytes.push(b); }); i += ch.length; }
      }
      return new TextDecoder().decode(new Uint8Array(bytes));
    }
    function runJS(u) {
      var code;
      try { code = pctDecode(new URL(u, PAGE).href.slice("javascript:".length)); } catch (e) { return; }
      setTimeout(function () {
        try { var r = EVAL(code); if (typeof r === "string") { D.open(); D.write(r); D.close(); } }
        catch (x) { send("console", { level: "error", args: ["Uncaught " + fmt(x) + "  (javascript: URL)"] }); }
      }, 0);
    }

    /* ---- links ---- */
    function linkNav(a, how) {
      var raw = a.getAttribute("href"), url = resolve(raw);
      var target = (a.getAttribute("target") || "").trim(), rel = (a.getAttribute("rel") || "").toLowerCase();
      var ref = url ? referrer(elPolicy(a), PAGE, url) : null;
      send("nav", { kind: a.hasAttribute("download") ? "download" : "link", raw: raw, url: url, target: target, rel: rel, download: a.hasAttribute("download") ? a.getAttribute("download") : null, ref: ref, how: how || "click", ping: a.getAttribute("ping") || "" });
    }
    function scrollToFrag(raw) {
      var id = decodeURIComponent(raw.slice(1));
      if (!id || id.toLowerCase() === "top") { W.scrollTo(0, 0); return true; }
      var el = D.getElementById(id) || D.getElementsByName(id)[0];
      if (el) el.scrollIntoView({ block: "start" });
      return !!el;
    }
    D.addEventListener("click", function (e) {
      if (e.defaultPrevented) return;
      var a = e.target && e.target.closest && e.target.closest("a[href], area[href]");
      if (!a) return;
      var raw = a.getAttribute("href");
      if (isJS(raw)) { e.preventDefault(); send("nav", { kind: "javascript", raw: raw }); runJS(raw); return; }
      e.preventDefault();
      if (/^\s*#/.test(raw)) { var found = scrollToFrag(raw.trim()); send("nav", { kind: "fragment", raw: raw, found: found }); return; }
      linkNav(a);
    });
    var oclick = HTMLElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { if (!this.isConnected && this.hasAttribute("href") && !isJS(this.getAttribute("href"))) { linkNav(this, "a.click()"); return; } return oclick.call(this); };
    W.open = function (u, t) {
      if (u && isJS(String(u))) { send("nav", { kind: "javascript", raw: String(u) }); runJS(String(u)); return null; }
      send("nav", { kind: "open", raw: u === undefined ? "" : String(u), url: u ? resolve(String(u)) : "about:blank", target: t ? String(t) : "_blank" }); return null;
    };

    /* ---- forms → exact HTTP request ---- */
    function utf8len(s) { return new TextEncoder().encode(s).length; }
    function mpName(s) { return String(s).replace(/"/g, "%22").replace(/\r/g, "%0D").replace(/\n/g, "%0A"); }
    function describeForm(form, sub, how) {
      var method = sub && sub.hasAttribute("formmethod") ? sub.formMethod : form.method;
      var enctype = sub && sub.hasAttribute("formenctype") ? sub.formEnctype : form.enctype;
      var target = sub && sub.hasAttribute("formtarget") ? sub.getAttribute("formtarget") : form.getAttribute("target") || "";
      var rawAction = sub && sub.hasAttribute("formaction") ? sub.getAttribute("formaction") : form.getAttribute("action");
      var action = rawAction == null || rawAction === "" ? PAGE : resolve(rawAction);
      var fd;
      try { fd = sub ? new FormData(form, sub) : new FormData(form); } catch (e) { fd = new FormData(form); if (sub && sub.name) fd.append(sub.name, sub.value); }
      var entries = [];
      fd.forEach(function (v, k) { entries.push([k, v]); });
      var shown = entries.map(function (p) { return [p[0], typeof p[1] === "string" ? p[1] : { file: p[1].name, type: p[1].type || "application/octet-stream", size: p[1].size }]; });
      var R = { method: method, enctype: enctype, rawAction: rawAction, url: action, target: target, entries: shown, how: how };
      if (method === "dialog") return R;
      var U;
      try { U = new URL(action); } catch (e) { R.text = "(invalid action URL)"; return R; }
      R.scheme = U.protocol;
      var nl = function (s) { return String(s).replace(/\r\n|\r|\n/g, "\r\n"); };   // line breaks are normalized to CRLF on submit
      entries = entries.map(function (p) { return [nl(p[0]), typeof p[1] === "string" ? nl(p[1]) : p[1]]; });
      var plain = entries.map(function (p) { return [p[0], typeof p[1] === "string" ? p[1] : p[1].name]; });
      var urlenc = new URLSearchParams(plain).toString();
      var lines = [], body = "", ctype = "", reqTarget = U.pathname + U.search;
      if (method === "get") {
        if (/^https?:$/.test(U.protocol)) {
          // "mutate action URL": the form data REPLACES the action's query (the fragment is kept, but never sent)
          R.url = U.href.replace(/[?#][\s\S]*$/, "") + "?" + urlenc + U.hash;
          reqTarget = U.pathname + "?" + urlenc;
        } else if (U.protocol === "mailto:") { U.search = urlenc.replace(/\+/g, "%20"); R.url = U.href; }
        else R.url = U.href;
      } else {
        if (enctype === "multipart/form-data") {
          var bnd = "----WebKitFormBoundary" + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
          ctype = "multipart/form-data; boundary=" + bnd;
          entries.forEach(function (p) {
            body += "--" + bnd + "\r\n";
            if (typeof p[1] === "string") body += 'Content-Disposition: form-data; name="' + mpName(p[0]) + '"\r\n\r\n' + p[1] + "\r\n";
            else body += 'Content-Disposition: form-data; name="' + mpName(p[0]) + '"; filename="' + mpName(p[1].name) + '"\r\nContent-Type: ' + (p[1].type || "application/octet-stream") + "\r\n\r\n<" + p[1].size + " bytes of " + (p[1].name || "empty file") + ">\r\n";
          });
          body += "--" + bnd + "--\r\n";
        } else if (enctype === "text/plain") {
          ctype = "text/plain";
          body = plain.map(function (p) { return p[0] + "=" + p[1] + "\r\n"; }).join("");
        } else { ctype = "application/x-www-form-urlencoded"; body = urlenc; }
      }
      if (!/^https?:$/.test(U.protocol)) { R.text = method.toUpperCase() + " → " + R.url + (body ? "\n\n" + body : ""); return R; }
      var pageO = new URL(PAGE).origin;
      R.cross = U.origin !== pageO;
      lines.push(method.toUpperCase() + " " + reqTarget + " HTTP/1.1");
      lines.push("Host: " + U.host);
      if (method === "post") { lines.push("Content-Type: " + ctype); lines.push("Content-Length: " + utf8len(body)); lines.push("Origin: " + pageO); }
      var rel = (form.getAttribute("rel") || "").toLowerCase().split(/\s+/);
      var ref = referrer(rel.indexOf("noreferrer") >= 0 ? "no-referrer" : docPolicy(), PAGE, U.href);
      if (ref) lines.push("Referer: " + ref);
      R.text = lines.join("\n") + "\n\n" + body.replace(/\r\n/g, "\n");
      return R;
    }
    W.addEventListener("submit", function (e) {
      if (e.defaultPrevented) return;
      var form = e.target, sub = e.submitter || null;
      var R = describeForm(form, sub, "submit");
      if (R.method === "dialog") { send("submit", R); return; }               // let <form method=dialog> close its dialog
      e.preventDefault();
      if (isJS(R.rawAction || "")) { send("nav", { kind: "javascript", raw: R.rawAction }); runJS(R.rawAction); return; }
      send("submit", R);
    });
    HTMLFormElement.prototype.submit = function () {
      var R = describeForm(this, null, "form.submit() — بدون validation وبدون submit event");
      if (isJS(R.rawAction || "")) { send("nav", { kind: "javascript", raw: R.rawAction }); runJS(R.rawAction); return; }
      send("submit", R);
    };
    D.addEventListener("invalid", function (e) {
      var el = e.target;
      send("invalid", { field: el.name || el.id || el.localName, type: el.type || el.localName, msg: el.validationMessage, value: el.value });
    }, true);

    /* ---- analysis mode: log every dangerous sink (no network: CSP default-src 'none') ---- */
    if (CFG.mode === "analysis") {
      var sink = function (name, v) { send("sink", { sink: name, v: String(v).slice(0, 30000) }); };
      var dw = D.write.bind(D), dwl = D.writeln.bind(D);
      D.write = function () { var s = Array.prototype.join.call(arguments, ""); sink("document.write", s); if (CFG.pass) dw(s); };
      D.writeln = function () { var s = Array.prototype.join.call(arguments, ""); sink("document.writeln", s); if (CFG.pass) dwl(s); };
      W.eval = function (s) { sink("eval", s); return EVAL(s); };
      var OF = W.Function, NF = function () { sink("new Function", Array.prototype.join.call(arguments, " , ")); return OF.apply(this, arguments); };
      NF.prototype = OF.prototype; W.Function = NF;
      var ost = W.setTimeout, osi = W.setInterval;
      W.setTimeout = function (f) { if (typeof f === "string") sink("setTimeout(string)", f); return ost.apply(W, arguments); };
      W.setInterval = function (f) { if (typeof f === "string") sink("setInterval(string)", f); return osi.apply(W, arguments); };
      var oatob = W.atob; W.atob = function (s) { var r = oatob(s); sink("atob → decoded", r); return r; };
      var oun = W.unescape; W.unescape = function (s) { var r = oun(s); sink("unescape → decoded", r); return r; };
      var ofcc = String.fromCharCode; String.fromCharCode = function () { var r = ofcc.apply(String, arguments); if (r.length >= 8) sink("String.fromCharCode", r); return r; };
      W.fetch = function (u, o) { sink("fetch (blocked)", (o && o.method ? o.method + " " : "GET ") + (u && u.url ? u.url : String(u)) + (o && o.body ? "\nbody: " + String(o.body) : "")); return Promise.reject(new TypeError("network disabled in analysis sandbox")); };
      var XO = XMLHttpRequest.prototype.open, XS = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function (m, u) { this.__wm = String(m).toUpperCase() + " " + resolve(String(u)); return XO.apply(this, arguments); };
      XMLHttpRequest.prototype.send = function (b) { sink("XMLHttpRequest (blocked)", (this.__wm || "?") + (b != null ? "\nbody: " + String(b) : "")); };
      if (navigator.sendBeacon) navigator.sendBeacon = function (u, d) { sink("sendBeacon (blocked)", resolve(String(u)) + (d != null ? "\nbody: " + String(d) : "")); return true; };
      W.WebSocket = function (u) { sink("WebSocket (blocked)", String(u)); this.send = function (d) { sink("WebSocket.send", String(d)); }; this.close = function () {}; };
      var hook = function (proto, prop, label, forward) {
        var d = Object.getOwnPropertyDescriptor(proto, prop); if (!d || !d.set) return;
        Object.defineProperty(proto, prop, { configurable: true, enumerable: d.enumerable, get: d.get, set: function (v) { sink(label, v); if (forward) d.set.call(this, v); } });
      };
      hook(HTMLImageElement.prototype, "src", "img.src (blocked)", false);
      hook(HTMLScriptElement.prototype, "src", "script.src (blocked)", false);
      hook(HTMLIFrameElement.prototype, "src", "iframe.src (blocked)", false);
      hook(Element.prototype, "innerHTML", "innerHTML =", true);
      hook(Element.prototype, "outerHTML", "outerHTML =", true);
      var oiah = Element.prototype.insertAdjacentHTML;
      Element.prototype.insertAdjacentHTML = function (p, h) { sink("insertAdjacentHTML", h); return oiah.call(this, p, h); };
      var ocou = URL.createObjectURL;
      URL.createObjectURL = function (b) {
        var u = ocou.call(URL, b);
        if (b && typeof b.size === "number") {
          var head = "Blob → type=" + (b.type || "(none)") + " size=" + b.size + " bytes";
          if (b.slice && b.slice(0, 1).text) b.slice(0, 6000).text().then(function (t) { sink("URL.createObjectURL", head + "\n" + t); }, function () { sink("URL.createObjectURL", head); });
          else sink("URL.createObjectURL", head);
        }
        return u;
      };
      navigator.msSaveOrOpenBlob = function (b, name) { sink("msSaveOrOpenBlob", "file name: " + name + " (" + (b && b.size) + " bytes)"); return true; };
    }

    /* ---- parent commands ---- */
    W.addEventListener("message", function (e) {
      if (e.source !== P) return;
      var d = e.data;
      if (!d || d.__wm !== TOK || !d.cmd) return;
      if (d.cmd === "tree") send("tree", { id: d.id, tree: SER(D, 4000) });
      else if (d.cmd === "eval") {
        var ok = false, err = null;
        try { ok = !!EVAL(d.expr); } catch (x) { err = String(x && x.message ? x.message : x); }
        send("eval", { id: d.id, ok: ok, err: err });
      } else if (d.cmd === "click") { var el = D.querySelector(d.sel); if (el) el.click(); send("clicked", { id: d.id, found: !!el }); }
    });
    var lastH = -1;
    function size() {
      var de = D.documentElement, b = D.body;
      var h = Math.ceil(Math.max(de ? de.scrollHeight : 0, b ? b.scrollHeight : 0, b ? b.getBoundingClientRect().bottom + 8 : 0));
      if (h > 0 && h !== lastH) { lastH = h; send("size", h); }
    }
    D.addEventListener("DOMContentLoaded", function () {
      Array.prototype.forEach.call(D.querySelectorAll('meta[http-equiv="x-wm-refresh"]'), function (m) {
        var c = m.getAttribute("content") || "", mm = /^\s*(\d+(?:\.\d*)?)?\s*[;,]?\s*(?:url\s*=\s*)?(['"]?)(.*?)\2\s*$/i.exec(c);
        send("nav", { kind: "refresh", raw: c, delay: mm && mm[1] ? mm[1] : "0", url: mm && mm[3] ? resolve(mm[3]) : PAGE });
      });
      size();
    });
    W.addEventListener("load", function () {
      size();
      try { new ResizeObserver(size).observe(D.documentElement); } catch (e) {}
      setTimeout(size, 150); setTimeout(size, 900);
      send("ready", { mode: D.compatMode, title: D.title, charset: D.characterSet });
    });
    if (me) me.remove();
    if (csp) csp.remove();
  }
  var ANALYSIS_CSP = "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:";
  function hookSource(cfg) {
    var json = JSON.stringify(cfg).replace(/</g, "\\u003c");
    return "(" + HOOK.toString() + ")(" + json + "," + SER.toString() + ");";
  }
  WM.buildDoc = function (src, cfg) {
    src = String(src).replace(/(<meta\b[^>]*?\bhttp-equiv\s*=\s*)(["']?)\s*refresh\s*\2/gi, "$1$2x-wm-refresh$2");
    var head = "";
    if (cfg.mode === "analysis") head += '<meta http-equiv="Content-Security-Policy" content="' + ANALYSIS_CSP + '" id="__wm_csp">';
    else if (cfg.mode === "xss") head += '<meta http-equiv="Content-Security-Policy" content="img-src data: blob:" id="__wm_csp">';
    head += '<script id="__wm_hook">' + hookSource(cfg).replace(/<\/(script)/gi, "<\\/$1") + "<\/script>";
    var m = /^\uFEFF?(\s*(?:<!--[\s\S]*?-->\s*)*<!doctype[^>]*>)/i.exec(src);
    return m ? m[1] + head + src.slice(m[1].length) : head + src;
  };
  WM.combine = function (files) {
    var html = files.html || "", css = files.css || "", js = files.js || "";
    if (css.trim()) {
      var st = "<style>\n" + css + "\n</style>\n";
      html = /<\/head\s*>/i.test(html) ? html.replace(/<\/head\s*>/i, st + "</head>") : st + html;
    }
    if (js.trim()) {
      var sc = "<script>\n" + js.replace(/<\/(script)/gi, "<\\/$1") + "\n<\/script>\n";
      html = /<\/body\s*>/i.test(html) ? html.replace(/<\/body\s*>(?![\s\S]*<\/body)/i, sc + "</body>") : html + "\n" + sc;
    }
    return html;
  };

  /* ---------------- event views (shared by inline previews and the playground) ---------------- */
  var LEVEL_ICON = { log: "›", info: "ℹ", warn: "⚠", error: "✖", debug: "·" };
  WM.eventView = function (type, d) {
    var el = document.createElement("div");
    el.className = "ev ev-" + type + (type === "console" ? " ev-" + d.level : "");
    var h = "";
    if (type === "console") h = '<span class="ev-i">' + (LEVEL_ICON[d.level] || "›") + '</span><code dir="ltr">' + esc(d.args.join(" ")) + "</code>";
    else if (type === "alert") h = '<span class="ev-i">🚨</span><b>' + esc(d.kind) + "()</b> اتنفّذ" + (d.msg !== "" ? ' — <code dir="ltr">' + esc(d.msg) + "</code>" : "");
    else if (type === "invalid") h = '<span class="ev-i">⛔</span>الـ validation منعت الإرسال: <code dir="ltr">' + esc(d.field) + "</code> — " + esc(d.msg || "invalid");
    else if (type === "sink") h = '<span class="ev-i">🧪</span><b dir="ltr">' + esc(d.sink) + '</b><pre dir="ltr">' + esc(d.v) + "</pre>";
    else if (type === "nav") {
      if (d.kind === "fragment") h = '<span class="ev-i">⚓</span>انتقال داخل نفس الصفحة: <code dir="ltr">' + esc(d.raw) + "</code>" + (d.found ? "" : " — <b>مفيش عنصر بالـ id ده</b>");
      else if (d.kind === "javascript") h = '<span class="ev-i">⚡</span>رابط <code dir="ltr">javascript:</code> اتنفّذ كـ script: <code dir="ltr">' + esc(d.raw) + "</code>";
      else if (d.kind === "refresh") h = '<span class="ev-i">⏱️</span><b>meta refresh</b>: الصفحة كانت هتتحوّل بعد ' + esc(d.delay) + ' ثانية لـ <code dir="ltr">' + esc(d.url) + "</code>";
      else if (d.kind === "open") h = '<span class="ev-i">🪟</span><code dir="ltr">window.open</code> → <code dir="ltr">' + esc(d.url || "") + "</code>";
      else {
        var t = d.target && d.target !== "_self" ? " · target=" + esc(d.target) : "";
        h = '<span class="ev-i">' + (d.kind === "download" ? "⬇️" : "🔗") + "</span>" + (d.kind === "download" ? "تحميل ملف" + (d.download ? ' باسم <code dir="ltr">' + esc(d.download) + "</code>" : "") + " من " : "المتصفح كان هيروح لـ ") +
          '<code dir="ltr">' + esc(d.url || d.raw) + "</code>" + t + (d.how && d.how !== "click" ? " · (" + esc(d.how) + ")" : "") +
          '<div class="ev-sub" dir="ltr">GET ' + esc(d.url || "") + (d.ref ? "  ·  Referer: " + esc(d.ref) : "  ·  (no Referer)") + "</div>";
      }
    } else if (type === "submit") {
      if (d.method === "dialog") h = '<span class="ev-i">💬</span>فورم <code>method="dialog"</code>: قفل الـ dialog ومبعتش request';
      else {
        h = '<span class="ev-i">📨</span><b>الفورم اتبعتت</b>: <code dir="ltr">' + esc(d.method.toUpperCase()) + " " + esc(d.url) + "</code>" + (d.cross ? ' <span class="ev-tag">cross-origin</span>' : "") + (d.how && d.how !== "submit" ? ' <span class="ev-tag">' + esc(d.how) + "</span>" : "") +
          '<pre class="ev-http" dir="ltr">' + WM.highlight(d.text || "", "http") + "</pre>";
      }
    } else h = esc(type);
    el.innerHTML = h;
    return el;
  };

  /* ---------------- WM.Preview ---------------- */
  var previews = new Set();
  window.addEventListener("message", function (e) {
    previews.forEach(function (p) { if (p.frame.contentWindow && e.source === p.frame.contentWindow) p._msg(e.data); });
  });
  function Preview(host, opts) {
    opts = opts || {};
    this.opts = opts;
    this.mode = opts.mode || "play";
    this.pageURL = opts.pageURL || "https://victim.example/app/index.html";
    var root = (this.root = document.createElement("div"));
    root.className = "pv" + (opts.cls ? " " + opts.cls : "");
    root.innerHTML = '<div class="pv-bar"><span class="pv-dots"><i></i><i></i><i></i></span><span class="pv-url" dir="ltr"></span><span class="pv-mode" title="document.compatMode"></span><button type="button" class="pv-reload" title="إعادة التشغيل">⟳</button></div><div class="pv-frame"></div>' + (opts.log === false ? "" : '<div class="pv-log" hidden></div>');
    this.urlEl = root.querySelector(".pv-url");
    this.modeEl = root.querySelector(".pv-mode");
    this.logEl = root.querySelector(".pv-log");
    var f = (this.frame = document.createElement("iframe"));
    f.setAttribute("sandbox", "allow-scripts allow-forms" + (opts.modals ? " allow-modals" : ""));
    f.setAttribute("title", opts.title || "معاينة الصفحة (sandbox)");
    f.setAttribute("loading", "eager");
    this.min = opts.min || 70; this.max = opts.max || 460;
    f.style.height = (opts.height || this.min) + "px";
    root.querySelector(".pv-frame").appendChild(f);
    host.appendChild(root);
    var me = this;
    root.querySelector(".pv-reload").addEventListener("click", function () { if (me.src != null) me.run(me.src); });
    this.pending = {};
    previews.add(this);
    this._setURL();
  }
  Preview.prototype._setURL = function () { if (this.urlEl) this.urlEl.textContent = this.pageURL.replace(/^https:\/\//, "🔒 "); };
  Preview.prototype.run = function (src, extra) {
    this.src = src;
    this.tok = WM.uid();
    var cfg = { tok: this.tok, mode: this.mode, pageURL: this.pageURL };
    if (extra) for (var k in extra) cfg[k] = extra[k];
    if (this.opts.cookies) cfg.cookies = this.opts.cookies;
    this.events = [];
    if (this.logEl) { this.logEl.innerHTML = ""; this.logEl.hidden = true; }
    if (this.modeEl) { this.modeEl.textContent = ""; this.modeEl.className = "pv-mode"; }
    if (!this.opts.fixed) this.frame.style.height = (this.opts.height || this.min) + "px";
    var me = this;
    this.ready = new Promise(function (res) { me._ready = res; });
    this._setURL();
    this.frame.srcdoc = WM.buildDoc(src, cfg);
    return this.ready;
  };
  Preview.prototype._msg = function (m) {
    if (!m || m.__wm !== this.tok) return;
    var t = m.type, d = m.data;
    if (t === "size") { if (!this.opts.fixed) this.frame.style.height = Math.max(this.min, Math.min(this.max, d + 2)) + "px"; return; }
    if (t === "ready") {
      if (this.modeEl) { this.modeEl.textContent = d.mode === "BackCompat" ? "quirks mode" : "standards"; this.modeEl.className = "pv-mode " + (d.mode === "BackCompat" ? "q" : "s"); }
      this.readyInfo = d;
      if (this._ready) this._ready(d);
      if (this.opts.onEvent) this.opts.onEvent(t, d, this);
      return;
    }
    if ((t === "tree" || t === "eval" || t === "clicked") && this.pending[d.id]) { this.pending[d.id](d); delete this.pending[d.id]; return; }
    this.events.push([t, d]);
    if (this.logEl && this.opts.log !== false) {
      if (this.logEl.children.length < 60) this.logEl.appendChild(WM.eventView(t, d));
      this.logEl.hidden = false;
    }
    if (this.opts.onEvent) this.opts.onEvent(t, d, this);
  };
  Preview.prototype._ask = function (cmd, extra, timeout) {
    var me = this, id = WM.uid();
    return new Promise(function (res) {
      var timer = setTimeout(function () { delete me.pending[id]; res(null); }, timeout || 2500);
      me.pending[id] = function (d) { clearTimeout(timer); res(d); };
      var msg = { __wm: me.tok, cmd: cmd, id: id };
      for (var k in extra) msg[k] = extra[k];
      try { me.frame.contentWindow.postMessage(msg, "*"); } catch (e) { res(null); }
    });
  };
  Preview.prototype.tree = function () { return this._ask("tree", {}).then(function (d) { return d && d.tree; }); };
  Preview.prototype.evalLive = function (expr) { return this._ask("eval", { expr: expr }); };
  Preview.prototype.click = function (sel) { return this._ask("click", { sel: sel }); };
  Preview.prototype.destroy = function () { previews.delete(this); this.root.remove(); };
  WM.Preview = Preview;

  /* ---------------- WM.Editor (highlight overlay) ---------------- */
  function Editor(host, opts) {
    opts = opts || {};
    this.lang = opts.lang || "html";
    var root = (this.root = document.createElement("div"));
    root.className = "ed";
    root.setAttribute("dir", "ltr");
    root.innerHTML = '<div class="ed-gut" aria-hidden="true"></div><div class="ed-area"><pre class="ed-hl" aria-hidden="true"><code></code></pre><textarea spellcheck="false" autocomplete="off" autocapitalize="off" wrap="off"></textarea></div>';
    this.ta = root.querySelector("textarea");
    this.hl = root.querySelector(".ed-hl");
    this.code = root.querySelector(".ed-hl code");
    this.gut = root.querySelector(".ed-gut");
    this.area = root.querySelector(".ed-area");
    this.ta.setAttribute("aria-label", opts.label || "محرر الكود");
    this.minLines = opts.minLines || 6;
    this.maxH = opts.maxHeight || 520;
    this.fill = !!opts.fill;
    host.appendChild(root);
    var me = this;
    this.ta.value = opts.value || "";
    this.ta.addEventListener("input", function () { me._paint(); if (opts.onChange) opts.onChange(me.ta.value); });
    this.ta.addEventListener("scroll", function () { me.hl.scrollTop = me.ta.scrollTop; me.hl.scrollLeft = me.ta.scrollLeft; me.gut.scrollTop = me.ta.scrollTop; });
    this.ta.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "Enter" || e.key === "s")) { e.preventDefault(); if (opts.onRun) opts.onRun(me.ta.value); return; }
      if (e.key === "Tab" && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (e.shiftKey) { me._outdent(); return; }
        me._insert("  ");
        return;
      }
      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) {
        var v = me.ta.value, p = me.ta.selectionStart, ls = v.lastIndexOf("\n", p - 1) + 1;
        var ind = /^[ \t]*/.exec(v.slice(ls, p))[0];
        var before = v.slice(ls, p), after = v.slice(me.ta.selectionEnd);
        var opener = /<([a-zA-Z][\w-]*)\b[^>]*>\s*$/.exec(before);
        if (opener && !WM.VOID.has(opener[1].toLowerCase()) && new RegExp("^\\s*</" + opener[1] + "\\s*>", "i").test(after)) {
          e.preventDefault(); me._insert("\n" + ind + "  " + "\n" + ind); me.ta.selectionStart = me.ta.selectionEnd = p + 1 + ind.length + 2; return;
        }
        if (/[{\[(]\s*$/.test(before) && /^\s*[}\])]/.test(after)) { e.preventDefault(); me._insert("\n" + ind + "  " + "\n" + ind); me.ta.selectionStart = me.ta.selectionEnd = p + 1 + ind.length + 2; return; }
        if (ind || opener || /[{\[(]\s*$/.test(before)) { e.preventDefault(); me._insert("\n" + ind + (opener && !WM.VOID.has(opener[1].toLowerCase()) || /[{\[(]\s*$/.test(before) ? "  " : "")); }
      }
    });
    this._paint();
  }
  Editor.prototype._insert = function (t) {
    this.ta.focus();
    var ok = false;
    try { ok = document.execCommand("insertText", false, t); } catch (e) {}
    if (!ok) { this.ta.setRangeText(t, this.ta.selectionStart, this.ta.selectionEnd, "end"); this.ta.dispatchEvent(new Event("input")); }
  };
  Editor.prototype._outdent = function () {
    var v = this.ta.value, p = this.ta.selectionStart, ls = v.lastIndexOf("\n", p - 1) + 1;
    var m = /^ {1,2}/.exec(v.slice(ls));
    if (!m) return;
    this.ta.setSelectionRange(ls, ls + m[0].length);
    this._insert("");
  };
  Editor.prototype._paint = function () {
    var v = this.ta.value;
    this.code.innerHTML = WM.highlight(v, this.lang) + "\n";
    var n = v.split("\n").length, g = "";
    for (var i = 1; i <= n; i++) g += i + "\n";
    this.gut.textContent = g;
    if (!this.fill) {
      var lh = parseFloat(getComputedStyle(this.ta).lineHeight) || 21;
      var h = Math.min(this.maxH, Math.max(this.minLines, n) * lh + 26);
      this.area.style.height = h + "px";
      this.gut.style.height = h + "px";
    }
  };
  Object.defineProperty(Editor.prototype, "value", {
    get: function () { return this.ta.value; },
    set: function (v) { this.ta.value = v; this._paint(); }
  });
  Editor.prototype.setLang = function (l) { this.lang = l; this._paint(); };
  Editor.prototype.focus = function () { this.ta.focus(); };
  WM.Editor = Editor;
})();
