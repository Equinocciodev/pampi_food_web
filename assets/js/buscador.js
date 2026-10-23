/* PAMPI · buscador global (Pagefind 1.5.2).
   Pastilla «Buscar… ⌘K» en la cabecera (#pampi-buscar; lupa de 44 px en móvil) y ventana
   modal de búsqueda. Nada de Pagefind se descarga hasta abrir el buscador.
   - Índice: `npx -y pagefind@1.5.2 --site dist` tras el build (npm run search / build:all y el
     workflow de Pages). El build escribe /buscador/terminos-es.json (palabras, títulos, rutas y
     familias) para el autocompletado en gris y los accesos directos.
   - Se abre con la pastilla, Cmd/Ctrl+K, «/» y ?q=término en la URL (salvo en /productos/ y las
     familias, donde ?q= es el filtro del catálogo y lo atiende site.js).
   - Resultados agrupados por familia (filtro «familia» de Pagefind); miniatura desde la meta «image».
   - Búsquedas recientes en localStorage (con try/catch). Sin analítica, sin correo ni WhatsApp.
   - window.pampiBuscar.abrir(q) lo abre desde otro campo. */
(function () {
  'use strict';
  var D = document, W = window, H = D.documentElement;
  if (W.__pampiBuscador) return;
  W.__pampiBuscador = true;

  var MAC = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');
  var ICONO_MARCA = '/assets/img/marca/favicon.svg';
  var TX = {
    buscar: 'Buscar…', etiqueta: 'Buscar en Pampi', placeholder: 'Busca productos, familias o información',
    cerrar: 'Cerrar', cancelar: 'Cancelar', resultados: 'Resultados', recientes: 'Recientes',
    sugerencias: 'Sugerencias', atajos: 'Ir directo', borrar: 'Borrar', mover: 'moverse', abrir: 'abrir',
    completar: 'completar', salir: 'cerrar', nada: 'Sin resultados para',
    error: 'El buscador no está disponible ahora.', errorPista: 'Puedes explorar la colección en',
    n1: 'resultado', nN: 'resultados', paginas: 'Páginas', familia: 'Familia', producto: 'Producto',
    // Términos que existen en el catálogo y las familias (data/catalog.json, data/families.json).
    populares: ['Passata', 'Aceite de oliva', 'Aceitunas', 'Atún', 'Edam', 'Manzanilla', 'Mermeladas', 'Distribución']
  };

  /* Accesos directos fijos: [nombre, detalle, ruta, palabras clave]. Las 8 familias se añaden
     desde terminos-es.json (nombre y ruta reales de data/families.json). */
  var ATAJOS = [
    ['Productos', 'Toda la colección', '/productos/', 'productos catalogo catálogo coleccion colección referencias'],
    ['Nuestra visión', 'Quiénes somos', '/nosotros/', 'nosotros vision visión marca quienes somos historia'],
    ['Distribución', 'Para comercios y distribuidores', '/distribucion/', 'distribucion distribución distribuidor distribuidores mayorista comercio venta'],
    ['Contacto', 'Conversemos', '/contacto/', 'contacto conversemos consulta escribir formulario']
  ];
  // Palabras extra por familia (solo sinónimos de lo que ya nombra la familia o su colección).
  var CLAVES_FAMILIA = {
    'aceites': 'aceite oliva coco aguacate girasol',
    'tomates': 'tomate passata pelado salsa',
    'aceitunas': 'aceituna olivas verdes negras rellenas',
    'conservas': 'conserva atun atún sardina sardinas',
    'quesos': 'queso edam edan gouda baby',
    'frutos-secos': 'frutos secos mix mixes nueces',
    'tes-infusiones': 'te té tes tés infusion infusión infusiones manzanilla',
    'mermeladas': 'mermelada fresa durazno mora guayaba piña frambuesa'
  };

  var SVG = {
    lupa: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.75" cy="8.75" r="5.75" stroke="currentColor" stroke-width="1.8"/><path d="m13.2 13.2 4.05 4.05" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    reloj: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.6"/><path d="M10 6.5V10l2.5 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    enter: '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true"><path d="M15 5v4a3 3 0 0 1-3 3H5m0 0 3-3m-3 3 3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    vacio: '<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><circle cx="17.5" cy="17.5" r="10.5" stroke="currentColor" stroke-width="2"/><path d="m25.5 25.5 7 7M13.5 17.5h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };

  /* ---------- utilidades ---------- */
  function plano(s) { // sin tildes y en minúscula, carácter a carácter (misma longitud)
    var out = '';
    for (var i = 0; i < s.length; i++) out += s[i].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().charAt(0) || s[i];
    return out;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, cls, html) { var e = D.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  var CLAVE = 'pampi-buscar-recientes';
  function leerRecientes() { try { var v = JSON.parse(localStorage.getItem(CLAVE) || '[]'); return Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string'; }).slice(0, 5) : []; } catch (e) { return []; } }
  function guardarReciente(q) {
    q = (q || '').trim(); if (q.length < 2) return;
    try { var v = leerRecientes().filter(function (x) { return plano(x) !== plano(q); }); v.unshift(q); localStorage.setItem(CLAVE, JSON.stringify(v.slice(0, 5))); } catch (e) { /* nada */ }
  }
  function borrarRecientes() { try { localStorage.removeItem(CLAVE); } catch (e) { /* nada */ } }

  /* ---------- pastilla ---------- */
  var hueco = D.getElementById('pampi-buscar');
  if (!hueco) return;
  var atajoTxt = MAC ? '⌘K' : 'Ctrl K';
  var pastilla = el('button', 'pfb-pastilla',
    SVG.lupa + '<span class="pfb-pastilla__txt">' + esc(TX.buscar) + '</span><kbd>' + atajoTxt + '</kbd>');
  pastilla.type = 'button';
  pastilla.setAttribute('aria-haspopup', 'dialog');
  pastilla.setAttribute('aria-expanded', 'false');
  // El nombre accesible empieza por el texto visible («Buscar… ⌘K», WCAG 2.5.3). En móvil el
  // texto se oculta y queda este nombre.
  // Mismo orden y texto que lo visible, sin paréntesis (axe label-content-name-mismatch, QA 2026-10-23).
  pastilla.setAttribute('aria-label', TX.buscar.replace('…', '') + ' ' + atajoTxt);
  pastilla.setAttribute('aria-keyshortcuts', (MAC ? 'Meta+K' : 'Control+K') + ' /');
  hueco.appendChild(pastilla);

  /* ---------- estado ---------- */
  var raiz, caja, input, eco, resto, lista, estado;
  var abierto = false, opener = null, activa = -1, opciones = [];
  var pf = null, pfPromesa = null;
  var terminos = null, terminosPromesa = null, rutasExisten = null, familias = [];
  var seq = 0, temporizador = 0, sugerencia = '';

  function cargarPagefind() {
    if (pfPromesa) return pfPromesa;
    pfPromesa = import('/pagefind/pagefind.js').then(function (m) {
      pf = m;
      return Promise.resolve(m.options({ excerptLength: 22 })).then(function () { m.init(); return m; });
    }).catch(function () { pfPromesa = null; return null; });
    return pfPromesa;
  }
  function cargarTerminos() {
    if (terminosPromesa) return terminosPromesa;
    terminosPromesa = fetch('/buscador/terminos-es.json', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) return null;
        familias = (d.f || []).filter(function (f) { return f && f.nombre && f.url; });
        // Prioridad para completar una palabra: las búsquedas sugeridas, los nombres de
        // familia y después las palabras del sitio por frecuencia.
        var formas = {};
        (d.p || []).forEach(function (x) { var k = plano(x); if (!formas[k]) formas[k] = x; });
        var vistos = {}, palabras = [];
        function poner(x) { var k = plano(x); if (k.length > 2 && !vistos[k]) { vistos[k] = 1; palabras.push([k, formas[k] || x]); } }
        TX.populares.forEach(function (x) { if (x.indexOf(' ') === -1) poner(x); });
        familias.forEach(function (f) { if (f.nombre.indexOf(' ') === -1) poner(f.nombre); });
        (d.p || []).forEach(poner);
        (d.t || []).forEach(function (x) { if (x.indexOf(' ') === -1) poner(x); });
        var frases = TX.populares.concat(ATAJOS.map(function (a) { return a[0]; }), familias.map(function (f) { return f.nombre; }), d.t || [])
          .filter(function (x) { return x.indexOf(' ') !== -1; });
        terminos = { p: palabras, f: frases.map(function (x) { return [plano(x), x]; }) };
        rutasExisten = d.r || null;
        if (abierto) alEscribir(true);
        return terminos;
      }).catch(function () { terminosPromesa = null; return null; });
    return terminosPromesa;
  }

  /* ---------- ventana ---------- */
  function construir() {
    raiz = el('div', 'pfb'); raiz.hidden = true;
    raiz.innerHTML =
      '<div class="pfb__velo" data-cerrar></div>' +
      '<div class="pfb__caja" role="dialog" aria-modal="true" aria-label="' + esc(TX.etiqueta) + '">' +
        '<div class="pfb__campo">' + SVG.lupa +
          '<div class="pfb__entrada">' +
            '<span class="pfb__fantasma" aria-hidden="true"><span class="pfb__eco"></span><span class="pfb__resto"></span></span>' +
            '<input class="pfb__input" id="pfb-q" type="text" role="combobox" aria-autocomplete="both" aria-expanded="true"' +
            ' aria-haspopup="listbox" aria-controls="pfb-lista" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"' +
            ' enterkeyhint="search" maxlength="120" aria-label="' + esc(TX.etiqueta) + '" placeholder="' + esc(TX.placeholder) + '">' +
          '</div>' +
          '<button type="button" class="pfb__cerrar" data-cerrar aria-label="' + esc(TX.cerrar) + '">esc</button>' +
          '<button type="button" class="pfb__cerrar-movil" data-cerrar>' + esc(TX.cancelar) + '</button>' +
        '</div>' +
        '<div class="pfb__cuerpo"><div class="pfb__lista" id="pfb-lista" role="listbox" aria-label="' + esc(TX.resultados) + '"></div></div>' +
        '<div class="pfb-sr" role="status" aria-live="polite" aria-atomic="true"></div>' +
        '<div class="pfb__pie" aria-hidden="true">' +
          '<span><kbd>↑</kbd><kbd>↓</kbd>' + esc(TX.mover) + '</span>' +
          '<span><kbd>↵</kbd>' + esc(TX.abrir) + '</span>' +
          '<span><kbd>tab</kbd>' + esc(TX.completar) + '</span>' +
          '<span class="pfb__fin"><kbd>esc</kbd>' + esc(TX.salir) + '</span>' +
        '</div>' +
      '</div>';
    D.body.appendChild(raiz);
    caja = raiz.querySelector('.pfb__caja');
    input = raiz.querySelector('.pfb__input');
    eco = raiz.querySelector('.pfb__eco');
    resto = raiz.querySelector('.pfb__resto');
    lista = raiz.querySelector('.pfb__lista');
    estado = raiz.querySelector('[role="status"]');

    raiz.addEventListener('click', function (e) {
      if (e.target.closest('[data-cerrar]')) { cerrar(); return; }
      if (e.target.closest('.pfb__borrar')) { borrarRecientes(); render(); input.focus(); return; }
      var op = e.target.closest('[role="option"]');
      if (op) { e.preventDefault(); elegir(opciones.indexOf(op), e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1); }
    });
    lista.addEventListener('mousemove', function (e) {
      var op = e.target.closest('[role="option"]');
      if (op && opciones.indexOf(op) !== activa) marcar(opciones.indexOf(op), false);
    });
    input.addEventListener('input', function () { alEscribir(false); });
    input.addEventListener('keydown', teclas);
    input.addEventListener('select', pintarFantasma);
    caja.addEventListener('keydown', function (e) { if (e.key === 'Tab') atrapar(e); if (e.key === 'Escape') { e.preventDefault(); cerrar(); } });
  }

  function abrir(q) {
    if (!raiz) construir();
    if (abierto) { if (q != null) { input.value = q; alEscribir(true); } input.focus(); return; }
    abierto = true;
    opener = D.activeElement && D.activeElement !== D.body ? D.activeElement : pastilla;
    input.placeholder = W.matchMedia && W.matchMedia('(max-width: 640px)').matches ? TX.etiqueta : TX.placeholder;
    raiz.classList.remove('pfb--saliendo');
    raiz.hidden = false;
    H.style.overflow = 'hidden';
    pastilla.setAttribute('aria-expanded', 'true');
    cargarPagefind(); cargarTerminos();
    input.value = q != null ? q : '';
    alEscribir(true);
    input.focus({ preventScroll: true });
    if (input.value) input.setSelectionRange(input.value.length, input.value.length);
  }

  function cerrar() {
    if (!abierto) return;
    abierto = false;
    clearTimeout(temporizador);
    pastilla.setAttribute('aria-expanded', 'false');
    var rm = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fin = function () { if (!abierto) { raiz.hidden = true; raiz.classList.remove('pfb--saliendo'); } };
    if (rm) fin(); else { raiz.classList.add('pfb--saliendo'); setTimeout(fin, 120); }
    H.style.overflow = '';
    var destino = opener && D.contains(opener) ? opener : pastilla;
    try { destino.focus({ preventScroll: true }); } catch (e) { pastilla.focus(); }
  }

  function atrapar(e) {
    if (!e.shiftKey && sugerencia && D.activeElement === input) { e.preventDefault(); aceptar(); return; }
    var f = Array.prototype.filter.call(caja.querySelectorAll('input, button, a[href]:not([role="option"])'), function (n) { return n.offsetParent !== null; });
    if (!f.length) return;
    var i = f.indexOf(D.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  }

  /* ---------- autocompletado en gris ---------- */
  function calcularSugerencia(v) {
    if (!terminos || !v || /\s$/.test(v)) return '';
    var q = plano(v);
    if (v.trim().indexOf(' ') !== -1) {
      for (var i = 0; i < terminos.f.length; i++) if (terminos.f[i][0].indexOf(q) === 0 && terminos.f[i][0].length > q.length) return terminos.f[i][1];
    }
    var m = /(\S+)$/.exec(v); if (!m || m[1].length < 2) return '';
    var ult = plano(m[1]), base = v.slice(0, v.length - m[1].length);
    // Si lo escrito ya es una palabra completa del sitio, no se le propone otra.
    for (var e = 0; e < terminos.p.length; e++) if (terminos.p[e][0] === ult) return '';
    for (var j = 0; j < terminos.p.length; j++) {
      var t = terminos.p[j];
      if (t[0].length > ult.length && t[0].indexOf(ult) === 0) {
        var forma = t[1];
        if (/^[A-ZÁÉÍÓÚÑ]/.test(m[1]) && /^[a-záéíóúñ]/.test(forma)) forma = forma.charAt(0).toUpperCase() + forma.slice(1);
        return base + forma;
      }
    }
    return '';
  }
  function pintarFantasma() {
    var v = input.value;
    var vale = sugerencia && plano(sugerencia).indexOf(plano(v)) === 0 && sugerencia.length > v.length &&
      input.selectionStart === v.length && input.selectionEnd === v.length && input.scrollWidth <= input.clientWidth + 1;
    eco.textContent = vale ? v : '';
    resto.innerHTML = vale ? esc(sugerencia.slice(v.length)) + '<kbd class="pfb__tab">tab</kbd>' : '';
  }
  function aceptar() {
    if (!sugerencia) return false;
    input.value = sugerencia;
    sugerencia = '';
    alEscribir(true);
    input.setSelectionRange(input.value.length, input.value.length);
    return true;
  }

  /* ---------- teclado ---------- */
  function teclas(e) {
    if (e.isComposing) return;
    var k = e.key;
    if (k === 'ArrowDown' || (k === 'n' && e.ctrlKey)) { e.preventDefault(); marcar(activa + 1 >= opciones.length ? 0 : activa + 1, true); }
    else if (k === 'ArrowUp' || (k === 'p' && e.ctrlKey)) { e.preventDefault(); marcar(activa <= 0 ? opciones.length - 1 : activa - 1, true); }
    else if (k === 'Home' && e.ctrlKey) { e.preventDefault(); marcar(0, true); }
    else if (k === 'End' && e.ctrlKey) { e.preventDefault(); marcar(opciones.length - 1, true); }
    else if (k === 'ArrowRight' && sugerencia && input.selectionStart === input.value.length) { if (aceptar()) e.preventDefault(); }
    else if (k === 'Enter') {
      e.preventDefault();
      if (activa >= 0) elegir(activa, e.metaKey || e.ctrlKey);
    }
  }
  function marcar(i, desplazar) {
    if (!opciones.length) { activa = -1; input.removeAttribute('aria-activedescendant'); return; }
    if (activa >= 0 && opciones[activa]) opciones[activa].setAttribute('aria-selected', 'false');
    activa = Math.max(0, Math.min(i, opciones.length - 1));
    var op = opciones[activa];
    op.setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', op.id);
    if (desplazar) op.scrollIntoView({ block: 'nearest' });
  }
  function elegir(i, nuevaPestana) {
    var op = opciones[i]; if (!op) return;
    var q = op.getAttribute('data-q');
    if (q != null) { input.value = q; alEscribir(true); input.focus(); return; }
    var url = op.getAttribute('href');
    var termino = input.value.trim();
    if (termino) guardarReciente(termino);
    if (nuevaPestana) { W.open(url, '_blank', 'noopener'); return; }
    var mismo = url.split('#')[0] === (location.pathname + location.search) && url.indexOf('#') !== -1;
    cerrar();
    if (mismo) location.hash = url.split('#')[1]; else location.href = url;
  }

  /* ---------- búsqueda ---------- */
  function alEscribir(inmediato) {
    var v = input.value;
    sugerencia = calcularSugerencia(v);
    pintarFantasma();
    clearTimeout(temporizador);
    if (!v.trim()) { seq++; render(); return; }
    renderAtajos(v.trim(), null);
    temporizador = setTimeout(function () { buscar(v.trim()); }, inmediato ? 0 : 120);
  }

  function todosLosAtajos() {
    var fams = familias.map(function (f) {
      return [f.nombre, TX.familia, f.url, f.id.replace(/-/g, ' ') + ' ' + (CLAVES_FAMILIA[f.id] || '')];
    });
    return ATAJOS.slice(0, 1).concat(fams, ATAJOS.slice(1));
  }
  function atajosPara(q) {
    var qs = plano(q).split(/\s+/).filter(Boolean);
    if (!qs.length || plano(q).replace(/\s/g, '').length < 2) return [];
    var out = [];
    todosLosAtajos().forEach(function (a) {
      var palabras = plano(a[0] + ' ' + a[3]).split(/\s+/);
      var ok = qs.every(function (t) { return palabras.some(function (p) { return p.indexOf(t) === 0; }); });
      if (!ok) return;
      if (rutasExisten && rutasExisten.indexOf(a[2]) === -1) return; // ruta no publicada en este modo
      out.push({ nombre: a[0], detalle: a[1], url: a[2] });
    });
    return out.slice(0, 4);
  }

  function buscar(q) {
    var mio = ++seq;
    var esperando = setTimeout(function () { if (mio === seq) renderAtajos(q, 'cargando'); }, pf ? 90 : 0);
    cargarPagefind().then(function (m) {
      if (mio !== seq) return null;
      if (!m) { clearTimeout(esperando); renderAtajos(q, 'error'); return null; }
      return m.search(q).then(function (r) {
        if (mio !== seq || !r) return null;
        var top = r.results.slice(0, 12);
        return Promise.all(top.map(function (x) { return x.data(); })).then(function (datos) {
          clearTimeout(esperando);
          if (mio !== seq) return;
          renderResultados(q, datos, r);
        });
      });
    }).catch(function () { clearTimeout(esperando); if (mio === seq) renderAtajos(q, 'error'); });
  }

  /* ---------- pintado ---------- */
  var nOp = 0;
  function opcion(cls, attrs, html) {
    var a = el('a', cls, html);
    a.id = 'pfb-o-' + (++nOp);
    a.setAttribute('role', 'option');
    a.setAttribute('aria-selected', 'false');
    a.tabIndex = -1;
    for (var k in attrs) if (attrs[k] != null) a.setAttribute(k, attrs[k]);
    return a;
  }
  function grupo(titulo, n, extra) {
    var g = el('div', 'pfb-grupo'); g.setAttribute('role', 'group');
    var id = 'pfb-g-' + (++nOp);
    g.appendChild(el('div', 'pfb-grupo__cab', '<span id="' + id + '">' + esc(titulo) + '</span>' +
      (n != null ? '<span class="pfb-grupo__n" aria-hidden="true">' + n + '</span>' : '') + (extra || '')));
    g.setAttribute('aria-labelledby', id);
    return g;
  }
  function icono(src, foto) {
    return '<span class="pfb-op__ico' + (foto ? ' pfb-op__ico--foto' : '') + '"><img src="' + esc(src) + '" alt="" width="44" height="44" loading="lazy" decoding="async"></span>';
  }
  function bloqueAtajos(q) {
    var at = atajosPara(q);
    if (!at.length) return null;
    var g = grupo(TX.atajos, null);
    var fila = el('div', 'pfb-atajos');
    at.forEach(function (a) {
      var o = opcion('pfb-atajo', { href: a.url }, '<span>' + esc(a.nombre) + '</span><small>' + esc(a.detalle) + '</small>');
      o.setAttribute('aria-label', a.nombre + ' — ' + a.detalle);
      fila.appendChild(o);
    });
    g.appendChild(fila);
    return g;
  }
  function esqueleto() {
    var g = el('div', 'pfb-grupo'); g.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 3; i++) g.appendChild(el('div', 'pfb-esq', '<i></i><span><i></i><i></i><i></i></span>'));
    return g;
  }
  function montar(nodos, anuncio) {
    lista.textContent = '';
    nodos.forEach(function (n) { if (n) lista.appendChild(n); });
    opciones = Array.prototype.slice.call(lista.querySelectorAll('[role="option"]'));
    activa = -1;
    if (opciones.length) marcar(0, false); else input.removeAttribute('aria-activedescendant');
    lista.parentNode.scrollTop = 0;
    if (anuncio != null && estado.textContent !== anuncio) estado.textContent = anuncio;
  }

  function filaSimple(q, ico) {
    return opcion('pfb-op pfb-op--simple', { href: '?q=' + encodeURIComponent(q), 'data-q': q },
      '<span class="pfb-op__ico">' + ico + '</span><span class="pfb-op__txt"><span class="pfb-op__tit">' + esc(q) + '</span></span><span class="pfb-op__ir">' + SVG.enter + '</span>');
  }
  function render() { // campo vacío: recientes y sugerencias
    var nodos = [];
    var rec = leerRecientes();
    if (rec.length) {
      var g = grupo(TX.recientes, rec.length, '<button type="button" class="pfb__borrar">' + esc(TX.borrar) + '</button>');
      rec.forEach(function (q) { g.appendChild(filaSimple(q, SVG.reloj)); });
      nodos.push(g);
    }
    var gs = grupo(TX.sugerencias, TX.populares.length);
    TX.populares.forEach(function (q) { gs.appendChild(filaSimple(q, SVG.lupa)); });
    nodos.push(gs);
    montar(nodos, '');
  }

  function renderAtajos(q, modo) {
    var nodos = [bloqueAtajos(q)];
    if (modo === 'cargando') nodos.push(esqueleto());
    else if (modo === 'error') {
      nodos.push(el('div', 'pfb__vacio', SVG.vacio + '<b>' + esc(TX.error) + '</b>' +
        esc(TX.errorPista) + ' <a href="/productos/">Productos</a>.'));
    } else {
      // Mientras llega la búsqueda se conservan los resultados anteriores.
      Array.prototype.forEach.call(lista.querySelectorAll('.pfb-grupo--res'), function (n) { nodos.push(n); });
    }
    var sel = activa >= 0 && opciones[activa] ? opciones[activa].getAttribute('href') : null;
    montar(nodos, modo === 'error' ? TX.error : null);
    if (sel) { for (var i = 0; i < opciones.length; i++) if (opciones[i].getAttribute('href') === sel) { marcar(i, false); break; } }
  }

  // ¿El título o la ruta nombran el término? («atún» → «Atún en aceite de oliva»)
  function nombra(q, d) {
    var raices = plano(q).split(/\s+/).filter(function (t) { return t.length > 2; })
      .map(function (t) { return t.replace(/[^a-z0-9ñ]/g, '').slice(0, 5); }).filter(Boolean);
    var tit = plano(((d.meta && d.meta.title) || '') + ' ' + d.url.replace(/[\/._-]+/g, ' '));
    return raices.length > 0 && raices.every(function (r) { return new RegExp('(^|[^a-z0-9ñ])' + r).test(tit); });
  }
  function depurar(q, datos) {
    // Se sube lo que nombra el término en el título. Pagefind tolera erratas y a veces devuelve
    // páginas sin ninguna coincidencia visible: esas no se muestran.
    var cabezas = plano(q).split(/\s+/).map(function (t) { return t.replace(/[^a-z0-9ñ]/g, '').slice(0, 3); }).filter(Boolean);
    function coincide(ext) {
      var m = (ext || '').match(/<mark>[^<]*/g) || [];
      return m.some(function (x) {
        var w = plano(x.slice(6)).replace(/[^a-z0-9ñ]/g, '');
        return cabezas.some(function (c) { return w.indexOf(c) === 0; });
      });
    }
    datos = datos.filter(function (d) {
      return nombra(q, d) || coincide(d.excerpt) || (d.sub_results || []).some(function (s) { return coincide(s.excerpt); });
    });
    return datos.map(function (d, i) { return [nombra(q, d) ? 0 : 1, i, d]; })
      .sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }).map(function (x) { return x[2]; });
  }
  function limpiarTitulo(t) { return String(t || '').split(' | ')[0]; }

  function renderResultados(q, datos, r) {
    var nodos = [bloqueAtajos(q)];
    // Lo que ya está como acceso directo no se repite abajo.
    var yaArriba = atajosPara(q).map(function (a) { return a.url; });
    datos = depurar(q, datos).filter(function (d) { return yaArriba.indexOf(d.url) === -1; });
    if (!datos.length && yaArriba.length) { montar(nodos, yaArriba.length + ' ' + (yaArriba.length === 1 ? TX.n1 : TX.nN)); return; }
    if (!datos.length) {
      nodos.push(el('div', 'pfb__vacio', SVG.vacio + '<b>' + esc(TX.nada) + ' «' + esc(q) + '»</b>' +
        'Prueba con otra palabra o con el nombre de una familia, como «aceites» o «quesos». ' +
        'También puedes ver toda la colección en <a href="/productos/">Productos</a>.'));
      montar(nodos, TX.nada + ' ' + q);
      return;
    }
    // Agrupados por familia (filtro «familia»); lo que no es de una familia va a «Páginas».
    var orden = [], grupos = {};
    datos.forEach(function (d) {
      var fam = (d.filters && d.filters.familia && d.filters.familia[0]) || '';
      if (!grupos[fam]) { grupos[fam] = []; orden.push(fam); }
      grupos[fam].push(d);
    });
    // «Páginas» siempre al final.
    orden.sort(function (a, b) { return (a === '') - (b === ''); });
    orden.forEach(function (fam) {
      var g = grupo(fam || TX.paginas, grupos[fam].length);
      g.classList.add('pfb-grupo--res');
      grupos[fam].forEach(function (d) {
        var meta = d.meta || {};
        var tit = limpiarTitulo(meta.title) || d.url;
        var tipo = meta.tipo || '';
        var ruta = fam ? (tipo === TX.familia ? TX.familia : (tipo || TX.producto) + ' · ' + fam) : (tipo || '');
        // Foto solo para productos y familias; el resto de páginas lleva la «P» de la marca.
        var foto = meta.image && (tipo === TX.producto || tipo === TX.familia);
        // «En desarrollo»: aviso de las referencias publicadas como concepto (meta «estado»).
        var aviso = meta.estado ? '<span class="pfb-op__estado">' + esc(meta.estado) + '</span>' : '';
        g.appendChild(opcion('pfb-op', { href: d.url },
          icono(foto ? meta.image : ICONO_MARCA, foto) +
          '<span class="pfb-op__txt"><span class="pfb-op__tit">' + esc(tit) + aviso + '</span>' +
          (ruta ? '<span class="pfb-op__ruta">' + esc(ruta) + '</span>' : '') +
          (d.excerpt ? '<span class="pfb-op__ext">' + d.excerpt + '</span>' : '') + '</span>' +
          '<span class="pfb-op__ir">' + SVG.enter + '</span>'));
      });
      nodos.push(g);
    });
    var n = r.results.length;
    montar(nodos, n + ' ' + (n === 1 ? TX.n1 : TX.nN));
  }

  /* ---------- atajos globales ---------- */
  function editable(t) {
    return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  }
  D.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      if (abierto) cerrar(); else abrir();
    } else if (e.key === '/' && !abierto && !e.metaKey && !e.ctrlKey && !e.altKey && !editable(e.target)) {
      e.preventDefault(); abrir();
    }
  });
  pastilla.addEventListener('click', function () { abrir(); });

  /* ---------- API para otros campos ---------- */
  W.pampiBuscar = { abrir: function (q) { abrir(q != null ? String(q).slice(0, 120) : null); } };

  /* ---------- ?q= ---------- */
  // En /productos/ y en las familias, ?q= es el filtro del catálogo (site.js): no se abre aquí.
  try {
    if (!D.querySelector('[data-catalog-search]')) {
      var q0 = new URLSearchParams(location.search).get('q');
      if (q0 && q0.trim()) abrir(q0.trim().slice(0, 120));
    }
  } catch (e) { /* nada */ }
})();
