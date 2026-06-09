const { session, app, dialog, BrowserWindow, shell } = require('electron');
const path = require('path');

function setupSession(mainWindow) {
  // Bypass CORS for government portals
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['Origin'] = '*';
    callback({ deleteHeaders: ['Origin'], requestHeaders: details.requestHeaders });
  });

  // Strip security headers that prevent iframing (X-Frame-Options, CSP)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };
    
    // Remove headers that block framing
    Object.keys(headers).forEach(h => {
      const lower = h.toLowerCase();
      if (lower === 'x-frame-options' || lower === 'content-security-policy') {
        delete headers[h];
      }
    });

    callback({
      responseHeaders: {
        ...headers,
        // Optional: Ensure Access-Control-Allow-Origin is set if needed for scripts
        'Access-Control-Allow-Origin': ['*']
      }
    });
  });

  // Allow downloading files (manual triggers)
  session.defaultSession.on('will-download', (event, item, webContents) => {
    const fileName = item.getFilename();
    const parentWin = BrowserWindow.fromWebContents(webContents) || mainWindow;
    
    // Auto-save to Downloads folder with unique name to prevent overwrites, matching Chrome behavior!
    const defaultDownloadsPath = app.getPath('downloads');
    const savePath = path.join(defaultDownloadsPath, fileName);
    let finalSavePath = savePath;
    let count = 1;
    const ext = path.extname(fileName);
    const base = path.basename(fileName, ext);
    
    while (fs.existsSync(finalSavePath)) {
      finalSavePath = path.join(defaultDownloadsPath, `${base} (${count})${ext}`);
      count++;
    }

    item.setSavePath(finalSavePath);
    const downloadId = 'dl-' + Date.now();

    // Send initial start event
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download-progress-update', {
        id: downloadId,
        name: fileName,
        state: 'downloading',
        percent: 0,
        receivedBytes: 0,
        totalBytes: item.getTotalBytes(),
        path: finalSavePath
      });
    }

    item.on('updated', (event, state) => {
      if (state === 'progressing') {
        if (item.isPaused()) {
          console.log('Download is paused');
        } else {
          const total = item.getTotalBytes();
          const received = item.getReceivedBytes();
          const percent = total > 0 ? Math.round((received / total) * 100) : 0;
          
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-progress-update', {
              id: downloadId,
              name: fileName,
              state: 'downloading',
              percent: percent,
              receivedBytes: received,
              totalBytes: total,
              path: finalSavePath
            });
          }
        }
      } else if (state === 'interrupted') {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-progress-update', {
            id: downloadId,
            name: fileName,
            state: 'interrupted',
            percent: 0,
            receivedBytes: item.getReceivedBytes(),
            totalBytes: item.getTotalBytes(),
            path: finalSavePath
          });
        }
      }
    });

    item.once('done', (event, state) => {
      if (state === 'completed') {
        const filePath = item.getSavePath();
        const total = item.getTotalBytes();
        
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-progress-update', {
            id: downloadId,
            name: fileName,
            state: 'completed',
            percent: 100,
            receivedBytes: total,
            totalBytes: total,
            path: filePath
          });
        }
      } else if (state === 'cancelled') {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-progress-update', {
            id: downloadId,
            name: fileName,
            state: 'cancelled',
            percent: 0,
            receivedBytes: 0,
            totalBytes: 0,
            path: ''
          });
        }
      } else {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-progress-update', {
            id: downloadId,
            name: fileName,
            state: 'failed',
            percent: 0,
            receivedBytes: 0,
            totalBytes: 0,
            path: ''
          });
        }
      }
    });
  });
}

module.exports = { setupSession };
