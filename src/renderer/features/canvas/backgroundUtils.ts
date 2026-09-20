import { Canvas, Pattern, FabricImage } from 'fabric';
import { SlideBackground } from '../../store/slidesSlice';

/**
 * Creates high-performance canvas pattern sources for ruled, grid, and dotted boards
 */
export function createPatternCanvas(type: 'ruled' | 'grid' | 'dots'): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  if (type === 'ruled') {
    // 48px standard lecture ruled lines
    canvas.width = 100;
    canvas.height = 48;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 47.5);
    ctx.lineTo(100, 47.5);
    ctx.stroke();
  } else if (type === 'grid') {
    // 40x40 Math grid
    canvas.width = 40;
    canvas.height = 40;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 40, 40);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 39.5);
    ctx.lineTo(40, 39.5);
    ctx.moveTo(39.5, 0);
    ctx.lineTo(39.5, 40);
    ctx.stroke();
  } else if (type === 'dots') {
    // 32x32 Dot paper
    canvas.width = 32;
    canvas.height = 32;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 32, 32);

    ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.beginPath();
    ctx.arc(16, 16, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

/**
 * Applies a background configuration to the Fabric canvas strictly behind all drawn objects
 */
export async function applyBackgroundToCanvas(canvas: Canvas, bg: SlideBackground) {
  if (!canvas) return;

  if (bg.type === 'image' || bg.type === 'pdf') {
    if (bg.value) {
      try {
        const img = await FabricImage.fromURL(bg.value);
        const imgW = img.width || 1920;
        const imgH = img.height || 1080;
        const baseScale = Math.min(1920 / imgW, 1080 / imgH);
        const scale = baseScale * (bg.scale || 1);
        const scaledWidth = imgW * scale;
        const scaledHeight = imgH * scale;
        const baseLeft = (1920 - scaledWidth) / 2;
        const baseTop = (1080 - scaledHeight) / 2;
        const left = baseLeft + (bg.offsetX || 0);
        const top = baseTop + (bg.offsetY || 0);

        img.set({
          scaleX: scale,
          scaleY: scale,
          originX: 'left',
          originY: 'top',
          left,
          top,
          selectable: false,
          evented: false
        });
        canvas.backgroundImage = img;
        canvas.backgroundColor = '#0f172a';
      } catch (err) {
        console.error('Error loading background image:', err);
        canvas.backgroundImage = undefined;
        canvas.backgroundColor = '#0f172a';
      }
    } else {
      canvas.backgroundImage = undefined;
      canvas.backgroundColor = '#0f172a';
    }
  } else {
    // Remove any background image so color/pattern displays cleanly
    canvas.backgroundImage = undefined;

    switch (bg.type) {
      case 'white':
        canvas.backgroundColor = '#ffffff';
        break;

      case 'blackboard':
        canvas.backgroundColor = '#064e3b'; // Classroom dark matte green
        break;

      case 'chalkboard':
        canvas.backgroundColor = '#0f172a'; // Deep slate chalkboard
        break;

      case 'ruled':
      case 'grid':
      case 'dots': {
        const patternCanvas = createPatternCanvas(bg.type);
        canvas.backgroundColor = new Pattern({
          source: patternCanvas,
          repeat: 'repeat'
        });
        break;
      }

      default:
        canvas.backgroundColor = '#0f172a';
        break;
    }
  }

  canvas.renderAll();
}
