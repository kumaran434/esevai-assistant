import React, { useState, useEffect } from 'react';
import { ExternalLink, Globe, Shield, CreditCard, FileText, UserCheck, Map, Plus, Trash2, X, Link as LinkIcon, Save, Sparkles, AlertCircle, Key, Eye, EyeOff, AlertTriangle, GripVertical, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { useLanguage } from '../lib/translations';
import { getIpcRenderer } from '../lib/electron-mock';

interface Portal {
  id?: string;
  name: string;
  url: string;
  description: string;
  category: string;
  userId: string;
  isCustom?: boolean;
}

const defaultPortals = [
  {
    category: "பொது மக்கள் சேவைகள் (Citizen Services)",
    links: [
      { name: "TNeGA e-Sevai", url: "https://www.tnesevai.tn.gov.in/", icon: Globe, description: "Official TN e-Sevai Services" },
      { name: "TN Smart Card (PDS)", url: "https://www.tnpds.gov.in/", icon: CreditCard, description: "Ration Card Services" },
      { name: "Patta Chitta", url: "https://eservices.tn.gov.in/", icon: Map, description: "Land Records Services" },
      { name: "TN Registration (பதிவுத்துறை)", url: "https://tnreginet.gov.in/", icon: FileText, description: "Property Registration & Encumbrance Certificate (EC)" },
    ]
  },
  {
    category: "அடையாள சான்றுகள் (Identity & Documents)",
    links: [
      { name: "Aadhaar (UIDAI)", url: "https://myaadhaar.uidai.gov.in/", icon: Shield, description: "Get Status, Card Update & Verify Aadhaar" },
      { name: "Voter Portal (NVSP)", url: "https://voters.eci.gov.in/", icon: UserCheck, description: "Apply, Track & Download Voter Card" },
      { name: "PAN Card (UTIITS)", url: "https://www.pan.utiitsl.com/", icon: FileText, description: "New & Correction PAN Card Applications" },
      { name: "Passport Seva", url: "https://www.passportindia.gov.in/", icon: ExternalLink, description: "Indian Passport Seva Online Center" },
    ]
  },
  {
    category: "நிதி மற்றும் இதர சேவைகள் (Finance & Utility)",
    links: [
      { name: "Income Tax (e-Filing)", url: "https://www.incometax.gov.in/", icon: Shield, description: "Income Tax Return e-Filing & Verification" },
      { name: "EPF Member Portal (PF)", url: "https://unifiedportal-mem.epfindia.gov.in/memberinterface/", icon: UserCheck, description: "UAN Login, PF Withdrawals & Passbook Trace" },
    ]
  }
];

interface PortalsProps {
  onTabChange?: (tab: string) => void;
  onOpenPortal?: (url: string, name: string) => void;
}

export default function Portals({ onTabChange, onOpenPortal }: PortalsProps) {
  const { t, language } = useLanguage();
  const [customPortals, setCustomPortals] = useState<Portal[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newPortal, setNewPortal] = useState({
    name: '',
    url: '',
    description: '',
    category: t('personalPortals')
  });
  const [showAutoLoginLimitModal, setShowAutoLoginLimitModal] = useState(false);

  // Portal Login Credentials Manager States
  const [allCredentials, setAllCredentials] = useState<Record<string, any>>({});
  const [isCredsModalOpen, setIsCredsModalOpen] = useState(false);
  const [selectedPortal, setSelectedPortal] = useState<any>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [autoLoginInput, setAutoLoginInput] = useState(true);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  const [orderedPortals, setOrderedPortals] = useState<any[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    // 1. Get default portals flat
    const flatDefaults = defaultPortals.flatMap(cat => 
      cat.links.map(link => ({
        ...link,
        id: link.name,
        category: cat.category,
        isCustom: false
      }))
    );

    // 2. Get custom portals flat
    const flatCustoms = customPortals.map(p => ({
      name: p.name,
      url: p.url,
      description: p.description || 'Custom Portal Link',
      icon: LinkIcon,
      id: p.id || p.name,
      category: p.category,
      isCustom: true
    }));

    const combined = [...flatDefaults, ...flatCustoms];

    // 3. Load saved order from localStorage
    const savedOrder = localStorage.getItem('portal_order_v2');
    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder) as string[];
        
        combined.sort((a, b) => {
          const idxA = orderIds.indexOf(a.id);
          const idxB = orderIds.indexOf(b.id);
          
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return 0;
        });
      } catch (e) {
        console.error("Failed to parse saved portal order", e);
      }
    }
    setOrderedPortals(combined);
  }, [customPortals]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndexStr = e.dataTransfer.getData('text/plain');
    if (!sourceIndexStr) return;
    const sourceIndex = parseInt(sourceIndexStr, 10);
    
    if (sourceIndex !== targetIndex) {
      const newList = [...orderedPortals];
      const [draggedItem] = newList.splice(sourceIndex, 1);
      newList.splice(targetIndex, 0, draggedItem);
      
      setOrderedPortals(newList);
      
      const orderIds = newList.map(item => item.id);
      localStorage.setItem('portal_order_v2', JSON.stringify(orderIds));
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleResetOrder = () => {
    if (confirm('வரிசையை பழையபடி மாற்ற விரும்புகிறீர்களா? (Are you sure you want to reset the portal order?)')) {
      localStorage.removeItem('portal_order_v2');
      const flatDefaults = defaultPortals.flatMap(cat => 
        cat.links.map(link => ({
          ...link,
          id: link.name,
          category: cat.category,
          isCustom: false
        }))
      );
      const flatCustoms = customPortals.map(p => ({
        name: p.name,
        url: p.url,
        description: p.description || 'Custom Portal Link',
        icon: LinkIcon,
        id: p.id || p.name,
        category: p.category,
        isCustom: true
      }));
      setOrderedPortals([...flatDefaults, ...flatCustoms]);
    }
  };

  const isElectron = typeof window !== 'undefined' && 
    ((window as any).process?.versions?.electron || 
     navigator.userAgent.toLowerCase().indexOf(' electron/') > -1);

  const ipc = getIpcRenderer();

  useEffect(() => {
    let unsubscribePortals: (() => void) | null = null;
    let unsubscribeCreds: (() => void) | null = null;

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      // Clean up previous listeners
      if (unsubscribePortals) {
        unsubscribePortals();
        unsubscribePortals = null;
      }
      if (unsubscribeCreds) {
        unsubscribeCreds();
        unsubscribeCreds = null;
      }

      if (user) {
        const uid = user.uid;

        // 1. Subscribe to Firebase Portals
        const portalsQuery = query(collection(db, 'portals'), where('userId', '==', uid));
        unsubscribePortals = onSnapshot(portalsQuery, (snapshot) => {
          const list: Portal[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            list.push({
              id: doc.id,
              name: data.name,
              url: data.url,
              description: data.description || '',
              category: data.category || t('personalPortals'),
              userId: data.userId,
              isCustom: true
            });
          });
          setCustomPortals(list);
          localStorage.setItem('custom_portals', JSON.stringify(list));
          setLoading(false);
        }, (err) => {
          console.error("Error loading portals from Firestore:", err);
          handleFirestoreError(err, OperationType.GET, 'portals');
        });

        // 2. Subscribe to Firebase Credentials
        const credsQuery = query(collection(db, 'credentials'), where('userId', '==', uid));
        unsubscribeCreds = onSnapshot(credsQuery, (snapshot) => {
          const credsMap: Record<string, any> = {};
          snapshot.forEach((doc) => {
            const data = doc.data();
            credsMap[doc.id] = {
              id: doc.id,
              name: data.name || '',
              url: data.url || '',
              username: data.username || '',
              password: data.password || '',
              autoLogin: data.autoLogin !== false,
              userId: data.userId || uid
            };
          });
          setAllCredentials(credsMap);
          
          if (isElectron) {
            ipc.send('sync-credentials-to-electron', credsMap);
          }
        }, (err) => {
          console.error("Error loading credentials from Firestore:", err);
          handleFirestoreError(err, OperationType.GET, 'credentials');
        });
      } else {
        // Not authenticated: Fallback to local storage
        const getLocalPortals = () => {
          try {
            const data = localStorage.getItem('custom_portals');
            return data ? JSON.parse(data) : [];
          } catch (e) {
            return [];
          }
        };

        setCustomPortals(getLocalPortals());
        setLoading(false);

        // Load Credentials from Electron main-process
        ipc.send('get-all-credentials');
      }
    });

    // Listen for storage changes in other tabs
    const handleStorageChange = () => {
      if (!auth.currentUser) {
        try {
          const data = localStorage.getItem('custom_portals');
          if (data) setCustomPortals(JSON.parse(data));
        } catch (e) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    const handleCredsLoaded = (event: any, creds: any) => {
      if (creds && !auth.currentUser) {
        setAllCredentials(creds);
      }
    };

    ipc.on('all-credentials-loaded', handleCredsLoaded);
    ipc.on('credentials-saved-success', handleCredsLoaded);

    return () => {
      unsubscribeAuth();
      if (unsubscribePortals) unsubscribePortals();
      if (unsubscribeCreds) unsubscribeCreds();
      window.removeEventListener('storage', handleStorageChange);
      if (ipc.removeListener) {
        ipc.removeListener('all-credentials-loaded', handleCredsLoaded);
        ipc.removeListener('credentials-saved-success', handleCredsLoaded);
      }
    };
  }, []);

  const getFlatPortals = () => {
    const flatList: Array<{ id: string; name: string; url: string; category: string }> = [];
    
    defaultPortals.forEach(cat => {
      cat.links.forEach(link => {
        flatList.push({
          id: link.name,
          name: link.name,
          url: link.url,
          category: cat.category
        });
      });
    });

    customPortals.forEach(portal => {
      flatList.push({
        id: portal.id || portal.name,
        name: portal.name,
        url: portal.url,
        category: portal.category
      });
    });

    return flatList;
  };

  const handleOpenConfigureCreds = (portal: any) => {
    setSelectedPortal(portal);
    const existing = allCredentials[portal.id];
    if (existing) {
      setUsernameInput(existing.username || '');
      setPasswordInput(existing.password || '');
      setAutoLoginInput(existing.autoLogin !== false);
    } else {
      setUsernameInput('');
      setPasswordInput('');
      setAutoLoginInput(true);
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPortal) return;

    if (auth.currentUser) {
      try {
        const credId = selectedPortal.id;
        const credData = {
          userId: auth.currentUser.uid,
          name: selectedPortal.name,
          url: selectedPortal.url,
          username: usernameInput,
          password: passwordInput,
          autoLogin: autoLoginInput,
          updatedAt: serverTimestamp()
        };
        await setDoc(doc(db, 'credentials', credId), credData);
      } catch (error) {
        console.error("Credentials Save Error:", error);
        handleFirestoreError(error, OperationType.WRITE, 'credentials');
      }
    } else {
      ipc.send('save-credentials', {
        id: selectedPortal.id,
        name: selectedPortal.name,
        url: selectedPortal.url,
        username: usernameInput,
        password: passwordInput,
        autoLogin: autoLoginInput
      });
    }

    setSelectedPortal(null);
    setUsernameInput('');
    setPasswordInput('');
    setAutoLoginInput(true);
  };

  const handleDeleteCredentials = async (id: string) => {
    if (confirm('இந்தக் கடவுச்சொல்லை நீக்க விரும்புகிறீர்களா? (Are you sure you want to delete this login key?)')) {
      if (auth.currentUser) {
        try {
          await deleteDoc(doc(db, 'credentials', id));
        } catch (error) {
          console.error("Credentials Delete Error:", error);
          handleFirestoreError(error, OperationType.DELETE, 'credentials/' + id);
        }
      } else {
        ipc.send('delete-credentials', id);
      }
    }
  };

  const toggleShowPassword = (id: string) => {
    setShowPasswordMap(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleOpenPortal = (url: string, name: string) => {
    // Always prefer standard callback if available (for desktop split view) - completely unlimited and free auto-fill
    if (onOpenPortal) {
      onOpenPortal(url, name);
    }
  };

  const handleAddPortal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let url = newPortal.url.trim();
      if (!url.startsWith('http')) url = 'https://' + url;
      
      const portalId = "p-" + Date.now();
      
      if (auth.currentUser) {
        const portalDoc = {
          name: newPortal.name,
          url,
          description: newPortal.description || '',
          category: newPortal.category || t('personalPortals'),
          userId: auth.currentUser.uid,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'portals', portalId), portalDoc);
      } else {
        const portals = [...customPortals];
        const portalToAdd = { 
          ...newPortal, 
          url, 
          id: portalId, 
          userId: 'local_user', 
          createdAt: new Date().toISOString(),
          isCustom: true
        };
        portals.unshift(portalToAdd as any);
        localStorage.setItem('custom_portals', JSON.stringify(portals));
        setCustomPortals(portals);
      }
      
      setNewPortal({ name: '', url: '', description: '', category: t('personalPortals') });
      setIsModalOpen(false);
    } catch (error) {
      console.error("Portal Save Error:", error);
      handleFirestoreError(error, OperationType.WRITE, 'portals');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deletePortalConfirm'))) return;
    try {
      if (auth.currentUser) {
        await deleteDoc(doc(db, 'portals', id));
      } else {
        const portals = customPortals.filter(p => p.id !== id);
        localStorage.setItem('custom_portals', JSON.stringify(portals));
        setCustomPortals(portals);
      }
    } catch (error) {
      console.error("Portal Delete Error:", error);
      handleFirestoreError(error, OperationType.DELETE, 'portals/' + id);
    }
  };

  const allCategories = [...defaultPortals];
  if (customPortals.length > 0) {
    allCategories.push({ category: t('personalPortals'), links: customPortals.map(p => ({ ...p, icon: LinkIcon })) });
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
        <div className="flex flex-col gap-2 pt-4">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('portals')}</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Quick access to common government services</p>
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          <button onClick={handleResetOrder} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-2xl text-xs font-black flex items-center gap-2 transition-all uppercase tracking-widest border border-slate-200">
            <RefreshCw size={15} /><span>பழைய வரிசைக்கு மாற்ற (Reset)</span>
          </button>
          <button onClick={() => setIsCredsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl text-xs font-black flex items-center gap-2 transition-all uppercase tracking-widest shadow-lg shadow-indigo-600/20">
            <Key size={15} /><span>உள்நுழைவுச் சாவிகள் (Login Keys)</span>
          </button>
          <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-2xl text-xs font-black flex items-center gap-2 transition-all uppercase tracking-widest shadow-md">
            <LinkIcon size={15} /><span>{t('addPortal')}</span>
          </button>
        </div>
      </div>

      {/* Guide Banner in Pure Tamil */}
      <div className="mx-4 p-4 bg-sky-50 border border-sky-100 rounded-2xl flex items-center gap-3 text-sky-850">
        <Sparkles size={18} className="text-sky-600 shrink-0 animate-pulse" />
        <p className="text-xs font-medium leading-relaxed">
          <strong>வழிமுறை:</strong> சேவைகளை உங்கள் விருப்பப்படி மாற்றி அமைக்க, கார்டுகளின் மேல் உள்ள சாம்பல் நிறக் குறியைப் பிடித்து இழுத்து (Drag & Drop) தேவையான இடத்தில் வைத்துக் கொள்ளவும். நீங்கள் அடிக்கடி பயன்படுத்தும் பக்கங்களை முதல் இடத்திற்கு மாற்ற முடியும்.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
        {orderedPortals.map((link, idx) => {
          const portalId = link.id || link.name;
          const hasCreds = !!allCredentials[portalId];
          const isDraggingThis = idx === draggedIndex;
          const isDragOverThis = idx === dragOverIndex;

          return (
            <div
              key={portalId}
              draggable="true"
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              className={`relative group transition-all duration-200 cursor-grab active:cursor-grabbing select-none rounded-2xl border-2 ${
                isDraggingThis ? "opacity-30 border-dashed border-indigo-400 bg-indigo-50/20 scale-95" : "border-transparent"
              } ${
                isDragOverThis ? "border-2 border-dashed border-sky-500 bg-sky-50/40 translate-y-[-4px] shadow-lg scale-[1.01]" : ""
              }`}
            >
              <motion.button
                onClick={() => handleOpenPortal(link.url, link.name)}
                whileHover={{ scale: 1.01 }}
                className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 hover:border-indigo-600 shadow-sm hover:shadow-md transition-all text-left"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Grip Icon for Draggability */}
                  <div className="text-slate-350 hover:text-slate-500 cursor-grab flex-shrink-0">
                    <GripVertical size={16} />
                  </div>

                  <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors flex-shrink-0">
                    <link.icon size={20} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-extrabold text-slate-800 leading-none text-sm truncate max-w-[170px]" title={link.name}>
                        {link.name}
                      </h4>
                      {hasCreds && (
                        <span className="bg-emerald-50 text-emerald-600 flex items-center gap-1 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-200">
                          <Key size={8} /> Auto-fill
                        </span>
                      )}
                    </div>
                    {/* Badge showing category */}
                    <span className="inline-block text-[8px] font-extrabold tracking-wider text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                      {link.category}
                    </span>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight truncate" title={link.description}>
                      {link.description || 'Quick Link'}
                    </p>
                  </div>
                </div>
                <ExternalLink size={14} className="text-slate-350 group-hover:text-indigo-600 flex-shrink-0 ml-2" />
              </motion.button>
              {link.isCustom && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(link.id!);
                  }}
                  className="absolute -top-2 -right-2 w-8 h-8 bg-red-50 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-2 border-white shadow-md hover:bg-red-500 hover:text-white"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 leading-none">{t('addPortal')}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{isElectron ? 'Auto-fill works in Desktop App mode' : 'Opens in new tab'}</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddPortal} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">{t('portalName')}</label>
                  <input required type="text" placeholder="e.g. TN e-Services" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:border-blue-600 focus:outline-none font-bold" value={newPortal.name} onChange={e => setNewPortal({...newPortal, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">{t('portalUrl')}</label>
                  <input required type="text" placeholder="e.g. tnesevai.tn.gov.in" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:border-blue-600 focus:outline-none font-bold" value={newPortal.url} onChange={e => setNewPortal({...newPortal, url: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">{t('portalDesc')}</label>
                  <input type="text" placeholder="Official service for..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:border-blue-600 focus:outline-none font-bold" value={newPortal.description} onChange={e => setNewPortal({...newPortal, description: e.target.value})} />
                </div>
                <div className="pt-4">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="w-full bg-blue-600 text-white rounded-2xl py-5 font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl"><Save size={20} />{t('savePortal')}</motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isCredsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCredsModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white rounded-[2.5rem] w-full max-w-2xl p-8 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 leading-none">உள்நுழைவுச் சாவிகள் மேலாளர்</h3>
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-2">Manage Credentials & Active Keys Manager</p>
                </div>
                <button onClick={() => setIsCredsModalOpen(false)} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                {selectedPortal ? (
                  /* Edit Portal Credentials form */
                  <form onSubmit={handleSaveCredentials} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-2">
                      <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">உள்நுழைவுச் சாவி இணைப்பு (Set Key)</span>
                      <button type="button" onClick={() => setSelectedPortal(null)} className="text-xs text-slate-500 font-bold hover:underline">பின்செல்ல (Back)</button>
                    </div>
                    <div className="text-sm font-bold text-slate-800">
                      இணையதளம்: <span className="text-indigo-600 font-black">{selectedPortal.name}</span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">பயனர்பெயர் (Username / ID)</label>
                      <input required type="text" placeholder="உள்நுழைவு ID / Username" className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-4 focus:border-indigo-600 focus:outline-none font-bold animate-none" value={usernameInput} onChange={e => setUsernameInput(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">கடவுச்சொல் (Password)</label>
                      <input required type="password" placeholder="உள்நுழைவு கடவுச்சொல் / Password" className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-4 focus:border-indigo-600 focus:outline-none font-bold animate-none" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} />
                    </div>

                    <div className="flex items-center gap-3 ml-2 pt-2">
                      <input type="checkbox" id="auto_login" className="w-5 h-5 accent-indigo-600 rounded-lg cursor-pointer" checked={autoLoginInput} onChange={e => setAutoLoginInput(e.target.checked)} />
                      <label htmlFor="auto_login" className="text-xs font-bold text-slate-600 cursor-pointer select-none">தானியங்கி உள்நுழைவு (Enable Auto Login after auto-fill)</label>
                    </div>

                    <div className="pt-4 flex gap-3">
                      <button type="button" onClick={() => setSelectedPortal(null)} className="flex-1 bg-slate-200 text-slate-850 rounded-2xl py-4 font-black uppercase tracking-widest text-xs">ரத்துசெய் (Cancel)</button>
                      <button type="submit" className="flex-1 bg-indigo-600 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15"><Save size={16} />சேமிக்கவும் (Save Key)</button>
                    </div>
                  </form>
                ) : (
                  /* Portal List */
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-slate-400">கீழே உள்ள இணையதளங்களில் ஏதேனும் ஒன்றிற்கு சாவி (Username/Password) அமைத்துக்கொள்ளவும். இணையதளம் திறக்கப்படும்போது தானாகவே அவை பூர்த்தி செய்யப்படும்.</p>
                    <div className="space-y-3">
                      {getFlatPortals().map((p) => {
                        const creds = allCredentials[p.id];
                        return (
                          <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-slate-300 transition-all gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Key size={18} />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-slate-900 text-sm leading-none">{p.name}</h4>
                                <span className="text-[9px] font-black uppercase text-indigo-500 tracking-wider mt-1 block truncate max-w-[200px]" title={p.url}>{p.url}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-auto flex-shrink-0">
                              {creds ? (
                                <div className="flex items-center gap-2">
                                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1">
                                    <span>{creds.username}</span>
                                    <span className="text-emerald-400">|</span>
                                    <span>{showPasswordMap[p.id] ? creds.password : '••••••••'}</span>
                                    <button onClick={() => toggleShowPassword(p.id)} className="text-emerald-650 hover:text-emerald-900 ml-1 transition-colors">
                                      {showPasswordMap[p.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                  </div>
                                  <button onClick={() => handleOpenConfigureCreds(p)} className="p-2.5 bg-slate-200 text-slate-700 hover:bg-slate-300 transition-all rounded-xl" title="தொகு (Edit)">
                                    <Plus size={16} />
                                  </button>
                                  <button onClick={() => handleDeleteCredentials(p.id)} className="p-2.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all rounded-xl" title="நீக்கு (Delete)">
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => handleOpenConfigureCreds(p)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all uppercase tracking-widest shadow-md shadow-indigo-600/10">
                                  <Plus size={14} /><span>சாவி அமை (Set Key)</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Auto Login Range Limit Upgrade Modal */}
        {showAutoLoginLimitModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAutoLoginLimitModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="relative bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-2xl w-full max-w-sm overflow-hidden text-center z-[10000]"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <AlertTriangle size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="font-extrabold text-lg text-slate-900 uppercase tracking-tight">
                    {language === "ta" ? "தானியங்கி உள்நுழைவு வரம்பு முடிந்தது!" : "Auto-Login Limit Reached!"}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    {language === "ta" 
                      ? "இலவசப் பதிப்பில் 3 முறை மட்டுமே தானியங்கி உள்நுழைவு & படிவப் பூர்த்தி (Auto Login) வசதியைப் பயன்படுத்த முடியும். தொடர்ந்து வரம்பற்ற முறையில் பயன்படுத்த உங்கள் கணக்கை பிரீமியமாக மேம்படுத்தவும்!" 
                      : "The free edition allows a maximum of 3 auto-logins. Please upgrade to the Premium Edition to unlock unlimited 1-click logins & automated form filling!"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAutoLoginLimitModal(false)}
                  className="px-4 py-3 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                >
                  {language === "ta" ? "சரி, மூடு" : "Close"}
                </button>
                <div
                  className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center active:scale-95 transition-all text-center font-black"
                  onClick={() => {
                    setShowAutoLoginLimitModal(false);
                    alert(language === "ta" ? "பிரீமியம் பெற ஆதரவுக் குழுவைத் தொடர்பு கொள்ளவும்!" : "Please contact center support to upgrade to Premium Edition.");
                  }}
                >
                  {language === "ta" ? "மேம்படுத்து" : "Upgrade"}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
