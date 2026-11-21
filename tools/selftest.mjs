#!/usr/bin/env node
// Runs index.html?selftest in headless Chrome (via the DevTools protocol) and prints the result.
// Usage:  node tools/selftest.mjs [http://localhost:8793/]     (serve the folder first: python -m http.server 8793)
// Needs Node 22+ (global fetch + WebSocket) and a local Chrome/Edge.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const base = (process.argv[2] || "http://localhost:8793/").replace(/\/?$/, "/");
const candidates = [
  process.env.CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);
const chromePath = candidates.find((p) => existsSync(p));
if (!chromePath) { console.error("No Chrome/Edge found (set CHROME=…)"); process.exit(2); }

const port = 9300 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), "wm-selftest-"));
const chrome = spawn(chromePath, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => {
  const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params }));
});
async function main() {
  let targets = null;
  for (let i = 0; i < 50 && !targets; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { await sleep(200); } }
  const page = targets && targets.find((t) => t.type === "page");
  if (!page) throw new Error("could not connect to Chrome");
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(new Error(d.error.message)) : p.res(d.result); } };
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `${base}?selftest&r=${Date.now()}` });
  const t0 = Date.now();
  let result = null;
  let lastLog = Date.now();
  while (Date.now() - t0 < 10 * 60 * 1000) {
    await sleep(1000);
    if (Date.now() - lastLog > 15000) {
      lastLog = Date.now();
      try { const p = await send("Runtime.evaluate", { expression: "(document.querySelector('.selftest') || {}).textContent || '(not started)'", returnByValue: true }); console.log(`  … ${((Date.now() - t0) / 1000).toFixed(0)}s: ${p.result.value}`); } catch {}
    }
    try {
      const r = await send("Runtime.evaluate", { expression: "window.__selftest ? JSON.stringify(window.__selftest) : ''", returnByValue: true });
      if (r.result && r.result.value) { result = JSON.parse(r.result.value); break; }
    } catch { /* page still loading */ }
  }
  if (!result) {
    let at = "";
    try { at = (await send("Runtime.evaluate", { expression: "(document.querySelector(\".selftest\") || {}).textContent || \"\"", returnByValue: true })).result.value; } catch {}
    throw new Error("self-test timed out at: " + at);
  }
  if (result.error) throw new Error("self-test crashed: " + result.error);
  console.log(`\n${result.fail ? "✗" : "✓"} self-test: ${result.pass} pass · ${result.fail} fail  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  for (const f of result.fails) console.log("  ✗ " + f);
  return result.fail ? 1 : 0;
}
let code = 1;
try { code = await main(); } catch (e) { console.error("✗ " + e.message); }
try { ws && ws.close(); } catch {}
chrome.kill();
await sleep(500);
try { rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(code);
