#!/usr/bin/env python3
"""Web Mastery — build + static validation.

Turns src/template.html + src/sections/*.html into index.html.
Runtime behaviour (labs, XSS levels, task answers, example console errors)
is verified in a real browser by the page's self-test: open index.html?selftest
over http (python -m http.server) — it reads tools/.work/selftest.json.

Authoring tags (see tools/AUTHORING.md):
  <html-example file auto url mode h min max errors-ok nolab notree>CODE</html-example>
  <code-block lang file detonate url>CODE</code-block>
  <quiz id answer><q/> <o/>... <good/> <bad/></quiz>   (+ <pre-html|pre-js|pre-css|pre-text|pre-http> inside)
  <html-lab id title level url lang><desc/> <starter/> <solution/> <test label live>expr</test>... <hint/></html-lab>
  <task id title level answer="a|b" norm reject="x|y"><desc/> <listing lang file detonate url/>... <hint/> <explain/></task>
  <xss-level id n title click url><desc/> <server/> <solution/> <blocked/>... <hint/> <explain/></xss-level>
  <scene id title><svg/> <step/>...</scene>
  `inline code` in prose -> <code>escaped</code>
"""
from __future__ import annotations

import hashlib
import html
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
WORK = ROOT / "tools" / ".work"

errors: list[str] = []
IDS: set[str] = set()
stats = {"sections": 0, "quiz": 0, "lab": 0, "task": 0, "xss": 0, "example": 0, "listing": 0, "scene": 0, "proj": 0}
SELF = {"tasks": {}, "reject": {}, "checks": {}}

RAW_TAGS = "html-example|code-block|pre-html|pre-js|pre-css|pre-text|pre-http|starter|solution|test|server|listing|blocked|check"
ATTRS = r"((?:[^>\"']|\"[^\"]*\"|'[^']*')*)"
RAW_RE = re.compile(rf"<({RAW_TAGS})\b{ATTRS}>([\s\S]*?)</\1>")
PH_RE = re.compile(r"@@R(\d+)@@")
RAW: list[tuple[str, dict, str]] = []

LVL = {"1": "أساسي", "2": "متوسط", "3": "متقدم"}


def esc(s: str) -> str:
    return html.escape(s, quote=False)


def esc_attr(s: str) -> str:
    return html.escape(s, quote=True)


