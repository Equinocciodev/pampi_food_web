// Plantilla Editorial (/nosotros/). Copy literal de app.js / docs/04.
export default function nosotros() {
  const body = `<section class="section">
  <div class="container prose">
    <p class="eyebrow">Nuestra visión</p>
    <h1>La buena mesa empieza con una buena elección.</h1>
    <p class="intro">PAMPI nace como una propuesta para reunir productos de distintas familias bajo una identidad reconocible, cercana y cuidada.</p>
    <h2>Una colección que crece con intención.</h2>
    <p>Desde la despensa cotidiana hasta los momentos de compartir, trabajamos una selección donde el diseño ayuda a reconocer cada producto y a entender su lugar en la mesa.</p>
    <h2>El detalle importa.</h2>
    <p>Presentaciones claras, una familia visual coherente y la información necesaria para elegir. Antes de lanzar cada referencia, se revisan sus especificaciones con los proveedores.</p>
    <a class="button" href="/productos/">Explorar la propuesta</a>
  </div>
</section>`;
  return [{
    route: '/nosotros/',
    title: 'Nuestra visión | PAMPI',
    description: 'PAMPI nace como una propuesta para reunir productos de distintas familias bajo una identidad reconocible, cercana y cuidada.',
    active: 'nosotros',
    pageType: 'about',
    body,
  }];
}
