// Markup compartido del formulario de consulta (contacto y distribución).
// Campos y límites: docs/06. Copy: app.js. El comportamiento (validación, estados, envío)
// vive en assets/js/forms.js; aquí solo el markup accesible.
// No hay destino aprobado: el formulario no tiene action y el botón se genera deshabilitado,
// de modo que sin JS no puede enviarse nada (ni siquiera a la propia página estática).
// forms.js lo habilita y, mientras FORM_ENDPOINT sea null, no transmite datos.

const REASONS = [
  ['consulta', 'Consulta general'],
  ['productos', 'Productos'],
  ['distribucion', 'Distribución'],
  ['proveedores', 'Proveedores'],
  ['prensa', 'Prensa'],
];

export function inquiryForm({ distribution }) {
  const def = distribution ? 'distribucion' : 'consulta';
  const options = REASONS
    .map(([v, l]) => `<option value="${v}"${v === def ? ' selected' : ''}>${l}</option>`)
    .join('');
  const req = '<span class="req">*</span>';
  const field = (id, label, input, required) => `<div class="form-field" data-field="${id}">
    <label for="f-${id}">${label}${required ? ` ${req}` : ''}</label>
    ${input}
    <p class="field-error" id="f-${id}-error" hidden></p>
  </div>`;
  return `<form class="inquiry-form" id="inquiry-form" method="post" novalidate data-inquiry-form data-form-type="${distribution ? 'distribucion' : 'contacto'}" aria-describedby="form-required-note">
  <p class="fine" id="form-required-note">Los campos marcados con * son obligatorios.</p>
  <div class="form-error-summary" id="form-error-summary" tabindex="-1" hidden></div>
  <p class="badge interest-badge" data-interest hidden></p>
  ${field('name', 'Nombre', '<input id="f-name" name="name" type="text" required autocomplete="name" maxlength="100" aria-describedby="f-name-error">', true)}
  ${field('email', 'Correo electrónico', '<input id="f-email" name="email" type="email" required autocomplete="email" maxlength="254" aria-describedby="f-email-error">', true)}
  ${field('company', 'Empresa', `<input id="f-company" name="company" type="text"${distribution ? ' required' : ''} autocomplete="organization" maxlength="150" aria-describedby="f-company-error">`, distribution)}
  ${field('city', 'Ciudad / país', '<input id="f-city" name="city" type="text" required autocomplete="address-level2" maxlength="100" aria-describedby="f-city-error">', true)}
  ${field('reason', 'Motivo', `<select id="f-reason" name="reason" required aria-describedby="f-reason-error">${options}</select>`, true)}
  ${field('message', 'Mensaje', '<textarea id="f-message" name="message" required minlength="10" maxlength="2000" rows="6" placeholder="Cuéntanos qué necesitas. No incluyas información sensible." aria-describedby="f-message-error"></textarea>', true)}
  <div class="form-field form-check" data-field="privacy">
    <input id="f-privacy" type="checkbox" name="privacy" required aria-describedby="f-privacy-error">
    <label for="f-privacy">He leído la <a href="/privacidad/">información de privacidad</a>. Entiendo que este formulario es una demostración y no transmite datos. ${req}</label>
    <p class="field-error" id="f-privacy-error" hidden></p>
  </div>
  <div class="hp-field" aria-hidden="true">
    <label for="f-website">No completes este campo</label>
    <input id="f-website" name="website" type="text" tabindex="-1" autocomplete="off">
  </div>
  <noscript><p class="form-noscript">Este formulario necesita JavaScript. El envío aún no está habilitado.</p></noscript>
  <button type="submit" class="button" data-submit disabled>Probar formulario</button>
  <div class="form-feedback" id="form-feedback" role="status" aria-live="polite"></div>
</form>`;
}
