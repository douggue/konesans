// Renders Ti Zwazo from the app's own art module (apps/mobile/src/ui/mascot-art.ts):
//   svg/<mood>.svg            one SVG per mood (source art)
//   contact-sheet.html/.png   every mood at 160/96/48 px on white and on the hero blue
//   splash-logo.png           native splash image (1024², transparent), for expo-splash-screen imageWidth 180
//   icon.png, android-icon-foreground.png, android-icon-background.png, android-icon-monochrome.png, favicon.png
// usage: node --experimental-strip-types design/mascot/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { mascotXml, MASCOT_MOODS } from '../../apps/mobile/src/ui/mascot-art.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
let pw;
try { pw = await import('playwright'); } catch { pw = createRequire(import.meta.url)('/opt/npm-tools/node_modules/playwright'); }
const { chromium } = pw;
const BLUE = '#1F47B5';
const sized = (xml, w, h = w) => xml.replace('<svg ', `<svg width="${w}" height="${h}" `);

fs.mkdirSync(path.join(here, 'svg'), { recursive: true });
for (const m of MASCOT_MOODS) fs.writeFileSync(path.join(here, 'svg', `${m}.svg`), mascotXml(m) + '\n');
fs.writeFileSync(path.join(here, 'svg', 'happy-blink.svg'), mascotXml('happy', true) + '\n');

// ─── contact sheet ───────────────────────────────────────────────────────────
const card = (m) => {
  const strip = (bg) => `<div class="strip" style="background:${bg}">${[160, 96, 48].map((s) => `<div class="cell"><img src="svg/${m}.svg" width="${s}" height="${s}" alt="${m}"><span>${s}</span></div>`).join('')}</div>`;
  return `<section><h2>${m}</h2><div class="row">${strip('#FFFFFF')}${strip(BLUE)}</div></section>`;
};
const sheet = `<!doctype html><html><head><meta charset="utf-8"><title>Ti Zwazo contact sheet</title>
<style>
body{margin:0;padding:28px;background:#EEF1F8;font-family:system-ui,sans-serif;color:#14213D}
h1{margin:0 0 4px;font-size:26px} p{margin:0 0 20px;color:#5A6480}
.grid{display:grid;grid-template-columns:repeat(2,max-content);gap:18px}
section{background:#fff;border-radius:18px;padding:12px 14px;box-shadow:0 2px 0 #D9DEEA}
h2{margin:0 0 8px;font-size:15px;text-transform:uppercase;letter-spacing:.08em}
.row{display:flex;gap:10px}
.strip{display:flex;align-items:flex-end;gap:12px;padding:10px 12px;border-radius:12px;border:1px solid #E3E7F1}
.cell{display:flex;flex-direction:column;align-items:center;gap:2px}
.cell span{font-size:10px;color:#8A93AD}
.strip[style*="${BLUE}"] .cell span{color:#AFC2F5}
</style></head><body>
<h1>Ti Zwazo — ${MASCOT_MOODS.length} moods</h1>
<p>Rendered from apps/mobile/src/ui/mascot-art.ts (the same markup the app draws). 160 / 96 / 48 px on white and on the hero blue ${BLUE}.</p>
<div class="grid">${MASCOT_MOODS.map(card).join('')}</div></body></html>`;
fs.writeFileSync(path.join(here, 'contact-sheet.html'), sheet);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 2 });
await page.goto('file://' + path.join(here, 'contact-sheet.html'));
await page.screenshot({ path: path.join(here, 'contact-sheet.png'), fullPage: true });

// ─── native assets ───────────────────────────────────────────────────────────
async function png(file, w, h, inner, bg = 'transparent') {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await p.setContent(`<html><body style="margin:0;width:${w}px;height:${h}px;background:${bg};display:flex;align-items:center;justify-content:center;overflow:hidden">${inner}</body></html>`);
  await p.screenshot({ path: path.join(here, file), omitBackground: bg === 'transparent' });
  await p.close();
}
// Splash: the bird fills the 1024 canvas exactly like <MascotArt size={S}> fills an S×S box (viewBox 160×170, contain),
// so with imageWidth 180 it matches <MascotArt size={180}> centred on screen — the intro's first frame.
await png('splash-logo.png', 1024, 1024, sized(mascotXml('happy', false, { fx: false }), 1024));
// App icon: bird head-and-shoulders on the brand blue with a soft lighter disc behind.
const iconArt = (s, shift = 0) => `<div style="position:relative;width:${s}px;height:${s}px">
  <div style="position:absolute;left:${s * 0.11}px;top:${s * 0.11}px;width:${s * 0.78}px;height:${s * 0.78}px;border-radius:50%;background:#2D59D0"></div>
  <div style="position:absolute;left:0;top:${s * (0.07 + shift)}px">${sized(mascotXml('happy', false, { shadow: false, fx: false }), s)}</div></div>`;
await png('icon.png', 1024, 1024, iconArt(1000), BLUE);
await png('favicon.png', 48, 48, `<div style="margin-top:2px">${sized(mascotXml('happy', false, { shadow: false, fx: false }), 48)}</div>`, BLUE);
// Android adaptive icon: foreground inside the 66% safe zone (the launcher masks to a circle/squircle).
await png('android-icon-foreground.png', 1024, 1024, `<div style="margin-top:20px">${sized(mascotXml('happy', false, { shadow: false, fx: false }), 600)}</div>`);
await png('android-icon-background.png', 1024, 1024, `<div style="width:780px;height:780px;border-radius:50%;background:#2D59D0"></div>`, BLUE);
// Monochrome (themed icons): silhouette only.
await png('android-icon-monochrome.png', 432, 432, `<div style="filter:brightness(0)">${sized(mascotXml('happy', false, { shadow: false, fx: false }), 250)}</div>`);
// Preview of the splash as a phone shows it (360×780 dp, logo at 180 dp).
await png('splash-preview.png', 360, 780, `<img src="data:image/png;base64,${fs.readFileSync(path.join(here, 'splash-logo.png')).toString('base64')}" width="180">`, BLUE);
await browser.close();
console.log('ok');
