const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');

function setupAutoUpdate(win) {
  // பிழைகள் ஏற்பட்டால் பயன்பாடு செயலிழப்பதைத் தடுக்க பாதுகாப்புத் தர்க்கம்
  autoUpdater.on('error', (error) => {
    console.error('புதுப்பிப்பு பிழை:', error);
  });

  // புதிய பதிப்பு கண்டறியப்படும்போது பயனருக்கு அறிவிப்பு காட்டுதல்
  autoUpdater.on('update-available', () => {
    dialog.showMessageBox(win, {
      type: 'info',
      title: 'புதுப்பிப்பு கிடைத்துவிட்டது',
      message: 'புதிய புதுப்பிப்பு கண்டறியப்பட்டுள்ளது. இப்போது பின்னணியில் பதிவிறக்கம் செய்யப்படுகிறது.',
      buttons: ['சரி']
    });
  });

  // பதிவிறக்கி முடிக்கப்பட்ட பிறகு பயனருக்குத் தெரிவித்து நிறுவுதல்
  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(win, {
      type: 'info',
      title: 'புதுப்பிப்பு தயார்',
      message: 'புதிய பதிப்பு பதிவிறக்கம் செய்யப்பட்டு தயார் நிலையில் உள்ளது. பயன்பாடு இப்போது மீண்டும் தொடங்கப்படும்.',
      buttons: ['நிறுவவும்']
    }).then(() => {
      autoUpdater.quitAndInstall();
    });
  });

  // புதுப்பிப்புகளைச் சரிபார்க்கும் செயல்முறை
  try {
    autoUpdater.checkForUpdatesAndNotify();
  } catch (err) {
    console.error('புதுப்பிப்புகளைச் சரிபார்க்க முடியவில்லை:', err);
  }
}

module.exports = { setupAutoUpdate };
