/**
 * Site header behavior.
 *
 * Everything else the header needs (sticky positioning, dropdowns, the
 * drawer's open/close/slide transition, the hover logo crossfade) is
 * handled by header.css and the theme's existing `theme-panel` custom
 * element (snippets/theme-panel.liquid), which already provides ESC-to-
 * close, outside-click-to-close and scroll locking for the drawer dialog.
 *
 * Two things genuinely need JavaScript:
 *
 * 1. Measuring the announcement bar's rendered height (it varies with its
 *    own font size/padding settings) and exposing it as
 *    --announcement-bar-height on the document root, so an overlay header
 *    (pulled out of document flow) can sit below it instead of covering
 *    it, instead of the caller hardcoding a guessed pixel value.
 *
 * 2. Watching scroll position for headers marked `[data-watch-scroll]`:
 *    - Any sticky header ("Always" or "On scroll up", or the Logo reveal
 *      style, which is always sticky): once scrolled, `is-scrolled` is
 *      added so header.css can swap in the configured sticky background
 *      color and a hairline shadow.
 *    - "On scroll up" (`[data-hide-on-scroll]`): the header additionally
 *      hides itself (translates off-screen) while the visitor scrolls
 *      down, past its own height, and reappears as soon as they scroll up.
 *    - Logo reveal style: the header's compact logo eases in continuously
 *      as the visitor scrolls past the full-width hero logo block, in
 *      step with the hero logo easing out — both driven by the same
 *      scroll progress value (0 to 1), exposed as the
 *      --header-hero-progress custom property on both elements for
 *      header.css to consume.
 */
(function () {
  if (window.__headerScrollBound) return;
  window.__headerScrollBound = true;

  // Any scroll at all counts as "scrolled" for a plain sticky/overlay
  // header, so `is-scrolled` (and whatever it triggers in header.css)
  // reacts on the very first scroll instead of waiting for a scroll
  // distance. This doesn't affect the Logo reveal style, which
  // intentionally waits until the visitor has scrolled past the full
  // hero block (see the `hero` branch below).
  var SCROLL_THRESHOLD = 0;

  function updateAnnouncementBarHeight() {
    var bar = document.querySelector('.announcement-bar');
    var height = bar ? bar.offsetHeight : 0;
    document.documentElement.style.setProperty('--announcement-bar-height', height + 'px');
  }

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
        // The hero logo's own fade/scale still tracks real scroll progress
        // through the hero (0 to 1) continuously — that part is unchanged.
        // `is-scrolled` (solid background + shadow) is intentionally NOT
        // tied to that same progress value: gating it at progress >= 1
        // meant waiting until the visitor had scrolled past the entire
        // hero block before the header looked "stuck", which reads as a
        // multi-scroll delay. It now reacts to the same first-scroll
        // threshold as any other sticky header.
        var distance = Math.max(hero.offsetHeight, 1);
        var progress = Math.min(1, Math.max(0, scrollY / distance));
        hero.style.setProperty('--header-hero-progress', progress);
        header.style.setProperty('--header-hero-progress', progress);
      }

      header.classList.toggle('is-scrolled', scrollY > SCROLL_THRESHOLD);

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
    updateAnnouncementBarHeight();
    document.querySelectorAll('.header[data-watch-scroll]').forEach(bind);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('resize', updateAnnouncementBarHeight, { passive: true });

  // Re-measure/re-bind when a section is added, edited or removed in the
  // theme editor (announcement bar height can change, or a header can be
  // swapped in for the first time).
  document.addEventListener('shopify:section:load', function (event) {
    updateAnnouncementBarHeight();
    var header = event.target.querySelector && event.target.querySelector('.header[data-watch-scroll]');
    if (header) bind(header);
  });
  document.addEventListener('shopify:section:unload', updateAnnouncementBarHeight);
})();
