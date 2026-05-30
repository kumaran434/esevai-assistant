import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { jsPDF } from 'jspdf';
import imageCompression from 'browser-image-compression';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { FileUp, Download, RefreshCw, Gauge, Scissors, Files } from 'lucide-react';
import { useLanguage } from '../../lib/translations';
import ToolActions from './ToolActions';

// Set up worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function PdfCompressor({ isNarrow }: { isNarrow?: boolean }) {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [targetSizeKb, setTargetSizeKb] = useState(200);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [pagesPerFile, setPagesPerFile] = useState(5);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [processedName, setProcessedName] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processRange = async (pdfDoc: any, start: number, end: number, targetKb: number) => {
    const outPdf = new jsPDF();
    const numPages = end - start + 1;
    const targetPerPageKb = targetKb / numPages;

    for (let i = start; i <= end; i++) {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;

      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, viewport, canvas: canvas as any }).promise;

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const blob = await (await fetch(dataUrl)).blob();
      const compressedBlob = await imageCompression(blob as any, {
        maxSizeMB: targetPerPageKb / 1024,
        useWebWorker: true,
        maxWidthOrHeight: 1280
      });
      const compressedUrl = await imageCompression.getDataUrlFromFile(compressedBlob as any);

      if (i > start) outPdf.addPage();
      outPdf.addImage(compressedUrl, 'JPEG', 0, 0, 210, 297);
    }
    return outPdf.output('blob');
  };

  const executeAction = async () => {
    if (!file) return;
    setIsProcessing(true);
    setStatus(t('initializing'));

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;

      if (isSplitMode) {
        const zip = new JSZip();
        const baseName = file.name.replace('.pdf', '');
        let fileCount = 1;

        for (let i = 1; i <= totalPages; i += pagesPerFile) {
          const end = Math.min(i + pagesPerFile - 1, totalPages);
          setStatus(`${t('processing')} ${fileCount} (Pages ${i}-${end})...`);
          
          const blob = await processRange(pdf, i, end, targetSizeKb);
          zip.file(`${baseName}_part${fileCount}.pdf`, blob);
          fileCount++;
        }

        setStatus(t('creatingZip'));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        setProcessedBlob(zipBlob);
        setProcessedName(`${baseName}_parts.zip`);
      } else {
        setStatus(t('processingEntirePdf'));
        const blob = await processRange(pdf, 1, totalPages, targetSizeKb);
        setProcessedBlob(blob);
        setProcessedName(`compressed_${file.name}`);
      }

      setStatus(t('complete'));
    } catch (error) {
      console.error(error);
      setStatus(t('errorPdf'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`space-y-${isNarrow ? '4' : '6'}`}>
      {/* Mode Toggle */}
      <div className={`flex bg-slate-100 p-1 rounded-2xl border border-slate-200 ${isNarrow ? 'flex-col gap-1' : 'flex-row'}`}>
        <button 
          onClick={() => setIsSplitMode(false)}
          className={`flex-1 ${isNarrow ? 'py-2' : 'py-3'} rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${!isSplitMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Gauge size={14} /> {t('simpleCompress')}
        </button>
        <button 
          onClick={() => setIsSplitMode(true)}
          className={`flex-1 ${isNarrow ? 'py-2' : 'py-3'} rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isSplitMode ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Scissors size={14} /> {t('splitCompress')}
        </button>
      </div>

      <div className={`border-2 border-dashed border-slate-200 rounded-3xl ${isNarrow ? 'p-4' : 'p-6 sm:p-12'} bg-slate-50 flex flex-col items-center`}>
        {file ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center border border-red-100 italic font-black shadow-sm shrink-0">
              PDF
            </div>
            <div className="text-center min-w-0 px-2">
              <p className="font-bold text-slate-800 text-sm truncate max-w-[200px]">{file.name}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{(file.size / 1024).toFixed(0)} KB · Original</p>
            </div>
            <button 
              onClick={() => { setFile(null); setStatus(''); }}
              className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline flex items-center gap-1"
            >
              <RefreshCw size={12} /> {t('remove')}
            </button>
          </div>
        ) : (
          <label className="cursor-pointer flex flex-col items-center gap-4 w-full">
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-slate-300 shadow-sm transition-transform hover:scale-110 shrink-0">
              <FileUp size={32} />
            </div>
            <div className="text-center px-4">
              <p className="font-black text-slate-800 uppercase tracking-widest text-sm">{t('uploadPdf')}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">{t('scanProof')}</p>
            </div>
            <input type="file" className="hidden" accept="application/pdf" onChange={handleFileChange} />
          </label>
        )}
      </div>

      <div className={`bg-white ${isNarrow ? 'p-4' : 'p-6 sm:p-8'} rounded-[2.5rem] border border-slate-100 shadow-xl space-y-8`}>
        <div className={`grid grid-cols-1 ${!isNarrow ? 'sm:grid-cols-2' : ''} gap-8`}>
          {/* Size Setting */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
                <Gauge size={16} />
              </div>
              <div>
                <h4 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">{t('targetSize')}</h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">{isSplitMode ? 'Per split file' : 'Final file size'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
              <input 
                type="range" min="50" max="2000" step="50"
                value={targetSizeKb} 
                onChange={(e) => setTargetSizeKb(Number(e.target.value))}
                className="accent-slate-900 flex-1"
              />
              <span className="font-black text-slate-800 text-xs whitespace-nowrap min-w-[60px] text-right">{targetSizeKb} KB</span>
            </div>
          </div>

          {/* Split Setting */}
          {isSplitMode && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                  <Files size={16} />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">{t('pagesPerFile')}</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">{t('splitInstruction')}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                <input 
                  type="range" min="1" max="50" step="1"
                  value={pagesPerFile} 
                  onChange={(e) => setPagesPerFile(Number(e.target.value))}
                  className="accent-blue-500 flex-1"
                />
                <span className="font-black text-slate-800 text-xs whitespace-nowrap min-w-[60px] text-right">{pagesPerFile} {t('pages')}</span>
              </div>
            </div>
          )}
        </div>

        <button 
          disabled={isProcessing || !file}
          onClick={executeAction}
          className={`w-full rounded-2xl font-black uppercase transition-all transform active:scale-95 shadow-xl flex items-center justify-center gap-3 ${
            isNarrow 
              ? 'py-3.5 text-[10px] tracking-wider px-2' 
              : 'py-5 text-sm tracking-[0.2em] px-4'
          } ${
            isProcessing ? 'bg-slate-400 cursor-not-allowed' : isSplitMode ? 'bg-blue-500 hover:bg-blue-600' : 'bg-slate-900 hover:bg-slate-800'
          }`}
        >
          {isProcessing ? (
            <>
              {status} <RefreshCw size={18} className="animate-spin" />
            </>
          ) : (
            <>
              {isSplitMode ? t('splitCompressAction') : t('compressDownload')} <Download size={18} />
            </>
          )}
        </button>

        {processedBlob && (
          <ToolActions blob={processedBlob} fileName={processedName} isNarrow={isNarrow} />
        )}
      </div>

      {status && !isProcessing && (
        <div className="text-center py-4 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{status}</p>
        </div>
      )}

      {isSplitMode && (
        <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100 flex gap-3">
          <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center text-yellow-600 shrink-0">
            <Files size={16} />
          </div>
          <p className="text-[10px] font-bold text-yellow-800 uppercase tracking-widest leading-relaxed">
            {t('splitGuideline')}
          </p>
        </div>
      )}
    </div>
  );
}
