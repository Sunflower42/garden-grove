import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import {
  Plus, Trash2, ZoomIn, ZoomOut, Maximize2, ArrowRight,
  Home, Flower2, Move, GripVertical, Fence, X
} from 'lucide-react';
import { ELEMENTS, ELEMENT_CATEGORIES, getElementById } from '../data/elements';
import { ElementSVG } from './ElementRenderer';

const PLOT_TEMPLATES = [
  { name: 'Kitchen Garden', icon: '🥬', w: 12, h: 8 },
  { name: 'Flower Cutting Garden', icon: '💐', w: 10, h: 8 },
  { name: 'Kids Garden', icon: '🧒', w: 6, h: 6 },
  { name: 'Herb Spiral', icon: '🌿', w: 6, h: 6 },
  { name: 'Pollinator Garden', icon: '🦋', w: 8, h: 4 },
  { name: 'Berry Patch', icon: '🫐', w: 8, h: 6 },
  { name: 'Salsa Garden', icon: '🌶️', w: 6, h: 6 },
  { name: 'Raised Bed Row', icon: '🪵', w: 16, h: 4 },
];

// 1 foot = this many SVG pixels
const SCALE = 8;
const VERTEX_GRAB_R = 20; // pixel radius for grabbing a vertex
const EDGE_GRAB_D = 14;  // pixel distance for clicking an edge

// Find closest point on a line segment
function closestOnSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return { t: 0 };
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cy = ay + t * dy;
  const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
  return { t, dist };
}

// Get polygon shape for a plot, generating from rect if missing
function getPlotShape(plot) {
  if (plot.shape && plot.shape.length >= 3) return plot.shape;
  const x = plot.yardX || 0, y = plot.yardY || 0;
  return [
    { x, y },
    { x: x + plot.widthFt, y },
    { x: x + plot.widthFt, y: y + plot.heightFt },
    { x, y: y + plot.heightFt },
  ];
}

// Centroid of polygon
function centroid(shape) {
  const cx = shape.reduce((s, p) => s + p.x, 0) / shape.length;
  const cy = shape.reduce((s, p) => s + p.y, 0) / shape.length;
  return { x: cx, y: cy };
}

// Shoelace area in sq ft
function polyArea(shape) {
  let area = 0;
  for (let i = 0; i < shape.length; i++) {
    const j = (i + 1) % shape.length;
    area += shape[i].x * shape[j].y;
    area -= shape[j].x * shape[i].y;
  }
  return Math.abs(area / 2);
}

