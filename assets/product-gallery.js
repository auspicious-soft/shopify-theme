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
      this.setupAutoplay();
    }

    disconnectedCallback() {
      this.stopAutoplay();
      document.removeEventListener('visibilitychange', this.onVisibility);
    }

    // Product section > Autoplay: the images slide by themselves, one at a
    // time, back to the first after the last. Pauses while the shopper
    // hovers, touches or tabs into the gallery, and while the tab is hidden;
    // off for visitors who prefer reduced motion.
    setupAutoplay() {
      this.autoplayDelay = Number(this.dataset.autoplay || 0);
      if (!this.autoplayDelay || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      this.paused = false;
      const pause = () => {
        this.paused = true;
      };
      const resume = () => {
        this.paused = false;
      };
      if (this.dataset.autoplayStyle === 'marquee') {
        this.setupMarquee();
        return;
      }

      this.addEventListener('mouseenter', pause);
      this.addEventListener('mouseleave', resume);
      this.addEventListener('focusin', pause);
      this.addEventListener('focusout', resume);
      // A swipe or arrow click restarts the wait before the next slide.
      this.addEventListener('pointerdown', () => this.startAutoplay());
      this.onVisibility = () => (document.hidden ? this.stopAutoplay() : this.startAutoplay());
      document.addEventListener('visibilitychange', this.onVisibility);
      this.startAutoplay();
    }

    startAutoplay() {
      if (!this.autoplayDelay) return;
      this.stopAutoplay();
      this.autoplayTimer = setInterval(() => {
        if (this.paused || !this.isSlider || this.lightbox?.open) return;
        const max = this.track.scrollWidth - this.track.clientWidth;
        const atEnd = Math.abs(this.track.scrollLeft) >= max - 2 || this.activeIndex >= this.slides.length - 1;
        this.goTo(atEnd ? 0 : this.activeIndex + 1);
      }, this.autoplayDelay);
    }

    stopAutoplay() {
      clearInterval(this.autoplayTimer);
      cancelAnimationFrame(this.marqueeFrame);
      this.marqueeFrame = null;
    }

    // Marquee: the row glides continuously (Marquee speed, px per second).
    // A copy of the slides follows the real ones, and the position wraps
    // back by one set's width, so the loop never jumps. Pauses while
    // hovered / touched / focused; arrows and swiping still work.
    setupMarquee() {
      if (!this.isSlider) return;
      this.speed = Number(this.dataset.marqueeSpeed || 40);

      this.slides.forEach((slide) => {
        const clone = slide.cloneNode(true);
        clone.setAttribute('data-gallery-clone', '');
        clone.setAttribute('aria-hidden', 'true');
        clone.setAttribute('inert', '');
        clone.classList.remove('is-active');
        clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
        this.track.append(clone);
      });
      this.classList.add('is-marquee');

      const hold = () => {
        this.paused = true;
        clearTimeout(this.resumeTimer);
      };
      const release = (delay = 0) => {
        clearTimeout(this.resumeTimer);
        this.resumeTimer = setTimeout(() => {
          this.paused = false;
          this.position = Math.abs(this.track.scrollLeft);
        }, delay);
      };
      this.addEventListener('mouseenter', hold);
      this.addEventListener('mouseleave', () => release(300));
      this.addEventListener('focusin', hold);
      this.addEventListener('focusout', () => release(300));
      this.addEventListener('pointerdown', hold);
      // Touch: wait a moment after a swipe or tap before gliding on.
      this.addEventListener('pointerup', (event) => {
        if (event.pointerType !== 'mouse') release(2500);
      });

      this.onVisibility = () => (document.hidden ? this.stopAutoplay() : this.runMarquee());
      document.addEventListener('visibilitychange', this.onVisibility);
      this.position = Math.abs(this.track.scrollLeft);
      this.runMarquee();
    }

    runMarquee() {
      cancelAnimationFrame(this.marqueeFrame);
      let last = performance.now();
      const step = (now) => {
        const delta = Math.min(now - last, 64);
        last = now;
        const firstClone = this.track.querySelector('[data-gallery-clone]');
        if (firstClone && !this.paused && !this.lightbox?.open && this.isSlider) {
          const loop = firstClone.offsetLeft - this.slides[0].offsetLeft;
          this.position += (this.speed * delta) / 1000;
          if (this.position >= loop) this.position -= loop;
          this.track.scrollLeft = document.dir === 'rtl' ? -this.position : this.position;
        }
        this.marqueeFrame = requestAnimationFrame(step);
      };
      this.marqueeFrame = requestAnimationFrame(step);
    }

    // Real slides only (not the marquee's copies).
    get slides() {
      return [...this.track.children].filter((el) => !el.hasAttribute('data-gallery-clone'));
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
        // The slide whose start is nearest the scroll position (slides can
        // be narrower than the track, e.g. the full-screen layout).
        const position = Math.abs(this.track.scrollLeft);
        let index = 0;
        let best = Infinity;
        this.slides.forEach((slide, i) => {
          const distance = Math.abs(slide.offsetLeft - this.track.offsetLeft - position);
          if (distance < best) {
            best = distance;
            index = i;
          }
        });
        if (index !== this.activeIndex) this.setActive(index);
        else this.updateArrows();
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
      this.updateArrows();

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

    // Previous is disabled on the first image, next once the last image is
    // in view (the track can't scroll any further).
    updateArrows() {
      const prev = this.querySelector('[data-gallery-prev]');
      const next = this.querySelector('[data-gallery-next]');
      if (!prev || !next) return;
      if (this.classList.contains('is-marquee')) {
        prev.disabled = false;
        next.disabled = false;
        return;
      }
      const max = this.track.scrollWidth - this.track.clientWidth;
      const position = Math.abs(this.track.scrollLeft);
      prev.disabled = this.activeIndex <= 0 && position <= 2;
      next.disabled = this.activeIndex >= this.slides.length - 1 || position >= max - 2;
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
