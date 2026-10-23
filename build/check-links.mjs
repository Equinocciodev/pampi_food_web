// Comprueba que todos los href/src/srcset internos de dist/ resuelven a archivos existentes.
// Uso: node build/check-links.mjs   (tras un build, en cualquier modo)
import fs from 'node:fs';
import path from 'node:path';
import { DIST_DIR, SITE_URL } from './config.mjs';

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) walk(abs, out); else out.push(abs);
  }
  return out;
}

function resolveTarget(fromFile, ref) {
  let u = ref.trim();
  if (!u || u.startsWith('#') || /^(mailto:|tel:|data:|javascript:)/i.test(u)) return null;
  if (u.startsWith(SITE_URL)) u = u.slice(SITE_URL.length) || '/';
  if (/^[a-z]+:\/\//i.test(u) || u.startsWith('//')) return { external: true };
  u = u.split('#')[0].split('?')[0];
  if (!u) return null;
  const base = u.startsWith('/') ? DIST_DIR : path.dirname(fromFile);
  let target = path.join(base, decodeURIComponent(u));
  if (u.endsWith('/')) target = path.join(target, 'index.html');
  return { target };
}

const files = walk(DIST_DIR);
const html = files.filter((f) => f.endsWith('.html'));
let checked = 0;
let external = 0;
const broken = [];
const attr = /\b(?:href|src)="([^"]*)"|\bsrcset="([^"]*)"/g;
for (const f of html) {
  const txt = fs.readFileSync(f, 'utf8');
  for (const m of txt.matchAll(attr)) {
    const refs = m[1] !== undefined ? [m[1]] : m[2].split(',').map((s) => s.trim().split(/\s+/)[0]);
    for (const ref of refs) {
      const r = resolveTarget(f, ref);
      if (!r) continue;
      if (r.external) { external += 1; continue; }
      checked += 1;
      if (!fs.existsSync(r.target) || fs.statSync(r.target).isDirectory()) {
        broken.push(`${path.relative(DIST_DIR, f)} -> ${ref}`);
      }
    }
  }
}
// Sitemap: cada <loc> debe existir.
const sm = path.join(DIST_DIR, 'sitemap.xml');
let locs = 0;
if (fs.existsSync(sm)) {
  for (const m of fs.readFileSync(sm, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) {
    locs += 1;
    const r = resolveTarget(path.join(DIST_DIR, 'index.html'), m[1]);
    if (!r || r.external || !fs.existsSync(r.target)) broken.push(`sitemap.xml -> ${m[1]}`);
  }
}
console.log(`[check-links] ${html.length} HTML · ${checked} referencias internas comprobadas · ${external} externas ignoradas · ${locs} URLs en sitemap · ${broken.length} rotas`);
if (broken.length) {
  console.error(broken.slice(0, 50).join('\n'));
  process.exit(1);
}
