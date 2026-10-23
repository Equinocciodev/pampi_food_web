// Layout común: head, header, footer, skip link, breadcrumbs y componentes compartidos.
import fs from 'node:fs';
import path from 'node:path';
import { HTML_LANG, IMG_DIR } from './config.mjs';
import { headMeta } from './seo.mjs';
import { esc } from './util.mjs';
import { imageUrl } from './data.mjs';
import { DERIVED_DIR, DERIVED_URL_BASE, variantFile } from './images.mjs';

const NAV = [
  { href: '/productos/', label: 'Productos', key: 'productos' },
  { href: '/nosotros/', label: 'Nuestra visión', key: 'nosotros' },
  { href: '/distribucion/', label: 'Distribución', key: 'distribucion' },
];

// Color del navegador (barra de Safari/Chrome móvil): el fondo crema de la cabecera.
const THEME_COLOR = '#F6F2E7';

// Logo oficial: vector trazado de la etiqueta real (assets/img/marca/logo-pampi.svg, fill currentColor).
// Va en línea para heredar el color del texto (rojo de marca en la cabecera). El pie reutiliza el
// mismo trazo con <use>, así el HTML no lleva el vector dos veces.
const LOGO_SRC = fs.readFileSync(path.join(IMG_DIR, 'marca', 'logo-pampi.svg'), 'utf8');
const LOGO_VIEWBOX = LOGO_SRC.match(/viewBox="([^"]+)"/)?.[1];
const LOGO_TRAZO = LOGO_SRC.match(/<g\b[\s\S]*<\/g>/)?.[0];
if (!LOGO_VIEWBOX || !LOGO_TRAZO) throw new Error('logo-pampi.svg: no se encuentra viewBox o el grupo del trazo');
const LOGO_ID = 'pampi-logo-trazo';
const LOGO_NOMBRE = 'Pampi, inicio';
const [, , LOGO_W, LOGO_H] = LOGO_VIEWBOX.split(/\s+/).map(Number);

function logoSvg({ footer = false } = {}) {
  const dims = `viewBox="${LOGO_VIEWBOX}" width="${LOGO_W}" height="${LOGO_H}"`;
  const inner = footer
    ? `<use href="#${LOGO_ID}"/>`
    : LOGO_TRAZO.replace('<g', `<g id="${LOGO_ID}"`).replace(/>\s+</g, '><');
  return `<svg class="logo-svg" ${dims} role="img" aria-label="${LOGO_NOMBRE}" focusable="false"><title>${LOGO_NOMBRE}</title>${inner}</svg>`;
}

function header(active) {
  const links = NAV.map((n) => {
    const current = active === n.key ? ' aria-current="page"' : '';
    return `<li><a href="${n.href}"${current}>${esc(n.label)}</a></li>`;
  }).join('');
  const ctaCurrent = active === 'contacto' ? ' aria-current="page"' : '';
  // #pampi-buscar: hueco del buscador global; assets/js/buscador.js pone ahí la pastilla «Buscar… ⌘K».
  return `<header class="site-header">
  <div class="container header-inner">
    <a href="/" class="logo">${logoSvg()}</a>
    <div id="pampi-buscar" class="buscar-hueco"></div>
    <button type="button" class="menu-toggle" aria-expanded="false" aria-controls="site-nav" data-menu-toggle>Menú</button>
    <nav id="site-nav" class="site-nav" aria-label="Principal">
      <ul>${links}<li><a href="/contacto/" class="button small"${ctaCurrent}>Conversemos</a></li></ul>
    </nav>
  </div>
</header>`;
}

function footer(staging) {
  const fine = staging
    ? '<p class="fine">Prototipo privado de diseño. No recibe pedidos ni envía datos.</p>'
    : '';
  return `<footer class="site-footer">
  <div class="container">
    <a href="/" class="logo logo-footer">${logoSvg({ footer: true })}</a>
    <p>Una colección para descubrir, compartir y disfrutar.</p>
    <nav aria-label="Pie de página"><a href="/productos/">Explorar productos</a> · <a href="/contacto/">Contacto</a> · <a href="/privacidad/">Privacidad</a></nav>
    ${fine}
  </div>
</footer>`;
}

