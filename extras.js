/* =====================================================
   CCTA - EXTRAS DE LA PÁGINA PRINCIPAL
   1) Próxima reunión (hora de Costa Rica)
   2) Versículo de la semana (versiculo.json)
   3) Aparición suave de elementos al hacer scroll
   Todo es opcional: si algo falla, el sitio se ve igual.
   ===================================================== */
(function () {
  'use strict';

  /* ---------- 1) Próxima reunión ---------- */

  // dia: 0 = domingo ... 6 = sábado. Horarios habituales de la agenda.
  var REUNIONES = [
    { dia: 2, h: 9,  m: 30, nombre: 'Ayuno congregacional' },
    { dia: 4, h: 11, m: 0,  nombre: 'Red de adulto mayor' },
    { dia: 5, h: 19, m: 0,  nombre: 'Red de jóvenes' },
    { dia: 6, h: 19, m: 0,  nombre: 'Culto congregacional' },
    { dia: 0, h: 10, m: 0,  nombre: 'Culto dominical' }
  ];
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var EN_CURSO_MIN = 90;

  // Hora actual en Costa Rica (UTC-6, sin horario de verano), sin importar el reloj del visitante.
  function ahoraCR() {
    var d = new Date(Date.now() - 6 * 3600 * 1000);
    return { dia: d.getUTCDay(), min: d.getUTCHours() * 60 + d.getUTCMinutes() };
  }

  function formatoHora(h, m) {
    var suf = h < 12 ? 'a. m.' : 'p. m.';
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + (m < 10 ? '0' + m : m) + ' ' + suf;
  }

  function proxima() {
    var now = ahoraCR();
    var mejor = null;
    REUNIONES.forEach(function (r) {
      var inicio = r.h * 60 + r.m;
      var delta = ((r.dia - now.dia + 7) % 7) * 1440 + inicio - now.min;
      var enCurso = delta <= 0 && delta > -EN_CURSO_MIN;
      if (delta <= -EN_CURSO_MIN) delta += 7 * 1440;
      if (!mejor || delta < mejor.delta) mejor = { r: r, delta: delta, enCurso: enCurso };
    });
    return mejor;
  }

  function iniciarProxima() {
    var cont = document.getElementById('next-meeting');
    var txt = document.getElementById('next-meeting-text');
    if (!cont || !txt) return;

    var p = proxima();
    if (!p) return;

    var now = ahoraCR();
    var cuando;
    if (p.enCurso) {
      cuando = 'Ahora';
    } else if (p.r.dia === now.dia && p.delta < 1440) {
      cuando = 'Hoy';
    } else if (p.r.dia === (now.dia + 1) % 7 && p.delta < 2 * 1440) {
      cuando = 'Mañana';
    } else {
      cuando = DIAS[p.r.dia].charAt(0).toUpperCase() + DIAS[p.r.dia].slice(1);
    }

    txt.textContent = '';
    var strong = document.createElement('strong');
    strong.textContent = p.r.nombre;
    txt.appendChild(strong);
    txt.appendChild(document.createTextNode(' · ' + cuando + (p.enCurso ? '' : ', ' + formatoHora(p.r.h, p.r.m))));
    cont.hidden = false;
  }


  /* ---------- 2) Versículo de la semana ---------- */

  function numeroSemana() {
    // Semanas completas desde el 1 de enero de 2024 (un lunes), hora de Costa Rica.
    var d = new Date(Date.now() - 6 * 3600 * 1000);
    var base = Date.UTC(2024, 0, 1);
    return Math.floor((d.getTime() - base) / (7 * 86400000));
  }

  function iniciarVersiculo() {
    var t = document.getElementById('verse-text');
    var r = document.getElementById('verse-ref');
    if (!t || !r || !window.fetch) return;

    fetch('versiculo.json', { cache: 'no-cache' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        var lista = data && Array.isArray(data.versiculos) ? data.versiculos.filter(function (v) {
          return v && typeof v.texto === 'string' && typeof v.cita === 'string' && v.texto && v.cita;
        }) : [];
        if (!lista.length) return;
        var v = lista[((numeroSemana() % lista.length) + lista.length) % lista.length];
        t.textContent = v.texto;
        r.textContent = v.cita;
      })
      .catch(function () { /* se queda el versículo que trae la página */ });
  }


  /* ---------- 3) Aparición suave al hacer scroll ---------- */

  function iniciarReveal() {
    if (!('IntersectionObserver' in window)) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var grupos = [
      '.quick-grid > *',
      '.agenda-grid > *',
      '.pastor-grid > *',
      '.more-grid > *',
      '.location-grid > *',
      '.sec-head',
      '.verse-band .container'
    ];

    var items = [];
    grupos.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el, i) {
        el.classList.add('reveal');
        el.style.setProperty('--rv-delay', (i % 4) * 90 + 'ms');
        items.push(el);
      });
    });
    if (!items.length) return;

    document.documentElement.classList.add('js-reveal');

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    items.forEach(function (el) { io.observe(el); });

    // Red de seguridad: si por algún motivo el observador no responde, todo se muestra.
    setTimeout(function () {
      items.forEach(function (el) { el.classList.add('in'); });
    }, 6000);
  }


  function iniciar() {
    try { iniciarProxima(); } catch (e) {}
    try { iniciarVersiculo(); } catch (e) {}
    try { iniciarReveal(); } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
