// Behavior for snippets/header-localization.liquid.

if (!customElements.get('header-localization')) {
  class HeaderLocalization extends HTMLElement {
    connectedCallback() {
      this.form = this.querySelector('form');
      if (!this.form) return;

      this.querySelectorAll('[data-header-localization-select]').forEach((select) => {
        select.addEventListener('change', () => this.form.submit());
      });
    }
  }

  customElements.define('header-localization', HeaderLocalization);
}
