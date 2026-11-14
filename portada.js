/* =====================================================
   CCTA - PORTADA
   1) Tarjeta de anuncios en los accesos rápidos (lee anuncios.json)
   2) Pestañas de ubicaciones (Nueva sede / Antigua sede)
   ===================================================== */

(function () {
  'use strict';

  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  var DIA_MS = 24 * 60 * 60 * 1000;


  /* ---------- 1) Tarjeta de anuncios ---------- */

  function leerFecha(texto) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(texto || ''));
    if (!m) return null;
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) return null;
    return d;
  }

  function hoy() {
    var n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }

  function limpio(v, max) {
    return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';
  }

  function iniciarAnuncios() {
    var tarjeta = document.getElementById('qa-anuncios');
    if (!tarjeta || !window.fetch) return;

    var titulo = document.getElementById('qa-ann-title');
    var fecha = document.getElementById('qa-ann-date');
    var cuenta = document.getElementById('qa-ann-count');
    var etiqueta = document.getElementById('qa-ann-tag');
    var img = document.getElementById('qa-ann-img');

    fetch('anuncios.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (datos) {
        var crudos = Array.isArray(datos) ? datos : (datos && datos.anuncios) || [];
        var base = hoy();

        var eventos = crudos.map(function (a) {
          if (!a || typeof a !== 'object') return null;
          var ini = leerFecha(a.fecha);
          var t = limpio(a.titulo, 90);
          if (!ini || !t) return null;
          var fin = leerFecha(a.hasta);
          if (!fin || fin < ini) fin = ini;
          var imagen = typeof a.imagen === 'string' && /^anuncios\/[\w.\-]+\.(jpe?g|png|webp)$/i.test(a.imagen) ? a.imagen : '';
          return { titulo: t, ini: ini, fin: fin, hora: limpio(a.hora, 30), imagen: imagen };
        }).filter(function (e) {
          return e && e.fin >= base;
        }).sort(function (a, b) {
          return a.ini - b.ini;
        });

        if (!eventos.length) return;

        var ev = eventos[0];
        titulo.textContent = ev.titulo;

        var texto = ev.ini <= base ? 'Hoy' : DIAS[ev.ini.getDay()] + ' ' + ev.ini.getDate() + ' de ' + MESES[ev.ini.getMonth()];
        if (ev.hora) texto += ' · ' + ev.hora;
        fecha.textContent = texto;

        cuenta.textContent = String(eventos.length);
        cuenta.hidden = false;
        cuenta.setAttribute('aria-label', eventos.length === 1 ? '1 anuncio' : eventos.length + ' anuncios');

        var dias = Math.round((ev.ini - base) / DIA_MS);
        var tag = ev.ini <= base ? 'Hoy' : dias === 1 ? 'Mañana' : dias <= 7 ? 'En ' + dias + ' días' : '';
        if (tag) {
          etiqueta.textContent = tag;
          etiqueta.hidden = false;
        }

        if (ev.imagen) {
          img.onload = function () {
            img.hidden = false;
            img.parentNode.classList.add('has-img');
          };
          img.src = ev.imagen;
        }

      })
      .catch(function () { /* se queda el texto general "Anuncios y próximos eventos" */ });
  }


  /* ---------- 2) Pestañas de ubicaciones ---------- */

  function iniciarPestanas() {
    var lista = document.querySelector('.loc-tabs');
    if (!lista) return;
    var tabs = Array.prototype.slice.call(lista.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return;

    function elegir(tab, enfocar) {
      tabs.forEach(function (t) {
        var activo = t === tab;
        t.setAttribute('aria-selected', String(activo));
        t.tabIndex = activo ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !activo;
      });
      if (enfocar) tab.focus();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { elegir(tab); });
      tab.addEventListener('keydown', function (e) {
        var nuevo = null;
        if (e.key === 'ArrowRight') nuevo = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft') nuevo = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home') nuevo = tabs[0];
        if (e.key === 'End') nuevo = tabs[tabs.length - 1];
        if (nuevo) { e.preventDefault(); elegir(nuevo, true); }
      });
    });

    // Sin JavaScript se ven las dos sedes; con JavaScript, pestañas
    lista.hidden = false;
    document.querySelector('.locations').classList.add('js-tabs');
    elegir(tabs[0]);
  }


  function iniciar() {
    try { iniciarAnuncios(); } catch (e) {}
    try { iniciarPestanas(); } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
