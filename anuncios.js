/* =====================================================
   ANUNCIOS Y PRÓXIMOS EVENTOS (página anuncios.html)
   Lee anuncios.json y muestra solo los eventos que todavía
   no han pasado, cada uno con su afiche, descripción y
   explicación. Los anuncios se publican desde subir.html.
   ===================================================== */

(function () {
  'use strict';

  var lista = document.getElementById('anuncios-lista');

  var MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  var MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  var DIA_MS = 24 * 60 * 60 * 1000;
  var SITIO = 'https://ade30192.github.io/CCTA_SITIO/anuncios.html';

  // ---------- Utilidades ----------

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
    return typeof valor === 'string' ? valor.replace(/[ \t]+/g, ' ').trim().slice(0, max) : '';
  }

  function el(tag, clase, contenido) {
    var e = document.createElement(tag);
    if (clase) e.className = clase;
    if (contenido) e.textContent = contenido;
    return e;
  }

  function icono(id) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'anx-ico');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    var trazos = {
      fecha: 'M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
      hora: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
      lugar: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'
    };
    var path = document.createElementNS(ns, 'path');
    path.setAttribute('d', trazos[id]);
    svg.appendChild(path);
    return svg;
  }

  // Solo imágenes guardadas dentro de la carpeta anuncios/ del sitio
  function imagenSegura(ruta) {
    return typeof ruta === 'string' && /^anuncios\/[\w.\-]+\.(jpe?g|png|webp)$/i.test(ruta.trim()) ? ruta.trim() : '';
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
    return {
      titulo: titulo,
      inicio: inicio,
      fin: fin,
      hora: texto(item.hora, 30),
      lugar: texto(item.lugar, 80),
      descripcion: texto(item.descripcion, 220),
      detalle: texto(item.detalle, 900),
      imagen: imagenSegura(item.imagen),
      url: item.enlace ? enlaceSeguro(item.enlace.url) : '',
      textoEnlace: texto(item.enlace && item.enlace.texto, 40) || 'Más información'
    };
  }

  function etiqueta(ev, base) {
    if (ev.inicio <= base && ev.fin >= base) return { txt: 'Hoy', tipo: 'hoy' };
    var dias = Math.round((ev.inicio - base) / DIA_MS);
    if (dias === 1) return { txt: 'Mañana', tipo: 'pronto' };
    if (dias <= 7) return { txt: 'En ' + dias + ' días', tipo: 'pronto' };
    return { txt: 'Próximamente', tipo: '' };
  }

  function fechaLarga(ev) {
    var d = ev.inicio;
    if (ev.fin > ev.inicio) {
      var mismoMes = ev.fin.getMonth() === d.getMonth();
      return 'Del ' + d.getDate() + (mismoMes ? '' : ' de ' + MESES_LARGOS[d.getMonth()]) +
        ' al ' + ev.fin.getDate() + ' de ' + MESES_LARGOS[ev.fin.getMonth()];
    }
    return DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES_LARGOS[d.getMonth()];
  }

  // ---------- Visor del afiche a pantalla completa ----------
  // Se cierra con el botón "Cerrar", tocando fuera de la imagen, con Escape
  // o con la flecha "atrás" del celular.

  var visor = null, origen = null, conHistorial = false;
  function abrirVisor(src, alt, desde) {
    if (!visor) {
      visor = el('div', 'ann-viewer');
      visor.setAttribute('role', 'dialog');
      visor.setAttribute('aria-modal', 'true');
      visor.setAttribute('aria-label', 'Afiche del evento');
      var cerrar = el('button', 'ann-viewer-close');
      cerrar.type = 'button';
      cerrar.innerHTML = '<span aria-hidden="true">✕</span> Cerrar';
      var img = el('img', 'ann-viewer-img');
      var abajo = el('button', 'ann-viewer-close ann-viewer-close-bottom');
      abajo.type = 'button';
      abajo.innerHTML = '<span aria-hidden="true">←</span> Volver';
      visor.appendChild(cerrar);
      visor.appendChild(img);
      visor.appendChild(abajo);
      visor.addEventListener('click', function (e) { if (e.target !== img) cerrarVisor(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarVisor(); });
      window.addEventListener('popstate', function () {
        if (visor && !visor.hidden) { conHistorial = false; cerrarVisor(); }
      });
      document.body.appendChild(visor);
    }
    origen = desde || null;
    var foto = visor.querySelector('img');
    foto.src = src;
    foto.alt = alt;
    visor.hidden = false;
    document.body.style.overflow = 'hidden';
    try { history.pushState({ visorAfiche: true }, ''); conHistorial = true; } catch (e) { conHistorial = false; }
    visor.querySelector('button').focus();
  }
  function cerrarVisor() {
    if (!visor || visor.hidden) return;
    visor.hidden = true;
    document.body.style.overflow = '';
    if (conHistorial) { conHistorial = false; history.back(); }
    if (origen) origen.focus({ preventScroll: true });
  }

  // ---------- Compartir ----------

  function compartir(ev, boton) {
    var msj = ev.titulo + ' · ' + fechaLarga(ev) + (ev.hora ? ', ' + ev.hora : '') + (ev.lugar ? ' · ' + ev.lugar : '');
    if (navigator.share) {
      navigator.share({ title: ev.titulo, text: msj, url: SITIO }).catch(function () {});
      return;
    }
    window.open('https://wa.me/?text=' + encodeURIComponent(msj + '\n' + SITIO), '_blank', 'noopener');
    boton.blur();
  }

  // ---------- Tarjeta de cada anuncio ----------

  function tarjeta(ev, base) {
    var art = el('article', 'anx-card' + (ev.imagen ? '' : ' sin-afiche'));

    // Afiche
    if (ev.imagen) {
      var marco = el('button', 'anx-poster');
      marco.type = 'button';
      marco.setAttribute('aria-label', 'Ver en grande el afiche de ' + ev.titulo);
      var fondo = el('span', 'anx-poster-bg');
      fondo.style.backgroundImage = 'url("' + ev.imagen + '")';
      fondo.setAttribute('aria-hidden', 'true');
      var img = el('img');
      img.src = ev.imagen;
      img.alt = 'Afiche: ' + ev.titulo;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.onerror = function () { art.classList.add('sin-afiche'); marco.remove(); };
      var lupa = el('span', 'anx-zoom', 'Ver en grande');
      lupa.setAttribute('aria-hidden', 'true');
      marco.appendChild(fondo);
      marco.appendChild(img);
      marco.appendChild(lupa);
      marco.addEventListener('click', function () { abrirVisor(ev.imagen, img.alt, marco); });
      art.appendChild(marco);
    }

    // Contenido
    var cuerpo = el('div', 'anx-body');

    var arriba = el('div', 'anx-top');
    var fecha = el('div', 'anx-date');
    fecha.setAttribute('aria-hidden', 'true');
    fecha.appendChild(el('span', 'anx-day', String(ev.inicio.getDate())));
    fecha.appendChild(el('span', 'anx-month', MESES[ev.inicio.getMonth()]));
    arriba.appendChild(fecha);
    var tag = etiqueta(ev, base);
    arriba.appendChild(el('span', 'anx-tag' + (tag.tipo ? ' ' + tag.tipo : ''), tag.txt));
    cuerpo.appendChild(arriba);

    cuerpo.appendChild(el('h2', 'anx-title', ev.titulo));

    if (ev.descripcion) cuerpo.appendChild(el('p', 'anx-lead', ev.descripcion));

    var datos = el('ul', 'anx-meta');
    [['fecha', fechaLarga(ev)], ['hora', ev.hora], ['lugar', ev.lugar]].forEach(function (d) {
      if (!d[1]) return;
      var li = el('li');
      li.appendChild(icono(d[0]));
      li.appendChild(el('span', '', d[1]));
      datos.appendChild(li);
    });
    cuerpo.appendChild(datos);

    if (ev.detalle) {
      ev.detalle.split(/\n+/).forEach(function (parrafo) {
        if (parrafo.trim()) cuerpo.appendChild(el('p', 'anx-text', parrafo.trim()));
      });
    }

    var acciones = el('div', 'anx-actions');
    if (ev.imagen) {
      var ver = el('button', 'btn btn-navy anx-btn', 'Ver afiche');
      ver.type = 'button';
      ver.addEventListener('click', function () { abrirVisor(ev.imagen, 'Afiche: ' + ev.titulo, ver); });
      acciones.appendChild(ver);
    }
    var comp = el('button', 'btn btn-outline-navy anx-btn', 'Compartir');
    comp.type = 'button';
    comp.addEventListener('click', function () { compartir(ev, comp); });
    acciones.appendChild(comp);
    if (ev.url) {
      var a = el('a', 'anx-link', ev.textoEnlace + ' ↗');
      a.href = ev.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      acciones.appendChild(a);
    }
    cuerpo.appendChild(acciones);

    art.appendChild(cuerpo);
    return art;
  }

  function vacio(msj) {
    lista.innerHTML = '';
    var caja = el('div', 'anx-vacio');
    caja.appendChild(el('strong', '', 'Por ahora no hay anuncios'));
    caja.appendChild(el('p', '', msj));
    lista.appendChild(caja);
  }

  // Si se llegó con un enlace a una parte de la página (ej. #proyectos),
  // se vuelve a ubicar después de cargar los anuncios, porque la lista cambia de altura.
  // Vista previa para subir.html: dibuja la tarjeta exactamente como se verá en la página
  window.CCTAAnuncios = {
    previsualizar: function (item, imagenURL) {
      var ev = normalizar(item);
      if (!ev) return null;
      if (imagenURL) ev.imagen = imagenURL;
      return tarjeta(ev, hoy());
    }
  };

  if (!lista) return;

  var tocado = false;
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (ev) {
    window.addEventListener(ev, function () { tocado = true; }, { passive: true, once: true });
  });

  function reubicar() {
    var id = decodeURIComponent((location.hash || '').slice(1));
    if (!id || id === 'anuncios-lista') return;
    var destino = document.getElementById(id);
    if (!destino) return;
    function ir() { if (!tocado) destino.scrollIntoView(); }
    ir();
    // Los afiches de arriba cambian la altura al cargar: se reubica mientras el visitante no haya movido la página
    lista.querySelectorAll('img').forEach(function (img) {
      img.loading = 'eager';
      if (!img.complete) img.addEventListener('load', ir, { once: true });
    });
    setTimeout(function () { tocado = true; }, 4000);
  }

  // ---------- Carga ----------

  fetch('anuncios.json', { cache: 'no-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (datos) {
      var crudos = Array.isArray(datos) ? datos : (datos && datos.anuncios);
      if (!Array.isArray(crudos)) crudos = [];

      var base = hoy();
      var eventos = crudos
        .map(normalizar)
        .filter(function (ev) { return ev && ev.fin >= base; })
        .sort(function (a, b) { return a.inicio - b.inicio; });

      if (!eventos.length) return vacio('Volvé pronto o revisá nuestras redes para enterarte de las próximas actividades.');

      lista.innerHTML = '';
      eventos.forEach(function (ev) { lista.appendChild(tarjeta(ev, base)); });
    })
    .catch(function () {
      vacio('No pudimos cargar los anuncios en este momento. Intentá de nuevo en un ratito.');
    })
    .then(reubicar);
})();
