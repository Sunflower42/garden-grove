import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { lookupZone, parseLocalDate } from '../data/zones';
import { ArrowRight, ArrowLeft, MapPin } from 'lucide-react';
import YardMapPicker from './YardMapPicker';

const SOIL_TYPES = [
  { id: 'sandy', label: 'Sandy', desc: 'Drains fast, warms quickly', emoji: '🏖️' },
  { id: 'loam', label: 'Loam', desc: 'Ideal balance — lucky me!', emoji: '🌱' },
  { id: 'clay', label: 'Clay', desc: 'Retains water, slow to warm', emoji: '🏺' },
  { id: 'silt', label: 'Silty', desc: 'Fertile, retains moisture', emoji: '🌊' },
];

const SUN_TYPES = [
  { id: 'full', label: 'Full Sun', desc: '6-8+ hours', icon: '☀️' },
  { id: 'partial', label: 'Partial', desc: '4-6 hours', icon: '⛅' },
  { id: 'shade', label: 'Shade', desc: 'Under 4 hours', icon: '🌥️' },
];

// Botanical SVG decorations
function BotanicalBg() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(160deg, #1A2E1A 0%, #2D4A2D 30%, #3A5A3A 60%, #2D4A2D 100%)',
      }} />

      {/* Subtle radial light */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(139,158,126,0.15) 0%, transparent 70%)' }} />

      {/* Botanical line drawings — large leaves */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {/* Large leaf top-left */}
        <g opacity="0.08" stroke="#A8B99C" fill="none" strokeWidth="1.5">
          <path d="M-20 200 Q80 180 120 80 Q140 20 200 -20" />
          <path d="M-20 200 Q60 200 100 140" />
          <path d="M-20 200 Q40 160 80 100" />
          <path d="M-20 200 Q80 220 160 180 Q200 160 240 100" />
          <path d="M-20 200 Q60 240 140 220" />
        </g>
        {/* Fern right side */}
        <g opacity="0.06" stroke="#8B9E7E" fill="none" strokeWidth="1" transform="translate(1200, 100)">
          <path d="M100 0 Q80 60 60 120 Q40 200 50 300 Q60 400 40 500" />
          <path d="M100 0 Q120 40 160 60" />
          <path d="M90 50 Q110 80 150 100" />
          <path d="M80 100 Q100 130 140 140" />
          <path d="M70 150 Q90 170 130 180" />
          <path d="M65 200 Q85 220 120 225" />
          <path d="M60 250 Q80 265 110 268" />
          <path d="M55 300 Q75 310 100 310" />
          <path d="M50 350 Q65 355 85 350" />
          {/* Left side fronds */}
          <path d="M100 0 Q70 30 30 20" />
          <path d="M90 50 Q60 70 20 60" />
          <path d="M80 100 Q50 110 10 95" />
          <path d="M70 150 Q40 155 0 140" />
          <path d="M65 200 Q35 200 -5 185" />
        </g>
        {/* Scattered small leaves bottom */}
        <g opacity="0.05" stroke="#A8B99C" fill="none" strokeWidth="1">
          <ellipse cx="200" cy="750" rx="30" ry="12" transform="rotate(-20 200 750)" />
          <ellipse cx="250" cy="770" rx="25" ry="10" transform="rotate(15 250 770)" />
          <ellipse cx="1100" cy="700" rx="35" ry="14" transform="rotate(-35 1100 700)" />
          <ellipse cx="1050" cy="730" rx="28" ry="11" transform="rotate(10 1050 730)" />
          <ellipse cx="900" cy="780" rx="20" ry="8" transform="rotate(-10 900 780)" />
        </g>
        {/* Delicate stems bottom-left */}
        <g opacity="0.07" stroke="#8B9E7E" fill="none" strokeWidth="1">
          <path d="M80 900 Q90 820 70 750 Q60 700 80 650" />
          <path d="M80 750 Q100 730 120 740" />
          <path d="M75 700 Q55 680 40 690" />
          <path d="M80 670 Q100 650 115 660" />
          <circle cx="80" cy="645" r="5" stroke="#C17644" opacity="0.5" />
        </g>
        {/* Flower cluster top-right */}
        <g opacity="0.06" stroke="#D4869C" fill="none" strokeWidth="1" transform="translate(1100, 50)">
          <circle cx="0" cy="0" r="8" />
          <circle cx="0" cy="0" r="14" />
          <circle cx="20" cy="15" r="6" />
          <circle cx="20" cy="15" r="11" />
          <circle cx="-10" cy="25" r="7" />
          <circle cx="-10" cy="25" r="12" />
          <path d="M0 14 L0 60" stroke="#8B9E7E" />
          <path d="M20 26 L20 55" stroke="#8B9E7E" />
          <path d="M-10 37 L-10 58" stroke="#8B9E7E" />
        </g>
      </svg>

      {/* Soft noise texture */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
    </div>
  );
}