/** Breadcrumbs: items [{href,label}], el último es la página actual (sin href). */
export function breadcrumbs(items) {
  const lis = items.map((it, i) => {
    const last = i === items.length - 1;
    return last
      ? `<li><span aria-current="page">${esc(it.label)}</span></li>`
      : `<li><a href="${it.href}">${esc(it.label)}</a></li>`;
  }).join('');
  return `<nav class="crumbs" aria-label="Migas de pan"><ol>${lis}</ol></nav>`;
}

/** Tarjeta de producto (catálogo, familia, relacionados). */
export function productCard(p, ctx, { headingLevel = 'h3' } = {}) {
  const a = ctx.data.asset(p.primaryImage);
  const fam = p.imageCoverage === 'family';
  // La imagen está dentro de un enlace que ya nombra la referencia y, si la imagen es de
  // familia, la nota visible lo indica: alt vacío para no duplicar el anuncio (WCAG H2).
  const draft = p.status !== 'approved';
  const badge = draft ? '<span class="badge">EN DESARROLLO</span>' : '';
  let note = '';
  if (fam) note = 'Referencia visual de familia';
  else if (draft) note = 'Concepto de presentación';
  const h = headingLevel;
  return `<li class="card-item" data-slug="${esc(p.slug)}" data-family="${esc(p.familyId)}">
  <a class="card" href="/producto/${esc(p.slug)}/">
    <span class="card-media"><img src="${imageUrl(p.primaryImage)}" alt="" width="${a.width}" height="${a.height}" loading="lazy" decoding="async"></span>
    <span class="card-body">${badge}<${h} class="card-title">${esc(p.name)}</${h}>${note ? `<span class="fine">${esc(note)}</span>` : ''}<span class="card-link">Ver propuesta <span aria-hidden="true">→</span></span></span>
  </a>
</li>`;
}

/** Tarjeta de familia. */
export function familyCard(f, ctx, { headingLevel = 'h3' } = {}) {
  const a = ctx.data.asset(f.image);
  const h = headingLevel;
  return `<li class="card-item">
  <a class="card" href="/productos/${esc(f.id)}/">
    <span class="card-media"><img src="${imageUrl(f.image)}" alt="" width="${a.width}" height="${a.height}" loading="lazy" decoding="async"></span>
    <span class="card-body"><${h} class="card-title">${esc(f.name)}</${h}><span class="card-link">Explorar colección <span aria-hidden="true">→</span></span></span>
  </a>
</li>`;
}

/* ---------- Buscador (Pagefind) ---------- */

// Páginas que no entran al índice: la 404 y la privacidad provisional (noindex).
const FUERA_DEL_INDICE = new Set(['notfound', 'legal']);

/** Miniatura para el resultado: la variante WebP de 480 si existe; si no, el JPEG. */
function miniatura(ref) {
  const url = imageUrl(ref);
  const file = variantFile(path.basename(url), 480);
  return fs.existsSync(path.join(DERIVED_DIR, file)) ? DERIVED_URL_BASE + file : url;
}

/**
 * Atributos de Pagefind para el <main> y marcas ocultas que solo lee el indexador:
 * filtro «familia» (agrupa los resultados), metas «image» (miniatura), «title» y «tipo».
 * Un filtro o meta por elemento: Pagefind no separa «a:x, b:y» de forma fiable.
 */
