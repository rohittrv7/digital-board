import React from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { setShortcutsOpen } from '../store/uiSlice';
import { X, Keyboard, Palette, Layers, Presentation, Compass, FileText } from 'lucide-react';

interface ShortcutItem {
  key: string;
  description: string;
  badgeColor?: string;
}

interface ShortcutSection {
  title: string;
  icon: React.ReactNode;
  shortcuts: ShortcutItem[];
}

const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    title: 'Drawing Tools',
    icon: <Compass className="w-4 h-4 text-blue-400" />,
    shortcuts: [
      { key: 'P', description: 'Pen Tool' },
      { key: 'H', description: 'Highlighter Tool (Semi-transparent)' },
      { key: 'E', description: 'Point-Eraser Tool' },
      { key: 'S', description: 'Shapes (Rectangle, Circle, Line, Arrow)' },
      { key: 'I', description: 'Insert Image (File or Drag & Drop)' },
      { key: 'T', description: 'Text Tool (Click canvas to type)' },
      { key: 'V', description: 'Select / Move / Resize Objects' },
      { key: 'L', description: 'Laser Pointer (Self-fading trail)' },
      { key: 'Ctrl + ] / [', description: 'Bring Forward / Send Backward' },
      { key: 'Right-Click', description: 'Object Context Menu (Layering, Delete)' },
      { key: 'Delete / Backspace', description: 'Delete selected object(s)' },
    ]
  },
  {
    title: 'Fullscreen & View',
    icon: <Presentation className="w-4 h-4 text-purple-400" />,
    shortcuts: [
      { key: 'F', description: 'Toggle Fullscreen Zen Canvas Mode' },
      { key: 'Esc', description: 'Exit Zen Mode / Close Modals' },
      { key: 'Ctrl + 0', description: 'Reset Zoom & Pan to 100%' },
      { key: 'Space + Drag', description: 'Pan Canvas Viewport (or Middle Click Drag)' },
      { key: 'Ctrl + Wheel', description: 'Smooth Zoom In / Out' },
      { key: 'F11', description: 'Window Fullscreen Teaching Mode' },
    ]
  },
  {
    title: 'Quick Color Swatches',
    icon: <Palette className="w-4 h-4 text-emerald-400" />,
    shortcuts: [
      { key: '1', description: 'White (#ffffff)' },
      { key: '2', description: 'Chalk Yellow (#fef08a)' },
      { key: '3', description: 'Signal Yellow (#eab308)' },
      { key: '4', description: 'Sky Blue (#38bdf8)' },
      { key: '5', description: 'Royal Blue (#3b82f6)' },
      { key: '6', description: 'Neon Green (#4ade80)' },
      { key: '7', description: 'Coral Red (#f87171)' },
      { key: '8', description: 'Vibrant Orange (#fb923c)' },
      { key: '9', description: 'Bright Pink (#f472b6)' },
    ]
  },
  {
    title: 'Background Templates',
    icon: <Layers className="w-4 h-4 text-amber-400" />,
    shortcuts: [
      { key: 'Ctrl + 1', description: 'Chalkboard (Dark Slate)' },
      { key: 'Ctrl + 2', description: 'Green Board (Emerald)' },
      { key: 'Ctrl + 3', description: 'Whiteboard (Clean White)' },
      { key: 'Ctrl + 4', description: 'Ruled Lines (Writing Practice)' },
      { key: 'Ctrl + 5', description: 'Math Grid (Graph Paper)' },
      { key: 'Ctrl + 6', description: 'Dot Paper (Engineering / Geometry)' },
    ]
  },
  {
    title: 'Slide Management',
    icon: <Layers className="w-4 h-4 text-cyan-400" />,
    shortcuts: [
      { key: 'Right Arrow / PgDn', description: 'Next Slide' },
      { key: 'Left Arrow / PgUp', description: 'Previous Slide' },
      { key: 'Ctrl + N', description: 'Create New Slide' },
      { key: 'Ctrl + D', description: 'Duplicate Current Slide' },
      { key: 'Ctrl + Del / Backspace', description: 'Delete Slide (with confirmation)' },
    ]
  },
  {
    title: 'History & Project',
    icon: <FileText className="w-4 h-4 text-rose-400" />,
    shortcuts: [
      { key: 'Ctrl + Z', description: 'Undo action' },
      { key: 'Ctrl + Y', description: 'Redo action' },
      { key: 'Ctrl + S', description: 'Save Project (.board)' },
      { key: '?', description: 'Toggle this Shortcuts Guide' },
    ]
  }
];

