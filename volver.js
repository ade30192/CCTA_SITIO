/* =====================================================
   BOTÓN "VOLVER" DE LAS PÁGINAS SECUNDARIAS
   Si el visitante llegó desde otra página del sitio, el botón
   lo regresa exactamente a donde estaba (como la flecha del
   navegador) y dice a dónde vuelve. Si entró directo, usa el
   enlace normal a la página principal.
   ===================================================== */
(function () {
  'use strict';

  var botones = document.querySelectorAll('.sub-top-btn');
  if (!botones.length) return;

  var ref = null;
  try { ref = document.referrer ? new URL(document.referrer) : null; } catch (e) {}
  if (!ref || ref.origin !== location.origin || ref.pathname === location.pathname || history.length < 2) return;

  var pagina = ref.pathname.split('/').pop() || 'index.html';
  var etiquetas = {
    'anuncios.html': '← Volver a anuncios',
    'subir.html': '← Volver al editor',
    'donar.html': '← Volver a donaciones',
    'preguntas.html': '← Volver a preguntas',
    'nosotros.html': '← Volver a nosotros',
    'reservar.html': '← Volver a reservación'
  };

  Array.prototype.forEach.call(botones, function (b) {
    if (etiquetas[pagina]) b.textContent = etiquetas[pagina];
    b.addEventListener('click', function (e) {
      e.preventDefault();
      history.back();
    });
  });
})();
