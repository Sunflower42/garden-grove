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
