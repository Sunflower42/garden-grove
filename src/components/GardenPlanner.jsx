import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { PLANTS, getPlantById, PLANT_CATEGORIES } from '../data/plants';
import { ELEMENTS, ELEMENT_CATEGORIES, getElementById } from '../data/elements';
import { PlantSVG, PlantFilters } from './PlantRenderer';
import { ElementSVG } from './ElementRenderer';
import YardView from './YardView';
import {
  Sprout, Trash2, Search, ChevronDown, ChevronRight, X,
  Maximize2, ZoomIn, ZoomOut, Flower2, Fence, Move, GripVertical, ArrowLeft, Home, Wand2, ShoppingCart, Plus, Printer
} from 'lucide-react';
import { suggestLayout } from '../data/layoutSuggester';
import { generateRecommendations } from '../data/recommendations';

const CELL_SIZE = 24; // pixels per 6 inches

// Build SVG path from waypoints + optional per-segment curve handles
// handles: array of {x,y} or null per segment (length = points.length - 1)
function buildPath(points, handles) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const h = handles?.[i];
    if (h) {
      // Quadratic bezier through the curve handle
      d += ` Q ${h.x},${h.y} ${points[i + 1].x},${points[i + 1].y}`;
    } else {
      d += ` L ${points[i + 1].x},${points[i + 1].y}`;
    }
  }
  return d;
}

export default function GardenPlanner() {
  const { state, dispatch } = useStore();

  // If no active plot, show the yard overview
  if (!state.activePlotId) {
    return <YardView />;
  }

  return <PlotEditor />;
}

