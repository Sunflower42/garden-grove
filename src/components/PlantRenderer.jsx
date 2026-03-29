// SVG plant renderers for seedling and full-grown views
// Each plant renders as a beautiful botanical illustration using SVG shapes

export function PlantSVG({ plant, viewMode, cellSize, x, y, isSelected, companionStatus }) {
  const isFullGrown = viewMode === 'fullgrown';
  const spreadCells = Math.max(1, plant.spreadIn / 6); // Use exact spread, not rounded
  const size = isFullGrown ? spreadCells * cellSize : cellSize * 0.8;
  const cx = x + cellSize / 2;
  const cy = y + cellSize / 2;

  // Glow for companion status
  let glowFilter = '';
  if (companionStatus === 'good') glowFilter = 'url(#glow-good)';
  if (companionStatus === 'bad') glowFilter = 'url(#glow-bad)';

  return (
    <g
      filter={glowFilter}
      style={{
        transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transformOrigin: `${cx}px ${cy}px`,
      }}
    >
      {/* Selection ring */}
      {isSelected && (
        <circle
          cx={cx}
          cy={cy}
          r={size / 2 + 4}
          fill="none"
          stroke="#C17644"
          strokeWidth={2}
          strokeDasharray="4 2"
          opacity={0.8}
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`0 ${cx} ${cy}`}
            to={`360 ${cx} ${cy}`}
            dur="8s"
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* Full-grown: shadow scales with height — taller plants cast larger shadows */}
      {isFullGrown && (() => {
        const heightFt = (plant.heightIn || 12) / 12;
        const shadowOffset = Math.min(heightFt * 2, 10);
        const shadowSize = size / 2 + shadowOffset * 0.5;
        return (
          <ellipse
            cx={cx + shadowOffset}
            cy={cy + shadowOffset}
            rx={shadowSize * 0.6}
            ry={shadowSize * 0.35}
            fill="#2A3A1A"
            opacity={0.06 + Math.min(heightFt * 0.015, 0.08)}
          />
        );
      })()}

      {/* Full-grown spread area — shows actual mature footprint */}
      {isFullGrown && (
        <circle
          cx={cx}
          cy={cy}
          r={size / 2}
          fill={plant.color}
          fillOpacity={0.06}
          stroke={plant.color}
          strokeWidth={1}
          strokeOpacity={0.25}
          strokeDasharray="4 3"
        />
      )}

      {/* Plant visualization based on category */}
      {plant.category === 'flower' ? (
        <FlowerSVG plant={plant} cx={cx} cy={cy} size={size} isFullGrown={isFullGrown} cellSize={cellSize} />
      ) : plant.category === 'herb' ? (
        <HerbSVG plant={plant} cx={cx} cy={cy} size={size} isFullGrown={isFullGrown} cellSize={cellSize} />
      ) : plant.needsTrellis ? (
        <TrellisSVG plant={plant} cx={cx} cy={cy} size={size} isFullGrown={isFullGrown} cellSize={cellSize} />
      ) : plant.spreadIn >= 48 ? (
        <VineSVG plant={plant} cx={cx} cy={cy} size={size} isFullGrown={isFullGrown} cellSize={cellSize} />
      ) : (
        <VeggieSVG plant={plant} cx={cx} cy={cy} size={size} isFullGrown={isFullGrown} cellSize={cellSize} />
      )}

      {/* Height ring — full-grown only. Ring thickness and color indicate height tier */}
      {isFullGrown && (() => {
        const heightIn = plant.heightIn || 12;
        // Color: low (green) → medium (amber) → tall (terra) → climbing (purple)
        const heightColor = heightIn > 60 ? '#8B6AAE' : heightIn > 36 ? '#C17644' : heightIn > 18 ? '#D4A24E' : '#8B9E7E';
        const ringWidth = heightIn > 60 ? 3 : heightIn > 36 ? 2.5 : heightIn > 18 ? 2 : 1.5;
        return (
          <circle
            cx={cx} cy={cy}
            r={size / 2 + 3}
            fill="none"
            stroke={heightColor}
            strokeWidth={ringWidth}
            opacity={0.35}
          />
        );
      })()}

      {/* Label */}
      <text
        x={cx}
        y={cy + (isFullGrown ? size / 2 + 12 : cellSize / 2 + 10)}
        textAnchor="middle"
        fontSize={9}
        fontFamily="Outfit, sans-serif"
        fontWeight={500}
        fill={isSelected ? '#C17644' : '#4A5E3A'}
        opacity={0.9}
      >
        {plant.name}
      </text>
    </g>
  );
}

