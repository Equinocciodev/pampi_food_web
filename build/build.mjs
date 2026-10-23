// Generador estático PAMPI. Uso:
//   node build/build.mjs            -> PÚBLICO (por defecto; el que se despliega)
//   STAGING=1 node build/build.mjs  -> STAGING local (50 conceptos, noindex en todo, sin sitemap)
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT, DIST_DIR, ASSETS_DIR, STAGING, MODE, ROOT_PASSTHROUGH, SEARCH_INDEX_URL,
} from './config.mjs';
import { loadData } from './data.mjs';
import { page } from './layout.mjs';
import {
  writeSitemap, writeRobots, jsonLdScript, organizationLd, breadcrumbLdFromHtml, absoluteUrl,
} from './seo.mjs';
import { responsiveImages } from './images.mjs';
import { runChecks } from './check.mjs';
import { normalize } from './util.mjs';

import inicio from './templates/inicio.mjs';
import catalogo from './templates/catalogo.mjs';
import familia from './templates/familia.mjs';
import producto from './templates/producto.mjs';
import nosotros from './templates/nosotros.mjs';
import distribucion from './templates/distribucion.mjs';
import contacto from './templates/contacto.mjs';
import privacidad from './templates/privacidad.mjs';
import notFound from './templates/404.mjs';

const TEMPLATES = [inicio, catalogo, familia, producto, nosotros, distribucion, contacto, privacidad, notFound];

function routeToFile(route, explicit) {
  if (explicit) return explicit;
  if (route === '/') return 'index.html';
  return path.posix.join(route.replace(/^\/|\/$/g, ''), 'index.html');
}

function write(rel, content) {
  const abs = path.join(DIST_DIR, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

function searchTerms(p) {
  const extra = [];
  if (/\bedam\b/i.test(p.name)) extra.push('edan');
  if (p.familyId === 'tes-infusiones') extra.push('te', 'tes', 'infusion', 'infusiones');
  return normalize([p.name, ...extra].join(' '));
}

// JSON-LD solo en páginas públicas indexables: Organization en inicio y BreadcrumbList en el resto.
// Nunca Product/Offer (docs/07). En STAGING no se emite schema.
function structuredData(html, pg, canonicalPath) {
  if (canonicalPath === '/') return jsonLdScript(organizationLd());
  let crumbs = breadcrumbLdFromHtml(html, canonicalPath);
  if (!crumbs) {
    // Páginas de primer nivel sin migas visibles (Nosotros, Distribución, Contacto).
    const label = String(pg.title).split(' | ')[0];
    crumbs = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: absoluteUrl('/') },
        { '@type': 'ListItem', position: 2, name: label, item: absoluteUrl(canonicalPath) },
      ],
    };
  }
  return jsonLdScript(crumbs);
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) walk(abs, out); else out.push(abs);
  }
  return out;
}

function main() {
  const started = Date.now();
  const data = loadData({ staging: STAGING });
  const ctx = { staging: STAGING, mode: MODE, data };

  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });

  // Páginas.
  const pages = TEMPLATES.flatMap((t) => t(ctx));
  const files = new Set();
  const sitemapPaths = [];
  for (const pg of pages) {
    const file = routeToFile(pg.route, pg.file);
    if (files.has(file)) throw new Error(`Ruta duplicada: ${pg.route}`);
    files.add(file);
    const canonicalPath = pg.canonical === false ? null : pg.route;
    let html = page(ctx, { ...pg, path: canonicalPath });
    const indexable = !STAGING && pg.noindex !== true && canonicalPath;
    if (indexable) html = html.replace('</head>', `${structuredData(html, pg, canonicalPath)}\n</head>`);
    html = responsiveImages(html);
    write(file, html);
    if (indexable && pg.inSitemap !== false) sitemapPaths.push(pg.route);
  }

  // Índice de búsqueda: SOLO referencias visibles en este modo.
  const index = data.visible.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    familyId: p.familyId,
    url: `/producto/${p.slug}/`,
    terms: searchTerms(p),
  }));
  write(SEARCH_INDEX_URL.replace(/^\//, ''), JSON.stringify(index));

  // Assets estáticos.
  for (const sub of ['css', 'js', 'img']) {
    fs.cpSync(path.join(ASSETS_DIR, sub), path.join(DIST_DIR, 'assets', sub), { recursive: true });
  }
  for (const f of ROOT_PASSTHROUGH) {
    const src = path.join(ROOT, f);
    if (!fs.existsSync(src)) throw new Error(`Falta ${f} en la raíz del repo`);
    fs.copyFileSync(src, path.join(DIST_DIR, f));
  }

  // SEO.
  writeRobots(DIST_DIR, { staging: STAGING });
  if (!STAGING) writeSitemap(DIST_DIR, sitemapPaths);

  // Guardas de modo.
  const textFiles = walk(DIST_DIR).filter((f) => /\.(html|json|xml|txt|js|css)$/.test(f));
  if (STAGING) {
    for (const f of textFiles.filter((x) => x.endsWith('.html'))) {
      if (!fs.readFileSync(f, 'utf8').includes('<meta name="robots" content="noindex,nofollow">')) {
        throw new Error(`STAGING: falta noindex en ${path.relative(DIST_DIR, f)}`);
      }
    }
  } else {
    // DAT 03: ningún concepto no publicable aparece en el build público.
    const hidden = data.catalog.filter((p) => !data.visible.includes(p));
    const leaks = [];
    for (const f of textFiles) {
      const txt = fs.readFileSync(f, 'utf8');
      for (const p of hidden) {
        if (txt.includes(p.id) || txt.includes(`/producto/${p.slug}/`)) leaks.push(`${path.relative(DIST_DIR, f)} -> ${p.id}`);
      }
    }
    if (leaks.length) throw new Error(`PÚBLICO: conceptos expuestos:\n - ${leaks.slice(0, 20).join('\n - ')}`);
  }

  // Gates de publicación (DAT 01, DAT 02, DAT 03, SEO, enlaces, rendimiento): falla si algo no cuadra.
  const report = runChecks({ expectStaging: STAGING, quiet: true });
  if (!report.ok) throw new Error(`build/check.mjs encontró ${report.errors.length} errores:\n - ${report.errors.slice(0, 30).join('\n - ')}`);

  const ms = Date.now() - started;
  console.log(`[pampi] modo ${MODE.toUpperCase()} · ${pages.length} páginas · ${index.length} referencias visibles de ${data.stats.products} · ${data.stats.families} familias · ${data.stats.assets} assets verificados · ${ms} ms`);
  console.log(`[pampi] salida: ${path.relative(ROOT, DIST_DIR)}/${STAGING ? ' (STAGING: no desplegar)' : ''}`);
  console.log(`[pampi] gates OK · ${report.summary}`);
}

try {
  main();
} catch (err) {
  console.error(`[pampi] BUILD FALLIDO: ${err.message}`);
  process.exit(1);
}
