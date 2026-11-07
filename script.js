/* =====================================================
   CCTA - FUNCIONES PRINCIPALES
   ===================================================== */


/* =====================================================
   1. MENÚ DE NAVEGACIÓN
   ===================================================== */

const menuButton = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('#main-nav');

function closeMenu() {

  if (!menuButton || !mainNav) return;

  mainNav.classList.remove('open');

  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Abrir menú');

  document.querySelectorAll('.has-sub.open').forEach(item => {
    item.classList.remove('open');
  });

}

if (menuButton && mainNav) {

  menuButton.addEventListener('click', () => {

    const isOpen = mainNav.classList.toggle('open');

    menuButton.setAttribute(
      'aria-expanded',
      String(isOpen)
    );

    menuButton.setAttribute(
      'aria-label',
      isOpen ? 'Cerrar menú' : 'Abrir menú'
    );

  });


  mainNav.querySelectorAll('a').forEach(link => {

    link.addEventListener('click', event => {

      const parent = link.closest('.has-sub');

      const isMobile = window.matchMedia(
        '(max-width: 760px)'
      ).matches;

      if (
        parent &&
        link.classList.contains('sub-toggle') &&
        isMobile
      ) {

        event.preventDefault();

        parent.classList.toggle('open');

        return;

      }

      closeMenu();

    });

  });


  document.addEventListener('keydown', event => {

    if (event.key === 'Escape') {
      closeMenu();
    }

  });


  window.addEventListener('resize', () => {

    if (!window.matchMedia('(max-width: 760px)').matches) {
      closeMenu();
    }

  });

}


/* =====================================================
   2. CARRUSEL AUTOMÁTICO
   SIN BOTÓN DE PAUSA
   ===================================================== */

const slides = Array.from(
  document.querySelectorAll('.slide')
);

const dots = Array.from(
  document.querySelectorAll('.dot')
);

const reducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
);

let currentSlide = 0;
let carouselTimer = null;


function showSlide(index) {

  if (!slides.length) return;

  currentSlide = (
    index + slides.length
  ) % slides.length;


  slides.forEach((slide, i) => {

    const active = i === currentSlide;

    slide.classList.toggle('active', active);

    slide.setAttribute(
      'aria-hidden',
      String(!active)
    );

  });


  dots.forEach((dot, i) => {

    const active = i === currentSlide;

    dot.classList.toggle('active', active);

    dot.setAttribute(
      'aria-pressed',
      String(active)
    );

  });

}


function stopCarousel() {

  if (carouselTimer !== null) {
    window.clearInterval(carouselTimer);
  }

  carouselTimer = null;

}


function startCarousel() {

  stopCarousel();

  if (
    slides.length <= 1 ||
    document.hidden ||
    reducedMotion.matches
  ) {
    return;
  }

  carouselTimer = window.setInterval(() => {

    showSlide(currentSlide + 1);

  }, 6500);

}


// Botón anterior

document.querySelector('.prev')?.addEventListener('click', () => {

  showSlide(currentSlide - 1);

  startCarousel();

});


// Botón siguiente

document.querySelector('.next')?.addEventListener('click', () => {

  showSlide(currentSlide + 1);

  startCarousel();

});


// Indicadores inferiores

dots.forEach((dot, index) => {

  dot.addEventListener('click', () => {

    showSlide(index);

    startCarousel();

  });

});


// Control de visibilidad de la pestaña

document.addEventListener('visibilitychange', () => {

  if (document.hidden) {

    stopCarousel();

  } else {

    startCarousel();

  }

});


// Respeto por las preferencias de movimiento

reducedMotion.addEventListener?.('change', () => {

  startCarousel();

});


// Pausar mientras se usa el carrusel con mouse o teclado

const heroSection = document.querySelector('.hero');

heroSection?.addEventListener('mouseenter', stopCarousel);
heroSection?.addEventListener('mouseleave', startCarousel);
heroSection?.addEventListener('focusin', stopCarousel);
heroSection?.addEventListener('focusout', startCarousel);


// Inicialización

if (slides.length) {

  showSlide(0);

  startCarousel();

}


/* =====================================================
   3. AÑO AUTOMÁTICO
   ===================================================== */

const yearElement = document.querySelector('#year');

if (yearElement) {

  yearElement.textContent = new Date().getFullYear();

}


/* =====================================================
   4. GALERÍAS DE FOTOGRAFÍAS
   ===================================================== */

document.querySelectorAll('.event-toggle').forEach(button => {

  button.addEventListener('click', () => {

    const panelId = button.getAttribute('aria-controls');

    const panel = document.getElementById(panelId);

    if (!panel) return;

    const expanded =
      button.getAttribute('aria-expanded') === 'true';

    const nextExpanded = !expanded;

    button.setAttribute(
      'aria-expanded',
      String(nextExpanded)
    );

    panel.classList.toggle(
      'open',
      nextExpanded
    );


    const label = button.querySelector('.event-more');

    if (label) {

      const icon = label.querySelector('i');

      if (icon) {

        icon.textContent = nextExpanded ? '−' : '+';

      }

      label.firstChild.textContent = nextExpanded
        ? 'Ocultar fotos '
        : 'Ver fotos ';

    }

  });

});