function FlowerSVG({ plant, cx, cy, size, isFullGrown, cellSize }) {
  const r = isFullGrown ? size * 0.45 : cellSize * 0.25;
  const petalCount = 6;
  const color = plant.bloomColor || plant.color;

  return (
    <g>
      {/* Stem */}
      <line
        x1={cx}
        y1={cy + r * 0.3}
        x2={cx}
        y2={cy + (isFullGrown ? r * 1.5 : r * 1.2)}
        stroke="#4A7A3A"
        strokeWidth={isFullGrown ? 2 : 1.5}
        strokeLinecap="round"
      />
      {/* Leaves */}
      {isFullGrown && (
        <>
          <ellipse cx={cx - r * 0.4} cy={cy + r * 0.8} rx={r * 0.35} ry={r * 0.15} fill="#5A9A4A" opacity={0.7} transform={`rotate(-30 ${cx - r * 0.4} ${cy + r * 0.8})`} />
          <ellipse cx={cx + r * 0.4} cy={cy + r * 0.6} rx={r * 0.35} ry={r * 0.15} fill="#5A9A4A" opacity={0.7} transform={`rotate(30 ${cx + r * 0.4} ${cy + r * 0.6})`} />
        </>
      )}
      {/* Petals */}
      {Array.from({ length: petalCount }).map((_, i) => {
        const angle = (i * 360) / petalCount;
        const pr = r * (isFullGrown ? 0.6 : 0.5);
        return (
          <ellipse
            key={i}
            cx={cx + Math.cos((angle * Math.PI) / 180) * pr * 0.5}
            cy={cy + Math.sin((angle * Math.PI) / 180) * pr * 0.5}
            rx={pr * 0.45}
            ry={pr * 0.25}
            fill={color}
            opacity={0.85}
            transform={`rotate(${angle} ${cx + Math.cos((angle * Math.PI) / 180) * pr * 0.5} ${cy + Math.sin((angle * Math.PI) / 180) * pr * 0.5})`}
          />
        );
      })}
      {/* Center */}
      <circle cx={cx} cy={cy} r={r * 0.2} fill="#E8C84A" opacity={0.9} />
    </g>
  );
}

function HerbSVG({ plant, cx, cy, size, isFullGrown, cellSize }) {
  const r = isFullGrown ? size * 0.45 : cellSize * 0.2;
  const color = plant.color;
  const leaves = isFullGrown ? 8 : 4;

  return (
    <g>
      {/* Stem */}
      <line x1={cx} y1={cy - r * 0.3} x2={cx} y2={cy + r * 1.2} stroke="#4A7A3A" strokeWidth={1.5} strokeLinecap="round" />
      {/* Bushy leaves */}
      {Array.from({ length: leaves }).map((_, i) => {
        const angle = (i * 360 / leaves) + (i % 2 ? 15 : 0);
        const dist = r * (0.3 + (i % 3) * 0.15);
        const lx = cx + Math.cos((angle * Math.PI) / 180) * dist;
        const ly = cy + Math.sin((angle * Math.PI) / 180) * dist * 0.6;
        return (
          <ellipse
            key={i}
            cx={lx}
            cy={ly}
            rx={r * 0.35}
            ry={r * 0.18}
            fill={color}
            opacity={0.7 + (i % 3) * 0.1}
            transform={`rotate(${angle} ${lx} ${ly})`}
          />
        );
      })}
      {/* Central cluster */}
      <circle cx={cx} cy={cy} r={r * 0.25} fill={color} opacity={0.5} />
    </g>
  );
}

