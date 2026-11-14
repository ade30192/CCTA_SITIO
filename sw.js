/* =====================================================
   CCTA - SERVICE WORKER (app instalable)
   - Páginas y datos (HTML/JSON): primero internet, si no hay, lo guardado.
   - Estilos, scripts e imágenes: lo guardado al instante y se actualiza por detrás.
   - Solo actúa sobre archivos del propio sitio; GitHub, Google, etc. pasan directo.
   ===================================================== */

var VERSION = 'ccta-v1';
var BASICOS = [
  './', 'index.html', 'anuncios.html', 'donar.html', 'preguntas.html', 'nosotros.html', 'reservar.html', '404.html',
  'logo-iglesia.jpg', 'icon-192.png', 'favicon-32.png', 'anuncios.json', 'versiculo.json'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return Promise.all(BASICOS.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (claves) {
    return Promise.all(claves.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function guardar(req, res) {
  if (res && res.ok && res.type === 'basic') {
    var copia = res.clone();
    caches.open(VERSION).then(function (c) { c.put(req, copia); });
  }
  return res;
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (/subir\.html$/.test(url.pathname)) return;   // el editor siempre va directo a internet

  var esPagina = req.mode === 'navigate' || /\.(html|json)$/.test(url.pathname) || url.pathname.endsWith('/');

  if (esPagina) {
    e.respondWith(
      fetch(req).then(function (res) { return guardar(req, res); }).catch(function () {
        return caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then(function (r) {
          return r || caches.match('index.html');
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (enCache) {
      var red = fetch(req).then(function (res) { return guardar(req, res); }).catch(function () { return enCache; });
      return enCache || red;
    })
  );
});
