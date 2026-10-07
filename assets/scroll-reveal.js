// Behavior for snippets/scroll-reveal.liquid.

if (!window.themeScrollReveal) {
  window.themeScrollReveal = true;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduceMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          // Items in a slider row reveal together, so a card that only
          // peeks in at the edge (or sits further along the row) shows too.
          const track = entry.target.closest('[data-slider-track]');
          const items = track ? track.querySelectorAll('[data-animate]:not(.is-revealed)') : [entry.target];
          items.forEach((item) => {
            item.classList.add('is-revealed');
            observer.unobserve(item);
          });
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -10% 0px' }
    );

    const observe = () => {
      document.querySelectorAll('[data-animate]:not(.is-revealed)').forEach((el) => observer.observe(el));
    };

    observe();
    document.addEventListener('shopify:section:load', observe);
  }
}
