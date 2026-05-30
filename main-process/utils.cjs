function injectDebugScripts(win) {
  win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript(`
      console.log('--- BUILD DEBUG INFO ---');
      console.log('Current URL:', window.location.href);
      console.log('Root Element Found:', !!document.getElementById('root'));
      
      const scripts = document.querySelectorAll('script');
      console.log('Number of scripts found:', scripts.length);
      
      if (scripts.length === 0) {
        console.error('ERROR: No scripts found in this HTML!');
      } else {
        scripts.forEach((s, i) => {
          console.log('Script ' + i + ' src:', s.src);
        });
      }
      
      window.onerror = function(msg, url, line, col, error) {
        console.error('Runtime Error:', msg, 'at', url, ':', line);
        return false;
      };
    `);
  });
}

function setupShortcuts(win) {
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      win.webContents.openDevTools();
    }
  });
}

module.exports = { injectDebugScripts, setupShortcuts };
