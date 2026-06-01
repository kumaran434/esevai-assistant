import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Download, Monitor, Shield, Zap, Sparkles, Cpu, Globe, RefreshCw, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useLanguage } from '../lib/translations';

export default function DownloadSection() {
  const { t } = useLanguage();

  const features = [
    { icon: Sparkles, text: "தானியங்கி படிவம் பூர்த்தி (Auto-Fill)", desc: "AI automatically fills government forms from your documents." },
    { icon: Cpu, text: "AI ஆவணச் செயலாக்கம் (AI Extraction)", desc: "Extract details instantly from Aadhaar, PAN, and more." },
    { icon: Shield, text: "பாதுகாப்பான தரவு (Secure Data)", desc: "Your data stays encrypted and private." },
    { icon: Globe, text: "அனைத்து போர்டல்களுக்கும் (Any Portal)", desc: "Works with TN e-Sevai, Passport, IT, and custom portals." }
  ];

  // எங்களின் சமீபத்திய வெர்ஷன் தகவல்
  const LATEST_VERSION = "1.1.5";

  // உங்களது GitHub சாப்ட்வேர் ரிலீஸ் டவுன்லோட் லிங்க்-ஐ (Download URL) கீழே உள்ள வரியில் மாற்றவும்
  const WINDOWS_DOWNLOAD_URL = "https://github.com/kumaran434/esevai-assistant/releases/download/v1.1.5/esevadraft.Setup.1.1.5.exe";
  const MAC_DOWNLOAD_URL = "#";

  const handleDownload = (url: string) => {
    if (url === "#" || url.includes("YOUR_PROJECT_ID")) {
      alert("தயவுசெய்து உங்கள் Firebase Storage டவுன்லோட் லிங்க்-ஐ (Download URL) 'src/components/DownloadSection.tsx' கோப்பில் மாற்றவும்!");
      return;
    }
    window.open(url, '_blank');
  };

  // Electron-ல் ஆப் ஓடுகிறதா என்று கண்டறிய
  const isElectron = typeof window !== 'undefined' && 
     ((window as any).process?.versions?.electron || 
      navigator.userAgent.toLowerCase().indexOf(' electron/') > -1);

  // Auto-Update States
  const [currentVersion, setCurrentVersion] = useState("1.1.5");
  const [latestVersionData, setLatestVersionData] = useState<{version: string, downloadUrl: string, changelog: string[]} | null>(null);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'ready-to-install' | 'uptodate' | 'error'>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updaterError, setUpdaterError] = useState("");

  const checkForUpdates = async () => {
    setUpdateStatus('checking');
    setUpdaterError("");
    try {
      const response = await fetch('/api/latest-version');
      if (!response.ok) throw new Error("பதிப்பு தகவல் பெற முடியவில்லை.");
      const data = await response.json();
      setLatestVersionData(data);
      
      // Compare versions
      const cleanVer = (v: string) => v.replace(/[^0-9.]/g, '').split('.').map(Number);
      const curParts = cleanVer(currentVersion);
      const latParts = cleanVer(data.version);
      
      let isNewer = false;
      for (let i = 0; i < Math.max(curParts.length, latParts.length); i++) {
        const c = curParts[i] || 0;
        const l = latParts[i] || 0;
        if (l > c) {
          isNewer = true;
          break;
        } else if (c > l) {
          break;
        }
      }
      
      if (isNewer) {
        setUpdateStatus('available');
      } else {
        setUpdateStatus('uptodate');
      }
    } catch (err: any) {
      console.error(err);
      setUpdateStatus('error');
      setUpdaterError("சமீபத்திய அப்டேட் தகவலை பெற முடியவில்லை. இணைய இணைப்பைச் சரிபார்க்கவும்.");
    }
  };

  useEffect(() => {
    if (isElectron) {
      try {
        const { ipcRenderer } = (window as any).require('electron');
        const ver = ipcRenderer.sendSync('get-app-version');
        if (ver) {
          setCurrentVersion(ver);
        }
      } catch (err) {
        console.error("Failed to read App version", err);
      }
      checkForUpdates();
    }
  }, [isElectron]);

  const startDownloadUpdate = () => {
    if (!latestVersionData) return;
    setUpdateStatus('downloading');
    setDownloadProgress(0);
    
    try {
      const { ipcRenderer } = (window as any).require('electron');
      ipcRenderer.send('start-update-download', { downloadUrl: latestVersionData.downloadUrl });
      
      ipcRenderer.removeAllListeners('update-download-progress');
      ipcRenderer.on('update-download-progress', (event: any, arg: any) => {
        if (!arg.success) {
          setUpdateStatus('error');
          setUpdaterError(arg.error || "பதிவிறக்கம் செய்ய முடியவில்லை.");
        } else if (arg.done) {
          setUpdateStatus('ready-to-install');
          setDownloadProgress(100);
        } else {
          setDownloadProgress(arg.progress);
        }
      });
    } catch (err: any) {
      setUpdateStatus('error');
      setUpdaterError("பதிவிறக்கத்தைத் தொடங்குவதில் சிக்கல்: " + err.message);
    }
  };

  const installAndRestart = () => {
    try {
      const { ipcRenderer } = (window as any).require('electron');
      ipcRenderer.send('install-and-restart-update');
    } catch (err: any) {
      alert("நிறுவுவதில் சிக்கல்: " + err.message);
    }
  };

  if (isElectron) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto pb-16">
        {/* Electron Smart Auto-Updater Card */}
        <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden font-sans text-left animate-fade-in text-slate-100">
          <div className="relative z-10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div>
                <span className="text-[10px] bg-blue-600 px-3 py-1 rounded-full font-black tracking-widest uppercase text-white shadow-xs">
                  டெஸ்க்டாப் பதிப்பு (Desktop Native)
                </span>
                <h3 className="text-3xl font-black tracking-tight mt-2 text-white">
                  மென்பொருள் மேம்படுத்தல் மையம்
                </h3>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold text-slate-400 bg-white/5 px-4 py-2.5 rounded-2xl border border-white/5 shadow-inner">
                <div>தற்போதைய பதிப்பு: <span className="text-white font-mono font-black">v{currentVersion}</span></div>
              </div>
            </div>

            {updateStatus === 'checking' && (
              <div className="py-8 text-center space-y-4">
                <Loader2 size={32} className="animate-spin text-blue-500 mx-auto" />
                <p className="text-sm font-bold text-slate-300">சிஸ்டம் அப்டேட்டுகள் உள்ளனவா என்று பார்க்கப்படுகிறது...</p>
              </div>
            )}

            {updateStatus === 'uptodate' && (
              <div className="py-6 space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-4">
                  <CheckCircle2 size={36} className="text-emerald-400 shrink-0 animate-pulse" />
                  <div className="text-left space-y-1">
                    <p className="font-extrabold text-white text-base">உங்கள் ஆப் புதிய அப்டேட்டில் உள்ளது!</p>
                    <p className="text-xs font-medium text-slate-400 leading-normal">
                      தற்போது நீங்கள் சமீபத்திய பதிப்பை (v{currentVersion}) பயன்படுத்துகிறீர்கள். அனைத்து புதிய ஏஐ அம்சங்களும் வெற்றிகரமாக இயங்குகின்றன.
                    </p>
                  </div>
                </div>
                <button
                  onClick={checkForUpdates}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/20 transition-all font-black text-[10px] uppercase tracking-widest rounded-xl cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw size={12} />
                  <span>மீண்டும் தேடு (Check Again)</span>
                </button>
              </div>
            )}

            {updateStatus === 'error' && (
              <div className="py-6 space-y-4">
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-4">
                  <AlertCircle size={36} className="text-rose-400 shrink-0" />
                  <div className="text-left space-y-1">
                    <p className="font-extrabold text-white text-base">அப்டேட் தேடுவதில் சிக்கல் ஏற்பட்டது</p>
                    <p className="text-xs font-bold text-rose-300 leading-normal">
                      {updaterError}
                    </p>
                  </div>
                </div>
                <button
                  onClick={checkForUpdates}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/20 transition-all font-black text-[10px] uppercase tracking-widest rounded-xl cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw size={12} />
                  <span>மீண்டும் முயற்சிக்கவும் (Retry Check)</span>
                </button>
              </div>
            )}

            {(updateStatus === 'available' || updateStatus === 'downloading' || updateStatus === 'ready-to-install') && latestVersionData && (
              <div className="space-y-6">
                <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-6 space-y-4 shadow-inner">
                  <div className="flex items-center gap-3">
                    <Sparkles size={24} className="text-blue-400 animate-pulse" />
                    <div>
                      <p className="font-black text-white text-base">புதிய பதிப்பு v{latestVersionData.version} தயாராக உள்ளது!</p>
                      <p className="text-xs font-medium text-slate-400 leading-normal">நிறுவுவதற்கு முன் புதிய வசதிகளைப் பாருங்கள்.</p>
                    </div>
                  </div>

                  {/* Changelog */}
                  <div className="bg-black/20 p-5 rounded-2xl space-y-2.5 text-left border border-white/5">
                    <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase leading-none">
                      புதிய மாற்றங்கள் (What's New in v{latestVersionData.version}):
                    </p>
                    <ul className="space-y-2 list-none">
                      {latestVersionData.changelog?.map((change, idx) => (
                        <li key={idx} className="text-xs font-bold text-slate-200 flex items-start gap-2.5 leading-relaxed">
                          <span className="text-blue-500 font-extrabold text-base select-none mt-[-2px]">•</span>
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {updateStatus === 'available' && (
                  <button
                    onClick={startDownloadUpdate}
                    className="w-full md:w-auto px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-500/10 cursor-pointer block text-center active:scale-95 transition-all"
                  >
                    புதிய பதிப்பை உடனே பதிவிறக்கு (Start Upgrade)
                  </button>
                )}

                {updateStatus === 'downloading' && (
                  <div className="space-y-3.5 bg-black/20 p-6 rounded-2xl border border-white/5 shadow-inner">
                    <div className="flex items-center justify-between text-xs font-black text-slate-300">
                      <span>புதிய பதிப்பு பதிவிறக்கம் செய்யப்படுகிறது...</span>
                      <span className="font-mono">{downloadProgress}%</span>
                    </div>
                    {/* Progress Bar Container */}
                    <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 text-left">
                      பதிவிறக்கம் முடிந்தவுடன் ஆப் தானாகவே அப்டேட் ஆகி மறுதொடக்கம் செய்யப்படும். தயவுசெய்து ஆப்பை மூட வேண்டாம்.
                    </p>
                  </div>
                )}

                {updateStatus === 'ready-to-install' && (
                  <div className="space-y-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-4">
                      <CheckCircle2 size={36} className="text-emerald-400 shrink-0" />
                      <div className="text-left space-y-1">
                        <p className="font-extrabold text-white text-base">பதிவிறக்கம் வெற்றிகரமாக முடிந்தது!</p>
                        <p className="text-xs font-medium text-slate-400 leading-normal">
                          அனைத்து புதிய கோப்புகளும் தயார் நிலையில் உள்ளன. இப்போது 'இன்ஸ்டால்' செய்தால் ஆப் தானாகவே புதுப்பிக்கப்பட்டு ரீஸ்டார்ட் ஆகும்.
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={installAndRestart}
                      className="w-full md:w-auto px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/10 cursor-pointer block text-center active:scale-95 transition-all"
                    >
                      இப்போதே புதுப்பித்து மறுதொடக்கம் செய் (Install & Restart App)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Background visuals */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2 select-none pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-800/40 blur-[80px] rounded-full -translate-x-1/2 translate-y-1/2 select-none pointer-events-none" />
        </div>

        {/* Benefits Info of Desktop App */}
        <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 md:p-10 space-y-6 text-left shadow-sm">
          <div className="flex items-center gap-3">
            <Zap size={24} className="text-blue-500" />
            <h4 className="text-lg font-black text-slate-900">ஏஐ டெஸ்க்டாப் செயல்திறன் நன்மைகள் (Desktop App Benefits):</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <p className="font-extrabold text-slate-800 text-sm">✓ உள்ளூர் கோப்பு பாதுகாப்பு (Local Sandbox)</p>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">முடிவுகள் மற்றும் சான்றிதழ் கோப்புகள் உங்கள் கணினியின் பாதுகாப்பான மெமரியிலேயே சேமிக்கப்படுகிறது.</p>
            </div>
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <p className="font-extrabold text-slate-800 text-sm">✓ அதிவேக ஆட்டோமேஷன் (Fast Execution)</p>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">பக்கங்களைத் தடையின்றி அடையாளம் கண்டு 0.5 வினாடிக்குள் வேகமான தரவு நிரப்புதலைத் தருகிறது.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-24 text-left font-sans">
      {/* Hero Section */}
      <div className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-6"
          >
            <div className="px-4 py-1.5 bg-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-md">
              v{LATEST_VERSION} - LATEST
            </div>
          </motion.div>
          
          <h2 className="text-5xl font-black tracking-tighter mb-6 leading-none">
            {t('downloadTitle')}
          </h2>
          <p className="text-xl text-slate-400 font-medium leading-relaxed mb-10">
            {t('downloadDesc')}
          </p>

          <div className="flex flex-col sm:flex-row gap-6">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleDownload(WINDOWS_DOWNLOAD_URL)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl shadow-blue-500/20 cursor-pointer"
            >
              <Monitor size={20} />
              {t('installWindows')}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleDownload(MAC_DOWNLOAD_URL)}
              className="bg-white/10 hover:bg-white/20 text-white px-10 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 border border-white/10 cursor-pointer"
            >
              <Monitor size={20} />
              {t('installMac')}
            </motion.button>
          </div>
        </div>

        {/* Abstract Backgrounds */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 select-none pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-800/50 blur-[100px] rounded-full -translate-x-1/2 translate-y-1/2 select-none pointer-events-none" />
      </div>

      {/* Why Choose Desktop Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {features.map((feature, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all group"
          >
            <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <feature.icon size={28} />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2 leading-tight">
              {feature.text}
            </h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              {feature.desc}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Installation Guide */}
      <div className="bg-blue-600 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="space-y-6 max-w-xl text-center lg:text-left">
            <h3 className="text-3xl font-black tracking-tight">{t('howToUse')}</h3>
            <div className="space-y-6">
              {[
                { step: "1", text: "இணையதளத்திலிருந்து ஆப்பை பதிவிறக்கம் செய்யவும் (Download Zip)." },
                { step: "2", text: "பதிவிறக்கம் செய்த ஃபைலை அன்சிப் (Unzip) செய்யவும்." },
                { step: "3", text: "அதிலுள்ள Setup ஃபைலை ரன் (Run) செய்து இன்ஸ்டால் செய்யவும்." },
                { step: "4", text: "லாகின் செய்த பிறகு, ஆட்டோமேஷன் வசதிகள் முழுமையாக செயல்படும்." }
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row items-center lg:items-start gap-4">
                  <span className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 select-none">
                    {item.step}
                  </span>
                  <p className="text-sm font-bold opacity-90 leading-relaxed">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-xl p-4 rounded-[2.5rem] border border-white/10 shadow-3xl">
             <div className="p-8 bg-slate-900 rounded-[2rem] border border-white/5 space-y-4">
                <div className="flex items-center gap-4 text-blue-400 mb-6 font-black uppercase tracking-widest text-xs select-none">
                   <Zap size={16} fill="currentColor" />
                   Desktop Benefits
                </div>
                <div className="space-y-3">
                    <div className="flex items-center gap-3 text-white/80 text-sm font-bold">
                       <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                       கூடுதல் பிளகின் எதுவும் தேவையில்லை (No extra plugin needed)
                    </div>
                   <div className="flex items-center gap-3 text-white/80 text-sm font-bold">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      தானியங்கி பக்க கண்டறிதல் (Smart Page Recognition)
                   </div>
                   <div className="flex items-center gap-3 text-white/80 text-sm font-bold">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      ஆவணங்களை மொத்தமாகச் செயலாக்குதல் (Bulk Processing)
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
