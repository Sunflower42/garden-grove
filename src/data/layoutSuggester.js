import { getPlantById } from './plants';

// Generate a suggested layout for plants within a plot
// Places tallest plants on the north side (top), groups companions,
// separates conflicts, and respects spacing requirements.

export function suggestLayout(plantIds, plotWidthFt, plotHeightFt) {
  if (!plantIds.length || !plotWidthFt || !plotHeightFt) return [];

  // Get unique plant data
  const uniqueIds = [...new Set(plantIds)];
  const plants = uniqueIds.map(id => getPlantById(id)).filter(Boolean);
  if (plants.length === 0) return [];

  // Grid is in 6-inch cells (2 cells per foot)
  const gridW = plotWidthFt * 2;
  const gridH = plotHeightFt * 2;

  // Sort plants: tallest first (they go to the north/top side so they don't shade others)
  const sorted = [...plants].sort((a, b) => (b.heightIn || 24) - (a.heightIn || 24));

  // Build companion/conflict maps for scoring
  const companionSet = new Map();
  const avoidSet = new Map();
  for (const p of plants) {
    companionSet.set(p.id, new Set(p.companions || []));
    avoidSet.set(p.id, new Set(p.avoid || []));
  }

  // Spacing in cells (6 inches each)
  const spacingCells = (plant) => Math.max(1, Math.ceil((plant.spacingIn || 12) / 6));

  // Placement results
  const placements = [];
  // Occupied cells grid for collision detection
  const occupied = Array.from({ length: gridH }, () => new Array(gridW).fill(null));

  // Mark cells as occupied
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

  // Check if a position is clear (respecting spacing)
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

  // Score a position based on companion proximity and conflict avoidance
  const scorePosition = (cx, cy, plantId) => {
    let score = 0;
    const companions = companionSet.get(plantId) || new Set();
    const avoids = avoidSet.get(plantId) || new Set();
    const checkRadius = 8; // cells to check around

    for (let dy = -checkRadius; dy <= checkRadius; dy++) {
      for (let dx = -checkRadius; dx <= checkRadius; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || nx >= gridW || ny < 0 || ny >= gridH) continue;
        const neighbor = occupied[ny][nx];
        if (!neighbor) continue;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (companions.has(neighbor)) score += 10 / (dist + 1); // reward proximity to companions
        if (avoids.has(neighbor)) score -= 20 / (dist + 1); // penalize proximity to conflicts
      }
    }

    // Slight preference for centering horizontally
    const centerDist = Math.abs(cx - gridW / 2) / gridW;
    score -= centerDist * 2;

    return score;
  };

  // Place each plant
  for (const plant of sorted) {
    const spacing = spacingCells(plant);
    const halfSpacing = Math.ceil(spacing / 2);

    let bestPos = null;
    let bestScore = -Infinity;

    // Scan the grid for valid positions, stepping by spacing
    for (let y = halfSpacing; y < gridH - halfSpacing; y += Math.max(1, Math.floor(spacing / 2))) {
      for (let x = halfSpacing; x < gridW - halfSpacing; x += Math.max(1, Math.floor(spacing / 2))) {
        if (!isClear(x, y, halfSpacing)) continue;

        const score = scorePosition(x, y, plant.id);
        // Add height-based row preference: tall plants toward top (north)
        const rowScore = (plant.heightIn > 36) ? -y * 0.5 : y * 0.3;
        const totalScore = score + rowScore;

        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestPos = { x, y };
        }
      }
    }

    if (bestPos) {
      placements.push({
        plantId: plant.id,
        x: bestPos.x,
        y: bestPos.y,
      });
      markOccupied(bestPos.x, bestPos.y, halfSpacing, plant.id);
    }
  }

  return placements;
}
