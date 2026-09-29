// Behavior for sections/cart-panel.liquid.

if (!customElements.get('cart-panel')) {
  class CartPanel extends HTMLElement {
    connectedCallback() {
      this.cartType = this.dataset.cartType;
      this.sectionId = this.dataset.sectionId;

      this.onClick = this.onClick.bind(this);
      this.onChange = this.onChange.bind(this);
      this.onInput = this.onInput.bind(this);
      this.onItemAdded = () => this.refresh({ open: true });

      this.addEventListener('click', this.onClick);
      this.addEventListener('change', this.onChange);
      this.addEventListener('input', this.onInput);
      document.addEventListener('cart:item-added', this.onItemAdded);

      this.updateShippingBar();
    }

    disconnectedCallback() {
      this.removeEventListener('click', this.onClick);
      this.removeEventListener('change', this.onChange);
      this.removeEventListener('input', this.onInput);
      document.removeEventListener('cart:item-added', this.onItemAdded);
    }

    get routesRoot() {
      return window.Shopify?.routes?.root || '/';
    }

    onClick(event) {
      const item = event.target.closest('[data-cart-item]');
      if (!item) return;

      const input = item.querySelector('[data-qty-input]');

      if (event.target.closest('[data-remove-item]')) {
        this.updateItem(item, 0);
      } else if (event.target.closest('[data-qty-increase]')) {
        input.value = Number(input.value) + 1;
        this.updateItem(item, input.value);
      } else if (event.target.closest('[data-qty-decrease]')) {
        input.value = Math.max(0, Number(input.value) - 1);
        this.updateItem(item, input.value);
      }
    }

    onChange(event) {
      const input = event.target.closest('[data-qty-input]');
      if (input) {
        this.updateItem(input.closest('[data-cart-item]'), Math.max(0, Number(input.value) || 0));
      }
    }

    // The note saves as the customer types (debounced); it also posts with
    // the checkout form via its `form` attribute.
    onInput(event) {
      const note = event.target.closest('[data-cart-note]');
      if (!note) return;

      clearTimeout(this.noteTimer);
      this.noteTimer = setTimeout(() => {
        fetch(`${this.routesRoot}cart/update.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ note: note.value }),
        });
      }, 400);
    }

    async updateItem(item, quantity) {
      if (!item) return;

      const error = item.querySelector('[data-item-error]');
      if (error) error.hidden = true;
      item.classList.add('is-loading');

      try {
        const response = await fetch(`${this.routesRoot}cart/change.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            id: item.dataset.key,
            quantity: Number(quantity),
            sections: [this.sectionId],
            sections_url: window.location.pathname,
          }),
        });
        const data = await response.json();

        if (!response.ok) {
          // e.g. not enough stock: keep the row, restore its quantity.
          item.classList.remove('is-loading');
          const input = item.querySelector('[data-qty-input]');
          if (input) input.value = item.dataset.quantity;
          if (error) {
            error.textContent = data.description || data.message || '';
            error.hidden = false;
          }
          return;
        }

        this.renderContents(data.sections?.[this.sectionId]);
      } catch (err) {
        item.classList.remove('is-loading');
      }
    }

    async refresh({ open }) {
      try {
        const response = await fetch(`${window.location.pathname}?sections=${this.sectionId}`);
        const data = await response.json();
        this.renderContents(data[this.sectionId]);
      } catch (err) {
        return;
      }
      if (open) this.open();
    }

    renderContents(html) {
      if (!html) return;

      const fresh = new DOMParser().parseFromString(html, 'text/html').querySelector('cart-panel');
      if (!fresh) return;

      // Remember what had focus so keyboard users don't get dropped.
      const active = document.activeElement;
      let focusKey = null;
      let focusSelector = null;
      if (active && this.contains(active)) {
        focusKey = active.closest('[data-cart-item]')?.dataset.key || null;
        focusSelector = ['data-qty-input', 'data-qty-increase', 'data-qty-decrease', 'data-remove-item']
          .map((attr) => (active.hasAttribute(attr) ? `[${attr}]` : null))
          .find(Boolean);
      }

      const current = this.querySelector('[data-cart-contents]');
      const next = fresh.querySelector('[data-cart-contents]');
      if (current && next) {
        current.replaceWith(next);
      } else {
        this.innerHTML = fresh.innerHTML;
      }

      this.dataset.cartItemCount = fresh.dataset.cartItemCount;
      this.updateCounts(fresh.dataset.cartItemCount);
      this.updateShippingBar();

      if (focusKey) {
        const row = this.querySelector(`[data-cart-item][data-key="${CSS.escape(focusKey)}"]`);
        const target = (row && focusSelector && row.querySelector(focusSelector)) || this.querySelector('.cart-drawer__close');
        target?.focus({ preventScroll: true });
      }
    }

    // Header cart badge(s): <cart-count> in snippets/header-actions.liquid.
    updateCounts(count) {
      document.querySelectorAll('cart-count').forEach((badge) => {
        badge.textContent = count;
        badge.hidden = Number(count) === 0;
      });
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: { itemCount: count } }));
    }

    // Liquid renders the bar in the store's default currency; rescale it
    // when the shopper is browsing in another currency (Shopify Markets).
    updateShippingBar() {
      const bar = this.querySelector('[data-free-shipping]');
      const rate = Number(window.Shopify?.currency?.rate || 1);
      if (!bar || rate === 1) return;

      const threshold = Math.round(Number(bar.dataset.threshold) * rate);
      const total = Number(bar.dataset.total);
      if (!threshold) return;

      const remaining = Math.max(0, threshold - total);
      const progress = Math.min(100, Math.floor((total * 100) / threshold));

      let amount = (remaining / 100).toFixed(2);
      try {
        amount = new Intl.NumberFormat(document.documentElement.lang || undefined, {
          style: 'currency',
          currency: window.Shopify.currency.active,
        }).format(remaining / 100);
      } catch (err) {}

      const message = bar.querySelector('[data-free-shipping-message]');
      if (message) {
        message.innerHTML = remaining > 0
          ? bar.dataset.messageRemaining.replace('__AMOUNT__', amount)
          : bar.dataset.messageUnlocked;
      }
      bar.classList.toggle('cart-shipping--unlocked', remaining === 0);
      bar.querySelector('[data-free-shipping-fill]')?.style.setProperty('--progress', `${progress}%`);
      bar.querySelector('[data-free-shipping-track]')?.setAttribute('aria-valuenow', progress);
    }

    open() {
      if (this.cartType === 'drawer') {
        this.querySelector('#cart-panel-dialog')?.closest('theme-panel')?.open();
      } else if (this.cartType === 'notification') {
        const panel = this.querySelector('#cart-panel-toast')?.closest('theme-panel');
        panel?.open();
        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => panel?.close(), 5000);
      }
    }
  }

  customElements.define('cart-panel', CartPanel);
}
