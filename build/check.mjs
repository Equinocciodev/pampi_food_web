// Gates de publicación sobre dist/ (docs/05, docs/07, docs/08). Sin dependencias externas.
//
//   node build/check.mjs            -> comprueba dist/ en el modo detectado (o STAGING=1)
//   node build/check.mjs --public   -> exige que dist/ sea un build PÚBLICO (lo usa deploy.yml)
//   node build/check.mjs --staging  -> exige que dist/ sea un build STAGING
//
// Sale con código 1 si falla cualquiera de:
//   DAT 01  50 IDs únicos, slugs únicos, 8 familias, familyId válido (vía loadData)
//   DAT 02  todas las imágenes referenciadas existen (repo y dist) y su SHA256 coincide
//   DAT 03  Decisión del usuario (23/10/2026): el PÚBLICO publica las 50 referencias como conceptos.
//           Se exige: una ficha /producto/{slug}/ por referencia visible y cada ficha de concepto con
//           el aviso visible "En desarrollo"; ningún precio/stock/Offer/availability en dist/; ningún
//           dato comercial interno del expediente (MOQ, unidades por caja, cajas por pallet, Incoterm);
//           "Pendiente de validar" nunca incluye un campo verificado; data/fuentes/ no se copia a dist/.
//           Si PUBLISH_CONCEPTS vuelve a false, sigue exigiendo que ninguna referencia no publicable
//           (ID/slug/nombre) aparezca en dist/.
//   SEO 01  title/description/canonical/OG/lang, robots, sitemap, 404, JSON-LD sin Product/Offer
//   NAV 01  enlaces internos (href/src/srcset) y URLs del sitemap resuelven a archivos
//   PERF    width/height y alt en <img>, lazy salvo el hero, sin fuentes/CSS/JS externos,
//           scripts no bloqueantes y presupuestos de peso de docs/07
// Además imprime el peso de dist/ y de cada página principal.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import {
  DIST_DIR, IMG_DIR, SITE_URL, HTML_LANG, OG_LOCALE, SEARCH_INDEX_URL, EXPECTED_PRODUCTS, EXPECTED_FAMILIES,
} from './config.mjs';
import { loadData, imageFile } from './data.mjs';

// Nombres de referencia que también son palabras del copy de marca aprobado (app.js / docs/04:
// "passata" en el hero, "Edam y Gouda" en la sección de quesos, token de color "oliva" en CSS).
// Para estos nombres DAT 03 solo se comprueba en contextos estructurados (títulos de tarjeta,
// h1/h2, <title>, metadatos, alt, índice de búsqueda, sitemap, JSON-LD), no en texto corrido.
const BRAND_COPY_TERMS = new Set(['passata', 'edam', 'gouda', 'oliva']);

// Presupuestos de docs/07 (objetivos de diseño, no resultados medidos en campo).
const BUDGET = {
  criticalGzip: 200 * 1024, // HTML + CSS + JS comprimidos por página
  heroMobile: 250 * 1024, // imagen hero en móvil
  pageMobile: 1.5 * 1024 * 1024, // página completa en móvil (incluye imágenes bajo el pliegue)
};
const MOBILE = { vw: 390, dpr: 2 };
const DESKTOP = { vw: 1440, dpr: 1 };

const PROHIBITED_LD_TYPES = ['Product', 'Offer', 'AggregateOffer', 'AggregateRating', 'Review', 'IndividualProduct', 'ProductModel'];
const PROHIBITED_LD_KEYS = ['offers', 'price', 'priceCurrency', 'availability', 'aggregateRating', 'review', 'gtin', 'gtin8', 'gtin12', 'gtin13', 'gtin14', 'sku', 'brand'];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) walk(abs, out); else out.push(abs);
  }
  return out;
}

const rel = (f) => path.relative(DIST_DIR, f).split(path.sep).join('/');
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const unesc = (s) => String(s).replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }[e]));

/** Ruta pública de un HTML de dist/ ("productos/index.html" -> "/productos/"). */
function routeOf(file) {
  const r = rel(file);
  if (r === 'index.html') return '/';
  if (r.endsWith('/index.html')) return `/${r.slice(0, -'index.html'.length)}`;
  return `/${r}`;
}

