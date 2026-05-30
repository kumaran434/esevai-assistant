import React, { useState } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronLeft, 
  Check, 
  Sparkles, 
  User, 
  Fingerprint, 
  MapPin, 
  CreditCard, 
  Zap, 
  FileSearch, 
  Scaling, 
  FileArchive, 
  PenTool, 
  Image as ImageIcon, 
  FileStack, 
  FileText, 
  Languages, 
  X as CloseIcon,
  Briefcase,
  AlertTriangle,
  CheckSquare,
  Download,
  FolderOpen,
  Trash2
} from "lucide-react";
import { Customer } from "../types";
import { isElectron, getIpcRenderer } from "../lib/electron-mock";

interface ProfileWorkspaceProps {
  isEditMode: boolean;
  initialCustomer?: Customer | null;
  onSave: (cust: any) => Promise<void>;
  onCancel: () => void;
  onSelectTool?: (toolId: string, currentData: any) => void;
  onDeleteDocument?: (docId: string) => Promise<void>;
}

export default function ProfileWorkspace({
  isEditMode,
  initialCustomer,
  onSave,
  onCancel,
  onSelectTool,
  onDeleteDocument
}: ProfileWorkspaceProps) {
  // Form fields state
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: initialCustomer?.name || '',
    nameTamil: initialCustomer?.nameTamil || '',
    phone: initialCustomer?.phone || '',
    email: initialCustomer?.email || '',
    dob: initialCustomer?.dob || '',
    gender: initialCustomer?.gender || 'Male',
    genderTamil: initialCustomer?.genderTamil || 'ஆண்',
    fatherName: initialCustomer?.fatherName || '',
    fatherNameTamil: initialCustomer?.fatherNameTamil || '',
    motherName: initialCustomer?.motherName || '',
    motherNameTamil: initialCustomer?.motherNameTamil || '',
    spouseName: initialCustomer?.spouseName || '',
    spouseNameTamil: initialCustomer?.spouseNameTamil || '',
    aadhaar: initialCustomer?.aadhaar || '',
    voterId: initialCustomer?.voterId || '',
    smartCard: initialCustomer?.smartCard || '',
    pan: initialCustomer?.pan || '',
    canNumber: initialCustomer?.canNumber || '',
    doorNo: initialCustomer?.doorNo || '',
    streetName: initialCustomer?.streetName || '',
    streetNameTamil: initialCustomer?.streetNameTamil || '',
    village: initialCustomer?.village || '',
    villageTamil: initialCustomer?.villageTamil || '',
    taluk: initialCustomer?.taluk || '',
    talukTamil: initialCustomer?.talukTamil || '',
    district: initialCustomer?.district || '',
    districtTamil: initialCustomer?.districtTamil || '',
    pincode: initialCustomer?.pincode || '',
    address: initialCustomer?.address || '',
    addressTamil: initialCustomer?.addressTamil || '',
    bankName: initialCustomer?.bankName || '',
    accountNumber: initialCustomer?.accountNumber || '',
    ifscCode: initialCustomer?.ifscCode || ''
  });

  const handleDownloadDocument = (doc: { url: string; fileName: string }) => {
    if (!doc.url) return;
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
      } catch (err) {
        console.error("Download failed in profile workspace:", err);
      }
    }
  };

  // Tools list for shortcut linking
  const toolsList = [
    {
      id: "extract",
      name: "AI தகவல் எடுப்பான்",
      sub: "AI Extraction",
      icon: FileSearch,
      color: "bg-blue-100 text-blue-700 border-blue-200",
      description: "ஆதாரில் இருந்து தகவல்களைத் தானாகப் பிரித்தெடுக்கவும்."
    },
    {
      id: "resizer",
      name: "புகைப்பட அளவு மாற்றி",
      sub: "Photo Resizer",
      icon: Scaling,
      color: "bg-teal-100 text-teal-700 border-teal-200",
      description: "புகைப்படங்களை பிக்சல் அளவில் துல்லியமாக மாற்றவும்."
    },
    {
      id: "compressor",
      name: "PDF கோப்பு அழுத்தி",
      sub: "PDF Compressor",
      icon: FileArchive,
      color: "bg-violet-100 text-violet-700 border-violet-200",
      description: "PDF கோப்புகளை 20KB-க்குள் சுருக்கவும்."
    },
    {
      id: "signature",
      name: "கையொப்ப உருவாக்கி",
      sub: "Signature Pad",
      icon: PenTool,
      color: "bg-amber-100 text-amber-700 border-amber-200",
      description: "டிஜிட்டல் கையொப்பங்களை வரையவும்."
    },
    {
      id: "idcard",
      name: "ID கார்டு இணைப்பி",
      sub: "Aadhaar Front/Back",
      icon: ImageIcon,
      color: "bg-pink-100 text-pink-700 border-pink-200",
      description: "முன்/பின் பக்கங்களை ஒரே பக்கத்தில் இணைக்கவும்."
    },
    {
      id: "pdfmerger",
      name: "PDF கோப்புகள் இணைப்பு",
      sub: "PDF Merger",
      icon: FileStack,
      color: "bg-cyan-100 text-cyan-700 border-cyan-200",
      description: "பல PDF கோப்புகளை ஒன்றாக இணைக்கவும்."
    },
    {
      id: "pdftoimg",
      name: "PDF-ஐ படமாக மாற்று",
      sub: "PDF to Image",
      icon: ImageIcon,
      color: "bg-emerald-100 text-emerald-700 border-emerald-200",
      description: "PDF பக்கங்களை படங்களாக மாற்றவும்."
    },
    {
      id: "imgtopdf",
      name: "படங்களை PDF-ஆக மாற்று",
      sub: "Image to PDF",
      icon: FileText,
      color: "bg-sky-100 text-sky-700 border-sky-200",
      description: "புகைப்படங்களை PDF கோப்பாக மாற்றவும்."
    },
    {
      id: "translator",
      name: "ஆவண மொழிபெயர்ப்பாளர்",
      sub: "AI Translator",
      icon: Languages,
      color: "bg-green-100 text-green-700 border-green-200",
      description: "ஆங்கில விவரங்களை தமிழுக்கு உடனே மாற்றவும்."
    }
  ];

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name || !formData.phone) return;
    setShowSaveConfirm(true);
  };

  const handleConfirmSave = async () => {
    setShowSaveConfirm(false);
    // Pass back to parent for persistence
    if (isEditMode && initialCustomer) {
      await onSave({
        ...initialCustomer,
        ...formData
      });
    } else {
      await onSave(formData);
    }
  };

  const handleToolShortcutClick = async (toolId: string) => {
    // Trigger parent callback to open selected tool in main workspace and save latest profile data
    if (onSelectTool) {
      onSelectTool(toolId, formData);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      
      {/* Top Header Bar */}
      <div className="bg-slate-900 text-white rounded-[2rem] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl mt-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
          <button 
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all border-none cursor-pointer"
          >
            <ChevronLeft size={14} strokeWidth={3} /> பதிவேட்டிற்குத் திரும்பு (Back)
          </button>
          <span className="text-slate-600 text-xl font-medium">|</span>
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-sm shadow-md uppercase">
              {isEditMode ? 'E' : '+'}
            </div>
            <div>
              <h3 className="font-extrabold text-white text-xs leading-none">
                {isEditMode ? "சுயவிவரப் புதுப்பித்தல் தளம் (Edit Profile)" : "புதிய சுயவிவரப் பதிவு தளம் (Add Profile)"}
              </h3>
              <p className="text-[10px] font-bold text-blue-400 leading-none mt-1">
                வாடிக்கையாளர் தகவல்களை உடனுக்குடன் சரிபார்த்து புதுப்பிக்கவும்
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-950 px-3 py-1.5 rounded-full border border-emerald-800">
            ⚡ அதிவேகப் பணிமனை (Power Workspace Enabled)
          </span>
        </div>
      </div>

      {/* Main Core View Area with Sidebar */}
      <div className="flex flex-col lg:flex-row gap-6 relative items-start">
        
        {/* LEFT COLUMN: Clean sidebar presenting Quick tool list as Shortcuts */}
        <div className="w-full lg:w-80 shrink-0 sticky top-4 space-y-4">
          <div className="bg-white border-2 border-slate-100 rounded-[2rem] shadow-xl p-5 space-y-4">
            
            <div>
              <h4 className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Zap className="text-amber-500 shrink-0" size={15} />
                கருவிகள் குறுக்குவழி (Tools Shortcut)
              </h4>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 leading-relaxed">
                கருவிகளை நேரடியாகப் பயன்படுத்த கிளிக் செய்யவும் (ஆட்டோ சேவ் செய்யப்படும்)
              </p>
            </div>

            {/* Launch Workspace general button */}
            <button
              type="button"
              onClick={() => {
                if (onSelectTool) {
                  onSelectTool("", formData);
                }
              }}
              className="w-full h-11 px-4 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-slate-900 hover:to-slate-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-100 border-none cursor-pointer shrink-0"
            >
              <Zap size={13} className="text-amber-300 fill-current animate-pulse shrink-0" />
              <span>கருவிகள் தளம் துவக்குக (Launch Workspace)</span>
            </button>

            <div className="flex items-center gap-2 justify-center py-1">
              <span className="h-px bg-slate-100 flex-1" />
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest shrink-0">அல்லது தனிப்பட்ட கருவி</span>
              <span className="h-px bg-slate-100 flex-1" />
            </div>

            {/* Vertical list of tools, single line formatted shortcuts */}
            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[40vh] pr-1">
              {toolsList.map((tool) => {
                const ToolIcon = tool.icon;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => handleToolShortcutClick(tool.id)}
                    className="w-full text-left rounded-xl p-2.5 border border-slate-100 hover:border-blue-200 bg-slate-50 hover:bg-blue-50/50 text-slate-800 transition-all flex items-center gap-2.5 cursor-pointer group"
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${tool.color}`}>
                      <ToolIcon size={12} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h5 className="font-extrabold text-[10px] leading-tight text-slate-900 group-hover:text-blue-600 truncate">
                        {tool.name}
                      </h5>
                      <p className="text-[8px] font-mono font-bold leading-none mt-0.5 text-slate-400">
                        {tool.sub}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="border-t pt-3 text-[9px] font-extrabold text-slate-400 text-center leading-relaxed">
              சுயவிவரத்தில் கருவிகளைத் தேர்ந்தெடுத்தால் நேரடியாக முதன்மை பணிமனை திறக்கப்படும்.
            </div>
          </div>

          {/* Linked Documents display with direct download button */}
          {initialCustomer?.documents && initialCustomer.documents.length > 0 && (
            <div className="bg-white border-2 border-slate-100 rounded-[2rem] shadow-xl p-5 space-y-4">
              <div>
                <h4 className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <FolderOpen className="text-blue-600 shrink-0 animate-pulse" size={15} />
                  இணைக்கப்பட்ட ஆவணங்கள்
                </h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 leading-relaxed">
                  Saved Documents / ஆவணங்கள் ({initialCustomer.documents.length})
                </p>
              </div>

              <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1 divide-y divide-slate-100">
                {initialCustomer.documents.map((doc: any, dIdx: number) => (
                  <div 
                    key={doc.id || dIdx}
                    className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block text-[10px] font-black text-slate-800 truncate" title={doc.fileName}>
                        {doc.type || "பதிவேற்றப்பட்ட ஆவணம்"}
                      </span>
                      <span className="block text-[8px] font-mono font-bold text-slate-400 truncate mt-0.5">
                        {doc.fileName || "document_file"}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDownloadDocument(doc)}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-lg transition-all text-[9.5px] font-black flex items-center gap-1 cursor-pointer shrink-0 shadow-xs border-0"
                        title="Download / பதிவிறக்கு"
                      >
                        <Download size={10} />
                        <span>பதிவிறக்கு</span>
                      </button>

                      {onDeleteDocument && (
                        deletingDocId === doc.id ? (
                          <div className="flex items-center gap-1 bg-red-50 p-0.5 rounded-lg border border-red-100">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await onDeleteDocument(doc.id);
                                  setDeletingDocId(null);
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="px-1.5 py-1 bg-red-650 hover:bg-red-700 text-white rounded-md transition-all text-[8px] font-black cursor-pointer shrink-0 border-0"
                              title="உறுதி செய் (Confirm)"
                            >
                              உறுதி (Yes)
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingDocId(null)}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer shrink-0 border-0"
                              title="ரத்து செய் (Cancel)"
                            >
                              <CloseIcon size={10} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeletingDocId(doc.id)}
                            className="p-1.5 bg-red-50 hover:bg-red-650 text-red-600 hover:text-white rounded-lg transition-all cursor-pointer shrink-0 border-0 animate-fade-in"
                            title="Delete / நீக்கு"
                          >
                            <Trash2 size={11} />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Full screen wide Profile registration/editing form */}
        <div className="flex-1 w-full">
          <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-xl p-6 md:p-8 flex flex-col justify-between">
            <div className="border-b pb-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-black text-slate-900">வாடிக்கையாளர் முழு கோப்பு விவரங்கள்</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">கீழுள்ள படிவத்தில் தகவல்களைத் திருத்திப் பதியவும்</p>
              </div>
              <div className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[9px] font-black uppercase tracking-wider border border-blue-100 flex items-center gap-1">
                <Sparkles size={11} className="text-blue-500" /> முழுப் படிவத் தோற்றம் (Full Form view)
              </div>
            </div>

            <form id="massiveProfileForm" onSubmit={e => e.preventDefault()} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* BLOCK 1: Personal info */}
                <div className="bg-slate-50/50 p-5 rounded-[2rem] border border-slate-100 space-y-4">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2 flex items-center gap-1.5">
                    <User size={13} /> 1. தனிநபர் & குடும்ப விவரங்கள் (Personal Details)
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">பெயர் (English Name) *</label>
                      <input required type="text" placeholder="e.g. Siva" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 focus:border-blue-600 focus:outline-none font-bold text-xs" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">பெயர் தமிழில் (Tamil Name)</label>
                      <input type="text" placeholder="e.g. சிவா" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 focus:border-blue-600 focus:outline-none font-bold text-xs" value={formData.nameTamil} onChange={e => setFormData({...formData, nameTamil: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">கைபேசி எண் (Phone No) *</label>
                      <input required type="tel" maxLength={10} placeholder="e.g. 9876543210" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 focus:border-blue-600 focus:outline-none font-bold text-xs" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">மின்னஞ்சல் (Email Address)</label>
                      <input type="email" placeholder="name@example.com" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 focus:border-blue-600 focus:outline-none font-bold text-xs" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">பிறந்த தேதி (DOB)</label>
                      <input type="date" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none text-xs font-bold" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">பாலினம் (Gender)</label>
                      <select className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none text-xs font-bold" value={formData.gender} onChange={e => {
                        const val = e.target.value;
                        const tam = val === 'Male' ? 'ஆண்' : val === 'Female' ? 'பெண்' : 'மற்றவை';
                        setFormData({...formData, gender: val, genderTamil: tam});
                      }}>
                        <option value="Male">Male (ஆண்)</option>
                        <option value="Female">Female (பெண்)</option>
                        <option value="Other">Other (மற்றவை)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">தந்தை / கணவர் பெயர்</label>
                      <input type="text" placeholder="e.g. Ramasamy" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 focus:border-blue-600 focus:outline-none font-bold text-xs" value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">தந்தை / கணவர் பெயர் தமிழில்</label>
                      <input type="text" placeholder="e.g. ராமசாமி" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 focus:border-blue-600 focus:outline-none font-bold text-xs" value={formData.fatherNameTamil} onChange={e => setFormData({...formData, fatherNameTamil: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">தாயார் பெயர் (Mother Name)</label>
                      <input type="text" placeholder="e.g. Lakshmi" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 focus:border-blue-600 focus:outline-none font-bold text-xs" value={formData.motherName} onChange={e => setFormData({...formData, motherName: e.target.value})} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">தாயார் பெயர் தமிழில்</label>
                      <input type="text" placeholder="e.g. லட்சுமி" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 focus:border-blue-600 focus:outline-none font-bold text-xs" value={formData.motherNameTamil} onChange={e => setFormData({...formData, motherNameTamil: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">துணைவர் பெயர் (Spouse Name)</label>
                      <input type="text" placeholder="e.g. Janaki" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 focus:border-blue-600 focus:outline-none font-bold text-xs" value={formData.spouseName} onChange={e => setFormData({...formData, spouseName: e.target.value})} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">துணைவர் பெயர் தமிழில்</label>
                      <input type="text" placeholder="e.g. ஜானகி" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 focus:border-blue-600 focus:outline-none font-bold text-xs" value={formData.spouseNameTamil} onChange={e => setFormData({...formData, spouseNameTamil: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* BLOCK 2: Official IDs */}
                <div className="bg-slate-50/50 p-5 rounded-[2rem] border border-slate-100 space-y-4">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2 flex items-center gap-1.5">
                    <Fingerprint size={13} /> 2. அரசு அடையாள எண்கள் (Official documents)
                  </h4>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">ஆதார் அட்டை எண் (Aadhaar No)</label>
                    <input type="text" maxLength={12} placeholder="e.g. 123456789012" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 focus:border-blue-600 focus:outline-none font-bold text-xs" value={formData.aadhaar} onChange={e => setFormData({...formData, aadhaar: e.target.value})} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">CAN Number (சி.ஏ.என் எண்)</label>
                      <input type="text" placeholder="e.g. 303330123456" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 focus:border-blue-600 focus:outline-none font-bold text-xs" value={formData.canNumber} onChange={e => setFormData({...formData, canNumber: e.target.value})} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">வாக்காளர் அடையாள எண் (Voter ID)</label>
                      <input type="text" placeholder="e.g. ABC1234567" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 focus:border-blue-600 focus:outline-none font-bold text-xs" value={formData.voterId} onChange={e => setFormData({...formData, voterId: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">பான் அட்டை எண் (PAN Card No)</label>
                      <input type="text" maxLength={10} placeholder="e.g. ABCDE1234F" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 focus:border-blue-600 focus:outline-none font-bold text-xs" value={formData.pan} onChange={e => setFormData({...formData, pan: e.target.value.toUpperCase()})} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">ஸ்மார்ட் கார்டு எண் (Ration smartcard)</label>
                      <input type="text" placeholder="e.g. 05W1234567" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 focus:border-blue-600 focus:outline-none font-bold text-xs" value={formData.smartCard} onChange={e => setFormData({...formData, smartCard: e.target.value})} />
                    </div>
                  </div>
                </div>

              </div>

              {/* BLOCK 3: Address & Bank */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Resident Location Fields */}
                <div className="bg-slate-50/50 p-5 rounded-[2rem] border border-slate-100 space-y-4">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2 flex items-center gap-1.5">
                    <MapPin size={13} /> 3. வசிப்பிட முகவரி (Address Details)
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest ml-0.5">கதவு எண் (Door No)</label>
                      <input type="text" placeholder="e.g. 10/A" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold" value={formData.doorNo} onChange={e => setFormData({...formData, doorNo: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest ml-0.5">தெரு பெயர் (English)</label>
                      <input type="text" placeholder="e.g. Gandhi Street" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold" value={formData.streetName} onChange={e => setFormData({...formData, streetName: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest ml-0.5">தெரு பெயர் தமிழில்</label>
                      <input type="text" placeholder="e.g. காந்தி தெரு" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold" value={formData.streetNameTamil} onChange={e => setFormData({...formData, streetNameTamil: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest ml-0.5">ஊர்/கிராமம் (Village En)</label>
                      <input type="text" placeholder="e.g. Adayar" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold" value={formData.village} onChange={e => setFormData({...formData, village: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest ml-0.5">கிராமம் தமிழில்</label>
                      <input type="text" placeholder="e.g. அடையார்" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold" value={formData.villageTamil} onChange={e => setFormData({...formData, villageTamil: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest ml-0.5">வட்டம் (Taluk En)</label>
                      <input type="text" placeholder="e.g. Guindy" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold" value={formData.taluk} onChange={e => setFormData({...formData, taluk: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest ml-0.5">வட்டம் தமிழில்</label>
                      <input type="text" placeholder="e.g. கிண்டி" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold" value={formData.talukTamil} onChange={e => setFormData({...formData, talukTamil: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest ml-0.5">அஞ்சல் குறியீடு (Pincode)</label>
                      <input type="text" maxLength={6} placeholder="e.g. 600020" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold" value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest ml-0.5">மாவட்டம் (District En)</label>
                      <input type="text" placeholder="e.g. Chennai" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold" value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest ml-0.5">முழு ஆங்கில முகவரி</label>
                      <textarea placeholder="e.g. No.12, Gandhi Street..." rows={2} className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs font-bold focus:outline-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest ml-0.5">முழு தமிழ் முகவரி</label>
                      <textarea placeholder="e.g. கதவு எண் 12..." rows={2} className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs font-bold focus:outline-none" value={formData.addressTamil} onChange={e => setFormData({...formData, addressTamil: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* Bank Details */}
                <div className="bg-slate-50/50 p-5 rounded-[2rem] border border-slate-100 space-y-4">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2 flex items-center gap-1.5">
                    <CreditCard size={13} /> 4. வங்கி கணக்கு விவரம் (Bank Details)
                  </h4>

                  <div className="space-y-1">
                    <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest ml-0.5">வங்கி பெயர் (Bank Name)</label>
                    <input type="text" placeholder="e.g. State Bank of India" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest ml-0.5">வங்கி கணக்கு எண் (Account No)</label>
                    <input type="text" placeholder="e.g. 12345678901" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs" value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest ml-0.5">IFSC குறியீடு (IFSC Code)</label>
                    <input type="text" placeholder="e.g. SBIN0001234" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs" value={formData.ifscCode} onChange={e => setFormData({...formData, ifscCode: e.target.value})} />
                  </div>
                </div>

              </div>

            </form>

            {/* Split Action Save buttons fixed footer */}
            <div className="pt-4 mt-6 border-t flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 bg-slate-150 hover:bg-slate-200 text-slate-800 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => handleSubmit()} 
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl py-3.5 font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-md text-[10px] cursor-pointer"
              >
                <Check size={13} strokeWidth={3} />
                {isEditMode ? 'Update Details' : 'Save Profile Details'}
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* Save Confirmation Popup Modal */}
      <AnimatePresence>
        {showSaveConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowSaveConfirm(false)} 
              className="absolute inset-0 bg-slate-950/50 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              className="relative bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border border-slate-100 space-y-6 text-center z-10 text-left"
            >
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckSquare size={28} strokeWidth={2.5} />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900">
                  சுயவிவரத்தைச் சேமிக்கவா?
                </h3>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">
                  Confirm Profile Details Save
                </p>
                <p className="text-xs text-slate-500 font-bold leading-relaxed px-2">
                  நீங்கள் உள்ளிட்ட அனைத்து வாடிக்கையாளர் விவரங்களையும் தரவுத்தளத்தில் வெற்றிகரமாகப் பதிய விரும்புகிறீர்களா?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowSaveConfirm(false)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl py-4 font-black uppercase tracking-widest text-[10px] transition-colors border-0 cursor-pointer"
                >
                  ரத்து செய் (Cancel)
                </button>
                <button 
                  type="button" 
                  onClick={handleConfirmSave}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-[10px] transition-colors shadow-lg shadow-blue-100 border-0 cursor-pointer"
                >
                  சேமிக்கவும் (Save)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
