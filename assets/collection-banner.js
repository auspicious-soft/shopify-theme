/**
 * Fixed text effect for sections/collection-banner.liquid (Collection banner
 * > Parallax effect): while the page scrolls, the banner's text stays fixed
 * on screen and the image scrolls past behind it. When the end of the
 * banner reaches the text, the text leaves together with the banner.
 *
 * <banner-fixed-text> is the banner's content wrapper. On each scroll frame
 * it's shifted down by exactly how far the banner has scrolled above the
 * top of the screen (or below a sticky header), capped so the text never
 * goes past the banner's bottom padding. Each element starts itself when
 * it's added to the page, so it also works after the theme editor
 * re-renders the section.
 */
if (!customElements.get('banner-fixed-text')) {
  const active = new Set();
  let ticking = false;

  /** Bottom edge of a sticky header that's currently on screen, else 0. */
  const stickyHeaderBottom = () => {
    const header = document.querySelector('.header--sticky:not(.is-hidden)');
    if (!header) return 0;
    return Math.max(0, header.getBoundingClientRect().bottom);
  };

  const update = () => {
    ticking = false;
    const top = stickyHeaderBottom();
    active.forEach((element) => element.update(top));
  };

  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });

  class BannerFixedText extends HTMLElement {
    connectedCallback() {
      this.banner = this.parentElement;
      this.content = this.firstElementChild;
      active.add(this);
      requestUpdate();
    }

    disconnectedCallback() {
      active.delete(this);
    }

    update(screenTop) {
      if (!this.banner || !this.content) return;
      const banner = this.banner.getBoundingClientRect();
      if (banner.bottom < 0 || banner.top > window.innerHeight) return;

      const style = getComputedStyle(this);
      const paddingTop = parseFloat(style.paddingTop) || 0;
      const paddingBottom = parseFloat(style.paddingBottom) || 0;
      const contentTop = this.content.offsetTop;
      const contentBottom = contentTop + this.content.offsetHeight;
      // Room the text has to move down (to the bottom padding) or up (to the top padding).
      const maxShift = Math.max(0, banner.height - paddingBottom - contentBottom);
      const minShift = -Math.max(0, contentTop - paddingTop);

      let shift = 0;
      if (banner.top < screenTop) {
        // Banner scrolled up past the top of the screen: hold the text in place.
        shift = Math.min(screenTop - banner.top, maxShift);
      } else if (banner.bottom > window.innerHeight) {
        // Banner still entering from the bottom: text low in the banner is
        // held at the bottom edge of the screen until the banner is in view.
        shift = Math.max(window.innerHeight - banner.bottom, minShift);
      }

      this.style.transform = shift ? `translate3d(0, ${shift.toFixed(1)}px, 0)` : '';
    }
  }

  customElements.define('banner-fixed-text', BannerFixedText);
}
