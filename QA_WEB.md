# QA de aceptación · web PAMPI

**Fecha:** 2026-10-23 · **Rama:** `web-agencia` (sin commit) · **Matriz:** docs/08 del paquete *PAMPI_Web_Agencia_Final*, adaptada a la decisión del usuario de publicar las 50 referencias como "En desarrollo" (ver README, «Decisiones»).

## Entorno

- macOS (Apple Silicon), Node 26.12.1, Python 3.14.
- **Navegador real:** Chromium 145.0.7632.6 (Chrome for Testing, build 1208 de Playwright), headless, controlado con `playwright-core@1.58.0`. `npx playwright-core install chromium` se atascó al descomprimir (0 % de CPU durante 5 min, sin binario), así que lo maté. Descomprimí con `ditto` el zip ya descargado (170 MB, `unzip -t` sin errores) y comprobé que existían `Contents/MacOS/Google Chrome for Testing` y `Contents/Frameworks/Google Chrome for Testing Framework.framework`.
- **Accesibilidad:** axe-core 4.x (npm), inyectado en la página.
- **Servidores:** `python3 -m http.server 8765` sobre `dist/` para toda la matriz, y `node build/serve.mjs 8766` solo para comprobar la 404 (python no sirve `404.html`).
- **Builds:**
  - PÚBLICO: `npm run build:all` (Pagefind 1.5.2, 63 páginas indexadas).
  - STAGING: `npm run build:all:staging`.
  - Gates: `node build/check.mjs --public` y `--staging` (0 errores, 0 avisos) y `node build/check-links.mjs` (0 enlaces rotos).
- `dist/` queda con el **build PÚBLICO** y su índice.
- **Scripts y evidencias** (fuera del repo): `/private/tmp/pampi-qa/qa.mjs` y los JSON de resultados y de axe, copiados en la carpeta de capturas (ver «Capturas»).

## Resultados

Resultado de la última pasada, con todas las correcciones aplicadas. Resultados: **pasa**, **falla**, **no ejecutado**.

