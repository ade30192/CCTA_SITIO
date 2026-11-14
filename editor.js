/* =====================================================
   CCTA - EDITOR DE ANUNCIOS (subir.html)
   Pestañas: Nuevo anuncio · Publicados · Ajustes
   Herramientas: plantillas, atajos, versículos, afiche automático,
   girar/descargar imagen, texto para WhatsApp, borrador guardado,
   lista de revisión y asistente IA (Gemini o Claude).
   ===================================================== */

(function () {
  'use strict';

  // ⚙️ Si el sitio se muda a la cuenta de GitHub de la iglesia, cambiar estos dos valores:
  var USUARIO = 'ade30192';
  var REPO = 'CCTA_SITIO';
  var RAMA = 'main';
  var SITIO = 'https://ade30192.github.io/CCTA_SITIO/';

  var API = 'https://api.github.com/repos/' + USUARIO + '/' + REPO + '/contents/';
  var CLAVE = 'ccta-llave-anuncios';
  var CLAVE_IA = 'ccta-ia';
  var CLAVE_BORRADOR = 'ccta-borrador';
  var CAMPOS = ['titulo', 'fecha', 'hasta', 'hora', 'lugar', 'descripcion', 'detalle'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  var $ = function (id) { return document.getElementById(id); };

  var E = {
    imagenB64: '',        // imagen nueva (JPG base64) para subir
    imagenURL: '',        // lo que se muestra (data: o https:)
    imagenNombre: '',
    imagenGenerada: false,
    imagenRemota: '',     // ruta del afiche ya publicado (al editar)
    editando: null,
    tema: 'azul',
    fondo: '',            // foto de fondo del afiche automático (ruta del sitio o data:)
    fondoImg: null,
    ilustracion: '',
    formato: 1350,
    publicados: []
  };


  /* =====================================================
     UTILIDADES
     ===================================================== */

  function leer(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function guardar(k, v) { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); return true; } catch (e) { return false; } }

  function mensaje(id, tipo, texto) { var m = $(id); m.className = 'ed-msg ' + tipo; m.textContent = texto; }
  function limpiarMsg(id) { $(id).className = 'ed-msg'; $(id).textContent = ''; }

  var toastTimer = null;
  function toast(texto) {
    var t = $('toast');
    t.textContent = texto;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  function escapar(t) {
    return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  function iso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function hoyISO() { return iso(new Date()); }
  function deISO(t) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function proximoDia(dia) {
    var d = new Date(); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + ((dia - d.getDay() + 7) % 7));
    return d;
  }
  function fechaLarga(t) {
    var d = deISO(t);
    if (!d) return '';
    var s = DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()];
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function slug(t) {
    return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'anuncio';
  }

  function aBase64(texto) {
    var bytes = new TextEncoder().encode(texto), bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function deBase64(b64) {
    var bin = atob(b64.replace(/\s/g, '')), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function urlImagen(ruta) {
    return 'https://raw.githubusercontent.com/' + USUARIO + '/' + REPO + '/' + RAMA + '/' + ruta;
  }

  function copiar(texto) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(texto).catch(function () { return copiarViejo(texto); });
    }
    return copiarViejo(texto);
  }
  function copiarViejo(texto) {
    var t = document.createElement('textarea');
    t.value = texto; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); } catch (e) {}
    t.remove();
    return Promise.resolve();
  }


  /* =====================================================
     GITHUB
     ===================================================== */

  function gh(ruta, opciones) {
    opciones = opciones || {};
    opciones.headers = { 'Authorization': 'Bearer ' + leer(CLAVE), 'Accept': 'application/vnd.github+json' };
    return fetch(ruta.indexOf('http') === 0 ? ruta : API + ruta, opciones).then(function (r) {
      if (r.status === 401) throw new Error('La llave de GitHub no es válida o ya venció.');
      if (r.status === 403 || r.status === 404) throw new Error('La llave de GitHub no tiene permiso de escritura en el repositorio del sitio.');
      if (r.status === 409 || r.status === 422) throw new Error('Alguien más guardó un cambio al mismo tiempo. Probá de nuevo en un momento.');
      if (!r.ok) throw new Error('GitHub respondió con error ' + r.status + '.');
      return r.status === 204 ? null : r.json();
    }, function () {
      throw new Error('No hay conexión. Revisá el internet y probá de nuevo.');
    });
  }

  function leerAnuncios() {
    return gh('anuncios.json?ref=' + RAMA + '&t=' + Date.now()).then(function (r) {
      var datos = JSON.parse(deBase64(r.content));
      return { lista: Array.isArray(datos) ? datos : (datos.anuncios || []), sha: r.sha };
    });
  }

  function guardarAnuncios(lista, sha, nota) {
    var contenido = JSON.stringify({ anuncios: lista }, null, 2) + '\n';
    return gh('anuncios.json', { method: 'PUT', body: JSON.stringify({ message: nota, content: aBase64(contenido), sha: sha, branch: RAMA }) });
  }

  function borrarImagen(ruta, titulo) {
    return gh(ruta + '?ref=' + RAMA).then(function (f) {
      return gh(ruta, { method: 'DELETE', body: JSON.stringify({ message: 'Quitar afiche: ' + titulo, sha: f.sha, branch: RAMA }) });
    }).catch(function () {});
  }


  /* =====================================================
     VISTAS Y PESTAÑAS
     ===================================================== */

  function hayLlave() { return !!leer(CLAVE); }

  function mostrarVista(nombre) {
    if (!hayLlave()) nombre = 'login';
    ['login', 'nuevo', 'publicados', 'ajustes'].forEach(function (v) { $('vista-' + v).hidden = v !== nombre; });
    $('tabs').hidden = nombre === 'login';
    document.querySelectorAll('.ed-tab').forEach(function (t) {
      t.setAttribute('aria-selected', String(t.getAttribute('data-vista') === nombre));
    });
    barraInferior();
    if (nombre === 'publicados') cargarLista();
    if (nombre === 'ajustes') prepararAjustes();
    window.scrollTo(0, 0);
  }

  function modoNuevo(modo) {   // 'inicio' | 'taller' | 'listo'
    $('inicio').hidden = modo !== 'inicio';
    $('taller').hidden = modo !== 'taller';
    $('listo').hidden = modo !== 'listo';
    if (modo === 'inicio') revisarBorrador();
    barraInferior();
  }

  function barraInferior() {
    var on = !$('vista-nuevo').hidden && !$('taller').hidden;
    $('barra').classList.toggle('on', on);
  }

  document.querySelectorAll('.ed-tab').forEach(function (t) {
    t.addEventListener('click', function () { mostrarVista(t.getAttribute('data-vista')); });
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ir]');
    if (b) mostrarVista(b.getAttribute('data-ir'));
  });


  /* =====================================================
     ENTRADA Y SESIÓN
     ===================================================== */

  $('guardar-llave').addEventListener('click', function () {
    var v = $('llave').value.trim();
    if (!v) return mensaje('msg-acceso', 'err', 'Pegá la llave primero.');
    guardar(CLAVE, v);
    mensaje('msg-acceso', 'info', 'Verificando…');
    gh('anuncios.json?ref=' + RAMA).then(function () {
      return fetch('https://api.github.com/user', { headers: { 'Authorization': 'Bearer ' + v } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (u) { if (u && u.login) guardar(CLAVE + '-quien', u.login); })
        .catch(function () {});
    }).then(function () {
      limpiarMsg('msg-acceso');
      $('llave').value = '';
      iniciarSesion();
    }).catch(function (e) {
      guardar(CLAVE, '');
      mensaje('msg-acceso', 'err', e.message);
    });
  });

  $('salir').addEventListener('click', function () {
    if (!confirm('¿Cerrar sesión en este dispositivo? Vas a necesitar la llave para volver a entrar.')) return;
    guardar(CLAVE, ''); guardar(CLAVE + '-quien', '');
    mostrarVista('login');
  });

  function iniciarSesion() {
    var q = leer(CLAVE + '-quien');
    $('quien').textContent = q ? ' como ' + q : '';
    pintarIA();
    mostrarVista('nuevo');
    modoNuevo('inicio');
    contarPublicados();
  }

  function contarPublicados() {
    leerAnuncios().then(function (a) {
      E.publicados = a.lista;
      var vigentes = a.lista.filter(function (x) { return (x.hasta || x.fecha) >= hoyISO(); }).length;
      $('tab-cuenta').textContent = vigentes;
    }).catch(function () {});
  }


  /* =====================================================
     PANTALLA DE INICIO, PLANTILLAS Y BORRADOR
     ===================================================== */

  var PLANTILLAS = [
    { ico: '🙌', nombre: 'Culto congregacional', dia: 6, ilus: 'musica', titulo: 'Culto congregacional', hora: '7:00 p. m.', lugar: 'Nueva sede · Paquera',
      detalle: 'Nos reunimos como iglesia para adorar y compartir la fe. ¡Te esperamos!' },
    { ico: '📖', nombre: 'Culto dominical', dia: 0, ilus: 'biblia', titulo: 'Culto dominical', hora: '10:00 a. m.', lugar: 'Nueva sede · Paquera',
      detalle: 'Nos reunimos para compartir la Palabra, orar y fortalecer nuestra fe en comunidad.' },
    { ico: '🙏', nombre: 'Ayuno congregacional', dia: 2, ilus: 'cruz', titulo: 'Ayuno congregacional', hora: '9:30 a. m.', lugar: 'Iglesia C.C.T.A',
      descripcion: 'El pueblo que conoce a su Dios se esforzará y actuará. Daniel 11:32',
      detalle: 'Un tiempo para buscar a Dios juntos como congregación, en ayuno y oración. Te esperamos en la iglesia.' },
    { ico: '💛', nombre: 'Red adulto mayor', dia: 4, ilus: 'corazon', titulo: 'Red Adulto Mayor', hora: '11:00 a. m.', lugar: 'Nueva sede · Paquera',
      descripcion: 'Corona de honra es la vejez que se halla en el camino de justicia. Proverbios 16:31',
      detalle: 'Encuentro y compañerismo para nuestros adultos mayores. ¡Los esperamos con mucho cariño!' },
    { ico: '🔥', nombre: 'Red juvenil', dia: 5, ilus: 'llama', titulo: 'Red Juvenil', hora: '7:00 p. m.', lugar: 'Nueva sede · Paquera',
      detalle: 'Un tiempo para compartir, aprender y crecer juntos. ¡No te lo perdás y traé a un amigo!' },
    { ico: '🍞', nombre: 'Santa Cena', dia: null, ilus: 'copa', titulo: 'Santa Cena', hora: '7:00 p. m.', lugar: 'Iglesia C.C.T.A',
      descripcion: 'Haced esto en memoria de mí. Lucas 22:19',
      detalle: 'Nos reunimos como iglesia para participar juntos de la Santa Cena.' },
    { ico: '🌊', nombre: 'Bautismo', dia: null, ilus: 'olas', titulo: 'Bautismo', hora: '10:00 a. m.', lugar: 'Playa Margarita',
      descripcion: 'Bautizándolos en el nombre del Padre, y del Hijo, y del Espíritu Santo. Mateo 28:19',
      detalle: 'Celebramos juntos el bautismo en agua de quienes decidieron seguir a Jesús. Acompañanos para ser parte de este momento tan especial.' },
    { ico: '📢', nombre: 'Aviso importante', dia: null, ilus: '', titulo: 'Aviso importante', hora: '', lugar: '',
      detalle: '' }
  ];

  function pintarPlantillas() {
    var g = $('plantilla-grid');
    PLANTILLAS.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ed-plantilla';
      b.innerHTML = '<span class="ico" aria-hidden="true">' + p.ico + '</span><span><strong>' + escapar(p.nombre) + '</strong><small>' +
        (p.dia !== null ? 'Próximo ' + DIAS[p.dia] + (p.hora ? ' · ' + p.hora : '') : 'Elegí la fecha') + '</small></span>';
      b.addEventListener('click', function () {
        abrirTaller();
        $('titulo').value = p.titulo;
        $('fecha').value = p.dia !== null ? iso(proximoDia(p.dia)) : '';
        $('hora').value = p.hora || '';
        $('lugar').value = p.lugar || '';
        $('descripcion').value = p.descripcion || '';
        $('detalle').value = p.detalle || '';
        E.ilustracion = p.ilus || '';
        marcarIlustracion();
        alCambiar();
        toast('Plantilla "' + p.nombre + '" lista. Revisá y ajustá lo que haga falta.');
        if (!$('fecha').value) setTimeout(function () { $('fecha').focus(); }, 300);
      });
      g.appendChild(b);
    });
  }

  $('empezar-blanco').addEventListener('click', function () {
    abrirTaller();
    setTimeout(function () { $('titulo').focus(); }, 200);
  });
  $('empezar-ia').addEventListener('click', function () {
    abrirTaller();
    setTimeout(function () {
      $('sec-ia').scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (iaActiva()) $('ia-texto').focus({ preventScroll: true });
    }, 150);
  });
  $('empezar-plantilla').addEventListener('click', function () {
    $('plantillas').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('imagen-inicio').addEventListener('change', function () {
    var f = this.files[0];
    this.value = '';
    if (!f) return;
    abrirTaller();
    cargarArchivo(f, true);
  });

  $('volver-inicio').addEventListener('click', function () {
    if (hayContenido() && !confirm('¿Empezar otro anuncio? Lo que llevás queda guardado como borrador en este dispositivo.')) return;
    modoNuevo('inicio');
    window.scrollTo(0, 0);
  });

  function abrirTaller(conservar) {
    if (!conservar) reiniciar();
    mostrarVista('nuevo');
    modoNuevo('taller');
    window.scrollTo(0, 0);
  }

  function reiniciar() {
    CAMPOS.forEach(function (k) { $(k).value = ''; marcaIA(k, false); });
    $('varios-dias').checked = false;
    $('campo-hasta').hidden = true;
    $('ia-texto').value = '';
    $('ia-estado').className = 'ed-ia';
    E.imagenB64 = ''; E.imagenURL = ''; E.imagenNombre = ''; E.imagenGenerada = false; E.imagenRemota = '';
    E.editando = null;
    E.fondo = ''; E.fondoImg = null; E.ilustracion = '';
    pintarFondo(); marcarIlustracion();
    $('editando').hidden = true;
    limpiarMsg('msg-publicar');
    pintarAfiche();
    alCambiar(true);
  }

  // ----- Borrador guardado en el dispositivo -----

  var borradorTimer = null;
  function guardarBorrador() {
    clearTimeout(borradorTimer);
    borradorTimer = setTimeout(function () {
      if (!hayContenido()) { guardar(CLAVE_BORRADOR, ''); $('guardado').textContent = ''; return; }
      var b = {
        t: Date.now(),
        campos: {}, varios: $('varios-dias').checked, ia: $('ia-texto').value,
        img: E.imagenURL && E.imagenURL.indexOf('data:') === 0 && E.imagenURL.length < 2500000 ? E.imagenURL : '',
        imgNombre: E.imagenNombre, imgGenerada: E.imagenGenerada, imgRemota: E.imagenRemota,
        editando: E.editando, tema: E.tema, formato: E.formato,
        fondo: E.fondo && (E.fondo.indexOf('data:') !== 0 || E.fondo.length < 1500000) ? E.fondo : '',
        ilustracion: E.ilustracion
      };
      CAMPOS.forEach(function (k) { b.campos[k] = $(k).value; });
      var ok = guardar(CLAVE_BORRADOR, JSON.stringify(b));
      if (!ok && b.img) { b.img = ''; ok = guardar(CLAVE_BORRADOR, JSON.stringify(b)); }
      if (!ok && b.fondo) { b.fondo = ''; ok = guardar(CLAVE_BORRADOR, JSON.stringify(b)); }
      $('guardado').textContent = ok ? '✓ Guardado en este dispositivo' : '';
    }, 500);
  }

  function leerBorrador() {
    try { return JSON.parse(leer(CLAVE_BORRADOR)) || null; } catch (e) { return null; }
  }

  function revisarBorrador() {
    var b = leerBorrador();
    var aviso = $('aviso-borrador');
    if (!b || !b.campos) { aviso.hidden = true; return; }
    aviso.hidden = false;
    $('borrador-titulo').textContent = b.campos.titulo || (b.editando ? b.editando.titulo : 'sin título');
    var img = b.img || (b.imgRemota ? urlImagen(b.imgRemota) : '');
    $('borrador-img').hidden = !img;
    if (img) $('borrador-img').src = img;
  }

  $('borrador-seguir').addEventListener('click', function () {
    var b = leerBorrador();
    if (!b) return;
    abrirTaller();
    CAMPOS.forEach(function (k) { $(k).value = b.campos[k] || ''; });
    $('varios-dias').checked = !!b.varios;
    $('campo-hasta').hidden = !b.varios;
    $('ia-texto').value = b.ia || '';
    E.tema = b.tema || 'azul'; E.formato = b.formato || 1350;
    E.fondo = b.fondo || ''; E.fondoImg = null; E.ilustracion = b.ilustracion || '';
    pintarFondo(); marcarIlustracion();
    E.editando = b.editando || null;
    E.imagenRemota = b.imgRemota || '';
    E.imagenGenerada = !!b.imgGenerada;
    E.imagenNombre = b.imgNombre || '';
    if (b.img) { E.imagenURL = b.img; E.imagenB64 = b.img.split(',')[1]; }
    else if (E.imagenRemota) { E.imagenURL = urlImagen(E.imagenRemota); }
    if (E.editando) { $('editando').hidden = false; $('editando-titulo').textContent = E.editando.titulo; }
    pintarTemas();
    pintarAfiche();
    alCambiar(true);
    toast('Borrador recuperado');
  });

  $('borrador-borrar').addEventListener('click', function () {
    if (!confirm('¿Descartar el borrador?')) return;
    guardar(CLAVE_BORRADOR, '');
    revisarBorrador();
  });

  function hayContenido() {
    return CAMPOS.some(function (k) { return $(k).value.trim(); }) || !!E.imagenURL || !!$('ia-texto').value.trim();
  }


  /* =====================================================
     ATAJOS: FECHA, HORA Y LUGAR
     ===================================================== */

  function chip(cont, texto, accion) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'ed-chip-btn'; b.textContent = texto;
    b.addEventListener('click', accion);
    cont.appendChild(b);
  }

  function pintarAtajos() {
    var f = $('chips-fecha');
    var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    var manana = new Date(hoy); manana.setDate(hoy.getDate() + 1);
    chip(f, 'Hoy', function () { ponerFecha(iso(hoy)); });
    chip(f, 'Mañana', function () { ponerFecha(iso(manana)); });
    [[2, 'Martes'], [4, 'Jueves'], [5, 'Viernes'], [6, 'Sábado'], [0, 'Domingo']].forEach(function (d) {
      chip(f, d[1] + ' ' + proximoDia(d[0]).getDate(), function () { ponerFecha(iso(proximoDia(d[0]))); });
    });
    chip(f, '+1 semana', function () {
      var base = deISO($('fecha').value) || hoy;
      base.setDate(base.getDate() + 7);
      ponerFecha(iso(base));
    });

    var h = $('chips-hora');
    ['9:30 a. m.', '10:00 a. m.', '11:00 a. m.', '6:00 p. m.', '7:00 p. m.'].forEach(function (t) {
      chip(h, t, function () { $('hora').value = t; alCambiar(); marcaIA('hora', false); });
    });

    var l = $('chips-lugar');
    ['Nueva sede · Paquera', 'Antigua sede · Paquera', 'Iglesia C.C.T.A'].forEach(function (t) {
      chip(l, t, function () { $('lugar').value = t; alCambiar(); marcaIA('lugar', false); });
    });
  }

  function ponerFecha(v) {
    $('fecha').value = v;
    marcaIA('fecha', false);
    alCambiar();
  }

  $('varios-dias').addEventListener('change', function () {
    $('campo-hasta').hidden = !this.checked;
    if (!this.checked) $('hasta').value = '';
    alCambiar();
  });


  /* =====================================================
     AFICHE: SUBIR, GIRAR, DESCARGAR, QUITAR
     ===================================================== */

  function prepararImagen(fuente) {
    return new Promise(function (ok, mal) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onerror = function () { mal(new Error('No se pudo abrir la imagen.')); };
      img.onload = function () {
        var escala = Math.min(1, 1080 / img.width, 1920 / img.height);
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * escala);
        c.height = Math.round(img.height * escala);
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        try { ok(c.toDataURL('image/jpeg', 0.82)); } catch (e) { mal(new Error('No se pudo procesar la imagen.')); }
      };
      img.src = fuente;
    });
  }

  function leerArchivo(archivo) {
    return new Promise(function (ok, mal) {
      var r = new FileReader();
      r.onerror = function () { mal(new Error('No se pudo leer el archivo.')); };
      r.onload = function () { ok(r.result); };
      r.readAsDataURL(archivo);
    });
  }

  function ponerImagen(url, nombre, generada) {
    E.imagenURL = url;
    E.imagenB64 = url.split(',')[1];
    E.imagenNombre = nombre;
    E.imagenGenerada = !!generada;
    pintarAfiche();
    alCambiar();
  }

  function cargarArchivo(archivo, analizarDespues) {
    $('afiche-sub').textContent = 'Preparando la imagen…';
    leerArchivo(archivo).then(prepararImagen).then(function (url) {
      ponerImagen(url, archivo.name, false);
      if (analizarDespues && iaActiva()) analizar();
      else if (analizarDespues) toast('Afiche cargado. Llená los datos o activá la IA en Ajustes.');
    }).catch(function (e) {
      $('afiche-sub').textContent = e.message;
    });
  }

  ['imagen', 'imagen-cambiar'].forEach(function (id) {
    $(id).addEventListener('change', function () {
      var f = this.files[0];
      this.value = '';
      if (f) cargarArchivo(f, iaActiva() && !hayDatos());
    });
  });

  function hayDatos() { return !!($('titulo').value.trim() || $('fecha').value); }

  function pintarAfiche() {
    var hay = !!E.imagenURL;
    $('thumb').classList.toggle('lleno', hay);
    $('thumb-img').hidden = !hay;
    $('thumb-vacio').hidden = hay;
    if (hay) $('thumb-img').src = E.imagenURL;
    $('afiche-tools').hidden = !hay;
    $('afiche-nombre').textContent = hay
      ? (E.imagenGenerada ? 'Afiche creado con el diseño de la iglesia' : (E.imagenNombre || 'Afiche actual'))
      : 'Sin afiche todavía';
    $('afiche-sub').textContent = hay
      ? (E.imagenGenerada ? 'Si cambiás los datos, tocá "Crear afiche" otra vez.' : 'Podés girarlo, cambiarlo o descargarlo.')
      : 'Tocá el cuadro para subir una foto, o creá uno abajo.';
    $('crear-afiche').textContent = E.imagenGenerada ? '🎨 Volver a crear' : '🎨 Crear afiche';
  }

  // Si la imagen viene del sitio (al editar), se trae para poder girarla o descargarla
  function imagenLocal() {
    if (!E.imagenURL) return Promise.reject(new Error('No hay afiche.'));
    if (E.imagenURL.indexOf('data:') === 0) return Promise.resolve(E.imagenURL);
    return prepararImagen(E.imagenURL);
  }

  $('girar').addEventListener('click', function () {
    imagenLocal().then(function (url) {
      return new Promise(function (ok) {
        var img = new Image();
        img.onload = function () {
          var c = document.createElement('canvas');
          c.width = img.height; c.height = img.width;
          var ctx = c.getContext('2d');
          ctx.translate(c.width / 2, c.height / 2);
          ctx.rotate(Math.PI / 2);
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
          ok(c.toDataURL('image/jpeg', 0.86));
        };
        img.src = url;
      });
    }).then(function (url) {
      ponerImagen(url, E.imagenNombre || 'Afiche girado', E.imagenGenerada);
      toast('Afiche girado');
    }).catch(function (e) { toast(e.message); });
  });

  function descargar() {
    imagenLocal().then(function (url) {
      var a = document.createElement('a');
      a.href = url;
      a.download = 'afiche-' + slug($('titulo').value || 'anuncio') + '.jpg';
      document.body.appendChild(a); a.click(); a.remove();
      toast('Afiche descargado');
    }).catch(function (e) { toast(e.message); });
  }
  $('descargar').addEventListener('click', descargar);
  $('listo-descargar').addEventListener('click', descargar);

  $('quitar-afiche').addEventListener('click', function () {
    E.imagenURL = ''; E.imagenB64 = ''; E.imagenNombre = ''; E.imagenGenerada = false;
    pintarAfiche();
    alCambiar();
    toast('Afiche quitado');
  });


  /* =====================================================
     AFICHE AUTOMÁTICO (estilos y formatos)
     ===================================================== */

  var TEMAS = {
    azul:   { velo: '7,29,73', bg1: '#071d49', bg2: '#0d2e68', brillo: 'rgba(229,185,87,.32)', puntos: 'rgba(255,255,255,.06)', titulo: '#ffffff', acento: '#e5b957', suave: '#f5df9d', nombre: '#ffffff', panel: 'rgba(255,255,255,.08)', borde: 'rgba(229,185,87,.5)', caja: '#e5b957', cajaTxt: '#071d49', dato: '#ffffff', pie: 'rgba(255,255,255,.7)' },
    dorado: { velo: '214,170,72', bg1: '#e5b957', bg2: '#f5df9d', brillo: 'rgba(255,255,255,.45)', puntos: 'rgba(7,29,73,.07)', titulo: '#071d49', acento: '#071d49', suave: '#4a3a12', nombre: '#071d49', panel: 'rgba(255,255,255,.45)', borde: 'rgba(7,29,73,.25)', caja: '#071d49', cajaTxt: '#f5df9d', dato: '#071d49', pie: 'rgba(7,29,73,.7)' },
    claro:  { velo: '251,248,240', bg1: '#fbf8f0', bg2: '#ffffff', brillo: 'rgba(229,185,87,.28)', puntos: 'rgba(7,29,73,.05)', titulo: '#071d49', acento: '#c9962f', suave: '#8f6516', nombre: '#071d49', panel: 'rgba(7,29,73,.04)', borde: 'rgba(229,185,87,.6)', caja: '#071d49', cajaTxt: '#f5df9d', dato: '#071d49', pie: 'rgba(7,29,73,.6)' }
  };

  var logo = new Image();
  logo.src = 'logo-iglesia.jpg';

  // Ilustraciones de línea (24×24), mismo estilo de los íconos del sitio
  var ILUS = {
    paloma:  { nombre: 'Paloma', p: ['M16 7h.01', 'M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20', 'm20 7 2 .5-2 .5', 'M10 18v3', 'M14 17.75V21', 'M7 18a6 6 0 0 0 3.84-10.61'] },
    cruz:    { nombre: 'Cruz', p: ['M12 2v20', 'M6 8h12'] },
    biblia:  { nombre: 'Biblia', p: ['M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z', 'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'] },
    llama:   { nombre: 'Llama', p: ['M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z'] },
    olas:    { nombre: 'Olas', p: ['M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1', 'M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1', 'M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1'] },
    copa:    { nombre: 'Copa', p: ['M8 22h8', 'M7 10h10', 'M12 15v7', 'M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z'] },
    musica:  { nombre: 'Música', p: ['M9 18V5l12-2v13', 'M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M18 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'] },
    familia: { nombre: 'Familia', p: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'] },
    corazon: { nombre: 'Corazón', p: ['M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'] },
    estrella:{ nombre: 'Estrella', p: ['M12 2l2.9 6.9 7.1.6-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7L2 9.5l7.1-.6z'] }
  };

  function dibujarIlustracion(ctx, nombre, cx, cy, tam, color, fondoCirculo) {
    var il = ILUS[nombre];
    if (!il || !window.Path2D) return;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, tam * 0.62, 0, 7);
    ctx.fillStyle = fondoCirculo; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = color; ctx.globalAlpha = .35; ctx.stroke();
    ctx.globalAlpha = 1;
    var e = tam / 24;
    ctx.translate(cx - tam / 2, cy - tam / 2);
    ctx.scale(e, e);
    ctx.lineWidth = 1.5; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    il.p.forEach(function (d) { ctx.stroke(new Path2D(d)); });
    ctx.restore();
  }

  function dibujarFondo(ctx, img, W, H, rgb) {
    // Foto a todo el afiche (recortada como "cover") y velo del color del estilo para que el texto se lea
    var esc = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    var w = img.naturalWidth * esc, h = img.naturalHeight * esc;
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    var v = ctx.createLinearGradient(0, 0, 0, H);
    v.addColorStop(0, 'rgba(' + rgb + ',.42)');
    v.addColorStop(.32, 'rgba(' + rgb + ',.72)');
    v.addColorStop(.6, 'rgba(' + rgb + ',.9)');
    v.addColorStop(1, 'rgba(' + rgb + ',.96)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }

  function lineas(ctx, texto, ancho, max) {
    var palabras = String(texto).split(/\s+/), filas = [], fila = '';
    palabras.forEach(function (p) {
      var prueba = fila ? fila + ' ' + p : p;
      if (ctx.measureText(prueba).width > ancho && fila) { filas.push(fila); fila = p; }
      else fila = prueba;
    });
    if (fila) filas.push(fila);
    if (filas.length > max) {
      filas = filas.slice(0, max);
      filas[max - 1] = filas[max - 1].replace(/\s+\S*$/, '') + '…';
    }
    return filas;
  }

  function redondeado(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function dibujarAfiche(d, temaNombre, H) {
    var T = TEMAS[temaNombre] || TEMAS.azul;
    var W = 1080;
    var MES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    var DIA = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    var arriba = H === 1920 ? 140 : 0;   // historia: deja espacio para la barra de Instagram/WhatsApp

    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, T.bg1); g.addColorStop(1, T.bg2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (E.fondoImg && E.fondoImg.complete && E.fondoImg.naturalWidth) dibujarFondo(ctx, E.fondoImg, W, H, T.velo);
    var r = ctx.createRadialGradient(W * 0.88, H * 0.1, 0, W * 0.88, H * 0.1, 640);
    r.addColorStop(0, T.brillo); r.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = T.puntos;
    for (var px = 20; px < W; px += 36) for (var py = 20; py < H; py += 36) { ctx.beginPath(); ctx.arc(px, py, 2, 0, 7); ctx.fill(); }

    // Logo y nombre
    var ly = 140 + arriba;
    ctx.save();
    ctx.beginPath(); ctx.arc(140, ly, 64, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = T.acento; ctx.stroke();
    ctx.clip();
    if (logo.complete && logo.naturalWidth) ctx.drawImage(logo, 76, ly - 64, 128, 128);
    ctx.restore();
    ctx.fillStyle = T.nombre;
    ctx.font = '800 34px Manrope, Arial, sans-serif';
    ctx.fillText('Centro Cristiano', 232, ly - 12);
    ctx.fillStyle = T.suave;
    ctx.font = '600 30px Manrope, Arial, sans-serif';
    ctx.fillText('Tabernáculo de Adoración', 232, ly + 32);

    if (E.ilustracion) {
      var tamI = H === 1080 ? 150 : 190;
      dibujarIlustracion(ctx, E.ilustracion, W - 70 - tamI * 0.62, ly + (H === 1080 ? 40 : 90), tamI, T.acento, T.panel);
    }

    // Invitación y título
    var y = (H === 1080 ? 320 : H === 1920 ? 560 : 360);
    ctx.fillStyle = T.acento;
    ctx.font = 'italic 52px Georgia, serif';
    ctx.fillText('te invitamos', 76, y);
    y += 30;

    var maxFilas = H === 1080 ? 2 : 3;
    var tam = 118, filas;
    do {
      ctx.font = '800 ' + tam + 'px Manrope, Arial, sans-serif';
      filas = lineas(ctx, (d.titulo || 'Anuncio').toUpperCase(), W - 152, maxFilas + 1);
      tam -= 6;
    } while ((filas.length > maxFilas || filas.some(function (f) { return ctx.measureText(f).width > W - 152; })) && tam > 56);
    filas = filas.slice(0, maxFilas);
    ctx.fillStyle = T.titulo;
    filas.forEach(function (f) { y += tam + 8; ctx.fillText(f, 76, y); });

    y += 46;
    ctx.fillStyle = T.acento; ctx.fillRect(76, y, 140, 8);

    var panelY = H - 330 - (H === 1920 ? 200 : 0);
    if (d.descripcion) {
      y += 70;
      var caben = Math.min(H === 1920 ? 6 : 4, Math.floor((panelY - 40 - y) / 54) + 1);
      if (caben > 0) {
        ctx.fillStyle = T.suave;
        ctx.font = 'italic 38px Georgia, serif';
        lineas(ctx, d.descripcion, W - 152, caben).forEach(function (f, i) { ctx.fillText(f, 76, y + i * 54); });
      }
    }

    // Panel con fecha, hora y lugar
    redondeado(ctx, 56, panelY, W - 112, 250, 28);
    ctx.fillStyle = T.panel; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = T.borde; ctx.stroke();

    var fecha = deISO(d.fecha);
    if (fecha) {
      redondeado(ctx, 92, panelY + 36, 178, 178, 20);
      ctx.fillStyle = T.caja; ctx.fill();
      ctx.fillStyle = T.cajaTxt; ctx.textAlign = 'center';
      ctx.font = '800 92px Manrope, Arial, sans-serif';
      ctx.fillText(String(fecha.getDate()), 181, panelY + 140);
      ctx.font = '800 26px Manrope, Arial, sans-serif';
      ctx.fillText(MES[fecha.getMonth()].slice(0, 3), 181, panelY + 186);
      ctx.textAlign = 'left';
      ctx.fillStyle = T.dato;
      ctx.font = '800 40px Manrope, Arial, sans-serif';
      var linea = DIA[fecha.getDay()] + ' ' + fecha.getDate() + ' DE ' + MES[fecha.getMonth()];
      var hasta = deISO(d.hasta);
      if (hasta) linea = 'DEL ' + fecha.getDate() + ' AL ' + hasta.getDate() + ' DE ' + MES[hasta.getMonth()];
      ctx.fillText(lineas(ctx, linea, W - 400, 1)[0], 310, panelY + 92);
    }
    ctx.textAlign = 'left';
    ctx.font = '600 34px Manrope, Arial, sans-serif';
    var dy = panelY + 148;
    if (d.hora) { ctx.fillStyle = T.suave; ctx.fillText('Hora:', 310, dy); ctx.fillStyle = T.dato; ctx.fillText(d.hora, 410, dy); dy += 52; }
    if (d.lugar) { ctx.fillStyle = T.suave; ctx.fillText('Lugar:', 310, dy); ctx.fillStyle = T.dato; ctx.fillText(lineas(ctx, d.lugar, W - 460, 1)[0], 425, dy); }

    ctx.fillStyle = T.pie;
    ctx.font = 'italic 30px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('La iglesia para la familia', W / 2, H - 34 - (H === 1920 ? 160 : 0));
    ctx.textAlign = 'left';

    return c.toDataURL('image/jpeg', 0.88);
  }

  function pintarTemas() {
    document.querySelectorAll('.ed-tema').forEach(function (b) {
      var on = b.getAttribute('data-tema') === E.tema;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    });
    document.querySelectorAll('[data-formato]').forEach(function (b) {
      b.classList.toggle('on', Number(b.getAttribute('data-formato')) === E.formato);
    });
  }

  document.querySelectorAll('.ed-tema').forEach(function (b) {
    b.addEventListener('click', function () {
      E.tema = b.getAttribute('data-tema');
      pintarTemas();
      if (E.imagenGenerada) crearAfiche();
    });
  });
  document.querySelectorAll('[data-formato]').forEach(function (b) {
    b.addEventListener('click', function () {
      E.formato = Number(b.getAttribute('data-formato'));
      pintarTemas();
      if (E.imagenGenerada) crearAfiche();
    });
  });

  function crearAfiche() {
    var d = datos();
    if (!d.titulo || !d.fecha) {
      toast('Para crear el afiche escribí al menos el título y la fecha.');
      $(d.titulo ? 'fecha' : 'titulo').focus();
      return;
    }
    var listo = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.all([listo, cargarFondo()]).then(function () {
      ponerImagen(dibujarAfiche(d, E.tema, E.formato), 'Afiche automático', true);
      toast('Afiche creado');
    });
  }
  $('crear-afiche').addEventListener('click', crearAfiche);

  // ----- Fondo del afiche -----

  function cargarFondo() {
    if (!E.fondo) { E.fondoImg = null; return Promise.resolve(); }
    if (E.fondoImg && E.fondoImg.dataset.src === E.fondo && E.fondoImg.complete) return Promise.resolve();
    return new Promise(function (ok) {
      var img = new Image();
      img.dataset.src = E.fondo;
      img.onload = function () { E.fondoImg = img; ok(); };
      img.onerror = function () { E.fondoImg = null; toast('No se pudo cargar la imagen de fondo.'); ok(); };
      img.src = E.fondo;
    });
  }

  function ponerFondo(src, aviso) {
    E.fondo = src || '';
    E.fondoImg = null;
    pintarFondo();
    guardarBorrador();
    if (aviso) toast(aviso);
    if (datos().titulo && datos().fecha) crearAfiche();
  }

  function pintarFondo() {
    $('fondo-ninguno').classList.toggle('on', !E.fondo);
    $('fondo-elegido').hidden = !E.fondo;
    if (E.fondo) $('fondo-mini').src = E.fondo;
  }

  $('fondo-ninguno').addEventListener('click', function () { ponerFondo('', 'Fondo de color'); });
  $('fondo-quitar').addEventListener('click', function () { ponerFondo('', 'Fondo quitado'); });

  $('fondo-archivo').addEventListener('change', function () {
    var f = this.files[0];
    this.value = '';
    if (!f) return;
    leerArchivo(f).then(prepararImagen).then(function (url) { ponerFondo(url, 'Imagen de fondo lista'); })
      .catch(function (e) { toast(e.message); });
  });

  $('usar-fondo').addEventListener('click', function () {
    imagenLocal().then(function (url) {
      if (E.imagenGenerada) { toast('Ese afiche ya es automático. Subí una foto o imagen para usarla de fondo.'); return; }
      ponerFondo(url, 'Imagen usada como fondo del afiche');
      $('sec-afiche').querySelector('.ed-auto').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }).catch(function (e) { toast(e.message); });
  });

  var FOTOS = ['hero-1', 'hero-2', 'hero-3', 'culto-1', 'culto-2', 'culto-3', 'culto-4', 'culto-5', 'culto-6',
    'domingo-1', 'domingo-2', 'domingo-3', 'ayuno-1', 'ayuno-2', 'ayuno-3', 'jovenes-1', 'jovenes-2', 'jovenes-3',
    'adulto-mayor-1', 'adulto-mayor-2', 'adulto-mayor-3'];

  function abrirFotos() {
    var g = $('lista-fotos');
    if (!g.children.length) {
      FOTOS.forEach(function (n) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Usar foto ' + n.replace(/-/g, ' '));
        b.innerHTML = '<img src="fotos/mini/' + n + '.jpg" alt="" loading="lazy">';
        b.addEventListener('click', function () {
          cerrarFotos();
          ponerFondo('fotos/' + n + '.jpg', 'Foto de la iglesia elegida');
        });
        g.appendChild(b);
      });
    }
    $('modal-fotos').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function cerrarFotos() {
    $('modal-fotos').hidden = true;
    document.body.style.overflow = '';
  }
  $('fondo-fotos').addEventListener('click', abrirFotos);
  $('cerrar-fotos').addEventListener('click', cerrarFotos);
  $('modal-fotos').addEventListener('click', function (e) { if (e.target === this) cerrarFotos(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('modal-fotos').hidden) cerrarFotos(); });

  // ----- Ilustraciones -----

  function pintarIlustraciones() {
    var cont = $('ilustraciones');
    var lista = [['', 'Ninguna', null]].concat(Object.keys(ILUS).map(function (k) { return [k, ILUS[k].nombre, ILUS[k].p]; }));
    lista.forEach(function (it) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ed-ilu';
      b.setAttribute('role', 'radio');
      b.setAttribute('data-ilu', it[0]);
      b.title = it[1];
      b.setAttribute('aria-label', it[1]);
      b.innerHTML = it[2]
        ? '<svg viewBox="0 0 24 24" aria-hidden="true">' + it[2].map(function (d) { return '<path d="' + d + '"/>'; }).join('') + '</svg>'
        : '✕';
      b.addEventListener('click', function () {
        E.ilustracion = it[0];
        marcarIlustracion();
        guardarBorrador();
        if (E.imagenGenerada || (datos().titulo && datos().fecha)) crearAfiche();
      });
      cont.appendChild(b);
    });
    marcarIlustracion();
  }

  function marcarIlustracion() {
    document.querySelectorAll('.ed-ilu').forEach(function (b) {
      var on = b.getAttribute('data-ilu') === E.ilustracion;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    });
  }


  /* =====================================================
     VERSÍCULOS
     ===================================================== */

  var versiculos = null;

  function abrirVersiculos() {
    $('modal-versiculos').hidden = false;
    document.body.style.overflow = 'hidden';
    $('buscar-versiculo').value = '';
    if (versiculos) { pintarVersiculos(''); setTimeout(function () { $('buscar-versiculo').focus(); }, 50); return; }
    $('lista-versiculos').innerHTML = '<li style="padding:16px;color:var(--muted)">Cargando…</li>';
    fetch('versiculo.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (d) {
      versiculos = (d.versiculos || []).filter(function (v) { return v && v.texto && v.cita; });
      pintarVersiculos('');
      $('buscar-versiculo').focus();
    }).catch(function () {
      $('lista-versiculos').innerHTML = '<li style="padding:16px;color:var(--err)">No se pudieron cargar los versículos.</li>';
    });
  }

  function pintarVersiculos(q) {
    var ul = $('lista-versiculos');
    ul.innerHTML = '';
    var n = function (t) { return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
    var lista = versiculos.filter(function (v) { return !q || n(v.texto + ' ' + v.cita).indexOf(n(q)) >= 0; });
    if (!lista.length) { ul.innerHTML = '<li style="padding:16px;color:var(--muted)">No hay resultados.</li>'; return; }
    lista.forEach(function (v) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = '<b>' + escapar(v.cita) + '</b>' + escapar(v.texto);
      b.addEventListener('click', function () {
        $('descripcion').value = (v.texto + ' ' + v.cita).slice(0, 220);
        marcaIA('descripcion', false);
        cerrarVersiculos();
        alCambiar();
        toast('Versículo agregado');
      });
      li.appendChild(b);
      ul.appendChild(li);
    });
  }

  function cerrarVersiculos() {
    $('modal-versiculos').hidden = true;
    document.body.style.overflow = '';
  }

  $('abrir-versiculos').addEventListener('click', abrirVersiculos);
  $('cerrar-versiculos').addEventListener('click', cerrarVersiculos);
  $('modal-versiculos').addEventListener('click', function (e) { if (e.target === this) cerrarVersiculos(); });
  $('buscar-versiculo').addEventListener('input', function () { pintarVersiculos(this.value.trim()); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('modal-versiculos').hidden) cerrarVersiculos(); });


  /* =====================================================
     ASISTENTE IA
     ===================================================== */

  function configIA() {
    try { return JSON.parse(leer(CLAVE_IA)) || null; } catch (e) { return null; }
  }
  function iaActiva() { var c = configIA(); return !!(c && c.llave); }

  function pintarIA() {
    var c = configIA();
    var on = iaActiva();
    $('chip-ia').textContent = on ? '✓ Activo: ' + (c.proveedor === 'claude' ? 'Claude' : 'Gemini') : 'Sin configurar';
    $('chip-ia').className = 'ed-estado' + (on ? ' ok' : '');
    $('ia-off').hidden = on;
    $('ia-texto').disabled = !on;
    $('generar-borrador').disabled = !on;
    document.querySelectorAll('[data-mejorar]').forEach(function (b) { b.hidden = !on; });
  }

  function iaEstado(tipo, html) {
    var e = $('ia-estado');
    e.className = 'ed-ia show ' + tipo;
    e.innerHTML = html;
  }

  function contexto() {
    var hoy = new Date();
    return 'Hoy es ' + DIAS[hoy.getDay()] + ' ' + hoyISO() + '. ' +
      'Sos el asistente del equipo de tecnología del Centro Cristiano Tabernáculo de Adoración, iglesia evangélica en Paquera, Puntarenas, Costa Rica. ' +
      'Escribís en español de Costa Rica con voseo (ej. "acompañanos", "no te lo perdás").';
  }

  function instruccionesBorrador(pedido, conImagen) {
    return [
      contexto(),
      conImagen
        ? 'Te paso el afiche de una actividad. Leé TODO su texto' + (pedido ? ' y tené en cuenta las indicaciones del equipo que van al final' : '') + '.'
        : 'El equipo te describe con sus palabras una actividad que quiere anunciar (va al final). Armá el borrador del anuncio a partir de eso.',
      'Devolvé SOLO un objeto JSON, sin texto adicional, con estas claves:',
      '"titulo": nombre corto de la actividad (máx. 70 caracteres).',
      '"fecha": fecha de inicio AAAA-MM-DD. Si solo dice un día de la semana, la próxima vez que caiga ese día (puede ser hoy). Si dice día y mes sin año, el año más cercano hacia adelante. Si no hay fecha, null.',
      '"hasta": fecha final AAAA-MM-DD solo si dura varios días; si no, null.',
      '"hora": como "7:00 p. m." o "9:30 a. m."; si no aparece, null.',
      '"lugar": tal como aparece; si no aparece, null.',
      '"descripcion": el versículo o frase destacada con su cita (máx. 200 caracteres). Si el equipo pide un versículo por su cita, escribilo completo en Reina-Valera 1960. Si no hay, una frase corta e invitadora.',
      '"detalle": 1 a 3 oraciones cálidas que expliquen de qué se trata y a quién va dirigida. Usá SOLO información dada; no inventes nombres, precios ni requisitos.',
      '"dudas": lista corta de cosas que faltan o hay que revisar (ej. "No se indicó el lugar"). Lista vacía si todo está claro.',
      pedido ? '\nIndicaciones del equipo:\n"""' + pedido + '"""' : ''
    ].join('\n');
  }

  function extraerJSON(texto) {
    var t = String(texto || '').replace(/```json|```/g, '');
    var a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a < 0 || b < a) throw new Error('La IA no devolvió datos legibles.');
    return JSON.parse(t.slice(a, b + 1));
  }

  function esperar(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }

  // Pedido general a la IA. json: true devuelve un objeto; false, texto.
  function pedirIA(prompt, b64, json) {
    var c = configIA();
    if (!c || !c.llave) return Promise.reject(new Error('Activá el asistente IA en Ajustes.'));
    return c.proveedor === 'claude' ? pedirClaude(c.llave, prompt, b64, json) : pedirGemini(c.llave, prompt, b64, json);
  }

  function pedirGemini(llave, prompt, b64, json) {
    var modelos = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite'];
    var conf = { temperature: json ? 0.2 : 0.6 };
    if (json) conf.responseMimeType = 'application/json';
    var cuerpo = JSON.stringify({
      contents: [{ parts: [{ text: prompt }].concat(b64 ? [{ inline_data: { mime_type: 'image/jpeg', data: b64 } }] : []) }],
      generationConfig: conf
    });
    var ultimo = '';
    function intentar(i, vuelta) {
      if (i >= modelos.length) {
        throw new Error(ultimo === 'cupo'
          ? 'Se alcanzó el límite gratis de Gemini por ahora. Esperá un rato.'
          : 'Gemini está muy ocupado en este momento (no es problema de tu llave). Esperá un minuto y probá de nuevo.');
      }
      return fetch('https://generativelanguage.googleapis.com/v1beta/models/' + modelos[i] + ':generateContent', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': llave }, body: cuerpo
      }).then(function (r) {
        if (r.status === 400 || r.status === 401 || r.status === 403) throw new Error('La llave de Gemini no es válida.');
        if (r.status === 404) return intentar(i + 1, 0);
        if (r.status === 429) { ultimo = 'cupo'; return intentar(i + 1, 0); }
        if (r.status >= 500) { ultimo = 'ocupado'; return vuelta < 1 ? esperar(1500).then(function () { return intentar(i, 1); }) : intentar(i + 1, 0); }
        if (!r.ok) throw new Error('Gemini respondió con error ' + r.status + '.');
        return r.json().then(function (d) {
          var p = d && d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts;
          var t = p ? p.map(function (x) { return x.text || ''; }).join('') : '';
          return json ? extraerJSON(t) : t.trim();
        });
      }, function () {
        return vuelta < 1 ? esperar(1500).then(function () { return intentar(i, 1); })
                          : Promise.reject(new Error('No hay conexión con Gemini. Revisá el internet.'));
      });
    }
    return intentar(0, 0);
  }

  function pedirClaude(llave, prompt, b64, json) {
    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': llave, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({
        model: 'claude-haiku-5-5', max_tokens: 900,
        messages: [{ role: 'user', content: (b64 ? [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } }] : []).concat([{ type: 'text', text: prompt }]) }]
      })
    }).then(function (r) {
      if (r.status === 401 || r.status === 403) throw new Error('La llave de Claude no es válida.');
      if (r.status === 400) return r.json().then(function (d) {
        var m = d && d.error && d.error.message || '';
        throw new Error(/credit|balance/i.test(m) ? 'La cuenta de Claude no tiene saldo.' : 'Claude no pudo procesar el pedido.');
      });
      if (r.status === 429 || r.status >= 500) throw new Error('Claude está ocupado. Probá en un momento.');
      if (!r.ok) throw new Error('Claude respondió con error ' + r.status + '.');
      return r.json().then(function (d) {
        var t = (d.content || []).map(function (p) { return p.text || ''; }).join('');
        return json ? extraerJSON(t) : t.trim();
      });
    }, function () { throw new Error('No hay conexión con Claude. Revisá el internet.'); });
  }

  function marcaIA(k, si) {
    var c = document.querySelector('.ed-campo[data-campo="' + k + '"]');
    if (c) c.classList.toggle('ia', !!si);
  }

  function analizar() {
    var texto = $('ia-texto').value.trim();
    var b64 = E.imagenGenerada ? '' : E.imagenB64;
    if (!b64 && !texto) {
      iaEstado('sin', '<span>Subí un afiche arriba o escribí qué querés anunciar.</span>');
      return;
    }
    if (!iaActiva()) {
      iaEstado('sin', '<span>Activá el asistente IA para que arme el borrador.</span><button type="button" data-ir="ajustes">Ir a Ajustes</button>');
      return;
    }
    $('generar-borrador').disabled = true;
    iaEstado('trabajando', '<span class="ed-spin" aria-hidden="true"></span><span>' + (b64 ? 'Leyendo el afiche' + (texto ? ' y tus indicaciones' : '') : 'Armando el borrador') + '…</span>');
    pedirIA(instruccionesBorrador(texto, !!b64), b64, true).then(function (d) {
      aplicarIA(d || {});
      var dudas = Array.isArray(d.dudas) ? d.dudas.filter(Boolean).slice(0, 3) : [];
      iaEstado('listo', '<span>✨ ' + (dudas.length ? 'Revisá: ' + dudas.map(escapar).join(' · ') : 'Listo. Los campos con ✨ los llenó la IA; cambiá lo que quieras.') +
        '</span><button type="button" id="ia-otra">Otra versión</button>');
      $('ia-otra').onclick = analizar;
      toast('Borrador listo');
    }).catch(function (err) {
      iaEstado('error', '<span>' + escapar(err.message) + ' También podés llenar los datos a mano.</span><button type="button" id="ia-otra">Reintentar</button>');
      $('ia-otra').onclick = analizar;
    }).then(function () { $('generar-borrador').disabled = !iaActiva(); });
  }
  $('generar-borrador').addEventListener('click', analizar);

  function aplicarIA(d) {
    var fechaOk = function (v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : ''; };
    var txt = function (v, max) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; };
    var v = {
      titulo: txt(d.titulo, 90), fecha: fechaOk(d.fecha), hasta: fechaOk(d.hasta), hora: txt(d.hora, 30),
      lugar: txt(d.lugar, 80), descripcion: txt(d.descripcion, 220), detalle: txt(d.detalle, 900)
    };
    if (v.hasta && v.hasta <= v.fecha) v.hasta = '';
    CAMPOS.forEach(function (k) {
      if (!v[k]) { marcaIA(k, false); return; }
      $(k).value = v[k];
      marcaIA(k, true);
    });
    $('varios-dias').checked = !!v.hasta;
    $('campo-hasta').hidden = !v.hasta;
    alCambiar();
  }

  // Herramientas de redacción para la explicación
  document.querySelectorAll('[data-mejorar]').forEach(function (b) {
    b.addEventListener('click', function () {
      var actual = $('detalle').value.trim();
      var d = datos();
      if (!actual && !d.titulo) { toast('Escribí primero el título o una explicación.'); return; }
      var pedidos = {
        mejor: 'Mejorá la redacción de esta explicación para un anuncio de la iglesia: clara, cálida y sin errores. Mantené la misma información.',
        corto: 'Resumí esta explicación en 1 o 2 oraciones cortas, manteniendo lo esencial.',
        invitacion: 'Reescribí esta explicación para que suene más invitadora y alegre, motivando a la gente a asistir. Mantené la misma información.'
      };
      var prompt = contexto() + '\n' + pedidos[b.getAttribute('data-mejorar')] +
        ' No inventes datos nuevos. Devolvé SOLO el texto final, sin comillas ni explicaciones, máximo 600 caracteres.\n' +
        'Actividad: ' + (d.titulo || '') + (d.fecha ? ' · ' + fechaLarga(d.fecha) : '') + (d.hora ? ' · ' + d.hora : '') + (d.lugar ? ' · ' + d.lugar : '') + '\n' +
        'Explicación actual: """' + (actual || '(vacía, escribí una a partir de la actividad)') + '"""';
      var original = b.textContent;
      b.disabled = true; b.textContent = '⏳ Escribiendo…';
      pedirIA(prompt, '', false).then(function (t) {
        t = t.replace(/^["“]|["”]$/g, '').trim().slice(0, 900);
        if (!t) throw new Error('La IA no devolvió texto.');
        $('detalle').value = t;
        marcaIA('detalle', true);
        alCambiar();
        toast('Explicación actualizada');
      }).catch(function (e) { toast(e.message); })
        .then(function () { b.disabled = false; b.textContent = original; });
    });
  });


  /* =====================================================
     FORMULARIO, VISTA PREVIA Y REVISIÓN
     ===================================================== */

  function datos() {
    var d = { titulo: $('titulo').value.trim(), fecha: $('fecha').value };
    if ($('varios-dias').checked && $('hasta').value && $('hasta').value !== d.fecha) d.hasta = $('hasta').value;
    ['hora', 'lugar', 'descripcion', 'detalle'].forEach(function (k) {
      var v = $(k).value.trim();
      if (v) d[k] = v;
    });
    return d;
  }

  function errores(d) {
    var e = [];
    if (!d.titulo) e.push('Falta el título.');
    if (!d.fecha) e.push('Falta la fecha.');
    else if ((d.hasta || d.fecha) < hoyISO()) e.push('La fecha ya pasó.');
    if (d.hasta && d.hasta < d.fecha) e.push('"Hasta" es antes de la fecha.');
    return e;
  }

  var previaTimer = null;
  function alCambiar(sinGuardar) {
    $('cuenta-desc').textContent = $('descripcion').value.length + '/220';
    $('cuenta-det').textContent = $('detalle').value.length + '/900';
    clearTimeout(previaTimer);
    previaTimer = setTimeout(function () {
      var d = datos();
      var cont = $('preview');
      var tarjeta = d.titulo && d.fecha && window.CCTAAnuncios ? window.CCTAAnuncios.previsualizar(d, E.imagenURL) : null;
      cont.innerHTML = '';
      if (tarjeta) cont.appendChild(tarjeta);
      else cont.innerHTML = '<p class="ed-preview-vacio"><b aria-hidden="true">📱</b>Escribí el título y la fecha para ver cómo queda.</p>';

      $('mini-titulo').textContent = d.titulo || 'Título del anuncio';
      $('mini-fecha').textContent = d.fecha ? fechaLarga(d.fecha) + (d.hora ? ' · ' + d.hora : '') : 'Fecha';
      $('mini-img').innerHTML = E.imagenURL ? '<img src="' + escapar(E.imagenURL) + '" alt="">' : '📣';

      pintarRevision(d);
    }, 120);
    if (!sinGuardar) guardarBorrador();
  }

  function pintarRevision(d) {
    var ul = $('checklist');
    var filas = [];
    filas.push([d.titulo ? 'ok' : 'falta', 'Título', d.titulo ? '' : 'Obligatorio']);
    var fechaMal = d.fecha && (d.hasta || d.fecha) < hoyISO();
    filas.push([d.fecha && !fechaMal ? 'ok' : 'falta', 'Fecha', !d.fecha ? 'Obligatoria' : fechaMal ? 'Ya pasó' : fechaLarga(d.fecha)]);
    filas.push([E.imagenURL ? 'ok' : 'sug', 'Afiche', E.imagenURL ? '' : 'Recomendado: subí uno o creá uno automático']);
    filas.push([d.hora ? 'ok' : 'sug', 'Hora', d.hora || 'Recomendada']);
    filas.push([d.lugar ? 'ok' : 'sug', 'Lugar', d.lugar || 'Recomendado']);
    filas.push([d.detalle ? 'ok' : 'sug', 'Explicación', d.detalle ? '' : 'Recomendada']);
    ul.innerHTML = '';
    filas.forEach(function (f) {
      var li = document.createElement('li');
      li.className = f[0];
      li.innerHTML = escapar(f[1]) + (f[2] ? '<small>' + escapar(f[2]) + '</small>' : '');
      ul.appendChild(li);
    });
    var ok = !errores(d).length;
    $('publicar').disabled = !ok;
  }

  CAMPOS.forEach(function (k) {
    $(k).addEventListener('input', function () { marcaIA(k, false); alCambiar(); });
  });
  $('ia-texto').addEventListener('input', function () { guardarBorrador(); });


  /* =====================================================
     WHATSAPP
     ===================================================== */

  function textoWhatsApp(d) {
    var l = ['📢 *' + d.titulo + '*'];
    if (d.fecha) {
      var f = d.hasta ? 'Del ' + fechaLarga(d.fecha).toLowerCase() + ' al ' + fechaLarga(d.hasta).toLowerCase() : fechaLarga(d.fecha);
      l.push('📅 ' + f + (d.hora ? ' · ' + d.hora : ''));
    } else if (d.hora) l.push('🕒 ' + d.hora);
    if (d.lugar) l.push('📍 ' + d.lugar);
    if (d.descripcion) { l.push(''); l.push('_' + d.descripcion + '_'); }
    if (d.detalle) { l.push(''); l.push(d.detalle); }
    l.push(''); l.push('Más información: ' + SITIO + 'anuncios.html');
    return l.join('\n');
  }

  var ultimoPublicado = null;
  function copiarWA(d) {
    if (!d || !d.titulo) { toast('Escribí al menos el título.'); return; }
    copiar(textoWhatsApp(d)).then(function () { toast('✓ Texto copiado. Pegalo en WhatsApp.'); });
  }
  $('copiar-wa').addEventListener('click', function () { copiarWA(datos()); });
  $('listo-wa').addEventListener('click', function () { copiarWA(ultimoPublicado); });


  /* =====================================================
     PUBLICAR
     ===================================================== */

  function mismo(a, b) {
    return a.titulo === b.titulo && a.fecha === b.fecha && (a.imagen || '') === (b.imagen || '');
  }

  $('publicar').addEventListener('click', publicar);

  function publicar() {
    var nuevo = datos();
    var e = errores(nuevo);
    if (e.length) { mensaje('msg-publicar', 'err', e.join(' ')); return; }

    var boton = $('publicar');
    var anterior = E.editando;
    boton.disabled = true;
    $('barra-publicar').disabled = true;

    var paso = Promise.resolve();
    var nuevaImagen = E.imagenURL && E.imagenURL.indexOf('data:') === 0;
    if (nuevaImagen) {
      var ruta = 'anuncios/' + nuevo.fecha + '_' + slug(nuevo.titulo) + '-' + Date.now().toString(36) + '.jpg';
      mensaje('msg-publicar', 'info', '⏳ Subiendo el afiche…');
      paso = gh(ruta, { method: 'PUT', body: JSON.stringify({ message: 'Afiche: ' + nuevo.titulo, content: E.imagenB64, branch: RAMA }) })
        .then(function () { nuevo.imagen = ruta; });
    } else if (E.imagenURL && E.imagenRemota) {
      nuevo.imagen = E.imagenRemota;
    }

    var mostrarImg = E.imagenURL;
    paso.then(function () {
      mensaje('msg-publicar', 'info', '⏳ Guardando el anuncio…');
      return leerAnuncios();
    }).then(function (actual) {
      var hoy = hoyISO();
      var lista = actual.lista.filter(function (a) {
        if ((a.hasta || a.fecha) < hoy) return false;
        if (anterior && mismo(a, anterior)) return false;
        return true;
      });
      lista.push(nuevo);
      lista.sort(function (a, b) { return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0; });
      return guardarAnuncios(lista, actual.sha, (anterior ? 'Editar anuncio: ' : 'Anuncio: ') + nuevo.titulo);
    }).then(function () {
      if (anterior && anterior.imagen && nuevo.imagen !== anterior.imagen) return borrarImagen(anterior.imagen, anterior.titulo);
    }).then(function () {
      ultimoPublicado = nuevo;
      $('listo-titulo').textContent = anterior ? '¡Cambios guardados!' : '¡Anuncio publicado!';
      $('listo-descargar').hidden = !mostrarImg;
      guardar(CLAVE_BORRADOR, '');
      limpiarMsg('msg-publicar');
      modoNuevo('listo');
      window.scrollTo(0, 0);
      contarPublicados();
      // Se conserva la imagen para poder descargarla desde la pantalla de listo
      E.editando = null;
    }).catch(function (err) {
      mensaje('msg-publicar', 'err', '❌ ' + err.message);
    }).then(function () {
      $('barra-publicar').disabled = false;
      pintarRevision(datos());
    });
  }

  $('otro').addEventListener('click', function () {
    reiniciar();
    modoNuevo('inicio');
    window.scrollTo(0, 0);
  });

  // Barra inferior (celular)
  $('barra-previa').addEventListener('click', function () {
    $('sec-previa').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('barra-publicar').addEventListener('click', function () {
    $('sec-publicar').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });


  /* =====================================================
     PUBLICADOS: EDITAR, DUPLICAR, QUITAR
     ===================================================== */

  function cargarLista() {
    var g = $('lista');
    limpiarMsg('msg-lista');
    g.innerHTML = '<div class="ed-empty"><b aria-hidden="true">⏳</b>Cargando…</div>';
    leerAnuncios().then(function (actual) {
      E.publicados = actual.lista;
      g.innerHTML = '';
      var hoy = hoyISO();
      var vigentes = actual.lista.filter(function (a) { return (a.hasta || a.fecha) >= hoy; }).length;
      $('tab-cuenta').textContent = vigentes;
      if (!actual.lista.length) {
        g.innerHTML = '<div class="ed-empty"><b aria-hidden="true">📭</b>No hay anuncios publicados.<br><button class="ed-btn gold" type="button" data-ir="nuevo" style="margin-top:14px">✚ Crear el primero</button></div>';
        return;
      }
      actual.lista.forEach(function (a) {
        var fin = a.hasta || a.fecha;
        var estado = fin < hoy ? ['vencido', 'Ya pasó'] : (a.fecha <= hoy ? ['hoy', 'Hoy'] : ['', 'Publicado']);
        var card = document.createElement('article');
        card.className = 'ed-pub' + (estado[0] === 'vencido' ? ' pasado' : '');
        card.innerHTML =
          '<div class="ed-pub-img">' + (a.imagen ? '<img src="' + escapar(urlImagen(a.imagen)) + '" alt="" loading="lazy">' : '📣') +
          '<span class="ed-pub-estado ' + estado[0] + '">' + estado[1] + '</span></div>' +
          '<div class="ed-pub-body"><strong>' + escapar(a.titulo) + '</strong><small>' + escapar(fechaLarga(a.fecha) + (a.hora ? ' · ' + a.hora : '')) + '</small></div>' +
          '<div class="ed-pub-acc"></div>';
        var acc = card.querySelector('.ed-pub-acc');
        if (estado[0] !== 'vencido') boton(acc, '✎ Editar', 'soft', function () { editar(a); });
        boton(acc, '⧉ Duplicar', 'line', function () { duplicar(a); });
        boton(acc, '🗑', 'del', function (b) { quitar(a, b); }, 'Quitar ' + a.titulo);
        g.appendChild(card);
      });
    }).catch(function (e) {
      g.innerHTML = '';
      mensaje('msg-lista', 'err', e.message);
    });
  }

  function boton(cont, texto, clase, accion, etiqueta) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'ed-btn small ' + clase; b.textContent = texto;
    if (etiqueta) b.setAttribute('aria-label', etiqueta);
    if (clase === 'del') b.style.flex = '0 0 46px';
    b.addEventListener('click', function () { accion(b); });
    cont.appendChild(b);
  }

  function llenarDesde(a) {
    CAMPOS.forEach(function (k) { $(k).value = a[k] || ''; });
    $('varios-dias').checked = !!a.hasta;
    $('campo-hasta').hidden = !a.hasta;
  }

  function editar(a) {
    abrirTaller();
    E.editando = a;
    llenarDesde(a);
    if (a.imagen) { E.imagenRemota = a.imagen; E.imagenURL = urlImagen(a.imagen); E.imagenNombre = 'Afiche publicado'; }
    $('editando').hidden = false;
    $('editando-titulo').textContent = a.titulo;
    pintarAfiche();
    alCambiar();
    toast('Editando "' + a.titulo + '"');
  }

  function duplicar(a) {
    abrirTaller();
    llenarDesde(a);
    $('fecha').value = '';
    $('hasta').value = '';
    if (a.imagen) {
      prepararImagen(urlImagen(a.imagen)).then(function (url) { ponerImagen(url, 'Copia del afiche', false); })
        .catch(function () { toast('No se pudo copiar el afiche; podés subir otro.'); });
    }
    alCambiar();
    toast('Copia lista: elegí la nueva fecha');
    setTimeout(function () { $('fecha').focus(); }, 300);
  }

  function quitar(a, b) {
    if (!confirm('¿Quitar "' + a.titulo + '" del sitio?')) return;
    b.disabled = true;
    leerAnuncios().then(function (actual) {
      return guardarAnuncios(actual.lista.filter(function (x) { return !mismo(x, a); }), actual.sha, 'Quitar anuncio: ' + a.titulo);
    }).then(function () {
      if (a.imagen) return borrarImagen(a.imagen, a.titulo);
    }).then(function () {
      toast('Anuncio quitado');
      cargarLista();
    }).catch(function (e) {
      b.disabled = false;
      mensaje('msg-lista', 'err', e.message);
    });
  }

  $('recargar').addEventListener('click', cargarLista);


  /* =====================================================
     AJUSTES: ASISTENTE IA
     ===================================================== */

  function prepararAjustes() {
    var c = configIA() || { proveedor: 'gemini', llave: '' };
    $('ia-proveedor').value = c.proveedor || 'gemini';
    $('ia-llave').value = '';
    $('ia-llave').placeholder = c.llave ? 'Llave guardada (pegá otra para cambiarla)' : 'Pegá aquí la llave';
    ayudaIA();
    limpiarMsg('msg-ia');
    pintarIA();
  }

  function ayudaIA() {
    var claude = $('ia-proveedor').value === 'claude';
    $('ayuda-claude').hidden = !claude;
    $('ayuda-gemini').hidden = claude;
  }
  $('ia-proveedor').addEventListener('change', ayudaIA);

  $('guardar-ia').addEventListener('click', function () {
    var anterior = configIA() || {};
    var proveedor = $('ia-proveedor').value;
    var llave = $('ia-llave').value.trim() || (anterior.proveedor === proveedor ? anterior.llave : '');
    if (!llave) return mensaje('msg-ia', 'err', 'Pegá la llave del servicio.');
    guardar(CLAVE_IA, JSON.stringify({ proveedor: proveedor, llave: llave }));
    $('ia-llave').value = '';
    pintarIA();
    mensaje('msg-ia', 'ok', '✓ Guardado. Ya podés usar la IA en Nuevo anuncio.');
  });

  $('quitar-ia').addEventListener('click', function () {
    guardar(CLAVE_IA, '');
    pintarIA();
    mensaje('msg-ia', 'info', 'Asistente IA desactivado en este dispositivo.');
  });


  /* =====================================================
     ARRANQUE
     ===================================================== */

  pintarPlantillas();
  pintarIlustraciones();
  pintarFondo();
  pintarAtajos();
  pintarTemas();
  pintarIA();
  if (hayLlave()) iniciarSesion();
  else mostrarVista('login');

  // Aviso si se intenta cerrar la página publicando
  window.addEventListener('beforeunload', function (e) {
    if ($('publicar').disabled && /Subiendo|Guardando/.test($('msg-publicar').textContent)) { e.preventDefault(); e.returnValue = ''; }
  });
})();
