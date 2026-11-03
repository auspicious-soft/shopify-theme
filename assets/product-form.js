// Behavior for snippets/product-form.liquid.

if (!customElements.get('product-form')) {
  class ProductForm extends HTMLElement {
    connectedCallback() {
      this.form = this.querySelector('form');
      this.errorEl = this.querySelector('[data-product-form-error]');
      if (!this.form || this.dataset.cartType === 'page') return;

      this.onSubmit = this.onSubmit.bind(this);
      this.form.addEventListener('submit', this.onSubmit);
    }

    // The button is re-rendered on every variant change, so look it up
    // fresh each time.
    get submitButton() {
      return this.querySelector('[data-add-to-cart]');
    }

    async onSubmit(event) {
      event.preventDefault();
      const button = this.submitButton;
      if (!button || button.disabled || button.classList.contains('is-loading')) return;

      this.errorEl.hidden = true;
      button.classList.add('is-loading');
      button.setAttribute('aria-busy', 'true');

      try {
        const root = window.Shopify?.routes?.root || '/';
        const response = await fetch(`${root}cart/add.js`, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(this.form),
        });
        const data = await response.json();

        if (!response.ok) {
          // Gift card recipient errors arrive as an object, one entry per field.
          const fieldErrors = data.errors && typeof data.errors === 'object' ? Object.values(data.errors).flat().join(' ') : '';
          this.errorEl.textContent = fieldErrors || data.description || data.message || '';
          this.errorEl.hidden = false;
          return;
        }

        document.dispatchEvent(new CustomEvent('cart:item-added', { bubbles: true, detail: { item: data } }));
      } catch (error) {
        this.errorEl.textContent = error.message;
        this.errorEl.hidden = false;
      } finally {
        const current = this.submitButton;
        current?.classList.remove('is-loading');
        current?.removeAttribute('aria-busy');
      }
    }
  }

  customElements.define('product-form', ProductForm);
}