function TrellisSVG({ plant, cx, cy, size, isFullGrown, cellSize }) {
  const h = isFullGrown ? size * 0.9 : cellSize * 0.5;
  const w = isFullGrown ? size * 0.5 : cellSize * 0.3;
  const color = plant.color;

  return (
    <g>
      {/* Trellis structure */}
      <line x1={cx - w / 2} y1={cy + h / 2} x2={cx} y2={cy - h / 2} stroke="#3A3A3A" strokeWidth={1.5} opacity={0.4} />
      <line x1={cx + w / 2} y1={cy + h / 2} x2={cx} y2={cy - h / 2} stroke="#3A3A3A" strokeWidth={1.5} opacity={0.4} />
      {isFullGrown && (
        <>
          <line x1={cx - w / 3} y1={cy} x2={cx + w / 3} y2={cy} stroke="#3A3A3A" strokeWidth={1} opacity={0.3} />
          <line x1={cx - w / 4} y1={cy - h / 4} x2={cx + w / 4} y2={cy - h / 4} stroke="#3A3A3A" strokeWidth={1} opacity={0.3} />
        </>
      )}
      {/* Vine growth */}
      {isFullGrown && Array.from({ length: 6 }).map((_, i) => {
        const t = i / 5;
        const vx = cx + Math.sin(t * Math.PI * 2) * w * 0.3;
        const vy = cy + h / 2 - t * h;
        return (
          <circle key={i} cx={vx} cy={vy} r={4} fill={color} opacity={0.6} />
        );
      })}
      {/* Fruit/flowers at full grown */}
      {isFullGrown && plant.bloomColor && (
        <>
          <circle cx={cx - 5} cy={cy - h / 4} r={3} fill={plant.bloomColor} opacity={0.8} />
          <circle cx={cx + 5} cy={cy} r={3} fill={plant.bloomColor} opacity={0.8} />
          <circle cx={cx - 3} cy={cy + h / 6} r={3} fill={plant.bloomColor} opacity={0.8} />
        </>
      )}
      {/* Seedling */}
      {!isFullGrown && (
        <>
          <line x1={cx} y1={cy + 6} x2={cx} y2={cy - 4} stroke="#4A7A3A" strokeWidth={1.5} strokeLinecap="round" />
          <ellipse cx={cx - 4} cy={cy - 2} rx={5} ry={3} fill={color} opacity={0.7} transform={`rotate(-30 ${cx - 4} ${cy - 2})`} />
          <ellipse cx={cx + 4} cy={cy - 3} rx={5} ry={3} fill={color} opacity={0.7} transform={`rotate(30 ${cx + 4} ${cy - 3})`} />
        </>
      )}
    </g>
  );
}

