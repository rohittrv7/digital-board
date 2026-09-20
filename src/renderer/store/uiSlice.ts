import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UIState {
  isSidebarOpen: boolean;
  isColorPanelOpen: boolean;
  zoomLevel: number;
  panOffset: { x: number; y: number };
  isPanning: boolean;
  theme: 'dark' | 'light';
  isShortcutsOpen: boolean;
  isAboutOpen: boolean;
  showWatermark: boolean;
  isFullscreen: boolean;
  isZenMode: boolean;
  activeDialog: 'none' | 'save' | 'shortcuts' | 'about';
  savedNormalZoom: { zoomLevel: number; panOffset: { x: number; y: number } } | null;
}

const getInitialTheme = (): 'dark' | 'light' => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = localStorage.getItem('dtb_theme');
    if (saved === 'light' || saved === 'dark') return saved;
  }
  return 'dark';
};

const getInitialWatermark = (): boolean => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = localStorage.getItem('dtb_watermark');
    if (saved !== null) return saved === 'true';
  }
  return true;
};

const initialState: UIState = {
  isSidebarOpen: true,
  isColorPanelOpen: false,
  zoomLevel: 1,
  panOffset: { x: 0, y: 0 },
  isPanning: false,
  theme: getInitialTheme(),
  isShortcutsOpen: false,
  isAboutOpen: false,
  showWatermark: getInitialWatermark(),
  isFullscreen: false,
  isZenMode: false,
  activeDialog: 'none',
  savedNormalZoom: null
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.isSidebarOpen = action.payload;
    },
    setZoom: (state, action: PayloadAction<number>) => {
      // Clamped between 0.25 (25%) and 4.0 (400%)
      state.zoomLevel = Math.max(0.25, Math.min(4.0, action.payload));
    },
    setPanOffset: (state, action: PayloadAction<{ x: number; y: number }>) => {
      state.panOffset = action.payload;
    },
    setIsPanning: (state, action: PayloadAction<boolean>) => {
      state.isPanning = action.payload;
    },
    resetZoom: (state) => {
      state.zoomLevel = 1;
      state.panOffset = { x: 0, y: 0 };
    },
    toggleColorPanel: (state) => {
      state.isColorPanelOpen = !state.isColorPanelOpen;
    },
    setColorPanelOpen: (state, action: PayloadAction<boolean>) => {
      state.isColorPanelOpen = action.payload;
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('dtb_theme', state.theme);
      }
    },
    setTheme: (state, action: PayloadAction<'dark' | 'light'>) => {
      state.theme = action.payload;
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('dtb_theme', state.theme);
      }
    },
    toggleShortcuts: (state) => {
      state.isShortcutsOpen = !state.isShortcutsOpen;
    },
    setShortcutsOpen: (state, action: PayloadAction<boolean>) => {
      state.isShortcutsOpen = action.payload;
    },
    toggleFullscreen: (state) => {
      state.isFullscreen = !state.isFullscreen;
    },
    setFullscreen: (state, action: PayloadAction<boolean>) => {
      state.isFullscreen = action.payload;
    },
    toggleZenMode: (state) => {
      const nextZen = !state.isZenMode;
      state.isZenMode = nextZen;
      if (nextZen) {
        // Entering Zen mode: save current normal zoom & pan, start Zen mode at 100% fit-to-screen
        state.savedNormalZoom = {
          zoomLevel: state.zoomLevel,
          panOffset: { ...state.panOffset }
        };
        state.zoomLevel = 1;
        state.panOffset = { x: 0, y: 0 };
      } else {
        // Exiting Zen mode: restore previous normal zoom & pan
        if (state.savedNormalZoom) {
          state.zoomLevel = state.savedNormalZoom.zoomLevel;
          state.panOffset = { ...state.savedNormalZoom.panOffset };
          state.savedNormalZoom = null;
        }
      }
    },
    setZenMode: (state, action: PayloadAction<boolean>) => {
      const nextZen = action.payload;
      if (state.isZenMode === nextZen) return;
      state.isZenMode = nextZen;
      if (nextZen) {
        state.savedNormalZoom = {
          zoomLevel: state.zoomLevel,
          panOffset: { ...state.panOffset }
        };
        state.zoomLevel = 1;
        state.panOffset = { x: 0, y: 0 };
      } else {
        if (state.savedNormalZoom) {
          state.zoomLevel = state.savedNormalZoom.zoomLevel;
          state.panOffset = { ...state.savedNormalZoom.panOffset };
          state.savedNormalZoom = null;
        }
      }
    },
    toggleAbout: (state) => {
      state.isAboutOpen = !state.isAboutOpen;
    },
    setAboutOpen: (state, action: PayloadAction<boolean>) => {
      state.isAboutOpen = action.payload;
    },
    toggleWatermark: (state) => {
      state.showWatermark = !state.showWatermark;
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('dtb_watermark', String(state.showWatermark));
      }
    },
    setShowWatermark: (state, action: PayloadAction<boolean>) => {
      state.showWatermark = action.payload;
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('dtb_watermark', String(state.showWatermark));
      }
    }
  }
});

export const {
  toggleSidebar,
  setSidebarOpen,
  setZoom,
  setPanOffset,
  setIsPanning,
  resetZoom,
  toggleColorPanel,
  setColorPanelOpen,
  toggleTheme,
  setTheme,
  toggleShortcuts,
  setShortcutsOpen,
  toggleFullscreen,
  setFullscreen,
  toggleZenMode,
  setZenMode,
  toggleAbout,
  setAboutOpen,
  toggleWatermark,
  setShowWatermark
} = uiSlice.actions;

export default uiSlice.reducer;