export const ShortcutsModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(state => state.ui.isShortcutsOpen);
  const theme = useAppSelector(state => state.ui.theme);
  const isLight = theme === 'light';

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150"
      onClick={() => dispatch(setShortcutsOpen(false))}
    >
      <div 
        className={`border rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col p-6 shadow-2xl animate-in zoom-in-95 duration-150 overflow-hidden transition-colors ${
          isLight
            ? 'bg-white border-[#dce5d0] text-[#1c2217]'
            : 'bg-[#12150e] border-[#242b1d] text-[#f4f6ee]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between pb-4 border-b flex-shrink-0 ${
          isLight ? 'border-[#dce5d0]' : 'border-[#242b1d]'
        }`}>
          <div className="flex items-center gap-2.5 font-bold text-lg">
            <div className="p-2 rounded-xl bg-[#C4F135] text-[#0c0e0a] shadow-md shadow-[#C4F135]/20">
              <Keyboard className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className={`font-display ${isLight ? 'text-[#1c2217]' : 'text-[#f4f6ee]'}`}>Keyboard Shortcuts Reference</h2>
              <p className={`text-xs font-normal ${isLight ? 'text-[#616c54]' : 'text-[#9ba38e]'}`}>Quick keys to speed up your teaching workflow</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => dispatch(setShortcutsOpen(false))}
            className={`p-1.5 rounded-lg transition-colors ${
              isLight ? 'text-[#616c54] hover:text-[#1c2217] hover:bg-[#e4ebd9]' : 'text-[#9ba38e] hover:text-[#f4f6ee] hover:bg-[#1f2618]'
            }`}
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts Body: Categorized Grid */}
        <div className="mt-4 flex-1 overflow-y-auto pr-2 space-y-6">
          {SHORTCUT_SECTIONS.map(section => (
            <div key={section.title} className="space-y-2">
              <div className={`flex items-center gap-2 font-tracked-mono text-[10px] font-bold uppercase tracking-wider ${
                isLight ? 'text-[#556046]' : 'text-[#9ba38e]'
              }`}>
                {section.icon}
                <span>{section.title}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {section.shortcuts.map(sc => (
                  <div
                    key={sc.key}
                    className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
                      isLight
                        ? 'bg-[#f0f4ea] border-[#dce5d0] hover:border-[#cbd7bc]'
                        : 'bg-[#171c12] border-[#242b1d] hover:border-[#35402a]'
                    }`}
                  >
                    <span className={`text-xs truncate ${isLight ? 'text-[#2c371d]' : 'text-[#f4f6ee]'}`} title={sc.description}>
                      {sc.description}
                    </span>
                    <kbd className={`px-2 py-0.5 border rounded font-mono text-[11px] font-bold shadow-xs flex-shrink-0 ${
                      isLight
                        ? 'bg-white border-[#cbd7bc] text-[#58730b]'
                        : 'bg-[#0c0e0a] border-[#2e3725] text-[#C4F135]'
                    }`}>
                      {sc.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className={`mt-4 pt-3 border-t flex items-center justify-between flex-shrink-0 text-xs ${
          isLight ? 'border-[#dce5d0] text-[#616c54]' : 'border-[#242b1d] text-[#9ba38e]'
        }`}>
          <span>Tip: Shortcuts are protected and disabled while typing inside a text box.</span>
          <button
            type="button"
            onClick={() => dispatch(setShortcutsOpen(false))}
            className="px-4 py-2 bg-[#C4F135] hover:bg-[#d2f84b] text-[#0c0e0a] rounded-lg text-xs font-bold transition-colors shadow-lg shadow-[#C4F135]/20"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
