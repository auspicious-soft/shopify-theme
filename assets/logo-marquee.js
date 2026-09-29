// Behavior for sections/logo-marquee.liquid.

if (!customElements.get('logo-marquee')) {
  class LogoMarquee extends HTMLElement {
    connectedCallback() {
      this.viewport = this.querySelector('.logo-marquee__viewport');
      this.track = this.querySelector('[data-logo-track]');
      this.group = this.querySelector('[data-logo-group]');
      if (!this.viewport || !this.track || !this.group) return;

      this.speed = Number(this.dataset.speed) || 40;
      const reverse = this.dataset.direction === 'right';
      this.style.setProperty('--logo-animation-direction', reverse ? 'reverse' : 'normal');

      this.fill = this.fill.bind(this);
      this.resizeObserver = new ResizeObserver(this.fill);
      this.resizeObserver.observe(this.viewport);
      this.resizeObserver.observe(this.group);
      this.fill();
    }

    disconnectedCallback() {
      this.resizeObserver?.disconnect();
    }

    /** Repeat the row until the strip can loop without a gap, then set the loop length and duration. */
    fill() {
      const loop = this.group.offsetWidth;
      if (!loop) return;

      const needed = Math.ceil(this.viewport.offsetWidth / loop) + 1;
      const clones = this.track.querySelectorAll('[data-logo-clone]');
      if (clones.length !== needed) {
        clones.forEach((clone) => clone.remove());
        for (let i = 0; i < needed; i++) {
          const clone = this.group.cloneNode(true);
          clone.removeAttribute('data-logo-group');
          clone.setAttribute('data-logo-clone', '');
          clone.setAttribute('aria-hidden', 'true');
          clone.querySelectorAll('[data-shopify-editor-block]').forEach((el) => el.removeAttribute('data-shopify-editor-block'));
          clone.querySelectorAll('a').forEach((link) => link.setAttribute('tabindex', '-1'));
          this.track.appendChild(clone);
        }
      }

      const sign = document.dir === 'rtl' ? -1 : 1;
      this.style.setProperty('--logo-loop', `${loop * sign}px`);
      this.style.setProperty('--logo-duration', `${loop / this.speed}s`);
      this.classList.add('is-ready');
    }
  }

  customElements.define('logo-marquee', LogoMarquee);
}
