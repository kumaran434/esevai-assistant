const { app, ipcMain, BrowserView, BrowserWindow, screen, dialog, clipboard, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { preloadPath } = require('./automation-logic.cjs');

let portalViews = {}; // tabId -> BrowserView
let activeTabId = null;
let sidebarWidthPercent = 0.4;
let portalView = null;
let portalWin = null;
let assistantView = null;
let lastFile = null;

function handleNewWindowOpen(url, webContents) {
  try {
    const lowerUrl = url.toLowerCase();
    
    // Check if it's a PDF, document or zip file download
    const isDownloadOrPdf = lowerUrl.endsWith('.pdf') || 
                            lowerUrl.endsWith('.zip') || 
                            lowerUrl.endsWith('.docx') || 
                            lowerUrl.endsWith('.xlsx') || 
                            lowerUrl.includes('pdf') || 
                            lowerUrl.includes('download') ||
                            lowerUrl.includes('receipt') ||
                            lowerUrl.includes('certificate');

    if (isDownloadOrPdf) {
      try {
        // Trigger a direct, cookie-preserving download inside the same session context
        webContents.downloadURL(url);
        return;
      } catch (err) {
        console.error('Failed to trigger direct downloadURL:', err);
      }
    }

    // Check if it's an external user guide, help site, or a sensitive banking page
    const isExternalOrPayment = lowerUrl.includes('payment') || 
                                 lowerUrl.includes('bank') || 
                                 lowerUrl.includes('paytm') || 
                                 lowerUrl.includes('sbi') || 
                                 lowerUrl.includes('hdfc') || 
                                 lowerUrl.includes('icici') || 
                                 lowerUrl.includes('checkout') ||
                                 lowerUrl.includes('google.com') ||
                                 lowerUrl.includes('youtube.com') ||
                                 lowerUrl.includes('manual') ||
                                 lowerUrl.includes('help');

    if (isExternalOrPayment || !url.startsWith('http')) {
      // Open link directly inside default primary browser (Default Chrome / Edge / Firefox)
      shell.openExternal(url).catch(err => {
        console.error('Failed to open external url:', err);
      });
    } else {
      // Create a gorgeous new popup window inside Electron itself.
      // This shares session/cookies automatically with the main window and portal view,
      // preventing logouts or losing the original e-Sevai list context.
      const parentWin = BrowserWindow.fromWebContents(webContents);
      const childWin = new BrowserWindow({
        width: 1200,
        height: 800,
        parent: parentWin || undefined,
        autoHideMenuBar: true,
        title: "e-Gov Assistant Portal - Interactive Popup",
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: false,
          preload: preloadPath
        }
      });

      childWin.loadURL(url).catch(err => {
        console.error('Failed to load popup url:', err);
      });

      // Handle nested windows or popups within this child window too
      childWin.webContents.setWindowOpenHandler(({ url: childUrl }) => {
        handleNewWindowOpen(childUrl, childWin.webContents);
        return { action: 'deny' };
      });
    }
  } catch (err) {
    console.error('Error handling window open:', err);
    webContents.loadURL(url).catch(() => {});
  }
}

