import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface HistoryState {
  undoStacks: Record<string, string[]>; // serialized canvas JSON per slide
  redoStacks: Record<string, string[]>;
  // Action signal to tell the active canvas to restore state
  restoreSignal: {
    type: 'undo' | 'redo';
    slideId: string;
    targetJson: string;
    timestamp: number;
  } | null;
  maxHistorySize: number;
}

const initialState: HistoryState = {
  undoStacks: {},
  redoStacks: {},
  restoreSignal: null,
  maxHistorySize: 30
};

export const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    initSlideHistory: (state, action: PayloadAction<{ slideId: string; initialJson: string }>) => {
      const { slideId, initialJson } = action.payload;
      if (!state.undoStacks[slideId]) {
        state.undoStacks[slideId] = [initialJson];
        state.redoStacks[slideId] = [];
      }
    },

    pushHistory: (state, action: PayloadAction<{ slideId: string; json: string }>) => {
      const { slideId, json } = action.payload;
      if (!state.undoStacks[slideId]) {
        state.undoStacks[slideId] = [];
      }
      
      const stack = state.undoStacks[slideId];
      // Avoid pushing duplicate identical states
      if (stack.length > 0 && stack[stack.length - 1] === json) {
        return;
      }
      
      stack.push(json);
      if (stack.length > state.maxHistorySize) {
        stack.shift();
      }
      // Any new action clears redo stack for this slide
      state.redoStacks[slideId] = [];
    },

    undo: (state, action: PayloadAction<{ slideId: string }>) => {
      const { slideId } = action.payload;
      const uStack = state.undoStacks[slideId];
      if (!uStack || uStack.length <= 1) return; // Must have at least initial state

      if (!state.redoStacks[slideId]) {
        state.redoStacks[slideId] = [];
      }

      // Pop current state and move to redo stack
      const currentState = uStack.pop();
      if (currentState) {
        state.redoStacks[slideId].push(currentState);
      }

      // Target state to restore is the new top of undo stack
      const targetJson = uStack[uStack.length - 1];
      state.restoreSignal = {
        type: 'undo',
        slideId,
        targetJson,
        timestamp: Date.now()
      };
    },

    redo: (state, action: PayloadAction<{ slideId: string }>) => {
      const { slideId } = action.payload;
      const rStack = state.redoStacks[slideId];
      if (!rStack || rStack.length === 0) return;

      if (!state.undoStacks[slideId]) {
        state.undoStacks[slideId] = [];
      }

      // Pop from redo stack and push to undo stack
      const nextState = rStack.pop();
      if (nextState) {
        state.undoStacks[slideId].push(nextState);
        state.restoreSignal = {
          type: 'redo',
          slideId,
          targetJson: nextState,
          timestamp: Date.now()
        };
      }
    },

    clearHistory: (state, action: PayloadAction<{ slideId: string }>) => {
      const { slideId } = action.payload;
      state.undoStacks[slideId] = [];
      state.redoStacks[slideId] = [];
      state.restoreSignal = null;
    },

    removeSlideHistory: (state, action: PayloadAction<string>) => {
      delete state.undoStacks[action.payload];
      delete state.redoStacks[action.payload];
    }
  }
});

export const {
  initSlideHistory,
  pushHistory,
  undo,
  redo,
  clearHistory,
  removeSlideHistory
} = historySlice.actions;

export default historySlice.reducer;
