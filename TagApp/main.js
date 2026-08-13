const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// --- Centralised JSON-file storage -------------------------------------------
// All localStorage-style keys from the renderer pages are mirrored here so
// that data survives browser cache clears, reinstalls, and profile changes.
let _storageData = {};
let _storagePath = '';

function _initStorage() {
    _storagePath = path.join(app.getPath('userData'), 'meadtagging-data.json');
    try {
        if (fs.existsSync(_storagePath)) {
            _storageData = JSON.parse(fs.readFileSync(_storagePath, 'utf-8'));
        }
    } catch (_e) {
        _storageData = {};
    }
}

function _flushStorage() {
    try { fs.writeFileSync(_storagePath, JSON.stringify(_storageData), 'utf-8'); } catch (_e) { /* ignore */ }
}

ipcMain.on('storage-get', (event, key) => {
    event.returnValue = Object.prototype.hasOwnProperty.call(_storageData, key) ? _storageData[key] : null;
});

ipcMain.on('storage-set', (event, key, value) => {
    _storageData[key] = value;
    _flushStorage();
    event.returnValue = null;
});

ipcMain.on('storage-remove', (event, key) => {
    delete _storageData[key];
    _flushStorage();
    event.returnValue = null;
});

ipcMain.on('storage-clear', (event) => {
    _storageData = {};
    _flushStorage();
    event.returnValue = null;
});

ipcMain.on('storage-keys', (event) => {
    event.returnValue = Object.keys(_storageData);
});
// -----------------------------------------------------------------------------

function createWindow() {
  const win = new BrowserWindow({
width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.loadFile(path.join(__dirname, 'app', 'index.html'));

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  _initStorage();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
