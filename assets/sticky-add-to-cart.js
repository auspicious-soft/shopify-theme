// Behavior for snippets/sticky-add-to-cart.liquid.
//
// Shows the bar once the main product form (data-watch) has scrolled above
// the viewport, and hides it while the footer is on screen so it never
// covers the footer links. Picking a variant in the bar's dropdown selects
// the same options in the main variant picker; <product-page> then updates
// the page and re-renders the bar (it's a [data-product-part]).

if (!customElements.get('sticky-add-to-cart')) {
  class StickyAddToCart extends HTMLElement {
    connectedCallback() {
      this.target = document.querySelector(this.dataset.watch);
      this.footer = document.querySelector('.shopify-section-group-footer-group, footer');
      this.pastForm = false;
      this.footerVisible = false;

      this.onChange = this.onChange.bind(this);
      this.addEventListener('change', this.onChange);

      if (!this.target || !('IntersectionObserver' in window)) return;

      this.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.target === this.target) {
            // Past the form = it's out of view above the screen, not below it.
            this.pastForm = !entry.isIntersecting && entry.boundingClientRect.top < 0;
          } else {
            this.footerVisible = entry.isIntersecting;
          }
        });
        this.toggle(this.pastForm && !this.footerVisible);
      });
      this.observer.observe(this.target);
      if (this.footer) this.observer.observe(this.footer);
    }

    disconnectedCallback() {
      this.observer?.disconnect();
      this.removeEventListener('change', this.onChange);
      document.documentElement.classList.remove('sticky-atc-visible');
    }

    toggle(show) {
      if (show === this.classList.contains('is-visible')) return;
      this.classList.toggle('is-visible', show);
      this.toggleAttribute('inert', !show);
      this.setAttribute('aria-hidden', String(!show));
      document.documentElement.classList.toggle('sticky-atc-visible', show);
      if (show) {
        document.documentElement.style.setProperty('--sticky-atc-height', `${this.offsetHeight}px`);
      }
    }

    // Only the shopper's own choice: <product-page> also fires change events
    // while it updates the page, and those must not bounce back.
    onChange(event) {
      const select = event.target.closest('[data-sticky-variant-select]');
      if (!select || !event.isTrusted) return;

      const option = select.selectedOptions[0];
      let values = [];
      try {
        values = JSON.parse(option?.dataset.options || '[]');
      } catch (error) {
        return;
      }

      const page = this.closest('product-page');
      if (!page) return;

      let last = null;
      values.forEach((value, index) => {
        const inputs = page.querySelectorAll(`[data-option-input][data-option-index="${index}"]`);
        inputs.forEach((input) => {
          if (input.type === 'radio') {
            if (input.value === value) {
              input.checked = true;
              last = input;
            }
          } else if (input.tagName === 'SELECT') {
            input.value = value;
            last = input;
          }
        });
      });

      // Let <product-page> resolve the variant and refresh price, images,
      // stock, the main form and this bar. Without a main picker, the bar's
      // own dropdown still submits the chosen variant.
      last?.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  customElements.define('sticky-add-to-cart', StickyAddToCart);
}
