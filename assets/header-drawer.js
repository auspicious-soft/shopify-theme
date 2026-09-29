// Behavior for snippets/header-drawer.liquid.

if (!customElements.get('header-drawer-menu')) {
  class HeaderDrawerMenu extends HTMLElement {
    connectedCallback() {
      this.onClick = this.onClick.bind(this);
      this.reset = this.reset.bind(this);
      this.addEventListener('click', this.onClick);

      // The dialog can close via the close button, the backdrop or the
      // Escape key; its native `close` event covers all three.
      this.dialog = this.closest('dialog');
      this.dialog?.addEventListener('close', this.reset);
    }

    disconnectedCallback() {
      this.removeEventListener('click', this.onClick);
      this.dialog?.removeEventListener('close', this.reset);
    }

    onClick(event) {
      const opener = event.target.closest('[data-submenu-open]');
      if (opener && this.contains(opener)) {
        this.openItem(opener.closest('.header__drawer-item'));
        return;
      }

      const back = event.target.closest('[data-submenu-back]');
      if (back && this.contains(back)) {
        this.closeItem(back.closest('.header__drawer-item'));
      }
    }

    // The scroll container a submenu panel slides over: its parent panel,
    // or this element for top-level items.
    containerOf(item) {
      return item.parentElement.closest('[data-submenu-panel]') || this;
    }

    // Everything in the container that the open panel now covers, made
    // inert so keyboard focus can't wander behind it.
    coveredBy(item) {
      const container = this.containerOf(item);
      const siblings = [...item.parentElement.children].filter((el) => el !== item);
      const toggle = item.querySelector(':scope > [data-submenu-open]');
      const back = container.querySelector(':scope > [data-submenu-back]');
      return [...siblings, toggle, back].filter(Boolean);
    }

    openItem(item) {
      if (!item) return;
      const container = this.containerOf(item);
      container.scrollTop = 0;
      container.classList.add('has-open-submenu');
      item.classList.add('is-open');
      item.querySelector(':scope > [data-submenu-open]')?.setAttribute('aria-expanded', 'true');
      this.coveredBy(item).forEach((el) => (el.inert = true));
      item.querySelector(':scope > [data-submenu-panel] > [data-submenu-back]')?.focus({ preventScroll: true });
    }

    closeItem(item) {
      if (!item) return;
      const container = this.containerOf(item);
      const toggle = item.querySelector(':scope > [data-submenu-open]');
      this.coveredBy(item).forEach((el) => (el.inert = false));
      item.classList.remove('is-open');
      container.classList.remove('has-open-submenu');
      toggle?.setAttribute('aria-expanded', 'false');
      toggle?.focus({ preventScroll: true });
    }

    // Wait for the drawer's own slide-out (400ms, assets/header-drawer.css)
    // so submenus don't visibly snap shut while it's still on screen.
    reset() {
      clearTimeout(this.resetTimer);
      this.resetTimer = setTimeout(() => {
        this.querySelectorAll('.header__drawer-item.is-open').forEach((item) => {
          item.classList.remove('is-open');
          item.querySelector(':scope > [data-submenu-open]')?.setAttribute('aria-expanded', 'false');
        });
        this.querySelectorAll('.has-open-submenu').forEach((el) => el.classList.remove('has-open-submenu'));
        this.classList.remove('has-open-submenu');
        this.querySelectorAll('[inert]').forEach((el) => (el.inert = false));
        this.querySelectorAll('details[open]').forEach((details) => (details.open = false));
      }, 400);
    }
  }

  customElements.define('header-drawer-menu', HeaderDrawerMenu);
}
