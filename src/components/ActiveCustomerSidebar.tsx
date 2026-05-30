import React, { useState, useEffect } from "react";
import { 
  User, 
  MapPin, 
  Calendar, 
  Phone, 
  Fingerprint, 
  Copy, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  PlusCircle, 
  CreditCard, 
  X, 
  CheckCircle2,
  Users,
  FolderOpen,
  Download,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Customer } from "../types";
import { customerService } from "../services/customerService";
import { isElectron, getIpcRenderer } from "../lib/electron-mock";

interface ActiveCustomerSidebarProps {
  activeCustomerId: string | null;
  onSelectCustomer: (id: string | null) => void;
  onUpdateCustomer?: (id: string, updatedFields: Partial<Customer>) => void;
  isEmbedded?: boolean;
}

export default function ActiveCustomerSidebar({ 
  activeCustomerId, 
  onSelectCustomer,
  onUpdateCustomer,
  isEmbedded = false
}: ActiveCustomerSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = customerService.subscribeToCustomers((data) => {
      setCustomers(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeCustomerId) {
      const found = customers.find(c => c.id === activeCustomerId);
      setActiveCustomer(found || null);
    } else {
      setActiveCustomer(null);
    }
  }, [activeCustomerId, customers]);

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleDownloadDocument = (doc: { url: string; fileName: string }) => {
    if (isElectron()) {
      const ipc = getIpcRenderer();
      const mimeType = doc.url.startsWith('data:') 
        ? (doc.url.match(/^data:([^;]+);/) || [])[1] || 'image/jpeg' 
        : 'image/jpeg';
      
      ipc.send('download-file', {
        dataUrl: doc.url,
        fileName: doc.fileName,
        type: mimeType
      });
    } else {
      try {
        if (doc.url.startsWith('data:')) {
          const parts = doc.url.split(',');
          const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
          const bstr = atob(parts[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const blob = new Blob([u8arr], { type: mime });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = doc.fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          const a = document.createElement('a');
          a.href = doc.url;
          a.download = doc.fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } catch (e) {
        console.error("Web download failed:", e);
        const w = window.open();
        if (w) {
          w.document.write(`<iframe src="${doc.url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
        }
      }
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

  // Comprehensive fields mapping
  const getDisplayFields = (cust: Customer) => {
    // Collect all fields elegantly in sections
    return [
      {
        section: "Identity (அடையாளம்)",
        icon: User,
        fields: [
          { key: "name", label: "Name (English)", value: cust.name },
          { key: "nameTamil", label: "பெயர் தமிழில்", value: cust.nameTamil },
          { key: "dob", label: "Date of Birth", value: cust.dob },
          { key: "gender", label: "Gender", value: cust.gender ? `${cust.gender} (${cust.genderTamil || ""})` : null },
          { key: "phone", label: "Phone Number", value: cust.phone },
          { key: "email", label: "Email", value: cust.email },
        ]
      },
      {
        section: "Family (குடும்ப விவரங்கள்)",
        icon: Users,
        fields: [
          { key: "fatherName", label: "Father/Husband Name", value: cust.fatherName },
          { key: "fatherNameTamil", label: "தந்தை/கணவர் பெயர் (தமிழ்)", value: cust.fatherNameTamil },
          { key: "motherName", label: "Mother Name", value: cust.motherName },
          { key: "motherNameTamil", label: "தாய் பெயர் (தமிழ்)", value: cust.motherNameTamil },
          { key: "spouseName", label: "Spouse Name", value: cust.spouseName },
          { key: "spouseNameTamil", label: "துணைவர் பெயர் (தமிழ்)", value: cust.spouseNameTamil },
        ]
      },
      {
        section: "Official IDs (அரசு அடையாளங்கள்)",
        icon: Fingerprint,
        fields: [
          { key: "aadhaar", label: "Aadhaar Number", value: cust.aadhaar },
          { key: "voterId", label: "Voter ID Card", value: cust.voterId },
          { key: "smartCard", label: "Smart / Ration Card", value: cust.smartCard },
          { key: "pan", label: "PAN Card Number", value: cust.pan },
          { key: "canNumber", label: "CAN Number", value: cust.canNumber },
        ]
      },
      {
        section: "Address (முகவரி)",
        icon: MapPin,
        fields: [
          { key: "doorNo", label: "Door / Flat No", value: cust.doorNo },
          { key: "streetName", label: "Street/Road Name", value: cust.streetName },
          { key: "streetNameTamil", label: "தெரு பெயர் (தமிழ்)", value: cust.streetNameTamil },
          { key: "village", label: "Village / Town", value: cust.village },
          { key: "villageTamil", label: "கிராமம் / நகரம் (தமிழ்)", value: cust.villageTamil },
          { key: "taluk", label: "Taluk / Block", value: cust.taluk },
          { key: "talukTamil", label: "வட்டம் (தமிழ்)", value: cust.talukTamil },
          { key: "district", label: "District", value: cust.district },
          { key: "districtTamil", label: "மாவட்டம் (தமிழ்)", value: cust.districtTamil },
          { key: "pincode", label: "Postal Pincode", value: cust.pincode },
          { key: "address", label: "Full Custom Address", value: cust.address },
          { key: "addressTamil", label: "முழு முகவரி (தமிழ்)", value: cust.addressTamil },
        ]
      },
      {
        section: "Bank Profile (வங்கி விவரம்)",
        icon: CreditCard,
        fields: [
          { key: "bankName", label: "Bank Name", value: cust.bankName },
          { key: "accountNumber", label: "Account Number", value: cust.accountNumber },
          { key: "ifscCode", label: "IFSC Code", value: cust.ifscCode },
        ]
      }
    ];
  };

  if (isEmbedded) {
    return (
      <div className="w-full flex flex-col select-none bg-white rounded-3xl overflow-hidden p-1">
        {/* Header containing customer status */}
        <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-2xl flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <User size={12} className="text-blue-600" />
              Active Customer (சுயவிவரம்)
            </h3>
            {activeCustomer && (
              <button
                onClick={() => onSelectCustomer(null)}
                className="text-[8px] font-black uppercase text-red-500 hover:underline tracking-wider"
              >
                Clear / நீக்கு
              </button>
            )}
          </div>

          {!activeCustomer ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                <input
                  type="text"
                  placeholder="Select customer / தேடுக..."
                  onClick={() => setIsDropdownOpen(true)}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  className="w-full h-8 pl-8 pr-6 bg-white border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-blue-600"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-400 hover:text-slate-600"
                  >
                    CLEAR
                  </button>
                )}
              </div>

              {/* Dynamic Profiles Selector Dropdown */}
              {isDropdownOpen && (
                <div className="absolute left-2 right-2 bg-white border border-slate-250 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-slate-100 p-1 mt-1">
                  <div className="flex items-center justify-between p-1.5 shrink-0">
                    <span className="text-[8px] font-black tracking-wider uppercase text-slate-400">Select Profile</span>
                    <button 
                      onClick={() => setIsDropdownOpen(false)} 
                      className="text-[8px] font-bold text-red-500 uppercase tracking-wider"
                    >
                      Close
                    </button>
                  </div>
                  {filteredSearchList.map(c => (
                    <button
                      key={c.id}
                      onClick={() => {
                        onSelectCustomer(c.id || null);
                        setIsDropdownOpen(false);
                        setSearchQuery("");
                      }}
                      className="w-full text-left p-2 hover:bg-slate-50 rounded-lg flex flex-col gap-0.5 transition-colors"
                    >
                      <span className="text-[10px] font-black text-slate-800">{c.name}</span>
                      {c.nameTamil && <span className="text-[9px] font-bold text-blue-600">{c.nameTamil}</span>}
                      <span className="text-[8px] font-bold font-mono text-slate-400">{c.phone}</span>
                    </button>
                  ))}
                  {filteredSearchList.length === 0 && (
                    <div className="p-3 text-center text-[8px] font-bold text-slate-400 uppercase">
                      No results
                    </div>
                  )}
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-xs flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-[11px] uppercase shrink-0">
                {activeCustomer.name?.[0] || '?'}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[10px] font-black text-slate-900 truncate leading-tight">
                  {activeCustomer.name}
                </p>
                {activeCustomer.nameTamil && (
                  <p className="text-[9px] font-bold text-blue-600 truncate leading-none mt-0.5">
                    {activeCustomer.nameTamil}
                  </p>
                )}
                <p className="text-[8px] text-slate-400 font-bold font-mono tracking-wide mt-0.5">
                  {activeCustomer.phone}
                </p>
              </div>
              <button
                onClick={() => onSelectCustomer(null)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500 shrink-0"
                title="Change active customer"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Copy Items Section */}
        <div className="mt-3 space-y-4">
          {activeCustomer ? (
            <>
              {/* Linked Documents (இணைக்கப்பட்ட ஆவணங்கள்) */}
              {activeCustomer.documents && activeCustomer.documents.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 px-1">
                    <FolderOpen size={10} className="text-blue-500 shrink-0" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                      Documents / ஆவணங்கள் ({activeCustomer.documents.length})
                    </span>
                  </div>

                  <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-1.5 shadow-xs space-y-1 overflow-hidden">
                    {activeCustomer.documents.map((doc) => (
                      <div 
                        key={doc.id} 
                        className="p-1.5 bg-white border border-slate-100/80 rounded-lg flex items-center justify-between gap-2 transition-all shadow-xs group/doc"
                      >
                        <div className="flex-1 min-w-0 pr-1">
                          <span className="block text-[9px] font-black text-slate-700 truncate" title={doc.fileName}>
                            {doc.type}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDownloadDocument(doc)}
                            className="p-1 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-md transition-colors shadow-xs"
                            title="Download document / பதிவிறக்கவும்"
                          >
                            <Download size={9} />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const updatedDocs = (activeCustomer.documents || []).filter(d => d.id !== doc.id);
                              await customerService.updateCustomer(activeCustomer.id!, { documents: updatedDocs });
                            }}
                            className="p-1 bg-red-50 hover:bg-red-600 text-red-500 hover:text-white rounded-md transition-colors shadow-xs"
                            title="Delete document / நீக்கவும்"
                          >
                            <Trash2 size={9} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {getDisplayFields(activeCustomer).map((sec, sIdx) => {
                // Only render section if at least one field has value
                const hasData = sec.fields.some(f => f.value);
                if (!hasData) return null;
                
                const SecIcon = sec.icon;

                return (
                  <div key={sIdx} className="space-y-1.5 animate-fade-in">
                    <div className="flex items-center gap-1.5 px-1">
                      <SecIcon size={10} className="text-slate-400 shrink-0" />
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">{sec.section}</span>
                    </div>

                    <div className="bg-white border rounded-xl p-0.5 shadow-inner divide-y divide-slate-100/80 overflow-hidden">
                      {sec.fields.map(field => {
                        if (!field.value) return null;

                        return (
                          <div 
                            key={field.key} 
                            className="p-2 hover:bg-slate-50/50 flex items-center justify-between gap-2 group transition-colors"
                          >
                            <div className="flex-1 min-w-0 pr-1">
                              <span className="block text-[7px] font-black text-slate-400 uppercase tracking-wider">{field.label}</span>
                              <span className="block text-[10px] font-bold text-slate-800 break-words mt-0.5 select-all">{field.value}</span>
                            </div>
                            
                            <button
                              onClick={() => handleCopy(field.value || "", field.key)}
                              className={`p-1 rounded-md transition-all shadow-xs ${
                                copiedKey === field.key 
                                  ? "bg-green-600 text-white" 
                                  : "bg-slate-100 text-slate-500 hover:bg-blue-600 hover:text-white opacity-0 group-hover:opacity-100 focus:opacity-100"
                              }`}
                              title={`Copy ${field.label}`}
                            >
                              {copiedKey === field.key ? <CheckCircle2 size={10} /> : <Copy size={10} />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center italic space-y-1.5">
              <Users size={24} className="text-slate-300 mx-auto animate-pulse" />
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">No Active Customer</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase leading-snug">
                Select a customer above or from registered dashboard list to unlock click-to-copy fields panel instantly!
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col shrink-0 select-none z-40 border-r border-slate-200 bg-white">
      {/* Sidebar toggle button (collapsible tab) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-1/2 -translate-y-1/2 -right-4 w-4 h-20 bg-slate-900 border border-slate-800 text-white rounded-r-xl flex items-center justify-center hover:bg-blue-600 transition-colors shadow-lg z-50 cursor-pointer"
        title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
      >
        {isOpen ? <ChevronLeft size={10} strokeWidth={3} /> : <ChevronRight size={10} strokeWidth={3} />}
      </button>

      {/* Main Container */}
      <motion.div
        animate={{ width: isOpen ? 320 : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ type: "tween", duration: 0.25 }}
        className="h-full flex flex-col overflow-hidden"
      >
        {/* Header containing customer status */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <User size={14} className="text-blue-600" />
              Active Customer
            </h3>
            {activeCustomer && (
              <button
                onClick={() => onSelectCustomer(null)}
                className="text-[9px] font-black uppercase text-red-500 hover:underline tracking-wider"
              >
                Clear
              </button>
            )}
          </div>

          {!activeCustomer ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Select customer to copy..."
                  onClick={() => setIsDropdownOpen(true)}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  className="w-full h-10 pl-9 pr-6 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-400 hover:text-slate-600"
                  >
                    CLEAR
                  </button>
                )}
              </div>

              {/* Dynamic Profiles Selector Dropdown */}
              {isDropdownOpen && (
                <div className="absolute left-4 right-4 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto z-50 divide-y divide-slate-100 p-1 mt-1">
                  <div className="flex items-center justify-between p-2 shrink-0">
                    <span className="text-[9px] font-black tracking-widest uppercase text-slate-400">Select Profile</span>
                    <button 
                      onClick={() => setIsDropdownOpen(false)} 
                      className="text-[9px] font-bold text-red-500 uppercase tracking-wider"
                    >
                      Close
                    </button>
                  </div>
                  {filteredSearchList.map(c => (
                    <button
                      key={c.id}
                      onClick={() => {
                        onSelectCustomer(c.id || null);
                        setIsDropdownOpen(false);
                        setSearchQuery("");
                      }}
                      className="w-full text-left p-2.5 hover:bg-slate-50 rounded-lg flex flex-col gap-0.5 transition-colors"
                    >
                      <p className="text-xs font-black text-slate-900">{c.name} {c.nameTamil && <span className="text-blue-500">({c.nameTamil})</span>}</p>
                      <p className="text-[10px] font-bold text-slate-400 font-mono">{c.phone}</p>
                    </button>
                  ))}
                  {filteredSearchList.length === 0 && (
                    <div className="p-4 text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase italic">No profile matches.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-3 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-sm uppercase">
                {activeCustomer.name?.[0] || '?'}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-black text-slate-900 truncate leading-tight">
                  {activeCustomer.name}
                </p>
                {activeCustomer.nameTamil && (
                  <p className="text-[10px] font-bold text-blue-600 truncate leading-none mt-0.5">
                    {activeCustomer.nameTamil}
                  </p>
                )}
                <p className="text-[9px] text-slate-400 font-bold font-mono tracking-wide mt-1">
                  {activeCustomer.phone}
                </p>
              </div>
              <button
                onClick={() => onSelectCustomer(null)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 shrink-0"
                title="Change active customer"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Copy Items Section */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-slate-50/50">
          {activeCustomer ? (
            <>
              {/* Linked Documents (இணைக்கப்பட்ட ஆவணங்கள்) */}
              {activeCustomer.documents && activeCustomer.documents.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 px-1">
                    <FolderOpen size={12} className="text-blue-500 shrink-0" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Documents / ஆவணங்கள் ({activeCustomer.documents.length})
                    </span>
                  </div>

                  <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-2 shadow-sm space-y-1.5 overflow-hidden">
                    {activeCustomer.documents.map((doc) => (
                      <div 
                        key={doc.id} 
                        className="p-2 bg-white border border-slate-100 rounded-xl hover:border-blue-200 flex items-center justify-between gap-2 transition-all shadow-sm group/doc"
                      >
                        <div className="flex-1 min-w-0 pr-1">
                          <span className="block text-[10px] font-black text-slate-700 truncate" title={doc.fileName}>
                            {doc.type}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDownloadDocument(doc)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-lg transition-colors shadow-xs"
                            title="Download document / பதிவிறக்கவும்"
                          >
                            <Download size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const updatedDocs = (activeCustomer.documents || []).filter(d => d.id !== doc.id);
                              await customerService.updateCustomer(activeCustomer.id!, { documents: updatedDocs });
                            }}
                            className="p-1.5 bg-red-50 hover:bg-red-600 text-red-500 hover:text-white rounded-lg transition-colors shadow-xs"
                            title="Delete document / நீக்கவும்"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {getDisplayFields(activeCustomer).map((sec, sIdx) => {
              // Only render section if at least one field has value
              const hasData = sec.fields.some(f => f.value);
              if (!hasData) return null;
              
              const SecIcon = sec.icon;

              return (
                <div key={sIdx} className="space-y-2">
                  <div className="flex items-center gap-1.5 px-1">
                    <SecIcon size={12} className="text-slate-400 shrink-0" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{sec.section}</span>
                  </div>

                  <div className="bg-white border rounded-2xl p-1 shadow-sm divide-y divide-slate-100 overflow-hidden">
                    {sec.fields.map(field => {
                      if (!field.value) return null;

                      return (
                        <div 
                          key={field.key} 
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'copy';
                            e.dataTransfer.setData('text/plain', field.value || "");
                            e.dataTransfer.dropEffect = 'copy';
                            (e.currentTarget as HTMLElement).classList.add('opacity-50');
                          }}
                          onDragEnd={(e) => {
                            (e.currentTarget as HTMLElement).classList.remove('opacity-50');
                          }}
                          className="p-2.5 hover:bg-slate-50/50 flex items-center justify-between gap-2 group transition-all cursor-grab active:cursor-grabbing hover:cursor-grab drag-handle-cursor border-l-2 border-transparent hover:border-blue-500 hover:shadow-inner"
                        >
                          <div className="flex-1 min-w-0 pr-1">
                            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">{field.label}</span>
                            <span className="block text-[11px] font-bold text-slate-800 break-words mt-0.5 select-all">{field.value}</span>
                          </div>
                          
                          <button
                            onClick={() => handleCopy(field.value || "", field.key)}
                            className={`p-1.5 rounded-lg transition-all shadow-sm ${
                              copiedKey === field.key 
                                ? "bg-green-600 text-white" 
                                : "bg-slate-100 text-slate-500 hover:bg-blue-600 hover:text-white opacity-0 group-hover:opacity-100 focus:opacity-100"
                            }`}
                            title={`Copy ${field.label}`}
                          >
                            {copiedKey === field.key ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}</>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center italic mt-16 space-y-3">
              <Users size={32} className="text-slate-300 animate-pulse" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest">No Active Customer</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Select a customer above or from registered dashboard list to unlock click-to-copy fields panel instantly!</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
