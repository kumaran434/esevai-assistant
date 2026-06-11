const { session, app, dialog, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');

function setupSession(mainWindow) {
  const chromeUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
  
  // Configure default session user agent so all standard pages use Chrome UA
  session.defaultSession.setUserAgent(chromeUserAgent);
  
  // Configure persistent WhatsApp session so its service worker requests use standard Chrome UA
  const whatsappSession = session.fromPartition('persist:whatsapp');
  whatsappSession.setUserAgent(chromeUserAgent);

  // Bypass CORS for government portals
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    // DO NOT alter headers for any WhatsApp service requests, they are extremely origin-sensitive
    if (details.url.includes('whatsapp')) {
      callback({ requestHeaders: details.requestHeaders });
      return;
    }
    details.requestHeaders['Origin'] = '*';
    callback({ deleteHeaders: ['Origin'], requestHeaders: details.requestHeaders });
  });

  // Strip security headers that prevent iframing (X-Frame-Options, CSP)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (details.url.includes('whatsapp')) {
      callback({ responseHeaders: details.responseHeaders });
      return;
    }
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

  // Helper function to register download handler for a session
  function registerDownloadHandler(sess) {
    sess.on('will-download', (event, item, webContents) => {
      const fileName = item.getFilename();
      
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

          // Automatically open the downloaded file directly in the system's default viewer/application
          try {
            shell.openPath(filePath);
          } catch (openErr) {
            console.error("Failed to automatically open path:", openErr);
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

  // Register for both standard and WhatsApp sessions
  registerDownloadHandler(session.defaultSession);
  registerDownloadHandler(whatsappSession);
}

module.exports = { setupSession };
