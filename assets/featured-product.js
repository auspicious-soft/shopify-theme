/**
 * Featured product (sections/featured-product.liquid).
 *
 * The section isn't on the product's own URL, so it can't re-render itself
 * per variant the way the product page does. Instead every variant's price,
 * SKU and stock text is in the section's JSON, and choosing options updates,
 * in the browser:
 * - the variant id sent to the cart, and the add to cart button (sold out /
 *   unavailable)
 * - price, SKU and stock status
 * - the gallery image (product-gallery.showMedia)
 * - which option values are unavailable with the other current choices
 * - the "View full details" / title links (to that variant)
 * Plus the quantity +/- buttons and the share button, like the product page.
 *
 * Each element starts itself when added to the page (also after the theme
 * editor re-renders the section).
 */
if (!customElements.get('featured-product')) {
  class FeaturedProduct extends HTMLElement {
    connectedCallback() {
      try {
        this.variants = JSON.parse(this.querySelector('[data-featured-variants]')?.textContent || '[]');
      } catch (error) {
        this.variants = [];
      }
      this.onChange = this.onChange.bind(this);
      this.onClick = this.onClick.bind(this);
      this.addEventListener('change', this.onChange);
      this.addEventListener('click', this.onClick);
      this.updateAvailability();
    }

    disconnectedCallback() {
      this.removeEventListener('change', this.onChange);
      this.removeEventListener('click', this.onClick);
    }

    onChange(event) {
      if (event.target.matches('[data-option-input]')) this.onOptionChange(event.target);
    }

    onClick(event) {
      const step = event.target.closest('[data-quantity-step]');
      if (step) {
        const input = step.parentElement.querySelector('input');
        input.value = Math.max(Number(input.min) || 1, (Number(input.value) || 1) + Number(step.dataset.quantityStep));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
      const share = event.target.closest('[data-share]');
      if (share) this.share(share);
    }

    selectedOptions() {
      const values = [];
      this.querySelectorAll('[data-option-input]').forEach((input) => {
        const index = Number(input.dataset.optionIndex);
        if (input.type === 'radio') {
          if (input.checked) values[index] = input.value;
        } else {
          values[index] = input.value;
        }
      });
      return values;
    }

    findVariant(options) {
      return this.variants.find((variant) => variant.options.every((value, i) => value === options[i]));
    }

    onOptionChange(input) {
      // "Color: Blue" label.
      const legendValue = input.closest('fieldset')?.querySelector('[data-selected-value]');
      if (legendValue) legendValue.textContent = input.value;

      const variant = this.findVariant(this.selectedOptions());
      this.updateAvailability();

      if (!variant) {
        this.setButton(false, this.dataset.labelUnavailable);
        return;
      }

      this.querySelectorAll('[data-variant-id-input]').forEach((idInput) => {
        idInput.value = variant.id;
        idInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      const price = this.querySelector('[data-featured-price]');
      if (price) price.innerHTML = variant.price;

      const sku = this.querySelector('[data-featured-sku]');
      if (sku) sku.textContent = variant.sku;

      const stock = this.querySelector('[data-featured-stock]');
      if (stock && variant.stock) {
        stock.className = stock.className.replace(/product__inventory--\w+/, `product__inventory--${variant.stock.state}`);
        const text = stock.querySelector('[data-featured-stock-text]');
        if (text) text.textContent = variant.stock.text;
      }

      this.setButton(variant.available, variant.available ? this.dataset.labelAdd : this.dataset.labelSoldOut);

      if (variant.media) this.querySelector('product-gallery')?.showMedia?.(variant.media);

      const url = `${this.dataset.productUrl}?variant=${variant.id}`;
      this.querySelectorAll('[data-product-link]').forEach((link) => link.setAttribute('href', url));
    }

    setButton(enabled, label) {
      const button = this.querySelector('[data-add-to-cart]');
      if (!button) return;
      button.disabled = !enabled;
      const text = button.querySelector('.product-form__submit-label');
      if (text && label) text.textContent = label;
    }

    /** Mark option values that can't be bought with the other current choices. */
    updateAvailability() {
      const selected = this.selectedOptions();
      this.querySelectorAll('[data-option-input]').forEach((input) => {
        const index = Number(input.dataset.optionIndex);
        if (input.tagName === 'SELECT') {
          [...input.options].forEach((option) => {
            const choice = [...selected];
            choice[index] = option.value;
            const variant = this.findVariant(choice);
            option.dataset.available = String(Boolean(variant && variant.available));
          });
          return;
        }
        const choice = [...selected];
        choice[index] = input.value;
        const variant = this.findVariant(choice);
        const label = this.querySelector(`label[for="${CSS.escape(input.id)}"]`);
        label?.classList.toggle('is-unavailable', !(variant && variant.available));
      });
    }

    async share(button) {
      const url = button.dataset.shareUrl;
      if (navigator.share) {
        try {
          await navigator.share({ title: button.dataset.shareTitle, url });
        } catch (error) {}
        return;
      }
      try {
        await navigator.clipboard.writeText(url);
        const status = this.querySelector('[data-share-status]');
        if (status) {
          status.hidden = false;
          clearTimeout(this.shareTimer);
          this.shareTimer = setTimeout(() => (status.hidden = true), 2500);
        }
      } catch (error) {}
    }
  }

  customElements.define('featured-product', FeaturedProduct);
}
