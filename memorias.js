/* =====================================================
   CCTA - MEMORIAS (memorias.html)
   - Filtros por álbum (también con el enlace memorias.html#mujeres, etc.).
   - Aparición suave de cada foto al cargar.
   - Visor a pantalla completa: flechas, teclado, deslizar con el dedo y
     botón atrás del celular para cerrarlo.
   ===================================================== */
(function () {
  'use strict';

  var T = window.cctaT || function (s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && k in v ? v[k] : m; }); };

  var albums = Array.prototype.slice.call(document.querySelectorAll('.mem-album'));
  var filtros = Array.prototype.slice.call(document.querySelectorAll('.mem-filtros button'));
  if (!albums.length) return;

  document.documentElement.classList.add('js-mem');

  /* ---------- Aparición suave ---------- */

  Array.prototype.forEach.call(document.querySelectorAll('.mem-foto img'), function (img) {
    var marco = img.closest('.mem-foto');
    function listo() { marco.classList.add('cargada'); }
    if (img.complete && img.naturalWidth) listo();
    else {
      img.addEventListener('load', listo, { once: true });
      img.addEventListener('error', listo, { once: true });
    }
  });

  /* ---------- Filtros ---------- */

  function filtrar(id, desplazar) {
    var valido = id === 'todas' || albums.some(function (a) { return a.id === id; });
    if (!valido) id = 'todas';

    albums.forEach(function (a) { a.hidden = id !== 'todas' && a.id !== id; });
    filtros.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-filtro') === id)); });

    if (desplazar) {
      var destino = document.getElementById('albumes');
      if (destino) destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  filtros.forEach(function (b) {
    b.addEventListener('click', function () {
      var id = b.getAttribute('data-filtro');
      filtrar(id, false);
      try { history.replaceState(history.state, '', id === 'todas' ? location.pathname + location.search : '#' + id); } catch (e) {}
    });
  });

  var inicial = (location.hash || '').replace('#', '');
  if (inicial && inicial !== 'albumes') {
    filtrar(inicial, false);
    var al = document.getElementById(inicial);
    if (al) setTimeout(function () { al.scrollIntoView({ block: 'start' }); }, 60);
  }

  /* ---------- Visor ---------- */

  var visor = document.getElementById('visor');
  if (!visor) return;

  var vImg = visor.querySelector('.visor-centro img');
  var vInfo = visor.querySelector('.visor-info');
  var vPie = visor.querySelector('.visor-pie');
  var vCerrar = visor.querySelector('.visor-cerrar');
  var vPrev = visor.querySelector('.visor-prev');
  var vNext = visor.querySelector('.visor-next');
  var webp = (function () {
    try { return document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0; } catch (e) { return false; }
  })();

  var lista = [];
  var pos = 0;
  var origen = null;
  var conHistorial = false;

  function fotosVisibles() {
    return Array.prototype.slice.call(document.querySelectorAll('.mem-album:not([hidden]) .mem-foto'));
  }

  function grande(boton) {
    return boton.getAttribute(webp ? 'data-webp' : 'data-jpg');
  }

  function precargar(i) {
    var b = lista[(i + lista.length) % lista.length];
    if (b) { var im = new Image(); im.src = grande(b); }
  }

  function mostrar(i) {
    pos = (i + lista.length) % lista.length;
    var b = lista[pos];
    var miniatura = b.querySelector('img');
    var album = b.closest('.mem-album');
    var titulo = album ? album.querySelector('h2').textContent : '';

    vImg.classList.add('cambiando');
    vImg.onload = function () { vImg.classList.remove('cambiando'); };
    vImg.src = grande(b);
    vImg.alt = miniatura.alt;

    vInfo.innerHTML = '';
    vInfo.appendChild(document.createTextNode(titulo));
    var n = document.createElement('span');
    n.textContent = T('{i} de {n}', { i: pos + 1, n: lista.length });
    vInfo.appendChild(n);
    vPie.textContent = miniatura.alt;

    precargar(pos + 1);
    precargar(pos - 1);
  }

  function abrir(boton) {
    lista = fotosVisibles();
    origen = boton;
    visor.hidden = false;
    document.body.classList.add('visor-activo');
    requestAnimationFrame(function () { visor.classList.add('abierto'); });
    mostrar(lista.indexOf(boton));
    vCerrar.focus();
    try { history.pushState({ visor: true }, ''); conHistorial = true; } catch (e) { conHistorial = false; }
  }

  function cerrar(desdeHistorial) {
    if (visor.hidden) return;
    visor.classList.remove('abierto');
    visor.hidden = true;
    document.body.classList.remove('visor-activo');
    vImg.removeAttribute('src');
    if (origen) origen.focus();
    if (!desdeHistorial && conHistorial) { conHistorial = false; history.back(); }
    conHistorial = false;
  }

  document.querySelectorAll('.mem-foto').forEach(function (b) {
    b.addEventListener('click', function () { abrir(b); });
  });

  vCerrar.addEventListener('click', function () { cerrar(false); });
  vPrev.addEventListener('click', function () { mostrar(pos - 1); });
  vNext.addEventListener('click', function () { mostrar(pos + 1); });

  // Tocar el fondo oscuro (fuera de la foto) cierra
  visor.querySelector('.visor-centro').addEventListener('click', function (e) {
    if (e.target === e.currentTarget) cerrar(false);
  });

  // Botón atrás del celular
  window.addEventListener('popstate', function () {
    if (!visor.hidden) { conHistorial = false; cerrar(true); }
  });

  // Teclado
  document.addEventListener('keydown', function (e) {
    if (visor.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); cerrar(false); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); mostrar(pos + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); mostrar(pos - 1); }
    else if (e.key === 'Tab') {
      // Mantener el foco dentro del visor
      var focos = [vCerrar, vPrev, vNext];
      var i = focos.indexOf(document.activeElement);
      e.preventDefault();
      focos[(i + (e.shiftKey ? -1 : 1) + focos.length) % focos.length].focus();
    }
  });

  // Deslizar con el dedo
  var x0 = null, y0 = null;
  var zona = visor.querySelector('.visor-centro');
  zona.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { x0 = null; return; }
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
  }, { passive: true });
  zona.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    var dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) mostrar(pos + (dx < 0 ? 1 : -1));
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) cerrar(false);
  }, { passive: true });
})();
