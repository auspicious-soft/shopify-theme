// Behavior for sections/password.liquid: the launch countdown and the
// "Enter using password" dialog (opened on load after a wrong password).

if (!customElements.get('password-countdown')) {
  class PasswordCountdown extends HTMLElement {
    connectedCallback() {
      // "2026-12-01 09:00" → local time. Safari needs the "T".
      const raw = (this.dataset.date || '').trim().replace(' ', 'T');
      this.target = new Date(raw).getTime();
      if (Number.isNaN(this.target)) return;

      this.values = {};
      this.querySelectorAll('[data-unit]').forEach((el) => {
        this.values[el.dataset.unit] = el;
      });

      this.hidden = false;
      this.tick();
      this.timer = setInterval(() => this.tick(), 1000);
    }

    disconnectedCallback() {
      clearInterval(this.timer);
    }

    tick() {
      const left = Math.max(0, this.target - Date.now());
      if (left === 0) {
        clearInterval(this.timer);
        const done = document.createElement('p');
        done.className = 'password-page__countdown-done';
        done.textContent = this.dataset.done || '';
        this.replaceChildren(done);
        return;
      }

      const seconds = Math.floor(left / 1000);
      const parts = {
        days: Math.floor(seconds / 86400),
        hours: Math.floor((seconds % 86400) / 3600),
        minutes: Math.floor((seconds % 3600) / 60),
        seconds: seconds % 60,
      };
      Object.entries(parts).forEach(([unit, value]) => {
        if (this.values[unit]) this.values[unit].textContent = String(value).padStart(2, '0');
      });
    }
  }

  customElements.define('password-countdown', PasswordCountdown);
}

document.addEventListener('DOMContentLoaded', () => {
  const dialog = document.querySelector('[data-password-dialog]');
  if (!dialog) return;

  const opener = document.querySelector('[data-password-open]');
  const input = dialog.querySelector('input[type="password"]');

  const open = () => {
    if (dialog.open) return;
    dialog.showModal();
    document.documentElement.classList.add('password-dialog-open');
    input?.focus();
  };
  const close = () => dialog.close();

  opener?.addEventListener('click', open);
  dialog.querySelector('[data-password-close]')?.addEventListener('click', close);
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('password-dialog-open');
    opener?.focus({ preventScroll: true });
  });
  // Click on the backdrop closes it.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) close();
  });

  // A wrong password reloads the page with the error: reopen the dialog.
  if (dialog.querySelector('[data-password-error]')) open();
});
