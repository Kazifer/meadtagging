const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApp', {
  platform: process.platform,
  isDesktop: true
});

contextBridge.exposeInMainWorld('electronStorage', {
  get:    (key)        => ipcRenderer.sendSync('storage-get', key),
  set:    (key, value) => ipcRenderer.sendSync('storage-set', key, value),
  remove: (key)        => ipcRenderer.sendSync('storage-remove', key),
  clear:  ()           => ipcRenderer.sendSync('storage-clear'),
  keys:   ()           => ipcRenderer.sendSync('storage-keys')
});