def attrs(raw: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for m in re.finditer(r'([\w-]+)(?:\s*=\s*"([^"]*)"|\s*=\s*\'([^\']*)\')?', raw):
        v = m.group(2) if m.group(2) is not None else m.group(3)
        out[m.group(1)] = html.unescape(v) if v is not None else ""
    return out


def dedent_block(s: str) -> str:
    s = s.replace("\r\n", "\n")
    s = re.sub(r"^[ \t]*\n", "", s, count=1)
    s = re.sub(r"^\n+", "", s)
    s = re.sub(r"\s+$", "", s)
    lines = s.split("\n")
    ind = min((len(l) - len(l.lstrip(" ")) for l in lines if l.strip()), default=0)
    return "\n".join(l[ind:] if len(l) >= ind else l.lstrip(" ") for l in lines)


def json_safe(obj) -> str:
    return json.dumps(obj, ensure_ascii=False).replace("<", "\\u003c")


def ticks(s: str) -> str:
    """`code` -> <code>escaped</code> (only in prose; raw blocks are already placeholders)."""
    return re.sub(r"`([^`\n]+)`", lambda m: "<code>" + esc(m.group(1)) + "</code>", s)


def take_id(i: str, where: str) -> None:
    if not i or i in IDS:
        errors.append(f"{where}: missing/duplicate id {i!r}")
    IDS.add(i)


def norm_answer(v: str, kind: str) -> str | None:
    """Must match WM.normAnswer() in assets/core.js."""
    v = v.strip()
    if kind == "exact":
        return v
    if kind == "int":
        s = v.lstrip("+").replace("_", "")
        try:
            return str(int(s, 16) if re.fullmatch(r"-?0x[0-9a-fA-F]+", s) else int(s, 10))
        except ValueError:
            return None
    m = re.fullmatch(r"([\"'`])([\s\S]*)\1", v)
    if m:
        v = m.group(2)
    return re.sub(r"\s+", " ", v.strip().lower())


# --------------------------------------------------------------------------- raw blocks
def protect(text: str) -> str:
    def rep(m: re.Match) -> str:
        RAW.append((m.group(1), attrs(m.group(2)), m.group(3)))
        return f"@@R{len(RAW) - 1}@@"
    return RAW_RE.sub(rep, text)


def raw_of(ph_text: str) -> list[tuple[str, dict, str]]:
    return [RAW[int(n)] for n in PH_RE.findall(ph_text)]


def code_block(code: str, filename: str, lang: str, extra_attrs: str = "", tools_html: str = "", cls: str = "") -> str:
    tools = tools_html + '<button class="copy" type="button">نسخ</button>'
    return (f'<div class="code-block{(" " + cls) if cls else ""}"{extra_attrs}>'
            f'<div class="code-head"><div class="dots"><i></i><i></i><i></i></div><span class="filename">{esc(filename)}</span>'
            f'<div class="code-tools">{tools}</div></div>'
            f'<div class="code-body"><pre class="code-pre"><code class="language-{lang}">{esc(code)}</code></pre></div></div>')


def render_raw(tag: str, a: dict, body: str, where: str) -> str:
    code = dedent_block(body)
    if tag == "html-example":
        stats["example"] += 1
        tools = '<button class="run-mini hx-run" type="button">▶ شغّل</button>'
        if "notree" not in a:
            tools += '<button class="hx-tree" type="button">🌳 DOM</button>'
        if "nolab" not in a:
            tools += '<button class="hx-lab" type="button">🧪 المعمل</button>'
        data = f' data-file="{esc_attr(a.get("file", "index.html"))}"'
        for k in ("url", "mode", "h", "min", "max", "cookies"):
            if k in a:
                data += f' data-{k}="{esc_attr(a[k])}"'
        if "auto" in a:
            data += " data-auto"
        if "errors-ok" in a:
            data += " data-errors-ok"
        return (f'<div class="hx reveal"{data}>' + code_block(code, a.get("file", "index.html"), "html", tools_html=tools) +
                '<div class="hx-out" hidden></div></div>')
    if tag in ("code-block", "listing"):
        stats["listing"] += 1
        lang = a.get("lang", "html")
        extra = ""
        if "detonate" in a:
            extra += " data-detonate"
        if "url" in a:
            extra += f' data-url="{esc_attr(a["url"])}"'
        return code_block(code, a.get("file", lang), lang, extra_attrs=extra)
    if tag.startswith("pre-"):
        lang = tag[4:]
        return f'<pre class="q-code"><code class="language-{lang}">{esc(code)}</code></pre>'
    errors.append(f"{where}: <{tag}> outside of its parent element")
    return ""


def fin(text: str, where: str) -> str:
    """Expand any placeholders still in the text to their final HTML."""
    return PH_RE.sub(lambda m: render_raw(*RAW[int(m.group(1))], where), text)


def part(body: str, tag: str, label: str, required=True) -> str | None:
    mm = re.search(rf"<{tag}>([\s\S]*?)</{tag}>", body)
    if not mm:
        if required:
            errors.append(f"{label}: missing <{tag}>")
        return None
    return mm.group(1).strip()


def raws(body: str, tag: str) -> list[tuple[dict, str]]:
    return [(a, b) for (t, a, b) in raw_of(body) if t == tag]


# --------------------------------------------------------------------------- structural blocks
def expand_quiz(m: re.Match, where: str) -> str:
    a, body = attrs(m.group(1)), m.group(2)
    qid = a.get("id", "")
    take_id(qid, where)
    stats["quiz"] += 1
    label = f"{where} › {qid}"
    q = part(body, "q", label)
    opts = re.findall(r"<o>([\s\S]*?)</o>", body)
    good, bad = part(body, "good", label), part(body, "bad", label)
    try:
        ans = int(a.get("answer", "-1"))
    except ValueError:
        ans = -1
    if not 2 <= len(opts) <= 5:
        errors.append(f"{label}: quiz needs 2..5 options")
    if not 0 <= ans < len(opts):
        errors.append(f"{label}: answer index out of range")
    if len(set(o.strip() for o in opts)) != len(opts):
        errors.append(f"{label}: duplicate options")
    L = "ABCDE"
    oh = "".join(f'<button class="option" data-i="{i}"><span class="k">{L[i]}</span><span class="otxt">{fin(o.strip(), where)}</span><span class="mark"></span></button>' for i, o in enumerate(opts))
    return (f'<div class="quiz" id="{esc_attr(qid)}" data-ex="{esc_attr(qid)}" data-answer="{ans}"><div class="quiz-q">{fin(q or "", where)}</div>'
            f'<div class="quiz-options">{oh}</div><div class="quiz-feedback" data-good="{esc_attr(fin(good or "", where))}" '
            f'data-bad="{esc_attr(fin(bad or "", where))}"></div></div>')


def expand_lab(m: re.Match, where: str) -> str:
    a, body = attrs(m.group(1)), m.group(2)
    lid = a.get("id", "")
    take_id(lid, where)
    stats["lab"] += 1
    label = f"{where} › {lid}"
    desc = part(body, "desc", label) or ""
    hint = part(body, "hint", label, required=False)
    st, so = raws(body, "starter"), raws(body, "solution")
    tests = raws(body, "test")
    if len(st) != 1 or len(so) != 1:
        errors.append(f"{label}: lab needs exactly one <starter> and one <solution>")
    if not tests:
        errors.append(f"{label}: lab needs at least one <test>")
    data = {
        "starter": dedent_block(st[0][1]) + "\n" if st else "",
        "solution": dedent_block(so[0][1]) + "\n" if so else "",
        "tests": [{"label": ticks(t.get("label", "")), "expr": " ".join(b.split()), "live": "live" in t} for t, b in tests],
        "hint": fin(hint, where) if hint else "",
        "lang": a.get("lang", "html"),
    }
    if "url" in a:
        data["url"] = a["url"]
    for t in data["tests"]:
        if not t["label"]:
            errors.append(f"{label}: a <test> has no label")
    lvl = LVL.get(a.get("level", "1"), "أساسي")
    return (f'<div class="lab reveal" id="{esc_attr(lid)}" data-ex="{esc_attr(lid)}">'
            f'<div class="lab-head"><span class="lab-ico">🧪</span><div><span class="lab-kicker">معمل · {lvl}</span><h4>{a.get("title", "")}</h4></div><span class="lab-state"></span></div>'
            f'<div class="lab-desc">{fin(desc, where)}</div><div class="lab-ui"></div>'
            f'<script type="application/json" class="lab-data">{json_safe(data)}</script></div>')


def expand_task(m: re.Match, where: str) -> str:
    a, body = attrs(m.group(1)), m.group(2)
    tid = a.get("id", "")
    take_id(tid, where)
    stats["task"] += 1
    label = f"{where} › {tid}"
    desc = part(body, "desc", label) or ""
    hint = part(body, "hint", label, required=False)
    explain = part(body, "explain", label) or ""
    kind = a.get("norm", "text")
    answers = [x for x in a.get("answer", "").split("|") if x.strip()]
    if not answers:
        errors.append(f"{label}: task needs answer=")
    hashes = []
    for ans in answers:
        n = norm_answer(ans, kind)
        if n is None or n == "":
            errors.append(f"{label}: answer {ans!r} does not normalize as {kind}")
            continue
        hashes.append(hashlib.sha256(f"{tid}:{n}".encode()).hexdigest())
    rejects = [x for x in a.get("reject", "").split("|") if x.strip()]
    for r in rejects:
        if norm_answer(r, kind) in {norm_answer(x, kind) for x in answers}:
            errors.append(f"{label}: reject {r!r} equals an accepted answer")
    SELF["tasks"][tid] = answers
    SELF["reject"][tid] = rejects
    for ca, cb in raws(body, "check"):          # machine-verified answer: rendered + evaluated by the self-test
        if not ca.get("expr"):
            errors.append(f"{label}: <check> needs expr=")
        SELF["checks"][tid] = {"html": dedent_block(cb), "expr": ca.get("expr", ""), "expect": norm_answer(answers[0], kind) if answers else ""}
    listings = "".join(render_raw("listing", la, lb, where) for la, lb in raws(body, "listing"))
    lvl = LVL.get(a.get("level", "1"), "أساسي")
    hint_html = f'<details class="task-hint"><summary>💡 تلميح</summary><div>{fin(hint, where)}</div></details>' if hint else ""
    return (f'<div class="task reveal" id="{esc_attr(tid)}" data-ex="{esc_attr(tid)}" data-hash="{",".join(hashes)}" data-norm="{esc_attr(kind)}">'
            f'<div class="task-head"><span class="task-ico">🔎</span><div><span class="task-kicker">مهمة تحليل · {lvl}</span><h4>{a.get("title", "")}</h4></div></div>'
            f'<div class="task-desc">{fin(desc, where)}</div>{listings}'
            f'<div class="task-ans"><input type="text" dir="auto" placeholder="اكتب إجابتك…" aria-label="الإجابة" spellcheck="false" autocomplete="off">'
            f'<button type="button" class="btn btn-primary btn-sm task-check">تحقق</button><span class="task-msg"></span></div>'
            f'{hint_html}<div class="task-explain" hidden><b>📖 الشرح:</b> {fin(explain, where)}</div></div>')


def expand_xss(m: re.Match, where: str) -> str:
    a, body = attrs(m.group(1)), m.group(2)
    xid = a.get("id", "")
    take_id(xid, where)
    stats["xss"] += 1
    label = f"{where} › {xid}"
    desc = part(body, "desc", label) or ""
    hint = part(body, "hint", label, required=False)
    explain = part(body, "explain", label) or ""
    sv, so = raws(body, "server"), raws(body, "solution")
    if len(sv) != 1 or len(so) != 1:
        errors.append(f"{label}: xss-level needs one <server> and one <solution>")
    data = {
        "server": dedent_block(sv[0][1]) if sv else "return input;",
        "solution": dedent_block(so[0][1]) if so else "",
        "blocked": [dedent_block(b) for _, b in raws(body, "blocked")],
        "hint": fin(hint, where) if hint else "",
        "explain": fin(explain, where),
    }
    if "url" in a:
        data["url"] = a["url"]
    click = f' data-click="{esc_attr(a["click"])}"' if a.get("click") else ""
    return (f'<div class="xss reveal" id="{esc_attr(xid)}" data-ex="{esc_attr(xid)}"{click}>'
            f'<div class="xss-head"><span class="xss-n">LEVEL {esc(a.get("n", "?"))}</span><h4>{a.get("title", "")}</h4><span class="xss-state"></span></div>'
            f'<div class="xss-desc">{fin(desc, where)}</div><div class="xss-ui"></div>'
            f'<script type="application/json" class="xss-data">{json_safe(data)}</script></div>')


def expand_scene(m: re.Match, where: str) -> str:
    a, body = attrs(m.group(1)), m.group(2)
    sid = a.get("id", "")
    take_id(sid, where)
    stats["scene"] += 1
    svg = re.search(r"<svg[\s\S]*?</svg>", body)
    steps = re.findall(r"<step>([\s\S]*?)</step>", body)
    if not svg or not steps:
        errors.append(f"{where} › {sid}: scene needs <svg> and <step>s")
    sh = "".join(f'<div class="sc-step">{fin(s.strip(), where)}</div>' for s in steps)
    return (f'<figure class="scene reveal" id="{esc_attr(sid)}" data-n="{len(steps)}">'
            f'<div class="sc-title">🎬 {a.get("title", "")}</div><div class="sc-stage">{svg.group(0) if svg else ""}</div>'
            f'<div class="sc-bar"><button type="button" class="sc-prev" aria-label="الخطوة اللي فاتت">→</button><div class="sc-dots"></div>'
            f'<button type="button" class="sc-next" aria-label="الخطوة الجاية">←</button><button type="button" class="sc-play" aria-label="تشغيل تلقائي">▶</button></div>'
            f'<div class="sc-cap" aria-live="polite"></div><div class="sc-steps" hidden>{sh}</div></figure>')


def process(text: str, where: str) -> str:
    text = protect(text)
    text = ticks(text)
    text = re.sub(rf"<quiz\b{ATTRS}>([\s\S]*?)</quiz>", lambda m: expand_quiz(m, where), text)
    text = re.sub(rf"<html-lab\b{ATTRS}>([\s\S]*?)</html-lab>", lambda m: expand_lab(m, where), text)
    text = re.sub(rf"<task\b{ATTRS}>([\s\S]*?)</task>", lambda m: expand_task(m, where), text)
    text = re.sub(rf"<xss-level\b{ATTRS}>([\s\S]*?)</xss-level>", lambda m: expand_xss(m, where), text)
    text = re.sub(rf"<scene\b{ATTRS}>([\s\S]*?)</scene>", lambda m: expand_scene(m, where), text)
    text = fin(text, where)
    stats["proj"] += len(re.findall(r'class="project[^"]*"[^>]*data-ex=', text))
    return text


def main() -> int:
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    template = (SRC / "template.html").read_text(encoding="utf-8")
    files = sorted((SRC / "sections").glob("*.html"))
    rendered = []
    for f in files:
        print(f"  · {f.name}")
        rendered.append(process(f.read_text(encoding="utf-8"), f.stem))
    body = "\n".join(rendered)
    stats["sections"] = len(re.findall(r'class="section"[^>]*data-nav=', body))
    # real markup only: drop code listings, <pre>, JSON data blocks and attribute values that hold code
    markup = re.sub(r'<script type="application/json"[\s\S]*?</script>|<code\b[\s\S]*?</code>|<pre\b[\s\S]*?</pre>', "", template + body)
    markup = re.sub(r'\sdata-(?:good|bad)="[^"]*"', "", markup)
    ids = re.findall(r'\sid="([^"]+)"', markup)
    dups = sorted({i for i in ids if ids.count(i) > 1})
    if dups:
        errors.append("duplicate element ids: " + ", ".join(dups))
    for href in set(re.findall(r'href="#([^"]+)"', markup)):
        if href not in ids:
            errors.append(f"broken in-page link: #{href}")
    left = re.findall(rf"</?(?:{RAW_TAGS}|quiz|html-lab|task|xss-level|scene|desc|hint|explain|step)\b", re.sub(r'<script type="application/json"[\s\S]*?</script>', "", body))
    if left:
        errors.append(f"unexpanded tags: {sorted(set(left))}")
    if PH_RE.search(body):
        errors.append("unresolved raw placeholders")
    for sec in re.findall(r'<section class="section"[^>]*>', body):
        a = attrs(sec[len("<section "):-1])
        for k in ("id", "data-part", "data-pk", "data-nav", "data-icon", "data-keywords"):
            if k not in a:
                errors.append(f"section {a.get('id', '?')} missing {k}")
    ver = hashlib.sha256(b"".join((ROOT / "assets" / f).read_bytes() for f in sorted(os.listdir(ROOT / "assets")))).hexdigest()[:10]
    n_sec = stats["task"] + stats["xss"]
    page = (template.replace("{{VER}}", ver).replace("{{SECTIONS}}", body)
            .replace("{{N_SECTIONS}}", str(stats["sections"])).replace("{{N_QUIZ}}", str(stats["quiz"]))
            .replace("{{N_LABS}}", str(stats["lab"])).replace("{{N_SEC}}", str(n_sec))
            .replace("{{N_TASK}}", str(stats["task"])).replace("{{N_XSS}}", str(stats["xss"]))
            .replace("{{N_EX}}", str(stats["example"])).replace("{{N_PROJ}}", str(stats["proj"]))
            .replace("{{N_TOTAL}}", str(stats["quiz"] + stats["lab"] + stats["task"] + stats["xss"] + stats["proj"])))
    if "{{" in page:
        errors.append("unreplaced template variables: " + ", ".join(sorted(set(re.findall(r"\{\{\w+\}\}", page)))))
    print("\n  " + " · ".join(f"{k}: {v}" for k, v in stats.items()))
    if errors:
        print(f"\n✗ BUILD FAILED — {len(errors)} problem(s):\n")
        for e in errors:
            print("  ✗ " + e)
        return 1
    (ROOT / "index.html").write_text(page, encoding="utf-8")
    WORK.mkdir(parents=True, exist_ok=True)
    (WORK / "selftest.json").write_text(json.dumps(SELF, ensure_ascii=False, indent=1), encoding="utf-8")
    print("\n✓ index.html written. Now run the browser self-test: index.html?selftest")
    return 0


if __name__ == "__main__":
    sys.exit(main())
