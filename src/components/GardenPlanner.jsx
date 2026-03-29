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
  Maximize2, ZoomIn, ZoomOut, Flower2, Fence, Move, GripVertical, ArrowLeft, Home, Wand2, ShoppingCart, Plus
} from 'lucide-react';
import { suggestLayout } from '../data/layoutSuggester';
import { generateRecommendations } from '../data/recommendations';

const CELL_SIZE = 24; // pixels per 6 inches

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

  // Drag-to-move state
  const [movingItem, setMovingItem] = useState(null); // { type, id, startX, startY, offsetX, offsetY }
  const [movePos, setMovePos] = useState(null);

  // Resize state
  const [resizing, setResizing] = useState(null); // { id, handle: 'se'|'e'|'s', startW, startH, startMouseX, startMouseY }

  const activePlot = state.plots.find(p => p.id === state.activePlotId);
  if (!activePlot) return null;

  // Derive dimensions using oriented bounding box (OBB) so angled plots
  // show their true length × width, not the axis-aligned bounding box.
  // Also compute the rotation angle and transformed outline points.
  const { plotWidthFt, plotHeightFt, plotRotationDeg, plotOutlineLocal } = useMemo(() => {
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
  }, [activePlot.shape, activePlot.widthFt, activePlot.heightFt]);

  const gridW = plotWidthFt * 2;
  const gridH = plotHeightFt * 2;
  const svgW = gridW * CELL_SIZE;
  const svgH = gridH * CELL_SIZE;

  // Companion planting status for selected plant
  const companionMap = useMemo(() => {
    if (!selectedId || selectedType !== 'plant') return {};
    const selectedPlacement = activePlot.plants.find(p => p.id === selectedId);
    if (!selectedPlacement) return {};
    const selectedPlant = getPlantById(selectedPlacement.plantId);
    if (!selectedPlant) return {};
    const map = {};
    activePlot.plants.forEach(p => {
      if (p.id === selectedId) return;
      if (selectedPlant.companions.includes(p.plantId)) map[p.id] = 'good';
      else if (selectedPlant.avoid.includes(p.plantId)) map[p.id] = 'bad';
    });
    return map;
  }, [selectedId, selectedType, activePlot.plants]);

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
    // Middle mouse = pan
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }
    // Right click = cancel
    if (e.button === 2) {
      setPlacingItem(null);
      setPlacePreviewPos(null);
      setMovingItem(null);
      setMovePos(null);
      setResizing(null);
      return;
    }
  }, [panOffset]);

  const handleMouseMove = useCallback((e) => {
    if (isPanning) {
      setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    const svg = toSVG(e.clientX, e.clientY);

    // Resize
    if (resizing) {
      const dx = (e.clientX - resizing.startMouseX) / zoom;
      const dy = (e.clientY - resizing.startMouseY) / zoom;
      const newW = Math.max(1, snapToCell(resizing.startW * CELL_SIZE + dx));
      const newH = Math.max(1, snapToCell(resizing.startH * CELL_SIZE + dy));
      setResizing(prev => ({ ...prev, currentW: newW, currentH: newH }));
      return;
    }

    // Moving item
    if (movingItem) {
      setMovePos({
        x: snapToGrid(svg.x - movingItem.offsetX),
        y: snapToGrid(svg.y - movingItem.offsetY),
      });
      return;
    }

    // Placement preview
    if (placingItem) {
      setPlacePreviewPos({ x: snapToGrid(svg.x), y: snapToGrid(svg.y) });
    }
  }, [isPanning, panStart, resizing, movingItem, placingItem, toSVG, zoom]);

  const handleMouseUp = useCallback((e) => {
    if (e.button === 1) {
      setIsPanning(false);
      return;
    }

    // Commit resize
    if (resizing && resizing.currentW !== undefined) {
      dispatch({
        type: 'RESIZE_ELEMENT',
        payload: {
          plotId: activePlot.id,
          id: resizing.id,
          width: resizing.currentW,
          height: resizing.currentH,
        },
      });
      setResizing(null);
      return;
    }

    // Commit move
    if (movingItem && movePos) {
      const newX = movePos.x / CELL_SIZE;
      const newY = movePos.y / CELL_SIZE;
      if (movingItem.type === 'plant') {
        dispatch({ type: 'MOVE_PLANT', payload: { plotId: activePlot.id, id: movingItem.id, x: newX, y: newY } });
      } else {
        dispatch({ type: 'MOVE_ELEMENT', payload: { plotId: activePlot.id, id: movingItem.id, x: newX, y: newY } });
      }
      setMovingItem(null);
      setMovePos(null);
      return;
    }
  }, [resizing, movingItem, movePos, dispatch, activePlot?.id]);

  const handleCanvasClick = useCallback((e) => {
    // If we're in placement mode, place the item
    if (placingItem && placePreviewPos) {
      const cellX = placePreviewPos.x / CELL_SIZE;
      const cellY = placePreviewPos.y / CELL_SIZE;

      if (placingItem.type === 'plant') {
        dispatch({
          type: 'PLACE_PLANT',
          payload: { plotId: activePlot.id, plantId: placingItem.id, x: cellX, y: cellY, variety: placingItem.variety || null },
        });
      } else {
        const elem = getElementById(placingItem.id);
        if (elem) {
          dispatch({
            type: 'PLACE_ELEMENT',
            payload: {
              plotId: activePlot.id,
              elementId: placingItem.id,
              x: cellX, y: cellY,
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
    }
  }, [placingItem, placePreviewPos, dispatch, activePlot?.id]);

  // Start dragging a placed item to move it
  const handleItemMouseDown = useCallback((type, id, e) => {
    if (placingItem) return; // Don't interfere with placement mode
    e.stopPropagation();
    e.preventDefault();

    const svg = toSVG(e.clientX, e.clientY);
    let itemX, itemY;
    if (type === 'plant') {
      const p = activePlot.plants.find(p => p.id === id);
      itemX = p.x * CELL_SIZE;
      itemY = p.y * CELL_SIZE;
    } else {
      const el = activePlot.elements.find(el => el.id === id);
      itemX = el.x * CELL_SIZE;
      itemY = el.y * CELL_SIZE;
    }

    setSelectedId(id);
    setSelectedType(type);
    setMovingItem({
      type, id,
      offsetX: svg.x - itemX,
      offsetY: svg.y - itemY,
    });
  }, [placingItem, toSVG, activePlot]);

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
    if (selectedType === 'plant') {
      dispatch({ type: 'REMOVE_PLANT', payload: { plotId: activePlot.id, id: selectedId } });
    } else {
      dispatch({ type: 'REMOVE_ELEMENT', payload: { plotId: activePlot.id, id: selectedId } });
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
    if (selectedType === 'plant') {
      const placement = activePlot.plants.find(p => p.id === selectedId);
      if (!placement) return null;
      return { placement, data: getPlantById(placement.plantId) };
    } else {
      const placement = activePlot.elements.find(e => e.id === selectedId);
      if (!placement) return null;
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
            Object.entries(ELEMENT_CATEGORIES).map(([catKey, cat]) => {
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
          )}
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
              <span className="text-base leading-none">{activePlot.icon}</span>
              <h2 className="font-display text-lg font-semibold text-forest-deep dark:text-cream">
                {activePlot.name}
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
                onClick={() => { setZoom(1); setPanOffset({ x: 40, y: 40 }); }}
                style={{ padding: 8 }}
                className="rounded-md hover:bg-sage/10 text-sage-dark dark:text-sage transition-colors"
                title="Reset view"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Suggest Layout */}
            {state.seedInventory.length > 0 && (
              <button
                onClick={() => {
                  const plantIds = state.seedInventory.map(i => i.plantId);
                  const layout = suggestLayout(plantIds, plotWidthFt, plotHeightFt);
                  if (layout.length === 0) return;
                  // Clear existing plants and place suggested ones
                  const confirmed = activePlot.plants.length === 0 || confirm(`This will replace ${activePlot.plants.length} existing plants. Continue?`);
                  if (!confirmed) return;
                  // Remove existing plants
                  for (const p of activePlot.plants) {
                    dispatch({ type: 'REMOVE_PLANT', payload: { plotId: activePlot.id, id: p.id } });
                  }
                  // Place suggested layout
                  for (const placement of layout) {
                    dispatch({
                      type: 'PLACE_PLANT',
                      payload: { plotId: activePlot.id, plantId: placement.plantId, x: placement.x, y: placement.y },
                    });
                  }
                }}
                style={{ padding: '8px 14px', gap: 8 }}
                className="flex items-center rounded-lg text-xs font-medium bg-gradient-to-b from-terra to-terra-dark text-cream hover:brightness-110 transition-all shadow-sm"
              >
                <Wand2 className="w-3.5 h-3.5" /> Suggest Layout
              </button>
            )}

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
          onMouseLeave={() => { setIsPanning(false); }}
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
              cursor: placingItem ? 'copy' : isPanning ? 'grabbing' : movingItem ? 'grabbing' : 'default',
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
              {activePlot.elements.map(elem => {
                const elemData = getElementById(elem.elementId);
                if (!elemData) return null;
                const pos = getElementPosition(elem);
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

              {/* Placed plants */}
              {activePlot.plants.map(p => {
                const plantData = getPlantById(p.plantId);
                if (!plantData) return null;
                const pos = getPlantPosition(p);
                const isSelected = selectedId === p.id;
                const isWantItem = state.seedInventory.some(item => item.plantId === p.plantId && item.type === 'want') &&
                  !state.seedInventory.some(item => item.plantId === p.plantId && (item.type === 'seed' || item.type === 'start'));
                return (
                  <g key={p.id}
                    onMouseDown={(e) => handleItemMouseDown('plant', p.id, e)}
                    style={{ cursor: movingItem?.id === p.id ? 'grabbing' : 'grab', opacity: isWantItem ? 0.5 : 1 }}
                  >
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
                  </g>
                );
              })}

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
                      {selectedType === 'element' && (
                        <span className="badge bg-terra/8 text-terra/80">
                          <GripVertical className="w-3 h-3" /> Corner to resize
                        </span>
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
