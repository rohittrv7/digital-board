import React, { useEffect, useRef, useState } from 'react';
import { Canvas, PencilBrush, Rect, Circle, Line, IText, Group, Polygon, Path, Point, config, FabricImage } from 'fabric';
import { useAppDispatch, useAppSelector, store } from '../../store';
import { updateSlideCanvas } from '../../store/slidesSlice';
import { pushHistory, initSlideHistory } from '../../store/historySlice';
import { setTool } from '../../store/toolsSlice';
import { setPanOffset, setIsPanning, setZoom } from '../../store/uiSlice';
import { applyBackgroundToCanvas } from './backgroundUtils';
import { CanvasWatermark } from '../../components/CanvasWatermark';
import { BringToFront, SendToBack, ArrowUp, ArrowDown, Copy, Trash2 } from 'lucide-react';

// Set High-DPI / Retina backing store resolution for razor-sharp HD strokes
if (typeof window !== 'undefined') {
  config.devicePixelRatio = Math.max(window.devicePixelRatio || 1, 2);
}

const VIRTUAL_WIDTH = 1920;
const VIRTUAL_HEIGHT = 1080;

// Helper to construct an Arrow (Line + Triangular Polygon Arrowhead)
function createArrow(x1: number, y1: number, x2: number, y2: number, strokeColor: string, strokeWidth: number): Group {
  const line = new Line([x1, y1, x2, y2], {
    stroke: strokeColor,
    strokeWidth: strokeWidth,
    strokeLineCap: 'round',
    selectable: false
  });

  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLength = Math.max(18, strokeWidth * 3.5);

  const p1 = { x: x2, y: y2 };
  const p2 = {
    x: x2 - headLength * Math.cos(angle - Math.PI / 6),
    y: y2 - headLength * Math.sin(angle - Math.PI / 6)
  };
  const p3 = {
    x: x2 - headLength * Math.cos(angle + Math.PI / 6),
    y: y2 - headLength * Math.sin(angle + Math.PI / 6)
  };

  const head = new Polygon([p1, p2, p3], {
    fill: strokeColor,
    stroke: strokeColor,
    strokeWidth: 1,
    selectable: false
  });

  return new Group([line, head], {
    selectable: true,
    hasControls: true,
    cornerColor: '#3b82f6',
    cornerSize: 10,
    transparentCorners: false
  });
}

// Helper to split a Fabric freehand Path into surviving chunks when hit by an eraser
function splitPathByEraser(pathObj: any, eraserX: number, eraserY: number, eraseRadius: number): any[][] | null {
  const segments: any[] = pathObj.path;
  if (!segments || segments.length === 0) return null;

  let currX = 0;
  let currY = 0;
  const isHit: boolean[] = [];
  const startPoints: { x: number; y: number }[] = [];

  for (let i = 0; i < segments.length; i++) {
    const cmd = segments[i];
    if (cmd[0] === 'M') {
      currX = cmd[1];
      currY = cmd[2];
    }
    const segStartX = currX;
    const segStartY = currY;
    startPoints.push({ x: segStartX, y: segStartY });

    let endX = currX;
    let endY = currY;
    let midX = currX;
    let midY = currY;

    if (cmd[0] === 'M' || cmd[0] === 'L') {
      endX = cmd[1];
      endY = cmd[2];
      midX = (segStartX + endX) / 2;
      midY = (segStartY + endY) / 2;
    } else if (cmd[0] === 'Q') {
      const cx = cmd[1];
      const cy = cmd[2];
      endX = cmd[3];
      endY = cmd[4];
      midX = 0.25 * segStartX + 0.5 * cx + 0.25 * endX;
      midY = 0.25 * segStartY + 0.5 * cy + 0.25 * endY;
    } else if (cmd[0] === 'C') {
      endX = cmd[5];
      endY = cmd[6];
      midX = (segStartX + endX) / 2;
      midY = (segStartY + endY) / 2;
    }

    const dEnd = Math.hypot(endX - eraserX, endY - eraserY);
    const dMid = Math.hypot(midX - eraserX, midY - eraserY);
    const dStart = Math.hypot(segStartX - eraserX, segStartY - eraserY);

    const hit = (dEnd <= eraseRadius || dMid <= eraseRadius || dStart <= eraseRadius);
    isHit.push(hit);

    currX = endX;
    currY = endY;
  }

  // If no segment touched the eraser, return null (no change)
  if (!isHit.some(h => h)) {
    return null;
  }

  // Build contiguous surviving chunks
  const chunks: any[][] = [];
  let currentChunk: any[] = [];

  for (let i = 0; i < segments.length; i++) {
    const cmd = segments[i];
    const segStartX = startPoints[i].x;
    const segStartY = startPoints[i].y;

    if (!isHit[i]) {
      if (currentChunk.length === 0) {
        currentChunk.push(['M', segStartX, segStartY]);
      }
      if (cmd[0] !== 'M') {
        currentChunk.push(cmd);
      }
    } else {
      if (currentChunk.length > 1) {
        chunks.push(currentChunk);
      }
      currentChunk = [];
    }
  }

  if (currentChunk.length > 1) {
    chunks.push(currentChunk);
  }

  return chunks;
}

