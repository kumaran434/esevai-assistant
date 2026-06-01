import React, { useState, useEffect } from "react";
import {
  LogOut,
  Globe,
  Cpu,
  X,
  Zap,
  Monitor,
  FileText,
  MousePointer2,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Plus,
  Lock,
} from "lucide-react";
import { auth } from "./lib/firebase";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import Portals from "./components/Portals";
import DocumentTools from "./components/DocumentTools";
import DownloadSection from "./components/DownloadSection";
import AdminLogs from "./components/AdminLogs";
import AssistantOverlay from "./components/AssistantOverlay";
import Auth from "./components/Auth";
import UserProfile from "./components/UserProfile";
import Pricing from "./components/Pricing";
import ActiveCustomerSidebar from "./components/ActiveCustomerSidebar";
import { motion, AnimatePresence } from "motion/react";
import { reportAppError } from "./lib/firebase-utils";
import packageInfo from "../package.json";
import { customerService } from "./services/customerService";
import { Customer } from "./types";

// Modular Hooks
import { useToast } from "./hooks/useToast";
import { useSidebar } from "./hooks/useSidebar";
import { getIpcRenderer } from "./lib/electron-mock";

const isElectronApp = () => {
  return (
    typeof window !== "undefined" &&
    ((window.process && (window.process as any).type === "renderer") ||
      navigator.userAgent.includes("Electron") ||
      (window as any).navigator?.userAgent?.indexOf("Electron") >= 0)
  );
};

