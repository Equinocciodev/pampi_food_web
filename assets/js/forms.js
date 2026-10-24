// PAMPI · forms.js — formularios de /contacto/ y /distribucion/ (docs/06, docs/03).
//
// Estados (atributo data-state del <form>): idle · validating · sending · success · error ·
// timeout · unavailable. Reglas:
// - Validación en cliente (el servidor deberá validar de nuevo: docs/06).
// - Error junto a cada campo (aria-invalid + aria-describedby) y resumen enlazado con foco.
// - Honeypot: si viene relleno no se envía nada.
// - "Enviando" bloquea el doble envío; timeout sin afirmar que se envió.
// - Ningún mensaje de éxito hasta una respuesta correcta de Formspree.
//
// DESTINO: el atributo data-endpoint del <form>, que el build inyecta desde FORM_ENDPOINT de
// build/config.mjs (único sitio donde se configura). Solo se acepta https://formspree.io/f/<id>.
// Sin data-endpoint (FORM_ENDPOINT = null) no se transmite nada a ningún servidor: se valida y se
// muestra un aviso honesto de que el envío aún no está habilitado.

export const FORM_TIMEOUT_MS = 15000;
export const FORMSPREE_RE = /^https:\/\/formspree\.io\/f\/[A-Za-z0-9]{6,32}$/;

const REASONS = ['consulta', 'productos', 'distribucion', 'proveedores', 'prensa'];
const REASON_LABELS = {
  consulta: 'Consulta general', productos: 'Productos', distribucion: 'Distribución', proveedores: 'Proveedores', prensa: 'Prensa',
};
// Validación pragmática; el servidor hace la definitiva.
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

const MSG = {
  unavailable: 'El envío aún no está habilitado. Tu consulta no se ha enviado ni guardado: el canal de atención está pendiente de aprobación. Los datos siguen en el formulario.',
  success: 'Hemos recibido tu consulta. Te responderemos por correo electrónico.',
  rate: 'Has enviado varias consultas en poco tiempo. Espera unos minutos e inténtalo de nuevo.',
  network: 'No hemos podido conectar para enviar tu consulta. Revisa tu conexión: tus datos siguen en el formulario.',
  generic: 'No hemos podido enviar tu consulta. Tus datos siguen en el formulario; inténtalo de nuevo más tarde.',
  timeout: 'La conexión tardó demasiado y no podemos confirmar que tu consulta se haya enviado. Tus datos siguen en el formulario.',
  errors: (n) => (n === 1 ? 'El formulario tiene 1 error. Revisa el campo indicado.' : `El formulario tiene ${n} errores. Revisa los campos indicados.`),
};

/**
 * Valida los valores (ya recortados). Devuelve [{field, message}] en orden del formulario.
 * Exportada para poder probarla en Node.
 */
/** Endpoint del formulario si es una URL de Formspree válida; si no, null (envío deshabilitado). */
export function endpointOf(form) {
  const url = form?.dataset?.endpoint || '';
  return FORMSPREE_RE.test(url) ? url : null;
}

/**
 * Campos que se envían a Formspree (FormData). «email» es el que Formspree usa como reply-to;
 * «_subject» es el asunto del aviso (con el motivo) y «_gotcha» el honeypot que Formspree descarta.
 * Exportada para poder probarla en Node.
 */
export function formspreeFields(v, { formType, sku = null, page = '', gotcha = '' } = {}) {
  const reason = REASON_LABELS[v.reason] || v.reason;
  const origin = formType === 'distribucion' ? 'Distribución' : 'Contacto';
  const fields = {
    name: v.name,
    email: v.email,
    company: v.company || '',
    city: v.city,
    reason,
    message: v.message,
    privacy: 'Aceptada',
    form: origin,
    _subject: `PAMPI · ${reason} · ${v.name}`.slice(0, 200),
    _gotcha: gotcha,
  };
  if (sku) fields.sku = sku;
  if (page) fields.page = page;
  return fields;
}

// Mensajes propios (en español) para los errores de campo que devuelva Formspree.
const FIELD_MSG = {
  email: 'Escribe un correo electrónico válido, por ejemplo nombre@empresa.com.',
};

