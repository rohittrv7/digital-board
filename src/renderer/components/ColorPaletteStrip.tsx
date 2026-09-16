import React, { useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { setColor } from '../store/toolsSlice';
import { Palette, Pipette } from 'lucide-react';

export const PRESET_COLORS = [
  { name: 'White', hex: '#ffffff' },
  { name: 'Chalk Yellow', hex: '#fef08a' },
  { name: 'Signal Yellow', hex: '#eab308' },
  { name: 'Sky Blue', hex: '#38bdf8' },
  { name: 'Royal Blue', hex: '#3b82f6' },
  { name: 'Brand Lime', hex: '#C4F135' },
  { name: 'Coral Red', hex: '#f87171' },
  { name: 'Vibrant Orange', hex: '#fb923c' },
  { name: 'Bright Pink', hex: '#f472b6' },
  { name: 'Violet', hex: '#a855f7' },
  { name: 'Muted Gray', hex: '#94a3b8' },
  { name: 'Black', hex: '#0f172a' },
];

export const ColorPaletteStrip: React.FC = () => {
  const dispatch = useAppDispatch();
  const currentColor = useAppSelector(state => state.tools.strokeColor);
  const theme = useAppSelector(state => state.ui.theme);
  const isLight = theme === 'light';
  const colorInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 backdrop-blur-md rounded-lg border max-w-full overflow-hidden transition-colors ${
      isLight
        ? 'bg-white/95 border-[#dce5d0] shadow-md text-[#1c2217]'
        : 'bg-[#12150e]/95 border-[#242b1d] shadow-2xl text-[#f4f6ee]'
    }`}>
      <div className={`flex items-center gap-1 text-xs font-semibold mr-0.5 flex-shrink-0 ${
        isLight ? 'text-[#556046]' : 'text-[#9ba38e]'
      }`}>
        <Palette className={`w-3.5 h-3.5 ${isLight ? 'text-[#68880a]' : 'text-[#C4F135]'}`} />
        <span className="hidden sm:inline">Color</span>
      </div>

      {/* Preset Swatches */}
      <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-0.5 max-w-full">
        {PRESET_COLORS.map(c => {
          const isSelected = currentColor.toLowerCase() === c.hex.toLowerCase();
          return (
            <button
              key={c.hex}
              type="button"
              onClick={() => dispatch(setColor(c.hex))}
              title={c.name}
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 transition-all flex-shrink-0 flex items-center justify-center ${
                isSelected
                  ? 'border-[#C4F135] scale-110 shadow-sm ring-2 ring-[#C4F135]/60'
                  : isLight
                    ? 'border-[#cbd7bc] hover:border-[#68880a] hover:scale-105'
                    : 'border-[#242b1d] hover:border-[#828f74] hover:scale-105'
              }`}
              style={{ backgroundColor: c.hex }}
            >
              {isSelected && (
                <div 
                  className={`w-1.5 h-1.5 rounded-full ${
                    c.hex === '#ffffff' || c.hex === '#fef08a' || c.hex.toLowerCase() === '#c4f135' ? 'bg-[#0c0e0a]' : 'bg-white'
                  }`} 
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Custom Color Picker */}
      <div className={`relative pl-1 border-l ml-1 flex-shrink-0 ${
        isLight ? 'border-[#dce5d0]' : 'border-[#242b1d]'
      }`}>
        <button
          type="button"
          onClick={() => colorInputRef.current?.click()}
          className={`p-1 rounded-lg transition-colors flex items-center gap-1 text-xs ${
            isLight
              ? 'text-[#4e5841] hover:text-[#1c2217] hover:bg-[#e4ebd9]'
              : 'text-[#9ba38e] hover:text-[#f4f6ee] hover:bg-[#1f2618]'
          }`}
          title="Custom Color Picker"
        >
          <Pipette className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-[10px] hidden md:inline">Custom</span>
        </button>
        <input
          ref={colorInputRef}
          type="color"
          value={currentColor}
          onChange={(e) => dispatch(setColor(e.target.value))}
          className="absolute opacity-0 pointer-events-none w-0 h-0"
        />
      </div>
    </div>
  );
};
