import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './index';

export type BackgroundType = 'white' | 'chalkboard' | 'blackboard' | 'ruled' | 'grid' | 'dots' | 'image' | 'pdf';

export interface SlideBackground {
  type: BackgroundType;
  value?: string; // Color hex, pattern url, image base64 data url, or pdf page data url
  offsetX?: number;
  offsetY?: number;
  scale?: number;
}

export interface Slide {
  id: string;
  background: SlideBackground;
  canvasJSON: any;
  thumbnail?: string; // Data URL for fast sidebar preview
  createdAt: number;
}

export interface SlidesState {
  slides: Slide[];
  activeSlideId: string;
  lectureTitle: string;
  isSaving: boolean;
  isLoading: boolean;
  isExportingPdf: boolean;
  isImportingPdf: boolean;
  importPdfProgress: string | null;
  projectFilePath: string | null;
  lastSavedAt: number | null;
  loadedTimestamp: number;
}

const createInitialSlide = (id = 'slide-1'): Slide => ({
  id,
  background: { type: 'chalkboard' }, // Default to teacher-friendly dark chalkboard
  canvasJSON: null,
  thumbnail: '',
  createdAt: Date.now()
});

const initialSlide = createInitialSlide();

const initialState: SlidesState = {
  slides: [initialSlide],
  activeSlideId: initialSlide.id,
  lectureTitle: 'Untitled Lecture',
  isSaving: false,
  isLoading: false,
  isExportingPdf: false,
  isImportingPdf: false,
  importPdfProgress: null,
  projectFilePath: null,
  lastSavedAt: null,
  loadedTimestamp: Date.now()
};

// Async Thunks
export const saveProjectToDisk = createAsyncThunk(
  'slides/saveProjectToDisk',
  async (isSaveAs: boolean = false, { getState }) => {
    const state = getState() as RootState;
    const rawTitle = state.slides.lectureTitle || 'teaching_board';
    const safeTitle = rawTitle.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'teaching_board';
    const projectData = JSON.stringify({
      version: '1.0.0',
      appName: 'Digital Teaching Board',
      createdWith: 'Digital Teaching Board by Ravana',
      author: 'Ravana',
      savedAt: Date.now(),
      savedAtISO: new Date().toISOString(),
      lectureTitle: state.slides.lectureTitle,
      showWatermark: state.ui.showWatermark,
      slides: state.slides.slides,
      activeSlideId: state.slides.activeSlideId
    }, null, 2);

    if (window.electronAPI) {
      const defaultName = `${safeTitle}_${new Date().toISOString().slice(0, 10)}.board`;
      const res = await window.electronAPI.saveFile(defaultName, projectData);
      if (!res.canceled && res.filePath) {
        return { filePath: res.filePath, savedAt: Date.now() };
      }
    }
    return null;
  }
);

export const loadProjectFromDisk = createAsyncThunk(
  'slides/loadProjectFromDisk',
  async (_, { dispatch, rejectWithValue }) => {
    if (window.electronAPI) {
      const res = await window.electronAPI.openFile();
      if (!res.canceled && res.content) {
        try {
          const parsed = JSON.parse(res.content);
          if (Array.isArray(parsed.slides) && parsed.slides.length > 0) {
            if (typeof parsed.showWatermark === 'boolean') {
              const { setShowWatermark } = await import('./uiSlice');
              dispatch(setShowWatermark(parsed.showWatermark));
            }
            return {
              slides: parsed.slides,
              activeSlideId: parsed.activeSlideId || parsed.slides[0].id,
              lectureTitle: parsed.lectureTitle || 'Untitled Lecture',
              filePath: res.filePath || null
            };
          }
        } catch (e: any) {
          return rejectWithValue('Invalid project file format');
        }
      }
    }
    return null;
  }
);

export const exportAsPDF = createAsyncThunk(
  'slides/exportAsPDF',
  async (_, { getState }) => {
    const state = getState() as RootState;
    const slides = state.slides.slides;
    const rawTitle = state.slides.lectureTitle || 'lecture_slides';
    const safeTitle = rawTitle.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'lecture_slides';
    const { exportAllSlidesToPdf } = await import('../services/pdfService');
    const pdfBuffer = await exportAllSlidesToPdf(slides, state.ui.showWatermark);

    if (window.electronAPI && pdfBuffer) {
      const defaultName = `${safeTitle}_${new Date().toISOString().slice(0, 10)}.pdf`;
      const res = await window.electronAPI.saveBinaryFile(defaultName, pdfBuffer, [
        { name: 'PDF Document (*.pdf)', extensions: ['pdf'] }
      ]);
      return res;
    }
    return null;
  }
);

