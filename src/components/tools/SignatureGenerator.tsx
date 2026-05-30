import { useRef, useState, ChangeEvent } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Download, Eraser, PenTool, CheckCircle2, Type, FilePlus, X, MousePointer2, Layers, Zap } from 'lucide-react';
import { Rnd } from 'react-rnd';
import { compressToTargetSize, downloadBase64 } from '../../lib/imageOptimizer';
import * as pdfjsLib from 'pdfjs-dist';
import { useLanguage } from '../../lib/translations';
import ToolActions from './ToolActions';

// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set up worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function SignatureGenerator(props: { activeProfile?: any, onSync?: (b64: string) => void, isNarrow?: boolean }) {
  const { t } = useLanguage();
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [penColor, setPenColor] = useState('black');
  const [targetSizeKb, setTargetSizeKb] = useState(200);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [mode, setMode] = useState<'draw' | 'type' | 'document'>('draw');
  const [lastUsedMode, setLastUsedMode] = useState<'draw' | 'type'>('draw');
  
  // Type mode state
  const [typedName, setTypedName] = useState('');
  const [selectedFont, setSelectedFont] = useState('font-signature-1');
  
  // Document signing state
  const [docImage, setDocImage] = useState<string | null>(null);
  const [placedSignature, setPlacedSignature] = useState<string | null>(null);
  const [rndConfig, setRndConfig] = useState({
    width: 200,
    height: 100,
    x: 50,
    y: 50,
  });

  const { activeProfile, onSync, isNarrow } = props;

  const [systemLogs, setSystemLogs] = useState<{time: string, msg: string, type: 'info' | 'error' | 'success'}[]>([]);

  const addLog = (msg: string, type: 'info' | 'error' | 'success' = 'info') => {
    setSystemLogs(prev => [{ time: new Date().toLocaleTimeString(), msg, type }, ...prev].slice(0, 5));
  };

  const fonts = [
    { id: 'font-signature-1', className: 'font-signature-1', name: 'Elegant' },
    { id: 'font-signature-2', className: 'font-signature-2', name: 'Classic' },
    { id: 'font-signature-3', className: 'font-signature-3', name: 'Script' },
    { id: 'font-signature-4', className: 'font-signature-4', name: 'Sharp' },
    { id: 'font-signature-5', className: 'font-signature-5', name: 'Loose' },
    { id: 'font-signature-6', className: 'font-signature-6', name: 'Formal' },
    { id: 'font-signature-7', className: 'font-signature-7', name: 'Handwritten' },
  ];

  const colors = [
    { name: 'Black', value: 'black', class: 'bg-black' },
    { name: 'Blue', value: '#0038a8', class: 'bg-blue-700' },
    { name: 'Red', value: '#d4213d', class: 'bg-red-600' },
  ];

  const clear = () => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
  };

  const handleTypeToImage = async () => {
    if (!typedName) return null;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = 800;
    canvas.height = 200;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const families: Record<string, string> = {
      'font-signature-1': '"Dancing Script"',
      'font-signature-2': '"Great Vibes"',
      'font-signature-3': '"Alex Brush"',
      'font-signature-4': '"Mrs Saint Delafield"',
      'font-signature-5': '"Monsieur La Doulaise"',
      'font-signature-6': '"Herr Von Muellerhoff"',
      'font-signature-7': '"Caveat"',
    };

    ctx.font = `italic 80px ${families[selectedFont] || 'cursive'}`;
    ctx.fillStyle = penColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL('image/png');
  };

  const trimCanvas = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const l = pixels.data.length;
    let i, x, y;
    let bound = {
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    };

    for (i = 0; i < l; i += 4) {
      if (pixels.data[i + 3] !== 0) {
        x = (i / 4) % canvas.width;
        y = Math.floor((i / 4) / canvas.width);

        if (bound.top === 0) bound.top = y;
        if (bound.left === 0) bound.left = x;
        else if (x < bound.left) bound.left = x;

        if (x > bound.right) bound.right = x;
        if (bound.bottom === 0) bound.bottom = y;
        else if (y > bound.bottom) bound.bottom = y;
      }
    }

    const trimHeight = bound.bottom - bound.top;
    const trimWidth = bound.right - bound.left;
    const trimmed = ctx.getImageData(bound.left, bound.top, trimWidth, trimHeight);

    const copy = document.createElement('canvas');
    copy.width = trimWidth;
    copy.height = trimHeight;
    const copyCtx = copy.getContext('2d');
    if (copyCtx) copyCtx.putImageData(trimmed, 0, 0);

    return copy;
  };

  const getSignatureDataUrl = async () => {
    if (lastUsedMode === 'draw') {
      const canvas = sigCanvas.current?.getCanvas();
      if (!canvas) return null;
      const trimmedCanvas = trimCanvas(canvas);
      return trimmedCanvas.toDataURL('image/png');
    } else {
      return await handleTypeToImage();
    }
  };

  const handleSyncToProfile = async () => {
    const dataUrl = await getSignatureDataUrl();
    if (!dataUrl || !onSync) return;

    setIsProcessing(true);
    try {
      const optimized = await compressToTargetSize(dataUrl, 50); // Small for sig
      onSync(optimized);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    const dataUrl = await getSignatureDataUrl();
    if (!dataUrl) return;

    setIsProcessing(true);
    try {
      const optimized = await compressToTargetSize(dataUrl, targetSizeKb);
      // Convert base64 to Blob
      const response = await fetch(optimized);
      const blob = await response.blob();
      setResultBlob(blob);
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDocUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport, canvas: canvas as any }).promise;
          setDocImage(canvas.toDataURL('image/jpeg', 0.9));
        }
      } else {
        const reader = new FileReader();
        reader.onload = () => setDocImage(reader.result as string);
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('Error uploading document:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const prepareSignatureForDoc = async () => {
    const dataUrl = await getSignatureDataUrl();
    if (dataUrl) {
      setPlacedSignature(dataUrl);
    }
  };

  const downloadSignedDoc = async () => {
    if (!docImage || !placedSignature) return;
    setIsProcessing(true);
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const imgDoc = new Image();
      const imgSign = new Image();

      await Promise.all([
        new Promise(res => { imgDoc.onload = res; imgDoc.src = docImage; }),
        new Promise(res => { imgSign.onload = res; imgSign.src = placedSignature; })
      ]);

      canvas.width = imgDoc.width;
      canvas.height = imgDoc.height;
      ctx.drawImage(imgDoc, 0, 0);

      const container = document.getElementById('doc-container');
      if (container) {
        const docDisplayWidth = container.clientWidth;
        const ratio = imgDoc.width / docDisplayWidth;
        
        ctx.drawImage(
          imgSign, 
          rndConfig.x * ratio, 
          rndConfig.y * ratio, 
          rndConfig.width * ratio, 
          rndConfig.height * ratio
        );
      }

      const finalUrl = canvas.toDataURL('image/jpeg', 0.9);
      const optimized = await compressToTargetSize(finalUrl, targetSizeKb);
      const response = await fetch(optimized);
      const blob = await response.blob();
      setResultBlob(blob);
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`space-y-${isNarrow ? '4' : '6'}`}>
      {/* Mode Selector */}
      <div className={`flex bg-slate-100 p-1.5 rounded-[2rem] gap-1.5 shadow-inner ${isNarrow ? 'flex-col' : 'flex-row'}`}>
        <button 
          onClick={() => { setMode('draw'); setLastUsedMode('draw'); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'draw' ? 'bg-white text-slate-900 shadow-sm shadow-slate-200' : 'text-slate-500 hover:bg-slate-200/50'}`}
        >
          <PenTool size={14} /> {t('drawSign')}
        </button>
        <button 
          onClick={() => { setMode('type'); setLastUsedMode('type'); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'type' ? 'bg-white text-slate-900 shadow-sm shadow-slate-200' : 'text-slate-500 hover:bg-slate-200/50'}`}
        >
          <Type size={14} /> {t('typeSign')}
        </button>
        <button 
          onClick={() => setMode('document')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'document' ? 'bg-white text-slate-900 shadow-sm shadow-slate-200' : 'text-slate-500 hover:bg-slate-200/50'}`}
        >
          <Layers size={14} /> {t('signForm')}
        </button>
      </div>

      {mode === 'draw' && (
        <div className="space-y-6">
          <div className="bg-slate-50 rounded-[2.5rem] border-4 border-white shadow-xl overflow-hidden relative group">
            <SignatureCanvas
              ref={sigCanvas}
              penColor={penColor}
              onBegin={() => setIsEmpty(false)}
              canvasProps={{
                className: "w-full h-64 cursor-crosshair",
              }}
            />
            {isEmpty && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-300">
                <MousePointer2 size={32} className="mb-2 opacity-50" />
                <span className="font-black uppercase tracking-[0.3em] text-xs">{t('drawHere')}</span>
              </div>
            )}
            <button 
              onClick={clear}
              className="absolute top-6 right-6 p-3 bg-white/80 backdrop-blur-md rounded-2xl text-slate-400 hover:text-red-500 shadow-sm transition-all active:scale-90"
            >
              <Eraser size={20} />
            </button>
          </div>
        </div>
      )}

      {mode === 'type' && (
        <div className="space-y-6">
          <div className={`bg-white ${isNarrow ? 'p-3' : 'p-6'} rounded-[2rem] shadow-xl border border-slate-100 space-y-4`}>
            <input 
              type="text" 
              placeholder={t('enterFullName')} 
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              className={`w-full ${isNarrow ? 'px-4 py-3' : 'px-6 py-5'} bg-slate-50 rounded-2xl font-bold text-lg text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all border border-slate-100`}
            />
            
            <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {fonts.map((font) => (
                <button
                  key={font.id}
                  onClick={() => setSelectedFont(font.id)}
                  className={`p-6 rounded-2xl text-left transition-all border ${
                    selectedFont === font.id ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-100' : 'bg-white border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{font.name} {t('style')}</p>
                  <p className={`${font.className} text-3xl text-slate-900 truncate`} style={{ color: penColor }}>
                    {typedName || t('signatureStyle')}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === 'document' && (
        <div className="space-y-6">
          {!docImage ? (
            <label className="border-4 border-dashed border-slate-200 rounded-[2.5rem] p-16 bg-slate-50 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-white hover:border-indigo-200 transition-all group">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-300 group-hover:text-indigo-500 shadow-sm transition-all group-hover:shadow-indigo-100 group-hover:shadow-xl group-hover:-translate-y-1">
                <FilePlus size={40} />
              </div>
              <div className="text-center">
                <p className="font-black text-slate-800 uppercase tracking-[0.2em] text-sm">{t('uploadForm')}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t('placeSignInstruction')}</p>
              </div>
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleDocUpload} />
            </label>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                    <CheckCircle2 size={16} />
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">{t('docReady')}</span>
                </div>
                <button onClick={() => { setDocImage(null); setPlacedSignature(null); }} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline">{t('changeFile')}</button>
              </div>

              <div id="doc-container" className="bg-slate-800 rounded-[2rem] p-4 flex justify-center overflow-hidden relative min-h-[400px]">
                <div className="relative inline-block shadow-2xl">
                  <img src={docImage} alt="Document" className="max-w-full h-auto rounded-lg" />
                  
                  {placedSignature && (
                    <Rnd
                      size={{ width: rndConfig.width, height: rndConfig.height }}
                      position={{ x: rndConfig.x, y: rndConfig.y }}
                      onDragStop={(e, d) => setRndConfig(prev => ({ ...prev, x: d.x, y: d.y }))}
                      onResizeStop={(e, direction, ref, delta, position) => {
                        setRndConfig({
                          width: parseInt(ref.style.width),
                          height: parseInt(ref.style.height),
                          ...position,
                        });
                      }}
                      bounds="parent"
                      className="group"
                    >
                      <div className="w-full h-full relative cursor-move">
                        <img src={placedSignature} alt="" className="w-full h-full object-contain pointer-events-none" />
                        <div className="absolute inset-0 border-2 border-dashed border-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full bg-indigo-600 text-white text-[8px] px-2 py-1 rounded-t-md font-black uppercase whitespace-nowrap">
                            Drag to Position
                          </div>
                        </div>
                        <button 
                          onClick={() => setPlacedSignature(null)}
                          className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </Rnd>
                  )}
                </div>
              </div>

              {!placedSignature ? (
                <button 
                  onClick={prepareSignatureForDoc}
                  className="w-full py-5 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest text-sm shadow-lg shadow-indigo-200 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                >
                  <Layers size={18} /> {t('applyPreparedSign')}
                </button>
              ) : (
                <div className="space-y-4">
                  <button 
                    disabled={isProcessing}
                    onClick={downloadSignedDoc}
                    className="w-full py-6 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-base shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                  >
                    {isProcessing ? t('mergingOptimizing') : <><PenTool size={20} /> Apply Signature (உறுதி செய்க)</>}
                  </button>
                  {resultBlob && (
                    <ToolActions blob={resultBlob} fileName={`signed_document_${Date.now()}.jpg`} isNarrow={isNarrow} />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className={`bg-white ${isNarrow ? 'p-4' : 'p-8'} rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6`}>
        <div className={`grid grid-cols-1 ${!isNarrow ? 'sm:grid-cols-2' : ''} gap-8`}>
          <div>
            <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-4">{t('inkColor')}</h4>
            <div className={`flex ${isNarrow ? 'gap-2' : 'gap-4'}`}>
              {colors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setPenColor(color.value)}
                  className={`${isNarrow ? 'w-10 h-10 rounded-xl' : 'w-12 h-12 rounded-2xl'} ${color.class} transition-all transform active:scale-90 flex items-center justify-center shadow-sm ${
                    penColor === color.value ? 'ring-4 ring-slate-100 ring-offset-4 ring-offset-white' : 'hover:scale-105'
                  }`}
                >
                  {penColor === color.value && <CheckCircle2 className="text-white opacity-80" size={isNarrow ? 20 : 24} />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">{t('maxFileSize')}</h4>
              <span className="font-black text-indigo-600 text-sm">{targetSizeKb} KB</span>
            </div>
            <input 
              type="range" min="10" max="500" step="5"
              value={targetSizeKb} 
              onChange={(e) => setTargetSizeKb(Number(e.target.value))}
              className="accent-indigo-600 w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {mode !== 'document' && (
          <div className="space-y-6">
            <div className={`flex flex-col ${!isNarrow ? 'sm:flex-row' : ''} gap-4`}>
              <button 
                disabled={(mode === 'draw' && isEmpty) || (mode === 'type' && !typedName) || isProcessing}
                onClick={handleDownload}
                className={`flex-1 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-white transition-all transform active:scale-95 shadow-xl flex items-center justify-center gap-3 ${
                  ((mode === 'draw' && isEmpty) || (mode === 'type' && !typedName) || isProcessing) 
                    ? 'bg-slate-300 text-slate-400 cursor-not-allowed shadow-none' 
                    : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                {isProcessing ? t('optimizing') : <><PenTool size={18} /> Apply Signature (உறுதி செய்க)</>}
              </button>
              
              {onSync && activeProfile && (
                <button 
                  onClick={handleSyncToProfile}
                  disabled={(mode === 'draw' && isEmpty) || (mode === 'type' && !typedName) || isProcessing}
                  className="flex-1 py-5 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-[0.2em] text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                >
                  <Zap size={18} className="fill-current" /> Save to Profile
                </button>
              )}
            </div>

            {resultBlob && (
              <ToolActions blob={resultBlob} fileName={`signature_${Date.now()}.jpg`} isNarrow={isNarrow} />
            )}

            <button 
              disabled={(mode === 'draw' && isEmpty) || (mode === 'type' && !typedName)}
              onClick={async () => {
                const url = await getSignatureDataUrl();
                if (url) {
                  setPlacedSignature(url);
                  setMode('document');
                  addLog("Signature captured for document signing!", "success");
                }
              }}
              className="w-full py-5 rounded-2xl bg-indigo-50 text-indigo-600 border-4 border-indigo-100 font-black uppercase tracking-[0.2em] text-xs hover:bg-indigo-100 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
            >
              <MousePointer2 size={18} /> Use to Sign Document
            </button>
          </div>
        )}
      </div>

      {isProcessing && mode === 'document' && !docImage && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-black uppercase tracking-widest text-xs text-slate-800">{t('initializing')}</p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-4 bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0 shadow-sm">
          <Layers size={18} />
        </div>
        <div>
          <p className="text-[10px] font-black text-indigo-800 uppercase tracking-widest mb-1">{t('govPortalReady')}</p>
          <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider leading-relaxed">
            {t('signPortalGuideline')}
          </p>
        </div>
      </div>

      {systemLogs.length > 0 && (
        <div className="bg-slate-900 rounded-3xl p-6 mt-8">
          <div className="font-mono text-[10px] space-y-2">
            {systemLogs.map((log, i) => (
              <div key={i} className={`flex gap-3 ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-slate-400'}`}>
                <span className="opacity-30">[{log.time}]</span>
                <span>{log.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