function StepDots({ step }) {
  const labels = ['Address', 'Conditions', 'My Yard'];
  return (
    <div className="flex justify-center items-start gap-4" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
      {labels.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center gap-2 w-16">
            <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
              i === step
                ? 'bg-cream scale-125 shadow-[0_0_12px_rgba(253,246,233,0.4)]'
                : i < step
                  ? 'bg-sage'
                  : 'bg-cream/15'
            }`} />
            <span className={`text-[9px] uppercase tracking-[0.12em] font-medium transition-colors duration-300 ${
              i === step ? 'text-cream' : i < step ? 'text-sage-light/80' : 'text-cream/20'
            }`}>
              {label}
            </span>
          </div>
          {/* Connecting line between dots */}
          {i < labels.length - 1 && (
            <div className={`w-8 h-px -mt-5 transition-colors duration-500 ${
              i < step ? 'bg-sage/50' : 'bg-cream/10'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function Onboarding() {
  const { state: appState, dispatch } = useStore();
  const startStep = appState.onboardingStartStep || 0;
  const [step, setStep] = useState(startStep);
  const [address, setAddress] = useState('');
  const [zipCode, setZipCode] = useState(startStep > 0 ? (appState.zipCode || '') : '');
  const [geocoded, setGeocoded] = useState(null); // { lat, lng }
  const [zoneData, setZoneData] = useState(
    startStep > 0 && appState.zone ? { zone: appState.zone, lastFrost: appState.lastFrostMMDD, firstFrost: appState.firstFrostMMDD } : null
  );
  const [soilType, setSoilType] = useState(appState.soilType || 'loam');
  const [sunExposure, setSunExposure] = useState(appState.sunExposure || 'full');
  const [yardWidth, setYardWidth] = useState(appState.yardWidthFt || 80);
  const [yardHeight, setYardHeight] = useState(appState.yardHeightFt || 60);
  const [yardPolygon, setYardPolygon] = useState(null); // [{x,y}] in feet
  const [housePolygon, setHousePolygon] = useState(null); // [{x,y}] in feet
  const [yardGeoVertices, setYardGeoVertices] = useState(null); // [[lat,lng]] from map
  const [satelliteUrl, setSatelliteUrl] = useState(null);
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);

  // When jumping to yard step, geocode from existing zip code
  useEffect(() => {
    if (startStep >= 2 && appState.zipCode && !geocoded) {
      (async () => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(appState.zipCode)}&limit=1&countrycodes=us`,
            { headers: { 'User-Agent': 'GardenGrove/1.0' } }
          );
          const data = await res.json();
          if (data.length > 0) {
            setGeocoded({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
          }
        } catch {}
      })();
    }
  }, [startStep, appState.zipCode, geocoded]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Debounced autocomplete lookup
  useEffect(() => {
    if (address.length < 4) {
      setSuggestions([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=5&countrycodes=us&addressdetails=1`,
          { headers: { 'User-Agent': 'GardenGrove/1.0' } }
        );
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch {
        // Silently fail — autocomplete is a convenience
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [address]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, []);

  const selectSuggestion = (result) => {
    setAddress(result.display_name);
    setSuggestions([]);
    setShowSuggestions(false);
    finalizeLookup(result);
  };

  const finalizeLookup = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setGeocoded({ lat, lng });

    const zip = result.address?.postcode?.slice(0, 5);
    if (zip && /^\d{5}$/.test(zip)) {
      setZipCode(zip);
      const zData = lookupZone(zip);
      setZoneData(zData);
      setStep(1);
    } else {
      setError('Could not determine zip code. Try a more specific address.');
    }
  };

  const handleAddressLookup = async () => {
    if (!address.trim()) {
      setError('Please enter an address');
      return;
    }
    setSearching(true);
    setError('');
    setShowSuggestions(false);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=us&addressdetails=1`,
        { headers: { 'User-Agent': 'GardenGrove/1.0' } }
      );
      const data = await res.json();
      if (data.length === 0) {
        setError('Address not found. Try including city and state.');
        setSearching(false);
        return;
      }
      finalizeLookup(data[0]);
      setSearching(false);
    } catch {
      setError('Search failed. Please check your connection and try again.');
      setSearching(false);
    }
  };

  const handleMapDimensions = useCallback((w, h, polygonFt, houseFt, geoVertices, satImgUrl) => {
    setYardWidth(Math.max(20, Math.min(500, w)));
    setYardHeight(Math.max(20, Math.min(500, h)));
    if (polygonFt) setYardPolygon(polygonFt);
    if (houseFt !== undefined) setHousePolygon(houseFt);
    if (geoVertices) setYardGeoVertices(geoVertices);
    if (satImgUrl) setSatelliteUrl(satImgUrl);
  }, []);

  const currentYear = new Date().getFullYear();

  const handleComplete = () => {
    dispatch({
      type: 'SET_SETUP',
      payload: {
        zipCode,
        zone: zoneData.zone,
        lastFrostMMDD: zoneData.lastFrost,
        firstFrostMMDD: zoneData.firstFrost,
        soilType,
        sunExposure,
        yardWidthFt: yardWidth,
        yardHeightFt: yardHeight,
        yardPolygon,
        housePolygon,
        yardGeoVertices,
        satelliteUrl,
      },
    });
  };

  return (
    <div className="h-full w-full overflow-auto">
      <BotanicalBg />

      <div className="relative z-10 w-full min-h-full flex flex-col items-center justify-center px-6 py-16">
        {/* Logo */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          {/* Botanical icon */}
          <div className="inline-block mb-5">
            <svg width="64" height="64" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="28" cy="28" r="27" stroke="#A8B99C" strokeWidth="1" opacity="0.4" />
              <path d="M28 40 L28 22" stroke="#A8B99C" strokeWidth="2" strokeLinecap="round" />
              <path d="M28 28 Q20 22 16 14 Q22 18 28 22" stroke="#A8B99C" strokeWidth="1.5" fill="#8B9E7E" fillOpacity="0.3" strokeLinecap="round" />
              <path d="M28 25 Q36 18 40 10 Q34 16 28 20" stroke="#A8B99C" strokeWidth="1.5" fill="#8B9E7E" fillOpacity="0.3" strokeLinecap="round" />
              <path d="M28 32 Q22 28 18 22 Q24 26 28 28" stroke="#A8B99C" strokeWidth="1.2" fill="#8B9E7E" fillOpacity="0.2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="font-display text-6xl font-light text-cream tracking-tight leading-none">
            Garden Grove
          </h1>
          <p className="text-sage-light/60 mt-4 font-light text-sm tracking-[0.15em] uppercase">
            Plan my paradise
          </p>
        </motion.div>

        {/* Step dots */}
        <StepDots step={step} />

        {/* Card */}
        <motion.div
          className="relative w-full max-w-[620px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {/* Card glow */}
          <div className="absolute -inset-px rounded-[28px] bg-gradient-to-b from-cream/12 via-cream/5 to-transparent pointer-events-none" />

          <div className="relative bg-cream/[0.06] backdrop-blur-2xl rounded-[28px] border border-cream/8 shadow-2xl shadow-black/25 w-full" style={{ padding: '3.5rem 3.5rem' }}>
            <AnimatePresence mode="wait">
              {/* Step 0: Address */}
              {step === 0 && (
                <motion.div
                  key="address"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col"
                >
                  <div className="text-center">
                    <h2 className="font-display text-3xl font-light text-cream">Where's my garden?</h2>
                    <p className="text-cream/40 mt-4 text-sm leading-relaxed">We'll find the hardiness zone, frost dates, and satellite view</p>
                  </div>
                  <div style={{ paddingTop: '1.5rem', paddingBottom: '1.5rem' }} ref={suggestionsRef} className="relative">
                    <input
                      type="text"
                      value={address}
                      onChange={e => { setAddress(e.target.value); setShowSuggestions(true); }}
                      onKeyDown={e => e.key === 'Enter' && handleAddressLookup()}
                      onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                      placeholder="Enter my address"
                      className="w-full px-6 py-5 text-center text-lg font-display bg-white/[0.12] border border-cream/25 rounded-2xl text-cream placeholder:text-cream/30 focus:border-cream/40 focus:bg-white/[0.15] focus:outline-none focus:ring-1 focus:ring-cream/20 transition-all"
                      autoFocus
                    />
                    {/* Autocomplete suggestions */}
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 bg-[#2D4A2D] border border-cream/15 rounded-xl shadow-2xl shadow-black/40 overflow-hidden" style={{ marginTop: 8 }}>
                        {suggestions.map((s, i) => (
                          <button
                            key={s.place_id || i}
                            onClick={() => selectSuggestion(s)}
                            className="w-full flex items-start gap-3 text-left hover:bg-cream/10 transition-colors"
                            style={{ padding: '12px 16px' }}
                          >
                            <MapPin className="w-4 h-4 text-cream/30 shrink-0" style={{ marginTop: 2 }} />
                            <span className="text-sm text-cream/80 leading-snug">{s.display_name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {error && <p className="text-bloom-pink text-xs text-center mt-3 animate-fade-up">{error}</p>}
                  </div>
                  <button
                    onClick={handleAddressLookup}
                    disabled={searching || !address.trim()}
                    className="w-full py-4 bg-cream text-forest-deep rounded-2xl font-semibold text-sm uppercase tracking-[0.1em] flex items-center justify-center gap-2.5 hover:bg-white hover:shadow-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-black/15"
                  >
                    {searching ? 'Looking up...' : 'Find My Garden'} <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {/* Step 1: Conditions — with zone info banner */}
              {step === 1 && (
                <motion.div
                  key="soil"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col"
                >
                  <div className="text-center mb-8">
                    <h2 className="font-display text-3xl font-light text-cream">My Garden Conditions</h2>
                  </div>

                  {/* Zone info banner */}
                  {zoneData && (
                    <div className="flex items-center justify-center gap-8 mb-10 px-5 py-4 rounded-xl bg-cream/[0.06] border border-cream/10">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-2xl font-light text-cream">{zoneData.zone}</span>
                        <span className="text-cream/40 text-[10px] uppercase tracking-widest">Zone</span>
                      </div>
                      <div className="w-px h-6 bg-cream/10" />
                      <div className="text-center">
                        <div className="text-cream/40 text-[9px] uppercase tracking-widest">Last Frost</div>
                        <div className="text-cream text-sm font-display">
                          {parseLocalDate(zoneData.lastFrost, currentYear).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      <div className="w-px h-6 bg-cream/10" />
                      <div className="text-center">
                        <div className="text-cream/40 text-[9px] uppercase tracking-widest">First Frost</div>
                        <div className="text-cream text-sm font-display">
                          {parseLocalDate(zoneData.firstFrost, currentYear).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cream/40 mb-3 block">Soil Type</label>
                    <div className="grid grid-cols-2 gap-4">
                      {SOIL_TYPES.map(s => (
                        <button
                          key={s.id}
                          onClick={() => setSoilType(s.id)}
                          className={`p-5 rounded-xl border text-left transition-all ${
                            soilType === s.id
                              ? 'border-cream/30 bg-cream/10'
                              : 'border-cream/6 hover:border-cream/15 hover:bg-cream/[0.04]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-base">{s.emoji}</span>
                            <span className="text-sm font-medium text-cream">{s.label}</span>
                          </div>
                          <div className="text-[10px] text-cream/35 mt-1.5 ml-8">{s.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-10">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cream/40 mb-3 block">Sun Exposure</label>
                    <div className="grid grid-cols-3 gap-4">
                      {SUN_TYPES.map(s => (
                        <button
                          key={s.id}
                          onClick={() => setSunExposure(s.id)}
                          className={`p-5 rounded-xl border text-center transition-all ${
                            sunExposure === s.id
                              ? 'border-cream/30 bg-cream/10'
                              : 'border-cream/6 hover:border-cream/15 hover:bg-cream/[0.04]'
                          }`}
                        >
                          <div className="text-2xl mb-1">{s.icon}</div>
                          <div className="text-xs font-medium text-cream">{s.label}</div>
                          <div className="text-[9px] text-cream/30 mt-0.5">{s.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4" style={{ marginTop: '2.5rem' }}>
                    <button
                      onClick={() => setStep(0)}
                      className="px-4 py-3.5 border border-cream/15 text-cream/60 rounded-2xl hover:bg-white/5 transition-all"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setStep(2)}
                      className="flex-1 py-3.5 bg-cream text-forest-deep rounded-2xl font-semibold text-sm uppercase tracking-[0.1em] flex items-center justify-center gap-2 hover:bg-white transition-all shadow-lg shadow-black/10"
                    >
                      Next <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Yard */}
              {step === 2 && (
                <motion.div
                  key="size"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col"
                >
                  <div className="text-center" style={{ marginBottom: 32 }}>
                    <h2 className="font-display text-3xl font-light text-cream">My Yard</h2>
                    <p className="text-cream/40 text-sm" style={{ marginTop: 16 }}>
                      Drag the points to trace the outline of the yard. Click an edge to add a point.
                    </p>
                  </div>

                  {/* Map picker */}
                  <YardMapPicker
                    initialWidth={yardWidth}
                    initialHeight={yardHeight}
                    initialCenter={geocoded}
                    initialAddress={address}
                    onDimensionsChange={handleMapDimensions}
                  />

                  {/* Dimensions summary */}
                  <div className="text-center" style={{ marginTop: 28, marginBottom: 12 }}>
                    <span className="font-display text-xl text-cream/80">{yardWidth}' × {yardHeight}'</span>
                    <span className="text-cream/30 ml-2 text-sm">
                      bounding box · {(yardWidth * yardHeight).toLocaleString()} sq ft
                      {yardWidth * yardHeight >= 43560 && ` (${(yardWidth * yardHeight / 43560).toFixed(1)} acres)`}
                    </span>
                  </div>

                  <div className="flex" style={{ marginTop: 32, gap: 16 }}>
                    <button
                      onClick={() => setStep(1)}
                      className="px-4 py-3.5 border border-cream/15 text-cream/60 rounded-2xl hover:bg-white/5 transition-all"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleComplete}
                      className="flex-1 py-3.5 bg-gradient-to-r from-terra to-terra-light text-cream rounded-2xl font-semibold text-sm uppercase tracking-[0.1em] flex items-center justify-center gap-2.5 hover:brightness-110 hover:shadow-xl transition-all duration-300 shadow-lg shadow-terra/25"
                    >
                      Start Planning <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Bottom flourish */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <svg width="120" height="20" viewBox="0 0 120 20" fill="none" className="mx-auto opacity-15">
            <path d="M0 10 Q30 0 60 10 Q90 20 120 10" stroke="#A8B99C" strokeWidth="1" />
            <circle cx="60" cy="10" r="2" fill="#A8B99C" />
          </svg>
        </motion.div>
      </div>
    </div>
  );
}
