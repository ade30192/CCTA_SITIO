/* Centro Cristiano Tabernáculo de Adoración
   Funciones e interacciones accesibles.
*/

// ========================================
// MENÚ DE NAVEGACIÓN
// ========================================

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

    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute(
      'aria-label',
      isOpen ? 'Cerrar menú' : 'Abrir menú'
    );
  });

  mainNav.querySelectorAll('a').forEach(link => {

    link.addEventListener('click', event => {
      const parent = link.closest('.has-sub');
      const isMobile = window.matchMedia('(max-width: 760px)').matches;

      if (parent && link.classList.contains('sub-toggle') && isMobile) {
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


// ========================================
// CARRUSEL PRINCIPAL
// ========================================

const slides = Array.from(document.querySelectorAll('.slide'));
const dots = Array.from(document.querySelectorAll('.dot'));
const carouselToggle = document.querySelector('#carousel-toggle');
const hero = document.querySelector('.hero');

const reducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
);

let currentSlide = 0;
let carouselTimer = null;
let carouselPaused = reducedMotion.matches;

function showSlide(index) {

  if (!slides.length) return;

  currentSlide = (index + slides.length) % slides.length;

  slides.forEach((slide, i) => {

    const active = i === currentSlide;

    slide.classList.toggle('active', active);
    slide.setAttribute('aria-hidden', String(!active));

  });

  dots.forEach((dot, i) => {

    const active = i === currentSlide;

    dot.classList.toggle('active', active);
    dot.setAttribute('aria-pressed', String(active));

  });

}

function stopCarousel() {

  if (carouselTimer) {
    window.clearInterval(carouselTimer);
  }

  carouselTimer = null;

}

function startCarousel() {

  stopCarousel();

  if (
    !slides.length ||
    carouselPaused ||
    document.hidden ||
    reducedMotion.matches
  ) {
    return;
  }

  carouselTimer = window.setInterval(() => {
    showSlide(currentSlide + 1);
  }, 6500);

}

function updateCarouselButton() {

  if (!carouselToggle) return;

  carouselToggle.textContent = carouselPaused
    ? 'Reanudar carrusel'
    : 'Pausar carrusel';

  carouselToggle.setAttribute(
    'aria-pressed',
    String(carouselPaused)
  );

  carouselToggle.setAttribute(
    'aria-label',
    carouselPaused
      ? 'Reanudar carrusel automático'
      : 'Pausar carrusel automático'
  );

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


// Pausar y reanudar

carouselToggle?.addEventListener('click', () => {

  carouselPaused = !carouselPaused;

  updateCarouselButton();
  startCarousel();

});


// Pausar mientras el visitante interactúa con el carrusel

hero?.addEventListener('mouseenter', stopCarousel);
hero?.addEventListener('mouseleave', startCarousel);

hero?.addEventListener('focusin', stopCarousel);
hero?.addEventListener('focusout', startCarousel);

document.addEventListener('visibilitychange', startCarousel);

reducedMotion.addEventListener?.('change', event => {

  if (event.matches) {
    carouselPaused = true;
  }

  updateCarouselButton();
  startCarousel();

});

if (slides.length) {

  showSlide(0);
  updateCarouselButton();
  startCarousel();

}


// ========================================
// AÑO AUTOMÁTICO DEL PIE DE PÁGINA
// ========================================

const yearElement = document.querySelector('#year');

if (yearElement) {

  yearElement.textContent = String(
    new Date().getFullYear()
  );

}


// ========================================
// GALERÍAS DE FOTOGRAFÍAS
// ========================================

document.querySelectorAll('.event-toggle').forEach(button => {

  button.addEventListener('click', () => {

    const panelId = button.getAttribute('aria-controls');

    const panel = panelId
      ? document.getElementById(panelId)
      : null;

    if (!panel) return;

    const expanded =
      button.getAttribute('aria-expanded') === 'true';

    const nextExpanded = !expanded;

    button.setAttribute(
      'aria-expanded',
      String(nextExpanded)
    );

    panel.classList.toggle('open', nextExpanded);

    const label = button.querySelector('.event-more');

    if (label) {

      const icon = label.querySelector('i');

      label.firstChild.textContent = nextExpanded
        ? 'Ocultar fotos '
        : 'Ver fotos ';

      if (icon) {
        icon.setAttribute('aria-hidden', 'true');
      }

    }

  });

});


// ========================================
// COPIAR INFORMACIÓN DE DONACIONES
// ========================================

const copyStatus = document.querySelector('#copy-status');

document.querySelectorAll('[data-copy]').forEach(button => {

  button.addEventListener('click', async () => {

    const value = button.getAttribute('data-copy');

    if (!value) return;

    try {

      // Método moderno de copiado

      if (navigator.clipboard && window.isSecureContext) {

        await navigator.clipboard.writeText(value);

      } else {

        // Alternativa para navegadores antiguos

        const temporaryInput =
          document.createElement('textarea');

        temporaryInput.value = value;

        temporaryInput.setAttribute('readonly', '');

        temporaryInput.style.position = 'absolute';
        temporaryInput.style.left = '-9999px';

        document.body.appendChild(temporaryInput);

        temporaryInput.select();

        const copied = document.execCommand('copy');

        temporaryInput.remove();

        if (!copied) {
          throw new Error('No se pudo copiar');
        }

      }

      // Confirmación visual

      const originalText =
        button.dataset.originalText || button.textContent;

      button.dataset.originalText = originalText;

      button.textContent = 'Copiado';

      button.classList.add('copied');

      if (copyStatus) {
        copyStatus.textContent = `Se copió: ${value}`;
      }

      window.setTimeout(() => {

        button.textContent = originalText;
        button.classList.remove('copied');

      }, 2200);

    } catch (error) {

      if (copyStatus) {
        copyStatus.textContent =
          'No se pudo copiar automáticamente. Seleccioná y copiá el dato manualmente.';
      }

      button.textContent = 'Copiá manualmente';

    }

  });

});
