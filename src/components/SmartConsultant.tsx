import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, FileText, Upload, CheckCircle, AlertCircle, Loader2, Clipboard, User, MapPin, Calendar, Smartphone } from 'lucide-react';
import { analyzeFormFields, extractDetailsFromDocuments } from '../services/geminiService';
import { compressToTargetSize } from '../lib/imageOptimizer';

export default function SmartConsultant() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<'idle' | 'requirements' | 'extracting' | 'results'>('idle');
  const [requirements, setRequirements] = useState<any[]>([]);
  const [advice, setAdvice] = useState('');
  const [extractedData, setExtractedData] = useState<any>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const handleSeekAdvice = async () => {
    if (!input) return;
    setLoading(true);
    try {
      const isUrl = input.includes('.');
      const analysis = await analyzeFormFields(
        [], 
        isUrl ? "Website Analysis" : input, 
        isUrl ? input : "Portal Search",
        input
      );
      setRequirements(analysis.requiredDocuments || []);
      setAdvice(analysis.specialInstructions || '');
      setStage('requirements');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, req: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(req.id);
    const reader = new FileReader();
    reader.onload = async () => {
      let base64 = reader.result as string;
      
      if (req.maxSizeKb && file.type.startsWith('image/')) {
        try {
          base64 = await compressToTargetSize(base64, req.maxSizeKb);
        } catch (err) {
          console.warn("Compression failed, using original");
        }
      }

      try {
        setStage('extracting');
        const extracted = await extractDetailsFromDocuments([{ base64, mimeType: file.type }]);
        setExtractedData(extracted);
        setStage('results');
      } catch (err) {
        alert("ஆவணத்தை வாசிப்பதில் பிழை.");
        setStage('requirements');
      } finally {
        setUploadingId(null);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-white border-4 border-slate-900 rounded-[3rem] p-1 shadow-[20px_20px_0px_0px_rgba(15,23,42,1)] overflow-hidden">
      <div className="bg-slate-900 px-8 py-6 flex items-center justify-between">
        <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Search size={18} />
          </div>
          AI ஸ்மார்ட் கன்சல்டன்ட் (AI Smart Consultant)
        </h3>
        {stage !== 'idle' && (
          <button 
            onClick={() => { setStage('idle'); setInput(''); }}
            className="text-[10px] bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-xl text-slate-400 font-black uppercase tracking-widest transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      <div className="p-8">
        <AnimatePresence mode="wait">
          {stage === 'idle' && (
            <motion.div 
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] ml-4">Service or Website URL</p>
                <div className="relative">
                  <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="e.g. வாரிசு சான்றிதழ் or tnesevai.tn.gov.in"
                    className="w-full h-16 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 pr-16 font-bold text-slate-900 focus:border-blue-600 focus:bg-white outline-none transition-all"
                  />
                  <button 
                    onClick={handleSeekAdvice}
                    disabled={loading || !input}
                    className="absolute right-2 top-2 h-12 w-12 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-blue-600 transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <ArrowRightIcon />}
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                <p className="text-blue-800 text-xs font-bold leading-relaxed">
                  "எந்தச் சேவையாக இருந்தாலும் அதன் பெயரை மட்டும் உள்ளிடவும். AI உங்களிடம் தேவையான ஆவணங்களைக் கேட்டு, அதில் உள்ள தகவல்களைத் தானாக எடுத்துத் தரும்."
                </p>
              </div>
            </motion.div>
          )}

          {stage === 'requirements' && (
            <motion.div 
              key="req"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="bg-slate-900 text-white p-6 rounded-3xl">
                <h4 className="font-black text-xs uppercase tracking-widest text-blue-400 mb-2">AI ஆலோசனை</h4>
                <p className="text-sm font-bold leading-relaxed">{advice}</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4 italic">தேவையான ஆவணங்கள் (Required Documents)</h4>
                {requirements.map((req) => (
                  <div key={req.id} className="bg-slate-50 border-2 border-slate-100 p-4 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200">
                        <FileText size={20} className="text-slate-400" />
                      </div>
                      <div>
                        <h5 className="font-black text-slate-900 text-sm">{req.name}</h5>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{req.reason}</p>
                      </div>
                    </div>
                    <label className="flex-shrink-0 cursor-pointer group">
                      <div className="bg-white border-2 border-slate-900 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 group-hover:bg-slate-900 group-hover:text-white transition-all">
                        {uploadingId === req.id ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        பதிவேற்று (Upload)
                      </div>
                      <input type="file" className="hidden" onChange={(e) => onFileUpload(e, req)} disabled={!!uploadingId} />
                    </label>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {stage === 'extracting' && (
            <motion.div key="extract" className="py-20 flex flex-col items-center justify-center space-y-6">
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center animate-pulse shadow-2xl shadow-blue-200">
                <Loader2 size={48} className="text-white animate-spin" />
              </div>
              <div className="text-center">
                <h3 className="font-black text-xl">ஆவணம் வாசிக்கப்படுகிறது...</h3>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">AI is extracting details from your document</p>
              </div>
            </motion.div>
          )}

          {stage === 'results' && extractedData && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-green-50 border-2 border-green-100 p-6 rounded-3xl flex items-center gap-4">
                <div className="bg-green-500 p-2 rounded-full text-white">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <h4 className="font-black text-sm text-green-900 uppercase tracking-widest">ஆவணம் கண்டறியப்பட்டது!</h4>
                  <p className="text-xs text-green-700 font-bold leading-tight">AI விவரங்களைப் பிரித்தெடுத்துவிட்டது. கீழே உள்ள விவரங்களைச் சரிபார்க்கவும்.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DataField icon={User} label="பெயர் (Name)" value={extractedData.name} subValue={extractedData.nameTamil} />
                <DataField icon={Calendar} label="பிறந்த தேதி (DOB)" value={extractedData.dob} />
                <DataField icon={MapPin} label="முகவரி (Address)" value={extractedData.addressTamil || extractedData.address} isBlock />
                <DataField icon={Smartphone} label="ஆதார் / அடையாள எண்" value={extractedData.aadhaar || extractedData.pan || extractedData.smartCard} />
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  onClick={() => setStage('requirements')}
                  className="flex-1 py-4 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl"
                >
                  Copy to Clipboard
                </button>
                <button 
                  onClick={() => { setStage('idle'); setInput(''); }}
                  className="flex-1 py-4 bg-white border-2 border-slate-900 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all"
                >
                  New Scan
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function DataField({ icon: Icon, label, value, subValue, isBlock }: any) {
  if (!value && !subValue) return null;
  return (
    <div className={`bg-slate-50 border border-slate-100 p-5 rounded-3xl space-y-2 ${isBlock ? 'md:col-span-2' : ''}`}>
      <div className="flex items-center gap-2 text-slate-400">
        <Icon size={14} />
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <div className="space-y-1">
        <p className="font-black text-slate-900">{value}</p>
        {subValue && <p className="font-bold text-blue-600 text-sm">{subValue}</p>}
      </div>
    </div>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  );
}