export function validate(v, { companyRequired = false } = {}) {
  const errs = [];
  const add = (field, message) => errs.push({ field, message });
  if (!v.name) add('name', 'Escribe tu nombre.');
  else if (v.name.length > 100) add('name', 'El nombre no puede superar 100 caracteres.');
  if (!v.email) add('email', 'Escribe tu correo electrónico.');
  else if (v.email.length > 254 || !EMAIL_RE.test(v.email)) add('email', 'Escribe un correo electrónico válido, por ejemplo nombre@empresa.com.');
  if (companyRequired && !v.company) add('company', 'Escribe el nombre de tu empresa.');
  else if (v.company && v.company.length > 150) add('company', 'El nombre de la empresa no puede superar 150 caracteres.');
  if (!v.city) add('city', 'Indica tu ciudad y país.');
  else if (v.city.length > 100) add('city', 'La ciudad y el país no pueden superar 100 caracteres.');
  if (!REASONS.includes(v.reason)) add('reason', 'Selecciona un motivo.');
  if (!v.message) add('message', 'Escribe tu mensaje.');
  else if (v.message.length < 10) add('message', 'El mensaje debe tener al menos 10 caracteres.');
  else if (v.message.length > 2000) add('message', 'El mensaje no puede superar 2000 caracteres.');
  if (!v.privacy) add('privacy', 'Confirma que has leído la información de privacidad.');
  return errs;
}

