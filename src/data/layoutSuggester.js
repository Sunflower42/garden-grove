import { getPlantById } from './plants';

// Generate a suggested layout that fills the bed based on plant spacing.
// Groups companions together, puts tall plants north, and fills each
// plant type to capacity rather than placing just one.

export function suggestLayout(plantIds, plotWidthFt, plotHeightFt) {
  if (!plantIds.length || !plotWidthFt || !plotHeightFt) return [];

  // Get unique plant data
  const uniqueIds = [...new Set(plantIds)];
  const plants = uniqueIds.map(id => getPlantById(id)).filter(Boolean);
  if (plants.length === 0) return [];

  // Grid is in 6-inch cells (2 cells per foot)
  const gridW = plotWidthFt * 2;
  const gridH = plotHeightFt * 2;

  // Spacing in cells (6 inches each)
  const spacingCells = (plant) => Math.max(2, Math.ceil((plant.spacingIn || 12) / 6));

  // Sort plants: tallest first (north/top), then by spacing (larger spacing first to place big ones)
  const sorted = [...plants].sort((a, b) => {
    const ha = a.heightIn || 24, hb = b.heightIn || 24;
    if (Math.abs(ha - hb) > 12) return hb - ha; // tall plants first
    return spacingCells(b) - spacingCells(a); // then widest spacing first
  });

  // Build companion/conflict maps
  const companionSet = new Map();
  const avoidSet = new Map();
  for (const p of plants) {
    companionSet.set(p.id, new Set(p.companions || []));
    avoidSet.set(p.id, new Set(p.avoid || []));
  }

  // Occupied cells grid
  const occupied = Array.from({ length: gridH }, () => new Array(gridW).fill(null));

  const markOccupied = (cx, cy, halfSpacing, plantId) => {
    for (let dy = -halfSpacing; dy <= halfSpacing; dy++) {
      for (let dx = -halfSpacing; dx <= halfSpacing; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx >= 0 && nx < gridW && ny >= 0 && ny < gridH) {
          occupied[ny][nx] = plantId;
        }
      }
    }
  };

  const isClear = (cx, cy, halfSpacing) => {
    for (let dy = -halfSpacing; dy <= halfSpacing; dy++) {
      for (let dx = -halfSpacing; dx <= halfSpacing; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || nx >= gridW || ny < 0 || ny >= gridH) return false;
        if (occupied[ny][nx] !== null) return false;
      }
    }
    return true;
  };

  // Check neighbor compatibility — avoid placing next to conflicting plants
  const hasConflictNearby = (cx, cy, plantId, checkDist) => {
    const avoids = avoidSet.get(plantId);
    if (!avoids || avoids.size === 0) return false;
    for (let dy = -checkDist; dy <= checkDist; dy++) {
      for (let dx = -checkDist; dx <= checkDist; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || nx >= gridW || ny < 0 || ny >= gridH) continue;
        if (occupied[ny][nx] && avoids.has(occupied[ny][nx])) return true;
      }
    }
    return false;
  };

  const placements = [];

  // Divide the bed into horizontal bands based on plant count
  // Tall plants get the top bands, short plants the bottom
  const numPlants = sorted.length;
  const bandHeight = Math.max(2, Math.floor(gridH / numPlants));

  for (let pi = 0; pi < sorted.length; pi++) {
    const plant = sorted[pi];
    const spacing = spacingCells(plant);
    const halfSpacing = Math.ceil(spacing / 2);

    // This plant's preferred vertical band (tall at top, short at bottom)
    const bandTop = Math.min(gridH - spacing, pi * bandHeight);
    const bandBottom = Math.min(gridH, bandTop + Math.max(bandHeight, spacing * 2));

    // Fill the band with this plant at proper spacing
    for (let y = bandTop + halfSpacing; y <= bandBottom - halfSpacing; y += spacing) {
      for (let x = halfSpacing; x <= gridW - halfSpacing; x += spacing) {
        if (!isClear(x, y, halfSpacing)) continue;
        if (hasConflictNearby(x, y, plant.id, spacing + 2)) continue;

        placements.push({ plantId: plant.id, x, y });
        markOccupied(x, y, halfSpacing, plant.id);
      }
    }

    // If the band was too constrained, try filling remaining space anywhere
    if (placements.filter(p => p.plantId === plant.id).length === 0) {
      for (let y = halfSpacing; y <= gridH - halfSpacing; y += spacing) {
        for (let x = halfSpacing; x <= gridW - halfSpacing; x += spacing) {
          if (!isClear(x, y, halfSpacing)) continue;
          if (hasConflictNearby(x, y, plant.id, spacing + 2)) continue;

          placements.push({ plantId: plant.id, x, y });
          markOccupied(x, y, halfSpacing, plant.id);
        }
      }
    }
  }

  return placements;
}
