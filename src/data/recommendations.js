// Smart recommendation engine for garden improvement

import { getPlantById, PLANTS } from './plants';

export function generateRecommendations(gardenPlants, gardenElements, zone) {
  const tips = [];
  const plantIds = gardenPlants.map(p => p.plantId);
  const plantData = plantIds.map(id => getPlantById(id)).filter(Boolean);
  const elementIds = gardenElements.map(e => e.elementId);

  // Check companion planting opportunities
  plantData.forEach(plant => {
    plant.companions.forEach(compId => {
      const comp = getPlantById(compId);
      if (comp && !plantIds.includes(compId)) {
        tips.push({
          type: 'companion',
          priority: 2,
          icon: '🌱',
          title: `Add ${comp.name} near your ${plant.name}`,
          description: `${comp.name} is a great companion for ${plant.name}. They help each other thrive!`,
          plantId: compId,
        });
      }
    });
  });

  // Check bad companions that ARE planted together
  plantData.forEach(plant => {
    plant.avoid.forEach(avoidId => {
      if (plantIds.includes(avoidId)) {
        const bad = getPlantById(avoidId);
        if (bad) {
          tips.push({
            type: 'warning',
            priority: 1,
            icon: '⚠️',
            title: `Separate ${plant.name} and ${bad.name}`,
            description: `These plants don't grow well together. Try to keep them on opposite sides of the garden.`,
          });
        }
      }
    });
  });

  // Deer protection
  const hasVulnerablePlants = plantData.some(p => p.deerResistance <= 2);
  const hasFencing = elementIds.some(id => id.includes('deer-fence') || id === 'gate');
  if (hasVulnerablePlants && !hasFencing) {
    tips.push({
      type: 'protection',
      priority: 1,
      icon: '🦌',
      title: 'Add deer protection',
      description: 'You have plants that deer love! Add 8ft deer fencing around your garden to protect your harvest.',
    });
  }

  // Deer-resistant border suggestion
  const hasDeerResistantBorder = plantData.some(p =>
    p.deerResistance >= 4 && (p.category === 'herb' || p.category === 'flower')
  );
  if (hasVulnerablePlants && !hasDeerResistantBorder) {
    tips.push({
      type: 'companion',
      priority: 2,
      icon: '🌿',
      title: 'Plant a deer-resistant border',
      description: 'Surround your garden with lavender, rosemary, sage, or marigolds — deer avoid their strong scents.',
    });
  }

  // Pollinator suggestions
  const hasPollinatorPlants = plantData.some(p =>
    ['marigold','borage','lavender','echinacea','cosmos','zinnia','salvia'].includes(p.id)
  );
  const hasVegetables = plantData.some(p => p.category === 'vegetable');
  if (hasVegetables && !hasPollinatorPlants) {
    tips.push({
      type: 'pollinator',
      priority: 2,
      icon: '🐝',
      title: 'Add pollinator flowers',
      description: 'Boost your harvest! Plant marigolds, borage, or cosmos to attract bees and butterflies to pollinate your veggies.',
    });
  }

  // Water feature for pollinators
  const hasWaterFeature = elementIds.some(id =>
    id.includes('birdbath') || id.includes('fountain')
  );
  if (!hasWaterFeature && plantData.length > 5) {
    tips.push({
      type: 'enhancement',
      priority: 3,
      icon: '💧',
      title: 'Add a water feature',
      description: 'A bird bath or fountain attracts beneficial insects and birds that eat garden pests naturally.',
    });
  }

  // Trellis suggestions for climbing plants
  const climbingPlants = plantData.filter(p => p.needsTrellis);
  const hasTrellis = elementIds.some(id =>
    id.includes('obelisk') || id.includes('trellis') || id.includes('arch')
  );
  if (climbingPlants.length > 0 && !hasTrellis) {
    tips.push({
      type: 'structure',
      priority: 1,
      icon: '🗼',
      title: `Add support for ${climbingPlants[0].name}`,
      description: `${climbingPlants[0].name} needs a trellis or obelisk to climb. This saves space and improves air circulation.`,
    });
  }

  // Spacing warnings
  const sprawlingPlants = plantData.filter(p => p.spreadIn >= 48);
  if (sprawlingPlants.length > 0) {
    sprawlingPlants.forEach(plant => {
      tips.push({
        type: 'spacing',
        priority: 2,
        icon: '📏',
        title: `Give ${plant.name} room to spread`,
        description: `${plant.name} needs ${Math.round(plant.spreadIn / 12)} feet of space when mature. Make sure nearby plants won't be crowded.`,
      });
    });
  }

  // Zone compatibility warnings
  plantData.forEach(plant => {
    if (zone && !plant.zones.includes(zone)) {
      tips.push({
        type: 'warning',
        priority: 1,
        icon: '🌡️',
        title: `${plant.name} may struggle in Zone ${zone}`,
        description: `${plant.name} grows best in zones ${plant.zones[0]}-${plant.zones[plant.zones.length-1]}. Consider a cold frame or season extension.`,
      });
    }
  });

  // Composting suggestion
  const hasCompost = elementIds.includes('compost-bin');
  if (plantData.length >= 8 && !hasCompost) {
    tips.push({
      type: 'enhancement',
      priority: 3,
      icon: '♻️',
      title: 'Add a compost bin',
      description: 'With this many plants, composting garden waste will provide free, rich fertilizer for next season.',
    });
  }

  // Path suggestion
  const hasPath = elementIds.some(id => id.includes('path') || id.includes('stepping'));
  if (plantData.length >= 6 && !hasPath) {
    tips.push({
      type: 'enhancement',
      priority: 3,
      icon: '🪨',
      title: 'Add garden paths',
      description: 'Gravel paths or stepping stones prevent soil compaction and make it easy to tend your garden without stepping on roots.',
    });
  }

  // Sort by priority (1 = most urgent)
  tips.sort((a, b) => a.priority - b.priority);

  // Deduplicate by title
  const seen = new Set();
  return tips.filter(t => {
    if (seen.has(t.title)) return false;
    seen.add(t.title);
    return true;
  }).slice(0, 12);
}
