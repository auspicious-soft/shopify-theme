// Behavior for sections/recently-viewed.liquid.

if (!customElements.get('recently-viewed')) {
  const STORAGE_KEY = 'theme:recently-viewed';

  class RecentlyViewed extends HTMLElement {
    connectedCallback() {
      this.onClick = this.onClick.bind(this);
      this.addEventListener('click', this.onClick);
      this.load();
    }

    disconnectedCallback() {
      this.removeEventListener('click', this.onClick);
    }

    readHandles() {
      try {
        const list = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
        return Array.isArray(list) ? list : [];
      } catch (error) {
        return [];
      }
    }

    writeHandles(list) {
      try {
        if (list.length) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        else window.localStorage.removeItem(STORAGE_KEY);
      } catch (error) {}
    }

    async load() {
      const limit = Number(this.dataset.limit) || 4;
      const current = this.dataset.currentHandle;
      const handles = this.readHandles().filter((handle) => handle && handle !== current).slice(0, limit);
      if (!handles.length) return;

      const root = window.Shopify?.routes?.root || '/';
      const results = await Promise.all(
        handles.map(async (handle) => {
          try {
            const response = await fetch(`${root}products/${encodeURIComponent(handle)}?section_id=recently-viewed-card`);
            if (!response.ok) return { handle, html: null, gone: response.status === 404 };
            const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
            return { handle, html: doc.querySelector('[data-recently-viewed-card]')?.innerHTML || null };
          } catch (error) {
            return { handle, html: null };
          }
        })
      );

      // Forget products that no longer exist.
      const gone = results.filter((result) => result.gone).map((result) => result.handle);
      if (gone.length) this.writeHandles(this.readHandles().filter((handle) => !gone.includes(handle)));

      const cards = results.filter((result) => result.html);
      const track = this.querySelector('[data-slider-track]');
      if (!cards.length || !track) return;

      track.innerHTML = cards.map((card) => `<li class="product-list__item">${card.html}</li>`).join('');
      track.querySelectorAll('[data-animate]').forEach((el) => el.classList.add('is-revealed'));
      this.hidden = false;
      this.querySelector('product-slider')?.update?.();
    }

    onClick(event) {
      if (!event.target.closest('[data-recently-viewed-clear]')) return;
      this.writeHandles([]);
      this.hidden = true;
    }
  }

  customElements.define('recently-viewed', RecentlyViewed);
}