function VineSVG({ plant, cx, cy, size, isFullGrown, cellSize }) {
  const r = isFullGrown ? size * 0.48 : cellSize * 0.25;
  const color = plant.color;

  return (
    <g>
      {!isFullGrown ? (
        // Seedling
        <>
          <line x1={cx} y1={cy + 6} x2={cx} y2={cy - 4} stroke="#4A7A3A" strokeWidth={1.5} strokeLinecap="round" />
          <ellipse cx={cx - 4} cy={cy - 2} rx={5} ry={3} fill={color} opacity={0.7} transform={`rotate(-30 ${cx - 4} ${cy - 2})`} />
          <ellipse cx={cx + 4} cy={cy - 3} rx={5} ry={3} fill={color} opacity={0.7} transform={`rotate(30 ${cx + 4} ${cy - 3})`} />
        </>
      ) : (
        // Full sprawling vine
        <>
          {/* Spreading vine trails */}
          {[0, 60, 120, 180, 240, 300].map((angle, i) => {
            const endX = cx + Math.cos((angle * Math.PI) / 180) * r;
            const endY = cy + Math.sin((angle * Math.PI) / 180) * r * 0.7;
            const midX = cx + Math.cos((angle * Math.PI) / 180) * r * 0.5;
            const midY = cy + Math.sin((angle * Math.PI) / 180) * r * 0.5 + (i % 2 ? -8 : 8);
            return (
              <g key={i}>
                <path
                  d={`M ${cx} ${cy} Q ${midX} ${midY} ${endX} ${endY}`}
                  fill="none"
                  stroke="#4A7A3A"
                  strokeWidth={2}
                  opacity={0.5}
                />
                {/* Leaves along vine */}
                <ellipse cx={midX} cy={midY} rx={8} ry={5} fill={color} opacity={0.5} transform={`rotate(${angle} ${midX} ${midY})`} />
                <ellipse cx={endX} cy={endY} rx={10} ry={6} fill={color} opacity={0.6} transform={`rotate(${angle + 30} ${endX} ${endY})`} />
              </g>
            );
          })}
          {/* Central crown */}
          <circle cx={cx} cy={cy} r={r * 0.2} fill={color} opacity={0.4} />
          {/* Fruit */}
          {plant.bloomColor && (
            <>
              <circle cx={cx + r * 0.3} cy={cy - r * 0.2} r={5} fill={plant.bloomColor || '#E8C84A'} opacity={0.8} />
              <circle cx={cx - r * 0.4} cy={cy + r * 0.15} r={5} fill={plant.bloomColor || '#E8C84A'} opacity={0.7} />
            </>
          )}
        </>
      )}
    </g>
  );
}

function VeggieSVG({ plant, cx, cy, size, isFullGrown, cellSize }) {
  const r = isFullGrown ? size * 0.45 : cellSize * 0.22;
  const color = plant.color;

  return (
    <g>
      {!isFullGrown ? (
        // Seedling
        <>
          <line x1={cx} y1={cy + 7} x2={cx} y2={cy - 3} stroke="#4A7A3A" strokeWidth={1.5} strokeLinecap="round" />
          <ellipse cx={cx - 4} cy={cy - 1} rx={5} ry={2.5} fill={color} opacity={0.7} transform={`rotate(-35 ${cx - 4} ${cy - 1})`} />
          <ellipse cx={cx + 4} cy={cy - 2} rx={5} ry={2.5} fill={color} opacity={0.7} transform={`rotate(35 ${cx + 4} ${cy - 2})`} />
        </>
      ) : (
        // Full grown veggie
        <>
          {/* Main stem */}
          <line x1={cx} y1={cy + r} x2={cx} y2={cy - r * 0.6} stroke="#4A7A3A" strokeWidth={2} strokeLinecap="round" />
          {/* Leaf clusters */}
          {Array.from({ length: 5 }).map((_, i) => {
            const angle = (i * 72) + 15;
            const dist = r * 0.5;
            const lx = cx + Math.cos((angle * Math.PI) / 180) * dist;
            const ly = cy + Math.sin((angle * Math.PI) / 180) * dist * 0.6;
            return (
              <ellipse
                key={i}
                cx={lx}
                cy={ly}
                rx={r * 0.4}
                ry={r * 0.22}
                fill={color}
                opacity={0.6}
                transform={`rotate(${angle} ${lx} ${ly})`}
              />
            );
          })}
          {/* Fruit/vegetable */}
          {plant.bloomColor && (
            <circle cx={cx + r * 0.15} cy={cy - r * 0.1} r={r * 0.18} fill={plant.bloomColor} opacity={0.9} />
          )}
        </>
      )}
    </g>
  );
}

// SVG filter definitions for companion planting glows
export function PlantFilters() {
  return (
    <defs>
      <filter id="glow-good" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feFlood floodColor="#8B9E7E" floodOpacity="0.4" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="glow-bad" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feFlood floodColor="#C4544A" floodOpacity="0.4" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.15" />
      </filter>
    </defs>
  );
}