function setupIpcHandlers(mainWindow) {
  ipcMain.on('save-file-to-disk', async (event, { data, name, type }) => {
    const filters = [];
    if (type === 'application/pdf') {
      filters.push({ name: 'PDF Documents', extensions: ['pdf'] });
    } else if (type?.startsWith('image/')) {
      const ext = type.split('/')[1] || 'jpg';
      filters.push({ name: 'Images', extensions: [ext, 'jpg', 'jpeg', 'png'] });
    }

    const parentWin = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    const { filePath } = await dialog.showSaveDialog(parentWin, {
      defaultPath: name,
      title: 'Save File',
      filters: filters.length > 0 ? filters : undefined
    });

    if (filePath) {
      const buffer = Buffer.from(data, 'base64');
      fs.writeFile(filePath, buffer, (err) => {
        if (err) {
          event.reply('automation-technical-log', { stage: 'SAVE', message: 'சேமிப்பதில் பிழை: ' + err.message });
        } else {
          event.reply('automation-technical-log', { stage: 'SAVE', message: 'ஆவணம் சேமிக்கப்பட்டது: ' + filePath });
          try {
            shell.showItemInFolder(filePath);
          } catch (e) {
            console.error('Error showing saved item in folder:', e);
          }
        }
      });
    }
  });

  ipcMain.on('copy-image-to-clipboard', (event, { data, type }) => {
    try {
      const img = nativeImage.createFromDataURL(`data:${type};base64,${data}`);
      clipboard.writeImage(img);
      event.reply('automation-technical-log', { stage: 'CLIPBOARD', message: 'ஆவணம் கிளிப்போர்டில் நகலெடுக்கப்பட்டது.' });
    } catch (e) {
      event.reply('automation-technical-log', { stage: 'CLIPBOARD', message: 'நகலெடுப்பதில் சிக்கல்: ' + e.message });
    }
  });

  ipcMain.on('download-file', async (event, { dataUrl, fileName, type }) => {
    const filters = [];
    if (type === 'application/pdf') {
      filters.push({ name: 'PDF Documents', extensions: ['pdf'] });
    } else if (type?.startsWith('image/') || fileName.match(/\.(jpg|jpeg|png|gif)$/i)) {
      filters.push({ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] });
    }

    const parentWin = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    const { filePath } = await dialog.showSaveDialog(parentWin, {
      defaultPath: fileName,
      title: 'Save File',
      filters: filters.length > 0 ? filters : undefined
    });

    if (filePath) {
      const base64Data = dataUrl.replace(/^data:.*?;base64,/, "");
      fs.writeFile(filePath, base64Data, 'base64', (err) => {
        if (err) {
          event.reply('download-result', { success: false, error: err.message });
          event.reply('automation-technical-log', { stage: 'DOWNLOAD_ERROR', message: 'பதிவிறக்கம் செய்வதில் பிழை: ' + err.message });
        } else {
          event.reply('download-result', { success: true, path: filePath });
          event.reply('automation-technical-log', { stage: 'DOWNLOAD_SUCCESS', message: 'ஆவணம் வெற்றிகரமாக பதிவிறக்கம் செய்யப்பட்டது: ' + path.basename(filePath) });
          try {
            shell.showItemInFolder(filePath);
          } catch (e) {
            console.error('Error showing downloaded item in folder:', e);
          }
        }
      });
    }
  });

  ipcMain.on('show-item-in-folder', (event, filePath) => {
    if (filePath && fs.existsSync(filePath)) {
      shell.showItemInFolder(filePath);
    }
  });

  const updatePortalBounds = () => {
    if (!mainWindow || mainWindow.isDestroyed() || !portalView || portalView.webContents.isDestroyed()) return;
    const bounds = mainWindow.getContentBounds();
    const sidebarWidth = Math.floor(bounds.width * sidebarWidthPercent);
    const dividerWidth = 8; // Matches React's 'w-2' sleek divider width perfectly
    portalView.setBounds({
      x: sidebarWidth + dividerWidth, 
      y: 56,
      width: Math.max(0, bounds.width - sidebarWidth - dividerWidth),
      height: Math.max(0, bounds.height - 56)
    });
  };

  ipcMain.on('update-sidebar-width', (event, percent) => {
    sidebarWidthPercent = percent;
    updatePortalBounds();
  });

  ipcMain.on('set-resizing-state', (event, resizing) => {
    if (portalView && !portalView.webContents.isDestroyed()) {
      try {
        portalView.webContents.setIgnoreMouseEvents(resizing, { forward: true });
        const js = resizing 
          ? "document.documentElement.style.pointerEvents = 'none'; document.documentElement.style.userSelect = 'none';" 
          : "document.documentElement.style.pointerEvents = 'auto'; document.documentElement.style.userSelect = 'auto';";
        portalView.webContents.executeJavaScript(js);
      } catch (err) {
        console.error('Error setting resizing state:', err);
      }
    }
  });

  mainWindow.on('resize', updatePortalBounds);

  function switchToTab(id) {
    if (portalView && !portalView.webContents.isDestroyed()) {
      try {
        mainWindow.removeBrowserView(portalView);
      } catch (err) {
        console.error('Error removing BrowserView in switchToTab:', err);
      }
      portalView = null;
    }
    
    activeTabId = id;
    
    if (!portalViews[id] || portalViews[id].webContents.isDestroyed()) {
      return;
    }
    
    portalView = portalViews[id];
    try {
      mainWindow.addBrowserView(portalView);
      updatePortalBounds();
    } catch (err) {
      console.error('Error adding BrowserView to mainWindow in switchToTab:', err);
    }
  }

  ipcMain.on('switch-tab', (event, id) => {
    switchToTab(id);
  });

  ipcMain.on('close-tab', (event, id) => {
    if (portalViews[id]) {
      if (!portalViews[id].webContents.isDestroyed()) {
        mainWindow.removeBrowserView(portalViews[id]);
        portalViews[id].webContents.destroy();
      }
      delete portalViews[id];
    }
    if (activeTabId === id) {
      activeTabId = null;
      portalView = null;
    }
  });

  ipcMain.on('open-portal', (event, arg) => {
    let id, url, name;
    if (typeof arg === 'object' && arg !== null) {
      id = arg.id;
      url = arg.url;
      name = arg.name;
    } else {
      id = 'default-tab';
      url = arg;
      name = 'Default';
    }

    if (portalViews[id] && !portalViews[id].webContents.isDestroyed()) {
      switchToTab(id);
      return;
    }

    const newView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false,
        preload: preloadPath
      }
    });

    newView.setBackgroundColor('#ffffff');
    portalViews[id] = newView;
    
    if (portalView && !portalView.webContents.isDestroyed()) {
      mainWindow.removeBrowserView(portalView);
    }
    activeTabId = id;
    portalView = newView;
    mainWindow.addBrowserView(newView);
    updatePortalBounds();
    newView.setAutoResize({ width: true, height: true });

    newView.webContents.setWindowOpenHandler(({ url: childUrl }) => {
      const isDownloadOrPdf = childUrl.toLowerCase().endsWith('.pdf') || 
                              childUrl.toLowerCase().endsWith('.zip') || 
                              childUrl.toLowerCase().endsWith('.docx') || 
                              childUrl.toLowerCase().endsWith('.xlsx') ||
                              childUrl.toLowerCase().includes('pdf') || 
                              childUrl.toLowerCase().includes('download') ||
                              childUrl.toLowerCase().includes('receipt') ||
                              childUrl.toLowerCase().includes('certificate');

      if (isDownloadOrPdf) {
        try {
          newView.webContents.downloadURL(childUrl);
        } catch (err) {
          console.error('Failed to trigger download in BrowserView popup:', err);
        }
      } else {
        mainWindow.webContents.send('new-tab-opened', { url: childUrl, name: 'இணையதளப் பக்கம்' });
      }
      return { action: 'deny' };
    });

    // Intercept standard page navigations that are downloads (like receipt PDFs/forms)
    newView.webContents.on('will-navigate', (event, navigationUrl) => {
      const lower = navigationUrl.toLowerCase();
      const isDownloadOrPdf = lower.endsWith('.pdf') || 
                              lower.endsWith('.zip') || 
                              lower.endsWith('.docx') || 
                              lower.endsWith('.xlsx') || 
                              lower.includes('pdf') || 
                              lower.includes('download') ||
                              lower.includes('receipt') ||
                              lower.includes('certificate');
      
      if (isDownloadOrPdf) {
        event.preventDefault();
        try {
          newView.webContents.downloadURL(navigationUrl);
        } catch (err) {
          console.error('Failed navigation direct download in BrowserView:', err);
        }
      }
    });

    newView.webContents.loadURL(url);
  });

  ipcMain.on('hide-portal-views', () => {
    if (portalView && !portalView.webContents.isDestroyed()) {
      try {
        mainWindow.removeBrowserView(portalView);
      } catch (err) {
        console.error('Error removing BrowserView:', err);
      }
    }
  });

  ipcMain.on('close-portal', () => {
    Object.keys(portalViews).forEach(id => {
      if (portalViews[id]) {
        if (!portalViews[id].webContents.isDestroyed()) {
          mainWindow.removeBrowserView(portalViews[id]);
          portalViews[id].webContents.destroy();
        }
      }
    });
    portalViews = {};
    activeTabId = null;
    portalView = null;
  });

  ipcMain.on('portal-back', () => {
    if (portalView && !portalView.webContents.isDestroyed() && portalView.webContents.canGoBack()) {
      portalView.webContents.goBack();
    }
  });

  ipcMain.on('portal-forward', () => {
    if (portalView && !portalView.webContents.isDestroyed() && portalView.webContents.canGoForward()) {
      portalView.webContents.goForward();
    }
  });

  ipcMain.on('portal-reload', () => {
    if (portalView && !portalView.webContents.isDestroyed()) {
      portalView.webContents.reload();
    }
  });

  ipcMain.on('page-analysis-request', () => {
    if (portalView && !portalView.webContents.isDestroyed()) {
      portalView.webContents.send('analyze-page');
    }
    if (portalWin && !portalWin.isDestroyed()) {
      portalWin.webContents.send('analyze-page');
    }
  });

  ipcMain.on('trigger-fill', (event, data) => {
    console.log('IPC: trigger-fill received', { hasFiles: !!data.files, mappingCount: Object.keys(data.mapping || {}).length });
    if (portalView && !portalView.webContents.isDestroyed()) {
      portalView.webContents.send('fill-data', data);
    }
    if (portalWin && !portalWin.isDestroyed()) {
      portalWin.webContents.send('fill-data', { ...data, file: data.file || lastFile });
    }
  });

  ipcMain.on('fill-execution-success', (event, result) => {
    console.log('IPC: fill-execution-success', result);
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('fill-execution-success', result);
    if (assistantView && !assistantView.webContents.isDestroyed()) assistantView.webContents.send('fill-execution-success', result);
  });

  ipcMain.on('page-analysis-result', (event, result) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('portal-fields-detected', result);
    }
    if (assistantView && !assistantView.webContents.isDestroyed()) {
      assistantView.webContents.send('portal-fields-detected', result);
    }
  });

  // Removed duplicate trigger-fill and moved logic above

  ipcMain.on('automation-technical-log', (event, log) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('automation-technical-log', log);
    if (assistantView && !assistantView.webContents.isDestroyed()) assistantView.webContents.send('automation-technical-log', log);
  });

  ipcMain.on('automation-error', (event, error) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('fill-execution-error', error);
    if (assistantView && !assistantView.webContents.isDestroyed()) assistantView.webContents.send('fill-execution-error', error);
  });

  ipcMain.on('start-drag', (event, { data, name, type }) => {
    // Sanitize name for file system
    const safeName = name.replace(/[^a-z0-9.]/gi, '_');
    const tempPath = path.join(app.getPath('userData'), `drag_${Date.now()}_${safeName}`);
    
    // Remove the data URI prefix if present
    const base64Data = data.replace(/^data:.*?;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    
    try {
      fs.writeFileSync(tempPath, buffer);
      // Use a generic file icon (base64) - ensuring it's valid
      const iconDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAACLSURBVGhD7dfBCYAwDAbghd0X92An6EwdpYOYEwcxXfWjIETfH/mHkEBSatO6+f5m99X9WvYfL3YfT3YfT3YfT3YfT3YfT3YfT3YfT3YfT3YfT3YfT3YfT3YfT3YfT3YfT3YfT3YfT3YfT3YfT3YfT3YfT3YfT3Yf97/8r58D3P97EAcwB8UA7mUfA7iXfQzgXvYzgHvfAzB6mZ8oAQAA';
      const icon = nativeImage.createFromDataURL(iconDataUrl);
      
      event.sender.startDrag({
        file: tempPath,
        icon: icon
      });
      
      event.reply('automation-technical-log', { stage: 'DRAG_START', message: 'இழுக்கும் பணி தொடங்கியது: ' + name });
    } catch (err) {
      console.error('Drag error:', err);
      event.reply('automation-technical-log', { stage: 'DRAG_ERROR', message: 'கோப்பு தற்காலிகமாக சேமிப்பதில் பிழை: ' + err.message });
    }
  });

  ipcMain.on('toggle-assistant-expansion', (event, expanded) => {
    if (!portalWin || portalWin.isDestroyed() || !assistantView) return;
    const bounds = portalWin.getContentBounds();
    if (expanded) {
      assistantView.setBounds({ x: bounds.width - 380, y: 0, width: 380, height: bounds.height });
    } else {
      assistantView.setBounds({ x: bounds.width - 70, y: 40, width: 60, height: 60 });
    }
  });

  ipcMain.on('open-portal-window', (event, { url }) => {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: sw, height: sh } = primaryDisplay.workAreaSize;

    if (portalWin && !portalWin.isDestroyed()) {
      portalWin.loadURL(url);
      portalWin.focus();
      return;
    }

    portalWin = new BrowserWindow({
      width: sw - 100, x: 50, height: sh - 100, y: 50,
      title: "e-Gov Portal AI Assisted",
      autoHideMenuBar: true,
      webPreferences: { nodeIntegration: false, contextIsolation: true, webSecurity: false, preload: preloadPath }
    });

    portalWin.loadURL(url);

    portalWin.webContents.setWindowOpenHandler(({ url }) => {
      handleNewWindowOpen(url, portalWin.webContents);
      return { action: 'deny' };
    });

    // Intercept navigation downloads on portal window
    portalWin.webContents.on('will-navigate', (event, navigationUrl) => {
      const lower = navigationUrl.toLowerCase();
      const isDownloadOrPdf = lower.endsWith('.pdf') || 
                              lower.endsWith('.zip') || 
                              lower.endsWith('.docx') || 
                              lower.endsWith('.xlsx') || 
                              lower.includes('pdf') || 
                              lower.includes('download') ||
                              lower.includes('receipt') ||
                              lower.includes('certificate');
      
      if (isDownloadOrPdf) {
        event.preventDefault();
        try {
          portalWin.webContents.downloadURL(navigationUrl);
        } catch (err) {
          console.error('Failed navigation direct download in portalWin:', err);
        }
      }
    });

    assistantView = new BrowserView({
      webPreferences: { nodeIntegration: true, contextIsolation: false, webSecurity: false }
    });
    portalWin.addBrowserView(assistantView);
    
    const updateBounds = () => {
      if (!portalWin || portalWin.isDestroyed() || !assistantView) return;
      const b = portalWin.getContentBounds();
      assistantView.setBounds({ x: b.width - 70, y: 40, width: 60, height: 60 });
    };
    updateBounds();
    portalWin.on('resize', updateBounds);

    const appUrl = mainWindow.webContents.getURL();
    assistantView.webContents.loadURL(`${appUrl.split('#')[0]}#/assistant-overlay`);

    portalWin.on('closed', () => {
      portalWin = null; assistantView = null;
      if (!mainWindow.isDestroyed()) mainWindow.webContents.send('portal-window-closed');
    });
  });

  // -------------------------------------------------------------------------
  // PORTAL CREDENTIALS AUTO-FILL MANAGER IPC HANDLERS
  // -------------------------------------------------------------------------
  const credentialsPath = path.join(app.getPath('userData'), 'credentials.json');

  function readCredentials() {
    try {
      if (fs.existsSync(credentialsPath)) {
        return JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      }
    } catch (err) {
      console.error('Error reading credentials:', err);
    }
    return {};
  }

  function writeCredentials(creds) {
    try {
      fs.writeFileSync(credentialsPath, JSON.stringify(creds, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('Error writing credentials:', err);
      return false;
    }
  }

  ipcMain.on('get-all-credentials', (event) => {
    event.reply('all-credentials-loaded', readCredentials());
  });

  ipcMain.on('save-credentials', (event, { id, name, url, username, password, autoLogin }) => {
    const creds = readCredentials();
    const credId = id || url || String(Date.now());
    creds[credId] = { id: credId, name, url, username, password, autoLogin };
    writeCredentials(creds);
    event.reply('credentials-saved-success', creds);
  });

  ipcMain.on('delete-credentials', (event, id) => {
    const creds = readCredentials();
    if (creds[id]) {
      delete creds[id];
      writeCredentials(creds);
    }
    event.reply('credentials-saved-success', creds);
  });

  ipcMain.on('sync-credentials-to-electron', (event, credsMap) => {
    writeCredentials(credsMap || {});
    event.reply('all-credentials-loaded', credsMap);
  });

  ipcMain.on('get-portal-credentials-request', (event, pageUrl) => {
    const creds = readCredentials();
    const cleanUrl = pageUrl.toLowerCase();
    
    const match = Object.values(creds).find(c => {
      if (!c.url || !c.username || !c.password) return false;
      const cleanTarget = c.url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
      const cleanPage = cleanUrl.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
      return cleanPage.includes(cleanTarget) || cleanTarget.includes(cleanPage);
    });

    if (match) {
      event.sender.send('fill-portal-credentials', match);
    }
  });

  // -------------------------------------------------------------------------
  // DESKTOP AUTO-UPDATE SYSTEM INTEGRATION
  // -------------------------------------------------------------------------
  ipcMain.on('get-app-version', (event) => {
    event.returnValue = app.getVersion();
  });

  let updateDownloadRequest = null;

  ipcMain.on('start-update-download', (event, { downloadUrl }) => {
    const https = require('https');
    const http = require('http');
    const fs = require('fs');
    const path = require('path');
    const { URL } = require('url');
    
    const tempDir = app.getPath('temp');
    const tempPath = path.join(tempDir, 'esevadraft-setup-latest.exe');
    
    // Clean old downloads if exist
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (e) { console.error(e); }
    }
    
    let file = null;
    
    const downloadFile = (currentUrl) => {
      let parsedUrl;
      try {
        parsedUrl = new URL(currentUrl);
      } catch (err) {
        event.reply('update-download-progress', { success: false, error: 'செல்லாத பதிவிறக்க முகவரி (Invalid URL)' });
        return;
      }
      const requestLib = parsedUrl.protocol === 'https:' ? https : http;
      
      updateDownloadRequest = requestLib.get(currentUrl, (response) => {
        // Handle redirect codes 301, 302, 307, 308 (critical for Cloud Run / GitHub/ Firebase Redirects)
        if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
          let redirectUrl = response.headers.location;
          if (!redirectUrl.startsWith('http')) {
            redirectUrl = new URL(redirectUrl, currentUrl).href;
          }
          downloadFile(redirectUrl);
          return;
        }
        
        if (response.statusCode !== 200) {
          event.reply('update-download-progress', { success: false, error: `ஹோஸ்ட் சர்வர் பிழை (HTTP Code ${response.statusCode})` });
          return;
        }
        
        const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;
        
        try {
          file = fs.createWriteStream(tempPath);
        } catch (fileErr) {
          event.reply('update-download-progress', { success: false, error: `கோப்பு உருவாக்க முடியவில்லை: ${fileErr.message}` });
          return;
        }
        
        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          const progress = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
          event.reply('update-download-progress', { success: true, progress, done: false });
        });
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          event.reply('update-download-progress', { success: true, progress: 100, done: true, path: tempPath });
        });

        file.on('error', (err) => {
          fs.unlink(tempPath, () => {});
          event.reply('update-download-progress', { success: false, error: `கோப்பு எழுதுவதில் பிழை: ${err.message}` });
        });
      }).on('error', (err) => {
        if (file) { fs.unlink(tempPath, () => {}); }
        event.reply('update-download-progress', { success: false, error: err.message });
      });
    };
    
    downloadFile(downloadUrl);
  });

  ipcMain.on('cancel-update-download', () => {
    if (updateDownloadRequest) {
      try {
        updateDownloadRequest.abort();
        updateDownloadRequest = null;
      } catch (e) {
        console.error(e);
      }
    }
  });

  ipcMain.on('install-and-restart-update', (event) => {
    const path = require('path');
    const fs = require('fs');
    
    const tempPath = path.join(app.getPath('temp'), 'esevadraft-setup-latest.exe');
    if (fs.existsSync(tempPath)) {
      // Windows-இல் NSIS இன்ஸ்டாலரை UAC விண்டோவுடன் சரியாக இயக்க shell.openPath மிகவும் நம்பகமானது.
      shell.openPath(tempPath).then((errResult) => {
        if (errResult) {
          event.reply('update-install-error', `இன்ஸ்டாலரைத் திறக்க முடியவில்லை: ${errResult}`);
        } else {
          // புதிய அப்டேட் கோப்பு இயங்கியவுடன், பழைய ஃபைல் பூட்டுகளை விடுவிக்க செயலியை மூட வேண்டும்.
          setTimeout(() => {
            app.quit();
          }, 1200);
        }
      }).catch(err => {
        event.reply('update-install-error', err.message);
      });
    } else {
      event.reply('update-install-error', 'புதிய நிறுவல் கோப்பு கண்டறிவதில் பிழை.');
    }
  });
}

module.exports = { setupIpcHandlers };
