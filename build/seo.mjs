// SEO (docs/07): head meta, canonical absoluto, Open Graph, sitemap.xml, robots.txt y JSON-LD
// (Organization + BreadcrumbList; nunca Product/Offer). og:image: la general de marca 1200x630
// (DEFAULT_OG_IMAGE) o la de la referencia en su ficha. Pendiente: lastmod real en el sitemap (no hay
// fecha de publicación fiable en los datos).
import fs from 'node:fs';
import path from 'node:path';
import { SITE_URL, SITE_NAME, OG_LOCALE } from './config.mjs';
import { esc } from './util.mjs';

// Imagen general para compartir (assets/img/marca/og-pampi.jpg): fondo crema, logo en rojo de marca y
// la botella de passata. Composición propia a partir de assets del sitio; no es arte final aprobado.
export const DEFAULT_OG_IMAGE = {
  url: '/assets/img/marca/og-pampi.jpg',
  width: 1200,
  height: 630,
  alt: 'Logo de Pampi en rojo junto a la botella de passata Pampi sobre fondo crema',
};

export function absoluteUrl(urlPath) {
  return new URL(urlPath, SITE_URL + '/').href;
}

/**
 * @param {object} o
 * @param {string} o.title       title único de la página
 * @param {string} o.description meta description
 * @param {string|null} o.path   ruta canónica ("/productos/"); null = sin canonical (404)
 * @param {boolean} o.noindex    true -> robots noindex,nofollow
 * @param {string} [o.ogType]    "website" por defecto
 * @param {{url:string,width:number,height:number,alt:string}} [o.ogImage] imagen para compartir
 */
export function headMeta({ title, description, path: urlPath, noindex, ogType = 'website', ogImage = DEFAULT_OG_IMAGE }) {
  const lines = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}">`,
  ];
  if (noindex) lines.push('<meta name="robots" content="noindex,nofollow">');
  if (urlPath) lines.push(`<link rel="canonical" href="${esc(absoluteUrl(urlPath))}">`);
  lines.push(
    `<meta property="og:site_name" content="${esc(SITE_NAME)}">`,
    `<meta property="og:locale" content="${OG_LOCALE}">`,
    `<meta property="og:type" content="${esc(ogType)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
  );
  if (urlPath) lines.push(`<meta property="og:url" content="${esc(absoluteUrl(urlPath))}">`);
  const img = ogImage || DEFAULT_OG_IMAGE;
  lines.push(
    `<meta property="og:image" content="${esc(absoluteUrl(img.url))}">`,
    `<meta property="og:image:width" content="${img.width}">`,
    `<meta property="og:image:height" content="${img.height}">`,
    `<meta property="og:image:alt" content="${esc(img.alt)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:image:alt" content="${esc(img.alt)}">`,
  );
  return lines.join('\n');
}

/** Escribe sitemap.xml solo con rutas públicas indexables (200). */
export function writeSitemap(distDir, paths) {
  const urls = [...new Set(paths)]
    .map((p) => `  <url><loc>${esc(absoluteUrl(p))}</loc></url>`)
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), xml);
}

/** robots.txt: público permite y enlaza sitemap; staging bloquea todo (robots no es control de acceso). */
export function writeRobots(distDir, { staging }) {
  const body = staging
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n\nSitemap: ${absoluteUrl('/sitemap.xml')}\n`;
  fs.writeFileSync(path.join(distDir, 'robots.txt'), body);
}

// ---------------------------------------------------------------------------
// JSON-LD (docs/07 · Schema).
// - Organization: solo name + url (sin legalName, address, logo ni sameAs: no están verificados).
// - BreadcrumbList: derivado de las migas visibles de cada página pública.
// - NUNCA Product/Offer/price/availability: el paquete no publica schema de productos conceptuales.
//   build/check.mjs falla si aparece cualquiera de esos tipos o propiedades.
// ---------------------------------------------------------------------------

const unesc = (s) => String(s).replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ({
  amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'",
}[e]));

/** Serializa un objeto JSON-LD de forma segura para incrustarlo en <script>. */
export function jsonLdScript(obj) {
  const json = JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  return `<script type="application/ld+json">${json}</script>`;
}

export function organizationLd() {
  // SITE_URL pendiente de confirmar (pampifood.com frente a pampifoods.com): ver build/config.mjs.
  return { '@context': 'https://schema.org', '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/') };
}

/**
 * BreadcrumbList a partir del <nav class="crumbs"> ya renderizado (layout.breadcrumbs()).
 * El último elemento (página actual) usa la URL canónica de la página.
 * @returns {object|null}
 */
export function breadcrumbLdFromHtml(html, canonicalPath) {
  const nav = html.match(/<nav class="crumbs"[^>]*>([\s\S]*?)<\/nav>/);
  if (!nav || !canonicalPath) return null;
  const items = [];
  for (const m of nav[1].matchAll(/<li>(?:<a href="([^"]+)">([\s\S]*?)<\/a>|<span aria-current="page">([\s\S]*?)<\/span>)<\/li>/g)) {
    const href = m[1] ?? canonicalPath;
    const name = unesc((m[2] ?? m[3]).replace(/<[^>]+>/g, '').trim());
    items.push({ '@type': 'ListItem', position: items.length + 1, name, item: absoluteUrl(href) });
  }
  if (items.length < 2) return null;
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
}
