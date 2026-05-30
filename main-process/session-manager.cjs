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
    
    // Show a native Save Dialog to let the user choose where they want to save the document
    const savePath = dialog.showSaveDialogSync(parentWin || null, {
      title: 'ஆவணத்தைச் சேமிக்கவும்',
      defaultPath: path.join(app.getPath('downloads'), fileName),
      buttonLabel: 'சேமி',
    });

    if (savePath) {
      item.setSavePath(savePath);
    } else {
      item.cancel();
      return;
    }

    item.on('updated', (event, state) => {
      if (state === 'interrupted') {
        console.log('Download is interrupted but can be resumed');
      }
    });

    item.once('done', (event, state) => {
      if (state === 'completed') {
        const filePath = item.getSavePath();
        
        // Show a beautiful notification dialog to let them open or show the file
        const option = dialog.showMessageBoxSync(parentWin || null, {
          type: 'info',
          title: 'பதிவிறக்கம் செய்யப்பட்டது',
          message: `ஆவணம் வெற்றிகரமாகப் பதிவிறக்கம் செய்யப்பட்டது!`,
          detail: `கோப்பு: ${path.basename(filePath)}`,
          buttons: ['கோப்பைத் திறக்கவும் (Open File)', 'கோப்புறையைக் காட்டவும் (Show in Folder)', 'சரி (OK)'],
          defaultId: 2,
          cancelId: 2
        });

        if (option === 0) {
          shell.openPath(filePath).catch(err => {
            console.error('Error opening file:', err);
          });
        } else if (option === 1) {
          shell.showItemInFolder(filePath);
        }
      } else if (state === 'cancelled') {
        // Cancelled by user - no message needed
      } else {
        dialog.showErrorBox('பதிவிறக்கப் பிழை', `ஆவணத்தைப் பதிவிறக்குவதில் தோல்வி ஏற்பட்டது.\nநிலை: ${state}`);
      }
    });
  });
}

module.exports = { setupSession };