/** Resuelve una referencia interna a un archivo de dist/ (null = no aplica, external = externa). */
function resolveTarget(fromFile, ref) {
  let u = unesc(ref.trim());
  if (!u || u.startsWith('#') || /^(mailto:|tel:|data:|javascript:)/i.test(u)) return null;
  if (u.startsWith(SITE_URL)) u = u.slice(SITE_URL.length) || '/';
  if (/^[a-z][a-z0-9+.-]*:/i.test(u) || u.startsWith('//')) return { external: true };
  u = u.split('#')[0].split('?')[0];
  if (!u) return null;
  const base = u.startsWith('/') ? DIST_DIR : path.dirname(fromFile);
  let target = path.join(base, decodeURIComponent(u));
  if (u.endsWith('/')) target = path.join(target, 'index.html');
  return { target };
}

const exists = (f) => fs.existsSync(f) && fs.statSync(f).isFile();

/** Evalúa un atributo sizes sencillo ("(min-width: Npx) X, ... , Y") para un viewport. */
function slotWidth(sizes, vw) {
  for (const part of sizes.split(',').map((s) => s.trim())) {
    const m = part.match(/^\(min-width:\s*(\d+)px\)\s+(.+)$/);
    const value = m ? m[2] : part;
    if (m && vw < Number(m[1])) continue;
    const v = value.match(/^([\d.]+)(px|vw)$/);
    if (!v) return vw;
    return v[2] === 'px' ? Number(v[1]) : (Number(v[1]) / 100) * vw;
  }
  return vw;
}

/** Imagen que descargaría un navegador con soporte WebP para cada <img>/<picture> de la página. */
function pageImages(file, html, device) {
  const out = [];
  const re = /<picture><source type="image\/webp" srcset="([^"]+)" sizes="([^"]+)">(<img\b[^>]*>)<\/picture>|<img\b[^>]*>/g;
  for (const m of html.matchAll(re)) {
    const tag = m[3] || m[0];
    const lazy = /\bloading="lazy"/.test(tag);
    let url;
    if (m[1]) {
      const cands = m[1].split(',').map((s) => s.trim().split(/\s+/)).map(([u, w]) => ({ u, w: parseInt(w, 10) }))
        .sort((a, b) => a.w - b.w);
      const need = slotWidth(m[2], device.vw) * device.dpr;
      url = (cands.find((c) => c.w >= need) || cands[cands.length - 1]).u;
    } else {
      url = tag.match(/\bsrc="([^"]+)"/)?.[1];
    }
    const r = url && resolveTarget(file, url);
    const size = r && r.target && exists(r.target) ? fs.statSync(r.target).size : 0;
    out.push({ url, size, lazy });
  }
  return out;
}

