# PAMPI · sitio web

Sitio corporativo PAMPI con catálogo editorial y consultas, sin carrito, precios ni compra. Implementa la especificación aprobada por Juan en el paquete *PAMPI_Web_Agencia_Final* (v1.1, 23/10/2026). Sustituye por completo a la antigua landing de una página.

Es un sitio **estático pre-renderizado** con rutas reales. Lo genera un script de Node sin dependencias externas (solo módulos built-in, Node >= 20) y se publica en GitHub Pages.

## Estructura

```
data/                    Fuente de datos (copia literal de los JSON del paquete)
  catalog.json           50 referencias (todas status concept, publicVisible false)
  families.json          8 familias
  asset-manifest.json    procedencia, SHA256 y dimensiones de cada imagen
  technical-source.json  expediente técnico por referencia_interna (se publican solo campos de producto)
  verified.json          datos verificados por referencia, con fuente por campo (hoy solo PAM-ROJ-01)
  fuentes/               documentos originales (etiqueta, registro SACS); NUNCA se copian a dist/
  catalog.schema.json    esquema de referencia
assets/
  css/main.css           tokens de docs/03, layout y componentes
  css/forms.css          estilos de formulario (campos, errores, resumen, estados)
  js/site.js             menú móvil, búsqueda/filtro del catálogo, consulta precargada con ?sku=
  js/forms.js            validación, estados y envío a Formspree (destino en build/config.mjs)
  js/buscador.js         buscador global de la cabecera (Pagefind; ver «Buscador»)
  css/buscador.css       ventana del buscador (se carga sin bloquear el render)
  img/                   imágenes conceptuales del paquete (mismos nombres)
  img/marca/             logo oficial (logo-pampi.svg) y favicons (ver «Marca»)
build/
  config.mjs             SITE_URL y constantes (único sitio donde está el dominio)
  data.mjs               carga y validación; el build falla si algo no cuadra
  layout.mjs             head, header, footer, skip link, breadcrumbs y tarjetas
  seo.mjs                title/description/canonical/OG, sitemap.xml y robots.txt
  templates/*.mjs        inicio, catalogo, familia, producto, nosotros, distribucion,
                         contacto, privacidad, 404 (+ _inquiry-form.mjs compartido)
  build.mjs              orquesta: limpia dist/, renderiza, copia assets, aplica modos
  buscador.mjs           paso final: términos del autocompletado y, con PAGEFIND=1, índice Pagefind
  check-links.mjs        comprueba que todos los href/src internos de dist/ existen
  serve.mjs              servidor local mínimo para revisar dist/
dist/                    salida generada (ignorada por git; incluye dist/pagefind/ y dist/buscador/)
pagefind.yml             configuración del índice Pagefind (qué se excluye)
CNAME, .nojekyll         se copian a dist/
```

## Rutas (docs/02)

| Ruta | Archivo generado |
|---|---|
| `/` | `dist/index.html` |
| `/productos/` | `dist/productos/index.html` |
| `/productos/{familia}/` (8) | `dist/productos/{familia}/index.html` |
| `/producto/{slug}/` (50) | `dist/producto/{slug}/index.html` (las 50 referencias, con aviso "En desarrollo") |
| `/nosotros/`, `/distribucion/`, `/contacto/`, `/privacidad/` | `dist/<ruta>/index.html` |
| inexistente | `dist/404.html` (GitHub Pages responde con HTTP 404) |

El catálogo conserva la búsqueda y el filtro en la URL con `?q=` y `?familia=`. La búsqueda ignora mayúsculas y diacríticos, admite los alias Edam/edán y té/te, y lee un índice JSON (`/assets/data/search-index.json`) generado en el build que solo contiene las referencias visibles en ese modo.

## Comandos

```sh
node build/build.mjs              # build PÚBLICO (por defecto; es el que se despliega)
STAGING=1 node build/build.mjs    # build STAGING local (conceptos privados)
node build/check-links.mjs        # comprobar enlaces internos del dist/ actual
node build/serve.mjs              # revisar dist/ en http://localhost:4173
npx -y pagefind@1.5.2 --site dist # índice del buscador global sobre el dist/ actual (necesita red)
```

