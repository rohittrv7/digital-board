import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  saveFile: (defaultFilename: string, data: string, filters?: { name: string; extensions: string[] }[]) => Promise<{ canceled: boolean; filePath?: string }>;
  saveBinaryFile: (defaultFilename: string, buffer: ArrayBuffer, filters?: { name: string; extensions: string[] }[]) => Promise<{ canceled: boolean; filePath?: string }>;
  openFile: (filters?: { name: string; extensions: string[] }[]) => Promise<{ canceled: boolean; filePath?: string; content?: string }>;
  openBinaryFile: (filters?: { name: string; extensions: string[] }[]) => Promise<{ canceled: boolean; filePath?: string; buffer?: ArrayBuffer }>;
  autoSave: (data: string) => Promise<boolean>;
  loadAutoSave: () => Promise<string | null>;
  onWindowCloseRequested: (callback: () => void) => () => void;
  confirmClose: () => void;
  setFullScreen: (flag: boolean) => Promise<boolean>;
  isFullScreen: () => Promise<boolean>;
  onFullScreenChanged: (callback: (isFull: boolean) => void) => () => void;
}

const electronAPI: ElectronAPI = {
  saveFile: (defaultFilename, data, filters) => ipcRenderer.invoke('dialog:saveFile', defaultFilename, data, filters),
  saveBinaryFile: (defaultFilename, buffer, filters) => ipcRenderer.invoke('dialog:saveBinaryFile', defaultFilename, buffer, filters),
  openFile: (filters) => ipcRenderer.invoke('dialog:openFile', filters),
  openBinaryFile: (filters) => ipcRenderer.invoke('dialog:openBinaryFile', filters),
  autoSave: (data) => ipcRenderer.invoke('storage:autoSave', data),
  loadAutoSave: () => ipcRenderer.invoke('storage:loadAutoSave'),
  onWindowCloseRequested: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('app:close-requested', handler);
    return () => ipcRenderer.removeListener('app:close-requested', handler);
  },
  confirmClose: () => ipcRenderer.send('app:confirm-close'),
  setFullScreen: (flag: boolean) => ipcRenderer.invoke('window:setFullScreen', flag),
  isFullScreen: () => ipcRenderer.invoke('window:isFullScreen'),
  onFullScreenChanged: (callback: (isFull: boolean) => void) => {
    const handler = (_: any, isFull: boolean) => callback(isFull);
    ipcRenderer.on('window:fullscreen-changed', handler);
    return () => ipcRenderer.removeListener('window:fullscreen-changed', handler);
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
