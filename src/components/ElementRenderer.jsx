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
      {element.id.startsWith('tree-') ? (
        // Tree canopy — layered circles for natural look
        <g>
          {/* Shadow on ground */}
          <ellipse cx={px + w / 2 + 2} cy={py + h / 2 + 2} rx={w / 2} ry={h / 2}
            fill="#000" opacity={0.08} />
          {element.id === 'tree-evergreen' ? (
            // Evergreen — darker, denser, concentric rings
            <>
              <ellipse cx={px + w / 2} cy={py + h / 2} rx={w / 2} ry={h / 2}
                fill="#2A5A2A" stroke="#1A4A1A" strokeWidth={1} opacity={0.85} />
              <ellipse cx={px + w / 2} cy={py + h / 2} rx={w * 0.35} ry={h * 0.35}
                fill="#1A4A1A" opacity={0.4} />
              <ellipse cx={px + w / 2} cy={py + h / 2} rx={w * 0.18} ry={h * 0.18}
                fill="#0A3A0A" opacity={0.3} />
              {/* Texture */}
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i / 12) * Math.PI * 2;
                const r = w * 0.3;
                return <circle key={i} cx={px + w/2 + Math.cos(angle) * r} cy={py + h/2 + Math.sin(angle) * r}
                  r={w * 0.06} fill="#1A4A1A" opacity={0.3} />;
              })}
            </>
          ) : (
            // Deciduous — leafy, varied clusters
            <>
              <ellipse cx={px + w / 2} cy={py + h / 2} rx={w / 2} ry={h / 2}
                fill={element.color} stroke={element.borderColor} strokeWidth={1} opacity={0.8} />
              {/* Leaf clusters */}
              {Array.from({ length: Math.max(5, Math.floor(w * h / 60)) }).map((_, i) => {
                const angle = (i * 2.39996) ; // golden angle for even distribution
                const dist = (0.2 + (i % 5) * 0.14) * w / 2;
                const cx = px + w/2 + Math.cos(angle) * dist;
                const cy = py + h/2 + Math.sin(angle) * dist;
                const r = w * 0.06 + (i % 3) * w * 0.02;
                const shade = i % 3 === 0 ? element.color : i % 3 === 1 ? element.borderColor : '#5AAA3A';
                return <circle key={i} cx={cx} cy={cy} r={r} fill={shade} opacity={0.5} />;
              })}
              {/* Trunk hint at center */}
              <circle cx={px + w / 2} cy={py + h / 2} r={w * 0.06}
                fill="#6B4B2A" opacity={0.6} />
              {element.id === 'tree-ornamental' && (
                // Flower dots for ornamental trees
                <>
                  {Array.from({ length: 8 }).map((_, i) => {
                    const angle = i * 0.785;
                    const dist = w * 0.25 + (i % 3) * w * 0.08;
                    return <circle key={`fl-${i}`}
                      cx={px + w/2 + Math.cos(angle) * dist}
                      cy={py + h/2 + Math.sin(angle) * dist}
                      r={w * 0.03} fill="#E8A0B0" opacity={0.7} />;
                  })}
                </>
              )}
            </>
          )}
        </g>
      ) : element.id === 'strip-lights' ? (
        // LED strip lights — thin glowing line
        <g>
          {/* Housing */}
          <rect x={px} y={py} width={w} height={h} fill="#3A3A3A" stroke="#2A2A2A" strokeWidth={0.5} rx={h / 2} opacity={0.8} />
          {/* Glow */}
          <rect x={px + 1} y={py + h * 0.15} width={w - 2} height={h * 0.7} fill="#FFE8A0" rx={h / 3} opacity={0.4} />
          {/* LED segments */}
          {Array.from({ length: Math.max(3, Math.floor(w / 4)) }).map((_, i) => {
            const lx = px + 1.5 + i * ((w - 3) / Math.max(2, Math.floor(w / 4)));
            return (
              <rect key={i} x={lx} y={py + h * 0.2} width={2} height={h * 0.6}
                fill={i % 2 === 0 ? '#FFF8E0' : '#FFE8A0'} rx={0.5} opacity={0.8} />
            );
          })}
        </g>
      ) : element.id === 'wall-fountain' ? (
        // Wall fountain — stone back with basin
        <g>
          {/* Back wall/mounting plate */}
          <rect x={px} y={py} width={w} height={h * 0.4} fill="#8A9AAA" stroke="#6A7A8A" strokeWidth={1} rx={1} opacity={0.9} />
          {/* Stone texture on back */}
          {Array.from({ length: Math.max(2, Math.floor(w / 8)) }).map((_, i) => (
            <line key={`st-${i}`} x1={px + 3 + i * 8} y1={py + 1} x2={px + 3 + i * 8} y2={py + h * 0.38}
              stroke="#6A7A8A" strokeWidth={0.3} opacity={0.4} />
          ))}
          {/* Spout */}
          <rect x={px + w / 2 - 1.5} y={py + h * 0.25} width={3} height={h * 0.2}
            fill="#5A6A7A" rx={0.5} opacity={0.8} />
          {/* Basin */}
          <ellipse cx={px + w / 2} cy={py + h * 0.7} rx={w * 0.4} ry={h * 0.25}
            fill="#6A8A9A" stroke="#5A7A8A" strokeWidth={1} opacity={0.8} />
          {/* Water surface */}
          <ellipse cx={px + w / 2} cy={py + h * 0.65} rx={w * 0.32} ry={h * 0.15}
            fill="#8AB8D8" opacity={0.5} />
          {/* Water ripples */}
          <ellipse cx={px + w / 2} cy={py + h * 0.65} rx={w * 0.2} ry={h * 0.08}
            fill="none" stroke="#A0D0F0" strokeWidth={0.4} opacity={0.5} />
          <ellipse cx={px + w / 2} cy={py + h * 0.68} rx={w * 0.12} ry={h * 0.05}
            fill="none" stroke="#A0D0F0" strokeWidth={0.3} opacity={0.4} />
        </g>
      ) : element.id === 'string-lights' ? (
        // String lights — catenary wire with bulbs
        <g>
          {/* Wire — gentle droop */}
          <path
            d={`M ${px} ${py + h * 0.3} Q ${px + w * 0.25} ${py + h * 0.8} ${px + w * 0.5} ${py + h * 0.5} Q ${px + w * 0.75} ${py + h * 0.2} ${px + w} ${py + h * 0.35}`}
            fill="none" stroke="#4A4A4A" strokeWidth={0.8} opacity={0.6}
          />
          {/* Second wire for a crossed look */}
          <path
            d={`M ${px} ${py + h * 0.4} Q ${px + w * 0.3} ${py + h * 0.1} ${px + w * 0.5} ${py + h * 0.45} Q ${px + w * 0.7} ${py + h * 0.85} ${px + w} ${py + h * 0.3}`}
            fill="none" stroke="#4A4A4A" strokeWidth={0.8} opacity={0.5}
          />
          {/* Bulbs along both wires */}
          {Array.from({ length: Math.max(4, Math.floor(w / 8)) }).map((_, i) => {
            const t = (i + 0.5) / Math.max(4, Math.floor(w / 8));
            // Position along first wire (approximate catenary)
            const bx = px + t * w;
            const sag1 = Math.sin(t * Math.PI) * h * 0.3;
            const by1 = py + h * 0.3 + sag1 * (t < 0.5 ? 1 : -0.3);
            // Alternate warm white / amber
            const bulbColor = i % 3 === 0 ? '#FFF4D0' : i % 3 === 1 ? '#FFE8A0' : '#FFFBE6';
            return (
              <g key={`bulb-${i}`}>
                {/* Glow */}
                <circle cx={bx} cy={by1} r={2.5} fill={bulbColor} opacity={0.25} />
                {/* Bulb */}
                <circle cx={bx} cy={by1} r={1.2} fill={bulbColor} stroke="#C8B060" strokeWidth={0.3} opacity={0.9} />
              </g>
            );
          })}
          {/* Endpoint posts/hooks */}
          <circle cx={px + 1} cy={py + h * 0.3} r={1.5} fill="#5A5A5A" opacity={0.7} />
          <circle cx={px + w - 1} cy={py + h * 0.35} r={1.5} fill="#5A5A5A" opacity={0.7} />
        </g>
      ) : element.id === 'shrub-border' ? (
        // Shrub border — row of rounded mounds
        <g>
          <rect x={px} y={py} width={w} height={h} fill="#2A5A1A" stroke="#1A4A0A" strokeWidth={0.5} rx={h / 2} opacity={0.3} />
          {(() => {
            const shrubs = [];
            const isHorizontal = w >= h;
            const shrubR = isHorizontal ? Math.min(h / 2, 6) : Math.min(w / 2, 6);
            const count = isHorizontal
              ? Math.max(2, Math.round(w / (shrubR * 2.2)))
              : Math.max(2, Math.round(h / (shrubR * 2.2)));
            for (let i = 0; i < count; i++) {
              const t = (i + 0.5) / count;
              const sx = isHorizontal ? px + t * w : px + w / 2 + (i % 2 === 0 ? -0.5 : 0.5);
              const sy = isHorizontal ? py + h / 2 + (i % 2 === 0 ? -0.5 : 0.5) : py + t * h;
              const r = shrubR * (0.85 + (i % 3) * 0.1);
              const shade = i % 3 === 0 ? '#3A7A2A' : i % 3 === 1 ? '#4A8A3A' : '#2A6A1A';
              shrubs.push(
                <circle key={`sh-${i}`} cx={sx} cy={sy} r={r} fill={shade} opacity={0.8} />
              );
              // Highlight
              shrubs.push(
                <circle key={`hl-${i}`} cx={sx - r * 0.2} cy={sy - r * 0.25} r={r * 0.4}
                  fill="#5AAA4A" opacity={0.3} />
              );
            }
            return shrubs;
          })()}
        </g>
      ) : element.id === 'curved-bed' ? (
        // Curved planting bed — green with mulch texture
        <g>
          <rect x={px} y={py} width={w} height={h} fill="#4A6A2A" stroke="#3A5A1A" strokeWidth={1.5} rx={3} opacity={0.8} />
          {/* Mulch/plant texture */}
          {Array.from({ length: Math.max(4, Math.floor(w * h / 25)) }).map((_, i) => {
            const cx = px + 2 + ((i * 17 + i * i * 5) % Math.max(1, w - 4));
            const cy = py + 2 + ((i * 11 + i * i * 3) % Math.max(1, h - 4));
            const shade = i % 4 === 0 ? '#6B9B4A' : i % 4 === 1 ? '#5A8A3A' : i % 4 === 2 ? '#3A5A1A' : '#7AAA5A';
            return <circle key={i} cx={cx} cy={cy} r={1 + (i % 3) * 0.5} fill={shade} opacity={0.6} />;
          })}
        </g>
      ) : element.circular ? (
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
      ) : element.id === 'gravel-circle' ? (
        // Gravel circle — circular pad with gravel texture
        <g>
          <ellipse cx={px + w / 2} cy={py + h / 2} rx={w / 2} ry={h / 2}
            fill={element.color} stroke={element.borderColor} strokeWidth={1.5} opacity={0.8} />
          {/* Gravel texture dots */}
          {Array.from({ length: Math.floor(w * h / 150) }).map((_, i) => {
            const rng = seededRandom(i * 37 + 11);
            const angle = rng() * Math.PI * 2;
            const radius = rng() * 0.42;
            const cx = px + w / 2 + Math.cos(angle) * w * radius;
            const cy = py + h / 2 + Math.sin(angle) * h * radius;
            return (
              <circle key={i} cx={cx} cy={cy} r={1 + rng() * 1.5}
                fill={element.borderColor} opacity={0.25 + rng() * 0.15} />
            );
          })}
          {/* Border ring */}
          <ellipse cx={px + w / 2} cy={py + h / 2} rx={w * 0.47} ry={h * 0.47}
            fill="none" stroke={element.borderColor} strokeWidth={0.5} opacity={0.2} />
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
      ) : element.id === 'patio-paver' ? (
        // Paver patio — grid of pavers
        <g>
          <rect x={px} y={py} width={w} height={h} fill={element.color} stroke={element.borderColor} strokeWidth={1.5} rx={2} opacity={0.85} />
          {Array.from({ length: Math.max(1, Math.floor(w / 12)) }).map((_, col) =>
            Array.from({ length: Math.max(1, Math.floor(h / 12)) }).map((_, row) => (
              <rect
                key={`${col}-${row}`}
                x={px + 1.5 + col * (w / Math.max(1, Math.floor(w / 12)))}
                y={py + 1.5 + row * (h / Math.max(1, Math.floor(h / 12)))}
                width={w / Math.max(1, Math.floor(w / 12)) - 3}
                height={h / Math.max(1, Math.floor(h / 12)) - 3}
                fill={element.borderColor}
                opacity={0.2}
                rx={1}
              />
            ))
          )}
        </g>
      ) : element.id === 'paver-dg' ? (
        // Concrete paver squares in decomposed granite
        <g>
          {/* DG base */}
          <rect x={px} y={py} width={w} height={h} fill="#9A8A6A" stroke="#7A6A52" strokeWidth={1.5} rx={2} opacity={0.85} />
          {/* DG speckle texture */}
          {Array.from({ length: Math.max(4, Math.floor(w * h / 20)) }).map((_, i) => (
            <circle key={`dg-${i}`}
              cx={px + 2 + ((i * 17 + i * i * 3) % (w - 4))}
              cy={py + 2 + ((i * 13 + i * i * 7) % (h - 4))}
              r={0.4 + (i % 3) * 0.2}
              fill={i % 3 === 0 ? '#6A5A42' : '#B8A88A'}
              opacity={0.4}
            />
          ))}
          {/* Concrete paver squares — fixed 2ft size */}
          {(() => {
            const paverSize = 12; // ~2ft in SVG units (constant size)
            const gap = 2.5; // DG gap between pavers
            const step = paverSize + gap;
            const pavers = [];
            const startX = px + gap;
            const startY = py + gap;
            for (let sy = startY; sy + paverSize <= py + h; sy += step) {
              for (let sx = startX; sx + paverSize <= px + w; sx += step) {
                pavers.push(
                  <g key={`pv-${sx}-${sy}`}>
                    <rect x={sx} y={sy} width={paverSize} height={paverSize}
                      fill="#DDD5C5" stroke="#C4B8A4" strokeWidth={0.5} rx={0.5} />
                    <rect x={sx} y={sy} width={paverSize} height={paverSize}
                      fill="#C8C0B0" opacity={0.15} rx={0.5} />
                  </g>
                );
              }
            }
            return pavers;
          })()}
        </g>
      ) : element.id === 'planter-concrete' || element.id === 'planter-concrete-rect' ? (
        // Concrete planter — thick walls with greenery inside
        <g>
          {/* Outer concrete shell */}
          <rect x={px} y={py} width={w} height={h} fill="#C4B8A8" stroke="#A89888" strokeWidth={1.5} rx={2} opacity={0.9} />
          {/* Inner soil area */}
          <rect x={px + 2.5} y={py + 2.5} width={Math.max(1, w - 5)} height={Math.max(1, h - 5)}
            fill="#4A6B3A" stroke="#3A5A2A" strokeWidth={0.5} rx={1} opacity={0.85} />
          {/* Plant clusters */}
          {(() => {
            const innerW = w - 5, innerH = h - 5;
            const cx = px + w / 2, cy = py + h / 2;
            const clusters = [];
            const count = Math.max(3, Math.floor((innerW * innerH) / 40));
            for (let i = 0; i < count; i++) {
              const ax = px + 3 + ((i * 17 + i * i * 3) % Math.max(1, innerW - 2));
              const ay = py + 3 + ((i * 13 + i * i * 7) % Math.max(1, innerH - 2));
              const r = 1.5 + (i % 3) * 0.8;
              const shade = i % 4 === 0 ? '#6B9B4A' : i % 4 === 1 ? '#5A8A3A' : i % 4 === 2 ? '#7AAA5A' : '#4A7A2A';
              clusters.push(
                <circle key={`pl-${i}`} cx={ax} cy={ay} r={r} fill={shade} opacity={0.8} />
              );
            }
            return clusters;
          })()}
          {/* Concrete wall highlights */}
          <rect x={px} y={py} width={w} height={2.5} fill="#D0C8BA" opacity={0.4} rx={2} />
          <rect x={px} y={py + h - 2.5} width={w} height={2.5} fill="#B0A898" opacity={0.3} rx={2} />
        </g>
      ) : element.id === 'patio-raised' ? (
        // Raised patio — shadow on two sides to show elevation
        <g>
          {/* Shadow / side face (right and bottom edges) */}
          <polygon
            points={`${px + w},${py + 4} ${px + w + 3},${py + 7} ${px + w + 3},${py + h + 3} ${px + 3},${py + h + 3} ${px},${py + h} ${px + w},${py + h}`}
            fill="#6A5E4E" opacity={0.5}
          />
          {/* Main slab surface */}
          <rect x={px} y={py} width={w} height={h} fill={element.color} stroke={element.borderColor} strokeWidth={1.5} rx={2} opacity={0.9} />
          {/* Broom finish texture */}
          {Array.from({ length: Math.max(1, Math.floor(w / 6)) }).map((_, i) => (
            <line key={i} x1={px + 3 + i * 6} y1={py + 1} x2={px + 3 + i * 6} y2={py + h - 1}
              stroke={element.borderColor} strokeWidth={0.3} opacity={0.25} />
          ))}
          {/* Top highlight edge */}
          <line x1={px + 1} y1={py + 1} x2={px + w - 1} y2={py + 1}
            stroke="#DDD5C8" strokeWidth={1} opacity={0.4} />
        </g>
      ) : element.id === 'patio-concrete' ? (
        // Concrete patio — subtle broom finish lines
        <g>
          <rect x={px} y={py} width={w} height={h} fill={element.color} stroke={element.borderColor} strokeWidth={1.5} rx={2} opacity={0.85} />
          {Array.from({ length: Math.max(1, Math.floor(w / 6)) }).map((_, i) => (
            <line key={i} x1={px + 3 + i * 6} y1={py + 1} x2={px + 3 + i * 6} y2={py + h - 1}
              stroke={element.borderColor} strokeWidth={0.3} opacity={0.3} />
          ))}
        </g>
      ) : element.id === 'deck-wood' ? (
        // Wood deck — planks
        <g>
          <rect x={px} y={py} width={w} height={h} fill={element.color} stroke={element.borderColor} strokeWidth={1.5} rx={2} opacity={0.85} />
          {Array.from({ length: Math.max(1, Math.floor(h / 8)) }).map((_, i) => (
            <line key={i} x1={px + 1} y1={py + 2 + i * 8} x2={px + w - 1} y2={py + 2 + i * 8}
              stroke={element.borderColor} strokeWidth={0.7} opacity={0.4} />
          ))}
        </g>
      ) : element.id === 'fire-pit' ? (
        // Fire pit — ring with inner glow
        <g>
          <ellipse cx={px + w / 2} cy={py + h / 2} rx={w / 2} ry={h / 2} fill={element.color} stroke={element.borderColor} strokeWidth={2} opacity={0.85} />
          <ellipse cx={px + w / 2} cy={py + h / 2} rx={w * 0.3} ry={h * 0.3} fill="#4A2A1A" opacity={0.6} />
          <ellipse cx={px + w / 2} cy={py + h / 2} rx={w * 0.15} ry={h * 0.15} fill="#D4644A" opacity={0.4} />
        </g>
      ) : element.id === 'garden-bench' || element.id === 'swing' ? (
        // Bench / swing — seat plank + backrest
        <g>
          <rect x={px} y={py + h * 0.4} width={w} height={h * 0.6} fill={element.color} stroke={element.borderColor} strokeWidth={1.5} rx={2} opacity={0.85} />
          {/* Backrest */}
          <rect x={px + 2} y={py} width={w - 4} height={h * 0.35} fill={element.color} stroke={element.borderColor} strokeWidth={1} rx={2} opacity={0.7} />
          {/* Slats */}
          {[0.25, 0.5, 0.75].map((t, i) => (
            <line key={i} x1={px + w * t} y1={py + h * 0.4} x2={px + w * t} y2={py + h} stroke={element.borderColor} strokeWidth={0.5} opacity={0.4} />
          ))}
        </g>
      ) : element.id === 'adirondack-chair' ? (
        // Adirondack — wide seat, fan back
        <g>
          {/* Seat */}
          <rect x={px + w * 0.05} y={py + h * 0.5} width={w * 0.9} height={h * 0.5} fill={element.color} stroke={element.borderColor} strokeWidth={1.5} rx={2} opacity={0.85} />
          {/* Fan backrest */}
          <path
            d={`M ${px + w * 0.1} ${py + h * 0.5} L ${px + w * 0.15} ${py + 2} Q ${px + w / 2} ${py - h * 0.05} ${px + w * 0.85} ${py + 2} L ${px + w * 0.9} ${py + h * 0.5}`}
            fill={element.color} stroke={element.borderColor} strokeWidth={1} opacity={0.7}
          />
          {/* Armrests */}
          <rect x={px} y={py + h * 0.45} width={w * 0.12} height={h * 0.35} fill={element.borderColor} rx={1} opacity={0.5} />
          <rect x={px + w * 0.88} y={py + h * 0.45} width={w * 0.12} height={h * 0.35} fill={element.borderColor} rx={1} opacity={0.5} />
        </g>
      ) : element.id === 'hammock' ? (
        // Hammock — curved fabric between two posts
        <g>
          {/* Posts */}
          <rect x={px + w * 0.1} y={py} width={w * 0.15} height={h * 0.08} fill={element.borderColor} rx={1} opacity={0.7} />
          <rect x={px + w * 0.1} y={py + h * 0.92} width={w * 0.15} height={h * 0.08} fill={element.borderColor} rx={1} opacity={0.7} />
          {/* Fabric sag */}
          <path
            d={`M ${px + w * 0.15} ${py + h * 0.06} Q ${px + w * 0.9} ${py + h * 0.5} ${px + w * 0.15} ${py + h * 0.94}`}
            fill="none" stroke={element.color} strokeWidth={w * 0.7} strokeLinecap="round" opacity={0.6}
          />
          <path
            d={`M ${px + w * 0.15} ${py + h * 0.06} Q ${px + w * 0.9} ${py + h * 0.5} ${px + w * 0.15} ${py + h * 0.94}`}
            fill="none" stroke={element.borderColor} strokeWidth={1} opacity={0.5}
          />
        </g>
      ) : element.id === 'lounge-chair' ? (
        // Sun lounge chair — recliner with headrest
        <g>
          {/* Frame/legs */}
          <rect x={px + w * 0.08} y={py + h * 0.05} width={w * 0.84} height={h * 0.9}
            fill="none" stroke={element.borderColor} strokeWidth={1.5} rx={3} opacity={0.6} />
          {/* Seat pad */}
          <rect x={px + w * 0.12} y={py + h * 0.2} width={w * 0.76} height={h * 0.7}
            fill={element.color} stroke={element.borderColor} strokeWidth={1} rx={2} opacity={0.85} />
          {/* Raised headrest */}
          <rect x={px + w * 0.12} y={py + h * 0.06} width={w * 0.76} height={h * 0.18}
            fill={element.color} stroke={element.borderColor} strokeWidth={1} rx={2} opacity={0.9} />
          {/* Cushion quilt lines */}
          {[0.38, 0.52, 0.66, 0.78].map((t, i) => (
            <line key={i} x1={px + w * 0.15} y1={py + h * t} x2={px + w * 0.85} y2={py + h * t}
              stroke={element.borderColor} strokeWidth={0.5} opacity={0.3} />
          ))}
        </g>
      ) : element.id === 'dining-table-rect' ? (
        // Rectangular dining table with 6 chairs
        <g>
          {/* Table */}
          <rect x={px + w * 0.15} y={py + h * 0.2} width={w * 0.7} height={h * 0.6}
            fill={element.color} stroke={element.borderColor} strokeWidth={1.5} rx={3} opacity={0.85} />
          {/* Chairs — 2 on each long side, 1 on each short side */}
          {/* Top row */}
          {[0.33, 0.67].map((t, i) => (
            <rect key={`t${i}`} x={px + w * t - w * 0.07} y={py} width={w * 0.14} height={h * 0.17}
              fill={element.borderColor} rx={2} opacity={0.6} />
          ))}
          {/* Bottom row */}
          {[0.33, 0.67].map((t, i) => (
            <rect key={`b${i}`} x={px + w * t - w * 0.07} y={py + h * 0.83} width={w * 0.14} height={h * 0.17}
              fill={element.borderColor} rx={2} opacity={0.6} />
          ))}
          {/* Left end */}
          <rect x={px} y={py + h * 0.4} width={w * 0.12} height={h * 0.2}
            fill={element.borderColor} rx={2} opacity={0.6} />
          {/* Right end */}
          <rect x={px + w * 0.88} y={py + h * 0.4} width={w * 0.12} height={h * 0.2}
            fill={element.borderColor} rx={2} opacity={0.6} />
        </g>
      ) : element.id === 'patio-dining' ? (
        // Patio dining — round table + 4 chair dots
        <g>
          {/* Table */}
          <ellipse cx={px + w / 2} cy={py + h / 2} rx={w * 0.3} ry={h * 0.3} fill={element.color} stroke={element.borderColor} strokeWidth={1.5} opacity={0.85} />
          {/* Chairs at N/S/E/W */}
          {[[0.5, 0.08], [0.5, 0.92], [0.08, 0.5], [0.92, 0.5]].map(([tx, ty], i) => (
            <rect key={i} x={px + w * tx - w * 0.09} y={py + h * ty - h * 0.09} width={w * 0.18} height={h * 0.18} fill={element.borderColor} rx={2} opacity={0.6} />
          ))}
        </g>
      ) : element.id === 'garden-chess' ? (
        // Giant chess set — checkered board with a few piece silhouettes
        <g>
          {/* Board base */}
          <rect x={px} y={py} width={w} height={h} fill="#D4C8B0" stroke={element.borderColor} strokeWidth={1.5} rx={2} opacity={0.9} />
          {/* Checkerboard squares */}
          {Array.from({ length: 8 }).map((_, row) =>
            Array.from({ length: 8 }).map((_, col) => {
              if ((row + col) % 2 === 0) return null;
              return (
                <rect key={`${row}-${col}`}
                  x={px + col * w / 8} y={py + row * h / 8}
                  width={w / 8} height={h / 8}
                  fill="#5A4A3A" opacity={0.6}
                />
              );
            })
          )}
          {/* A few chess piece silhouettes — king, queen, rook, pawn */}
          {/* White king */}
          <text x={px + w * 0.5625} y={py + h * 0.94} textAnchor="middle" fontSize={w / 9} fill="#F5F0E8" opacity={0.9}>♔</text>
          {/* Black queen */}
          <text x={px + w * 0.4375} y={py + h * 0.19} textAnchor="middle" fontSize={w / 9} fill="#2A2A2A" opacity={0.8}>♛</text>
          {/* White rook */}
          <text x={px + w * 0.0625} y={py + h * 0.94} textAnchor="middle" fontSize={w / 10} fill="#F5F0E8" opacity={0.85}>♖</text>
          {/* Black knight */}
          <text x={px + w * 0.8125} y={py + h * 0.19} textAnchor="middle" fontSize={w / 10} fill="#2A2A2A" opacity={0.75}>♞</text>
          {/* Pawns */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
            <text key={`wp${i}`} x={px + w * (i + 0.5) / 8} y={py + h * 0.81}
              textAnchor="middle" fontSize={w / 12} fill="#F5F0E8" opacity={0.7}>♙</text>
          ))}
        </g>
      ) : element.id === 'gazebo' ? (
        // Gazebo — octagonal roof with posts
        <g>
          {/* Floor/base */}
          <ellipse cx={px + w / 2} cy={py + h / 2} rx={w / 2} ry={h / 2}
            fill={element.color} stroke={element.borderColor} strokeWidth={2} opacity={0.85} />
          {/* Roof (darker, slightly smaller) */}
          <ellipse cx={px + w / 2} cy={py + h / 2} rx={w * 0.42} ry={h * 0.42}
            fill={element.borderColor} opacity={0.3} />
          {/* Octagonal roof lines */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i * 45 - 90) * Math.PI / 180;
            return (
              <line key={i}
                x1={px + w / 2} y1={py + h / 2}
                x2={px + w / 2 + Math.cos(angle) * w * 0.45}
                y2={py + h / 2 + Math.sin(angle) * h * 0.45}
                stroke={element.borderColor} strokeWidth={1} opacity={0.4} />
            );
          })}
          {/* Posts at corners */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i * 45 - 90) * Math.PI / 180;
            return (
              <circle key={`p${i}`}
                cx={px + w / 2 + Math.cos(angle) * w * 0.42}
                cy={py + h / 2 + Math.sin(angle) * h * 0.42}
                r={2} fill={element.borderColor} opacity={0.7} />
            );
          })}
          {/* Cupola center */}
          <circle cx={px + w / 2} cy={py + h / 2} r={w * 0.06} fill={element.borderColor} opacity={0.5} />
        </g>
      ) : element.id === 'chicken-coop' ? (
        // Chicken coop — house section + wire run
        <g>
          {/* Run area (wire mesh) */}
          <rect x={px} y={py} width={w} height={h}
            fill="#E8DDD0" stroke={element.borderColor} strokeWidth={1.5} rx={2} opacity={0.7} />
          {/* Wire mesh pattern */}
          {Array.from({ length: Math.max(1, Math.floor(w / 8)) }).map((_, i) => (
            <line key={`v${i}`} x1={px + 4 + i * 8} y1={py + h * 0.35} x2={px + 4 + i * 8} y2={py + h - 2}
              stroke={element.borderColor} strokeWidth={0.3} opacity={0.3} />
          ))}
          {Array.from({ length: Math.max(1, Math.floor(h * 0.65 / 8)) }).map((_, i) => (
            <line key={`h${i}`} x1={px + 2} y1={py + h * 0.35 + 4 + i * 8} x2={px + w - 2} y2={py + h * 0.35 + 4 + i * 8}
              stroke={element.borderColor} strokeWidth={0.3} opacity={0.3} />
          ))}
          {/* Coop house (top third) */}
          <rect x={px} y={py} width={w} height={h * 0.35}
            fill={element.color} stroke={element.borderColor} strokeWidth={1.5} rx={2} opacity={0.9} />
          {/* Roof peak */}
          <line x1={px} y1={py + h * 0.05} x2={px + w} y2={py + h * 0.05}
            stroke={element.borderColor} strokeWidth={2} opacity={0.5} />
          {/* Door */}
          <rect x={px + w * 0.4} y={py + h * 0.12} width={w * 0.2} height={h * 0.22}
            fill={element.borderColor} rx={1} opacity={0.5} />
          {/* Chicken emoji */}
          <text x={px + w * 0.15} y={py + h * 0.75} fontSize={Math.min(w, h) * 0.18} opacity={0.5}>🐔</text>
        </g>
      ) : element.id === 'bunny-hutch' ? (
        // Bunny hutch — raised box with mesh front
        <g>
          {/* Hutch body */}
          <rect x={px} y={py} width={w} height={h * 0.75}
            fill={element.color} stroke={element.borderColor} strokeWidth={1.5} rx={2} opacity={0.9} />
          {/* Legs */}
          <rect x={px + w * 0.08} y={py + h * 0.7} width={w * 0.08} height={h * 0.3}
            fill={element.borderColor} rx={1} opacity={0.7} />
          <rect x={px + w * 0.84} y={py + h * 0.7} width={w * 0.08} height={h * 0.3}
            fill={element.borderColor} rx={1} opacity={0.7} />
          {/* Mesh front (right half) */}
          <rect x={px + w * 0.5} y={py + h * 0.08} width={w * 0.45} height={h * 0.58}
            fill="#E8E0D0" stroke={element.borderColor} strokeWidth={0.8} rx={1} opacity={0.6} />
          {Array.from({ length: 3 }).map((_, i) => (
            <line key={i} x1={px + w * 0.55 + i * w * 0.13} y1={py + h * 0.1} x2={px + w * 0.55 + i * w * 0.13} y2={py + h * 0.63}
              stroke={element.borderColor} strokeWidth={0.4} opacity={0.35} />
          ))}
          {/* Solid door (left half) */}
          <rect x={px + w * 0.05} y={py + h * 0.08} width={w * 0.4} height={h * 0.58}
            fill={element.borderColor} rx={1} opacity={0.3} />
          {/* Bunny emoji */}
          <text x={px + w * 0.6} y={py + h * 0.52} fontSize={Math.min(w, h) * 0.3} opacity={0.4}>🐰</text>
        </g>
      ) : element.id === 'bistro-set' ? (
        // Bistro — small round table + 2 chairs
        <g>
          <ellipse cx={px + w / 2} cy={py + h / 2} rx={w * 0.22} ry={h * 0.22} fill={element.color} stroke={element.borderColor} strokeWidth={1.5} opacity={0.85} />
          {/* Two chairs */}
          {[[0.5, 0.05], [0.5, 0.95]].map(([tx, ty], i) => (
            <circle key={i} cx={px + w * tx} cy={py + h * ty} r={w * 0.12} fill={element.borderColor} opacity={0.55} />
          ))}
        </g>
      ) : element.id === 'concrete-bench' ? (
        // Concrete bench — solid slab, no legs (wall-mount style)
        <g>
          {/* Slab */}
          <rect x={px} y={py} width={w} height={h}
            fill={element.color} stroke={element.borderColor} strokeWidth={1.5} rx={2} opacity={0.9} />
          {/* Broom finish lines */}
          {Array.from({ length: Math.max(1, Math.floor(w / 8)) }).map((_, i) => (
            <line key={i} x1={px + 3 + i * 8} y1={py + 1} x2={px + 3 + i * 8} y2={py + h - 1}
              stroke={element.borderColor} strokeWidth={0.3} opacity={0.3} />
          ))}
          {/* Front edge shadow */}
          <line x1={px} y1={py + h - 1} x2={px + w} y2={py + h - 1}
            stroke={element.borderColor} strokeWidth={1} opacity={0.4} />
        </g>
      ) : element.id === 'concrete-steps' ? (
        // Concrete steps — 3 descending treads
        <g>
          {[0, 1, 2].map(i => {
            const stepY = py + (i * h / 3);
            const stepH = h / 3;
            const inset = i * w * 0.06;
            return (
              <g key={i}>
                <rect x={px + inset} y={stepY} width={w - inset * 2} height={stepH}
                  fill={i === 0 ? '#C4B8AA' : i === 1 ? '#B8AAA0' : '#ACA096'}
                  stroke={element.borderColor} strokeWidth={1} rx={1} opacity={0.9} />
                {/* Tread edge shadow */}
                <line x1={px + inset} y1={stepY + stepH - 1} x2={px + w - inset} y2={stepY + stepH - 1}
                  stroke={element.borderColor} strokeWidth={0.8} opacity={0.4} />
              </g>
            );
          })}
        </g>
      ) : element.id === 'pool' ? (
        // Swimming pool — water with lane lines and coping
        <g>
          {/* Pool coping (border) */}
          <rect x={px - 2} y={py - 2} width={w + 4} height={h + 4} fill="#C4B8A8" rx={6} opacity={0.9} />
          {/* Water */}
          <rect x={px} y={py} width={w} height={h} fill="#5BA4CF" rx={5} opacity={0.85} />
          {/* Lighter water center */}
          <rect x={px + w * 0.1} y={py + h * 0.1} width={w * 0.8} height={h * 0.8} fill="#7EC4E8" rx={4} opacity={0.4} />
          {/* Lane lines */}
          {Array.from({ length: Math.max(1, Math.floor(w / 20)) }).map((_, i) => {
            const lx = px + (i + 1) * (w / (Math.floor(w / 20) + 1));
            return <line key={i} x1={lx} y1={py + 6} x2={lx} y2={py + h - 6} stroke="#4A94BF" strokeWidth={0.5} opacity={0.4} strokeDasharray="4 3" />;
          })}
          {/* Water ripple highlights */}
          {Array.from({ length: 3 }).map((_, i) => (
            <ellipse key={`r${i}`} cx={px + w * (0.3 + i * 0.2)} cy={py + h * (0.3 + i * 0.15)} rx={w * 0.08} ry={h * 0.03} fill="#A8DCF0" opacity={0.3} />
          ))}
          {/* Steps indicator (shallow end) */}
          <rect x={px + 2} y={py + 2} width={w - 4} height={h * 0.08} fill="#7EC4E8" rx={2} opacity={0.5} />
        </g>
      ) : element.id === 'wall-straight' ? (
        // Straight wall — stone/brick texture
        <g>
          <rect x={px} y={py} width={w} height={h} fill={element.color} stroke={element.borderColor} strokeWidth={2} rx={1} opacity={0.9} />
          {/* Stone block lines */}
          {w > h ? (
            // Horizontal wall — vertical joints
            <>
              {Array.from({ length: Math.max(1, Math.floor(w / 10)) }).map((_, i) => {
                const bx = px + 5 + i * 10;
                if (bx >= px + w - 2) return null;
                return <line key={i} x1={bx} y1={py + 1} x2={bx} y2={py + h - 1} stroke={element.borderColor} strokeWidth={0.8} opacity={0.5} />;
              })}
              {/* Horizontal mortar line */}
              <line x1={px + 1} y1={py + h / 2} x2={px + w - 1} y2={py + h / 2} stroke={element.borderColor} strokeWidth={0.5} opacity={0.35} />
            </>
          ) : (
            // Vertical wall — horizontal joints
            <>
              {Array.from({ length: Math.max(1, Math.floor(h / 10)) }).map((_, i) => {
                const by = py + 5 + i * 10;
                if (by >= py + h - 2) return null;
                return <line key={i} x1={px + 1} y1={by} x2={px + w - 1} y2={by} stroke={element.borderColor} strokeWidth={0.8} opacity={0.5} />;
              })}
              {/* Vertical mortar line */}
              <line x1={px + w / 2} y1={py + 1} x2={px + w / 2} y2={py + h - 1} stroke={element.borderColor} strokeWidth={0.5} opacity={0.35} />
            </>
          )}
          {/* Cap stones — top edge highlight */}
          <rect x={px} y={py} width={w} height={Math.min(h, w) > h ? 2 : w > h ? h * 0.15 : 2} fill={element.borderColor} opacity={0.3} rx={1} />
        </g>
      ) : element.id === 'wall-curved' ? (
        // Curved wall — arc shape with stone texture
        <g>
          {/* Arc path */}
          <path
            d={`M ${px} ${py + h} Q ${px + w * 0.15} ${py} ${px + w / 2} ${py} Q ${px + w * 0.85} ${py} ${px + w} ${py + h}`}
            fill="none"
            stroke={element.color}
            strokeWidth={Math.max(4, Math.min(w, h) * 0.12)}
            strokeLinecap="round"
            opacity={0.9}
          />
          {/* Outer edge */}
          <path
            d={`M ${px} ${py + h} Q ${px + w * 0.15} ${py} ${px + w / 2} ${py} Q ${px + w * 0.85} ${py} ${px + w} ${py + h}`}
            fill="none"
            stroke={element.borderColor}
            strokeWidth={Math.max(6, Math.min(w, h) * 0.15)}
            strokeLinecap="round"
            opacity={0.4}
          />
          {/* Stone texture marks along the curve */}
          {Array.from({ length: 5 }).map((_, i) => {
            const t = (i + 1) / 6;
            const cx = px + w * t;
            const cy = py + h * (1 - Math.sin(t * Math.PI)) * 0.85;
            return <circle key={i} cx={cx} cy={cy} r={1.5} fill={element.borderColor} opacity={0.4} />;
          })}
        </g>
      ) : element.id === 'awning-metal' ? (
        // Flat metal canopy — clean MCM style
        <g>
          {/* Shadow underneath */}
          <rect x={px + 1.5} y={py + 1.5} width={w} height={h} fill="#000" opacity={0.12} rx={0.5} />
          {/* Main canopy surface — dark metal */}
          <rect x={px} y={py} width={w} height={h} fill="#4A4A4A" stroke="#2A2A2A" strokeWidth={1} rx={0.5} opacity={0.9} />
          {/* Subtle surface sheen */}
          <rect x={px + 1} y={py + 1} width={w - 2} height={h * 0.35} fill="#666" opacity={0.2} rx={0.5} />
          {/* Front drip edge — slightly lighter */}
          <rect x={px} y={py + h - 1.5} width={w} height={1.5} fill="#555" opacity={0.6} rx={0.3} />
          {/* Slim support posts — two thin lines */}
          <rect x={px + 3} y={py + 2} width={1} height={h - 4} fill="#333" opacity={0.7} rx={0.3} />
          <rect x={px + w - 4} y={py + 2} width={1} height={h - 4} fill="#333" opacity={0.7} rx={0.3} />
        </g>
      ) : element.id === 'awning-beam' ? (
        // Post-and-beam overhang — exposed wood MCM style
        <g>
          {/* Shadow underneath */}
          <rect x={px + 2} y={py + 2} width={w} height={h} fill="#000" opacity={0.1} rx={1} />
          {/* Main beam surface */}
          <rect x={px} y={py} width={w} height={h} fill="#9A7A5A" stroke="#6B4B2A" strokeWidth={1} rx={1} opacity={0.9} />
          {/* Wood grain lines */}
          {Array.from({ length: Math.max(2, Math.floor(w / 5)) }).map((_, i) => (
            <line key={`grain-${i}`} x1={px + 2.5 + i * 5} y1={py + 1} x2={px + 2.5 + i * 5} y2={py + h - 1}
              stroke="#6B4B2A" strokeWidth={0.3} opacity={0.3} />
          ))}
          {/* Cross beams */}
          <rect x={px} y={py + h * 0.3} width={w} height={2} fill="#7A5A3A" opacity={0.5} rx={0.5} />
          <rect x={px} y={py + h * 0.65} width={w} height={2} fill="#7A5A3A" opacity={0.5} rx={0.5} />
          {/* Support posts at ends */}
          <rect x={px + 1} y={py + 1} width={2.5} height={h - 2} fill="#6B4B2A" opacity={0.7} rx={0.5} />
          <rect x={px + w - 3.5} y={py + 1} width={2.5} height={h - 2} fill="#6B4B2A" opacity={0.7} rx={0.5} />
          {/* Top highlight */}
          <rect x={px + 1} y={py} width={w - 2} height={1.5} fill="#B89A7A" opacity={0.4} rx={0.5} />
        </g>
      ) : element.id === 'pergola' ? (
        // Pergola — posts, beams, and slatted roof
        <g>
          {/* Shadow underneath */}
          <rect x={px + 1} y={py + 1} width={w} height={h} fill="#000" opacity={0.08} rx={1} />
          {/* Floor area — subtle ground */}
          <rect x={px} y={py} width={w} height={h} fill="#D4C8B0" stroke="#A89070" strokeWidth={0.5} rx={1} opacity={0.3} />
          {/* Roof slats running horizontally */}
          {Array.from({ length: Math.max(2, Math.floor(h / 5)) }).map((_, i) => {
            const sy = py + 2 + i * ((h - 4) / Math.max(1, Math.floor(h / 5)));
            return (
              <rect key={`slat-${i}`} x={px + 1} y={sy} width={w - 2} height={1.8}
                fill="#8B6B4A" opacity={0.55} rx={0.3} />
            );
          })}
          {/* Main beams running vertically (2 beams) */}
          <rect x={px + w * 0.25 - 1} y={py} width={2.5} height={h} fill="#7A5A3A" opacity={0.7} rx={0.5} />
          <rect x={px + w * 0.75 - 1} y={py} width={2.5} height={h} fill="#7A5A3A" opacity={0.7} rx={0.5} />
          {/* Corner posts */}
          {[[px + 1.5, py + 1.5], [px + w - 4.5, py + 1.5], [px + 1.5, py + h - 4.5], [px + w - 4.5, py + h - 4.5]].map(([cx, cy], i) => (
            <g key={`post-${i}`}>
              <rect x={cx} y={cy} width={3} height={3} fill="#6B4B2A" stroke="#5A3A1A" strokeWidth={0.5} rx={0.5} />
              <rect x={cx + 0.3} y={cy + 0.3} width={1.2} height={1.2} fill="#8B6B4A" opacity={0.5} rx={0.2} />
            </g>
          ))}
          {/* Climbing vine/greenery draped over the slats */}
          {(() => {
            const vines = [];
            const count = Math.max(3, Math.floor((w * h) / 30));
            for (let i = 0; i < count; i++) {
              const vx = px + 2 + ((i * 19 + i * i * 5) % Math.max(1, w - 4));
              const vy = py + 1 + ((i * 11 + i * i * 3) % Math.max(1, h - 2));
              const r = 1.2 + (i % 4) * 0.6;
              const shade = i % 5 === 0 ? '#5A9A3A' : i % 5 === 1 ? '#4A8A2A' : i % 5 === 2 ? '#6BAA4A' : i % 5 === 3 ? '#3A7A1A' : '#7BBB5A';
              vines.push(
                <circle key={`vine-${i}`} cx={vx} cy={vy} r={r} fill={shade} opacity={0.6} />
              );
            }
            return vines;
          })()}
          {/* Outline */}
          <rect x={px} y={py} width={w} height={h} fill="none" stroke="#6B4B2A" strokeWidth={1} rx={1} opacity={0.6} />
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
