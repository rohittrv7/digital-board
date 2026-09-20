import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { useAppSelector } from '../store';

interface DeleteSlideModalProps {
  isOpen: boolean;
  slideNumber: number;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteSlideModal: React.FC<DeleteSlideModalProps> = ({
  isOpen,
  slideNumber,
  onClose,
  onConfirm
}) => {
  const theme = useAppSelector(state => state.ui.theme);
  const isLight = theme === 'light';

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-sm rounded-2xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transition-colors ${
          isLight ? 'bg-white border-[#dce5d0] text-[#1c2217]' : 'bg-[#12150e] border-[#242b1d] text-[#f4f6ee]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${
          isLight ? 'border-[#dce5d0] bg-red-50/50' : 'border-[#242b1d] bg-red-950/20'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/15 text-red-500 border border-red-500/30">
              <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight font-display text-red-500">
                Delete Slide {slideNumber}?
              </h2>
              <p className={`text-xs ${isLight ? 'text-[#616c54]' : 'text-[#9ba38e]'}`}>
                Is slide ko delete karna hai?
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isLight ? 'hover:bg-[#e4ebd8] text-[#616c54]' : 'hover:bg-[#1c2217] text-[#9ba38e]'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3 text-sm">
          <p className={isLight ? 'text-[#3d4536]' : 'text-[#c6cfbd]'}>
            Kya aap sach mein <strong className="font-semibold text-red-400">Slide {slideNumber}</strong> ko delete karna chahte hain?
          </p>
          <p className={`text-xs ${isLight ? 'text-[#616c54]' : 'text-[#9ba38e]'}`}>
            Delete karne ke baad aap agle 5 second ke andar <strong>Undo</strong> karke ise wapas restore kar sakte hain.
          </p>
        </div>

        {/* Actions */}
        <div className={`px-5 py-3.5 border-t flex items-center justify-end gap-2.5 ${
          isLight ? 'border-[#dce5d0] bg-[#f0f4ea]/40' : 'border-[#242b1d] bg-[#171c12]/40'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
              isLight
                ? 'border-[#dce5d0] hover:bg-[#e4ebd8] text-[#3d4536]'
                : 'border-[#2e3725] hover:bg-[#1c2217] text-[#9ba38e] hover:text-[#f4f6ee]'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Slide</span>
          </button>
        </div>
      </div>
    </div>
  );
};
