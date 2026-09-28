/**
 * Parallax for sections/collection-banner.liquid (Collection banner >
 * Parallax effect).
 *
 * While the banner comes up into view, its image stays fixed on screen and
 * the text scrolls up over it. Once the whole banner is on screen (the next
 * section is about to start), the image is released and scrolls away with
 * the banner, so the following sections never slide over a fixed image.
 *
 * <parallax-media> wraps the banner image. Each scroll frame it's shifted up
 * by however much of the banner is still below the bottom of the screen,
 * which keeps the image at its final on-screen position until the banner
 * has fully arrived. The banner's overflow: hidden crops it. Each element
 * starts itself when added to the page (also after the theme editor
 * re-renders the section). Off for visitors who prefer reduced motion.
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
      if (!this.banner) return;
      const rect = this.banner.getBoundingClientRect();
      if (reduceMotion.matches || rect.bottom < 0 || rect.top > viewport) {
        if (this.style.transform) this.style.transform = '';
        return;
      }
      // Part of the banner still below the screen: hold the image still by
      // shifting it up by that much. Zero once the banner is fully in view.
      const below = Math.max(0, rect.bottom - viewport);
      // Never shift further than the banner's own height.
      const shift = Math.min(below, rect.height);
      this.style.transform = shift ? `translate3d(0, ${(-shift).toFixed(1)}px, 0)` : '';
    }
  }

  customElements.define('parallax-media', ParallaxMedia);
}
