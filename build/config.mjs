// Configuración única del generador estático PAMPI.
// Solo módulos built-in de Node (>= 20). No duplicar estas constantes en otros archivos.
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// DOMINIO · PENDIENTE DE CONFIRMAR
// El paquete de la agencia (README, docs/01, docs/07) habla de "pampifoods.com",
// pero el archivo CNAME del repositorio apunta a "pampifood.com" (confirmado por el usuario).
// Esta constante es la única fuente del dominio para canonical, Open Graph, sitemap y robots.
export const SITE_URL = 'https://pampifood.com';

export const SITE_NAME = 'PAMPI';
export const HTML_LANG = 'es-VE';
export const OG_LOCALE = 'es_VE';

// Modos de build:
//   node build/build.mjs            -> PÚBLICO (por defecto, el que se despliega)
//   STAGING=1 node build/build.mjs  -> STAGING local (conceptos privados, noindex en todo)
export const STAGING = process.env.STAGING === '1';
export const MODE = STAGING ? 'staging' : 'public';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = path.join(ROOT, 'data');
export const ASSETS_DIR = path.join(ROOT, 'assets');
export const IMG_DIR = path.join(ASSETS_DIR, 'img');
export const DIST_DIR = path.join(ROOT, 'dist');

// Ruta pública de imágenes. Los JSON del paquete usan "assets/<archivo>.jpg";
// en el repo se sirven desde "/assets/img/<archivo>.jpg".
export const IMG_URL_BASE = '/assets/img/';

// Índice de búsqueda generado en el build (solo referencias visibles en el modo actual).
export const SEARCH_INDEX_URL = '/assets/data/search-index.json';

// Integridad esperada del paquete (docs/05, DAT 01).
export const EXPECTED_PRODUCTS = 50;
export const EXPECTED_FAMILIES = 8;
export const FAMILY_ORDER = [
  'aceites',
  'tomates',
  'aceitunas',
  'conservas',
  'quesos',
  'frutos-secos',
  'tes-infusiones',
  'mermeladas',
];
export const STATUS_ENUM = ['concept', 'review', 'approved', 'archived'];
export const COVERAGE_ENUM = ['individual', 'family'];
export const APPROVAL_FLAGS = ['commercial', 'technical', 'legal', 'artwork', 'imageRights'];
export const SPEC_FIELDS = ['netWeight', 'ingredients', 'allergens', 'nutrition', 'origin', 'shelfLife', 'storage', 'gtin'];

// Archivos de raíz que se copian tal cual a dist/ (GitHub Pages).
export const ROOT_PASSTHROUGH = ['CNAME', '.nojekyll'];
