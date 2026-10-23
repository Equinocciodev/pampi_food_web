// Plantilla Legal (/privacidad/). Texto del prototipo: REEMPLAZAR por la política aprobada antes del lanzamiento.
// Mientras sea el texto provisional se marca noindex y queda fuera del sitemap.
export default function privacidad() {
  const body = `<section class="section">
  <div class="container prose">
    <h1>Privacidad de esta demostración</h1>
    <p>Este prototipo funciona localmente. Los datos introducidos en sus formularios no se envían a ningún servidor ni se guardan en el navegador. No incorpora analítica, cookies publicitarias ni servicios externos.</p>
    <h2>Antes de publicar el sitio</h2>
    <p>La agencia debe incorporar una política aprobada que identifique al responsable, finalidad, destinatarios, conservación y canal para ejercer derechos. Este texto describe solo el prototipo y no sustituye la política del sitio público.</p>
    <p><a href="/contacto/">Volver al contacto</a></p>
  </div>
</section>`;
  return [{
    route: '/privacidad/',
    title: 'Privacidad | PAMPI',
    description: 'Información de privacidad de PAMPI.',
    active: null,
    pageType: 'legal',
    noindex: true,
    inSitemap: false,
    body,
  }];
}