También están disponibles como `npm run build`, `npm run build:staging`, `npm run check` y `npm run serve`; `npm run search` compila el índice del buscador y `npm run build:all` (o `build:all:staging`) hace el build y el índice seguidos. `PAGEFIND=1 node build/build.mjs` hace lo mismo desde el propio build. Para el sitio no hay que instalar nada; el buscador usa Pagefind con `npx` (versión fija 1.5.2).

## Modos

**PÚBLICO** (por defecto). Por decisión del usuario (ver «Decisiones»), entran en catálogo, familias, fichas, índice de búsqueda y sitemap **las 50 referencias**, como conceptos en desarrollo (`PUBLISH_CONCEPTS = true` en `build/config.mjs`). Cada tarjeta lleva el distintivo "EN DESARROLLO" y cada ficha el aviso "En desarrollo. Presentación y especificaciones sujetas a validación con el proveedor.". Las fichas son indexables, con canonical, OG, BreadcrumbList y entrada en el sitemap, y nunca llevan schema Product/Offer ni GTIN.

Con `PUBLISH_CONCEPTS = false` se vuelve a la regla del paquete: solo entran las referencias con `publicVisible === true` que cumplen `canPublish` (status `approved` y todas las `approvalFlags` en `true`, docs/05), y el build falla si aparece el ID, slug o nombre de una referencia no publicable.

`build/check.mjs` (DAT 03) exige en público y en staging:
- una ficha `/producto/{slug}/` por referencia visible, y en cada ficha de concepto el aviso visible "En desarrollo" y `data-pagefind-meta` con `estado:En desarrollo`;
- que en `dist/` no haya precio, stock, disponibilidad, `Offer`/`Product`/`availability` ni datos comerciales internos (MOQ, unidades por caja, cajas por pallet, Incoterm);
- que la «Ficha verificada» solo aparezca con datos de `verified.json` y muestre todos sus campos, y que «Pendiente de validar» no incluya nada verificado;
- que `data/fuentes/` (y cualquier PDF) no se copie a `dist/`.

**STAGING** (`STAGING=1`). Renderiza las mismas 50 fichas para revisión interna, con la banda "VISTA DE DESARROLLO". Todas las páginas llevan `<meta name="robots" content="noindex,nofollow">`, `robots.txt` bloquea todo y no se genera sitemap. Es solo para revisión local: **no se debe desplegar**. robots no es control de acceso; un staging remoto necesita autenticación.

Los dos modos escriben en `dist/`. Haz siempre el build público antes de publicar nada a mano.

## Buscador

Hay dos buscadores. El de `/productos/` (y las familias) filtra la colección por texto y familia con `?q=` y `?familia=` (`site.js`, ver «Rutas») y no cambia. El de la cabecera es global, el mismo que usa zentrix.company, adaptado a Pampi:

- **Pastilla** «Buscar… ⌘K» (en Windows y Linux, «Ctrl K») en la cabecera, en el hueco `#pampi-buscar` que escribe `build/layout.mjs`. Por debajo de 1024 px queda una lupa de 44 px. Su estilo está en `main.css`, así que se pinta con la página. La ventana usa `assets/css/buscador.css`, que se carga sin bloquear el render (`media="print"` + `onload`). `assets/js/buscador.js` va con `defer`.
- **Se abre** con la pastilla, con Cmd/Ctrl+K, con «/» (si no se está escribiendo en un campo) y con `?q=término` en la URL. En `/productos/` y las familias, `?q=` sigue siendo el filtro del catálogo y no abre la ventana. `window.pampiBuscar.abrir(q)` la abre desde otro campo.
- **Ventana accesible:** `role="dialog"` y `aria-modal`, combobox con listbox y `aria-activedescendant`, foco atrapado y devuelto a quien la abrió, Esc para cerrar, anuncio del número de resultados en `role="status"`, pantalla completa en móvil y sin animación con `prefers-reduced-motion`.
- **Pagefind 1.5.2** (versión fija). No se descarga nada de `/pagefind/` hasta abrir el buscador. Si falta el índice (build local sin `npm run search`), la ventana dice «El buscador no está disponible ahora» y enlaza a Productos.
- **Resultados** agrupados por familia (filtro `familia` de Pagefind). Lo que no pertenece a una familia va al final, en «Páginas». Cada resultado lleva una miniatura: la variante WebP de 480 px de la meta `image` en productos y familias, y la «P» de la marca en el resto. También llevan el título corto (meta `title`), el tipo (Producto, Familia o Página) y el aviso «En desarrollo» cuando la ficha lo declara (meta `estado`). Pagefind tolera erratas, así que se descartan los resultados sin ninguna coincidencia visible y se suben los que nombran el término en el título.
- **Accesos directos** («Ir directo»): Productos, las 8 familias (nombre y ruta de `data/families.json`), Nuestra visión, Distribución y Contacto, cuando lo escrito los nombra. No distingue tildes ni mayúsculas. Solo salen las rutas que existen en el índice de ese modo.
- **Autocompletado en gris** (se acepta con Tab o →) a partir de `dist/buscador/terminos-es.json`, que escribe el build (`build/buscador.mjs`) con las palabras, los títulos y las rutas de las páginas indexadas. Con el campo vacío salen las búsquedas recientes y una lista de sugerencias, todas con términos que existen en el catálogo. Las recientes se guardan en `localStorage` (`pampi-buscar-recientes`, máximo 5) dentro de try/catch: en modo privado no se guardan y no pasa nada.
- **Sin resultados:** «Sin resultados para "…"», con la pista de probar otra palabra o el nombre de una familia y un enlace a Productos.
- **No hay** analítica, correo ni WhatsApp en el buscador.

