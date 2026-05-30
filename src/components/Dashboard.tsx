import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, 
  Info,
  Search,
  Trash2,
  Phone,
  Calendar,
  User,
  MapPin,
  Copy,
  Check,
  PlusCircle,
  X as CloseIcon,
  Edit,
  AlertTriangle,
  Download,
  FolderOpen,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Fingerprint,
  CreditCard,
  FileSearch,
  Scaling,
  PenTool,
  Image as ImageIcon,
  FileStack,
  FileText,
  Languages,
  ArrowRight,
  Zap,
  CheckSquare,
  FileArchive,
  UserPlus,
  Briefcase,
  Clock,
  Activity,
  Wrench
} from "lucide-react";
import { useLanguage } from "../lib/translations";
import { customerService } from "../services/customerService";
import { Customer } from "../types";
import { isElectron, getIpcRenderer } from "../lib/electron-mock";

// Import helper tools directly to embed them on the Left Column
import PassportResizer from "./tools/PassportResizer";
import PdfCompressor from "./tools/PdfCompressor";
import SignatureGenerator from "./tools/SignatureGenerator";
import IdCardTool from "./tools/IdCardTool";
import PdfToImage from "./tools/PdfToImage";
import ImageToPdf from "./tools/ImageToPdf";
import PdfMerger from "./tools/PdfMerger";
import TranslatorTool from "./tools/TranslatorTool";
import DataExtractionTool from "./tools/DataExtractionTool";
import ProfileWorkspace from "./ProfileWorkspace";


