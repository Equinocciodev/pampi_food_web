// Carga y validación de datos. El build FALLA si algo no cuadra (docs/05 Integridad, DAT 01-03).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  DATA_DIR, IMG_DIR, IMG_URL_BASE, EXPECTED_PRODUCTS, EXPECTED_FAMILIES, FAMILY_ORDER,
  STATUS_ENUM, COVERAGE_ENUM, APPROVAL_FLAGS, SPEC_FIELDS, PUBLISH_CONCEPTS,
} from './config.mjs';

function readJson(name) {
  const file = path.join(DATA_DIR, name);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`No se pudo leer ${file}: ${err.message}`);
  }
}

// "assets/aceites.jpg" -> nombre de archivo en assets/img/
function imageFile(ref) {
  if (typeof ref !== 'string' || !ref.startsWith('assets/')) return null;
  return path.basename(ref);
}

export function imageUrl(ref) {
  return IMG_URL_BASE + imageFile(ref);
}

// Regla canPublish de docs/05 (la parte verificable con los datos actuales).
export function canPublish(p) {
  return p.status === 'approved'
    && p.publicVisible === true
    && APPROVAL_FLAGS.every((k) => p.approvalFlags?.[k] === true);
}

export function loadData({ staging }) {
  const catalog = readJson('catalog.json');
  const families = readJson('families.json');
  const manifest = readJson('asset-manifest.json');
  const technical = readJson('technical-source.json');
  const verifiedRaw = readJson('verified.json');
  const errors = [];
  const fail = (msg) => errors.push(msg);

  // Manifest de assets: existencia en disco y SHA256.
  const assetsByPath = new Map();
  if (!Array.isArray(manifest)) fail('asset-manifest.json debe ser un array');
  for (const a of manifest || []) {
    const file = imageFile(a.path);
    if (!file) { fail(`Asset ${a.id}: ruta inválida ${a.path}`); continue; }
    const abs = path.join(IMG_DIR, file);
    if (!fs.existsSync(abs)) { fail(`Asset ${a.id}: falta ${abs}`); continue; }
    const sha = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
    if (a.sha256 && sha !== a.sha256) fail(`Asset ${a.id}: SHA256 no coincide con el manifest (${file})`);
    if (!Number.isInteger(a.width) || !Number.isInteger(a.height)) fail(`Asset ${a.id}: width/height ausentes`);
    assetsByPath.set(a.path, a);
  }
  const checkImage = (ref, owner) => {
    if (!assetsByPath.has(ref)) fail(`${owner}: imagen ${ref} no está en el manifest o no existe en assets/img/`);
  };

  // Familias.
  if (!Array.isArray(families)) fail('families.json debe ser un array');
  if (families.length !== EXPECTED_FAMILIES) fail(`Se esperaban ${EXPECTED_FAMILIES} familias y hay ${families.length}`);
  const familiesById = new Map();
  for (const f of families) {
    if (!f.id || !f.name) fail(`Familia sin id/name: ${JSON.stringify(f)}`);
    if (familiesById.has(f.id)) fail(`Familia duplicada: ${f.id}`);
    if (!FAMILY_ORDER.includes(f.id)) fail(`Familia no prevista en docs/02: ${f.id}`);
    checkImage(f.image, `Familia ${f.id}`);
    familiesById.set(f.id, f);
  }

  // Catálogo.
  if (!Array.isArray(catalog)) fail('catalog.json debe ser un array');
  if (catalog.length !== EXPECTED_PRODUCTS) fail(`Se esperaban ${EXPECTED_PRODUCTS} referencias y hay ${catalog.length}`);
  const ids = new Set();
  const slugs = new Set();
  const techIds = new Set((technical || []).map((t) => t.referencia_interna));
  for (const p of catalog) {
    const who = `Referencia ${p.id || '(sin id)'}`;
    if (!/^PAM-[A-Z]{2,3}-[0-9]{2}$/.test(p.id || '')) fail(`${who}: id con formato inválido`);
    if (ids.has(p.id)) fail(`${who}: id duplicado`);
    ids.add(p.id);
    if (!/^[a-z0-9-]+$/.test(p.slug || '')) fail(`${who}: slug inválido "${p.slug}"`);
    if (slugs.has(p.slug)) fail(`${who}: slug duplicado "${p.slug}"`);
    slugs.add(p.slug);
    if (!familiesById.has(p.familyId)) fail(`${who}: familyId inválido "${p.familyId}"`);
    if (!p.name || typeof p.name !== 'string') fail(`${who}: name vacío`);
    if (!STATUS_ENUM.includes(p.status)) fail(`${who}: status inválido "${p.status}"`);
    if (!COVERAGE_ENUM.includes(p.imageCoverage)) fail(`${who}: imageCoverage inválido`);
    if (typeof p.publicVisible !== 'boolean') fail(`${who}: publicVisible debe ser boolean`);
    for (const k of APPROVAL_FLAGS) {
      if (typeof p.approvalFlags?.[k] !== 'boolean') fail(`${who}: approvalFlags.${k} debe ser boolean`);
    }
    for (const k of SPEC_FIELDS) {
      const v = p.specification?.[k];
      if (v !== null && v !== undefined && typeof v !== 'string') fail(`${who}: specification.${k} debe ser texto o null (no 0)`);
    }
    checkImage(p.primaryImage, who);
    if (!techIds.has(p.id)) fail(`${who}: sin registro en technical-source.json`);
    // Una referencia visible en público tiene que cumplir canPublish completo.
    if (p.publicVisible === true && !canPublish(p)) {
      fail(`${who}: publicVisible=true pero no cumple canPublish (status approved + todas las aprobaciones)`);
    }
  }

  // Corrección de envase confirmada 23/10/2026: pelado en lata, solo passata en vidrio.
  const roj01 = catalog.find((p) => p.id === 'PAM-ROJ-01');
  const roj02 = catalog.find((p) => p.id === 'PAM-ROJ-02');
  if (!roj01 || !/vidrio/i.test(roj01.specification?.packaging || '')) fail('PAM-ROJ-01 (passata) debe ir en botella de vidrio');
  if (!roj02 || !/lata/i.test(roj02.specification?.packaging || '') || /vidrio|frasco/i.test(roj02.specification?.packaging || '')) {
    fail('PAM-ROJ-02 (tomate pelado) debe ir en lata metálica');
  }

  // Datos verificados (data/verified.json): solo IDs del catálogo y cada campo con su fuente.
  const verified = new Map();
  for (const [id, fields] of Object.entries(verifiedRaw || {})) {
    if (id.startsWith('_')) continue;
    if (!ids.has(id)) { fail(`verified.json: ${id} no existe en el catálogo`); continue; }
    for (const [k, f] of Object.entries(fields || {})) {
      if (!f || typeof f.fuente !== 'string' || !f.fuente.trim()) fail(`verified.json ${id}.${k}: falta "fuente"`);
      if (k === 'nutricion') {
        if (!Array.isArray(f.filas) || !f.filas.length) fail(`verified.json ${id}.nutricion: faltan filas`);
        for (const r of f.filas || []) if (!r.nutriente || typeof r.cantidad !== 'string') fail(`verified.json ${id}.nutricion: fila incompleta`);
      } else if (!(typeof f?.valor === 'string' && f.valor.trim()) && !(Array.isArray(f?.valor) && f.valor.length)) {
        fail(`verified.json ${id}.${k}: "valor" vacío`);
      }
    }
    verified.set(id, fields);
  }
  const technicalById = new Map((technical || []).map((t) => [t.referencia_interna, t]));

  if (errors.length) {
    const err = new Error(`Validación de datos fallida (${errors.length}):\n - ${errors.join('\n - ')}`);
    err.validation = errors;
    throw err;
  }

  const orderedFamilies = FAMILY_ORDER.map((id) => familiesById.get(id));
  // Orden editorial estable: el del JSON.
  // PÚBLICO: por decisión del usuario (PUBLISH_CONCEPTS, ver config.mjs y README «Decisiones») se
  // publican todas las referencias como conceptos "En desarrollo"; sin ella, solo las canPublish.
  const visible = staging || PUBLISH_CONCEPTS ? catalog.slice() : catalog.filter((p) => p.publicVisible === true && canPublish(p));

  return {
    catalog,
    visible,
    families: orderedFamilies,
    familiesById,
    verified,
    technical: (id) => technicalById.get(id),
    asset: (ref) => assetsByPath.get(ref),
    stats: {
      products: catalog.length,
      families: families.length,
      assets: assetsByPath.size,
      visible: visible.length,
    },
  };
}
