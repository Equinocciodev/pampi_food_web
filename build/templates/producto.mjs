// Plantilla PDP (/producto/{slug}/). Solo se generan las referencias visibles en el modo actual.
// Orden docs/02: breadcrumb; imagen completa; nota de alcance; familia; nombre; descripción; CTA; ficha; relacionados.
import { breadcrumbs, productCard } from '../layout.mjs';
import { imageUrl } from '../data.mjs';
import { esc } from '../util.mjs';

const SPEC_LABELS = [
  ['packaging', 'Presentación'],
  ['netWeight', 'Contenido neto'],
  ['ingredients', 'Ingredientes'],
  ['allergens', 'Alérgenos'],
  ['nutrition', 'Información nutricional'],
  ['origin', 'Origen'],
  ['shelfLife', 'Vida útil'],
  ['storage', 'Conservación'],
  ['gtin', 'GTIN'],
];

const has = (v) => v !== null && v !== undefined && String(v).trim() !== '';

// Público: solo campos con valor verificado; null se oculta.
function publicSpec(spec) {
  const rows = SPEC_LABELS.filter(([k]) => has(spec?.[k]))
    .map(([k, label]) => `<dt>${label}</dt><dd>${esc(spec[k])}</dd>`).join('');
  return rows ? `<dl class="spec">${rows}</dl>` : '';
}

// Staging: muestra pendientes con el copy literal del prototipo.
function stagingSpec(spec) {
  const pair = (a, b, pending) => (has(spec?.[a]) || has(spec?.[b])
    ? [spec?.[a], spec?.[b]].filter(has).map(esc).join(' · ')
    : pending);
  return `<dl class="spec">
<dt>Presentación</dt><dd>${has(spec?.packaging) ? esc(spec.packaging) : 'Por confirmar con proveedor'}</dd>
<dt>Ingredientes y alérgenos</dt><dd>${pair('ingredients', 'allergens', 'Ficha técnica pendiente. No utilizar esta vista como información alimentaria.')}</dd>
<dt>Origen y conservación</dt><dd>${pair('origin', 'storage', 'Pendientes de documentación del fabricante')}</dd>
</dl>`;
}

export default function producto(ctx) {
  const { data, staging } = ctx;
  return data.visible.map((p) => {
    const fam = data.familiesById.get(p.familyId);
    const a = data.asset(p.primaryImage);
    const familyView = p.imageCoverage === 'family';
    const alt = `Concepto ${p.name}${familyView ? ', vista de familia' : ''}`;
    const related = data.visible.filter((x) => x.familyId === p.familyId && x.id !== p.id).slice(0, 4);
    const draft = p.status !== 'approved';
    const relatedBlock = related.length ? `<section class="section" aria-labelledby="relacionados-title">
  <div class="container">
    <h2 id="relacionados-title">Más de esta familia</h2>
    <ul class="grid" role="list">${related.map((r) => productCard(r, ctx)).join('')}</ul>
  </div>
</section>` : '';
    const body = `<section class="section">
  <div class="container">
    ${breadcrumbs([{ href: '/', label: 'Inicio' }, { href: '/productos/', label: 'Productos' }, { href: `/productos/${fam.id}/`, label: fam.name }, { label: p.name }])}
    <div class="detail">
      <figure class="detail-media">
        <img src="${imageUrl(p.primaryImage)}" alt="${esc(alt)}" width="${a.width}" height="${a.height}" fetchpriority="high" decoding="async">
        <figcaption class="fine">${esc(p.imageNote)} Render conceptual; no es arte final de impresión.</figcaption>
      </figure>
      <div class="detail-copy">
        <p class="eyebrow"><a href="/productos/${esc(fam.id)}/">${esc(fam.name)}</a></p>
        <h1>${esc(p.name)}</h1>
        ${draft ? '<p><span class="badge">EN DESARROLLO</span></p>' : ''}
        <p class="intro">${esc(p.summary)}</p>
        <p><a class="button" href="/contacto/?sku=${encodeURIComponent(p.id)}">Consultar esta propuesta</a></p>
        ${staging ? stagingSpec(p.specification) : publicSpec(p.specification)}
        ${staging ? `<details><summary>Sobre esta referencia</summary><p>Referencia interna ${esc(p.id)}. La aprobación comercial, técnica y del arte precede a su publicación.</p></details>` : ''}
      </div>
    </div>
  </div>
</section>
${relatedBlock}`;
    return {
      route: `/producto/${p.slug}/`,
      title: p.metaTitle || `${p.name} | PAMPI`,
      description: p.metaDescription || p.summary,
      active: 'productos',
      pageType: 'product',
      ogType: 'website',
      body,
    };
  });
}
