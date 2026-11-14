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

  // Lee los horarios directamente de las tarjetas de "Nuestras reuniones",
  // así un cambio de horario se hace en un solo lugar (index.html).
  // Si algo no se puede leer, se usa la lista de arriba.
  var NOMBRES_DIA = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };

  function sinTildes(t) {
    return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  function leerAgenda() {
    var lista = [];
    document.querySelectorAll('#agenda .event').forEach(function (card) {
      var dia = NOMBRES_DIA[sinTildes((card.querySelector('.event-day') || {}).textContent)];
      var hora = /(\d{1,2}):(\d{2})\s*([ap])/i.exec((card.querySelector('.time') || {}).textContent || '');
      var nombre = ((card.querySelector('h3') || {}).textContent || '').trim();
      if (dia === undefined || !hora || !nombre) return;
      var h = Number(hora[1]) % 12 + (hora[3].toLowerCase() === 'p' ? 12 : 0);
      lista.push({ dia: dia, h: h, m: Number(hora[2]), nombre: nombre });
    });
    return lista;
  }

  (function () {
    var desdeAgenda = leerAgenda();
    if (desdeAgenda.length) REUNIONES = desdeAgenda;
  })();

  // Resumen del encabezado ("Sábados 7:00 p. m. · Domingos 10:00 a. m."): los cultos de la agenda
  function iniciarResumenHorario() {
    var el = document.getElementById('header-horario');
    if (!el) return;
    var cultos = REUNIONES.filter(function (r) { return /^culto/i.test(r.nombre); });
    if (!cultos.length) return;
    var orden = [6, 0, 1, 2, 3, 4, 5];
    cultos.sort(function (a, b) { return orden.indexOf(a.dia) - orden.indexOf(b.dia); });
    el.textContent = cultos.map(function (r) {
      var d = DIAS[r.dia];
      d = d.charAt(0).toUpperCase() + d.slice(1);
      if (!/s$/.test(d)) d += 's';
      return d + ' ' + formatoHora(r.h, r.m);
    }).join(' · ');
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

  // Orden aleatorio pero estable: todos ven el mismo versículo esa semana y no se
  // repite ninguno hasta haber pasado toda la lista (luego se vuelve a barajar).
  function indiceAleatorio(semana, n) {
    var ciclo = Math.floor(semana / n);
    var pos = ((semana % n) + n) % n;
    var a = [];
    for (var i = 0; i < n; i++) a.push(i);
    var seed = (ciclo * 2654435761 + 12345) >>> 0;
    function rnd() {
      seed = (seed + 0x6D2B79F5) >>> 0;
      var t = seed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    for (var j = n - 1; j > 0; j--) {
      var k = Math.floor(rnd() * (j + 1));
      var x = a[j]; a[j] = a[k]; a[k] = x;
    }
    return a[pos];
  }

  function iniciarVersiculo() {
    var t = document.getElementById('verse-text');
    var r = document.getElementById('verse-ref');
    if (!t || !r || !window.fetch) {
      var b = document.getElementById('versiculo');
      if (b) b.classList.remove('is-loading');
      return;
    }

    var banda = document.getElementById('versiculo');
    function mostrar() { if (banda) banda.classList.remove('is-loading'); }

    // Fechas de la semana (lunes a domingo) debajo de "Versículo de la semana"
    var rango = document.getElementById('verse-week');
    if (rango) {
      var MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      var lunes = new Date(Date.UTC(2024, 0, 1) + numeroSemana() * 7 * 86400000);
      var domingo = new Date(lunes.getTime() + 6 * 86400000);
      rango.textContent = 'Del ' + lunes.getUTCDate() +
        (lunes.getUTCMonth() === domingo.getUTCMonth() ? '' : ' de ' + MES[lunes.getUTCMonth()]) +
        ' al ' + domingo.getUTCDate() + ' de ' + MES[domingo.getUTCMonth()];
    }

    fetch('versiculo.json', { cache: 'no-cache' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        var lista = data && Array.isArray(data.versiculos) ? data.versiculos.filter(function (v) {
          return v && typeof v.texto === 'string' && typeof v.cita === 'string' && v.texto && v.cita;
        }) : [];
        if (!lista.length) return;
        var v = lista[indiceAleatorio(numeroSemana(), lista.length)];
        t.textContent = v.texto;
        r.textContent = v.cita;
      })
      .catch(function () { /* se queda el versículo que trae la página */ })
      .then(mostrar);
  }


  /* ---------- Video de los pastores (YouTube o .mp4) ---------- */

  function idYoutube(valor) {
    var m = String(valor).match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
    if (m) return m[1];
    return /^[\w-]{11}$/.test(valor) ? valor : '';
  }

  function iniciarVideoPastores() {
    var caja = document.getElementById('video-pastores');
    var marco = document.getElementById('video-pastores-frame');
    if (!caja || !marco) return;
    var valor = (caja.getAttribute('data-video') || '').trim();
    if (!valor) return;

    if (/\.(mp4|webm)(\?.*)?$/i.test(valor)) {
      var v = document.createElement('video');
      v.src = valor;
      v.controls = true;
      v.preload = 'metadata';
      v.setAttribute('playsinline', '');
      v.setAttribute('aria-label', 'Video de los pastores');
      marco.appendChild(v);
      caja.hidden = false;
      return;
    }

    var id = idYoutube(valor);
    if (!id) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pv-play';
    btn.setAttribute('aria-label', 'Reproducir el video de los pastores');
    btn.style.backgroundImage = 'url(https://i.ytimg.com/vi/' + id + '/hqdefault.jpg)';
    btn.innerHTML = '<span class="pv-play-icon" aria-hidden="true"></span>';
    btn.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      f.title = 'Video de los pastores';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.setAttribute('allowfullscreen', '');
      marco.replaceChild(f, btn);
    });
    marco.appendChild(btn);
    caja.hidden = false;
  }


  /* ---------- 3) Aparición suave al hacer scroll ---------- */

  function iniciarReveal() {
    if (!('IntersectionObserver' in window)) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var grupos = [
      '.qa-inner > *',
      '.nh-steps > *',
      '.channels-grid > *',
      '.agenda-grid > *',
      '.pastor-grid > *',
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
    try { iniciarResumenHorario(); } catch (e) {}
    try { iniciarProxima(); } catch (e) {}
    try { iniciarVersiculo(); } catch (e) {}
    try { iniciarVideoPastores(); } catch (e) {}
    try { iniciarReveal(); } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();


/* =====================================================
   BARRA FLOTANTE CON MENÚ (solo celulares)
   Cuando el visitante baja y el encabezado ya no se ve,
   aparece una barra compacta arriba con el logo y el botón
   de menú, para abrirlo desde cualquier parte de la página.
   ===================================================== */

(function () {
  'use strict';

  var masthead = document.querySelector('.masthead');
  var nav = document.getElementById('main-nav');
  var toggle = document.querySelector('.menu-toggle');
  if (!masthead || !nav || !toggle || !('IntersectionObserver' in window)) return;

  var movil = window.matchMedia('(max-width: 760px)');

  var barra = document.createElement('div');
  barra.className = 'mini-bar';
  barra.setAttribute('aria-hidden', 'true');
  barra.innerHTML =
    '<a class="mini-brand" href="#inicio" tabindex="-1">' +
      '<img src="logo-iglesia.jpg" alt="">' +
      '<span><strong>Tabernáculo</strong> de Adoración</span>' +
    '</a>' +
    '<button class="mini-menu" type="button" tabindex="-1" aria-controls="main-nav" aria-expanded="false">' +
      '<span class="mini-menu-txt">Menú</span>' +
      '<span class="mini-lines" aria-hidden="true"><i></i><i></i><i></i></span>' +
    '</button>';
  document.body.appendChild(barra);

  var fondo = document.createElement('div');
  fondo.className = 'mini-backdrop';
  document.body.appendChild(fondo);

  var boton = barra.querySelector('.mini-menu');

  function activa(si) {
    document.body.classList.toggle('minibar-on', si);
    barra.setAttribute('aria-hidden', si ? 'false' : 'true');
    barra.querySelectorAll('a, button').forEach(function (el) { el.tabIndex = si ? 0 : -1; });
  }

  function sincronizar() {
    var abierto = nav.classList.contains('open');
    document.body.classList.toggle('menu-abierto', abierto);
    boton.setAttribute('aria-expanded', String(abierto));
    boton.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
    boton.querySelector('.mini-menu-txt').textContent = abierto ? 'Cerrar' : 'Menú';
  }

  // Mostrar la barra solo cuando el encabezado salió de la pantalla (y en celular)
  new IntersectionObserver(function (entradas) {
    var fuera = !entradas[0].isIntersecting;
    activa(fuera && movil.matches);
    // Si se vuelve arriba con el menú abierto, se cierra para no dejarlo flotando
    // y lo mismo al bajar con el menú del encabezado abierto
    var desdeBarra = document.body.classList.contains('menu-desde-barra');
    if (nav.classList.contains('open') && movil.matches && (fuera !== desdeBarra)) {
      toggle.click();
    }
  }, { threshold: 0 }).observe(masthead);

  movil.addEventListener && movil.addEventListener('change', function () {
    if (!movil.matches) activa(false);
  });

  // El botón de la barra usa el mismo menú de siempre
  boton.addEventListener('click', function () {
    document.body.classList.add('menu-desde-barra');
    toggle.click();
  });

  fondo.addEventListener('click', function () {
    if (nav.classList.contains('open')) toggle.click();
  });

  new MutationObserver(function () {
    sincronizar();
    if (!nav.classList.contains('open')) document.body.classList.remove('menu-desde-barra');
  }).observe(nav, { attributes: true, attributeFilter: ['class'] });

  sincronizar();
})();