export default function App() {
  const isAssistantOverlay = window.location.hash === "#/assistant-overlay";
  const ipc = getIpcRenderer();
  const isDesktop =
    isElectronApp() ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  // Custom Hooks
  const { toast, showToast, hideToast } = useToast();
  const [activePortal, setActivePortal] = useState<string | null>(null);
  const [activePortalUrl, setActivePortalUrl] = useState<string | null>(null);
  const [tabs, setTabs] = useState<{ id: string; name: string; url: string }[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const { sidebarWidth, setSidebarWidth, isResizing, setIsResizing } =
    useSidebar(activePortal);

  // States
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("portals");
  const [loading, setLoading] = useState(true);
  const [isNewTabMenuOpen, setIsNewTabMenuOpen] = useState(false);
  const [urlInputField, setUrlInputField] = useState("");
  const [dropdownUrlInput, setDropdownUrlInput] = useState("");

  // Sync address bar input on portal change
  useEffect(() => {
    setUrlInputField(activePortalUrl || "");
  }, [activePortalUrl]);

  // Monitor Firebase Auth State
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setAgentId(user.uid);
        setAgentName(user.displayName || user.email?.split("@")[0] || "Agent");
      } else {
        setAgentId(null);
        setAgentName(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(() => localStorage.getItem("ACTIVE_CUSTOMER_ID"));
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    const unsubscribe = customerService.subscribeToCustomers((list) => {
      setCustomers(list);
    });
    return () => unsubscribe();
  }, []);

  const activeCustomer = customers.find(c => c.id === activeCustomerId) || null;

  useEffect(() => {
    const handleActiveCustChange = () => {
      setActiveCustomerId(localStorage.getItem("ACTIVE_CUSTOMER_ID"));
    };
    window.addEventListener("ACTIVE_CUSTOMER_ID_CHANGED", handleActiveCustChange);
    const interval = setInterval(handleActiveCustChange, 1000);
    return () => {
      window.removeEventListener("ACTIVE_CUSTOMER_ID_CHANGED", handleActiveCustChange);
      clearInterval(interval);
    };
  }, []);

  const handleSelectCustomer = (id: string | null) => {
    if (id) {
      localStorage.setItem("ACTIVE_CUSTOMER_ID", id);
    } else {
      localStorage.removeItem("ACTIVE_CUSTOMER_ID");
    }
    setActiveCustomerId(id);
    window.dispatchEvent(new CustomEvent("ACTIVE_CUSTOMER_ID_CHANGED"));
  };

  const [showAutoFillToast, setShowAutoFillToast] = useState(false);
  const [lastFormMetadata, setLastFormMetadata] = useState<{
    title: string;
    url: string;
  } | null>(null);
  const [lastSavedFile, setLastSavedFile] = useState<{
    blob: Blob;
    name: string;
    dataUrl: string;
  } | null>(null);

  // Global file listener for drag-and-drop persistence
  useEffect(() => {
    const handleFileReady = (e: any) => {
      if (e.detail && e.detail.blob) {
        setLastSavedFile({
          blob: e.detail.blob,
          name: e.detail.name || "document.pdf",
          dataUrl: e.detail.dataUrl,
        });
      }
    };
    window.addEventListener("FILE_READY_FOR_DRAG", handleFileReady);
    return () =>
      window.removeEventListener("FILE_READY_FOR_DRAG", handleFileReady);
  }, []);

  // Robust Global Resize Cleanup
  useEffect(() => {
    if (!isResizing) return;

    const stopResizing = () => {
      setIsResizing(false);
      // Ensure all pointer guards are cleared
      document.body.style.cursor = "default";
      ipc.send("set-resizing-state", false);
    };

    window.addEventListener("mouseup", stopResizing);
    window.addEventListener("mouseleave", stopResizing);
    window.addEventListener("blur", stopResizing); // Safety: reset if window loses focus

    return () => {
      window.removeEventListener("mouseup", stopResizing);
      window.removeEventListener("mouseleave", stopResizing);
      window.removeEventListener("blur", stopResizing);
    };
  }, [isResizing, setIsResizing, ipc]);

  // Global Error Listeners
  useEffect(() => {
    const handleError = (event: ErrorEvent) =>
      reportAppError(event.error || event.message, "Global Window Error");
    const handleRejection = (event: PromiseRejectionEvent) =>
      reportAppError(event.reason, "Global Promise Rejection");
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  // Assistant Stage Listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "assistant-stage-changed") {
        const stage = event.data.stage;
        if (["scanning", "extracting", "requirements"].includes(stage))
          setSidebarWidth(35);
        else if (["filling", "preview", "idle"].includes(stage))
          setSidebarWidth(15);

        // Ensure resizing is false when stage changes as a precaution
        setIsResizing(false);
        ipc.send("set-resizing-state", false);
      }
      if (event.data?.type === "FORM_FIELDS_CAPTURED") {
        setLastFormMetadata({ title: event.data.title, url: event.data.url });
        setShowAutoFillToast(true);
        setActiveTab("portals");
        setTimeout(() => setShowAutoFillToast(false), 5000);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [setSidebarWidth, setIsResizing, ipc]);

  // Listen for new tab requests from Electron
  useEffect(() => {
    const handleNewTab = (event: any, data: { url: string; name: string }) => {
      if (data && data.url) {
        openPortal(data.url, data.name || "இணையதளப் பக்கம்");
      }
    };

    if (isDesktop && ipc) {
      if (typeof ipc.on === 'function') {
        ipc.on("new-tab-opened", handleNewTab);
        return () => {
          if (typeof ipc.removeListener === 'function') {
            ipc.removeListener("new-tab-opened", handleNewTab);
          }
        };
      }
    }
  }, [tabs, isDesktop, ipc]);

  const openPortal = (url: string, name: string) => {
    const cleanUrl = url.trim();
    if (cleanUrl !== "newtab") {
      const existingTab = tabs.find((t) => t.url === cleanUrl);
      if (existingTab) {
        setActiveTabId(existingTab.id);
        setActivePortal(existingTab.name);
        setActivePortalUrl(existingTab.url);
        if (isDesktop) {
          ipc.send("switch-tab", existingTab.id);
        }
        return;
      }
    }

    const newTabId = "tab-" + Date.now();
    const newTab = { id: newTabId, name, url: cleanUrl };
    
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTabId);
    setActivePortal(name);
    setActivePortalUrl(cleanUrl);

    if (isDesktop && cleanUrl && cleanUrl !== "newtab") {
      ipc.send("open-portal", { id: newTabId, url: cleanUrl, name });
    }
  };

  const updateCurrentTab = (url: string, name: string) => {
    const cleanUrl = url.trim();
    if (!activeTabId) return;

    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId ? { ...tab, name, url: cleanUrl } : tab
      )
    );
    setActivePortal(name);
    setActivePortalUrl(cleanUrl);

    if (isDesktop && cleanUrl) {
      ipc.send("open-portal", { id: activeTabId, url: cleanUrl, name });
    }
  };

  const closeTab = (tabId: string) => {
    setTabs((prev) => {
      const updated = prev.filter((t) => t.id !== tabId);
      
      if (isDesktop) {
        ipc.send("close-tab", tabId);
      }

      if (updated.length === 0) {
        setActivePortal(null);
        setActivePortalUrl(null);
        setActiveTabId(null);
        setIsResizing(false);
        ipc.send("set-resizing-state", false);
        if (isDesktop) {
          ipc.send("close-portal");
        }
      } else {
        if (activeTabId === tabId) {
          const lastTab = updated[updated.length - 1];
          setActiveTabId(lastTab.id);
          setActivePortal(lastTab.name);
          setActivePortalUrl(lastTab.url);
          if (isDesktop) {
            ipc.send("switch-tab", lastTab.id);
          }
        }
      }
      return updated;
    });
  };

  const closePortal = () => {
    setTabs([]);
    setActiveTabId(null);
    setActivePortal(null);
    setActivePortalUrl(null);
    setIsResizing(false);
    ipc.send("set-resizing-state", false);
    if (isDesktop) {
      ipc.send("close-portal");
    }
  };

  const minimizePortal = () => {
    setActivePortal(null);
    setActivePortalUrl(null);
    setIsResizing(false);
    if (isDesktop && ipc) {
      ipc.send("hide-portal-views");
    }
  };

  const resumeActivePortal = () => {
    if (tabs.length > 0) {
      const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[tabs.length - 1];
      setActiveTabId(activeTab.id);
      setActivePortal(activeTab.name);
      setActivePortalUrl(activeTab.url);
      if (isDesktop && ipc) {
        ipc.send("switch-tab", activeTab.id);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (e) {
      console.error("Sign out error", e);
    }
    localStorage.removeItem("LOCAL_AGENT_ID");
    localStorage.removeItem("LOCAL_AGENT_NAME");
    localStorage.removeItem("LOCAL_AGENT_EMAIL");
    localStorage.removeItem("LOCAL_AGENT_STATE");
    setAgentId(null);
    window.location.reload();
  };

  // -------------------------------------------------------------------------
  // DESKTOP MODE RENDERER
  // -------------------------------------------------------------------------
  const renderDesktopPortalLayout = () => {
    if (!activePortal) return null;

    return (
      <div className="h-screen w-screen flex bg-[#0f172a] overflow-hidden select-none relative">
        {/* Left Side: Assistant */}
        <aside
          style={{ width: `${sidebarWidth}%` }}
          className={`min-w-[200px] max-w-[80%] h-full flex flex-col bg-white z-20 relative border-r transform-gpu overflow-hidden backface-visibility-hidden will-change-[width] ${
            isResizing
              ? "transition-none select-none border-r-blue-500 ring-4 ring-blue-500/10"
              : "transition-none border-slate-200"
          }`}
        >
          <div className="flex-1 overflow-hidden">
            <AssistantOverlay
              isEmbedded={true}
              portalName={activePortal}
              onClose={closePortal}
              sidebarWidth={sidebarWidth}
            />
          </div>
        </aside>

        {/* Resizable Handle - Sleek Modern Divider */}
        <div
          className={`w-2 h-full cursor-col-resize z-30 relative flex items-center justify-center transition-all duration-300 group select-none ${isResizing ? "bg-indigo-600" : "bg-slate-200 border-x border-slate-300/10 hover:bg-slate-300"}`}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
            document.body.style.cursor = "col-resize";
            ipc.send("set-resizing-state", true);
          }}
        >
          {/* Invisible Hit Area Expansion */}
          {isResizing && (
            <div className="absolute inset-y-0 -left-32 -right-32 z-[100000] cursor-col-resize" />
          )}

          {/* Sleek Minimal Grip Indicator */}
          <div
            className={`w-9 h-9 rounded-full border border-slate-200 bg-white shadow-lg flex items-center justify-center gap-[3px] transition-all duration-300 pointer-events-none z-[110] ${isResizing ? "scale-110 opacity-100 border-indigo-500" : "opacity-0 group-hover:opacity-100 group-hover:scale-105"}`}
          >
            <div
              className={`w-[2px] h-4 rounded-full transition-colors duration-300 ${isResizing ? "bg-indigo-600" : "bg-slate-400"}`}
            />
            <div
              className={`w-[2px] h-4 rounded-full transition-colors duration-300 ${isResizing ? "bg-indigo-600" : "bg-slate-400"}`}
            />
          </div>
        </div>

        {/* Right Side: Website Content */}
        <main
          className={`flex-1 bg-slate-900 flex flex-col relative z-10 overflow-hidden transform-gpu will-change-[transform] ${isResizing ? "pointer-events-none select-none transition-none" : isDesktop ? "transition-none" : "transition-[all] duration-300 ease-in-out"}`}
        >
          {/* GOOGLE CHROME STYLE 2-TIER BROWSER FRAME */}
          <div className="flex flex-col shrink-0 select-none z-50">
            {/* TIER 1: CHROME TAB STRIP */}
            <div className="h-11 bg-[#0f172a] flex items-end px-4 gap-1 pt-1 border-b border-indigo-950/40 relative">
              {/* Chrome macOS Style Control Buttons */}
              <div className="flex gap-1.5 pr-4 shrink-0 pb-2.5">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
                <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
              </div>

              {/* Seamless Chrome Tabs List */}
              <div className="flex items-end overflow-x-auto gap-[3px] px-1 h-full max-w-[calc(100vw-390px)] no-scrollbar">
                {tabs.map((tab) => {
                  const isActive = activeTabId === tab.id;
                  return (
                    <div
                      key={tab.id}
                      onClick={() => {
                        setActiveTabId(tab.id);
                        setActivePortal(tab.name);
                        setActivePortalUrl(tab.url);
                        if (isDesktop) {
                          ipc.send("switch-tab", tab.id);
                        }
                      }}
                      className={`group/tab relative flex items-center gap-2 pl-4 pr-3.5 py-2.5 rounded-t-[10px] text-[11px] font-black cursor-pointer transition-all duration-150 shrink-0 select-none h-[34px] ${
                        isActive
                          ? "bg-[#1e293b] text-white shadow-[0_-1px_4px_rgba(0,0,0,0.15)] z-20 border-b-2 border-b-[#1e293b] -mb-[1px]"
                          : "bg-[#0f172a] text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border-r border-slate-800/20"
                      }`}
                    >
                      <Globe size={11} className={`${isActive ? "text-indigo-400 animate-pulse" : "text-slate-500"} shrink-0`} />
                      <span className="truncate max-w-[120px] uppercase tracking-wider text-[10px]/none leading-none">
                        {tab.name}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(tab.id);
                        }}
                        className="p-0.5 rounded-full hover:bg-black/25 text-slate-400 hover:text-red-400 transition-colors focus:outline-none shrink-0"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* THE CHROME PLUS (+) BUTTON FOR QUICK CHROME POPUP (Moved outside of scroll area so the dropdown won't clip) */}
              <div className="relative shrink-0 pb-1.5 self-end z-50">
                <button
                  onClick={() => openPortal("newtab", "புதிய பக்கம்")}
                  className="w-7 h-7 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-sm bg-white/5"
                  title="புதிய போர்டல் திறக்க (New Tab)"
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>

            {/* TIER 2: NAVIGATION & ADDRESS BAR (Seamlessly connected to Active Tab!) */}
            <div className="h-12 bg-[#1e293b] border-b border-indigo-500/20 flex items-center px-4 gap-4 w-full shadow-md">
              {/* Back / Forward / Reload Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => isDesktop && ipc.send("portal-back")}
                  title="முந்தைய பக்கம் (Back)"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  onClick={() => isDesktop && ipc.send("portal-forward")}
                  title="அடுத்த பக்கம் (Forward)"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
                >
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => isDesktop && ipc.send("portal-reload")}
                  title="மறுபதிவேற்றம் (Reload)"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                >
                  <RotateCw size={14} />
                </button>
              </div>

              {/* Secure Chrome Address Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (urlInputField.trim()) {
                    let targetUrl = urlInputField.trim();
                    if (!/^https?:\/\//i.test(targetUrl)) {
                      targetUrl = "https://" + targetUrl;
                    }
                    updateCurrentTab(targetUrl, "இணையதளம்");
                  }
                }}
                className="flex-1 max-w-2xl"
              >
                <div className="w-full bg-black/35 hover:bg-black/50 focus-within:bg-[#0f172a] border border-indigo-500/10 focus-within:border-indigo-500/40 text-slate-300 font-mono text-xs px-4 py-1.5 rounded-xl flex items-center gap-2.5 transition-all shadow-inner">
                  <Lock size={12} className="text-emerald-500 shrink-0" />
                  <input
                    type="text"
                    value={urlInputField}
                    onChange={(e) => setUrlInputField(e.target.value)}
                    className="bg-transparent border-none outline-none text-slate-200 w-full focus:ring-0 leading-none select-text py-0.5"
                    placeholder="வலைப்பக்க முகவரி (website url) உள்ளிடவும்..."
                  />
                </div>
              </form>

              {/* Connection and Action Buttons */}
              <div className="flex items-center gap-3 shrink-0 ml-auto leading-none">
                {/* Secure Badge */}
                <div className="hidden lg:flex items-center gap-2 bg-black/20 border border-white/5 rounded-xl px-3 py-1.5 select-none shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0" />
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest leading-none">
                    SECURE
                  </span>
                </div>

                <button
                  onClick={minimizePortal}
                  className="group flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-600 text-indigo-400 hover:text-white transition-all duration-300 border border-indigo-500/10 hover:border-indigo-600 shadow-md cursor-pointer select-none"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                    மீண்டும் டேஷ்போர்டு (Dashboard)
                  </span>
                </button>

                <button
                  onClick={closePortal}
                  className="group flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-all duration-300 border border-red-500/10 hover:border-red-600 shadow-md cursor-pointer select-none"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                    Close All ({tabs.length})
                  </span>
                  <X size={12} className="group-hover:rotate-90 transition-transform shrink-0" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 relative bg-slate-50">
            {activePortalUrl === "newtab" ? (
              <div className="w-full h-full p-6 overflow-y-auto bg-slate-50 relative">
                <Portals onOpenPortal={(url, name) => updateCurrentTab(url, name)} />
              </div>
            ) : isDesktop ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50/50 relative">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-10" />
                <div className="relative z-10 flex flex-col items-center gap-6 animate-pulse">
                  <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-200">
                    <Monitor className="text-blue-600" size={32} />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                      Secure Desktop Surface
                    </p>
                    <p className="text-xs font-bold text-slate-600">
                      இணையதளம் பாதுகாப்பாகத் திறக்கப்பட்டுள்ளது...
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <iframe
                key={activePortalUrl}
                src={activePortalUrl || ""}
                className="w-full h-full border-none shadow-inner"
                title={activePortal || "Portal"}
                sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
              />
            )}
          </div>
        </main>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // WEB MODE LOCKOUT
  // -------------------------------------------------------------------------
  const renderWebLockoutLayout = () => {
    return (
      <div className="h-screen w-screen flex flex-col bg-[#020617] items-center justify-center p-8 select-none relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 animate-pulse"></div>

        <div className="relative z-10 max-w-xl text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 bg-blue-600/10 rounded-3xl flex items-center justify-center mx-auto mb-10 ring-1 border border-blue-500/20 shadow-2xl shadow-blue-600/20"
          >
            <Monitor className="text-blue-500" size={48} />
          </motion.div>
          <h3 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter">
            Desktop Version Required
          </h3>
          <p className="text-blue-500 text-sm font-black uppercase tracking-[0.3em] mb-12">
            தொடர டெஸ்க்டாப் ஆப் அவசியம்
          </p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="p-12 bg-blue-600 rounded-[3.5rem] shadow-2xl text-left border border-white/10 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/10 transition-all" />
            <p className="text-white text-sm font-medium leading-relaxed mb-10 relative z-10 opacity-90">
              பாதுகாப்பு விதிகள் மற்றும் AI பயன்பாட்டு வசதிகள் காரணமாக இந்த
              இணையதளத்தை உங்கள் பிரவுசரில் நேரடியாகத் திறக்க முடியாது. 100%
              பாதுகாப்பான மற்றும் மேம்படுத்தப்பட்ட வசதிகளுக்கு எங்களின்
              டெஸ்க்டாப் ஆப்பை பயன்படுத்தவும்.
            </p>
            <div className="flex flex-col gap-4 relative z-10">
              <a
                href={`https://github.com/kumaran434/esevai-assistant/releases/download/v${packageInfo.version}/esevadraft.Setup.${packageInfo.version}.exe`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-5 bg-white text-blue-600 rounded-2xl font-black text-xs text-center uppercase tracking-[0.2em] hover:bg-slate-50 transition-all shadow-xl active:scale-95"
              >
                Download Desktop App / ஆப்பை பதிவிறக்கவும்
              </a>
              <button
                onClick={() => setActivePortal(null)}
                className="w-full py-4 bg-transparent text-white/60 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
              >
                Back to Dashboard / முகப்புப் பக்கம்
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 font-sans">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mb-6"
        />
        <h2 className="text-white font-black text-xs uppercase tracking-[0.3em] animate-pulse">
          Initializing Agent...
        </h2>
      </div>
    );
  }

  const renderContent = () => {
    return (
      <div className="relative w-full h-full flex items-stretch">
        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className={activeTab === "dashboard" ? "block" : "hidden"}>
            <Dashboard
              activeCustomerId={activeCustomerId}
              onSelectCustomer={handleSelectCustomer}
              onBrowsePortals={() => setActiveTab("portals")}
              onTabChange={setActiveTab}
            />
          </div>
          <div className={activeTab === "portals" ? "block" : "hidden"}>
            <Portals onTabChange={setActiveTab} onOpenPortal={openPortal} />
          </div>
          <div className={activeTab === "tools" ? "block" : "hidden"}>
            <DocumentTools onTabChange={setActiveTab} onSyncSignature={() => {}} activeProfile={activeCustomer} />
          </div>
          <div className={activeTab === "download" ? "block" : "hidden"}>
            <DownloadSection />
          </div>
          <div className={activeTab === "profile" ? "block" : "hidden"}>
            <UserProfile 
              agentName={agentName}
              email={auth.currentUser?.email || null}
              onLogout={handleLogout}
              onTabChange={setActiveTab}
            />
          </div>
          <div className={activeTab === "pricing" ? "block" : "hidden"}>
            <Pricing />
          </div>
          <div className={activeTab === "admin" ? "block" : "hidden"}>
            <AdminLogs />
          </div>
        </div>
      </div>
    );
  };

  const renderCurrentView = () => {
    if (isAssistantOverlay) return <AssistantOverlay />;
    if (!agentId)
      return (
        <Auth
          onLogin={(id, name) => {
            setAgentId(id);
            setAgentName(name);
          }}
        />
      );

    if (activePortal) {
      if (isDesktop || activePortalUrl === "newtab") return renderDesktopPortalLayout();
      return renderWebLockoutLayout();
    }

    return (
      <Layout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={{
          displayName: agentName,
          email: auth.currentUser?.email || "",
          photoURL: auth.currentUser?.photoURL,
        }}
        onLogout={handleLogout}
      >
        {renderContent()}
      </Layout>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans tracking-tight">
      <AnimatePresence>
        {toast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none w-full max-w-sm px-4">
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className={`pointer-events-auto flex items-center gap-3 p-4 rounded-2xl shadow-2xl border ${toast.type === "success" ? "bg-white border-green-100 text-green-800" : "bg-white border-red-100 text-red-800"}`}
            >
              <p className="text-xs font-black uppercase tracking-tight flex-1 leading-tight">
                {toast.message}
              </p>
              <button
                onClick={hideToast}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={14} className="text-slate-400" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAutoFillToast && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[10000] w-full max-w-lg px-4"
          >
            <div className="bg-green-600 text-white p-6 rounded-3xl shadow-2xl flex items-center justify-between border-4 border-white">
              <div className="flex items-center gap-4">
                <div className="bg-white text-green-600 p-3 rounded-full flex-shrink-0 animate-bounce">
                  <Zap size={24} fill="currentColor" />
                </div>
                <div>
                  <h4 className="font-black text-sm uppercase tracking-widest">
                    படிவம் கண்டறியப்பட்டது!
                  </h4>
                  <p className="text-xs opacity-90 font-bold leading-tight">
                    Fill Ready (தயார்)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAutoFillToast(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {renderCurrentView()}

      {activePortal === null && tabs.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[999]">
          <button
            onClick={resumeActivePortal}
            className="flex items-center gap-3 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-2xl border-2 border-white/20 select-none cursor-pointer transition-all active:scale-95 hover:shadow-indigo-500/20 shadow-indigo-600/35"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider">
              திறந்துள்ள பக்கங்களுக்குச் செல் ({tabs.length} பக்கங்கள்)
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
