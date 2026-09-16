import { Slide } from '../store/slidesSlice';
import { AUTHOR_NAME } from '../components/AboutModal';

/**
 * High-performance multi-page PDF generation from slides
 */
export async function exportAllSlidesToPdf(slides: Slide[], showWatermark: boolean = true): Promise<ArrayBuffer | null> {
  if (!slides || slides.length === 0) return null;
  const { jsPDF } = await import('jspdf');
  const { StaticCanvas } = await import('fabric');
  const { applyBackgroundToCanvas } = await import('../features/canvas/backgroundUtils');

  // Create landscape PDF matching 1920x1080 16:9 board ratio
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [1920, 1080],
    compress: true
  });

  // Set document attribution & metadata properties
  pdf.setProperties({
    title: 'Digital Teaching Board Lecture',
    subject: 'Interactive Whiteboard Notes & Annotations',
    author: AUTHOR_NAME, // [YOUR NAME] placeholder
    creator: `Digital Teaching Board by ${AUTHOR_NAME}`
  });

  // Reusable offscreen canvas to avoid DOM memory thrashing
  const offscreenEl = document.createElement('canvas');
  offscreenEl.width = 1920;
  offscreenEl.height = 1080;
  const offscreenCanvas = new StaticCanvas(offscreenEl, {
    width: 1920,
    height: 1080,
    enableRetinaScaling: false
  });

  try {
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      offscreenCanvas.clear();

      // 1. Load vector drawings/shapes/text
      if (slide.canvasJSON && slide.canvasJSON.objects && slide.canvasJSON.objects.length > 0) {
        await offscreenCanvas.loadFromJSON(slide.canvasJSON);
      }

      // 2. Apply slide background (solid, pattern, or image)
      await applyBackgroundToCanvas(offscreenCanvas as any, slide.background);
      offscreenCanvas.renderAll();

      // 3. Export crisp 1080p full-res PNG image
      const imgData = offscreenCanvas.toDataURL({
        format: 'png',
        multiplier: 1.0
      });

      // 4. Add page to PDF
      if (i > 0) {
        pdf.addPage([1920, 1080], 'landscape');
      }
      pdf.addImage(imgData, 'PNG', 0, 0, 1920, 1080, undefined, 'FAST');

      // 5. If showWatermark is enabled, render corner watermark on PDF page
      if (showWatermark) {
        pdf.saveGraphicsState();
        pdf.setTextColor(160, 170, 185);
        if ((pdf as any).setGState) {
          const gState = new (pdf as any).GState({ opacity: 0.35 });
          pdf.setGState(gState);
        }
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.text('Digital Teaching Board', 1920 - 32, 1080 - 36, { align: 'right' });
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text(`by ${AUTHOR_NAME}`, 1920 - 32, 1080 - 22, { align: 'right' });
        pdf.restoreGraphicsState();
      }
    }

    return pdf.output('arraybuffer');
  } catch (err) {
    console.error('Error rendering slides to PDF:', err);
    return null;
  } finally {
    offscreenCanvas.dispose().catch(() => {});
  }
}

/**
 * Multi-page PDF import using pdfjs-dist
 */
export async function renderPdfPagesToDataUrls(
  pdfBuffer: ArrayBuffer,
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  const pdfjsLib = await import('pdfjs-dist');
  
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  }

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) });
  const pdf = await loadingTask.promise;
  const pageImages: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    if (onProgress) {
      onProgress(pageNum, pdf.numPages);
    }
    const page = await pdf.getPage(pageNum);
    // Scale proportionally to fit 1920x1080 board for razor-sharp text and fast loading
    const unscaled = page.getViewport({ scale: 1.0 });
    const fitScale = Math.min(1920 / unscaled.width, 1080 / unscaled.height);
    const renderScale = Math.max(1.2, Math.min(fitScale * 1.25, 2.0));
    const viewport = page.getViewport({ scale: renderScale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) continue;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Fill white background for transparent PDF pages
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    pageImages.push(canvas.toDataURL('image/png'));
  }

  return pageImages;
}
