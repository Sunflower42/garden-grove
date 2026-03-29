// SVG renderers for landscape elements

// Deterministic pseudo-random to avoid flicker on re-render
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function ElementSVG({ element, x, y, width, height, cellSize, isSelected }) {
  const px = x;
  const py = y;
  const w = width;
  const h = height;

  return (
    <g>
      {/* Selection outline */}
      {isSelected && (
        <rect
          x={px - 2}
          y={py - 2}
          width={w + 4}
          height={h + 4}
          fill="none"
          stroke="#C17644"
          strokeWidth={2}
          strokeDasharray="6 3"
          rx={element.circular ? w / 2 : 4}
          ry={element.circular ? h / 2 : 4}
        />
      )}

      {/* Element shape */}
      {element.circular ? (
        <ellipse
          cx={px + w / 2}
          cy={py + h / 2}
          rx={w / 2}
          ry={h / 2}
          fill={element.color}
          stroke={element.borderColor}
          strokeWidth={1.5}
          opacity={0.85}
        />
      ) : element.id.includes('fence') ? (
        // Fence rendering — hatched pattern
        <g>
          <rect x={px} y={py} width={w} height={h} fill={element.color} stroke={element.borderColor} strokeWidth={1} opacity={0.7} rx={1} />
          {/* Fence post marks */}
          {Array.from({ length: Math.floor(h / cellSize) + 1 }).map((_, i) => (
            <line
              key={i}
              x1={px}
              x2={px + w}
              y1={py + i * cellSize}
              y2={py + i * cellSize}
              stroke={element.borderColor}
              strokeWidth={0.5}
              opacity={0.5}
            />
          ))}
        </g>
      ) : element.id.includes('path') || element.id.includes('stepping') ? (
        // Path rendering — textured
        <g>
          <rect x={px} y={py} width={w} height={h} fill={element.color} stroke={element.borderColor} strokeWidth={1} opacity={0.75} rx={3} />
          {/* Gravel texture dots — deterministic positions */}
          {Array.from({ length: Math.floor(w * h / 200) }).map((_, i) => {
            const rng = seededRandom(i * 31 + 7);
            return (
              <circle
                key={i}
                cx={px + 4 + rng() * (w - 8)}
                cy={py + 4 + ((i * 17) % Math.max(1, h - 8))}
                r={1 + rng() * 1.5}
                fill={element.borderColor}
                opacity={0.3}
              />
            );
          })}
        </g>
      ) : element.id.includes('raised-bed') ? (
        // Raised bed — wood grain effect
        <g>
          <rect x={px} y={py} width={w} height={h} fill={element.color} stroke={element.borderColor} strokeWidth={2} rx={3} opacity={0.9} />
          {/* Inner soil area */}
          <rect x={px + 3} y={py + 3} width={w - 6} height={h - 6} fill="#3A2A1A" opacity={0.25} rx={2} />
          {/* Wood grain */}
          {[0.25, 0.5, 0.75].map((t, i) => (
            <line key={i} x1={px} x2={px + w} y1={py + h * t} y2={py + h * t} stroke={element.borderColor} strokeWidth={0.5} opacity={0.3} />
          ))}
        </g>
      ) : element.id.includes('arch') ? (
        // Arch
        <g>
          <path
            d={`M ${px + 4} ${py + h} L ${px + 4} ${py + h * 0.3} Q ${px + w / 2} ${py - h * 0.2} ${px + w - 4} ${py + h * 0.3} L ${px + w - 4} ${py + h}`}
            fill="none"
            stroke={element.color}
            strokeWidth={3}
            opacity={0.8}
          />
        </g>
      ) : element.id.includes('obelisk') ? (
        // Obelisk trellis
        <g>
          <line x1={px + w * 0.2} y1={py + h} x2={px + w / 2} y2={py + 2} stroke={element.color} strokeWidth={2} opacity={0.7} />
          <line x1={px + w * 0.8} y1={py + h} x2={px + w / 2} y2={py + 2} stroke={element.color} strokeWidth={2} opacity={0.7} />
          <line x1={px + w * 0.3} y1={py + h * 0.5} x2={px + w * 0.7} y2={py + h * 0.5} stroke={element.color} strokeWidth={1} opacity={0.5} />
          <line x1={px + w * 0.35} y1={py + h * 0.3} x2={px + w * 0.65} y2={py + h * 0.3} stroke={element.color} strokeWidth={1} opacity={0.5} />
          <circle cx={px + w / 2} cy={py + 2} r={2} fill={element.color} opacity={0.8} />
        </g>
      ) : element.id === 'gate' ? (
        // Gate
        <g>
          <rect x={px} y={py} width={w} height={h} fill="none" stroke={element.color} strokeWidth={2} rx={1} opacity={0.7} />
          <line x1={px + w / 2} y1={py} x2={px + w / 2} y2={py + h} stroke={element.color} strokeWidth={1.5} opacity={0.6} />
          <circle cx={px + w / 2 - 3} cy={py + h / 2} r={1.5} fill={element.color} opacity={0.8} />
        </g>
      ) : element.id.includes('fountain') || element.id === 'birdbath' ? (
        // Fountain / birdbath
        <g>
          <ellipse cx={px + w / 2} cy={py + h / 2} rx={w / 2} ry={h / 2} fill={element.color} stroke={element.borderColor} strokeWidth={1.5} opacity={0.8} />
          <ellipse cx={px + w / 2} cy={py + h / 2} rx={w / 3} ry={h / 3} fill="#9AB4C8" opacity={0.5} />
          {/* Water ripples */}
          <ellipse cx={px + w / 2} cy={py + h / 2} rx={w / 4} ry={h / 4} fill="none" stroke="#B8D4E8" strokeWidth={0.5} opacity={0.6} />
        </g>
      ) : element.id.includes('brick') || element.id.includes('border') ? (
        // Brick border — repeating brick pattern
        <g>
          <rect x={px} y={py} width={w} height={h} fill={element.color} stroke={element.borderColor} strokeWidth={1.5} rx={2} opacity={0.85} />
          {/* Brick lines */}
          {Array.from({ length: Math.max(1, Math.floor(Math.max(w, h) / 8)) }).map((_, i) => {
            if (w > h) {
              // Horizontal border — vertical brick lines
              const bx = px + 4 + i * 8;
              if (bx >= px + w - 2) return null;
              return <line key={i} x1={bx} y1={py + 1} x2={bx} y2={py + h - 1} stroke={element.borderColor} strokeWidth={0.7} opacity={0.5} />;
            } else {
              // Vertical border — horizontal brick lines
              const by = py + 4 + i * 8;
              if (by >= py + h - 2) return null;
              return <line key={i} x1={px + 1} y1={by} x2={px + w - 1} y2={by} stroke={element.borderColor} strokeWidth={0.7} opacity={0.5} />;
            }
          })}
        </g>
      ) : (
        // Default rectangle
        <rect
          x={px}
          y={py}
          width={w}
          height={h}
          fill={element.color}
          stroke={element.borderColor}
          strokeWidth={1.5}
          rx={3}
          opacity={0.85}
        />
      )}

      {/* Label */}
      <text
        x={px + w / 2}
        y={py + h + 12}
        textAnchor="middle"
        fontSize={8}
        fontFamily="Outfit, sans-serif"
        fontWeight={500}
        fill="#5C4033"
        opacity={0.7}
      >
        {element.name}
      </text>
    </g>
  );
}
