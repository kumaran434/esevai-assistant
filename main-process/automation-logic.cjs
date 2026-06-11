const { ipcMain, BrowserView, app } = require('electron');
const path = require('path');
const fs = require('fs');

const preloadPath = path.join(app.getPath('userData'), 'preload-automation.cjs');

const preloadContent = `
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('automation', {
  onFillData: (cb) => ipcRenderer.on('fill-data', (ev, d) => cb(d)),
  onAnalyzePage: (cb) => ipcRenderer.on('analyze-page', (ev, d) => cb(d)),
  sendAnalysis: (r) => ipcRenderer.send('page-analysis-result', r),
  reportError: (e) => ipcRenderer.send('automation-error', e)
});

// Auto-fill Saved Portal Credentials Logic
try {
  ipcRenderer.send('get-portal-credentials-request', window.location.href);
} catch (e) {}

ipcRenderer.on('fill-portal-credentials', (event, creds) => {
  if (!creds || !creds.username || !creds.password) return;
  
  ipcRenderer.send('automation-technical-log', { 
    stage: 'AUTO_FILL_CREDENTIALS', 
    message: 'உள்நுழைவு விவரங்கள் தானாக நிரப்பப்படுகின்றன... (Auto-filling username/password...)' 
  });

  const fillCredentialsFields = () => {
    try {
      const usernameSelectors = [
        'input[type="text"][name*="user"]',
        'input[type="text"][id*="user"]',
        'input[type="text"][placeholder*="user"]',
        'input[type="text"][placeholder*="username"]',
        'input[type="text"][placeholder*="பெயர்"]',
        'input[type="text"][name*="login"]',
        'input[type="text"][id*="login"]',
        'input[id*="username"]',
        'input[name*="username"]',
        'input[id*="userid"]',
        'input[name*="userid"]',
        'input[placeholder*="User"]',
        'input[placeholder*="ID"]',
        'input[placeholder*="id"]',
        'input[type="text"]'
      ];

      const passwordSelectors = [
        'input[type="password"]',
        'input[id*="password"]',
        'input[name*="password"]',
        'input[placeholder*="password"]',
        'input[placeholder*="கடவுச்சொல்"]'
      ];

      let passInput = null;
      for (const sel of passwordSelectors) {
        passInput = document.querySelector(sel);
        if (passInput) break;
      }

      if (!passInput) return;

      let userInput = null;
      for (const sel of usernameSelectors) {
        userInput = document.querySelector(sel);
        if (userInput && userInput !== passInput) break;
      }

      if (userInput && passInput) {
        // Prevent hijacking focus if credentials are already filled correctly
        if (userInput.value === creds.username && passInput.value === creds.password) return;

        userInput.focus();
        const nativeUserSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        if (nativeUserSetter) {
          nativeUserSetter.call(userInput, creds.username);
        } else {
          userInput.value = creds.username;
        }
        userInput.dispatchEvent(new Event('input', { bubbles: true }));
        userInput.dispatchEvent(new Event('change', { bubbles: true }));
        userInput.dispatchEvent(new Event('blur', { bubbles: true }));
        try { userInput.blur(); } catch (e) {}

        passInput.focus();
        const nativePassSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        if (nativePassSetter) {
          nativePassSetter.call(passInput, creds.password);
        } else {
          passInput.value = creds.password;
        }
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
        passInput.dispatchEvent(new Event('change', { bubbles: true }));
        passInput.dispatchEvent(new Event('blur', { bubbles: true }));
        try { passInput.blur(); } catch (e) {}

        ipcRenderer.send('automation-technical-log', { 
          stage: 'AUTO_FILL_CREDENTIALS_SUCCESS', 
          message: 'உள்நுழைவு விவரங்கள் தானாக நிரப்பப்பட்டன! (Credentials auto-filled!)' 
        });

        const loginButtonSelectors = [
          'button[type="submit"]',
          'input[type="submit"]',
          'button[id*="login"]',
          'button[id*="submit"]',
          'a.login-btn',
          '.login-btn',
          'button:not([type="button"])',
          '#login',
          '#submit'
        ];
        
        let loginBtn = null;
        for (const sel of loginButtonSelectors) {
          loginBtn = document.querySelector(sel);
          if (loginBtn) break;
        }

        if (loginBtn) {
          loginBtn.style.border = "3px solid #4f46e5";
          loginBtn.style.boxShadow = "0 0 15px rgba(79, 70, 229, 0.6)"; 
          
          // Automatic clicking has been removed per user request: "just user name password mattum fill aanapothum"
        }
      }
    } catch (err) {}
  };

  setTimeout(fillCredentialsFields, 500);
  setTimeout(fillCredentialsFields, 1500);
  setTimeout(fillCredentialsFields, 3000);
});

ipcRenderer.on('analyze-page', (event, context = {}) => {
  try {
    ipcRenderer.send('automation-technical-log', { stage: 'ANALYSIS', message: 'இணையதளத்தைப் பகுப்பாய்வு செய்கிறது...' });
    
    const getAllFields = (root, depth = 0) => {
      if (depth > 2) return [];
      let fields = [];
      const elms = root.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea');
      
      for (let i = 0; i < Math.min(elms.length, 150); i++) {
        const el = elms[i];
        try {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
          if (el.offsetWidth === 0 && el.offsetHeight === 0) continue;
          
          let labelText = '';
          if (el.id) {
            const lEl = document.querySelector('label[for="' + el.id + '"]');
            if (lEl) labelText = lEl.innerText;
          }
          if (!labelText && el.labels && el.labels.length > 0) {
            labelText = el.labels[0].innerText;
          }
          if (!labelText) {
            labelText = el.getAttribute('aria-label') || el.title || el.placeholder || el.name || '';
          }
          
          const parent = el.parentElement;
          let surroundingText = '';
          if (parent) {
             surroundingText = parent.innerText.replace(labelText, '').trim().slice(0, 50);
          }
          
          fields.push({
            id: el.id || el.name || 'field_' + i,
            name: el.name || '',
            label: (labelText + (surroundingText ? ' (' + surroundingText + ')' : '')).trim().slice(0, 150),
            placeholder: (el.placeholder || '').slice(0, 100),
            type: el.type,
            tagName: el.tagName,
            ariaLabel: el.getAttribute('aria-label') || '',
            required: el.required || false,
            className: (el.className || '').slice(0, 50),
            options: el.tagName === 'SELECT' ? Array.from(el.options).slice(0, 15).map(o => o.text.trim()).filter(t => t.length > 0 && t.length < 50) : undefined
          });
        } catch(e) {}
      }
      return fields;
    };

    const pageInfo = {
      title: document.title,
      heading: (document.querySelector('h1, h2, .page-header, .header-title')?.innerText || '').trim().slice(0, 200),
      url: window.location.href
    };

    ipcRenderer.send('page-analysis-result', { 
      fields: getAllFields(document), 
      pageInfo,
      timestamp: Date.now() 
    });
  } catch (err) {
    ipcRenderer.send('automation-error', { stage: 'ANALYSIS', message: err.message });
  }
});

ipcRenderer.on('fill-data', (event, data) => {
  try {
    const mapping = data.mapping || {};
    const files = data.files || {};
    
    const fillInDoc = (root) => {
      let count = 0;
      const elms = Array.from(root.querySelectorAll('input, select, textarea'));
      
      elms.forEach((el, i) => {
        const fieldKey = el.id || el.name || ('field_' + i);
        const val = mapping[fieldKey];
        
        if (val !== undefined && val !== null && val !== "") {
          try {
            if (el.type === 'checkbox' || el.type === 'radio') {
              const shouldCheck = (val === true || String(val).toLowerCase() === 'yes' || String(val).toLowerCase() === 'true');
              if (el.checked !== shouldCheck) {
                el.checked = shouldCheck;
                el.dispatchEvent(new Event('click', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
              }
            } else if (el.type !== 'file' && el.tagName !== 'BUTTON') {
              el.focus();
              
              // Human-mimic typing: trigger full key event suite
              const char = String(val).charAt(0) || '';
              const keyOptions = { bubbles: true, cancelable: true, key: char, char: char, shifted: false };
              el.dispatchEvent(new KeyboardEvent('keydown', keyOptions));
              el.dispatchEvent(new KeyboardEvent('keypress', keyOptions));

              const nativeValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set || 
                                        Object.getOwnPropertyDescriptor(el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype, "value")?.set;
              if (nativeValueSetter) {
                nativeValueSetter.call(el, val);
              } else {
                el.value = val;
              }
              
              const eventOptions = { bubbles: true, cancelable: true, composed: true };
              el.dispatchEvent(new Event('input', eventOptions));
              el.dispatchEvent(new Event('change', eventOptions));
              el.dispatchEvent(new KeyboardEvent('keyup', keyOptions));
              el.dispatchEvent(new Event('blur', eventOptions));
              
              ipcRenderer.send('automation-technical-log', { stage: 'FILL', message: 'Filled: ' + (el.id || el.name || 'field') });
              count++;
            }
          } catch(e) {}
        }
      });

      // Heuristic success for non-electron if no feedback, but for electron we wait for logs
      const checkPortalSuccess = () => {
        const bodyText = document.body.innerText;
        const successKeywords = ['success', 'submitted', 'saved', 'பதிவேற்றப்பட்டது', 'சேமிக்கப்பட்டது', 'வெற்றி'];
        const hasSuccess = successKeywords.some(k => bodyText.toLowerCase().includes(k));
        if (hasSuccess) {
          ipcRenderer.send('automation-technical-log', { stage: 'PORTAL_DETECTION', message: 'இணையதளத்தில் செயல்பாடு வெற்றிகரமாக முடிந்தது!' });
        }
      };
      setTimeout(checkPortalSuccess, 2000);

      // GLOBAL PASTE SUPPORT FOR FILE INPUTS
      // This allows users to click COPY in assistant and CTRL+V on the website
      window.addEventListener('paste', (e) => {
        const files = e.clipboardData?.files;
        if (files && files.length > 0) {
          const target = document.activeElement;
          // Try to find a file input near the active element or if the active element is the file input itself
          const fileInput = (target?.tagName === 'INPUT' && target.type === 'file') ? target : 
                             target?.querySelector('input[type="file"]') || 
                             document.querySelector('input[type="file"]'); // Fallback to first file input if only one exists
          
          if (fileInput) {
            fileInput.files = files;
            ipcRenderer.send('automation-technical-log', { stage: 'PASTE', message: 'ஆவணம் வெற்றிகரமாக ஒட்டப்பட்டது (Pasted).' });
            const eventOptions = { bubbles: true, cancelable: true, composed: true };
            ['change', 'input', 'blur'].forEach(en => fileInput.dispatchEvent(new Event(en, eventOptions)));
            
            // Auto click upload if possible
            setTimeout(() => {
                const uploadBtn = document.querySelector('button[type="submit"], .upload-btn, .btn-primary');
                if (uploadBtn && uploadBtn.innerText.toLowerCase().includes('upload')) uploadBtn.click();
            }, 300);
          }
        }
      }, true);

      // File Uploads
      elms.forEach((el, i) => {
        if (el.type !== 'file') return;
        const fieldKey = el.id || el.name || ('field_' + i);
        const fileId = mapping[fieldKey];
        const fileData = files[fileId];
        
        if (fileData) {
          try {
            ipcRenderer.send('automation-technical-log', { stage: 'UPLOAD', message: fileData.name + ' இணையதளத்தில் பொருத்தப்படுகிறது...' });
            const bstr = atob(fileData.data);
            let n = bstr.length;
            const u8 = new Uint8Array(n);
            while(n--) u8[n] = bstr.charCodeAt(n);
            const f = new File([u8], fileData.name, { type: fileData.type });
            const dt = new DataTransfer();
            dt.items.add(f);
            el.files = dt.files;
            const eventOptions = { bubbles: true, cancelable: true, composed: true };
            ['change', 'input', 'blur'].forEach(en => el.dispatchEvent(new Event(en, eventOptions)));
            
            // HEURISTIC: Many government portals require clicking an "Upload" or "Attach" button after selection.
            setTimeout(() => {
              try {
                const parent = el.parentElement;
                const container = parent?.parentElement || parent;
                const buttons = Array.from(container?.querySelectorAll('button, input[type="button"], input[type="submit"]') || []);
                const uploadBtn = buttons.find(b => {
                  const txt = (b.innerText || b.value || '').toLowerCase();
                  return txt.includes('upload') || txt.includes('பதிவேற்று') || txt.includes('submit') || txt.includes('attach') || txt.includes('add');
                });

                if (uploadBtn) {
                   ipcRenderer.send('automation-technical-log', { stage: 'UPLOAD_TRIGGER', message: 'தானியங்கி பதிவேற்றம் (Auto-Click) செய்யப்படுகிறது...' });
                   uploadBtn.click();
                }
              } catch(btnErr) {}
            }, 500);

            count++;
            ipcRenderer.send('automation-technical-log', { stage: 'SUCCESS', message: fileData.name + ' வெற்றிகரமாக ஏற்றப்பட்டது.' });
          } catch(e) {
            ipcRenderer.send('automation-error', { stage: 'UPLOAD', message: e.message });
          }
        }
      });
 
      // FALLBACK: If we have files in the payload but they didn't match via mapping,
      // try to fill the first empty file input
      if (files && Object.keys(files).length > 0) {
        const unmatchedFileKeys = Object.keys(files).filter(k => !Object.values(mapping).includes(k) || k === 'direct_tool_file');
        if (unmatchedFileKeys.length > 0) {
          const fileInputs = Array.from(root.querySelectorAll('input[type="file"]')).filter(inp => !inp.files || inp.files.length === 0);
          if (fileInputs.length > 0) {
             const fileKey = unmatchedFileKeys[0];
             const fileData = files[fileKey];
             const el = fileInputs[0];
             try {
                if (fileData && fileData.data) {
                  ipcRenderer.send('automation-technical-log', { stage: 'UPLOAD_FALLBACK', message: 'ஆவணத்தைத் தானாகப் பொருத்துகிறது...' });
                  const bstr = atob(fileData.data);
                  let n = bstr.length;
                  const u8 = new Uint8Array(n);
                  while(n--) u8[n] = bstr.charCodeAt(n);
                  const f = new File([u8], fileData.name || 'document', { type: fileData.type || 'application/octet-stream' });
                  const dt = new DataTransfer();
                  dt.items.add(f);
                  el.files = dt.files;
                  const eventOptions = { bubbles: true, cancelable: true, composed: true };
                  ['change', 'input', 'blur'].forEach(en => el.dispatchEvent(new Event(en, eventOptions)));
                  ipcRenderer.send('automation-technical-log', { stage: 'SUCCESS', message: 'ஆவணம் தானாகப் பொருத்தப்பட்டது.' });
                }
             } catch(e) {}
          }
        }
      }

      root.querySelectorAll('*').forEach(el => { if (el.shadowRoot) count += fillInDoc(el.shadowRoot); });
      root.querySelectorAll('iframe').forEach(iframe => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          if (iframeDoc) count += fillInDoc(iframeDoc);
        } catch(e) {}
      });
      return count;
    };

    const matchedCount = fillInDoc(document);
    ipcRenderer.send('fill-execution-success', { matchedCount, mapping });
  } catch (err) {
    ipcRenderer.send('automation-error', { stage: 'FILL', message: err.message });
  }
});
`;

function setupAutomation() {
  fs.writeFileSync(preloadPath, preloadContent);
  console.log('Automation preload script written to:', preloadPath);
}

module.exports = {
  setupAutomation,
  preloadPath
};
