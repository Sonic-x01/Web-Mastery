#!/usr/bin/env node
// Visual check: captures screenshots of key parts of the page in headless Chrome.
// Usage: node tools/shots.mjs <outDir> [baseUrl]
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const out = process.argv[2] || "shots";
const base = (process.argv[3] || "http://localhost:8793/").replace(/\/?$/, "/");
mkdirSync(out, { recursive: true });
const chromePath = [process.env.CHROME, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].filter(Boolean).find((p) => existsSync(p));
const port = 9800 + Math.floor(Math.random() * 150);
const profile = mkdtempSync(join(tmpdir(), "wm-shots-"));
const chrome = spawn(chromePath, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0; const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result.value;

const SHOTS = [
  // name, width, height, theme, script to run before the shot (scrolls / clicks)
  ["01-hero", 1440, 900, "dark", "scrollTo(0,0)", 5200],
  ["02-roadmap", 1440, 900, "dark", "location.hash='#roadmap'", 900],
  ["03-scene", 1440, 900, "dark", "document.getElementById('sc-load').scrollIntoView({block:'center'}); document.querySelector('#sc-load .sc-next').click(); document.querySelector('#sc-load .sc-next').click(); document.querySelector('#sc-load .sc-next').click();", 900],
  ["04-example-form", 1440, 900, "dark", "(async()=>{const h=[...document.querySelectorAll('.hx')].find(x=>x.dataset.file==='choices.html'); h.scrollIntoView({block:'start'}); scrollBy(0,-80); await h._run(); await h._pv().click('button[value=send]');})()", 1600],
  ["05-lab", 1440, 900, "dark", "(async()=>{const l=document.getElementById('s09-lab2'); l.scrollIntoView({block:'start'}); scrollBy(0,-70); l.querySelector('.lab-check').click();})()", 1800],
  ["06-task", 1440, 900, "dark", "document.getElementById('s15-t5').scrollIntoView({block:'start'}); scrollBy(0,-70);", 900],
  ["07-xss", 1440, 900, "dark", "(async()=>{const x=document.getElementById('xss-8'); x.scrollIntoView({block:'start'}); scrollBy(0,-70); x.querySelector('textarea').value='<img src=\"x\"/onerror=alert(document.domain)>'; x.querySelector('.xss-go').click();})()", 1800],
  ["08-tokenizer", 1440, 900, "dark", "(async()=>{const w=document.querySelector('[data-widget=tokenizer]'); w.scrollIntoView({block:'start'}); scrollBy(0,-70); for(let i=0;i<14;i++) w.querySelector('[data-a=step]').click();})()", 900],
  ["09-url", 1440, 900, "dark", "(async()=>{const w=document.querySelector('[data-widget=url]'); w.scrollIntoView({block:'start'}); scrollBy(0,-70); w.querySelectorAll('.u-presets button')[4].click();})()", 900],
  ["10-encoder", 1440, 900, "dark", "(async()=>{const w=document.querySelectorAll('[data-widget=encoder]')[1]; w.scrollIntoView({block:'start'}); scrollBy(0,-70);})()", 900],
  ["11-playground", 1440, 900, "dark", "(async()=>{WM.openPlayground(null); await new Promise(r=>setTimeout(r,900)); document.querySelector('#pgTabs [data-tab=net]').click();})()", 1500],
  ["12-light", 1440, 900, "light", "location.hash='#s13'", 1200],
  ["13-mobile", 390, 844, "dark", "location.hash='#s08'", 1200],
  ["14-cheat", 1440, 900, "dark", "location.hash='#cheat'", 900],
];

async function main() {
  let targets = null;
  for (let i = 0; i < 50 && !targets; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { await sleep(200); } }
  ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.method === "Runtime.exceptionThrown") console.log("  ⚠ exception:", d.params.exceptionDetails.exception ? d.params.exceptionDetails.exception.description.split(String.fromCharCode(10)).slice(0, 3).join(" | ") : d.params.exceptionDetails.text); if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(new Error(d.error.message)) : p.res(d.result); } };
  await send("Page.enable"); await send("Runtime.enable");
  for (const [name, w, h, theme, script, wait] of SHOTS) {
    await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
    await send("Page.navigate", { url: `${base}?shot=${name}` });
    for (let i = 0; i < 60; i++) { await sleep(500); try { if (await evaluate("document.querySelectorAll('#nav a').length > 0 && !!document.querySelector('.xss-ui .xss-go')")) break; } catch {} }
    await evaluate(`try{localStorage.setItem('webMastery.theme','${theme}')}catch(e){}; document.documentElement.dataset.theme='${theme}'; document.documentElement.style.scrollBehavior='auto'; 1`);
    await evaluate(script.startsWith("(async") ? script : `(()=>{${script}})()`);
    await sleep(wait);
    await evaluate(`document.querySelectorAll('.reveal').forEach(e=>e.classList.add('in')); 1`);
    await sleep(300);
    const shot = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(out, name + ".png"), Buffer.from(shot.data, "base64"));
    console.log("  📸 " + name);
  }
}
try { await main(); } catch (e) { console.error(e); }
try { ws.close(); } catch {}
chrome.kill(); await sleep(400);
try { rmSync(profile, { recursive: true, force: true }); } catch {}
