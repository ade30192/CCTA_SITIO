/* =====================================================
   CCTA - FUNCIONES COMUNES DEL SITIO
   1) App instalable: registra el service worker y maneja "Instalar la app"
   2) Estadísticas de visitas (GoatCounter), si están activadas en config.json.
      No cuenta las visitas del equipo (dispositivos que entraron al editor).
   ===================================================== */
(function () {
  'use strict';

  /* ---------- 1) App instalable ---------- */

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

  var instalable = null;
  var esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var yaInstalada = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    instalable = e;
    mostrarBotones();
  });

  window.addEventListener('appinstalled', function () {
    instalable = null;
    ocultarBotones();
  });

  function botones() { return document.querySelectorAll('[data-instalar]'); }
  function mostrarBotones() { botones().forEach(function (b) { b.hidden = false; }); }
  function ocultarBotones() { botones().forEach(function (b) { b.hidden = true; }); }

  function ayudaIOS() {
    var viejo = document.getElementById('ayuda-instalar');
    if (viejo) viejo.remove();
    var caja = document.createElement('div');
    caja.id = 'ayuda-instalar';
    caja.setAttribute('role', 'dialog');
    caja.setAttribute('aria-modal', 'true');
    caja.setAttribute('aria-label', 'Cómo instalar la app');
    caja.innerHTML =
      '<div class="ai-caja">' +
        '<img src="icon-192.png" alt="" width="64" height="64">' +
        '<h2>Instalá la app de la iglesia</h2>' +
        '<ol>' +
          '<li>Tocá el botón <b>Compartir</b> <span aria-hidden="true">⎙</span> del navegador.</li>' +
          '<li>Elegí <b>"Agregar a pantalla de inicio"</b>.</li>' +
          '<li>Tocá <b>Agregar</b>. ¡Listo! Queda el logo de la iglesia en tu celular.</li>' +
        '</ol>' +
        '<button type="button" class="btn btn-gold">Entendido</button>' +
      '</div>';
    caja.addEventListener('click', function (e) {
      if (e.target === caja || e.target.tagName === 'BUTTON') caja.remove();
    });
    document.body.appendChild(caja);
    caja.querySelector('button').focus();
  }

  function iniciarBotones() {
    if (yaInstalada) { ocultarBotones(); return; }
    if (instalable) mostrarBotones();
    botones().forEach(function (b) {
      // En iPhone/iPad no existe el aviso automático: se muestran instrucciones
      if (esIOS) b.hidden = false;
      b.addEventListener('click', function (e) {
        e.preventDefault();
        if (instalable) {
          instalable.prompt();
          instalable.userChoice.finally(function () { instalable = null; });
        } else {
          ayudaIOS();
        }
      });
    });
  }

  var estilo = document.createElement('style');
  estilo.textContent =
    '#ayuda-instalar{position:fixed;inset:0;z-index:10000;display:flex;align-items:flex-end;justify-content:center;padding:16px;background:rgba(7,15,35,.6)}' +
    '#ayuda-instalar .ai-caja{width:100%;max-width:420px;padding:26px 22px 22px;border-radius:20px;background:#fff;color:#12213d;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.35)}' +
    '#ayuda-instalar img{border-radius:16px;margin-bottom:10px}' +
    '#ayuda-instalar h2{margin:0 0 12px;color:#071d49;font-size:1.2rem}' +
    '#ayuda-instalar ol{margin:0 0 18px;padding-left:20px;text-align:left;line-height:1.8;font-size:.95rem}' +
    '#ayuda-instalar .btn{width:100%;margin:0}';
  document.head.appendChild(estilo);


  /* ---------- 2) Estadísticas de visitas ---------- */

  function esEquipo() {
    try { return !!localStorage.getItem('ccta-llave-anuncios'); } catch (e) { return false; }
  }

  function iniciarEstadisticas() {
    if (esEquipo() || location.protocol !== 'https:') return;
    fetch('config.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : {}; }).then(function (c) {
      var codigo = String(c && c.goatcounter || '').trim().toLowerCase();
      if (!/^[a-z0-9-]{2,40}$/.test(codigo)) return;
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://gc.zgo.at/count.js';
      s.setAttribute('data-goatcounter', 'https://' + codigo + '.goatcounter.com/count');
      document.head.appendChild(s);
    }).catch(function () {});
  }

  function iniciar() {
    iniciarBotones();
    iniciarEstadisticas();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
