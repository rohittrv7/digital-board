import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import slidesReducer from './slidesSlice';
import toolsReducer from './toolsSlice';
import historyReducer from './historySlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    slides: slidesReducer,
    tools: toolsReducer,
    history: historyReducer,
    ui: uiReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false // Necessary for complex Fabric canvas serialization structures
    })
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
