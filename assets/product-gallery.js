// Behavior for snippets/product-gallery.liquid.

if (!customElements.get('product-gallery')) {
  class ProductGallery extends HTMLElement {
    connectedCallback() {
      this.track = this.querySelector('[data-gallery-track]');
      this.thumbs = this.querySelector('[data-gallery-thumbs]');
      this.counter = this.querySelector('[data-gallery-current]');
      this.lightbox = this.querySelector('[data-lightbox]');
      if (!this.track) return;

      this.onScroll = this.onScroll.bind(this);
      this.onClick = this.onClick.bind(this);
      this.track.addEventListener('scroll', this.onScroll, { passive: true });
      this.addEventListener('click', this.onClick);

      const start = Number(this.dataset.startIndex || 0);
      this.activeIndex = start;
      // Sync slides/thumbs/counter once layout is known (grid and stacked
      // layouts show every slide on desktop, so none should stay aria-hidden).
      requestAnimationFrame(() => (start > 0 ? this.goTo(start, 'instant') : this.setActive(0)));

      if (this.querySelector('model-viewer')) this.loadModelViewer();
    }

    get slides() {
      return [...this.track.children];
    }

    // True when the track scrolls sideways (all slider layouts, and every
    // layout on mobile); false for the desktop grid/stacked layouts.
    get isSlider() {
      return this.track.scrollWidth > this.track.clientWidth + 2;
    }

    onClick(event) {
      const thumb = event.target.closest('[data-thumb-index]');
      if (thumb) {
        this.goTo(Number(thumb.dataset.thumbIndex));
        return;
      }
      if (event.target.closest('[data-gallery-prev]')) {
        this.goTo(Math.max(0, this.activeIndex - 1));
      } else if (event.target.closest('[data-gallery-next]')) {
        this.goTo(Math.min(this.slides.length - 1, this.activeIndex + 1));
      } else if (event.target.closest('[data-open-lightbox]')) {
        this.openLightbox(event.target.closest('[data-open-lightbox]').dataset.mediaId);
      } else if (event.target.closest('[data-lightbox-close]')) {
        this.lightbox?.close();
      } else if (event.target.closest('[data-lightbox-prev]')) {
        this.stepLightbox(-1);
      } else if (event.target.closest('[data-lightbox-next]')) {
        this.stepLightbox(1);
      } else if (event.target === this.lightbox) {
        this.lightbox.close();
      }
    }

    onScroll() {
      if (this.scrollFrame) return;
      this.scrollFrame = requestAnimationFrame(() => {
        this.scrollFrame = null;
        const width = this.track.clientWidth || 1;
        const index = Math.round(Math.abs(this.track.scrollLeft) / width);
        if (index !== this.activeIndex) this.setActive(index);
      });
    }

    goTo(index, behavior = 'smooth') {
      const slide = this.slides[index];
      if (!slide) return;
      if (this.isSlider) {
        const left = slide.offsetLeft - this.track.offsetLeft;
        this.track.scrollTo({ left: document.dir === 'rtl' ? -left : left, behavior });
      }
      this.setActive(index);
    }

    setActive(index) {
      this.activeIndex = index;
      this.slides.forEach((slide, i) => {
        const active = i === index;
        slide.classList.toggle('is-active', active);
        if (active) slide.removeAttribute('aria-hidden');
        else if (this.isSlider) slide.setAttribute('aria-hidden', 'true');
        else slide.removeAttribute('aria-hidden');
        if (!active) this.pauseMedia(slide);
      });

      if (this.counter) this.counter.textContent = index + 1;

      if (this.thumbs) {
        this.thumbs.querySelectorAll('[data-thumb-index]').forEach((thumb) => {
          const active = Number(thumb.dataset.thumbIndex) === index;
          thumb.classList.toggle('is-active', active);
          if (active) {
            thumb.setAttribute('aria-current', 'true');
            const list = this.thumbs;
            const item = thumb.parentElement;
            list.scrollTo({
              left: item.offsetLeft - list.clientWidth / 2 + item.clientWidth / 2,
              top: item.offsetTop - list.clientHeight / 2 + item.clientHeight / 2,
              behavior: 'smooth',
            });
          } else {
            thumb.removeAttribute('aria-current');
          }
        });
      }
    }

    pauseMedia(slide) {
      slide.querySelectorAll('video').forEach((video) => video.pause());
      slide.querySelectorAll('iframe').forEach((frame) => {
        frame.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        frame.contentWindow?.postMessage('{"method":"pause"}', '*');
      });
    }

    // Called by <product-page> when the selected variant has its own media.
    // Sliders scroll to it; the desktop grid/stacked layouts move it to the
    // top so it's the first thing the shopper sees.
    showMedia(mediaId) {
      const slide = this.slides.find((el) => el.dataset.mediaId === String(mediaId));
      if (!slide) return;

      if (this.isSlider) {
        this.goTo(this.slides.indexOf(slide));
      } else {
        this.track.prepend(slide);
        this.setActive(0);
      }
    }

    openLightbox(mediaId) {
      if (!this.lightbox) return;
      this.lightbox.showModal();
      const lightboxTrack = this.lightbox.querySelector('[data-lightbox-track]');
      const slide = lightboxTrack?.querySelector(`[data-media-id="${mediaId}"]`);
      if (slide) {
        lightboxTrack.scrollTo({ left: slide.offsetLeft, behavior: 'instant' });
      }
    }

    stepLightbox(direction) {
      const lightboxTrack = this.lightbox?.querySelector('[data-lightbox-track]');
      if (!lightboxTrack) return;
      lightboxTrack.scrollBy({ left: direction * lightboxTrack.clientWidth, behavior: 'smooth' });
    }

    loadModelViewer() {
      if (!window.Shopify?.loadFeatures) return;
      window.Shopify.loadFeatures([
        {
          name: 'model-viewer-ui',
          version: '1.0',
          onLoad: (error) => {
            if (error) return;
            this.querySelectorAll('model-viewer').forEach((viewer) => {
              try {
                new window.Shopify.ModelViewerUI(viewer);
              } catch (err) {}
            });
          },
        },
      ]);
    }
  }

  customElements.define('product-gallery', ProductGallery);
}
