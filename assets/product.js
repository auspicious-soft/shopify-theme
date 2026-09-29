// Behavior for sections/product.liquid.

if (!customElements.get('product-page')) {
  class ProductPage extends HTMLElement {
    connectedCallback() {
      this.sectionId = this.dataset.sectionId;
      this.productUrl = this.dataset.productUrl;
      this.variants = JSON.parse(this.querySelector('[data-product-variants]')?.textContent || '[]');
      this.requestId = 0;

      this.onChange = this.onChange.bind(this);
      this.onClick = this.onClick.bind(this);
      this.addEventListener('change', this.onChange);
      this.addEventListener('click', this.onClick);

      this.rememberViewed();
    }

    // Feeds the Recently viewed section (sections/recently-viewed.liquid):
    // newest first, no duplicates, capped at 20.
    rememberViewed() {
      const handle = this.dataset.productHandle;
      if (!handle) return;
      try {
        const key = 'theme:recently-viewed';
        const list = JSON.parse(window.localStorage.getItem(key) || '[]').filter((item) => item !== handle);
        list.unshift(handle);
        window.localStorage.setItem(key, JSON.stringify(list.slice(0, 20)));
      } catch (error) {}
    }

    onChange(event) {
      if (event.target.matches('[data-option-input]')) this.onOptionChange(event.target);
    }

    onClick(event) {
      const step = event.target.closest('[data-quantity-step]');
      if (step) {
        const input = step.parentElement.querySelector('input');
        const next = Math.max(Number(input.min) || 1, (Number(input.value) || 1) + Number(step.dataset.quantityStep));
        input.value = next;
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

    onOptionChange(input) {
      // Update the "Color: Blue" label straight away.
      const legendValue = input.closest('fieldset')?.querySelector('[data-selected-value]');
      if (legendValue) legendValue.textContent = input.value;

      const options = this.selectedOptions();
      const variant = this.variants.find((v) => v.options.every((value, i) => value === options[i]));

      if (!variant) {
        this.setUnavailable();
        return;
      }

      this.querySelectorAll('[data-variant-id-input]').forEach((idInput) => {
        idInput.value = variant.id;
        idInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      if (variant.featured_media) {
        this.querySelector('product-gallery')?.showMedia(variant.featured_media.id);
      }

      window.history.replaceState({}, '', `${this.productUrl}?variant=${variant.id}`);
      this.renderVariant(variant.id, input.id);
    }

    setUnavailable() {
      const button = this.querySelector('[data-add-to-cart]');
      if (!button) return;
      button.disabled = true;
      const label = button.querySelector('.product-form__submit-label');
      if (label) label.textContent = this.dataset.labelUnavailable;
    }

    async renderVariant(variantId, focusId) {
      const requestId = ++this.requestId;
      try {
        const response = await fetch(`${this.productUrl}?variant=${variantId}&section_id=${this.sectionId}`);
        const html = await response.text();
        if (requestId !== this.requestId) return; // a newer choice won

        const doc = new DOMParser().parseFromString(html, 'text/html');
        this.querySelectorAll('[data-product-part]').forEach((part) => {
          const fresh = doc.getElementById(part.id);
          if (fresh) part.replaceWith(fresh);
        });

        if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
      } catch (error) {}
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

  customElements.define('product-page', ProductPage);
}