// Helper to split a straight Line when intersected by the eraser
function splitLineByEraser(lineObj: any, eraserX: number, eraserY: number, eraseRadius: number): [number, number, number, number][] | null {
  const x1 = lineObj.x1 ?? lineObj.get?.('x1') ?? 0;
  const y1 = lineObj.y1 ?? lineObj.get?.('y1') ?? 0;
  const x2 = lineObj.x2 ?? lineObj.get?.('x2') ?? 0;
  const y2 = lineObj.y2 ?? lineObj.get?.('y2') ?? 0;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return null;

  let t = ((eraserX - x1) * dx + (eraserY - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  const dist = Math.hypot(eraserX - projX, eraserY - projY);

  if (dist > eraseRadius) return null;

  const len = Math.sqrt(lenSq);
  const cutFraction = eraseRadius / len;
  const t1 = Math.max(0, t - cutFraction);
  const t2 = Math.min(1, t + cutFraction);

  const pieces: [number, number, number, number][] = [];
  if (t1 > 0.05) {
    pieces.push([x1, y1, x1 + t1 * dx, y1 + t1 * dy]);
  }
  if (t2 < 0.95) {
    pieces.push([x1 + t2 * dx, y1 + t2 * dy, x2, y2]);
  }
  return pieces;
}

export const BoardCanvas: React.FC = () => {
  const dispatch = useAppDispatch();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const laserCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  
  // Stale closure guards & sync cache
  const activeSlideIdRef = useRef<string>('');
  const prevSlideIdRef = useRef<string>('');
  const activeToolRef = useRef<string>('pen');
  const strokeColorRef = useRef<string>('#ffffff');
  const strokeWidthRef = useRef<number>(4);
  const pressureEnabledRef = useRef<boolean>(true);
  const isSwitchingRef = useRef<boolean>(false);
  const isRestoringRef = useRef<boolean>(false);
  const isDrawingShapeRef = useRef<boolean>(false);
  const isErasingRef = useRef<boolean>(false);
  const erasedAnyRef = useRef<boolean>(false);
  const shapeStartPointRef = useRef<{ x: number; y: number } | null>(null);
  const currentShapeRef = useRef<any>(null);
  const slideCacheRef = useRef<Record<string, any>>({});
  const thumbnailTimerRef = useRef<NodeJS.Timeout | null>(null);
  const laserPointsRef = useRef<{ x: number; y: number; time: number }[]>([]);
  const laserAnimIdRef = useRef<number | null>(null);

  // Redux selectors
  const activeSlideId = useAppSelector(state => state.slides.activeSlideId);
  const slides = useAppSelector(state => state.slides.slides);
  const slidesRef = useRef(slides);
  slidesRef.current = slides;
  const activeSlide = slides.find(s => s.id === activeSlideId);
  const activeTool = useAppSelector(state => state.tools.activeTool);
  const strokeColor = useAppSelector(state => state.tools.strokeColor);
  const strokeWidth = useAppSelector(state => state.tools.strokeWidth);
  const pressureEnabled = useAppSelector(state => state.tools.pressureSensitivityEnabled);
  const restoreSignal = useAppSelector(state => state.history.restoreSignal);
  const loadedTimestamp = useAppSelector(state => state.slides.loadedTimestamp);
  const panOffset = useAppSelector(state => state.ui.panOffset);
  const zoomLevel = useAppSelector(state => state.ui.zoomLevel);
  const isZenMode = useAppSelector(state => state.ui.isZenMode);

  const panOffsetRef = useRef(panOffset);
  panOffsetRef.current = panOffset;
  const zoomLevelRef = useRef(zoomLevel);
  zoomLevelRef.current = zoomLevel;
  const isZenModeRef = useRef(isZenMode);
  isZenModeRef.current = isZenMode;
  const lastEraserPosRef = useRef<{ x: number; y: number } | null>(null);

  const isSpaceDownRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const wasDrawingModeRef = useRef(false);
  const updateCanvasScaleRef = useRef<() => void>(() => {});

  // Sync refs
  activeSlideIdRef.current = activeSlideId;
  activeToolRef.current = activeTool;
  strokeColorRef.current = strokeColor;
  strokeWidthRef.current = strokeWidth;
  pressureEnabledRef.current = pressureEnabled;

  // Context Menu State for Object Layering & Management
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    target: any;
  }>({
    visible: false,
    x: 0,
    y: 0,
    target: null
  });

  // Layering Actions
  const handleBringToFront = (target: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !target) return;
    canvas.bringObjectToFront(target);
    canvas.renderAll();
    commitCanvasChange();
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleBringForward = (target: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !target) return;
    canvas.bringObjectForward(target);
    canvas.renderAll();
    commitCanvasChange();
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleSendBackward = (target: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !target) return;
    canvas.sendObjectBackwards(target);
    canvas.renderAll();
    commitCanvasChange();
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleSendToBack = (target: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !target) return;
    canvas.sendObjectToBack(target);
    canvas.renderAll();
    commitCanvasChange();
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleDuplicate = async (target: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !target) return;
    try {
      const cloned = await target.clone();
      cloned.set({
        left: (target.left || 0) + 24,
        top: (target.top || 0) + 24
      });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      cloned.setCoords();
      canvas.renderAll();
      commitCanvasChange();
    } catch (err) {
      console.error('Failed to clone object:', err);
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleDelete = (target: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !target) return;
    canvas.remove(target);
    canvas.discardActiveObject();
    canvas.renderAll();
    commitCanvasChange();
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  // Close context menu on outside click
  useEffect(() => {
    const handleOutsideClick = () => {
      setContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev);
    };
    window.addEventListener('pointerdown', handleOutsideClick);
    return () => window.removeEventListener('pointerdown', handleOutsideClick);
  }, []);

  // Listen for image insertion events from Toolbar or Drag & Drop
  useEffect(() => {
    const handleInsertImageEvent = async (e: Event) => {
      const customEvent = e as CustomEvent<{ dataUrl: string }>;
      const dataUrl = customEvent.detail?.dataUrl;
      const canvas = fabricCanvasRef.current;
      if (!canvas || !dataUrl) return;

      try {
        const imgObj = await FabricImage.fromURL(dataUrl, {
          crossOrigin: 'anonymous'
        });
        if (!imgObj) return;

        const maxWidth = 960;
        const maxHeight = 640;
        const origW = imgObj.width || 1;
        const origH = imgObj.height || 1;

        let scale = 1;
        if (origW > maxWidth || origH > maxHeight) {
          scale = Math.min(maxWidth / origW, maxHeight / origH);
        }
        imgObj.scale(scale);

        const scaledW = imgObj.getScaledWidth();
        const scaledH = imgObj.getScaledHeight();

        imgObj.set({
          left: Math.round((VIRTUAL_WIDTH - scaledW) / 2),
          top: Math.round((VIRTUAL_HEIGHT - scaledH) / 2),
          cornerColor: '#C4F135',
          cornerStrokeColor: '#0c0e0a',
          borderColor: '#C4F135',
          cornerSize: 10,
          transparentCorners: false,
          selectable: true,
          hasControls: true
        });

        canvas.add(imgObj);
        canvas.setActiveObject(imgObj);
        imgObj.setCoords();
        canvas.renderAll();

        dispatch(setTool('select'));
        commitCanvasChange();
      } catch (err) {
        console.error('Error inserting image into canvas:', err);
      }
    };

    window.addEventListener('board:insert-image', handleInsertImageEvent);
    return () => window.removeEventListener('board:insert-image', handleInsertImageEvent);
  }, [dispatch]);

  // Listen for external commit signal (e.g. before save or auto-save)
  useEffect(() => {
    const handleCommitNow = () => {
      commitCanvasChange();
    };
    window.addEventListener('board:commit-now', handleCommitNow);
    return () => window.removeEventListener('board:commit-now', handleCommitNow);
  }, []);

  // Reload canvas when a project is opened / loaded from disk
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !loadedTimestamp) return;

    const reloadOpenedProject = async () => {
      isSwitchingRef.current = true;
      try {
        canvas.clear();
        slideCacheRef.current = {};
        prevSlideIdRef.current = activeSlideId;

        const targetSlide = slides.find(s => s.id === activeSlideId);
        if (!targetSlide) return;

        if (targetSlide.canvasJSON && targetSlide.canvasJSON.objects) {
          await canvas.loadFromJSON(targetSlide.canvasJSON);
        }

        await applyBackgroundToCanvas(canvas, targetSlide.background);
        updateCanvasScaleRef.current();
        canvas.renderAll();

        const currentJson = canvas.toJSON();
        slideCacheRef.current[activeSlideId] = currentJson;
        dispatch(initSlideHistory({ slideId: activeSlideId, initialJson: JSON.stringify(currentJson) }));
      } catch (err) {
        console.error('Error reloading opened project on canvas:', err);
      } finally {
        isSwitchingRef.current = false;
      }
    };

    reloadOpenedProject();
  }, [loadedTimestamp]);

  // High-fidelity 16:9 thumbnail generator from rendered canvas
  const captureThumbnail = (canvas: Canvas): string => {
    try {
      const el = canvas.lowerCanvasEl;
      if (!el || el.width === 0 || el.height === 0) return '';

      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 320;
      thumbCanvas.height = 180;
      const ctx = thumbCanvas.getContext('2d');
      if (!ctx) return '';

      // Draw the entire rendered canvas buffer to the 320x180 thumbnail
      ctx.drawImage(el, 0, 0, el.width, el.height, 0, 0, 320, 180);
      return thumbCanvas.toDataURL('image/jpeg', 0.85);
    } catch (e) {
      return '';
    }
  };

  // Debounced thumbnail generator
  const scheduleThumbnailUpdate = (slideId: string) => {
    if (thumbnailTimerRef.current) {
      clearTimeout(thumbnailTimerRef.current);
    }
    thumbnailTimerRef.current = setTimeout(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !slideId) return;
      const thumb = captureThumbnail(canvas);
      dispatch(updateSlideCanvas({
        id: slideId,
        canvasJSON: canvas.toJSON(),
        thumbnail: thumb
      }));
    }, 350);
  };

  // Commit changes to history & Redux
  const commitCanvasChange = () => {
    const canvas = fabricCanvasRef.current;
    const currentId = activeSlideIdRef.current;
    if (!canvas || !currentId) return;

    const json = canvas.toJSON();
    slideCacheRef.current[currentId] = json;
    dispatch(pushHistory({ slideId: currentId, json: JSON.stringify(json) }));
    dispatch(updateSlideCanvas({ id: currentId, canvasJSON: json }));
    scheduleThumbnailUpdate(currentId);
  };

  // Segment-level and object-level Erasing
  const eraseAtPoint = (point: { x: number; y: number }) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const eraseRadius = Math.max(18, strokeWidthRef.current * 3);
    const objects = canvas.getObjects();
    let changed = false;

    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i] as any;
      if (!obj) continue;

      const bound = obj.getBoundingRect();
      const intersects = (
        point.x >= bound.left - eraseRadius &&
        point.x <= bound.left + bound.width + eraseRadius &&
        point.y >= bound.top - eraseRadius &&
        point.y <= bound.top + bound.height + eraseRadius
      );

      if (!intersects) continue;

      // 0. Protect Images from Eraser (Image is a solid object, eraser is for strokes/drawings)
      if (obj.type === 'image' || obj instanceof FabricImage) {
        continue;
      }

      // 1. Freehand Path (Segment-level Splitting)
      if (obj.type === 'path' || obj instanceof Path) {
        const chunks = splitPathByEraser(obj, point.x, point.y, eraseRadius);
        if (chunks !== null) {
          canvas.remove(obj);
          chunks.forEach(chunk => {
            const newPath = new Path(chunk, {
              fill: null,
              stroke: obj.stroke,
              strokeWidth: obj.strokeWidth,
              strokeLineCap: obj.strokeLineCap || 'round',
              strokeLineJoin: obj.strokeLineJoin || 'round',
              strokeMiterLimit: obj.strokeMiterLimit,
              selectable: false
            });
            canvas.add(newPath);
          });
          changed = true;
          erasedAnyRef.current = true;
        }
      } 
      // 2. Straight Line (Splitting into shorter lines)
      else if (obj.type === 'line' || obj instanceof Line) {
        const pieces = splitLineByEraser(obj, point.x, point.y, eraseRadius);
        if (pieces !== null) {
          canvas.remove(obj);
          pieces.forEach(([x1, y1, x2, y2]) => {
            const newLine = new Line([x1, y1, x2, y2], {
              stroke: obj.stroke,
              strokeWidth: obj.strokeWidth,
              strokeLineCap: obj.strokeLineCap || 'round',
              selectable: false
            });
            canvas.add(newLine);
          });
          changed = true;
          erasedAnyRef.current = true;
        }
      }
      // 3. Discrete objects (Shapes, Groups, Text) -> remove directly
      else {
        canvas.remove(obj);
        changed = true;
        erasedAnyRef.current = true;
      }
    }

    if (changed) {
      canvas.renderAll();
    }
  };

  // 1. Initialize Fabric Canvas
  useEffect(() => {
    if (!canvasElRef.current || !containerRef.current) return;

    config.devicePixelRatio = Math.max(window.devicePixelRatio || 1, 2);

    const canvas = new Canvas(canvasElRef.current, {
      width: VIRTUAL_WIDTH,
      height: VIRTUAL_HEIGHT,
      backgroundColor: '#0f172a',
      isDrawingMode: true,
      selection: false,
      enableRetinaScaling: true,
      renderOnAddRemove: false,
      stopContextMenu: true,
      fireRightClick: true
    });

    fabricCanvasRef.current = canvas;
    (window as any).__fabricCanvas = canvas;
    prevSlideIdRef.current = activeSlideId;
    activeSlideIdRef.current = activeSlideId;

    // Helper: Map raw DOM/mouse events directly to 1920x1080 virtual canvas coordinates
    // Accounts for responsive CSS scaling, window resize, and parent container transforms
    const getVirtualScenePoint = (e: any): Point => {
      const upper = canvas.upperCanvasEl;
      if (!upper || !e) return new Point(0, 0);
      const rect = upper.getBoundingClientRect();
      const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? (e.pointerEvent && e.pointerEvent.clientX) ?? 0;
      const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? (e.pointerEvent && e.pointerEvent.clientY) ?? 0;
      if (rect.width <= 0 || rect.height <= 0) return new Point(0, 0);
      const x = Math.max(0, Math.min(VIRTUAL_WIDTH, ((clientX - rect.left) / rect.width) * VIRTUAL_WIDTH));
      const y = Math.max(0, Math.min(VIRTUAL_HEIGHT, ((clientY - rect.top) / rect.height) * VIRTUAL_HEIGHT));
      return new Point(x, y);
    };

    // Override Fabric's internal getScenePoint so ALL Fabric subsystems
    // (brush, hit-testing, selection, controls) map 1:1 with screen cursor
    (canvas as any).getScenePoint = (e: any) => getVirtualScenePoint(e);

    // Configure Pencil Brush
    const brush = new PencilBrush(canvas);
    brush.color = strokeColor;
    brush.width = strokeWidth;
    brush.decimate = 2.5;
    brush.strokeLineCap = 'round';
    brush.strokeLineJoin = 'round';
    canvas.freeDrawingBrush = brush;

    // Apply Initial Background and capture initial state
    const initInitialBackground = async () => {
      if (activeSlide) {
        await applyBackgroundToCanvas(canvas, activeSlide.background);
      }
      const initialJson = canvas.toJSON();
      slideCacheRef.current[activeSlideId] = initialJson;
      dispatch(initSlideHistory({ slideId: activeSlideId, initialJson: JSON.stringify(initialJson) }));
      const thumb = captureThumbnail(canvas);
      if (thumb) {
        dispatch(updateSlideCanvas({ id: activeSlideId, canvasJSON: initialJson, thumbnail: thumb }));
      }
    };
    initInitialBackground();

    // Freehand Stroke Finished Listener
    const handlePathCreated = () => {
      if (isSwitchingRef.current || isRestoringRef.current) return;
      commitCanvasChange();
    };
    canvas.on('path:created', handlePathCreated);

    // Mouse Down Listener for Shapes, Text, Eraser, & Panning
    const handleMouseDown = (opt: any) => {
      setContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev);
      if (isSwitchingRef.current || isRestoringRef.current) return;

      // Space + Drag or Middle Mouse Panning
      if (isSpaceDownRef.current || (opt.e && opt.e.button === 1)) {
        isPanningRef.current = true;
        dispatch(setIsPanning(true));
        panStartRef.current = { x: opt.e.clientX, y: opt.e.clientY };
        initialPanRef.current = { ...panOffsetRef.current };
        canvas.defaultCursor = 'grabbing';
        return;
      }

      const tool = activeToolRef.current;
      const point = getVirtualScenePoint(opt.e || opt);

      const currentTools = store.getState().tools;
      const color = currentTools.strokeColor;
      const width = currentTools.strokeWidth;

      // Eraser Tool
      if (tool === 'eraser') {
        isErasingRef.current = true;
        erasedAnyRef.current = false;
        eraseAtPoint(point);
        return;
      }

      // Text Tool
      if (tool === 'text') {
        if (opt.target) return;

        const text = new IText('Type text here...', {
          left: point.x,
          top: point.y,
          fill: color === '#0f172a' ? '#ffffff' : color,
          fontSize: 36,
          fontFamily: 'Inter, system-ui, sans-serif',
          cornerColor: '#3b82f6',
          cornerSize: 10,
          transparentCorners: false
        });

        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        canvas.renderAll();
        dispatch(setTool('select'));
        commitCanvasChange();
        return;
      }

      // Shapes Tools
      if (['rectangle', 'circle', 'line', 'arrow'].includes(tool)) {
        isDrawingShapeRef.current = true;
        shapeStartPointRef.current = { x: point.x, y: point.y };

        if (tool === 'rectangle') {
          const rect = new Rect({
            left: point.x,
            top: point.y,
            width: 0,
            height: 0,
            fill: 'transparent',
            stroke: color,
            strokeWidth: width,
            strokeLineCap: 'round',
            strokeLineJoin: 'round',
            cornerColor: '#3b82f6',
            cornerSize: 10,
            transparentCorners: false,
            selectable: false
          });
          currentShapeRef.current = rect;
          canvas.add(rect);
        } else if (tool === 'circle') {
          const circle = new Circle({
            left: point.x,
            top: point.y,
            radius: 0,
            fill: 'transparent',
            stroke: color,
            strokeWidth: width,
            cornerColor: '#3b82f6',
            cornerSize: 10,
            transparentCorners: false,
            selectable: false
          });
          currentShapeRef.current = circle;
          canvas.add(circle);
        } else if (tool === 'line' || tool === 'arrow') {
          const line = new Line([point.x, point.y, point.x, point.y], {
            stroke: color,
            strokeWidth: width,
            strokeLineCap: 'round',
            cornerColor: '#3b82f6',
            cornerSize: 10,
            transparentCorners: false,
            selectable: false
          });
          currentShapeRef.current = line;
          canvas.add(line);
        }
      }
    };
    canvas.on('mouse:down', handleMouseDown);

    // Right-Click Context Menu for Layering and Object Management
    const handleContextMenu = (opt: any) => {
      if (opt.e) {
        opt.e.preventDefault();
        opt.e.stopPropagation();
      }
      const target = opt.target || canvas.getActiveObject();
      if (target) {
        canvas.setActiveObject(target);
        canvas.renderAll();
        const clientX = opt.e?.clientX ?? (window.innerWidth / 2);
        const clientY = opt.e?.clientY ?? (window.innerHeight / 2);
        setContextMenu({
          visible: true,
          x: clientX,
          y: clientY,
          target
        });
      } else {
        setContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev);
      }
    };
    canvas.on('contextmenu', handleContextMenu);

    // Mouse Move Listener for Shapes, Eraser, Laser, & Panning
    const handleMouseMove = (opt: any) => {
      // Panning in progress
      if (isPanningRef.current && opt.e) {
        const e = opt.e;
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        dispatch(setPanOffset({
          x: Math.round(initialPanRef.current.x + dx),
          y: Math.round(initialPanRef.current.y + dy)
        }));
        return;
      }

      const tool = activeToolRef.current;
      const point = getVirtualScenePoint(opt.e || opt);

      // Laser Pointer Trail
      if (tool === 'laser') {
        laserPointsRef.current.push({ x: point.x, y: point.y, time: Date.now() });
        return;
      }

      // Eraser Dragging & Hover position for dashed cursor box
      if (tool === 'eraser') {
        lastEraserPosRef.current = { x: point.x, y: point.y };
        if (isErasingRef.current) {
          eraseAtPoint(point);
        }
        return;
      } else {
        lastEraserPosRef.current = null;
      }

      // Shape Rubber-Band Preview
      if (!isDrawingShapeRef.current || !shapeStartPointRef.current || !currentShapeRef.current) return;
      const start = shapeStartPointRef.current;
      const shape = currentShapeRef.current;

      if (tool === 'rectangle') {
        const left = Math.min(start.x, point.x);
        const top = Math.min(start.y, point.y);
        const width = Math.abs(point.x - start.x);
        const height = Math.abs(point.y - start.y);
        shape.set({ left, top, width, height });
        shape.setCoords();
      } else if (tool === 'circle') {
        const w = Math.abs(point.x - start.x);
        const h = Math.abs(point.y - start.y);
        const radius = Math.max(w, h) / 2;
        const left = Math.min(start.x, point.x);
        const top = Math.min(start.y, point.y);
        shape.set({ left, top, radius });
        shape.setCoords();
      } else if (tool === 'line' || tool === 'arrow') {
        shape.set({ x2: point.x, y2: point.y });
        shape.setCoords();
      }

      canvas.renderAll();
    };
    canvas.on('mouse:move', handleMouseMove);

    // Mouse Up Listener
    const handleMouseUp = (opt: any) => {
      // Finish Panning
      if (isPanningRef.current) {
        isPanningRef.current = false;
        dispatch(setIsPanning(false));
        canvas.defaultCursor = isSpaceDownRef.current ? 'grab' : (['pen', 'highlighter'].includes(activeToolRef.current) ? 'crosshair' : 'default');
        return;
      }

      const tool = activeToolRef.current;

      // Eraser Finished
      if (tool === 'eraser' && isErasingRef.current) {
        isErasingRef.current = false;
        if (erasedAnyRef.current) {
          commitCanvasChange();
        }
        return;
      }

      // Shape Finalize
      const shape = currentShapeRef.current;
      if (!isDrawingShapeRef.current || !shapeStartPointRef.current) return;
      isDrawingShapeRef.current = false;

      const start = shapeStartPointRef.current;
      const point = getVirtualScenePoint(opt.e || opt) || start;
      const currentTools = store.getState().tools;
      const color = currentTools.strokeColor;
      const width = currentTools.strokeWidth;

      const dist = Math.hypot(point.x - start.x, point.y - start.y);

      if (dist < 4) {
        if (shape) canvas.remove(shape);
        currentShapeRef.current = null;
        shapeStartPointRef.current = null;
        canvas.renderAll();
        return;
      }

      if (tool === 'arrow') {
        if (shape) canvas.remove(shape);
        const arrow = createArrow(start.x, start.y, point.x, point.y, color, width);
        canvas.add(arrow);
        arrow.setCoords();
        canvas.setActiveObject(arrow);
      } else if (shape) {
        shape.set({
          stroke: color,
          strokeWidth: width,
          selectable: true,
          hasControls: true
        });
        shape.setCoords();
        canvas.setActiveObject(shape);
      }

      canvas.renderAll();
      currentShapeRef.current = null;
      shapeStartPointRef.current = null;

      // Auto-switch to Select tool and display selection/transform handles
      dispatch(setTool('select'));
      commitCanvasChange();
    };
    canvas.on('mouse:up', handleMouseUp);

    // Pointer Events API: Dynamic XP-Pen Pressure Sensitivity Wiring
    const upperEl = canvas.upperCanvasEl;

    const handlePointerDown = (e: PointerEvent) => {
      const tool = activeToolRef.current;
      if (tool !== 'pen' && tool !== 'highlighter') return;

      if (pressureEnabledRef.current && (e.pointerType === 'pen' || e.pressure > 0)) {
        const pressure = Math.max(0.08, Math.min(1.0, e.pressure || 0.5));
        const baseWidth = strokeWidthRef.current;
        const multiplier = tool === 'highlighter' ? 2.5 : 1.0;
        const minW = Math.max(1, baseWidth * 0.35);
        const maxW = baseWidth * 1.65;
        const dynamicW = Math.round((minW + (maxW - minW) * pressure) * multiplier);
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.width = dynamicW;
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const tool = activeToolRef.current;
      if (tool !== 'pen' && tool !== 'highlighter') return;

      if (pressureEnabledRef.current && (e.pointerType === 'pen' || e.pressure > 0) && e.buttons !== 0) {
        const pressure = Math.max(0.08, Math.min(1.0, e.pressure || 0.5));
        const baseWidth = strokeWidthRef.current;
        const multiplier = tool === 'highlighter' ? 2.5 : 1.0;
        const minW = Math.max(1, baseWidth * 0.35);
        const maxW = baseWidth * 1.65;
        const dynamicW = Math.round((minW + (maxW - minW) * pressure) * multiplier);
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.width = dynamicW;
        }
      }
    };

    const handlePointerUp = () => {
      if (canvas.freeDrawingBrush) {
        const multiplier = activeToolRef.current === 'highlighter' ? 2.5 : 1.0;
        canvas.freeDrawingBrush.width = strokeWidthRef.current * multiplier;
      }
    };

    upperEl.addEventListener('pointerdown', handlePointerDown);
    upperEl.addEventListener('pointermove', handlePointerMove);
    upperEl.addEventListener('pointerup', handlePointerUp);

    // Object Transform Finished
    const handleObjectModified = () => {
      if (isSwitchingRef.current || isRestoringRef.current) return;
      commitCanvasChange();
    };
    canvas.on('object:modified', handleObjectModified);

    // Responsive High-DPI Resize Handler
    const updateSize = () => {
      if (!containerRef.current || !canvas) return;
      const rect = containerRef.current.getBoundingClientRect();
      const containerWidth = rect.width;
      const containerHeight = rect.height;

      if (containerWidth <= 0 || containerHeight <= 0) return;

      const margin = isZenModeRef.current ? 0 : 16;
      const scale = Math.min(
        (containerWidth - margin) / VIRTUAL_WIDTH,
        (containerHeight - margin) / VIRTUAL_HEIGHT
      );

      const scaledWidth = Math.round(VIRTUAL_WIDTH * scale);
      const scaledHeight = Math.round(VIRTUAL_HEIGHT * scale);

      canvas.setDimensions({
        width: scaledWidth,
        height: scaledHeight
      });
      canvas.setZoom(scale);
      canvas.renderAll();

      if (laserCanvasRef.current) {
        laserCanvasRef.current.width = scaledWidth;
        laserCanvasRef.current.height = scaledHeight;
      }
    };

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);
    updateSize();

    // Laser Animation & Eraser Cursor Loop
    const renderLaser = () => {
      const lCanvas = laserCanvasRef.current;
      if (lCanvas) {
        const ctx = lCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, lCanvas.width, lCanvas.height);
          const now = Date.now();
          const zoom = canvas.getZoom();

          // Render laser points
          laserPointsRef.current = laserPointsRef.current.filter(p => now - p.time < 600);

          for (let i = 0; i < laserPointsRef.current.length; i++) {
            const pt = laserPointsRef.current[i];
            const age = (now - pt.time) / 600;
            const alpha = 1 - age;
            const radius = Math.max(3, (1 - age) * 8);

            const screenX = pt.x * zoom;
            const screenY = pt.y * zoom;

            ctx.beginPath();
            ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(239, 68, 68, ${alpha * 0.9})`;
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 12;
            ctx.fill();
          }

          // Render dashed eraser cursor box (Screenshot 2)
          if (activeToolRef.current === 'eraser' && lastEraserPosRef.current) {
            const eraseRadius = Math.max(18, strokeWidthRef.current * 3);
            const screenX = lastEraserPosRef.current.x * zoom;
            const screenY = lastEraserPosRef.current.y * zoom;
            const scaledRadius = eraseRadius * zoom;

            ctx.save();
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(
              screenX - scaledRadius,
              screenY - scaledRadius,
              scaledRadius * 2,
              scaledRadius * 2
            );
            ctx.restore();
          }
        }
      }
      laserAnimIdRef.current = requestAnimationFrame(renderLaser);
    };
    laserAnimIdRef.current = requestAnimationFrame(renderLaser);

    // Space key & Delete / Backspace key listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space' && !isSpaceDownRef.current) {
        e.preventDefault();
        isSpaceDownRef.current = true;
        canvas.defaultCursor = 'grab';
        canvas.hoverCursor = 'grab';
        wasDrawingModeRef.current = canvas.isDrawingMode;
        if (canvas.isDrawingMode) {
          canvas.isDrawingMode = false;
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObj = canvas.getActiveObject();
        if (activeObj && (activeObj as any).isEditing) {
          return;
        }

        const activeObjs = canvas.getActiveObjects();
        if (activeObjs && activeObjs.length > 0) {
          e.preventDefault();
          activeObjs.forEach(obj => canvas.remove(obj));
          canvas.discardActiveObject();
          canvas.renderAll();
          commitCanvasChange();
          return;
        }
      }

      // Layering & Duplicate Shortcuts (Ctrl+] / Ctrl+[ / Ctrl+D)
      if (e.ctrlKey || e.metaKey) {
        const activeObj = canvas.getActiveObject();
        if (activeObj && !(activeObj as any).isEditing) {
          if (e.key === ']') {
            e.preventDefault();
            if (e.shiftKey) {
              canvas.bringObjectToFront(activeObj);
            } else {
              canvas.bringObjectForward(activeObj);
            }
            canvas.renderAll();
            commitCanvasChange();
            return;
          } else if (e.key === '[') {
            e.preventDefault();
            if (e.shiftKey) {
              canvas.sendObjectToBack(activeObj);
            } else {
              canvas.sendObjectBackwards(activeObj);
            }
            canvas.renderAll();
            commitCanvasChange();
            return;
          } else if (e.key === 'd' || e.key === 'D') {
            e.preventDefault();
            activeObj.clone().then((cloned: any) => {
              cloned.set({
                left: (activeObj.left || 0) + 24,
                top: (activeObj.top || 0) + 24
              });
              canvas.add(cloned);
              canvas.setActiveObject(cloned);
              cloned.setCoords();
              canvas.renderAll();
              commitCanvasChange();
            });
            return;
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpaceDownRef.current = false;
        isPanningRef.current = false;
        dispatch(setIsPanning(false));
        canvas.defaultCursor = ['pen', 'highlighter'].includes(activeToolRef.current) ? 'crosshair' : 'default';
        canvas.hoverCursor = 'move';
        if (wasDrawingModeRef.current) {
          canvas.isDrawingMode = true;
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.08 : -0.08;
        dispatch(setZoom(zoomLevelRef.current + delta));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    upperEl.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      upperEl.removeEventListener('wheel', handleWheel);
      upperEl.removeEventListener('pointerdown', handlePointerDown);
      upperEl.removeEventListener('pointermove', handlePointerMove);
      upperEl.removeEventListener('pointerup', handlePointerUp);
      if (thumbnailTimerRef.current) {
        clearTimeout(thumbnailTimerRef.current);
      }
      if (laserAnimIdRef.current) {
        cancelAnimationFrame(laserAnimIdRef.current);
      }
      resizeObserver.disconnect();
      canvas.off('path:created', handlePathCreated);
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
      canvas.off('object:modified', handleObjectModified);
      canvas.dispose().catch((err) => console.warn('Canvas dispose notice:', err));
      fabricCanvasRef.current = null;
      delete (window as any).__fabricCanvas;
    };
  }, []);

  // 2. Multi-Slide Switcher
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const prevId = prevSlideIdRef.current;
    const targetId = activeSlideId;

    if (prevId === targetId) return;

    const switchSlide = async () => {
      isSwitchingRef.current = true;

      try {
        if (prevId) {
          const prevJson = canvas.toJSON();
          slideCacheRef.current[prevId] = prevJson;
          const prevThumb = captureThumbnail(canvas);
          dispatch(updateSlideCanvas({
            id: prevId,
            canvasJSON: prevJson,
            thumbnail: prevThumb
          }));
        }

        canvas.clear();
        prevSlideIdRef.current = targetId;

        const targetSlide = slidesRef.current.find(s => s.id === targetId);
        if (!targetSlide) return;

        const cachedJson = slideCacheRef.current[targetId] || targetSlide.canvasJSON;
        if (cachedJson && cachedJson.objects && cachedJson.objects.length > 0) {
          await canvas.loadFromJSON(cachedJson);
        }

        await applyBackgroundToCanvas(canvas, targetSlide.background);
        updateCanvasScaleRef.current();

        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.color = strokeColor;
          canvas.freeDrawingBrush.width = strokeWidth;
          canvas.freeDrawingBrush.decimate = 2.5;
        }

        canvas.renderAll();

        const currentJson = canvas.toJSON();
        slideCacheRef.current[targetId] = currentJson;
        dispatch(initSlideHistory({ slideId: targetId, initialJson: JSON.stringify(currentJson) }));

        const targetThumb = captureThumbnail(canvas) || targetSlide.thumbnail;
        dispatch(updateSlideCanvas({
          id: targetId,
          canvasJSON: currentJson,
          thumbnail: targetThumb
        }));
      } catch (err) {
        console.error('Error during slide switch:', err);
      } finally {
        isSwitchingRef.current = false;
      }
    };

    switchSlide();
  }, [activeSlideId]);

  // 3. Sync Active Tool Mode
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (activeTool === 'pen') {
      canvas.isDrawingMode = true;
      canvas.selection = false;
      canvas.defaultCursor = 'crosshair';
      if (!(canvas.freeDrawingBrush instanceof PencilBrush)) {
        canvas.freeDrawingBrush = new PencilBrush(canvas);
      }
      canvas.freeDrawingBrush.color = strokeColor;
      canvas.freeDrawingBrush.width = strokeWidth;
      canvas.freeDrawingBrush.decimate = 2.5;
      canvas.freeDrawingBrush.strokeLineCap = 'round';
      canvas.freeDrawingBrush.strokeLineJoin = 'round';
      canvas.discardActiveObject();
    } else if (activeTool === 'highlighter') {
      canvas.isDrawingMode = true;
      canvas.selection = false;
      canvas.defaultCursor = 'crosshair';
      if (!(canvas.freeDrawingBrush instanceof PencilBrush)) {
        canvas.freeDrawingBrush = new PencilBrush(canvas);
      }
      canvas.freeDrawingBrush.color = strokeColor + '66';
      canvas.freeDrawingBrush.width = strokeWidth * 2.5;
      canvas.freeDrawingBrush.decimate = 2.5;
      canvas.discardActiveObject();
    } else if (activeTool === 'select') {
      canvas.isDrawingMode = false;
      canvas.selection = true;
      canvas.defaultCursor = 'default';
      canvas.getObjects().forEach(obj => {
        obj.selectable = true;
        obj.evented = true;
      });
    } else if (activeTool === 'eraser') {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      canvas.defaultCursor = 'not-allowed';
      canvas.discardActiveObject();
    } else if (activeTool === 'laser') {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      canvas.defaultCursor = 'crosshair';
      canvas.discardActiveObject();
    } else if (['rectangle', 'circle', 'line', 'arrow'].includes(activeTool)) {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      canvas.defaultCursor = 'crosshair';
      canvas.discardActiveObject();
    } else if (activeTool === 'text') {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      canvas.defaultCursor = 'text';
    } else {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      canvas.defaultCursor = 'default';
    }

    canvas.renderAll();
  }, [activeTool]);

  // 4. Sync Stroke Color & Width & Pressure toggle
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (canvas.freeDrawingBrush) {
      if (activeTool === 'highlighter') {
        canvas.freeDrawingBrush.color = strokeColor + '66';
        canvas.freeDrawingBrush.width = strokeWidth * 2.5;
      } else {
        canvas.freeDrawingBrush.color = strokeColor;
        canvas.freeDrawingBrush.width = strokeWidth;
      }
    }

    const activeObj = canvas.getActiveObject();
    if (activeObj && !isSwitchingRef.current && !isRestoringRef.current) {
      const type = (activeObj.type || '').toLowerCase();
      if (type === 'i-text' || type === 'text') {
        activeObj.set({ fill: strokeColor });
      } else if (type === 'line') {
        activeObj.set({ stroke: strokeColor, strokeWidth });
      } else if (type === 'rect' || type === 'rectangle' || type === 'circle') {
        activeObj.set({ stroke: strokeColor, strokeWidth });
      } else if (type === 'group') {
        (activeObj as Group).forEachObject(item => {
          const itemType = (item.type || '').toLowerCase();
          if (itemType === 'line') item.set({ stroke: strokeColor, strokeWidth });
          if (itemType === 'polygon') item.set({ fill: strokeColor, stroke: strokeColor });
        });
      }
      canvas.renderAll();
      commitCanvasChange();
    }
  }, [strokeColor, strokeWidth, pressureEnabled]);

  // 5. Sync Background Changes on Active Slide
  const activeBgType = activeSlide?.background.type;
  const activeBgValue = activeSlide?.background.value;
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !activeSlide || isSwitchingRef.current) return;

    const updateBg = async () => {
      await applyBackgroundToCanvas(canvas, activeSlide.background);
      const thumb = captureThumbnail(canvas);
      dispatch(updateSlideCanvas({ id: activeSlide.id, canvasJSON: canvas.toJSON(), thumbnail: thumb }));
    };

    updateBg();
  }, [activeBgType, activeBgValue]);

  // 6. Handle Undo / Redo Restore Signals
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !restoreSignal || restoreSignal.slideId !== activeSlideId || isSwitchingRef.current) return;

    const restore = async () => {
      try {
        isRestoringRef.current = true;
        await canvas.loadFromJSON(restoreSignal.targetJson);
        if (activeSlide) {
          await applyBackgroundToCanvas(canvas, activeSlide.background);
        }
        updateCanvasScaleRef.current();
        canvas.renderAll();
        
        slideCacheRef.current[activeSlideId] = canvas.toJSON();
        scheduleThumbnailUpdate(activeSlideId);
      } catch (err) {
        console.error('Failed to restore canvas state:', err);
      } finally {
        isRestoringRef.current = false;
      }
    };

    restore();
  }, [restoreSignal]);

  // Real-time responsive scaling engine: automatically updates Fabric & Laser canvas dimensions
  // whenever container size changes (window resize, maximize/restore, sidebar toggle, Zen mode)
  useEffect(() => {
    if (!containerRef.current) return;

    const updateCanvasScale = () => {
      if (!containerRef.current || !fabricCanvasRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const containerWidth = rect.width;
      const containerHeight = rect.height;
      if (containerWidth > 10 && containerHeight > 10) {
        const margin = isZenModeRef.current ? 0 : 16;
        const scale = Math.min(
          Math.max(0.1, (containerWidth - margin) / VIRTUAL_WIDTH),
          Math.max(0.1, (containerHeight - margin) / VIRTUAL_HEIGHT)
        );
        const scaledWidth = Math.round(VIRTUAL_WIDTH * scale);
        const scaledHeight = Math.round(VIRTUAL_HEIGHT * scale);

        if (
          fabricCanvasRef.current.width !== scaledWidth ||
          fabricCanvasRef.current.height !== scaledHeight
        ) {
          fabricCanvasRef.current.setDimensions({ width: scaledWidth, height: scaledHeight });
          fabricCanvasRef.current.setZoom(scale);
          fabricCanvasRef.current.renderAll();
        }
        if (laserCanvasRef.current) {
          if (laserCanvasRef.current.width !== scaledWidth) laserCanvasRef.current.width = scaledWidth;
          if (laserCanvasRef.current.height !== scaledHeight) laserCanvasRef.current.height = scaledHeight;
        }
      }
    };

    let animFrame: number;
    updateCanvasScaleRef.current = updateCanvasScale;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(animFrame);
      animFrame = requestAnimationFrame(updateCanvasScale);
    });

    observer.observe(containerRef.current);
    updateCanvasScale();
    window.addEventListener('resize', updateCanvasScale);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animFrame);
      window.removeEventListener('resize', updateCanvasScale);
    };
  }, [isZenMode]);

  return (
    <div 
      ref={containerRef}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }
      }}
      onDrop={(e) => {
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const file = e.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            e.preventDefault();
            const reader = new FileReader();
            reader.onload = (ev) => {
              const dataUrl = ev.target?.result as string;
              if (dataUrl) {
                window.dispatchEvent(new CustomEvent('board:insert-image', { detail: { dataUrl } }));
              }
            };
            reader.readAsDataURL(file);
          }
        }
      }}
      className={`w-full h-full flex items-center justify-center relative overflow-hidden select-none ${
        isZenMode ? 'p-0' : 'p-2'
      }`}
    >
      <div className={`relative shadow-2xl overflow-hidden bg-slate-950 flex items-center justify-center transition-all ${
        isZenMode ? 'rounded-none border-0' : 'rounded-lg border border-[#242b1d]'
      }`}>
        <canvas 
          ref={canvasElRef} 
          style={{ touchAction: 'none' }}
          className="touch-none block"
        />
        {/* Transparent Laser Pointer & Eraser Cursor Canvas Overlay */}
        <canvas
          ref={laserCanvasRef}
          className="absolute inset-0 pointer-events-none z-10 block"
        />
        {/* Toggleable Live Canvas Watermark Overlay */}
        <CanvasWatermark />
      </div>

      {/* Right-Click Layering & Management Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed z-50 py-1.5 px-1 bg-[#12150e]/95 backdrop-blur-md border border-[#242b1d] rounded-xl shadow-2xl text-xs flex flex-col gap-0.5 min-w-[170px] animate-in fade-in zoom-in-95 duration-100 select-none"
          style={{
            left: Math.min(window.innerWidth - 185, contextMenu.x),
            top: Math.min(window.innerHeight - 240, contextMenu.y)
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => handleBringToFront(contextMenu.target)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#f4f6ee] hover:bg-[#1f2618] hover:text-[#C4F135] text-left transition-colors"
          >
            <BringToFront className="w-4 h-4 text-[#C4F135]" />
            <span>Bring to Front</span>
            <span className="ml-auto text-[10px] font-mono text-[#636c58]">Ctrl+Shift+]</span>
          </button>
          <button
            type="button"
            onClick={() => handleBringForward(contextMenu.target)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#f4f6ee] hover:bg-[#1f2618] hover:text-[#C4F135] text-left transition-colors"
          >
            <ArrowUp className="w-4 h-4 text-[#9ba38e]" />
            <span>Bring Forward</span>
            <span className="ml-auto text-[10px] font-mono text-[#636c58]">Ctrl+]</span>
          </button>
          <button
            type="button"
            onClick={() => handleSendBackward(contextMenu.target)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#f4f6ee] hover:bg-[#1f2618] hover:text-[#C4F135] text-left transition-colors"
          >
            <ArrowDown className="w-4 h-4 text-[#9ba38e]" />
            <span>Send Backward</span>
            <span className="ml-auto text-[10px] font-mono text-[#636c58]">Ctrl+[</span>
          </button>
          <button
            type="button"
            onClick={() => handleSendToBack(contextMenu.target)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#f4f6ee] hover:bg-[#1f2618] hover:text-[#C4F135] text-left transition-colors"
          >
            <SendToBack className="w-4 h-4 text-[#9ba38e]" />
            <span>Send to Back</span>
            <span className="ml-auto text-[10px] font-mono text-[#636c58]">Ctrl+Shift+[</span>
          </button>
          <div className="w-full h-[1px] bg-[#242b1d] my-1" />
          <button
            type="button"
            onClick={() => handleDuplicate(contextMenu.target)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#f4f6ee] hover:bg-[#1f2618] hover:text-[#C4F135] text-left transition-colors"
          >
            <Copy className="w-4 h-4 text-[#9ba38e]" />
            <span>Duplicate</span>
            <span className="ml-auto text-[10px] font-mono text-[#636c58]">Ctrl+D</span>
          </button>
          <button
            type="button"
            onClick={() => handleDelete(contextMenu.target)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-red-400 hover:bg-red-950/40 hover:text-red-300 text-left transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
            <span className="ml-auto text-[10px] font-mono text-red-400/60">Del</span>
          </button>
        </div>
      )}
    </div>
  );
};
