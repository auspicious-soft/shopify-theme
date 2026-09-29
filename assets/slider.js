// <slider-component>: the theme's one horizontal carousel, shared by every
// section that scrolls a row of items (Featured collection, Related /
// Recommended / Recently viewed products, and any section added later).
//
// The track is a normal scrollable list (CSS handles overflow and snapping);
// this script adds the arrows, the progress bar and the "nothing to scroll"
// state. Everything is opt-in through data attributes:
//
//   <slider-component data-slider-step="item" data-slider-arrow-anchor=".product-card__media">
//     <button data-slider-prev>…</button> <button data-slider-next>…</button>
//     <ul data-slider-track> <li>…</li> … </ul>
//     <span data-slider-progress></span>
//   </slider-component>
//
//   data-slider-step          "page" (default) moves by a screenful of items,
//                             "item" moves one item per click.
//   data-slider-arrow-anchor  optional selector inside the first item; side
//                             arrows are centered on it (e.g. the card image).
//
// It sets on itself:
//   .is-static                 when the items all fit (hide arrows/progress)
//   --slider-progress-size     width of the progress bar thumb
//   --slider-progress-offset   its translateX
//   --slider-arrow-top         vertical center of the arrow anchor

if (!customElements.get('slider-component')) {
  class SliderComponent extends HTMLElement {
    connectedCallback() {
      this.track = this.querySelector('[data-slider-track]');
      if (!this.track) return;

      this.update = this.update.bind(this);
      this.onClick = this.onClick.bind(this);
      this.track.addEventListener('scroll', this.update, { passive: true });
      this.addEventListener('click', this.onClick);
      this.resizeObserver = new ResizeObserver(this.update);
      this.resizeObserver.observe(this.track);
      this.update();
    }

    disconnectedCallback() {
      this.resizeObserver?.disconnect();
      this.track?.removeEventListener('scroll', this.update);
      this.removeEventListener('click', this.onClick);
    }

    onClick(event) {
      if (event.target.closest('[data-slider-prev]')) this.step(-1);
      else if (event.target.closest('[data-slider-next]')) this.step(1);
    }

    step(direction) {
      const item = this.track.firstElementChild;
      const gap = parseFloat(getComputedStyle(this.track).columnGap) || 0;
      const itemWidth = item ? item.getBoundingClientRect().width + gap : this.track.clientWidth;
      const perStep =
        this.dataset.sliderStep === 'item' ? 1 : Math.max(1, Math.floor((this.track.clientWidth + gap) / itemWidth));
      const sign = document.dir === 'rtl' ? -1 : 1;
      this.track.scrollBy({ left: direction * sign * perStep * itemWidth, behavior: 'smooth' });
    }

    // Public: call after replacing the track's items.
    update() {
      if (!this.track) return;
      const max = this.track.scrollWidth - this.track.clientWidth;
      const position = Math.abs(this.track.scrollLeft);
      this.classList.toggle('is-static', max <= 2);

      this.querySelectorAll('[data-slider-prev]').forEach((button) => (button.disabled = position <= 2));
      this.querySelectorAll('[data-slider-next]').forEach((button) => (button.disabled = position >= max - 2));

      const anchorSelector = this.dataset.sliderArrowAnchor;
      const anchor = anchorSelector && this.track.querySelector(anchorSelector);
      if (anchor) this.style.setProperty('--slider-arrow-top', `${anchor.offsetTop + anchor.offsetHeight / 2}px`);

      if (this.querySelector('[data-slider-progress]') && this.track.scrollWidth > 0) {
        const size = (this.track.clientWidth / this.track.scrollWidth) * 100;
        const offset = max > 0 ? (position / max) * ((100 - size) / size) * 100 : 0;
        const sign = document.dir === 'rtl' ? -1 : 1;
        this.style.setProperty('--slider-progress-size', `${size}%`);
        this.style.setProperty('--slider-progress-offset', `${offset * sign}%`);
      }
    }
  }

  customElements.define('slider-component', SliderComponent);
}
