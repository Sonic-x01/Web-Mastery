# Web Mastery for Pentesters — plan

One site, four parts, delivered part by part. Egyptian-Arabic explanations (like C/ASM Mastery), code/identifiers/output in English.
DUAL GOAL (user, 2026-11-21): professional web development & software engineering AND pentesting/malware analysis.
Every lesson serves both: developer practice ("👨‍💻" callouts `.callout.dev`, dev projects) + security angle ("🎯" callouts), quizzes, graded labs, analysis tasks.

## Status
- [x] Part 1 · HTML — done 2026-11-21: 00 roadmap, 01–17 lessons (17 = developer workflow), 18 projects (9 + capstone), cheat sheet, sources
- [x] Part 2 · CSS — done 2026-11-21: lessons 19–31 (13 lessons), 32 projects (6 + graded capstone), CSS cheat cards, CSS sources
- [ ] Part 3 · JavaScript (core + DOM/browser APIs + Node basics + reading malicious JS)
- [ ] Part 4 · Web Security (browser security model, XSS deep, CSRF/clickjacking, postMessage, DOM clobbering, prototype pollution, HTML smuggling & phishing kits, defense & reporting, final CTF projects)

## Part 1 · HTML (section files in src/sections)
| file | id | topic |
|---|---|---|
| 00-roadmap | roadmap | why HTML/CSS/JS for a pentester, course map (4 parts), how to study, the lab tools, ethics/legal |
| 01-web | s01 | how the web works: client/server, URL, DNS, HTTP request/response, status codes, headers, Content-Type, browser pipeline (scene) |
| 02-first-page | s02 | document structure, doctype + quirks, elements/tags/attributes syntax, void elements, nesting, comments, whitespace, DevTools |
| 03-text | s03 | headings, paragraphs, inline semantics, pre/code, quotes, bdi/bdo/dir, entities & character references |
| 04-links-urls | s04 | a/href, absolute/relative resolution, fragments, mailto/tel, target/rel, download, base, percent-encoding, javascript:/data: (URL widget) |
| 05-lists-tables | s05 | ul/ol/dl, tables (caption/thead/tbody/tfoot, colspan/rowspan, scope) |
| 06-media | s06 | img (alt, srcset/sizes, loading), picture, figure, audio/video/track, inline SVG, image maps; tracking pixels, onerror |
| 07-semantics | s07 | div/span, landmarks, details/summary, dialog, popover, block vs inline, global attributes (id/class/data-*/hidden/tabindex/contenteditable/inert…) |
| 08-forms-1 | s08 | form, input types, label, fieldset, textarea, select, datalist, button types, output/progress/meter |
| 09-forms-2 | s09 | submission (GET/POST, enctype, what is sent), validation attrs, readonly vs disabled, formaction/form=, autocomplete; client-side validation bypass, hidden fields, CSRF intro |
| 10-head | s10 | meta (charset, viewport, robots, refresh, CSP, referrer), link rels, script async/defer/module/integrity, noscript, base |
| 11-iframes | s11 | iframe/srcdoc/sandbox/allow/referrerpolicy, object/embed, framing & clickjacking intro (scene) |
| 12-quality | s12 | accessibility (ARIA, labels, alt, keyboard), validation, SEO, performance, best practices |
| 13-parser | s13 | tokenizer states, tree construction, error recovery, special element kinds (raw text / RCDATA), foreign content, template (tokenizer + parser widgets) |
| 14-encoding | s14 | charset, entities vs percent vs JS vs CSS escapes, decoding order per context, double encoding (encoder widget) |
| 15-recon | s15 | source review methodology: comments, hidden inputs, endpoints, JS files, source maps, metadata, robots/sitemap, curl/Burp/grep |
| 16-injection | s16 | HTML injection & XSS fundamentals: contexts + breakouts, XSS Range levels, dangling markup, form/base hijack, defenses preview |
| 17-dev-workflow | s17 | developer workflow: tools, Emmet, project structure, separation of concerns, template/web components, Git, deploy, i18n |
| 17-projects-html | p-html | Part 1 projects (shown as 18) + graded capstone |
| 99-end | cheat, sources | searchable cheat sheet (grows each part), sources, roadmap |

