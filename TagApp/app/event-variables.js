// event-variables.js
// Shared helper for reading/writing event-level values across all pages.
(function () {
  const STORAGE_KEY = 'eventVariables.v1';

  function normalizeDifficulty(value) {
    const diff = String(value || '').trim().toLowerCase();
    if (diff === 'max' || diff === 'hard') return 'hard';
    if (diff === 'min' || diff === 'easy') return 'easy';
    return 'medium';
  }

  function safeParse(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.error('EventVariables: invalid JSON in storage', error);
      return null;
    }
  }

  function normalize(data) {
    const source = data || {};
    return {
      eventName: source.eventName || '',
      eventNumber: source.eventNumber || '',
      totalEventBuild: source.totalEventBuild || '',
      players: source.players || '',
      eventDays: source.eventDays || '',
      totalAdventures: source.totalAdventures || '',
      eventDifficulty: normalizeDifficulty(source.eventDifficulty),
      totalEventAplEasy: source.totalEventAplEasy || '',
      totalEventAplMedium: source.totalEventAplMedium || '',
      totalEventAplHard: source.totalEventAplHard || '',
      playersPerAdventure: source.playersPerAdventure || '',
      updatedAt: source.updatedAt || ''
    };
  }

  function get() {
    try {
      return normalize(safeParse(localStorage.getItem(STORAGE_KEY)));
    } catch (error) {
      console.error('EventVariables: failed to read storage', error);
      return normalize(null);
    }
  }

  function set(partialOrFull) {
    const merged = {
      ...get(),
      ...(partialOrFull || {}),
      updatedAt: new Date().toISOString()
    };
    const payload = normalize(merged);
    payload.updatedAt = merged.updatedAt;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent('event-variables-changed', { detail: payload }));
      return payload;
    } catch (error) {
      console.error('EventVariables: failed to write storage', error);
      return normalize(partialOrFull);
    }
  }

  function clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      const payload = normalize(null);
      window.dispatchEvent(new CustomEvent('event-variables-changed', { detail: payload }));
      return payload;
    } catch (error) {
      console.error('EventVariables: failed to clear storage', error);
      return normalize(null);
    }
  }

  function buildTitle(data) {
    const vars = normalize(data);
    const parts = [];

    if (vars.eventNumber) {
      parts.push(`E${vars.eventNumber}`);
    }
    if (vars.eventName) {
      parts.push(vars.eventName);
    }

    return parts.join(' - ');
  }

  function onChange(handler) {
    if (typeof handler !== 'function') return () => {};

    const listener = (event) => {
      handler(normalize(event.detail));
    };

    window.addEventListener('event-variables-changed', listener);
    return () => window.removeEventListener('event-variables-changed', listener);
  }

  window.EventVariables = {
    key: STORAGE_KEY,
    get,
    set,
    clear,
    buildTitle,
    onChange
  };
})();
