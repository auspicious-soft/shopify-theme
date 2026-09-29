// Behavior for snippets/scroll-reveal.liquid.

if (!window.themeScrollReveal) {
  window.themeScrollReveal = true;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduceMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
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
