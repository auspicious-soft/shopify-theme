// Behavior for sections/article.liquid: the share bar's "Copy link" button.
// Uses the native share sheet on devices that have one (mostly phones),
// otherwise copies the article URL and shows "Link copied" briefly.

if (!customElements.get('article-share')) {
  class ArticleShare extends HTMLElement {
    connectedCallback() {
      this.button = this.querySelector('[data-copy-link]');
      this.status = this.querySelector('[data-copy-status]');
      this.onClick = this.onClick.bind(this);
      this.button?.addEventListener('click', this.onClick);
    }

    disconnectedCallback() {
      this.button?.removeEventListener('click', this.onClick);
      clearTimeout(this.timer);
    }

    async onClick() {
      const url = this.dataset.url || window.location.href;

      if (navigator.share && window.matchMedia('(hover: none)').matches) {
        try {
          await navigator.share({ title: document.title, url });
        } catch (error) {}
        return;
      }

      try {
        await navigator.clipboard.writeText(url);
      } catch (error) {
        return;
      }

      if (!this.status) return;
      this.status.hidden = false;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => (this.status.hidden = true), 2500);
    }
  }

  customElements.define('article-share', ArticleShare);
}
