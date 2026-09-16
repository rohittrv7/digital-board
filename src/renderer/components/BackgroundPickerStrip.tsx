import React, { useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { setSlideBackground, BackgroundType } from '../store/slidesSlice';
import { FileImage } from 'lucide-react';

interface BgOption {
  type: BackgroundType;
  label: string;
  previewClass: string;
}

const BACKGROUND_OPTIONS: BgOption[] = [
  { type: 'chalkboard', label: 'Chalkboard', previewClass: 'bg-slate-900 border-slate-700' },
  { type: 'blackboard', label: 'Green Board', previewClass: 'bg-emerald-950 border-emerald-700' },
  { type: 'white', label: 'Whiteboard', previewClass: 'bg-white border-slate-300' },
  { type: 'ruled', label: 'Ruled Lines', previewClass: 'bg-slate-900 border-blue-500/50' },
  { type: 'grid', label: 'Math Grid', previewClass: 'bg-slate-900 border-indigo-500/50' },
  { type: 'dots', label: 'Dot Paper', previewClass: 'bg-slate-900 border-purple-500/50' },
];

export const BackgroundPickerStrip: React.FC = () => {
  const dispatch = useAppDispatch();
  const activeSlideId = useAppSelector(state => state.slides.activeSlideId);
  const slides = useAppSelector(state => state.slides.slides);
  const activeSlide = slides.find(s => s.id === activeSlideId);
  const currentBgType = activeSlide?.background.type || 'Whiteboard';
  const theme = useAppSelector(state => state.ui.theme);
  const isLight = theme === 'light';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (type: BackgroundType) => {
    if (!activeSlideId) return;
    dispatch(setSlideBackground({
      id: activeSlideId,
      background: { type }
    }));
  };

  const handleCustomImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSlideId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        dispatch(setSlideBackground({
          id: activeSlideId,
          background: { type: 'image', value: dataUrl }
        }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className={`flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 backdrop-blur-md rounded-lg border max-w-full overflow-hidden transition-colors ${
      isLight
        ? 'bg-white/95 border-[#dce5d0] shadow-md text-[#1c2217]'
        : 'bg-[#12150e]/95 border-[#242b1d] shadow-2xl text-[#f4f6ee]'
    }`}>
      <span className={`text-xs font-semibold mr-0.5 hidden md:inline flex-shrink-0 ${
        isLight ? 'text-[#556046]' : 'text-[#9ba38e]'
      }`}>Background</span>

      {/* Preset background buttons */}
      <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto max-w-full py-0.5">
        {BACKGROUND_OPTIONS.map(bg => {
          const isSelected = currentBgType === bg.type;
          return (
            <button
              key={bg.type}
              type="button"
              onClick={() => handleSelect(bg.type)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all flex-shrink-0 ${
                isSelected
                  ? isLight
                    ? 'bg-[#C4F135]/25 border-[#84a80e] text-[#58730b] font-bold shadow-xs ring-1 ring-[#84a80e]'
                    : 'bg-[#C4F135]/15 border-[#C4F135] text-[#C4F135] font-bold shadow-xs ring-1 ring-[#C4F135]'
                  : isLight
                    ? 'bg-[#f0f4ea] border-[#dce5d0] text-[#4e5841] hover:text-[#1c2217] hover:bg-[#e4ebd9]'
                    : 'bg-[#1c2217] border-[#2e3725] text-[#9ba38e] hover:text-[#f4f6ee] hover:bg-[#252c1e]'
              }`}
            >
              <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border ${bg.previewClass}`} />
              <span className="text-[10px] sm:text-[11px] whitespace-nowrap">{bg.label}</span>
            </button>
          );
        })}

        {/* Custom Image Upload */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all flex-shrink-0 ${
            currentBgType === 'image'
              ? isLight
                ? 'bg-[#C4F135]/25 border-[#84a80e] text-[#58730b] font-bold shadow-xs ring-1 ring-[#84a80e]'
                : 'bg-[#C4F135]/15 border-[#C4F135] text-[#C4F135] font-bold shadow-xs ring-1 ring-[#C4F135]'
              : isLight
                ? 'bg-[#f0f4ea] border-[#dce5d0] text-[#4e5841] hover:text-[#1c2217] hover:bg-[#e4ebd9]'
                : 'bg-[#1c2217] border-[#2e3725] text-[#9ba38e] hover:text-[#f4f6ee] hover:bg-[#252c1e]'
          }`}
          title="Upload Background Image"
        >
          <FileImage className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" />
          <span className="text-[10px] sm:text-[11px] whitespace-nowrap">Image</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleCustomImage}
          className="hidden"
        />
      </div>
    </div>
  );
};
