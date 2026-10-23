// Behavior for sections/blog.liquid: the tag filter and pagination load in
// place (Section Rendering API) instead of reloading the page. The URL is
// updated, so links stay shareable and Back / Forward work. Without
// JavaScript they are normal links.

if (!window.themeBlogAjax) {
  window.themeBlogAjax = true;

  const linkSelector = '.blog__tag[href], .pagination a[href]';

  const load = async (root, url, { push = true, scrollTo = null, focusHref = null } = {}) => {
    const sectionId = root.dataset.sectionId;
    root.classList.add('is-loading');
    root.setAttribute('aria-busy', 'true');

    try {
      const target = new URL(url, window.location.origin);
      target.searchParams.set('section_id', sectionId);
      const response = await fetch(target.toString());
      if (!response.ok) throw new Error(response.status);

      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      const fresh = doc.querySelector(`[data-blog-ajax][data-section-id="${sectionId}"]`);
      if (!fresh) throw new Error('missing section');

      root.innerHTML = fresh.innerHTML;
      if (push) window.history.pushState({ blogAjax: true }, '', url);

      // Cards added after load skip the scroll-reveal observer.
      root.querySelectorAll('[data-animate]').forEach((el) => el.classList.add('is-revealed'));

      if (focusHref) {
        root.querySelector(`.blog__tag[href="${CSS.escape(focusHref)}"]`)?.focus({ preventScroll: true });
      }
      if (scrollTo) {
        const anchor = root.querySelector(scrollTo) || root;
        const top = anchor.getBoundingClientRect().top + window.scrollY - 100;
        if (top < window.scrollY) window.scrollTo({ top, behavior: 'smooth' });
      }
    } catch (error) {
      window.location.href = url;
    } finally {
      root.classList.remove('is-loading');
      root.removeAttribute('aria-busy');
    }
  };

  document.addEventListener('click', (event) => {
    const link = event.target.closest(linkSelector);
    if (!link || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const root = link.closest('[data-blog-ajax]');
    if (!root) return;
    event.preventDefault();

    const isTag = link.classList.contains('blog__tag');
    load(root, link.href, {
      focusHref: isTag ? link.getAttribute('href') : null,
      // New page of results: bring the top of the list back into view.
      scrollTo: isTag ? null : '.blog__tags, .blog__grid',
    });
  });

  window.addEventListener('popstate', () => {
    const root = document.querySelector('[data-blog-ajax]');
    if (root) load(root, window.location.href, { push: false });
  });
}
