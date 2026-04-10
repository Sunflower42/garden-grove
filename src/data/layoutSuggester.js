import { getPlantById } from './plants';

// Generate a natural-looking garden layout that fills every available spot.
// Uses staggered hex-grid placement, interplants companions, puts tall
// plants north, and cycles through all plant types to fill the bed.

export function suggestLayout(plantIds, plotWidthFt, plotHeightFt) {
  if (!plantIds.length || !plotWidthFt || !plotHeightFt) return [];

  const uniqueIds = [...new Set(plantIds)];
  const plants = uniqueIds.map(id => getPlantById(id)).filter(Boolean);
  if (plants.length === 0) return [];

  const gridW = plotWidthFt * 2; // 6-inch cells
  const gridH = plotHeightFt * 2;

  // Spacing in cells
  const spacingCells = (plant) => Math.max(2, Math.ceil((plant.spacingIn || 12) / 6));

  // Sort: tallest first (north), then largest spacing
  const sorted = [...plants].sort((a, b) => {
    const ha = a.heightIn || 24, hb = b.heightIn || 24;
    if (Math.abs(ha - hb) > 12) return hb - ha;
    return spacingCells(b) - spacingCells(a);
  });

  // Build conflict map
  const avoidSet = new Map();
  for (const p of plants) {
    avoidSet.set(p.id, new Set(p.avoid || []));
  }

  // Occupied grid
  const occupied = Array.from({ length: gridH }, () => new Array(gridW).fill(null));

  const markOccupied = (cx, cy, radius, plantId) => {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx >= 0 && nx < gridW && ny >= 0 && ny < gridH) {
          occupied[ny][nx] = plantId;
        }
      }
    }
  };

  const isClear = (cx, cy, radius) => {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || nx >= gridW || ny < 0 || ny >= gridH) return false;
        if (occupied[ny][nx] !== null) return false;
      }
    }
    return true;
  };

  const hasConflictNearby = (cx, cy, plantId, dist) => {
    const avoids = avoidSet.get(plantId);
    if (!avoids || avoids.size === 0) return false;
    for (let dy = -dist; dy <= dist; dy++) {
      for (let dx = -dist; dx <= dist; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || nx >= gridW || ny < 0 || ny >= gridH) continue;
        if (occupied[ny][nx] && avoids.has(occupied[ny][nx])) return true;
      }
    }
    return false;
  };

  const placements = [];

  // Phase 1: Place each plant type in staggered rows, cycling through types
  // to interplant and fill the bed naturally.
  //
  // Strategy: scan top to bottom. For each row, pick the best plant type
  // that should go at this height (tall=top, short=bottom) and hasn't
  // been fully placed yet. Place as many as fit in the row, then move down.

  // Calculate how many rows each plant needs based on spacing
  const plantBudgets = sorted.map(plant => {
    const sp = spacingCells(plant);
    const perRow = Math.max(1, Math.floor((gridW - sp) / sp) + 1);
    const rows = Math.max(1, Math.floor((gridH * 0.8) / sorted.length / sp) + 1);
    return { plant, spacing: sp, target: perRow * rows, placed: 0 };
  });

  // Scan rows top to bottom with staggered placement
  let rowNum = 0;
  let y = 1; // start 1 cell from top edge

  while (y < gridH - 1) {
    // Find the plant type that should go in this row
    // Priority: plant types that still need placing, preferring tall plants at top
    let bestBudget = null;
    let bestScore = -Infinity;
    for (const b of plantBudgets) {
      if (b.placed >= b.target * 3) continue; // allow generous overflow
      const remaining = b.target - b.placed;
      if (remaining <= 0 && b.placed > 0) continue; // skip if fully placed (but allow first placement)
      // Height preference: tall plants at top
      const heightPref = (b.plant.heightIn || 24) > 36
        ? (gridH - y) * 0.5 // tall plants prefer being near top
        : y * 0.3; // short plants prefer bottom
      const needScore = remaining > 0 ? remaining * 2 : 0;
      const score = heightPref + needScore;
      if (score > bestScore) {
        bestScore = score;
        bestBudget = b;
      }
    }

    if (!bestBudget) break;

    const sp = bestBudget.spacing;
    const halfSp = Math.ceil(sp / 2);
    if (y + halfSp > gridH) break;

    // Stagger: offset odd rows by half spacing for hex-grid look
    const xOffset = (rowNum % 2 === 1) ? Math.floor(sp / 2) : 0;

    let placedInRow = 0;
    for (let x = halfSp + xOffset; x <= gridW - halfSp; x += sp) {
      // Add slight random offset for natural look (±1 cell)
      const jitterX = ((x * 7 + y * 13) % 3) - 1;
      const jitterY = ((x * 11 + y * 5) % 3) - 1;
      const px = Math.max(halfSp, Math.min(gridW - halfSp, x + jitterX));
      const py = Math.max(halfSp, Math.min(gridH - halfSp, y + jitterY));

      if (!isClear(px, py, halfSp)) continue;
      if (hasConflictNearby(px, py, bestBudget.plant.id, sp)) continue;

      placements.push({ plantId: bestBudget.plant.id, x: px, y: py });
      markOccupied(px, py, halfSp, bestBudget.plant.id);
      bestBudget.placed++;
      placedInRow++;
    }

    // Move to next row — use smallest spacing of remaining plants for dense packing
    const minSpacing = Math.min(...plantBudgets.filter(b => b.placed < b.target * 3).map(b => b.spacing), sp);
    y += Math.max(2, minSpacing);
    rowNum++;
  }

  // Phase 2: Fill any remaining gaps with the least-placed plant types
  const underplaced = plantBudgets
    .filter(b => b.placed === 0 || b.placed < 2)
    .sort((a, b) => a.placed - b.placed);

  for (const b of underplaced) {
    const sp = b.spacing;
    const halfSp = Math.ceil(sp / 2);
    for (let scanY = halfSp; scanY <= gridH - halfSp; scanY += sp) {
      for (let scanX = halfSp; scanX <= gridW - halfSp; scanX += sp) {
        if (!isClear(scanX, scanY, halfSp)) continue;
        if (hasConflictNearby(scanX, scanY, b.plant.id, sp)) continue;
        placements.push({ plantId: b.plant.id, x: scanX, y: scanY });
        markOccupied(scanX, scanY, halfSp, b.plant.id);
        b.placed++;
      }
    }
  }

  return placements;
}
