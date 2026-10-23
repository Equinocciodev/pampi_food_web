// Plantilla Error (dist/404.html). GitHub Pages la sirve con HTTP 404 en rutas inexistentes.
export default function notFound() {
  const body = `<section class="section">
  <div class="container">
    <h1>Esta página no está en la colección.</h1>
    <p>Vuelve al inicio o explora nuestras familias.</p>
    <div class="actions">
      <a class="button" href="/productos/">Ver colección</a>
      <a class="button secondary" href="/">Volver al inicio</a>
    </div>
  </div>
</section>`;
  return [{
    route: '/404.html',
    file: '404.html',
    canonical: false,
    title: 'Página no encontrada | PAMPI',
    description: 'Esta página no está en la colección.',
    active: null,
    pageType: 'notfound',
    noindex: true,
    inSitemap: false,
    body,
  }];
}
