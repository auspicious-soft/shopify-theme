// Behavior for snippets/product-card.liquid. Loaded by every section that shows
// product cards, so cards fetched after page load (recommendations,
// recently viewed) work too.

if (!customElements.get('product-card')) {
  class ProductCard extends HTMLElement {
    connectedCallback() {
      try {
        this.variants = JSON.parse(this.querySelector('[data-card-variants]')?.textContent || '[]');
        this.selected = JSON.parse(this.dataset.selected || '[]');
      } catch (error) {
        this.variants = [];
        this.selected = [];
      }
      this.colorIndex = Number(this.dataset.colorIndex);
      this.sizeIndex = Number(this.dataset.sizeIndex);
      this.slides = this.querySelector('[data-card-slides]');
      this.prev = this.querySelector('[data-card-prev]');
      this.next = this.querySelector('[data-card-next]');

      this.onClick = this.onClick.bind(this);
      this.onSubmit = this.onSubmit.bind(this);
      this.updateArrows = this.updateArrows.bind(this);
      this.addEventListener('click', this.onClick);
      this.addEventListener('submit', this.onSubmit);
      this.slides?.addEventListener('scroll', this.updateArrows, { passive: true });

      this.updateArrows();
      this.updateAvailability();
    }

    disconnectedCallback() {
      this.removeEventListener('click', this.onClick);
      this.removeEventListener('submit', this.onSubmit);
      this.slides?.removeEventListener('scroll', this.updateArrows);
    }


    onClick(event) {
      const target = event.target;
      const arrow = target.closest('[data-card-prev], [data-card-next]');
      if (arrow) {
        event.preventDefault();
        this.step(arrow.hasAttribute('data-card-next') ? 1 : -1);
        return;
      }

      const swatch = target.closest('[data-card-color]');
      if (swatch) {
        event.preventDefault();
        this.selectColor(swatch.dataset.cardColor);
        return;
      }

      const size = target.closest('[data-card-size]');
      if (size) {
        event.preventDefault();
        if (size.getAttribute('aria-disabled') === 'true') return;
        this.add(this.findVariant({ [this.sizeIndex]: size.dataset.cardSize }), size);
        return;
      }

      const addCurrent = target.closest('[data-card-add-current]');
      if (addCurrent) {
        event.preventDefault();
        this.add(this.findVariant(), addCurrent);
        return;
      }

      // Touch screens: "+" opens the size grid, or adds straight to cart
      // when the product has no size to choose.
      const toggle = target.closest('[data-card-quick-toggle]');
      if (toggle) {
        event.preventDefault();
        if (toggle.dataset.cardQuickToggle === 'add') this.add(this.findVariant(), toggle);
        else this.setQuickOpen(!this.classList.contains('is-quick-open'));
      }
    }

    setQuickOpen(open) {
      this.classList.toggle('is-quick-open', open);
      this.querySelector('[data-card-quick-toggle="open"]')?.setAttribute('aria-expanded', String(open));
      if (open) {
        // Only one card's size grid open at a time.
        document.querySelectorAll('product-card.is-quick-open').forEach((card) => {
          if (card !== this) card.setQuickOpen(false);
        });
        ProductCard.listenForOutsideTaps();
      }
    }

    /** One shared listener: a tap outside an open card closes its size grid. */
    static listenForOutsideTaps() {
      if (ProductCard.outsideListener) return;
      ProductCard.outsideListener = (event) => {
        document.querySelectorAll('product-card.is-quick-open').forEach((card) => {
          if (!card.contains(event.target)) card.setQuickOpen(false);
        });
      };
      document.addEventListener('pointerdown', ProductCard.outsideListener, { passive: true });
    }

    /** Single-variant products use a real form (works without JS); add it over Ajax here. */
    onSubmit(event) {
      const form = event.target.closest('.product-card__quick-form');
      if (!form) return;
      event.preventDefault();
      const id = Number(new FormData(form).get('id'));
      this.add(this.variants.find((variant) => variant.id === id) || { id, available: true }, form.querySelector('[data-card-add]'));
    }

    /** The variant matching the current selection, with some options overridden. */
    findVariant(overrides = {}) {
      const wanted = this.selected.map((value, index) => (index in overrides ? overrides[index] : value));
      return this.variants.find((variant) => variant.options.every((value, index) => value === wanted[index]));
    }

    selectColor(color) {
      if (this.colorIndex < 0) return;
      this.selected[this.colorIndex] = color;

      // Keep the other options if that combination exists in this color,
      // otherwise switch to the first available variant of the color.
      let variant = this.findVariant();
      if (!variant || !variant.available) {
        variant =
          this.variants.find((v) => v.options[this.colorIndex] === color && v.available) ||
          this.variants.find((v) => v.options[this.colorIndex] === color);
        if (variant) this.selected = [...variant.options];
      }

      this.querySelectorAll('[data-card-color]').forEach((swatch) => {
        swatch.setAttribute('aria-pressed', String(swatch.dataset.cardColor === color));
      });

      if (variant) {
        this.renderVariant(variant);
        if (variant.media > 0) this.showSlide(variant.media - 1);
      }
      this.updateAvailability();
    }

    renderVariant(variant) {
      const price = this.querySelector('[data-card-price]');
      if (price) {
        price.innerHTML = variant.compare
          ? `<s class="product-card__compare">${variant.compare}</s><span class="product-card__amount product-card__amount--sale">${variant.price}</span>`
          : `<span class="product-card__amount">${variant.price}</span>`;
      }

      const badge = this.querySelector('[data-card-badge]');
      if (badge) {
        badge.textContent = variant.badge;
        badge.hidden = !variant.badge;
        badge.classList.remove(badge.dataset.saleScheme, badge.dataset.soldOutScheme);
        badge.classList.add(variant.available ? badge.dataset.saleScheme : badge.dataset.soldOutScheme);
      }

      const url = `${this.dataset.productUrl}${this.dataset.productUrl.includes('?') ? '&' : '?'}variant=${variant.id}`;
      this.querySelectorAll('[data-card-link], .product-card__slide').forEach((link) => link.setAttribute('href', url));
    }

    /** Grey out sizes (or the add button) that aren't in stock for the chosen color. */
    updateAvailability() {
      this.querySelectorAll('[data-card-size]').forEach((button) => {
        const variant = this.findVariant({ [this.sizeIndex]: button.dataset.cardSize });
        button.setAttribute('aria-disabled', String(!(variant && variant.available)));
      });

      const addCurrent = this.querySelector('[data-card-add-current]');
      if (addCurrent) {
        const variant = this.findVariant();
        addCurrent.disabled = !(variant && variant.available);
      }
    }

    async add(variant, button) {
      if (!variant || variant.available === false || !button) return;
      button.classList.add('is-loading');
      button.setAttribute('aria-busy', 'true');

      const root = window.Shopify?.routes?.root || '/';
      const productPage = `${this.dataset.productUrl}?variant=${variant.id}`;
      try {
        const response = await fetch(`${root}cart/add.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ items: [{ id: variant.id, quantity: 1 }] }),
        });

        if (!response.ok) {
          // Let the product page explain the problem (e.g. not enough stock).
          window.location.href = productPage;
          return;
        }

        if (this.dataset.cartType === 'page') {
          window.location.href = `${root}cart`;
          return;
        }

        document.dispatchEvent(new CustomEvent('cart:item-added', { bubbles: true }));
        button.classList.add('is-added');
        setTimeout(() => button.classList.remove('is-added'), 1500);
        // Touch screens: close the size grid once the size is in the cart.
        if (this.classList.contains('is-quick-open')) setTimeout(() => this.setQuickOpen(false), 600);
      } catch (error) {
        window.location.href = productPage;
      } finally {
        button.classList.remove('is-loading');
        button.removeAttribute('aria-busy');
      }
    }

    // Previous goes back until the first image, next goes on until the last.
    step(direction) {
      if (!this.slides) return;
      const sign = document.dir === 'rtl' ? -1 : 1;
      this.slides.scrollBy({ left: direction * sign * this.slides.clientWidth, behavior: 'smooth' });
    }

    showSlide(index) {
      const slide = this.slides?.children[index];
      if (!slide) return;
      this.slides.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
    }

    updateArrows() {
      if (!this.slides || !this.prev || !this.next) return;
      // At the first image "previous" is disabled, at the last "next" is.
      const max = this.slides.scrollWidth - this.slides.clientWidth;
      const position = Math.abs(this.slides.scrollLeft);
      this.prev.disabled = position <= 2;
      this.next.disabled = position >= max - 2;
    }
  }

  customElements.define('product-card', ProductCard);
}
