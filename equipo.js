/* =====================================================
   BOTÓN PRIVADO DEL EQUIPO: "SEGUIR EDITANDO"
   Solo aparece en los dispositivos que ya entraron al editor
   de anuncios (subir.html). Los visitantes nunca lo ven.
   - Es un círculo pequeño con ✎; al tocarlo lleva al editor.
   - La ✕ lo esconde mientras dure la visita.
   - En el editor (Ajustes) se puede apagar en ese dispositivo.
   ===================================================== */
(function () {
  'use strict';

  function leer(k, s) { try { return (s ? sessionStorage : localStorage).getItem(k) || ''; } catch (e) { return ''; } }

  if (!leer('ccta-llave-anuncios')) return;                 // no es del equipo
  if (leer('ccta-boton-equipo') === 'no') return;          // apagado en Ajustes
  if (leer('ccta-boton-oculto', true) === 'si') return;    // escondido en esta visita
  if (/subir\.html$/.test(location.pathname)) return;

  var estilo = document.createElement('style');
  estilo.textContent =
    '.equipo-editar{position:fixed;left:14px;bottom:max(14px,env(safe-area-inset-bottom));z-index:9000;display:flex;align-items:center;gap:4px;' +
      'font:800 .8rem/1 Manrope,Arial,sans-serif;opacity:.92}' +
    '.equipo-editar a{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:46px;height:46px;border-radius:999px;' +
      'background:#e5b957;color:#101f3b;text-decoration:none;box-shadow:0 8px 22px rgba(5,13,31,.32);overflow:hidden;white-space:nowrap;' +
      'transition:width .25s ease,padding .25s ease}' +
    '.equipo-editar a span{display:none}' +
    '.equipo-editar a b{font-size:1.1rem}' +
    '.equipo-editar:hover a,.equipo-editar a:focus-visible{width:auto;padding:0 16px}' +
    '.equipo-editar:hover a span,.equipo-editar a:focus-visible span{display:inline}' +
    '.equipo-editar button{width:26px;height:26px;border:0;border-radius:50%;background:rgba(7,29,73,.75);color:#fff;font:700 .75rem/1 Arial,sans-serif;cursor:pointer;opacity:0;transition:opacity .2s}' +
    '.equipo-editar:hover button,.equipo-editar button:focus-visible{opacity:1}' +
    '@media (hover:none){.equipo-editar button{opacity:1}}' +
    '@media print{.equipo-editar{display:none}}';
  document.head.appendChild(estilo);

  var caja = document.createElement('div');
  caja.className = 'equipo-editar';
  caja.innerHTML =
    '<a href="subir.html" title="Seguir editando (solo lo ve el equipo en este dispositivo)" aria-label="Seguir editando anuncios">' +
      '<b aria-hidden="true">✎</b><span>Seguir editando</span></a>' +
    '<button type="button" aria-label="Esconder el botón del equipo en esta visita" title="Esconder">✕</button>';
  caja.querySelector('button').addEventListener('click', function () {
    try { sessionStorage.setItem('ccta-boton-oculto', 'si'); } catch (e) {}
    caja.remove();
  });
  document.body.appendChild(caja);
})();
