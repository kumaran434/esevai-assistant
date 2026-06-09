import React, { useState, useEffect } from "react";
import { 
  Scaling, 
  Download,
  PenTool,
  Image as ImageIcon,
  FileText,
  CreditCard,
  ChevronLeft,
  Languages,
  FileStack,
  FileSearch,
  Sparkles,
  Lock,
  X,
  Zap,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../lib/translations";

// Import new tools
import PdfCompressor from "./tools/PdfCompressor";
import IdCardTool from "./tools/IdCardTool";
import SignatureGenerator from "./tools/SignatureGenerator";
import PdfToImage from "./tools/PdfToImage";
import ImageToPdf from "./tools/ImageToPdf";
import PdfMerger from "./tools/PdfMerger";
import TranslatorTool from "./tools/TranslatorTool";
import PassportResizer from "./tools/PassportResizer";
import DataExtractionTool from "./tools/DataExtractionTool";
import WordEditor from "./tools/WordEditor";

type ToolId = 'pdf-compress' | 'id-card' | 'signature' | 'pdf-to-image' | 'image-to-pdf' | 'pdf-merge' | 'translator' | 'passport-resizer' | 'data-extraction' | 'word-editor' | 'whatsapp-web';

interface ToolItem {
  readonly id: ToolId;
  readonly label: string;
  readonly description: string;
  readonly icon: React.ComponentType<any>;
  readonly color: string;
  readonly plan: 'FREE' | 'PREMIUM';
}

export default function DocumentTools({ 
  activeProfile, 
  onSyncSignature, 
  onTabChange,
  onOpenPortal
}: { 
  activeProfile?: any; 
  onSyncSignature?: (b64: string) => void;
  onTabChange?: (tab: string) => void;
  onOpenPortal?: (url: string, name: string) => void;
}) {
  const { language, t } = useLanguage();
  const [selectedTool, setSelectedTool] = useState<ToolId | null>(() => {
    return (localStorage.getItem("PRE_SELECTED_TOOL") as ToolId) || null;
  });

  useEffect(() => {
    // Clear out preselected tool right after reading to avoid sticky behavior
    localStorage.removeItem("PRE_SELECTED_TOOL");
  }, []);
  
  // Track user's active subscription plan
  const [subscribedPlan, setSubscribedPlan] = useState<string>(() => {
    return localStorage.getItem("SUBSCRIBED_PLAN") || "FREE";
  });

  // Keep subscription status in sync
  useEffect(() => {
    const handlePlanChange = () => {
      setSubscribedPlan(localStorage.getItem("SUBSCRIBED_PLAN") || "FREE");
    };
    window.addEventListener("SUBSCRIBED_PLAN_CHANGED", handlePlanChange);
    return () => {
      window.removeEventListener("SUBSCRIBED_PLAN_CHANGED", handlePlanChange);
    };
  }, []);

  // State to handle upgrade popups for premium tools
  const [lockedTool, setLockedTool] = useState<ToolItem | null>(null);

  const tools: readonly ToolItem[] = [
    { 
      id: 'word-editor', 
      label: t('wordEditor'), 
      description: t('wordEditorDesc'), 
      icon: FileText,
      color: 'bg-indigo-50 text-indigo-600',
      plan: 'FREE'
    },
    { 
      id: 'data-extraction', 
      label: t('dataExtraction'), 
      description: t('dataExtractionDesc'), 
      icon: FileSearch,
      color: 'bg-orange-50 text-orange-500',
      plan: 'FREE'
    },
    { 
      id: 'id-card', 
      label: t('idCardTool'), 
      description: t('idCardDesc'), 
      icon: CreditCard,
      color: 'bg-blue-50 text-blue-500',
      plan: 'FREE'
    },
    { 
      id: 'passport-resizer', 
      label: t('passportResizer'), 
      description: t('passportResizerDesc'), 
      icon: Scaling,
      color: 'bg-rose-50 text-rose-500',
      plan: 'FREE'
    },
    { 
      id: 'pdf-to-image', 
      label: t('pdfToImage'), 
      description: t('pdfToImageDesc'), 
      icon: ImageIcon,
      color: 'bg-emerald-50 text-emerald-500',
      plan: 'FREE'
    },
    { 
      id: 'pdf-merge', 
      label: t('mergePdf'), 
      description: t('mergePdfDesc'), 
      icon: FileStack,
      color: 'bg-indigo-50 text-indigo-500',
      plan: 'FREE'
    },
    { 
      id: 'image-to-pdf', 
      label: t('imageToPdf'), 
      description: t('imageToPdfDesc'), 
      icon: FileText,
      color: 'bg-cyan-50 text-cyan-500',
      plan: 'FREE'
    },
    { 
      id: 'signature', 
      label: t('signGenerator'), 
      description: t('signGeneratorDesc'), 
      icon: PenTool,
      color: 'bg-amber-50 text-amber-500',
      plan: 'FREE'
    },
    { 
      id: 'translator', 
      label: t('translator'), 
      description: t('translatorDesc'), 
      icon: Languages,
      color: 'bg-purple-50 text-purple-500',
      plan: 'PREMIUM'
    },
    { 
      id: 'pdf-compress', 
      label: t('pdfCompressor'), 
      description: t('pdfCompressorDesc'), 
      icon: FileText,
      color: 'bg-red-50 text-red-500',
      plan: 'FREE'
    },
    { 
      id: 'whatsapp-web', 
      label: language === 'ta' ? 'வாட்ஸ்ஆப் வெப் (WhatsApp)' : 'WhatsApp Web', 
      description: language === 'ta' ? 'வாடிக்கையாளரின் கோப்புகள் மற்றும் விவரங்களைப் பெற வாட்ஸ்அப் வெப் திறக்கவும்.' : 'Open WhatsApp Web to chat & get customer files.', 
      icon: MessageSquare,
      color: 'bg-emerald-50 text-emerald-600',
      plan: 'FREE'
    },
  ] as const;

  const renderToolComponent = (id: ToolId) => {
    switch (id) {
      case 'pdf-compress': return <PdfCompressor />;
      case 'id-card': return <IdCardTool />;
      case 'signature': return <SignatureGenerator activeProfile={activeProfile} onSync={onSyncSignature} />;
      case 'pdf-to-image': return <PdfToImage />;
      case 'image-to-pdf': return <ImageToPdf />;
      case 'pdf-merge': return <PdfMerger />;
      case 'translator': return <TranslatorTool />;
      case 'passport-resizer': return <PassportResizer />;
      case 'data-extraction': return <DataExtractionTool />;
      case 'word-editor': return <WordEditor activeProfile={activeProfile} onBack={() => setSelectedTool(null)} />;
      default: return null;
    }
  };

  const modalText = {
    title: { 
      en: "Premium Unlimited Feature", 
      ta: "அன்லிமிடெட் பிரீமியம் அம்சம்" 
    },
    desc: { 
      en: "This advanced tool is only for Premium Unlimited members. Upgrade your plan to instantly unlock this and all other advanced features.", 
      ta: "இந்த மேம்பட்ட செயலி பிரீமியம் அன்லிமிடெட் பயனர்களுக்கு மட்டுமே கிடைக்கும். உங்கள் திட்டத்தை உடனே மேம்படுத்தி வரம்புகள் இல்லாமல் பயன்படுத்தவும்." 
    },
    featuresTitle: { 
      en: "Premium Unlimited Benefits:", 
      ta: "பிரீமியமின் சிறப்பம்சங்கள்:" 
    },
    feature1: { 
      en: "1-Click Secure Auto-fill Portal Logins", 
      ta: "1-கிளிக் பாதுகாப்பான தானியங்கி போர்ட்டல் லாகின்" 
    },
    feature2: { 
      en: "100% Unlimited usage of all 9+ tools", 
      ta: "அனைத்து 9+ கருவிகளையும் வரம்பில்லாமல் பயன்படுத்தலாம்" 
    },
    feature3: { 
      en: "Ultra-fast servers with zero lag & ads", 
      ta: "அதிவேக சர்வர்கள் மற்றும் விளம்பரங்கள் இல்லை" 
    },
    upgradeBtn: { 
      en: "Upgrade to Premium Unlimited - ₹149", 
      ta: "பிரீமியமிற்கு மேம்படுத்து - ₹149 மட்டும்" 
    },
    closeBtn: { 
      en: "Close", 
      ta: "மூடு" 
    }
  };

  const getM = (key: keyof typeof modalText) => {
    return modalText[key][language] || modalText[key]["en"];
  };

  const handleToolClick = (tool: ToolItem) => {
    if (tool.id === 'whatsapp-web') {
      if (onOpenPortal) {
        onOpenPortal("https://web.whatsapp.com/", "WhatsApp Web");
      } else {
        window.open("https://web.whatsapp.com/", "_blank");
      }
      return;
    }
    if (tool.plan === 'PREMIUM' && subscribedPlan !== 'PREMIUM') {
      setLockedTool(tool);
    } else {
      setSelectedTool(tool.id);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32">
      {/* 1. Main Grid View - Only shown when no tool is active */}
      {!selectedTool && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {tools.map((tool) => (
            <button 
              key={tool.id}
              onClick={() => handleToolClick(tool)}
              className="group p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all text-left flex flex-col gap-6 relative overflow-hidden"
            >
              {/* Plan Badge */}
              {tool.plan === 'PREMIUM' ? (
                <div className="absolute top-6 right-6 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[9px] font-black uppercase rounded-full tracking-wider shadow-sm flex items-center gap-1">
                  <Sparkles size={10} className="text-amber-300 animate-pulse" />
                  {language === "ta" ? "பிரீமியம்" : "Premium"}
                </div>
              ) : (
                <div className="absolute top-6 right-6 px-3 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase rounded-full tracking-wider border border-emerald-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {language === "ta" ? "இலவசம்" : "Free"}
                </div>
              )}

              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${tool.color}`}>
                <tool.icon size={28} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm pr-16">{tool.label}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic leading-relaxed">{tool.description}</p>
              </div>
              <div className="mt-2 flex items-center gap-1 text-[10px] font-black text-slate-900 opacity-0 group-hover:opacity-100 uppercase tracking-[0.2em] transition-opacity">
                {tool.plan === 'PREMIUM' && subscribedPlan !== 'PREMIUM' ? (
                  <span className="flex items-center gap-1 text-indigo-600">
                    <Lock size={12} strokeWidth={3} /> {language === "ta" ? "பூட்டப்பட்டுள்ளது" : "Unlock Pro"}
                  </span>
                ) : (
                  <>
                    {t('openTool')} <Download size={12} strokeWidth={3} className="ml-1" />
                  </>
                )}
              </div>
            </button>
          ))}
        </motion.div>
      )}

      {/* 2. Active Tool Interface */}
      {selectedTool && (
        <div className="space-y-6">
          {/* Top Navigation Bar - Sticky or Fixed at top of content (Hidden for Word Editor as it has integrated top menu) */}
          {selectedTool !== 'word-editor' && (
            <div className="sticky top-4 z-40 flex items-center">
              <button 
                onClick={() => setSelectedTool(null)}
                className="flex items-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-[2rem] hover:bg-slate-800 transition-all shadow-xl hover:scale-105 active:scale-95"
                title={t('backToTools')}
              >
                <ChevronLeft size={16} strokeWidth={3} />
                <span className="text-[10px] font-black uppercase tracking-widest">{t('backToTools')}</span>
              </button>
            </div>
          )}

          {/* Render All Tools wrapped in divs to preserve state */}
          <div className="relative">
            {tools.map((tool) => (
              <div 
                key={tool.id} 
                className={selectedTool === tool.id ? "block" : "hidden"}
              >
                {tool.id === 'word-editor' ? (
                  <div className="relative z-10 w-full">
                    {renderToolComponent(tool.id as ToolId)}
                  </div>
                ) : (
                  <div className="bg-white p-10 sm:p-16 rounded-[3rem] border border-slate-100 shadow-2xl relative overflow-hidden min-h-[600px]">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50"></div>
                    <div className="relative z-10">
                      <div className="mb-10 flex flex-col gap-2">
                         <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                            <tool.icon size={32} className="text-blue-600" />
                            {tool.label}
                         </h2>
                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">{tool.description}</p>
                      </div>
                      {renderToolComponent(tool.id as ToolId)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom Tools List - Persistent at the bottom */}
          <div className="mt-20 pt-20 border-t-2 border-slate-100 pb-20">
             <div className="flex flex-col gap-2 mb-12 px-2">
                <div className="flex items-center gap-3">
                   <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                   <h3 className="text-xl font-black uppercase tracking-[0.2em] text-slate-900">
                     Switch Tools / மற்ற கருவிகள்
                   </h3>
                </div>
                <p className="text-xs font-bold text-slate-400 ml-5 uppercase tracking-widest">
                   You can quickly switch to any other tool without losing your current progress.
                </p>
             </div>
             
             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {tools.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      if (t.plan === 'PREMIUM' && subscribedPlan !== 'PREMIUM') {
                        setLockedTool(t);
                      } else {
                        setSelectedTool(t.id as ToolId);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className={`flex flex-col gap-4 p-8 rounded-[2.5rem] border-2 transition-all active:scale-95 group relative overflow-hidden ${
                      selectedTool === t.id 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-2xl shadow-blue-500/40 translate-y-[-4px]' 
                        : 'bg-white border-slate-100 text-slate-600 hover:border-blue-300 hover:shadow-xl shadow-sm'
                    }`}
                  >
                    {selectedTool === t.id && (
                      <div className="absolute top-0 right-0 p-3">
                        <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                      </div>
                    )}
                    <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm ${selectedTool === t.id ? 'bg-white/20 text-white' : t.color}`}>
                      <t.icon size={28} strokeWidth={2.5} />
                    </div>
                    <div className="text-left">
                       <p className="text-[12px] font-black uppercase tracking-widest leading-tight">{t.label}</p>
                       <div className="flex items-center gap-1.5 mt-2">
                         <span className={`text-[9px] font-bold uppercase tracking-widest opacity-60 ${selectedTool === t.id ? 'text-white' : ''}`}>
                           {selectedTool === t.id ? 'Active' : 'Switch'}
                         </span>
                         <span className="text-slate-300">•</span>
                         {t.plan === 'PREMIUM' ? (
                           <span className={`text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5 ${selectedTool === t.id ? 'text-amber-300 font-extrabold' : 'text-blue-600 shadow-sm'}`}>
                             <Sparkles size={8} /> Pro
                           </span>
                         ) : (
                           <span className={`text-[8px] font-bold uppercase tracking-wider ${selectedTool === t.id ? 'text-emerald-300' : 'text-emerald-600'}`}>
                             Free
                           </span>
                         )}
                       </div>
                    </div>
                  </button>
                ))}
             </div>
          </div>

          {/* Quick Guidance */}
          <div className="flex items-center justify-between px-8 py-4 bg-blue-50 rounded-3xl border border-blue-100">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shadow-sm font-black text-[10px]">!</div>
                <p className="text-[10px] font-bold text-blue-800 uppercase tracking-widest">
                  ஒரே நேரத்தில் பல கருவிகளைப் பயன்படுத்தலாம். தகவல்கள் அழியாது.
                </p>
             </div>
             <button 
                onClick={() => setSelectedTool(null)}
                className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] hover:underline"
             >
                Explore All Tools
             </button>
          </div>
        </div>
      )}

      {/* Upgrade Plan Modal */}
      <AnimatePresence>
        {lockedTool && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLockedTool(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="bg-white rounded-[3rem] p-8 sm:p-10 max-w-md w-full relative z-20 border border-slate-100 shadow-2xl flex flex-col gap-6"
            >
              {/* Close Button */}
              <button 
                onClick={() => setLockedTool(null)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-50 transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>

              {/* Icon / Header */}
              <div className="text-center space-y-2 mt-2">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 border border-indigo-100 relative">
                  <Lock size={28} />
                  <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-1 shadow-md">
                    <Sparkles size={12} fill="currentColor" />
                  </div>
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  {getM("title")}
                </h3>
                <p className="text-xs text-slate-400 font-bold leading-relaxed">
                  {getM("desc")}
                </p>
              </div>

              {/* List features benefits */}
              <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {getM("featuresTitle")}
                </h4>
                <ul className="space-y-3 text-xs font-semibold text-slate-600">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                    <span>{getM("feature1")}</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                    <span>{getM("feature2")}</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                    <span>{getM("feature3")}</span>
                  </li>
                </ul>
              </div>

              {/* Call Action buttons */}
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    setLockedTool(null);
                    onTabChange?.('pricing');
                  }}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl border-b-2 border-indigo-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                  <Zap size={14} fill="currentColor" />
                  {getM("upgradeBtn")}
                </button>
                <button 
                  onClick={() => setLockedTool(null)}
                  className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95"
                >
                  {getM("closeBtn")}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