export function runChecks({ expectStaging, quiet = false } = {}) {
  const errors = [];
  const warnings = [];
  const err = (gate, msg) => errors.push(`${gate}: ${msg}`);
  const log = (...a) => { if (!quiet) console.log(...a); };

  if (!exists(path.join(DIST_DIR, 'index.html'))) {
    err('BUILD', 'dist/index.html no existe; ejecuta antes node build/build.mjs');
    return { ok: false, errors, warnings, summary: '' };
  }
  const files = walk(DIST_DIR);
  const htmlFiles = files.filter((f) => f.endsWith('.html'));
  const textFiles = files.filter((f) => /\.(html|json|xml|txt|js|css|webmanifest)$/.test(f));
  const read = new Map(textFiles.map((f) => [f, fs.readFileSync(f, 'utf8')]));

  // Modo del build: <body data-mode> de dist/index.html.
  const detected = /<body[^>]*\bdata-mode="staging"/.test(read.get(path.join(DIST_DIR, 'index.html'))) ? 'staging' : 'public';
  const staging = detected === 'staging';
  if (expectStaging !== undefined && expectStaging !== staging) {
    err('MODE', `se esperaba un build ${expectStaging ? 'STAGING' : 'PÚBLICO'} y dist/ es ${detected.toUpperCase()}`);
  }

  // ---------------- DAT 01 / DAT 02 (datos de origen) ----------------
  let data = null;
  try {
    data = loadData({ staging });
  } catch (e) {
    for (const v of e.validation || [e.message]) err('DAT', v);
  }
  if (data) {
    const ids = new Set(data.catalog.map((p) => p.id));
    const slugs = new Set(data.catalog.map((p) => p.slug));
    if (data.catalog.length !== EXPECTED_PRODUCTS || ids.size !== EXPECTED_PRODUCTS || slugs.size !== EXPECTED_PRODUCTS) {
      err('DAT 01', `se esperaban ${EXPECTED_PRODUCTS} IDs y slugs únicos (hay ${data.catalog.length} registros, ${ids.size} IDs, ${slugs.size} slugs)`);
    }
    if (data.families.length !== EXPECTED_FAMILIES || data.families.some((f) => !f)) err('DAT 01', `se esperaban ${EXPECTED_FAMILIES} familias`);
    for (const p of data.catalog) if (!data.familiesById.has(p.familyId)) err('DAT 01', `${p.id} con familyId inválido`);

    // DAT 02: cada imagen referenciada existe en el repo y en dist/, con el mismo contenido.
    const refs = new Set([...data.catalog.map((p) => p.primaryImage), ...data.families.map((f) => f.image)]);
    for (const ref of refs) {
      const name = imageFile(ref) || path.basename(ref);
      const src = path.join(IMG_DIR, name);
      const out = path.join(DIST_DIR, 'assets', 'img', name);
      if (!exists(src)) { err('DAT 02', `falta ${ref} en assets/img/`); continue; }
      if (!exists(out)) { err('DAT 02', `falta ${name} en dist/assets/img/`); continue; }
      const h = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
      if (h(src) !== h(out)) err('DAT 02', `${name} en dist/ no coincide con el original`);
    }
  }

  // ---------------- DAT 03 (solo PÚBLICO) ----------------
  const searchIndexFile = path.join(DIST_DIR, SEARCH_INDEX_URL.replace(/^\//, ''));
  let searchIndex = [];
  try { searchIndex = JSON.parse(read.get(searchIndexFile) ?? 'null'); } catch { err('SEARCH', 'índice de búsqueda no es JSON válido'); }
  if (!Array.isArray(searchIndex)) { err('SEARCH', `falta o no es un array: ${SEARCH_INDEX_URL}`); searchIndex = []; }
  if (data) {
    const visibleIds = new Set(data.visible.map((p) => p.id));
    for (const e of searchIndex) if (!visibleIds.has(e.id)) err('DAT 03', `índice de búsqueda incluye ${e.id}, que no es visible en este modo`);
    if (searchIndex.length !== data.visible.length) err('SEARCH', `índice con ${searchIndex.length} entradas; se esperaban ${data.visible.length}`);
  }
  if (!staging && data) {
    const hidden = data.catalog.filter((p) => !data.visible.includes(p));
    const leak = (where, p, what) => err('DAT 03', `${where} expone la referencia ${p.id} (${what})`);
    for (const [f, txt] of read) {
      const where = rel(f);
      const ftxt = fold(unesc(txt));
      for (const p of hidden) {
        if (txt.includes(p.id)) leak(where, p, 'ID');
        if (new RegExp(`(?<![a-z0-9-])${escRe(p.slug)}(?![a-z0-9-])`).test(txt)) leak(where, p, `slug ${p.slug}`);
        const n = fold(p.name);
        if (!BRAND_COPY_TERMS.has(n) && new RegExp(`(?<![\\p{L}\\p{N}])${escRe(n)}(?![\\p{L}\\p{N}])`, 'u').test(ftxt)) leak(where, p, `nombre "${p.name}"`);
      }
    }
    // Contextos estructurados: aquí ni siquiera los nombres que coinciden con el copy de marca.
    const hiddenNames = new Map(hidden.map((p) => [fold(p.name), p]));
    for (const f of htmlFiles) {
      const txt = read.get(f);
      const structured = [
        ...[...txt.matchAll(/<title>([\s\S]*?)<\/title>/g)].map((m) => m[1].split(' | ')[0]),
        ...[...txt.matchAll(/<(h1|h2|h3)\b[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => m[2].replace(/<[^>]+>/g, '')),
        ...[...txt.matchAll(/<meta (?:name|property)="(?:description|og:title|og:description)" content="([^"]*)"/g)].map((m) => m[1].split(' | ')[0]),
        ...[...txt.matchAll(/\balt="([^"]*)"/g)].map((m) => m[1].replace(/^Concepto\s+/, '').replace(/, vista de familia$/, '')),
      ].map((s) => fold(unesc(s).trim()));
      for (const s of structured) if (hiddenNames.has(s)) leak(rel(f), hiddenNames.get(s), `nombre "${hiddenNames.get(s).name}" en título/encabezado/meta/alt`);
      for (const ld of txt.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
        const body = fold(ld[1]);
        for (const [n, p] of hiddenNames) if (body.includes(`"${n}"`)) leak(rel(f), p, 'nombre en JSON-LD');
      }
    }
    for (const e of searchIndex) if (hiddenNames.has(fold(e.name))) leak('índice de búsqueda', hiddenNames.get(fold(e.name)), 'nombre');
    if (fs.existsSync(path.join(DIST_DIR, 'producto')) && data.visible.length === 0) err('DAT 03', 'existe dist/producto/ sin referencias publicables');
    for (const f of htmlFiles) {
      const r = routeOf(f);
      const m = r.match(/^\/producto\/([^/]+)\/$/);
      if (m && !data.visible.some((p) => p.slug === m[1])) err('DAT 03', `ficha publicada para un slug no publicable: ${r}`);
    }
  }

  // DAT 03 (ambos modos): fichas de concepto con aviso, sin datos comerciales, fuentes no copiadas.
  if (data) {
    const productFiles = new Map(htmlFiles.map((f) => [routeOf(f), f]).filter(([r]) => r.startsWith('/producto/')));
    for (const p of data.visible) {
      const r = `/producto/${p.slug}/`;
      const f = productFiles.get(r);
      if (!f) { err('DAT 03', `falta la ficha ${r} de ${p.id}`); continue; }
      const txt = read.get(f);
      if (p.status !== 'approved') {
        const notice = txt.match(/<p class="dev-notice"[^>]*data-dev-notice[^>]*>([\s\S]*?)<\/p>/);
        if (!notice || !/En desarrollo/i.test(notice[1].replace(/<[^>]+>/g, ''))) err('DAT 03', `${r}: la ficha de concepto no muestra el aviso "En desarrollo"`);
        if (!/data-pagefind-meta="[^"]*estado:En desarrollo/.test(txt)) err('DAT 03', `${r}: falta data-pagefind-meta estado:En desarrollo`);
      }
      // "Pendiente de validar" nunca contiene algo que ya está en verified.json.
      const v = data.verified.get(p.id) || {};
      const covers = { fabricante: 'elaboradoPor', importador: 'importadoDistribuidoPor', origen_acreditado: 'paisOrigen', formula_ingredientes: 'ingredientes', nutricion: 'nutricion', peso_neto: 'contenidoNeto', conservacion: 'conservacion', GTIN: 'codigoBarras', registro_sanitario: 'registroSanitario' };
      for (const m of txt.matchAll(/data-pending="([^"]+)"/g)) if (covers[m[1]] && v[covers[m[1]]]) err('DAT 03', `${r}: "${m[1]}" figura como pendiente pero está verificado`);
      // Ficha verificada: solo para referencias con datos en verified.json y con todos sus campos.
      const shown = new Set([...txt.matchAll(/data-verified="([^"]+)"/g)].map((m) => m[1]));
      if (!Object.keys(v).length && (shown.size || /data-verified-section/.test(txt))) err('DAT 03', `${r}: muestra "Ficha verificada" sin datos en verified.json`);
      for (const k of Object.keys(v)) if (k !== 'nutricion' && !shown.has(k)) err('DAT 03', `${r}: falta el dato verificado ${k}`);
      if (v.nutricion && !/<table class="nutrition-table">[\s\S]*?<caption>/.test(txt)) err('DAT 03', `${r}: falta la tabla nutricional verificada`);
    }
    for (const [r] of productFiles) if (!data.visible.some((p) => r === `/producto/${p.slug}/`)) err('DAT 03', `ficha publicada para un slug no visible en este modo: ${r}`);
  }
  const visibleText = (txt) => unesc(txt.replace(/<script\b[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' '));
  for (const [f, txt] of read) {
    const where = rel(f);
    if (/"@type"\s*:\s*"(?:Offer|AggregateOffer|Product)"|"(?:price|priceCurrency|availability|offers)"\s*:|itemprop="(?:price|offers|availability|priceCurrency)"|schema\.org\/(?:InStock|OutOfStock|PreOrder|LimitedAvailability)/.test(txt)) {
      err('DAT 03', `${where}: precio/Offer/availability en datos o marcado`);
    }
    if (f.endsWith('.html') && routeOf(f).startsWith('/producto/')) {
      const t = visibleText(txt);
      if (/\bprecios?\b|\bstock\b|\bdisponibilidad\b|\bincoterm\b|\bMOQ\b|unidades por caja|cajas por pallet|\bUSD\b|US\$|€|\bBs\.?\s?\d/i.test(t)) err('DAT 03', `${where}: texto de precio, stock o datos comerciales internos`);
    }
  }
  for (const f of files) {
    const r = rel(f);
    if (/(^|\/)fuentes\//.test(r) || /etiqueta-passata\.jpg$|registro-sanitario-[^/]*\.pdf$|\.pdf$/i.test(r)) err('DAT 03', `dist/${r}: los documentos de data/fuentes/ no se publican`);
  }

  // ---------------- SEO 01 ----------------
  const titles = new Map();
  const indexable = new Set();
  let ldBlocks = 0;
  for (const f of htmlFiles) {
    const txt = read.get(f);
    const r = routeOf(f);
    const where = rel(f);
    const is404 = r === '/404.html';
    if (!txt.startsWith('<!doctype html>')) err('SEO 01', `${where}: falta <!doctype html>`);
    if (!new RegExp(`<html lang="${escRe(HTML_LANG)}">`).test(txt)) err('SEO 01', `${where}: <html lang> debe ser "${HTML_LANG}"`);
    const title = txt.match(/<title>([^<]*)<\/title>/)?.[1]?.trim();
    if (!title) err('SEO 01', `${where}: sin <title>`);
    else if (titles.has(title)) err('SEO 01', `${where}: title duplicado con ${titles.get(title)} ("${title}")`);
    else titles.set(title, where);
    const desc = txt.match(/<meta name="description" content="([^"]*)">/)?.[1]?.trim();
    if (!desc) err('SEO 01', `${where}: sin meta description`);
    else if (unesc(desc).length > 160) warnings.push(`SEO 01: ${where}: meta description de ${unesc(desc).length} caracteres (>160, Google la recortará)`);
    const noindex = /<meta name="robots" content="noindex,nofollow">/.test(txt);
    if (staging && !noindex) err('SEO 01', `${where}: STAGING sin noindex,nofollow`);
    const canonical = txt.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
    if (is404) {
      if (!noindex) err('SEO 01', '404.html debe llevar noindex');
      if (canonical) err('SEO 01', '404.html no debe llevar canonical');
    } else {
      const expected = new URL(r, `${SITE_URL}/`).href;
      if (canonical !== expected) err('SEO 01', `${where}: canonical "${canonical}" ≠ "${expected}"`);
      const og = (p) => txt.match(new RegExp(`<meta property="og:${p}" content="([^"]*)">`))?.[1];
      for (const p of ['title', 'description', 'type', 'url', 'site_name']) if (!og(p)) err('SEO 01', `${where}: falta og:${p}`);
      if (og('url') && og('url') !== expected) err('SEO 01', `${where}: og:url ≠ canonical`);
      if (og('locale') !== OG_LOCALE) err('SEO 01', `${where}: og:locale debe ser ${OG_LOCALE}`);
      const ogImg = og('image');
      if (!ogImg) err('SEO 01', `${where}: falta og:image`);
      else if (!ogImg.startsWith(`${SITE_URL}/`)) err('SEO 01', `${where}: og:image no es absoluta a SITE_URL (${ogImg})`);
      else if (!exists(path.join(DIST_DIR, new URL(ogImg).pathname))) err('SEO 01', `${where}: og:image no existe en dist/ (${ogImg})`);
      const ogW = Number(og('image:width'));
      const ogH = Number(og('image:height'));
      if (!ogW || !ogH) err('SEO 01', `${where}: og:image sin width/height`);
      else if (Math.min(ogW, ogH) < 600) err('SEO 01', `${where}: og:image de ${ogW}x${ogH} (< 600 px)`);
      if (!og('image:alt')) err('SEO 01', `${where}: og:image sin alt`);
      if (!/<meta name="twitter:card" content="summary_large_image">/.test(txt)) err('SEO 01', `${where}: falta twitter:card summary_large_image`);
      if (!noindex) indexable.add(expected);
    }
    // JSON-LD: válido y sin schema comercial.
    const lds = [...txt.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    if (staging && lds.length) err('SEO 01', `${where}: STAGING no debe emitir JSON-LD`);
    if (!staging && !noindex && !is404) {
      const types = [];
      for (const ld of lds) {
        let obj;
        try { obj = JSON.parse(ld[1]); } catch { err('SEO 01', `${where}: JSON-LD inválido`); continue; }
        ldBlocks += 1;
        types.push(obj['@type']);
        const walkLd = (o) => {
          if (!o || typeof o !== 'object') return;
          for (const [k, v] of Object.entries(o)) {
            if (PROHIBITED_LD_KEYS.includes(k)) err('SEO 01', `${where}: JSON-LD con propiedad prohibida "${k}"`);
            if (k === '@type' && [].concat(v).some((t) => PROHIBITED_LD_TYPES.includes(t))) err('SEO 01', `${where}: JSON-LD con @type prohibido ${v}`);
            if (typeof v === 'string' && /^https?:\/\//.test(v) && !v.startsWith(SITE_URL) && !v.startsWith('https://schema.org')) err('SEO 01', `${where}: JSON-LD apunta fuera de SITE_URL (${v})`);
            walkLd(v);
          }
        };
        walkLd(obj);
        if (obj['@type'] === 'BreadcrumbList') {
          const items = obj.itemListElement || [];
          if (items.at(-1)?.item !== new URL(r, `${SITE_URL}/`).href) err('SEO 01', `${where}: el último elemento de BreadcrumbList no es la página actual`);
          items.forEach((it, i) => { if (it.position !== i + 1 || !it.name || !it.item) err('SEO 01', `${where}: ListItem ${i + 1} incompleto`); });
        }
        if (obj['@type'] === 'Organization') {
          const extra = Object.keys(obj).filter((k) => !['@context', '@type', 'name', 'url'].includes(k));
          if (extra.length) err('SEO 01', `${where}: Organization con datos no verificados (${extra.join(', ')})`);
        }
      }
      const want = r === '/' ? 'Organization' : 'BreadcrumbList';
      if (!types.includes(want)) err('SEO 01', `${where}: falta JSON-LD ${want}`);
    }
    if (/schema\.org\/(InStock|OutOfStock|PreOrder)|itemprop="(price|offers|availability)"/.test(txt)) err('SEO 01', `${where}: metadatos de disponibilidad/precio`);
  }
  if (!exists(path.join(DIST_DIR, '404.html'))) err('NAV 01', 'falta dist/404.html');

  const robots = read.get(path.join(DIST_DIR, 'robots.txt')) ?? '';
  const sitemapFile = path.join(DIST_DIR, 'sitemap.xml');
  const sitemapLocs = exists(sitemapFile) ? [...read.get(sitemapFile).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]) : [];
  if (staging) {
    if (!/User-agent: \*\s*\nDisallow: \/\s*$/m.test(robots)) err('SEO 01', 'STAGING: robots.txt debe ser "Disallow: /"');
    if (exists(sitemapFile)) err('SEO 01', 'STAGING: no debe existir sitemap.xml');
  } else {
    if (!robots.includes(`Sitemap: ${SITE_URL}/sitemap.xml`)) err('SEO 01', 'robots.txt sin línea Sitemap absoluta');
    if (/^Disallow: \/\s*$/m.test(robots)) err('SEO 01', 'robots.txt PÚBLICO bloquea todo el sitio');
    if (!exists(sitemapFile)) err('SEO 01', 'falta sitemap.xml');
    const locSet = new Set(sitemapLocs);
    if (locSet.size !== sitemapLocs.length) err('SEO 01', 'sitemap.xml con URLs duplicadas');
    for (const loc of sitemapLocs) {
      if (!loc.startsWith(`${SITE_URL}/`)) err('SEO 01', `sitemap: URL no absoluta a SITE_URL: ${loc}`);
      if (!indexable.has(loc)) err('SEO 01', `sitemap: ${loc} no es una página indexable (200 sin noindex)`);
      if (/\/producto\//.test(loc) && data && !data.visible.some((p) => loc.endsWith(`/producto/${p.slug}/`))) err('DAT 03', `sitemap incluye una ficha no publicable: ${loc}`);
    }
    for (const u of indexable) if (!locSet.has(u)) err('SEO 01', `página indexable fuera del sitemap: ${u}`);
  }

  // ---------------- NAV 01: enlaces internos ----------------
  let checked = 0;
  const attr = /\b(?:href|src)="([^"]*)"|\b(?:srcset|imagesrcset)="([^"]*)"/g;
  for (const f of htmlFiles) {
    for (const m of read.get(f).matchAll(attr)) {
      const refs = m[1] !== undefined ? [m[1]] : m[2].split(',').map((s) => s.trim().split(/\s+/)[0]);
      for (const ref of refs) {
        const r = resolveTarget(f, ref);
        if (!r || r.external) continue;
        checked += 1;
        if (!exists(r.target)) err('NAV 01', `${rel(f)} -> ${ref} no existe`);
      }
    }
  }
  for (const loc of sitemapLocs) {
    const r = resolveTarget(path.join(DIST_DIR, 'index.html'), loc);
    if (!r || r.external || !exists(r.target)) err('NAV 01', `sitemap.xml -> ${loc} no existe`);
  }

  // ---------------- PERF ----------------
  for (const f of htmlFiles) {
    const txt = read.get(f);
    const where = rel(f);
    const imgs = [...txt.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
    for (const tag of imgs) {
      if (!/\bwidth="\d+"/.test(tag) || !/\bheight="\d+"/.test(tag)) err('PERF', `${where}: <img> sin width/height: ${tag.slice(0, 90)}`);
      if (!/\balt="/.test(tag)) err('A11Y', `${where}: <img> sin alt`);
    }
    const eager = imgs.filter((t) => !/\bloading="lazy"/.test(t));
    if (eager.length > 1) err('PERF', `${where}: ${eager.length} imágenes sin loading="lazy" (solo el hero puede cargar ansiosa)`);
    for (const t of eager) if (!/\bfetchpriority="high"/.test(t)) err('PERF', `${where}: imagen ansiosa sin fetchpriority="high"`);
    if (/<link\b[^>]*rel="(?:stylesheet|preload|preconnect)"[^>]*href="(?:https?:)?\/\//.test(txt)) err('PERF', `${where}: hoja de estilos/preload externo`);
    if (/fonts\.(googleapis|gstatic)\.com|use\.typekit|<link[^>]+as="font"/.test(txt)) err('PERF', `${where}: fuentes web externas`);
    for (const s of txt.matchAll(/<script\b([^>]*)>/g)) {
      const a = s[1];
      if (/\bsrc="(?:https?:)?\/\//.test(a)) err('PERF', `${where}: script externo`);
      if (/\bsrc=/.test(a) && !/type="module"|\bdefer\b|\basync\b/.test(a)) err('PERF', `${where}: script bloqueante ${a.trim()}`);
    }
  }
  for (const f of files.filter((x) => x.endsWith('.css'))) {
    const css = read.get(f);
    if (/@import|url\(\s*["']?(?:https?:)?\/\//.test(css)) err('PERF', `${rel(f)}: @import o recurso externo en CSS`);
    if (/@font-face/.test(css)) warnings.push(`PERF: ${rel(f)} declara @font-face (se pidió usar fuentes del sistema)`);
  }

  // Peso por página principal.
  const assetCache = new Map();
  const sizeOf = (fromFile, url) => {
    const r = resolveTarget(fromFile, url);
    if (!r || r.external || !exists(r.target)) return { raw: 0, gz: 0 };
    if (!assetCache.has(r.target)) {
      const buf = fs.readFileSync(r.target);
      assetCache.set(r.target, { raw: buf.length, gz: zlib.gzipSync(buf, { level: 9 }).length });
    }
    return assetCache.get(r.target);
  };
  const MAIN = ['/', '/productos/', '/productos/tomates/', '/nosotros/', '/distribucion/', '/contacto/', '/privacidad/', '/404.html'];
  const firstProduct = htmlFiles.map(routeOf).find((r) => r.startsWith('/producto/'));
  if (firstProduct) MAIN.push(firstProduct);
  const perf = [];
  for (const r of MAIN) {
    const f = r === '/404.html' ? path.join(DIST_DIR, '404.html') : path.join(DIST_DIR, r.slice(1), 'index.html');
    if (!exists(f)) continue;
    const txt = read.get(f);
    const html = { raw: Buffer.byteLength(txt), gz: zlib.gzipSync(txt, { level: 9 }).length };
    const deps = [
      ...[...txt.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map((m) => m[1]),
      ...[...txt.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]),
    ];
    // site.js importa forms.js como módulo en páginas con formulario: se cuenta si existe el import.
    const siteJs = read.get(path.join(DIST_DIR, 'assets/js/site.js')) || '';
    if (/<form\b/.test(txt) && /forms\.js/.test(siteJs) && !deps.includes('/assets/js/forms.js')) deps.push('/assets/js/forms.js');
    if (/data-page="(?:catalog|family|catalogo|familia)"|data-search/.test(txt)) deps.push(SEARCH_INDEX_URL);
    const crit = deps.reduce((acc, u) => { const s = sizeOf(f, u); return { raw: acc.raw + s.raw, gz: acc.gz + s.gz }; }, html);
    const mob = pageImages(f, txt, MOBILE);
    const desk = pageImages(f, txt, DESKTOP);
    // Cada URL se descarga una sola vez (caché del navegador): se suman imágenes únicas.
    const sum = (a) => [...new Map(a.map((i) => [i.url, i.size])).values()].reduce((n, x) => n + x, 0);
    const hero = mob.find((i) => !i.lazy);
    const row = {
      route: r,
      htmlGz: html.gz,
      criticalGz: crit.gz,
      criticalRaw: crit.raw,
      imgs: mob.length,
      heroMobile: hero ? hero.size : 0,
      mobileTotal: crit.gz + sum(mob),
      mobileAboveFold: crit.gz + (hero ? hero.size : 0),
      desktopTotal: crit.gz + sum(desk),
    };
    perf.push(row);
    if (row.criticalGz > BUDGET.criticalGzip) err('PERF', `${r}: HTML+CSS+JS comprimidos ${kb(row.criticalGz)} > ${kb(BUDGET.criticalGzip)}`);
    if (row.heroMobile > BUDGET.heroMobile) err('PERF', `${r}: hero móvil ${kb(row.heroMobile)} > ${kb(BUDGET.heroMobile)}`);
    if (row.mobileTotal > BUDGET.pageMobile) err('PERF', `${r}: página móvil ${kb(row.mobileTotal)} > ${kb(BUDGET.pageMobile)}`);
  }
  const distBytes = files.reduce((n, f) => n + fs.statSync(f).size, 0);
  const imgBytes = files.filter((f) => /\.(jpe?g|webp|png|avif|svg)$/.test(f)).reduce((n, f) => n + fs.statSync(f).size, 0);

  const summary = `${detected.toUpperCase()} · ${htmlFiles.length} HTML · ${checked} refs internas · ${sitemapLocs.length} URLs en sitemap · ${ldBlocks} JSON-LD · dist/ ${kb(distBytes)} (imágenes ${kb(imgBytes)}) · ${errors.length} errores · ${warnings.length} avisos`;
  log(`[check] ${summary}`);
  log(`[check] Peso por página (HTML/CSS/JS gzip; imágenes únicas WebP elegidas por srcset, incluidas las lazy; móvil ${MOBILE.vw}px@${MOBILE.dpr}x, escritorio ${DESKTOP.vw}px@${DESKTOP.dpr}x):`);
  log(`  ${'ruta'.padEnd(26)} ${'html gz'.padStart(9)} ${'crít. gz'.padStart(9)} ${'img'.padStart(4)} ${'hero móv'.padStart(9)} ${'1.ª vista'.padStart(10)} ${'móvil tot'.padStart(10)} ${'escrit. tot'.padStart(11)}`);
  for (const p of perf) {
    log(`  ${p.route.slice(0, 26).padEnd(26)} ${kb(p.htmlGz).padStart(9)} ${kb(p.criticalGz).padStart(9)} ${String(p.imgs).padStart(4)} ${kb(p.heroMobile).padStart(9)} ${kb(p.mobileAboveFold).padStart(10)} ${kb(p.mobileTotal).padStart(10)} ${kb(p.desktopTotal).padStart(11)}`);
  }
  for (const w of warnings) log(`[check] aviso · ${w}`);
  if (errors.length && !quiet) console.error(`[check] ${errors.length} errores:\n - ${errors.join('\n - ')}`);
  return { ok: errors.length === 0, errors, warnings, summary, perf, distBytes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  let expectStaging;
  if (args.includes('--public')) expectStaging = false;
  else if (args.includes('--staging')) expectStaging = true;
  else if (process.env.STAGING !== undefined) expectStaging = process.env.STAGING === '1';
  const report = runChecks({ expectStaging });
  process.exit(report.ok ? 0 : 1);
}
