import React from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { setAboutOpen, toggleWatermark } from '../store/uiSlice';
import { X, Heart, Sparkles, Layers, PenTool, FileDown, ExternalLink, ShieldCheck, BadgeCheck } from 'lucide-react';

/**
 * =======================================================================
 * AUTHOR ATTRIBUTION & BRANDING
 * Replace the placeholder '[YOUR NAME]' below with your actual name.
 * =======================================================================
 */
export const AUTHOR_NAME = 'Ravana';
export const APP_VERSION = '1.1.0';

export const AboutModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(state => state.ui.isAboutOpen);
  const showWatermark = useAppSelector(state => state.ui.showWatermark);
  const theme = useAppSelector(state => state.ui.theme);
  const isLight = theme === 'light';

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={() => dispatch(setAboutOpen(false))}
    >
      <div 
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transition-colors ${
          isLight ? 'bg-white border-[#dce5d0] text-[#1c2217]' : 'bg-[#12150e] border-[#242b1d] text-[#f4f6ee]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-5 border-b ${
          isLight ? 'border-[#dce5d0] bg-[#f0f4ea]/40' : 'border-[#242b1d] bg-[#171c12]/40'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#C4F135] text-[#0c0e0a] shadow-md shadow-[#C4F135]/25">
              <Sparkles className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight font-display">Digital Teaching Board</h2>
                <span className={`px-2 py-0.5 text-[10px] font-bold font-tracked-mono rounded-full border ${
                  isLight ? 'bg-[#C4F135]/20 text-[#58730b] border-[#84a80e]/40' : 'bg-[#C4F135]/15 text-[#C4F135] border-[#C4F135]/30'
                }`}>
                  v{APP_VERSION}
                </span>
              </div>
              <p className={`text-xs font-medium ${isLight ? 'text-[#616c54]' : 'text-[#9ba38e]'}`}>
                Professional Whiteboard & Lecture Studio
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => dispatch(setAboutOpen(false))}
            className={`p-2 rounded-xl transition-colors ${
              isLight ? 'hover:bg-[#e4ebd9] text-[#616c54] hover:text-[#1c2217]' : 'hover:bg-[#1f2618] text-[#9ba38e] hover:text-[#f4f6ee]'
            }`}
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-sm">
          {/* Main Attribution Card */}
          <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
            isLight ? 'bg-[#f0f4ea] border-[#cbd7bc]' : 'bg-[#171c12] border-[#2e3725]'
          }`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#C4F135] text-[#0c0e0a]">
                <Heart className="w-4 h-4 fill-[#0c0e0a]" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-tracked-mono font-semibold opacity-75">
                  Created & Engineered by
                </div>
                <div className={`text-base font-bold tracking-tight font-display ${isLight ? 'text-[#58730b]' : 'text-[#C4F135]'}`}>
                  {AUTHOR_NAME}
                </div>
              </div>
            </div>
            <span className={`text-[10px] font-tracked-mono px-2.5 py-1 rounded-full font-bold border ${
              isLight ? 'bg-white border-[#dce5d0] text-[#1c2217]' : 'bg-[#1f2618] border-[#2e3725] text-[#C4F135]'
            }`}>
              Educator Edition
            </span>
          </div>

          {/* Description */}
          <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-[#434d37]' : 'text-[#9ba38e]'}`}>
            Digital Teaching Board is an advanced, hardware-accelerated interactive teaching application engineered for modern educators, online lectures, tutoring, and mathematical demonstrations.
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
              isLight ? 'bg-[#f0f4ea] border-[#dce5d0]' : 'bg-[#171c12] border-[#242b1d]'
            }`}>
              <PenTool className={`w-4 h-4 mt-0.5 shrink-0 ${isLight ? 'text-[#68880a]' : 'text-[#C4F135]'}`} />
              <div>
                <div className="font-semibold">Stylus Pressure</div>
                <div className={`text-[11px] ${isLight ? 'text-[#636c58]' : 'text-[#9ba38e]'}`}>XP-Pen & Wacom API</div>
              </div>
            </div>

            <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
              isLight ? 'bg-[#f0f4ea] border-[#dce5d0]' : 'bg-[#171c12] border-[#242b1d]'
            }`}>
              <Layers className={`w-4 h-4 mt-0.5 shrink-0 ${isLight ? 'text-[#68880a]' : 'text-[#C4F135]'}`} />
              <div>
                <div className="font-semibold">Multi-Slide Studio</div>
                <div className={`text-[11px] ${isLight ? 'text-[#636c58]' : 'text-[#9ba38e]'}`}>Templates & PDF Import</div>
              </div>
            </div>

            <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
              isLight ? 'bg-[#f0f4ea] border-[#dce5d0]' : 'bg-[#171c12] border-[#242b1d]'
            }`}>
              <FileDown className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">Multi-Page PDF</div>
                <div className={`text-[11px] ${isLight ? 'text-[#636c58]' : 'text-[#9ba38e]'}`}>Crisp 1080p Export</div>
              </div>
            </div>

            <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
              isLight ? 'bg-[#f0f4ea] border-[#dce5d0]' : 'bg-[#171c12] border-[#242b1d]'
            }`}>
              <ShieldCheck className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">Local & Private</div>
                <div className={`text-[11px] ${isLight ? 'text-[#636c58]' : 'text-[#9ba38e]'}`}>Zero Cloud Dependency</div>
              </div>
            </div>
          </div>

          {/* Watermark Setting Card */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
            isLight ? 'bg-[#f0f4ea] border-[#cbd7bc]' : 'bg-[#171c12] border-[#2e3725]'
          }`}>
            <div className="flex items-center gap-2.5">
              <BadgeCheck className={`w-4 h-4 ${showWatermark ? (isLight ? 'text-[#68880a]' : 'text-[#C4F135]') : 'text-[#636c58]'}`} />
              <div>
                <div className="font-semibold text-xs">Canvas & PDF Watermark</div>
                <div className={`text-[11px] ${isLight ? 'text-[#636c58]' : 'text-[#9ba38e]'}`}>
                  Subtle corner branding badge on live canvas & exported PDFs
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => dispatch(toggleWatermark())}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                showWatermark ? 'bg-[#C4F135]' : isLight ? 'bg-[#cbd7bc]' : 'bg-[#242b1d]'
              }`}
              role="switch"
              aria-checked={showWatermark}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full ${
                  showWatermark ? 'bg-[#0c0e0a]' : 'bg-white'
                } shadow-md ring-0 transition duration-200 ease-in-out ${
                  showWatermark ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-3.5 border-t flex items-center justify-between text-xs ${
          isLight ? 'bg-[#f0f4ea]/50 border-[#dce5d0] text-[#616c54]' : 'bg-[#171c12]/40 border-[#242b1d] text-[#9ba38e]'
        }`}>
          <div>
          </div>
          <div className="font-medium">
            by <span className={`font-bold font-display ${isLight ? 'text-[#1c2217]' : 'text-[#f4f6ee]'}`}>{AUTHOR_NAME}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
