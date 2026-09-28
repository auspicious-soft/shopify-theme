/**
 * Video section (sections/video.liquid), "Click to play" mode.
 *
 * <video-player> shows a cover image and a play button. The real player (a
 * Shopify-hosted <video> or a YouTube / Vimeo iframe) sits in a <template>
 * and is only added to the page when the play button is clicked, so the
 * video costs nothing until someone wants to watch it. Each element starts
 * itself when added to the page (also after the theme editor re-renders the
 * section).
 */
if (!customElements.get('video-player')) {
  class VideoPlayer extends HTMLElement {
    connectedCallback() {
      this.button = this.querySelector('[data-video-play]');
      this.template = this.querySelector('template');
      this.onPlay = this.onPlay.bind(this);
      this.button?.addEventListener('click', this.onPlay);
    }

    disconnectedCallback() {
      this.button?.removeEventListener('click', this.onPlay);
    }

    onPlay() {
      if (!this.template || this.classList.contains('is-playing')) return;
      const player = this.template.content.firstElementChild.cloneNode(true);
      this.querySelector('[data-video-frame]').appendChild(player);
      this.classList.add('is-playing');

      const video = player.matches('video') ? player : player.querySelector('video');
      if (video) {
        video.play?.().catch(() => {});
        video.focus?.();
      } else {
        const iframe = player.matches('iframe') ? player : player.querySelector('iframe');
        iframe?.focus?.();
      }
    }
  }

  customElements.define('video-player', VideoPlayer);
}
