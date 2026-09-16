import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector, store } from './store';
import { TopToolbar } from './components/TopToolbar';
import { SlideSidebar } from './components/SlideSidebar';
import { StrokeWidthSlider } from './components/StrokeWidthSlider';
import { ColorPaletteStrip, PRESET_COLORS } from './components/ColorPaletteStrip';
import { BackgroundPickerStrip } from './components/BackgroundPickerStrip';
import { ShortcutsModal } from './components/ShortcutsModal';
import { AboutModal, AUTHOR_NAME } from './components/AboutModal';
import { BoardCanvas } from './features/canvas/BoardCanvas';
import { setTool, setColor } from './store/toolsSlice';
import { undo, redo } from './store/historySlice';
import { toggleShortcuts, setShortcutsOpen, toggleZenMode, setZenMode, resetZoom } from './store/uiSlice';
import {
  saveProjectToDisk,
  setSlides,
  nextSlide,
  prevSlide,
  addSlide,
  duplicateSlide,
  deleteSlide,
  setSlideBackground,
  BackgroundType
} from './store/slidesSlice';
import { setupAutoSave } from './services/storageService';
import { ChevronLeft, ChevronRight, Pen, Highlighter, Eraser, RotateCcw, Plus } from 'lucide-react';

export const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const slides = useAppSelector(state => state.slides.slides);
  const activeSlideId = useAppSelector(state => state.slides.activeSlideId);
  const zoomLevel = useAppSelector(state => state.ui.zoomLevel);
  const panOffset = useAppSelector(state => state.ui.panOffset);
  const isPanning = useAppSelector(state => state.ui.isPanning);
  const isZenMode = useAppSelector(state => state.ui.isZenMode);
  const isShortcutsOpen = useAppSelector(state => state.ui.isShortcutsOpen);
  const strokeColor = useAppSelector(state => state.tools.strokeColor);
  const activeTool = useAppSelector(state => state.tools.activeTool);
  const theme = useAppSelector(state => state.ui.theme);
  const isLight = theme === 'light';

  // Zen Mode Toast indicator state
  const [zenToastVisible, setZenToastVisible] = useState(false);
  const zenToastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Startup Attribution Splash Toast state
  const [showLaunchSplash, setShowLaunchSplash] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShowLaunchSplash(false), 2600);
    return () => clearTimeout(timer);
  }, []);

  // Zen Mode Floating Color Popup state
  const [isZenColorPopupOpen, setIsZenColorPopupOpen] = useState(false);
  const zenColorPopupRef = useRef<HTMLDivElement>(null);
  const isZenColorPopupOpenRef = useRef(false);
  isZenColorPopupOpenRef.current = isZenColorPopupOpen;

  // References to keep event listeners synchronized and fresh
  const slidesRef = useRef(slides);
  slidesRef.current = slides;
  const activeSlideIdRef = useRef(activeSlideId);
  activeSlideIdRef.current = activeSlideId;
  const isZenModeRef = useRef(isZenMode);
  isZenModeRef.current = isZenMode;
  const isShortcutsOpenRef = useRef(isShortcutsOpen);
  isShortcutsOpenRef.current = isShortcutsOpen;

  // Native Electron FullScreen synchronization with Zen Mode
  useEffect(() => {
    if (window.electronAPI?.setFullScreen) {
      window.electronAPI.setFullScreen(isZenMode).catch(() => {});
    }
  }, [isZenMode]);

  // Listen to native window fullscreen changes (e.g. user exits via OS controls)
  useEffect(() => {
    if (window.electronAPI?.onFullScreenChanged) {
      const cleanup = window.electronAPI.onFullScreenChanged((isFull) => {
        if (!isFull && isZenModeRef.current) {
          dispatch(setZenMode(false));
        }
      });
      return cleanup;
    }
  }, [dispatch]);

  // Show indicator toast whenever Zen mode is engaged
  useEffect(() => {
    if (isZenMode) {
      setZenToastVisible(true);
      if (zenToastTimerRef.current) clearTimeout(zenToastTimerRef.current);
      zenToastTimerRef.current = setTimeout(() => {
        setZenToastVisible(false);
      }, 2800);
    } else {
      setZenToastVisible(false);
      setIsZenColorPopupOpen(false);
    }
  }, [isZenMode]);

  // Close floating color palette on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (zenColorPopupRef.current && !zenColorPopupRef.current.contains(e.target as Node)) {
        setIsZenColorPopupOpen(false);
      }
    };
    if (isZenColorPopupOpen) {
      document.addEventListener('pointerdown', handleOutsideClick);
      return () => document.removeEventListener('pointerdown', handleOutsideClick);
    }
  }, [isZenColorPopupOpen]);

  // Setup 60s Auto-Save cycle & Window close handler
  useEffect(() => {
    const cleanup = setupAutoSave(() => {
      window.dispatchEvent(new CustomEvent('board:commit-now'));
      return store.getState();
    }, 60000);
    return cleanup;
  }, []);

  // Restore auto-saved session on initial launch if present
  useEffect(() => {
    const checkAutoSave = async () => {
      if (window.electronAPI) {
        try {
          const savedData = await window.electronAPI.loadAutoSave();
          if (savedData) {
            const parsed = JSON.parse(savedData);
            if (Array.isArray(parsed.slides) && parsed.slides.length > 0) {
              dispatch(setSlides({
                slides: parsed.slides,
                activeSlideId: parsed.activeSlideId || parsed.slides[0].id
              }));
            }
          }
        } catch (e) {
          console.warn('Auto-save load notice:', e);
        }
      }
    };
    checkAutoSave();
  }, [dispatch]);

  // Helper to determine if user is currently typing in an input or canvas text box
  const isEditingText = (): boolean => {
    // 1. Standard HTML form inputs, textareas, and contenteditable elements
    const activeEl = document.activeElement;
    if (activeEl) {
      const tagName = activeEl.tagName.toUpperCase();
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || activeEl.getAttribute('contenteditable') === 'true') {
        return true;
      }
    }
    // 2. Fabric.js active text editing state
    const fabricCanvas = (window as any).__fabricCanvas;
    if (fabricCanvas) {
      const activeObj = fabricCanvas.getActiveObject();
      if (activeObj && (activeObj.isEditing || (activeObj as any).__isEditing)) {
        return true;
      }
    }
    return false;
  };

  // Comprehensive Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // SHIELD: Never intercept shortcuts when user is actively editing text
      if (isEditingText()) {
        return;
      }

      const currentSlideId = activeSlideIdRef.current;
      const currentSlides = slidesRef.current;

      // 1. Save Project (Ctrl+S / Cmd+S)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('board:commit-now'));
        dispatch(saveProjectToDisk());
        return;
      }

      // 2. Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        dispatch(undo({ slideId: currentSlideId }));
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        dispatch(redo({ slideId: currentSlideId }));
        return;
      }

      // 3. Slide Operations: New Slide (Ctrl+N), Duplicate Slide (Ctrl+D)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('board:commit-now'));
        dispatch(addSlide());
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('board:commit-now'));
        dispatch(duplicateSlide(currentSlideId));
        return;
      }

      // 4. Slide Operations: Delete Slide (Ctrl+Delete / Ctrl+Backspace with safeguard)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        if (currentSlides.length <= 1) {
          return;
        }
        const confirmed = window.confirm('Are you sure you want to delete this slide? This action cannot be undone.');
        if (confirmed) {
          dispatch(deleteSlide(currentSlideId));
        }
        return;
      }

      // 5. Canvas Object Deletion (Delete / Backspace without Ctrl)
      if (!e.ctrlKey && !e.metaKey && (e.key === 'Delete' || e.key === 'Backspace')) {
        const fabricCanvas = (window as any).__fabricCanvas;
        if (fabricCanvas) {
          const activeObjects = fabricCanvas.getActiveObjects();
          if (activeObjects && activeObjects.length > 0) {
            e.preventDefault();
            activeObjects.forEach((obj: any) => fabricCanvas.remove(obj));
            fabricCanvas.discardActiveObject();
            fabricCanvas.renderAll();
            window.dispatchEvent(new CustomEvent('board:commit-now'));
            return;
          }
        }
      }

      // 6. Background Shortcuts (Ctrl+1 to Ctrl+6)
      if (e.ctrlKey || e.metaKey) {
        const bgMap: Record<string, BackgroundType> = {
          '1': 'chalkboard',
          '2': 'blackboard', // Green Board
          '3': 'white',      // Whiteboard
          '4': 'ruled',      // Ruled Lines
          '5': 'grid',       // Math Grid
          '6': 'dots'        // Dot Paper
        };
        if (bgMap[e.key]) {
          e.preventDefault();
          dispatch(setSlideBackground({
            id: currentSlideId,
            background: { type: bgMap[e.key] }
          }));
          return;
        }
      }

      // 7. Slide Navigation (Right Arrow / PageDown = Next, Left Arrow / PageUp = Prev)
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('board:commit-now'));
        dispatch(nextSlide());
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('board:commit-now'));
        dispatch(prevSlide());
        return;
      }

      // 8. Reset Zoom & Center Pan (Ctrl+0 / Cmd+0)
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        dispatch(resetZoom());
        return;
      }

      // 9. Fullscreen Zen Canvas Mode (Key: F)
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        dispatch(toggleZenMode());
        return;
      }

      // 9. Escape key: Close Color Popup, or Close Modal, or Exit Zen Mode
      if (e.key === 'Escape') {
        if (isZenColorPopupOpenRef.current) {
          e.preventDefault();
          setIsZenColorPopupOpen(false);
          return;
        }
        if (isShortcutsOpenRef.current) {
          e.preventDefault();
          dispatch(setShortcutsOpen(false));
          return;
        }
        if (isZenModeRef.current) {
          e.preventDefault();
          dispatch(setZenMode(false));
          return;
        }
      }

      // 10. Quick Colors: Number Keys 1 to 9 (First 9 Palette Colors)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 9) {
          e.preventDefault();
          const targetColor = PRESET_COLORS[num - 1];
          if (targetColor) {
            dispatch(setColor(targetColor.hex));
          }
          return;
        }
      }

      // 11. Drawing Tools switches (P/H/E/S/T/V/L/?)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'p') dispatch(setTool('pen'));
        else if (key === 'h') dispatch(setTool('highlighter'));
        else if (key === 'e') dispatch(setTool('eraser'));
        else if (key === 's') dispatch(setTool('rectangle'));
        else if (key === 't') dispatch(setTool('text'));
        else if (key === 'v') dispatch(setTool('select'));
        else if (key === 'l') dispatch(setTool('laser'));
        else if (e.key === '?') dispatch(toggleShortcuts());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch]);

  return (
    <div className={`flex flex-col w-screen h-screen overflow-hidden font-sans transition-colors ${
      isLight ? 'bg-[#f7f9f3] text-[#1c2217]' : 'bg-[#0c0e0a] text-[#f4f6ee]'
    }`}>
      {/* 1. Top Toolbar (Hidden in Zen Canvas Mode) */}
      {!isZenMode && <TopToolbar />}

      {/* 2. Main Work Area (Sidebar + Canvas + Stroke Slider) */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-row overflow-hidden relative">
        {/* Slide Panel (Hidden in Zen Canvas Mode) */}
        {!isZenMode && <SlideSidebar />}

        {/* Center Canvas Area with Fabric.js BoardCanvas */}
        <main
          className={`flex-1 min-w-0 min-h-0 flex flex-col items-center justify-between overflow-hidden relative transition-colors ${
            isLight ? 'bg-[#f0f4ea]' : 'bg-[#0c0e0a]'
          } ${
            isZenMode ? 'p-0' : 'p-2 sm:p-3'
          }`}
        >
          {/* Zen Mode Fade-out Indicator Toast */}
          {zenToastVisible && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-4">
              <div className="bg-[#12150e]/95 backdrop-blur-md border border-[#242b1d] text-[#f4f6ee] px-4 py-2 rounded-full shadow-2xl flex items-center gap-2.5 text-xs font-semibold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-[#C4F135] animate-ping" />
                <span>
                  Zen Canvas Mode &bull; Press{' '}
                  <kbd className="px-1.5 py-0.5 bg-[#1c2217] border border-[#2e3725] rounded text-[11px] font-mono text-[#C4F135]">
                    F
                  </kbd>{' '}
                  or{' '}
                  <kbd className="px-1.5 py-0.5 bg-[#1c2217] border border-[#2e3725] rounded text-[11px] font-mono text-[#C4F135]">
                    Esc
                  </kbd>{' '}
                  to exit
                </span>
              </div>
            </div>
          )}

          {/* Floating Re-center Pill when Canvas is Zoomed or Panned */}
          {(zoomLevel !== 1 || panOffset.x !== 0 || panOffset.y !== 0) && (
            <button
              type="button"
              onClick={() => dispatch(resetZoom())}
              className={`absolute top-4 right-4 z-30 px-3 py-1.5 rounded-lg backdrop-blur-md border text-xs font-semibold shadow-xl flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 animate-in fade-in ${
                isLight
                  ? 'bg-white/90 hover:bg-white border-[#dce5d0] text-[#1c2217]'
                  : 'bg-[#12150e]/90 hover:bg-[#1f2618] border-[#242b1d] text-[#f4f6ee]'
              }`}
              title="Reset Zoom & Pan (Ctrl+0)"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLight ? 'text-[#68880a]' : 'text-[#C4F135]'}`} />
              <span>{Math.round(zoomLevel * 100)}% &bull; Re-center</span>
            </button>
          )}

          <div
            id="canvas-stage"
            className="w-full flex-1 min-h-0 flex items-center justify-center relative overflow-hidden"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.12s cubic-bezier(0.2, 0, 0, 1)'
            }}
          >
            <BoardCanvas />
          </div>

          {/* Floating Slide Navigation Pill in Fullscreen / Zen Mode */}
          {isZenMode && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#12150e]/95 backdrop-blur-md border border-[#242b1d] px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-2.5 select-none animate-in fade-in slide-in-from-bottom-3 duration-200">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('board:commit-now'));
                  dispatch(prevSlide());
                }}
                disabled={slides.findIndex(s => s.id === activeSlideId) <= 0}
                className="p-1 rounded-full text-[#9ba38e] hover:text-[#f4f6ee] hover:bg-[#1f2618] disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-[#9ba38e] transition-colors"
                title="Previous Slide (Left Arrow / PageUp)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-mono font-bold text-[#f4f6ee] tracking-wider px-1">
                {slides.findIndex(s => s.id === activeSlideId) + 1} / {slides.length}
              </span>

              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('board:commit-now'));
                  dispatch(nextSlide());
                }}
                disabled={slides.findIndex(s => s.id === activeSlideId) >= slides.length - 1}
                className="p-1 rounded-full text-[#9ba38e] hover:text-[#f4f6ee] hover:bg-[#1f2618] disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-[#9ba38e] transition-colors"
                title="Next Slide (Right Arrow / PageDown)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="w-[1px] h-4 bg-[#242b1d] mx-0.5" />

              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('board:commit-now'));
                  dispatch(addSlide());
                }}
                className="w-6 h-6 rounded-full bg-[#C4F135] text-[#0c0e0a] flex items-center justify-center hover:bg-[#d2f84b] hover:scale-110 active:scale-95 shadow-md shadow-[#C4F135]/25 transition-all"
                title="Add New Slide (+)"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>
          )}

          {/* Floating Pencil / Color Palette Button in Zen Canvas Mode */}
          {isZenMode && (
            <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
              {isZenColorPopupOpen && (
                <div 
                  ref={zenColorPopupRef}
                  className="mb-3 p-3 bg-[#12150e]/95 backdrop-blur-md border border-[#242b1d] rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150 flex flex-col gap-2.5 min-w-[200px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#242b1d] text-[11px] font-semibold text-[#9ba38e]">
                    <span className="font-tracked-mono text-[10px]">Quick Palette</span>
                    <span className="text-[10px] text-[#636c58] font-mono">1-9</span>
                  </div>

                  {/* Quick Tool Switch Row */}
                  <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-[#242b1d]">
                    <button
                      type="button"
                      onClick={() => { dispatch(setTool('pen')); setIsZenColorPopupOpen(false); }}
                      className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                        activeTool === 'pen' ? 'bg-[#C4F135] text-[#0c0e0a]' : 'text-[#9ba38e] hover:bg-[#1f2618] hover:text-[#f4f6ee]'
                      }`}
                      title="Pen Tool (P)"
                    >
                      <Pen className="w-3 h-3" />
                      <span>Pen</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { dispatch(setTool('highlighter')); setIsZenColorPopupOpen(false); }}
                      className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                        activeTool === 'highlighter' ? 'bg-[#C4F135] text-[#0c0e0a]' : 'text-[#9ba38e] hover:bg-[#1f2618] hover:text-[#f4f6ee]'
                      }`}
                      title="Highlighter (H)"
                    >
                      <Highlighter className="w-3 h-3" />
                      <span>Highlight</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { dispatch(setTool('eraser')); setIsZenColorPopupOpen(false); }}
                      className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                        activeTool === 'eraser' ? 'bg-[#C4F135] text-[#0c0e0a]' : 'text-[#9ba38e] hover:bg-[#1f2618] hover:text-[#f4f6ee]'
                      }`}
                      title="Eraser (E)"
                    >
                      <Eraser className="w-3 h-3" />
                      <span>Eraser</span>
                    </button>
                  </div>

                  {/* 12 Color Swatches Grid */}
                  <div className="grid grid-cols-4 gap-2">
                    {PRESET_COLORS.map((c, idx) => {
                      const isSelected = strokeColor.toLowerCase() === c.hex.toLowerCase();
                      return (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => {
                            dispatch(setColor(c.hex));
                            if (activeTool === 'eraser') dispatch(setTool('pen'));
                            setIsZenColorPopupOpen(false);
                          }}
                          className={`w-7 h-7 rounded-full border-2 transition-transform flex items-center justify-center ${
                            isSelected ? 'border-[#C4F135] scale-110 shadow-md ring-2 ring-[#C4F135]/50' : 'border-[#242b1d] hover:scale-105'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={`${c.name} (${idx + 1})`}
                        >
                          {isSelected && (
                            <div className={`w-1.5 h-1.5 rounded-full ${c.hex === '#ffffff' || c.hex === '#fef08a' || c.hex.toLowerCase() === '#c4f135' ? 'bg-[#0c0e0a]' : 'bg-white'}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Floating Pencil Action Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsZenColorPopupOpen(!isZenColorPopupOpen);
                }}
                className="w-11 h-11 rounded-full bg-[#12150e]/95 hover:bg-[#1f2618] backdrop-blur-md border border-[#242b1d] shadow-2xl text-[#f4f6ee] flex items-center justify-center transition-all hover:scale-105 active:scale-95 group relative"
                title="Color & Tool Palette (Zen Mode)"
              >
                <Pen className="w-5 h-5 text-[#f4f6ee]" />
                {/* Active color dot indicator */}
                <span 
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#12150e] shadow-sm"
                  style={{ backgroundColor: strokeColor }}
                />
              </button>
            </div>
          )}

          {/* 3. Bottom Strip: Color Palette & Background Picker (Hidden in Zen Canvas Mode) */}
          {!isZenMode && (
            <div className="w-full flex-shrink-0 pt-1.5 pb-0.5 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 z-30 pointer-events-auto max-w-full px-1 sm:px-2 overflow-x-auto select-none">
              <ColorPaletteStrip />
              <BackgroundPickerStrip />
            </div>
          )}
        </main>

        {/* Stroke Width Slider (Hidden in Zen Canvas Mode) */}
        {!isZenMode && <StrokeWidthSlider />}
      </div>

      {/* Startup Attribution Splash Badge */}
      {showLaunchSplash && (
        <div className="fixed bottom-3 right-4 z-50 pointer-events-none transition-all duration-700 animate-in fade-in slide-in-from-bottom-2">
          <div className="px-3 py-1.5 rounded-xl backdrop-blur-md bg-[#12150e]/95 border border-[#242b1d] text-[#f4f6ee] shadow-2xl flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#C4F135] animate-pulse" />
            <span className="font-semibold font-display">Digital Teaching Board</span>
            <span className="text-[#636c58]">&bull;</span>
            <span className="text-[#C4F135] font-tracked-mono text-[10px]">by {AUTHOR_NAME}</span>
          </div>
        </div>
      )}

      {/* About Application Modal */}
      <AboutModal />

      {/* Shortcuts Help Modal */}
      <ShortcutsModal />
    </div>
  );
};

export default App;
