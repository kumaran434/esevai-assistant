import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { 
  FileStack, 
  X, 
  FileText, 
  ArrowRightLeft,
  Settings,
  Download,
  Loader2
} from 'lucide-react';
import { Reorder, AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '../../lib/translations';
import ToolActions from './ToolActions';

export default function PdfMerger({ isNarrow }: { isNarrow?: boolean }) {
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<{ id: string, file: File, name: string }[]>([]);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files) as File[];
      const newFiles = filesArray.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file: file,
        name: file.name
      }));
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
  };

  const mergePdfs = async () => {
    if (selectedFiles.length < 2) return;
    setIsProcessing(true);
    
    try {
      const mergedPdf = await PDFDocument.create();
      
      for (const item of selectedFiles) {
        const arrayBuffer = await item.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      
      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setResultBlob(blob);
    } catch (error) {
      console.error('Merge failed:', error);
      alert('PDF Merge failed. Some files might be corrupted or encrypted.');
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
                <FileStack size={isNarrow ? 14 : 16} />
             </div>
             <h4 className={`font-black text-slate-800 uppercase tracking-widest ${isNarrow ? 'text-[10px]' : 'text-xs'}`}>
                {t('mergePdf') || 'Merge PDFs'}
             </h4>
          </div>
          {!isNarrow && (
            <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
               <Settings size={12} /> Pro Merge v1.0
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className={`border-2 border-dashed border-slate-100 rounded-3xl ${isNarrow ? 'p-6' : 'p-10'} bg-slate-50/50 hover:border-indigo-200 transition-colors`}>
            <label className="cursor-pointer flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center text-slate-300 shadow-sm border border-slate-100 transition-all hover:scale-110 hover:text-indigo-400">
                <FileStack size={36} />
              </div>
              <div className="text-center">
                <p className="font-black text-slate-800 uppercase tracking-widest text-sm">{t('addPdfFiles') || 'Add PDF Files'}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">{t('selectMultiplePdf') || 'Select 2 or more files'}</p>
              </div>
              <input type="file" multiple className="hidden" accept="application/pdf" onChange={handleFileChange} />
            </label>
          </div>

          <button 
            disabled={isProcessing || selectedFiles.length < 2}
            onClick={mergePdfs}
            className={`w-full py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-white transition-all transform active:scale-95 shadow-xl flex items-center justify-center gap-3 ${
              isProcessing || selectedFiles.length < 2 ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-200'
            }`}
          >
            {isProcessing ? <><Loader2 className="animate-spin" size={18} /> {t('processing') || 'Processing...'}</> : <><Download size={18} /> {t('mergeAndDownload') || 'Merge & Download'}</>}
          </button>

          {resultBlob && (
            <ToolActions blob={resultBlob} fileName={`merged_document_${Date.now()}.pdf`} isNarrow={isNarrow} />
          )}

          <AnimatePresence>
            {selectedFiles.length > 0 && (
              <Reorder.Group axis="y" values={selectedFiles} onReorder={setSelectedFiles} className="space-y-3">
                {selectedFiles.map((item) => (
                  <Reorder.Item 
                    key={item.id} 
                    value={item}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between group shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center gap-4 grow min-w-0">
                        <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center shrink-0">
                          <FileText size={20} />
                        </div>
                        <div className="truncate">
                          <p className="font-bold text-slate-800 text-xs truncate uppercase tracking-wider">{item.name}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{(item.file.size / 1024).toFixed(0)} KB</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeFile(item.id)}
                        className="p-2 text-slate-200 hover:text-red-500 transition-colors shrink-0"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            )}
          </AnimatePresence>

          {selectedFiles.length > 1 && (
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mt-4">
              {t('dragToReorder') || 'Drag to reorder PDF merging sequence'}
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
            {t('mergePdfNotice') || 'Merging multiple small certificates into a single file is often required for portal uploads.'}
          </p>
        </div>
      </div>
    </div>
  );
}
