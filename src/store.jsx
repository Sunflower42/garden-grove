// Simple state management using React context + useReducer
import { createContext, useContext, useReducer, useEffect, useRef, useState } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'garden-grove-state';

const defaultGardenPlot = {
  id: 'kitchen-garden',
  name: 'Kitchen Garden',
  icon: '🥬',
  widthFt: 12,
  heightFt: 8,
  yardX: 20,  // position on the yard in feet
  yardY: 25,
  plants: [],    // { id, plantId, x, y } — x,y in grid cells (each cell = 6 inches)
  elements: [],  // { id, elementId, x, y, width, height }
};

const initialState = {
  // Setup
  zipCode: '',
  zone: null,
  lastFrostMMDD: null,  // stored as "MM-DD" string for timezone safety
  firstFrostMMDD: null,
  soilType: 'loam',
  sunExposure: 'full',
  onboardingComplete: false,

  // Yard dimensions
  yardWidthFt: 80,
  yardHeightFt: 60,
  yardPolygon: null, // [{x, y}] in feet — null means rectangle
  housePolygon: null, // [{x, y}] in feet — outline of the house
  houseFeatures: [], // [{ id, type: 'door'|'window'|'garage-door', edgeIndex, t, widthFt }]

  // Yard-level elements (paths, pots, etc.) — positioned in yard-feet coords
  yardElements: [], // [{ id, elementId, x, y, width, height }]

  // Garden plots — positioned within the yard
  plots: [],
  activePlotId: null,       // null = yard overview, string = inside a plot
  editingPlotId: null,      // which plot is selected on the yard view

  // Seed inventory
  seedInventory: [], // [{ id, plantId, type: 'seed'|'start'|'plant'|'want', variety: string }]

  // UI state
  darkMode: false,
  viewMode: 'planted', // 'planted' or 'fullgrown'
  activeView: 'planner', // 'planner', 'calendar', 'inventory', 'recommendations'
  selectedPlantId: null,
  selectedElementId: null,
  dragItem: null,
};

