// Catmull-Rom spline → SVG cubic Bezier path conversion
// Produces smooth closed or open paths through a series of control points.

/**
 * Convert a Catmull-Rom segment (4 points) to cubic Bezier control points.
 * Returns { cp1: {x,y}, cp2: {x,y} } — the two off-curve control points.
 * The on-curve endpoints are p1 and p2.
 */
function catmullRomSegment(p0, p1, p2, p3, tension = 0.5) {
  const t = tension;
  return {
    cp1: {
      x: p1.x + (p2.x - p0.x) / (6 / t),
      y: p1.y + (p2.y - p0.y) / (6 / t),
    },
    cp2: {
      x: p2.x - (p3.x - p1.x) / (6 / t),
      y: p2.y - (p3.y - p1.y) / (6 / t),
    },
  };
}

/**
 * Build an SVG path `d` string from control points using Catmull-Rom interpolation.
 *
 * @param {Array<{x: number, y: number}>} points - Control points
 * @param {Object} options
 * @param {number} options.tension - Curve tightness (0 = straight, 1 = very curvy). Default 0.5.
 * @param {boolean} options.closed - Whether the path is closed. Default true.
 * @param {Array<string>} options.modes - Per-vertex mode: 'smooth' or 'sharp'. Default all smooth.
 * @returns {string} SVG path `d` attribute
 */
export function smoothPath(points, { tension = 0.5, closed = true, modes } = {}) {
  if (!points || points.length < 2) return '';
  const n = points.length;
  if (n === 2) {
    return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}${closed ? ' Z' : ''}`;
  }

  const getMode = (i) => modes?.[i] || 'smooth';

  let d = `M ${points[0].x},${points[0].y}`;

  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const i0 = (i - 1 + n) % n;
    const i1 = i;
    const i2 = (i + 1) % n;
    const i3 = (i + 2) % n;

    const p0 = points[i0];
    const p1 = points[i1];
    const p2 = points[i2];
    const p3 = points[i3];

    // If either endpoint is sharp, use straight line
    if (getMode(i1) === 'sharp' && getMode(i2) === 'sharp') {
      d += ` L ${p2.x},${p2.y}`;
    } else if (getMode(i1) === 'sharp' || getMode(i2) === 'sharp') {
      // One sharp, one smooth — use quadratic bezier for partial smoothing
      const { cp1, cp2 } = catmullRomSegment(p0, p1, p2, p3, tension);
      if (getMode(i1) === 'sharp') {
        // Sharp start, smooth end — use cp2 only
        d += ` Q ${cp2.x},${cp2.y} ${p2.x},${p2.y}`;
      } else {
        // Smooth start, sharp end — use cp1 only
        d += ` Q ${cp1.x},${cp1.y} ${p2.x},${p2.y}`;
      }
    } else {
      // Both smooth — full cubic bezier
      const { cp1, cp2 } = catmullRomSegment(p0, p1, p2, p3, tension);
      d += ` C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${p2.x},${p2.y}`;
    }
  }

  if (closed) d += ' Z';
  return d;
}

/**
 * Sample a smooth path into discrete points for area calculation.
 * Uses the same logic as smoothPath but outputs point coordinates.
 */
export function sampleSmoothPath(points, { tension = 0.5, closed = true, modes, samplesPerSegment = 8 } = {}) {
  if (!points || points.length < 2) return points || [];
  const n = points.length;
  const result = [];
  const getMode = (i) => modes?.[i] || 'smooth';

  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const i0 = (i - 1 + n) % n;
    const i1 = i;
    const i2 = (i + 1) % n;
    const i3 = (i + 2) % n;

    const p0 = points[i0];
    const p1 = points[i1];
    const p2 = points[i2];
    const p3 = points[i3];

    if (getMode(i1) === 'sharp' && getMode(i2) === 'sharp') {
      result.push({ x: p1.x, y: p1.y });
    } else {
      const { cp1, cp2 } = catmullRomSegment(p0, p1, p2, p3, tension);
      for (let s = 0; s < samplesPerSegment; s++) {
        const t = s / samplesPerSegment;
        // Cubic bezier interpolation
        const mt = 1 - t;
        const x = mt * mt * mt * p1.x + 3 * mt * mt * t * cp1.x + 3 * mt * t * t * cp2.x + t * t * t * p2.x;
        const y = mt * mt * mt * p1.y + 3 * mt * mt * t * cp1.y + 3 * mt * t * t * cp2.y + t * t * t * p2.y;
        result.push({ x, y });
      }
    }
  }

  return result;
}

/**
 * Calculate area of a smooth path using sampled points + shoelace formula.
 */
export function smoothPathArea(points, options) {
  const sampled = sampleSmoothPath(points, options);
  if (sampled.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < sampled.length; i++) {
    const j = (i + 1) % sampled.length;
    area += sampled[i].x * sampled[j].y;
    area -= sampled[j].x * sampled[i].y;
  }
  return Math.abs(area / 2);
}
