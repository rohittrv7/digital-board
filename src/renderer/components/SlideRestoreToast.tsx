import React, { useEffect, useState } from 'react';
import { RotateCcw, X, Check } from 'lucide-react';
import { useAppSelector } from '../store';

interface SlideRestoreToastProps {
  visible: boolean;
  slideNumber: number;
  onUndo: () => void;
  onDismiss: () => void;
  durationMs?: number;
}

export const SlideRestoreToast: React.FC<SlideRestoreToastProps> = ({
  visible,
  slideNumber,
  onUndo,
  onDismiss,
  durationMs = 5000
}) => {
  const [progress, setProgress] = useState(100);
  const theme = useAppSelector(state => state.ui.theme);
  const isLight = theme === 'light';

  useEffect(() => {
    if (!visible) {
      setProgress(100);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [visible, durationMs, onDismiss]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200 select-none">
      <div className={`relative overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-md px-4 py-3 flex items-center gap-3.5 min-w-[320px] transition-colors ${
        isLight
          ? 'bg-white/95 border-[#dce5d0] text-[#1c2217]'
          : 'bg-[#12150e]/95 border-[#2e3725] text-[#f4f6ee]'
      }`}>
        {/* Animated countdown progress bar at bottom */}
        <div 
          className="absolute bottom-0 left-0 h-0.5 bg-[#C4F135] transition-all duration-75"
          style={{ width: `${progress}%` }}
        />

        <div className="flex items-center gap-2 flex-1">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-xs font-semibold">
            Slide <strong className="text-red-400">{slideNumber}</strong> deleted
          </span>
        </div>

        {/* Undo Button */}
        <button
          type="button"
          onClick={() => {
            onUndo();
            onDismiss();
          }}
          className="px-3 py-1.5 rounded-xl bg-[#C4F135] hover:bg-[#b0dc28] text-[#0c0e0a] text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#C4F135]/25 transition-all active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Undo</span>
        </button>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onDismiss}
          className={`p-1 rounded-lg transition-colors ${
            isLight ? 'hover:bg-[#e4ebd8] text-[#616c54]' : 'hover:bg-[#1c2217] text-[#9ba38e]'
          }`}
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
