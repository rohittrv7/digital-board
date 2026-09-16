import React from 'react';
import { useAppSelector } from '../store';
import { AUTHOR_NAME } from './AboutModal';
import { Sparkles } from 'lucide-react';

export const CanvasWatermark: React.FC = () => {
  const showWatermark = useAppSelector(state => state.ui.showWatermark);
  const theme = useAppSelector(state => state.ui.theme);
  const activeSlideId = useAppSelector(state => state.slides.activeSlideId);
  const slides = useAppSelector(state => state.slides.slides);
  const currentSlide = slides.find(s => s.id === activeSlideId);
  const isWhiteboard = currentSlide?.background.type === 'whiteboard';
  const isLight = theme === 'light' || isWhiteboard;

  if (!showWatermark) return null;

  return (
    <div 
      className="absolute bottom-3 right-4 z-20 pointer-events-none select-none transition-opacity duration-300 flex items-center gap-1.5"
      style={{
        opacity: isLight ? 0.22 : 0.18,
        maxWidth: '200px'
      }}
    >
      <div className={`p-1 rounded-md ${isLight ? 'bg-slate-900/10 text-slate-800' : 'bg-white/10 text-white'}`}>
        <Sparkles className="w-3.5 h-3.5" />
      </div>
      <div className="flex flex-col leading-tight">
        <span className={`text-[11px] font-bold tracking-tight font-display ${isLight ? 'text-slate-900' : 'text-white'}`}>
          Digital Teaching Board
        </span>
        <span className={`text-[8px] font-tracked-mono font-bold tracking-wider ${isLight ? 'text-slate-800' : 'text-[#C4F135]'}`}>
          by {AUTHOR_NAME}
        </span>
      </div>
    </div>
  );
};
