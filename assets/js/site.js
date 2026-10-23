// PAMPI · site.js — UI general (sin dependencias).
// - Menú móvil que se expande en flujo con aria-expanded sincronizado.
// - Búsqueda/filtro del catálogo con parámetros q y familia en la URL.
// - Consulta precargada en contacto con ?sku= (solo si la referencia está en el índice visible).
// Los formularios (validación/envío) viven en forms.js.

const INDEX_URL = '/assets/data/search-index.json';

// Debe coincidir con normalize() de build/util.mjs.
export const normalize = (s) => String(s ?? '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLocaleLowerCase('es')
  .replace(/[^a-z0-9ñ]+/g, ' ')
  .trim();

// Alias de consulta (docs/02): Edam/edán; té/te queda cubierto por la normalización.
const QUERY_ALIASES = { edan: 'edam' };

export function queryTokens(q) {
  return normalize(q).split(' ').filter(Boolean).map((t) => QUERY_ALIASES[t] || t);
}

// Cada token debe ser prefijo de alguna palabra del nombre/alias.
export function matches(terms, tokens) {
  if (!tokens.length) return true;
  const words = terms.split(' ');
  return tokens.every((t) => words.some((w) => w.startsWith(t)));
}

let indexPromise;
function loadIndex() {
  if (!indexPromise) {
    indexPromise = fetch(INDEX_URL, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []);
  }
  return indexPromise;
}

/* ---------- Menú ---------- */
function initMenu() {
  const btn = document.querySelector('[data-menu-toggle]');
  if (!btn) return;
  const nav = document.getElementById(btn.getAttribute('aria-controls'));
  const header = btn.closest('.site-header');
  if (!nav || !header) return;
  header.classList.add('js-menu');
  const set = (open) => {
    nav.classList.toggle('is-open', open);
    // El estado lo comunica aria-expanded; el nombre accesible sigue siendo el texto visible.
    btn.setAttribute('aria-expanded', String(open));
  };
  set(false);
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') {
      set(false);
      btn.focus();
    }
  });
  // Si el foco sale del header (Tab tras el último enlace), el menú se cierra.
  header.addEventListener('focusout', (e) => {
    if (e.relatedTarget && !header.contains(e.relatedTarget)) set(false);
  });
  const mq = window.matchMedia('(min-width: 768px)');
  mq.addEventListener?.('change', (e) => { if (e.matches) set(false); });
}

/* ---------- Catálogo ---------- */
async function initCatalog() {
  const form = document.querySelector('[data-catalog-search]');
  const list = document.querySelector('[data-results]');
  if (!form || !list) return;
  const input = form.querySelector('input[name="q"]');
  const select = form.querySelector('select[name="familia"]');
  const count = document.getElementById('result-count');
  const empty = document.getElementById('no-results');
  const familyPage = list.dataset.familyPage || '';
  const items = [...list.querySelectorAll('[data-slug]')];

  const index = await loadIndex();
  const bySlug = new Map(index.map((e) => [e.slug, e]));
  // Respaldo si el índice no carga: nombre visible de la tarjeta.
  const termsFor = (li) => bySlug.get(li.dataset.slug)?.terms
    ?? normalize(li.querySelector('.card-title')?.textContent);

  const params = new URLSearchParams(location.search);
  input.value = params.get('q') || '';
  if (!familyPage) {
    const f = params.get('familia') || '';
    select.value = [...select.options].some((o) => o.value === f) ? f : '';
  }

  const syncUrl = () => {
    const p = new URLSearchParams(location.search);
    const q = input.value.trim();
    if (q) p.set('q', q); else p.delete('q');
    if (!familyPage) { if (select.value) p.set('familia', select.value); else p.delete('familia'); }
    const qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? `?${qs}` : '') + location.hash);
  };

  const update = () => {
    const tokens = queryTokens(input.value);
    const fam = familyPage || select.value;
    let n = 0;
    for (const li of items) {
      const ok = (!fam || li.dataset.family === fam) && matches(termsFor(li), tokens);
      li.hidden = !ok;
      if (ok) n += 1;
    }
    if (count) count.textContent = `${n} ${n === 1 ? count.dataset.labelOne : count.dataset.labelMany}`;
    if (empty) empty.hidden = n !== 0;
    syncUrl();
  };

  form.addEventListener('submit', (e) => { e.preventDefault(); update(); });
  input.addEventListener('input', update);
  select.addEventListener('change', () => {
    if (familyPage) {
      // En una página de familia, cambiar de familia lleva a su ruta real.
      const q = input.value.trim();
      const target = select.value ? `/productos/${select.value}/` : '/productos/';
      location.assign(target + (q ? `?q=${encodeURIComponent(q)}` : ''));
      return;
    }
    update();
  });
  update();
}

/* ---------- Consulta precargada (?sku=) ---------- */
async function initInterest() {
  const badge = document.querySelector('[data-interest]');
  if (!badge) return;
  const sku = new URLSearchParams(location.search).get('sku');
  if (!sku) return;
  const index = await loadIndex();
  const ref = index.find((e) => e.id === sku);
  if (!ref) return; // referencia no visible en este modo: no se muestra nada
  badge.textContent = `Consulta: ${ref.name} · ${ref.id}`;
  badge.dataset.sku = ref.id;
  badge.hidden = false;
  const msg = document.querySelector('[data-inquiry-form] textarea[name="message"]');
  if (msg && !msg.value) msg.value = `Me interesa la propuesta ${ref.name} (${ref.id}). `;
}

if (typeof document !== 'undefined') {
  initMenu();
  initCatalog();
  initInterest();
}
