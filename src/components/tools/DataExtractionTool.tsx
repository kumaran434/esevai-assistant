import React, { useState, useEffect } from 'react';
import { 
  FileSearch, 
  Upload, 
  X, 
  Copy, 
  Check, 
  Zap, 
  User, 
  MapPin, 
  Fingerprint, 
  Loader2,
  Trash2,
  FolderOpen,
  PlusCircle,
  CheckCircle2,
  Smartphone,
  Search,
  Hand,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractDetailsFromDocuments } from '../../services/geminiService';
import { useToast } from '../../hooks/useToast';
import { customerService } from '../../services/customerService';
import { Customer } from '../../types';
import { useLanguage } from '../../lib/translations';

interface ExtractedData {
  applicantName?: string;
  applicantNameTamil?: string;
  fatherName?: string;
  fatherNameTamil?: string;
  motherName?: string;
  motherNameTamil?: string;
  spouseName?: string;
  spouseNameTamil?: string;
  dob?: string;
  gender?: string;
  genderTamil?: string;
  doorNoEn?: string;
  doorNoTa?: string;
  streetEn?: string;
  streetTa?: string;
  villageEn?: string;
  villageTa?: string;
  talukEn?: string;
  talukTa?: string;
  districtEn?: string;
  districtTa?: string;
  pincode?: string;
  aadhaarNumber?: string;
  rationCardNumber?: string;
  smartCardNumber?: string;
  voterId?: string;
  panNumber?: string;
  mobileNumber?: string;
  email?: string;
  [key: string]: any;
}

