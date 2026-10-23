// Plantilla Captación B2B (/distribucion/): empresa requerida. Copy literal de app.js.
import { contactBody } from './contacto.mjs';

export default function distribucion() {
  return [{
    route: '/distribucion/',
    title: 'Distribución | PAMPI',
    description: 'Si formas parte de una tienda, una cadena o un negocio de alimentación, cuéntanos qué estás buscando.',
    active: 'distribucion',
    pageType: 'distribution',
    styles: ['/assets/css/forms.css'],
    scripts: ['/assets/js/forms.js'],
    body: contactBody({ distribution: true }),
  }];
}
