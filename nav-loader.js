// nav-loader.js
// Iframe-only navigation loader — loads linked pages into an iframe below the nav.
(function () {
    const nav = document.querySelector('nav');
    const content = document.getElementById('content');
    const menuToggle = document.getElementById('menuToggle');
    const links = Array.from(document.querySelectorAll('ul.menu a'));
    const dropdowns = Array.from(document.querySelectorAll('.menu-group details'));

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

    // Position now and throttle resize/scroll updates to one layout pass per frame.
    let positionRafId = null;

    function scheduleIframePosition() {
        if (positionRafId !== null) return;
        positionRafId = window.requestAnimationFrame(() => {
            positionRafId = null;
            positionIframe(iframe);
        });
    }

    positionIframe(iframe);
    window.addEventListener('resize', scheduleIframePosition);
    window.addEventListener('scroll', scheduleIframePosition, { passive: true });

    function setMenuOpen(isOpen) {
        if (!menuToggle) return;
        nav.classList.toggle('menu-open', Boolean(isOpen));
        menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        scheduleIframePosition();
    }

    function closeAllDropdowns() {
        dropdowns.forEach((dropdown) => {
            dropdown.open = false;
        });
    }

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            const isOpen = !nav.classList.contains('menu-open');
            setMenuOpen(isOpen);
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 900 && nav.classList.contains('menu-open')) {
                setMenuOpen(false);
            }
        });
    }

    dropdowns.forEach((dropdown) => {
        dropdown.addEventListener('toggle', () => {
            if (!dropdown.open) return;

            dropdowns.forEach((other) => {
                if (other !== dropdown) {
                    other.open = false;
                }
            });
        });

        dropdown.addEventListener('focusout', (event) => {
            const nextFocused = event.relatedTarget;
            if (!dropdown.contains(nextFocused)) {
                dropdown.open = false;
            }
        });
    });

    document.addEventListener('click', (event) => {
        if (!nav.contains(event.target)) {
            closeAllDropdowns();
        }
    });

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

    function normalizeStateKey(value) {
        const raw = String(value || '').trim();
        if (!raw) return '';

        try {
            const url = new URL(raw, location.href);
            const current = new URL(location.href);
            if (canUseHistoryState()) {
                return url.pathname + url.search;
            }
            const segments = url.pathname.split('/');
            return decodeURIComponent(segments[segments.length - 1] || '').trim();
        } catch (e) {
            return decodeURIComponent(raw).trim();
        }
    }

    function findLinkByPath(path) {
        const targetKey = normalizeStateKey(path);
        return links.find(a => {
            const href = String(a.getAttribute('href') || '').trim();
            const p = resolvePath(a.getAttribute('href'));
            return normalizeStateKey(p) === targetKey
                || normalizeStateKey(href) === targetKey;
        });
    }

    function canUseHistoryState() {
        return location.protocol !== 'file:' && location.origin !== 'null';
    }

    function readHashPath() {
        const rawHash = String(location.hash || '');
        if (!rawHash.startsWith('#')) return '';
        return decodeURIComponent(rawHash.slice(1));
    }

    let suppressHashChangeLoad = false;

    function writeNavigationState(stateUrl, push) {
        if (canUseHistoryState()) {
            if (!push) return;
            try {
                history.pushState({ url: stateUrl }, '', stateUrl);
            } catch (e) {
                console.warn('nav-loader: history.pushState failed', e && e.message);
            }
            return;
        }

        const hashValue = `#${encodeURIComponent(normalizeStateKey(stateUrl))}`;
        if (push) {
            if (location.hash !== hashValue) {
                suppressHashChangeLoad = true;
                location.hash = hashValue;
            }
        } else if (location.hash !== hashValue) {
            location.replace(hashValue);
        }
    }

    function loadUrl(hrefOrUrl, push = true) {
        const target = new URL(hrefOrUrl, location.href);
        const urlToLoad = target.href;
        const stateUrl = canUseHistoryState()
            ? (target.pathname + target.search)
            : normalizeStateKey(hrefOrUrl);
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
            writeNavigationState(stateUrl, push);
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
            closeAllDropdowns();
            if (window.innerWidth <= 900) {
                setMenuOpen(false);
            }
            loadUrl(target.href, true).catch(err => console.error('nav-loader: iframe navigation failed', err));
        }
    });

    function handleNavigationStateChange(path) {
        const match = findLinkByPath(path);
        if (!match) {
            setActive(null);
            return;
        }

        loadUrl(match.getAttribute('href') || match.href, false).then(() => {
            setActive(match);
        }).catch(() => {});
    }

    // popstate handling
    window.addEventListener('popstate', function (e) {
        const state = e.state;
        const path = (state && state.url) ? state.url : (location.pathname + location.search);
        handleNavigationStateChange(path);
    });

    window.addEventListener('hashchange', function () {
        if (canUseHistoryState()) return;
        if (suppressHashChangeLoad) {
            suppressHashChangeLoad = false;
            return;
        }
        const path = readHashPath();
        if (!path) return;
        handleNavigationStateChange(path);
    });

    // initial load
    (function initial() {
        const hashPath = readHashPath();
        if (hashPath) {
            const match = findLinkByPath(hashPath);
            if (match) {
                setActive(match);
                loadUrl(match.href, false).catch(() => {});
                return;
            }
        }

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