export default function Dashboard({ 
  onBrowsePortals, 
  onTabChange,
  activeCustomerId = null,
  onSelectCustomer
}: { 
  onBrowsePortals?: () => void,
  onTabChange?: (tab: string) => void,
  activeCustomerId?: string | null,
  onSelectCustomer?: (id: string | null) => void
}) {
  const { t, language } = useLanguage();

  const handleDownloadDocument = (doc: { url: string, fileName: string }) => {
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
  
  // Profiles and search states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [phoneQuery, setPhoneQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'In Progress' | 'Completed'>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Quick profile creation states
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [newProfilePhone, setNewProfilePhone] = useState('');
  const [newProfileWorkPurpose, setNewProfileWorkPurpose] = useState('');
  const [newProfileWorkStatus, setNewProfileWorkStatus] = useState<'Pending' | 'In Progress' | 'Completed'>('Pending');
  const [phoneError, setPhoneError] = useState('');

  // Active desk inline form data
  const [formData, setFormData] = useState<any>(null);
  const loadedCustomerIdRef = useRef<string | null>(null);
  
  // Tab/Tool state inside the Left Workspace
  const [activeWorkspaceTool, setActiveWorkspaceTool] = useState<string | null>(null);

  // Active profile copy states
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  // WhatsApp Template message state
  const [waTemplId, setWaTemplId] = useState("apply");
  const [customWaText, setCustomWaText] = useState("");

  // Edit flow states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  // Unified full-page flow states
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showActiveSaveSuccess, setShowActiveSaveSuccess] = useState(false);
  
  // Pre-add phone modal states
  const [showPreAddPhoneModal, setShowPreAddPhoneModal] = useState(false);
  const [preAddPhoneValue, setPreAddPhoneValue] = useState('');
  const [preAddPhoneError, setPreAddPhoneError] = useState('');
  const [preAddInitialPhone, setPreAddInitialPhone] = useState('');
  const [showProfileLimitModal, setShowProfileLimitModal] = useState(false);

  // Custom Confirmation Dialog states
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  const activeCustomer = customers.find(c => c.id === activeCustomerId) || null;

  useEffect(() => {
    if (activeCustomer) {
      if (loadedCustomerIdRef.current === activeCustomer.id) {
        // Prevent background polling from overwriting active user typing
        return;
      }
      loadedCustomerIdRef.current = activeCustomer.id || null;
      const initialName = (activeCustomer.name === activeCustomer.phone) ? '' : (activeCustomer.name || '');
      setFormData({
        name: initialName,
        nameTamil: activeCustomer.nameTamil || '',
        phone: activeCustomer.phone || '',
        email: activeCustomer.email || '',
        dob: activeCustomer.dob || '',
        gender: activeCustomer.gender || 'Male',
        genderTamil: activeCustomer.genderTamil || 'ஆண்',
        fatherName: activeCustomer.fatherName || '',
        fatherNameTamil: activeCustomer.fatherNameTamil || '',
        motherName: activeCustomer.motherName || '',
        motherNameTamil: activeCustomer.motherNameTamil || '',
        spouseName: activeCustomer.spouseName || '',
        spouseNameTamil: activeCustomer.spouseNameTamil || '',
        aadhaar: activeCustomer.aadhaar || '',
        voterId: activeCustomer.voterId || '',
        smartCard: activeCustomer.smartCard || '',
        pan: activeCustomer.pan || '',
        canNumber: activeCustomer.canNumber || '',
        doorNo: activeCustomer.doorNo || '',
        streetName: activeCustomer.streetName || '',
        streetNameTamil: activeCustomer.streetNameTamil || '',
        village: activeCustomer.village || '',
        villageTamil: activeCustomer.villageTamil || '',
        taluk: activeCustomer.taluk || '',
        talukTamil: activeCustomer.talukTamil || '',
        district: activeCustomer.district || '',
        districtTamil: activeCustomer.districtTamil || '',
        pincode: activeCustomer.pincode || '',
        address: activeCustomer.address || '',
        addressTamil: activeCustomer.addressTamil || '',
        bankName: activeCustomer.bankName || '',
        accountNumber: activeCustomer.accountNumber || '',
        ifscCode: activeCustomer.ifscCode || '',
        workPurpose: activeCustomer.workPurpose || '',
        workStatus: activeCustomer.workStatus || 'Pending'
      });
    } else {
      loadedCustomerIdRef.current = null;
      setFormData(null);
    }
  }, [activeCustomerId, activeCustomer]);

  const handlePreAddPhoneSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPhone = preAddPhoneValue.trim();
    
    // Check if valid numeric 10 digit phone
    if (!/^\d{10}$/.test(cleanPhone)) {
      setPreAddPhoneError('தயவுசெய்து சரியான 10-இலக்க அலைபேசி எண்ணை உள்ளிடவும்.');
      return;
    }
    
    setPreAddPhoneError('');
    setShowPreAddPhoneModal(false);
    
    // Check if customer with same phone already exists
    const existing = customers.find(c => c.phone === cleanPhone);
    if (existing) {
      if (onSelectCustomer) {
        onSelectCustomer(existing.id || null);
      }
      setEditingCustomer(existing);
      setIsEditingProfile(true);
      setIsAddingProfile(false);
    } else {
      // 10 Profiles Free Plan Limit Check
      if (customers.length >= 10) {
        setShowProfileLimitModal(true);
        return;
      }
      setPreAddInitialPhone(cleanPhone);
      setIsAddingProfile(true);
      setIsEditingProfile(false);
    }
  };

  const handleCreateQuickProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = newProfilePhone.trim();
    if (!cleanPhone) {
      setPhoneError('அலைபேசி எண்ணை உள்ளிடவும்!');
      return;
    }
    if (cleanPhone.length < 10) {
      setPhoneError('அலைபேசி எண் சரியாக 10 இலக்கங்கள் இருக்க வேண்டும்!');
      return;
    }
    
    // Check if customer with same phone already exists
    const existing = customers.find(c => c.phone === cleanPhone);
    if (existing) {
      if (onSelectCustomer) {
        onSelectCustomer(existing.id || null);
      }
      setShowAddProfileModal(false);
      setNewProfilePhone('');
      setPhoneError('');
      return;
    }

    // 10 Profiles limit check
    if (customers.length >= 10) {
      setShowProfileLimitModal(true);
      setShowAddProfileModal(false);
      return;
    }

    const nameToUse = cleanPhone;
    
    const newId = await customerService.addCustomer({
      name: nameToUse,
      nameTamil: '',
      phone: cleanPhone,
      documents: [],
      workPurpose: newProfileWorkPurpose.trim(),
      workStatus: newProfileWorkStatus || 'Pending'
    });

    if (onSelectCustomer) {
      onSelectCustomer(newId);
    }
    
    setShowAddProfileModal(false);
    setNewProfilePhone('');
    setNewProfileWorkPurpose('');
    setNewProfileWorkStatus('Pending');
    setPhoneError('');
  };

  const handleSaveActiveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeCustomerId || !formData) return;
    
    const dataToSave = {
      ...formData,
      name: formData.name.trim() || formData.phone || ''
    };
    await customerService.updateCustomer(activeCustomerId, dataToSave);
    setShowActiveSaveSuccess(true);
  };

  useEffect(() => {
    const unsubscribe = customerService.subscribeToCustomers((data) => {
      setCustomers(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeCustomerId) {
      localStorage.setItem("ACTIVE_CUSTOMER_ID", activeCustomerId);
    } else {
      localStorage.removeItem("ACTIVE_CUSTOMER_ID");
    }
    window.dispatchEvent(new CustomEvent("ACTIVE_CUSTOMER_ID_CHANGED"));
  }, [activeCustomerId]);

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleEditCustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !editingCustomer.id || !editingCustomer.phone) {
      return;
    }

    const finalName = editingCustomer.name.trim() || editingCustomer.phone;

    await customerService.updateCustomer(editingCustomer.id, {
      name: finalName,
      nameTamil: editingCustomer.nameTamil || '',
      phone: editingCustomer.phone,
      email: editingCustomer.email || '',
      dob: editingCustomer.dob || '',
      gender: editingCustomer.gender || 'Male',
      genderTamil: editingCustomer.genderTamil || 'ஆண்',
      fatherName: editingCustomer.fatherName || '',
      fatherNameTamil: editingCustomer.fatherNameTamil || '',
      motherName: editingCustomer.motherName || '',
      motherNameTamil: editingCustomer.motherNameTamil || '',
      spouseName: editingCustomer.spouseName || '',
      spouseNameTamil: editingCustomer.spouseNameTamil || '',
      aadhaar: editingCustomer.aadhaar || '',
      voterId: editingCustomer.voterId || '',
      smartCard: editingCustomer.smartCard || '',
      pan: editingCustomer.pan || '',
      canNumber: editingCustomer.canNumber || '',
      doorNo: editingCustomer.doorNo || '',
      streetName: editingCustomer.streetName || '',
      streetNameTamil: editingCustomer.streetNameTamil || '',
      village: editingCustomer.village || '',
      villageTamil: editingCustomer.villageTamil || '',
      taluk: editingCustomer.taluk || '',
      talukTamil: editingCustomer.talukTamil || '',
      district: editingCustomer.district || '',
      districtTamil: editingCustomer.districtTamil || '',
      pincode: editingCustomer.pincode || '',
      address: editingCustomer.address || '',
      addressTamil: editingCustomer.addressTamil || '',
      workPurpose: editingCustomer.workPurpose || '',
      workStatus: editingCustomer.workStatus || 'Pending'
    });

    if (activeCustomerId === editingCustomer.id) {
      loadedCustomerIdRef.current = null;
    }
    setIsEditModalOpen(false);
    setEditingCustomer(null);
  };

  const handleOpenEditModal = (cust: Customer) => {
    const custCopy = { ...cust };
    if (custCopy.name === custCopy.phone) {
      custCopy.name = '';
    }
    custCopy.workPurpose = custCopy.workPurpose || '';
    custCopy.workStatus = custCopy.workStatus || 'Pending';
    setEditingCustomer(custCopy);
    setIsEditingProfile(true);
  };

  const handleProfileWorkspaceSave = async (updatedData: any) => {
    if (isEditModalOpen && editingCustomer && editingCustomer.id) {
      // Edit mode
      await customerService.updateCustomer(editingCustomer.id, updatedData);
      if (activeCustomerId === editingCustomer.id) {
        loadedCustomerIdRef.current = null;
      }
      setIsEditModalOpen(false);
      setEditingCustomer(null);
    }
  };

  const handleProfileWorkspaceCancel = () => {
    setIsEditModalOpen(false);
    setEditingCustomer(null);
  };

  const handleBackFromTool = () => {
    setActiveWorkspaceTool(null);
  };

  const executeDeleteCust = async () => {
    if (deletingCustomer && deletingCustomer.id) {
      if (activeCustomerId === deletingCustomer.id && onSelectCustomer) {
        onSelectCustomer(null);
      }
      await customerService.deleteCustomer(deletingCustomer.id);
      setDeletingCustomer(null);
    }
  };

  const filteredCustomers = customers.filter(c => {
    // 1. Filter by status if not All
    if (statusFilter !== 'All') {
      const currentStatus = c.workStatus || 'Pending';
      if (currentStatus !== statusFilter) return false;
    }

    // 2. Filter by search text
    if (!phoneQuery.trim()) return true;
    const q = phoneQuery.trim().toLowerCase();
    return (
      (c.phone && c.phone.includes(q)) ||
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.nameTamil && c.nameTamil.toLowerCase().includes(q)) ||
      (c.workPurpose && c.workPurpose.toLowerCase().includes(q))
    );
  });

  // WhatsApp Sender triggers wa.me link
  const triggerWhatsApp = () => {
    if (!activeCustomer) return;
    const phoneNum = activeCustomer.phone.replace(/\D/g, '');
    const cleanPhone = phoneNum.startsWith('91') ? phoneNum : `91${phoneNum}`;
    
    let text = "";
    if (customWaText.trim()) {
      text = customWaText.trim();
    } else {
      if (waTemplId === "apply") {
        text = `வணக்கம் *${activeCustomer.name}*,\n\nதங்களின் இ-சேவை சான்றிதழ் / ஆவண விண்ணப்ப விவரங்கள் வெற்றிகரமாகப் பதியப்பட்டுள்ளது. விண்ணப்பம் பரிசீலனையில் உள்ளது.\n\nநன்றி!\n_CSC E-Sevai Center_`;
      } else if (waTemplId === "ready") {
        text = `வணக்கம் *${activeCustomer.name}*,\n\nதங்களின் சான்றிதழ் / அரசு ஆவணம் தயாராக உள்ளது! வந்து பெற்றுக்கொள்ளவும்.\n\nநன்றி!\n_CSC E-Sevai Center_`;
      } else {
        text = `வணக்கம் *${activeCustomer.name}*,\n\nஉங்களின் இ-சேவை விவரங்களை எங்கள் கணினியில் சேமித்துள்ளோம். அடுத்த முறை விண்ணப்பிக்கும் போது வெறும் ஒரே நிமிடத்தில் வேலை முடிந்துவிடும்.\n\nநன்றி!\n_CSC E-Sevai Center_`;
      }
    }
    
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  // Helper tool mapping in the workspace grid
  const toolsList = [
    {
      id: "extract",
      name: "AI ஆவணத் தகவல் எடுப்பான்",
      sub: "AI Document Extraction",
      icon: FileSearch,
      color: "from-blue-500 to-indigo-600 bg-blue-50 text-blue-700 border-blue-200",
      description: "ஆதார், குடும்ப அட்டை போன்ற ஆவணங்களில் இருந்து தகவல்களைத் தானாகப் பிரித்தெடுக்கவும்."
    },
    {
      id: "resizer",
      name: "புகைப்பட அளவு மாற்றி",
      sub: "Passport & Photo Resizer",
      icon: Scaling,
      color: "from-teal-500 to-emerald-600 bg-teal-50 text-teal-700 border-teal-200",
      description: "அரசு விண்ணப்பங்களுக்கு ஏற்ப புகைப்படங்களை துல்லியமான பிக்சல் அளவில் மாற்றவும்."
    },
    {
      id: "compressor",
      name: "PDF கோப்பு அழுத்தி",
      sub: "PDF Compressor (Under 200KB)",
      icon: FileArchive,
      color: "from-violet-500 to-purple-600 bg-violet-50 text-violet-700 border-violet-200",
      description: "பெரிய அளவிலான PDF கோப்புகளை அரசு கோரும் விதமாக 200KB-க்குள் சுருக்கவும்."
    },
    {
      id: "signature",
      name: "கையொப்பம் உருவாக்குபவர்",
      sub: "Signature Generator & Pad",
      icon: PenTool,
      color: "from-amber-500 to-orange-600 bg-amber-50 text-amber-700 border-amber-200",
      description: "டிஜிட்டல் கையொப்பங்கள் மற்றும் அப்ளிகேஷன் சைஸ்களை உடனே வரையவும்."
    },
    {
      id: "idcard",
      name: "ID கார்டு ஒருங்கிணைப்பி",
      sub: "Aadhaar Card Front/Back Merger",
      icon: ImageIcon,
      color: "from-pink-500 to-rose-600 bg-pink-50 text-pink-700 border-pink-200",
      description: "ஆதார் கார்டின் முன் மற்றும் பின் பக்கங்களை ஒரே பக்கத்தில் சீராக இணைக்கவும்."
    },
    {
      id: "pdfmerger",
      name: "பல PDF கோப்புகள் இணைப்பு",
      sub: "PDF Merger",
      icon: FileStack,
      color: "from-cyan-500 to-blue-600 bg-cyan-50 text-cyan-700 border-cyan-200",
      description: "பல தனித்தனி PDF பக்கங்களை எளிதாக ஒரே கோப்பாக ஒருங்கிணைக்கவும்."
    },
    {
      id: "pdftoimg",
      name: "PDF to IMAGE மாற்றி",
      sub: "PDF to Image Extract",
      icon: FileText,
      color: "from-fuchsia-500 to-purple-600 bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
      description: "PDF கோப்புகளை உயர்தர ஜேபிஜி (JPG) படங்களாக மாற்றியமைக்கவும்."
    },
    {
      id: "imgtopdf",
      name: "IMAGE to PDF மாற்றி",
      sub: "Image to PDF Generator",
      icon: FileText,
      color: "from-sky-500 to-indigo-600 bg-sky-50 text-sky-700 border-sky-200",
      description: "புகைப்படங்களை நேர்த்தியான சிங்கிள் PDF கோப்பாக மாற்றவும்."
    },
    {
      id: "translator",
      name: "ஆவண மொழிபெயர்ப்பாளர்",
      sub: "AI Translator Panel",
      icon: Languages,
      color: "from-green-500 to-teal-600 bg-green-50 text-green-700 border-green-200",
      description: "விவரங்களை ஆங்கிலத்தில் இருந்து தமிழுக்கு உடனுக்குடன் துல்லியமாக மொழிபெயர்க்கவும்."
    }
  ];

  // Dynamically render the chosen tool component
  const renderWorkspaceTool = (cust?: Customer | null) => {
    const subjectProfile = cust || activeCustomer || ({ name: 'New Customer', phone: '', documents: [] } as any);
    switch (activeWorkspaceTool) {
      case "extract":
        return <DataExtractionTool />;
      case "resizer":
        return <PassportResizer />;
      case "compressor":
        return <PdfCompressor />;
      case "signature":
        return <SignatureGenerator activeProfile={subjectProfile} onSync={() => {}} />;
      case "idcard":
        return <IdCardTool />;
      case "pdftoimg":
        return <PdfToImage />;
      case "imgtopdf":
        return <ImageToPdf />;
      case "pdfmerger":
        return <PdfMerger />;
      case "translator":
        return <TranslatorTool />;
      default:
        return null;
    }
  };

  // Sections setup for live copy clipboard
  const getCustomerFieldSections = (cust: Customer) => {
    return [
      {
        title: "குடும்பம் & தனிநபர் விவரங்கள் (Identity References)",
        icon: User,
        fields: [
          { key: "name", label: "Name (ஆங்கில பெயர்)", value: cust.name },
          { key: "nameTamil", label: "பெயர் தமிழில்", value: cust.nameTamil },
          { key: "phone", label: "Phone (செல்போன்)", value: cust.phone },
          { key: "dob", label: "Date of Birth (பிறந்த தேதி)", value: cust.dob },
          { key: "gender", label: "Gender (பாலினம்)", value: cust.gender ? `${cust.gender} (${cust.genderTamil || 'ஆண்'})` : null },
          { key: "fatherName", label: "Father / Husband (தந்தை / கணவர் பெயர்)", value: cust.fatherName },
          { key: "fatherNameTamil", label: "தந்தை/கணவர் பெயர் தமிழில்", value: cust.fatherNameTamil },
          { key: "motherName", label: "Mother Name (தாய் பெயர்)", value: cust.motherName },
          { key: "motherNameTamil", label: "தாய் பெயர் தமிழில்", value: cust.motherNameTamil },
          { key: "spouseName", label: "Spouse Name (துணைவர் பெயர்)", value: cust.spouseName },
          { key: "spouseNameTamil", label: "துணைவர் பெயர் தமிழில்", value: cust.spouseNameTamil },
          { key: "email", label: "Email Address (மின்னஞ்சல்)", value: cust.email }
        ]
      },
      {
        title: "அரசு அடையாள எண்கள் (Official IDs & Keys)",
        icon: Fingerprint,
        fields: [
          { key: "aadhaar", label: "Aadhaar Card (ஆதார் எண்)", value: cust.aadhaar, focus: true },
          { key: "canNumber", label: "CAN Number (சி.ஏ.என் எண்)", value: cust.canNumber, focus: true },
          { key: "smartCard", label: "Smart / Ration Card (குடும்ப అட்டை எண்)", value: cust.smartCard },
          { key: "voterId", label: "Voter ID Cards (வாக்காளர் அடையாள எண்)", value: cust.voterId },
          { key: "pan", label: "PAN Card (பான் அட்டை எண்)", value: cust.pan }
        ]
      },
      {
        title: "முகவரி விவரங்கள் (Address Credentials)",
        icon: MapPin,
        fields: [
          { key: "doorNo", label: "Door No (கதவு எண்)", value: cust.doorNo },
          { key: "streetName", label: "Street Name (தெரு பெயர்)", value: cust.streetName },
          { key: "streetNameTamil", label: "தெரு பெயர் தமிழில்", value: cust.streetNameTamil },
          { key: "village", label: "Village / Town (கிராமம் / நகரம்)", value: cust.village },
          { key: "villageTamil", label: "கிராமம் / நகரம் தமிழில்", value: cust.villageTamil },
          { key: "taluk", label: "Taluk / Circle (வட்டம்)", value: cust.taluk },
          { key: "talukTamil", label: "வட்டம் தமிழில்", value: cust.talukTamil },
          { key: "district", label: "District (மாவட்டம்)", value: cust.district },
          { key: "districtTamil", label: "மாவட்டம் தமிழில்", value: cust.districtTamil },
          { key: "pincode", label: "Pincode (அஞ்சல் குறியீடு)", value: cust.pincode },
          { key: "address", label: "Full English Address (முழு ஆங்கில முகவரி)", value: cust.address },
          { key: "addressTamil", label: "Full Tamil Address (முழு தமிழ் முகவரி)", value: cust.addressTamil }
        ]
      },
      {
        title: "வங்கி கணக்கு விவரம் (Bank Profile)",
        icon: CreditCard,
        fields: [
          { key: "bankName", label: "Bank Name (வங்கி பெயர்)", value: cust.bankName },
          { key: "accountNumber", label: "Account Number (கணக்கு எண்)", value: cust.accountNumber },
          { key: "ifscCode", label: "IFSC Code (கிளை குறியீடு)", value: cust.ifscCode }
        ]
      }
    ];
  };



  return (
    <div className="space-y-6 pb-20 text-left">
      {isAddingProfile ? (
        <ProfileWorkspace
          isEditMode={false}
          initialCustomer={{ phone: preAddInitialPhone } as any}
          onSave={async (newProfileData) => {
            const newId = await customerService.addCustomer({
              ...newProfileData,
              documents: []
            });
            if (onSelectCustomer) {
              onSelectCustomer(newId);
            }
            setIsAddingProfile(false);
          }}
          onCancel={() => setIsAddingProfile(false)}
          onSelectTool={async (toolId, currentData) => {
            const newId = await customerService.addCustomer({
              ...currentData,
              documents: []
            });
            if (onSelectCustomer) {
              onSelectCustomer(newId);
            }
            setIsAddingProfile(false);
            setActiveWorkspaceTool(toolId);
          }}
        />
      ) : isEditingProfile && editingCustomer ? (
        <ProfileWorkspace
          isEditMode={true}
          initialCustomer={editingCustomer}
          onSave={async (updatedData) => {
            if (editingCustomer.id) {
              await customerService.updateCustomer(editingCustomer.id, updatedData);
              if (activeCustomerId === editingCustomer.id) {
                loadedCustomerIdRef.current = null;
              }
              setIsEditingProfile(false);
              setEditingCustomer(null);
            }
          }}
          onDeleteDocument={async (docId) => {
            if (editingCustomer.id) {
              const updatedDocs = (editingCustomer.documents || []).filter(cDoc => cDoc.id !== docId);
              await customerService.updateCustomer(editingCustomer.id, { documents: updatedDocs });
              setEditingCustomer({
                ...editingCustomer,
                documents: updatedDocs
              });
              if (activeCustomerId === editingCustomer.id) {
                loadedCustomerIdRef.current = null;
                window.dispatchEvent(new CustomEvent("ACTIVE_CUSTOMER_ID_CHANGED"));
              }
            }
          }}
          onCancel={() => {
            setIsEditingProfile(false);
            setEditingCustomer(null);
          }}
          onSelectTool={async (toolId, currentData) => {
            if (editingCustomer.id) {
              await customerService.updateCustomer(editingCustomer.id, currentData);
              if (activeCustomerId === editingCustomer.id) {
                loadedCustomerIdRef.current = null;
              }
              if (onSelectCustomer) {
                onSelectCustomer(editingCustomer.id);
              }
              setIsEditingProfile(false);
              setEditingCustomer(null);
              setActiveWorkspaceTool(toolId);
            }
          }}
        />
      ) : !activeCustomer ? (
        // ==========================================
        // MAIN VIEW: ONLY REGISTERED CUSTOMER LIST
        // ==========================================
        <div className="space-y-6 animate-fade-in">
          {/* Dynamic Header */}
          <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden mt-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-10 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="space-y-2 relative z-10">
              <div className="flex items-center gap-3">
                <span className="bg-blue-600 text-white text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <Sparkles size={10} className="animate-spin" /> E-Sevai Workspace
                </span>
                <span className="bg-emerald-500 text-slate-950 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full">
                  ★ Ultra Speed Version
                </span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white">
                {language === 'en' ? (
                  <>CSC Unified Master Profile Registry</>
                ) : (
                  <>ஒருங்கிணைந்த வாடிக்கையாளர் பதிவேடு</>
                )}
              </h1>
              <p className="text-slate-300 font-semibold text-xs leading-relaxed max-w-2xl">
                {language === 'en' ? (
                  "Full digital listing of all master profiles in our CSC center. Use \"Add Profile\" to register new customer details, or click \"Launch Workspace\" to easily fill application details."
                ) : (
                  "எங்கள் இ-சேவை மையத்தில் பதிவு செய்யப்பட்ட வாடிக்கையாளர்களின் பட்டியல். புதிய விவரங்களைப் பதிய \"சுயவிவரத்தைச் சேர்\" பொத்தானை அழுத்தவும் அல்லது ஏதேனும் ஒரு வாடிக்கையாளருக்கு \"கருவிகள் தளம் துவக்குக\" என்பதைக் கிளிக் செய்யவும்."
                )}
              </p>
            </div>


          </div>

          {/* Stats segment */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border-2 border-slate-200/80 rounded-3xl p-5 shadow-xs">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                {language === 'en' ? 'Total Profiles' : 'மொத்த வாடிக்கையாளர்கள்'}
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-2">
                {customers.length} {language === 'en' ? 'Profiles' : 'நபர்'}
              </h3>
            </div>
            <div className="bg-white border-2 border-slate-200/80 rounded-3xl p-5 shadow-xs">
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none">
                {language === 'en' ? 'Pending' : 'நிலுவை வேலைகள்'}
              </p>
              <h3 className="text-2xl font-black text-amber-600 mt-2">
                {customers.filter(c => (c.workStatus || 'Pending') === 'Pending').length} {language === 'en' ? 'Jobs' : 'வேலை'}
              </h3>
            </div>
            <div className="bg-white border-2 border-slate-200/80 rounded-3xl p-5 shadow-xs">
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none">
                {language === 'en' ? 'On Process' : 'செயல்பாட்டில்'}
              </p>
              <h3 className="text-2xl font-black text-blue-600 mt-2">
                {customers.filter(c => c.workStatus === 'In Progress').length} {language === 'en' ? 'Jobs' : 'வேலை'}
              </h3>
            </div>
            <div className="bg-white border-2 border-slate-200/80 rounded-3xl p-5 shadow-xs">
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">
                {language === 'en' ? 'Completed' : 'முடிக்கப்பட்டவை'}
              </p>
              <h3 className="text-2xl font-black text-emerald-600 mt-2">
                {customers.filter(c => c.workStatus === 'Completed').length} {language === 'en' ? 'Jobs' : 'வேலை'}
              </h3>
            </div>
          </div>

          {/* Search Panel & Full-width Grid */}
          <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] p-8 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-950 text-sm flex items-center gap-2">
                  <Users size={18} className="text-blue-600" />
                  {language === 'en' ? 'Customer Profile Registry' : 'சுயவிவரங்கள் பட்டியல்'}
                </h3>
                <p className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">
                  {language === 'en' ? 'Guide: Search, select a profile, and launch their toolkit workspace' : 'வழிகாட்டி: தேடிய பின் வாடிக்கையாளரை தேர்ந்தெடுத்து அவர்களின் கருவிகள் பகுதியை இயக்கவும்'}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setPreAddPhoneValue('');
                    setPreAddPhoneError('');
                    setShowPreAddPhoneModal(true);
                  }}
                  className="h-11 px-5 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-slate-905 hover:to-slate-950 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <PlusCircle size={15} /> சுயவிவரத்தைச் சேர் (Add Profile)
                </button>

                <div className="relative w-full md:w-80">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input 
                    type="text" 
                    value={phoneQuery}
                    onChange={(e) => setPhoneQuery(e.target.value)}
                    placeholder="பெயர் அல்லது அலைபேசி மூலம் தேடுக..."
                    className="w-full h-11 pl-11 pr-12 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold focus:border-blue-600 focus:bg-white outline-none transition-all leading-none"
                  />
                  {phoneQuery && (
                    <button 
                      type="button"
                      onClick={() => setPhoneQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] bg-slate-200 hover:bg-slate-300 text-slate-700 font-black px-2 py-1 rounded-lg transition-colors"
                    >
                      {language === 'en' ? 'Clear' : 'துடை'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-100 p-2 rounded-2xl">
              <button
                type="button"
                onClick={() => setStatusFilter('All')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${statusFilter === 'All' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
              >
                {language === 'en' ? 'All' : 'அனைத்தும்'} • {customers.length}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Pending')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer select-none flex items-center gap-1.5 ${statusFilter === 'Pending' ? 'bg-amber-500 text-white shadow-xs' : 'bg-white text-amber-600 hover:bg-amber-50 border border-slate-200'}`}
              >
                <Clock size={12} />
                {language === 'en' ? 'Pending' : 'நிலுவையில்'} • {customers.filter(c => (c.workStatus || 'Pending') === 'Pending').length}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('In Progress')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer select-none flex items-center gap-1.5 ${statusFilter === 'In Progress' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-blue-600 hover:bg-blue-50 border border-slate-200'}`}
              >
                <Activity size={12} />
                {language === 'en' ? 'On Process' : 'செயல்பாட்டில்'} • {customers.filter(c => c.workStatus === 'In Progress').length}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Completed')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer select-none flex items-center gap-1.5 ${statusFilter === 'Completed' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-emerald-600 hover:bg-emerald-50 border border-slate-200'}`}
              >
                <CheckCircle2 size={12} />
                {language === 'en' ? 'Completed' : 'முடிந்தது'} • {customers.filter(c => c.workStatus === 'Completed').length}
              </button>
            </div>

            {/* Grid list (Wide Layout) */}
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
                <Users size={48} className="mx-auto text-slate-300 animate-pulse mb-3" />
                <h4 className="font-black text-slate-800 text-sm uppercase">
                  {language === 'en' ? 'No Master Profiles Found' : 'சுயவிவரங்கள் எதுவும் கிடைக்கவில்லை'}
                </h4>
                <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-wider">
                  {language === 'en' ? 'Please register a new profile or clear search filters' : 'புதிய சுயவிவரத்தை பதிவு செய்யவும் அல்லது தேடல் வடிப்பானைத் துடைக்கவும்'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCustomers.map((cust) => {
                  const docCount = cust.documents?.length || 0;
                  return (
                    <motion.div 
                      key={cust.id}
                      layoutId={`cust-card-dir-${cust.id}`}
                      className="bg-slate-50/60 border border-slate-200 hover:border-blue-500 hover:bg-white rounded-[2rem] p-5.5 transition-all shadow-xs flex flex-col justify-between min-h-[300px] hover:shadow-xl group"
                    >
                      <div className="space-y-4">
                        {/* Card Header information */}
                        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-base shadow-sm group-hover:bg-emerald-500 transition-colors shrink-0">
                              {cust.name?.[0] || '?'}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-slate-950 text-sm truncate leading-tight group-hover:text-blue-600 transition-colors" title={cust.name}>
                                {cust.name}
                              </h4>
                              {cust.nameTamil && (
                                <p className="text-[11px] font-bold text-blue-600 truncate leading-none mt-1">{cust.nameTamil}</p>
                              )}
                              <p className="text-[10px] font-mono text-slate-400 mt-1">{cust.phone}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-0.5 shrink-0">
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditModal(cust);
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit / திருத்து"
                            >
                              <Edit size={13} />
                            </button>
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingCustomer(cust);
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete / நீக்கு"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Summary Identifiers Grid */}
                        <div className="space-y-2 pt-1 text-xs text-slate-600 leading-normal">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                              {language === 'en' ? 'Aadhaar:' : 'ஆதார்:'}
                            </span>
                            <span className={`font-mono text-[10px] font-bold ${cust.aadhaar ? 'text-slate-800' : 'text-slate-300'}`}>
                              {cust.aadhaar ? `${cust.aadhaar.substring(0,4)} •••• ${cust.aadhaar.substring(8)}` : (language === 'en' ? 'No ✗' : 'இல்லை ✗')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                              {language === 'en' ? 'CAN Number:' : 'CAN எண்:'}
                            </span>
                            <span className={`font-mono text-[10px] font-bold ${cust.canNumber ? 'text-slate-800' : 'text-slate-300'}`}>
                              {cust.canNumber || (language === 'en' ? 'No ✗' : 'இல்லை ✗')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                              {language === 'en' ? 'Smart Card:' : 'ஸ்மார்ட் கார்டு:'}
                            </span>
                            <span className={`font-mono text-[10px] font-bold ${cust.smartCard ? 'text-slate-800' : 'text-slate-300'}`}>
                              {cust.smartCard || (language === 'en' ? 'No ✗' : 'இல்லை ✗')}
                            </span>
                          </div>
                          {docCount > 0 && (
                            <div className="flex items-center gap-1.5 mt-2 bg-blue-50/70 px-2 py-1 rounded-lg text-blue-600 text-[9px] font-black w-max uppercase tracking-wider">
                              <FolderOpen size={10} />
                              {language === 'en' ? `${docCount} Documents` : `${docCount} ஆவணங்கள் உள்ளன`}
                            </div>
                          )}

                          {/* Work Purpose & Current Status direct switcher */}
                          <div className="bg-slate-100/50 p-3 rounded-2xl border border-slate-200/50 mt-3 space-y-2">
                            <div className="space-y-0.5">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <Briefcase size={10} /> {language === 'en' ? 'Service / Work:' : 'சேவை / பணி விவரம்:'}
                              </span>
                              <p className="font-extrabold text-slate-800 text-xs truncate" title={cust.workPurpose || (language === 'en' ? "No details" : "விவரம் இல்லை")}>
                                {cust.workPurpose || (language === 'en' ? "No details specified ✗" : "விவரம் குறிப்பிடப்படவில்லை ✗")}
                              </p>
                            </div>
                            
                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/50">
                              <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase flex items-center gap-1 shrink-0">
                                <Clock size={10} /> {language === 'en' ? 'Status:' : 'பணி நிலை:'}
                              </span>
                              <select
                                value={cust.workStatus || 'Pending'}
                                onChange={async (e) => {
                                  const newStatus = e.target.value as 'Pending' | 'In Progress' | 'Completed';
                                  if (activeCustomerId === cust.id) {
                                    loadedCustomerIdRef.current = null;
                                  }
                                  await customerService.updateCustomer(cust.id!, { workStatus: newStatus });
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className={`text-[10px] font-black px-2 py-1 rounded-lg border outline-none select-none cursor-pointer tracking-wider transition-colors max-w-[130px] truncate ${
                                  (cust.workStatus || 'Pending') === 'Pending' 
                                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-300' 
                                    : (cust.workStatus || 'Pending') === 'In Progress'
                                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300'
                                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-300'
                                }`}
                              >
                                <option value="Pending">{language === 'en' ? 'Pending' : 'நிலுவையில்'}</option>
                                <option value="In Progress">{language === 'en' ? 'On Process' : 'செயல்பாட்டில்'}</option>
                                <option value="Completed">{language === 'en' ? 'Completed' : 'முடிந்தது'}</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Select Strategy Action Button */}
                      <button
                        type="button"
                        onClick={() => onSelectCustomer && onSelectCustomer(cust.id || null)}
                        className="w-full mt-4 py-3 bg-blue-600 hover:bg-slate-950 hover:text-white text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                      >
                        <Zap size={11} className="text-amber-400 animate-pulse" />
                        {language === 'en' ? 'Launch Workspace' : 'கருவிகள் தளம் துவக்குக'}
                        <ArrowRight size={11} className="ml-1" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        // ==========================================
        // WORK DESK MODE: COMPLETE PROFILE WORKSPACE WITH SIDEBAR SHORTCUTS
        // ==========================================
        <div className="space-y-6 animate-fade-in text-left">
          {/* Breadcrumb / Workspace top bar */}
          <div className="bg-slate-900 text-white rounded-[2rem] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl mt-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-4 relative z-10">
              <button 
                type="button"
                onClick={() => {
                  setActiveWorkspaceTool(null);
                  if (onSelectCustomer) onSelectCustomer(null);
                }}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all border-0 cursor-pointer"
              >
                <ChevronLeft size={14} strokeWidth={3} /> பதிவேட்டிற்குத் திரும்பு (Back)
              </button>
              <span className="text-slate-600 text-xl font-medium">|</span>
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-sm shadow-md uppercase shrink-0">
                  {activeCustomer.name?.[0] || '?'}
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-xs leading-none flex items-center gap-1.5">
                    {activeCustomer.name}
                    <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping shrink-0" />
                  </h3>
                  {activeCustomer.phone && (
                    <p className="text-[10px] font-bold text-blue-400 leading-none mt-1">
                      {activeCustomer.nameTamil ? `${activeCustomer.nameTamil} • ` : ''}{activeCustomer.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 relative z-10">
              <button
                type="button"
                onClick={async () => {
                  setDeletingCustomer(activeCustomer);
                }}
                className="px-3.5 py-2 bg-red-600/85 hover:bg-red-650 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1 border-0"
              >
                <Trash2 size={11} /> சுயவிவரத்தை நீக்கு
              </button>
              
              <button
                type="button"
                onClick={() => {
                  handleSaveActiveProfile();
                }}
                className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black rounded-xl text-[9px] uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1 shadow-md border-0"
              >
                <CheckCircle2 size={11} /> மாற்றங்களைச் சேமி
              </button>
            </div>
          </div>

          {/* Core Multi-layout Workspace with Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: Narrow Vertical Tools List (செங்குத்து டூல்ஸ் வரிசை - Width 3/12) */}
            <div className="lg:col-span-3 xl:col-span-2.5 space-y-4">
              <div className="bg-white border-2 border-slate-200 rounded-[2rem] p-4 space-y-3 shadow-xs">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">வாடிக்கையாளர் பணிமனை</h4>
                  <p className="text-[9px] font-bold text-slate-900 mt-1 uppercase tracking-wide">விரைவு சுருக்குவழிகள்</p>
                </div>

                <div className="space-y-1.5 flex flex-col max-h-[70vh] overflow-y-auto pr-1">
                  {/* Button 1: Profile Details Form Toggle */}
                  <button
                    type="button"
                    onClick={() => setActiveWorkspaceTool(null)}
                    className={`w-full text-left rounded-xl p-2.5 border transition-all flex items-center gap-2.5 cursor-pointer group ${
                      activeWorkspaceTool === null 
                        ? "border-blue-500 bg-blue-50 text-blue-900" 
                        : "border-slate-100 bg-slate-50 hover:bg-slate-100/70 text-slate-800"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${
                      activeWorkspaceTool === null ? "bg-blue-600 text-white" : "bg-white text-slate-500"
                    }`}>
                      <User size={13} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h5 className="font-extrabold text-[10px] leading-tight truncate">
                        சுயவிவரப் படிவம்
                      </h5>
                      <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                        Profile Details
                      </p>
                    </div>
                  </button>

                  <div className="border-t border-dashed border-slate-200 my-1 pb-1" />

                  {/* Other 9 Tools */}
                  {toolsList.map((tool) => {
                    const ToolIcon = tool.icon;
                    const isSelected = activeWorkspaceTool === tool.id;
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => setActiveWorkspaceTool(tool.id)}
                        className={`w-full text-left rounded-xl p-2.5 border transition-all flex items-center gap-2.5 cursor-pointer group ${
                          isSelected 
                            ? "border-blue-500 bg-blue-50 text-blue-900" 
                            : "border-slate-100 bg-slate-50 hover:bg-slate-100/70 hover:border-slate-200 text-slate-800"
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${
                          isSelected ? "bg-blue-600 text-white" : "bg-white text-slate-500"
                        }`}>
                          <ToolIcon size={12} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="font-extrabold text-[10px] leading-tight truncate group-hover:text-blue-650">
                            {tool.name}
                          </h5>
                          <p className="text-[8px] font-mono leading-none mt-0.5 text-slate-400">
                            {tool.id.toUpperCase()} TOOL
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Linked Documents display with direct download and delete buttons inside Workspace Desk Mode */}
              {activeCustomer?.documents && activeCustomer.documents.length > 0 && (
                <div className="bg-white border-2 border-slate-200 rounded-[2rem] p-4 space-y-3 shadow-xs">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none flex items-center gap-1.5">
                      <FolderOpen className="text-blue-600 shrink-0" size={13} />
                      இணைக்கப்பட்ட ஆவணங்கள்
                    </h4>
                    <p className="text-[9px] font-bold text-slate-800 uppercase tracking-wide mt-1">
                      Documents / ஆவணங்கள் ({activeCustomer.documents.length})
                    </p>
                  </div>

                  <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1 divide-y divide-slate-100">
                    {activeCustomer.documents.map((doc: any, dIdx: number) => (
                      <div 
                        key={doc.id || dIdx}
                        className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="block text-[9.5px] font-black text-slate-800 truncate" title={doc.fileName}>
                            {doc.type || "பதிவேற்றப்பட்ட ஆவணம்"}
                          </span>
                          <span className="block text-[8px] font-mono font-bold text-slate-400 truncate mt-0.5">
                            {doc.fileName || "document_file"}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDownloadDocument(doc)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-lg transition-all cursor-pointer border-0 shadow-xs"
                            title="Download / பதிவிறக்கு"
                          >
                            <Download size={10} />
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              const updatedDocs = (activeCustomer.documents || []).filter((cDoc: any) => cDoc.id !== doc.id);
                              await customerService.updateCustomer(activeCustomer.id!, { documents: updatedDocs });
                            }}
                            className="p-1.5 bg-red-50 hover:bg-red-650 text-red-600 hover:text-white rounded-lg transition-all cursor-pointer shrink-0 border-0"
                            title="Delete / நீக்கு"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Primary Content display (வீச்சு 9/12) */}
            <div className="lg:col-span-9 xl:col-span-9.5">
              {activeWorkspaceTool ? (
                // Selected Tool workspace
                <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] shadow-xs overflow-hidden pb-8 animate-fadeIn">
                  <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={handleBackFromTool}
                        className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors cursor-pointer border-0"
                      >
                        <ChevronLeft size={12} strokeWidth={3} /> {language === 'en' ? 'Back' : 'பின்னே'}
                      </button>
                      <span className="text-slate-400 font-bold">|</span>
                      <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200 flex items-center gap-2">
                        {toolsList.find(t => t.id === activeWorkspaceTool)?.name}
                      </h3>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="bg-blue-50/70 border border-blue-100 p-4 rounded-2xl mb-6 text-xs font-bold text-blue-700 flex items-center gap-2">
                      <Zap size={14} className="text-blue-600 animate-pulse shrink-0" />
                      {language === 'en' ? (
                        <>Note: Documents created in this tool will be automatically linked to <b>{activeCustomer.name}</b> account!</>
                      ) : (
                        <>குறிப்பு: இந்த கருவியில் நீங்கள் உருவாக்கும் ஆவணங்கள் தங்களின் தற்போதைய வாடிக்கையாளர் <b>{activeCustomer.name}</b> கணக்குடன் நேரடியாகத் தானாகவே இணைந்துவிடும்!</>
                      )}
                    </div>
                    {renderWorkspaceTool()}
                  </div>
                </div>
              ) : (
                // Profile Edit workspace
                <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] shadow-xs p-6 md:p-8 space-y-6 animate-fadeIn">
                  <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        {language === 'en' ? 'Customer Profile Sheet' : 'வாடிக்கையாளர் முழு விவரக் கோப்பு'}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {language === 'en' ? 'Edit Aadhaar, CAN, Address, and Bank details here' : 'ஆதார், சி.ஏ.என், முகவரி மற்றும் வங்கித் தகவல்களை இங்கேயே சரிசெய்யலாம்'}
                      </p>
                    </div>
                    <span className="px-3 py-1.5 bg-blue-50 text-blue-600 font-black rounded-lg text-[9px] uppercase tracking-wider animate-pulse border">
                      {language === 'en' ? 'Live Image Editor' : 'நேரடி இமேஜ் எடிட்டர்'}
                    </span>
                  </div>

                  {formData ? (
                    <form onSubmit={handleSaveActiveProfile} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        
                        {/* Segment 1: Personal Profile */}
                        <div className="bg-slate-50/40 p-5 rounded-[1.8rem] border border-slate-100 space-y-4">
                          <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2 flex items-center gap-1.5">
                            <User size={12} /> {language === 'en' ? '1. Personal & Family Info' : '1. தனிநபர் & குடும்ப விவரங்கள்'}
                          </h4>

                          {/* Work Tracking Fields inside Inline Workspace Form */}
                          <div className="bg-blue-50/45 p-3.5 rounded-[1.2rem] border border-blue-100/40 grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-blue-800 uppercase tracking-widest ml-1">
                                {language === 'en' ? 'Work Purpose' : 'சேவை / பணி'}
                              </label>
                              <input 
                                type="text" 
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-xs focus:border-blue-600 focus:outline-none animate-pulse focus:animate-none" 
                                placeholder={language === 'en' ? "e.g. PAN Card" : "எ.கா. பான் கார்டு"} 
                                value={formData.workPurpose || ""} 
                                onChange={e => setFormData({...formData, workPurpose: e.target.value})} 
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-blue-800 uppercase tracking-widest ml-1">
                                {language === 'en' ? 'Work Status' : 'பணி நிலை'}
                              </label>
                              <select 
                                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 font-bold text-xs font-black focus:outline-none" 
                                value={formData.workStatus || "Pending"} 
                                onChange={e => setFormData({...formData, workStatus: e.target.value as any})}
                              >
                                <option value="Pending">{language === 'en' ? 'Pending' : 'நிலுவையில்'}</option>
                                <option value="In Progress">{language === 'en' ? 'On Process' : 'செயல்பாட்டில்'}</option>
                                <option value="Completed">{language === 'en' ? 'Completed' : 'முடிந்தது'}</option>
                              </select>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                              Name (English)
                            </label>
                            <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs focus:border-blue-600 focus:outline-none" value={formData.name || ""} onChange={e => setFormData({...formData, name: e.target.value})} />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                              பெயர் (தமிழ்)
                            </label>
                            <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs focus:border-blue-600 focus:outline-none" value={formData.nameTamil || ""} onChange={e => setFormData({...formData, nameTamil: e.target.value})} />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'en' ? 'Phone No *' : 'கைபேசி எண் *'}</label>
                              <input required type="tel" maxLength={10} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs focus:border-blue-600 focus:outline-none" value={formData.phone || ""} onChange={e => setFormData({...formData, phone: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'en' ? 'Email' : 'மின்னஞ்சல்'}</label>
                              <input type="email" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs focus:border-blue-600 focus:outline-none" value={formData.email || ""} onChange={e => setFormData({...formData, email: e.target.value})} />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'en' ? 'Date of Birth' : 'பிறந்த தேதி'}</label>
                              <input type="date" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-xs text-slate-700 focus:outline-none" value={formData.dob || ""} onChange={e => setFormData({...formData, dob: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'en' ? 'Gender' : 'பாலினம்'}</label>
                              <select className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-xs select-none focus:outline-none" value={formData.gender || "Male"} onChange={e => {
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

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Father's / Husband's Name (English)</label>
                              <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs focus:border-blue-600 focus:outline-none" value={formData.fatherName || ""} onChange={e => setFormData({...formData, fatherName: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">தந்தை / கணவர் பெயர் (தமிழ்)</label>
                              <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs focus:border-blue-600 focus:outline-none" value={formData.fatherNameTamil || ""} onChange={e => setFormData({...formData, fatherNameTamil: e.target.value})} />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Mother's Name (English)</label>
                              <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs focus:border-blue-600 focus:outline-none" value={formData.motherName || ""} onChange={e => setFormData({...formData, motherName: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">தாய் பெயர் (தமிழ்)</label>
                              <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs focus:border-blue-650 focus:outline-none" value={formData.motherNameTamil || ""} onChange={e => setFormData({...formData, motherNameTamil: e.target.value})} />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Spouse's Name (English)</label>
                              <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs focus:border-blue-600 focus:outline-none" value={formData.spouseName || ""} onChange={e => setFormData({...formData, spouseName: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">துணைவர் பெயர் (தமிழ்)</label>
                              <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs focus:border-blue-600 focus:outline-none" value={formData.spouseNameTamil || ""} onChange={e => setFormData({...formData, spouseNameTamil: e.target.value})} />
                            </div>
                          </div>
                        </div>

                        {/* Segment 2: Official Document IDs & Banking Details */}
                        <div className="bg-slate-50/40 p-5 rounded-[1.8rem] border border-slate-100 space-y-4">
                          <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest border-b pb-2 flex items-center gap-1.5">
                            <Fingerprint size={12} /> 2. அரசு அடையாள எண்கள் (Official IDs)
                          </h4>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">ஆதார் அட்டை எண் (Aadhaar No)</label>
                            <input type="text" maxLength={12} placeholder="e.g. 123456789012" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs focus:border-blue-600 focus:outline-none" value={formData.aadhaar || ""} onChange={e => setFormData({...formData, aadhaar: e.target.value})} />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">CAN Number (சி.ஏ.என் எண்)</label>
                            <input type="text" placeholder="e.g. 303330123456" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs focus:border-blue-600 focus:outline-none" value={formData.canNumber || ""} onChange={e => setFormData({...formData, canNumber: e.target.value})} />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">ரேஷன் ஸ்மார்ட் கார்டு</label>
                              <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs focus:border-blue-600 focus:outline-none" value={formData.smartCard || ""} onChange={e => setFormData({...formData, smartCard: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">வாக்காளர் அடையாள எண்</label>
                              <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs focus:border-blue-600 focus:outline-none" value={formData.voterId || ""} onChange={e => setFormData({...formData, voterId: e.target.value})} />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">பான் கார்டு எண் (PAN Card No)</label>
                            <input type="text" maxLength={10} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs focus:border-blue-600 focus:outline-none text-transform:uppercase" value={formData.pan || ""} onChange={e => setFormData({...formData, pan: e.target.value.toUpperCase()})} />
                          </div>

                          <div className="border-t border-slate-100 my-2 pt-3" />

                          <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                            <CreditCard size={12} /> 4. வங்கி விவரங்கள் (Bank Details)
                          </h4>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">வங்கி பெயர் (Bank Name)</label>
                            <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs focus:border-blue-600 focus:outline-none" value={formData.bankName || ""} onChange={e => setFormData({...formData, bankName: e.target.value})} />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">கணக்கு எண்</label>
                              <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs focus:border-blue-600 focus:outline-none" value={formData.accountNumber || ""} onChange={e => setFormData({...formData, accountNumber: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">IFSC குறியீடு</label>
                              <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs focus:border-blue-600 focus:outline-none" value={formData.ifscCode || ""} onChange={e => setFormData({...formData, ifscCode: e.target.value})} />
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Segment 3: Deep Address profiles */}
                      <div className="bg-slate-50/40 p-5 rounded-[1.8rem] border border-slate-100 space-y-4">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2 flex items-center gap-1.5">
                          <MapPin size={12} /> 3. முகவரி விவரங்கள் (Address Credentials)
                        </h4>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest ml-0.5">{language === 'en' ? 'Door / Flat No' : 'கதவு எண் (Door No)'}</label>
                            <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:border-blue-600 focus:outline-none" value={formData.doorNo || ""} onChange={e => setFormData({...formData, doorNo: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Street Name (English)</label>
                            <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:border-blue-600 focus:outline-none" value={formData.streetName || ""} onChange={e => setFormData({...formData, streetName: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest ml-0.5">தெரு பெயர் (தமிழ்)</label>
                            <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:border-blue-600 focus:outline-none" value={formData.streetNameTamil || ""} onChange={e => setFormData({...formData, streetNameTamil: e.target.value})} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Village / Town (English)</label>
                            <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:border-blue-600 focus:outline-none" value={formData.village || ""} onChange={e => setFormData({...formData, village: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest ml-0.5">கிராமம் / நகரம் (தமிழ்)</label>
                            <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:border-blue-600 focus:outline-none" value={formData.villageTamil || ""} onChange={e => setFormData({...formData, villageTamil: e.target.value})} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Taluk (English)</label>
                            <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:border-blue-600 focus:outline-none" value={formData.taluk || ""} onChange={e => setFormData({...formData, taluk: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest ml-0.5">வட்டம் / தாலுகா (தமிழ்)</label>
                            <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:border-blue-600 focus:outline-none" value={formData.talukTamil || ""} onChange={e => setFormData({...formData, talukTamil: e.target.value})} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest ml-0.5">District (English)</label>
                            <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:border-blue-600 focus:outline-none" value={formData.district || ""} onChange={e => setFormData({...formData, district: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest ml-0.5">மாவட்டம் (தமிழ்)</label>
                            <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:border-blue-600 focus:outline-none" value={formData.districtTamil || ""} onChange={e => setFormData({...formData, districtTamil: e.target.value})} />
                          </div>
                        </div>

                        <div className="space-y-1 max-w-xs">
                          <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest ml-0.5">{language === 'en' ? 'Pincode' : 'அஞ்சல் குறியீடு (Pincode)'}</label>
                          <input type="text" maxLength={6} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:border-blue-600 focus:outline-none" value={formData.pincode || ""} onChange={e => setFormData({...formData, pincode: e.target.value})} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Full Address (English)</label>
                            <textarea rows={2} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-600" value={formData.address || ""} onChange={e => setFormData({...formData, address: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest ml-0.5">முழு முகவரி (தமிழ்)</label>
                            <textarea rows={2} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-600" value={formData.addressTamil || ""} onChange={e => setFormData({...formData, addressTamil: e.target.value})} />
                          </div>
                        </div>
                      </div>

                      {/* Submit Button Section */}
                      <div className="pt-4 border-t flex items-center justify-end gap-3">
                        <button
                          type="submit"
                          className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer border-0"
                        >
                          <CheckCircle2 size={14} /> சுயவிவர சேமிப்பை புதுப்பி (Save Profile Details)
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="py-20 text-center uppercase tracking-wider text-slate-400 text-[10px] font-bold">
                      Loading Customer Workspace...
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}



      <AnimatePresence>
        {/* Edit Profile Modal (Removed) */}
        {false && isEditModalOpen && editingCustomer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingCustomer(null);
              }} 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              className="relative bg-white rounded-[2.5rem] w-full max-w-4xl p-8 max-h-[90vh] overflow-y-auto shadow-2xl border text-left"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b">
                <div>
                  <h3 className="text-xl font-black text-slate-950 leading-none">
                    {language === 'en' ? 'Edit Profile' : 'சுயவிவரத்தைத் திருத்து'}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 font-mono">
                    {language === 'en' ? 'Update government services registry file' : 'அரசு சேவை பதிவு கோப்பினை இற்றைப்படுத்தவும்'}
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingCustomer(null);
                  }} 
                  className="w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center transition-colors"
                >
                  <CloseIcon size={20} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleEditCustSubmit} className="space-y-6">
                
                {/* 1. Identity & Family block */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-2">
                    {language === 'en' ? '1. Personal & Family Info' : '1. தனிநபர் & குடும்ப விவரங்கள்'}
                  </h4>

                  {/* Work Tracking Fields inside Full Edit Modal */}
                  <div className="bg-blue-50/45 p-5 rounded-3xl border border-blue-100/40 grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
                     <div className="space-y-2">
                      <label className="text-[10px] font-black text-blue-800 uppercase tracking-widest ml-1">
                        {language === 'en' ? 'Work / Service Purpose' : 'வேலை / சேவை விவரம்'}
                      </label>
                      <input 
                        type="text" 
                        placeholder={language === 'en' ? "e.g. PAN Card application, Aadhaar correction" : "எ.கா. பான் கார்டு விண்ணப்பம், ஆதார் திருத்தம்"} 
                        className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" 
                        value={editingCustomer.workPurpose || ''} 
                        onChange={e => setEditingCustomer({...editingCustomer, workPurpose: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-blue-800 uppercase tracking-widest ml-1">
                        {language === 'en' ? 'Work Status' : 'பணி நிலை'}
                      </label>
                      <select 
                        className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-black text-sm" 
                        value={editingCustomer.workStatus || 'Pending'} 
                        onChange={e => setEditingCustomer({...editingCustomer, workStatus: e.target.value as any})}
                      >
                        <option value="Pending">{language === 'en' ? 'Pending' : 'நிலுவையில்'}</option>
                        <option value="In Progress">{language === 'en' ? 'On Process' : 'செயல்பாட்டில்'}</option>
                        <option value="Completed">{language === 'en' ? 'Completed' : 'முடிந்தது'}</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        English Name
                      </label>
                      <input type="text" placeholder="e.g. Siva" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" value={editingCustomer.name || ''} onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        தமிழ் பெயர்
                      </label>
                      <input type="text" placeholder="e.g. சிவா" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" value={editingCustomer.nameTamil || ''} onChange={e => setEditingCustomer({...editingCustomer, nameTamil: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        {language === 'en' ? 'Phone No *' : 'கைபேசி எண் *'}
                      </label>
                      <input required type="tel" maxLength={10} placeholder="e.g. 9876543210" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" value={editingCustomer.phone || ''} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        {language === 'en' ? 'Date of Birth' : 'பிறந்த தேதி'}
                      </label>
                      <input type="date" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm text-slate-700" value={editingCustomer.dob || ''} onChange={e => setEditingCustomer({...editingCustomer, dob: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        {language === 'en' ? 'Gender' : 'பாலினம்'}
                      </label>
                      <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" value={editingCustomer.gender || 'Male'} onChange={e => {
                        const val = e.target.value;
                        const tam = val === 'Male' ? 'ஆண்' : val === 'Female' ? 'பெண்' : 'மற்றவை';
                        setEditingCustomer({...editingCustomer, gender: val, genderTamil: tam});
                      }}>
                        <option value="Male">{language === 'en' ? 'Male' : 'Male (ஆண்)'}</option>
                        <option value="Female">{language === 'en' ? 'Female' : 'Female (பெண்)'}</option>
                        <option value="Other">{language === 'en' ? 'Other' : 'Other (மற்றவை)'}</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        {language === 'en' ? 'Email' : 'மின்னஞ்சல்'}
                      </label>
                      <input type="email" placeholder="name@example.com" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" value={editingCustomer.email || ''} onChange={e => setEditingCustomer({...editingCustomer, email: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Father's / Husband's Name (English)
                      </label>
                      <input type="text" placeholder="Father/Husband Name" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" value={editingCustomer.fatherName || ''} onChange={e => setEditingCustomer({...editingCustomer, fatherName: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        தந்தை / கணவர் பெயர் (தமிழ்)
                      </label>
                      <input type="text" placeholder="தந்தை / கணவர் பெயர்" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" value={editingCustomer.fatherNameTamil || ''} onChange={e => setEditingCustomer({...editingCustomer, fatherNameTamil: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Mother's Name (English)
                      </label>
                      <input type="text" placeholder="Mother's Name" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" value={editingCustomer.motherName || ''} onChange={e => setEditingCustomer({...editingCustomer, motherName: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        தாய் பெயர் (தமிழ்)
                      </label>
                      <input type="text" placeholder="தாயார் பெயர்" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" value={editingCustomer.motherNameTamil || ''} onChange={e => setEditingCustomer({...editingCustomer, motherNameTamil: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Spouse's Name (English)
                      </label>
                      <input type="text" placeholder="Spouse's Name" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" value={editingCustomer.spouseName || ''} onChange={e => setEditingCustomer({...editingCustomer, spouseName: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        துணைவர் பெயர் (தமிழ்)
                      </label>
                      <input type="text" placeholder="மனைவி/கணவர் பெயர்" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" value={editingCustomer.spouseNameTamil || ''} onChange={e => setEditingCustomer({...editingCustomer, spouseNameTamil: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* 2. Official IDs block */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-2">
                    {language === 'en' ? '2. Government Identification Numbers' : '2. அரசு சான்றிதழ் குறியீடுகள்'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        {language === 'en' ? 'Aadhaar Number' : 'ஆதார் கார்டு எண்'}
                      </label>
                      <input type="text" maxLength={12} placeholder="e.g. 1234 5678 9012" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" value={editingCustomer.aadhaar || ''} onChange={e => setEditingCustomer({...editingCustomer, aadhaar: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        {language === 'en' ? 'CAN Number' : 'சி.ஏ.என் எண் (CAN)'}
                      </label>
                      <input type="text" placeholder="e.g. 303330123456" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" value={editingCustomer.canNumber || ''} onChange={e => setEditingCustomer({...editingCustomer, canNumber: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        {language === 'en' ? 'Ration Card Number' : 'ஸ்மார்ட் / ரேஷன் கார்டு'}
                      </label>
                      <input type="text" placeholder="e.g. 05W1234567" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" value={editingCustomer.smartCard || ''} onChange={e => setEditingCustomer({...editingCustomer, smartCard: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        {language === 'en' ? 'Voter ID Number' : 'வாக்காளர் அடையாள அட்டை எண்'}
                      </label>
                      <input type="text" placeholder="e.g. ABC1234567" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" value={editingCustomer.voterId || ''} onChange={e => setEditingCustomer({...editingCustomer, voterId: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        {language === 'en' ? 'PAN Number' : 'பான் கார்டு எண்'}
                      </label>
                      <input type="text" maxLength={10} placeholder="e.g. ABCDE1234F" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" value={editingCustomer.pan || ''} onChange={e => setEditingCustomer({...editingCustomer, pan: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* 3. Address details */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-2">
                    {language === 'en' ? '3. Address Details' : '3. முகவரி விவரங்கள்'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Door / Flat No
                      </label>
                      <input type="text" placeholder="e.g. No. 12" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" value={editingCustomer.doorNo || ''} onChange={e => setEditingCustomer({...editingCustomer, doorNo: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Street Name (English)
                      </label>
                      <input type="text" placeholder="e.g. Gandhi Street" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" value={editingCustomer.streetName || ''} onChange={e => setEditingCustomer({...editingCustomer, streetName: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        தெரு பெயர் (தமிழ்)
                      </label>
                      <input type="text" placeholder="e.g. காந்தி தெரு" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" value={editingCustomer.streetNameTamil || ''} onChange={e => setEditingCustomer({...editingCustomer, streetNameTamil: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Village / Town (English)
                      </label>
                      <input type="text" placeholder="e.g. Adyar" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" value={editingCustomer.village || ''} onChange={e => setEditingCustomer({...editingCustomer, village: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        கிராமம் / நகரம் (தமிழ்)
                      </label>
                      <input type="text" placeholder="e.g. அடையார்" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" value={editingCustomer.villageTamil || ''} onChange={e => setEditingCustomer({...editingCustomer, villageTamil: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Taluk (English)
                      </label>
                      <input type="text" placeholder="e.g. Guindy" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" value={editingCustomer.taluk || ''} onChange={e => setEditingCustomer({...editingCustomer, taluk: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        வட்டம் / தாலுகா (தமிழ்)
                      </label>
                      <input type="text" placeholder="e.g. கிண்டி" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" value={editingCustomer.talukTamil || ''} onChange={e => setEditingCustomer({...editingCustomer, talukTamil: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        District (English)
                      </label>
                      <input type="text" placeholder="e.g. Chennai" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" value={editingCustomer.district || ''} onChange={e => setEditingCustomer({...editingCustomer, district: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        மாவட்டம் (தமிழ்)
                      </label>
                      <input type="text" placeholder="e.g. சென்னை" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" value={editingCustomer.districtTamil || ''} onChange={e => setEditingCustomer({...editingCustomer, districtTamil: e.target.value})} />
                    </div>
                  </div>

                  <div className="space-y-2 max-w-xs">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      {language === 'en' ? 'Pincode' : 'அஞ்சல் குறியீடு (Pincode)'}
                    </label>
                    <input type="text" maxLength={6} placeholder="e.g. 600020" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" value={editingCustomer.pincode || ''} onChange={e => setEditingCustomer({...editingCustomer, pincode: e.target.value})} />
                  </div>
                </div>

                <div className="pt-6 border-t flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingCustomer(null);
                    }}
                    className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-colors h-14"
                  >
                    {language === 'en' ? 'Cancel' : 'ரத்து செய்'}
                  </button>
                  <motion.button 
                    whileHover={{ scale: 1.01 }} 
                    whileTap={{ scale: 0.99 }} 
                    type="submit" 
                    className="bg-blue-600 hover:bg-emerald-600 text-white rounded-2xl px-10 py-4.5 font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 text-xs h-14"
                  >
                    <Check size={18} />
                    {language === 'en' ? 'Save Changes' : 'மாற்றங்களைச் சேமி'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Custom Delete Confirmation Modal */}
        {deletingCustomer && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setDeletingCustomer(null)} 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              className="relative bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border text-center space-y-6 text-left"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-940 leading-tight">சுயவிவரத்தை நீக்கவா?</h3>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono">Delete Profile Confirmation</p>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mt-4 text-left space-y-1">
                  <p className="text-xs text-slate-400 leading-none">வாடிக்கையாளர் பெயர்</p>
                  <p className="font-extrabold text-slate-900 text-sm">
                    {deletingCustomer.name} {deletingCustomer.nameTamil && <span className="text-blue-600">({deletingCustomer.nameTamil})</span>}
                  </p>
                  <p className="text-xs text-slate-500 font-mono font-bold tracking-wide mt-1">{deletingCustomer.phone}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setDeletingCustomer(null)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl py-4 font-black uppercase tracking-widest text-[10px] transition-colors"
                >
                  ரத்து செய் (Cancel)
                </button>
                <button 
                  type="button"
                  onClick={executeDeleteCust}
                  className="w-full bg-red-600 hover:bg-red-700 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-[10px] transition-colors shadow-lg shadow-red-200"
                >
                  நீக்கு (Delete)
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Pre-Add Phone Number Verification Modal */}
        {showPreAddPhoneModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 text-left">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowPreAddPhoneModal(false)} 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              className="relative bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border space-y-6 text-left z-10"
            >
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-950 flex items-center gap-2">
                    <Phone className="text-blue-600 animate-pulse" size={20} />
                    அலைபேசி எண் சரிபார்ப்பு
                  </h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Mobile Number Entry</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowPreAddPhoneModal(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <CloseIcon size={18} />
                </button>
              </div>

              <form onSubmit={handlePreAddPhoneSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                    வாடிக்கையாளர் அலைபேசி எண் *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text"
                      maxLength={10}
                      pattern="\d*"
                      value={preAddPhoneValue}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setPreAddPhoneValue(val);
                      }}
                      placeholder="10-இலக்க அலைபேசி எண்ணை உள்ளிடவும்..."
                      className="w-full h-12 pl-12 pr-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold focus:border-blue-600 focus:bg-white outline-none transition-all leading-none focus:ring-0"
                      autoFocus
                    />
                  </div>
                  {preAddPhoneError && (
                    <p className="text-[11px] font-bold text-red-500 mt-1">{preAddPhoneError}</p>
                  )}
                  <p className="text-[10px] font-medium text-slate-400 leading-normal mt-2">
                    வாடிக்கையாளரின் தொலைபேசி எண்ணை உள்ளிட்ட பிறகு மட்டுமே சுயவிவரப் பக்கம் திறக்கும். இதன் மூலம் அனைத்து சான்றிதழ்களும் கோப்புகளும் இந்த எண்ணுடன் இணைக்கப்படும்.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowPreAddPhoneModal(false)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl py-4 font-black uppercase tracking-widest text-[10px] transition-all cursor-pointer leading-none"
                  >
                    ரத்து செய் (Cancel)
                  </button>
                  <button 
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-[10px] transition-all cursor-pointer shadow-lg shadow-blue-200 leading-none"
                  >
                    சரிபார் (Verify & Proceed)
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Quick Add Profile Modal (Removed) */}
        {false && showAddProfileModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowAddProfileModal(false)} 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              className="relative bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border space-y-6 text-left"
            >
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-950 flex items-center gap-2">
                    <UserPlus className="text-blue-600" size={20} />
                    புதிய சுயவிவரம் சேர்
                  </h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Add Quick Profile</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowAddProfileModal(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <CloseIcon size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateQuickProfile} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    {language === 'en' ? 'Mobile Number *' : 'அலைபேசி எண் *'}
                  </label>
                  <input 
                    required 
                    type="tel" 
                    maxLength={10}
                    placeholder={language === 'en' ? "e.g. 9876543210" : "எ.கா. 9876543210"} 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" 
                    value={newProfilePhone} 
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      setNewProfilePhone(val);
                    }} 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    {language === 'en' ? 'Purpose of Work / Service' : 'எந்தச் சேவைக்காக / பணி'}
                  </label>
                  <input 
                    type="text" 
                    placeholder={language === 'en' ? "e.g. PAN card, Aadhaar update" : "எ.கா. பான் கார்டு, புது ஆதார் விண்ணப்பம்"} 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-600 focus:outline-none font-bold text-sm" 
                    value={newProfileWorkPurpose} 
                    onChange={e => setNewProfileWorkPurpose(e.target.value)} 
                  />
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {(language === 'en' 
                      ? ["Income Certificate", "Residence Certificate", "PAN Card", "Aadhaar Edit", "Smart Card"]
                      : ["வருமானச் சான்றிதழ்", "இருப்பிடச் சான்றிதழ்", "பான் கார்டு", "ஆதார் திருத்தம்", "ஸ்மார்ட் கார்டு"]
                    ).map(item => (
                      <button
                        type="button"
                        key={item}
                        onClick={() => setNewProfileWorkPurpose(item)}
                        className="text-[10px] font-extrabold bg-slate-50 hover:bg-slate-100 text-slate-700 px-2 py-1 rounded-lg transition-all border border-slate-200 cursor-pointer"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    {language === 'en' ? 'Work Status' : 'பணி நிலை'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'Pending', label: language === 'en' ? 'Pending' : 'நிலுவையில்' },
                      { key: 'In Progress', label: language === 'en' ? 'On Process' : 'செயல்பாட்டில்' },
                      { key: 'Completed', label: language === 'en' ? 'Completed' : 'முடிந்தது' }
                    ].map(st => (
                      <button
                        type="button"
                        key={st.key}
                        onClick={() => setNewProfileWorkStatus(st.key as any)}
                        className={`py-2 rounded-xl text-xs font-black transition-all border text-center cursor-pointer ${
                          newProfileWorkStatus === st.key 
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {phoneError && (
                  <p className="text-red-600 text-xs font-black bg-red-50 border border-red-150 px-4 py-3 rounded-2xl">
                    ⚠️ {phoneError}
                  </p>
                )}

                <div className="pt-4 border-t grid grid-cols-2 gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowAddProfileModal(false);
                      setNewProfilePhone('');
                      setPhoneError('');
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl py-4 font-black uppercase tracking-widest text-[10px] transition-colors"
                  >
                    {language === 'en' ? 'Cancel' : 'ரத்து செய்'}
                  </button>
                  <button 
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-[10px] transition-colors shadow-lg shadow-blue-100 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 size={14} /> {language === 'en' ? 'Create' : 'உருவாக்கு'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {/* Custom Save Success Modal */}
        {showActiveSaveSuccess && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowActiveSaveSuccess(false)} 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              className="relative bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl border text-center space-y-5 text-left z-10"
            >
              <div className="w-16 h-16 bg-emerald-50 text-emerald-650 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
                <Check size={32} strokeWidth={3} />
              </div>
              <div className="space-y-2 text-center">
                <h3 className="text-xl font-black text-slate-900 leading-tight">சுயவிவரம் சேமிக்கப்பட்டது!</h3>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest font-mono">Profile Details Saved</p>
                <p className="text-xs text-slate-500 font-bold leading-relaxed pt-1">
                  உங்களின் புதிய விவரங்கள் மற்றும் திருத்தங்கள் இ-சேவை தரவுத்தளத்தில் வெற்றிகரமாகப் புதுப்பிக்கப்பட்டன.
                </p>
              </div>

              <button 
                type="button"
                onClick={() => setShowActiveSaveSuccess(false)}
                className="w-full bg-slate-900 hover:bg-slate-950 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-[10px] transition-colors shadow-lg active:scale-98 cursor-pointer"
              >
                சரி (OK)
              </button>
            </motion.div>
          </div>
        )}

        {/* Profile Limit Exceeded Modal */}
        {showProfileLimitModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileLimitModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="relative bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-2xl w-full max-w-sm overflow-hidden text-center z-50"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                  <AlertTriangle size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="font-extrabold text-lg text-slate-900 uppercase tracking-tight">
                    {language === "ta" ? "சுயவிவர வரம்பு முடிந்தது!" : "Profile Limit Reached!"}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    {language === "ta" 
                      ? "இலவசப் பதிப்பில் அதிகபட்சமாக 10 வாடிக்கையாளர் விவரங்கள் மட்டுமே சேமிக்க முடியும். புதிய வாடிக்கையாளர்களைச் சேர்க்க உங்கள் கணக்கை பிரீமியமாக மேம்படுத்தவும்!" 
                      : "The free edition allows a maximum of 10 customer profiles in the CRM. Please upgrade to the Premium Edition to manage unlimited center profiles!"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowProfileLimitModal(false)}
                  className="px-4 py-3 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                >
                  {language === "ta" ? "சரி, மூடு" : "Close"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileLimitModal(false);
                  }}
                  className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-md shadow-indigo-600/10 cursor-pointer active:scale-95 transition-all text-center flex items-center justify-center"
                >
                  {language === "ta" ? "மேம்படுத்து" : "Upgrade"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