## Part 2 · CSS (files 20-…; displayed lesson numbers continue: 19–31, projects 32; data-pk="css", data-part="الجزء 2 · CSS")
| file | id | topic | widgets |
|---|---|---|---|
| 20-css-basics | c19 | what CSS is, attach (inline/style/link), syntax, comments, DevTools Styles, how the browser applies CSS, CSP style-src | |
| 21-css-selectors | c20 | type/class/id/universal, attribute selectors (all operators + i), combinators, pseudo-classes (state, structural, :not/:is/:where/:has, form states), pseudo-elements | selector tester |
| 22-css-cascade | c21 | cascade order (origin, !important, @layer, specificity, order), specificity math, inheritance, initial/inherit/unset/revert | specificity calc |
| 23-css-box | c22 | box model, box-sizing, margin collapse, display, overflow, sizing (min/max), outline | box visualizer |
| 24-css-units-type | c23 | units (px/em/rem/%/vw/vh/dvh/ch), colors (hex/rgb/hsl/oklch/alpha/currentColor), fonts (@font-face, stacks, font-display, privacy), text, Arabic typography, logical properties | |
| 25-css-visuals | c24 | backgrounds & gradients, borders/radius, shadows, object-fit, filters, url() = requests | |
| 26-css-position | c25 | position (static/relative/absolute/fixed/sticky), inset, z-index & stacking contexts, opacity, pointer-events, clickjacking/UI redressing in depth | |
| 27-css-flexbox | c26 | flex container/items, axes, justify/align, wrap, gap, grow/shrink/basis, order (a11y) | flex playground |
| 28-css-grid | c27 | grid templates, fr, repeat/minmax/auto-fit, areas, placement, implicit grid, subgrid | grid playground |
| 29-css-responsive | c28 | mobile-first, media queries (width, prefers-*, hover/pointer, print), clamp(), container queries, RTL with logical props | |
| 30-css-motion | c29 | transforms, transitions, @keyframes, performance, prefers-reduced-motion; onanimationstart XSS vector | |
| 31-css-modern | c30 | custom properties, calc, nesting, :has, @layer, @supports, @container, @property; architecture (BEM, utilities, resets), tooling (Sass/PostCSS) | |
| 32-css-quality | c31 | a11y (WCAG contrast, :focus-visible, skip link, visually-hidden, forced-colors, target size), performance (render-blocking, fonts, coverage, content-visibility), print stylesheets, DevTools debugging, Stylelint/Baseline; CSS-hiding ≠ access control | contrast checker |
| 33-css-projects | p-css | p10 profile styled, p11 pentest dashboard, p12 mini design system, p13 animated fast landing, p14 a11y audit, p15 recon from CSS files + graded capstone (findings board) | |
Note: a dedicated CSS-injection lesson was planned but dropped (generation was stopped by a safety filter); earlier lessons only mention the idea briefly. Don't re-add it.
Labs use `live` tests with getComputedStyle inside the sandbox.

## Engine (assets/)
- `core.js` — highlighters (html/css/js/http), sha256, DOM serializer + tree renderer, `WM.Preview` (sandboxed iframe + hook: console, alert, nav, form-submit → HTTP request preview, meta-refresh, live tree, live eval, storage/cookie shims, analysis-mode sink hooks + no-network CSP), `WM.Editor` (highlight overlay textarea).
- `app.js` — state (localStorage `webMastery.v1`), theme, nav, progress, quizzes, examples, playground overlay, html-labs, analysis tasks, XSS range, projects, cheat search, self-test (`?selftest`).
- `widgets.js` — url inspector, encoder chain, tokenizer stepper, parser playground, scene stepper.
- `csswidgets.js` — specificity calculator (`WM.specificity`), selector tester, box model, flex & grid playgrounds, contrast checker (`WM.contrastRatio`); self-test has unit tests for both.
- `effects.js` — hero live-typing editor + preview, tag rain, reading size, back-to-top.

## Verification
- `python tools/build.py` (static checks) then `node tools/selftest.mjs` (headless Chrome via CDP; serve the folder on :8793 first).
- `node tools/shots.mjs <outDir>` captures screenshots of key views for a visual pass.
