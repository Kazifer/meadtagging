// nav-loader.js
// Iframe-only navigation loader — loads linked pages into an iframe below the nav.
(function () {
    const nav = document.querySelector('nav');
    const content = document.getElementById('content');
    const links = Array.from(document.querySelectorAll('ul.menu a'));

    if (!nav || !content) return;

    // Helper to compute iframe top and height so it fills viewport below the nav
    function positionIframe(iframe) {
        const navRect = nav.getBoundingClientRect();
        const top = Math.ceil(navRect.bottom);
        iframe.style.top = top + 'px';
        iframe.style.height = `calc(100vh - ${top}px)`;
        // reserve space in the content area
        content.style.marginBottom = iframe.style.height;
    }

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'content-frame';
    iframe.setAttribute('title', 'Page content');
    iframe.style.position = 'fixed';
    iframe.style.left = '0';
    iframe.style.right = '0';
    iframe.style.width = '100%';
    iframe.style.border = '0';
    iframe.style.zIndex = '1';
    iframe.style.background = '#111827';
    document.body.appendChild(iframe);

    // position now and on resize/scroll
    positionIframe(iframe);
    window.addEventListener('resize', () => positionIframe(iframe));
    window.addEventListener('scroll', () => positionIframe(iframe));

    iframe.addEventListener('load', () => console.info('nav-loader: iframe loaded', iframe.src));

    function setActive(link) {
        links.forEach(a => a.classList.remove('active'));
        if (link) link.classList.add('active');
    }

    function resolvePath(href) {
        try {
            const u = new URL(href, location.href);
            return u.pathname + u.search;
        } catch (e) {
            return href;
        }
    }

    function findLinkByPath(path) {
        return links.find(a => {
            const p = resolvePath(a.getAttribute('href'));
            return decodeURIComponent(p) === decodeURIComponent(path) || p === path;
        });
    }

    function loadUrl(hrefOrUrl, push = true) {
        const target = new URL(hrefOrUrl, location.href);
        const urlToLoad = target.href;
        const stateUrl = target.pathname + target.search;
        console.debug('nav-loader: loading into iframe', urlToLoad);

        return new Promise((resolve, reject) => {
            const onLoad = () => {
                iframe.removeEventListener('load', onLoad);
                iframe.removeEventListener('error', onError);
                resolve();
            };
            const onError = (e) => {
                iframe.removeEventListener('load', onLoad);
                iframe.removeEventListener('error', onError);
                reject(e);
            };

            iframe.addEventListener('load', onLoad);
            iframe.addEventListener('error', onError);

            iframe.src = urlToLoad;

            if (push) {
                try {
                    history.pushState({url: stateUrl}, '', stateUrl);
                } catch (e) {
                    console.warn('nav-loader: history.pushState failed', e && e.message);
                }
            }
        });
    }

    // Intercept link clicks
    nav.addEventListener('click', function (e) {
        const a = e.target.closest('a');
        if (!a) return;
        const href = a.getAttribute('href');
        if (!href) return;

        let target;
        try {
            target = new URL(href, location.href);
        } catch (err) {
            return; // invalid URL
        }

        if (target.origin === location.origin && target.pathname.toLowerCase().endsWith('.html')) {
            e.preventDefault();
            setActive(a);
            loadUrl(target.href, true).catch(err => console.error('nav-loader: iframe navigation failed', err));
        }
    });

    // popstate handling
    window.addEventListener('popstate', function (e) {
        const state = e.state;
        const path = (state && state.url) ? state.url : (location.pathname + location.search);
        loadUrl(path, false).then(() => {
            const match = findLinkByPath(path);
            setActive(match);
        }).catch(() => {});
    });

    // initial load
    (function initial() {
        const initialPath = location.pathname + location.search;
        const idx = initialPath.split('/').pop().toLowerCase();
        if (idx && idx !== '' && idx !== 'index.html') {
            const match = findLinkByPath(initialPath);
            if (match) {
                setActive(match);
                loadUrl(match.href, false).catch(() => {});
            }
        }
    })();
})();