**Índice.** `build/layout.mjs` pone `data-pagefind-body` en el `<main>` de cada página, salvo en la 404 y en la privacidad (`noindex`). Así Pagefind ignora las páginas sin esa marca. Añade también el peso de `h1` (9) y `h2` (6), el filtro `familia` cuando la plantilla no lo declara y las metas `image`, `title`, `tipo` y `estado`, en elementos ocultos que solo lee el indexador. `pagefind.yml` excluye la cabecera, el pie, el skip link, la banda de staging, las migas, el propio buscador, `main nav`, el formulario del catálogo, los formularios y los SVG. Pagefind arma un índice por `<html lang>` (`es-ve`). Hoy indexa 63 páginas: inicio, catálogo, 8 familias, 50 fichas, nosotros, distribución y contacto. En STAGING también se puede compilar el índice para revisarlo (todas las páginas siguen siendo `noindex`).

**Probar en local:** `npm run build:all && npm run serve`, y abrir `http://localhost:4173/?q=passata`. `dist/pagefind/` y `dist/buscador/` se generan y no se commitean.

## Marca

- **Logo oficial:** `assets/img/marca/logo-pampi.svg`, el vector trazado de la etiqueta real (`fill="currentColor"`). Sustituye al logotipo tipográfico provisional del paquete. `build/layout.mjs` lo incrusta en línea para que herede el color: rojo de marca (`--brand-red`) en la cabecera, a 30 px de alto en móvil y 38 px desde 768. El pie reutiliza el mismo trazo con `<use href="#pampi-logo-trazo">` (el HTML no lleva el vector dos veces), a 56 px de alto. Como el pie es crema, el logo va en rojo; sobre un fondo rojo u oscuro bastaría `color: #fff` en el enlace. Lleva `role="img"`, `aria-label="Pampi, inicio"` y `<title>`.
- **Favicon:** `favicon.svg` (la «P» del logo sobre rojo de marca), `favicon-32.png`, `apple-touch-icon.png` (180) e `icon-512.png`, todos en `assets/img/marca/`. Se copian a `dist/` con el resto de `assets/img/`. El `<head>` de cada página enlaza el SVG, el PNG de 32 y el apple-touch-icon, y lleva `<meta name="theme-color" content="#F6F2E7">` (el crema de la cabecera). No se usan tomates como favicon.
- **Imagen para compartir (og:image):** `assets/img/marca/og-pampi.jpg`, 1200×630: fondo crema `#F6F2E7`, el logo SVG en rojo de marca y la botella de passata (`assets/img/passata.jpg`). Composición propia, pendiente de aprobación. `build/seo.mjs` (`DEFAULT_OG_IMAGE`) la pone en todas las páginas con `og:image`, `og:image:width/height/alt`, `twitter:card` `summary_large_image` y `twitter:image:alt`. Las fichas con render individual de al menos 600 px de lado usan el de la referencia (`build/templates/producto.mjs`); las de imagen de familia, la general. `build/check.mjs` exige og:image absoluta, existente, ≥ 600 px y con alt.

