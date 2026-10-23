# PAMPI · sitio web

Sitio corporativo PAMPI con catálogo editorial y consultas, sin carrito, precios ni compra. Implementa la especificación aprobada por Juan en el paquete *PAMPI_Web_Agencia_Final* (v1.1, 23/10/2026). Sustituye por completo a la antigua landing de una página.

Es un sitio **estático pre-renderizado** con rutas reales. Lo genera un script de Node sin dependencias externas (solo módulos built-in, Node >= 20) y se publica en GitHub Pages.

## Estructura

```
data/                    Fuente de datos (copia literal de los JSON del paquete)
  catalog.json           50 referencias (todas status concept, publicVisible false)
  families.json          8 familias
  asset-manifest.json    procedencia, SHA256 y dimensiones de cada imagen
  technical-source.json  expediente técnico por referencia_interna (no se publica)
  catalog.schema.json    esquema de referencia
assets/
  css/main.css           tokens de docs/03, layout y componentes
  css/forms.css          estilos de formulario (campos, errores, resumen, estados)
  js/site.js             menú móvil, búsqueda/filtro del catálogo, consulta precargada con ?sku=
  js/forms.js            validación y estados de formularios (FORM_ENDPOINT = null: no envía)
  img/                   imágenes conceptuales del paquete (mismos nombres)
build/
  config.mjs             SITE_URL y constantes (único sitio donde está el dominio)
  data.mjs               carga y validación; el build falla si algo no cuadra
  layout.mjs             head, header, footer, skip link, breadcrumbs y tarjetas
  seo.mjs                title/description/canonical/OG, sitemap.xml y robots.txt
  templates/*.mjs        inicio, catalogo, familia, producto, nosotros, distribucion,
                         contacto, privacidad, 404 (+ _inquiry-form.mjs compartido)
  build.mjs              orquesta: limpia dist/, renderiza, copia assets, aplica modos
  check-links.mjs        comprueba que todos los href/src internos de dist/ existen
  serve.mjs              servidor local mínimo para revisar dist/
dist/                    salida generada (ignorada por git)
CNAME, .nojekyll         se copian a dist/
```

## Rutas (docs/02)

| Ruta | Archivo generado |
|---|---|
| `/` | `dist/index.html` |
| `/productos/` | `dist/productos/index.html` |
| `/productos/{familia}/` (8) | `dist/productos/{familia}/index.html` |
| `/producto/{slug}/` | `dist/producto/{slug}/index.html` (solo referencias visibles en el modo) |
| `/nosotros/`, `/distribucion/`, `/contacto/`, `/privacidad/` | `dist/<ruta>/index.html` |
| inexistente | `dist/404.html` (GitHub Pages responde con HTTP 404) |

El catálogo conserva la búsqueda y el filtro en la URL con `?q=` y `?familia=`. La búsqueda ignora mayúsculas y diacríticos, admite los alias Edam/edán y té/te, y lee un índice JSON (`/assets/data/search-index.json`) generado en el build que solo contiene las referencias visibles en ese modo.

## Comandos

```sh
node build/build.mjs              # build PÚBLICO (por defecto; es el que se despliega)
STAGING=1 node build/build.mjs    # build STAGING local (conceptos privados)
node build/check-links.mjs        # comprobar enlaces internos del dist/ actual
node build/serve.mjs              # revisar dist/ en http://localhost:4173
```

También están disponibles como `npm run build`, `npm run build:staging`, `npm run check` y `npm run serve`. No hay que instalar nada.

## Modos

**PÚBLICO** (por defecto). Solo entran en catálogo, familias, fichas, índice de búsqueda, sitemap y enlaces las referencias con `publicVisible === true` que además cumplen `canPublish` (status `approved` y todas las `approvalFlags` en `true`, docs/05). Si una referencia tiene `publicVisible: true` pero no cumple el resto de condiciones, el build falla.

Hoy ninguna de las 50 referencias es visible, así que:
- el catálogo y las familias muestran el estado editorial "Colección en desarrollo", sin productos;
- no se genera ninguna `/producto/…/`;
- las páginas de marca (inicio, nosotros, distribución, contacto, privacidad y 404) funcionan.

Al terminar, el build revisa todo `dist/` y falla si aparece el ID o la URL de alguna referencia no publicable (DAT 03).

**STAGING** (`STAGING=1`). Renderiza las 50 referencias como conceptos privados: badge "EN DESARROLLO", pendientes visibles, banda "VISTA DE DESARROLLO" y referencia interna. Todas las páginas llevan `<meta name="robots" content="noindex,nofollow">`, `robots.txt` bloquea todo y no se genera sitemap. Es solo para revisión local: **no se debe desplegar**. robots no es control de acceso; un staging remoto necesita autenticación.

Los dos modos escriben en `dist/`. Haz siempre el build público antes de publicar nada a mano.

## Despliegue

`.github/workflows/deploy.yml` se ejecuta con cada push a `main`: hace el build público, comprueba los enlaces y publica `dist/`, que incluye `CNAME` y `.nojekyll`. Este repositorio no toca DNS, Cloudflare ni la configuración de Pages.

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