function PlotEditor() {
  const { state, dispatch } = useStore();
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 40, y: 40 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [paletteTab, setPaletteTab] = useState('plants');
  const [paletteSearch, setPaletteSearch] = useState('');
  const [showMySeeds, setShowMySeeds] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({
    vegetable: true, herb: true, flower: true, fruit: true,
    structure: true, path: true, water: true, decor: true, protection: true,
  });

  // Palette → canvas placement mode
  const [placingItem, setPlacingItem] = useState(null); // { type: 'plant'|'element', id }
  const [placePreviewPos, setPlacePreviewPos] = useState(null);

  // Selection
  const [selectedId, setSelectedId] = useState(null);
  const [selectedType, setSelectedType] = useState(null); // 'plant' or 'element'

  // Rename quadrant bed
  const [renamingBedId, setRenamingBedId] = useState(null);

  // Drag-to-move state
  const [movingItem, setMovingItem] = useState(null); // { type, id, startX, startY, offsetX, offsetY }
  const [movePos, setMovePos] = useState(null);

  // Resize state
  const [resizing, setResizing] = useState(null); // { id, handle: 'se'|'e'|'s', startW, startH, startMouseX, startMouseY }

  // Polygon shape editing for elements
  const [editingElementShape, setEditingElementShape] = useState(null); // element id
  const [draggingVertex, setDraggingVertex] = useState(null); // { elemId, vertexIndex }

  // Path drawing mode
  const [drawingPath, setDrawingPath] = useState(null); // { points: [{x,y}], width: number, color, borderColor }
  const [draggingPathPoint, setDraggingPathPoint] = useState(null); // index of point being dragged on a drawn path element

  const activePlot = state.plots.find(p => p.id === state.activePlotId);
  if (!activePlot) return null;

  // Quadrant group detection — render all sibling beds together
  const isQuadrantView = !!activePlot.quadrantGroupId;
  const quadrantPlots = useMemo(() => {
    if (!isQuadrantView) return null;
    return state.plots.filter(p => p.quadrantGroupId === activePlot.quadrantGroupId);
  }, [isQuadrantView, activePlot.quadrantGroupId, state.plots]);

  // Compute quadrant layout offsets (positions relative to group origin)
  const quadrantLayout = useMemo(() => {
    if (!quadrantPlots || quadrantPlots.length !== 4) return null;
    // Lay out as a clean 2x2 grid regardless of yard rotation
    // Sort by yard position to get NW, NE, SW, SE order
    const sorted = [...quadrantPlots].sort((a, b) => {
      const ay = a.yardY, by = b.yardY;
      if (Math.abs(ay - by) > 2) return ay - by; // top row vs bottom row
      return a.yardX - b.yardX; // left vs right within a row
    });
    const bedW = sorted[0].widthFt;
    const bedH = sorted[0].heightFt;
    const gap = 4; // feet between beds (center walking path)
    const positions = [
      { dx: 0, dy: 0 },                    // NW
      { dx: bedW + gap, dy: 0 },            // NE
      { dx: 0, dy: bedH + gap },            // SW
      { dx: bedW + gap, dy: bedH + gap },   // SE
    ];
    return sorted.map((plot, i) => ({
      plot,
      offsetX: positions[i].dx * 2, // *2 because 1ft = 2 cells
      offsetY: positions[i].dy * 2,
      cellsW: plot.widthFt * 2,
      cellsH: plot.heightFt * 2,
    }));
  }, [quadrantPlots]);

  // For quadrant view, the "active plot" for placement is determined by click position
  const [targetPlotId, setTargetPlotId] = useState(activePlot.id);

  // Find which plot owns an item by id
  const findPlotForItem = useCallback((type, id) => {
    if (!isQuadrantView) return activePlot;
    for (const q of quadrantLayout) {
      const list = type === 'plant' ? q.plot.plants : q.plot.elements;
      if (list.some(item => item.id === id)) return q.plot;
    }
    return activePlot;
  }, [isQuadrantView, quadrantLayout, activePlot]);

  // Which plot does a cell coordinate fall in? (for quadrant view)
  const getPlotAtCell = useCallback((cellX, cellY) => {
    if (!quadrantLayout) return activePlot;
    for (const q of quadrantLayout) {
      if (cellX >= q.offsetX && cellX < q.offsetX + q.cellsW &&
          cellY >= q.offsetY && cellY < q.offsetY + q.cellsH) {
        return q.plot;
      }
    }
    return null; // In the gap
  }, [quadrantLayout, activePlot]);

  // Derive dimensions using oriented bounding box (OBB) so angled plots
  // show their true length × width, not the axis-aligned bounding box.
  // Also compute the rotation angle and transformed outline points.
  const { plotWidthFt, plotHeightFt, plotRotationDeg, plotOutlineLocal } = useMemo(() => {
    if (isQuadrantView && quadrantPlots && quadrantPlots.length === 4) {
      // Clean 2x2 grid dimensions
      const bedW = quadrantPlots[0].widthFt;
      const bedH = quadrantPlots[0].heightFt;
      const gap = 4;
      return { plotWidthFt: bedW * 2 + gap, plotHeightFt: bedH * 2 + gap, plotRotationDeg: 0, plotOutlineLocal: null };
    }
    if (!activePlot.shape || activePlot.shape.length < 3) {
      return { plotWidthFt: activePlot.widthFt, plotHeightFt: activePlot.heightFt, plotRotationDeg: 0, plotOutlineLocal: null };
    }
    const pts = activePlot.shape;

    // Find the longest edge to determine the primary axis
    let maxLen = 0, bestDx = 1, bestDy = 0;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      const dx = pts[j].x - pts[i].x;
      const dy = pts[j].y - pts[i].y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > maxLen) {
        maxLen = len;
        bestDx = dx / len;
        bestDy = dy / len;
      }
    }

    // Rotation angle of the primary axis from horizontal
    const rotDeg = Math.atan2(bestDy, bestDx) * 180 / Math.PI;

    // Project all points onto the primary axis and its perpendicular
    const perpDx = -bestDy, perpDy = bestDx;
    let minA = Infinity, maxA = -Infinity, minP = Infinity, maxP = -Infinity;
    for (const pt of pts) {
      const a = pt.x * bestDx + pt.y * bestDy;
      const p = pt.x * perpDx + pt.y * perpDy;
      minA = Math.min(minA, a); maxA = Math.max(maxA, a);
      minP = Math.min(minP, p); maxP = Math.max(maxP, p);
    }

    const length = Math.max(2, Math.round(maxA - minA));
    const width = Math.max(2, Math.round(maxP - minP));

    // Transform outline points to local OBB space (unrotated, origin at 0,0)
    const localPts = pts.map(pt => ({
      x: (pt.x * bestDx + pt.y * bestDy) - minA,
      y: (pt.x * perpDx + pt.y * perpDy) - minP,
    }));

    // Width = longer dimension along x, Height = shorter along y
    return length >= width
      ? { plotWidthFt: length, plotHeightFt: width, plotRotationDeg: rotDeg, plotOutlineLocal: localPts }
      : { plotWidthFt: width, plotHeightFt: length, plotRotationDeg: rotDeg + 90, plotOutlineLocal: localPts.map(p => ({ x: p.y, y: length - p.x })) };
  }, [isQuadrantView, quadrantPlots, activePlot.shape, activePlot.widthFt, activePlot.heightFt]);

  const gridW = plotWidthFt * 2;
  const gridH = plotHeightFt * 2;
  const svgW = gridW * CELL_SIZE;
  const svgH = gridH * CELL_SIZE;

  // Companion planting status for selected plant
  const companionMap = useMemo(() => {
    if (!selectedId || selectedType !== 'plant') return {};
    const allPlants = isQuadrantView
      ? quadrantPlots.flatMap(p => p.plants)
      : activePlot.plants;
    const selectedPlacement = allPlants.find(p => p.id === selectedId);
    if (!selectedPlacement) return {};
    const selectedPlant = getPlantById(selectedPlacement.plantId);
    if (!selectedPlant) return {};
    const map = {};
    allPlants.forEach(p => {
      if (p.id === selectedId) return;
      if (selectedPlant.companions.includes(p.plantId)) map[p.id] = 'good';
      else if (selectedPlant.avoid.includes(p.plantId)) map[p.id] = 'bad';
    });
    return map;
  }, [selectedId, selectedType, activePlot.plants]);

  // Spacing violations — pairs of plants that are too close
  const spacingWarnings = useMemo(() => {
    const allPlants = isQuadrantView
      ? quadrantLayout.flatMap(q =>
          q.plot.plants.map(p => ({ ...p, _offsetX: q.offsetX, _offsetY: q.offsetY }))
        )
      : activePlot.plants.map(p => ({ ...p, _offsetX: 0, _offsetY: 0 }));
    const warnings = new Set(); // Set of plant ids that are too close to something
    for (let i = 0; i < allPlants.length; i++) {
      const a = allPlants[i];
      const aData = getPlantById(a.plantId);
      if (!aData) continue;
      for (let j = i + 1; j < allPlants.length; j++) {
        const b = allPlants[j];
        const bData = getPlantById(b.plantId);
        if (!bData) continue;
        // Distance in cell units (each cell = 6")
        const dx = (a.x + a._offsetX) - (b.x + b._offsetX);
        const dy = (a.y + a._offsetY) - (b.y + b._offsetY);
        const distCells = Math.sqrt(dx * dx + dy * dy);
        const distInches = distCells * 6;
        // If plants have very different heights (2x+), the shorter one can grow
        // underneath — use the shorter plant's spacing instead of the max
        const tall = Math.max(aData.heightIn, bData.heightIn);
        const short = Math.min(aData.heightIn, bData.heightIn);
        const canLayer = tall >= short * 2;
        // Also skip warning entirely for companions that can layer
        const isCompanion = aData.companions?.includes(b.plantId) || bData.companions?.includes(a.plantId);
        if (canLayer && isCompanion) continue;
        const minSpacing = canLayer
          ? Math.min(aData.spacingIn, bData.spacingIn)
          : Math.max(aData.spacingIn, bData.spacingIn);
        if (distInches < minSpacing * 0.9) {
          warnings.add(a.id);
          warnings.add(b.id);
        }
      }
    }
    return warnings;
  }, [isQuadrantView, quadrantLayout, activePlot.plants]);

  // Convert screen coords → SVG coords
  const toSVG = useCallback((clientX, clientY) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - panOffset.x) / zoom,
      y: (clientY - rect.top - panOffset.y) / zoom,
    };
  }, [zoom, panOffset]);

  const snapToGrid = (val) => Math.round(val / CELL_SIZE) * CELL_SIZE;
  const snapToCell = (val) => Math.round(val / CELL_SIZE);

  // ─── Mouse Handlers ───

  const handleMouseDown = useCallback((e) => {
    // Middle mouse or left-click on empty space (when not placing) = pan
    if (e.button === 1 || (e.button === 0 && !placingItem && !drawingPath)) {
      const target = e.target;
      const isEmptySpace = e.button === 1 || target === svgRef.current || target.classList?.contains('garden-bg') || target.tagName === 'line';
      if (isEmptySpace) {
        e.preventDefault();
        setIsPanning(true);
        setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
        return;
      }
    }
    // Right click = cancel or delete vertex
    if (e.button === 2) {
      if (editingElementShape) {
        e.preventDefault();
        const el = activePlot.elements.find(el => el.id === editingElementShape);
        if (el?.polygon && el.polygon.length > 3) {
          const svg = toSVG(e.clientX, e.clientY);
          for (let i = 0; i < el.polygon.length; i++) {
            const dx = el.polygon[i].x - svg.x;
            const dy = el.polygon[i].y - svg.y;
            if (Math.sqrt(dx * dx + dy * dy) < 8) {
              const newPoly = el.polygon.filter((_, idx) => idx !== i);
              dispatch({ type: 'UPDATE_PLOT_ELEMENT_POLYGON', payload: { plotId: activePlot.id, id: el.id, polygon: newPoly } });
              return;
            }
          }
        }
      }
      setPlacingItem(null);
      setPlacePreviewPos(null);
      setMovingItem(null);
      setMovePos(null);
      setResizing(null);
      return;
    }
  }, [panOffset, editingElementShape, activePlot, toSVG, dispatch, placingItem, drawingPath]);

  const handleMouseMove = useCallback((e) => {
    if (isPanning) {
      setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    const svg = toSVG(e.clientX, e.clientY);

    // Path point / curve handle dragging
    if (draggingPathPoint !== null) {
      const el = activePlot.elements.find(el => el.id === selectedId);
      if (el?.drawnPath) {
        if (draggingPathPoint >= 0) {
          // Dragging a waypoint
          const newPoints = el.drawnPath.points.map((pt, i) => i === draggingPathPoint ? { x: svg.x, y: svg.y } : pt);
          dispatch({ type: 'UPDATE_DRAWN_PATH', payload: { plotId: activePlot.id, id: el.id, points: newPoints } });
        } else {
          // Dragging a curve handle (negative index: -(segmentIndex + 1))
          const segIdx = -(draggingPathPoint + 1);
          const handles = [...(el.drawnPath.handles || new Array(el.drawnPath.points.length - 1).fill(null))];
          handles[segIdx] = { x: svg.x, y: svg.y };
          dispatch({ type: 'UPDATE_DRAWN_PATH', payload: { plotId: activePlot.id, id: el.id, handles } });
        }
      }
      return;
    }

    // Vertex dragging for polygon editing
    if (draggingVertex) {
      const el = activePlot.elements.find(el => el.id === draggingVertex.elemId);
      if (el?.polygon) {
        const snapped = { x: Math.round(svg.x / (CELL_SIZE / 2)) * (CELL_SIZE / 2), y: Math.round(svg.y / (CELL_SIZE / 2)) * (CELL_SIZE / 2) };
        const newPoly = el.polygon.map((pt, i) => i === draggingVertex.vertexIndex ? snapped : pt);
        dispatch({ type: 'UPDATE_PLOT_ELEMENT_POLYGON', payload: { plotId: activePlot.id, id: el.id, polygon: newPoly } });
      }
      return;
    }

    // Resize
    if (resizing) {
      const dx = (e.clientX - resizing.startMouseX) / zoom;
      const dy = (e.clientY - resizing.startMouseY) / zoom;
      const newW = Math.max(1, snapToCell(resizing.startW * CELL_SIZE + dx));
      const newH = Math.max(1, snapToCell(resizing.startH * CELL_SIZE + dy));
      setResizing(prev => ({ ...prev, currentW: newW, currentH: newH }));
      return;
    }

    // Moving item — require a 4px drag threshold before committing to move
    if (movingItem) {
      if (!movingItem.dragging) {
        const dx = e.clientX - movingItem.startClientX;
        const dy = e.clientY - movingItem.startClientY;
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
        setMovingItem(prev => ({ ...prev, dragging: true }));
      }
      setMovePos({
        x: movingItem.type === 'plant' ? svg.x - movingItem.offsetX : snapToGrid(svg.x - movingItem.offsetX),
        y: movingItem.type === 'plant' ? svg.y - movingItem.offsetY : snapToGrid(svg.y - movingItem.offsetY),
      });
      return;
    }

    // Placement preview
    if (placingItem) {
      setPlacePreviewPos({
        x: placingItem.type === 'plant' ? svg.x : snapToGrid(svg.x),
        y: placingItem.type === 'plant' ? svg.y : snapToGrid(svg.y),
      });
    }
  }, [isPanning, panStart, resizing, movingItem, placingItem, draggingVertex, draggingPathPoint, selectedId, toSVG, zoom, activePlot, dispatch]);

  const handleMouseUp = useCallback((e) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    // End path point drag
    if (draggingPathPoint !== null) {
      setDraggingPathPoint(null);
      return;
    }

    // End vertex drag
    if (draggingVertex) {
      setDraggingVertex(null);
      return;
    }

    // Commit resize
    if (resizing && resizing.currentW !== undefined) {
      const resizePlot = findPlotForItem('element', resizing.id);
      dispatch({
        type: 'RESIZE_ELEMENT',
        payload: {
          plotId: resizePlot.id,
          id: resizing.id,
          width: resizing.currentW,
          height: resizing.currentH,
        },
      });
      setResizing(null);
      return;
    }

    // Commit move (or cancel if no drag happened)
    if (movingItem) {
      if (movingItem.dragging && movePos) {
        const movePlot = findPlotForItem(movingItem.type, movingItem.id);
        // In quadrant view, convert combined coords back to local plot coords
        const q = quadrantLayout?.find(q => q.plot.id === movePlot.id);
        const offsetPx = q ? q.offsetX * CELL_SIZE : 0;
        const offsetPy = q ? q.offsetY * CELL_SIZE : 0;
        const newX = (movePos.x - offsetPx) / CELL_SIZE;
        const newY = (movePos.y - offsetPy) / CELL_SIZE;
        if (movingItem.type === 'plant') {
          dispatch({ type: 'MOVE_PLANT', payload: { plotId: movePlot.id, id: movingItem.id, x: newX, y: newY } });
        } else {
          dispatch({ type: 'MOVE_ELEMENT', payload: { plotId: movePlot.id, id: movingItem.id, x: newX, y: newY } });
        }
      }
      setMovingItem(null);
      setMovePos(null);
      return;
    }
  }, [isPanning, resizing, movingItem, movePos, draggingVertex, draggingPathPoint, findPlotForItem, quadrantLayout, dispatch, activePlot?.id]);

  // Global mouseup listener — ensures drops register even if mouse leaves the SVG area
  useEffect(() => {
    if (!movingItem && !resizing && !draggingVertex && !draggingPathPoint) return;
    const onGlobalMouseUp = (e) => handleMouseUp(e);
    window.addEventListener('mouseup', onGlobalMouseUp);
    return () => window.removeEventListener('mouseup', onGlobalMouseUp);
  }, [movingItem, resizing, draggingVertex, draggingPathPoint, handleMouseUp]);

  // Double-click detection for path drawing
  const lastClickRef = useRef({ time: 0, x: 0, y: 0 });

  const handleCanvasClick = useCallback((e) => {
    // Path drawing mode
    if (drawingPath) {
      const svg = toSVG(e.clientX, e.clientY);
      const now = Date.now();
      const last = lastClickRef.current;
      const isDoubleClick = (now - last.time < 400) && Math.abs(svg.x - last.x) < 10 && Math.abs(svg.y - last.y) < 10;
      lastClickRef.current = { time: now, x: svg.x, y: svg.y };

      if (isDoubleClick && drawingPath.points.length >= 2) {
        // Finish drawing — save the path
        dispatch({
          type: 'PLACE_DRAWN_PATH',
          payload: {
            plotId: activePlot.id,
            points: drawingPath.points,
            pathWidth: drawingPath.pathWidth,
            color: drawingPath.color,
            borderColor: drawingPath.borderColor,
          },
        });
        setDrawingPath(null);
        return;
      }

      // Add a point
      setDrawingPath(prev => ({ ...prev, points: [...prev.points, { x: svg.x, y: svg.y }] }));
      return;
    }

    // If we're in placement mode, place the item
    if (placingItem && placePreviewPos) {
      const cellX = placePreviewPos.x / CELL_SIZE;
      const cellY = placePreviewPos.y / CELL_SIZE;

      // For quadrant view, find which bed the click falls in
      const targetPlot = isQuadrantView ? getPlotAtCell(cellX, cellY) : activePlot;
      if (!targetPlot) {
        // Clicked in the gap — don't place
        setPlacingItem(null);
        setPlacePreviewPos(null);
        return;
      }
      // Convert to local plot coordinates for quadrant view
      const localX = isQuadrantView ? cellX - quadrantLayout.find(q => q.plot.id === targetPlot.id).offsetX : cellX;
      const localY = isQuadrantView ? cellY - quadrantLayout.find(q => q.plot.id === targetPlot.id).offsetY : cellY;

      if (placingItem.type === 'plant') {
        dispatch({
          type: 'PLACE_PLANT',
          payload: { plotId: targetPlot.id, plantId: placingItem.id, x: localX, y: localY, variety: placingItem.variety || null },
        });
      } else {
        const elem = getElementById(placingItem.id);
        if (elem) {
          dispatch({
            type: 'PLACE_ELEMENT',
            payload: {
              plotId: targetPlot.id,
              elementId: placingItem.id,
              x: localX, y: localY,
              width: Math.ceil(elem.widthIn / 6),
              height: Math.ceil(elem.heightIn / 6),
            },
          });
        }
      }
      // Exit placement mode after placing
      setPlacingItem(null);
      setPlacePreviewPos(null);
      return;
    }

    // Click on empty space = deselect
    const target = e.target;
    if (target === svgRef.current || target.classList?.contains('garden-bg') || target.tagName === 'line') {
      setSelectedId(null);
      setSelectedType(null);
      setEditingElementShape(null);
      setDraggingVertex(null);
    }
  }, [placingItem, placePreviewPos, drawingPath, dispatch, activePlot?.id, toSVG]);

  // Start dragging a placed item to move it
  const handleItemMouseDown = useCallback((type, id, e) => {
    if (placingItem) return; // Don't interfere with placement mode
    e.stopPropagation();
    e.preventDefault();

    const svg = toSVG(e.clientX, e.clientY);
    let itemX, itemY;
    // Search across all relevant plots (quadrant or single)
    const plotsToSearch = isQuadrantView ? quadrantPlots : [activePlot];
    if (type === 'plant') {
      for (const plot of plotsToSearch) {
        const p = plot.plants.find(p => p.id === id);
        if (p) {
          const q = quadrantLayout?.find(q => q.plot.id === plot.id);
          itemX = p.x * CELL_SIZE + (q?.offsetX || 0) * CELL_SIZE;
          itemY = p.y * CELL_SIZE + (q?.offsetY || 0) * CELL_SIZE;
          break;
        }
      }
    } else {
      for (const plot of plotsToSearch) {
        const el = plot.elements.find(el => el.id === id);
        if (el) {
          const q = quadrantLayout?.find(q => q.plot.id === plot.id);
          itemX = el.x * CELL_SIZE + (q?.offsetX || 0) * CELL_SIZE;
          itemY = el.y * CELL_SIZE + (q?.offsetY || 0) * CELL_SIZE;
          break;
        }
      }
    }

    setSelectedId(id);
    setSelectedType(type);
    setMovingItem({
      type, id,
      offsetX: svg.x - itemX,
      offsetY: svg.y - itemY,
      startClientX: e.clientX,
      startClientY: e.clientY,
      dragging: false,
    });
  }, [placingItem, toSVG, activePlot, isQuadrantView, quadrantPlots, quadrantLayout]);

  // Start resizing an element
  const handleResizeMouseDown = useCallback((elemId, e) => {
    e.stopPropagation();
    e.preventDefault();
    const el = activePlot.elements.find(el => el.id === elemId);
    if (!el) return;
    setResizing({
      id: elemId,
      startW: el.width,
      startH: el.height,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
    });
  }, [activePlot]);

  const handleDelete = useCallback(() => {
    if (!selectedId) return;
    const delPlot = findPlotForItem(selectedType, selectedId);
    if (selectedType === 'plant') {
      dispatch({ type: 'REMOVE_PLANT', payload: { plotId: delPlot.id, id: selectedId } });
    } else {
      dispatch({ type: 'REMOVE_ELEMENT', payload: { plotId: delPlot.id, id: selectedId } });
    }
    setSelectedId(null);
    setSelectedType(null);
  }, [selectedId, selectedType, dispatch, activePlot?.id]);

  // Keyboard
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        setPlacingItem(null);
        setPlacePreviewPos(null);
        setMovingItem(null);
        setMovePos(null);
        setResizing(null);
        setSelectedId(null);
        setSelectedType(null);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        handleDelete();
      }
      // Arrow key nudge — move selected item by 1 cell
      if (selectedId && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const dx = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
        const dy = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
        if (selectedType === 'plant') {
          const p = activePlot.plants.find(p => p.id === selectedId);
          if (p) dispatch({ type: 'MOVE_PLANT', payload: { plotId: activePlot.id, id: selectedId, x: p.x + dx, y: p.y + dy } });
        } else {
          const el = activePlot.elements.find(el => el.id === selectedId);
          if (el) dispatch({ type: 'MOVE_ELEMENT', payload: { plotId: activePlot.id, id: selectedId, x: el.x + dx, y: el.y + dy } });
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, handleDelete]);

  // Scroll/pinch — non-passive so preventDefault works for trackpad pinch
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e) => {
      e.preventDefault();
      if (e.ctrlKey) {
        // Pinch-to-zoom on trackpad
        setZoom(z => {
          const factor = e.deltaY > 0 ? 0.95 : 1.05;
          return Math.min(3, Math.max(0.2, z * factor));
        });
      } else {
        // Two-finger scroll — pan
        setPanOffset(prev => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // Auto-fit zoom/pan to show the full plot on mount
  useEffect(() => {
    // Delay slightly to ensure container is fully laid out
    const timer = setTimeout(() => {
      const el = containerRef.current;
      if (!el || !svgW || !svgH) return;
      const rect = el.getBoundingClientRect();
      const padding = 80;
      const fitZoom = Math.min(
        (rect.width - padding * 2) / svgW,
        (rect.height - padding * 2) / svgH,
        1.5
      );
      const z = Math.max(0.15, fitZoom);
      setPanOffset({
        x: (rect.width - svgW * z) / 2,
        y: (rect.height - svgH * z) / 2 + 20,
      });
      setZoom(z);
    }, 50);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.activePlotId]);

  // Filter palette items
  const myPlantIds = useMemo(() =>
    new Set(state.seedInventory.map(i => i.plantId)),
    [state.seedInventory]
  );

  const filteredPlants = useMemo(() => {
    let plants = PLANTS;
    if (showMySeeds) {
      plants = plants.filter(p => myPlantIds.has(p.id));
    }
    if (paletteSearch) {
      const q = paletteSearch.toLowerCase();
      plants = plants.filter(p => p.name.toLowerCase().includes(q) || p.variety.toLowerCase().includes(q));
    }
    return plants;
  }, [paletteSearch, showMySeeds, myPlantIds]);

  const filteredElements = useMemo(() => {
    if (!paletteSearch) return ELEMENTS;
    const q = paletteSearch.toLowerCase();
    return ELEMENTS.filter(e => e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
  }, [paletteSearch]);

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Selected item info
  const selectedInfo = useMemo(() => {
    if (!selectedId) return null;
    const plotsToSearch = isQuadrantView ? quadrantPlots : [activePlot];
    if (selectedType === 'plant') {
      for (const plot of plotsToSearch) {
        const placement = plot.plants.find(p => p.id === selectedId);
        if (placement) return { placement, data: getPlantById(placement.plantId) };
      }
      return null;
    } else {
      let placement = null;
      for (const plot of plotsToSearch) {
        placement = plot.elements.find(e => e.id === selectedId);
        if (placement) break;
      }
      if (!placement) return null;
      if (placement.drawnPath) {
        return { placement, data: { name: 'Drawn Path', emoji: '〰️', color: placement.drawnPath.color, description: `${placement.drawnPath.points.length} waypoints — drag points to adjust`, polygonEditable: false } };
      }
      return { placement, data: getElementById(placement.elementId) };
    }
  }, [selectedId, selectedType, activePlot]);

  // Compute element positions with live resize/move overlays
  const getElementPosition = useCallback((elem) => {
    let x = elem.x * CELL_SIZE;
    let y = elem.y * CELL_SIZE;
    let w = elem.width * CELL_SIZE;
    let h = elem.height * CELL_SIZE;

    if (movingItem?.type === 'element' && movingItem.id === elem.id && movePos) {
      x = movePos.x;
      y = movePos.y;
    }
    if (resizing?.id === elem.id && resizing.currentW !== undefined) {
      w = resizing.currentW * CELL_SIZE;
      h = resizing.currentH * CELL_SIZE;
    }
    return { x, y, w, h };
  }, [movingItem, movePos, resizing]);

  const getPlantPosition = useCallback((p) => {
    let x = p.x * CELL_SIZE;
    let y = p.y * CELL_SIZE;
    if (movingItem?.type === 'plant' && movingItem.id === p.id && movePos) {
      x = movePos.x;
      y = movePos.y;
    }
    return { x, y };
  }, [movingItem, movePos]);

  // Print current garden view
  const handlePrintGarden = useCallback(() => {
    if (!containerRef.current || !panOffset) return;
    const rect = containerRef.current.getBoundingClientRect();
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const vx = -panOffset.x / zoom;
    const vy = -panOffset.y / zoom;
    const vw = rect.width / zoom;
    const vh = rect.height / zoom;
    const clone = svgEl.cloneNode(true);
    clone.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`);
    clone.setAttribute('width', '100%');
    clone.setAttribute('height', '100%');
    clone.style.cursor = 'default';
    const title = isQuadrantView ? 'Quadrant Garden' : activePlot?.name || 'Garden Plot';
    const svgStr = new XMLSerializer().serializeToString(clone);
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    printWindow.document.write(`<!DOCTYPE html>
<html><head><title>Garden Grove — ${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: landscape; margin: 0.5in; }
  body { display: flex; flex-direction: column; align-items: center; height: 100vh; background: white; }
  h1 { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 18px; color: #3A5A2A; margin: 12px 0 8px; }
  .container { flex: 1; width: 100%; }
  svg { width: 100%; height: 100%; }
</style></head>
<body><h1>${title}</h1><div class="container">${svgStr}</div>
<script>window.onload = function() { window.print(); }<\/script>
</body></html>`);
    printWindow.document.close();
  }, [panOffset, zoom, isQuadrantView, activePlot?.name]);

  return (
    <div className="h-full flex">
      {/* Palette sidebar */}
      <div className="w-64 shrink-0 border-r border-sage/12 dark:border-sage-dark/15 bg-white/60 dark:bg-midnight-green/60 flex flex-col backdrop-blur-sm">
        {/* Palette tabs */}
        <div className="flex border-b border-sage/10 dark:border-sage-dark/15" style={{ padding: 16, gap: 12 }}>
          <button
            onClick={() => setPaletteTab('plants')}
            className={`flex-1 py-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all duration-200 ${
              paletteTab === 'plants'
                ? 'bg-forest/10 text-forest dark:bg-sage/15 dark:text-cream shadow-sm'
                : 'text-sage-dark dark:text-sage hover:bg-sage/8 dark:hover:bg-sage/8'
            }`}
          >
            <Sprout className="w-3.5 h-3.5" /> Plants
          </button>
          <button
            onClick={() => setPaletteTab('elements')}
            className={`flex-1 py-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all duration-200 ${
              paletteTab === 'elements'
                ? 'bg-forest/10 text-forest dark:bg-sage/15 dark:text-cream shadow-sm'
                : 'text-sage-dark dark:text-sage hover:bg-sage/8 dark:hover:bg-sage/8'
            }`}
          >
            <Fence className="w-3.5 h-3.5" /> Elements
          </button>
        </div>

        {/* Search + filter */}
        <div style={{ padding: '14px 16px' }}>
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-sage/40" style={{ left: 14 }} />
            <input
              type="text"
              value={paletteSearch}
              onChange={e => setPaletteSearch(e.target.value)}
              placeholder={paletteTab === 'plants' ? 'Search plants...' : 'Search elements...'}
              className="w-full rounded-2xl border-2 border-sage/12 dark:border-sage-dark/18 bg-white dark:bg-midnight-sage/80 text-sm text-forest-deep dark:text-cream placeholder:text-sage/30 focus:border-sage/25 dark:focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage/8 transition-all shadow-sm"
              style={{ padding: '12px 16px 12px 40px' }}
            />
            {paletteSearch && (
              <button
                onClick={() => setPaletteSearch('')}
                className="absolute top-1/2 -translate-y-1/2 text-sage-dark/30 hover:text-sage-dark/60 transition-colors"
                style={{ right: 12 }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {/* My Seeds filter */}
          {paletteTab === 'plants' && state.seedInventory.length > 0 && (
            <button
              onClick={() => setShowMySeeds(!showMySeeds)}
              style={{ marginTop: 10, padding: '8px 14px', gap: 8 }}
              className={`w-full flex items-center justify-center rounded-xl text-[11px] font-medium transition-all ${
                showMySeeds
                  ? 'bg-terra/15 text-terra-dark dark:text-terra-light border border-terra/25 shadow-sm'
                  : 'bg-sage/6 text-sage-dark/60 dark:text-sage/50 border border-sage/10 hover:border-sage/20'
              }`}
            >
              <Sprout className="w-3.5 h-3.5" />
              {showMySeeds ? `My Seeds (${myPlantIds.size})` : 'Show My Seeds Only'}
            </button>
          )}
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '0 16px 16px' }}>
          {paletteTab === 'plants' ? (
            Object.entries(PLANT_CATEGORIES).map(([catKey, cat]) => {
              const catPlants = filteredPlants.filter(p => p.category === catKey);
              if (catPlants.length === 0) return null;
              return (
                <div key={catKey} style={{ marginBottom: 20 }}>
                  <button
                    onClick={() => toggleCategory(catKey)}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sage-dark/70 dark:text-sage/70 hover:text-sage-dark dark:hover:text-sage transition-colors"
                  >
                    {expandedCategories[catKey] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    {cat.label}
                    <span className="ml-auto text-sage/50 dark:text-sage-dark/60 font-normal">{catPlants.length}</span>
                  </button>
                  {expandedCategories[catKey] && catPlants.map(plant => {
                    const myVarieties = state.seedInventory.filter(item => item.plantId === plant.id);
                    const isWantOnly = myVarieties.some(item => item.type === 'want') &&
                      !myVarieties.some(item => item.type === 'seed' || item.type === 'start');
                    const isOwned = myVarieties.some(item => item.type === 'seed' || item.type === 'start');
                    const hasVarieties = myVarieties.filter(v => v.variety).length > 0;
                    const isExpanded = placingItem?.id === plant.id && placingItem?.type === 'plant' && hasVarieties;
                    return (
                    <div key={plant.id}>
                      <button
                        onClick={() => {
                          if (hasVarieties && !(placingItem?.id === plant.id)) {
                            // Show variety sub-list
                            setPlacingItem({ type: 'plant', id: plant.id, pickingVariety: true });
                          } else {
                            setPlacingItem({ type: 'plant', id: plant.id });
                          }
                          setSelectedId(null);
                          setSelectedType(null);
                        }}
                        className={`w-full flex items-center rounded-lg text-left text-xs transition-all duration-150 ${
                          placingItem?.id === plant.id && placingItem?.type === 'plant'
                            ? 'bg-sage/15 dark:bg-sage/20 ring-1 ring-sage/50 shadow-sm'
                            : 'hover:bg-sage/8 dark:hover:bg-sage/8'
                        }`}
                        style={{ padding: '10px 16px', gap: 12, opacity: isWantOnly ? 0.6 : 1 }}
                      >
                        <span
                          className="w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0"
                          style={{ backgroundColor: plant.color + '20', border: isWantOnly ? '1.5px dashed #6A8EAE' : 'none' }}
                        >
                          {plant.emoji}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-forest-deep dark:text-cream truncate font-medium leading-tight">{plant.name}</div>
                          <div className="text-[9px] text-sage-dark/70 dark:text-sage/60 mt-0.5">
                            {plant.spacingIn}" spacing
                            {hasVarieties && <span className="text-terra"> · {myVarieties.filter(v => v.variety).length} varieties</span>}
                          </div>
                        </div>
                        {isWantOnly && (
                          <ShoppingCart className="w-3 h-3 text-bloom-blue/60 shrink-0" />
                        )}
                        {isOwned && !hasVarieties && (
                          <span className="w-1.5 h-1.5 rounded-full bg-sage shrink-0" title="In my collection" />
                        )}
                        {hasVarieties && (
                          <ChevronDown className={`w-3 h-3 text-sage-dark/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        )}
                      </button>
                      {/* Variety sub-list */}
                      {isExpanded && (
                        <div style={{ padding: '4px 0 4px 28px' }}>
                          {/* Generic option */}
                          <button
                            onClick={() => {
                              setPlacingItem({ type: 'plant', id: plant.id, variety: null });
                            }}
                            className="w-full flex items-center rounded-md text-left text-[11px] hover:bg-sage/8 dark:hover:bg-sage/8 transition-all text-sage-dark/60 dark:text-sage/50"
                            style={{ padding: '6px 12px', gap: 8 }}
                          >
                            <span className="text-sage-dark/30">—</span>
                            <span>Generic {plant.name}</span>
                          </button>
                          {myVarieties.filter(v => v.variety).map(inv => (
                            <button
                              key={inv.id}
                              onClick={() => {
                                setPlacingItem({ type: 'plant', id: plant.id, variety: inv.variety, inventoryId: inv.id });
                              }}
                              className={`w-full flex items-center rounded-md text-left text-[11px] hover:bg-sage/8 dark:hover:bg-sage/8 transition-all ${
                                inv.type === 'want' ? 'text-bloom-blue/70' : 'text-forest-deep dark:text-cream'
                              }`}
                              style={{ padding: '6px 12px', gap: 8, opacity: inv.type === 'want' ? 0.6 : 1 }}
                            >
                              {inv.type === 'want' ? <ShoppingCart className="w-3 h-3 text-bloom-blue/50" /> :
                               inv.type === 'start' ? <Flower2 className="w-3 h-3 text-terra/60" /> :
                               <Sprout className="w-3 h-3 text-sage/60" />}
                              <span className="font-medium">{inv.variety}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              );
            })
          ) : (
            <>
            {/* Draw Path button */}
            <button
              onClick={() => {
                if (drawingPath) {
                  setDrawingPath(null);
                } else {
                  setDrawingPath({ points: [], pathWidth: 3, color: '#C4B69A', borderColor: '#A89878' });
                  setPlacingItem(null);
                  setSelectedId(null);
                  setSelectedType(null);
                }
              }}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-lg text-left text-xs transition-all duration-150 ${
                drawingPath
                  ? 'bg-terra/10 dark:bg-terra/15 ring-1 ring-terra/50 shadow-sm'
                  : 'hover:bg-sage/8 dark:hover:bg-sage/8'
              }`}
              style={{ marginBottom: 12 }}
            >
              <div className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center bg-[#C4B69A] border border-[#A89878]">
                <svg viewBox="0 0 16 16" className="w-4 h-4"><path d="M2 12 C5 4, 11 4, 14 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <div className="min-w-0">
                <div className="text-forest-deep dark:text-cream truncate font-medium leading-tight">
                  {drawingPath ? 'Cancel Drawing' : 'Draw Path'}
                </div>
                <div className="text-[9px] text-sage-dark/70 dark:text-sage/60 mt-0.5">Click to place points, double-click to finish</div>
              </div>
            </button>
            {drawingPath && drawingPath.points.length > 0 && (
              <div className="text-[10px] text-terra font-medium text-center" style={{ marginBottom: 8 }}>
                {drawingPath.points.length} point{drawingPath.points.length !== 1 ? 's' : ''} — double-click to finish
              </div>
            )}
            {Object.entries(ELEMENT_CATEGORIES).map(([catKey, cat]) => {
              const catElems = filteredElements.filter(e => e.category === catKey);
              if (catElems.length === 0) return null;
              return (
                <div key={catKey} style={{ marginBottom: 20 }}>
                  <button
                    onClick={() => toggleCategory(catKey)}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sage-dark/70 dark:text-sage/70 hover:text-sage-dark dark:hover:text-sage transition-colors"
                  >
                    {expandedCategories[catKey] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    {cat.icon} {cat.label}
                  </button>
                  {expandedCategories[catKey] && catElems.map(elem => (
                    <button
                      key={elem.id}
                      onClick={() => {
                        setPlacingItem({ type: 'element', id: elem.id });
                        setSelectedId(null);
                        setSelectedType(null);
                      }}
                      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-lg text-left text-xs transition-all duration-150 ${
                        placingItem?.id === elem.id && placingItem?.type === 'element'
                          ? 'bg-terra/10 dark:bg-terra/15 ring-1 ring-terra/50 shadow-sm'
                          : 'hover:bg-sage/8 dark:hover:bg-sage/8'
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded-md shrink-0"
                        style={{ backgroundColor: elem.color, border: `1px solid ${elem.borderColor}` }}
                      />
                      <div className="min-w-0">
                        <div className="text-forest-deep dark:text-cream truncate font-medium leading-tight">{elem.name}</div>
                        <div className="text-[9px] text-sage-dark/70 dark:text-sage/60 mt-0.5">{elem.description.slice(0, 35)}...</div>
                      </div>
                    </button>
                  ))}
                </div>
              );
            })
          }</>)}
        </div>
      </div>

      {/* Garden Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-sage/10 dark:border-sage-dark/15 bg-white/60 dark:bg-midnight-green/60 toolbar" style={{ padding: '18px 28px', marginBottom: 0 }}>
          <div className="flex items-center" style={{ gap: 12 }}>
            <button
              onClick={() => dispatch({ type: 'SET_ACTIVE_PLOT', payload: null })}
              className="flex items-center rounded-lg text-xs font-medium text-sage-dark dark:text-sage hover:bg-sage/10 dark:hover:bg-sage/10 transition-all duration-200 border border-sage/15 dark:border-sage-dark/20"
              style={{ gap: 8, padding: '8px 14px' }}
            >
              <ArrowLeft className="w-3 h-3" />
              Yard
            </button>
            <span className="text-sage/25 dark:text-sage-dark/40 select-none">/</span>
            <div className="flex items-center" style={{ gap: 12 }}>
              <span className="text-base leading-none">{isQuadrantView ? '✦' : activePlot.icon}</span>
              <h2 className="font-display text-lg font-semibold text-forest-deep dark:text-cream">
                {isQuadrantView ? 'Quadrant Garden' : activePlot.name}
              </h2>
            </div>
            <span className="badge bg-sage/8 dark:bg-sage/12 text-sage-dark/70 dark:text-sage/70 ml-1">
              {plotWidthFt}' x {plotHeightFt}' · {activePlot.plants.length} plants
            </span>
          </div>

          <div className="flex items-center" style={{ gap: 16 }}>
            {/* View toggle */}
            <div className="flex bg-sage/8 dark:bg-sage/12 rounded-lg" style={{ padding: 3 }}>
              <button
                onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'planted' })}
                style={{ padding: '8px 14px', gap: 8 }}
                className={`rounded-md text-xs font-medium transition-all duration-200 flex items-center ${
                  state.viewMode === 'planted'
                    ? 'bg-white dark:bg-midnight-sage text-forest dark:text-cream shadow-sm'
                    : 'text-sage-dark dark:text-sage hover:text-forest dark:hover:text-cream'
                }`}
              >
                <Sprout className="w-3.5 h-3.5" />
                Seedling
              </button>
              <button
                onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'fullgrown' })}
                style={{ padding: '8px 14px', gap: 8 }}
                className={`rounded-md text-xs font-medium transition-all duration-200 flex items-center ${
                  state.viewMode === 'fullgrown'
                    ? 'bg-white dark:bg-midnight-sage text-forest dark:text-cream shadow-sm'
                    : 'text-sage-dark dark:text-sage hover:text-forest dark:hover:text-cream'
                }`}
              >
                <Flower2 className="w-3.5 h-3.5" />
                Full Grown
              </button>
            </div>

            {/* Zoom */}
            <div className="flex items-center bg-sage/5 dark:bg-sage/8 rounded-lg" style={{ gap: 2, padding: '3px 6px', marginLeft: 4 }}>
              <button
                onClick={() => setZoom(z => Math.max(0.2, z - 0.15))}
                style={{ padding: 8 }}
                className="rounded-md hover:bg-sage/10 text-sage-dark dark:text-sage transition-colors"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-sage-dark/70 dark:text-sage/60 w-9 text-center font-medium tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(z => Math.min(3, z + 0.15))}
                style={{ padding: 8 }}
                className="rounded-md hover:bg-sage/10 text-sage-dark dark:text-sage transition-colors"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  const el = containerRef.current;
                  if (!el) return;
                  const rect = el.getBoundingClientRect();
                  const padding = 80;
                  const z = Math.max(0.15, Math.min((rect.width - padding * 2) / svgW, (rect.height - padding * 2) / svgH, 1.5));
                  setZoom(z);
                  setPanOffset({ x: (rect.width - svgW * z) / 2, y: (rect.height - svgH * z) / 2 + 20 });
                }}
                style={{ padding: 8 }}
                className="rounded-md hover:bg-sage/10 text-sage-dark dark:text-sage transition-colors"
                title="Reset view"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handlePrintGarden}
                style={{ padding: 8 }}
                className="rounded-md hover:bg-sage/10 text-sage-dark dark:text-sage transition-colors"
                title="Print current view"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Suggest Layout */}
            {state.seedInventory.length > 0 && (
              <button
                onClick={() => {
                  const plantIds = state.seedInventory.map(i => i.plantId);
                  if (isQuadrantView && quadrantLayout) {
                    // Group plants by category for themed quadrant beds
                    const allPlots = quadrantLayout.map(q => q.plot);
                    const totalPlants = allPlots.reduce((sum, p) => sum + p.plants.length, 0);
                    const confirmed = totalPlants === 0 || confirm(`This will replace ${totalPlants} existing plants across all beds. Continue?`);
                    if (!confirmed) return;
                    // Clear all beds
                    for (const plot of allPlots) {
                      for (const p of plot.plants) {
                        dispatch({ type: 'REMOVE_PLANT', payload: { plotId: plot.id, id: p.id } });
                      }
                    }
                    // Group unique plant IDs by category, routing companion
                    // flowers to the veggie bed if they companion with veggies
                    const uniqueIds = [...new Set(plantIds)];
                    const categoryGroups = {};
                    const vegIds = new Set(uniqueIds.filter(id => {
                      const p = getPlantById(id);
                      return p && (p.category === 'vegetable' || p.category === 'fruit');
                    }));
                    for (const id of uniqueIds) {
                      const plant = getPlantById(id);
                      if (!plant) continue;
                      let cat = plant.category || 'vegetable';
                      // If this flower companions with veggies in our inventory, group it with veggies
                      if (cat === 'flower' && plant.companions?.some(cId => vegIds.has(cId))) {
                        cat = 'vegetable';
                      }
                      if (!categoryGroups[cat]) categoryGroups[cat] = [];
                      categoryGroups[cat].push(id);
                    }
                    // Sort categories by size (largest group gets first bed)
                    // and assign nice bed names
                    const catLabels = { vegetable: 'Vegetables', herb: 'Herbs', flower: 'Cutting Flowers', fruit: 'Fruits' };
                    const sortedCats = Object.entries(categoryGroups)
                      .sort((a, b) => b[1].length - a[1].length);
                    // If fewer than 4 categories, split the largest group across extra beds
                    while (sortedCats.length < 4 && sortedCats[0][1].length > 1) {
                      const [cat, ids] = sortedCats[0];
                      const half = Math.ceil(ids.length / 2);
                      sortedCats[0] = [cat, ids.slice(0, half)];
                      sortedCats.push([cat + '-2', ids.slice(half)]);
                      sortedCats.sort((a, b) => b[1].length - a[1].length);
                    }
                    // Generate layout per bed with themed plants
                    const bedW = quadrantLayout[0].cellsW / 2; // in feet
                    const bedH = quadrantLayout[0].cellsH / 2;
                    for (let i = 0; i < Math.min(4, sortedCats.length); i++) {
                      const [cat, bedPlantIds] = sortedCats[i];
                      const layout = suggestLayout(bedPlantIds, bedW, bedH);
                      // Update bed name to reflect theme
                      const baseCat = cat.replace(/-\d+$/, '');
                      const label = catLabels[baseCat] || baseCat;
                      const suffix = cat.includes('-') ? ' ' + cat.split('-')[1] : '';
                      dispatch({ type: 'UPDATE_PLOT_NAME', payload: { id: allPlots[i].id, name: label + suffix } });
                      for (const placement of layout) {
                        dispatch({
                          type: 'PLACE_PLANT',
                          payload: { plotId: allPlots[i].id, plantId: placement.plantId, x: placement.x, y: placement.y },
                        });
                      }
                    }
                  } else {
                    const layout = suggestLayout(plantIds, plotWidthFt, plotHeightFt);
                    if (layout.length === 0) return;
                    const confirmed = activePlot.plants.length === 0 || confirm(`This will replace ${activePlot.plants.length} existing plants. Continue?`);
                    if (!confirmed) return;
                    for (const p of activePlot.plants) {
                      dispatch({ type: 'REMOVE_PLANT', payload: { plotId: activePlot.id, id: p.id } });
                    }
                    for (const placement of layout) {
                      dispatch({
                        type: 'PLACE_PLANT',
                        payload: { plotId: activePlot.id, plantId: placement.plantId, x: placement.x, y: placement.y },
                      });
                    }
                  }
                }}
                style={{ padding: '8px 14px', gap: 8 }}
                className="flex items-center rounded-lg text-xs font-medium bg-gradient-to-b from-terra to-terra-dark text-cream hover:brightness-110 transition-all shadow-sm"
              >
                <Wand2 className="w-3.5 h-3.5" /> Suggest Layout
              </button>
            )}

            {/* Clear All Plants */}
            {(() => {
              const allPlants = isQuadrantView
                ? quadrantPlots.flatMap(p => ({ plotId: p.id, plants: p.plants }))
                : [{ plotId: activePlot.id, plants: activePlot.plants }];
              const total = allPlants.reduce((sum, p) => sum + p.plants.length, 0);
              if (total === 0) return null;
              return (
                <button
                  onClick={() => {
                    if (!confirm(`Remove all ${total} plants?`)) return;
                    if (isQuadrantView) {
                      for (const plot of quadrantPlots) {
                        for (const p of plot.plants) {
                          dispatch({ type: 'REMOVE_PLANT', payload: { plotId: plot.id, id: p.id } });
                        }
                      }
                    } else {
                      for (const p of activePlot.plants) {
                        dispatch({ type: 'REMOVE_PLANT', payload: { plotId: activePlot.id, id: p.id } });
                      }
                    }
                    setSelectedId(null);
                    setSelectedType(null);
                  }}
                  style={{ padding: '8px 14px', gap: 8 }}
                  className="flex items-center rounded-lg text-xs font-medium bg-bloom-red/8 text-bloom-red hover:bg-bloom-red/15 transition-all border border-bloom-red/15"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All ({total})
                </button>
              );
            })()}

            {/* Delete */}
            {selectedId && (
              <button
                onClick={handleDelete}
                className="ml-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-bloom-red/8 text-bloom-red hover:bg-bloom-red/15 transition-all duration-200 flex items-center gap-1.5 border border-bloom-red/15"
              >
                <Trash2 className="w-3 h-3" /> Remove
              </button>
            )}
          </div>
        </div>

        {/* Canvas area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden bg-cream dark:bg-midnight"
          style={{ position: 'relative' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={(e) => { setIsPanning(false); if (movingItem) handleMouseUp(e); }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Height legend — only in full-grown view */}
          {state.viewMode === 'fullgrown' && (
            <div className="absolute top-4 right-4 z-10 pointer-events-none bg-white/80 dark:bg-midnight-green/80 backdrop-blur-sm rounded-xl border border-sage/15 dark:border-sage-dark/20" style={{ padding: '10px 14px' }}>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-sage-dark/50 dark:text-sage/40" style={{ marginBottom: 8 }}>Height</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {[
                  { color: '#8B6AAE', label: "Climbing (5'+)", width: 3 },
                  { color: '#C17644', label: "Tall (3-5')", width: 2.5 },
                  { color: '#D4A24E', label: "Medium (1.5-3')", width: 2 },
                  { color: '#8B9E7E', label: "Low (under 1.5')", width: 1.5 },
                ].map(tier => (
                  <div key={tier.label} className="flex items-center" style={{ gap: 8 }}>
                    <div className="rounded-full" style={{ width: 14, height: 14, border: `${tier.width}px solid ${tier.color}`, opacity: 0.5 }} />
                    <span className="text-[10px] text-sage-dark/60 dark:text-sage/50">{tier.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compass rose — rotated to show true north relative to the grid */}
          <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
            <svg width="70" height="78" viewBox="-35 -35 70 78">
              <g transform={`rotate(${plotRotationDeg || 0})`}>
              {/* Sun rays from south — where sun shines from in N hemisphere */}
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
              <text x={0} y={38} textAnchor="middle" fontSize={7} fontFamily="Outfit" fontWeight={500} fill="#D4A24E" opacity={0.7}>☀ sun</text>
              </g>
            </svg>
          </div>

          {/* Status bar */}
          {(placingItem || movingItem) && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-forest/90 dark:bg-midnight-sage/90 text-cream px-5 py-2 rounded-xl text-xs font-medium shadow-lg shadow-black/10 pointer-events-none backdrop-blur-sm border border-cream/10">
              {placingItem
                ? 'Click to place · Click again for more · Esc to stop'
                : 'Drag to move · Release to place'}
            </div>
          )}

          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            onClick={handleCanvasClick}
            style={{
              cursor: placingItem ? 'copy' : isPanning ? 'grabbing' : movingItem ? 'grabbing' : drawingPath ? 'crosshair' : 'grab',
            }}
          >
            <PlantFilters />

            <g transform={`translate(${panOffset.x},${panOffset.y}) scale(${zoom})`}>
              {/* Garden background */}
              <rect
                x={0} y={0} width={svgW} height={svgH}
                fill="#E8DFC8" rx={6} className="garden-bg"
              />

              {/* Plot polygon outline — shows actual angled shape from the yard */}
              {activePlot.shape && activePlot.shape.length >= 3 && (() => {
                const xs = activePlot.shape.map(p => p.x);
                const ys = activePlot.shape.map(p => p.y);
                const minX = Math.min(...xs), minY = Math.min(...ys);
                const points = activePlot.shape.map(p =>
                  `${(p.x - minX) * CELL_SIZE * 2},${(p.y - minY) * CELL_SIZE * 2}`
                ).join(' ');
                return (
                  <polygon
                    points={points}
                    fill="none"
                    stroke="#C17644"
                    strokeWidth={1.5}
                    strokeDasharray="6 3"
                    opacity={0.5}
                    strokeLinejoin="round"
                  />
                );
              })()}

              {/* Grid lines */}
              {Array.from({ length: gridW + 1 }).map((_, i) => (
                <line key={`v${i}`} x1={i * CELL_SIZE} y1={0} x2={i * CELL_SIZE} y2={svgH}
                  stroke="#8B9E7E" strokeWidth={i % 2 === 0 ? 0.5 : 0.2} opacity={i % 2 === 0 ? 0.25 : 0.12} />
              ))}
              {Array.from({ length: gridH + 1 }).map((_, i) => (
                <line key={`h${i}`} x1={0} y1={i * CELL_SIZE} x2={svgW} y2={i * CELL_SIZE}
                  stroke="#8B9E7E" strokeWidth={i % 2 === 0 ? 0.5 : 0.2} opacity={i % 2 === 0 ? 0.25 : 0.12} />
              ))}

              {/* Quadrant bed dividers */}
              {isQuadrantView && quadrantLayout && (() => {
                // Draw each bed as a filled rect, leaving gaps as the background shows through
                // First, fill entire area with gap color (walking path)
                return (
                  <g>
                    <rect x={0} y={0} width={svgW} height={svgH} fill="#C4B69A" rx={6} opacity={0.4} className="garden-bg" />
                    {quadrantLayout.map(q => (
                      <rect
                        key={q.plot.id}
                        x={q.offsetX * CELL_SIZE}
                        y={q.offsetY * CELL_SIZE}
                        width={q.cellsW * CELL_SIZE}
                        height={q.cellsH * CELL_SIZE}
                        fill="#E8DFC8"
                        stroke="#A89878"
                        strokeWidth={1.5}
                        rx={4}
                      />
                    ))}
                    {/* Bed labels */}
                    {quadrantLayout.map(q => {
                      const lx = (q.offsetX + q.cellsW / 2) * CELL_SIZE;
                      const ly = (q.offsetY + 1) * CELL_SIZE;
                      if (renamingBedId === q.plot.id) {
                        return (
                          <foreignObject
                            key={`label-${q.plot.id}`}
                            x={lx - 50} y={ly - 14}
                            width={100} height={22}
                          >
                            <input
                              type="text"
                              defaultValue={q.plot.name}
                              autoFocus
                              style={{
                                width: '100%', textAlign: 'center', fontSize: 9,
                                fontFamily: 'Outfit, sans-serif', fontWeight: 500,
                                background: 'rgba(255,255,255,0.9)', border: '1px solid #8B9E7E',
                                borderRadius: 4, padding: '1px 4px', outline: 'none',
                                color: '#3A5A2A',
                              }}
                              onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setRenamingBedId(null); }}
                              onBlur={(e) => {
                                const name = e.target.value.trim();
                                if (name && name !== q.plot.name) {
                                  dispatch({ type: 'UPDATE_PLOT_NAME', payload: { id: q.plot.id, name } });
                                }
                                setRenamingBedId(null);
                              }}
                            />
                          </foreignObject>
                        );
                      }
                      return (
                        <text
                          key={`label-${q.plot.id}`}
                          x={lx}
                          y={ly}
                          textAnchor="middle"
                          fontSize={9}
                          fill="#8B9E7E"
                          opacity={0.5}
                          fontFamily="Outfit, sans-serif"
                          fontWeight={500}
                          style={{ cursor: 'pointer' }}
                          onDoubleClick={(e) => { e.stopPropagation(); setRenamingBedId(q.plot.id); }}
                        >
                          {q.plot.name}
                        </text>
                      );
                    })}
                  </g>
                );
              })()}

              {/* Foot markers */}
              {Array.from({ length: plotWidthFt + 1 }).map((_, i) => (
                <text key={`ft-x-${i}`} x={i * CELL_SIZE * 2} y={-4} textAnchor="middle"
                  fontSize={7} fill="#8B9E7E" opacity={0.6} fontFamily="Outfit, sans-serif">{i}'</text>
              ))}
              {Array.from({ length: plotHeightFt + 1 }).map((_, i) => (
                <text key={`ft-y-${i}`} x={-6} y={i * CELL_SIZE * 2 + 3} textAnchor="end"
                  fontSize={7} fill="#8B9E7E" opacity={0.6} fontFamily="Outfit, sans-serif">{i}'</text>
              ))}

              {/* Placed elements */}
              {(isQuadrantView ? quadrantLayout.flatMap(q =>
                q.plot.elements.map(el => ({ ...el, _plotId: q.plot.id, _offsetX: q.offsetX, _offsetY: q.offsetY }))
              ) : activePlot.elements.map(el => ({ ...el, _plotId: activePlot.id, _offsetX: 0, _offsetY: 0 }))).map(elem => {
                // Drawn path elements
                if (elem.drawnPath) {
                  const dp = elem.drawnPath;
                  const isSelected = selectedId === elem.id;
                  const handles = dp.handles || new Array(dp.points.length - 1).fill(null);
                  const d = buildPath(dp.points, handles);
                  if (!d) return null;
                  return (
                    <g key={elem.id}
                      onMouseDown={(e) => {
                        if (draggingPathPoint !== null) return;
                        handleItemMouseDown('element', elem.id, e);
                      }}
                      style={{ cursor: 'grab' }}
                    >
                      {/* Path border/stroke */}
                      <path d={d} fill="none" stroke={dp.borderColor} strokeWidth={dp.pathWidth * CELL_SIZE / 6 + 2}
                        strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
                      {/* Path fill */}
                      <path d={d} fill="none" stroke={dp.color} strokeWidth={dp.pathWidth * CELL_SIZE / 6}
                        strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
                      {/* Selection highlight */}
                      {isSelected && (
                        <path d={d} fill="none" stroke="#C17644" strokeWidth={dp.pathWidth * CELL_SIZE / 6 + 6}
                          strokeLinecap="round" strokeLinejoin="round" opacity={0.2} strokeDasharray="6 3" />
                      )}
                      {/* Invisible wider hit area for easier clicking */}
                      <path d={d} fill="none" stroke="transparent" strokeWidth={Math.max(20, dp.pathWidth * CELL_SIZE / 6 + 10)}
                        strokeLinecap="round" strokeLinejoin="round" />
                      {/* Waypoint + curve handle editing when selected */}
                      {isSelected && !movingItem && (
                        <>
                          {/* Curve handles — drag midpoint to bend a segment */}
                          {dp.points.slice(0, -1).map((pt, i) => {
                            const next = dp.points[i + 1];
                            const h = handles[i];
                            const mx = h ? h.x : (pt.x + next.x) / 2;
                            const my = h ? h.y : (pt.y + next.y) / 2;
                            return (
                              <g key={`ch-${i}`}>
                                {/* Line from midpoint to handle if curved */}
                                {h && (
                                  <line x1={(pt.x + next.x) / 2} y1={(pt.y + next.y) / 2} x2={h.x} y2={h.y}
                                    stroke="#C17644" strokeWidth={0.8} opacity={0.4} strokeDasharray="3 2" />
                                )}
                                <circle
                                  cx={mx} cy={my} r={h ? 4.5 : 3.5}
                                  fill={h ? '#E8883A' : 'white'} stroke="#C17644" strokeWidth={1.5}
                                  opacity={h ? 0.9 : 0.6}
                                  style={{ cursor: 'move' }}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    // Use negative indices to indicate curve handles
                                    setDraggingPathPoint(-(i + 1));
                                  }}
                                />
                              </g>
                            );
                          })}
                          {/* Waypoints */}
                          {dp.points.map((pt, i) => (
                            <circle
                              key={`wp-${i}`}
                              cx={pt.x} cy={pt.y} r={5}
                              fill="#C17644" stroke="white" strokeWidth={1.5}
                              style={{ cursor: 'move' }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setDraggingPathPoint(i);
                              }}
                            />
                          ))}
                        </>
                      )}
                    </g>
                  );
                }

                const elemData = getElementById(elem.elementId);
                if (!elemData) return null;
                const rawPos = getElementPosition(elem);
                const pos = { x: rawPos.x + elem._offsetX * CELL_SIZE, y: rawPos.y + elem._offsetY * CELL_SIZE, w: rawPos.w, h: rawPos.h };
                const isSelected = selectedId === elem.id;
                return (
                  <g key={elem.id}
                    onMouseDown={(e) => handleItemMouseDown('element', elem.id, e)}
                    style={{ cursor: movingItem?.id === elem.id ? 'grabbing' : 'grab' }}
                  >
                    <ElementSVG
                      element={elemData}
                      x={pos.x} y={pos.y}
                      width={pos.w} height={pos.h}
                      cellSize={CELL_SIZE}
                      isSelected={isSelected}
                      polygon={elem.polygon}
                    />
                    {/* Resize handle — bottom-right corner */}
                    {isSelected && !movingItem && (
                      <g onMouseDown={(e) => handleResizeMouseDown(elem.id, e)}
                        style={{ cursor: 'nwse-resize' }}>
                        {/* Visible handle */}
                        <rect
                          x={pos.x + pos.w - 8} y={pos.y + pos.h - 8}
                          width={10} height={10} rx={2}
                          fill="#C17644" opacity={0.9}
                        />
                        {/* Arrow icon */}
                        <line x1={pos.x + pos.w - 5} y1={pos.y + pos.h - 2}
                          x2={pos.x + pos.w - 1} y2={pos.y + pos.h - 2}
                          stroke="white" strokeWidth={1.5} />
                        <line x1={pos.x + pos.w - 2} y1={pos.y + pos.h - 5}
                          x2={pos.x + pos.w - 2} y2={pos.y + pos.h - 1}
                          stroke="white" strokeWidth={1.5} />
                        {/* Larger invisible hit area */}
                        <rect
                          x={pos.x + pos.w - 12} y={pos.y + pos.h - 12}
                          width={18} height={18}
                          fill="transparent" style={{ cursor: 'nwse-resize' }}
                        />
                      </g>
                    )}
                    {/* Move hint */}
                    {isSelected && !movingItem && (
                      <g opacity={0.7}>
                        <rect x={pos.x + pos.w / 2 - 8} y={pos.y - 14} width={16} height={12} rx={3} fill="#C17644" />
                        <text x={pos.x + pos.w / 2} y={pos.y - 5.5} textAnchor="middle"
                          fontSize={7} fill="white" fontFamily="Outfit">drag</text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Polygon vertex editing overlay */}
              {editingElementShape && (() => {
                const el = activePlot.elements.find(el => el.id === editingElementShape);
                if (!el?.polygon) return null;
                return (
                  <g>
                    {/* Vertex dots */}
                    {el.polygon.map((pt, i) => (
                      <circle
                        key={`v-${i}`}
                        cx={pt.x} cy={pt.y} r={5}
                        fill="#C17644" stroke="white" strokeWidth={1.5}
                        style={{ cursor: 'move' }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setDraggingVertex({ elemId: el.id, vertexIndex: i });
                        }}
                      />
                    ))}
                    {/* Edge midpoints — click to add vertex */}
                    {el.polygon.map((pt, i) => {
                      const next = el.polygon[(i + 1) % el.polygon.length];
                      const mx = (pt.x + next.x) / 2;
                      const my = (pt.y + next.y) / 2;
                      return (
                        <circle
                          key={`mid-${i}`}
                          cx={mx} cy={my} r={4}
                          fill="white" stroke="#C17644" strokeWidth={1.5}
                          opacity={0.7}
                          style={{ cursor: 'copy' }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const newPoly = [...el.polygon];
                            newPoly.splice(i + 1, 0, { x: mx, y: my });
                            dispatch({ type: 'UPDATE_PLOT_ELEMENT_POLYGON', payload: { plotId: activePlot.id, id: el.id, polygon: newPoly } });
                            setDraggingVertex({ elemId: el.id, vertexIndex: i + 1 });
                          }}
                        />
                      );
                    })}
                  </g>
                );
              })()}

              {/* Placed plants */}
              {(isQuadrantView ? quadrantLayout.flatMap(q =>
                q.plot.plants.map(p => ({ ...p, _plotId: q.plot.id, _offsetX: q.offsetX, _offsetY: q.offsetY }))
              ) : activePlot.plants.map(p => ({ ...p, _plotId: activePlot.id, _offsetX: 0, _offsetY: 0 }))).map(p => {
                const plantData = getPlantById(p.plantId);
                if (!plantData) return null;
                const rawPos = getPlantPosition(p);
                const pos = { x: rawPos.x + p._offsetX * CELL_SIZE, y: rawPos.y + p._offsetY * CELL_SIZE };
                const isSelected = selectedId === p.id;
                const isWantItem = state.seedInventory.some(item => item.plantId === p.plantId && item.type === 'want') &&
                  !state.seedInventory.some(item => item.plantId === p.plantId && (item.type === 'seed' || item.type === 'start' || item.type === 'plant'));
                return (
                  <g key={p.id}
                    onMouseDown={(e) => handleItemMouseDown('plant', p.id, e)}
                    style={{ cursor: movingItem?.id === p.id ? 'grabbing' : 'grab', opacity: isWantItem ? 0.5 : 1 }}
                  >
                    {/* Invisible hit area for easier grabbing */}
                    <circle
                      cx={pos.x + CELL_SIZE / 2} cy={pos.y + CELL_SIZE / 2}
                      r={CELL_SIZE * 0.8}
                      fill="transparent"
                    />
                    <PlantSVG
                      plant={plantData}
                      viewMode={state.viewMode}
                      cellSize={CELL_SIZE}
                      x={pos.x} y={pos.y}
                      isSelected={isSelected}
                      companionStatus={companionMap[p.id]}
                    />
                    {/* Want indicator — dashed circle */}
                    {isWantItem && (
                      <circle
                        cx={pos.x + CELL_SIZE / 2} cy={pos.y + CELL_SIZE / 2}
                        r={CELL_SIZE * 0.6}
                        fill="none" stroke="#6A8EAE" strokeWidth={1.5} strokeDasharray="4 3"
                        opacity={0.8}
                      />
                    )}
                    {/* Variety label */}
                    {p.variety && (
                      <text
                        x={pos.x + CELL_SIZE / 2}
                        y={pos.y + CELL_SIZE + (state.viewMode === 'fullgrown' ? (plantData.spreadIn / 6) * CELL_SIZE / 2 + 22 : 20)}
                        textAnchor="middle"
                        fontSize={7}
                        fontFamily="Outfit, sans-serif"
                        fontWeight={400}
                        fontStyle="italic"
                        fill="#C17644"
                        opacity={0.7}
                      >
                        '{p.variety}'
                      </text>
                    )}
                    {/* Spacing warning */}
                    {spacingWarnings.has(p.id) && (
                      <g style={{ pointerEvents: 'none' }}>
                        <circle
                          cx={pos.x + CELL_SIZE / 2} cy={pos.y + CELL_SIZE / 2}
                          r={CELL_SIZE * 0.7}
                          fill="none" stroke="#C4544A" strokeWidth={1.5} strokeDasharray="3 2"
                          opacity={0.7}
                        />
                        <circle
                          cx={pos.x + CELL_SIZE - 2} cy={pos.y + 2}
                          r={5} fill="#C4544A"
                        />
                        <text
                          x={pos.x + CELL_SIZE - 2} y={pos.y + 5.5}
                          textAnchor="middle" fontSize={8} fontWeight={700}
                          fill="#FDF6E9" fontFamily="Outfit, sans-serif"
                        >!</text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Drawing path preview */}
              {drawingPath && drawingPath.points.length > 0 && (
                <g style={{ pointerEvents: 'none' }}>
                  {drawingPath.points.length >= 2 && (
                    <>
                      <path d={buildPath(drawingPath.points)} fill="none"
                        stroke={drawingPath.borderColor} strokeWidth={drawingPath.pathWidth * CELL_SIZE / 6 + 2}
                        strokeLinecap="round" strokeLinejoin="round" opacity={0.4} />
                      <path d={buildPath(drawingPath.points)} fill="none"
                        stroke={drawingPath.color} strokeWidth={drawingPath.pathWidth * CELL_SIZE / 6}
                        strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
                    </>
                  )}
                  {drawingPath.points.map((pt, i) => (
                    <circle key={i} cx={pt.x} cy={pt.y} r={4}
                      fill="#C17644" stroke="white" strokeWidth={1.5} opacity={0.8} />
                  ))}
                </g>
              )}

              {/* Placement preview */}
              {placingItem && placePreviewPos && (
                <g opacity={0.5} style={{ pointerEvents: 'none' }}>
                  {placingItem.type === 'plant' ? (() => {
                    const plant = getPlantById(placingItem.id);
                    return plant ? (
                      <PlantSVG plant={plant} viewMode={state.viewMode} cellSize={CELL_SIZE}
                        x={placePreviewPos.x} y={placePreviewPos.y} isSelected={false} companionStatus={null} />
                    ) : null;
                  })() : (() => {
                    const elem = getElementById(placingItem.id);
                    return elem ? (
                      <ElementSVG element={elem} x={placePreviewPos.x} y={placePreviewPos.y}
                        width={Math.ceil(elem.widthIn / 6) * CELL_SIZE}
                        height={Math.ceil(elem.heightIn / 6) * CELL_SIZE}
                        cellSize={CELL_SIZE} isSelected={false} />
                    ) : null;
                  })()}
                </g>
              )}
            </g>
          </svg>
        </div>

        {/* Info panel at bottom */}
        <AnimatePresence>
          {selectedInfo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-sage/10 dark:border-sage-dark/15 bg-white/90 dark:bg-midnight-green/90 backdrop-blur-md overflow-hidden"
            >
              <div className="flex items-center" style={{ padding: '18px 32px', gap: 24 }}>
                {selectedInfo.data && (
                  <>
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-sm"
                      style={{ backgroundColor: (selectedInfo.data.color || '#888') + '18' }}
                    >
                      {selectedInfo.data.emoji || '🏗️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-forest-deep dark:text-cream leading-tight">
                        {selectedInfo.data.name}
                      </div>
                      <div className="text-[10px] text-sage-dark/70 dark:text-sage/60 mt-0.5">
                        {selectedType === 'plant'
                          ? `${selectedInfo.data.spacingIn}" spacing · ${selectedInfo.data.spreadIn}" spread · ${Math.round(selectedInfo.data.heightIn / 12)}' tall · ${selectedInfo.data.daysToMaturity}d to harvest · Deer: ${selectedInfo.data.deerResistance}/5`
                          : selectedInfo.data.description
                        }
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="badge bg-sage/8 dark:bg-sage/12 text-sage-dark/60 dark:text-sage/60">
                        <Move className="w-3 h-3" /> Drag to move
                      </span>
                      {selectedType === 'element' && !editingElementShape && (
                        <span className="badge bg-terra/8 text-terra/80">
                          <GripVertical className="w-3 h-3" /> Corner to resize
                        </span>
                      )}
                      {selectedType === 'element' && selectedInfo.data?.polygonEditable && (
                        <button
                          onClick={() => {
                            const el = activePlot.elements.find(el => el.id === selectedId);
                            if (!el) return;
                            if (editingElementShape === el.id) {
                              setEditingElementShape(null);
                              setDraggingVertex(null);
                            } else {
                              // Initialize polygon from bounding box if not set
                              if (!el.polygon) {
                                const pos = getElementPosition(el);
                                const poly = [
                                  { x: pos.x, y: pos.y },
                                  { x: pos.x + pos.w, y: pos.y },
                                  { x: pos.x + pos.w, y: pos.y + pos.h },
                                  { x: pos.x, y: pos.y + pos.h },
                                ];
                                dispatch({ type: 'UPDATE_PLOT_ELEMENT_POLYGON', payload: { plotId: activePlot.id, id: el.id, polygon: poly } });
                              }
                              setEditingElementShape(el.id);
                            }
                          }}
                          className={`badge transition-colors ${
                            editingElementShape === selectedId
                              ? 'bg-terra text-cream'
                              : 'bg-terra/8 text-terra/80 hover:bg-terra/15'
                          }`}
                        >
                          <GripVertical className="w-3 h-3" /> {editingElementShape === selectedId ? 'Done Shaping' : 'Edit Shape'}
                        </button>
                      )}
                    </div>
                    {selectedType === 'plant' && selectedInfo.data.companions?.length > 0 && (
                      <div className="text-[10px] text-sage-dark/70 dark:text-sage/60 shrink-0 max-w-[200px]">
                        <span className="font-medium text-sage">Companions:</span>{' '}
                        {selectedInfo.data.companions.map(id => getPlantById(id)?.name || id).slice(0, 4).join(', ')}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recommendations drawer */}
        {(() => {
          const tips = generateRecommendations(activePlot.plants, activePlot.elements, state.zone);
          if (tips.length === 0 && !showTips) return null;
          return (
            <div className="border-t border-sage/10 dark:border-sage-dark/15 bg-white/95 dark:bg-midnight-green/95 backdrop-blur-sm">
              <button
                onClick={() => setShowTips(!showTips)}
                className="w-full flex items-center justify-between hover:bg-sage/5 dark:hover:bg-sage/5 transition-colors"
                style={{ padding: '10px 28px' }}
              >
                <span className="text-xs font-medium text-forest-deep dark:text-cream flex items-center" style={{ gap: 8 }}>
                  <Wand2 className="w-3.5 h-3.5 text-terra" />
                  {tips.length} Recommendation{tips.length !== 1 ? 's' : ''}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-sage-dark/50 transition-transform duration-200 ${showTips ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showTips && tips.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="overflow-y-auto border-t border-sage/8 dark:border-sage-dark/12" style={{ maxHeight: 200, padding: '12px 28px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {tips.map((tip, i) => (
                          <div
                            key={i}
                            className="flex items-start rounded-xl bg-sage/5 dark:bg-sage/8 border border-sage/10 dark:border-sage-dark/15"
                            style={{ padding: '10px 14px', gap: 10 }}
                          >
                            <span className="text-sm leading-none shrink-0" style={{ marginTop: 1 }}>{tip.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-semibold text-forest-deep dark:text-cream">{tip.title}</div>
                              <div className="text-[10px] text-sage-dark/60 dark:text-sage/50" style={{ marginTop: 2 }}>{tip.description}</div>
                            </div>
                            {tip.plantId && (() => {
                              const inInventory = state.seedInventory.some(item => item.plantId === tip.plantId);
                              const tipPlant = getPlantById(tip.plantId);
                              return (
                                <div className="flex items-center shrink-0" style={{ gap: 6 }}>
                                  {!inInventory && (
                                    <button
                                      onClick={() => dispatch({ type: 'ADD_TO_INVENTORY', payload: { plantId: tip.plantId, type: 'want', variety: '' } })}
                                      className="flex items-center rounded-lg text-[10px] font-medium bg-bloom-blue/10 text-bloom-blue hover:bg-bloom-blue/20 border border-bloom-blue/15 transition-all"
                                      style={{ padding: '4px 10px', gap: 4 }}
                                      title="Add to want list"
                                    >
                                      <ShoppingCart className="w-3 h-3" /> Want
                                    </button>
                                  )}
                                  {tipPlant && (
                                    <button
                                      onClick={() => {
                                        setPlacingItem({ type: 'plant', id: tip.plantId });
                                        setSelectedId(null);
                                        setSelectedType(null);
                                        setShowTips(false);
                                      }}
                                      className="flex items-center rounded-lg text-[10px] font-medium bg-sage/10 text-forest-deep dark:text-cream hover:bg-sage/20 border border-sage/15 transition-all"
                                      style={{ padding: '4px 10px', gap: 4 }}
                                      title="Place on plot"
                                    >
                                      <Plus className="w-3 h-3" /> Place
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
