import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ToolType = 
  | 'pen' 
  | 'highlighter' 
  | 'eraser' 
  | 'rectangle' 
  | 'circle' 
  | 'line' 
  | 'arrow' 
  | 'text' 
  | 'select' 
  | 'laser';

export type EraserMode = 'stroke' | 'object';

export interface ToolsState {
  activeTool: ToolType;
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  eraserMode: EraserMode;
  fontSize: number;
  pressureSensitivityEnabled: boolean;
  highlighterOpacity: number;
}

const initialState: ToolsState = {
  activeTool: 'pen',
  strokeColor: '#ffffff', // Clean white default for chalkboard
  strokeWidth: 4,
  fillColor: 'transparent',
  eraserMode: 'stroke',
  fontSize: 28,
  pressureSensitivityEnabled: true,
  highlighterOpacity: 0.4
};

export const toolsSlice = createSlice({
  name: 'tools',
  initialState,
  reducers: {
    setTool: (state, action: PayloadAction<ToolType>) => {
      state.activeTool = action.payload;
    },
    setColor: (state, action: PayloadAction<string>) => {
      state.strokeColor = action.payload;
    },
    setStrokeWidth: (state, action: PayloadAction<number>) => {
      state.strokeWidth = Math.max(1, Math.min(100, action.payload));
    },
    setFillColor: (state, action: PayloadAction<string>) => {
      state.fillColor = action.payload;
    },
    setEraserMode: (state, action: PayloadAction<EraserMode>) => {
      state.eraserMode = action.payload;
    },
    setFontSize: (state, action: PayloadAction<number>) => {
      state.fontSize = Math.max(12, Math.min(144, action.payload));
    },
    togglePressureSensitivity: (state) => {
      state.pressureSensitivityEnabled = !state.pressureSensitivityEnabled;
    },
    setPressureSensitivity: (state, action: PayloadAction<boolean>) => {
      state.pressureSensitivityEnabled = action.payload;
    }
  }
});

export const {
  setTool,
  setColor,
  setStrokeWidth,
  setFillColor,
  setEraserMode,
  setFontSize,
  togglePressureSensitivity,
  setPressureSensitivity
} = toolsSlice.actions;

export default toolsSlice.reducer;
