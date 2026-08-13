/**
 * db-storage.js
 * Replaces window.localStorage with IPC-backed persistent storage when
 * running inside the Electron desktop app. Include as the FIRST script in
 * each page that uses localStorage.
 *
 * Works in both the main frame (has preload-exposed electronStorage) and
 * in content iframes (accesses the API via window.parent).
 */
(function () {
    'use strict';

    // Resolve the IPC storage bridge exposed by preload.js via contextBridge.
    // Main frame: window.electronStorage is set directly.
    // Iframe: the parent frame carries it (same-origin file:// pages).
    var api =
        (typeof window.electronStorage !== 'undefined' && window.electronStorage) ||
        (window.parent &&
            window.parent !== window &&
            typeof window.parent.electronStorage !== 'undefined' &&
            window.parent.electronStorage) ||
        null;

    if (!api) {
        // Not running in the desktop app — keep native localStorage unchanged.
        return;
    }

    // Migrate any data already in localStorage (first launch after upgrade).
    try {
        if (api.keys().length === 0 && window.localStorage && window.localStorage.length > 0) {
            for (var i = 0; i < window.localStorage.length; i++) {
                var k = window.localStorage.key(i);
                if (k !== null) {
                    api.set(k, window.localStorage.getItem(k));
                }
            }
        }
    } catch (_) { /* best-effort migration */ }

    // Proxy object with the same interface as localStorage.
    var storageProxy = {
        getItem: function (key) { return api.get(String(key)); },
        setItem: function (key, value) { api.set(String(key), String(value)); },
        removeItem: function (key) { api.remove(String(key)); },
        clear: function () { api.clear(); },
        key: function (index) {
            var keys = api.keys();
            return (index >= 0 && index < keys.length) ? keys[index] : null;
        },
        get length() { return api.keys().length; }
    };

    // Override window.localStorage with the proxy.
    try {
        Object.defineProperty(window, 'localStorage', {
            configurable: true,
            enumerable: true,
            get: function () { return storageProxy; }
        });
    } catch (_) {
        // Last-resort fallback for environments where defineProperty fails.
        window.localStorage = storageProxy;
    }
})();
