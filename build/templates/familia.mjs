// Plantilla Categoría (/productos/{familia}/). Una página por cada una de las 8 familias.
import { breadcrumbs } from '../layout.mjs';
import { imageUrl } from '../data.mjs';
import { esc } from '../util.mjs';
import { results, CATALOG_INTRO } from './catalogo.mjs';

export default function familia(ctx) {
  const { data } = ctx;
  return data.families.map((f) => {
    const products = data.visible.filter((p) => p.familyId === f.id);
    const a = data.asset(f.image);
    // Sin productos visibles se muestra la imagen de familia, identificada como colección conceptual.
    const visual = products.length === 0
      ? `<figure class="family-visual"><img src="${imageUrl(f.image)}" alt="Colección conceptual ${esc(f.name)}" width="${a.width}" height="${a.height}" decoding="async"><figcaption class="fine">Imagen de familia conceptual; no representa de forma exclusiva ninguna referencia.</figcaption></figure>`
      : '';
    const body = `<section class="section" data-pagefind-filter="familia:${esc(f.name)}">
  <div class="container">
    ${breadcrumbs([{ href: '/', label: 'Inicio' }, { href: '/productos/', label: 'Productos' }, { label: f.name }])}
    <p class="eyebrow">La despensa PAMPI</p>
    <h1>${esc(f.name)}</h1>
    <p class="intro">${CATALOG_INTRO}</p>
    ${visual}
    ${results(ctx, products, { familyId: f.id })}
  </div>
</section>`;
    return {
      route: `/productos/${f.id}/`,
      title: `${f.name} | PAMPI`,
      description: `${f.name}: ${CATALOG_INTRO}`,
      active: 'productos',
      pageType: 'family',
      body,
    };
  });
}
