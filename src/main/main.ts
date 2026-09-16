import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let isClosing = false;

function getAppIcon(): string | undefined {
  const candidates = [
    path.join(__dirname, '../build/icon.ico'),
    path.join(__dirname, '../build/icon.png'),
    path.join(__dirname, '../dist/icon.png'),
    path.join(__dirname, '../public/icon.png'),
    path.join(process.resourcesPath, 'build/icon.ico')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

function createSplashWindow() {
  const icon = getAppIcon();
  splashWindow = new BrowserWindow({
    width: 440,
    height: 330,
    frame: false,
    resizable: false,
    center: true,
    show: false,
    transparent: false,
    backgroundColor: '#0c0e0a',
    title: 'Digital Teaching Board',
    icon,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const splashPathDev = path.join(__dirname, '../public/splash.html');
  const splashPathDist = path.join(__dirname, '../dist/splash.html');

  if (isDev && fs.existsSync(splashPathDev)) {
    splashWindow.loadFile(splashPathDev).catch(() => {
      splashWindow?.loadURL('http://localhost:5173/splash.html').catch(() => {});
    });
  } else if (fs.existsSync(splashPathDist)) {
    splashWindow.loadFile(splashPathDist);
  } else if (fs.existsSync(splashPathDev)) {
    splashWindow.loadFile(splashPathDev);
  }

  splashWindow.once('ready-to-show', () => {
    splashWindow?.show();
  });
}

function createWindow() {
  createSplashWindow();
  const splashStartTime = Date.now();
  const MIN_SPLASH_TIME = 1300; // Minimum 1.3 seconds so branding is clearly readable
  const MAX_SPLASH_TIMEOUT = 5000; // Crash-safe fallback timeout

  let splashDismissed = false;
  const dismissSplashAndShowMain = () => {
    if (splashDismissed) return;
    splashDismissed = true;

    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.destroy();
      splashWindow = null;
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.maximize();
      mainWindow.show();
      mainWindow.focus();
    }
  };

  const icon = getAppIcon();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    backgroundColor: '#0c0e0a',
    title: 'Digital Teaching Board',
    icon,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true
    }
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Smooth transition from Splash to Main window
  mainWindow.once('ready-to-show', () => {
    const elapsed = Date.now() - splashStartTime;
    const remaining = Math.max(0, MIN_SPLASH_TIME - elapsed);
    setTimeout(dismissSplashAndShowMain, remaining);
  });

  // Crash-safe fallback in case ready-to-show is delayed
  setTimeout(dismissSplashAndShowMain, MAX_SPLASH_TIMEOUT);

  // Allow opening DevTools with F12 or Ctrl+Shift+I
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow?.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  mainWindow.on('close', (e) => {
    if (!isClosing) {
      e.preventDefault();
      // Inform renderer to trigger final auto-save or confirmation
      mainWindow?.webContents.send('app:close-requested');
      setTimeout(() => {
        // Fallback in case renderer doesn't respond
        isClosing = true;
        mainWindow?.close();
      }, 1000);
    }
  });

  mainWindow.on('enter-full-screen', () => {
    mainWindow?.webContents.send('window:fullscreen-changed', true);
  });

  mainWindow.on('leave-full-screen', () => {
    mainWindow?.webContents.send('window:fullscreen-changed', false);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.on('app:confirm-close', () => {
  isClosing = true;
  mainWindow?.close();
});

ipcMain.handle('window:setFullScreen', async (_, flag: boolean) => {
  if (mainWindow) {
    mainWindow.setFullScreen(flag);
    return mainWindow.isFullScreen();
  }
  return false;
});

ipcMain.handle('window:isFullScreen', async () => {
  return mainWindow ? mainWindow.isFullScreen() : false;
});

// Save text file (e.g. .board JSON)
ipcMain.handle('dialog:saveFile', async (_, defaultFilename: string, data: string, filters) => {
  if (!mainWindow) return { canceled: true };
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultFilename,
    filters: filters || [
      { name: 'Board Project (*.board)', extensions: ['board'] },
      { name: 'JSON (*.json)', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!canceled && filePath) {
    try {
      fs.writeFileSync(filePath, data, 'utf-8');
      return { canceled: false, filePath };
    } catch (err: any) {
      console.error('Error saving file:', err);
      return { canceled: true, error: err.message };
    }
  }
  return { canceled: true };
});

// Save binary file (e.g. .pdf)
ipcMain.handle('dialog:saveBinaryFile', async (_, defaultFilename: string, buffer: ArrayBuffer, filters) => {
  if (!mainWindow) return { canceled: true };
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultFilename,
    filters: filters || [
      { name: 'PDF Document (*.pdf)', extensions: ['pdf'] }
    ]
  });

  if (!canceled && filePath) {
    try {
      fs.writeFileSync(filePath, Buffer.from(buffer));
      return { canceled: false, filePath };
    } catch (err: any) {
      console.error('Error saving binary file:', err);
      return { canceled: true, error: err.message };
    }
  }
  return { canceled: true };
});

// Open text file (.board project)
ipcMain.handle('dialog:openFile', async (_, filters) => {
  if (!mainWindow) return { canceled: true };
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || [
      { name: 'Board Project (*.board, *.json)', extensions: ['board', 'json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!canceled && filePaths.length > 0) {
    try {
      const content = fs.readFileSync(filePaths[0], 'utf-8');
      return { canceled: false, filePath: filePaths[0], content };
    } catch (err: any) {
      console.error('Error opening file:', err);
      return { canceled: true, error: err.message };
    }
  }
  return { canceled: true };
});

// Open binary file (e.g. .pdf import)
ipcMain.handle('dialog:openBinaryFile', async (_, filters) => {
  if (!mainWindow) return { canceled: true };
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || [
      { name: 'PDF Document (*.pdf)', extensions: ['pdf'] }
    ]
  });

  if (!canceled && filePaths.length > 0) {
    try {
      const fileBuffer = fs.readFileSync(filePaths[0]);
      // Convert Node Buffer to ArrayBuffer
      const arrayBuffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
      );
      return { canceled: false, filePath: filePaths[0], buffer: arrayBuffer };
    } catch (err: any) {
      console.error('Error opening binary file:', err);
      return { canceled: true, error: err.message };
    }
  }
  return { canceled: true };
});

// Auto-save storage
const getAutoSavePath = () => {
  const userDataDir = app.getPath('userData');
  return path.join(userDataDir, 'autosave_session.board');
};

ipcMain.handle('storage:autoSave', async (_, data: string) => {
  try {
    const savePath = getAutoSavePath();
    fs.writeFileSync(savePath, data, 'utf-8');
    return true;
  } catch (err) {
    console.error('AutoSave failed:', err);
    return false;
  }
});

ipcMain.handle('storage:loadAutoSave', async () => {
  try {
    const savePath = getAutoSavePath();
    if (fs.existsSync(savePath)) {
      return fs.readFileSync(savePath, 'utf-8');
    }
    return null;
  } catch (err) {
    console.error('Failed to load auto-save:', err);
    return null;
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
