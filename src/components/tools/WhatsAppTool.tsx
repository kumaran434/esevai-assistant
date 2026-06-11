import React, { useRef, useState, useEffect } from "react";
import { MessageSquare, RotateCw, ExternalLink, ShieldCheck, Loader2, Smartphone, Monitor } from "lucide-react";
import { isElectron } from "../../lib/electron-mock";

interface WhatsAppToolProps {
  isNarrow?: boolean;
}

export default function WhatsAppTool({ isNarrow = false }: WhatsAppToolProps) {
  const webviewRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isDesktop = isElectron();

  useEffect(() => {
    const webview = webviewRef.current;
    const container = containerRef.current;
    if (!webview || !container) return;

    const handleStartLoading = () => setIsLoading(true);
    const handleStopLoading = () => setIsLoading(false);

    webview.addEventListener("did-start-loading", handleStartLoading);
    webview.addEventListener("did-stop-loading", handleStopLoading);

    const updateZoom = () => {
      try {
        const width = container.getBoundingClientRect().width;
        // Dynamic zoom factor to fit any container width without layout cutoffs
        // Base width for full UI density is around 800px. Minimum zoom clamped at 0.45.
        const zoom = Math.min(1.0, Math.max(0.42, width / 800));
        webview.setZoomFactor(zoom);
      } catch (err) {
        // Silently handle if webview API is not yet fully available
      }
    };

    // Set useragent and configure dynamic zoom on dom-ready
    const handleDomReady = () => {
      try {
        webview.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36");
        updateZoom();
      } catch (err) {
        console.error("Error setting custom configurations on webview:", err);
      }
    };
    webview.addEventListener("dom-ready", handleDomReady);

    // Watch for size adjustments (like divider dragging or resizing the app window)
    const observer = new ResizeObserver(() => {
      updateZoom();
    });
    observer.observe(container);

    // Run once initially
    updateZoom();

    return () => {
      if (webview) {
        webview.removeEventListener("did-start-loading", handleStartLoading);
        webview.removeEventListener("did-stop-loading", handleStopLoading);
        webview.removeEventListener("dom-ready", handleDomReady);
      }
      observer.disconnect();
    };
  }, []);

  const handleReload = () => {
    if (webviewRef.current) {
      setIsLoading(true);
      webviewRef.current.reload();
    }
  };

  const handleOpenExternal = () => {
    window.open("https://web.whatsapp.com/", "_blank");
  };

  return (
    <div className="w-full flex flex-col bg-slate-50 border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
      {/* Tool Action Header Bar */}
      <div className="p-3 bg-white border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <MessageSquare size={13} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider block truncate">
              வாட்ஸ்ஆப் வெப் (WhatsApp Web)
            </span>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block truncate">
              Customer Documents In-App Access
            </span>
          </div>
        </div>

        {/* Toggle buttons/View switcher removed - desktop only */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Reload Webview */}
          <button
            onClick={handleReload}
            className="p-1 px-1.5 hover:bg-slate-100 active:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-all flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider cursor-pointer border border-transparent hover:border-slate-100"
            title="Reload WhatsApp"
          >
            <RotateCw size={11} className={isLoading ? "animate-spin text-emerald-500" : ""} />
            {!isNarrow && "மீண்டும் ஏற்று"}
          </button>

          {/* Open External */}
          <button
            onClick={handleOpenExternal}
            className="p-1 px-1.5 hover:bg-slate-100 active:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-all flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider cursor-pointer border border-transparent hover:border-slate-100"
            title="Open in default browser"
          >
            <ExternalLink size={11} />
            {!isNarrow && "தனித் தாவல்"}
          </button>
        </div>
      </div>

      {/* Embedded WhatsApp Window Container */}
      <div ref={containerRef} className="relative w-full bg-slate-100 h-[600px]">
        {/* Loading Spinner overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-50 bg-white/95 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
            <div className="text-center">
              <p className="text-xs font-black text-slate-800 uppercase tracking-wider">
                வாட்ஸ்ஆப் ஏற்றப்படுகிறது...
              </p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Connecting To Secure Chats
              </p>
            </div>
          </div>
        )}

        {isDesktop ? (
          /* Full Width Desktop Layout */
          <webview
            ref={webviewRef}
            src="https://web.whatsapp.com/"
            partition="persist:whatsapp"
            useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
            style={{ width: "100%", height: "100%", background: "#f8fafc" }}
            allowpopups="true"
            id="whatsapp-embedded-webview"
          />
        ) : (
          /* Web fallback if testing in web browser */
          <div className="w-full h-full p-6 flex flex-col items-center justify-center text-center bg-slate-100">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
              <ShieldCheck size={24} />
            </div>
            <p className="text-xs font-black text-slate-800 uppercase tracking-wide">
              டெஸ்க்டாப் பயன்பாட்டில் மட்டுமே கிடைக்கும்
            </p>
            <p className="text-[10px] text-slate-500 max-w-xs mt-1 leading-normal">
              வாட்ஸ்அப் ஆவணங்களை எளிதாகப் பெற இந்த அம்சம் எங்களது பிரத்யேக டெஸ்க்டாப் செயலியில் (Desktop App) மட்டுமே முழுமையாக வேலை செய்யும்.
            </p>
            <button
              onClick={handleOpenExternal}
              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md transition-all cursor-pointer"
            >
              தனித் தாவலில் திறக்கவும்
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
