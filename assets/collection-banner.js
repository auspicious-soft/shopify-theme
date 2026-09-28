/**
 * Parallax for sections/collection-banner.liquid (Collection banner >
 * Parallax effect): the banner image moves more slowly than the page while
 * the text stays put.
 *
 * <parallax-media data-strength="20"> wraps the banner image. It's taller
 * than the banner by the strength (in % of the banner height, above and
 * below, see assets/collection-banner.css) and slides between those limits
 * as the banner passes through the viewport. Each element starts itself
 * when it's added to the page, so it also works after the theme editor
 * re-renders the section. Off for visitors who prefer reduced motion.
 */
if (!customElements.get('parallax-media')) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const active = new Set();
  let ticking = false;

  const update = () => {
    ticking = false;
    const viewport = window.innerHeight;
    active.forEach((element) => element.update(viewport));
  };

  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });

  class ParallaxMedia extends HTMLElement {
    connectedCallback() {
      this.banner = this.parentElement;
      active.add(this);
      requestUpdate();
    }

    disconnectedCallback() {
      active.delete(this);
    }

    update(viewport) {
      if (reduceMotion.matches || !this.banner) {
        this.style.transform = '';
        return;
      }
      const rect = this.banner.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > viewport) return;

      // -1 as the banner leaves at the top, 1 as it enters at the bottom.
      const progress = (rect.top + rect.height / 2 - viewport / 2) / (viewport / 2 + rect.height / 2);
      const strength = (Number(this.dataset.strength) || 0) / 100;
      const offset = -progress * strength * rect.height;
      this.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    }
  }

  customElements.define('parallax-media', ParallaxMedia);
}
