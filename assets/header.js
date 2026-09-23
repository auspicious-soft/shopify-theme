/**
 * Site header behavior.
 *
 * Everything else the header needs (sticky positioning, dropdowns, the
 * drawer's open/close/slide transition) is handled by header.css and the
 * theme's existing `theme-panel` custom element
 * (snippets/theme-panel.liquid), which already provides ESC-to-close,
 * outside-click-to-close and scroll locking for the drawer dialog.
 *
 * The only behavior that genuinely needs JavaScript is watching scroll
 * position for headers marked `[data-watch-scroll]`:
 *
 * - Any sticky header ("Always" or "On scroll up", or the Logo reveal
 *   style, which is always sticky): once scrolled, `is-scrolled` is added
 *   so header.css can swap in the configured sticky background color and
 *   a hairline shadow.
 * - "On scroll up" (`[data-hide-on-scroll]`): the header additionally
 *   hides itself (translates off-screen) while the visitor scrolls down,
 *   past its own height, and reappears as soon as they scroll up.
 * - Logo reveal style: the header's compact logo eases in continuously as
 *   the visitor scrolls past the full-width hero logo block, in step with
 *   the hero logo easing out — both driven by the same scroll progress
 *   value (0 to 1), exposed as the --header-hero-progress custom property
 *   on both elements for header.css to consume.
 */
(function () {
  if (window.__headerScrollBound) return;
  window.__headerScrollBound = true;

  var SCROLL_THRESHOLD = 8;

  function bind(header) {
    var heroId = header.dataset.headerHeroTarget;
    var hero = heroId ? document.getElementById(heroId) : null;
    var hideOnScroll = header.hasAttribute('data-hide-on-scroll');
    var lastScrollY = window.scrollY;
    var ticking = false;

    function update() {
      ticking = false;
      var scrollY = window.scrollY;

      if (hero) {
        var distance = Math.max(hero.offsetHeight, 1);
        var progress = Math.min(1, Math.max(0, scrollY / distance));
        hero.style.setProperty('--header-hero-progress', progress);
        header.style.setProperty('--header-hero-progress', progress);
        header.classList.toggle('is-scrolled', progress >= 1);
      } else {
        header.classList.toggle('is-scrolled', scrollY > SCROLL_THRESHOLD);
      }

      if (hideOnScroll) {
        var scrollingDown = scrollY > lastScrollY;
        var pastHeader = scrollY > header.offsetHeight;
        header.classList.toggle('is-hidden', scrollingDown && pastHeader);
        lastScrollY = scrollY;
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
