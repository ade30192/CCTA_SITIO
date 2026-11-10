/* =====================================================
   ANUNCIOS Y PRÓXIMOS EVENTOS
   Lee anuncios.json y muestra solo los eventos que todavía
   no han pasado. Si no hay ninguno, la sección queda oculta.
   ===================================================== */

(function () {
  'use strict';

  var seccion = document.getElementById('anuncios');
  var lista = document.getElementById('anuncios-lista');
  if (!seccion || !lista) return;

  var MAXIMO = 6;
  var MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  var MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  // "2026-12-24" -> Date local (o null si no es una fecha real)
  function leerFecha(texto) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(texto || ''));
    if (!m) return null;
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) return null;
    return d;
  }

  function hoy() {
    var n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }

  function texto(valor, max) {
    return typeof valor === 'string' ? valor.replace(/\s+/g, ' ').trim().slice(0, max) : '';
  }

  function elemento(tag, clase, contenido) {
    var el = document.createElement(tag);
    if (clase) el.className = clase;
    if (contenido) el.textContent = contenido;
    return el;
  }

  function enlaceSeguro(url) {
    return typeof url === 'string' && /^https:\/\/[^\s]+$/i.test(url.trim()) ? url.trim() : '';
  }

  function normalizar(item) {
    if (!item || typeof item !== 'object') return null;
    var titulo = texto(item.titulo, 90);
    var inicio = leerFecha(item.fecha);
    if (!titulo || !inicio) return null;
    var fin = leerFecha(item.hasta);
    if (!fin || fin < inicio) fin = inicio;
    var url = item.enlace ? enlaceSeguro(item.enlace.url) : '';
    return {
      titulo: titulo,
      inicio: inicio,
      fin: fin,
      hora: texto(item.hora, 30),
      lugar: texto(item.lugar, 80),
      descripcion: texto(item.descripcion, 220),
      url: url,
      textoEnlace: texto(item.enlace && item.enlace.texto, 40) || 'Más información'
    };
  }

  function etiquetaCercania(ev, base) {
    var dia = 24 * 60 * 60 * 1000;
    if (ev.inicio <= base && ev.fin >= base) return 'Hoy';
    if (ev.inicio.getTime() - base.getTime() === dia) return 'Mañana';
    return '';
  }

  function tarjeta(ev, base) {
    var art = elemento('li', 'ann-card');

    var fecha = elemento('div', 'ann-date');
    fecha.setAttribute('aria-hidden', 'true');
    fecha.appendChild(elemento('span', 'ann-day', String(ev.inicio.getDate())));
    fecha.appendChild(elemento('span', 'ann-month', MESES[ev.inicio.getMonth()]));
    art.appendChild(fecha);

    var cuerpo = elemento('div', 'ann-body');

    var tag = etiquetaCercania(ev, base);
    if (tag) cuerpo.appendChild(elemento('span', 'ann-tag', tag));

    cuerpo.appendChild(elemento('h3', '', ev.titulo));

    var partes = [];
    partes.push(ev.inicio.getDate() + ' de ' + MESES_LARGOS[ev.inicio.getMonth()]);
    if (ev.fin > ev.inicio) {
      partes[0] = 'Del ' + ev.inicio.getDate() + ' al ' + ev.fin.getDate() + ' de ' + MESES_LARGOS[ev.fin.getMonth()];
    }
    if (ev.hora) partes.push(ev.hora);
    if (ev.lugar) partes.push(ev.lugar);
    cuerpo.appendChild(elemento('p', 'ann-meta', partes.join(' · ')));

    if (ev.descripcion) cuerpo.appendChild(elemento('p', 'ann-text', ev.descripcion));

    if (ev.url) {
      var a = elemento('a', 'ann-link', ev.textoEnlace + ' ↗');
      a.href = ev.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      cuerpo.appendChild(a);
    }

    art.appendChild(cuerpo);
    return art;
  }

  fetch('anuncios.json', { cache: 'no-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (datos) {
      var crudos = Array.isArray(datos) ? datos : (datos && datos.anuncios);
      if (!Array.isArray(crudos)) return;

      var base = hoy();
      var eventos = crudos
        .map(normalizar)
        .filter(function (ev) { return ev && ev.fin >= base; })
        .sort(function (a, b) { return a.inicio - b.inicio; })
        .slice(0, MAXIMO);

      if (!eventos.length) return;

      eventos.forEach(function (ev) { lista.appendChild(tarjeta(ev, base)); });
      seccion.hidden = false;
    })
    .catch(function () {
      /* Sin anuncios o sin conexión: la sección simplemente no se muestra. */
    });
})();