## Despliegue

`.github/workflows/deploy.yml` se ejecuta con cada push a `main`: hace el build público, compila el índice del buscador (`npx -y pagefind@1.5.2 --site dist` y `test -f dist/pagefind/pagefind.js`), pasa los gates, comprueba los enlaces y publica `dist/`, que incluye `CNAME` y `.nojekyll`. Este repositorio no toca DNS, Cloudflare ni la configuración de Pages.

**Dominio pendiente de confirmar.** El paquete habla de `pampifoods.com`; el CNAME del repo es `pampifood.com`. `SITE_URL` en `build/config.mjs` vale `https://pampifood.com` y es la única fuente para canonical, OG, sitemap y robots.

## Actualizar datos

1. Edita los JSON de `data/`, que son la fuente canónica. No crees copias en otros sitios.
2. Para una imagen nueva, cópiala en `assets/img/` y añádela a `asset-manifest.json` con su `sha256`, `width` y `height`. En los JSON, la ruta se escribe `assets/<archivo>`.
3. Ejecuta `node build/build.mjs`. La validación comprueba:
   - 50 IDs y slugs únicos y con formato válido, y 8 familias conocidas;
   - que el `familyId` existe;
   - que cada imagen está en el manifest, existe en disco y su SHA256 coincide;
   - que los campos de ficha son texto o `null` (nunca 0);
   - que cada referencia tiene registro técnico;
   - el envase de tomate: PAM-ROJ-01 en vidrio y PAM-ROJ-02 en lata.
4. Para publicar una referencia: `status: "approved"`, todas las `approvalFlags` en `true` y `publicVisible: true`. Solo después de la aprobación técnica, legal y de marca.

No inventes datos: la ficha solo publica lo que está en `verified.json` (con su fuente) y los campos de producto del expediente técnico (ver «Metadata de producto»). Una imagen con `imageCoverage: "family"` se presenta siempre como "Referencia visual de familia", nunca como foto individual.

## Metadata de producto

Cada ficha `/producto/{slug}/` (`build/templates/producto.mjs`) muestra, en este orden:

1. **Cabecera**: familia, nombre, distintivo y aviso "En desarrollo", `summary`, imagen completa (`object-fit: contain`) con su `imageNote`. Si `imageCoverage` es `family`, el pie dice "Imagen de la familia X, no del producto individual".
2. **Ficha verificada**: solo los campos de `data/verified.json` de esa referencia, cada uno con "Fuente: …" en letra pequeña. Para PAM-ROJ-01 (Passata): denominación, marca, contenido neto, ingredientes, modo de empleo, conservación, lote/vencimiento, envase, elaborado por, lugar de fabricación, país de origen, importado y distribuido por, registro sanitario, código de barras, declaraciones de etiqueta, usos sugeridos y la tabla nutricional (`<table>` con `caption` y `scope`: porción, porciones por envase, filas con %VD, nota COVENIN, valores de referencia y calorías por gramo). Las referencias sin datos verificados no tienen esta sección.
3. **En desarrollo con el proveedor**: de `data/technical-source.json`, variante, envase propuesto, cierre propuesto, validación de barrera, datos específicos, frente, dorso, base de fórmula, formato a cotizar y estatus técnico. Debajo, **Pendiente de validar** lista los campos cuyo valor empieza por "PENDIENTE" (fabricante, importador, origen, ingredientes, alérgenos, nutrición, peso neto y escurrido, troquel, vida útil, conservación, GTIN, registro, CPE, advertencias), salvo los que ya cubre `verified.json` para esa referencia.
   **No se publican** los datos comerciales o internos del expediente: `unidades_caja`, `cajas_pallet`, `MOQ`, `precio_incoterm`, `evidencia`, `aprobacion`, `prioridad_desarrollo` y `estatus_alcance` (lista `TECH_PRIVATE`).
4. **Estado de aprobaciones** (`approvalFlags`): comercial, técnica, legal, arte y derechos de imagen, cada uno Pendiente o Aprobado.
5. **Referencia interna** (ID) y hasta 4 relacionados de la misma familia, con enlace a la familia.

