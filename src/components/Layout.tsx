import React, { useState } from "react";
import { motion } from "motion/react";
import logo from "../assets/images/app_logo.png";
import { 
  LayoutDashboard, 
  Users, 
  Download, 
  FileText, 
  Globe,
  ChevronRight,
  Menu,
  X,
  Languages,
  UserCircle,
  Settings,
  Sparkles,
  Terminal,
  UserPlus
} from "lucide-react";
import { useLanguage } from "../lib/translations";
import { User } from 'firebase/auth';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user?: {
    displayName: string | null;
    email: string | null;
    photoURL?: string | null;
  } | null;
  onLogout?: () => void;
  onCreateProfileClick?: () => void;
}

export default function Layout({ children, activeTab, setActiveTab, user, onLogout, onCreateProfileClick }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { language, setLanguage, t } = useLanguage();
  const [analyzing, setAnalyzing] = useState(false);
  const isElectron = typeof window !== 'undefined' && 
    (window.process?.versions?.electron || 
     navigator.userAgent.toLowerCase().indexOf(' electron/') > -1);

  const handleAnalyze = () => {
    setAnalyzing(true);
    if (isElectron) {
      try {
        // @ts-ignore
        window.require('electron').ipcRenderer.send('page-analysis-request');
        setTimeout(() => setAnalyzing(false), 3000);
      } catch (e) {
        console.error("Scan missing", e);
        setAnalyzing(false);
      }
    } else {
      // In web, we rely on the AssistantOverlay bubble
      window.postMessage({ type: 'toggle-assistant-expansion', data: { expanded: true } }, '*');
      setTimeout(() => {
        setAnalyzing(false);
      }, 1000);
    }
  };

  const menuItems = [
    { id: 'portals', label: t('portals'), icon: Globe },
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'tools', label: t('tools'), icon: FileText },
    { id: 'pricing', label: t('subscriptionPlan'), icon: Sparkles },
  ];

  if (!isElectron) {
    menuItems.push({ id: 'download', label: t('downloadApp'), icon: Download });
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="bg-slate-900 text-white flex flex-col transition-all duration-300 overflow-hidden"
      >
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-bold text-lg tracking-tight flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-white p-0.5 shadow-inner">
                <img src={logo} alt="esevadraft" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
              <span className="whitespace-nowrap text-white font-extrabold tracking-wide">esevadraft</span>
            </motion.div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={20} />
                {isSidebarOpen && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-medium whitespace-nowrap text-sm"
                  >
                    {item.label}
                  </motion.span>
                )}
                {isSidebarOpen && isActive && (
                  <motion.div layoutId="active-indicator" className="ml-auto">
                    <ChevronRight size={16} />
                  </motion.div>
                )}
              </button>
            );
          })}

          {/* Quick Create Profile Button */}
          <div className="pt-4 mt-4 border-t border-slate-800">
            <button
              onClick={() => {
                if (onCreateProfileClick) onCreateProfileClick();
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-sm transition-all shadow-md active:scale-95 cursor-pointer"
              title={language === 'ta' ? 'புதிய சுயவிவரத்தை உருவாக்க' : 'Create New Profile'}
            >
              <UserPlus size={20} className="shrink-0" />
              {isSidebarOpen && (
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="whitespace-nowrap font-medium text-sm"
                >
                  {language === 'ta' ? 'புதிய சுயவிவரம்' : 'New Profile'}
                </motion.span>
              )}
            </button>
          </div>
        </nav>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="font-bold text-xl text-slate-800 tracking-tight">
                {activeTab === 'dashboard' ? t('dashboard') : 
                 activeTab === 'portals' ? t('portals') :
                 activeTab === 'download' ? t('downloadApp') : 
                 activeTab === 'admin' ? 'System Logs' : 
                 activeTab === 'pricing' ? t('subscriptionPlan') : t('tools')}
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">esevadraft Center Automator</p>
            </div>

            <div className="flex items-center bg-slate-100 rounded-full p-1 ml-4 ring-1 ring-slate-200">
              <button 
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 text-[10px] font-black rounded-full transition-all ${language === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
              >
                ENG
              </button>
              <button 
                onClick={() => setLanguage('ta')}
                className={`px-3 py-1 text-[10px] font-black rounded-full transition-all ${language === 'ta' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}
              >
                தமிழ்
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3 pr-4">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-black text-slate-900 leading-none">{user.displayName}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-1">{user.email}</p>
                </div>
                <button 
                  onClick={() => setActiveTab('profile')}
                  className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[12px] font-black uppercase hover:ring-4 hover:ring-blue-50 transition-all"
                >
                  {user.displayName?.[0] || 'A'}
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>

        {/* Floating Action Button for Quick Add Profile */}
        <div className="fixed bottom-6 right-6 z-[100] group">
          <div className="absolute right-16 bottom-3 bg-slate-950 text-white text-[10px] font-black px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none uppercase tracking-widest border border-slate-800">
            {language === 'ta' ? 'உடனே புதிய சுயவிவரம் உருவாக்க' : 'Quick Create Profile'}
          </div>
          <button
            onClick={() => {
              if (onCreateProfileClick) onCreateProfileClick();
            }}
            className="w-14 h-14 bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer ring-4 ring-emerald-500/20 active:ring-emerald-500/40 relative overflow-hidden group"
          >
            <span className="absolute inset-0 bg-white/20 transform scale-0 group-hover:scale-100 transition-transform duration-350 rounded-full" />
            <UserPlus size={22} className="relative z-10 transition-transform group-hover:rotate-12 duration-300" />
          </button>
        </div>
      </main>
    </div>
  );
}
