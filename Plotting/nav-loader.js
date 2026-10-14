// nav-loader.js
// Plain top-level navigation - links do normal full-page loads; this only
// highlights the active page and drives the mobile menu toggle/dropdowns.
// (Avoids iframe-based navigation, which Chromium blocks under file:// with
// "Unsafe attempt to load URL ... 'file:' URLs are treated as unique security origins".)
(function () {
    const nav = document.querySelector('nav');
    const menuToggle = document.getElementById('menuToggle');
    const links = Array.from(document.querySelectorAll('ul.menu a'));
    const dropdowns = Array.from(document.querySelectorAll('.menu-group details'));

    if (!nav) return;

    function setMenuOpen(isOpen) {
        if (!menuToggle) return;
        nav.classList.toggle('menu-open', Boolean(isOpen));
        menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
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

    // Close the mobile menu after a real link navigation is triggered.
    nav.addEventListener('click', function (e) {
        const a = e.target.closest('a');
        if (!a) return;
        closeAllDropdowns();
        if (window.innerWidth <= 900) {
            setMenuOpen(false);
        }
    });

    // Highlight the link matching the current page.
    function currentFileName() {
        const segments = location.pathname.split('/');
        return decodeURIComponent(segments[segments.length - 1] || '').toLowerCase();
    }

    const currentPage = currentFileName();
    links.forEach((a) => {
        const href = String(a.getAttribute('href') || '').trim();
        if (href && href.toLowerCase() === currentPage) {
            a.classList.add('active');
        }
    });
})();