La tarjeta del catálogo añade solo el envase propuesto en forma breve (`shortPackaging` en `build/templates/catalogo.mjs`): `specification.packaging` si existe y, si no, el primer fragmento literal de `envase_propuesto` que nombra un envase. Si el expediente no nombra ningún envase (aceitunas, quesos, mermeladas), la tarjeta no muestra la línea.

Para Pagefind, el `<article class="pdp">` de cada ficha lleva `data-pagefind-filter="familia:{familia}"` y `data-pagefind-meta="image:{ruta}, estado:En desarrollo"`, y cada página de familia `data-pagefind-filter="familia:{familia}"`. `data-pagefind-body` lo pone el layout.

## Formularios

`/contacto/` (motivos: consulta general, productos, distribución, proveedores, prensa) y `/distribucion/` (empresa obligatoria) comparten el parcial `build/templates/_inquiry-form.mjs`. El comportamiento está en `assets/js/forms.js`:

- Validación en cliente con los límites de docs/06: nombre (obligatorio, 100 como máximo), correo (obligatorio, válido, 254 como máximo), empresa (150 como máximo y obligatoria en distribución), ciudad/país (obligatorio, 100 como máximo), motivo (enum), mensaje (entre 10 y 2000) y aceptación de la información de privacidad.
- Cada error aparece junto a su campo, con `aria-invalid` y `aria-describedby`. Encima del formulario sale un resumen con enlaces que recibe el foco. El conteo de errores y los avisos se anuncian en una región `role="status"` (`aria-live="polite"`). No se usa `alert()`.
- El honeypot (`_gotcha`, el nombre que Formspree descarta) está oculto y fuera del orden de tabulación. Si llega relleno, no se envía nada.
- Estados (`data-state` del `<form>`): idle, validating, sending, success, error, timeout y unavailable. Mientras envía, el botón muestra "Enviando", lleva `aria-disabled` y bloquea un segundo envío. El timeout es de 15 s y avisa sin afirmar que la consulta se envió.

### Destino: Formspree

El destino se configura en **un único sitio**: `FORM_ENDPOINT` en `build/config.mjs`. El build lo inyecta como atributo `data-endpoint` en el `<form>` y `forms.js` lo lee de ahí.

- **`FORM_ENDPOINT = null` (hoy).** No hay `data-endpoint`: el formulario valida y muestra el aviso honesto de que el envío aún no está habilitado. No transmite ni guarda datos y nunca simula un éxito. Sin JavaScript, el botón se genera deshabilitado y un `<noscript>` lo explica.
- **`FORM_ENDPOINT = 'https://formspree.io/f/<id>'`.** `forms.js` hace `POST` con `fetch` a esa URL, con `FormData` y la cabecera `Accept: application/json` (sin cabeceras propias, así que no hay preflight CORS). Campos que llegan a Formspree: `name`, `email` (Formspree lo usa como reply-to), `company`, `city`, `reason` (la etiqueta legible), `message`, `privacy`, `form` (Contacto o Distribución), `sku` (si se llegó con `?sku=`), `page`, `_subject` (`PAMPI · <motivo> · <nombre>`) y `_gotcha`. Respuestas:
  - `2xx` con `ok`: mensaje de éxito y formulario vacío;
  - `400/422` con `errors[]` de Formspree: los errores con `field` se pintan junto al campo (con texto propio en español); los de formulario (inactivo, no encontrado…) dan el aviso genérico;
  - `429`: aviso de demasiados envíos;
  - error de red o CORS: aviso de conexión, sin afirmar que se envió; timeout de 15 s: aviso de timeout.
- Cualquier otro valor hace fallar el build (`FORM_ENDPOINT_RE`).

Cómo poner el ID:

