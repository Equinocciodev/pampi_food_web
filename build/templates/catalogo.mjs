// Plantilla Catálogo (/productos/) y bloque compartido con Familia.
import { breadcrumbs, productCard, familyCard } from '../layout.mjs';
import { esc } from '../util.mjs';

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
<ul class="grid" id="results" role="list" data-results${familyId ? ` data-family-page="${esc(familyId)}"` : ''}>${products.map((p) => productCard(p, ctx, { headingLevel })).join('')}</ul>
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
