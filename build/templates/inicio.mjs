// Plantilla Inicio (/). Copy literal de app.js / docs/04.
import { familyCard } from '../layout.mjs';
import { imageUrl } from '../data.mjs';

export default function inicio(ctx) {
  const { data } = ctx;
  const hero = data.asset('assets/passata.jpg');
  const quesos = data.asset('assets/quesos.jpg');
  const body = `<section class="section">
  <div class="container hero">
    <div class="hero-copy">
      <p class="eyebrow">PAMPI · Una nueva mirada a la despensa</p>
      <h1>El gusto está en los detalles.</h1>
      <p class="intro">Ingredientes, texturas y momentos para descubrir una colección que empieza en la cocina y se comparte en la mesa.</p>
      <div class="actions">
        <a class="button" href="/productos/">Explorar la colección</a>
        <a class="button secondary" href="/nosotros/">Conoce PAMPI</a>
      </div>
      <p class="fine">Colección conceptual en desarrollo.</p>
    </div>
    <div class="hero-media">
      <img src="${imageUrl('assets/passata.jpg')}" alt="Propuesta de botella completa de passata PAMPI" width="${hero.width}" height="${hero.height}" fetchpriority="high" decoding="async">
    </div>
  </div>
</section>
<section class="section" aria-labelledby="familias-title">
  <div class="container">
    <p class="eyebrow">Ocho familias, una identidad</p>
    <h2 id="familias-title">Encuentra tu próximo favorito.</h2>
    <ul class="grid" role="list">${data.families.map((f) => familyCard(f, ctx)).join('')}</ul>
  </div>
</section>
<section class="band" aria-labelledby="quesos-title">
  <div class="container section editorial">
    <img src="${imageUrl('assets/quesos.jpg')}" alt="Conceptos Edam y Gouda con dirección visual Delft" width="${quesos.width}" height="${quesos.height}" loading="lazy" decoding="async">
    <div>
      <p class="eyebrow">Una colección con carácter</p>
      <h2 id="quesos-title">Texturas que invitan a descubrir.</h2>
      <p>Explora la propuesta Edam y Gouda, en formatos individuales y para compartir. El detalle está en cada presentación.</p>
      <a class="button on-dark" href="/productos/quesos/">Descubrir quesos</a>
    </div>
  </div>
</section>
<section class="section" aria-labelledby="distribucion-title">
  <div class="container">
    <p class="eyebrow">Conversemos</p>
    <h2 id="distribucion-title">Una marca, muchas posibilidades.</h2>
    <p>Buscamos construir relaciones alrededor de la buena mesa. Conoce nuestra propuesta para negocios y distribución.</p>
    <a class="button" href="/distribucion/">Hablar de distribución</a>
  </div>
</section>`;
  return [{
    route: '/',
    title: 'PAMPI | El gusto está en los detalles',
    description: 'Ingredientes, texturas y momentos para descubrir una colección que empieza en la cocina y se comparte en la mesa.',
    active: null,
    pageType: 'home',
    body,
  }];
}
