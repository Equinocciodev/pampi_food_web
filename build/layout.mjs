// Layout común: head, header, footer, skip link, breadcrumbs y componentes compartidos.
import { HTML_LANG } from './config.mjs';
import { headMeta } from './seo.mjs';
import { esc } from './util.mjs';
import { imageUrl } from './data.mjs';

const NAV = [
  { href: '/productos/', label: 'Productos', key: 'productos' },
  { href: '/nosotros/', label: 'Nuestra visión', key: 'nosotros' },
  { href: '/distribucion/', label: 'Distribución', key: 'distribucion' },
];

function header(active) {
  const links = NAV.map((n) => {
    const current = active === n.key ? ' aria-current="page"' : '';
    return `<li><a href="${n.href}"${current}>${esc(n.label)}</a></li>`;
  }).join('');
  const ctaCurrent = active === 'contacto' ? ' aria-current="page"' : '';
  return `<header class="site-header">
  <div class="container header-inner">
    <a href="/" class="logo" aria-label="PAMPI inicio">Pampi<span aria-hidden="true">FOODS</span></a>
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
    <a href="/" class="logo logo-footer" aria-label="PAMPI inicio">Pampi</a>
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

/**
 * Página completa.
 * @param {object} ctx  contexto de build ({staging, data})
 * @param {object} o    {title, description, path, active, body, noindex, styles[], scripts[]}
 */
export function page(ctx, o) {
  const noindex = ctx.staging || o.noindex === true;
  const styles = ['/assets/css/main.css', ...(o.styles || [])]
    .map((href) => `<link rel="stylesheet" href="${href}">`).join('\n');
  const scripts = ['/assets/js/site.js', ...(o.scripts || [])]
    .map((src) => `<script type="module" src="${src}"></script>`).join('\n');
  const notice = ctx.staging
    ? '<div class="notice" role="note">VISTA DE DESARROLLO · Colección conceptual · Logotipo tipográfico provisional</div>'
    : '';
  return `<!doctype html>
<html lang="${HTML_LANG}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${headMeta({ title: o.title, description: o.description, path: o.path, noindex, ogType: o.ogType })}
${styles}
${scripts}
</head>
<body data-mode="${ctx.staging ? 'staging' : 'public'}"${o.pageType ? ` data-page="${o.pageType}"` : ''}>
<a class="skip-link" href="#main">Saltar al contenido</a>
${notice}
${header(o.active)}
<main id="main" tabindex="-1">
${o.body}
</main>
${footer(ctx.staging)}
</body>
</html>
`;
}