function pagefindMarks(ctx, o) {
  if (FUERA_DEL_INDICE.has(o.pageType)) return { attrs: '', extra: '' };
  let fam = null;
  let image = null;
  let tipo = 'Página';
  const route = o.route || '';
  const mFam = route.match(/^\/productos\/([^/]+)\/$/);
  const mProd = route.match(/^\/producto\/([^/]+)\/$/);
  if (mProd) {
    const p = ctx.data.catalog.find((x) => x.slug === mProd[1]);
    if (p) {
      fam = ctx.data.familiesById.get(p.familyId) || null;
      if (p.primaryImage) image = miniatura(p.primaryImage);
      tipo = 'Producto';
    }
  } else if (mFam) {
    fam = ctx.data.familiesById.get(mFam[1]) || null;
    if (fam?.image) image = miniatura(fam.image);
    tipo = 'Familia';
  }
  // La miniatura va en el <main> (primer elemento del documento con «image»: Pagefind se queda con
  // esta, la variante WebP de 480, aunque la plantilla declare también la imagen original).
  const attrs = ` data-pagefind-body${image ? ` data-pagefind-meta="image:${esc(image)}"` : ''}`;
  // Nombre corto de la página para el resultado (el <title> sin « | PAMPI»), con peso alto para que
  // «distribución» o «contacto» traigan primero su página. Solo lo lee el indexador.
  const nombre = o.route === '/' ? 'Inicio' : String(o.title || '').split(' | ')[0].trim();
  let extra = `\n<span hidden data-pagefind-meta="tipo:${esc(tipo)}"></span>`;
  if (nombre) extra += `\n<span hidden data-pagefind-meta="title:${esc(nombre)}"></span><p hidden data-pagefind-weight="10">${esc(nombre)}</p>`;
  // Filtro «familia» (agrupa los resultados). Si la plantilla ya lo declara, no se repite.
  const body = o.body || '';
  if (fam && !body.includes('data-pagefind-filter="familia:')) {
    extra += `\n<span hidden data-pagefind-filter="familia:${esc(fam.name)}"></span>`;
  }
  // «estado» (p. ej. «En desarrollo») que la plantilla declara junto a «image» en una lista con
  // comas: Pagefind se queda con la primera «image» (la del <main>) y descarta ese elemento, así
  // que el estado se repite aquí en un elemento propio para que llegue al resultado.
  const estado = body.match(/data-pagefind-meta="[^"]*\bestado:([^",]+)/)?.[1]?.trim();
  if (estado) extra += `\n<span hidden data-pagefind-meta="estado:${estado}"></span>`;
  return { attrs, extra };
}

/** Peso de los títulos en el índice: h1 manda, luego h2. */
function pesoTitulos(body) {
  return body.replace(/<(h[12])\b(?![^>]*data-pagefind-weight)([^>]*)>/g,
    (_, tag, a) => `<${tag}${a} data-pagefind-weight="${tag === 'h1' ? 9 : 6}">`);
}

/**
 * Página completa.
 * @param {object} ctx  contexto de build ({staging, data})
 * @param {object} o    {title, description, path, route, active, body, noindex, styles[], scripts[]}
 */
export function page(ctx, o) {
  const noindex = ctx.staging || o.noindex === true;
  const styles = ['/assets/css/main.css', ...(o.styles || [])]
    .map((href) => `<link rel="stylesheet" href="${href}">`).join('\n');
  const scripts = ['/assets/js/site.js', ...(o.scripts || [])]
    .map((src) => `<script type="module" src="${src}"></script>`).join('\n');
  const notice = ctx.staging
    ? '<div class="notice" role="note">VISTA DE DESARROLLO · Colección conceptual</div>'
    : '';
  const pf = pagefindMarks(ctx, o);
  const body = pf.attrs ? pesoTitulos(o.body) : o.body;
  return `<!doctype html>
<html lang="${HTML_LANG}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${headMeta({ title: o.title, description: o.description, path: o.path, noindex, ogType: o.ogType })}
<meta name="theme-color" content="${THEME_COLOR}">
<link rel="icon" href="/assets/img/marca/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/img/marca/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/assets/img/marca/apple-touch-icon.png">
${styles}
<link rel="stylesheet" href="/assets/css/buscador.css" media="print" onload="this.media='all'">
${scripts}
<script defer src="/assets/js/buscador.js"></script>
</head>
<body data-mode="${ctx.staging ? 'staging' : 'public'}"${o.pageType ? ` data-page="${o.pageType}"` : ''}>
<a class="skip-link" href="#main">Saltar al contenido</a>
${notice}
${header(o.active)}
<main id="main" tabindex="-1"${pf.attrs}>${pf.extra}
${body}
</main>
${footer(ctx.staging)}
</body>
</html>
`;
}
