# Web Mastery for Pentesters — plan

One site, four parts, delivered part by part. Egyptian-Arabic explanations (like C/ASM Mastery), code/identifiers/output in English.
DUAL GOAL (user, 2026-11-21): professional web development & software engineering AND pentesting/malware analysis.
Every lesson serves both: developer practice ("👨‍💻" callouts `.callout.dev`, dev projects) + security angle ("🎯" callouts), quizzes, graded labs, analysis tasks.

## Status
- [x] Part 1 · HTML — done 2026-11-21: 00 roadmap, 01–17 lessons (17 = developer workflow), 18 projects (9 + capstone), cheat sheet, sources
- [ ] Part 2 · CSS
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

## Engine (assets/)
- `core.js` — highlighters (html/css/js/http), sha256, DOM serializer + tree renderer, `WM.Preview` (sandboxed iframe + hook: console, alert, nav, form-submit → HTTP request preview, meta-refresh, live tree, live eval, storage/cookie shims, analysis-mode sink hooks + no-network CSP), `WM.Editor` (highlight overlay textarea).
- `app.js` — state (localStorage `webMastery.v1`), theme, nav, progress, quizzes, examples, playground overlay, html-labs, analysis tasks, XSS range, projects, cheat search, self-test (`?selftest`).
- `widgets.js` — url inspector, encoder chain, tokenizer stepper, parser playground, scene stepper.
- `effects.js` — hero live-typing editor + preview, tag rain, reading size, back-to-top.

## Verification
- `python tools/build.py` (static checks) then `node tools/selftest.mjs` (headless Chrome via CDP; serve the folder on :8793 first).
- `node tools/shots.mjs <outDir>` captures screenshots of key views for a visual pass.
