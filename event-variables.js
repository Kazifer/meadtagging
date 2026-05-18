// event-variables.js
// Shared helper for reading/writing event-level values across all pages.
(function () {
  const STORAGE_KEY = 'eventVariables.v1';
  const CLOUD_SYNC_KEY = 'eventVariables.cloudSyncId.v1';
  const CLOUD_API_BASE = 'https://jsonblob.com/api/jsonBlob';

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
      eventDifficulty: source.eventDifficulty || 'mid',
      updatedAt: source.updatedAt || ''
    };
  }

  function safeStorageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('EventVariables: failed to read storage key', key, error);
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('EventVariables: failed to write storage key', key, error);
      return false;
    }
  }

  function safeStorageRemove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('EventVariables: failed to clear storage key', key, error);
      return false;
    }
  }

  function dispatchChange(payload) {
    window.dispatchEvent(new CustomEvent('event-variables-changed', { detail: normalize(payload) }));
  }

  function extractBlobId(input) {
    const raw = String(input || '').trim();
    if (!raw) return '';
    const match = raw.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/);
    return match ? match[0] : '';
  }

  function getCloudSyncId() {
    return extractBlobId(safeStorageGet(CLOUD_SYNC_KEY));
  }

  function setCloudSyncId(syncId) {
    const normalizedId = extractBlobId(syncId);
    if (!normalizedId) {
      throw new Error('Invalid cloud sync ID');
    }

    safeStorageSet(CLOUD_SYNC_KEY, normalizedId);
    return normalizedId;
  }

  function clearCloudSyncId() {
    safeStorageRemove(CLOUD_SYNC_KEY);
  }

  function setLocal(partialOrFull, options = {}) {
    const shouldKeepUpdatedAt = Boolean(options.keepUpdatedAt);
    const merged = {
      ...get(),
      ...(partialOrFull || {})
    };

    if (!shouldKeepUpdatedAt) {
      merged.updatedAt = new Date().toISOString();
    }

    safeStorageSet(STORAGE_KEY, JSON.stringify(merged));
    const payload = normalize(merged);
    dispatchChange(payload);
    return payload;
  }

  function get() {
    try {
      return normalize(safeParse(safeStorageGet(STORAGE_KEY)));
    } catch (error) {
      console.error('EventVariables: failed to read storage', error);
      return normalize(null);
    }
  }

  function set(partialOrFull) {
    try {
      return setLocal(partialOrFull);
    } catch (error) {
      console.error('EventVariables: failed to write storage', error);
      return normalize(partialOrFull);
    }
  }

  function clear() {
    try {
      safeStorageRemove(STORAGE_KEY);
      const payload = normalize(null);
      dispatchChange(payload);
      return payload;
    } catch (error) {
      console.error('EventVariables: failed to clear storage', error);
      return normalize(null);
    }
  }

  async function fetchFromCloud(syncId) {
    const id = extractBlobId(syncId || getCloudSyncId());
    if (!id) return null;

    const response = await fetch(`${CLOUD_API_BASE}/${id}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Cloud fetch failed with status ${response.status}`);
    }

    const data = await response.json();
    return normalize(data);
  }

  async function saveToCloud(data, syncId) {
    const id = extractBlobId(syncId || getCloudSyncId());
    const payload = normalize(data);

    if (id) {
      const putResponse = await fetch(`${CLOUD_API_BASE}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!putResponse.ok) {
        throw new Error(`Cloud save failed with status ${putResponse.status}`);
      }

      return id;
    }

    const postResponse = await fetch(CLOUD_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!postResponse.ok) {
      throw new Error(`Cloud create failed with status ${postResponse.status}`);
    }

    const location = postResponse.headers.get('Location') || postResponse.headers.get('location') || '';
    const createdId = extractBlobId(location);

    if (!createdId) {
      throw new Error('Cloud create did not return a sync ID');
    }

    setCloudSyncId(createdId);
    return createdId;
  }

  async function saveWithCloud(partialOrFull, options = {}) {
    const payload = set(partialOrFull);
    const hasCloudSync = Boolean(getCloudSyncId());
    const shouldForceCreate = Boolean(options.forceCreateCloud);

    if (!hasCloudSync && !shouldForceCreate) {
      return {
        data: payload,
        cloudSyncId: ''
      };
    }

    const cloudSyncId = await saveToCloud(payload, options.cloudSyncId);
    return {
      data: payload,
      cloudSyncId
    };
  }

  async function loadFromCloud(syncId) {
    const data = await fetchFromCloud(syncId);
    if (!data) return null;

    return setLocal(data, { keepUpdatedAt: true });
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
    cloudKey: CLOUD_SYNC_KEY,
    get,
    set,
    clear,
    getCloudSyncId,
    setCloudSyncId,
    clearCloudSyncId,
    fetchFromCloud,
    saveToCloud,
    saveWithCloud,
    loadFromCloud,
    buildTitle,
    onChange
  };
})();
