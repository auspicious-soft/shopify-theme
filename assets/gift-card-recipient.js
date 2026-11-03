// Behavior for snippets/gift-card-recipient.liquid.

if (!customElements.get('gift-card-recipient')) {
  const SEND_WINDOW_DAYS = 90;
  const toDateValue = (date) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };

  class GiftCardRecipient extends HTMLElement {
    connectedCallback() {
      this.toggle = this.querySelector('[data-recipient-toggle]');
      this.fields = this.querySelector('[data-recipient-fields]');
      this.querySelector('[data-recipient-offset]').value = new Date().getTimezoneOffset().toString();

      const today = new Date();
      const date = this.querySelector('[data-recipient-date]');
      date.min = toDateValue(today);
      date.max = toDateValue(new Date(today.getTime() + SEND_WINDOW_DAYS * 86400000));

      this.toggle.addEventListener('change', () => this.sync());
      this.sync();
    }

    sync() {
      const on = this.toggle.checked;
      this.fields.hidden = !on;
      this.fields.querySelectorAll('input, textarea').forEach((field) => {
        field.disabled = !on;
      });
    }
  }

  customElements.define('gift-card-recipient', GiftCardRecipient);
}
