/**
 * Site header behavior.
 *
 * Everything else the header needs (sticky positioning, the logo entrance
 * animation, desktop dropdowns, the drawer's open/close/slide transition)
 * is handled by header.css and the theme's existing `theme-panel` custom
 * element (snippets/theme-panel.liquid), which already provides ESC-to-
 * close, outside-click-to-close and scroll locking for the drawer dialog.
 *
 * The only behavior that genuinely needs JavaScript is toggling the
 * "scrolled" state of a header that's both sticky and set to overlay mode:
 * it starts transparent over the page content and should switch to its
 * normal solid appearance once the visitor scrolls.
 */
(function () {
  if (window.__headerScrollBound) return;
  window.__headerScrollBound = true;

  var SCROLL_THRESHOLD = 8;

  function bind(header) {
    var ticking = false;

    function update() {
      ticking = false;
      header.classList.toggle('is-scrolled', window.scrollY > SCROLL_THRESHOLD);
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
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
