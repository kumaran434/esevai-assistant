import React, { useState, useEffect } from 'react';
import { Download, FolderOpen, Search, PlusCircle, CheckCircle, Smartphone, User, CheckCircle2, X } from 'lucide-react';
import { getIpcRenderer } from '../../lib/electron-mock';
import { Customer } from '../../types';
import { customerService } from '../../services/customerService';
import { useToast } from '../../hooks/useToast';

interface ToolActionsProps {
  blob: Blob;
  fileName: string;
  onDownload?: () => void;
  isNarrow?: boolean;
}

export default function ToolActions({ blob, fileName, onDownload, isNarrow }: ToolActionsProps) {
  const ipc = getIpcRenderer();
  const { showToast } = useToast();
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);

  // CRM Link states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  
  const [isLinkingOpen, setIsLinkingOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSavedToProfile, setIsSavedToProfile] = useState(false);
  const [isSavingToProfile, setIsSavingToProfile] = useState(false);

  // Quick profile creation states in tool
  const [showToolPhoneModal, setShowToolPhoneModal] = useState(false);
  const [toolPhoneValue, setToolPhoneValue] = useState('');
  const [toolPhoneError, setToolPhoneError] = useState('');
  const [isCreatingToolProfile, setIsCreatingToolProfile] = useState(false);

  const lastDispatchedUrl = React.useRef<string | null>(null);

  // Load and subscribe to customers
  useEffect(() => {
    const unsubscribe = customerService.subscribeToCustomers((data) => {
      setCustomers(data);
    });
    
    // Read active customer ID
    const savedId = localStorage.getItem("ACTIVE_CUSTOMER_ID");
    setActiveCustomerId(savedId);

    // Dynamic local storage listener
    const handleActiveCustChange = () => {
      const currentId = localStorage.getItem("ACTIVE_CUSTOMER_ID");
      setActiveCustomerId(currentId);
    };

    window.addEventListener("ACTIVE_CUSTOMER_ID_CHANGED", handleActiveCustChange);
    // Poll to keep in sync smoothly
    const interval = setInterval(handleActiveCustChange, 1000);

    return () => {
      unsubscribe();
      window.removeEventListener("ACTIVE_CUSTOMER_ID_CHANGED", handleActiveCustChange);
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

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      
      // Prevent infinite loops and flickering
      if (url === lastDispatchedUrl.current) return;
      lastDispatchedUrl.current = url;
      
      setDataUrl(url);
      
      // Dispatch global event once per unique file change
      window.dispatchEvent(new CustomEvent('FILE_READY_FOR_DRAG', {
        detail: {
          blob,
          name: fileName,
          dataUrl: url
        }
      }));
    };
    reader.readAsDataURL(blob);
    
    // Reset saved to profile state whenever file changes
    setIsSavedToProfile(false);
  }, [blob, fileName]);

  useEffect(() => {
    const handleDownloadResult = (_event: any, result: { success: boolean, path?: string }) => {
      if (result.success && result.path) {
        setSavedPath(result.path);
        // Automatically open the folder when saved
        ipc.send('show-item-in-folder', result.path);
      }
    };

    ipc.on('download-result', handleDownloadResult);
    return () => {
      ipc.removeListener('download-result', handleDownloadResult);
    };
  }, [ipc]);

  const handleDownload = () => {
    const isElectron = typeof window !== 'undefined' && 
                       (window.process && (window.process as any).type === 'renderer' ||
                        navigator.userAgent.includes('Electron'));

    if (isElectron && dataUrl) {
      ipc.send('download-file', {
        dataUrl: dataUrl,
        fileName: fileName,
        type: blob.type
      });
    } else if (onDownload) {
      onDownload();
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Dedicated save to customer action
  const handleSaveToCustomer = async (customerToSave: Customer) => {
    if (!customerToSave || !customerToSave.id || !dataUrl) return;
    setIsSavingToProfile(true);
    
    try {
      const cleanFileName = fileName || "signed_document.jpg";
      const cleanFieldName = cleanFileName
        .replace(/_\d+\.\w+$/, "") // strip timestamp
        .replace(/\.[^/.]+$/, "")  // strip extension
        .replace(/_/g, " ")        // format underscores
        .replace(/\b\w/g, c => c.toUpperCase()); // Capitalize words
      
      const newDoc = {
        id: "doc-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        type: cleanFieldName,
        url: dataUrl,
        fileName: cleanFileName
      };

      const existingDocs = customerToSave.documents || [];
      await customerService.updateCustomer(customerToSave.id, {
        documents: [...existingDocs, newDoc]
      });

      // Also set as active customer globally so they see their details on left pane
      localStorage.setItem("ACTIVE_CUSTOMER_ID", customerToSave.id);
      window.dispatchEvent(new CustomEvent("ACTIVE_CUSTOMER_ID_CHANGED"));

      setIsSavedToProfile(true);
      setIsLinkingOpen(false);
      showToast(`${customerToSave.name} சுயவிவரத்தில் ஆவணம் வெற்றிகரமாகச் சேமிக்கப்பட்டது!`, 'success');
    } catch (err: any) {
      showToast(`ஆவணத்தைச் சேமிப்பதில் தோல்வி: ${err.message}`, 'error');
    } finally {
      setIsSavingToProfile(false);
    }
  };

  const handleCreateQuickCustomerInTool = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = toolPhoneValue.trim();
    if (!/^\d{10}$/.test(cleanPhone)) {
      setToolPhoneError('தயவுசெய்து சரியான 10-இலக்க அலைபேசி எண்ணை உள்ளிடவும்.');
      return;
    }

    setToolPhoneError('');
    setIsCreatingToolProfile(true);

    try {
      // Check if customer with same phone already exists
      const existing = customers.find(c => c.phone === cleanPhone);
      if (existing) {
        await handleSaveToCustomer(existing);
        setShowToolPhoneModal(false);
        setToolPhoneValue('');
        return;
      }

      const cleanFileName = fileName || "document.jpg";
      const cleanFieldName = cleanFileName
        .replace(/_\d+\.\w+$/, "") // strip timestamp
        .replace(/\.[^/.]+$/, "")  // strip extension
        .replace(/_/g, " ")        // format underscores
        .replace(/\b\w/g, c => c.toUpperCase()); // Capitalize words
      
      const newDoc = {
        id: "doc-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        type: cleanFieldName,
        url: dataUrl || '',
        fileName: cleanFileName
      };

      const newId = await customerService.addCustomer({
        name: cleanPhone, // default name is mobile number
        phone: cleanPhone,
        documents: [newDoc]
      });

      // Also set as active customer globally so they see their details on left pane
      localStorage.setItem("ACTIVE_CUSTOMER_ID", newId);
      window.dispatchEvent(new CustomEvent("ACTIVE_CUSTOMER_ID_CHANGED"));

      setIsSavedToProfile(true);
      setIsLinkingOpen(false);
      setShowToolPhoneModal(false);
      setToolPhoneValue('');
      showToast('புதிய சுயவிவரம் உருவாக்கப்பட்டு ஆவணம் இணைக்கப்பட்டது!', 'success');
    } catch (err: any) {
      showToast(`சுயவிவரம் உருவாக்குவதில் பிழை: ${err.message}`, 'error');
    } finally {
      setIsCreatingToolProfile(false);
    }
  };

  const searchedList = customers.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.nameTamil && c.nameTamil.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    );
  });

  return (
    <div className="space-y-4 w-full">
      <div className={`grid gap-3 mt-6 ${isNarrow ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {/* Core download button */}
        <button 
          onClick={handleDownload}
          className={`flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase transition-all flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] ${
            isNarrow 
              ? 'py-3 text-[9px] tracking-normal px-2' 
              : 'py-4 tracking-[0.2em] text-[10px] sm:text-xs px-4'
          }`}
        >
          <Download size={isNarrow ? 12 : 14} /> 
          {savedPath ? (isNarrow ? 'Saved' : 'Saved (சேமிக்கப்பட்டது)') : (isNarrow ? 'Download' : 'Save/Download (பதிவிறக்கு)')}
        </button>

        {/* Dynamic CRM Saving Button */}
        {activeCustomer ? (
          <button
            onClick={() => handleSaveToCustomer(activeCustomer)}
            disabled={isSavedToProfile || isSavingToProfile}
            className={`flex-1 transition-all rounded-2xl font-black uppercase flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] ${
              isNarrow 
                ? 'py-3 text-[8.5px] tracking-tight leading-tight px-1.5' 
                : 'py-4 tracking-[0.1em] sm:tracking-[0.15em] text-[10px] sm:text-xs px-4'
            } ${
              isSavedToProfile 
                ? 'bg-green-50 text-green-600 border border-green-200' 
                : 'bg-blue-600 hover:bg-blue-700 text-white border border-transparent'
            }`}
          >
            {isSavedToProfile ? (
              <>
                <CheckCircle2 size={13} className="text-green-500 animate-bounce shrink-0" />
                <span className="truncate">Saved to {activeCustomer.name.split(' ')[0]}</span>
              </>
            ) : (
              <>
                <FolderOpen size={13} className="shrink-0" />
                <span className="truncate">Save to {activeCustomer.name.split(' ')[0]}'s Profile</span>
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => {
              setIsLinkingOpen(!isLinkingOpen);
            }}
            disabled={isSavedToProfile || isSavingToProfile}
            className={`flex-1 transition-all rounded-2xl font-black uppercase flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] ${
              isNarrow 
                ? 'py-3 text-[9px] tracking-normal px-2' 
                : 'py-4 tracking-[0.15em] text-[10px] sm:text-xs px-4'
            } ${
              isSavedToProfile 
                ? 'bg-green-50 text-green-600 border border-green-200' 
                : 'bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200'
            }`}
          >
            {isSavedToProfile ? (
              <>
                <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                <span className="truncate">Linked Successfully</span>
              </>
            ) : (
              <>
                <FolderOpen size={14} className="text-blue-600 shrink-0" />
                <span className="truncate">Link to Customer</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Selector view dropdown expanding smoothly */}
      {isLinkingOpen && !isSavedToProfile && (
        <div className="bg-slate-50 border-2 border-slate-100 p-4 rounded-3xl mt-2 animate-fadeIn space-y-4 text-left">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
              Link file to registered customer
            </span>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search by customer name or mobile number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-4 bg-white border-2 border-slate-100 rounded-xl text-xs font-bold focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                const prefilled = searchQuery.replace(/\D/g, '').slice(0, 10);
                setToolPhoneValue(prefilled);
                setToolPhoneError('');
                setShowToolPhoneModal(true);
              }}
              className="w-full h-11 px-4 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-slate-900 hover:to-slate-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <PlusCircle size={14} /> புதிய சுயவிவரத்தை உருவாக்கு (Add Profile)
            </button>

            <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-150 divide-y bg-white divide-slate-100">
              {searchedList.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleSaveToCustomer(c)}
                  className="w-full text-left p-3 hover:bg-blue-50 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <p className="text-xs font-black text-slate-900 leading-none">{c.name} {c.nameTamil && <span className="text-blue-500">({c.nameTamil})</span>}</p>
                    <p className="text-[9px] font-bold text-slate-400 font-mono mt-1">{c.phone}</p>
                  </div>
                  <span className="text-[9px] font-black text-blue-600 tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">Select & Save</span>
                </button>
              ))}
              {searchedList.length === 0 && (
                <div className="p-4 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase italic">No registered customers found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showToolPhoneModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 text-left">
          <div 
            onClick={() => setShowToolPhoneModal(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer" 
          />
          <div className="relative bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl border border-slate-100 flex flex-col space-y-5 text-left z-10">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-950 flex items-center gap-2">
                  <Smartphone className="text-blue-600 animate-pulse shrink-0" size={16} />
                  அலைபேசி எண் சரிபார்ப்பு
                </h3>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Mobile Number Entry</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowToolPhoneModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateQuickCustomerInTool} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                  வாடிக்கையாளர் அலைபேசி எண் *
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text"
                    maxLength={10}
                    pattern="\d*"
                    value={toolPhoneValue}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setToolPhoneValue(val);
                    }}
                    placeholder="10-இலக்க அலைபேசி எண்ணை உள்ளிடவும்..."
                    className="w-full h-11 pl-10 pr-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold focus:border-blue-500 focus:bg-white outline-none transition-all leading-none focus:ring-0"
                    autoFocus
                  />
                </div>
                {toolPhoneError && (
                  <p className="text-[10px] font-bold text-red-500 mt-1">{toolPhoneError}</p>
                )}
                <p className="text-[9px] font-medium text-slate-400 leading-normal mt-1.5">
                  உத்தரவாதம்: அலைபேசி எண்ணை உள்ளிட்ட பிறகு மட்டுமே புதிய சுயவிவரம் உருவாக்கப்பட்டு இந்த ஆவணத்துடன் இணைக்கப்படும்.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1.5">
                <button 
                  type="button"
                  onClick={() => setShowToolPhoneModal(false)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl py-3 font-black uppercase tracking-widest text-[9px] transition-all cursor-pointer leading-none"
                >
                  ரத்து செய் (Cancel)
                </button>
                <button 
                  type="submit"
                  disabled={isCreatingToolProfile}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-black uppercase tracking-widest text-[9px] transition-all cursor-pointer shadow-lg shadow-blue-100 leading-none disabled:opacity-50"
                >
                  {isCreatingToolProfile ? 'உருவாக்குகிறது...' : 'உருவாக்கு (Create & Link)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
