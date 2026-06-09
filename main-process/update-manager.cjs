const { autoUpdater } = require('electron-updater');
const { dialog, app } = require('electron');

// Configure autoUpdater settings
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function setupAutoUpdate(win) {
  // Only search and apply updates in packaged/production builds
  if (!app.isPackaged) {
    console.log('[AutoUpdate] Development mode detected - auto-update check skipped.');
    return;
  }

  console.log('[AutoUpdate] Initializing auto-updater event listeners...');

  // 1. Error handling
  autoUpdater.on('error', (error) => {
    console.error('[AutoUpdate] புதுப்பிப்பு பிழை (Update Error):', error);
  });

  // 2. Checking for updates
  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdate] புதுப்பிப்புகள் சரிபார்க்கப்படுகின்றன (Checking for updates)...');
  });

  // 3. New update available
  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdate] புதிய பதிப்பு கிடைத்துள்ளது (Update available):', info.version);
    if (win && !win.isDestroyed()) {
      dialog.showMessageBox(win, {
        type: 'info',
        title: 'புதிய அப்டேட் கிடைத்துள்ளது',
        message: `பதிப்பு ${info.version} கண்டறியப்பட்டுள்ளது. இது பின்னணியில் தானாகவே பதிவிறக்கம் செய்யப்படுகிறது. பதிவிறக்கம் முடிந்ததும் உங்களுக்கு அறிவிக்கப்படும்.`,
        buttons: ['சரி']
      }).catch(err => console.error('[AutoUpdate] Dialog error:', err));
    }
  });

  // 4. Update not available
  autoUpdater.on('update-not-available', (info) => {
    console.log('[AutoUpdate] புதிய பதிப்புகள் எதுவும் இல்லை (Update not available):', info.version);
  });

  // 5. Download progress updates
  autoUpdater.on('download-progress', (progressObj) => {
    console.log(`[AutoUpdate] பதிவிறக்கம் ஆகிறது: ${progressObj.percent.toFixed(2)}% (${progressObj.transferred}/${progressObj.total})`);
  });

  // 6. Update download completed & ready to install
  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdate] பதிவிறக்கம் வெற்றிகரமாக முடிந்தது (Update downloaded):', info.version);
    
    const showInstallPrompt = () => {
      dialog.showMessageBox({
        type: 'info',
        title: 'புதுப்பிப்பு தயார்',
        message: `பதிப்பு ${info.version} வெற்றிகரமாகப் பதிவிறக்கப்பட்டது! செயலியை இப்போது நிறுவி மறுதொடக்கம் செய்ய விரும்புகிறீர்களா?`,
        buttons: ['நிறுவவும் (Install Now)', 'பிறகு (Later)'],
        defaultId: 0,
        cancelId: 1
      }).then((result) => {
        if (result.response === 0) {
          console.log('[AutoUpdate] User chose to install. Quitting and installing...');
          // Arguments: isSilent = false, isForceRunAfter = true
          autoUpdater.quitAndInstall(false, true);
        } else {
          console.log('[AutoUpdate] User postponed the installation.');
        }
      }).catch(err => {
        console.error('[AutoUpdate] showMessageBox error:', err);
        // Fallback: auto-install anyway
        autoUpdater.quitAndInstall(false, true);
      });
    };

    if (win && !win.isDestroyed()) {
      showInstallPrompt();
    } else {
      console.log('[AutoUpdate] Main window is gone or destroyed. Installing automatically...');
      autoUpdater.quitAndInstall(false, true);
    }
  });

  // Check for updates
  try {
    autoUpdater.checkForUpdatesAndNotify();
  } catch (err) {
    console.error('[AutoUpdate] checkForUpdatesAndNotify failure:', err);
  }
}

module.exports = { setupAutoUpdate };
