import React from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { setStrokeWidth, togglePressureSensitivity, setEraserMode } from '../store/toolsSlice';
import { PenTool } from 'lucide-react';

export const StrokeWidthSlider: React.FC = () => {
  const dispatch = useAppDispatch();
  const strokeWidth = useAppSelector(state => state.tools.strokeWidth);
  const strokeColor = useAppSelector(state => state.tools.strokeColor);
  const activeTool = useAppSelector(state => state.tools.activeTool);
  const eraserMode = useAppSelector(state => state.tools.eraserMode);
  const pressureEnabled = useAppSelector(state => state.tools.pressureSensitivityEnabled);
  const theme = useAppSelector(state => state.ui.theme);
  const isLight = theme === 'light';

  const presets = [2, 4, 8, 14, 24];

  return (
    <div className={`w-12 sm:w-14 lg:w-16 max-w-[72px] border-l flex flex-col items-center py-2.5 sm:py-3 px-1 sm:px-1.5 shadow-xl z-20 flex-shrink-0 overflow-y-auto max-h-full transition-all duration-200 ${
      isLight ? 'bg-[#f7f9f3] border-[#dce5d0] text-[#1c2217]' : 'bg-[#12150e] border-[#242b1d] text-[#f4f6ee]'
    }`}>
      <div className={`font-tracked-mono text-[9px] font-bold uppercase tracking-wider mb-2 ${
        isLight ? 'text-[#556046]' : 'text-[#9ba38e]'
      }`}>Width</div>

      {/* Live Width Preview Dot */}
      <div className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg border flex items-center justify-center mb-2.5 sm:mb-3 shadow-inner flex-shrink-0 ${
        isLight ? 'bg-white border-[#dce5d0]' : 'bg-[#0c0e0a] border-[#242b1d]'
      }`}>
        <div 
          className="rounded-full transition-all duration-100"
          style={{
            width: `${Math.min(32, Math.max(2, strokeWidth))}px`,
            height: `${Math.min(32, Math.max(2, strokeWidth))}px`,
            backgroundColor: activeTool === 'highlighter' ? `${strokeColor}80` : strokeColor,
          }}
        />
      </div>

      {/* Preset width buttons */}
      <div className="flex flex-col gap-1 mb-3 w-full items-center flex-shrink-0">
        {presets.map(w => (
          <button
            key={w}
            type="button"
            onClick={() => dispatch(setStrokeWidth(w))}
            className={`w-7 sm:w-8 lg:w-10 h-5 sm:h-6 lg:h-7 rounded-md text-[10px] sm:text-[11px] font-mono font-bold transition-all ${
              strokeWidth === w
                ? 'bg-[#C4F135] text-[#0c0e0a] shadow-xs ring-1 ring-[#C4F135]'
                : isLight
                  ? 'bg-[#f0f4ea] text-[#4e5841] hover:bg-[#e4ebd9] hover:text-[#1c2217]'
                  : 'bg-[#1c2217] text-[#9ba38e] hover:bg-[#252c1e] hover:text-[#f4f6ee]'
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      {/* Vertical Slider */}
      <div className="flex-1 min-h-24 flex flex-col items-center justify-center my-1">
        <input
          type="range"
          min="1"
          max="60"
          value={strokeWidth}
          onChange={(e) => dispatch(setStrokeWidth(Number(e.target.value)))}
          className="h-24 -rotate-90 cursor-pointer accent-[#C4F135] w-20"
          title={`Stroke Width: ${strokeWidth}px`}
        />
      </div>

      <span className={`text-xs font-mono font-bold my-1 flex-shrink-0 ${
        isLight ? 'text-[#1c2217]' : 'text-[#f4f6ee]'
      }`}>{strokeWidth}px</span>

      {/* Stylus Pressure Sensitivity Toggle */}
      <div className={`w-full pt-2 border-t flex flex-col items-center text-center flex-shrink-0 ${
        isLight ? 'border-[#dce5d0]' : 'border-[#242b1d]'
      }`}>
        <button
          type="button"
          onClick={() => dispatch(togglePressureSensitivity())}
          className={`p-1.5 sm:p-2 rounded-lg border transition-all ${
            pressureEnabled
              ? 'bg-[#C4F135]/20 border-[#C4F135] text-[#C4F135] shadow-xs ring-1 ring-[#C4F135]/40'
              : isLight
                ? 'bg-[#f0f4ea] border-[#cbd7bc] text-[#828f74] hover:text-[#434d37]'
                : 'bg-[#1c2217] border-[#2e3725] text-[#636c58] hover:text-[#9ba38e]'
          }`}
          title={pressureEnabled ? "Pressure Sensitivity ON (XP-Pen / Stylus)" : "Pressure Sensitivity OFF (Fixed Width)"}
        >
          <PenTool className="w-4 h-4" />
        </button>
        <span className={`text-[9px] font-semibold mt-1 ${
          isLight ? 'text-[#636c58]' : 'text-[#9ba38e]'
        }`}>
          {pressureEnabled ? 'XP-Pen' : 'Fixed'}
        </span>
      </div>

      {/* Eraser mode quick toggle if eraser is selected */}
      {activeTool === 'eraser' && (
        <div className={`w-full pt-2 border-t flex flex-col items-center mt-1 flex-shrink-0 ${
          isLight ? 'border-[#dce5d0]' : 'border-[#242b1d]'
        }`}>
          <span className="text-[9px] font-bold text-amber-500 mb-0.5">Mode</span>
          <button
            type="button"
            onClick={() => dispatch(setEraserMode(eraserMode === 'stroke' ? 'object' : 'stroke'))}
            className={`w-full py-0.5 text-[9px] rounded-md font-medium capitalize transition-colors ${
              isLight ? 'bg-[#f0f4ea] hover:bg-[#e4ebd9] text-[#1c2217]' : 'bg-[#1c2217] hover:bg-[#252c1e] text-[#f4f6ee]'
            }`}
          >
            {eraserMode}
          </button>
        </div>
      )}
    </div>
  );
};
