// Plantilla PDP (/producto/{slug}/). Se genera una ficha por cada referencia visible en el modo.
// Por decisión del usuario (23/10/2026) el build PÚBLICO publica las 50 referencias como conceptos,
// cada una con el aviso "En desarrollo". Orden de la ficha:
//   a) cabecera: familia, nombre, distintivo, resumen, imagen completa (+ nota si es de familia)
//   b) "Ficha verificada": SOLO campos de data/verified.json, cada uno con su fuente
//   c) "En desarrollo con el proveedor": campos de producto de data/technical-source.json y la lista
//      "Pendiente de validar" (sin lo que ya está verificado y sin datos comerciales internos)
//   d) estado de aprobaciones (approvalFlags)
//   e) referencia interna y relacionados de la misma familia
// Nunca se publica precio, stock, disponibilidad, Offer ni GTIN en datos estructurados.
import { breadcrumbs, mediaBgStyle } from '../layout.mjs';
import { imageUrl } from '../data.mjs';
import { APPROVAL_FLAGS, DEV_NOTICE } from '../config.mjs';
import { esc } from '../util.mjs';
import { cardWithMeta } from './catalogo.mjs';

// b) Campos de verified.json en el orden de la etiqueta. Las claves desconocidas se muestran al
// final con su nombre, para no perder nunca un dato verificado.
const VERIFIED_LABELS = [
  ['denominacion', 'Denominación'],
  ['marca', 'Marca'],
  ['contenidoNeto', 'Contenido neto'],
  ['ingredientes', 'Ingredientes'],
  ['modoEmpleo', 'Modo de empleo'],
  ['conservacion', 'Conservación'],
  ['loteVencimiento', 'Lote y vencimiento'],
  ['envase', 'Envase'],
  ['elaboradoPor', 'Elaborado por'],
  ['lugarFabricacion', 'Lugar de fabricación'],
  ['paisOrigen', 'País de origen'],
  ['importadoDistribuidoPor', 'Importado y distribuido por'],
  ['registroSanitario', 'Registro sanitario'],
  ['codigoBarras', 'Código de barras'],
  ['declaracionesFrontales', 'Declaraciones de etiqueta'],
  ['usosSugeridos', 'Usos sugeridos'],
];

// c) Campos de producto del expediente técnico que se publican.
const TECH_FIELDS = [
  ['variante', 'Variante'],
  ['envase_propuesto', 'Envase propuesto'],
  ['cierre_propuesto', 'Cierre propuesto'],
  ['base_formula_propuesta', 'Composición propuesta'],
  ['datos_especificos', 'Datos en definición'],
];
// Notas de trabajo para el proveedor (instrucciones de etiqueta, ensayos, cotización): no se publican
// ni se listan como pendientes.
const TECH_INTERNAL = ['validacion_barrera', 'frente', 'dorso', 'formato_cotizar', 'estatus_tecnico'];

// Datos comerciales/internos del expediente: NUNCA se publican (ni como pendientes).
export const TECH_PRIVATE = ['unidades_caja', 'cajas_pallet', 'MOQ', 'precio_incoterm', 'evidencia', 'aprobacion', 'prioridad_desarrollo', 'estatus_alcance'];
const TECH_META = ['referencia_interna', 'familia'];
const OG_MIN_SIDE = 600;

// c) Etiquetas de los campos "PENDIENTE…" y el campo de verified.json que, si existe, los cubre.
const PENDING_LABELS = {
  fabricante: ['Fabricante', 'elaboradoPor'],
  importador: ['Importador', 'importadoDistribuidoPor'],
  origen_acreditado: ['Origen acreditado', 'paisOrigen'],
  formula_ingredientes: ['Fórmula e ingredientes', 'ingredientes'],
  alergenos: ['Alérgenos', null],
  nutricion: ['Información nutricional', 'nutricion'],
  peso_neto: ['Peso neto', 'contenidoNeto'],
  peso_escurrido: ['Peso escurrido', null],
  dimensiones_troquel: ['Dimensiones y troquel', null],
  vida_util: ['Vida útil', null],
  conservacion: ['Conservación', 'conservacion'],
  GTIN: ['GTIN', 'codigoBarras'],
  registro_sanitario: ['Registro sanitario', 'registroSanitario'],
  CPE: ['CPE', null],
  advertencias_frontales: ['Advertencias frontales', null],
};

const APPROVAL_LABELS = {
  commercial: 'Comercial',
  technical: 'Técnica',
  legal: 'Legal',
  artwork: 'Arte',
  imageRights: 'Derechos de imagen',
};

