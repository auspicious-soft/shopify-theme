/**
 * Slideshow (sections/slideshow.liquid).
 *
 * <slide-show> handles:
 * - arrows, pagination (dots, numbers, fraction, bars, progress line) and
 *   the arrow keys when the slideshow has focus
 * - autoplay with a pausable timer: the elapsed share of the current slide
 *   is exposed as --slide-progress (0 to 1) for the bar/progress pagination
 * - pause on hover and while the tab is hidden; off for reduced motion
 * - swipe on touch screens
 * - the theme editor: selecting a slide block shows that slide
 *
 * Each element starts itself when added to the page, so it also works after
 * the theme editor re-renders the section.
 */
if (!customElements.get('slide-show')) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  class SlideShow extends HTMLElement {
    connectedCallback() {
      this.slides = [...this.querySelectorAll('[data-slide]')];
      this.count = this.slides.length;
      this.index = 0;
      this.duration = (Number(this.dataset.autoplaySpeed) || 5) * 1000;
      this.autoplay = this.dataset.autoplay === 'true' && this.count > 1 && !reduceMotion.matches;
      this.pauseOnHover = this.dataset.pauseOnHover === 'true';
      this.elapsed = 0;
      this.hovered = false;
      this.last = null;

      this.onClick = this.onClick.bind(this);
      this.onKeydown = this.onKeydown.bind(this);
      this.onPointerDown = this.onPointerDown.bind(this);
      this.onPointerUp = this.onPointerUp.bind(this);
      this.onVisibility = () => (this.last = null);
      this.tick = this.tick.bind(this);

      this.addEventListener('click', this.onClick);
      this.addEventListener('keydown', this.onKeydown);
      this.addEventListener('pointerdown', this.onPointerDown);
      this.addEventListener('pointerup', this.onPointerUp);
      this.addEventListener('pointerenter', () => (this.hovered = true));
      this.addEventListener('pointerleave', () => (this.hovered = false));
      this.addEventListener('focusin', () => (this.hovered = true));
      this.addEventListener('focusout', () => (this.hovered = false));
      document.addEventListener('visibilitychange', this.onVisibility);

      // Theme editor: show the selected slide and hold it there.
      this.addEventListener('shopify:block:select', (event) => {
        const i = this.slides.indexOf(event.target.closest('[data-slide]'));
        if (i >= 0) this.go(i);
        this.editorHold = true;
      });
      this.addEventListener('shopify:block:deselect', () => (this.editorHold = false));

      this.render();
      if (this.autoplay) this.frame = requestAnimationFrame(this.tick);
    }

    disconnectedCallback() {
      cancelAnimationFrame(this.frame);
      document.removeEventListener('visibilitychange', this.onVisibility);
    }

    get paused() {
      return document.hidden || this.editorHold || (this.pauseOnHover && this.hovered);
    }

    tick(time) {
      if (this.last !== null && !this.paused) {
        this.elapsed += time - this.last;
        if (this.elapsed >= this.duration) {
          this.go(this.index + 1);
        } else {
          this.style.setProperty('--slide-progress', (this.elapsed / this.duration).toFixed(4));
        }
      }
      this.last = time;
      this.frame = requestAnimationFrame(this.tick);
    }

    go(target) {
      if (!this.count) return;
      this.index = (target + this.count) % this.count;
      this.elapsed = 0;
      this.render();
    }

    render() {
      this.style.setProperty('--slide-index', this.index);
      this.style.setProperty('--slide-progress', 0);
      // The overall progress line: how far through the whole show we are.
      this.style.setProperty('--slide-position', this.count > 1 ? this.index / (this.count - 1) : 1);

      this.slides.forEach((slide, i) => {
        const active = i === this.index;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', String(!active));
        slide.inert = !active;
      });

      this.querySelectorAll('[data-slide-to]').forEach((button) => {
        const i = Number(button.dataset.slideTo);
        button.classList.toggle('is-active', i === this.index);
        button.classList.toggle('is-done', i < this.index);
        if (i === this.index) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
      });

      const current = this.querySelector('[data-slide-current]');
      if (current) current.textContent = String(this.index + 1);

      // Restart the bar fill animation on the newly active segment.
      this.classList.remove('is-ticking');
      void this.offsetWidth;
      this.classList.add('is-ticking');
    }

    onClick(event) {
      const to = event.target.closest('[data-slide-to]');
      if (to) {
        this.go(Number(to.dataset.slideTo));
        return;
      }
      if (event.target.closest('[data-slide-prev]')) this.go(this.index - 1);
      else if (event.target.closest('[data-slide-next]')) this.go(this.index + 1);
    }

    onKeydown(event) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (event.target.closest('input, textarea, select')) return;
      const forward = (event.key === 'ArrowRight') !== (document.dir === 'rtl');
      this.go(this.index + (forward ? 1 : -1));
    }

    onPointerDown(event) {
      if (event.pointerType === 'mouse') return;
      this.swipeStart = { x: event.clientX, y: event.clientY };
    }

    onPointerUp(event) {
      if (!this.swipeStart) return;
      const dx = event.clientX - this.swipeStart.x;
      const dy = event.clientY - this.swipeStart.y;
      this.swipeStart = null;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
      const forward = (dx < 0) !== (document.dir === 'rtl');
      this.go(this.index + (forward ? 1 : -1));
    }
  }

  customElements.define('slide-show', SlideShow);
}
