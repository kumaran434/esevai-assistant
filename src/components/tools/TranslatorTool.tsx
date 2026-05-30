import React, { useState, useEffect } from 'react';
import { Languages, ArrowRightLeft, Copy, Check, Volume2, Sparkles, Loader2, Download } from 'lucide-react';
import { useLanguage } from '../../lib/translations';
import ToolActions from './ToolActions';

import { translateText as aiTranslate } from '../../services/geminiService';

export default function TranslatorTool({ isNarrow }: { isNarrow?: boolean }) {
  const { t } = useLanguage();
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [sourceLang, setSourceLang] = useState<'en' | 'ta'>('en');
  const [targetLang, setTargetLang] = useState<'en' | 'ta'>('ta');
  const [copied, setCopied] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const translateText = async (text: string) => {
    if (!text.trim()) {
      setTranslatedText('');
      setResultBlob(null);
      return;
    }

    setIsTranslating(true);
    try {
      const targetLangName = targetLang === 'en' ? 'English' : 'Tamil';
      const translation = await aiTranslate(text, targetLangName);
      setTranslatedText(translation);
      
      const blob = new Blob([translation], { type: 'text/plain' });
      setResultBlob(blob);
    } catch (error) {
      console.error('Translation error:', error);
      setTranslatedText('');
      setResultBlob(null);
    } finally {
      setIsTranslating(false);
    }
  };

  // Real-time translation with debounce
  useEffect(() => {
    if (!sourceText.trim()) {
      setTranslatedText('');
      setIsTranslating(false);
      return;
    }

    const timer = setTimeout(() => {
      translateText(sourceText);
    }, 800);

    return () => clearTimeout(timer);
  }, [sourceText, sourceLang, targetLang]);

  const swapLanguages = () => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
    setSourceText(translatedText);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const speak = (text: string, langCode: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode === 'en' ? 'en-US' : 'ta-IN';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className={`max-w-4xl mx-auto space-y-${isNarrow ? '4' : '6'}`}>
      <div className={`bg-white ${isNarrow ? 'rounded-[1.5rem]' : 'rounded-[2.5rem]'} border border-slate-100 shadow-xl overflow-hidden`}>
        {/* Language Selection Header */}
        <div className={`flex items-center justify-between ${isNarrow ? 'px-4 py-4' : 'px-8 py-6'} bg-slate-50/50 border-b border-slate-100`}>
          <div className={`flex items-center ${isNarrow ? 'gap-2' : 'gap-4'} flex-1`}>
            <div className={`flex items-center gap-2 ${isNarrow ? 'px-2 py-1.5' : 'px-4 py-2'} bg-white rounded-xl border border-slate-100 shadow-sm`}>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isNarrow ? 'IN' : t('sourceLanguage')}</span>
               <span className={`${isNarrow ? 'text-[10px]' : 'text-xs'} font-bold text-slate-800`}>{sourceLang === 'en' ? 'EN' : 'TA'}</span>
            </div>
            
            <button 
              onClick={swapLanguages}
              className="p-2 hover:bg-white hover:shadow-md rounded-full transition-all text-slate-400 hover:text-blue-600 active:scale-90"
            >
              <ArrowRightLeft size={16} />
            </button>

            <div className={`flex items-center gap-2 ${isNarrow ? 'px-2 py-1.5' : 'px-4 py-2'} bg-white rounded-xl border border-slate-100 shadow-sm`}>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isNarrow ? 'OUT' : t('targetLanguage')}</span>
               <span className={`${isNarrow ? 'text-[10px]' : 'text-xs'} font-bold text-blue-600`}>{targetLang === 'en' ? 'EN' : 'TA'}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-slate-400 h-8">
             {isTranslating && (
               <>
                 <Loader2 size={14} className="animate-spin text-blue-500" />
                 <span className="text-[9px] font-black uppercase tracking-widest">{t('translating')}</span>
               </>
             )}
          </div>
        </div>

        <div className={`grid grid-cols-1 ${!isNarrow ? 'md:grid-cols-2' : ''} divide-y ${!isNarrow ? 'md:divide-y-0 md:divide-x' : ''} divide-slate-100 min-h-[300px]`}>
          {/* Source Text Area */}
          <div className={`${isNarrow ? 'p-4' : 'p-8'} space-y-4`}>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{sourceLang === 'en' ? 'Input: English' : 'உள்ளீடு: தமிழ்'}</span>
              <button 
                onClick={() => speak(sourceText, sourceLang)}
                disabled={!sourceText}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-all disabled:opacity-30"
              >
                <Volume2 size={16} />
              </button>
            </div>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder={t('enterText')}
              className={`w-full ${isNarrow ? 'h-32' : 'h-48'} resize-none bg-transparent border-none focus:ring-0 ${isNarrow ? 'text-base' : 'text-lg'} font-medium text-slate-800 placeholder:text-slate-300 scrollbar-hide`}
            />
          </div>

          {/* Target Text Area */}
          <div className={`${isNarrow ? 'p-4' : 'p-8'} space-y-4 bg-blue-50/10`}>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{t('translationResult')}</span>
              <div className="flex gap-1">
                <button 
                  onClick={() => speak(translatedText, targetLang)}
                  disabled={!translatedText}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-all disabled:opacity-30"
                >
                  <Volume2 size={16} />
                </button>
                <button 
                  onClick={copyToClipboard}
                  disabled={!translatedText}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-all disabled:opacity-30 relative"
                >
                  {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
            <div className={`w-full ${isNarrow ? 'min-h-[128px]' : 'min-h-[192px]'} ${isNarrow ? 'text-base' : 'text-lg'} font-medium text-slate-800 leading-relaxed`}>
              {translatedText || <span className="text-slate-300 italic">{targetLang === 'ta' ? 'மொழிபெயர்ப்பு இங்கே தோன்றும்...' : 'Translation will appear here...'}</span>}
            </div>
          </div>
        </div>

        {resultBlob && (
          <div className={`${isNarrow ? 'px-4 pb-4' : 'px-8 pb-8'} pt-2`}>
            <ToolActions blob={resultBlob} fileName={`translated_text_${Date.now()}.txt`} isNarrow={isNarrow} />
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform">
            <Languages size={100} strokeWidth={1} />
         </div>
         <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full border border-blue-400/20">
               <Languages size={12} />
               <span className="text-[10px] font-black uppercase tracking-widest">Local Language Bridge</span>
            </div>
            <h3 className="text-2xl font-black tracking-tight">{t('translator')}</h3>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xl italic">
               Optimized for official Tamil government document keywords. Fast, local, and reliable.
            </p>
         </div>
      </div>
    </div>
  );
}
