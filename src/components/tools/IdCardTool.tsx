import React, { useState, useRef } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Upload, Download, Scissors, RefreshCw, Layers, FileImage } from 'lucide-react';
import { compressToTargetSize, downloadBase64 } from '../../lib/imageOptimizer';
import { useLanguage } from '../../lib/translations';
import ToolActions from './ToolActions';

export default function IdCardTool({ isNarrow }: { isNarrow?: boolean }) {
  const { t } = useLanguage();
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [activeSide, setActiveSide] = useState<'front' | 'back' | null>(null);
  const [targetSizeKb, setTargetSizeKb] = useState(200);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFreeCrop, setIsFreeCrop] = useState(true);
  const [finalImages, setFinalImages] = useState<{ front?: string; back?: string }>({});
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultName, setResultName] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const initialCrop = isFreeCrop 
      ? { unit: '%', width: 90, height: 90, x: 5, y: 5 } as Crop
      : centerCrop(
          makeAspectCrop(
            { unit: '%', width: 90 },
            3.375 / 2.125,
            width,
            height
          ),
          width,
          height
        );
    setCrop(initialCrop);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        if (side === 'front') setFrontImage(reader.result as string);
        else setBackImage(reader.result as string);
        setActiveSide(side);
        setCrop(undefined);
        setCompletedCrop(undefined);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const getCroppedImg = async (image: HTMLImageElement, crop: PixelCrop): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false }); // Disable alpha for better JPEG performance
    if (!ctx) return '';

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // ALWAYS use natural dimensions for the canvas to maintain full quality
    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;

    // Use high quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // Use a slightly lower initial quality to help the optimizer reach target size without losing too much resolution
    return canvas.toDataURL('image/jpeg', 0.95);
  };

  const handleCropSave = async () => {
    if (!activeSide || !completedCrop || !imgRef.current) return;
    
    const cropped = await getCroppedImg(imgRef.current, completedCrop);
    setFinalImages(prev => ({ ...prev, [activeSide]: cropped }));
    setActiveSide(null);
  };

  const handleDownload = async (side: 'front' | 'back' | 'both') => {
    setIsProcessing(true);
    try {
      if (side === 'both' && finalImages.front && finalImages.back) {
        // Create combined image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const loadImage = (src: string): Promise<HTMLImageElement> => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          });
        };

        const [loadedImg1, loadedImg2] = await Promise.all([
          loadImage(finalImages.front!),
          loadImage(finalImages.back!)
        ]);

        // Horizontal merge (Left to Right) as requested
        const gap = 40;
        const width = loadedImg1.width + loadedImg2.width + gap;
        const height = Math.max(loadedImg1.height, loadedImg2.height);

        // Cap dimensions to avoid "Denial of Wallet" and ensure target size is achievable
        const MAX_DIM = 3200; // Increased for horizontal layout
        let scale = 1;
        if (width > MAX_DIM || height > MAX_DIM) {
          scale = Math.min(MAX_DIM / width, MAX_DIM / height);
        }

        canvas.width = width * scale;
        canvas.height = height * scale;

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Center vertically if heights differ
        const y1 = (canvas.height - (loadedImg1.height * scale)) / 2;
        const y2 = (canvas.height - (loadedImg2.height * scale)) / 2;
        
        ctx.drawImage(loadedImg1, 0, y1, loadedImg1.width * scale, loadedImg1.height * scale);
        ctx.drawImage(loadedImg2, (loadedImg1.width + gap) * scale, y2, loadedImg2.width * scale, loadedImg2.height * scale);

        const combinedBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.98));
        if (combinedBlob) {
          const optimized = await compressToTargetSize(combinedBlob, targetSizeKb);
          const response = await fetch(optimized);
          const blob = await response.blob();
          const timestamp = Date.now();
          setResultBlob(blob);
          setResultName(`ID_Merged_${timestamp}.jpg`);
        }
      } else {
        const url = side === 'front' ? finalImages.front : finalImages.back;
        if (url) {
          const optimized = await compressToTargetSize(url, targetSizeKb);
          const response = await fetch(optimized);
          const blob = await response.blob();
          const timestamp = Date.now();
          setResultBlob(blob);
          setResultName(`ID_Card_${side}_${timestamp}.jpg`);
        }
      }
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`space-y-${isNarrow ? '4' : '6'}`}>
      <div className={`grid grid-cols-1 ${!isNarrow ? 'sm:grid-cols-2' : ''} gap-4`}>
        {/* Front Side */}
        <div className="border-2 border-dashed border-slate-200 rounded-3xl p-4 sm:p-6 bg-slate-50 flex flex-col items-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">{t('frontSide')}</p>
          {finalImages.front ? (
            <div className="relative group">
              <img src={finalImages.front} alt="Front" className="h-24 sm:h-32 rounded-lg shadow-md" />
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => { setFrontImage(null); setFinalImages(p => ({ ...p, front: undefined })); }}
                  className="bg-red-500 text-white p-2 rounded-xl shadow-lg"
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            </div>
          ) : (
            <label className="cursor-pointer flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-sm">
                <Upload size={18} />
              </div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider text-center">{t('uploadFront')}</span>
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'front')} />
            </label>
          )}
        </div>

        {/* Back Side */}
        <div className="border-2 border-dashed border-slate-200 rounded-3xl p-4 sm:p-6 bg-slate-50 flex flex-col items-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">{t('backSide')}</p>
          {finalImages.back ? (
            <div className="relative group">
              <img src={finalImages.back} alt="Back" className="h-24 sm:h-32 rounded-lg shadow-md" />
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => { setBackImage(null); setFinalImages(p => ({ ...p, back: undefined })); }}
                  className="bg-red-500 text-white p-2 rounded-xl shadow-lg"
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            </div>
          ) : (
            <label className="cursor-pointer flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-sm">
                <Upload size={18} />
              </div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider text-center">{t('uploadBack')}</span>
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'back')} />
            </label>
          )}
        </div>
      </div>

      {activeSide && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 flex flex-col items-center justify-center p-2 sm:p-4 overflow-auto backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-4 sm:p-6 w-full max-w-4xl max-h-[95vh] flex flex-col gap-4 sm:gap-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{t('cropIdImage')}</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t('cropInstruction')}</p>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-2xl ring-1 ring-slate-200 w-full sm:w-auto">
                <button 
                  onClick={() => setIsFreeCrop(false)}
                  className={`flex-1 sm:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isFreeCrop ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {t('govIdSize')}
                </button>
                <button 
                  onClick={() => setIsFreeCrop(true)}
                  className={`flex-1 sm:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isFreeCrop ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {t('freeSelection')}
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-900 rounded-3xl flex items-center justify-center min-h-[300px] relative overflow-hidden group">
              <div className="absolute inset-0 p-2 sm:p-4 flex items-center justify-center">
                <ReactCrop
                  crop={crop}
                  onChange={c => setCrop(c)}
                  onComplete={c => setCompletedCrop(c)}
                  aspect={isFreeCrop ? undefined : 3.375 / 2.125}
                  style={{ maxHeight: '100%', maxWidth: '100%' }}
                >
                  <img
                    ref={imgRef}
                    alt="Crop me"
                    src={activeSide === 'front' ? frontImage! : backImage!}
                    onLoad={onImageLoad}
                    style={{ 
                      maxHeight: 'calc(95vh - 300px)', 
                      maxWidth: '100%', 
                      width: 'auto', 
                      height: 'auto',
                      objectFit: 'contain' 
                    }}
                    className="block shadow-2xl"
                  />
                </ReactCrop>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setActiveSide(null)}
                className="flex-1 py-4 rounded-xl bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors"
              >
                {t('cancel')}
              </button>
              <button 
                onClick={handleCropSave}
                disabled={!completedCrop}
                className="flex-[2] py-4 rounded-xl bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {t('applySave')} <Scissors size={14} className="inline ml-2" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`bg-white ${isNarrow ? 'p-4' : 'p-4 sm:p-8'} rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6`}>
        <div className={`flex flex-col ${!isNarrow ? 'sm:flex-row sm:items-center' : ''} justify-between gap-4`}>
          <div>
            <h4 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">{t('outputSettings')}</h4>
            {!isNarrow && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">{t('cropInstruction')}</p>}
          </div>
          <div className="flex items-center gap-4 bg-indigo-50 p-3 rounded-2xl border border-indigo-100 w-full sm:w-auto">
            <span className="font-black text-indigo-900 text-xs whitespace-nowrap">{t('targetSize')}: {targetSizeKb} KB</span>
            <input 
              type="range" min="20" max="1000" step="10"
              value={targetSizeKb} 
              onChange={(e) => setTargetSizeKb(Number(e.target.value))}
              className="accent-indigo-600 flex-1 sm:w-32"
            />
          </div>
        </div>

        <div className={`grid grid-cols-1 ${!isNarrow ? 'sm:grid-cols-2' : ''} gap-4`}>
          <button 
            disabled={isProcessing || !finalImages.front}
            onClick={() => handleDownload('front')}
            className={`py-5 rounded-2xl font-black uppercase tracking-wider text-xs transition-all transform active:scale-95 shadow-lg flex items-center justify-center gap-3 ${
              isProcessing || !finalImages.front ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-slate-900 text-white hover:bg-slate-800 h-full'
            }`}
          >
            {t('downloadFront')} <FileImage size={16} />
          </button>
          <button 
            disabled={isProcessing || !finalImages.back}
            onClick={() => handleDownload('back')}
            className={`py-5 rounded-2xl font-black uppercase tracking-wider text-xs transition-all transform active:scale-95 shadow-lg flex items-center justify-center gap-3 ${
              isProcessing || !finalImages.back ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {t('downloadBack')} <FileImage size={16} />
          </button>
          <button 
            disabled={isProcessing || (!finalImages.front || !finalImages.back)}
            onClick={() => handleDownload('both')}
            className={`${!isNarrow ? 'sm:col-span-2' : ''} py-6 rounded-2xl font-black uppercase tracking-widest text-sm transition-all transform active:scale-95 shadow-xl flex items-center justify-center gap-3 ${
              isProcessing || (!finalImages.front || !finalImages.back) ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isProcessing ? t('optimizing') : (
              <>
                {t('downloadMerged')} <Download size={18} />
              </>
            )}
          </button>
        </div>

        {resultBlob && (
          <ToolActions blob={resultBlob} fileName={resultName} isNarrow={isNarrow} />
        )}
      </div>

      <div className="flex items-start gap-4 bg-amber-50 p-5 rounded-2xl border border-amber-100">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0 shadow-sm">
          <Layers size={18} />
        </div>
        <div>
          <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">{t('govGuidelinesTitle')}</p>
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider leading-relaxed">
            {t('govGuidelinesDesc')}
          </p>
        </div>
      </div>
    </div>
  );
}
