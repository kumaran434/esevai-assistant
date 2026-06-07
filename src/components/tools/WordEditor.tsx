import React, { useState, useRef, useEffect } from "react";
import { 
  FileText, 
  Printer, 
  Copy, 
  Check, 
  Download, 
  Upload,
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify, 
  ChevronLeft, 
  Sparkles,
  Hand,
  Trash2,
  Eraser,
  List,
  Heading1,
  Heading2,
  BookOpen,
  User,
  LayoutGrid,
  ChevronRight,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Settings,
  RefreshCw,
  Clock,
  ExternalLink,
  Loader2,
  CheckCircle2,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../../lib/translations";
import { extractDetailsFromDocuments } from "../../services/geminiService";
import { customerService } from "../../services/customerService";
import { useToast } from "../../hooks/useToast";

const getApiUrl = (endpoint: string) => {
  const baseUrl = import.meta.env.VITE_SERVER_URL || "";
  if (baseUrl) {
    const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${cleanBase}${cleanEndpoint}`;
  }
  const isElectron = typeof window !== 'undefined' && 
     ((window as any).process?.versions?.electron || 
      navigator.userAgent.toLowerCase().indexOf(' electron/') > -1);
  if (window.location.protocol === 'file:' || isElectron) {
    const fallbackUrl = "https://esevadraft.in";
    return `${fallbackUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  }
  return endpoint;
};

interface WordEditorProps {
  activeProfile?: any;
  isNarrow?: boolean;
  onBack?: () => void;
}

export default function WordEditor({ activeProfile, isNarrow, onBack }: WordEditorProps) {
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadCardRef = useRef<HTMLInputElement>(null);
  
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'templates' | 'profile' | 'ai-mode'>('templates');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>("rental");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedResult, setExtractedResult] = useState<any>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  
  // AI Mode States
  const [isAnalyzingTemplate, setIsAnalyzingTemplate] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);
  const [aiAnalysisError, setAiAnalysisError] = useState<string | null>(null);
  const [aiUploadSlots, setAiUploadSlots] = useState<{ [id: string]: { isExtracting: boolean; fileName: string; extractedData: any; error: string | null } }>({});
  const [isFillingAI, setIsFillingAI] = useState(false);

  const [fontFamily, setFontFamily] = useState<'font-sans' | 'font-mono' | 'font-serif'>('font-sans');
  const [fontSize, setFontSize] = useState<string>("3"); // Standard browser execCommand font scale (1-7)
  const [textColor, setTextColor] = useState<string>("#000000");
  const [documentTitle, setDocumentTitle] = useState<string>("புதிய ஆவண வரைவு");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100); // 80%, 90%, 100%, 110%, 120%
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx') && !file.name.endsWith('.doc')) {
      alert(language === 'ta' ? 'தயவுசெய்து .docx வடிவிலான கோப்பினை மட்டும் தேர்ந்தெடுக்கவும்!' : 'Please select a valid .docx file!');
      return;
    }

    setUploadFeedback(language === 'ta' ? 'கோப்பு பகுப்பாய்வு செய்யப்படுகிறது...' : 'Parsing Word document...');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          throw new Error("Could not read file data buffer");
        }
        
        // Dynamically import mammoth to parse the Word document
        const mammoth = await import("mammoth");
        const result = await mammoth.convertToHtml({ arrayBuffer });
        
        if (editorRef.current) {
          // Wrap with simple div structure if needed, or directly load HTML
          editorRef.current.innerHTML = result.value;
          
          // Use file name as draft title
          const fileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          setDocumentTitle(fileNameWithoutExt);
          
          setUploadFeedback(language === 'ta' ? 'வெற்றிகரமாக ஆவணம் ஏற்றப்பட்டது!' : 'Loaded successfully!');
          setTimeout(() => setUploadFeedback(null), 3000);
        }
      } catch (error) {
        console.error("Error parsing DOCX file:", error);
        alert(language === 'ta' ? 'இந்த .docx கோப்பை பகுப்பாய்வு செய்வதில் பிழை ஏற்பட்டது!' : 'Error parsing this .docx/doc file!');
        setUploadFeedback(null);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Current date for auto-fill simulation
  const currentDateTamil = "27-05-2026";

  const subjectProfile = activeProfile || {};

  // Custom Tamil Official Templates for swift generation
  const templates = [
    {
      id: "rental",
      title: "வாடகை ஒப்பந்தப் பத்திரம்",
      titleEn: "Rental Agreement",
      description: "வீட்டு வாடகை பத்திரம் மாதிரி வடிவம்",
      content: `<h2 style="text-align: center; font-size: 18px; margin-bottom: 20px; font-weight: bold; color: #000000;">வீட்டு வாடகை ஒப்பந்தப் பத்திரம்</h2>
<p style="text-align: justify; line-height: 1.8;">இந்த வாடகை ஒப்பந்தப் பத்திரம் <b>2026 ஆம் ஆண்டு _________________ மாதம் __ ஆம் நாளில்</b> கீழே விவரிக்கப்பட்டுள்ள நபர்களுக்கிடையே எழுதப்பெற்றது.</p>
<br>
<p style="line-height: 1.8;"><b>1. வீட்டு உரிமையாளர் (Landlord):</b></p>
<p style="line-height: 1.8; margin-left: 20px;">பெயர்: <b>[உரிமையாளர் பெயர்]</b><br>தகப்பனார் பெயர்: [உரிமையாளர் தந்தை பெயர்]<br>முகவரி: [உரிமையாளர் முகவரி]</p>
<br>
<p style="line-height: 1.8;"><b>2. வாடகைதாரர் (Tenant):</b></p>
<p style="line-height: 1.8; margin-left: 20px;">பெயர்: <b>${subjectProfile.nameTamil || subjectProfile.name || "[வாடகைதாரர் பெயர்]"}</b><br>தகப்பனார் பெயர்: <b>${subjectProfile.fatherNameTamil || "[வாடகைதாரர் தந்தை பெயர்]"}</b><br>ஆதார் எண்: <b>${subjectProfile.aadhaar || "[ஆதார் எண்]"}</b><br>கைபேசி எண்: <b>${subjectProfile.phone || "[வாடகைதாரர் கைபேசி]"}</b></p>
<br>
<p style="line-height: 1.8;"><b>சொத்து விபரம்:</b></p>
<p style="text-align: justify; line-height: 1.8; margin-left: 20px; color: #000000;">கதவு எண்: <b>${subjectProfile.doorNo || "[கதவு எண்]"}</b>, <b>${subjectProfile.streetNameTamil || "[தெருப் பெயர்]"}</b>, <b>${subjectProfile.villageTamil || "[கிராமம்]"}</b> கிராமம், <b>${subjectProfile.talukTamil || "[வட்டம்]"}</b> வட்டம், <b>${subjectProfile.districtTamil || "[மாவட்டம்]"}</b> மாவட்டம், அஞ்சல் குறியீடு: <b>${subjectProfile.pincode || "[அஞ்சல் குறியீடு]"}</b> என்ற முகவரியில் அமைந்துள்ள குடியிருப்பு வீடு.</p>
<br>
<p style="line-height: 1.8;"><b>நிபந்தனைகள்:</b></p>
<ol style="line-height: 1.8; margin-left: 20px;">
  <li>மாதாந்திர வாடகைத் தொகையாக <b>ரூ. ______________ (ரூபாய் ____________________ மட்டும்)</b> ஒவ்வொரு மாதமும் __ தேதிக்குள் செலுத்தப்பட வேண்டும்.</li>
  <li>முன்பணமாக <b>ரூ. ______________ (ரூபாய் ____________________ மட்டும்)</b> வாடகைதாரர் வழங்கியுள்ளார். இது வீடு காலி செய்யும்போது திரும்பத் தரப்படும்.</li>
  <li>மின்சாரக் கட்டணத்தை வாடகைதாரரே தனியாக மின்வாரியத் துறைக்கு செலுத்த வேண்டும்.</li>
  <li>இந்த ஒப்பந்தத்தின் கால வரம்பு 11 மாதங்கள் ஆகும்.</li>
</ol>
<br>
<br>
<table style="width: 100%; border:0; margin-top: 40px;">
  <tr>
    <td style="text-align: left; font-weight: bold;">வீட்டு உரிமையாளர் கையொப்பம்</td>
    <td style="text-align: right; font-weight: bold;">வாடகைதாரர் கையொப்பம்</td>
  </tr>
</table>`
    },
    {
      id: "affidavit",
      title: "சுய உறுதிமொழி வாக்குமூலம்",
      titleEn: "Self Declaration Affidavit",
      description: "வருமானம் மற்றும் வசிப்பிட சுய சான்று வடிவம்",
      content: `<h2 style="text-align: center; font-size: 18px; margin-bottom: 24px; font-weight: bold; color: #000000;">சுய உறுதிமொழிச் சான்று (Self Declaration)</h2>
<p style="text-align: justify; line-height: 1.8;">நான் <b>${subjectProfile.nameTamil || subjectProfile.name || "_____________________"}</b>, தந்தை பெயர் <b>${subjectProfile.fatherNameTamil || "_____________________"}</b>, கதவு எண் <b>${subjectProfile.doorNo || "_______"}</b>, <b>${subjectProfile.streetNameTamil || "_____________________"}</b>, <b>${subjectProfile.villageTamil || "_____________________"}</b> கிராமம், <b>${subjectProfile.talukTamil || "_____________________"}</b> வட்டம், <b>${subjectProfile.districtTamil || "___________________"}</b> மாவட்டத்தில் வசித்து வருகிறேன்.</p>
<br>
<p style="text-align: justify; line-height: 1.8;">கீழ்க்கண்ட விவரங்களை முழு மனதுடனும் பொறுப்புடனும் உறுதி கூறுகிறேன்:</p>
<br>
<ul style="line-height: 1.8; list-style-type: decimal; margin-left: 20px;">
  <li>எனது குடும்பத்தின் ஆண்டு வருமானம் அனைத்து வழிகளிலும் சேர்த்து <b>ரூ. _________________ (ரூபாய் ______________________ மட்டும்)</b> ஆகும்.</li>
  <li>எனது ஆவணங்களில் குறிப்பிட்டுள்ள ஆதார் எண் <b>${subjectProfile.aadhaar || "[ஆதார் எண்]"}</b> மற்றும் ரேஷன் கார்டு எண் <b>${subjectProfile.smartCard || "[ரேஷன் எண்]"}</b> ஆகியவை உண்மையானவை.</li>
  <li>இங்கு அளிக்கப்பட்டுள்ள விவரங்கள் அனைத்தும் உண்மை என்றும், இதில் ஏதேனும் தவறு கண்டறியப்பட்டால் சட்டப்பூர்வ நடவடிக்கைக்கு உட்படுவேன் என்றும் உறுதி கூறுகிறேன்.</li>
</ul>
<br>
<br>
<br>
<table style="width: 100%; border: 0; margin-top: 50px;">
  <tr>
    <td style="text-align: left;"><b>இடம்:</b> <b>${subjectProfile.villageTamil || "_________"}</b><br><b>தேதி:</b> <b>${currentDateTamil}</b></td>
    <td style="text-align: right; font-weight: bold; vertical-align: bottom;"><br><br><br>விண்ணப்பதாரரின் கையொப்பம்</td>
  </tr>
</table>`
    },
    {
      id: "unmarried",
      title: "திருமணமாகாதவர் சான்றிதழ் வாக்குமூலம்",
      titleEn: "Unmarried Declaration Affidavit",
      description: "பிரம்மச்சாரி சான்றுக்கான வாக்குமூல வடிவம்",
      content: `<h2 style="text-align: center; font-size: 18px; margin-bottom: 24px; font-weight: bold; color: #000000;">திருமணமாகாதவர் உறுதிமொழி வாக்குமூலம்</h2>
<p style="text-align: justify; line-height: 1.8;">நான் <b>${subjectProfile.nameTamil || subjectProfile.name || "_____________________"}</b>, தந்தை பெயர் <b>${subjectProfile.fatherNameTamil || "_____________________"}</b>, கதவு எண் <b>${subjectProfile.doorNo || "_______"}</b>, <b>${subjectProfile.streetNameTamil || "_____________________"}</b>, <b>${subjectProfile.villageTamil || "_____________________"}</b> கிராமம், <b>${subjectProfile.talukTamil || "_____________________"}</b> வட்டம், <b>${subjectProfile.districtTamil || "___________________"}</b> மாவட்டத்தில் வசித்து வருகிறேன்.</p>
<br>
<p style="text-align: justify; line-height: 1.8;">என்பவர் இத்திருமணமாகாதவர் சான்றிதழ் வரைவு மூலமாக கீழ்கண்டவாறு உறுதி கூறுகிறேன்:</p>
<ul style="line-height: 1.8; list-style-type: decimal; margin-left: 20px;">
  <li>எனக்கு தற்போது வயது _____ ஆகிறது. எனக்கும் இதுவரை எங்கும் திருமணம் எதுவும் நடைபெறவில்லை.</li>
  <li>வட்டார வருவாய்த்துறை சான்றிதழ் பெறுவதற்காக இவ்வாக்குமூலத்தை முழுமனதோடு சாட்சி பகிர்கிறேன். இதில் குறிப்பிடப்பட்டுள்ள தகவல்கள் எவையேனும் பொய் என கண்டறியப்பட்டால் சட்டப்படி தண்டிக்கப்படுவேன்.</li>
</ul>
<br>
<br>
<br>
<table style="width: 100%; border: 0; margin-top: 50px;">
  <tr>
    <td style="text-align: left;"><b>இடம்:</b> <b>${subjectProfile.villageTamil || "_________"}</b><br><b>தேதி:</b> <b>${currentDateTamil}</b></td>
    <td style="text-align: right; font-weight: bold; vertical-align: bottom;"><br><br><br>உறுதிமொழி அளிப்பவர் கையொப்பம்</td>
  </tr>
</table>`
    },
    {
      id: "power_of_attorney",
      title: "பொது அதிகாரப் பத்திரம் (GPA)",
      titleEn: "General Power of Attorney",
      description: "பொது அதிகார பிரதிநிதித்துவ மாதிரி வடிவம்",
      content: `<h2 style="text-align: center; font-size: 18px; margin-bottom: 20px; font-weight: bold; color: #000000;">பொது அதிகாரப் பத்திரம் (General Power of Attorney)</h2>
<p style="line-height: 1.8; text-align: justify; margin-bottom: 12px;"><b>எழுதி கொடுப்பவர்:</b> பெயர்: <b>${subjectProfile.nameTamil || subjectProfile.name || "[எழுதிக்கொடுப்பவர் பெயர்]"}</b>, தந்தை பெயர்: <b>${subjectProfile.fatherNameTamil || "[தந்தை பெயர்]"}</b>, கதவு எண்: <b>${subjectProfile.doorNo || "____"}</b>, <b>${subjectProfile.streetNameTamil || "[தெருப் பெயர்]"}</b>, <b>${subjectProfile.villageTamil || "[கிராமம்]"}</b>, ஆதார் எண்: <b>${subjectProfile.aadhaar || "[ஆதார் எண்]"}</b>.</p>
<p style="line-height: 1.8; text-align: justify; margin-bottom: 24px;"><b>எழுதி வாங்குபவர் (முகவர்):</b> பெயர்: <b>[முகவர் பெயர்]</b>, தந்தை பெயர்: [முகவர் தந்தை பெயர்], முகவரி: [முகவர் முகவரி], ஆதார் எண்: [முகவர் ஆதார்].</p>
<hr style="border: 0; border-top: 1px border-slate-200; margin-bottom: 24px;">
<p style="line-height: 1.8; text-align: justify;">மேற்குறிப்பிட்ட நான் எனது தனிப்பட்ட அலுவல் பணிகள் மற்றும் வெளிநாடு பிரயாணம் காரணமாக, எனது சார்பாக சொத்துக்களை நிர்வகிக்கவும், இதர அரசு அலுவலகப் பணிகளை மேற்கொள்ளவும் மேற்குறிப்பிட்டுள்ள முகவருக்கு முழு அதிகாரம் அளிக்கிறேன்.</p>
<br>
<p style="line-height: 1.8; text-align: justify;"><b>அதிகாரங்கள்:</b></p>
<ol style="line-height: 1.8; margin-left: 20px;">
  <li>சொத்து வரி செலுத்துதல், புதிய மின் இணைப்பு பெறுதல் மற்றும் இதர நகராட்சி விண்ணப்பங்களைச் சமர்ப்பித்தல்.</li>
  <li>அரசு அலுவலகங்கள், வங்கிகள் மற்றும் நீதிமன்ற வழிமுறைகளில் எனக்காகக் கையொப்பமிடுதல்.</li>
  <li>இந்த அதிகாரம் எனது வாழ்நாள் வரம்பிற்கு உட்பட்டது அல்லது என்னால் ரத்து செய்யப்படும் வரை செயல்பாட்டில் இருக்கும்.</li>
</ol>
<br>
<p style="line-height: 1.8;">இதன் சாட்சியாக நாங்கள் கீழ்க்கண்ட சாட்சிகள் முன்னிலையில் கையொப்பமிடுகிறோம்.</p>
<br>
<p style="line-height: 1.8;"><b>சாட்சிகள்:</b></p>
<p style="line-height: 1.8; margin-left: 20px;">1. ________________________ (பெயர், முகவரி)<br>2. ________________________ (பெயர், முகவரி)</p>
<br>
<br>
<table style="width: 100%; border: 0; margin-top: 40px;">
  <tr>
    <td style="text-align: left; font-weight: bold;">சாட்சிகள் கையொப்பம்</td>
    <td style="text-align: right; font-weight: bold;"><br>எழுதிக்கொடுப்பவர் கையொப்பம்</td>
  </tr>
</table>`
    }
  ];

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setExtractionError(null);
    try {
      const base64Str = await fileToBase64(file);
      const imagesPayload = [{
        base64: base64Str,
        mimeType: file.type
      }];

      const result = await extractDetailsFromDocuments(imagesPayload);
      if (!result) {
        throw new Error(language === "ta" ? "விவரங்களைப் பெற முடியவில்லை." : "Failed to extract details.");
      }
      setExtractedResult(result);
      showToast(language === "ta" ? "விவரங்கள் வெற்றிகரமாகப் பெறப்பட்டன!" : "Details extracted successfully!", 'success');
    } catch (err: any) {
      console.error(err);
      setExtractionError(err.message);
      showToast(language === "ta" ? `பிழை: ${err.message}` : `Error: ${err.message}`, 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  const autoFillCurrentEditor = (prof: any) => {
    if (!editorRef.current) return;
    let html = editorRef.current.innerHTML;

    const mappings = [
      { keys: ["[வாடகைதாரர் பெயர்]", "[வாடகைதாரர் பெயர்]</b>", "[எழுதிக்கொடுப்பவர் பெயர்]"], value: prof.nameTamil || prof.name },
      { keys: ["[வாடகைதாரர் தந்தை பெயர்]", "[தந்தை பெயர்]"], value: prof.fatherNameTamil || prof.fatherName },
      { keys: ["[ஆதார் எண்]"], value: prof.aadhaar },
      { keys: ["[வாடகைதாரர் கைபேசி]"], value: prof.phone },
      { keys: ["[கதவு எண்]", "_______"], value: prof.doorNo },
      { keys: ["[தெருப் பெயர்]"], value: prof.streetNameTamil || prof.streetName },
      { keys: ["[கிராமம்]", "_________"], value: prof.villageTamil || prof.village },
      { keys: ["[வட்டம்]"], value: prof.talukTamil || prof.taluk },
      { keys: ["[மாவட்டம்]"], value: prof.districtTamil || prof.district },
      { keys: ["[அஞ்சல் குறியீடு]"], value: prof.pincode },
      { keys: ["[ரேஷன் எண்]"], value: prof.smartCard || prof.rationCardNumber },
    ];

    mappings.forEach(({ keys, value }) => {
      if (!value) return;
      keys.forEach(key => {
        const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(escapedKey, 'g');
        html = html.replace(regex, value);
      });
    });

    html = html.replace(/நான் <b>_____________________<\/b>/g, `நான் <b>${prof.nameTamil || prof.name || ""}</b>`);
    html = html.replace(/நான் <b>_.*?<\/b>/g, `நான் <b>${prof.nameTamil || prof.name || ""}</b>`);
    html = html.replace(/தந்தை பெயர் <b>_____________________<\/b>/g, `தந்தை பெயர் <b>${prof.fatherNameTamil || prof.fatherName || ""}</b>`);
    html = html.replace(/தந்தை பெயர் <b>_.*?<\/b>/g, `தந்தை பெயர் <b>${prof.fatherNameTamil || prof.fatherName || ""}</b>`);
    html = html.replace(/கதவு எண் <b>_______<\/b>/g, `கதவு எண் <b>${prof.doorNo || ""}</b>`);
    html = html.replace(/கதவு எண் <b>_.*?<\/b>/g, `கதவு எண் <b>${prof.doorNo || ""}</b>`);
    
    if (prof.streetNameTamil) {
      html = html.replace(/<b>_____________________<\/b>, <b>_____________________<\/b> கிராமம்/g, `<b>${prof.streetNameTamil}</b>, <b>${prof.villageTamil || ""}</b> கிராமம்`);
    }

    editorRef.current.innerHTML = html;
  };

  const handleAutoFillAndSave = async () => {
    if (!extractedResult) return;

    try {
      const phoneToSave = extractedResult.mobileNumber || "9999999999";
      const nameToSave = extractedResult.applicantName || "Extracted Customer";

      const newProfile = {
        name: nameToSave,
        nameTamil: extractedResult.applicantNameTamil || "",
        fatherName: extractedResult.fatherName || "",
        fatherNameTamil: extractedResult.fatherNameTamil || "",
        dob: extractedResult.dob || "",
        gender: extractedResult.gender || "Male",
        genderTamil: extractedResult.genderTamil || "ஆண்",
        aadhaar: extractedResult.aadhaarNumber || "",
        voterId: extractedResult.voterId || "",
        smartCard: extractedResult.smartCardNumber || extractedResult.rationCardNumber || "",
        phone: phoneToSave,
        email: extractedResult.email || "",
        doorNo: extractedResult.doorNoEn || extractedResult.doorNoTa || "",
        streetName: extractedResult.streetEn || "",
        streetNameTamil: extractedResult.streetTa || "",
        village: extractedResult.villageEn || "",
        villageTamil: extractedResult.villageTa || "",
        taluk: extractedResult.talukEn || "",
        talukTamil: extractedResult.talukTa || "",
        district: extractedResult.districtEn || "",
        districtTamil: extractedResult.districtTa || "",
        pincode: extractedResult.pincode || "",
      };

      const newId = await customerService.addCustomer(newProfile);
      localStorage.setItem("ACTIVE_CUSTOMER_ID", newId);
      window.dispatchEvent(new CustomEvent("ACTIVE_CUSTOMER_ID_CHANGED"));

      if (selectedTemplateId) {
        const tplObj = templates.find(t => t.id === selectedTemplateId);
        if (tplObj) {
          let contentHtml = tplObj.content;
          const mapVars: { [key: string]: string } = {
            "\\${subjectProfile.nameTamil || subjectProfile.name || \"\\[வாடகைதாரர் பெயர்\\]\"}": newProfile.nameTamil || newProfile.name || "[வாடகைதாரர் பெயர்]",
            "\\${subjectProfile.fatherNameTamil || \"\\[வாடகைதாரர் தந்தை பெயர்\\]\"}": newProfile.fatherNameTamil || "[வாடகைதாரர் தந்தை பெயர்]",
            "\\${subjectProfile.aadhaar || \"\\[ஆதார் எண்\\]\"}": newProfile.aadhaar || "[ஆதார் எண்]",
            "\\${subjectProfile.phone || \"\\[வாடகைதாரர் கைபேசி\\]\"}": newProfile.phone || "[வாடகைதாரர் கைபேசி]",
            "\\${subjectProfile.doorNo || \"\\[கதவு எண்\\]\"}": newProfile.doorNo || "[கதவு எண்]",
            "\\${subjectProfile.streetNameTamil || \"\\[தெருப் பெயர்\\]\"}": newProfile.streetNameTamil || "[தெருப் பெயர்]",
            "\\${subjectProfile.villageTamil || \"\\[கிராமம்\\]\"}": newProfile.villageTamil || "[கிராமம்]",
            "\\${subjectProfile.talukTamil || \"\\[வட்டம்\\]\"}": newProfile.talukTamil || "[வட்டம்]",
            "\\${subjectProfile.districtTamil || \"\\[மாவட்டம்\\]\"}": newProfile.districtTamil || "[மாவட்டம்]",
            "\\${subjectProfile.pincode || \"\\[அஞ்சல் குறியீடு\\]\"}": newProfile.pincode || "[அஞ்சல் குறியீடு]",
            "\\${subjectProfile.smartCard || \"\\[ரேஷன் எண்\\]\"}": newProfile.smartCard || "[ரேஷன் எண்]",
            "\\${subjectProfile.nameTamil || subjectProfile.name || \"_____________________\"}": newProfile.nameTamil || newProfile.name || "_____________________",
            "\\${subjectProfile.fatherNameTamil || \"_____________________\"}": newProfile.fatherNameTamil || "_____________________",
            "\\${subjectProfile.doorNo || \"_______\"}": newProfile.doorNo || "_______",
            "\\${subjectProfile.streetNameTamil || \"_____________________\"}": newProfile.streetNameTamil || "_____________________",
            "\\${subjectProfile.villageTamil || \"_____________________\"}": newProfile.villageTamil || "_____________________",
            "\\${subjectProfile.talukTamil || \"_____________________\"}": newProfile.talukTamil || "_____________________",
            "\\${subjectProfile.districtTamil || \"___________________\"}": newProfile.districtTamil || "___________________",
            "\\${subjectProfile.villageTamil || \"_________\"}": newProfile.villageTamil || "_________",
            "\\${currentDateTamil}": currentDateTamil,
            "\\${subjectProfile.nameTamil || subjectProfile.name || \"\\[எழுதிக்கொடுப்பவர் பெயர்\\]\"}": newProfile.nameTamil || newProfile.name || "[எழுதிக்கொடுப்பவர் பெயர்]"
          };

          for (const key in mapVars) {
            const regex = new RegExp(key, "g");
            contentHtml = contentHtml.replace(regex, mapVars[key]);
          }

          if (editorRef.current) {
            editorRef.current.innerHTML = contentHtml;
          }
        }
      } else {
        autoFillCurrentEditor(newProfile);
      }

      showToast(
        language === "ta" 
          ? "சான்றிலிருந்து விவரங்கள் வெற்றிகரமாகப் பெறப்பட்டு, புதிய சுயவிவரம் உருவாக்கப்பட்டது மற்றும் மாதிரிப் படிவத்தில் விவரங்கள் தானாக நிரப்பப்பட்டன!" 
          : "Details extracted, profile created, and document auto-filled successfully!", 
        'success'
      );
      setExtractedResult(null);
    } catch (err: any) {
      showToast(`சுயவிவர உருவாக்கப் பிழை: ${err.message}`, 'error');
    }
  };

  // AI Mode operations
  const handleAnalyzeTemplate = async () => {
    if (!editorRef.current) return;
    const content = editorRef.current.innerHTML.replace(/<p><br><\/p>/g, "").trim();
    if (content.length < 20) {
      setAiAnalysisResult(null);
      return;
    }

    setIsAnalyzingTemplate(true);
    setAiAnalysisError(null);
    try {
      const response = await fetch(getApiUrl("/api/word-ai-analyze"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateHtml: editorRef.current.innerHTML })
      });
      if (!response.ok) {
        throw new Error("சேவையகத்தில் மேலாய்வு பிழை ஏற்பட்டது.");
      }
      const data = await response.json();
      setAiAnalysisResult(data);
      
      const initialSlots: any = {};
      if (data.requiredDocs) {
        data.requiredDocs.forEach((doc: any) => {
          initialSlots[doc.id] = { isExtracting: false, fileName: "", extractedData: null, error: null };
        });
      }
      setAiUploadSlots(initialSlots);
    } catch (err: any) {
      console.error(err);
      setAiAnalysisError(err.message || "பகுப்பாய்வு தற்காலிகமாக செயலிழந்துள்ளது.");
    } finally {
      setIsAnalyzingTemplate(false);
    }
  };

  const handleSlotFileUpload = async (slotId: string, file: File, side?: 'front' | 'back') => {
    if (!file) return;
    
    // Obtain base64 representation of file
    const base64Str = await fileToBase64(file);

    // Update state to hold the uploaded file path, showing extraction progress
    setAiUploadSlots(prev => {
      const existing = prev[slotId] || { isExtracting: false, fileName: "", extractedData: null, error: null };
      
      let updatedFileName = file.name;
      let frontFile = existing.frontFile;
      let backFile = existing.backFile;

      if (side === 'front') {
        frontFile = { base64: base64Str, mimeType: file.type, name: file.name };
        updatedFileName = backFile 
          ? `முன்பக்கம்: ${file.name} | பின்பக்கம்: ${backFile.name}`
          : `முன்பக்கம்: ${file.name} (பின்பக்கம் தேவை)`;
      } else if (side === 'back') {
        backFile = { base64: base64Str, mimeType: file.type, name: file.name };
        updatedFileName = frontFile
          ? `முன்பக்கம்: ${frontFile.name} | பின்பக்கம்: ${file.name}`
          : `பின்பக்கம்: ${file.name} (முன்பக்கம் தேவை)`;
      }

      return {
        ...prev,
        [slotId]: {
          ...existing,
          isExtracting: true,
          fileName: updatedFileName,
          frontFile,
          backFile,
          error: null
        }
      };
    });

    try {
      const currentSlot = aiUploadSlots[slotId];
      const frontFileObj = side === 'front' ? { base64: base64Str, mimeType: file.type } : currentSlot?.frontFile;
      const backFileObj = side === 'back' ? { base64: base64Str, mimeType: file.type } : currentSlot?.backFile;

      const activeImages: { base64: string; mimeType: string }[] = [];
      if (frontFileObj) {
        activeImages.push({ base64: frontFileObj.base64, mimeType: frontFileObj.mimeType });
      }
      if (backFileObj) {
        activeImages.push({ base64: backFileObj.base64, mimeType: backFileObj.mimeType });
      }
      if (activeImages.length === 0) {
        activeImages.push({ base64: base64Str, mimeType: file.type });
      }

      const response = await fetch(getApiUrl("/api/extract"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: activeImages })
      });

      if (!response.ok) {
        throw new Error("சான்றிலிருந்து விவரங்களை எடுக்க சேவையகம் மறுத்துவிட்டது.");
      }

      const extracted = await response.json();

      setAiUploadSlots(prev => {
        const existing = prev[slotId];
        return {
          ...prev,
          [slotId]: {
            ...existing,
            isExtracting: false,
            extractedData: extracted,
            error: null
          }
        };
      });
      showToast(language === 'ta' ? "அடையாள அட்டை வெற்றிகரமாக பகுப்பாய்வு செய்யப்பட்டது!" : "Proof successfully decrypted and read!", 'success');
    } catch (err: any) {
      console.error(err);
      setAiUploadSlots(prev => {
        const existing = prev[slotId];
        return {
          ...prev,
          [slotId]: {
            ...existing,
            isExtracting: false,
            error: err.message || "பிழை ஏற்பட்டுள்ளது."
          }
        };
      });
      showToast(language === 'ta' ? "அடையாள ஆவணத்தைப் படிக்க இயலவில்லை." : "Failed to parse proof details.", 'error');
    }
  };

  const handleAiSmartFill = async () => {
    if (!editorRef.current) return;
    
    const consolidated: any = {};
    Object.keys(aiUploadSlots).forEach(slotId => {
      const slot = aiUploadSlots[slotId];
      if (slot && slot.extractedData) {
        consolidated[slotId] = slot.extractedData;
      }
    });

    if (Object.keys(consolidated).length === 0) {
      showToast(language === 'ta' ? "தயவுசெய்து முதலில் குறைந்தது ஒரு சான்றையாவது பதிவேற்றுங்கள்!" : "Please upload at least one document to extract!", 'error');
      return;
    }

    setIsFillingAI(true);
    try {
      const payload = {
        templateHtml: editorRef.current.innerHTML,
        extractedDetails: consolidated
      };

      const response = await fetch(getApiUrl("/api/word-ai-fill"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("ஏஐ தானாக பூர்த்தி செய்யும் சேவை தற்காலிகமாக அணைக்கப்பட்டுள்ளது.");
      }

      const data = await response.json();
      if (data.filledHtml) {
        editorRef.current.innerHTML = data.filledHtml;
        showToast(language === 'ta' ? "ஆவணம் ஏஐ கொண்டு வெற்றிகரமாக பூர்த்தி செய்யப்பட்டது!" : "Template dynamically filled using AI successfully!", 'success');
      } else {
        throw new Error("பழைய படிவம் மாறவில்லை.");
      }
    } catch (err: any) {
      console.error(err);
      showToast(language === 'ta' ? `பிழை: ${err.message}` : `Error filling: ${err.message}`, 'error');
    } finally {
      setIsFillingAI(false);
    }
  };

  // Trigger analysis automatically when entering AI tab
  useEffect(() => {
    if (activeTab === 'ai-mode') {
      handleAnalyzeTemplate();
    }
  }, [activeTab]);

  // Set default initial editor content & re-evaluate when activeProfile changes
  useEffect(() => {
    if (editorRef.current && (!editorRef.current.innerHTML.trim() || editorRef.current.innerHTML === "<p><br></p>")) {
      let evaluatedContent = templates[0].content;
      if (activeProfile) {
        const mapVars: { [key: string]: string } = {
          "\\${subjectProfile.nameTamil || subjectProfile.name || \"\\[வாடகைதாரர் பெயர்\\]\"}": activeProfile.nameTamil || activeProfile.name || "[வாடகைதாரர் பெயர்]",
          "\\${subjectProfile.fatherNameTamil || \"\\[வாடகைதாரர் தந்தை பெயர்\\]\"}": activeProfile.fatherNameTamil || "[வாடகைதாரர் தந்தை பெயர்]",
          "\\${subjectProfile.aadhaar || \"\\[ஆதார் எண்\\]\"}": activeProfile.aadhaar || "[ஆதார் எண்]",
          "\\${subjectProfile.phone || \"\\[வாடகைதாரர் கைபேசி\\]\"}": activeProfile.phone || "[வாடகைதாரர் கைபேசி]",
          "\\${subjectProfile.doorNo || \"\\[கதவு எண்\\]\"}": activeProfile.doorNo || "[கதவு எண்]",
          "\\${subjectProfile.streetNameTamil || \"\\[தெருப் பெயர்\\]\"}": activeProfile.streetNameTamil || "[தெருப் பெயர்]",
          "\\${subjectProfile.villageTamil || \"\\[கிராமம்\\]\"}": activeProfile.villageTamil || "[கிராமம்]",
          "\\${subjectProfile.talukTamil || \"\\[வட்டம்\\]\"}": activeProfile.talukTamil || "[வட்டம்]",
          "\\${subjectProfile.districtTamil || \"\\[மாவட்டம்\\]\"}": activeProfile.districtTamil || "[மாவட்டம்]",
          "\\${subjectProfile.pincode || \"\\[அஞ்சல் குறியீடு\\]\"}": activeProfile.pincode || "[அஞ்சல் குறியீடு]",
          "\\${subjectProfile.smartCard || \"\\[ரேஷன் எண்\\]\"}": activeProfile.smartCard || "[ரேஷன் எண்]",
          "\\${subjectProfile.nameTamil || subjectProfile.name || \"_____________________\"}": activeProfile.nameTamil || activeProfile.name || "_____________________",
          "\\${subjectProfile.fatherNameTamil || \"_____________________\"}": activeProfile.fatherNameTamil || "_____________________",
          "\\${subjectProfile.doorNo || \"_______\"}": activeProfile.doorNo || "_______",
          "\\${subjectProfile.streetNameTamil || \"_____________________\"}": activeProfile.streetNameTamil || "_____________________",
          "\\${subjectProfile.villageTamil || \"_____________________\"}": activeProfile.villageTamil || "_____________________",
          "\\${subjectProfile.talukTamil || \"_____________________\"}": activeProfile.talukTamil || "_____________________",
          "\\${subjectProfile.districtTamil || \"___________________\"}": activeProfile.districtTamil || "___________________",
          "\\${subjectProfile.villageTamil || \"_________\"}": activeProfile.villageTamil || "_________",
          "\\${currentDateTamil}": currentDateTamil,
          "\\${subjectProfile.nameTamil || subjectProfile.name || \"\\[எழுதிக்கொடுப்பவர் பெயர்\\]\"}": activeProfile.nameTamil || activeProfile.name || "[எழுதிக்கொடுப்பவர் பெயர்]"
        };

        for (const key in mapVars) {
          const regex = new RegExp(key, "g");
          evaluatedContent = evaluatedContent.replace(regex, mapVars[key]);
        }
      }
      editorRef.current.innerHTML = evaluatedContent;
    }
  }, [activeProfile]);

  const handleLoadTemplate = (content: string, titleTamil: string, tplId: string) => {
    setSelectedTemplateId(tplId);
    if (editorRef.current) {
      let evaluatedContent = content;
      const targetProfile = activeProfile || {};
      const mapVars: { [key: string]: string } = {
        "\\${subjectProfile.nameTamil || subjectProfile.name || \"\\[வாடகைதாரர் பெயர்\\]\"}": targetProfile.nameTamil || targetProfile.name || "[வாடகைதாரர் பெயர்]",
        "\\${subjectProfile.fatherNameTamil || \"\\[வாடகைதாரர் தந்தை பெயர்\\]\"}": targetProfile.fatherNameTamil || "[வாடகைதாரர் தந்தை பெயர்]",
        "\\${subjectProfile.aadhaar || \"\\[ஆதார் எண்\\]\"}": targetProfile.aadhaar || "[ஆதார் எண்]",
        "\\${subjectProfile.phone || \"\\[வாடகைதாரர் கைபேசி\\]\"}": targetProfile.phone || "[வாடகைதாரர் கைபேசி]",
        "\\${subjectProfile.doorNo || \"\\[கதவு எண்\\]\"}": targetProfile.doorNo || "[கதவு எண்]",
        "\\${subjectProfile.streetNameTamil || \"\\[தெருப் பெயர்\\]\"}": targetProfile.streetNameTamil || "[தெருப் பெயர்]",
        "\\${subjectProfile.villageTamil || \"\\[கிராமம்\\]\"}": targetProfile.villageTamil || "[கிராமம்]",
        "\\${subjectProfile.talukTamil || \"\\[வட்டம்\\]\"}": targetProfile.talukTamil || "[வட்டம்]",
        "\\${subjectProfile.districtTamil || \"\\[மாவட்டம்\\]\"}": targetProfile.districtTamil || "[மாவட்டம்]",
        "\\${subjectProfile.pincode || \"\\[அஞ்சல் குறியீடு\\]\"}": targetProfile.pincode || "[அஞ்சல் குறியீடு]",
        "\\${subjectProfile.smartCard || \"\\[ரேஷன் எண்\\]\"}": targetProfile.smartCard || "[ரேஷன் எண்]",
        "\\${subjectProfile.nameTamil || subjectProfile.name || \"_____________________\"}": targetProfile.nameTamil || targetProfile.name || "_____________________",
        "\\${subjectProfile.fatherNameTamil || \"_____________________\"}": targetProfile.fatherNameTamil || "_____________________",
        "\\${subjectProfile.doorNo || \"_______\"}": targetProfile.doorNo || "_______",
        "\\${subjectProfile.streetNameTamil || \"_____________________\"}": targetProfile.streetNameTamil || "_____________________",
        "\\${subjectProfile.villageTamil || \"_____________________\"}": targetProfile.villageTamil || "_____________________",
        "\\${subjectProfile.talukTamil || \"_____________________\"}": targetProfile.talukTamil || "_____________________",
        "\\${subjectProfile.districtTamil || \"___________________\"}": targetProfile.districtTamil || "___________________",
        "\\${subjectProfile.villageTamil || \"_________\"}": targetProfile.villageTamil || "_________",
        "\\${currentDateTamil}": currentDateTamil,
        "\\${subjectProfile.nameTamil || subjectProfile.name || \"\\[எழுதிக்கொடுப்பவர் பெயர்\\]\"}": targetProfile.nameTamil || targetProfile.name || "[எழுதிக்கொடுப்பவர் பெயர்]"
      };

      for (const key in mapVars) {
        const regex = new RegExp(key, "g");
        evaluatedContent = evaluatedContent.replace(regex, mapVars[key]);
      }
      editorRef.current.innerHTML = evaluatedContent;
      setDocumentTitle(titleTamil);
    }
  };

  // Basic editing execution helper
  const execCmd = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setTextColor(color);
    execCmd('foregroundColor', color);
  };

  const handleFontSizeChange = (size: string) => {
    setFontSize(size);
    execCmd('fontSize', size);
  };

  // Custom rich drop handler for inserting text at current pointer
  const handleDropText = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.dataTransfer.getData("text/plain");
    if (!text) return;

    if (document.caretRangeFromPoint) {
      const range = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (range) {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
          
          const insertSpan = document.createElement("b");
          insertSpan.className = "text-blue-700 bg-blue-50/80 border border-blue-200 rounded px-1.5 py-0.5 font-extrabold mx-1";
          insertSpan.innerText = text;
          
          range.insertNode(insertSpan);
          range.setStartAfter(insertSpan);
          range.setEndAfter(insertSpan);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    } else {
      execCmd("insertText", text);
    }
  };

  const copyHTML = () => {
    if (editorRef.current) {
      navigator.clipboard.writeText(editorRef.current.innerText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    if (!editorRef.current) return;
    const printContent = editorRef.current.innerHTML;

    // Create temporary wrapper
    const printDiv = document.createElement("div");
    printDiv.id = "word-editor-print-wrapper";
    printDiv.innerHTML = printContent;
    document.body.appendChild(printDiv);

    // Create printable style definitions
    const style = document.createElement("style");
    style.id = "word-editor-print-style";
    style.innerHTML = `
      @media print {
        body > *:not(#word-editor-print-wrapper) {
          display: none !important;
        }
        body {
          background-color: #ffffff !important;
          color: #000000 !important;
        }
        #word-editor-print-wrapper {
          display: block !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          padding: 2cm !important;
          box-sizing: border-box !important;
          font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif !important;
          line-height: 1.8 !important;
          font-size: 14px !important;
        }
        /* Preserve critical tables layout */
        #word-editor-print-wrapper table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin-top: 15px !important;
          margin-bottom: 15px !important;
        }
        #word-editor-print-wrapper table, #word-editor-print-wrapper th, #word-editor-print-wrapper td {
          border: 1px solid #000000 !important;
          padding: 8px !important;
        }
        #word-editor-print-wrapper p {
          margin-bottom: 12px !important;
        }
      }
    `;
    document.head.appendChild(style);

    // Run browser print routine
    window.print();

    // Clean up helper tags after a brief delay
    setTimeout(() => {
      if (document.getElementById("word-editor-print-wrapper")) {
        document.body.removeChild(printDiv);
      }
      if (document.getElementById("word-editor-print-style")) {
        document.head.removeChild(style);
      }
    }, 1500);
  };

  const downloadDocFile = () => {
    if (!editorRef.current) return;
    
    const content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>${documentTitle}</title>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            font-size: 12pt;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        ${editorRef.current.innerHTML}
      </body>
      </html>
    `;
    
    const blob = new Blob(['\ufeff' + content], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${documentTitle.replace(/\s+/g, '_')}_${Date.now()}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setShowClearConfirm(true);
  };

  const confirmClearContent = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = "<p><br></p>";
    }
    setShowClearConfirm(false);
  };

  const zoomIn = () => {
    if (zoomLevel < 130) setZoomLevel(zoomLevel + 10);
  };

  const zoomOut = () => {
    if (zoomLevel > 70) setZoomLevel(zoomLevel - 10);
  };

  const draggableFields = [
    { label: "பெயர் (Name)", value: subjectProfile.nameTamil || subjectProfile.name || "" },
    { label: "தந்தை பெயர் (Father's Name)", value: subjectProfile.fatherNameTamil || subjectProfile.fatherName || "" },
    { label: "ஆதார் எண் (Aadhaar No)", value: subjectProfile.aadhaar || "" },
    { label: "கைபேசி எண் (Phone)", value: subjectProfile.phone || "" },
    { label: "கதவு எண் (Door No)", value: subjectProfile.doorNo || "" },
    { label: "தெருப் பெயர் (Street)", value: subjectProfile.streetNameTamil || "" },
    { label: "கிராமம் (Village)", value: subjectProfile.villageTamil || "" },
    { label: "வட்டம் (Taluk)", value: subjectProfile.talukTamil || "" },
    { label: "மாவட்டம் (District)", value: subjectProfile.districtTamil || "" },
    { label: "அஞ்சல் குறியீடு (Pincode)", value: subjectProfile.pincode || "" },
    { label: "ரேஷன் எண் (Smart Card)", value: subjectProfile.smartCard || "" },
    { label: "CAN எண் (CAN Number)", value: subjectProfile.canNumber || "" },
    { label: "வங்கிப் பெயர் (Bank)", value: subjectProfile.bankName || "" },
    { label: "கணக்கு எண் (Bank Account No)", value: subjectProfile.accountNumber || "" },
    { label: "IFSC குறியீடு (IFSC Code)", value: subjectProfile.ifscCode || "" }
  ].filter(f => f.value.trim() !== "");

  return (
    <div className="flex flex-col bg-slate-50 rounded-[2rem] border border-slate-200 overflow-hidden shadow-2xl w-full">
      
      {/* 1. PROFESSIONAL OFFICE TOOLBAR & HEADER (COMPACT AND MULTI-ROW FOR EXCELLENT VIEWPORT USE) */}
      <div className="bg-white border-b border-slate-200 shadow-xs flex flex-col">
        
        {/* Row 1: App Header, Document Title Input, Sidebar Collapser, Print/Download Actions */}
        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100">
          <div className="flex items-center gap-4">
            {onBack && (
              <button 
                onClick={onBack}
                className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-all cursor-pointer flex items-center justify-center border border-slate-200 shrink-0 select-none active:scale-95" 
                title="பின்செல்ல"
              >
                <ChevronLeft size={16} strokeWidth={3} className="text-slate-800" />
              </button>
            )}
            
            {/* Folder Icon, Title, and Auto-save notification */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                <FileText size={18} strokeWidth={2.5} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-0 outline-none font-black text-sm text-slate-900 w-48 sm:w-64 transition-all px-0 py-0.5 leading-tight uppercase font-sans py-0"
                    title="ஆவணத்தின் பெயர்"
                    placeholder="உரிமை பத்திரம் வரைவு"
                  />
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-[8px] font-black text-emerald-600 uppercase bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                    ● சேமிக்கப்பட்டது (Saved)
                  </span>
                  {uploadFeedback && (
                    <span className="inline-flex items-center gap-1 text-[8.5px] font-black text-blue-600 uppercase bg-blue-50 border border-blue-150 px-2 py-0.5 rounded animate-pulse">
                      ℹ️ {uploadFeedback}
                    </span>
                  )}
                </div>
                <p className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest mt-0.5 leading-none">
                  CSC E-SEVAI WORD AUTOMATOR DRAFT ENGINE
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Hidden Input File Element for Direct docx load */}
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".docx,.doc" 
              className="hidden" 
            />

            {/* AI Mode Sparkles Activation Button */}
            <button
              onClick={() => {
                setIsSidebarCollapsed(false);
                setActiveTab('ai-mode');
              }}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'ai-mode' && !isSidebarCollapsed
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-transparent shadow-lg shadow-indigo-500/20 scale-105'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
              }`}
              title="ஏஐ ஆட்டோமேஷன் பயன்முறை (AI Automation Mode)"
            >
              <Sparkles size={12} strokeWidth={2.5} className={activeTab === 'ai-mode' ? "animate-spin text-white" : "text-indigo-600"} />
              <span>ஏஐ பயன்முறை (AI Mode)</span>
            </button>

            {/* Sidebar Collapser Button to maximize editing viewport width! */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all cursor-pointer flex items-center gap-2 ${
                isSidebarCollapsed 
                  ? 'bg-blue-50 border-blue-200 text-blue-700 animate-pulse' 
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title={isSidebarCollapsed ? "பக்க பேனலைக் காட்டு" : "பக்க பேனலை மறை"}
            >
              {isSidebarCollapsed ? <Eye size={12} strokeWidth={2.5} /> : <EyeOff size={12} strokeWidth={2.5} />}
              <span className="hidden sm:inline">
                {isSidebarCollapsed ? "விவரக் காட்டகம் (Show Sidebar)" : "சுருக்கவும் (Maximize View)"}
              </span>
            </button>

            {/* Direct Word Document Upload Option */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md shadow-emerald-600/10 active:scale-95 transition-all text-center flex items-center gap-2 cursor-pointer border border-transparent"
              title="கணினியிலிருந்து .docx கோப்பை நேரடியாக ஏற்றவும் (Upload Word DOCX)"
            >
              <Upload size={12} strokeWidth={2.5} />
              <span>{language === 'ta' ? 'Word கோப்பை ஏற்று' : 'Upload DOCX'}</span>
            </button>

            {/* Print and Download Actions */}
            <button 
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md shadow-blue-600/10 active:scale-95 transition-all text-center flex items-center gap-2 cursor-pointer border border-transparent"
            >
              <Printer size={12} strokeWidth={2.5} />
              <span>{language === 'ta' ? 'அச்சிடு' : 'Print'}</span>
            </button>
            <button 
              type="button"
              onClick={downloadDocFile}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md active:scale-95 transition-all text-center flex items-center gap-2 cursor-pointer border border-transparent"
            >
              <Download size={12} strokeWidth={2.5} />
              <span className="hidden sm:inline">{language === 'ta' ? 'பதிவிறக்கு (.DOC)' : 'Save .doc'}</span>
              <span className="sm:hidden">.DOC</span>
            </button>
          </div>
        </div>

        {/* Row 2: Rich Microsoft Word Editing Controls Toolbar */}
        <div className="px-6 py-3 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Style Controls (Bold, Italic, Underline) */}
            <div className="flex items-center gap-0.5 bg-white border border-slate-200 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => execCmd('bold')}
                className="p-1 px-2.5 hover:bg-slate-100 rounded text-slate-700 hover:text-slate-900 transition-colors font-bold cursor-pointer"
                title="தடிமன் (Bold)"
              >
                <Bold size={13} className="stroke-[3]" />
              </button>
              <button
                type="button"
                onClick={() => execCmd('italic')}
                className="p-1 px-2.5 hover:bg-slate-100 rounded text-slate-700 hover:text-slate-900 transition-colors font-bold cursor-pointer"
                title="சாய்வு (Italic)"
              >
                <Italic size={13} className="stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={() => execCmd('underline')}
                className="p-1 px-2.5 hover:bg-slate-100 rounded text-slate-700 hover:text-slate-900 transition-colors font-bold cursor-pointer"
                title="அடிக்கோடு (Underline)"
              >
                <Underline size={13} className="stroke-[2.5]" />
              </button>
            </div>

            {/* Alignments Controls */}
            <div className="flex items-center gap-0.5 bg-white border border-slate-200 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => execCmd('justifyLeft')}
                className="p-1 px-2 hover:bg-slate-100 rounded text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                title="இடது பத்தி"
              >
                <AlignLeft size={13} />
              </button>
              <button
                type="button"
                onClick={() => execCmd('justifyCenter')}
                className="p-1 px-2 hover:bg-slate-100 rounded text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                title="நடு பத்தி"
              >
                <AlignCenter size={13} />
              </button>
              <button
                type="button"
                onClick={() => execCmd('justifyRight')}
                className="p-1 px-2 hover:bg-slate-100 rounded text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                title="வலது பத்தி"
              >
                <AlignRight size={13} />
              </button>
              <button
                type="button"
                onClick={() => execCmd('justifyFull')}
                className="p-1 px-2 hover:bg-slate-100 rounded text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                title="பத்திச் சீரமைப்பு"
              >
                <AlignJustify size={13} />
              </button>
            </div>

            {/* Blocks & Lists Formatting */}
            <div className="flex items-center gap-0.5 bg-white border border-slate-200 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => execCmd('formatBlock', '<h2>')}
                className="px-2 py-1 hover:bg-slate-100 rounded text-slate-700 hover:text-indigo-600 transition-all font-black text-[10px] cursor-pointer"
                title="H2 தலைப்பு"
              >
                H1
              </button>
              <button
                type="button"
                onClick={() => execCmd('formatBlock', '<p>')}
                className="px-2 py-1 hover:bg-slate-100 rounded text-slate-700 hover:text-indigo-600 transition-all font-black text-[10px] cursor-pointer"
                title="சாதாரண உரை (Paragraph)"
              >
                P
              </button>
              <button
                type="button"
                onClick={() => execCmd('insertUnorderedList')}
                className="p-1 px-2 hover:bg-slate-100 rounded text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                title="வரிசைப்படுத்தப்படாத பட்டியல்"
              >
                <List size={13} />
              </button>
            </div>

            {/* Fonts & Sizes Dropdowns */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
              <span className="text-[8px] font-black text-slate-400 uppercase leading-none select-none">எழுத்துவகை:</span>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value as any)}
                className="bg-transparent border-0 text-[10px] font-extrabold uppercase text-slate-700 hover:text-teal-700 focus:ring-0 outline-none cursor-pointer py-0.5"
                title="font"
              >
                <option value="font-sans">Inter (Sans)</option>
                <option value="font-serif">Tamil Editorial (Serif)</option>
                <option value="font-mono">Mono (Space)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
              <span className="text-[8px] font-black text-slate-400 uppercase leading-none select-none">அளவு:</span>
              <select
                value={fontSize}
                onChange={(e) => handleFontSizeChange(e.target.value)}
                className="bg-transparent border-0 text-[10px] font-extrabold uppercase text-slate-700 hover:text-teal-700 focus:ring-0 outline-none cursor-pointer py-0.5"
                title="font size"
              >
                <option value="2">சிறிய</option>
                <option value="3">இயல்பு</option>
                <option value="4">பெரிய</option>
                <option value="5">மிகப் பெரிய</option>
              </select>
            </div>

            {/* Color Input */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg">
              <label htmlFor="font-color-picker" className="text-[8px] font-black text-slate-400 uppercase leading-none select-none">நிறம்:</label>
              <input 
                id="font-color-picker"
                type="color" 
                value={textColor}
                onChange={handleColorChange}
                className="w-4 h-4 bg-transparent border-0 cursor-pointer rounded-full outline-none p-0" 
                title="அெழுத்து நிறம் தேர்வு செய்"
              />
            </div>
            
            {/* Erase layout formatting */}
            <button
              type="button"
              onClick={() => execCmd('removeFormat')}
              className="p-1 px-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
              title="எழுத்து வடிவங்களை நீக்கு (Clear Formatting)"
            >
              <Eraser size={13} />
            </button>
          </div>

          {/* Right Align Zoom Controls & Clear canvas buttons */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
              <button 
                type="button"
                onClick={zoomOut}
                className="p-1 px-2 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded shrink-0 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={12} />
              </button>
              <span className="text-[9.5px] font-black text-slate-700 select-none w-10 text-center">{zoomLevel}%</span>
              <button 
                type="button"
                onClick={zoomIn}
                className="p-1 px-2 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded shrink-0 transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={12} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleClear}
              className="p-1 py-1.5 px-3 bg-red-50 hover:bg-red-600 border border-red-100 hover:border-red-600 text-red-600 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              title="பக்கத்தை துடை"
            >
              <Trash2 size={11} />
              <span>துடைக்கவும் (Clear)</span>
            </button>
          </div>
        </div>

      </div>

      {/* 2. SPLIT LAYOUT: COLLAPSIBLE SIDEBAR + DYNAMIC ZOOMED EDITING SHEET */}
      <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[600px] w-full">
        
        {/* SIDEBAR: COLLAPSED OF LOGICAL SPACING */}
        <AnimatePresence initial={false}>
          {!isSidebarCollapsed && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="col-span-1 lg:col-span-3 border-r border-slate-200 bg-white flex flex-col shrink-0 overflow-hidden"
            >
              <div className="p-4 flex flex-col h-full space-y-4">
                
                {/* Tabs to select Templates or profiles */}
                <div className="flex p-0.5 bg-slate-100 rounded-xl border border-slate-200 gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('templates')}
                    className={`flex-1 py-2 text-[8px] font-black uppercase tracking-tight rounded-lg transition-all cursor-pointer ${
                      activeTab === 'templates' 
                        ? "bg-slate-900 text-white shadow-xs" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <BookOpen size={9} />
                      <span>மாதிரிகள்</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className={`flex-1 py-2 text-[8px] font-black uppercase tracking-tight rounded-lg transition-all cursor-pointer ${
                      activeTab === 'profile' 
                        ? "bg-slate-900 text-white shadow-xs" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <User size={9} />
                      <span>தரவுகள்</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ai-mode')}
                    className={`flex-1 py-2 text-[8px] font-black uppercase tracking-tight rounded-lg transition-all cursor-pointer ${
                      activeTab === 'ai-mode' 
                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs font-black" 
                        : "text-indigo-600 hover:bg-indigo-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <Sparkles size={9} className={activeTab === 'ai-mode' ? "text-white" : "text-indigo-500"} />
                      <span>ஏஐ பயன்முறை</span>
                    </div>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[650px] pr-1 space-y-3">
                  {activeTab === 'templates' ? (
                    <div className="space-y-2 pt-1 font-sans">
                      <p className="text-[8px] font-black tracking-widest text-slate-400 uppercase mb-3 pl-0.5">
                        மாதிரி படிவங்கள் / பத்திரம்:
                      </p>
                      {templates.map((tpl) => (
                        <button
                          key={tpl.id}
                          onClick={() => handleLoadTemplate(tpl.content, tpl.title, tpl.id)}
                          className="w-full p-3.5 rounded-xl bg-slate-50 hover:bg-slate-900/5 text-left border border-slate-200 shadow-xs hover:border-indigo-400 transition-all group flex flex-col gap-1 relative cursor-pointer"
                        >
                          <div className="flex items-center justify-between pointer-events-none w-full">
                            <span className="text-[10.5px] font-black text-slate-800 group-hover:text-blue-700 transition-colors">
                              {tpl.title}
                            </span>
                            <ChevronRight size={11} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0" />
                          </div>
                          <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider leading-relaxed pointer-events-none">
                            {tpl.titleEn} • {tpl.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : activeTab === 'profile' ? (
                    <div className="space-y-3 pt-1 font-sans">
                      <div className="pl-0.5">
                        <div className="flex items-center justify-between">
                          <p className="text-[8px] font-black tracking-widest text-slate-400 uppercase">
                            இழுத்து ஒட்டும் தரவுகள்:
                          </p>
                          {activeProfile ? (
                            <span className="text-[7px] font-black text-emerald-600 uppercase bg-emerald-50 px-1.5 py-0.5 border border-emerald-150 rounded">
                              வாடிக்கையாளர் தரவு
                            </span>
                          ) : (
                            <span className="text-[7px] font-black text-rose-600 uppercase bg-rose-50 px-1.5 py-0.5 border border-rose-150 rounded animate-pulse">
                              தரவு இல்லை
                            </span>
                          )}
                        </div>
                      </div>

                      {!activeProfile ? (
                        <div className="bg-rose-50/50 border border-rose-150 rounded-2xl p-5 text-center space-y-3 mt-4">
                          <p className="text-[10px] font-black text-rose-700 uppercase tracking-wider leading-relaxed">
                            சுயவிவரம் தேர்ந்தெடுக்கப்படவில்லை!
                          </p>
                          <p className="text-[9px] font-bold text-slate-500 leading-relaxed">
                            தயவுசெய்து முகப்புப் பக்கத்திற்குச் (Dashboard) சென்று ஒரு வாடிக்கையாளரைத் தேர்வு செய்யவும். அப்போதுதான் அவர்களின் உண்மையான விவரங்களை இங்கு பயன்படுத்த முடியும்.
                          </p>
                        </div>
                      ) : (
                        <>
                          <p className="text-[8px] font-bold text-slate-400 uppercase leading-normal mt-1.5 pl-0.5">
                            💡 விவரத்தை பிடித்து வலது பக்கத்தில் இழுத்து போடவும் (Drag and drop details directly onto A4 page).
                          </p>

                          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                            {draggableFields.map((field, idx) => (
                              <div
                                key={idx}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.effectAllowed = 'copy';
                                  e.dataTransfer.setData('text/plain', field.value);
                                  e.dataTransfer.dropEffect = 'copy';
                                  (e.currentTarget as HTMLElement).classList.add('opacity-40');
                                }}
                                onDragEnd={(e) => {
                                  (e.currentTarget as HTMLElement).classList.remove('opacity-40');
                                }}
                                className="bg-slate-50/50 p-2 border border-slate-200 hover:border-indigo-400 rounded-lg flex items-center justify-between gap-2 text-left hover:bg-slate-50 transition-all cursor-grab active:cursor-grabbing drag-handle-cursor"
                                title="Drag onto the paper to write"
                              >
                                <div className="min-w-0 flex-1">
                                  <span className="block text-[7px] font-bold text-indigo-500 tracking-wider uppercase leading-none">
                                    {field.label}
                                  </span>
                                  <span className="block text-[10px] font-black text-slate-800 truncate mt-1">
                                    {field.value}
                                  </span>
                                </div>
                                <div className="w-5 h-5 rounded bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-150 transition-colors">
                                  <Hand size={10} className="animate-pulse" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4 pt-1 font-sans text-left">
                      <div className="flex items-center justify-between pl-0.5 border-b border-indigo-100 pb-2">
                        <p className="text-[10px] font-black tracking-widest text-indigo-600 uppercase flex items-center gap-1.5">
                          <Sparkles size={11} className="text-indigo-600 animate-pulse" />
                          <span>ஏஐ ஆட்டோமேஷன்</span>
                        </p>
                        <span className="text-[7.5px] font-black text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 border border-indigo-150 rounded">
                          Gemini 2.5 Active
                        </span>
                      </div>

                      {/* Check if editor is empty or too short */}
                      {(!editorRef.current || editorRef.current.innerHTML.replace(/<p><br><\/p>/g, "").trim().length < 20) ? (
                        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-4 text-center">
                          <p className="text-[11px] font-black text-amber-800 uppercase tracking-wider leading-relaxed flex items-center gap-1 justify-center">
                            ⚠️ வரைவு உரை ஏதுமில்லை!
                          </p>
                          <p className="text-[9.5px] font-medium text-slate-600 leading-relaxed">
                            தயவுசெய்து முதலில் மாதிரிப் படிவத்தைத் (Template) தேர்வு செய்யவும் அல்லது ஆவணத்தை உள்ளிடவும்! காலியாக உள்ள ஆவணத்தில் ஆட்டோமேஷன் செயல்படாது.
                          </p>
                          <button
                            type="button"
                            onClick={() => setActiveTab('templates')}
                            className="w-full py-2.5 bg-amber-600 hover:bg-amber-705 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition-all cursor-pointer block text-center active:scale-95"
                          >
                            படிவங்கள் பகுதிக்குச் செல்ல (Go to Templates)
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {isAnalyzingTemplate ? (
                            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5">
                              <Loader2 className="w-7 h-7 animate-spin text-indigo-600 mx-auto" />
                              <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider animate-pulse leading-snug">
                                வரைவு ஆவணம் பகுப்பாய்வு செய்யப்படுகிறது...
                              </p>
                            </div>
                          ) : aiAnalysisError ? (
                            <div className="p-5 bg-red-50 border border-red-200 rounded-2xl text-center space-y-3">
                              <p className="text-[10.5px] font-black text-red-700 uppercase leading-normal">
                                பகுப்பாய்வு செய்வதில் பிழை:
                              </p>
                              <p className="text-[9.5px] font-bold text-slate-600 leading-relaxed">
                                {aiAnalysisError}
                              </p>
                              <button
                                type="button"
                                onClick={handleAnalyzeTemplate}
                                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-[9.5px] font-black uppercase rounded-xl cursor-pointer shadow-md"
                              >
                                மீண்டும் முயலவும் (Retry)
                              </button>
                            </div>
                          ) : !aiAnalysisResult ? (
                            <div className="p-5 border border-dashed border-indigo-200 rounded-2xl text-center space-y-4 bg-indigo-50/10">
                              <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
                                ஆவணத்திலுள்ள வரைவை ஏஐ படித்து, தேவைப்படும் அடையாள ஆவணங்களைக் கண்டறிந்து உங்களிடம் கேட்கும்.
                              </p>
                              <button
                                type="button"
                                onClick={handleAnalyzeTemplate}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <Sparkles size={11} className="text-white" />
                                <span>ஆவணத்தை பகுப்பாய்வு செய் (Analyze Draft)</span>
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="bg-indigo-50/10 border border-indigo-100 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center justify-between border-b border-indigo-100/50 pb-2">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none">வரைவு வகை:</span>
                                  <span className="text-[9px] font-black text-indigo-700 uppercase bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded">
                                    {aiAnalysisResult.documentType || "Official Document"}
                                  </span>
                                </div>
                                <p className="text-[11px] font-bold text-slate-800 leading-relaxed text-left">
                                  {aiAnalysisResult.analysisTamil}
                                </p>
                                <div className="pt-1.5">
                                  <button
                                    type="button"
                                    onClick={handleAnalyzeTemplate}
                                    className="text-[8px] font-black text-indigo-500 hover:text-indigo-700 uppercase tracking-wider flex items-center gap-1.5"
                                  >
                                    <RefreshCw size={9} />
                                    <span>வரைவை மறு ஆய்வு செய் (Re-Analyze Draft)</span>
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <p className="text-[8.5px] font-black tracking-widest text-slate-400 uppercase pl-0.5 leading-none">
                                  தேவைப்படும் அடையாளச் சான்றுகள் (Required Uploads):
                                </p>

                                {aiAnalysisResult.requiredDocs && aiAnalysisResult.requiredDocs.map((doc: any) => {
                                  const slot = aiUploadSlots[doc.id] || { isExtracting: false, fileName: "", extractedData: null, error: null };
                                  return (
                                    <div key={doc.id} className="bg-slate-50/50 border border-slate-200.5 rounded-xl p-3.5 space-y-3 text-left">
                                      <div className="flex items-center justify-between">
                                        <p className="text-[11px] font-extrabold text-slate-800 leading-tight">
                                          {doc.label}
                                        </p>
                                        <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-wider bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded leading-none shrink-0">
                                          {doc.partyType}
                                        </span>
                                      </div>

                                      {slot.isExtracting && (
                                        <div className="py-3 flex items-center justify-center gap-2 bg-indigo-50 border border-indigo-150 rounded-lg animate-pulse shadow-3xs">
                                          <Loader2 size={12} className="animate-spin text-indigo-600" />
                                          <span className="text-[9px] font-black text-indigo-700 uppercase">சான்றை ஏஐ வாசிக்கிறது...</span>
                                        </div>
                                      )}

                                      {slot.extractedData && (
                                        <div className="space-y-2 bg-emerald-50/40 border border-emerald-150 rounded-lg p-3">
                                          <div className="flex items-center justify-between text-[7px] font-black text-emerald-600 uppercase border-b border-emerald-100 pb-1.5">
                                            <span>✅ விபரங்கள் வெற்றிகரமாக பெறப்பட்டன</span>
                                            <span className="truncate max-w-[120px] font-mono select-none">{slot.fileName}</span>
                                          </div>
                                          <div className="text-[10px] space-y-1 font-bold text-slate-700 leading-tight">
                                            <p><span className="text-slate-400 font-medium">பெயர்:</span> {slot.extractedData.applicantNameTamil || slot.extractedData.applicantName || "குறிப்பிடப்படவில்லை"}</p>
                                            {slot.extractedData.aadhaarNumber && <p><span className="text-slate-400 font-medium">ஆதார்:</span> {slot.extractedData.aadhaarNumber}</p>}
                                            {slot.extractedData.rationCardNumber && <p><span className="text-slate-400 font-medium">குடும்ப அட்டை:</span> {slot.extractedData.rationCardNumber}</p>}
                                            {slot.extractedData.districtTa && <p><span className="text-slate-400 font-medium font-sans">மாவட்டம்:</span> {slot.extractedData.districtTa}</p>}
                                          </div>
                                        </div>
                                      )}

                                      {!slot.isExtracting && (
                                        <div className="space-y-2 pt-1">
                                          {doc.doubleSided ? (
                                            <div className="space-y-2">
                                              <div className="p-2 border border-dashed border-indigo-100 rounded-lg bg-indigo-50/20">
                                                <p className="text-[8px] font-black text-indigo-600 uppercase tracking-wider mb-0.5">
                                                  இருபுறமும் உள்ள அட்டை (Double-Sided Option)
                                                </p>
                                                <p className="text-[8.5px] font-medium text-slate-500 leading-normal">
                                                  முழு முகவரியைப் பெற முன்பக்கம் மற்றும் பின்பக்கம் இரண்டையும் பதிவேற்றுங்கள்.
                                                </p>
                                              </div>
                                              
                                              <div className="grid grid-cols-2 gap-2">
                                                <div className="flex flex-col gap-1">
                                                  <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider pl-0.5">
                                                    முன்பக்கம்:
                                                  </span>
                                                  <input
                                                    type="file"
                                                    id={`slot-upload-${doc.id}-front`}
                                                    className="hidden"
                                                    accept="image/*,application/pdf"
                                                    onChange={(e) => {
                                                      const file = e.target.files?.[0];
                                                      if (file) handleSlotFileUpload(doc.id, file, 'front');
                                                    }}
                                                  />
                                                  <label
                                                    htmlFor={`slot-upload-${doc.id}-front`}
                                                    className={`py-2 text-[8.5px] font-black uppercase rounded-lg border transition-all cursor-pointer text-center flex items-center justify-center gap-1 active:scale-95 shadow-3xs ${
                                                      slot.frontFile 
                                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' 
                                                        : 'bg-white hover:bg-indigo-50 border-slate-200 text-slate-700 hover:text-indigo-600'
                                                    }`}
                                                  >
                                                    <Upload size={8} />
                                                    <span>{slot.frontFile ? "முன்பக்கம் ✓" : "முன்பக்கம்"}</span>
                                                  </label>
                                                </div>

                                                <div className="flex flex-col gap-1">
                                                  <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider pl-0.5">
                                                    பின்பக்கம்:
                                                  </span>
                                                  <input
                                                    type="file"
                                                    id={`slot-upload-${doc.id}-back`}
                                                    className="hidden"
                                                    accept="image/*,application/pdf"
                                                    onChange={(e) => {
                                                      const file = e.target.files?.[0];
                                                      if (file) handleSlotFileUpload(doc.id, file, 'back');
                                                    }}
                                                  />
                                                  <label
                                                    htmlFor={`slot-upload-${doc.id}-back`}
                                                    className={`py-2 text-[8.5px] font-black uppercase rounded-lg border transition-all cursor-pointer text-center flex items-center justify-center gap-1 active:scale-95 shadow-3xs ${
                                                      slot.backFile 
                                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' 
                                                        : 'bg-white hover:bg-indigo-50 border-slate-200 text-slate-700 hover:text-indigo-600'
                                                    }`}
                                                  >
                                                    <Upload size={8} />
                                                    <span>{slot.backFile ? "பின்பக்கம் ✓" : "பின்பக்கம்"}</span>
                                                  </label>
                                                </div>
                                              </div>
                                            </div>
                                          ) : (
                                            <div>
                                              <input
                                                type="file"
                                                id={`slot-upload-${doc.id}`}
                                                className="hidden"
                                                accept="image/*,application/pdf"
                                                onChange={(e) => {
                                                  const file = e.target.files?.[0];
                                                  if (file) handleSlotFileUpload(doc.id, file);
                                                }}
                                              />
                                              <label
                                                htmlFor={`slot-upload-${doc.id}`}
                                                className="w-full py-2 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-400 text-slate-800 hover:text-indigo-600 font-black text-[9px] uppercase tracking-wider rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 active:scale-95 shadow-3xs"
                                              >
                                                <Upload size={10} className="text-slate-500" />
                                                <span>சான்றை பதிவேற்றவும் (Upload Proof)</span>
                                              </label>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {slot.error && (
                                        <p className="text-[8.5px] text-red-600 font-bold">⚠️ {slot.error}</p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Fill Document Trigger */}
                              <div className="pt-2">
                                <button
                                  type="button"
                                  onClick={handleAiSmartFill}
                                  disabled={isFillingAI}
                                  className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                                >
                                  {isFillingAI ? (
                                    <>
                                      <Loader2 size={12} className="animate-spin text-white" />
                                      <span>ஏஐ மூலம் நிரப்பப்படுகிறது...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles size={11} className="text-white shrink-0 animate-pulse" />
                                      <span>ஆவணத்தை ஏஐ மூலம் தானாக பூர்த்தி செய்</span>
                                    </>
                                  )}
                                </button>
                              </div>

                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 text-[8px] font-bold text-slate-400 uppercase pr-1">
                  💡 {language === "ta" 
                    ? "ஆவணத்தை முழு நிலைக்கு மாற்ற 'சுருக்கவும்' பட்டனை பயன்படுத்தவும்." 
                    : "Tip: Toggle 'Maximize View' at the top to hide this sidebar panel."}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DOCUMENT VIEW CONTAINER (REALISTIC GRAY WORKSPACE WITH CENTERING AND A4 SCALE CONTROLLER) */}
        <div className={`col-span-1 flex flex-col bg-slate-100 p-6 sm:p-10 overflow-y-auto ${isSidebarCollapsed ? 'lg:col-span-12' : 'lg:col-span-9'}`}>
          <div className="flex flex-col items-center justify-start w-full h-full min-h-[750px]">
            
            {/* Realistic A4 Draft Sheet Container conforming precisely to A4 ratios inside gray sheet margins */}
            <div 
              className="bg-white shadow-2xl border border-slate-300 relative rounded-sm hover:shadow-indigo-200/50 transition-all duration-300 focus-within:ring-2 focus-within:ring-indigo-400/50"
              style={{
                width: "100%",
                maxWidth: `${210 * (zoomLevel / 100)}mm`,
                minHeight: `${297 * (zoomLevel / 100)}mm`,
                // Realistic responsive padding mapped dynamically based on zoom scales
                padding: `${40 * (zoomLevel / 100)}px ${45 * (zoomLevel / 100)}px`,
                transformOrigin: "top center",
                margin: "0 auto",
              }}
            >
              
              {/* Subtle grid pattern helper indicator */}
              <div className="absolute top-1 right-2 flex items-center gap-1 opacity-20 hover:opacity-100 transition-opacity pointer-events-none select-none text-[6.5px] text-slate-500 font-black uppercase tracking-widest font-mono">
                <span>மாற்றுத் தரவுகள் இழுக்குமிடம் (Drop Target Area)</span>
                <Hand size={7} />
              </div>

              <style>{`
                #csc_wysiwyg_word_canvas p {
                  margin-bottom: 0.8rem;
                  line-height: 1.8;
                }
                #csc_wysiwyg_word_canvas h1, #csc_wysiwyg_word_canvas h2, #csc_wysiwyg_word_canvas h3 {
                  font-weight: bold;
                  margin-top: 1.2rem;
                  margin-bottom: 0.8rem;
                  color: #000000;
                }
                #csc_wysiwyg_word_canvas ul {
                  list-style-type: disc !important;
                  margin-left: 2rem !important;
                  margin-bottom: 1rem !important;
                  display: block !important;
                }
                #csc_wysiwyg_word_canvas ol {
                  list-style-type: decimal !important;
                  margin-left: 2rem !important;
                  margin-bottom: 1rem !important;
                  display: block !important;
                }
                #csc_wysiwyg_word_canvas li {
                  display: list-item !important;
                  margin-bottom: 0.4rem;
                }
                #csc_wysiwyg_word_canvas table {
                  width: 100% !important;
                  border-collapse: collapse !important;
                  margin: 1.5rem 0 !important;
                }
                #csc_wysiwyg_word_canvas table td, #csc_wysiwyg_word_canvas table th {
                  border: 1px solid #94a3b8 !important;
                  padding: 0.5rem !important;
                }
              `}</style>

              {/* Editable Content Workspace Area with real fallback styling */}
              <div 
                ref={editorRef}
                id="csc_wysiwyg_word_canvas"
                contentEditable
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDropText}
                className={`w-full outline-none text-slate-900 leading-relaxed antialiased focus:ring-0 ${fontFamily}`}
                style={{
                  wordBreak: "break-word",
                  fontSize: fontSize === "2" ? "12px" : fontSize === "3" ? "14px" : fontSize === "4" ? "17px" : "21px",
                  minHeight: "550px"
                }}
              />
              
            </div>

            {/* Quick clipboard box */}
            <div className="w-full max-w-2xl mt-8 bg-white border border-slate-200.5 p-3.5 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
              <div className="text-left">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">நகல் பலகை (Quick Clipboard Copy)</span>
                <p className="text-[9.5px] font-bold text-slate-500 mt-1 uppercase">
                  {language === "ta" 
                    ? "ஆவணத்தில் திருத்திய மொத்த உரையையும் ஒரே கிளிக்கில் சிஸ்டத்தில் நகலெடுக்கலாம்!" 
                    : "Copy completed text content directly to your operating system."}
                </p>
              </div>
              <button
                type="button"
                onClick={copyHTML}
                className="px-4 py-2 bg-indigo-50 border border-indigo-150 hover:bg-indigo-600 text-indigo-600 hover:text-white font-black text-[9px] uppercase tracking-widest rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-3xs"
              >
                {copied ? (
                  <>
                    <Check size={11} strokeWidth={2.5} className="text-green-500 animate-bounce" />
                    <span>நகலெடுக்கப்பட்டது!</span>
                  </>
                ) : (
                  <>
                    <Copy size={11} strokeWidth={2.5} />
                    <span>உரையை நகலெடு (Copy Plain Text)</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* 3. CUSTOM DIALOG FOR CLEAR CONFIRMATION */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
              onClick={() => setShowClearConfirm(false)}
            />
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="relative bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                  <Trash2 size={24} />
                </div>
                <div className="space-y-2">
                  <h3 className="font-extrabold text-base text-slate-900 uppercase tracking-tight">
                    {language === "ta" ? "ஆவணத்தை அழிக்க வேண்டுமா?" : "Clear Document?"}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    {language === "ta" 
                      ? "நீங்கள் தட்டச்சு செய்த இந்த முழு ஆவணத் தரவும் நிரந்தரமாக நீக்கப்படும். இந்தச் செயல்முறையைத் திரும்பப் பெற முடியாது." 
                      : "This will permanently empty the current draft content. This action cannot be undone."}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer active:scale-95"
                >
                  {language === "ta" ? "வேண்டாம்" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={confirmClearContent}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-md shadow-red-600/10 active:scale-95 transition-all cursor-pointer"
                >
                  {language === "ta" ? "ஆம், அழி" : "Yes, Clear"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