| Test | Resultado | Qué se comprobó (en Chromium salvo que se indique) |
|---|---|---|
| DAT 01 | pasa | 50 referencias, 50 IDs únicos, 8 familias en `families.json`, las 8 en uso. |
| DAT 02 | pasa | Las `<img>` de las 65 páginas decodifican (`naturalWidth > 0`) a 1440 px, con la carga diferida forzada. |
| DAT 03 (nuevo) | pasa | El texto visible (`innerText`) de las **50 fichas** contiene el aviso "En desarrollo… sujetas a validación con el proveedor" y no contiene precio, $, USD, Bs, stock, disponibilidad, MOQ, pallet, Incoterm ni "unidades por caja". El JSON-LD de 63 páginas no lleva Product, Offer ni GTIN. `dist/` no tiene `data/fuentes/` ni ningún PDF. `check.mjs` DAT 03: 0 errores. |
| DAT 04 | pasa (estático) | En las 50 referencias, slug = ID en minúsculas, el ID aparece en su ficha y el canonical apunta a `/producto/{slug}/`. Cada ID tiene registro técnico y los 50 están en el índice de búsqueda. |
| UI 01 | pasa | Revisadas 65 rutas a 320/390/768/1024/1440 px (325 cargas): `scrollWidth ≤ innerWidth`, header y footer visibles, y el logo es un SVG en línea de 112×30 (390) y 142×38 (1440). Sin solapes en la cabecera a 320/768/1024. Los favicons (`favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `icon-512.png`) responden 200 y muestran la «P» blanca sobre rojo. La nitidez del logo la juzgué en las capturas (vector, a 1× y 2×). |
| UI 02 | pasa | Inicio, catálogo, Edam y Gouda, passata y Baby Edam: todas las imágenes de `main` usan `object-fit: contain`, sin recorte. Las imágenes de familia llevan en el pie "Imagen de la familia X, no del producto individual". |
| UI 03 | pasa | A 390 px el botón Menú se alcanza con Tab. `aria-expanded` pasa de false a true con Enter y vuelve a false con Esc. El nav está oculto al cargar y visible al abrir, Tab entra en el nav y Esc devuelve el foco al botón. A 1440 px el botón está oculto y el nav visible. |
| NAV 01 | pasa | Las 65 rutas responden 200. `/no-existe/` responde 404 en `serve.mjs`, que sirve `404.html` («Página no encontrada \| PAMPI»). Con python responde 404 pero con su página genérica. **La respuesta real de GitHub Pages no se probó** (no hay despliegue). |
| SEARCH 01 · catálogo | pasa | La URL conserva `?q=` y `?familia=`. Recuentos: gouda → 3; gouda + quesos → 3; passata + quesos → 0, con mensaje de cero resultados visible; edán = edam → 3; té = te → 10; xilofono → 0, con mensaje; mermeladas → 15. Escribir "verdes" y elegir Aceitunas da 1. En `/productos/quesos/?q=gouda` filtra (3) y no abre la ventana global. |
| SEARCH 01 · Pagefind | pasa | A 1440 y 390 px: **0 peticiones** a `/pagefind/` o `/buscador/` antes de abrir (registro de red), y 5 al abrir. Se abre con Cmd+K, con Ctrl+K, con "/" y con `/?q=passata` (campo relleno, resultado pam-roj-01). "passata" da los grupos «Ir directo \| Tomate y passata \| Páginas»: Passata sale primero, con miniatura WebP de 480 px cargada y la etiqueta "En desarrollo", y se anuncia «5 resultados». Las flechas mueven `aria-activedescendant`. Esc cierra y devuelve el foco a la pastilla. "xilofono" da «Sin resultados…». Un clic en un resultado de "edam" navega a la ficha. En STAGING pasa lo mismo. |
| PDP 01 | pasa | **pam-roj-01:** muestra «Ficha verificada» con 17 «Fuente:» y la tabla nutricional (caption «… por porción: ¼ taza (60 g)», 9 filas, 12 `th[scope]`). Pendientes: solo alérgenos, peso escurrido, troquel, vida útil, CPE y advertencias (nada verificado aparece como pendiente). Tiene migas, la CTA `/contacto/?sku=PAM-ROJ-01`, relacionados y 5 aprobaciones. **pam-que-03, pam-que-01 y pam-mer-01:** no tienen ficha verificada; muestran «En desarrollo con el proveedor», «Ficha técnica pendiente…», 15 pendientes, CTA y el pie de imagen de familia. Ninguna de las cuatro tiene MOQ, precio, pallet ni Incoterm. |
| FORM 01 | pasa | Envío vacío: `aria-invalid` en nombre, correo, ciudad, mensaje y privacidad, 5 mensajes junto a sus campos, y el resumen recibe el foco. Correo mal escrito: error específico. Honeypot con `tabindex=-1`, fuera de pantalla. En `/distribucion/` la empresa es obligatoria. |
| FORM 02 | pasa con Formspree simulado | El cliente está listo para Formspree (`FORM_ENDPOINT` en `build/config.mjs`, hoy `null`). En Chromium, con el `data-endpoint` inyectado y las respuestas de `formspree.io` interceptadas: `POST` con `FormData` y `Accept: application/json`, campos `name, email, company, city, reason` (etiqueta), `message, privacy, form, _subject` («PAMPI · Consulta general · Ana Prueba»), `_gotcha, sku, page`. Respuesta 200 `{ok:true}` da éxito y vacía el formulario. 422 con `errors[{field:"email"}]` pinta el error junto al correo. 400 `FORM_NOT_FOUND` da el aviso genérico. 429 da el aviso de demasiados envíos. Sin red da el aviso de conexión. Con el honeypot relleno no hay petición. Con `null` no hay petición y sale el aviso de envío no habilitado. Con un ID de prueba, el build pone `data-endpoint` en contacto y distribución, quita el copy de demostración y el botón pasa a «Enviar consulta». Una URL que no sea de Formspree hace fallar el build. **No se envió nada a Formspree real** (no hay ID). |
| FORM 03 | pasa (parcial) | Con un formulario válido, doble clic más clic: estado `unavailable`, 0 peticiones y los datos se conservan. El timeout y el reintento con backend no se ejecutaron por falta de endpoint. |
| FORM 04 | pasa | El `<form>` no tiene `action`. No hubo ninguna petición POST ni a otro origen durante todo el flujo (registro de red). |
| A11Y 01 | pasa | **Público:** axe, sin violaciones serias ni críticas tras la corrección, en inicio, catálogo, passata, Baby Edam y contacto, a 1440 y 390 px. Hay un landmark de cada tipo y un solo `h1`, con `lang="es-VE"`. El primer Tab va a «Saltar al contenido», visible y con contorno sólido de 3 px. **Staging:** `region` (moderada) por la banda «VISTA DE DESARROLLO» fuera de los landmarks, solo en staging. Hubo además un `color-contrast` pasajero en el botón de envío: axe lo midió durante la transición de 180 ms de deshabilitado a habilitado, y al medirlo de nuevo pasa. **Faltan** la prueba con lector de pantalla y la revisión manual del orden de foco página por página. |
| SEO 01 | pasa | En PÚBLICO: 63 páginas con canonical absoluto `https://pampifood.com/…`, og:title, og:description, og:url y og:type, y JSON-LD válido sin Product/Offer/GTIN. `noindex` solo en privacidad (y la 404). `robots.txt` permite todo y declara el sitemap, que tiene 63 URLs, de ellas **50 fichas**. En STAGING: `noindex` en todas las páginas (65), `robots.txt` con `Disallow: /`, sin sitemap y con la banda en todas las páginas. Todas las páginas indexables llevan `og:image` absoluta, `og:image:width/height/alt`, `twitter:card` `summary_large_image` y `twitter:image:alt`. La general es `assets/img/marca/og-pampi.jpg` (1200×630). 28 fichas usan su render individual (≥ 600 px); 22 usan la general: las 3 con imagen de familia y los recortes de menos de 600 px (mixes, tés, PAM-QUE-01/03/04). `check.mjs` lo exige. |
| PERF 01 | pasa (laboratorio) | Lighthouse 12.8.2 con Chromium 145 headless, en móvil y escritorio, en inicio, productos, una familia y la ficha de passata: **100 en las 8 mediciones, antes y después**, con CLS 0 y TBT 0. Detalle antes/después en «Rendimiento». Son datos de laboratorio en local: faltan los CWV de campo. |
| SEC 01 | no ejecutado | Necesita hosting, cabeceras HTTP/CSP y backend. |
| RIGHTS 01 | no ejecutado | Es documental: licencia y aprobación de cada asset. |

Además: no hubo errores de JavaScript (`pageerror`) en ninguna página. Los únicos errores de consola fueron los 404 esperados (`/no-existe/`, y `/favicon.ico` al abrir el SVG suelto).

## Rendimiento (Lighthouse, 23/10/2026)

**Cómo se midió.** `npx -y lighthouse@12` (12.8.2) con `CHROME_PATH` en el Chromium 145 de Playwright y `--chrome-flags=--headless=new`, solo la categoría de rendimiento. Móvil: perfil por defecto (Moto G Power simulado, 4G lenta, CPU ×4). Escritorio: `--preset=desktop`. Servidor: `node build/serve.mjs 4173` sobre el build PÚBLICO. Ahora comprime con gzip y sirve `image/webp`, como GitHub Pages. Hay una medición por celda. Los JSON están en `/private/tmp/claude-501/-Users-victorserrano-GitHub-pampi-foods-web/61f16241-5e9c-418d-8a44-56e8d487ec84/scratchpad/lh/{before,after}/`.

| Página | Perfil | Puntuación | FCP (ms) | LCP (ms) | TBT (ms) | CLS | Peso (KB) |
|---|---|---|---|---|---|---|---|
| Inicio `/` | Móvil | 100 → 100 | 917 → 926 | 1365 → 1444 | 0 → 0 | 0.000 → 0.000 | 211 → 217 |
| Inicio `/` | Escritorio | 100 → 100 | 255 → 213 | 362 → 299 | 0 → 0 | 0.000 → 0.000 | 219 → 145 |
| Productos `/productos/` | Móvil | 100 → 100 | 906 → 755 | 1510 → 1455 | 8 → 0 | 0.000 → 0.000 | 215 → 201 |
| Productos `/productos/` | Escritorio | 100 → 100 | 249 → 205 | 462 → 432 | 0 → 0 | 0.000 → 0.000 | 458 → 267 |
| Familia `/productos/tomates/` | Móvil | 100 → 100 | 949 → 753 | 1174 → 978 | 34 → 0 | 0.000 → 0.000 | 47 → 46 |
| Familia `/productos/tomates/` | Escritorio | 100 → 100 | 243 → 202 | 292 → 242 | 0 → 0 | 0.000 → 0.000 | 47 → 39 |
| Ficha passata `/producto/pam-roj-01/` | Móvil | 100 → 100 | 906 → 752 | 1206 → 1052 | 0 → 0 | 0.000 → 0.000 | 47 → 46 |
| Ficha passata `/producto/pam-roj-01/` | Escritorio | 100 → 100 | 242 → 203 | 282 → 251 | 0 → 0 | 0.000 → 0.000 | 47 → 46 |

**Qué marcaba Lighthouse antes y qué se cambió.** El diseño no cambió.

1. **Render-blocking de `main.css`** (unos 150 ms en móvil): `main.css` (y `forms.css` en contacto y distribución) va ahora en un `<style>` en línea. Son unos 4 KB gzip por página; solo se quitan comentarios y sangrías (`build/layout.mjs`, `inlineCss`). Efecto: FCP móvil de unos 906-949 ms a unos 752-755 ms.
2. **`uses-responsive-images` y `modern-image-formats`**:
   - Escritorio a 1×: las tarjetas de 280 px recibían la variante de 480. Ahora hay una variante WebP de **320**.
   - PAM-QUE-03 y PAM-QUE-04 (436 y 440 px) no tenían ningún WebP y servían el JPEG.
   - Ahora cada recorte tiene además una variante a su **ancho original** (`widthsFor` en `build/images.mjs`). Así el srcset no obliga a ampliar una de 480 cuando el original mide 519-1086 px, como pasaba en las fichas de escritorio.
   - Resultado en escritorio: `/productos/` de 458 a 267 KB e inicio de 219 a 145 KB.
3. **Preload de la imagen del hero**: `<link rel="preload" as="image" imagesrcset imagesizes fetchpriority="high">` justo después del viewport, en las páginas cuya primera imagen ansiosa es un `<picture>` (`responsiveImages`). Con el CSS en línea, sin preload, el LCP móvil de inicio subía a unos 1506 ms (3 mediciones). Con preload, 3 mediciones dieron 1054, 1398 y 1444 ms.
   - El LCP móvil de inicio varía entre mediciones y no mejora con claridad respecto al de antes (1365 ms, una sola medición). El resto de páginas sí mejora.
   - Una medición de inicio en móvil dio 66 (FCP 4,7 s). Fue un valor atípico al arrancar: las tres repeticiones dieron 100.
4. Queda sin tocar: `unminified-javascript` en `buscador.js` (3 KB, 0 ms). No hay herramienta de minificado y el ahorro es nulo.

## Defectos encontrados y corregidos

Todos son cambios mínimos y localizados. Reconstruí y repetí la matriz completa en PÚBLICO y en STAGING.

1. **La casilla de privacidad no se marcaba al primer clic tras un error** (`assets/js/forms.js`). Después de un envío fallido, al salir del mensaje para pulsar la casilla, el `change` y el `focusout` del textarea revalidaban y ocultaban su error entre el pointerdown y el pointerup. El formulario subía 30 px y el clic caía fuera de la casilla. Lo reproduje en Chromium con una traza de eventos. La corrección difiere esa revalidación hasta después del clic (pointerup + `setTimeout 0`), así que el clic llega al control y el error desaparece justo después.
2. **Banda editorial «Texturas que invitan a descubrir» descolocada en ≥768 px** (`assets/css/main.css`). `picture { display: contents }` convertía el `<source>` en un hijo vacío del grid, así que la imagen quedaba en la columna 2 y el texto en una segunda fila. Lo corrige `picture > source { display: none; }`.
3. **«⌘K» se salía de la lupa de 44 px por debajo de 1024 px** (`assets/css/main.css`). La regla compartida de `kbd`, que va después, anulaba el `display: none`. Moví la ocultación detrás de esa regla. Ahora solo se ve la lupa, también con el menú abierto.
4. **axe `label-content-name-mismatch` (serio) en la pastilla del buscador** en todas las páginas (`assets/js/buscador.js`). El `aria-label` decía «Buscar (⌘K)» y el texto visible «Buscar… ⌘K». Ahora el `aria-label` es «Buscar ⌘K» (o «Buscar Ctrl K»), y el atajo sigue en `aria-keyshortcuts`.
5. **Buscar producto y Familia no estaban alineados a 1440** (`assets/css/main.css`). El input medía 54 px y el select 48. Los dos tienen ahora `height: 48px`.

## Abiertos (no corregidos; deciden el usuario o el responsable)

- **Texto interno publicado en las fichas.** «Envase propuesto» de PAM-ROJ-01 y PAM-ROJ-02 empieza por «Confirmado por Juan: …», que es el nombre de una persona interna. Hay además instrucciones de briefing al proveedor en «Frente/Dorso de etiqueta», como «No copiar a pelado sus gramos, origen ni declaraciones» o «No decir extra, sin azúcar, natural…». Todo sale literal de `technical-source.json`. Hay que decidir si se publica, se reescribe o se oculta.
- **Código de barras 7590401600006** visible en la ficha verificada, con su nota de que el GTIN está pendiente de asignación autorizada. No se emite en datos estructurados.
- **Imagen OG sin aprobar.** `og-pampi.jpg` es una composición propia (logo y botella de passata sobre crema), no un arte aprobado por la agencia.
- **El catálogo busca solo por nombre**, como dice docs/02. Por eso «aceitunas» o «quesos» escritos en el campo dan 0 aunque existan esas familias. Se resuelve con el selector de familia o con el buscador global, que tiene accesos directos por familia. Una posible mejora es añadir el nombre de la familia a los términos.
- **Extractos de Pagefind** con palabras pegadas, como «vidrioConcepto de presentaciónVer propuesta». Salen de las tarjetas de relacionados que hay dentro del `<main>` de la ficha. Es cosmético. Se arreglaría excluyendo la sección de relacionados en `pagefind.yml` o con `data-pagefind-ignore`.
- **Inicio a 390 px**: en las tarjetas de familia de dos columnas, la flecha de «Explorar colección →» baja a otra línea. Es cosmético.
- **Banda de staging fuera de landmarks** (axe `region`, moderada). Solo afecta a staging.
- **Sin probar:** respuesta 404 real de GitHub Pages, lector de pantalla (VoiceOver o NVDA), Safari/WebKit y Firefox (solo se usó Chromium), y dispositivos táctiles reales.

## Gates pendientes antes de lanzar

- [ ] **Decisión del usuario de publicar los 50 conceptos como "En desarrollo"** (23/10/2026). Difiere de docs/05 y docs/08 del paquete, que piden mantener los conceptos privados. Juan tiene que validarla, o hay que volver a `PUBLISH_CONCEPTS = false`.
- [ ] **Dominio:** el paquete dice `pampifoods.com`, pero el `CNAME` y `SITE_URL` dicen `pampifood.com`. Canonical, OG, sitemap y robots usan hoy `pampifood.com`.
- [ ] Datos alimentarios y técnicos validados para las 49 referencias sin `verified.json`, y la autorización del GTIN de la passata.
- [ ] Renders individuales para las referencias que usan imagen de familia, y derechos de cada asset (RIGHTS 01).
- [ ] ID de Formspree y destinatario aprobados (el cliente ya está listo: README, «Formularios»). Después, un envío real de prueba y SEC 01.
- [ ] Política de privacidad revisada por legal.
- [ ] Aprobar la imagen OG 1200×630 (`assets/img/marca/og-pampi.jpg`).
- [x] PERF 01 medido en laboratorio (Lighthouse, ver «Rendimiento»). Faltan los CWV de campo tras el despliegue.
- [ ] Lector de pantalla y navegadores WebKit y Gecko.
- [ ] Autorización específica de despliegue. Este QA no desplegó, no hizo commit ni tocó CNAME, DNS ni Pages, y no envió ningún formulario.

## Capturas

**Pasada final (og:image, Formspree, rendimiento, 23/10/2026)**, build PÚBLICO, Chromium 145. Están en `/private/tmp/claude-501/-Users-victorserrano-GitHub-pampi-foods-web/61f16241-5e9c-418d-8a44-56e8d487ec84/scratchpad/shots/`:

- `productos-390.png`, `productos-390-quesos.png`, `productos-390-mermeladas.png` y `productos-1440.png`;
- `ficha-pam-que-05-{390,1440}.png`, `ficha-pam-mer-01-{390,1440}.png` y `ficha-pam-te-01-{390,1440}.png`, con los recortes `crop-*.png`.

Sin desbordamiento horizontal y con todas las imágenes cargadas tras recorrer la página.

Defecto corregido: los recortes por referencia tienen un fondo crema propio y se veían como un cuadrado crema dentro del recuadro blanco, con bandas laterales en la ficha a 1440 y en las tarjetas. El manifest guarda ahora el color de fondo de cada recorte (`background`, la mediana del borde). El recuadro de la tarjeta y la imagen de la ficha usan ese color (`mediaBgStyle` en `build/layout.mjs`), así que el recorte se funde con su recuadro.

Pendiente menor: PAM-TE-01 (519 px) se ve algo blando a 390 px@2× porque no hay un original más grande.


Todas están en `/private/tmp/claude-501/-Users-victorserrano-GitHub-pampi-foods-web/61f16241-5e9c-418d-8a44-56e8d487ec84/scratchpad/qa-capturas/`, junto con los resultados (`results-public.json`, `results-staging.json`) y los informes de axe (`axe-public.json`, `axe-staging.json`). Son del build PÚBLICO final, con todas las correcciones, a 390 y 1440 px:

- **Páginas:** `public-inicio-*`, `public-productos-*`, `public-familia-quesos-*`, `public-ficha-passata-*`, `public-ficha-queso-*`, `public-ficha-mermelada-*` y `public-contacto-*`.
- **Buscador:** `buscador-passata-1440.png`, `buscador-passata-390.png` y `buscador-q-passata-390.png`.
- **Otras:** `menu-movil-390.png`, `form-errores-390.png`, `cabecera-ficha-{320,768,1024}.png` y `favicon.png`. En `favicon.png` el PNG de 32 se ve estirado por el flex de la página de prueba; el archivo mide 32×32.

**Comparación con `ui/*.png` del paquete** (son composiciones, no capturas):

- La jerarquía coincide: hero con passata a la derecha, rejilla de 8 familias, banda oliva de quesos, catálogo con búsqueda y familia, y ficha con imagen completa, nombre y CTA.
- El logo tipográfico provisional del paquete está sustituido por el logo oficial vectorial.
- Respecto a la referencia, la ficha añade el aviso "En desarrollo", la ficha verificada y los bloques de desarrollo, aprobaciones y referencia (decisión del usuario y metadata).
- Tras las correcciones no quedan envases recortados, solapes ni textos cortados.
