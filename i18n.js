/* =====================================================
   CCTA - IDIOMAS (Español · English · Français)
   - Se carga en el <head> de cada página pública.
   - El español es el idioma original del sitio: no se traduce nada.
   - En inglés o francés carga i18n-textos.js (todas las traducciones)
     y reemplaza los textos que coinciden exactamente con el español.
   - La elección se guarda en el dispositivo. También se puede abrir
     un enlace con ?lang=en o ?lang=fr.
   - Los anuncios se publican solo en español (a propósito).
   ===================================================== */
(function () {
  'use strict';

  var IDIOMAS = ['es', 'en', 'fr'];
  var CLAVE = 'ccta-idioma';

  function leerIdioma() {
    var url = '';
    try { url = (new URLSearchParams(location.search).get('lang') || '').toLowerCase(); } catch (e) {}
    if (IDIOMAS.indexOf(url) !== -1) {
      try { localStorage.setItem(CLAVE, url); } catch (e) {}
      return url;
    }
    var guardado = '';
    try { guardado = localStorage.getItem(CLAVE) || ''; } catch (e) {}
    return IDIOMAS.indexOf(guardado) !== -1 ? guardado : 'es';
  }

  var BASE = (document.currentScript && document.currentScript.src || '').replace(/[^/]*$/, '');
  var LANG = leerIdioma();
  var POS = { en: 0, fr: 1 }[LANG];
  window.CCTA_LANG = LANG;
  document.documentElement.lang = LANG;

  /* ---------- Formatos de fecha y hora por idioma ---------- */

  var FORMATOS = {
    es: {
      dias: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
      diasPlural: ['Domingos', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábados'],
      meses: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
      mesesCortos: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
      hora: function (h, m) {
        var h12 = h % 12 === 0 ? 12 : h % 12;
        return h12 + ':' + (m < 10 ? '0' + m : m) + ' ' + (h < 12 ? 'a. m.' : 'p. m.');
      },
      fecha: function (d) { return this.dias[d.getDay()] + ' ' + d.getDate() + ' de ' + this.meses[d.getMonth()]; },
      rango: function (a, b) {
        var mismo = a.getMonth() === b.getMonth();
        return 'Del ' + a.getDate() + (mismo ? '' : ' de ' + this.meses[a.getMonth()]) + ' al ' + b.getDate() + ' de ' + this.meses[b.getMonth()];
      }
    },
    en: {
      dias: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      diasPlural: ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'],
      meses: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      mesesCortos: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      hora: function (h, m) {
        var h12 = h % 12 === 0 ? 12 : h % 12;
        return h12 + ':' + (m < 10 ? '0' + m : m) + ' ' + (h < 12 ? 'AM' : 'PM');
      },
      fecha: function (d) { return this.dias[d.getDay()] + ', ' + this.meses[d.getMonth()] + ' ' + d.getDate(); },
      rango: function (a, b) {
        var mismo = a.getMonth() === b.getMonth();
        return this.meses[a.getMonth()] + ' ' + a.getDate() + '–' + (mismo ? '' : this.meses[b.getMonth()] + ' ') + b.getDate();
      }
    },
    fr: {
      dias: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
      diasPlural: ['Le dimanche', 'Le lundi', 'Le mardi', 'Le mercredi', 'Le jeudi', 'Le vendredi', 'Le samedi'],
      meses: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
      mesesCortos: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
      hora: function (h, m) { return h + ' h' + (m ? ' ' + (m < 10 ? '0' + m : m) : ''); },
      fecha: function (d) { return this.dias[d.getDay()] + ' ' + d.getDate() + ' ' + this.meses[d.getMonth()]; },
      rango: function (a, b) {
        var mismo = a.getMonth() === b.getMonth();
        return 'Du ' + a.getDate() + (mismo ? '' : ' ' + this.meses[a.getMonth()]) + ' au ' + b.getDate() + ' ' + this.meses[b.getMonth()];
      }
    }
  };

  window.cctaL = FORMATOS[LANG];

  /* ---------- Traducción de textos ---------- */

  function norm(t) { return String(t).replace(/\s+/g, ' ').trim(); }

  // T('Texto en español', {n: 3}) -> texto traducido (o el original si no hay traducción)
  window.cctaT = function (texto, vars) {
    var s = String(texto);
    if (LANG !== 'es' && window.CCTA_TEXTOS) {
      var par = window.CCTA_TEXTOS[norm(s)];
      if (par && par[POS]) s = par[POS];
    }
    if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return k in vars ? vars[k] : m; });
    return s;
  };

  if (LANG !== 'es') {
    // Se cargan las traducciones antes de que se dibuje la página (evita ver el español un instante)
    document.write('<script src="' + BASE + 'i18n-textos.js?v=1"><\/script>');
    document.documentElement.classList.add('i18n-cargando');
    setTimeout(function () { document.documentElement.classList.remove('i18n-cargando'); }, 2500);
  }

  var ATRIBUTOS = ['aria-label', 'alt', 'title', 'placeholder'];
  var SALTAR = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1 };

  function traducirNodo(raiz) {
    if (LANG === 'es' || !window.CCTA_TEXTOS) return;
    var D = window.CCTA_TEXTOS;

    var walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        while (p && p !== raiz.parentNode) {
          if (SALTAR[p.nodeName] || (p.hasAttribute && p.hasAttribute('data-sin-traducir'))) return NodeFilter.FILTER_REJECT;
          p = p.parentNode;
        }
        return /\S/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    var nodos = [];
    while (walker.nextNode()) nodos.push(walker.currentNode);
    nodos.forEach(function (n) {
      var par = D[norm(n.nodeValue)];
      if (!par || !par[POS]) return;
      var antes = /^\s/.test(n.nodeValue) ? ' ' : '';
      var despues = /\s$/.test(n.nodeValue) ? ' ' : '';
      n.nodeValue = antes + par[POS] + despues;
    });

    var conAtributos = raiz.querySelectorAll ? raiz.querySelectorAll('[aria-label],[alt],[title],[placeholder]') : [];
    Array.prototype.forEach.call(conAtributos, function (el) {
      if (el.closest('[data-sin-traducir]')) return;
      ATRIBUTOS.forEach(function (a) {
        var v = el.getAttribute(a);
        if (!v) return;
        var par = D[norm(v)];
        if (par && par[POS]) el.setAttribute(a, par[POS]);
      });
    });
  }

  window.cctaTraducir = traducirNodo;

  /* ---------- Botón de idioma ---------- */

  var ETIQUETAS = { es: 'Español', en: 'English', fr: 'Français' };

  function crearSelector() {
    var grupo = document.createElement('div');
    grupo.className = 'lang-switch';
    grupo.setAttribute('role', 'group');
    grupo.setAttribute('aria-label', 'Idioma · Language · Langue');
    grupo.setAttribute('data-sin-traducir', '');
    IDIOMAS.forEach(function (l) {
      var b = document.createElement('button');
      b.type = 'button';
      b.lang = l;
      b.textContent = l.toUpperCase();
      b.setAttribute('aria-label', ETIQUETAS[l]);
      b.title = ETIQUETAS[l];
      b.setAttribute('aria-pressed', String(l === LANG));
      b.addEventListener('click', function () {
        if (l === LANG) return;
        try { localStorage.setItem(CLAVE, l); } catch (e) {}
        // Se recarga la página en el nuevo idioma (sin ?lang= viejo, conservando la sección)
        var u = new URL(location.href);
        u.searchParams.delete('lang');
        if (l !== 'es') u.searchParams.set('lang', l);
        location.replace(u.toString());
      });
      grupo.appendChild(b);
    });
    return grupo;
  }

  function ponerSelector() {
    var barra = document.querySelector('.topbar-inner');
    if (barra) {
      barra.insertBefore(crearSelector(), barra.querySelector('.social'));
      return;
    }
    // Páginas sin barra superior: una franja delgada arriba con el selector
    var franja = document.createElement('div');
    franja.className = 'lang-bar';
    franja.setAttribute('role', 'region');
    franja.setAttribute('aria-label', 'Idioma · Language · Langue');
    var cont = document.createElement('div');
    cont.className = 'container lang-bar-inner';
    cont.appendChild(crearSelector());
    franja.appendChild(cont);
    var salto = document.querySelector('.skip-link');
    document.body.insertBefore(franja, salto ? salto.nextSibling : document.body.firstChild);
  }

  function aviso() {
    // En anuncios: avisar que los anuncios se publican en español
    if (LANG === 'es') return;
    var lista = document.getElementById('anuncios-lista');
    if (!lista || document.getElementById('aviso-idioma')) return;
    var p = document.createElement('p');
    p.id = 'aviso-idioma';
    p.className = 'aviso-idioma';
    p.textContent = LANG === 'en'
      ? 'Announcements are published in Spanish.'
      : 'Les annonces sont publiées en espagnol.';
    lista.parentNode.insertBefore(p, lista);
  }

  function iniciar() {
    try {
      if (LANG !== 'es') {
        traducirNodo(document.body);
        var t = window.CCTA_TEXTOS && window.CCTA_TEXTOS[norm(document.title)];
        if (t && t[POS]) document.title = t[POS];
        aviso();
      }
      ponerSelector();
    } catch (e) {}
    document.documentElement.classList.remove('i18n-cargando');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
