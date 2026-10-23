// Plantilla Catálogo (/productos/) y bloque compartido con Familia.
import { breadcrumbs, productCard, familyCard } from '../layout.mjs';
import { esc } from '../util.mjs';

// Palabras que identifican un envase dentro del texto libre de envase_propuesto.
const PACKAGING_WORDS = /\b(botella|frasco|lata|bolsa|caja|tarro|envase|sobre)s?\b/i;

/**
 * Envase propuesto en forma breve para la tarjeta: specification.packaging si existe; si no, el
 * primer fragmento literal de envase_propuesto (technical-source.json) que nombra un envase,
 * prefiriendo el que menciona la variante (p. ej. "frasco de boca ancha para coco").
 * Si el expediente no nombra ningún envase, devuelve null (no se inventa).
 */
export function shortPackaging(p, ctx) {
  if (typeof p.specification?.packaging === 'string' && p.specification.packaging.trim()) return p.specification.packaging.trim();
  const text = ctx.data.technical(p.id)?.envase_propuesto;
  if (typeof text !== 'string') return null;
  const clauses = text.replace(/^[A-ZÁÉÍÓÚ]+ por [^:]+:\s*/, '').split(/[.;]\s*/).map((c) => c.trim()).filter((c) => PACKAGING_WORDS.test(c));
  if (!clauses.length) return null;
  const variant = String(ctx.data.technical(p.id)?.variante || p.name).toLowerCase();
  const pick = clauses.find((c) => c.toLowerCase().includes(variant)) || clauses[0];
  return pick.replace(/^./, (c) => c.toUpperCase());
}

/** Tarjeta de producto + envase propuesto breve (el distintivo lo pone productCard). */
export function cardWithMeta(p, ctx, opts) {
  const html = productCard(p, ctx, opts);
  const pack = shortPackaging(p, ctx);
  if (!pack) return html;
  return html.replace(/(<\/h[2-6]>)/, `$1<span class="card-meta">Envase propuesto: ${esc(pack)}</span>`);
}

export const CATALOG_INTRO = 'Explora una colección en desarrollo para acompañar la cocina y la mesa. Cada presentación se está definiendo con nuestros proveedores.';
const EMPTY_SEARCH = 'No encontramos esa combinación. Prueba otra búsqueda o selecciona todas las familias.';

function toolbar(ctx, familyId) {
  const options = ctx.data.families
    .map((f) => `<option value="${esc(f.id)}"${f.id === familyId ? ' selected' : ''}>${esc(f.name)}</option>`)
    .join('');
  return `<form class="toolbar" role="search" action="/productos/" method="get" data-catalog-search>
  <div class="field field-search">
    <label for="catalog-q">Buscar producto</label>
    <input id="catalog-q" name="q" type="search" placeholder="Por ejemplo, passata o Gouda" autocomplete="off">
  </div>
  <div class="field field-family">
    <label for="catalog-familia">Familia</label>
    <select id="catalog-familia" name="familia"><option value="">Todas las familias</option>${options}</select>
  </div>
</form>`;
}

/** Bloque de resultados (catálogo o familia) o estado editorial si no hay referencias visibles. */
export function results(ctx, products, { familyId = null, headingLevel = 'h2' } = {}) {
  const { staging } = ctx;
  if (products.length === 0) {
    return `<div class="empty-state">
  <p class="eyebrow">Colección en desarrollo</p>
  <p class="intro">Cada presentación se está definiendo con nuestros proveedores.</p>
  <p>Conoce nuestra propuesta para negocios y distribución.</p>
  <div class="actions">
    <a class="button" href="/distribucion/">Hablar de distribución</a>
    <a class="button secondary" href="/contacto/">Conversemos</a>
  </div>
</div>`;
  }
  const one = staging ? 'referencia de desarrollo' : 'referencia';
  const many = staging ? 'referencias de desarrollo' : 'referencias';
  const n = products.length;
  return `${toolbar(ctx, familyId)}
<p class="result-count" id="result-count" role="status" aria-live="polite" data-label-one="${one}" data-label-many="${many}">${n} ${n === 1 ? one : many}</p>
<ul class="grid" id="results" role="list" data-results${familyId ? ` data-family-page="${esc(familyId)}"` : ''}>${products.map((p) => cardWithMeta(p, ctx, { headingLevel })).join('')}</ul>
<p class="empty" id="no-results" hidden>${EMPTY_SEARCH}</p>`;
}

export default function catalogo(ctx) {
  const { data } = ctx;
  const hasProducts = data.visible.length > 0;
  const familiesBlock = hasProducts ? '' : `<section class="section section-tight" aria-labelledby="familias-title">
  <div class="container">
    <p class="eyebrow">Ocho familias, una identidad</p>
    <h2 id="familias-title">Encuentra tu próximo favorito.</h2>
    <ul class="grid" role="list">${data.families.map((f) => familyCard(f, ctx)).join('')}</ul>
  </div>
</section>`;
  const body = `<section class="section">
  <div class="container">
    ${breadcrumbs([{ href: '/', label: 'Inicio' }, { label: 'Productos' }])}
    <p class="eyebrow">La despensa PAMPI</p>
    <h1>Pequeños descubrimientos. Grandes momentos.</h1>
    <p class="intro">${CATALOG_INTRO}</p>
    ${results(ctx, data.visible)}
  </div>
</section>
${familiesBlock}`;
  return [{
    route: '/productos/',
    title: 'Productos | PAMPI',
    description: CATALOG_INTRO,
    active: 'productos',
    pageType: 'catalog',
    body,
  }];
}
