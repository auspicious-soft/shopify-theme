/**
 * Site header behavior.
 *
 * Everything else the header needs (sticky positioning, dropdowns, the
 * logo crossfade, the drawer's open/close/slide transition) is handled by
 * header.css and the theme's existing `theme-panel` custom element
 * (snippets/theme-panel.liquid), which already provides ESC-to-close,
 * outside-click-to-close and scroll locking for the drawer dialog.
 *
 * The only behavior that genuinely needs JavaScript is watching scroll
 * position for headers marked `[data-watch-scroll]`:
 *
 * - Standard style, sticky + overlay: the header starts transparent over
 *   the page content and switches to its normal solid appearance once the
 *   visitor scrolls past a small threshold.
 * - Logo reveal style: the header's compact logo is hidden until the
 *   visitor scrolls past the full-width hero logo block, and the hero
 *   logo itself fades/scales out smoothly as it scrolls by (exposed as
 *   the --header-hero-progress custom property, from 0 to 1, for
 *   header.css to use).
 */
(function () {
  if (window.__headerScrollBound) return;
  window.__headerScrollBound = true;

  var SCROLL_THRESHOLD = 8;

  function bind(header) {
    var heroId = header.dataset.headerHeroTarget;
    var hero = heroId ? document.getElementById(heroId) : null;
    var ticking = false;

    function update() {
      ticking = false;

      if (hero) {
        var distance = Math.max(hero.offsetHeight, 1);
        var progress = Math.min(1, Math.max(0, window.scrollY / distance));
        hero.style.setProperty('--header-hero-progress', progress);
        header.classList.toggle('is-scrolled', progress >= 1);
      } else {
        header.classList.toggle('is-scrolled', window.scrollY > SCROLL_THRESHOLD);
      }
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  }

  function init() {
    document.querySelectorAll('.header[data-watch-scroll]').forEach(bind);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-bind if the header section is replaced by the theme editor.
  document.addEventListener('shopify:section:load', function (event) {
    var header = event.target.querySelector && event.target.querySelector('.header[data-watch-scroll]');
    if (header) bind(header);
  });
})();
