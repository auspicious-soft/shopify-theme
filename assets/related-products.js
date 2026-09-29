// Behavior for sections/related-products.liquid.

if (!customElements.get('related-products')) {
  class RelatedProducts extends HTMLElement {
    connectedCallback() {
      if (!this.dataset.url || this.querySelector('.product-list')) return;

      if (!('IntersectionObserver' in window)) {
        this.load();
        return;
      }

      this.observer = new IntersectionObserver(
        (entries) => {
          if (!entries[0].isIntersecting) return;
          this.observer.disconnect();
          this.load();
        },
        { rootMargin: '0px 0px 600px 0px' }
      );
      this.observer.observe(this);
    }

    disconnectedCallback() {
      this.observer?.disconnect();
    }

    async load() {
      try {
        const response = await fetch(this.dataset.url);
        const html = await response.text();
        const fresh = new DOMParser().parseFromString(html, 'text/html').querySelector('related-products');

        if (fresh && fresh.querySelector('.product-card')) {
          this.innerHTML = fresh.innerHTML;
          // Inserted after the scroll-reveal observer ran, so show directly.
          this.querySelectorAll('[data-animate]').forEach((el) => el.classList.add('is-revealed'));
        } else {
          this.hidden = true;
        }
      } catch (error) {
        this.hidden = true;
      }
    }
  }

  customElements.define('related-products', RelatedProducts);
}
