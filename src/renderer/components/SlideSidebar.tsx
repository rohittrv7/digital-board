import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { addSlide, deleteSlide, duplicateSlide, reorderSlides, setActiveSlide, importPDFAsSlides } from '../store/slidesSlice';
import { Plus, Copy, Trash2, Layers, GripVertical, FileUp, Loader2 } from 'lucide-react';

export const SlideSidebar: React.FC = () => {
  const dispatch = useAppDispatch();
  const slides = useAppSelector(state => state.slides.slides);
  const activeSlideId = useAppSelector(state => state.slides.activeSlideId);
  const isSidebarOpen = useAppSelector(state => state.ui.isSidebarOpen);
  const isImportingPdf = useAppSelector(state => state.slides.isImportingPdf);
  const importPdfProgress = useAppSelector(state => state.slides.importPdfProgress);
  const theme = useAppSelector(state => state.ui.theme);
  const isLight = theme === 'light';

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (!isSidebarOpen) return null;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = Number(e.dataTransfer.getData('text/plain'));
    if (!isNaN(sourceIndex) && sourceIndex !== targetIndex) {
      dispatch(reorderSlides({ fromIndex: sourceIndex, toIndex: targetIndex }));
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <aside className={`w-40 sm:w-44 md:w-48 lg:w-56 xl:w-60 max-w-[260px] border-r flex flex-col h-full z-20 shadow-xl flex-shrink-0 transition-all duration-200 ${
      isLight ? 'bg-[#f7f9f3] border-[#dce5d0] text-[#1c2217]' : 'bg-[#12150e] border-[#242b1d] text-[#f4f6ee]'
    }`}>
      {/* Sidebar Header */}
      <div className={`p-2.5 sm:p-3 border-b flex items-center justify-between flex-shrink-0 transition-colors ${
        isLight ? 'border-[#dce5d0] bg-[#ffffff]/60' : 'border-[#242b1d] bg-[#171c12]/40'
      }`}>
        <div className={`flex items-center gap-1.5 font-tracked-mono text-[11px] font-bold ${
          isLight ? 'text-[#556046]' : 'text-[#9ba38e]'
        }`}>
          <Layers className={`w-4 h-4 ${isLight ? 'text-[#68880a]' : 'text-[#C4F135]'}`} />
          <span>Slides ({slides.length})</span>
        </div>
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('board:commit-now'));
            dispatch(addSlide());
          }}
          className="flex items-center gap-1 text-xs bg-[#C4F135] hover:bg-[#d2f84b] text-[#0c0e0a] font-bold px-2.5 py-1 rounded-lg transition-transform active:scale-95 shadow-sm shadow-[#C4F135]/25"
          title="Add New Slide"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New</span>
        </button>
      </div>

      {/* Thumbnails list */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2.5">
        {slides.map((slide, index) => {
          const isActive = slide.id === activeSlideId;
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;

          return (
            <div
              key={slide.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => {
                window.dispatchEvent(new CustomEvent('board:commit-now'));
                dispatch(setActiveSlide(slide.id));
              }}
              className={`group relative rounded-lg p-2 cursor-pointer border-2 transition-all select-none ${
                isDragging ? 'opacity-40 scale-95 border-dashed border-[#C4F135]' : ''
              } ${
                isDragOver ? 'border-t-4 border-t-[#C4F135]' : ''
              } ${
                isActive
                  ? isLight
                    ? 'border-[#84a80e] bg-[#C4F135]/15 shadow-md shadow-[#84a80e]/15 ring-1 ring-[#84a80e]/40'
                    : 'border-[#C4F135] bg-[#C4F135]/10 shadow-md shadow-[#C4F135]/20 ring-1 ring-[#C4F135]/40'
                  : isLight
                    ? 'border-[#dce5d0] bg-white hover:border-[#cbd7bc] hover:bg-[#f0f4ea]'
                    : 'border-[#242b1d] bg-[#171c12] hover:border-[#35402a] hover:bg-[#1e2518]'
              }`}
            >
              {/* Slide Number & Header */}
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <div className="flex items-center gap-1">
                  <div className={`cursor-grab active:cursor-grabbing ${
                    isLight ? 'text-[#828f74] hover:text-[#434d37]' : 'text-[#636c58] hover:text-[#9ba38e]'
                  }`} title="Drag to reorder">
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>
                  <span className={`text-xs font-mono font-bold ${
                    isActive
                      ? isLight ? 'text-[#58730b]' : 'text-[#C4F135]'
                      : isLight ? 'text-[#616c54]' : 'text-[#9ba38e]'
                  }`}>
                    Slide {index + 1}
                  </span>
                </div>
                
                {/* Actions: Duplicate & Delete */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.dispatchEvent(new CustomEvent('board:commit-now'));
                      dispatch(duplicateSlide(slide.id));
                    }}
                    className={`p-1 rounded transition-colors ${
                      isLight
                        ? 'text-[#616c54] hover:text-[#1c2217] hover:bg-[#e4ebd9]'
                        : 'text-[#9ba38e] hover:text-[#f4f6ee] hover:bg-[#242b1d]'
                    }`}
                    title="Duplicate Slide"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  {slides.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent('board:request-delete-slide', {
                          detail: { slideId: slide.id }
                        }));
                      }}
                      className={`p-1 rounded transition-colors ${
                        isLight
                          ? 'text-red-600 hover:text-red-700 hover:bg-red-100'
                          : 'text-red-400 hover:text-red-300 hover:bg-red-950/50'
                      }`}
                      title="Delete Slide"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Live Canvas Thumbnail Preview (Aspect 16:9) */}
              <div className={`w-full aspect-video rounded-md overflow-hidden border relative flex items-center justify-center shadow-inner ${
                isLight ? 'border-[#dce5d0] bg-[#f0f4ea]' : 'border-[#242b1d] bg-[#0c0e0a]'
              }`}>
                {slide.thumbnail ? (
                  <img 
                    src={slide.thumbnail} 
                    alt={`Slide ${index + 1}`} 
                    className="w-full h-full object-contain pointer-events-none" 
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center text-[10px] font-mono capitalize ${
                    slide.background.type === 'white' ? 'bg-white text-slate-700' :
                    slide.background.type === 'blackboard' ? 'bg-[#15241b] text-[#C4F135]' :
                    'bg-[#0c0e0a] text-[#9ba38e]'
                  }`}>
                    {slide.background.type}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer: Quick Import PDF button */}
      <div className={`p-2 sm:p-2.5 border-t flex items-center justify-center flex-shrink-0 transition-colors ${
        isLight ? 'border-[#dce5d0] bg-[#ffffff]/60' : 'border-[#242b1d] bg-[#171c12]/40'
      }`}>
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('board:commit-now'));
            dispatch(importPDFAsSlides());
          }}
          disabled={isImportingPdf}
          className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-colors shadow-xs disabled:opacity-50 ${
            isLight
              ? 'bg-[#f0f4ea] hover:bg-[#e4ebd9] text-[#2c371d] border-[#cbd7bc]'
              : 'bg-[#1c2217] hover:bg-[#252d1f] text-[#f4f6ee] border-[#2e3725]'
          }`}
          title="Import Multi-Page PDF as Slides"
        >
          {isImportingPdf ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C4F135]" />
          ) : (
            <FileUp className={`w-3.5 h-3.5 ${isLight ? 'text-[#68880a]' : 'text-[#C4F135]'}`} />
          )}
          <span>{isImportingPdf ? (importPdfProgress || 'Importing...') : 'Import PDF'}</span>
        </button>
      </div>
    </aside>
  );
};
