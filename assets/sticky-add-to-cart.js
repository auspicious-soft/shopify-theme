// Behavior for snippets/sticky-add-to-cart.liquid.
//
// Shows the bar once the main product form (data-watch) has scrolled above
// the viewport, and hides it while the footer is on screen so it never
// covers the footer links. Picking a variant in the bar (one dropdown of
// every variant, a dropdown per option, or buttons per option) selects the
// same options in the main variant picker; <product-page> then updates the
// page and re-renders the bar (it's a [data-product-part]).

if (!customElements.get('sticky-add-to-cart')) {
  class StickyAddToCart extends HTMLElement {
    connectedCallback() {
      this.target = document.querySelector(this.dataset.watch);
      // Every section in the footer group (e.g. newsletter + footer).
      this.footers = [...document.querySelectorAll('.shopify-section-group-footer-group')];
      if (!this.footers.length) this.footers = [...document.querySelectorAll('footer')];
      this.visibleFooters = new Set();
      this.pastForm = false;

      this.onChange = this.onChange.bind(this);
      this.addEventListener('change', this.onChange);

      if (!this.target || !('IntersectionObserver' in window)) return;

      this.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.target === this.target) {
            // Past the form = it's out of view above the screen, not below it.
            this.pastForm = !entry.isIntersecting && entry.boundingClientRect.top < 0;
          } else if (entry.isIntersecting) {
            this.visibleFooters.add(entry.target);
          } else {
            this.visibleFooters.delete(entry.target);
          }
        });
        this.toggle(this.pastForm && this.visibleFooters.size === 0);
      });
      this.observer.observe(this.target);
      this.footers.forEach((footer) => this.observer.observe(footer));
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
      if (!event.isTrusted) return;

      let values = null;
      const select = event.target.closest('[data-sticky-variant-select]');
      if (select) {
        // One dropdown: each option carries its variant's option values.
        try {
          values = JSON.parse(select.selectedOptions[0]?.dataset.options || '[]');
        } catch (error) {
          return;
        }
      } else if (event.target.closest('[data-sticky-option]')) {
        values = this.selectedOptionValues();
        this.applyVariant(values);
      }
      if (!values) return;

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

    // Per-option controls (dropdowns or buttons): the value picked for each.
    selectedOptionValues() {
      const values = [];
      this.querySelectorAll('[data-sticky-option]').forEach((input) => {
        const index = Number(input.dataset.optionIndex);
        if (input.type === 'radio') {
          if (input.checked) values[index] = input.value;
        } else {
          values[index] = input.value;
        }
      });
      return values;
    }

    // Point the bar's own form at the matching variant straight away, so it
    // adds the right item even on a page without a main variant picker.
    applyVariant(values) {
      let variants = [];
      try {
        variants = JSON.parse(this.closest('product-page')?.querySelector('[data-product-variants]')?.textContent || '[]');
      } catch (error) {}
      const variant = variants.find((v) => v.options.every((value, i) => value === values[i]));
      const idInput = this.querySelector('[data-sticky-id]');
      const button = this.querySelector('[data-add-to-cart]');
      if (idInput && variant) idInput.value = variant.id;
      if (button) button.disabled = !variant || !variant.available;
    }
  }

  customElements.define('sticky-add-to-cart', StickyAddToCart);
}
