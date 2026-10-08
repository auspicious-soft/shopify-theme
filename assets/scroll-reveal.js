// Behavior for snippets/scroll-reveal.liquid.

if (!window.themeScrollReveal) {
  window.themeScrollReveal = true;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduceMotion && 'IntersectionObserver' in window) {
    const reveal = (item, observer) => {
      item.classList.add('is-revealed');
      observer.unobserve(item);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          // Items in a slider row reveal together, so a card that only
          // peeks in at the edge (or sits further along the row) shows too.
          const track = entry.target.closest('[data-slider-track]');
          const items = track ? track.querySelectorAll('[data-animate]:not(.is-revealed)') : [entry.target];
          items.forEach((item) => reveal(item, observer));
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -10% 0px' }
    );

    // Whole sections: any visible pixel counts, so very tall sections still reveal.
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) reveal(entry.target, sectionObserver);
        });
      },
      { threshold: 0, rootMargin: '0px 0px -10% 0px' }
    );

    // Every page and footer section reveals, except the header group
    // (announcement bar, header, cart drawer), sections already on screen
    // (no flash on load) and sections whose cards animate on their own.
    const markSections = (root = document) => {
      const sections = root.matches?.('.shopify-section') ? [root] : root.querySelectorAll('.shopify-section');
      sections.forEach((section) => {
        if (section.classList.contains('shopify-section-group-header-group')) return;
        if (section.hasAttribute('data-animate-section')) return;
        if (section.querySelector('[data-animate]')) return;
        if (section.getBoundingClientRect().top < window.innerHeight) return;
        section.setAttribute('data-animate-section', '');
        sectionObserver.observe(section);
      });
    };

    const observe = () => {
      document.querySelectorAll('[data-animate]:not(.is-revealed)').forEach((el) => observer.observe(el));
    };

    observe();
    markSections();

    document.addEventListener('shopify:section:load', (event) => {
      observe();
      markSections(event.target);
    });

    // Theme editor: show a selected section straight away.
    document.addEventListener('shopify:section:select', (event) => {
      if (event.target.hasAttribute('data-animate-section')) reveal(event.target, sectionObserver);
    });
  }
}