export default function YardView() {
  const { state, dispatch } = useStore();
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(null);
  const [panOffset, setPanOffset] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Vertex editing
  const [draggingVertex, setDraggingVertex] = useState(null); // { plotId, vertexIndex }
  // Moving whole plot — uses a drag threshold to prevent accidental moves
  const [plotPending, setPlotPending] = useState(null); // { id, startX, startY, startShape } — waiting for drag threshold
  const [movingPlot, setMovingPlot] = useState(null); // { id, startMouseX, startMouseY, startShape }
  const [moveOffset, setMoveOffset] = useState(null); // { dx, dy } in feet
  const DRAG_THRESHOLD = 5; // pixels before a click becomes a drag

  // Yard element placement & editing
  const [showElementMenu, setShowElementMenu] = useState(false);
  const [placingElement, setPlacingElement] = useState(null); // { elementId }
  const [elementPreviewPos, setElementPreviewPos] = useState(null);
  const [selectedYardElement, setSelectedYardElement] = useState(null); // element id
  const [draggingYardElement, setDraggingYardElement] = useState(null); // { id, startX, startY, startElX, startElY }
  const [resizingYardElement, setResizingYardElement] = useState(null); // { id, handle, startX, startY, startW, startH }
  const [rotatingYardElement, setRotatingYardElement] = useState(null); // { id, startAngle, startRotation }

  const svgW = state.yardWidthFt * SCALE;
  const svgH = state.yardHeightFt * SCALE;

  // Auto-fit the yard into the viewport on mount
  useEffect(() => {
    if (zoom !== null || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const padding = 40;
    const fitToScreen = Math.min(
      (rect.width - padding * 2) / svgW,
      (rect.height - padding * 2) / svgH,
    );
    // If plots exist, zoom to fit all plots with padding. Otherwise fit whole yard.
    let fitZoom, fitX, fitY;
    if (state.plots.length > 0) {
      // Find bounding box of all plot shapes
      let allMinX = Infinity, allMinY = Infinity, allMaxX = -Infinity, allMaxY = -Infinity;
      for (const plot of state.plots) {
        const shape = plot.shape || [{ x: plot.yardX || 0, y: plot.yardY || 0 }, { x: (plot.yardX || 0) + plot.widthFt, y: (plot.yardY || 0) + plot.heightFt }];
        for (const pt of shape) {
          allMinX = Math.min(allMinX, pt.x);
          allMinY = Math.min(allMinY, pt.y);
          allMaxX = Math.max(allMaxX, pt.x);
          allMaxY = Math.max(allMaxY, pt.y);
        }
      }
      // Add some padding around the plots (20ft or 20% of plot size)
      const plotPad = Math.max(20, (allMaxX - allMinX) * 0.3);
      allMinX = Math.max(0, allMinX - plotPad);
      allMinY = Math.max(0, allMinY - plotPad);
      allMaxX = Math.min(state.yardWidthFt, allMaxX + plotPad);
      allMaxY = Math.min(state.yardHeightFt, allMaxY + plotPad);
      const plotsW = (allMaxX - allMinX) * SCALE;
      const plotsH = (allMaxY - allMinY) * SCALE;
      fitZoom = Math.min(
        (rect.width - padding * 2) / plotsW,
        (rect.height - padding * 2) / plotsH,
        4
      );
      fitX = rect.width / 2 - ((allMinX + allMaxX) / 2 * SCALE) * fitZoom;
      fitY = rect.height / 2 - ((allMinY + allMaxY) / 2 * SCALE) * fitZoom;
    } else {
      fitZoom = fitToScreen;
      fitX = (rect.width - svgW * fitZoom) / 2;
      fitY = (rect.height - svgH * fitZoom) / 2;
    }
    setZoom(fitZoom);
    setPanOffset({ x: fitX, y: fitY });
  });

  // Convert screen coords to SVG coords (in pixels, not feet)
  const toSVG = useCallback((clientX, clientY) => {
    if (!containerRef.current || !panOffset || zoom === null) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - panOffset.x) / zoom,
      y: (clientY - rect.top - panOffset.y) / zoom,
    };
  }, [zoom, panOffset]);

  // Convert SVG pixels to feet
  const toFt = (px) => px / SCALE;

  // --- Mouse Handlers ---

  const handleMouseDown = useCallback((e) => {
    if (draggingVertex || movingPlot) return;
    // Check if clicking on a vertex or edge of the editing plot
    // Use screen-space distances so grab radius feels consistent at any zoom
    if (state.editingPlotId && zoom !== null && panOffset) {
      const plot = state.plots.find(p => p.id === state.editingPlotId);
      if (plot) {
        const shape = getPlotShape(plot);
        const rect = containerRef.current.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // Convert shape point to screen coords
        const toScreen = (pt) => ({
          x: pt.x * SCALE * zoom + panOffset.x,
          y: pt.y * SCALE * zoom + panOffset.y,
        });

        // Check vertices (in screen pixels)
        for (let i = 0; i < shape.length; i++) {
          const sp = toScreen(shape[i]);
          const dist = Math.sqrt((mx - sp.x) ** 2 + (my - sp.y) ** 2);
          if (dist < VERTEX_GRAB_R) {
            e.preventDefault();
            e.stopPropagation();
            setDraggingVertex({ plotId: plot.id, vertexIndex: i });
            return;
          }
        }

        // Check edges in screen pixels (to add a point)
        for (let i = 0; i < shape.length; i++) {
          const j = (i + 1) % shape.length;
          const sa = toScreen(shape[i]);
          const sb = toScreen(shape[j]);
          const { t, dist } = closestOnSegment(mx, my, sa.x, sa.y, sb.x, sb.y);
          if (dist < EDGE_GRAB_D && t > 0.15 && t < 0.85) {
            e.preventDefault();
            e.stopPropagation();
            const svg = toSVG(e.clientX, e.clientY);
            const newShape = [...shape];
            const newPt = { x: toFt(svg.x), y: toFt(svg.y) };
            newShape.splice(j, 0, newPt);
            dispatch({ type: 'UPDATE_PLOT_SHAPE', payload: { id: plot.id, shape: newShape } });
            setDraggingVertex({ plotId: plot.id, vertexIndex: j });
            return;
          }
        }
      }
    }

    // Default: pan (skip if placing element)
    if (!placingElement && (e.button === 0 || e.button === 1)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  }, [draggingVertex, movingPlot, state.editingPlotId, state.plots, zoom, panOffset, toSVG, dispatch]);

  const handleMouseMove = useCallback((e) => {
    // Element placement preview
    if (placingElement && containerRef.current && zoom && panOffset) {
      const rect = containerRef.current.getBoundingClientRect();
      const svgX = (e.clientX - rect.left - panOffset.x) / zoom;
      const svgY = (e.clientY - rect.top - panOffset.y) / zoom;
      setElementPreviewPos({ x: Math.round(svgX / SCALE) * SCALE, y: Math.round(svgY / SCALE) * SCALE });
    }
    // Yard element dragging
    if (draggingYardElement) {
      const svg = toSVG(e.clientX, e.clientY);
      const newX = Math.round(toFt(svg.x) - draggingYardElement.offsetX);
      const newY = Math.round(toFt(svg.y) - draggingYardElement.offsetY);
      dispatch({ type: 'MOVE_YARD_ELEMENT', payload: { id: draggingYardElement.id, x: newX, y: newY } });
      return;
    }
    // Yard element resizing
    if (resizingYardElement) {
      const svg = toSVG(e.clientX, e.clientY);
      const el = state.yardElements.find(y => y.id === resizingYardElement.id);
      if (el) {
        const newW = Math.max(1, Math.round(toFt(svg.x) - el.x));
        const newH = Math.max(1, Math.round(toFt(svg.y) - el.y));
        dispatch({ type: 'UPDATE_YARD_ELEMENT', payload: { id: el.id, width: newW, height: newH } });
      }
      return;
    }
    // Yard element rotating
    if (rotatingYardElement) {
      const el = state.yardElements.find(y => y.id === rotatingYardElement.id);
      if (el) {
        const svg = toSVG(e.clientX, e.clientY);
        const cx = (el.x + el.width / 2) * SCALE;
        const cy = (el.y + el.height / 2) * SCALE;
        const angle = Math.atan2(svg.y - cy, svg.x - cx) * 180 / Math.PI;
        const delta = angle - rotatingYardElement.startAngle;
        const newRot = Math.round((rotatingYardElement.startRotation + delta) / 5) * 5; // snap to 5°
        dispatch({ type: 'UPDATE_YARD_ELEMENT', payload: { id: el.id, rotation: newRot } });
      }
      return;
    }
    if (draggingVertex) {
      const svg = toSVG(e.clientX, e.clientY);
      const plot = state.plots.find(p => p.id === draggingVertex.plotId);
      if (plot) {
        const shape = [...getPlotShape(plot)];
        shape[draggingVertex.vertexIndex] = { x: Math.round(toFt(svg.x)), y: Math.round(toFt(svg.y)) };
        dispatch({ type: 'UPDATE_PLOT_SHAPE', payload: { id: plot.id, shape } });
      }
      return;
    }
    // Check if pending plot drag exceeds threshold
    if (plotPending && !movingPlot) {
      const dx = e.clientX - plotPending.startX;
      const dy = e.clientY - plotPending.startY;
      if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
        setMovingPlot({
          id: plotPending.id,
          startMouseX: plotPending.startX,
          startMouseY: plotPending.startY,
          startShape: plotPending.startShape,
        });
        setPlotPending(null);
      }
      return;
    }
    if (movingPlot) {
      const dx = (e.clientX - movingPlot.startMouseX) / zoom / SCALE;
      const dy = (e.clientY - movingPlot.startMouseY) / zoom / SCALE;
      setMoveOffset({ dx: Math.round(dx), dy: Math.round(dy) });
      return;
    }
    if (isPanning) {
      setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  }, [draggingVertex, plotPending, movingPlot, isPanning, panStart, toSVG, state.plots, zoom, dispatch]);

  const handleMouseUp = useCallback((e) => {
    if (draggingYardElement) { setDraggingYardElement(null); return; }
    if (resizingYardElement) { setResizingYardElement(null); return; }
    if (rotatingYardElement) { setRotatingYardElement(null); return; }
    if (draggingVertex) {
      setDraggingVertex(null);
      return;
    }
    // Cancel pending drag (was just a click, not a drag)
    if (plotPending) {
      setPlotPending(null);
    }
    if (movingPlot && moveOffset) {
      const plot = state.plots.find(p => p.id === movingPlot.id);
      if (plot) {
        const newShape = movingPlot.startShape.map(pt => ({
          x: pt.x + moveOffset.dx,
          y: pt.y + moveOffset.dy,
        }));
        dispatch({ type: 'UPDATE_PLOT_SHAPE', payload: { id: movingPlot.id, shape: newShape } });
      }
      setMovingPlot(null);
      setMoveOffset(null);
      return;
    }
    setIsPanning(false);
  }, [draggingVertex, plotPending, movingPlot, moveOffset, state.plots, dispatch]);

  // Attach wheel listener as non-passive so preventDefault works for pinch-to-zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e) => {
      e.preventDefault();
      if (e.ctrlKey) {
        // Pinch-to-zoom on trackpad
        setZoom(z => {
          const factor = e.deltaY > 0 ? 0.95 : 1.05;
          return Math.min(4, Math.max(0.1, z * factor));
        });
      } else {
        // Two-finger scroll — pan
        setPanOffset(prev => ({
          x: (prev?.x || 0) - e.deltaX,
          y: (prev?.y || 0) - e.deltaY,
        }));
      }
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // Right-click to remove a vertex
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    if (!state.editingPlotId || !containerRef.current || !panOffset || zoom === null) return;
    const plot = state.plots.find(p => p.id === state.editingPlotId);
    if (!plot) return;
    const shape = getPlotShape(plot);
    if (shape.length <= 3) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    for (let i = 0; i < shape.length; i++) {
      const sx = shape[i].x * SCALE * zoom + panOffset.x;
      const sy = shape[i].y * SCALE * zoom + panOffset.y;
      const dist = Math.sqrt((mx - sx) ** 2 + (my - sy) ** 2);
      if (dist < VERTEX_GRAB_R) {
        const newShape = shape.filter((_, idx) => idx !== i);
        dispatch({ type: 'UPDATE_PLOT_SHAPE', payload: { id: plot.id, shape: newShape } });
        return;
      }
    }
  }, [state.editingPlotId, state.plots, zoom, panOffset, dispatch]);

  // Track clicks for double-click detection
  const lastPlotClick = useRef({ id: null, time: 0 });

  const handlePlotClick = useCallback((plot, e) => {
    e.stopPropagation();
    dispatch({ type: 'SET_EDITING_PLOT', payload: plot.id });
  }, [dispatch]);

  // Plot drag — move entire shape, but only if not near a vertex
  const handlePlotDragStart = useCallback((plot, e) => {
    e.stopPropagation();
    e.preventDefault();
    dispatch({ type: 'SET_EDITING_PLOT', payload: plot.id });

    // If already editing this plot, check if we're near a vertex first
    if (state.editingPlotId === plot.id && containerRef.current && panOffset && zoom !== null) {
      const shape = getPlotShape(plot);
      const rect = containerRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      for (let i = 0; i < shape.length; i++) {
        const sx = shape[i].x * SCALE * zoom + panOffset.x;
        const sy = shape[i].y * SCALE * zoom + panOffset.y;
        const dist = Math.sqrt((mx - sx) ** 2 + (my - sy) ** 2);
        if (dist < VERTEX_GRAB_R) {
          setDraggingVertex({ plotId: plot.id, vertexIndex: i });
          return; // don't start whole-plot move
        }
      }

      // Check edges too
      for (let i = 0; i < shape.length; i++) {
        const j = (i + 1) % shape.length;
        const sa = { x: shape[i].x * SCALE * zoom + panOffset.x, y: shape[i].y * SCALE * zoom + panOffset.y };
        const sb = { x: shape[j].x * SCALE * zoom + panOffset.x, y: shape[j].y * SCALE * zoom + panOffset.y };
        const { t, dist } = closestOnSegment(mx, my, sa.x, sa.y, sb.x, sb.y);
        if (dist < EDGE_GRAB_D && t > 0.15 && t < 0.85) {
          const svg = toSVG(e.clientX, e.clientY);
          const newShape = [...shape];
          newShape.splice(j, 0, { x: toFt(svg.x), y: toFt(svg.y) });
          dispatch({ type: 'UPDATE_PLOT_SHAPE', payload: { id: plot.id, shape: newShape } });
          setDraggingVertex({ plotId: plot.id, vertexIndex: j });
          return;
        }
      }
    }

    // Check for double-click (two mousedowns within 400ms)
    const now = Date.now();
    if (lastPlotClick.current.id === plot.id && now - lastPlotClick.current.time < 400) {
      lastPlotClick.current = { id: null, time: 0 };
      dispatch({ type: 'SET_ACTIVE_PLOT', payload: plot.id });
      return;
    }
    lastPlotClick.current = { id: plot.id, time: now };

    // Don't start moving immediately — wait for drag threshold
    setPlotPending({
      id: plot.id,
      startX: e.clientX,
      startY: e.clientY,
      startShape: getPlotShape(plot),
    });
  }, [dispatch, state.editingPlotId, zoom, panOffset, toSVG]);

  const handlePlotDoubleClick = useCallback((plot, e) => {
    e.stopPropagation();
    e.preventDefault();
    // Cancel any pending drag
    setPlotPending(null);
    setMovingPlot(null);
    setMoveOffset(null);
    setDraggingVertex(null);
    dispatch({ type: 'SET_ACTIVE_PLOT', payload: plot.id });
  }, [dispatch]);

  const handleDeletePlot = useCallback(() => {
    if (state.editingPlotId) {
      const plot = state.plots.find(p => p.id === state.editingPlotId);
      if (plot && confirm(`Delete "${plot.name}"? This will remove all plants and elements in it.`)) {
        dispatch({ type: 'REMOVE_PLOT', payload: state.editingPlotId });
      }
    }
  }, [state.editingPlotId, state.plots, dispatch]);

  // Window-level mouseUp to catch drag releases even when mouse is outside element
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (draggingYardElement) setDraggingYardElement(null);
      if (resizingYardElement) setResizingYardElement(null);
      if (rotatingYardElement) setRotatingYardElement(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [draggingYardElement, resizingYardElement, rotatingYardElement]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        dispatch({ type: 'SET_EDITING_PLOT', payload: null });
        setShowAddMenu(false);
        setShowElementMenu(false);
        setPlacingElement(null);
        setElementPreviewPos(null);
        setSelectedYardElement(null);
        setDraggingVertex(null);
        setMovingPlot(null);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.editingPlotId && !draggingVertex) {
        handleDeletePlot();
      }
      // Arrow nudge — move entire shape
      if (state.editingPlotId && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const dx = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
        const dy = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
        const plot = state.plots.find(p => p.id === state.editingPlotId);
        if (plot) {
          const shape = getPlotShape(plot).map(pt => ({ x: pt.x + dx, y: pt.y + dy }));
          dispatch({ type: 'UPDATE_PLOT_SHAPE', payload: { id: plot.id, shape } });
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state.editingPlotId, draggingVertex, handleDeletePlot, dispatch, state.plots]);

  const editingPlot = state.plots.find(p => p.id === state.editingPlotId);

  // Get display shape (with move offset applied)
  const getDisplayShape = (plot) => {
    let shape = getPlotShape(plot);
    if (movingPlot?.id === plot.id && moveOffset) {
      shape = shape.map(pt => ({ x: pt.x + moveOffset.dx, y: pt.y + moveOffset.dy }));
    }
    return shape;
  };

  // Shape to SVG points string
  const shapeToPoints = (shape) => shape.map(p => `${p.x * SCALE},${p.y * SCALE}`).join(' ');

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-sage/10 dark:border-sage-dark/15 bg-white/60 dark:bg-midnight-green/60 toolbar relative z-20" style={{ padding: '16px 24px' }}>
        <div className="flex items-center" style={{ gap: 12 }}>
          <div className="w-7 h-7 rounded-lg bg-terra/10 flex items-center justify-center">
            <Home className="w-3.5 h-3.5 text-terra" />
          </div>
          <h2 className="font-display text-lg font-semibold text-forest-deep dark:text-cream">
            My Yard
          </h2>
          <span className="badge bg-sage/8 dark:bg-sage/12 text-sage-dark/70 dark:text-sage/60">
            {state.yardWidthFt}' x {state.yardHeightFt}' · {state.plots.length} garden{state.plots.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center" style={{ gap: 10 }}>
          {/* Add plot */}
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-gradient-to-b from-forest to-forest-deep text-cream hover:brightness-110 transition-all shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Garden Plot
            </button>
            <AnimatePresence>
              {showAddMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-10 z-30 w-60 bg-white dark:bg-midnight-green rounded-2xl shadow-xl shadow-black/10 border border-sage/15 dark:border-sage-dark/20 overflow-hidden"
                  style={{ padding: '6px 0' }}
                >
                  {PLOT_TEMPLATES.map(tpl => (
                    <button
                      key={tpl.name}
                      onClick={() => {
                        dispatch({
                          type: 'ADD_PLOT',
                          payload: { name: tpl.name, icon: tpl.icon, widthFt: tpl.w, heightFt: tpl.h },
                        });
                        setShowAddMenu(false);
                      }}
                      className="w-full flex items-center text-xs text-forest-deep dark:text-cream hover:bg-sage/8 dark:hover:bg-sage/8 transition-colors"
                      style={{ gap: 12, padding: '10px 16px' }}
                    >
                      <span className="text-lg leading-none">{tpl.icon}</span>
                      <div className="text-left">
                        <div className="font-medium">{tpl.name}</div>
                        <div className="text-[9px] text-sage-dark/60 dark:text-sage/50 mt-0.5">{tpl.w}' x {tpl.h}'</div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Add Elements */}
          <div className="relative">
            <button
              onClick={() => { setShowElementMenu(!showElementMenu); setShowAddMenu(false); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shadow-sm flex items-center gap-1.5 ${
                placingElement
                  ? 'bg-terra text-cream'
                  : 'bg-sage/10 text-sage-dark dark:text-sage hover:bg-sage/15 border border-sage/15 dark:border-sage-dark/20'
              }`}
            >
              <Fence className="w-3.5 h-3.5" /> {placingElement ? 'Placing...' : 'Add Element'}
            </button>
            {placingElement && (
              <button
                onClick={() => { setPlacingElement(null); setElementPreviewPos(null); }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-bloom-red text-white flex items-center justify-center"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
            <AnimatePresence>
              {showElementMenu && !placingElement && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 z-30 bg-white dark:bg-midnight-green rounded-2xl shadow-xl shadow-black/10 border border-sage/15 dark:border-sage-dark/20 overflow-y-auto"
                  style={{ padding: '8px 0', maxHeight: 400, width: 280 }}
                >
                  {Object.entries(ELEMENT_CATEGORIES).map(([catKey, cat]) => {
                    const catElems = ELEMENTS.filter(e => e.category === catKey);
                    if (catElems.length === 0) return null;
                    return (
                      <div key={catKey}>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-sage-dark/40 dark:text-sage/30" style={{ padding: '12px 18px 6px' }}>
                          {cat.icon} {cat.label}
                        </div>
                        {catElems.map(elem => (
                          <button
                            key={elem.id}
                            onClick={() => {
                              // Place immediately at center of current view, then drag to position
                              const rect = containerRef.current?.getBoundingClientRect();
                              if (rect && zoom && panOffset) {
                                const centerX = Math.round(((rect.width / 2 - panOffset.x) / zoom) / SCALE);
                                const centerY = Math.round(((rect.height / 2 - panOffset.y) / zoom) / SCALE);
                                dispatch({
                                  type: 'PLACE_YARD_ELEMENT',
                                  payload: {
                                    elementId: elem.id,
                                    x: centerX, y: centerY,
                                    width: Math.ceil(elem.widthIn / 12),
                                    height: Math.ceil(elem.heightIn / 12),
                                  },
                                });
                                // Select the newly placed element
                                setTimeout(() => {
                                  const newest = state.yardElements[state.yardElements.length]; // won't work yet, but selection will happen on next render
                                }, 50);
                              }
                              setShowElementMenu(false);
                              setPlacingElement(null);
                              setElementPreviewPos(null);
                            }}
                            className="w-full flex items-center text-left text-xs text-forest-deep dark:text-cream hover:bg-sage/8 dark:hover:bg-sage/8 transition-colors"
                            style={{ gap: 12, padding: '10px 18px' }}
                          >
                            <div className="shrink-0" style={{ width: 24, height: 24, backgroundColor: elem.color, border: `1.5px solid ${elem.borderColor}`, borderRadius: elem.circular ? '50%' : 4 }} />
                            <div className="min-w-0 text-left">
                              <div className="font-medium text-left">{elem.name}</div>
                              <div className="text-[10px] text-sage-dark/50 dark:text-sage/40 truncate text-left" style={{ marginTop: 1 }}>{elem.description}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Zoom */}
          <div className="flex items-center bg-sage/5 dark:bg-sage/8 rounded-lg" style={{ gap: 2, padding: '4px 8px', marginLeft: 6 }}>
            <button onClick={() => setZoom(z => Math.max(0.15, z - 0.1))} className="p-1.5 rounded-md hover:bg-sage/10 text-sage-dark dark:text-sage transition-colors">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-sage-dark/70 dark:text-sage/60 w-9 text-center font-medium tabular-nums">{zoom ? Math.round(zoom * 100) : 100}%</span>
            <button onClick={() => setZoom(z => Math.min(4, z + 0.1))} className="p-1.5 rounded-md hover:bg-sage/10 text-sage-dark dark:text-sage transition-colors">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setZoom(null); setPanOffset(null); }} className="p-1.5 rounded-md hover:bg-sage/10 text-sage-dark dark:text-sage transition-colors">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Delete selected plot */}
          {editingPlot && (
            <button
              onClick={handleDeletePlot}
              className="ml-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-bloom-red/8 text-bloom-red hover:bg-bloom-red/15 transition-all duration-200 flex items-center gap-1.5 border border-bloom-red/15"
            >
              <Trash2 className="w-3 h-3" /> Delete Plot
            </button>
          )}
        </div>
      </div>

      {/* Yard canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative"
        style={{ background: 'linear-gradient(180deg, #D4E8C4 0%, #B8D4A0 100%)' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setIsPanning(false); }}
        onContextMenu={handleContextMenu}
        onClick={(e) => {
          if (!draggingVertex && !movingPlot && !draggingYardElement) {
            dispatch({ type: 'SET_EDITING_PLOT', payload: null });
            setSelectedYardElement(null);
            setShowAddMenu(false);
            setShowElementMenu(false);
          }
        }}
      >
        <svg width="100%" height="100%"
          style={{ cursor: draggingVertex ? 'grabbing' : movingPlot ? 'grabbing' : isPanning ? 'grabbing' : 'default' }}>
          {zoom !== null && panOffset !== null && <>
          <defs>
            {/* Grass texture pattern */}
            <pattern id="grass" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
              <rect width="16" height="16" fill="#7DB85A" />
              <line x1="2" y1="14" x2="3" y2="10" stroke="#6AA84A" strokeWidth="0.5" opacity="0.4" />
              <line x1="8" y1="15" x2="9" y2="11" stroke="#5A9A3A" strokeWidth="0.5" opacity="0.3" />
              <line x1="13" y1="14" x2="14" y2="10" stroke="#6AA84A" strokeWidth="0.5" opacity="0.35" />
              <line x1="5" y1="7" x2="6" y2="3" stroke="#5A9A3A" strokeWidth="0.5" opacity="0.3" />
              <line x1="11" y1="6" x2="12" y2="2" stroke="#6AA84A" strokeWidth="0.5" opacity="0.25" />
            </pattern>
            {/* Soil fill for garden plots */}
            <pattern id="soil" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
              <rect width="8" height="8" fill="#8B7355" />
              <circle cx="2" cy="3" r="0.5" fill="#7A6245" opacity="0.5" />
              <circle cx="6" cy="6" r="0.4" fill="#9A8365" opacity="0.4" />
              <circle cx="4" cy="1" r="0.3" fill="#6A5235" opacity="0.3" />
            </pattern>
          </defs>

          <g transform={`translate(${panOffset.x},${panOffset.y}) scale(${zoom})`}>
            {/* Yard background — grass */}
            {state.yardPolygon ? (
              <>
                <defs>
                  <clipPath id="yard-clip">
                    <polygon points={state.yardPolygon.map(p => `${p.x * SCALE},${p.y * SCALE}`).join(' ')} />
                  </clipPath>
                </defs>
                <rect x={0} y={0} width={svgW} height={svgH} fill="url(#grass)" clipPath="url(#yard-clip)" opacity={0.95} />
                <polygon
                  points={state.yardPolygon.map(p => `${p.x * SCALE},${p.y * SCALE}`).join(' ')}
                  fill="none" stroke="#5A8A3A" strokeWidth={1.5} strokeLinejoin="round"
                />
              </>
            ) : (
              <rect x={0} y={0} width={svgW} height={svgH} fill="url(#grass)" rx={4} stroke="#5A8A3A" strokeWidth={1} opacity={0.95} />
            )}

            {/* Subtle yard grid — every 10 feet */}
            <g clipPath={state.yardPolygon ? "url(#yard-clip)" : undefined}>
              {Array.from({ length: Math.floor(state.yardWidthFt / 10) + 1 }).map((_, i) => (
                <line key={`yv${i}`} x1={i * 10 * SCALE} y1={0} x2={i * 10 * SCALE} y2={svgH}
                  stroke="#5A8A3A" strokeWidth={0.3} opacity={0.2} />
              ))}
              {Array.from({ length: Math.floor(state.yardHeightFt / 10) + 1 }).map((_, i) => (
                <line key={`yh${i}`} x1={0} y1={i * 10 * SCALE} x2={svgW} y2={i * 10 * SCALE}
                  stroke="#5A8A3A" strokeWidth={0.3} opacity={0.2} />
              ))}
            </g>

            {/* Foot markers along edges */}
            {Array.from({ length: Math.floor(state.yardWidthFt / 10) + 1 }).map((_, i) => (
              <text key={`yfx${i}`} x={i * 10 * SCALE} y={-3} textAnchor="middle" fontSize={6}
                fill="#4A7A3A" opacity={0.5} fontFamily="Outfit">{i * 10}'</text>
            ))}
            {Array.from({ length: Math.floor(state.yardHeightFt / 10) + 1 }).map((_, i) => (
              <text key={`yfy${i}`} x={-3} y={i * 10 * SCALE + 2} textAnchor="end" fontSize={6}
                fill="#4A7A3A" opacity={0.5} fontFamily="Outfit">{i * 10}'</text>
            ))}

            {/* House outline */}
            {state.housePolygon && (
              <g>
                <polygon
                  points={state.housePolygon.map(p => `${p.x * SCALE},${p.y * SCALE}`).join(' ')}
                  fill="#A08870" fillOpacity={0.7} stroke="#8A7060" strokeWidth={1.5} strokeLinejoin="round"
                />
                {(() => {
                  const c = centroid(state.housePolygon);
                  return (
                    <text x={c.x * SCALE} y={c.y * SCALE + 3} textAnchor="middle"
                      fontSize={9} fontFamily="Cormorant Garamond, serif" fontWeight={600}
                      fill="#F5E6CC" style={{ pointerEvents: 'none' }}>
                      House
                    </text>
                  );
                })()}
              </g>
            )}

            {/* Yard elements (paths, pots, etc.) */}
            {state.yardElements.map(el => {
              const elemData = getElementById(el.elementId);
              if (!elemData) return null;
              const isSelected = selectedYardElement === el.id;
              const ex = el.x * SCALE, ey = el.y * SCALE;
              const ew = el.width * SCALE, eh = el.height * SCALE;
              const ecx = ex + ew / 2, ecy = ey + eh / 2;
              const rot = el.rotation || 0;
              return (
                <g key={el.id} transform={`rotate(${rot} ${ecx} ${ecy})`}
                  style={{ cursor: draggingYardElement?.id === el.id ? 'grabbing' : 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); setSelectedYardElement(el.id); dispatch({ type: 'SET_EDITING_PLOT', payload: null }); }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setSelectedYardElement(el.id);
                    const svg = toSVG(e.clientX, e.clientY);
                    setDraggingYardElement({ id: el.id, offsetX: toFt(svg.x) - el.x, offsetY: toFt(svg.y) - el.y });
                  }}
                >
                  {/* Larger invisible hit area */}
                  <rect
                    x={ex - 4} y={ey - 4} width={ew + 8} height={eh + 8}
                    fill="transparent"
                  />
                  <ElementSVG
                    element={elemData}
                    x={ex} y={ey}
                    width={ew} height={eh}
                    cellSize={SCALE}
                    isSelected={isSelected}
                  />
                  {/* Selection handles */}
                  {isSelected && (
                    <>
                      {/* Selection outline */}
                      <rect x={ex - 2} y={ey - 2} width={ew + 4} height={eh + 4}
                        fill="none" stroke="#C17644" strokeWidth={2 / zoom} strokeDasharray="6 3" rx={3}
                        style={{ pointerEvents: 'none' }} />
                      {/* Resize handle — bottom-right */}
                      <rect
                        x={ex + ew - 6 / zoom} y={ey + eh - 6 / zoom}
                        width={12 / zoom} height={12 / zoom} rx={2 / zoom}
                        fill="#C17644" stroke="#FDF6E9" strokeWidth={1.5 / zoom}
                        style={{ cursor: 'nwse-resize' }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setResizingYardElement({ id: el.id });
                        }}
                      />
                      {/* Rotate handle — top-center */}
                      <circle
                        cx={ecx} cy={ey - 16 / zoom}
                        r={6 / zoom}
                        fill="#8B6AAE" stroke="#FDF6E9" strokeWidth={1.5 / zoom}
                        style={{ cursor: 'crosshair' }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          const svg = toSVG(e.clientX, e.clientY);
                          const startAngle = Math.atan2(svg.y - ecy, svg.x - ecx) * 180 / Math.PI;
                          setRotatingYardElement({ id: el.id, startAngle, startRotation: rot });
                        }}
                      />
                      {/* Rotate line */}
                      <line x1={ecx} y1={ey} x2={ecx} y2={ey - 16 / zoom}
                        stroke="#8B6AAE" strokeWidth={1 / zoom} opacity={0.5}
                        style={{ pointerEvents: 'none' }} />
                      {/* Rotation label */}
                      {rot !== 0 && (
                        <text x={ecx + 10 / zoom} y={ey - 16 / zoom + 3 / zoom}
                          fontSize={9 / zoom} fontFamily="Outfit" fill="#8B6AAE" opacity={0.8}
                          style={{ pointerEvents: 'none' }}>
                          {rot}°
                        </text>
                      )}
                      {/* Size label */}
                      <text x={ecx} y={ey + eh + 14 / zoom}
                        textAnchor="middle" fontSize={8 / zoom} fontFamily="Outfit" fill="#C17644" opacity={0.8}
                        style={{ pointerEvents: 'none' }}>
                        {el.width}' × {el.height}'
                      </text>
                      {/* Delete button */}
                      <g
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => { e.stopPropagation(); dispatch({ type: 'REMOVE_YARD_ELEMENT', payload: el.id }); setSelectedYardElement(null); }}
                      >
                        <circle cx={ex + ew + 4 / zoom} cy={ey - 4 / zoom} r={7 / zoom}
                          fill="#C4544A" stroke="#FDF6E9" strokeWidth={1 / zoom} />
                        <text x={ex + ew + 4 / zoom} y={ey - 1 / zoom}
                          textAnchor="middle" fontSize={9 / zoom} fontFamily="Outfit" fontWeight={700} fill="#FDF6E9">×</text>
                      </g>
                    </>
                  )}
                </g>
              );
            })}

            {/* Element placement preview */}
            {placingElement && elementPreviewPos && (() => {
              const elem = getElementById(placingElement.elementId);
              if (!elem) return null;
              const w = Math.ceil(elem.widthIn / 12) * SCALE;
              const h = Math.ceil(elem.heightIn / 12) * SCALE;
              return (
                <g opacity={0.5} style={{ pointerEvents: 'none' }}>
                  <rect
                    x={elementPreviewPos.x} y={elementPreviewPos.y}
                    width={w} height={h}
                    fill={elem.color} stroke={elem.borderColor}
                    strokeWidth={1.5} strokeDasharray="4 3" rx={2}
                    opacity={0.6}
                  />
                </g>
              );
            })()}

            {/* Garden plots */}
            {state.plots.map((plot) => {
              const shape = getDisplayShape(plot);
              const isEditing = state.editingPlotId === plot.id;
              const plantCount = plot.plants.length;
              const c = centroid(shape);
              const area = Math.round(polyArea(shape));
              const points = shapeToPoints(shape);

              return (
                <g key={plot.id}>
                  {/* Plot shadow */}
                  <polygon
                    points={shape.map(p => `${p.x * SCALE + 2},${p.y * SCALE + 2}`).join(' ')}
                    fill="#3A2A1A" opacity={0.15}
                  />

                  {/* Plot soil background */}
                  <polygon
                    points={points}
                    fill="url(#soil)"
                    stroke={isEditing ? '#C17644' : '#6B5B4A'}
                    strokeWidth={isEditing ? 2.5 : 1.5}
                    strokeLinejoin="round"
                    style={{ cursor: 'grab' }}
                    onMouseDown={(e) => handlePlotDragStart(plot, e)}
                    onClick={(e) => handlePlotClick(plot, e)}
                  />

                  {/* Plant dots & element previews — mapped from plot OBB space to yard coords */}
                  {(() => {
                    if (!shape || shape.length < 3) return null;
                    // Find the OBB primary axis
                    let maxLen = 0, aDx = 1, aDy = 0;
                    for (let si = 0; si < shape.length; si++) {
                      const sj = (si + 1) % shape.length;
                      const dx = shape[sj].x - shape[si].x;
                      const dy = shape[sj].y - shape[si].y;
                      const len = Math.sqrt(dx * dx + dy * dy);
                      if (len > maxLen) { maxLen = len; aDx = dx / len; aDy = dy / len; }
                    }
                    const pDx = -aDy, pDy = aDx;
                    let minA = Infinity, minP = Infinity;
                    for (const pt of shape) {
                      minA = Math.min(minA, pt.x * aDx + pt.y * aDy);
                      minP = Math.min(minP, pt.x * pDx + pt.y * pDy);
                    }
                    const obbW = plot.widthFt, obbH = plot.heightFt;

                    // Map a grid cell position to yard coordinates
                    const cellToYard = (cellX, cellY) => {
                      const fracX = obbW > 0 ? (cellX / (obbW * 2)) : 0;
                      const fracY = obbH > 0 ? (cellY / (obbH * 2)) : 0;
                      const localA = fracX * obbW;
                      const localP = fracY * obbH;
                      return {
                        x: (aDx * (minA + localA) + pDx * (minP + localP)) * SCALE,
                        y: (aDy * (minA + localA) + pDy * (minP + localP)) * SCALE,
                      };
                    };

                    return (
                      <>
                        {/* Plant dots */}
                        {plot.plants.slice(0, 30).map((p, pi) => {
                          const pos = cellToYard(p.x, p.y);
                          return (
                            <circle key={`p-${pi}`} cx={pos.x} cy={pos.y} r={2} fill="#4A7A3A" opacity={0.5}
                              style={{ pointerEvents: 'none' }} />
                          );
                        })}
                        {/* Elements — rendered as rotated shapes matching the plot angle */}
                        {plot.elements.map((el, ei) => {
                          const elemData = getElementById(el.elementId);
                          if (!elemData) return null;
                          // Get the four corners of the element in grid cells, map each to yard
                          const tl = cellToYard(el.x, el.y);
                          const tr = cellToYard(el.x + (el.width || 2), el.y);
                          const br = cellToYard(el.x + (el.width || 2), el.y + (el.height || 2));
                          const bl = cellToYard(el.x, el.y + (el.height || 2));
                          const pts = `${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`;
                          return (
                            <polygon key={`e-${ei}`}
                              points={pts}
                              fill={elemData.color} stroke={elemData.borderColor}
                              strokeWidth={1} opacity={0.7} strokeLinejoin="round"
                              style={{ pointerEvents: 'none' }}
                            />
                          );
                        })}
                      </>
                    );
                  })()}

                  {/* Plot label */}
                  <text x={c.x * SCALE} y={c.y * SCALE - 4} textAnchor="middle"
                    fontSize={Math.min(9, plot.widthFt * SCALE / 8)} fontFamily="Cormorant Garamond, serif" fontWeight={600}
                    fill="#F5E6CC" style={{ pointerEvents: 'none' }}>
                    {plot.icon} {plot.name}
                  </text>
                  <text x={c.x * SCALE} y={c.y * SCALE + 7} textAnchor="middle"
                    fontSize={6} fontFamily="Outfit" fill="#D4C4A8" opacity={0.8}
                    style={{ pointerEvents: 'none' }}>
                    {area} sq ft · {plantCount} plant{plantCount !== 1 ? 's' : ''}
                  </text>

                  {/* Editing controls */}
                  {isEditing && (
                    <>
                      {/* Vertex handles — large invisible grab target + visible dot */}
                      {shape.map((pt, i) => (
                        <g key={`v-${i}`}>
                          <circle
                            cx={pt.x * SCALE} cy={pt.y * SCALE}
                            r={12 / zoom}
                            fill="transparent"
                            style={{ cursor: 'grab', pointerEvents: 'all' }}
                          />
                          <circle
                            cx={pt.x * SCALE} cy={pt.y * SCALE}
                            r={6 / zoom}
                            fill="#C17644" stroke="#FDF6E9" strokeWidth={2 / zoom}
                            style={{ pointerEvents: 'none' }}
                          />
                        </g>
                      ))}

                      {/* Edge midpoint hints + edge length labels */}
                      {shape.map((pt, i) => {
                        const j = (i + 1) % shape.length;
                        const mx = (pt.x + shape[j].x) / 2;
                        const my = (pt.y + shape[j].y) / 2;
                        const dx = shape[j].x - pt.x;
                        const dy = shape[j].y - pt.y;
                        const len = Math.round(Math.sqrt(dx * dx + dy * dy));
                        // Angle in degrees for rotating the label to follow the edge
                        let angle = Math.atan2(dy, dx) * 180 / Math.PI;
                        // Keep text readable (not upside down)
                        if (angle > 90 || angle < -90) angle += 180;
                        // Offset the label slightly away from the edge (perpendicular)
                        const perpX = -dy / Math.sqrt(dx * dx + dy * dy);
                        const perpY = dx / Math.sqrt(dx * dx + dy * dy);
                        const offsetDist = 8 / zoom;
                        const lx = mx * SCALE + perpX * offsetDist;
                        const ly = my * SCALE + perpY * offsetDist;
                        return (
                          <g key={`m-${i}`} style={{ pointerEvents: 'none' }}>
                            <circle
                              cx={mx * SCALE} cy={my * SCALE}
                              r={4 / zoom}
                              fill="#C17644" fillOpacity={0.4} stroke="#C17644" strokeWidth={0.8 / zoom}
                            />
                            {/* Edge length label */}
                            <g transform={`translate(${lx},${ly}) rotate(${angle})`}>
                              <rect
                                x={-14 / zoom} y={-6 / zoom}
                                width={28 / zoom} height={12 / zoom}
                                rx={3 / zoom}
                                fill="#3A2A1A" fillOpacity={0.7}
                              />
                              <text
                                x={0} y={3.5 / zoom}
                                textAnchor="middle"
                                fontSize={8 / zoom}
                                fontFamily="Outfit"
                                fontWeight={600}
                                fill="#FDF6E9"
                              >
                                {len}'
                              </text>
                            </g>
                          </g>
                        );
                      })}

                      {/* Open Plot button */}
                      <g
                        onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_ACTIVE_PLOT', payload: plot.id }); }}
                        style={{ cursor: 'pointer' }}
                      >
                        <rect x={c.x * SCALE - 28} y={c.y * SCALE + 12} width={56} height={14} rx={7}
                          fill="#C17644" opacity={0.9} />
                        <text x={c.x * SCALE} y={c.y * SCALE + 21.5} textAnchor="middle"
                          fontSize={6.5} fontFamily="Outfit" fontWeight={600} fill="white">
                          Open Plot
                        </text>
                      </g>
                    </>
                  )}
                </g>
              );
            })}
          </g>
          </>}
        </svg>

        {/* Compass rose — fixed in bottom-right corner */}
        <div className="absolute bottom-4 right-4 pointer-events-none">
          <svg width="70" height="70" viewBox="-35 -35 70 70">
            {[0, 30, 60, 90, 120, 150, 180].map((angle) => (
              <line key={`ray-${angle}`}
                x1={0} y1={0}
                x2={Math.sin((angle - 90) * Math.PI / 180) * 30}
                y2={-Math.cos((angle - 90) * Math.PI / 180) * 30}
                stroke="#E8C84A" strokeWidth={1.2} opacity={angle >= 60 && angle <= 120 ? 0.5 : 0.2}
              />
            ))}
            <circle cx={0} cy={0} r={22} fill="#2A4A2A" fillOpacity={0.8} stroke="#5A8A3A" strokeWidth={1} />
            <text x={0} y={-11} textAnchor="middle" fontSize={10} fontFamily="Outfit" fontWeight={700} fill="#FDF6E9">N</text>
            <text x={0} y={17} textAnchor="middle" fontSize={8} fontFamily="Outfit" fontWeight={600} fill="#E8C84A">S</text>
            <text x={14} y={3} textAnchor="middle" fontSize={8} fontFamily="Outfit" fontWeight={600} fill="#A8B99C">E</text>
            <text x={-14} y={3} textAnchor="middle" fontSize={8} fontFamily="Outfit" fontWeight={600} fill="#A8B99C">W</text>
            <polygon points="0,-20 -3.5,-14 3.5,-14" fill="#FDF6E9" opacity={0.9} />
            <circle cx={0} cy={26} r={4.5} fill="#E8C84A" opacity={0.6} />
          </svg>
        </div>
      </div>

      {/* Bottom info panel */}
      <AnimatePresence>
        {editingPlot && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-sage/10 dark:border-sage-dark/15 bg-white/90 dark:bg-midnight-green/90 backdrop-blur-md overflow-hidden"
          >
            <div className="px-4 py-3 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-terra/10 flex items-center justify-center text-xl">
                {editingPlot.icon}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-forest-deep dark:text-cream leading-tight">{editingPlot.name}</div>
                <div className="text-[10px] text-sage-dark/70 dark:text-sage/60 mt-0.5">
                  {Math.round(polyArea(getPlotShape(editingPlot)))} sq ft · {getPlotShape(editingPlot).length} points · {editingPlot.plants.length} plants
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge bg-sage/8 dark:bg-sage/12 text-sage-dark/60 dark:text-sage/60">
                  <Move className="w-3 h-3" /> Drag to move
                </span>
                <span className="badge bg-terra/8 text-terra/70">
                  <GripVertical className="w-3 h-3" /> Drag points to reshape
                </span>
              </div>
              <button
                onClick={() => dispatch({ type: 'SET_ACTIVE_PLOT', payload: editingPlot.id })}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-b from-terra to-terra-dark text-cream hover:brightness-110 transition-all shadow-sm flex items-center gap-1.5"
              >
                Open Plot <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state hint */}
      {state.plots.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-sage/10 dark:bg-sage/15 flex items-center justify-center mx-auto mb-4">
              <Flower2 className="w-8 h-8 text-sage/40" />
            </div>
            <p className="font-display text-xl text-sage-dark/60 dark:text-sage/50">No garden plots yet</p>
            <p className="text-sm mt-2 text-sage-dark/40 dark:text-sage/30">Add a garden plot to start planning</p>
            <button
              onClick={() => setShowAddMenu(true)}
              className="mt-4 pointer-events-auto px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-b from-forest to-forest-deep text-cream hover:brightness-110 transition-all shadow-sm inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Garden Plot
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
