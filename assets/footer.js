// Behavior for the footer group sections (sections/footer.liquid): the
// footer menus open as an accordion on mobile when the section's mobile
// style is "accordion".

if (!customElements.get('site-footer')) {
  class SiteFooter extends HTMLElement {
    connectedCallback() {
      this.media = window.matchMedia('(min-width: 750px)');
      this.sync = this.sync.bind(this);
      this.media.addEventListener('change', this.sync);
      this.sync();
    }

    disconnectedCallback() {
      this.media?.removeEventListener('change', this.sync);
    }

    // Desktop, and "simple" on mobile: every menu open. Accordion on
    // mobile: start closed and let the shopper open them.
    sync() {
      const openAll = this.media.matches || this.dataset.mobileStyle !== 'accordion';
      this.querySelectorAll('[data-footer-accordion]').forEach((details) => {
        details.open = openAll;
      });
      this.classList.toggle('footer--accordion', !openAll);
    }
  }

  customElements.define('site-footer', SiteFooter);
}
