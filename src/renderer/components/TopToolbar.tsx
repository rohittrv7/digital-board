import React, { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { setTool } from '../store/toolsSlice';
import { undo, redo } from '../store/historySlice';
import {
  Pen,
  Highlighter,
  Eraser,
  Square,
  Circle as CircleIcon,
  Minus,
  ArrowUpRight,
  Type,
  MousePointer,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  ChevronDown,
  FolderOpen,
  Save,
  Check,
  FileDown,
  FileUp,
  Loader2,
  Maximize2,
  Minimize2,
  Expand,
  Sun,
  Moon,
  MoreHorizontal,
  Info,
  BadgeCheck,
  ImagePlus
} from 'lucide-react';
import { setZoom, resetZoom, toggleShortcuts, toggleSidebar, setFullscreen, toggleZenMode, toggleTheme, toggleAbout, toggleWatermark } from '../store/uiSlice';
import { saveProjectToDisk, loadProjectFromDisk, exportAsPDF, importPDFAsSlides, setLectureTitle } from '../store/slidesSlice';

export const TopToolbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const activeTool = useAppSelector(state => state.tools.activeTool);
  const zoomLevel = useAppSelector(state => state.ui.zoomLevel);
  const isSidebarOpen = useAppSelector(state => state.ui.isSidebarOpen);
  const activeSlideId = useAppSelector(state => state.slides.activeSlideId);
  const undoStack = useAppSelector(state => state.history.undoStacks[activeSlideId] || []);
  const redoStack = useAppSelector(state => state.history.redoStacks[activeSlideId] || []);
  const isSaving = useAppSelector(state => state.slides.isSaving);
  const isExportingPdf = useAppSelector(state => state.slides.isExportingPdf);
  const isImportingPdf = useAppSelector(state => state.slides.isImportingPdf);
  const importPdfProgress = useAppSelector(state => state.slides.importPdfProgress);
  const lastSavedAt = useAppSelector(state => state.slides.lastSavedAt);
  const showWatermark = useAppSelector(state => state.ui.showWatermark);

  const [isShapesOpen, setIsShapesOpen] = useState(false);
  const shapesMenuRef = useRef<HTMLDivElement>(null);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        window.dispatchEvent(new CustomEvent('board:insert-image', { detail: { dataUrl } }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Keyboard shortcut I to open Image file selector
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) {
        return;
      }
      if (e.key === 'i' || e.key === 'I') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          imageInputRef.current?.click();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close shapes & more dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shapesMenuRef.current && !shapesMenuRef.current.contains(e.target as Node)) {
        setIsShapesOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSave = () => {
    window.dispatchEvent(new CustomEvent('board:commit-now'));
    dispatch(saveProjectToDisk());
  };

  const handleOpen = () => {
    dispatch(loadProjectFromDisk());
  };

  const isFullscreen = useAppSelector(state => state.ui.isFullscreen);
  const lectureTitle = useAppSelector(state => state.slides.lectureTitle);
  const theme = useAppSelector(state => state.ui.theme);
  const isLight = theme === 'light';

  const handleImportPdf = () => {
    window.dispatchEvent(new CustomEvent('board:commit-now'));
    dispatch(importPDFAsSlides());
  };

  const handleExportPdf = () => {
    window.dispatchEvent(new CustomEvent('board:commit-now'));
    dispatch(exportAsPDF());
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
      dispatch(setFullscreen(true));
    } else {
      document.exitFullscreen().catch(() => { });
      dispatch(setFullscreen(false));
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      dispatch(setFullscreen(!!document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [dispatch]);

  const isShapeActive = ['rectangle', 'circle', 'line', 'arrow'].includes(activeTool);

  const getShapeIcon = () => {
    switch (activeTool) {
      case 'circle': return <CircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />;
      case 'line': return <Minus className="w-4 h-4 sm:w-5 sm:h-5" />;
      case 'arrow': return <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />;
      default: return <Square className="w-4 h-4 sm:w-5 sm:h-5" />;
    }
  };

  const getShapeName = () => {
    switch (activeTool) {
      case 'circle': return 'Circle';
      case 'line': return 'Line';
      case 'arrow': return 'Arrow';
      default: return 'Shapes';
    }
  };

  return (
    <header className={`h-14 border-b flex items-center justify-between px-2 sm:px-4 z-40 gap-2 flex-shrink-0 transition-colors ${
      isLight ? 'bg-white border-[#dce5d0] shadow-xs' : 'bg-[#12150e] border-[#242b1d] shadow-md'
    }`}>
      {/* Left: Sidebar toggle, Title, Save & Open */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => dispatch(toggleSidebar())}
          className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
            isLight ? 'text-[#4e5841] hover:text-[#1c2217] hover:bg-[#e4ebd9]' : 'text-[#9ba38e] hover:text-[#f4f6ee] hover:bg-[#1f2618]'
          }`}
          title={isSidebarOpen ? "Hide Slide Sidebar" : "Show Slide Sidebar"}
        >
          {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
        </button>

        {/* Lecture / Session Title input */}
        <input
          type="text"
          value={lectureTitle}
          onChange={(e) => dispatch(setLectureTitle(e.target.value))}
          className={`px-2 py-2 rounded-md text-sm font-semibold w-24 sm:w-32 md:w-40 lg:w-48 xl:w-56 truncate border focus:outline-hidden transition-colors ${
            isLight
              ? 'bg-[#f0f4ea] border-[#cbd7bc] text-[#1c2217] focus:border-[#84a80e] focus:bg-white'
              : 'bg-[#0c0e0a] border-[#242b1d] text-[#f4f6ee] focus:border-[#C4F135] focus:bg-[#12150e]'
          }`}
          placeholder="Lecture Title..."
          title="Session / Lecture Title (used for PDF & project filenames)"
        />

        {/* Project Open / Save Buttons */}
        <div className={`flex items-center p-0.5 sm:p-1 rounded-lg border gap-0.5 transition-colors flex-shrink-0 ${
          isLight ? 'bg-[#f0f4ea] border-[#dce5d0]' : 'bg-[#0c0e0a]/90 border-[#242b1d]'
        }`}>
          <button
            type="button"
            onClick={handleOpen}
            className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
              isLight ? 'text-[#4e5841] hover:text-[#1c2217] hover:bg-[#e4ebd9]' : 'text-[#9ba38e] hover:text-[#f4f6ee] hover:bg-[#1f2618]'
            }`}
            title="Open .board Project"
          >
            <FolderOpen className={`w-5 h-5 ${isLight ? 'text-[#68880a]' : 'text-[#C4F135]'}`} />
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
              isLight ? 'text-[#4e5841] hover:text-[#1c2217] hover:bg-[#e4ebd9]' : 'text-[#9ba38e] hover:text-[#f4f6ee] hover:bg-[#1f2618]'
            }`}
            title="Save Project (Ctrl+S)"
          >
            <Save className="w-5 h-5 text-emerald-500" />
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className={`p-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
              isLight ? 'text-[#4e5841] hover:text-[#1c2217] hover:bg-[#e4ebd9]' : 'text-[#9ba38e] hover:text-[#f4f6ee] hover:bg-[#1f2618]'
            }`}
            title="Export All Slides as Multi-Page PDF"
          >
            {isExportingPdf ? (
              <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            ) : (
              <FileDown className="w-5 h-5 text-purple-400" />
            )}
          </button>
        </div>

        {lastSavedAt && (
          <div className="hidden 2xl:flex items-center gap-1 text-[10px] text-[#C4F135] font-tracked-mono font-bold">
            <Check className="w-3 h-3" />
            <span>Saved</span>
          </div>
        )}
      </div>

      {/* Center: Main Drawing Tools */}
      <div className={`flex items-center p-0.5 sm:p-1 rounded-lg border gap-0.5 sm:gap-1 shadow-inner transition-colors flex-shrink-0 ${
        isLight ? 'bg-[#f0f4ea] border-[#dce5d0]' : 'bg-[#0c0e0a]/90 border-[#242b1d]'
      }`}>
        {/* Pen */}
        <button
          type="button"
          onClick={() => dispatch(setTool('pen'))}
          title="Pen Tool (P)"
          className={`p-1.5 sm:p-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            activeTool === 'pen'
              ? 'bg-[#C4F135] text-[#0c0e0a] font-bold shadow-md shadow-[#C4F135]/25 ring-1 ring-[#C4F135]'
              : isLight
                ? 'text-[#4e5841] hover:text-[#1c2217] hover:bg-[#e4ebd9]'
                : 'text-[#9ba38e] hover:text-[#f4f6ee] hover:bg-[#1f2618]'
          }`}
        >
          <Pen className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Highlighter */}
        <button
          type="button"
          onClick={() => dispatch(setTool('highlighter'))}
          title="Highlighter (H)"
          className={`p-1.5 sm:p-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            activeTool === 'highlighter'
              ? 'bg-[#C4F135] text-[#0c0e0a] font-bold shadow-md shadow-[#C4F135]/25 ring-1 ring-[#C4F135]'
              : isLight
                ? 'text-[#4e5841] hover:text-[#1c2217] hover:bg-[#e4ebd9]'
                : 'text-[#9ba38e] hover:text-[#f4f6ee] hover:bg-[#1f2618]'
          }`}
        >
          <Highlighter className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Eraser */}
        <button
          type="button"
          onClick={() => dispatch(setTool('eraser'))}
          title="Eraser (E)"
          className={`p-1.5 sm:p-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            activeTool === 'eraser'
              ? 'bg-[#C4F135] text-[#0c0e0a] font-bold shadow-md shadow-[#C4F135]/25 ring-1 ring-[#C4F135]'
              : isLight
                ? 'text-[#4e5841] hover:text-[#1c2217] hover:bg-[#e4ebd9]'
                : 'text-[#9ba38e] hover:text-[#f4f6ee] hover:bg-[#1f2618]'
          }`}
        >
          <Eraser className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Shapes Dropdown Selector */}
        <div className="relative" ref={shapesMenuRef}>
          <button
            type="button"
            onClick={() => {
              if (!isShapeActive) {
                dispatch(setTool('rectangle'));
              }
              setIsShapesOpen(!isShapesOpen);
            }}
            title="Shapes (S)"
            className={`flex items-center gap-0.5 p-1.5 sm:p-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              isShapeActive
                ? 'bg-[#C4F135] text-[#0c0e0a] font-bold shadow-md shadow-[#C4F135]/25 ring-1 ring-[#C4F135]'
                : isLight
                  ? 'text-[#4e5841] hover:text-[#1c2217] hover:bg-[#e4ebd9]'
                  : 'text-[#9ba38e] hover:text-[#f4f6ee] hover:bg-[#1f2618]'
            }`}
          >
            {getShapeIcon()}
            <ChevronDown className={`w-3 h-3 transition-transform ${isShapesOpen ? 'rotate-180' : ''}`} />
          </button>

          {isShapesOpen && (
            <div className={`absolute top-full mt-1.5 left-0 border rounded-xl p-1.5 flex flex-col gap-1 min-w-[140px] z-50 animate-in fade-in zoom-in-95 duration-100 ${
              isLight ? 'bg-white border-[#dce5d0] shadow-xl' : 'bg-[#12150e] border-[#242b1d] shadow-2xl'
            }`}>
              <button
                type="button"
                onClick={() => {
                  dispatch(setTool('rectangle'));
                  setIsShapesOpen(false);
                }}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors ${
                  activeTool === 'rectangle'
                    ? 'bg-[#C4F135] text-[#0c0e0a]'
                    : isLight
                      ? 'text-[#2c371d] hover:bg-[#f0f4ea]'
                      : 'text-[#9ba38e] hover:bg-[#1e2518] hover:text-[#f4f6ee]'
                }`}
              >
                <Square className="w-4 h-4" />
                <span>Rectangle</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  dispatch(setTool('circle'));
                  setIsShapesOpen(false);
                }}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors ${
                  activeTool === 'circle'
                    ? 'bg-[#C4F135] text-[#0c0e0a]'
                    : isLight
                      ? 'text-[#2c371d] hover:bg-[#f0f4ea]'
                      : 'text-[#9ba38e] hover:bg-[#1e2518] hover:text-[#f4f6ee]'
                }`}
              >
                <CircleIcon className="w-4 h-4" />
                <span>Circle</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  dispatch(setTool('line'));
                  setIsShapesOpen(false);
                }}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors ${
                  activeTool === 'line'
                    ? 'bg-[#C4F135] text-[#0c0e0a]'
                    : isLight
                      ? 'text-[#2c371d] hover:bg-[#f0f4ea]'
                      : 'text-[#9ba38e] hover:bg-[#1e2518] hover:text-[#f4f6ee]'
                }`}
              >
                <Minus className="w-4 h-4" />
                <span>Straight Line</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  dispatch(setTool('arrow'));
                  setIsShapesOpen(false);
                }}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors ${
                  activeTool === 'arrow'
                    ? 'bg-[#C4F135] text-[#0c0e0a]'
                    : isLight
                      ? 'text-[#2c371d] hover:bg-[#f0f4ea]'
                      : 'text-[#9ba38e] hover:bg-[#1e2518] hover:text-[#f4f6ee]'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Arrow</span>
              </button>

              <div className={`w-full h-[1px] my-0.5 ${isLight ? 'bg-[#dce5d0]' : 'bg-[#242b1d]'}`} />

              <button
                type="button"
                onClick={() => {
                  setIsShapesOpen(false);
                  imageInputRef.current?.click();
                }}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors ${
                  isLight
                    ? 'text-[#2c371d] hover:bg-[#f0f4ea]'
                    : 'text-[#9ba38e] hover:bg-[#1e2518] hover:text-[#f4f6ee]'
                }`}
              >
                <ImagePlus className={`w-4 h-4 ${isLight ? 'text-[#68880a]' : 'text-[#C4F135]'}`} />
                <span>Insert Image...</span>
              </button>
            </div>
          )}
        </div>

        {/* Insert Image Tool */}
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          title="Insert Image (I)"
          className={`p-1.5 sm:p-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            isLight
              ? 'text-[#4e5841] hover:text-[#1c2217] hover:bg-[#e4ebd9]'
              : 'text-[#9ba38e] hover:text-[#f4f6ee] hover:bg-[#1f2618]'
          }`}
        >
          <ImagePlus className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.svg,.webp,image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Text */}
        <button
          type="button"
          onClick={() => dispatch(setTool('text'))}
          title="Text Tool (T)"
          className={`p-1.5 sm:p-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            activeTool === 'text'
              ? 'bg-[#C4F135] text-[#0c0e0a] font-bold shadow-md shadow-[#C4F135]/25 ring-1 ring-[#C4F135]'
              : isLight
                ? 'text-[#4e5841] hover:text-[#1c2217] hover:bg-[#e4ebd9]'
                : 'text-[#9ba38e] hover:text-[#f4f6ee] hover:bg-[#1f2618]'
          }`}
        >
          <Type className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Select */}
        <button
          type="button"
          onClick={() => dispatch(setTool('select'))}
          title="Select / Transform Tool (V)"
          className={`p-1.5 sm:p-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            activeTool === 'select'
              ? 'bg-[#C4F135] text-[#0c0e0a] font-bold shadow-md shadow-[#C4F135]/25 ring-1 ring-[#C4F135]'
              : isLight
                ? 'text-[#4e5841] hover:text-[#1c2217] hover:bg-[#e4ebd9]'
                : 'text-[#9ba38e] hover:text-[#f4f6ee] hover:bg-[#1f2618]'
          }`}
        >
          <MousePointer className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Laser */}
        <button
          type="button"
          onClick={() => dispatch(setTool('laser'))}
          title="Laser Pointer (L)"
          className={`p-1.5 sm:p-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            activeTool === 'laser'
              ? 'bg-[#C4F135] text-[#0c0e0a] font-bold shadow-md shadow-[#C4F135]/25 ring-1 ring-[#C4F135]'
              : isLight
                ? 'text-[#4e5841] hover:text-[#1c2217] hover:bg-[#e4ebd9]'
                : 'text-[#9ba38e] hover:text-[#f4f6ee] hover:bg-[#1f2618]'
          }`}
        >
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
        </button>
      </div>

      {/* Right: History, Zoom & Help */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {/* Undo / Redo */}
        <div className={`flex items-center p-0.5 sm:p-1 rounded-lg border gap-0.5 transition-colors ${
          isLight ? 'bg-[#f0f4ea] border-[#dce5d0]' : 'bg-[#0c0e0a]/90 border-[#242b1d]'
        }`}>
          <button
            type="button"
            onClick={() => dispatch(undo({ slideId: activeSlideId }))}
            disabled={undoStack.length <= 1}
            className={`p-1.5 rounded-lg transition-colors ${
              undoStack.length > 1
                ? isLight ? 'text-[#1c2217] hover:bg-[#e4ebd9]' : 'text-[#f4f6ee] hover:bg-[#1f2618]'
                : isLight ? 'text-[#9ba38e]/60 cursor-not-allowed' : 'text-[#636c58] cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => dispatch(redo({ slideId: activeSlideId }))}
            disabled={redoStack.length === 0}
            className={`p-1.5 rounded-lg transition-colors ${
              redoStack.length > 0
                ? isLight ? 'text-[#1c2217] hover:bg-[#e4ebd9]' : 'text-[#f4f6ee] hover:bg-[#1f2618]'
                : isLight ? 'text-[#9ba38e]/60 cursor-not-allowed' : 'text-[#636c58] cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom */}
        <div className={`flex items-center px-1.5 sm:px-2 py-1 rounded-lg border gap-0.5 text-xs transition-colors ${
          isLight ? 'bg-[#f0f4ea] border-[#dce5d0] text-[#1c2217]' : 'bg-[#0c0e0a]/90 border-[#242b1d] text-[#f4f6ee]'
        }`}>
          <button
            type="button"
            onClick={() => dispatch(setZoom(zoomLevel - 0.1))}
            className={`p-1 rounded transition-colors ${isLight ? 'hover:bg-[#e4ebd9] text-[#1c2217]' : 'hover:bg-[#1f2618] text-[#9ba38e] hover:text-[#f4f6ee]'}`}
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span 
            onDoubleClick={() => dispatch(resetZoom())}
            className="w-8 sm:w-10 text-center font-mono font-semibold text-[11px] sm:text-xs cursor-pointer select-none"
            title="Double-click to reset zoom & pan (100%)"
          >
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            onClick={() => dispatch(setZoom(zoomLevel + 0.1))}
            className={`p-1 rounded transition-colors ${isLight ? 'hover:bg-[#e4ebd9] text-[#1c2217]' : 'hover:bg-[#1f2618] text-[#9ba38e] hover:text-[#f4f6ee]'}`}
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => dispatch(resetZoom())}
            className={`p-1 rounded transition-colors ${
              isLight ? 'hover:bg-[#e4ebd9] text-[#636c58] hover:text-[#1c2217]' : 'hover:bg-[#1f2618] text-[#636c58] hover:text-[#C4F135]'
            }`}
            title="Reset Zoom & Pan (100% / Ctrl+0)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Extra actions on desktop (xl and up) */}
        <div className="hidden xl:flex items-center gap-1">
          {/* Zen Canvas Mode Toggle */}
          <button
            type="button"
            onClick={() => dispatch(toggleZenMode())}
            className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
              isLight ? 'text-[#4e5841] hover:text-[#1c2217] hover:bg-[#e4ebd9]' : 'text-[#9ba38e] hover:text-[#f4f6ee] hover:bg-[#1f2618]'
            }`}
            title="Fullscreen Zen Canvas Mode (F)"
          >
            <Expand className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
              isLight ? 'text-[#4e5841] hover:text-[#1c2217] hover:bg-[#e4ebd9]' : 'text-[#9ba38e] hover:text-[#f4f6ee] hover:bg-[#1f2618]'
            }`}
            title={isFullscreen ? "Exit Fullscreen (F11 / Esc)" : "Fullscreen Teaching Mode (F11)"}
          >
            {isFullscreen ? <Minimize2 className={`w-4 h-4 sm:w-5 sm:h-5 ${isLight ? 'text-[#68880a]' : 'text-[#C4F135]'}`} /> : <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          {/* Shortcuts */}
          <button
            type="button"
            onClick={() => dispatch(toggleShortcuts())}
            className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
              isLight ? 'text-[#4e5841] hover:text-[#1c2217] hover:bg-[#e4ebd9]' : 'text-[#9ba38e] hover:text-[#f4f6ee] hover:bg-[#1f2618]'
            }`}
            title="Keyboard Shortcuts (?)"
          >
            <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* About Dialog */}
          <button
            type="button"
            onClick={() => dispatch(toggleAbout())}
            className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
              isLight ? 'text-[#4e5841] hover:text-[#1c2217] hover:bg-[#e4ebd9]' : 'text-[#9ba38e] hover:text-[#f4f6ee] hover:bg-[#1f2618]'
            }`}
            title="About Digital Teaching Board (ⓘ)"
          >
            <Info className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Watermark Toggle */}
          <button
            type="button"
            onClick={() => dispatch(toggleWatermark())}
            className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
              showWatermark
                ? isLight ? 'text-[#58730b] bg-[#C4F135]/25 ring-1 ring-[#84a80e]/40' : 'text-[#0c0e0a] bg-[#C4F135] shadow-xs'
                : isLight ? 'text-[#828f74] hover:text-[#1c2217] hover:bg-[#e4ebd9]' : 'text-[#636c58] hover:text-[#9ba38e] hover:bg-[#1f2618]'
            }`}
            title={showWatermark ? "Watermark: ON (Click to Hide)" : "Watermark: OFF (Click to Show)"}
          >
            <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Theme Toggle (Always visible) */}
        <button
          type="button"
          onClick={() => dispatch(toggleTheme())}
          className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
            isLight ? 'text-amber-700 hover:text-amber-800 hover:bg-[#e4ebd9]' : 'text-[#9ba38e] hover:text-[#C4F135] hover:bg-[#1f2618]'
          }`}
          title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
          {isLight ? <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" /> : <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-[#C4F135]" />}
        </button>

        {/* More Menu (visible on screens below xl) */}
        <div className="relative xl:hidden" ref={moreMenuRef}>
          <button
            type="button"
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
              isMoreOpen
                ? 'bg-[#C4F135] text-[#0c0e0a]'
                : isLight
                  ? 'text-[#4e5841] hover:text-[#1c2217] hover:bg-[#e4ebd9]'
                  : 'text-[#9ba38e] hover:text-[#f4f6ee] hover:bg-[#1f2618]'
            }`}
            title="More Options"
          >
            <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {isMoreOpen && (
            <div className={`absolute right-0 top-full mt-1.5 border rounded-xl p-1.5 flex flex-col gap-1 min-w-[170px] z-50 animate-in fade-in zoom-in-95 duration-100 shadow-2xl ${
              isLight ? 'bg-white border-[#dce5d0] text-[#1c2217]' : 'bg-[#12150e] border-[#242b1d] text-[#f4f6ee]'
            }`}>
              <button
                type="button"
                onClick={() => {
                  dispatch(toggleZenMode());
                  setIsMoreOpen(false);
                }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isLight ? 'hover:bg-[#f0f4ea] text-[#1c2217]' : 'hover:bg-[#1e2518] text-[#f4f6ee]'
                }`}
              >
                <Expand className="w-4 h-4" />
                <span>Zen Canvas (F)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleToggleFullscreen();
                  setIsMoreOpen(false);
                }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isLight ? 'hover:bg-[#f0f4ea] text-[#1c2217]' : 'hover:bg-[#1e2518] text-[#f4f6ee]'
                }`}
              >
                {isFullscreen ? <Minimize2 className={`w-4 h-4 ${isLight ? 'text-[#68880a]' : 'text-[#C4F135]'}`} /> : <Maximize2 className="w-4 h-4" />}
                <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen (F11)'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  dispatch(toggleShortcuts());
                  setIsMoreOpen(false);
                }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isLight ? 'hover:bg-[#f0f4ea] text-[#1c2217]' : 'hover:bg-[#1e2518] text-[#f4f6ee]'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Shortcuts (?)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  dispatch(toggleAbout());
                  setIsMoreOpen(false);
                }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isLight ? 'hover:bg-[#f0f4ea] text-[#1c2217]' : 'hover:bg-[#1e2518] text-[#f4f6ee]'
                }`}
              >
                <Info className={`w-4 h-4 ${isLight ? 'text-[#68880a]' : 'text-[#C4F135]'}`} />
                <span>About App</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  dispatch(toggleWatermark());
                  setIsMoreOpen(false);
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isLight ? 'hover:bg-[#f0f4ea] text-[#1c2217]' : 'hover:bg-[#1e2518] text-[#f4f6ee]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BadgeCheck className={`w-4 h-4 ${showWatermark ? (isLight ? 'text-[#68880a]' : 'text-[#C4F135]') : 'text-[#636c58]'}`} />
                  <span>Watermark</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  showWatermark
                    ? 'bg-[#C4F135] text-[#0c0e0a]'
                    : isLight ? 'bg-[#e4ebd9] text-[#636c58]' : 'bg-[#1f2618] text-[#9ba38e]'
                }`}>
                  {showWatermark ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
