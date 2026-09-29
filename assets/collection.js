// Behavior for sections/collection.liquid.

if (!customElements.get('collection-page')) {
  class CollectionPage extends HTMLElement {
    connectedCallback() {
      this.sectionId = this.dataset.sectionId;

      this.onChange = this.onChange.bind(this);
      this.onInput = this.onInput.bind(this);
      this.onClick = this.onClick.bind(this);
      this.onKeydown = this.onKeydown.bind(this);
      this.onPopState = () => this.load(window.location.href, { push: false });

      this.addEventListener('change', this.onChange);
      this.addEventListener('input', this.onInput);
      this.addEventListener('click', this.onClick);
      this.addEventListener('keydown', this.onKeydown);
      window.addEventListener('popstate', this.onPopState);
    }

    disconnectedCallback() {
      window.removeEventListener('popstate', this.onPopState);
      document.documentElement.classList.remove('facets-open');
    }

    get form() {
      return document.getElementById(`FacetsForm-${this.sectionId}`);
    }

    get facets() {
      return this.querySelector('[data-facets]');
    }

    // Checkboxes and sort apply immediately; price inputs wait until the
    // shopper stops typing (or leaves the field).
    onChange(event) {
      if (event.target.matches('[data-facets-price]')) {
        clearTimeout(this.priceTimer);
        this.submitForm();
      } else if (event.target.matches('[data-facets-input]')) {
        this.submitForm();
      }
    }

    onInput(event) {
      if (!event.target.matches('[data-facets-price]')) return;
      clearTimeout(this.priceTimer);
      this.priceTimer = setTimeout(() => this.submitForm(), 800);
    }

    onClick(event) {
      const link = event.target.closest('[data-facets-link]');
      if (link) {
        event.preventDefault();
        this.load(link.href, { scroll: link.closest('.pagination') !== null });
        return;
      }

      const loadMore = event.target.closest('[data-load-more]');
      if (loadMore) {
        event.preventDefault();
        this.loadMore(loadMore);
        return;
      }

      if (event.target.closest('[data-facets-open]')) {
        this.openFacets();
      } else if (event.target.closest('[data-facets-close]')) {
        this.closeFacets();
      }
    }

    onKeydown(event) {
      if (event.key === 'Escape' && this.facets?.classList.contains('is-open')) {
        this.closeFacets();
      }
    }

    openFacets() {
      const facets = this.facets;
      if (!facets) return;
      facets.classList.add('is-open');
      document.documentElement.classList.add('facets-open');
      this.querySelector('[data-facets-open]')?.setAttribute('aria-expanded', 'true');
      facets.querySelector('.facets__close')?.focus({ preventScroll: true });
    }

    closeFacets() {
      const facets = this.facets;
      if (!facets?.classList.contains('is-open')) return;
      facets.classList.remove('is-open');
      document.documentElement.classList.remove('facets-open');
      const toggle = this.querySelector('[data-facets-open]');
      toggle?.setAttribute('aria-expanded', 'false');
      toggle?.focus({ preventScroll: true });
    }

    buildUrl() {
      const params = new URLSearchParams();
      if (this.form) {
        for (const [key, value] of new FormData(this.form)) {
          if (value !== '') params.append(key, value);
        }
      }
      const query = params.toString();
      return `${window.location.pathname}${query ? `?${query}` : ''}`;
    }

    submitForm() {
      this.load(this.buildUrl());
    }

    async fetchSection(url) {
      const target = new URL(url, window.location.origin);
      target.searchParams.set('section_id', this.sectionId);
      const response = await fetch(target.toString());
      const html = await response.text();
      return new DOMParser().parseFromString(html, 'text/html');
    }

    async load(url, { push = true, scroll = false } = {}) {
      this.classList.add('is-loading');
      try {
        const doc = await this.fetchSection(url);
        this.replaceParts(doc);
        if (push) window.history.pushState({}, '', url);
        if (scroll) this.querySelector('.collection__toolbar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (error) {
        window.location.href = url;
      } finally {
        this.classList.remove('is-loading');
      }
    }

    // Swap every [data-results-part] for its fresh counterpart, keeping
    // the shopper's open/closed filter groups and keyboard focus.
    replaceParts(doc) {
      const openGroups = new Set(
        [...this.querySelectorAll('.facets__group')].map((group) => (group.open ? group.id : null)).filter(Boolean)
      );
      const closedGroups = new Set(
        [...this.querySelectorAll('.facets__group')].map((group) => (group.open ? null : group.id)).filter(Boolean)
      );
      const focusedId = document.activeElement && this.contains(document.activeElement) ? document.activeElement.id : null;

      this.querySelectorAll('[data-results-part]').forEach((part) => {
        const fresh = doc.getElementById(part.id);
        if (fresh) part.replaceWith(fresh);
      });

      this.querySelectorAll('.facets__group').forEach((group) => {
        if (openGroups.has(group.id)) group.open = true;
        if (closedGroups.has(group.id)) group.open = false;
      });

      if (focusedId) document.getElementById(focusedId)?.focus({ preventScroll: true });
      this.revealNew();
    }

    async loadMore(button) {
      const wrapper = button.closest('[data-load-more-wrapper]');
      button.classList.add('is-loading');
      button.setAttribute('aria-busy', 'true');

      try {
        const doc = await this.fetchSection(button.href);
        const grid = this.querySelector('[data-collection-grid]');
        const freshGrid = doc.querySelector('[data-collection-grid]');
        if (grid && freshGrid) {
          const firstNew = freshGrid.firstElementChild;
          grid.append(...freshGrid.children);
          firstNew?.querySelector('a')?.focus({ preventScroll: true });
        }
        const freshWrapper = doc.querySelector('[data-load-more-wrapper]');
        if (wrapper) {
          if (freshWrapper) wrapper.replaceWith(freshWrapper);
          else wrapper.remove();
        }
        this.revealNew();
      } catch (error) {
        window.location.href = button.href;
      }
    }

    // Cards inserted after load skip the scroll-reveal observer, so show
    // them straight away.
    revealNew() {
      this.querySelectorAll('[data-animate]:not(.is-revealed)').forEach((el) => el.classList.add('is-revealed'));
    }
  }

  customElements.define('collection-page', CollectionPage);
}
