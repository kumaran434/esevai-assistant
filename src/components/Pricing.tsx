import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Check, 
  X, 
  Zap, 
  Clock, 
  ShieldCheck, 
  CreditCard, 
  QrCode,
  CheckCircle,
  TrendingUp,
  FileText,
  MousePointerClick,
  Database,
  Cpu,
  HelpCircle,
  HelpCircle as InfoIcon
} from "lucide-react";
import { useLanguage } from "../lib/translations";
import { motion, AnimatePresence } from "motion/react";

export default function Pricing() {
  const { language } = useLanguage();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [activePlan, setActivePlan] = useState<string>(() => {
    return localStorage.getItem("SUBSCRIBED_PLAN") || "FREE";
  });
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isKeysConfigured, setIsKeysConfigured] = useState<boolean | null>(null);

  // Helper to dynamically point to VITE_SERVER_URL if configured (supporting standalone / desktop mode)
  const getApiUrl = (endpoint: string) => {
    const baseUrl = import.meta.env.VITE_SERVER_URL || "";
    if (baseUrl) {
      const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
      const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
      return `${cleanBase}${cleanEndpoint}`;
    }
    return endpoint;
  };

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem("SUBSCRIBED_PLAN", activePlan);
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent("SUBSCRIBED_PLAN_CHANGED"));
  }, [activePlan]);

  // Check backend payment keys config status on mount
  useEffect(() => {
    fetch(getApiUrl("/api/payment/status"))
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP Error: ${res.status}`);
        }
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Response is not JSON");
        }
        return res.json();
      })
      .then(data => {
        setIsKeysConfigured(data.configured);
      })
      .catch(err => {
        console.error("Error reading API status:", err);
        setIsKeysConfigured(false);
      });
  }, [showPaymentModal]);

  const loadScript = (src: string) => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSelectFree = () => {
    setActivePlan("FREE");
  };

  const handleStartUpgrade = () => {
    if (activePlan === "PREMIUM") {
      setActivePlan("FREE"); // Toggle back to free for testing
    } else {
      setErrorMessage(null);
      setShowPaymentModal(true);
    }
  };

  const handleSimulatePayment = () => {
    setErrorMessage(null);
    setProcessingPayment(true);
    setTimeout(() => {
      setProcessingPayment(false);
      setPaymentSuccess(true);
      setTimeout(() => {
        setActivePlan("PREMIUM");
        setShowPaymentModal(false);
        setPaymentSuccess(false);
      }, 2000);
    }, 2000);
  };

  const handleRazorpayPayment = async () => {
    setProcessingPayment(true);
    setErrorMessage(null);

    try {
      const amountToCharge = billingCycle === "monthly" ? 149 : 1499;
      const res = await fetch(getApiUrl("/api/payment/create-order"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountToCharge })
      });

      if (!res.ok) {
        const text = await res.text();
        const serverError = text.includes("<!doctype") || text.includes("<html")
          ? (language === "ta" ? "சர்வர் தற்காலிகமாக செயலிழந்துள்ளது (Server Error 500)" : "Server temporarily unavailable (Server Error 500)")
          : text;
        throw new Error(serverError);
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          language === "ta" 
            ? "பதிலீடு JSON வடிவில் இல்லை. சர்வர் பிழை ஏற்பட்டது." 
            : "Server response is not in JSON format."
        );
      }

      const data = await res.json();
      
      if (!data.success) {
        setProcessingPayment(false);
        if (data.error === "configured_missing") {
          setErrorMessage(
            language === "ta"
              ? "சர்வரில் உங்கள் Razorpay API கீகள் (RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET) இன்னும் அமைக்கப்படவில்லை! உங்களின் சொந்தக் கீகள் மூலம் சோதிக்க .env கோப்பில் கீகளைச் சேர்க்கவும். அல்லது கீழே உள்ள மாதிரி கார்டை உபயோகிக்கவும்."
              : "Razorpay keys are not configured in your server variables! To test with your keys, define RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file. Otherwise, use the Simulated Sandbox below."
          );
        } else {
          setErrorMessage(data.message || "Failed to initiate payment.");
        }
        return;
      }

      const scriptLoaded = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
      if (!scriptLoaded) {
        setProcessingPayment(false);
        setErrorMessage(
          language === "ta"
            ? "Razorpay நூலகத்தை ஏற்றுவதில் பிழை. உங்கள் இணையத் தொடர்பை சரிபார்க்கவும்."
            : "Failed to load Razorpay SDK. Check your internet connection."
        );
        return;
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "E-Sevai AI Center",
        description: billingCycle === "monthly" ? "Premium Monthly Subscription" : "Premium Yearly Subscription",
        order_id: data.orderId,
        handler: async function (response: any) {
          setProcessingPayment(true);
          try {
            const verifyRes = await fetch(getApiUrl("/api/payment/verify"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response)
            });
            if (!verifyRes.ok) {
              const text = await verifyRes.text();
              const serverError = text.includes("<!doctype") || text.includes("<html")
                ? (language === "ta" ? "கட்டணச் சரிபார்ப்பு தோல்வி (Server Error 500)" : "Payment verification failed (Server Error 500)")
                : text;
              throw new Error(serverError);
            }
            const verifyContentType = verifyRes.headers.get("content-type");
            if (!verifyContentType || !verifyContentType.includes("application/json")) {
              throw new Error(
                language === "ta"
                  ? "சரிபார்ப்பு பதிலீடு JSON வடிவில் இல்லை."
                  : "Verification response is not in JSON format."
              );
            }
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              setPaymentSuccess(true);
              setTimeout(() => {
                setActivePlan("PREMIUM");
                setShowPaymentModal(false);
                setPaymentSuccess(false);
                setProcessingPayment(false);
              }, 2000);
            } else {
              setErrorMessage(verifyData.message || "Verification failed");
              setProcessingPayment(false);
            }
          } catch (err) {
            console.error("Verification error:", err);
            setErrorMessage("Payment verification failed on server-side check.");
            setProcessingPayment(false);
          }
        },
        prefill: {
          email: "mechkumaran45@gmail.com"
        },
        theme: {
          color: "#4f46e5"
        },
        modal: {
          ondismiss: function() {
            setProcessingPayment(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
      console.error(err);
      setProcessingPayment(false);
      setErrorMessage(err.message || "Failed to make payment request.");
    }
  };

  const isFreeActive = activePlan === "FREE";
  const isPremiumActive = activePlan === "PREMIUM";

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-16 px-4">
      
      {/* 1. Header Banner */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-xs font-black uppercase tracking-wider">
          <Sparkles size={14} className="animate-spin text-blue-600" /> 
          {language === "ta" ? "கட்டண விபரங்கள் மற்றும் ஒப்பீடு" : "Pricing & Comparison Hub"}
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight leading-none mt-2">
          {language === "ta" ? "எளிமையான & வெளிப்படையான திட்டங்கள்" : "Simple, Transparent Pricing"}
        </h2>
        <p className="text-sm font-semibold text-slate-500 max-w-2xl mx-auto leading-relaxed">
          {language === "ta" 
            ? "எந்த குழப்பமும் இல்லை! எங்களின் இலவச பயன்பாட்டுக் கருவிகள் மற்றும் தானியங்கி பிரீமியம் சேவைகளுக்கான விரிவான வேறுபாடுகள் கீழே தெளிவாக வழங்கப்பட்டுள்ளன."
            : "No confusion! Clear classification of our 100% free utility tools and advanced automated premium services."}
        </p>

        {/* Toggle billing cycles */}
        <div className="inline-flex bg-slate-100 rounded-2xl p-1.5 border border-slate-200 mt-6 shadow-inner ring-1 ring-slate-100">
          <button 
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${billingCycle === "monthly" ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-900"}`}
          >
            {language === "ta" ? "மாதாந்திர சந்தா" : "Monthly Bill"}
          </button>
          <button 
            type="button"
            onClick={() => setBillingCycle("yearly")}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${billingCycle === "yearly" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
          >
            {language === "ta" ? "வருடாந்திர சந்தா (15% சேமிப்பு)" : "Yearly Bill (Save 15%)"}
          </button>
        </div>
      </div>

      {/* 2. Side-by-Side Visual Classification of Features */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
        
        {/* FREE PLAN FEATURES SUMMARY */}
        <div className="bg-emerald-50/40 rounded-[2.5rem] p-8 border border-emerald-100 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner">
                ✓
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-emerald-950">
                  {language === "ta" ? "இலவச பயன்பாட்டுக் கருவிகள்" : "100% Free Utilities"}
                </h3>
                <span className="inline-block bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md mt-0.5">
                  {language === "ta" ? "எப்போதும் இலவசம் • வரம்பற்றது" : "Always Free • Unlimited Access"}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-bold">
              {language === "ta"
                ? "கீழே குறிப்பிடப்பட்டுள்ள தினசரிப் பயன்பாட்டுக் கருவிகளை நீங்கள் முற்றிலும் இலவசமாக, எவ்விதக் கட்டணமுமின்றி வரம்பில்லாமல் பயன்படுத்தலாம்:"
                : "Standard utility features are always 100% free with no registration or hidden fees:"}
            </p>

            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-emerald-100 text-xs font-bold text-slate-700">
                <FileText size={16} className="text-emerald-600" />
                <div>
                  <p>{language === "ta" ? "PDF கம்ப்ரசர் (PDF Compressor)" : "PDF Compressor"}</p>
                  <p className="text-[9px] text-slate-400 font-medium">{language === "ta" ? "ஆவணங்களின் அளவைக் குறைத்தல்" : "Optimize and shrink PDF files"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-emerald-100 text-xs font-bold text-slate-700">
                <TrendingUp size={16} className="text-emerald-600" />
                <div>
                  <p>{language === "ta" ? "புகைப்படம் மற்றும் கையொப்ப அளவு மாற்றி (Resizer)" : "Photo & Signature Resizer"}</p>
                  <p className="text-[9px] text-slate-400 font-medium">{language === "ta" ? "ஈ-சேவைக்கு ஏற்ற சரியான பிக்சல் அளவுகள்" : "Resize to precise CSC pixel settings"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-emerald-100 text-xs font-bold text-slate-700">
                <CheckCircle size={16} className="text-emerald-600" />
                <div>
                  <p>{language === "ta" ? "டிஜிட்டல் கையொப்ப உருவாக்கி (Sign Tool)" : "Digital Signature Maker"}</p>
                  <p className="text-[9px] text-slate-400 font-medium">{language === "ta" ? "விரல் மூலம் திரையில் வரைந்து கையொப்பம் பெறுதல்" : "Draw custom signature on screen easily"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-emerald-100 text-xs font-bold text-slate-700">
                <Cpu size={16} className="text-emerald-600" />
                <div>
                  <p>{language === "ta" ? "கோப்பு வடிவ மாற்றி (Converter)" : "Format Converter"}</p>
                  <p className="text-[9px] text-slate-400 font-medium">{language === "ta" ? "JPEG லிருந்து PDF மற்றும் பிற வடிவங்களுக்கு மாற்றுதல்" : "Convert JPEG to PDF back and forth"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/60 border border-emerald-100/50 rounded-2xl p-4 text-center">
            <span className="text-xl font-black text-emerald-950 block">₹0</span>
            <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">
              {language === "ta" ? "எப்போதும் இலவசம்" : "No Payment Needed"}
            </span>
            <button
              type="button"
              onClick={handleSelectFree}
              className={`w-full mt-3 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                isFreeActive 
                  ? "bg-emerald-600 text-white shadow-md cursor-default pointer-events-none" 
                  : "bg-emerald-100 hover:bg-emerald-200 text-emerald-950 active:scale-98"
              }`}
            >
              {isFreeActive 
                ? (language === "ta" ? "தற்போது பயன்பாட்டில் உள்ளது" : "Currently Active") 
                : (language === "ta" ? "இலவசத் திட்டத்தை இயக்கு" : "Activate Free Utilities")}
            </button>
          </div>
        </div>

        {/* PREMIUM PRO FEATURES SUMMARY */}
        <div className="bg-indigo-950 rounded-[2.5rem] p-8 border border-indigo-800 flex flex-col justify-between space-y-6 text-white shadow-xl shadow-indigo-950/20">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-inner">
                ★
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-indigo-100">
                  {language === "ta" ? "பிரீமியம் ஆட்டோமேஷன்" : "Premium Automation"}
                </h3>
                <span className="inline-block bg-blue-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md mt-0.5">
                  {language === "ta" ? "அதிவேகம் • முழுமையான ஆட்டோமேஷன்" : "Full Portal Automation Suite"}
                </span>
              </div>
            </div>

            <p className="text-xs text-indigo-200 leading-relaxed font-bold">
              {language === "ta"
                ? "தொழில்முறை ஈ-சேவை முகவர்கள் தங்களின் நேரத்தை மிச்சப்படுத்தவும், வருவாயை உயர்த்தவும் பிரத்யேகமாக உருவாக்கப்பட்ட மேம்பட்ட ஆட்டோமேஷன் சேவைகள்:"
                : "Advanced portal scripts, automated database tools, and artificial intelligence integration:"}
            </p>

            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs font-bold text-slate-100">
                <Database size={16} className="text-blue-400" />
                <div>
                  <p>{language === "ta" ? "வாடிக்கையாளர் விபரங்கள் சேமிப்பு (Customer DB)" : "Customer DB Storage"}</p>
                  <p className="text-[9px] text-slate-400 font-medium">{language === "ta" ? "வாடிக்கையாளர் விபரங்களைப் பாதுகாப்பாகச் சேமித்தல்" : "Securely store profile data for repeat logins"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs font-bold text-slate-100">
                <MousePointerClick size={16} className="text-blue-400" />
                <div>
                  <p>{language === "ta" ? "1-கிளிக் தானியங்கி உள்நுழைவு (Auto-Login)" : "1-Click Auto-Login Integration"}</p>
                  <p className="text-[9px] text-slate-400 font-medium">{language === "ta" ? "E-Sevai, UTIPIT போன்ற போர்ட்டல்களில் கடவுச்சொல் இன்றி லாகின்" : "Login instantly into major CSC Portals"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs font-bold text-slate-100">
                <Zap size={16} className="text-blue-400" />
                <div>
                  <p>{language === "ta" ? "தானியங்கி விபரப் பூர்த்தி (Auto-Fill & Draft)" : "Form Auto-Fill & Draft Creator"}</p>
                  <p className="text-[9px] text-slate-400 font-medium">{language === "ta" ? "சேமித்த விபரங்களை படிவங்களில் 1-வினாடியில் தானாக நிரப்புதல்" : "Pre-fill complex service application fields"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs font-bold text-slate-100">
                <Cpu size={16} className="text-blue-400" />
                <div>
                  <p>{language === "ta" ? "AI விபரப் பிரித்தெடுத்தல் (AI OCR Reader)" : "AI OCR Data Extraction"}</p>
                  <p className="text-[9px] text-slate-400 font-medium">{language === "ta" ? "ஆதார், குடும்ப அட்டை PDF-லிருந்து தகவலைத் தானாக எடுத்தல்" : "Scan documents and read details in milliseconds"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
            <span className="text-xl font-black text-white block">
              {billingCycle === "monthly" ? "₹149" : "₹1,499"}
              <span className="text-[10px] text-slate-400 font-normal">
                /{billingCycle === "monthly" ? (language === "ta" ? "மாதம்" : "month") : (language === "ta" ? "ஆண்டு" : "year")}
              </span>
            </span>
            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block mt-1">
              {language === "ta" ? "ஆட்டோமேஷன் மற்றும் எல்லையற்ற சேமிப்பு" : "Unlock complete workspace power"}
            </span>
            <button
              type="button"
              onClick={handleStartUpgrade}
              className={`w-full mt-3 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center justify-center gap-2 ${
                isPremiumActive 
                  ? "bg-red-500 hover:bg-red-600 text-white border-red-700 active:scale-98" 
                  : "bg-blue-600 hover:bg-blue-500 text-white border-blue-800 active:scale-98 shadow-md"
              }`}
            >
              <Zap size={12} fill="currentColor" />
              {isPremiumActive 
                ? (language === "ta" ? "இலவசத் திட்டத்திற்குத் திரும்பு" : "Downgrade to Free") 
                : (language === "ta" ? "பிரீமியம் திட்டத்தை இயக்கு" : "Upgrade to Premium")}
            </button>
          </div>
        </div>

      </div>

      {/* 3. Detailed Comparison Section: What's Free & What's Paid? */}
      <div className="max-w-4xl mx-auto bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm overflow-hidden">
        <div className="space-y-2 mb-8 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-blue-600" />
            <h3 className="text-base font-black text-slate-900 uppercase tracking-widest">
              {language === "ta" ? "எந்தெந்தக் கருவிகள் இலவசம்? எதற்கு கட்டணம்?" : "WHAT IS FREE VS WHAT IS PAID?"}
            </h3>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            {language === "ta" 
              ? "எங்கள் மையத்தில் உள்ள அனைத்துக் கருவிகளின் தெளிவான பயன்பாட்டு வரம்புப் பட்டியல்" 
              : "Clear breakdown of features and standard usage limits across the ecosystem"}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-bold text-slate-600">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-widest">
                <th className="py-4 font-black">{language === "ta" ? "அம்சங்கள் / கருவிகளின் பெயர்" : "FEATURES / WORKFLOWS"}</th>
                <th className="py-4 font-black text-center">{language === "ta" ? "இலவசத் திட்டம் (Free Plan)" : "FREE UTILITY PLAN"}</th>
                <th className="py-4 font-black text-center text-indigo-600">{language === "ta" ? "பிரீமியம் திட்டம் (Premium Pro)" : "PREMIUM PRO"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
              
              {/* Category Header */}
              <tr className="bg-slate-50/50">
                <td colSpan={3} className="py-2.5 px-3 text-[10px] font-black text-emerald-800 uppercase tracking-wider">
                  {language === "ta" ? "100% முற்றிலும் இலவசக் கருவிகள் (எப்போதும் இலவசம்)" : "100% Always Free Utility Tools"}
                </td>
              </tr>
              <tr>
                <td className="py-4 px-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>{language === "ta" ? "PDF கம்ப்ரசர் (PDF Compressor)" : "PDF Compressor Tool"}</span>
                  </div>
                </td>
                <td className="py-4 text-center text-emerald-600 text-xs font-black">
                  {language === "ta" ? "முற்றிலும் இலவசம் (வரம்பற்றது)" : "✔ Free (Unlimited)"}
                </td>
                <td className="py-4 text-center text-emerald-600 text-xs font-black">
                  {language === "ta" ? "முற்றிலும் இலவசம் (வரம்பற்றது)" : "✔ Free (Unlimited)"}
                </td>
              </tr>
              <tr>
                <td className="py-4 px-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>{language === "ta" ? "புகைப்படம் + கையொப்ப அளவு மாற்றி (Photo/Sign Resizer)" : "Photo & Sign Resizer"}</span>
                  </div>
                </td>
                <td className="py-4 text-center text-emerald-600 text-xs font-black">
                  {language === "ta" ? "முற்றிலும் இலவசம் (வரம்பற்றது)" : "✔ Free (Unlimited)"}
                </td>
                <td className="py-4 text-center text-emerald-600 text-xs font-black">
                  {language === "ta" ? "முற்றிலும் இலவசம் (வரம்பற்றது)" : "✔ Free (Unlimited)"}
                </td>
              </tr>
              <tr>
                <td className="py-4 px-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>{language === "ta" ? "டிஜிட்டல் கையொப்பம் உருவாக்கி (Sign Creator)" : "Digital Signature Maker"}</span>
                  </div>
                </td>
                <td className="py-4 text-center text-emerald-600 text-xs font-black">
                  {language === "ta" ? "முற்றிலும் இலவசம் (வரம்பற்றது)" : "✔ Free (Unlimited)"}
                </td>
                <td className="py-4 text-center text-emerald-600 text-xs font-black">
                  {language === "ta" ? "முற்றிலும் இலவசம் (வரம்பற்றது)" : "✔ Free (Unlimited)"}
                </td>
              </tr>
              <tr>
                <td className="py-4 px-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>{language === "ta" ? "கோப்பு வடிவ மாற்றி (JPEG to PDF / Converter)" : "File format converter"}</span>
                  </div>
                </td>
                <td className="py-4 text-center text-emerald-600 text-xs font-black">
                  {language === "ta" ? "முற்றிலும் இலவசம் (வரம்பற்றது)" : "✔ Free (Unlimited)"}
                </td>
                <td className="py-4 text-center text-emerald-600 text-xs font-black">
                  {language === "ta" ? "முற்றிலும் இலவசம் (வரம்பற்றது)" : "✔ Free (Unlimited)"}
                </td>
              </tr>

              {/* Category Header Paid */}
              <tr className="bg-slate-50/50">
                <td colSpan={3} className="py-2.5 px-3 text-[10px] font-black text-indigo-800 uppercase tracking-wider">
                  {language === "ta" ? "தொழில்முறை போர்ட்டல் ஆட்டோமேஷன் & தரவுத்தளம் (பிரீமியம்)" : "Desktop Portal Automation & Customer DB (Premium)"}
                </td>
              </tr>
              <tr>
                <td className="py-4 px-3">
                  <div>
                    <p className="text-slate-800">{language === "ta" ? "வாடிக்கையாளர் விபரங்கள் சேமிப்பு (Save Customer)" : "Customer Profile Database"}</p>
                    <p className="text-[9px] text-slate-400 font-medium">{language === "ta" ? "விபரங்களைப் பாதுகாப்பாகச் சேமித்து மீண்டும் எடுத்தல்" : "Store details of clients to avoid re-typing"}</p>
                  </div>
                </td>
                <td className="py-4 text-center text-red-500 text-xs font-bold">
                  ✕ {language === "ta" ? "சேமிக்க இயலாது" : "No Saving Allowed"}
                </td>
                <td className="py-4 text-center text-indigo-600 text-xs font-black">
                  ✔ {language === "ta" ? "எல்லையற்ற சேமிப்பு (Unlimited DB)" : "Yes (Unlimited DB)"}
                </td>
              </tr>
              <tr>
                <td className="py-4 px-3">
                  <div>
                    <p className="text-slate-800">{language === "ta" ? "1-கிளிக் தானியங்கி உள்நுழைவு & படிவப் பூர்த்தி (Auto Login)" : "1-Click Portal Auto-login & Auto-fill"}</p>
                    <p className="text-[9px] text-slate-400 font-medium">{language === "ta" ? "E-Sevai & CSC தளங்களில் அதிவேகமாக உள்நுழைதல்" : "Saves manual username/password typing"}</p>
                  </div>
                </td>
                <td className="py-4 text-center text-slate-500 text-xs font-medium">
                  {language === "ta" ? "தினசரி 3 டிராஃப்டுகள் மட்டும்" : "3 drafts per day limit"}
                </td>
                <td className="py-4 text-center text-green-600 text-xs font-black">
                  {language === "ta" ? "வரம்பற்ற பயன்பாடு (100% Unlimited)" : "✔ 100% Unlimited Usage"}
                </td>
              </tr>
              <tr>
                <td className="py-4 px-3">
                  <div>
                    <p className="text-slate-800">{language === "ta" ? "ஆவணங்களில் இருந்து AI முறையில் விபரங்களை எடுத்தல் (AI Extract)" : "AI OCR PDF Document Extraction"}</p>
                    <p className="text-[9px] text-slate-400 font-medium">{language === "ta" ? "ஆதார் மற்றும் குடும்ப அட்டையை ஸ்கேன் செய்து தகவல்களை நிரப்புதல்" : "Extract client details automatically"}</p>
                  </div>
                </td>
                <td className="py-4 text-center text-slate-500 text-xs font-medium">
                  {language === "ta" ? "தினசரி 3 முறை மட்டும்" : "3 scans per day limit"}
                </td>
                <td className="py-4 text-center text-slate-900 text-xs font-black">
                  ✔ {language === "ta" ? "வரம்பற்ற பயன்பாடு (100% Unlimited)" : "✔ 100% Unlimited Extraction"}
                </td>
              </tr>
              <tr>
                <td className="py-4 px-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                    <span>{language === "ta" ? "விளம்பரங்கள் இல்லாமை (Ad-free UI)" : "Add-free Cleaner UI"}</span>
                  </div>
                </td>
                <td className="py-4 text-center text-emerald-600 text-xs font-black">
                  {language === "ta" ? "ஆம் (விளம்பரங்கள் கிடையாது)" : "Yes (No Ads)"}
                </td>
                <td className="py-4 text-center text-emerald-600 text-xs font-black">
                  {language === "ta" ? "ஆம் (விளம்பரங்கள் கிடையாது)" : "Yes (No Ads)"}
                </td>
              </tr>
              <tr>
                <td className="py-4 px-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                    <span>{language === "ta" ? "வாடிக்கையாளர் ஆதரவு சேவை (Help Support)" : "Priority Customer Support"}</span>
                  </div>
                </td>
                <td className="py-4 text-center text-slate-400">
                  {language === "ta" ? "மின்னஞ்சல் ஆதரவு மட்டும்" : "Standard Email Support"}
                </td>
                <td className="py-4 text-center text-indigo-600 text-xs font-black">
                  ✔ WhatsApp & Direct Call Support (24/7)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulated Checkout Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPaymentModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="bg-white rounded-[3rem] p-8 sm:p-10 max-w-md w-full relative z-20 border border-slate-100 shadow-2xl flex flex-col gap-6 animate-none"
            >
              
              {/* Header inside Modal */}
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-200">
                  <CreditCard size={28} />
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  {language === "ta" ? "பாதுகாப்பான மாதிரி சந்தா கட்டணம்" : "Simulated Sandboxed Checkout"}
                </h3>
                <p className="text-xs text-slate-400 font-bold leading-relaxed">
                  {language === "ta" 
                    ? "பிரீமியம் ஆட்டோமேஷன் செயல்படுத்துவதற்கான சோதனைக் களம். பணம் ஏதும் வசூலிக்கப்படாது." 
                    : "Experience the integration. No real money is charged."}
                </p>
              </div>

              {/* Order total info */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex justify-between items-center text-xs font-bold text-slate-600">
                <span>{language === "ta" ? "செலுத்த வேண்டிய மொத்தத் தொகை:" : "Order Total:"}</span>
                <span className="text-lg font-black text-indigo-600">
                  {billingCycle === "monthly" ? "₹149" : "₹1,499"}
                  <span className="text-[10px] font-bold text-slate-400">/{billingCycle === "monthly" ? (language === "ta" ? "மாதம்" : "Month") : (language === "ta" ? "ஆண்டு" : "Year")}</span>
                </span>
              </div>

              {/* Success, processing or active modes */}
              {paymentSuccess ? (
                <div className="text-center p-6 bg-green-50 border border-green-200 rounded-3xl text-green-700 flex flex-col items-center gap-3">
                  <CheckCircle size={40} className="text-green-500 animate-bounce" />
                  <p className="font-black text-xs uppercase tracking-wider">
                    {language === "ta" ? "வாழ்த்துகள்! கட்டணம் வெற்றிகரமாக செலுத்தப்பட்டது. பிரீமியம் இயக்கப்பட்டது." : "Payment Successful! Premium Activated."}
                  </p>
                </div>
              ) : processingPayment ? (
                <div className="text-center p-6 bg-slate-50 border border-slate-200 rounded-3xl text-slate-700 flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="font-black text-xs uppercase tracking-wider animate-pulse">
                    {language === "ta" ? "கட்டணம் பாதுகாப்பாகச் சரிபார்க்கப்படுகிறது..." : "Processing Payment Securely..."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  
                  {errorMessage && (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-[11px] font-semibold text-rose-600 text-left leading-relaxed">
                      {errorMessage}
                    </div>
                  )}

                  {/* Select Payment channels - beautiful graphical tabs simulating integration */}
                  <div className="space-y-3">
                    
                    {/* Real Razorpay Action Button */}
                    <button 
                      type="button"
                      onClick={handleRazorpayPayment}
                      className="w-full p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl transition-all text-left flex items-center justify-between group active:scale-98 cursor-pointer shadow-lg shadow-indigo-600/25"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
                          <CreditCard size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-black">
                            {language === "ta" ? "Razorpay மூலம் செலுத்து (Live)" : "Pay with Razorpay (Live)"}
                          </p>
                          <p className="text-[9px] text-indigo-200 font-bold uppercase tracking-tight mt-0.5">
                            {isKeysConfigured 
                              ? (language === "ta" ? "உங்களது Razorpay கேட்வே தயார்" : "Razorpay gateway ready")
                              : (language === "ta" ? "விபரங்கள் சர்வரில் இருந்து பெறப்படும்" : "Keys loaded from server env")}
                          </p>
                        </div>
                      </div>
                      <Sparkles size={16} className="text-white/80 group-hover:animate-spin" />
                    </button>

                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-slate-100"></div>
                      <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                        {language === "ta" ? "அல்லது மாதிரி முறையில் சோதிக்க" : "OR SIMULATE FOR DEMO"}
                      </span>
                      <div className="flex-grow border-t border-slate-100"></div>
                    </div>

                    <button 
                      type="button"
                      onClick={handleSimulatePayment}
                      className="w-full p-4 hover:bg-slate-50 border border-slate-150 rounded-2xl transition-all text-left flex items-center justify-between group active:scale-98 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                          <QrCode size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800">
                            {language === "ta" ? "மாதிரி முறையில் உடனே செலுத்த (Demo Checkout)" : "Simulated Checkout Now"}
                          </p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                            {language === "ta" ? "பணம் ஏதும் வசூலிக்கப்படாது" : "1-click mock simulation upgrade"}
                          </p>
                        </div>
                      </div>
                      <Check size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    </button>
                    
                  </div>

                  {/* Actions */}
                  <div className="flex gap-4 pt-2">
                    <button 
                      type="button"
                      onClick={() => setShowPaymentModal(false)}
                      className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer"
                    >
                      {language === "ta" ? "ரத்து செய்" : "Cancel"}
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
