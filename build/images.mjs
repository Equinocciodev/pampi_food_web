// Imágenes responsivas: variantes WebP 480/800/1200 de cada JPEG del manifest (docs/07).
//
//   node build/images.mjs   -> genera/actualiza assets/img/derived/<nombre>-<ancho>.webp
//
// Las variantes se versionan en el repo para que el build (y GitHub Actions) no dependa de
// cwebp/sips. Generación: cwebp si existe; si no, sips (macOS) -> WebP; si ninguno existe,
// no se generan y el build sirve solo el JPEG original (se avisa por consola).
// El build NO genera imágenes: solo usa las que existan en disco (determinista).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { IMG_DIR, IMG_URL_BASE, DATA_DIR } from './config.mjs';

export const WIDTHS = [480, 800, 1200];
export const WEBP_QUALITY = 74;
export const DERIVED_DIR = path.join(IMG_DIR, 'derived');
export const DERIVED_URL_BASE = `${IMG_URL_BASE}derived/`;

// "sizes" por contexto de maquetación (anchos de assets/css/main.css: container 1200,
// grid 2/3/4 columnas, hero 1.05fr, PDP 1.2fr). Clave = clase del contenedor de la imagen.
export const SIZES = {
  'hero-media': '(min-width: 1248px) 615px, (min-width: 768px) 52vw, 100vw',
  'detail-media': '(min-width: 1248px) 660px, (min-width: 768px) 55vw, 100vw',
  'card-media': '(min-width: 1248px) 280px, (min-width: 1024px) 23vw, (min-width: 768px) 31vw, (min-width: 360px) 46vw, 100vw',
  editorial: '(min-width: 1248px) 610px, (min-width: 768px) 50vw, 100vw',
  'family-visual': '(min-width: 1248px) 1152px, 100vw',
  default: '100vw',
};

const base = (file) => path.basename(file, path.extname(file));
export const variantFile = (jpgName, w) => `${base(jpgName)}-${w}.webp`;

/** Variantes disponibles en disco para un JPEG (solo anchos < ancho original). */
export function variantsFor(jpgName, originalWidth) {
  const out = [];
  for (const w of WIDTHS) {
    if (originalWidth && w > originalWidth) continue;
    const f = variantFile(jpgName, w);
    if (fs.existsSync(path.join(DERIVED_DIR, f))) out.push({ w, url: DERIVED_URL_BASE + f, file: f });
  }
  return out;
}

function has(cmd) {
  try { execFileSync('/usr/bin/which', [cmd], { stdio: 'ignore' }); return true; } catch { return false; }
}

function generate() {
  const manifest = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'asset-manifest.json'), 'utf8'));
  const tool = has('cwebp') ? 'cwebp' : (has('sips') ? 'sips' : null);
  if (!tool) {
    console.warn('[images] Ni cwebp ni sips disponibles: no se generan WebP; el sitio usará los JPEG originales.');
    return;
  }
  fs.mkdirSync(DERIVED_DIR, { recursive: true });
  const expected = new Set();
  let made = 0;
  for (const a of manifest) {
    const jpg = path.basename(a.path);
    const src = path.join(IMG_DIR, jpg);
    for (const w of WIDTHS) {
      if (w > a.width) continue;
      const outName = variantFile(jpg, w);
      expected.add(outName);
      const out = path.join(DERIVED_DIR, outName);
      if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs) continue;
      if (tool === 'cwebp') {
        execFileSync('cwebp', ['-quiet', '-q', String(WEBP_QUALITY), '-m', '6', '-metadata', 'none', '-resize', String(w), '0', src, '-o', out]);
      } else {
        execFileSync('sips', ['-s', 'format', 'webp', '-s', 'formatOptions', String(WEBP_QUALITY), '--resampleWidth', String(w), src, '--out', out], { stdio: 'ignore' });
      }
      made += 1;
    }
  }
  // Limpia variantes huérfanas (assets que ya no están en el manifest).
  for (const f of fs.readdirSync(DERIVED_DIR)) {
    if (!expected.has(f)) fs.rmSync(path.join(DERIVED_DIR, f));
  }
  console.log(`[images] ${tool}: ${made} variantes nuevas · ${expected.size} en total en ${path.relative(process.cwd(), DERIVED_DIR)}/`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) generate();

/**
 * Post-proceso del HTML renderizado: envuelve cada <img src="/assets/img/<x>.jpg"> en un
 * <picture> con <source type="image/webp" srcset sizes>. El JPEG original queda como fallback.
 * Además asegura la política de carga: solo la primera imagen sin loading="lazy" (la del hero)
 * se carga ansiosa con fetchpriority="high"; el resto pasa a loading="lazy".
 * No toca las plantillas: así el marcado de las plantillas sigue siendo un <img> simple.
 */
export function responsiveImages(html) {
  const imgRe = /<img\b[^>]*>/g;
  let eagerSeen = false;
  let out = '';
  let last = 0;
  for (const m of html.matchAll(imgRe)) {
    let tag = m[0];
    const src = tag.match(/\bsrc="([^"]+)"/)?.[1] || '';
    // Política de carga.
    const lazy = /\bloading="lazy"/.test(tag);
    if (!lazy) {
      if (!eagerSeen) {
        eagerSeen = true;
        if (!/\bfetchpriority=/.test(tag)) tag = tag.replace(/^<img\b/, '<img fetchpriority="high"');
      } else {
        tag = tag.replace(/\s*\bfetchpriority="[^"]*"/, '').replace(/^<img\b/, '<img loading="lazy"');
      }
    }
    let replacement = tag;
    const jm = src.startsWith(IMG_URL_BASE) && src.match(/\/([^/]+\.jpe?g)$/i);
    if (jm) {
      const width = Number(tag.match(/\bwidth="(\d+)"/)?.[1]) || 0;
      const variants = variantsFor(jm[1], width);
      if (variants.length) {
        const ctxWindow = html.slice(Math.max(0, m.index - 600), m.index);
        let sizes = SIZES.default;
        let best = -1;
        for (const cm of ctxWindow.matchAll(/class="([^"]*)"/g)) {
          const key = cm[1].split(/\s+/).find((c) => c !== "default" && Object.hasOwn(SIZES, c));
          if (key && cm.index > best) { best = cm.index; sizes = SIZES[key]; }
        }
        const srcset = variants.map((v) => `${v.url} ${v.w}w`).join(', ');
        replacement = `<picture><source type="image/webp" srcset="${srcset}" sizes="${sizes}">${tag}</picture>`;
      }
    }
    out += html.slice(last, m.index) + replacement;
    last = m.index + m[0].length;
  }
  return out + html.slice(last);
}
