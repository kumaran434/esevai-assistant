import React, { useState, useCallback, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { Upload, Download, Maximize, RotateCcw, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../lib/translations';
import { downloadBase64 } from '../../lib/imageOptimizer';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import ToolActions from './ToolActions';

interface Area {
  width: number;
  height: number;
  x: number;
  y: number;
}

interface PassportResizerProps {
  isNarrow?: boolean;
}

export default function PassportResizer({ isNarrow }: PassportResizerProps) {
  const { t } = useLanguage();
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [targetSizeKb, setTargetSizeKb] = useState(200);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImage(reader.result?.toString() || null);
        setResultImage(null);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
    rotation = 0
  ): Promise<Blob | null> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    const rotRad = (rotation * Math.PI) / 180;
    const { width: bBoxWidth, height: bBoxHeight } = {
        width: Math.abs(Math.cos(rotRad) * image.width) + Math.abs(Math.sin(rotRad) * image.height),
        height: Math.abs(Math.sin(rotRad) * image.width) + Math.abs(Math.cos(rotRad) * image.height),
    };

    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;

    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
    ctx.rotate(rotRad);
    ctx.translate(-image.width / 2, -image.height / 2);
    ctx.drawImage(image, 0, 0);

    const data = ctx.getImageData(
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height
    );

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.putImageData(data, 0, 0);

    // Iteratively find the best quality for target size
    let quality = 0.9;
    let blob: Blob | null = null;
    const targetSizeBytes = targetSizeKb * 1024;

    for (let i = 0; i < 10; i++) {
        blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (!blob) break;
        if (blob.size <= targetSizeBytes && blob.size >= targetSizeBytes * 0.9) break;
        if (blob.size > targetSizeBytes) quality -= 0.1;
        else quality += 0.05;
        if (quality < 0.1 || quality > 1) break;
    }

    return blob;
  };

  const [stableFileName, setStableFileName] = useState('');

  const handleApply = async () => {
    if (!image || !croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(image, croppedAreaPixels, rotation);
      if (croppedBlob) {
        setResultBlob(croppedBlob);
        setStableFileName(`passport_photo_${Date.now()}.jpg`);
        const url = URL.createObjectURL(croppedBlob);
        setResultImage(url);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#0f172a', '#3b82f6', '#10b981']
        });
      }
    } catch (e) {
      console.error(e);
    }
    setIsProcessing(false);
  };

  const handleDownload = () => {
    if (!resultImage) return;
    downloadBase64(resultImage, stableFileName);
  };

  return (
    <div className="space-y-6">
      <div className={`flex ${isNarrow ? 'flex-col items-center' : 'flex-col sm:flex-row'} justify-between gap-4`}>
        <div className={`space-y-1 text-center ${isNarrow ? 'text-center' : 'sm:text-left'}`}>
          <h2 className={`${isNarrow ? 'text-sm' : 'text-xl'} font-black text-slate-800 tracking-tight uppercase`}>{t('passportResizer') || 'Passport Resize'}</h2>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">{t('passportResizerDesc') || 'Crop & Resize for Passport Photos'}</p>
        </div>
        
        <div className={`flex ${isNarrow ? 'flex-col w-full' : 'flex-col sm:flex-row'} items-center gap-4`}>
          <div className={`space-y-1 ${isNarrow ? 'w-full' : 'w-full sm:w-auto'}`}>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block ml-1">{t('targetFileSize') || 'Target Size (KB)'}</label>
            <div className={`flex items-center bg-white border border-slate-200 rounded-2xl p-1 ${isNarrow ? 'w-full' : 'w-full sm:w-32'} shadow-sm`}>
                <input 
                    type="number" 
                    value={targetSizeKb}
                    onChange={(e) => setTargetSizeKb(parseInt(e.target.value) || 200)}
                    className="w-full bg-transparent p-2 text-sm font-bold text-slate-700 focus:outline-none text-center"
                />
                <span className="text-[10px] font-black text-slate-400 uppercase pr-3">KB</span>
            </div>
          </div>
          
          <div className={`${isNarrow ? 'w-full' : 'w-full sm:w-auto'}`}>
            {!image ? (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-3"
              >
                <Upload size={16} strokeWidth={3} /> {t('uploadPhoto') || 'Upload Photo'}
              </button>
            ) : (
              <button 
                onClick={() => setImage(null)}
                className="w-full px-6 py-4 bg-white border border-slate-200 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-red-500 hover:border-red-100 transition-all flex items-center justify-center gap-3"
              >
                <RotateCcw size={16} strokeWidth={3} /> {t('clear') || 'Clear'}
              </button>
            )}
          </div>
        </div>
      </div>

      <input 
        type="file" 
        hidden 
        ref={fileInputRef} 
        onChange={handleFileChange}
        accept="image/*"
      />

      <AnimatePresence mode="wait">
        {!image ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] gap-6 cursor-pointer hover:bg-slate-100/50 transition-all group"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-300 group-hover:scale-110 group-hover:text-slate-900 transition-all">
              <ImageIcon size={32} strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('supportedFormats')}</p>
              <p className="font-bold text-slate-700 mt-1 uppercase tracking-tight">{t('uploadPhoto') || 'Select Image to Start'}</p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-6"
          >
            {!resultImage ? (
              <div className="space-y-6">
                <div className="relative aspect-square sm:aspect-video bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl">
                  <Cropper
                    image={image}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={3.5 / 4.5} // Standard passport size ratio (3.5cm x 4.5cm)
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    showGrid={true}
                  />
                </div>
                
                <div className={`grid grid-cols-1 ${isNarrow ? 'grid-cols-1' : 'sm:grid-cols-2'} gap-4`}>
                  <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                     <div className="flex items-center justify-between">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('zoom') || 'Zoom'}</label>
                       <span className="text-[10px] font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">{Math.round(zoom * 100)}%</span>
                     </div>
                     <input
                      type="range"
                      value={zoom}
                      min={1}
                      max={3}
                      step={0.1}
                      aria-labelledby="Zoom"
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="w-full accent-slate-900"
                    />
                  </div>
                  <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                     <div className="flex items-center justify-between">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('rotation') || 'Rotation'}</label>
                       <span className="text-[10px] font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">{rotation}°</span>
                     </div>
                     <input
                          type="range"
                          value={rotation}
                          min={0}
                          max={360}
                          step={1}
                          aria-labelledby="Rotation"
                          onChange={(e) => setRotation(parseFloat(e.target.value))}
                          className="w-full accent-slate-900"
                      />
                  </div>
                </div>
              </div>
            ) : null}

            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 space-y-8 flex flex-col h-full">
                {resultImage && (
                  <div className="flex flex-col items-center gap-4 py-8">
                     <div className="w-20 h-20 bg-green-100 text-green-600 rounded-3xl flex items-center justify-center shadow-inner">
                        <CheckCircle2 size={40} />
                     </div>
                     <div className="text-center">
                        <p className="font-black text-slate-900 uppercase tracking-widest">{t('processingComplete') || 'Resize Complete!'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest italic">{t('readyToDownload') || 'Photo is optimized and ready'}</p>
                     </div>
                  </div>
                )}
                <div className="mt-auto space-y-4">

                   {!resultImage ? (
                        <button 
                            onClick={handleApply}
                            disabled={isProcessing}
                            className={`w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 ${
                                isProcessing 
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                            }`}
                        >
                            {isProcessing ? t('processing') || 'Processing...' : (
                                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin hidden group-active:block"></div> {t('cropAndResize') || 'Apply & Optimize'}</>
                            )}
                        </button>
                   ) : (
                       <div className="space-y-3">
                           {resultBlob && (
                           <ToolActions 
                               blob={resultBlob} 
                               fileName={stableFileName} 
                               onDownload={handleDownload}
                             />
                           )}
                            <button 
                                onClick={() => { setResultImage(null); setResultBlob(null); }}
                                className="w-full py-4 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-slate-900 transition-colors"
                            >
                                {t('editAgain') || 'Back to Edit'}
                            </button>
                       </div>
                   )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guidelines */}
      <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 shadow-sm border border-slate-100 shrink-0">
          <CheckCircle2 size={24} strokeWidth={2.5} />
        </div>
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{t('govGuidelinesTitle')}</h4>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-loose">
            {t('passportGuideline') || 'Most government portals require passport photos to be exactly 3.5cm x 4.5cm and under 200KB. This tool handles everything automatically.'}
          </p>
        </div>
      </div>
    </div>
  );
}
