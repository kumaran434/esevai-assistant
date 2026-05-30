import React, { useState, useEffect } from "react";
import { 
  User, 
  Shield, 
  MapPin, 
  Building2, 
  Award, 
  CheckCircle2, 
  FolderHeart, 
  LogOut, 
  Calendar,
  Lock,
  FileSearch,
  CreditCard,
  Scaling,
  FileArchive,
  ImageIcon,
  PenTool,
  Languages,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { db, auth } from "../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { customerService } from "../services/customerService";

interface UserProfileProps {
  agentName: string | null;
  email: string | null;
  onLogout: () => void;
  onTabChange?: (tab: string) => void;
}

export default function UserProfile({ agentName, email, onLogout, onTabChange }: UserProfileProps) {
  const [subscribedPlan, setSubscribedPlan] = useState<string>(() => {
    return localStorage.getItem("SUBSCRIBED_PLAN") || "FREE";
  });

  const [customers, setCustomers] = useState<any[]>([]);
  const [customPortalsCount, setCustomPortalsCount] = useState<number>(0);

  useEffect(() => {
    const handlePlanChange = () => {
      setSubscribedPlan(localStorage.getItem("SUBSCRIBED_PLAN") || "FREE");
    };
    window.addEventListener("SUBSCRIBED_PLAN_CHANGED", handlePlanChange);
    
    // 1. Subscribe to true real-time customers
    const unsubscribeCustomers = customerService.subscribeToCustomers((list) => {
      setCustomers(list);
    });

    // 2. Subscribe to true Custom Portals count
    let unsubscribePortals: (() => void) | null = null;
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (unsubscribePortals) {
        unsubscribePortals();
        unsubscribePortals = null;
      }

      if (user) {
        const q = query(collection(db, 'portals'), where('userId', '==', user.uid));
        unsubscribePortals = onSnapshot(q, (snapshot) => {
          setCustomPortalsCount(snapshot.size);
        }, (err) => {
          console.error("Error fetching portals in profile:", err);
          try {
            const local = localStorage.getItem("custom_portals");
            if (local) {
              setCustomPortalsCount(JSON.parse(local).length);
            }
          } catch (e) {}
        });
      } else {
        try {
          const local = localStorage.getItem("custom_portals");
          if (local) {
            setCustomPortalsCount(JSON.parse(local).length);
          }
        } catch (e) {}
      }
    });

    return () => {
      window.removeEventListener("SUBSCRIBED_PLAN_CHANGED", handlePlanChange);
      unsubscribeCustomers();
      if (unsubscribePortals) unsubscribePortals();
      unsubscribeAuth();
    };
  }, []);

  // Real-time statistical computations
  const totalCompletedServices = customers.reduce((acc, c) => acc + (c.documents?.length || 0) + (c.customFields?.length || 0), 0);
  const totalPortals = 10 + customPortalsCount; // 10 built-in default portals + user custom ones
  const totalProcessedFiles = customers.reduce((acc, c) => acc + (c.documents?.length || 0), 0);

  const stats = [
    { label: "நிறைவு செய்யப்பட்ட சேவைகள்", value: totalCompletedServices.toLocaleString("ta-IN"), icon: CheckCircle2, color: "text-emerald-500 bg-emerald-50" },
    { label: "போர்ட்டல் இணைப்புகள்", value: totalPortals.toLocaleString("ta-IN"), icon: Award, color: "text-indigo-500 bg-indigo-50" },
    { label: "செயலாக்கப்பட்ட கோப்புகள்", value: totalProcessedFiles.toLocaleString("ta-IN"), icon: FolderHeart, color: "text-rose-500 bg-rose-50" },
  ];

  // Dynamic user specific Center ID and Sign in Date
  const centerId = auth.currentUser ? `ES-TN-${auth.currentUser.uid.substring(0, 6).toUpperCase()}` : "ES-TN-LOCAL";
  
  const lastSignInDate = auth.currentUser?.metadata.lastSignInTime
    ? new Date(auth.currentUser.metadata.lastSignInTime).toLocaleDateString("ta-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      })
    : new Date().toLocaleDateString("ta-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });

  const profileTools = [
    { id: 'data-extraction', name: 'தரவு பிரித்தெடுத்தல்', icon: FileSearch },
    { id: 'id-card', name: 'ஐடி கார்டு சீரமைப்பு', icon: CreditCard },
    { id: 'passport-resizer', name: 'பாஸ்போர்ட் அளவி', icon: Scaling },
    { id: 'pdf-compress', name: 'கோப்பு அளவு சுருக்கி', icon: FileArchive },
    { id: 'image-to-pdf', name: 'புகைப்பட கன்வெர்ட்டர்', icon: ImageIcon },
    { id: 'signature', name: 'கையெழுத்து ஒத்திசைவு', icon: PenTool },
    { id: 'translator', name: 'மொழிபெயர்ப்பு உதவி', icon: Languages },
  ];

  const handleToolClick = (toolId: string) => {
    localStorage.setItem("PRE_SELECTED_TOOL", toolId);
    if (onTabChange) {
      onTabChange("tools");
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 px-2 md:px-4">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        
        {/* Left Column: Automation Tools vertical single list (col-span-1) - Simplified & Compact Shortcuts */}
        <div className="lg:col-span-1 bg-white border border-slate-200/50 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="border-b pb-2.5 flex items-center justify-between">
            <div>
              <h4 className="font-extrabold text-slate-900 text-[10px] uppercase tracking-wider leading-none">குறுக்குவழிகள்</h4>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Quick Shortcut Menu</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {profileTools.map((tool) => {
              const ToolIcon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => handleToolClick(tool.id)}
                  className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 transition-all text-left group border border-transparent hover:border-slate-100"
                >
                  <ToolIcon size={12} className="text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                  <span className="text-[11px] font-extrabold text-slate-700 group-hover:text-blue-600 transition-colors truncate">
                    {tool.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Direct logout in Left Column */}
          <div className="pt-3 border-t">
            <button
              onClick={onLogout}
              className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-xl font-black uppercase tracking-wider text-[9px] transition-all flex items-center justify-center gap-1.5"
            >
              <LogOut size={10} /> வெளியேறு (Logout)
            </button>
          </div>
        </div>

        {/* Right Column: Profile details shown prominently, big and elegant (col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Cover/Banner Card - Enlarged and styled beautifully */}
          <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-950/20 border border-slate-800">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl" />
            
            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
              <div className="w-20 h-20 bg-gradient-to-tr from-white/10 to-white/5 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 text-4xl font-black shadow-inner animate-fade-in text-indigo-400 shrink-0">
                {agentName?.[0] || "U"}
              </div>
              
              <div className="text-center sm:text-left space-y-2 min-w-0 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 justify-center sm:justify-start">
                  <h2 className="text-2xl font-black tracking-tight truncate">{agentName || "பயனர்"}</h2>
                  <span className="self-center sm:self-auto px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest rounded-full text-emerald-400 shadow-sm leading-none">
                    செயலில் உள்ளது (Active)
                  </span>
                </div>
                
                <p className="text-xs text-slate-300 font-bold truncate leading-none">{email || "வழங்கப்படவில்லை"}</p>
                
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-slate-400 text-[10px] font-bold">
                  <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                    <Building2 size={11} className="text-indigo-400" /> ஈ-சேவை ஆட்டோமேட்டர்
                  </span>
                  <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                    <MapPin size={11} className="text-rose-400" /> தமிழ்நாடு
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-xs flex items-center gap-3.5 hover:border-indigo-100 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">{stat.label}</p>
                    <p className="text-base font-black text-slate-900 leading-none">{stat.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dual Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Account Info */}
            <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <User size={14} />
                </div>
                <h4 className="font-black text-slate-900 uppercase text-[10px] tracking-wider">வொர்க்ஸ்பேஸ் கணக்கு விவரங்கள்</h4>
              </div>
              
              <div className="space-y-3 text-[11px] font-semibold text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-50/55">
                  <span>பயனர் பெயர்</span>
                  <span className="font-extrabold text-slate-900">{agentName || "வழங்கப்படவில்லை"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50/55">
                  <span>மின்னஞ்சல் முகவரி</span>
                  <span className="font-extrabold text-slate-900 truncate max-w-[150px] md:max-w-none">{email || "வழங்கப்படவில்லை"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50/55">
                  <span>மையக் குறியீடு (Center ID)</span>
                  <span className="font-extrabold text-indigo-600">{centerId}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>சந்தா நிலை</span>
                  {subscribedPlan === "PREMIUM" ? (
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[8px] font-black rounded-md uppercase">PREMIUM UNLIMITED</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[8px] font-black rounded-md uppercase">இலவச திட்டம் (FREE)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Security and Settings */}
            <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Shield size={14} />
                </div>
                <h4 className="font-black text-slate-900 uppercase text-[10px] tracking-wider">பாதுகாப்பு & அமைப்புகள்</h4>
              </div>
              
              <div className="space-y-3 text-[11px] font-semibold text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-50/55">
                  <span>குறியாக்கம் (Encryption)</span>
                  <span className="text-[11px] text-emerald-500 font-extrabold flex items-center gap-1">
                    AES-256 <Lock size={10} />
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50/55">
                  <span>ஆட்டோமேஷன் வேகம்</span>
                  <span className="font-extrabold text-slate-900">மேம்படுத்தப்பட்டது (Fast)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50/55">
                  <span>உள்நுழைவு நாள்</span>
                  <span className="font-extrabold text-slate-900 flex items-center gap-1">
                    {lastSignInDate} <Calendar size={10} />
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>பாதுகாப்பு நிலை</span>
                  <span className="text-[11px] text-indigo-600 font-extrabold">உயர் பாதுகாப்பு</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
