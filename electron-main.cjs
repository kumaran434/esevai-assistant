const { app, BrowserWindow, BrowserView, ipcMain, screen, session, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');

// Modular Imports
const { setupAutomation } = require('./main-process/automation-logic.cjs');
const { setupIpcHandlers } = require('./main-process/ipc-handlers.cjs');
const { setupSession } = require('./main-process/session-manager.cjs');
const { injectDebugScripts, setupShortcuts } = require('./main-process/utils.cjs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#ffffff',
    title: `TN e-Gov AI Helper Desktop - ${isDev ? 'Dev' : 'Prod'}`,
    icon: fs.existsSync(path.join(__dirname, 'build', 'icon.ico')) ? path.join(__dirname, 'build', 'icon.ico') : (fs.existsSync(path.join(__dirname, 'build', 'icon.png')) ? path.join(__dirname, 'build', 'icon.png') : undefined),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    }
  });

  // Load logic
  const isDevMode = !app.isPackaged;
  if (isDevMode) {
    win.loadURL('http://localhost:3000').catch(err => {
      dialog.showErrorBox('Dev Server Error', 'Make sure your dev server is running at http://localhost:3000\n' + err.message);
    });
  } else {
    // Path resolution as per production rules
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    win.loadFile(indexPath).catch(err => {
       const fallback = path.join(process.resourcesPath, 'app.asar', 'dist', 'index.html');
       win.loadFile(fallback).catch(() => {
         dialog.showErrorBox('Critical Missing File', 'Could not load application index.');
       });
    });
  }

  // Setup Modular Features
  injectDebugScripts(win);
  setupShortcuts(win);
  setupSession(win);
  setupIpcHandlers(win);
}

// App lifecycle
app.whenReady().then(() => {
  setupAutomation();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
