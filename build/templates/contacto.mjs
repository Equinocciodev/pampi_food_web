// Plantilla Contacto (/contacto/): consulta general y proveedores. Copy literal de app.js.
import { inquiryForm, FORM_ENABLED } from './_inquiry-form.mjs';
import { breadcrumbs } from '../layout.mjs';

export function contactBody({ distribution }) {
  const eyebrow = distribution ? 'Construyamos relaciones' : 'Hablemos de PAMPI';
  const h1 = distribution ? 'Llevemos nuevas ideas a más mesas.' : 'Una conversación puede ser el comienzo.';
  const intro = distribution
    ? 'Si formas parte de una tienda, una cadena o un negocio de alimentación, cuéntanos qué estás buscando.'
    : 'Comparte tu consulta sobre la marca, sus productos o una oportunidad de colaboración.';
  const crumb = distribution ? 'Distribución' : 'Contacto';
  return `<section class="section">
  <div class="container">
    ${breadcrumbs([{ href: '/', label: 'Inicio' }, { label: crumb }])}
  </div>
  <div class="container split">
    <div>
      <p class="eyebrow">${eyebrow}</p>
      <h1>${h1}</h1>
      <p class="intro">${intro}</p>
      <p>Indica los productos de tu interés y tu ciudad. La información comercial y las presentaciones se confirmarán antes de cualquier acuerdo.</p>
      ${FORM_ENABLED ? '' : '<p class="fine">En esta vista de diseño no se envían datos. El canal de atención y la política de privacidad deben aprobarse antes del lanzamiento.</p>'}
    </div>
    ${inquiryForm({ distribution })}
  </div>
</section>`;
}

export default function contacto() {
  return [{
    route: '/contacto/',
    title: 'Contacto | PAMPI',
    description: 'Comparte tu consulta sobre la marca, sus productos o una oportunidad de colaboración.',
    active: 'contacto',
    pageType: 'contact',
    styles: ['/assets/css/forms.css'],
    scripts: ['/assets/js/forms.js'],
    body: contactBody({ distribution: false }),
  }];
}
