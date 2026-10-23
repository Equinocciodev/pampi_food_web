// Utilidades compartidas del generador.
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

// Normalización de búsqueda: minúsculas es, sin diacríticos, espacios colapsados.
// Debe coincidir con normalize() de assets/js/site.js.
export const normalize = (s) => String(s ?? '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLocaleLowerCase('es')
  .replace(/[^a-z0-9ñ]+/g, ' ')
  .trim();
