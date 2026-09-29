// Behavior for snippets/theme-panel.liquid.

if (!customElements.get('theme-panel')) {
  class ThemePanel extends HTMLElement {
    connectedCallback() {
      this.panel = this.querySelector('dialog, details');

      if (!ThemePanel.delegated) {
        document.addEventListener('click', ThemePanel.handleDocumentClick);
        ThemePanel.delegated = true;
      }
    }

    open() {
      this.panel = this.panel?.isConnected ? this.panel : this.querySelector('dialog, details');
      if (!this.panel) return;

      if (this.panel.tagName === 'DIALOG') {
        if (this.panel.hasAttribute('data-non-modal')) {
          this.panel.show();
        } else {
          this.panel.showModal();
        }
      } else {
        this.panel.open = true;
        this.attachOutsideCloseListeners();
        const focusable = this.panel.querySelector('a, button, input, select, textarea, [tabindex]');
        if (focusable) focusable.focus();
      }

      this.dispatchEvent(new CustomEvent('panel:opened', { bubbles: true, detail: { id: this.panel.id } }));
    }

    close() {
      this.panel = this.panel?.isConnected ? this.panel : this.querySelector('dialog, details');
      if (!this.panel) return;

      if (this.panel.tagName === 'DIALOG') {
        if (this.panel.open) this.panel.close();
      } else {
        this.panel.open = false;
        this.removeOutsideCloseListeners();
      }

      this.dispatchEvent(new CustomEvent('panel:closed', { bubbles: true, detail: { id: this.panel.id } }));
    }

    attachOutsideCloseListeners() {
      this.boundOutsideClick = (event) => {
        if (!this.contains(event.target)) this.close();
      };
      this.boundKeydown = (event) => {
        if (event.key === 'Escape') this.close();
      };
      document.addEventListener('click', this.boundOutsideClick);
      document.addEventListener('keydown', this.boundKeydown);
    }

    removeOutsideCloseListeners() {
      document.removeEventListener('click', this.boundOutsideClick);
      document.removeEventListener('keydown', this.boundKeydown);
    }

    static handleDocumentClick(event) {
      const opener = event.target.closest('[data-panel-open]');
      if (opener) {
        if (opener.tagName === 'SUMMARY') event.preventDefault();

        const id = opener.getAttribute('data-panel-open');
        const panel = document.getElementById(id);
        const target = panel?.closest('theme-panel');

        if (panel?.open) {
          target?.close();
        } else {
          target?.open();
        }

        return;
      }

      const closer = event.target.closest('[data-panel-close]');
      if (closer) {
        const target = closer.closest('theme-panel');
        target?.close();
        return;
      }

      const dialog = event.target.closest('dialog');
      if (dialog && event.target === dialog) {
        dialog.closest('theme-panel')?.close();
      }
    }
  }

  ThemePanel.delegated = false;
  customElements.define('theme-panel', ThemePanel);
}
