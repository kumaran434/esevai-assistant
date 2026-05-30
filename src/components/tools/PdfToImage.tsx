import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { 
  Download, 
  FileDown, 
  RefreshCw, 
  Layers, 
  ArrowRightLeft,
  MousePointer2
} from 'lucide-react';
import { compressToTargetSize, downloadBase64 } from '../../lib/imageOptimizer';
import { useLanguage } from '../../lib/translations';
import ToolActions from './ToolActions';

// Set up worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function PdfToImage({ isNarrow }: { isNarrow?: boolean }) {
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const [targetSizeKb, setTargetSizeKb] = useState(200);

  // PDF to Image State
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extractedImages, setExtractedImages] = useState<{url: string, blob: Blob}[]>([]);
  const [progress, setProgress] = useState(0);

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
      setExtractedImages([]);
    }
  };

  const convertPdfToImages = async () => {
    if (!pdfFile) return;
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      const newImages: {url: string, blob: Blob}[] = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) continue;
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport, canvas: canvas as any }).promise;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const optimized = await compressToTargetSize(dataUrl, targetSizeKb);
        
        // Convert to Blob
        const response = await fetch(optimized);
        const blob = await response.blob();
        
        newImages.push({ url: optimized, blob });
        setProgress(Math.round((i / numPages) * 100));
      }

      setExtractedImages(newImages);
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`space-y-${isNarrow ? '4' : '6'}`}>
      <div className={`bg-white ${isNarrow ? 'p-4' : 'p-4 sm:p-8'} rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6`}>
        <div className={`flex flex-col ${!isNarrow ? 'sm:flex-row sm:items-center' : ''} justify-between gap-4`}>
          <div className="flex items-center gap-3">
             <div className={`${isNarrow ? 'w-6 h-6' : 'w-8 h-8'} bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600`}>
                <ArrowRightLeft size={isNarrow ? 14 : 16} />
             </div>
             <h4 className={`font-black text-slate-800 uppercase tracking-widest ${isNarrow ? 'text-[10px]' : 'text-xs'}`}>
                {t('pdfToImage')}
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
          <div className={`border-2 border-dashed border-slate-100 rounded-3xl ${isNarrow ? 'p-6' : 'p-6 sm:p-12'} bg-slate-50/50 flex flex-col items-center group hover:border-indigo-200 transition-colors`}>
            {pdfFile ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center border border-red-100 italic font-black shadow-sm shrink-0">
                  PDF
                </div>
                <div className="text-center min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate max-w-[200px]">{pdfFile.name}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{(pdfFile.size / 1024).toFixed(0)} KB</p>
                </div>
                <button 
                  onClick={() => { setPdfFile(null); setExtractedImages([]); }}
                  className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline flex items-center gap-1"
                >
                  <RefreshCw size={12} /> {t('remove')}
                </button>
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center gap-4 w-full">
                <div className="w-16 sm:w-20 h-16 sm:h-20 bg-white rounded-[2rem] flex items-center justify-center text-slate-300 shadow-sm border border-slate-100 group-hover:scale-110 group-hover:text-indigo-400 transition-all">
                  <FileDown size={32} />
                </div>
                <div className="text-center px-4">
                  <p className="font-black text-slate-800 uppercase tracking-widest text-sm">{t('uploadPdf')}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">{t('readyToExtract')}</p>
                </div>
                <input type="file" className="hidden" accept="application/pdf" onChange={handlePdfChange} />
              </label>
            )}
          </div>

          {!extractedImages.length ? (
            <button 
              disabled={isProcessing || !pdfFile}
              onClick={convertPdfToImages}
              className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-white transition-all transform active:scale-95 shadow-xl flex items-center justify-center gap-3 ${
                isProcessing ? 'bg-slate-400 cursor-not-allowed shadow-none' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-200'
              }`}
            >
              {isProcessing ? `${t('optimizing')} ${progress}%` : t('convertPdfToJpg')} <Layers size={18} />
            </button>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {extractedImages.map((img, idx) => (
                <div key={idx} className="bg-slate-50 p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100">
                      <Layers size={20} />
                    </div>
                    <div className="flex-1">
                       <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{t('pages')} {idx + 1}</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">{t('readyToDownload')}</p>
                    </div>
                  </div>
                  <ToolActions blob={img.blob} fileName={`page_${idx + 1}.jpg`} isNarrow={isNarrow} />
                </div>
              ))}
            </div>
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