export const importPDFAsSlides = createAsyncThunk(
  'slides/importPDFAsSlides',
  async (_, { dispatch }) => {
    if (!window.electronAPI) return null;
    const res = await window.electronAPI.openBinaryFile();
    if (!res.canceled && res.buffer) {
      const { renderPdfPagesToDataUrls } = await import('../services/pdfService');
      const pageImages = await renderPdfPagesToDataUrls(res.buffer, (current, total) => {
        dispatch(slidesSlice.actions.setImportPdfProgress(`Page ${current}/${total}`));
      });
      if (pageImages.length > 0) {
        const newSlides: Slide[] = pageImages.map((dataUrl, idx) => ({
          id: `slide-pdf-${Date.now()}-${idx + 1}`,
          background: { type: 'pdf', value: dataUrl },
          canvasJSON: null,
          thumbnail: dataUrl,
          createdAt: Date.now() + idx
        }));
        dispatch(slidesSlice.actions.appendSlides(newSlides));
        return newSlides;
      }
    }
    return null;
  }
);

export const slidesSlice = createSlice({
  name: 'slides',
  initialState,
  reducers: {
    addSlide: (state, action: PayloadAction<{ backgroundType?: BackgroundType } | undefined>) => {
      const newId = `slide-${Date.now()}`;
      const bgType = action.payload?.backgroundType || state.slides.find(s => s.id === state.activeSlideId)?.background.type || 'chalkboard';
      const newSlide: Slide = {
        id: newId,
        background: { type: bgType },
        canvasJSON: null,
        thumbnail: '',
        createdAt: Date.now()
      };
      // Insert right after the active slide
      const currentIndex = state.slides.findIndex(s => s.id === state.activeSlideId);
      if (currentIndex >= 0) {
        state.slides.splice(currentIndex + 1, 0, newSlide);
      } else {
        state.slides.push(newSlide);
      }
      state.activeSlideId = newId;
    },

    duplicateSlide: (state, action: PayloadAction<string>) => {
      const slideToDupe = state.slides.find(s => s.id === action.payload);
      if (!slideToDupe) return;
      const newId = `slide-${Date.now()}`;
      const duplicated: Slide = {
        ...slideToDupe,
        id: newId,
        background: { ...slideToDupe.background },
        canvasJSON: slideToDupe.canvasJSON ? JSON.parse(JSON.stringify(slideToDupe.canvasJSON)) : null,
        thumbnail: slideToDupe.thumbnail,
        createdAt: Date.now()
      };
      const idx = state.slides.findIndex(s => s.id === action.payload);
      state.slides.splice(idx + 1, 0, duplicated);
      state.activeSlideId = newId;
    },

    deleteSlide: (state, action: PayloadAction<string>) => {
      if (state.slides.length <= 1) return; // Keep at least one slide
      const idx = state.slides.findIndex(s => s.id === action.payload);
      if (idx === -1) return;

      const deletingActive = state.activeSlideId === action.payload;
      state.slides.splice(idx, 1);

      if (deletingActive) {
        const nextIdx = Math.min(idx, state.slides.length - 1);
        state.activeSlideId = state.slides[nextIdx].id;
      }
    },

    reorderSlides: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
      const { fromIndex, toIndex } = action.payload;
      if (fromIndex < 0 || fromIndex >= state.slides.length || toIndex < 0 || toIndex >= state.slides.length) {
        return;
      }
      const [moved] = state.slides.splice(fromIndex, 1);
      state.slides.splice(toIndex, 0, moved);
    },

    setActiveSlide: (state, action: PayloadAction<string>) => {
      state.activeSlideId = action.payload;
    },

    nextSlide: (state) => {
      const currentIndex = state.slides.findIndex(s => s.id === state.activeSlideId);
      if (currentIndex >= 0 && currentIndex < state.slides.length - 1) {
        state.activeSlideId = state.slides[currentIndex + 1].id;
      }
    },

    prevSlide: (state) => {
      const currentIndex = state.slides.findIndex(s => s.id === state.activeSlideId);
      if (currentIndex > 0) {
        state.activeSlideId = state.slides[currentIndex - 1].id;
      }
    },

    updateSlideCanvas: (state, action: PayloadAction<{ id: string; canvasJSON?: any; thumbnail?: string }>) => {
      const slide = state.slides.find(s => s.id === action.payload.id);
      if (slide) {
        if (action.payload.canvasJSON !== undefined) {
          slide.canvasJSON = action.payload.canvasJSON ? JSON.parse(JSON.stringify(action.payload.canvasJSON)) : null;
        }
        if (action.payload.thumbnail !== undefined && action.payload.thumbnail !== '') {
          slide.thumbnail = action.payload.thumbnail;
        }
      }
    },

    setSlideBackground: (state, action: PayloadAction<{ id: string; background: SlideBackground }>) => {
      const slide = state.slides.find(s => s.id === action.payload.id);
      if (slide) {
        slide.background = action.payload.background;
      }
    },

    restoreSlide: (state, action: PayloadAction<{ slide: Slide; index: number }>) => {
      const { slide, index } = action.payload;
      const targetIndex = Math.max(0, Math.min(index, state.slides.length));
      state.slides.splice(targetIndex, 0, slide);
      state.activeSlideId = slide.id;
    },

    updateSlideBackgroundPosition: (
      state,
      action: PayloadAction<{ id: string; offsetX: number; offsetY: number; scale?: number }>
    ) => {
      const slide = state.slides.find(s => s.id === action.payload.id);
      if (slide) {
        slide.background = {
          ...slide.background,
          offsetX: action.payload.offsetX,
          offsetY: action.payload.offsetY,
          scale: action.payload.scale ?? slide.background.scale ?? 1
        };
      }
    },

    setSlides: (state, action: PayloadAction<{ slides: Slide[]; activeSlideId?: string }>) => {
      state.slides = action.payload.slides;
      if (action.payload.activeSlideId) {
        state.activeSlideId = action.payload.activeSlideId;
      } else if (action.payload.slides.length > 0) {
        state.activeSlideId = action.payload.slides[0].id;
      }
      state.loadedTimestamp = Date.now();
    },

    setImportPdfProgress: (state, action: PayloadAction<string | null>) => {
      state.importPdfProgress = action.payload;
    },

    appendSlides: (state, action: PayloadAction<Slide[]>) => {
      if (action.payload.length === 0) return;

      // Helper to check if a slide is pristine and unedited (no drawn strokes or imported content)
      const isBlankUntouched = (s: Slide): boolean => {
        // Must not have a PDF or custom image background
        if (s.background.type === 'pdf' || s.background.type === 'image') return false;
        
        // Check canvasJSON objects
        if (!s.canvasJSON) return true;
        let parsed = s.canvasJSON;
        if (typeof parsed === 'string') {
          try {
            parsed = JSON.parse(parsed);
          } catch {
            return false;
          }
        }
        return !parsed.objects || !Array.isArray(parsed.objects) || parsed.objects.length === 0;
      };

      // If current board has only 1 initial blank/untouched slide, replace it with the imported PDF slides
      if (state.slides.length === 1 && isBlankUntouched(state.slides[0])) {
        state.slides = action.payload;
      } else {
        state.slides.push(...action.payload);
      }
      state.activeSlideId = action.payload[0].id;
      state.loadedTimestamp = Date.now();
    },

    setLectureTitle: (state, action: PayloadAction<string>) => {
      state.lectureTitle = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(saveProjectToDisk.pending, (state) => {
        state.isSaving = true;
      })
      .addCase(saveProjectToDisk.fulfilled, (state, action) => {
        state.isSaving = false;
        if (action.payload) {
          state.projectFilePath = action.payload.filePath;
          state.lastSavedAt = action.payload.savedAt;
        }
      })
      .addCase(saveProjectToDisk.rejected, (state) => {
        state.isSaving = false;
      })
      .addCase(loadProjectFromDisk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadProjectFromDisk.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.slides = action.payload.slides;
          state.activeSlideId = action.payload.activeSlideId;
          state.projectFilePath = action.payload.filePath;
          if (action.payload.lectureTitle) {
            state.lectureTitle = action.payload.lectureTitle;
          }
          state.lastSavedAt = Date.now();
          state.loadedTimestamp = Date.now();
        }
      })
      .addCase(loadProjectFromDisk.rejected, (state) => {
        state.isLoading = false;
      })
      .addCase(exportAsPDF.pending, (state) => {
        state.isExportingPdf = true;
      })
      .addCase(exportAsPDF.fulfilled, (state) => {
        state.isExportingPdf = false;
      })
      .addCase(exportAsPDF.rejected, (state) => {
        state.isExportingPdf = false;
      })
      .addCase(importPDFAsSlides.pending, (state) => {
        state.isImportingPdf = true;
        state.importPdfProgress = 'Opening...';
      })
      .addCase(importPDFAsSlides.fulfilled, (state) => {
        state.isImportingPdf = false;
        state.importPdfProgress = null;
      })
      .addCase(importPDFAsSlides.rejected, (state) => {
        state.isImportingPdf = false;
        state.importPdfProgress = null;
      });
  }
});

export const {
  addSlide,
  duplicateSlide,
  deleteSlide,
  reorderSlides,
  setActiveSlide,
  updateSlideCanvas,
  setSlideBackground,
  restoreSlide,
  updateSlideBackgroundPosition,
  setSlides,
  appendSlides,
  setImportPdfProgress,
  nextSlide,
  prevSlide,
  setLectureTitle
} = slidesSlice.actions;

export default slidesSlice.reducer;