export default function DataExtractionTool({ isNarrow = false }: { isNarrow?: boolean }) {
  const { showToast } = useToast();
  const { language } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [overridePhone, setOverridePhone] = useState('');
  const [overrideName, setOverrideName] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // CRM Sync States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [isSavedToCRM, setIsSavedToCRM] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Subscribe to customers & track activeCustomerId changes
  useEffect(() => {
    const unsubscribe = customerService.subscribeToCustomers((data) => {
      setCustomers(data);
    });

    const updateActiveCustomer = () => {
      const currentId = localStorage.getItem("ACTIVE_CUSTOMER_ID");
      setActiveCustomerId(currentId);
    };

    updateActiveCustomer();
    window.addEventListener("ACTIVE_CUSTOMER_ID_CHANGED", updateActiveCustomer);
    const interval = setInterval(updateActiveCustomer, 1000);

    return () => {
      unsubscribe();
      window.removeEventListener("ACTIVE_CUSTOMER_ID_CHANGED", updateActiveCustomer);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (activeCustomerId) {
      const found = customers.find(c => c.id === activeCustomerId);
      setActiveCustomer(found || null);
    } else {
      setActiveCustomer(null);
    }
  }, [activeCustomerId, customers]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files) as File[];
      setFiles(prev => [...prev, ...newFiles]);
      
      newFiles.forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleExtract = async () => {
    if (files.length === 0) {
      showToast("தயவுசெய்து ஒரு ஆவணத்தையாவது பதிவேற்றவும்.", 'error');
      return;
    }

    setIsExtracting(true);
    setIsSavedToCRM(false);
    try {
      const images = await Promise.all(
        files.map(async (file) => ({
          base64: await fileToBase64(file),
          mimeType: file.type
        }))
      );

      const result = await extractDetailsFromDocuments(images);

      setExtractedData(result);
      setOverridePhone(result.mobileNumber || '');
      setOverrideName(result.applicantName || 'Extracted Profile');
      
      showToast("தகவல்கள் வெற்றிகரமாகப் பிரித்தெடுக்கப்பட்டன!", 'success');
    } catch (err: any) {
      showToast(`பிழை: ${err.message}`, 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Dedicated Save extracted details to a customer's profile
  const handleSaveToCustomer = async (custToSave: Customer) => {
    if (!custToSave || !custToSave.id || !extractedData) return;
    
    try {
      const phoneToSave = overridePhone.trim();
      if (!phoneToSave || phoneToSave.length < 10) {
        showToast("தயவுசெய்து சரியான 10-இலக்க கைபேசி எண்ணை உள்ளிடவும் (Phone number is required)!", 'error');
        return;
      }

      const mergedFields: Partial<Customer> = {
        name: overrideName.trim() || custToSave.name,
        nameTamil: extractedData.applicantNameTamil || custToSave.nameTamil || '',
        fatherName: extractedData.fatherName || custToSave.fatherName || '',
        fatherNameTamil: extractedData.fatherNameTamil || custToSave.fatherNameTamil || '',
        motherName: extractedData.motherName || custToSave.motherName || '',
        motherNameTamil: extractedData.motherNameTamil || custToSave.motherNameTamil || '',
        spouseName: extractedData.spouseName || custToSave.spouseName || '',
        spouseNameTamil: extractedData.spouseNameTamil || custToSave.spouseNameTamil || '',
        dob: extractedData.dob || custToSave.dob || '',
        gender: extractedData.gender || custToSave.gender || 'Male',
        genderTamil: extractedData.genderTamil || custToSave.genderTamil || 'ஆண்',
        aadhaar: extractedData.aadhaarNumber || custToSave.aadhaar || '',
        voterId: extractedData.voterId || custToSave.voterId || '',
        smartCard: extractedData.smartCardNumber || extractedData.rationCardNumber || custToSave.smartCard || '',
        pan: extractedData.panNumber || custToSave.pan || '',
        phone: phoneToSave,
        email: extractedData.email || custToSave.email || '',
        doorNo: extractedData.doorNoEn || custToSave.doorNo || '',
        streetName: extractedData.streetEn || custToSave.streetName || '',
        streetNameTamil: extractedData.streetTa || custToSave.streetNameTamil || '',
        village: extractedData.villageEn || custToSave.village || '',
        villageTamil: extractedData.villageTa || custToSave.villageTamil || '',
        taluk: extractedData.talukEn || custToSave.taluk || '',
        talukTamil: extractedData.talukTa || custToSave.talukTamil || '',
        district: extractedData.districtEn || custToSave.district || '',
        districtTamil: extractedData.districtTa || custToSave.districtTamil || '',
        pincode: extractedData.pincode || custToSave.pincode || '',
      };

      await customerService.updateCustomer(custToSave.id, mergedFields);
      
      // Update Active Customer ID globally
      localStorage.setItem("ACTIVE_CUSTOMER_ID", custToSave.id);
      window.dispatchEvent(new CustomEvent("ACTIVE_CUSTOMER_ID_CHANGED"));

      setIsSavedToCRM(true);
      setIsDropdownOpen(false);
      showToast(`${custToSave.name} சுயவிவர விவரங்கள் வெற்றிகரமாகப் பிரித்தெடுக்கப்பட்ட தரவுகளுடன் புதுப்பிக்கப்பட்டன!`, 'success');
    } catch (err: any) {
      showToast(`சுயவிவரத்தை புதுப்பிப்பதில் தோல்வி: ${err.message}`, 'error');
    }
  };

  const filteredSearchList = customers.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.nameTamil && c.nameTamil.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    );
  });

  const DataField = ({ label, valueEn, valueTa, icon: Icon, id }: { 
    label: string, 
    valueEn?: string, 
    valueTa?: string, 
    icon: any,
    id: string
  }) => {
    if (!valueEn && !valueTa) return null;
    
    // If English and Tamil values are the same, just show English view but labeled correctly
    const isSame = valueEn === valueTa;

    return (
      <div className={`bg-white border-2 border-slate-50 rounded-3xl ${isNarrow ? 'p-2' : 'p-5'} hover:border-blue-100 transition-all group shadow-sm relative overflow-hidden`}>
        <div className={`flex items-center gap-2 ${isNarrow ? 'mb-1.5' : 'mb-4'}`}>
          <div className={`${isNarrow ? 'w-5 h-5' : 'w-8 h-8'} bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center`}>
            <Icon size={isNarrow ? 10 : 16} />
          </div>
          <span className={`${isNarrow ? 'text-[7px]' : 'text-[10px]'} font-black text-slate-400 uppercase tracking-widest truncate`}>{label}</span>
        </div>

        <div className={isNarrow ? 'space-y-1' : 'space-y-3'}>
          {valueEn && (
            <div className="flex items-center gap-1.5">
              <div 
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'copy';
                  e.dataTransfer.setData('text/plain', valueEn);
                  e.dataTransfer.dropEffect = 'copy';
                  (e.target as HTMLElement).classList.add('opacity-55');
                  try {
                    // Try to configure custom drag icon image if supported, or transparent
                    const img = new Image();
                    img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5'/%3E%3Cpath d='M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6'/%3E%3Cpath d='M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4.5'/%3E%3Cpath d='M18 8a2 2 0 0 1 2 2v9a4 4 0 0 1-4 4H9.415a4 4 0 0 1-2.828-1.172l-4.522-4.522a1 1 0 0 1 0-1.414H2.1a1 1 0 0 1 1-1h2.529a2 2 0 0 1 1.748.966L9 15h1v-4.5c0-1.1.9-2 2-2s2 .9 2 2z'/%3E%3C/svg%3E";
                    e.dataTransfer.setDragImage(img, 10, 10);
                  } catch (err) {}
                }}
                onDragEnd={(e) => {
                  (e.target as HTMLElement).classList.remove('opacity-55');
                }}
                className={`flex-1 bg-slate-50 rounded-2xl cursor-grab active:cursor-grabbing hover:cursor-grab drag-handle-cursor ${isNarrow ? 'px-2 py-1.5' : 'px-4 py-3'} relative group/item hover:bg-slate-100 transition-all border border-transparent hover:border-blue-300 hover:shadow-inner`}
              >
                <p className={`${isNarrow ? 'text-[9px]' : 'text-sm'} font-bold text-slate-900 pr-5 truncate select-all`}>{valueEn}</p>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[7px] font-black text-slate-300 uppercase">EN</span>
                
                {/* Beautiful Drag & Paste Hover overlay */}
                <div className="absolute inset-0 bg-indigo-600/95 rounded-2xl flex items-center justify-center gap-1.5 opacity-0 group-hover/item:opacity-100 transition-all duration-150 pointer-events-none z-10 shadow-lg drag-handle-cursor">
                  <Hand size={isNarrow ? 12 : 14} className="text-white animate-bounce" />
                  <span className="text-[8px] sm:text-[10.5px] font-black uppercase text-white tracking-wider">இழுத்து ஒட்டவும் (Drag & Fill)</span>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => copyToClipboard(valueEn, `${id}_en`)}
                className={`transition-all shrink-0 ${
                  isNarrow ? 'w-7 h-7 rounded-lg' : 'w-10 h-10 rounded-xl shadow-lg'
                } flex items-center justify-center ${
                  copiedKey === `${id}_en` ? 'bg-green-600 text-white' : 'bg-slate-900 text-white hover:bg-blue-600'
                }`}
              >
                {copiedKey === `${id}_en` ? <Check size={isNarrow ? 12 : 16} /> : <Copy size={isNarrow ? 12 : 16} />}
              </button>
            </div>
          )}

          {!isSame && valueTa && (
            <div className="flex items-center gap-1.5">
              <div 
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'copy';
                  e.dataTransfer.setData('text/plain', valueTa);
                  e.dataTransfer.dropEffect = 'copy';
                  (e.target as HTMLElement).classList.add('opacity-55');
                  try {
                    const img = new Image();
                    img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5'/%3E%3Cpath d='M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6'/%3E%3Cpath d='M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4.5'/%3E%3Cpath d='M18 8a2 2 0 0 1 2 2v9a4 4 0 0 1-4 4H9.415a4 4 0 0 1-2.828-1.172l-4.522-4.522a1 1 0 0 1 0-1.414H2.1a1 1 0 0 1 1-1h2.529a2 2 0 0 1 1.748.966L9 15h1v-4.5c0-1.1.9-2 2-2s2 .9 2 2z'/%3E%3C/svg%3E";
                    e.dataTransfer.setDragImage(img, 10, 10);
                  } catch (err) {}
                }}
                onDragEnd={(e) => {
                  (e.target as HTMLElement).classList.remove('opacity-55');
                }}
                className={`flex-1 bg-slate-50 rounded-2xl cursor-grab active:cursor-grabbing hover:cursor-grab drag-handle-cursor ${isNarrow ? 'px-2 py-1.5' : 'px-4 py-3'} relative group/item hover:bg-slate-100 transition-all border border-transparent hover:border-blue-300 hover:shadow-inner`}
              >
                <p className={`${isNarrow ? 'text-[9px]' : 'text-sm'} font-bold text-slate-900 pr-5 truncate select-all`}>{valueTa}</p>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[7px] font-black text-slate-300 uppercase">TA</span>
                
                {/* Beautiful Drag & Paste Hover overlay */}
                <div className="absolute inset-0 bg-indigo-600/95 rounded-2xl flex items-center justify-center gap-1.5 opacity-0 group-hover/item:opacity-100 transition-all duration-150 pointer-events-none z-10 shadow-lg drag-handle-cursor">
                  <Hand size={isNarrow ? 12 : 14} className="text-white animate-bounce" />
                  <span className="text-[8px] sm:text-[10.5px] font-black uppercase text-white tracking-wider">இழுத்து ஒட்டவும் (Drag & Fill)</span>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => copyToClipboard(valueTa, `${id}_ta`)}
                className={`transition-all shrink-0 ${
                  isNarrow ? 'w-7 h-7 rounded-lg' : 'w-10 h-10 rounded-xl shadow-lg'
                } flex items-center justify-center ${
                  copiedKey === `${id}_ta` ? 'bg-green-600 text-white' : 'bg-slate-900 text-white hover:bg-blue-600'
                }`}
              >
                {copiedKey === `${id}_ta` ? <Check size={isNarrow ? 12 : 16} /> : <Copy size={isNarrow ? 12 : 16} />}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={isNarrow ? 'space-y-6' : 'space-y-10'}>
      {/* Upload Section */}
      <div className={`grid grid-cols-1 ${!isNarrow ? 'lg:grid-cols-2' : ''} ${isNarrow ? 'gap-6' : 'gap-10'}`}>
        <div className={isNarrow ? 'space-y-4' : 'space-y-6'}>
          <div className="relative">
            <input 
              type="file" 
              multiple 
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
              accept="image/*"
            />
            <div className={`border-4 border-dashed border-slate-100 rounded-[3rem] ${isNarrow ? 'p-6' : 'p-12'} text-center group hover:border-blue-200 transition-all bg-slate-50/50`}>
              <div className={`${isNarrow ? 'w-12 h-12 mb-3' : 'w-20 h-20 mb-6'} bg-white rounded-full flex items-center justify-center mx-auto shadow-xl group-hover:scale-110 group-hover:rotate-12 transition-all`}>
                <Upload className="text-blue-600" size={isNarrow ? 20 : 32} />
              </div>
              <h3 className={`${isNarrow ? 'text-sm' : 'text-lg'} font-black text-slate-900 uppercase tracking-tight`}>பதிவேற்றவும்</h3>
              {!isNarrow && (
                <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest leading-relaxed">
                  ஒரே நேரத்தில் பல ஆவணங்களைப் பதிவேற்றலாம்<br/>(Aadhaar, PAN, Ration Card, etc.)
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleExtract}
            disabled={files.length === 0 || isExtracting}
            className={`w-full ${isNarrow ? 'py-4' : 'py-6'} bg-blue-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/40 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-4`}
          >
            {isExtracting ? (
              <>
                <Loader2 size={isNarrow ? 18 : 24} className="animate-spin" />
                {isNarrow ? 'Processing...' : 'தகவல்கள் பகுப்பாய்வு செய்யப்படுகின்றன...'}
              </>
            ) : (
              <>
                <Zap size={isNarrow ? 18 : 24} fill="currentColor" />
                {isNarrow ? 'EXTRACT' : 'தகவல்களைப் பிரித்தெடு (EXTRACT DATA)'}
              </>
            )}
          </button>
        </div>

        {/* Preview List */}
        <div className={`bg-slate-50 rounded-[3rem] ${isNarrow ? 'p-4 min-h-[150px]' : 'p-8 min-h-[300px]'} border border-slate-100`}>
          <div className="flex items-center justify-between mb-4 px-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{isNarrow ? 'FILES' : 'Uploaded Documents'} ({files.length})</h4>
            {files.length > 0 && (
              <button 
                onClick={() => { setFiles([]); setPreviews([]); }}
                className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          <div className={`grid ${isNarrow ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
            <AnimatePresence>
              {previews.map((preview, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative group aspect-square rounded-3xl overflow-hidden border-2 border-white shadow-lg"
                >
                  <img src={preview} alt="Upload" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      onClick={() => removeFile(idx)}
                      className={`${isNarrow ? 'w-6 h-6' : 'w-10 h-10'} bg-red-600 text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform`}
                    >
                      <Trash2 size={isNarrow ? 12 : 18} />
                    </button>
                  </div>
                </motion.div>
              ))}
              {files.length === 0 && (
                <div className={`col-span-full ${isNarrow ? 'h-24' : 'h-48'} flex flex-col items-center justify-center text-slate-300 gap-3 italic`}>
                  <p className="text-[10px] font-black uppercase tracking-widest">No Documents</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <AnimatePresence>
        {extractedData && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className={isNarrow ? 'space-y-6' : 'space-y-8'}
          >
            {/* Super premium CRM integration panel at the top of results */}
            <div className="bg-blue-50 border-4 border-blue-100 rounded-[2.5rem] p-6 text-left space-y-4 shadow-md">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-sm font-black text-blue-900 uppercase tracking-wider flex items-center gap-2">
                    <FolderOpen size={16} className="text-blue-600 shrink-0" />
                    Data Sync & Extraction automation
                  </h4>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">
                    Directly link extracted parameters with CRM Profiles
                  </p>
                </div>
                {isSavedToCRM && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-black text-[9px] uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-green-600 animate-bounce" />
                    Synced
                  </span>
                )}
              </div>

              {/* Verify / Override Details before Synced */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-3xl border border-blue-200 shadow-sm">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 select-none">
                    <User size={12} className="text-blue-500" /> வாடிக்கையாளர் பெயர் (Name) *
                  </label>
                  <input 
                    type="text" 
                    value={overrideName} 
                    onChange={e => setOverrideName(e.target.value)} 
                    placeholder="Name"
                    disabled={isSavedToCRM}
                    className="w-full h-11 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:bg-white outline-none transition-all disabled:opacity-70"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 select-none">
                    <Smartphone size={12} className="text-blue-500" /> கைபேசி எண் (Mobile Number) *
                  </label>
                  <input 
                    type="tel" 
                    maxLength={10}
                    value={overridePhone} 
                    onChange={e => setOverridePhone(e.target.value.replace(/\D/g, ''))} 
                    placeholder="9876543210"
                    disabled={isSavedToCRM}
                    className="w-full h-11 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:bg-white outline-none transition-all disabled:opacity-70"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {activeCustomer ? (
                  <button
                    onClick={() => handleSaveToCustomer(activeCustomer)}
                    disabled={isSavedToCRM}
                    className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-green-600 disabled:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-blue-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
                  >
                    {isSavedToCRM ? (
                      <>
                        <CheckCircle2 size={14} className="text-white" />
                        Details Saved to {activeCustomer.name.split(' ')[0]}
                      </>
                    ) : (
                      <>
                        <FolderOpen size={14} />
                        Update {activeCustomer.name.split(' ')[0]}'s Profile with this Data
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex-1 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex-1 h-12 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <Search size={14} className="text-blue-600" />
                      Select Existing Customer
                    </button>
                    {isDropdownOpen && (
                      <div className="absolute right-10 left-10 mt-14 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-48 overflow-y-auto divide-y z-50 p-1">
                        <div className="p-2 flex items-center justify-between text-slate-400 font-bold text-[9px] uppercase tracking-widest bg-slate-50 rounded-lg shrink-0">
                          <span>Choose CRM customer</span>
                          <button onClick={() => setIsDropdownOpen(false)} className="text-red-500 hover:underline hover:text-red-600">Close</button>
                        </div>
                        {filteredSearchList.map(c => (
                          <button
                            key={c.id}
                            onClick={() => handleSaveToCustomer(c)}
                            className="w-full text-left p-3 hover:bg-blue-50 transition-colors flex flex-col gap-0.5"
                          >
                            <span className="text-xs font-black text-slate-900">{c.name} {c.nameTamil && <span className="text-blue-500">({c.nameTamil})</span>}</span>
                            <span className="text-[9px] font-bold text-slate-400 font-mono">{c.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-[2px] flex-1 bg-slate-100"></div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">{isNarrow ? 'FIELDS' : 'Fields Panel'}</h3>
              <div className="h-[2px] flex-1 bg-slate-100"></div>
            </div>

            {/* Personal Info */}
            <section className={isNarrow ? 'space-y-3' : 'space-y-6'}>
              <div className="flex items-center gap-2 px-2">
                <User size={16} className="text-blue-600" />
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{isNarrow ? 'Personal' : 'Personal Details (தனிப்பட்ட விவரங்கள்)'}</h4>
              </div>
              <div className={`grid grid-cols-1 ${!isNarrow ? 'md:grid-cols-2 lg:grid-cols-3' : ''} gap-4`}>
                <DataField id="name" label="Applicant Name" valueEn={extractedData.applicantName} valueTa={extractedData.applicantNameTamil} icon={User} />
                <DataField id="father" label="Father/Husband Name" valueEn={extractedData.fatherName} valueTa={extractedData.fatherNameTamil} icon={User} />
                <DataField id="mother" label="Mother Name" valueEn={extractedData.motherName} valueTa={extractedData.motherNameTamil} icon={User} />
                <DataField id="spouse" label="Spouse Name" valueEn={extractedData.spouseName} valueTa={extractedData.spouseNameTamil} icon={User} />
                <DataField id="dob" label="Date of Birth" valueEn={extractedData.dob} icon={Zap} />
                <DataField id="gender" label="Gender" valueEn={extractedData.gender} valueTa={extractedData.genderTamil} icon={User} />
              </div>
            </section>

            {/* Address Info */}
            <section className={isNarrow ? 'space-y-3' : 'space-y-6'}>
              <div className="flex items-center gap-2 px-2">
                <MapPin size={16} className="text-emerald-600" />
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{isNarrow ? 'Address' : 'Address Details (முகவரி விவரங்கள்)'}</h4>
              </div>
              <div className={`grid grid-cols-1 ${!isNarrow ? 'md:grid-cols-2 lg:grid-cols-3' : ''} gap-4`}>
                <DataField id="door" label="Door No" valueEn={extractedData.doorNoEn} valueTa={extractedData.doorNoTa} icon={MapPin} />
                <DataField id="street" label="Street" valueEn={extractedData.streetEn} valueTa={extractedData.streetTa} icon={MapPin} />
                <DataField id="village" label="Village" valueEn={extractedData.villageEn} valueTa={extractedData.villageTa} icon={MapPin} />
                <DataField id="taluk" label="Taluk" valueEn={extractedData.talukEn} valueTa={extractedData.talukTa} icon={MapPin} />
                <DataField id="district" label="District" valueEn={extractedData.districtEn} valueTa={extractedData.districtTa} icon={MapPin} />
                <DataField id="pincode" label="Pincode" valueEn={extractedData.pincode} icon={MapPin} />
              </div>
            </section>

            {/* ID Numbers */}
            <section className={isNarrow ? 'space-y-3' : 'space-y-6'}>
              <div className="flex items-center gap-2 px-2">
                <Fingerprint size={16} className="text-indigo-600" />
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{isNarrow ? 'IDs' : 'Identification Numbers (அடையாள எண்கள்)'}</h4>
              </div>
              <div className={`grid grid-cols-1 ${!isNarrow ? 'md:grid-cols-2 lg:grid-cols-3' : ''} gap-4`}>
                <DataField id="aadhaar" label="Aadhaar Number" valueEn={extractedData.aadhaarNumber} icon={Fingerprint} />
                <DataField id="ration" label="Ration Card" valueEn={extractedData.rationCardNumber} icon={Fingerprint} />
                <DataField id="smartcard" label="Smart Card" valueEn={extractedData.smartCardNumber} icon={Fingerprint} />
                <DataField id="voter" label="Voter ID" valueEn={extractedData.voterId} icon={Fingerprint} />
                <DataField id="pan" label="PAN Number" valueEn={extractedData.panNumber} icon={Fingerprint} />
                <DataField id="mobile" label="Mobile Number" valueEn={extractedData.mobileNumber} icon={Zap} />
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Free Limit Upgrade Modal */}
      <AnimatePresence>
        {showLimitModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
              onClick={() => setShowLimitModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="relative bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-2xl w-full max-w-sm overflow-hidden text-center"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <AlertTriangle size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="font-extrabold text-lg text-slate-900 uppercase tracking-tight">
                    {language === "ta" ? "தினசரி இலவச வரம்பு முடிந்தது!" : "Daily Free Limit Reached!"}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    {language === "ta" 
                      ? "இன்றைய இலவச 3 தரவு பிரித்தெடுப்புகள் பயன்படுத்தப்பட்டுவிட்டன. புதிய சேவைகளைத் தொடர்ந்து பயன்படுத்த உங்கள் கணக்கை பிரீமியமாக மேம்படுத்தவும்." 
                      : "You have used your 3 free document extractions for today. Upgrade to Premium to unlock unlimited scans and full automation features."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowLimitModal(false)}
                  className="px-4 py-3 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                >
                  {language === "ta" ? "சரி, மூடு" : "Close"}
                </button>
                <div
                  className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center"
                  onClick={() => {
                    setShowLimitModal(false);
                    showToast(language === "ta" ? "பிரீமியம் பெற ஆதரவுக் குழுவைத் தொடர்பு கொள்ளவும்!" : "Please contact support to upgrade!", "info");
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