1. En Formspree, crear el formulario con el correo destinatario aprobado y copiar su endpoint (`https://formspree.io/f/abcdwxyz`). En los ajustes del formulario: restringir el dominio a `pampifood.com`, dejar activa la protección anti-spam y **desactivar reCAPTCHA** (con reCAPTCHA activo Formspree rechaza los envíos por AJAX).
2. En `build/config.mjs`: `export const FORM_ENDPOINT = 'https://formspree.io/f/abcdwxyz';`
3. `npm run build:all` y `node build/check.mjs --public`. Al activar el destino, el build quita solo el copy de demostración (la frase de la casilla de privacidad, el párrafo "En esta vista de diseño no se envían datos" y el texto del `<noscript>`) y el botón pasa de "Probar formulario" a "Enviar consulta".
4. Enviar una consulta de prueba desde el sitio publicado y confirmarla en el panel de Formspree.

Antes de activarlo siguen haciendo falta decisiones (docs/06): destinatario comercial, plazo de retención, responsable legal y el texto de `/privacidad/` revisado (hoy es el del prototipo y debe mencionar a Formspree como encargado del tratamiento). No pedir cédula, datos bancarios, documentos ni adjuntos. El consentimiento de marketing va aparte, es opcional, va desmarcado y queda fuera de la fase 1.

## Decisiones

- **Publicar las 50 referencias como "En desarrollo" (decisión explícita del usuario, 23/10/2026).** Difiere del paquete de agencia (docs/05 y docs/08), que mantiene los conceptos privados hasta su aprobación. El build público publica catálogo, 8 familias, 50 fichas, índice de búsqueda y sitemap, con el aviso visible "En desarrollo" en cada tarjeta y ficha. Las `approvalFlags` siguen en `false` y se muestran como "Pendiente". STAGING sigue existiendo (noindex en todo) para revisión interna. Se revierte con `PUBLISH_CONCEPTS = false` en `build/config.mjs`.
- **Datos verificados aparte del catálogo.** `data/verified.json` contiene solo los datos con fuente documental (hoy, la etiqueta y el registro SACS de la passata). Los documentos originales de `data/fuentes/` no se publican.
- **Logo y favicon oficiales.** `assets/img/marca/logo-pampi.svg` (trazado de la etiqueta real) y `favicon.svg` (la "P" del logo) sustituyen al logo tipográfico provisional del paquete.

## Qué falta para lanzar (gates del paquete, docs/08)

- [ ] Aprobación de Juan sobre el alcance de lanzamiento (landing corporativa sin catálogo, o con referencias aprobadas).
- [x] Logo vectorial: el trazado de la etiqueta real (`assets/img/marca/logo-pampi.svg`) en cabecera y pie, con favicon de la «P» (ver «Marca»). Falta confirmar con Juan si existe un maestro de agencia que lo sustituya.
- [ ] Datos alimentarios y técnicos por referencia (peso, ingredientes, alérgenos, nutrición, origen, vida útil, conservación, GTIN), validados por el responsable técnico.
- [ ] Renders individuales para las referencias que hoy usan imagen de familia, y derechos de cada asset (RIGHTS 01).
- [ ] ID de Formspree y destinatario aprobados. El cliente ya está listo para Formspree (ver «Formularios»); hoy no envía nada porque `FORM_ENDPOINT` es `null` en `build/config.mjs`.
- [ ] Política de privacidad aprobada por revisión legal (`/privacidad/` muestra el texto del prototipo y es `noindex` hasta entonces).
- [ ] Aprobación de la imagen OG 1200×630 (`assets/img/marca/og-pampi.jpg`, composición propia con el logo y la botella de passata; las fichas con render individual ≥ 600 px usan el suyo). Derivados WebP con `srcset` 480/800/1200 hechos; AVIF no.
- [ ] Confirmar el dominio final (pampifood.com o pampifoods.com).
- [ ] QA completo: responsive 320/390/768/1024/1440, teclado, lector de pantalla, contraste, Lighthouse y CWV medidos. Los resultados se adjuntan y no se suponen. Primera pasada en Chromium real (responsive, teclado, axe, buscador, formularios, SEO): `QA_WEB.md`; quedan lector de pantalla, WebKit/Gecko y rendimiento.
- [ ] Autorización específica de despliegue.

No se incorporan analítica, WhatsApp, correo, mapas ni servicios de terceros sin una decisión aprobada.

## Dominio

El dominio definitivo es **pampifood.com** (decisión del usuario, 23/10/2026). La etiqueta de la passata y los PDF de catálogo dicen «pampifoods.com»: Juan debe corregir la etiqueta.
