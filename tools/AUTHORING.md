# Web Mastery — authoring guide

Egyptian-Arabic explanations (same voice as C/ASM Mastery); code, identifiers, comments, output in English.
Each lesson = `src/sections/NN-name.html`. Build: `python tools/build.py`. Then open `index.html?selftest`
over http (preview config `web-mastery`, port 8793) — it runs every lab solution/starter, every XSS
reference payload (+ a benign input + `<blocked>` payloads), every task answer against its hash, and every
example for console errors. Fix everything it reports before shipping.

## Section skeleton
```html
<section class="section" id="s05" data-part="الجزء 1 · HTML" data-pk="html" data-nav="short title" data-icon="📋" data-keywords="english keywords">
  <div class="section-head"><span class="section-index">05</span><div>
    <p class="eyebrow">HTML · الدرس 05</p><h2>Title</h2><p class="lede">…</p></div></div>
  … content …
  <div class="exercises"><div class="exercises-head"><h3><span class="bulb">✏️</span> تمارين الدرس 05</h3></div> … </div>
</section>
```
`data-pk`: start | html | css | js | sec | end (colors the part). Ids: quizzes `sNN-qK`, labs `sNN-labK`, tasks `sNN-tK`, xss `xss-K`, projects `pK`.

## Tags
- `` `code` `` in prose → `<code>` (escaped). Write RAW characters inside backticks (`<div>` not `&lt;div&gt;`); to show an entity literally write it raw too (`&nbsp;`). Never use backticks inside `<svg>`. In `<test label="">` attributes entities are decoded first. Test bodies are raw JS (write `&&`, not `&amp;&amp;`).
- `<html-example file="x.html" auto url="https://…" mode="xss|analysis" h="200" max="500" errors-ok nolab notree>RAW HTML</html-example>` — live preview (sandbox), 🌳 DOM, 🧪 open in playground. `auto` renders when scrolled into view.
- `<code-block lang="html|css|js|http|text|bash" file="…">RAW</code-block>` — static listing.
- `<quiz id answer="0-based"><q>…<pre-html>RAW</pre-html></q><o>…</o>…<good>…</good><bad>…</bad></quiz>` (also pre-js, pre-css, pre-text, pre-http).
- `<html-lab id title level="1|2|3" url>` `<desc>…</desc><starter>RAW</starter><solution>RAW</solution><test label="…" [live]>JS expr</test>… <hint>…</hint></html-lab>`.
  Static test scope: `doc` (DOMParser of the code), `src` (raw), `S` (lowercased src without comments), `$(sel)`, `$$(sel)` (array), `text(selOrEl)`, `has(sel)`, `count(sel)`, `attr(sel,name)`.
  `live` tests run inside the sandbox after load (`document`, `getComputedStyle`, …).
- `<task id title level answer="a|b" norm="text|exact|int" reject="x|y">` `<desc/> <listing lang file [detonate] [url]>RAW</listing> <hint/> <explain/>` — answers stored as SHA-256 of `id:norm(answer)`.
  `detonate` adds a button that runs the listing in the no-network analysis sandbox (sink logger).
  `<check expr="JS">HTML</check>` (never shown): the self-test renders the HTML and requires `String(expr)` (lowercased) to equal the first answer — ALWAYS add one when the answer is computable (layout sizes, colors, selector counts).
- `<xss-level id n title click="css selector" url>` `<desc/> <server>JS body using input, returns HTML</server> <solution>payload</solution> <blocked>payload the filter must stop</blocked>… <hint/> <explain/>`. Success = any alert/confirm/prompt/print.
- `<scene id title><svg …> elements with data-s="1,3-4" (highlighted at those steps) or data-from="2" [data-to="4"] </svg><step>…</step>…</scene>`.
- Widgets: `<div class="widget" data-widget="url|encoder|tokenizer|parser|smuggle" data-input="…" data-recipe="url-dec,b64-dec"></div>`.
- Callouts: `.callout.tip|warn|danger|info|pt (🎯 Pentester)|mal (🦠 malware)|def (🛡️ defense)|spec (📜 spec)` with `<span class="ci">emoji</span><div><strong/>…<p/></div>`.
- Other blocks: `.grid-2/.grid-3 > .card.reveal`, `.steps > .step`, `.table-wrap > table.ref`, `.http-box > .hb-h + pre`, `.cmp > .bad/.good`, `.ctx-grid > .ctx`, `.pipeline > .stage/.arrow`, `figure.diagram > svg` (classes d-box..d-box6, d-t/tb/ts/tx, d-acc/vio/amb/grn/red/tea, d-ar*, d-flow, d-pulse; Arabic SVG text needs class `ar` and text-anchor end/middle).

## Sandbox facts (for lesson text)
- Previews: `<iframe sandbox="allow-scripts allow-forms">` + srcdoc ⇒ opaque origin. Simulated page URL (default `https://victim.example/app/index.html`) is used to resolve links/forms; first `<base href>` respected; referrer policy computed.
- Captured: console, errors, alert/confirm/prompt/print, link clicks (with resolved URL + Referer), fragment links, window.open, form submits (exact HTTP request incl. multipart/text/plain, GET query replacement, CRLF normalization, formaction/formmethod/formenctype), form.submit(), invalid events, meta refresh (neutralized + reported). `javascript:` links / form actions / window.open are executed by the hook (Chrome blocks javascript: navigations in sandboxed srcdoc frames): URL-parse, strip scheme, percent-decode, global eval.
- localStorage/sessionStorage/document.cookie are in-memory shims (HttpOnly cookies hidden from JS).
- `mode="xss"`: CSP `img-src data: blob:` (so `src=x` errors without a request). `mode="analysis"`: CSP default-src 'none' + sink logging (document.write, eval, Function, atob, unescape, fromCharCode, fetch/XHR/beacon/WebSocket, img/script/iframe src, innerHTML/outerHTML/insertAdjacentHTML, createObjectURL with blob contents).
