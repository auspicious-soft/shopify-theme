// Behavior for sections/social-marquee.liquid.

if (!customElements.get('social-marquee')) {
  const DRAG_THRESHOLD = 5;

  class SocialMarquee extends HTMLElement {
    connectedCallback() {
      this.viewport = this.querySelector('[data-marquee-viewport]');
      this.track = this.querySelector('[data-marquee-track]');
      this.group = this.querySelector('[data-marquee-group]');
      if (!this.viewport || !this.track || !this.group) return;

      this.speed = Number(this.dataset.speed) || 40; // px per second
      this.sign = this.dataset.direction === 'right' ? 1 : -1;
      this.position = 0;
      this.paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.classList.toggle('is-paused', this.paused);
      this.drag = null;
      this.suppressClick = false;

      this.onPointerDown = this.onPointerDown.bind(this);
      this.onPointerMove = this.onPointerMove.bind(this);
      this.onPointerUp = this.onPointerUp.bind(this);
      this.onClick = this.onClick.bind(this);
      this.onBlockSelect = this.onBlockSelect.bind(this);
      this.onBlockDeselect = this.onBlockDeselect.bind(this);
      this.tick = this.tick.bind(this);

      this.viewport.addEventListener('pointerdown', this.onPointerDown);
      this.viewport.addEventListener('pointermove', this.onPointerMove);
      this.viewport.addEventListener('pointerup', this.onPointerUp);
      this.viewport.addEventListener('pointercancel', this.onPointerUp);
      this.viewport.addEventListener('click', this.onClick, true);
      this.viewport.addEventListener('dragstart', (event) => event.preventDefault());
      this.addEventListener('shopify:block:select', this.onBlockSelect);
      this.addEventListener('shopify:block:deselect', this.onBlockDeselect);

      this.resizeObserver = new ResizeObserver(() => this.fill());
      this.resizeObserver.observe(this.viewport);
      this.resizeObserver.observe(this.group);
      this.fill();

      this.lastTime = null;
      this.frame = requestAnimationFrame(this.tick);
    }

    disconnectedCallback() {
      cancelAnimationFrame(this.frame);
      this.resizeObserver?.disconnect();
    }

    /** Clone the image group until the strip is wide enough to loop without gaps. */
    fill() {
      this.loopWidth = this.group.offsetWidth;
      if (!this.loopWidth) return;

      const needed = Math.ceil(this.viewport.offsetWidth / this.loopWidth) + 1;
      const clones = this.track.querySelectorAll('[data-marquee-clone]');
      if (clones.length === needed) return;

      clones.forEach((clone) => clone.remove());
      for (let i = 0; i < needed; i++) {
        const clone = this.group.cloneNode(true);
        clone.removeAttribute('data-marquee-group');
        clone.setAttribute('data-marquee-clone', '');
        clone.setAttribute('aria-hidden', 'true');
        clone.querySelectorAll('[data-shopify-editor-block]').forEach((el) => el.removeAttribute('data-shopify-editor-block'));
        clone.querySelectorAll('a').forEach((link) => link.setAttribute('tabindex', '-1'));
        this.track.appendChild(clone);
      }
      this.render();
    }

    /** Keep the position inside one loop so the strip repeats seamlessly. */
    wrap(value) {
      if (!this.loopWidth) return 0;
      return (((value % this.loopWidth) - this.loopWidth) % this.loopWidth);
    }

    render() {
      this.position = this.wrap(this.position);
      this.track.style.transform = `translate3d(${this.position}px, 0, 0)`;
    }

    tick(time) {
      if (this.lastTime !== null && !this.paused && !this.drag) {
        const delta = Math.min(time - this.lastTime, 100) / 1000;
        this.position += this.sign * this.speed * delta;
        this.render();
      }
      this.lastTime = time;
      this.frame = requestAnimationFrame(this.tick);
    }

    onPointerDown(event) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      this.drag = {
        id: event.pointerId,
        startX: event.clientX,
        startPosition: this.position,
        moved: false,
      };
    }

    onPointerMove(event) {
      if (!this.drag || event.pointerId !== this.drag.id) return;
      const dx = event.clientX - this.drag.startX;

      if (!this.drag.moved) {
        if (Math.abs(dx) < DRAG_THRESHOLD) return;
        this.drag.moved = true;
        this.viewport.classList.add('is-dragging');
        this.viewport.setPointerCapture(event.pointerId);
      }

      this.position = this.drag.startPosition + dx;
      this.render();
    }

    onPointerUp(event) {
      if (!this.drag || event.pointerId !== this.drag.id) return;
      const { moved } = this.drag;
      this.drag = null;
      this.viewport.classList.remove('is-dragging');
      if (this.viewport.hasPointerCapture(event.pointerId)) this.viewport.releasePointerCapture(event.pointerId);

      if (moved && event.type === 'pointerup') {
        // Each drag toggles the automatic movement: first stops it, next starts it again.
        this.paused = !this.paused;
        this.classList.toggle('is-paused', this.paused);
        this.suppressClick = true;
        setTimeout(() => (this.suppressClick = false), 0);
      }
    }

    /** Don't follow a link at the end of a drag. */
    onClick(event) {
      if (!this.suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
      this.suppressClick = false;
    }

    onBlockSelect(event) {
      this.editorPaused = true;
      this.wasPaused = this.paused;
      this.paused = true;
      const item = event.target.closest('.social-marquee__item');
      if (item) {
        this.position = -item.offsetLeft + (this.viewport.offsetWidth - item.offsetWidth) / 2;
        this.render();
      }
    }

    onBlockDeselect() {
      if (!this.editorPaused) return;
      this.editorPaused = false;
      this.paused = this.wasPaused;
    }
  }

  customElements.define('social-marquee', SocialMarquee);
}