// Detect and tag quadrant garden groups that don't have a quadrantGroupId yet
function migrateQuadrantGroups(plots) {
  if (!Array.isArray(plots)) return plots;
  const ungrouped = plots.filter(p => p && !p.quadrantGroupId);
  // Match by name containing "Quadrant"
  const candidates = ungrouped.filter(p => p.name && /quadrant/i.test(p.name));
  // Group in sets of 4
  const remaining = [...candidates];
  while (remaining.length >= 4) {
    const group = remaining.splice(0, 4);
    const groupId = `quad-migrated-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    plots = plots.map(p => group.includes(p) ? { ...p, quadrantGroupId: groupId } : p);
  }
  return plots;
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate old lastFrost/firstFrost string format → MMDD
      if (parsed.lastFrost && !parsed.lastFrostMMDD) {
        // old format was "2026-05-01" → extract "05-01"
        const match = parsed.lastFrost.match(/\d{4}-(\d{2}-\d{2})/);
        if (match) parsed.lastFrostMMDD = match[1];
        delete parsed.lastFrost;
      }
      if (parsed.firstFrost && !parsed.firstFrostMMDD) {
        const match = parsed.firstFrost.match(/\d{4}-(\d{2}-\d{2})/);
        if (match) parsed.firstFrostMMDD = match[1];
        delete parsed.firstFrost;
      }
      // Migrate plots to have yardX/yardY if missing
      if (parsed.plots) {
        parsed.plots = parsed.plots.map((p, i) => ({
          yardX: 15 + i * 5,
          yardY: 20 + i * 5,
          ...p,
        }));
      }
      // Migrate: default activePlotId to null (yard view) on first load
      if (!parsed.yardWidthFt) {
        parsed.yardWidthFt = 80;
        parsed.yardHeightFt = 60;
        parsed.activePlotId = null;
      }
      // Migrate: remove default kitchen-garden if it has no plants/elements
      if (parsed.plots) {
        parsed.plots = parsed.plots.filter(p =>
          p.id !== 'kitchen-garden' || p.plants.length > 0 || p.elements.length > 0
        );
        // Migrate: add shape to plots that don't have one, and always
        // recalculate widthFt/heightFt from shape to fix stale values
        parsed.plots = parsed.plots.map(p => {
          if (!p.shape) {
            const x = p.yardX || 0, y = p.yardY || 0;
            p = {
              ...p,
              shape: [
                { x, y },
                { x: x + p.widthFt, y },
                { x: x + p.widthFt, y: y + p.heightFt },
                { x, y: y + p.heightFt },
              ],
            };
          }
          // Recalculate using oriented bounding box
          const pts = p.shape;
          const xs = pts.map(pt => pt.x);
          const ys = pts.map(pt => pt.y);
          // Find longest edge for primary axis
          let maxLen = 0, bDx = 1, bDy = 0;
          for (let i = 0; i < pts.length; i++) {
            const j = (i + 1) % pts.length;
            const dx = pts[j].x - pts[i].x, dy = pts[j].y - pts[i].y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > maxLen) { maxLen = len; bDx = dx / len; bDy = dy / len; }
          }
          const pDx = -bDy, pDy = bDx;
          let minA = Infinity, maxA = -Infinity, minP = Infinity, maxP = -Infinity;
          for (const pt of pts) {
            const a = pt.x * bDx + pt.y * bDy;
            const pp = pt.x * pDx + pt.y * pDy;
            minA = Math.min(minA, a); maxA = Math.max(maxA, a);
            minP = Math.min(minP, pp); maxP = Math.max(maxP, pp);
          }
          const obbLen = Math.max(2, Math.round(maxA - minA));
          const obbWid = Math.max(2, Math.round(maxP - minP));
          return {
            ...p,
            yardX: Math.round(Math.min(...xs)),
            yardY: Math.round(Math.min(...ys)),
            widthFt: Math.max(obbLen, obbWid),
            heightFt: Math.min(obbLen, obbWid),
          };
        });
      }
      // Migrate: auto-detect quadrant groups for existing quadrant plots
      if (parsed.plots) {
        parsed.plots = migrateQuadrantGroups(parsed.plots);
      }
      return { ...initialState, ...parsed };
    }
  } catch (err) {
    console.error('Garden Grove: Failed to load state:', err);
    // Try to return saved data without migrations
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...initialState, ...parsed };
      }
    } catch {}
  }
  return initialState;
}

function saveState(state) {
  try {
    const toSave = { ...state };
    delete toSave.dragItem;
    delete toSave.selectedPlantId;
    delete toSave.selectedElementId;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {}
}

function cleanStateForSave(state) {
  const toSave = { ...state };
  delete toSave.dragItem;
  delete toSave.selectedPlantId;
  delete toSave.selectedElementId;
  // Don't store UI-only state in cloud
  delete toSave.activeView;
  return toSave;
}

let saveTimer = null;
function debouncedCloudSave(userId, state) {
  if (!supabase || !userId) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await supabase.from('gardens').upsert({
        user_id: userId,
        state: cleanStateForSave(state),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    } catch (err) {
      console.error('Garden Grove: Cloud save failed:', err);
    }
  }, 2000);
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_SETUP': {
      return { ...state, ...action.payload, onboardingComplete: true };
    }
    case 'SET_DARK_MODE':
      return { ...state, darkMode: action.payload };
    case 'SET_VIEW':
      return { ...state, activeView: action.payload };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    case 'SET_ACTIVE_PLOT':
      return { ...state, activePlotId: action.payload };
    case 'SET_DRAG_ITEM':
      return { ...state, dragItem: action.payload };
    case 'SELECT_PLANT':
      return { ...state, selectedPlantId: action.payload, selectedElementId: null };
    case 'SELECT_ELEMENT':
      return { ...state, selectedElementId: action.payload, selectedPlantId: null };
    case 'DESELECT':
      return { ...state, selectedPlantId: null, selectedElementId: null };

    case 'ADD_TO_INVENTORY': {
      // payload: { plantId, type: 'seed'|'start', variety?: string }
      const entryType = action.payload.type || 'seed';
      const entry = {
        id: `inv-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
        plantId: action.payload.plantId,
        type: entryType,
        variety: action.payload.variety || '',
        varietyInfo: action.payload.varietyInfo || null,
        started: entryType === 'plant' || entryType === 'start',
      };
      return { ...state, seedInventory: [...state.seedInventory, entry] };
    }
    case 'UPDATE_INVENTORY_ITEM': {
      // payload: { id, ...updates }
      return {
        ...state,
        seedInventory: state.seedInventory.map(item => {
          if (item.id !== action.payload.id) return item;
          const updated = { ...item, ...action.payload };
          // Auto-mark started when type is plant or start
          if (action.payload.type === 'plant' || action.payload.type === 'start') {
            updated.started = true;
          }
          return updated;
        }),
      };
    }
    case 'REMOVE_FROM_INVENTORY': {
      // payload: inventory item id
      return {
        ...state,
        seedInventory: state.seedInventory.filter(item => item.id !== action.payload),
      };
    }
    case 'TOGGLE_SEED_STARTED': {
      // payload: inventory item id — toggle the started/planted flag
      return {
        ...state,
        seedInventory: state.seedInventory.map(item =>
          item.id === action.payload ? { ...item, started: !item.started } : item
        ),
      };
    }

    case 'SET_YARD_SIZE':
      return { ...state, yardWidthFt: action.payload.width, yardHeightFt: action.payload.height };
    case 'SET_EDITING_PLOT':
      return { ...state, editingPlotId: action.payload };

    case 'ADD_QUADRANT_GARDEN': {
      // 4 plots arranged around a central open space for a fountain/feature
      const { quadW, quadH, gap, startX, startY } = action.payload;
      const now = Date.now();
      const groupId = `quad-${now}`;
      const labels = [
        { name: 'NW Quadrant', icon: '🌿', dx: 0, dy: 0 },
        { name: 'NE Quadrant', icon: '🌸', dx: quadW + gap, dy: 0 },
        { name: 'SW Quadrant', icon: '🌻', dx: 0, dy: quadH + gap },
        { name: 'SE Quadrant', icon: '🌺', dx: quadW + gap, dy: quadH + gap },
      ];
      const newPlots = labels.map((q, i) => {
        const px = startX + q.dx;
        const py = startY + q.dy;
        return {
          id: `plot-${now + i}`,
          name: q.name,
          icon: q.icon,
          widthFt: quadW,
          heightFt: quadH,
          yardX: px,
          yardY: py,
          quadrantGroupId: groupId,
          shape: [
            { x: px, y: py },
            { x: px + quadW, y: py },
            { x: px + quadW, y: py + quadH },
            { x: px, y: py + quadH },
          ],
          plants: [],
          elements: [],
        };
      });
      return {
        ...state,
        plots: [...state.plots, ...newPlots],
      };
    }
    case 'SCALE_QUADRANT_GROUP': {
      const { groupId, scale } = action.payload;
      const groupPlots = state.plots.filter(p => p.quadrantGroupId === groupId);
      if (groupPlots.length === 0) return state;
      // Find center of the group
      const allPts = groupPlots.flatMap(p => p.shape || []);
      const cx = allPts.reduce((s, pt) => s + pt.x, 0) / allPts.length;
      const cy = allPts.reduce((s, pt) => s + pt.y, 0) / allPts.length;
      return {
        ...state,
        plots: state.plots.map(p => {
          if (p.quadrantGroupId !== groupId) return p;
          const newShape = (p.shape || []).map(pt => ({
            x: parseFloat((cx + (pt.x - cx) * scale).toFixed(2)),
            y: parseFloat((cy + (pt.y - cy) * scale).toFixed(2)),
          }));
          const xs = newShape.map(pt => pt.x);
          const ys = newShape.map(pt => pt.y);
          return {
            ...p,
            shape: newShape,
            yardX: Math.round(Math.min(...xs)),
            yardY: Math.round(Math.min(...ys)),
            widthFt: Math.max(2, Math.round(Math.max(...xs) - Math.min(...xs))),
            heightFt: Math.max(2, Math.round(Math.max(...ys) - Math.min(...ys))),
          };
        }),
      };
    }
    case 'ADD_PLOT': {
      const w = action.payload.widthFt || 10;
      const h = action.payload.heightFt || 8;
      // Use viewport center if provided, otherwise stagger
      const fallbackOffset = state.plots.length * 5;
      const px = action.payload.startX != null ? action.payload.startX : 10 + fallbackOffset;
      const py = action.payload.startY != null ? action.payload.startY : 10 + fallbackOffset;
      const newPlot = {
        id: `plot-${Date.now()}`,
        name: action.payload.name,
        icon: action.payload.icon || '🌱',
        widthFt: w,
        heightFt: h,
        yardX: px,
        yardY: py,
        // Shape as polygon points in yard-feet coordinates
        shape: [
          { x: px, y: py },
          { x: px + w, y: py },
          { x: px + w, y: py + h },
          { x: px, y: py + h },
        ],
        plants: [],
        elements: [],
      };
      return {
        ...state,
        plots: [...state.plots, newPlot],
        editingPlotId: newPlot.id,
      };
    }
    case 'REMOVE_PLOT': {
      const plots = state.plots.filter(p => p.id !== action.payload);
      return {
        ...state,
        plots,
        activePlotId: state.activePlotId === action.payload ? null : state.activePlotId,
        editingPlotId: state.editingPlotId === action.payload ? null : state.editingPlotId,
      };
    }
    case 'UPDATE_PLOT': {
      return {
        ...state,
        plots: state.plots.map(p =>
          p.id === action.payload.id ? { ...p, ...action.payload } : p
        ),
      };
    }
    case 'UPDATE_PLOT_SHAPE': {
      const { id, shape } = action.payload;
      // Recalculate using oriented bounding box
      const xs = shape.map(pt => pt.x);
      const ys = shape.map(pt => pt.y);
      let maxLen = 0, bDx = 1, bDy = 0;
      for (let i = 0; i < shape.length; i++) {
        const j = (i + 1) % shape.length;
        const dx = shape[j].x - shape[i].x, dy = shape[j].y - shape[i].y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > maxLen) { maxLen = len; bDx = dx / len; bDy = dy / len; }
      }
      const pDx = -bDy, pDy = bDx;
      let minA = Infinity, maxA = -Infinity, minP = Infinity, maxP = -Infinity;
      for (const pt of shape) {
        const a = pt.x * bDx + pt.y * bDy;
        const pp = pt.x * pDx + pt.y * pDy;
        minA = Math.min(minA, a); maxA = Math.max(maxA, a);
        minP = Math.min(minP, pp); maxP = Math.max(maxP, pp);
      }
      const obbLen = Math.max(2, Math.round(maxA - minA));
      const obbWid = Math.max(2, Math.round(maxP - minP));
      return {
        ...state,
        plots: state.plots.map(p =>
          p.id !== id ? p : {
            ...p,
            shape,
            yardX: Math.round(Math.min(...xs)),
            yardY: Math.round(Math.min(...ys)),
            widthFt: Math.max(obbLen, obbWid),
            heightFt: Math.min(obbLen, obbWid),
          }
        ),
      };
    }

    case 'PLACE_PLANT': {
      const { plotId, plantId, x, y, variety } = action.payload;
      return {
        ...state,
        plots: state.plots.map(p => {
          if (p.id !== plotId) return p;
          return {
            ...p,
            plants: [...p.plants, { id: `plant-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, plantId, x, y, variety: variety || null }],
          };
        }),
      };
    }
    case 'MOVE_PLANT': {
      const { plotId, id, x, y } = action.payload;
      return {
        ...state,
        plots: state.plots.map(p => {
          if (p.id !== plotId) return p;
          return {
            ...p,
            plants: p.plants.map(pl => pl.id === id ? { ...pl, x, y } : pl),
          };
        }),
      };
    }
    case 'REMOVE_PLANT': {
      const { plotId, id } = action.payload;
      return {
        ...state,
        plots: state.plots.map(p => {
          if (p.id !== plotId) return p;
          return { ...p, plants: p.plants.filter(pl => pl.id !== id) };
        }),
      };
    }

    case 'PLACE_ELEMENT': {
      const { plotId, elementId, x, y, width, height } = action.payload;
      return {
        ...state,
        plots: state.plots.map(p => {
          if (p.id !== plotId) return p;
          return {
            ...p,
            elements: [...p.elements, {
              id: `elem-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
              elementId, x, y, width, height,
            }],
          };
        }),
      };
    }
    case 'MOVE_ELEMENT': {
      const { plotId, id, x, y } = action.payload;
      return {
        ...state,
        plots: state.plots.map(p => {
          if (p.id !== plotId) return p;
          return {
            ...p,
            elements: p.elements.map(el => el.id === id ? { ...el, x, y } : el),
          };
        }),
      };
    }
    case 'RESIZE_ELEMENT': {
      const { plotId, id, width, height } = action.payload;
      return {
        ...state,
        plots: state.plots.map(p => {
          if (p.id !== plotId) return p;
          return {
            ...p,
            elements: p.elements.map(el => el.id === id ? { ...el, width, height } : el),
          };
        }),
      };
    }
    case 'REMOVE_ELEMENT': {
      const { plotId, id } = action.payload;
      return {
        ...state,
        plots: state.plots.map(p => {
          if (p.id !== plotId) return p;
          return { ...p, elements: p.elements.filter(el => el.id !== id) };
        }),
      };
    }

    case 'RERUN_SETUP':
      return { ...state, onboardingComplete: false, onboardingStartStep: 0 };

    case 'EDIT_YARD':
      return { ...state, onboardingComplete: false, onboardingStartStep: 2 };

    // Yard-level elements
    case 'PLACE_YARD_ELEMENT': {
      const { elementId, x, y, width, height } = action.payload;
      const el = {
        id: `yel-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
        elementId, x, y, width, height, rotation: 0,
      };
      return { ...state, yardElements: [...state.yardElements, el] };
    }
    case 'MOVE_YARD_ELEMENT': {
      const { id, x, y } = action.payload;
      return {
        ...state,
        yardElements: state.yardElements.map(el => {
          if (el.id !== id) return el;
          const dx = x - el.x, dy = y - el.y;
          const updated = { ...el, x, y };
          // Also translate polygon vertices if they exist
          if (el.polygon) {
            updated.polygon = el.polygon.map(pt => ({ x: pt.x + dx, y: pt.y + dy }));
          }
          return updated;
        }),
      };
    }
    case 'UPDATE_YARD_ELEMENT': {
      const { id, ...updates } = action.payload;
      return {
        ...state,
        yardElements: state.yardElements.map(el => el.id === id ? { ...el, ...updates } : el),
      };
    }
    case 'REMOVE_YARD_ELEMENT': {
      return {
        ...state,
        yardElements: state.yardElements.filter(el => el.id !== action.payload),
      };
    }
    case 'DUPLICATE_YARD_ELEMENT': {
      const { sourceId, offsetX, offsetY, newId } = action.payload;
      const source = state.yardElements.find(el => el.id === sourceId);
      if (!source) return state;
      const dup = {
        ...source,
        id: newId || `yel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        x: source.x + (offsetX || 2),
        y: source.y + (offsetY || 2),
        polygon: source.polygon
          ? source.polygon.map(pt => ({ x: pt.x + (offsetX || 2), y: pt.y + (offsetY || 2) }))
          : undefined,
      };
      return { ...state, yardElements: [...state.yardElements, dup] };
    }
    case 'REORDER_YARD_ELEMENT': {
      const { id, direction } = action.payload; // 'forward' | 'backward' | 'front' | 'back'
      const idx = state.yardElements.findIndex(el => el.id === id);
      if (idx === -1) return state;
      const arr = [...state.yardElements];
      const [item] = arr.splice(idx, 1);
      if (direction === 'front') {
        arr.push(item);
      } else if (direction === 'back') {
        arr.unshift(item);
      } else if (direction === 'forward' && idx < arr.length) {
        arr.splice(idx + 1, 0, item);
      } else if (direction === 'backward' && idx > 0) {
        arr.splice(idx - 1, 0, item);
      } else {
        arr.splice(idx, 0, item); // no change
      }
      return { ...state, yardElements: arr };
    }
    case 'UPDATE_YARD_ELEMENT_POLYGON': {
      const { id, polygon } = action.payload;
      return {
        ...state,
        yardElements: state.yardElements.map(el => el.id === id ? { ...el, polygon } : el),
      };
    }
    case 'ADD_YARD_ELEMENT_VERTEX': {
      const { id, index, point } = action.payload;
      return {
        ...state,
        yardElements: state.yardElements.map(el => {
          if (el.id !== id || !el.polygon) return el;
          const newPoly = [...el.polygon];
          newPoly.splice(index, 0, point);
          return { ...el, polygon: newPoly };
        }),
      };
    }
    case 'ADD_HOUSE_FEATURE': {
      const { type, edgeIndex, t, widthFt } = action.payload;
      const feat = {
        id: `hf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type, edgeIndex, t, widthFt,
      };
      return { ...state, houseFeatures: [...state.houseFeatures, feat] };
    }
    case 'UPDATE_HOUSE_FEATURE': {
      const { id, ...updates } = action.payload;
      return {
        ...state,
        houseFeatures: state.houseFeatures.map(f => f.id === id ? { ...f, ...updates } : f),
      };
    }
    case 'REMOVE_HOUSE_FEATURE': {
      return {
        ...state,
        houseFeatures: state.houseFeatures.filter(f => f.id !== action.payload),
      };
    }
    case 'UPDATE_HOUSE_POLYGON': {
      return { ...state, housePolygon: action.payload };
    }
    case 'SET_YARD_GEO': {
      return { ...state, yardGeoVertices: action.payload };
    }
    case 'ADD_HOUSE_VERTEX': {
      const { index, point } = action.payload;
      const newPoly = [...state.housePolygon];
      newPoly.splice(index, 0, point);
      return { ...state, housePolygon: newPoly };
    }

    case 'LOAD_CLOUD_STATE': {
      const cloudState = { ...initialState, ...action.payload };
      // Apply quadrant migration to cloud data
      if (Array.isArray(cloudState.plots)) {
        const ungrouped = cloudState.plots.filter(p => p && !p.quadrantGroupId);
        const candidates = ungrouped.filter(p => p.name && /quadrant/i.test(p.name));
        const remaining = [...candidates];
        while (remaining.length >= 4) {
          const group = remaining.splice(0, 4);
          const gid = `quad-cloud-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
          cloudState.plots = cloudState.plots.map(p => group.includes(p) ? { ...p, quadrantGroupId: gid } : p);
        }
      }
      return cloudState;
    }

    case 'RESET':
      localStorage.removeItem(STORAGE_KEY);
      return initialState;

    default:
      return state;
  }
}

