import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { 
  FilePlus, 
  X, 
  FileImage, 
  FileStack,
  ArrowRightLeft,
  Download,
  MousePointer2
} from 'lucide-react';
import { Reorder } from 'framer-motion';
import { compressToTargetSize, downloadBase64 } from '../../lib/imageOptimizer';
import { useLanguage } from '../../lib/translations';
import ToolActions from './ToolActions';

export default function ImageToPdf({ isNarrow }: { isNarrow?: boolean }) {
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const [targetSizeKb, setTargetSizeKb] = useState(200);

  // Image to PDF State
  const [sourceImages, setSourceImages] = useState<string[]>([]);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultName, setResultName] = useState<string>('');

  // Image to PDF Logic
  const handleSourceImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files) as File[];
      filesArray.forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          setSourceImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeSourceImage = (index: number) => {
    setSourceImages(prev => prev.filter((_, i) => i !== index));
    setResultBlob(null);
  };

  const generatePdf = async () => {
    if (sourceImages.length === 0) return;
    setIsProcessing(true);
    
    try {
      const pdf = new jsPDF();
      for (let i = 0; i < sourceImages.length; i++) {
        if (i > 0) pdf.addPage();
        
        const img = new Image();
        img.src = sourceImages[i];
        await new Promise(resolve => img.onload = resolve);
        
        const imgWidth = pdf.internal.pageSize.getWidth();
        const imgHeight = (img.height * imgWidth) / img.width;
        
        pdf.addImage(sourceImages[i], 'JPEG', 0, 0, imgWidth, imgHeight);
      }
      
      const blob = pdf.output('blob');
      setResultBlob(blob);
      setResultName(`combined_document_${Date.now()}.pdf`);
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadOptimizedImages = async () => {
    if (sourceImages.length === 0) return;
    setIsProcessing(true);
    try {
      for (let i = 0; i < sourceImages.length; i++) {
        const optimized = await compressToTargetSize(sourceImages[i], targetSizeKb);
        downloadBase64(optimized, `optimized_upload_${i + 1}_${Date.now()}.jpg`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`space-y-${isNarrow ? '4' : '6'}`}>
      <div className={`bg-white ${isNarrow ? 'p-4' : 'p-8'} rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6`}>
        <div className={`flex flex-col ${!isNarrow ? 'sm:flex-row sm:items-center' : ''} justify-between gap-4`}>
          <div className="flex items-center gap-3">
             <div className={`${isNarrow ? 'w-6 h-6' : 'w-8 h-8'} bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600`}>
                <ArrowRightLeft size={isNarrow ? 14 : 16} />
             </div>
             <h4 className={`font-black text-slate-800 uppercase tracking-widest ${isNarrow ? 'text-[10px]' : 'text-xs'}`}>
                {t('combineToPdf')}
             </h4>
          </div>
          <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 w-full sm:w-auto">
            <span className="text-[10px] font-black text-indigo-600 uppercase whitespace-nowrap">{t('targetSize')}: {targetSizeKb} KB</span>
            <input 
              type="range" min="50" max="1500" step="50"
              value={targetSizeKb} 
              onChange={(e) => setTargetSizeKb(Number(e.target.value))}
              className="accent-indigo-600 flex-1 sm:w-32 h-1.5 rounded-lg appearance-none bg-slate-200"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className={`border-2 border-dashed border-slate-100 rounded-3xl ${isNarrow ? 'p-4' : 'p-8'} bg-slate-50/50 hover:border-indigo-200 transition-colors`}>
            <label className="cursor-pointer flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center text-slate-300 shadow-sm border border-slate-100 transition-all hover:scale-110 hover:text-indigo-400">
                <FilePlus size={36} />
              </div>
              <div className="text-center">
                <p className="font-black text-slate-800 uppercase tracking-widest text-sm">{t('addPhotosDocs')}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">{t('supportedFormats')}</p>
              </div>
              <input type="file" multiple className="hidden" accept="image/*" onChange={handleSourceImages} />
            </label>
          </div>

          <div className={`grid grid-cols-1 ${!isNarrow ? 'sm:grid-cols-2' : ''} gap-4`}>
            <button 
              disabled={isProcessing || sourceImages.length === 0}
              onClick={downloadOptimizedImages}
              className={`py-5 rounded-2xl font-black uppercase tracking-wider text-xs transition-all transform active:scale-95 shadow-xl flex items-center justify-center gap-3 ${
                isProcessing || sourceImages.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'
              }`}
            >
              {t('downloadOptimizedJpks')} <FileImage size={18} />
            </button>
            <button 
              disabled={isProcessing || sourceImages.length === 0}
              onClick={generatePdf}
              className={`py-5 rounded-2xl font-black uppercase tracking-wider text-xs transition-all transform active:scale-95 shadow-xl flex items-center justify-center gap-3 ${
                isProcessing || sourceImages.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200 shadow-indigo-200'
              }`}
            >
              {t('combineToPdf')} <FileStack size={18} />
            </button>
          </div>

          {resultBlob && (
            <ToolActions blob={resultBlob} fileName={resultName} isNarrow={isNarrow} />
          )}

          {sourceImages.length > 0 && (
            <Reorder.Group axis="y" values={sourceImages} onReorder={setSourceImages} className="space-y-3">
              {sourceImages.map((img, idx) => (
                <Reorder.Item key={img} value={img}>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between group shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-white shadow-inner">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-xs uppercase tracking-wider">{t('item')} {idx + 1}</p>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{t('readyForOptimization')}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeSourceImage(idx)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}

          {sourceImages.length > 1 && (
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mt-4">
              {t('dragToReorder')}
            </p>
          )}
        </div>
      </div>

      <div className="bg-amber-50/50 p-8 rounded-[2.5rem] border border-amber-100 flex items-start gap-5">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm shrink-0">
          <ArrowRightLeft size={20} />
        </div>
        <div>
          <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">{t('govGuidelinesTitle')}</p>
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider leading-relaxed">
            {t('optimizedPortalUpload')}
          </p>
        </div>
      </div>
    </div>
  );
}
