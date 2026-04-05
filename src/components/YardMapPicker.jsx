import { useState, useRef, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Move, Plus, Minus, Home, Fence, Undo2 } from 'lucide-react';

// Haversine-based distance in feet between two lat/lng points
function distanceFt(lat1, lng1, lat2, lng2) {
  const R = 20902231; // Earth radius in feet
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Convert feet to lat/lng offset at a given latitude
function feetToLatLng(lat, widthFt, heightFt) {
  const latPerFt = 1 / 364000;
  const lngPerFt = 1 / (364000 * Math.cos(lat * Math.PI / 180));
  return {
    dLat: heightFt * latPerFt,
    dLng: widthFt * lngPerFt,
  };
}

// Shoelace formula for polygon area in sq feet (from lat/lng vertices)
function polygonAreaSqFt(vertices) {
  if (vertices.length < 3) return 0;
  const cLat = vertices.reduce((s, v) => s + v[0], 0) / vertices.length;
  const cLng = vertices.reduce((s, v) => s + v[1], 0) / vertices.length;
  const pts = vertices.map(v => ({
    x: distanceFt(cLat, cLng, cLat, v[1]) * (v[1] > cLng ? 1 : -1),
    y: distanceFt(cLat, cLng, v[0], cLng) * (v[0] > cLat ? 1 : -1),
  }));
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  return Math.abs(area / 2);
}

// Bounding box dimensions in feet
function boundingBoxFt(vertices) {
  if (vertices.length < 2) return { width: 0, height: 0 };
  const lats = vertices.map(v => v[0]);
  const lngs = vertices.map(v => v[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  return {
    width: Math.round(distanceFt(minLat, minLng, minLat, maxLng)),
    height: Math.round(distanceFt(minLat, minLng, maxLat, minLng)),
  };
}

// Find closest point on a line segment to a given point (in pixel space)
function closestPointOnSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return { x: ax, y: ay, t: 0 };
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return { x: ax + t * dx, y: ay + t * dy, t };
}

// Convert lat/lng vertices to feet relative to yard bounding box
function verticesToFeet(vertices, yardVertices) {
  if (!vertices || vertices.length < 3) return null;
  // Use yard bounding box as reference frame
  const refVerts = yardVertices || vertices;
  const lats = refVerts.map(v => v[0]);
  const lngs = refVerts.map(v => v[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const cLat = (minLat + maxLat) / 2;
  const latPerFt = 1 / 364000;
  const lngPerFt = 1 / (364000 * Math.cos(cLat * Math.PI / 180));
  return vertices.map(v => ({
    x: Math.round((v[1] - minLng) / lngPerFt),
    y: Math.round((maxLat - v[0]) / latPerFt),
  }));
}

// Ray-casting point-in-polygon test (pixel space)
function pointInPolygonPx(px, py, polyPixels) {
  let inside = false;
  for (let i = 0, j = polyPixels.length - 1; i < polyPixels.length; j = i++) {
    const xi = polyPixels[i].x, yi = polyPixels[i].y;
    const xj = polyPixels[j].x, yj = polyPixels[j].y;
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// Interactive polygon editor — handles one polygon at a time
function PolygonEditor({ vertices, onChange, color, fillColor, isActive }) {
  const map = useMap();
  const dragging = useRef(null);

  // Larger hit targets and handles on touch devices
  const isTouch = 'ontouchstart' in window;
  const hitRadius = isTouch ? 24 : 14;
  const edgeHitRadius = isTouch ? 18 : 10;

  // Shared logic for starting a drag (mouse or touch)
  const handlePointerDown = useCallback((latlng, originalEvent) => {
    if (!isActive || !vertices || vertices.length === 0) return;
    const pixel = map.latLngToContainerPoint(latlng);

    // Check if touching a vertex
    for (let i = 0; i < vertices.length; i++) {
      const vp = map.latLngToContainerPoint(L.latLng(vertices[i][0], vertices[i][1]));
      if (Math.abs(pixel.x - vp.x) < hitRadius && Math.abs(pixel.y - vp.y) < hitRadius) {
        originalEvent.stopPropagation();
        originalEvent.preventDefault();
        dragging.current = { vertexIndex: i };
        map.dragging.disable();
        map.scrollWheelZoom.disable();
        map.doubleClickZoom.disable();
        if (map.touchZoom) map.touchZoom.disable();
        return;
      }
    }

    // Check if touching near an edge (to add a point)
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      const ap = map.latLngToContainerPoint(L.latLng(vertices[i][0], vertices[i][1]));
      const bp = map.latLngToContainerPoint(L.latLng(vertices[j][0], vertices[j][1]));
      const cp = closestPointOnSegment(pixel.x, pixel.y, ap.x, ap.y, bp.x, bp.y);
      const dist = Math.sqrt((pixel.x - cp.x) ** 2 + (pixel.y - cp.y) ** 2);
      if (dist < edgeHitRadius && cp.t > 0.1 && cp.t < 0.9) {
        originalEvent.stopPropagation();
        originalEvent.preventDefault();
        const newVert = [latlng.lat, latlng.lng];
        const newVertices = [...vertices];
        newVertices.splice(j, 0, newVert);
        onChange(newVertices);
        dragging.current = { vertexIndex: j };
        map.dragging.disable();
        map.scrollWheelZoom.disable();
        map.doubleClickZoom.disable();
        if (map.touchZoom) map.touchZoom.disable();
        return;
      }
    }

    // Check if clicking inside the polygon — drag whole shape
    const polyPixels = vertices.map(v => map.latLngToContainerPoint(L.latLng(v[0], v[1])));
    if (pointInPolygonPx(pixel.x, pixel.y, polyPixels)) {
      originalEvent.stopPropagation();
      originalEvent.preventDefault();
      dragging.current = { wholePolygon: true, startLatLng: latlng };
      map.dragging.disable();
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
      if (map.touchZoom) map.touchZoom.disable();
      return;
    }
  }, [isActive, vertices, onChange, map, hitRadius, edgeHitRadius]);

  const handlePointerMove = useCallback((latlng) => {
    if (!dragging.current) return;
    if (dragging.current.wholePolygon) {
      const dLat = latlng.lat - dragging.current.startLatLng.lat;
      const dLng = latlng.lng - dragging.current.startLatLng.lng;
      const newVertices = vertices.map(v => [v[0] + dLat, v[1] + dLng]);
      dragging.current.startLatLng = latlng;
      onChange(newVertices);
      return;
    }
    const { vertexIndex } = dragging.current;
    const newVertices = [...vertices];
    newVertices[vertexIndex] = [latlng.lat, latlng.lng];
    onChange(newVertices);
  }, [vertices, onChange]);

  const handlePointerUp = useCallback(() => {
    if (dragging.current) {
      dragging.current = null;
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      if (map.touchZoom) map.touchZoom.enable();
      setTimeout(() => map.doubleClickZoom.enable(), 300);
      map.getContainer().style.cursor = '';
    }
  }, [map]);

  // Attach touch events directly to the map container for reliable iPad support
  useEffect(() => {
    const container = map.getContainer();

    const onTouchStart = (e) => {
      if (!isActive || !vertices || vertices.length === 0) return;
      if (e.touches.length !== 1) return; // only single-finger
      const touch = e.touches[0];
      const rect = container.getBoundingClientRect();
      const point = L.point(touch.clientX - rect.left, touch.clientY - rect.top);
      const latlng = map.containerPointToLatLng(point);
      handlePointerDown(latlng, e);
    };

    const onTouchMove = (e) => {
      if (!dragging.current) return;
      if (e.touches.length !== 1) return;
      e.preventDefault();
      const touch = e.touches[0];
      const rect = container.getBoundingClientRect();
      const point = L.point(touch.clientX - rect.left, touch.clientY - rect.top);
      const latlng = map.containerPointToLatLng(point);
      handlePointerMove(latlng);
    };

    const onTouchEnd = () => {
      handlePointerUp();
    };

    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd);

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, [map, isActive, vertices, handlePointerDown, handlePointerMove, handlePointerUp]);

  useMapEvents({
    mousedown(e) {
      handlePointerDown(e.latlng, e.originalEvent);
    },
    mousemove(e) {
      if (!dragging.current) {
        if (!isActive || !vertices || vertices.length === 0) return;
        const pixel = map.latLngToContainerPoint(e.latlng);
        const container = map.getContainer();

        for (let i = 0; i < vertices.length; i++) {
          const vp = map.latLngToContainerPoint(L.latLng(vertices[i][0], vertices[i][1]));
          if (Math.abs(pixel.x - vp.x) < hitRadius && Math.abs(pixel.y - vp.y) < hitRadius) {
            container.style.cursor = 'grab';
            return;
          }
        }

        for (let i = 0; i < vertices.length; i++) {
          const j = (i + 1) % vertices.length;
          const ap = map.latLngToContainerPoint(L.latLng(vertices[i][0], vertices[i][1]));
          const bp = map.latLngToContainerPoint(L.latLng(vertices[j][0], vertices[j][1]));
          const cp = closestPointOnSegment(pixel.x, pixel.y, ap.x, ap.y, bp.x, bp.y);
          const dist = Math.sqrt((pixel.x - cp.x) ** 2 + (pixel.y - cp.y) ** 2);
          if (dist < edgeHitRadius && cp.t > 0.1 && cp.t < 0.9) {
            container.style.cursor = 'crosshair';
            return;
          }
        }

        // Check if inside polygon — show move cursor
        const polyPixels = vertices.map(v => map.latLngToContainerPoint(L.latLng(v[0], v[1])));
        if (pointInPolygonPx(pixel.x, pixel.y, polyPixels)) {
          container.style.cursor = 'move';
          return;
        }

        container.style.cursor = '';
        return;
      }

      handlePointerMove(e.latlng);
    },
    mouseup() {
      handlePointerUp();
    },
    contextmenu(e) {
      // Only allow vertex deletion via right-click on non-touch devices
      if (isTouch) { e.originalEvent.preventDefault(); return; }
      if (!isActive || !vertices || vertices.length <= 3) return;
      e.originalEvent.preventDefault();
      const pixel = map.latLngToContainerPoint(e.latlng);
      for (let i = 0; i < vertices.length; i++) {
        const vp = map.latLngToContainerPoint(L.latLng(vertices[i][0], vertices[i][1]));
        if (Math.abs(pixel.x - vp.x) < hitRadius && Math.abs(pixel.y - vp.y) < hitRadius) {
          const newVerts = vertices.filter((_, idx) => idx !== i);
          onChange(newVerts);
          return;
        }
      }
    },
  });

  if (!vertices || vertices.length === 0) return null;

  const midpoints = vertices.map((v, i) => {
    const j = (i + 1) % vertices.length;
    return [(v[0] + vertices[j][0]) / 2, (v[1] + vertices[j][1]) / 2];
  });

  return (
    <>
      <Polygon
        positions={vertices}
        pathOptions={{
          color,
          weight: isActive ? 2.5 : 1.5,
          fillColor,
          fillOpacity: isActive ? 0.15 : 0.1,
          dashArray: isActive ? '6 4' : '4 4',
        }}
      />
      {/* Vertex handles — only show when active */}
      {isActive && vertices.map((v, i) => (
        <CircleMarker
          key={`v-${i}`}
          center={v}
          radius={isTouch ? 10 : 6}
          pathOptions={{
            color,
            weight: 2,
            fillColor: color,
            fillOpacity: 1,
          }}
        />
      ))}
      {/* Edge midpoint hints — only when active */}
      {isActive && midpoints.map((m, i) => (
        <CircleMarker
          key={`m-${i}`}
          center={m}
          radius={isTouch ? 6 : 3}
          pathOptions={{
            color,
            weight: 1,
            fillColor: color,
            fillOpacity: 0.35,
          }}
        />
      ))}
    </>
  );
}

// Dimensions overlay
function DimensionsOverlay({ yardVertices, houseVertices, activeLayer }) {
  const verts = activeLayer === 'house' ? houseVertices : yardVertices;
  if (!verts || verts.length < 3) return null;
  const { width, height } = boundingBoxFt(verts);
  const area = Math.round(polygonAreaSqFt(verts));
  const label = activeLayer === 'house' ? 'House' : 'Yard';

  return (
    <div className="absolute bottom-3 left-3 z-[1000] bg-black/60 backdrop-blur-sm text-cream text-xs px-3 py-2 rounded-xl border border-cream/15">
      <span className="text-cream/50 mr-1.5">{label}:</span>
      <span className="font-display text-base font-semibold">{width}' × {height}'</span>
      <span className="text-cream/50 ml-2">
        · {area.toLocaleString()} sq ft
      </span>
    </div>
  );
}

export default function YardMapPicker({ initialWidth, initialHeight, initialCenter, initialAddress, onDimensionsChange }) {
  const [address, setAddress] = useState(initialAddress || '');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [center, setCenter] = useState(initialCenter ? [initialCenter.lat, initialCenter.lng] : null);
  const [yardVertices, setYardVertices] = useState(null);
  const [houseVertices, setHouseVertices] = useState(null);
  const [activeLayer, setActiveLayer] = useState('yard'); // 'yard' or 'house'
  const mapRef = useRef(null);
  const initialized = useRef(false);

  // Create initial polygon (rectangle) from center + dimensions
  const createInitialPolygon = useCallback((lat, lng, w, h) => {
    const { dLat, dLng } = feetToLatLng(lat, w, h);
    return [
      [lat + dLat / 2, lng - dLng / 2],
      [lat + dLat / 2, lng + dLng / 2],
      [lat - dLat / 2, lng + dLng / 2],
      [lat - dLat / 2, lng - dLng / 2],
    ];
  }, []);

  // Create a small house rectangle near center
  const createInitialHouse = useCallback((lat, lng) => {
    const { dLat, dLng } = feetToLatLng(lat, 40, 30);
    return [
      [lat + dLat / 2, lng - dLng / 2],
      [lat + dLat / 2, lng + dLng / 2],
      [lat - dLat / 2, lng + dLng / 2],
      [lat - dLat / 2, lng - dLng / 2],
    ];
  }, []);

  // Auto-initialize if we have geocoded coords from address step
  useEffect(() => {
    if (initialized.current || !initialCenter) return;
    initialized.current = true;
    const w = initialWidth || 80;
    const h = initialHeight || 60;
    const poly = createInitialPolygon(initialCenter.lat, initialCenter.lng, w, h);
    setYardVertices(poly);
    const house = createInitialHouse(initialCenter.lat, initialCenter.lng);
    setHouseVertices(house);
  }, [initialCenter, initialWidth, initialHeight, createInitialPolygon, createInitialHouse]);

  // Propagate dimensions + polygons up
  useEffect(() => {
    if (!yardVertices || yardVertices.length < 3 || !onDimensionsChange) return;
    const { width, height } = boundingBoxFt(yardVertices);
    const polygonFt = verticesToFeet(yardVertices, yardVertices);
    const houseFt = verticesToFeet(houseVertices, yardVertices);
    onDimensionsChange(width, height, polygonFt, houseFt, yardVertices);
  }, [yardVertices, houseVertices, onDimensionsChange]);

  // Geocode address
  const handleSearch = async () => {
    if (!address.trim()) return;
    setSearching(true);
    setError('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=us`,
        { headers: { 'User-Agent': 'GardenGrove/1.0' } }
      );
      const data = await res.json();
      if (data.length === 0) {
        setError('Address not found. Try a more specific address.');
        setSearching(false);
        return;
      }
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      setCenter([lat, lng]);
      hasFlewTo.current = false; // allow re-centering on new search
      setYardVertices(createInitialPolygon(lat, lng, initialWidth || 80, initialHeight || 60));
      setHouseVertices(createInitialHouse(lat, lng));
    } catch {
      setError('Search failed. Please try again.');
    }
    setSearching(false);
  };

  const hasFlewTo = useRef(false);
  function MapController({ center }) {
    const map = useMap();
    useEffect(() => {
      if (center && !hasFlewTo.current) {
        hasFlewTo.current = true;
        map.flyTo(center, 19, { duration: 1.2 });
      }
    }, [center, map]);
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cream/40 mb-2.5 block">
          {center ? 'Wrong spot? Search again' : 'Look Up Address'}
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="123 Main St, City, State"
              className="w-full px-4 py-3 pr-10 text-sm bg-white/[0.08] border border-cream/20 rounded-xl text-cream placeholder:text-cream/25 focus:border-cream/35 focus:bg-white/[0.12] focus:outline-none focus:ring-1 focus:ring-cream/15 transition-all"
            />
            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cream/20" />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !address.trim()}
            className="px-4 py-3 bg-cream/15 border border-cream/20 text-cream text-xs font-medium rounded-xl hover:bg-cream/25 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            {searching ? '...' : 'Find'}
          </button>
        </div>
        {error && <p className="text-bloom-pink text-xs mt-2">{error}</p>}
      </div>

      {/* Layer toggle */}
      {center && (
        <div className="flex gap-2">
          <button
            onClick={() => setActiveLayer('yard')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${
              activeLayer === 'yard'
                ? 'bg-cream/15 border-cream/30 text-cream'
                : 'bg-transparent border-cream/10 text-cream/40 hover:border-cream/20 hover:text-cream/60'
            }`}
          >
            <Fence className="w-3.5 h-3.5" />
            Yard Boundary
          </button>
          <button
            onClick={() => setActiveLayer('house')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${
              activeLayer === 'house'
                ? 'bg-terra/20 border-terra/40 text-cream'
                : 'bg-transparent border-cream/10 text-cream/40 hover:border-cream/20 hover:text-cream/60'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            House Outline
          </button>
        </div>
      )}

      {/* Map */}
      {center && (
        <div className="relative rounded-2xl overflow-hidden border border-cream/15" style={{ height: 'min(70vh, 560px)' }}>
          <MapContainer
            center={center}
            zoom={19}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            doubleClickZoom={false}
            ref={mapRef}
          >
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Esri"
              maxZoom={22}
            />
            <MapController center={center} />
            {/* Yard polygon */}
            {yardVertices && (
              <PolygonEditor
                vertices={yardVertices}
                onChange={setYardVertices}
                color="#FDF6E9"
                fillColor="#FDF6E9"
                isActive={activeLayer === 'yard'}
              />
            )}
            {/* House polygon */}
            {houseVertices && (
              <PolygonEditor
                vertices={houseVertices}
                onChange={setHouseVertices}
                color="#C17644"
                fillColor="#C17644"
                isActive={activeLayer === 'house'}
              />
            )}
          </MapContainer>
          <DimensionsOverlay
            yardVertices={yardVertices}
            houseVertices={houseVertices}
            activeLayer={activeLayer}
          />
          <div className="absolute top-3 right-3 z-[1000] bg-black/50 backdrop-blur-sm text-cream/70 text-[10px] px-2.5 py-1.5 rounded-lg border border-cream/10 flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <Move className="w-3 h-3" /> Drag points to reshape
            </div>
            <div className="flex items-center gap-1.5">
              <Plus className="w-3 h-3" /> Tap an edge to add a point
            </div>
            <div className="flex items-center gap-1.5 hidden md:flex">
              <Minus className="w-3 h-3" /> Right-click a point to remove
            </div>
          </div>
          {/* Remove last point button — especially useful on touch */}
          {(() => {
            const verts = activeLayer === 'house' ? houseVertices : yardVertices;
            if (!verts || verts.length <= 3) return null;
            return (
              <button
                onClick={() => {
                  if (activeLayer === 'house') {
                    setHouseVertices(houseVertices.slice(0, -1));
                  } else {
                    setYardVertices(yardVertices.slice(0, -1));
                  }
                }}
                className="absolute bottom-3 right-3 z-[1000] bg-black/60 backdrop-blur-sm text-cream/80 text-xs px-3 py-2 rounded-xl border border-cream/15 flex items-center gap-1.5 hover:bg-black/80 active:bg-black/80 transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Remove last point
              </button>
            );
          })()}
        </div>
      )}
    </div>
  );
}