// Actions that are UI-only and shouldn't be recorded in undo history
const SKIP_UNDO_ACTIONS = new Set([
  'SET_DARK_MODE', 'SET_VIEW', 'SET_VIEW_MODE', 'SET_ACTIVE_PLOT',
  'SET_DRAG_ITEM', 'SELECT_PLANT', 'DESELECT', 'SET_EDITING_PLOT',
  'LOAD_CLOUD_STATE', 'RESET',
]);

// Actions that happen rapidly during drags — collapse into a single undo entry
const COALESCE_ACTIONS = new Set([
  'MOVE_YARD_ELEMENT', 'UPDATE_PLOT_SHAPE', 'UPDATE_HOUSE_VERTEX',
  'MOVE_HOUSE_FEATURE', 'MOVE_YARD_ELEMENT_POLYGON',
]);

const MAX_UNDO_STACK = 50;

function undoReducer(state, action) {
  try {
    if (action.type === 'UNDO') {
      if (!state.undoStack || state.undoStack.length === 0) return state;
      const prev = state.undoStack[state.undoStack.length - 1];
      return {
        current: { ...prev, darkMode: state.current.darkMode, activeView: state.current.activeView, viewMode: state.current.viewMode },
        undoStack: state.undoStack.slice(0, -1),
        lastAction: null,
      };
    }

    const newCurrent = reducer(state.current, action);
    if (newCurrent === state.current) return state;

    if (SKIP_UNDO_ACTIONS.has(action.type)) {
      return { ...state, current: newCurrent };
    }

    // For coalesce actions, don't push if the previous action was the same type
    // This means a whole drag operation = one undo entry
    if (COALESCE_ACTIONS.has(action.type) && state.lastAction === action.type) {
      return { ...state, current: newCurrent };
    }

    return {
      current: newCurrent,
      undoStack: [...(state.undoStack || []).slice(-(MAX_UNDO_STACK - 1)), state.current],
      lastAction: action.type,
    };
  } catch (err) {
    console.error('Garden Grove: reducer error', action.type, err);
    return state;
  }
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const { user } = useAuth();
  const [undoState, rawDispatch] = useReducer(undoReducer, null, () => ({
    current: loadState(),
    undoStack: [],
    lastAction: null,
  }));
  const state = undoState.current;
  const dispatch = rawDispatch;
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const initialLoadDone = useRef(false);

  // On login, load state from Supabase (merge with local if needed)
  useEffect(() => {
    if (!supabase || !user || initialLoadDone.current) return;
    initialLoadDone.current = true;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('gardens')
          .select('state, updated_at')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          // PGRST116 = no rows found (new user), that's fine
          console.error('Garden Grove: Cloud load failed:', error);
        }

        if (data?.state && Object.keys(data.state).length > 0) {
          // Cloud data exists — use it
          dispatch({ type: 'LOAD_CLOUD_STATE', payload: data.state });
        } else {
          // New user with empty cloud — start fresh
          dispatch({ type: 'RESET' });
        }
      } catch (err) {
        console.error('Garden Grove: Cloud sync error:', err);
      } finally {
        setCloudLoaded(true);
      }
    })();
  }, [user]);

  // Reset load flag on sign out
  useEffect(() => {
    if (!user) {
      initialLoadDone.current = false;
      setCloudLoaded(false);
    }
  }, [user]);

  // Save to localStorage + debounced cloud save
  // IMPORTANT: Don't save to cloud until cloud data has been loaded first,
  // otherwise we'd overwrite cloud data with empty/default state
  useEffect(() => {
    if (cloudLoaded || !user) {
      saveState(state);
    }
    if (user && cloudLoaded) {
      debouncedCloudSave(user.id, state);
    }
  }, [state, user, cloudLoaded]);

  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.darkMode]);

  // Ctrl+Z undo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <StoreContext.Provider value={{ state, dispatch, canUndo: undoState.undoStack.length > 0 }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