function initForm(form) {
  const companyRequired = form.dataset.formType === 'distribucion';
  const submit = form.querySelector('[data-submit]');
  const summary = form.querySelector('#form-error-summary');
  const feedback = form.querySelector('#form-feedback');
  const honeypot = form.querySelector('input[name="_gotcha"]');
  const endpoint = endpointOf(form);
  const label = submit.textContent;
  const control = (name) => form.elements.namedItem(name);
  let sending = false;
  let attempted = false;

  // Con JS el botón queda operativo (sin JS se queda deshabilitado: no hay destino).
  submit.disabled = false;

  const setState = (s) => { form.dataset.state = s; };
  setState('idle');

  const values = () => ({
    name: control('name').value.trim(),
    email: control('email').value.trim(),
    company: control('company').value.trim(),
    city: control('city').value.trim(),
    reason: control('reason').value,
    message: control('message').value.trim(),
    privacy: control('privacy').checked,
  });

  const setFeedback = (text, tone) => {
    feedback.textContent = text;
    feedback.dataset.tone = tone || '';
  };

  const setFieldError = (field, message) => {
    const input = control(field);
    const box = form.querySelector(`#f-${field}-error`);
    if (!input || !box) return;
    if (message) {
      box.textContent = message;
      box.hidden = false;
      input.setAttribute('aria-invalid', 'true');
    } else {
      box.textContent = '';
      box.hidden = true;
      input.removeAttribute('aria-invalid');
    }
  };

  const clearErrors = () => {
    for (const box of form.querySelectorAll('.field-error')) {
      const field = box.id.replace(/^f-|-error$/g, '');
      setFieldError(field, '');
    }
    summary.hidden = true;
    summary.replaceChildren();
  };

  const showErrors = (errs) => {
    clearErrors();
    for (const e of errs) setFieldError(e.field, e.message);
    const title = document.createElement('h2');
    title.id = 'form-error-summary-title';
    title.textContent = 'Revisa los siguientes campos';
    const list = document.createElement('ul');
    for (const e of errs) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#f-${e.field}`;
      a.textContent = e.message;
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        const input = control(e.field);
        input?.focus();
        input?.scrollIntoView?.({ block: 'center' });
      });
      li.append(a);
      list.append(li);
    }
    summary.append(title, list);
    summary.setAttribute('aria-labelledby', title.id);
    summary.hidden = false;
    summary.focus();
    setFeedback(MSG.errors(errs.length), 'error');
    setState('error');
  };

  const setSending = (on) => {
    sending = on;
    form.setAttribute('aria-busy', String(on));
    if (on) {
      submit.setAttribute('aria-disabled', 'true');
      submit.textContent = 'Enviando';
    } else {
      submit.removeAttribute('aria-disabled');
      submit.textContent = label;
    }
  };

  // Revalidación en vivo tras el primer intento: el error desaparece al corregirlo.
  // Si el blur llega por un clic (pointerdown en otro control), se revalida tras el clic:
  // ocultar el mensaje desplaza el formulario y, hecho entre pointerdown y pointerup, el
  // clic caería fuera del control (p. ej. la casilla de privacidad no se marcaba). QA 2026-10-23.
  let pointerDown = false;
  let deferred = null;
  document.addEventListener('pointerdown', () => { pointerDown = true; }, true);
  const releasePointer = () => {
    pointerDown = false;
    if (deferred) { const t = deferred; deferred = null; setTimeout(() => revalidate(t), 0); }
  };
  document.addEventListener('pointerup', releasePointer, true);
  document.addEventListener('pointercancel', releasePointer, true);
  // `change` de un campo de texto también llega con el blur, así que se difiere igual.
  const revalidateSoon = (ev) => { if (pointerDown) deferred = ev.target; else revalidate(ev.target); };
  form.addEventListener('change', revalidateSoon);
  form.addEventListener('focusout', revalidateSoon);
  function revalidate(target) {
    if (!attempted || !target?.name || target === honeypot) return;
    const errs = validate(values(), { companyRequired });
    const mine = errs.find((e) => e.field === target.name);
    setFieldError(target.name, mine ? mine.message : '');
  }

  async function send(v) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FORM_TIMEOUT_MS);
    const sku = form.querySelector('[data-interest]')?.dataset.sku || null;
    const fd = new FormData();
    const fields = formspreeFields(v, {
      formType: form.dataset.formType, sku, page: location.pathname, gotcha: honeypot?.value || '',
    });
    for (const [k, val] of Object.entries(fields)) fd.append(k, val);
    try {
      // FormData + Accept: sin cabeceras propias, la petición no necesita preflight CORS.
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: fd,
        credentials: 'omit',
        signal: ctrl.signal,
      });
      let body = null;
      try { body = await res.json(); } catch { body = null; }
      if (res.ok && body?.ok !== false) {
        form.reset();
        attempted = false;
        clearErrors();
        setFeedback(MSG.success, 'success');
        setState('success');
        return;
      }
      // Formspree: {errors: [{field?, code, message}]} (400/422). Los de campo se pintan junto a
      // él con un texto propio; los de formulario (inactivo, no encontrado…) dan el aviso genérico.
      if (Array.isArray(body?.errors)) {
        const errs = body.errors
          .filter((e) => e && typeof e.field === 'string' && control(e.field) && e.field !== '_gotcha')
          .map((e) => ({ field: e.field, message: FIELD_MSG[e.field] || 'Revisa este campo.' }));
        if (errs.length) { showErrors(errs); return; }
      }
      setFeedback(res.status === 429 ? MSG.rate : MSG.generic, 'error');
      setState('error');
    } catch (err) {
      if (err?.name === 'AbortError') {
        setFeedback(MSG.timeout, 'error');
        setState('timeout');
      } else {
        // Sin red, bloqueado o error CORS: no se puede confirmar el envío.
        setFeedback(MSG.network, 'error');
        setState('error');
      }
    } finally {
      clearTimeout(timer);
    }
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (sending) return; // bloqueo de doble envío
    attempted = true;
    setState('validating');
    setFeedback('', '');
    const v = values();
    const errs = validate(v, { companyRequired });
    if (errs.length) { showErrors(errs); return; }
    clearErrors();

    if (honeypot && honeypot.value) {
      // Probable bot: no se envía nada y no se simula éxito.
      setFeedback(MSG.generic, 'error');
      setState('error');
      return;
    }

    if (!endpoint) {
      setFeedback(MSG.unavailable, 'warning');
      setState('unavailable');
      return;
    }

    setState('sending');
    setSending(true);
    try {
      await send(v);
    } finally {
      setSending(false);
    }
  });
}

if (typeof document !== 'undefined') {
  for (const form of document.querySelectorAll('[data-inquiry-form]')) initForm(form);
}