/* =====================================================
   5. FOTOGRAFÍAS NO DISPONIBLES
   ===================================================== */

// Si una reunión todavía no tiene fotos, muestra un mensaje
// en lugar de cuadros vacíos

function updatePhotoNote(gallery) {

  if (!gallery) return;

  const figures = Array.from(
    gallery.querySelectorAll('.event-photo')
  );

  const allEmpty = figures.every(
    figure => figure.classList.contains('is-empty')
  );

  gallery.classList.toggle('all-empty', allEmpty);

  if (allEmpty && !gallery.querySelector('.event-photos-note')) {

    const note = document.createElement('p');

    note.className = 'event-photos-note';

    note.textContent =
      'Pronto compartiremos fotos de esta reunión.';

    gallery.appendChild(note);

  }

}


document.querySelectorAll('.event-photo img').forEach(image => {

  function showPlaceholder() {

    const figure = image.parentElement;

    if (!figure) return;

    image.remove();

    figure.classList.add('is-empty');

    updatePhotoNote(figure.closest('.event-photos'));

  }


  image.addEventListener('error', showPlaceholder);


  // Comprueba imágenes que ya hayan fallado

  if (image.complete && image.naturalWidth === 0) {

    showPlaceholder();

  }

});


/* =====================================================
   6. COPIAR INFORMACIÓN DE DONACIONES
   ===================================================== */

const copyStatus = document.querySelector('#copy-status');

document.querySelectorAll('[data-copy]').forEach(button => {

  button.addEventListener('click', async () => {

    const value = button.getAttribute('data-copy');

    if (!value) return;

    try {

      // Método moderno de copiado

      if (
        navigator.clipboard &&
        window.isSecureContext
      ) {

        await navigator.clipboard.writeText(value);

      } else {

        // Alternativa para navegadores compatibles

        const temporaryInput =
          document.createElement('textarea');

        temporaryInput.value = value;

        temporaryInput.setAttribute('readonly', '');

        temporaryInput.style.position = 'fixed';
        temporaryInput.style.opacity = '0';

        document.body.appendChild(temporaryInput);

        temporaryInput.select();

        const copied = document.execCommand('copy');

        temporaryInput.remove();

        if (!copied) {

          throw new Error('No se pudo copiar el contenido.');

        }

      }


      // Confirmación visual

      const originalText =
        button.dataset.originalText || button.textContent;

      button.dataset.originalText = originalText;

      button.textContent = 'Copiado ✓';

      button.classList.add('copied');

      if (copyStatus) {

        copyStatus.textContent =
          `Se copió correctamente: ${value}`;

      }


      window.setTimeout(() => {

        button.textContent = originalText;

        button.classList.remove('copied');

      }, 2200);


    } catch (error) {

      const originalText =
        button.dataset.originalText || button.textContent;

      button.dataset.originalText = originalText;

      button.textContent = 'No se pudo copiar. Tocá el número para seleccionarlo';

      button.classList.add('copy-error');

      if (copyStatus) {

        copyStatus.textContent =
          'No se pudo copiar automáticamente. Seleccioná el número y copialo manualmente.';

      }

      window.setTimeout(() => {

        button.textContent = originalText;

        button.classList.remove('copy-error');

      }, 4000);

    }

  });

});


/* =====================================================
   7. SECCIÓN ACTIVA EN EL MENÚ
   ===================================================== */

const navTargets = new Map();

document.querySelectorAll('.nav-list > li > a').forEach(link => {

  const href = link.getAttribute('href');

  if (href && href.startsWith('#')) {
    navTargets.set(href.slice(1), link);
  }

});

const aboutLink = document.querySelector('.nav-list .sub-toggle');

if (aboutLink) {

  ['nosotros', 'historia', 'pastores', 'fe'].forEach(id => {
    navTargets.set(id, aboutLink);
  });

}


function setActiveLink(id) {

  document.querySelectorAll('.nav-list a.active').forEach(link => {

    link.classList.remove('active');
    link.removeAttribute('aria-current');

  });

  const target = navTargets.get(id);

  if (target) {

    target.classList.add('active');
    target.setAttribute('aria-current', 'location');

  }

}


if ('IntersectionObserver' in window) {

  const sectionObserver = new IntersectionObserver(entries => {

    entries.forEach(entry => {

      if (entry.isIntersecting) {
        setActiveLink(entry.target.id);
      }

    });

  }, { rootMargin: '-45% 0px -50% 0px' });

  document.querySelectorAll('main section[id]').forEach(section => {
    sectionObserver.observe(section);
  });

}


/* =====================================================
   8. BOTÓN VOLVER ARRIBA
   ===================================================== */

const toTopButton = document.querySelector('#to-top');

if (toTopButton) {

  const updateToTop = () => {
    toTopButton.classList.toggle('show', window.scrollY > 500);
  };

  window.addEventListener('scroll', updateToTop, { passive: true });

  toTopButton.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: reducedMotion.matches ? 'auto' : 'smooth'
    });
  });

  updateToTop();

}
