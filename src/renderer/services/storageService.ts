/**
 * Local Storage and Project Persistence Service
 */
export function setupAutoSave(getState: () => any, intervalMs: number = 60000) {
  if (!window.electronAPI) return () => {};

  const intervalId = setInterval(async () => {
    try {
      const state = getState();
      const projectData = JSON.stringify({
        version: '1.0',
        appName: 'Digital Teaching Board',
        autoSavedAt: Date.now(),
        slides: state.slides.slides,
        activeSlideId: state.slides.activeSlideId
      });
      await window.electronAPI?.autoSave(projectData);
    } catch (e) {
      console.error('AutoSave cycle failed:', e);
    }
  }, intervalMs);

  // Hook into window close
  const cleanupClose = window.electronAPI.onWindowCloseRequested(async () => {
    try {
      const state = getState();
      const projectData = JSON.stringify({
        version: '1.0',
        appName: 'Digital Teaching Board',
        autoSavedAt: Date.now(),
        slides: state.slides.slides,
        activeSlideId: state.slides.activeSlideId
      });
      await window.electronAPI?.autoSave(projectData);
    } finally {
      window.electronAPI?.confirmClose();
    }
  });

  return () => {
    clearInterval(intervalId);
    cleanupClose();
  };
}