const humanize = (k) => k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const isPending = (v) => typeof v === 'string' && /^PENDIENTE\b/.test(v.trim());
const capitalize = (s) => s.replace(/^./, (c) => c.toUpperCase());
// Prefijos de estado del expediente en mayúsculas ("PENDIENTE …", "CONFIRMADO por …") en caja normal.
// "CONFIRMADO por Juan: …" es una anotación interna: se quita el prefijo y queda solo la descripción.
const readable = (v) => capitalize(String(v).trim()
  .replace(/^CONFIRMADO\s+por\s+[^:]+:\s*/i, '')
  .replace(/^(PENDIENTE)\b/, (m) => m[0] + m.slice(1).toLowerCase()));
const source = (f) => `<span class="source">Fuente: ${esc(f)}</span>`;

function valueHtml(v) {
  if (Array.isArray(v)) return `<ul class="value-list">${v.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  return esc(v);
}

/** Tabla nutricional completa (verified.json → nutricion). */
function nutritionBlock(n) {
  const rows = n.filas.map((r) => `<tr${r.sub ? ' class="sub"' : ''}><th scope="row">${esc(r.nutriente)}</th><td>${esc(r.cantidad)}</td><td>${r.vd ? esc(r.vd) : '<span aria-label="no aplica">—</span>'}</td></tr>`).join('');
  const refs = n.valoresReferencia
    ? `<h4>Valores de referencia</h4><dl class="spec spec-compact">${Object.entries(n.valoresReferencia).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`
    : '';
  return `<div class="nutrition">
<h3 id="nutricion-title">Información nutricional</h3>
<dl class="spec spec-compact">
${n.porcion ? `<dt>Porción</dt><dd>${esc(n.porcion)}</dd>` : ''}
${n.porcionesPorEnvase ? `<dt>Porciones por envase</dt><dd>${esc(n.porcionesPorEnvase)}</dd>` : ''}
</dl>
<div class="table-wrap"><table class="nutrition-table">
<caption>Información nutricional por porción${n.porcion ? `: ${esc(n.porcion)}` : ''}</caption>
<thead><tr><th scope="col">Nutriente</th><th scope="col">Cantidad</th><th scope="col">% Valor Diario</th></tr></thead>
<tbody>${rows}</tbody>
</table></div>
${n.nota ? `<p class="fine">${esc(n.nota)}</p>` : ''}
${refs}
${n.caloriasPorGramo ? `<p class="fine">Calorías por gramo: ${esc(n.caloriasPorGramo)}</p>` : ''}
${source(n.fuente)}
</div>`;
}

/** b) Ficha verificada: solo campos de data/verified.json. */
function verifiedSection(fields) {
  if (!fields) return '';
  const known = new Set(VERIFIED_LABELS.map(([k]) => k));
  const order = [
    ...VERIFIED_LABELS.filter(([k]) => fields[k]),
    ...Object.keys(fields).filter((k) => !known.has(k) && k !== 'nutricion' && !k.startsWith('_')).map((k) => [k, humanize(k)]),
  ];
  const rows = order.map(([k, label]) => `<dt>${esc(label)}</dt><dd data-verified="${esc(k)}">${valueHtml(fields[k].valor)}${source(fields[k].fuente)}</dd>`).join('\n');
  return `<section class="pdp-section" aria-labelledby="verificada-title" data-verified-section>
  <h2 id="verificada-title">Ficha verificada</h2>
  <p class="fine">Datos transcritos de la documentación de esta referencia. Cada dato indica su fuente.</p>
  <dl class="spec">
${rows}
  </dl>
  ${fields.nutricion ? nutritionBlock(fields.nutricion) : ''}
</section>`;
}

/** c) En desarrollo con el proveedor + Pendiente de validar. */
function developmentSection(tech, verifiedFields) {
  if (!tech) return '';
  const rows = TECH_FIELDS.filter(([k]) => typeof tech[k] === 'string' && tech[k].trim())
    .map(([k, label]) => `<dt>${esc(label)}</dt><dd>${esc(readable(tech[k]))}</dd>`).join('\n');
  const shown = new Set([...TECH_FIELDS.map(([k]) => k), ...TECH_INTERNAL]);
  const pending = Object.entries(tech)
    .filter(([k, v]) => !shown.has(k) && !TECH_PRIVATE.includes(k) && !TECH_META.includes(k) && isPending(v))
    .filter(([k]) => { const cover = PENDING_LABELS[k]?.[1]; return !(cover && verifiedFields?.[cover]); })
    .map(([k, v]) => {
      const label = PENDING_LABELS[k]?.[0] || humanize(k);
      const detail = v.trim().replace(/^PENDIENTE\b\s*/, '');
      return `<li data-pending="${esc(k)}"><strong>${esc(label)}</strong>${detail ? ` · ${esc(capitalize(detail))}` : ''}</li>`;
    }).join('');
  const warning = verifiedFields
    ? 'Lo que sigue aún no está validado: solo la «Ficha verificada» de arriba procede de documentación.'
    : 'Ficha técnica pendiente. No utilizar esta página como información alimentaria.';
  return `<section class="pdp-section" aria-labelledby="desarrollo-title">
  <h2 id="desarrollo-title">En desarrollo con el proveedor</h2>
  <p class="fine">${esc(warning)}</p>
  <dl class="spec">
${rows}
  </dl>
  ${pending ? `<h3 id="pendiente-title">Pendiente de validar</h3>
  <ul class="pending-list" aria-labelledby="pendiente-title">${pending}</ul>` : ''}
</section>`;
}

/** d) Estado de aprobaciones. */
function approvalsSection(flags) {
  const items = APPROVAL_FLAGS.map((k) => {
    const ok = flags?.[k] === true;
    return `<li class="${ok ? 'is-approved' : 'is-pending'}"><span>${esc(APPROVAL_LABELS[k] || humanize(k))}</span> <strong>${ok ? 'Aprobado' : 'Pendiente'}</strong></li>`;
  }).join('');
  return `<section class="pdp-section" aria-labelledby="aprobaciones-title">
  <h2 id="aprobaciones-title">Estado de aprobaciones</h2>
  <ul class="approval-list">${items}</ul>
</section>`;
}

export default function producto(ctx) {
  const { data } = ctx;
  return data.visible.map((p) => {
    const fam = data.familiesById.get(p.familyId);
    const a = data.asset(p.primaryImage);
    const familyView = p.imageCoverage === 'family';
    const alt = `Concepto ${p.name}${familyView ? ', vista de familia' : ''}`;
    const related = data.visible.filter((x) => x.familyId === p.familyId && x.id !== p.id).slice(0, 4);
    const draft = p.status !== 'approved';
    const verifiedFields = data.verified.get(p.id);
    const tech = data.technical(p.id);
    const img = imageUrl(p.primaryImage);
    const caption = familyView
      ? `Imagen de la familia ${fam.name}, no del producto individual. ${p.imageNote} Render conceptual; no es arte final de impresión.`
      : `${p.imageNote} Render conceptual; no es arte final de impresión.`;
    const pagefindMeta = `image:${img}${draft ? ', estado:En desarrollo' : ''}`;
    const notice = draft
      ? `<p class="dev-notice" role="note" data-dev-notice><span class="badge">EN DESARROLLO</span> <span>En desarrollo. ${esc(DEV_NOTICE)}</span></p>`
      : '';
    const relatedBlock = related.length ? `<section class="section" aria-labelledby="relacionados-title" data-pagefind-ignore>
  <div class="container">
    <h2 id="relacionados-title">Más de ${esc(fam.name)}</h2>
    <ul class="grid" role="list">${related.map((r) => cardWithMeta(r, ctx)).join('')}</ul>
    <p><a href="/productos/${esc(fam.id)}/">Ver toda la familia ${esc(fam.name)}</a></p>
  </div>
</section>` : '';
    const body = `<section class="section">
  <div class="container">
    ${breadcrumbs([{ href: '/', label: 'Inicio' }, { href: '/productos/', label: 'Productos' }, { href: `/productos/${fam.id}/`, label: fam.name }, { label: p.name }])}
    <article class="pdp" data-pagefind-filter="familia:${esc(fam.name)}" data-pagefind-meta="${esc(pagefindMeta)}">
    <div class="detail">
      <figure class="detail-media">
        <img src="${img}" alt="${esc(alt)}" width="${a.width}" height="${a.height}" fetchpriority="high" decoding="async"${mediaBgStyle(a)}>
        <figcaption class="fine">${esc(caption)}</figcaption>
      </figure>
      <div class="detail-copy">
        <p class="eyebrow"><a href="/productos/${esc(fam.id)}/">${esc(fam.name)}</a></p>
        <h1>${esc(p.name)}</h1>
        ${notice}
        <p class="intro">${esc(p.summary)}</p>
        <p><a class="button" href="/contacto/?sku=${encodeURIComponent(p.id)}">Consultar esta propuesta</a></p>
      </div>
    </div>
    <div class="pdp-body">
      ${verifiedSection(verifiedFields)}
      ${developmentSection(tech, verifiedFields)}
      ${approvalsSection(p.approvalFlags)}
      <section class="pdp-section" aria-labelledby="referencia-title">
        <h2 id="referencia-title">Referencia</h2>
        <dl class="spec spec-compact"><dt>Referencia interna</dt><dd data-ref-id>${esc(p.id)}</dd></dl>
      </section>
    </div>
    </article>
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
      // og:image: el render propio de la referencia si es individual y tiene al menos 600 px de lado;
      // si no (imagen de familia o recorte pequeño), la general de marca (seo.mjs).
      ogImage: !familyView && Math.min(a.width, a.height) >= OG_MIN_SIDE
        ? { url: img, width: a.width, height: a.height, alt }
        : undefined,
      body,
    };
  });
}