En público, los campos de `specification` que son `null` se ocultan; en staging se muestran como pendientes. No inventes datos. Una imagen con `imageCoverage: "family"` se presenta siempre como "Referencia visual de familia", nunca como foto individual.

## Formularios

`/contacto/` (motivos: consulta general, productos, distribución, proveedores, prensa) y `/distribucion/` (empresa obligatoria) comparten el parcial `build/templates/_inquiry-form.mjs`. El comportamiento está en `assets/js/forms.js`:

- Validación en cliente con los límites de docs/06: nombre (obligatorio, 100 como máximo), correo (obligatorio, válido, 254 como máximo), empresa (150 como máximo y obligatoria en distribución), ciudad/país (obligatorio, 100 como máximo), motivo (enum), mensaje (entre 10 y 2000) y aceptación de la información de privacidad.
- Cada error aparece junto a su campo, con `aria-invalid` y `aria-describedby`. Encima del formulario sale un resumen con enlaces que recibe el foco. El conteo de errores y los avisos se anuncian en una región `role="status"` (`aria-live="polite"`). No se usa `alert()`.
- El honeypot (`website`) está oculto y fuera del orden de tabulación. Si llega relleno, no se envía nada.
- Estados (`data-state` del `<form>`): idle, validating, sending, success, error, timeout y unavailable. Mientras envía, el botón muestra "Enviando", lleva `aria-disabled` y bloquea un segundo envío. El timeout es de 15 s y avisa sin afirmar que la consulta se envió. Cada envío lleva una cabecera `Idempotency-Key`, que se conserva si hay que reintentar.
- **No hay destino aprobado.** `FORM_ENDPOINT = null` (en `assets/js/forms.js`): el formulario valida y muestra un aviso honesto de que el envío aún no está habilitado. No transmite ni guarda datos, y nunca simula un éxito. Sin JavaScript, el botón se genera deshabilitado y un `<noscript>` lo explica, así que tampoco hay POST a la página estática.

Qué necesita el backend antes de poner `FORM_ENDPOINT` (docs/06):

1. Decisiones aprobadas: destinatario comercial, remitente transaccional verificado, proveedor de correo, plazo de retención, responsable legal, texto de privacidad público con revisión legal, origen permitido y política anti-spam. No configurar correos ni WhatsApp por inferencia.
2. `POST /api/inquiries` con JSON `{name, email, company, city, reason, message, privacyAccepted, formType, sku}` y cabecera `Idempotency-Key`. Respuestas:
   - `201 {id, status: "received"}`;
   - `400/422 {errors: {campo: mensaje}}` (el cliente los pinta junto a cada campo);
   - `429` cuando se supera el límite;
   - `500` con un mensaje genérico.
3. Validación en servidor además de la del cliente:
   - trim y normalización;
   - límites y enum;
   - rechazo de HTML y de CRLF peligrosos (evita la inyección de cabeceras);
   - escapar los datos al renderizarlos.
4. Seguridad:
   - rate limit y honeypot en servidor;
   - CAPTCHA solo si hace falta y se aprueba;
   - CSRF según la sesión y la arquitectura;
   - CORS restringido al origen del sitio;
   - HTTPS;
   - CSP restrictiva que permita `connect-src` al endpoint;
   - ningún secreto en el frontend;
   - logs sin el contenido completo del mensaje;
   - nada de correo abierto.
5. No pedir cédula, datos bancarios, documentos ni adjuntos. El consentimiento de marketing va aparte, es opcional, va desmarcado y queda fuera de la fase 1.
6. Al activarlo, revisar el copy de demostración: la casilla dice "Entiendo que este formulario es una demostración y no transmite datos", el botón dice "Probar formulario" (docs/04 propone "Enviar consulta") y está el párrafo "En esta vista de diseño no se envían datos".

## Qué falta para lanzar (gates del paquete, docs/08)

- [ ] Aprobación de Juan sobre el alcance de lanzamiento (landing corporativa sin catálogo, o con referencias aprobadas).
- [ ] Logo vectorial maestro (hoy hay un sustituto tipográfico "Pampi").
- [ ] Datos alimentarios y técnicos por referencia (peso, ingredientes, alérgenos, nutrición, origen, vida útil, conservación, GTIN), validados por el responsable técnico.
- [ ] Renders individuales para las referencias que hoy usan imagen de familia, y derechos de cada asset (RIGHTS 01).
- [ ] Destino aprobado del formulario (endpoint, destinatario y remitente), seguridad (validación en servidor, rate limit, CSP) y estados reales. El cliente ya está implementado (ver «Formularios»); hoy no envía nada porque `FORM_ENDPOINT` es `null`.
- [ ] Política de privacidad aprobada por revisión legal (`/privacidad/` muestra el texto del prototipo y es `noindex` hasta entonces).
- [ ] Imagen OG 1200×630 aprobada; derivados AVIF/WebP con `srcset` 480/800/1200.
- [ ] Confirmar el dominio final (pampifood.com o pampifoods.com).
- [ ] QA completo: responsive 320/390/768/1024/1440, teclado, lector de pantalla, contraste, Lighthouse y CWV medidos. Los resultados se adjuntan y no se suponen.
- [ ] Autorización específica de despliegue.

No se incorporan analítica, WhatsApp, correo, mapas ni servicios de terceros sin una decisión aprobada.
