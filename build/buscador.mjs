// Buscador global (Pagefind) · paso final del build.
// 1. Escribe dist/buscador/terminos-es.json: palabras del sitio por frecuencia, títulos, rutas
//    indexadas y familias, para el autocompletado en gris y los accesos directos de
//    assets/js/buscador.js. Sale solo de las páginas con data-pagefind-body (lo que se ve en
//    ese modo), así que nunca añade nada que no esté ya publicado en el HTML.
// 2. Opcional: con PAGEFIND=1 (o `npm run build:all`, que llama a `npm run search`) compila el
//    índice con Pagefind 1.5.2 (versión fija) en dist/pagefind/. Requiere red para npx.
// Sin dependencias: solo módulos built-in de Node.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const PAGEFIND_VERSION = '1.5.2';

const VACIAS = new Set(`a al algo ante antes aqui asi aun cada como con contra cual cuando de del desde
donde dos el ella ellos en entre era es esa ese eso esta este esto estos estas fue ha hay la las le les lo
los mas me mi muy no nos o para pero por que se ser si sin sobre son su sus tambien te tiene todo todos tu
un una uno unos y ya cada nuestra nuestro nuestras nuestros esta estan puede pueden hasta`.split(/\s+/));

const sinTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const unesc = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
const texto = (frag) => unesc(frag
  .replace(/<(script|style|svg|nav|noscript|template)\b[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, ' '));

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) walk(abs, out); else out.push(abs);
  }
  return out;
}

function escribirTerminos(distDir, data) {
  const palabras = new Map(); // forma -> n
  const titulos = new Map(); // clave -> título
  const rutas = [];
  for (const f of walk(distDir).filter((x) => x.endsWith('.html')).sort()) {
    const html = fs.readFileSync(f, 'utf8');
    const m = html.match(/<main\b[^>]*\bdata-pagefind-body\b[^>]*>([\s\S]*?)<\/main>/);
    if (!m) continue;
    const rel = path.relative(distDir, f).split(path.sep).join('/');
    rutas.push('/' + rel.replace(/index\.html$/, ''));
    for (const h of m[1].matchAll(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/gi)) {
      const t = texto(h[1]).replace(/\s+/g, ' ').trim();
      if (t.length >= 3 && t.length <= 60 && !titulos.has(sinTildes(t))) titulos.set(sinTildes(t), t);
    }
    for (const w of texto(m[1]).match(/[A-Za-zÀ-ÿñÑ][A-Za-zÀ-ÿñÑ'’-]*[A-Za-zÀ-ÿñÑ]/g) || []) {
      if (w.length >= 4 && !VACIAS.has(sinTildes(w)) && w !== w.toUpperCase()) palabras.set(w, (palabras.get(w) || 0) + 1);
    }
  }
  // Una forma por palabra sin tildes: la más frecuente, en minúscula si también aparece así.
  const formas = new Map();
  for (const [forma, n] of [...palabras].sort((a, b) => b[1] - a[1])) {
    const k = sinTildes(forma);
    if (formas.has(k)) formas.get(k)[1] += n;
    else formas.set(k, [palabras.has(forma.toLowerCase()) ? forma.toLowerCase() : forma, n]);
  }
  const out = {
    p: [...formas.values()].sort((a, b) => b[1] - a[1]).slice(0, 2500).map(([f]) => f),
    t: [...titulos.values()].sort((a, b) => a.length - b.length).slice(0, 400),
    r: [...new Set(rutas)].sort(),
    // Familias para los accesos directos (nombre y ruta reales de data/families.json).
    f: data.families.map((fam) => ({ id: fam.id, nombre: fam.name, url: `/productos/${fam.id}/` })),
  };
  fs.mkdirSync(path.join(distDir, 'buscador'), { recursive: true });
  fs.writeFileSync(path.join(distDir, 'buscador', 'terminos-es.json'), JSON.stringify(out));
  return { paginas: out.r.length, palabras: out.p.length, titulos: out.t.length };
}

/** Ejecuta Pagefind sobre dist/ (npx, versión fija). Devuelve true si dejó dist/pagefind/pagefind.js. */
export function runPagefind(distDir) {
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const r = spawnSync(npx, ['-y', `pagefind@${PAGEFIND_VERSION}`, '--site', distDir], { stdio: 'inherit' });
  return r.status === 0 && fs.existsSync(path.join(distDir, 'pagefind', 'pagefind.js'));
}

export function prepararBuscador({ distDir, data, log = console.log }) {
  const t = escribirTerminos(distDir, data);
  log(`[buscador] ${t.paginas} páginas marcadas para el índice · buscador/terminos-es.json (${t.palabras} palabras, ${t.titulos} títulos)`);
  if (process.env.PAGEFIND === '1') {
    if (!runPagefind(distDir)) throw new Error(`Pagefind ${PAGEFIND_VERSION} no generó dist/pagefind/pagefind.js`);
    log('[buscador] índice Pagefind en dist/pagefind/');
  } else {
    log('[buscador] el índice Pagefind lo compila aparte `npm run search` (build:all y el workflow ya lo hacen) o PAGEFIND=1');
  }
}
