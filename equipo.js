/* =====================================================
   BOTÓN PRIVADO DEL EQUIPO: "SEGUIR EDITANDO"
   Solo aparece en los dispositivos que ya entraron al editor
   de anuncios (subir.html). Los visitantes nunca lo ven.
   ===================================================== */
(function () {
  'use strict';

  var llave = '';
  try { llave = localStorage.getItem('ccta-llave-anuncios') || ''; } catch (e) {}
  if (!llave || /subir\.html$/.test(location.pathname)) return;

  var estilo = document.createElement('style');
  estilo.textContent =
    '.equipo-editar{position:fixed;left:16px;bottom:max(18px,env(safe-area-inset-bottom));z-index:9000;' +
    'display:inline-flex;align-items:center;gap:8px;padding:12px 18px;border-radius:999px;' +
    'background:#e5b957;color:#101f3b;font:800 .84rem/1 Manrope,Arial,sans-serif;text-decoration:none;' +
    'box-shadow:0 10px 26px rgba(5,13,31,.30);transition:transform .2s ease}' +
    '.equipo-editar:hover{transform:translateY(-2px)}' +
    '.equipo-editar span{font-size:1rem}' +
    '@media print{.equipo-editar{display:none}}';
  document.head.appendChild(estilo);

  var a = document.createElement('a');
  a.className = 'equipo-editar';
  a.href = 'subir.html';
  a.innerHTML = '<span aria-hidden="true">✎</span> Seguir editando';
  a.title = 'Solo lo ve el equipo en este dispositivo';
  document.body.appendChild(a);
})();
