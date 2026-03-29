import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store';
import { lookupZone, parseLocalDate } from '../data/zones';
import { X, MapPin, Save, RotateCcw } from 'lucide-react';

const SOIL_TYPES = [
  { id: 'sandy', label: 'Sandy' },
  { id: 'loam', label: 'Loam' },
  { id: 'clay', label: 'Clay' },
  { id: 'silt', label: 'Silty' },
];

const SUN_TYPES = [
  { id: 'full', label: 'Full Sun', icon: '☀️' },
  { id: 'partial', label: 'Partial', icon: '⛅' },
  { id: 'shade', label: 'Shade', icon: '🌥️' },
];

export default function SettingsPanel({ onClose }) {
  const { state, dispatch } = useStore();
  const [zipCode, setZipCode] = useState(state.zipCode || '');
  const [zone, setZone] = useState(state.zone || '');
  const [manualZone, setManualZone] = useState('');
  const [soilType, setSoilType] = useState(state.soilType || 'loam');
  const [sunExposure, setSunExposure] = useState(state.sunExposure || 'full');
  const [zoneData, setZoneData] = useState(null);
  const [useManualZone, setUseManualZone] = useState(false);
  const [yardW, setYardW] = useState(state.yardWidthFt || 80);
  const [yardH, setYardH] = useState(state.yardHeightFt || 60);
  const [saved, setSaved] = useState(false);

  const currentYear = new Date().getFullYear();

  const handleLookup = () => {
    if (!/^\d{5}$/.test(zipCode)) return;
    const data = lookupZone(zipCode);
    setZoneData(data);
    setZone(data.zone);
    setUseManualZone(false);
  };

  const handleSave = () => {
    const finalZone = useManualZone ? parseInt(manualZone) : (zoneData?.zone || state.zone);
    let lastFrostMMDD = state.lastFrostMMDD;
    let firstFrostMMDD = state.firstFrostMMDD;

    if (zoneData && !useManualZone) {
      lastFrostMMDD = zoneData.lastFrost;
      firstFrostMMDD = zoneData.firstFrost;
    } else if (useManualZone) {
      const zoneFrostMap = {
        2: { last: '06-01', first: '08-31' },
        3: { last: '05-25', first: '09-10' },
        4: { last: '05-15', first: '09-20' },
        5: { last: '05-05', first: '10-01' },
        6: { last: '04-25', first: '10-10' },
        7: { last: '04-10', first: '10-25' },
        8: { last: '03-20', first: '11-10' },
        9: { last: '02-20', first: '12-10' },
        10: { last: '01-31', first: '12-31' },
        11: { last: '01-01', first: '12-31' },
      };
      const frostData = zoneFrostMap[finalZone] || zoneFrostMap[6];
      lastFrostMMDD = frostData.last;
      firstFrostMMDD = frostData.first;
    }

    dispatch({
      type: 'SET_SETUP',
      payload: {
        zipCode: zipCode || state.zipCode,
        zone: finalZone,
        lastFrostMMDD,
        firstFrostMMDD,
        soilType,
        sunExposure,
        yardWidthFt: yardW,
        yardHeightFt: yardH,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    if (confirm('This will clear all garden data and start fresh. Are you sure?')) {
      dispatch({ type: 'RESET' });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-white dark:bg-midnight-green rounded-2xl shadow-2xl shadow-black/15 w-full max-w-md mx-4 overflow-hidden border border-sage/10 dark:border-sage-dark/15"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sage/10 dark:border-sage-dark/15" style={{ padding: '20px 28px' }}>
          <h2 className="font-display text-xl font-semibold text-forest-deep dark:text-cream">
            Garden Settings
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-sage/8 text-sage-dark/60 dark:text-sage/60 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Zip Code */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sage-dark/60 dark:text-sage/50 block" style={{ marginBottom: 10 }}>
              Zip Code
            </label>
            <div className="flex" style={{ gap: 10 }}>
              <input
                type="text"
                value={zipCode}
                onChange={e => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="Enter zip code"
                className="flex-1 px-3.5 py-2.5 border border-sage/15 dark:border-sage-dark/20 rounded-xl bg-white/80 dark:bg-midnight-sage/80 text-sm text-forest-deep dark:text-cream focus:border-sage dark:focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage/20 transition-all"
              />
              <button
                onClick={handleLookup}
                disabled={zipCode.length !== 5}
                className="px-4 py-2.5 bg-gradient-to-b from-forest to-forest-deep text-cream text-xs font-medium rounded-xl hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
              >
                <MapPin className="w-3 h-3" /> Lookup
              </button>
            </div>
            {zoneData && (
              <p className="text-[10px] text-sage/80 mt-2 bg-sage/8 dark:bg-sage/10 rounded-lg px-3 py-1.5">
                Found: Zone {zoneData.zone} · Last frost: {parseLocalDate(zoneData.lastFrost, currentYear).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · First frost: {parseLocalDate(zoneData.firstFrost, currentYear).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>

          {/* Manual Zone Override */}
          <div>
            <label className="flex items-center text-[10px] font-semibold uppercase tracking-[0.12em] text-sage-dark/60 dark:text-sage/50" style={{ gap: 8, marginBottom: 10 }}>
              <input
                type="checkbox"
                checked={useManualZone}
                onChange={e => setUseManualZone(e.target.checked)}
                className="rounded border-sage/30 text-forest focus:ring-sage/30"
              />
              Override Zone Manually
            </label>
            {useManualZone && (
              <select
                value={manualZone}
                onChange={e => setManualZone(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-sage/15 dark:border-sage-dark/20 rounded-xl bg-white/80 dark:bg-midnight-sage/80 text-sm text-forest-deep dark:text-cream focus:border-sage dark:focus:border-sage focus:outline-none transition-all"
              >
                <option value="">Select zone...</option>
                {[2,3,4,5,6,7,8,9,10,11].map(z => (
                  <option key={z} value={z}>Zone {z}</option>
                ))}
              </select>
            )}
          </div>

          {/* Current Zone Display */}
          <div className="flex items-center rounded-xl bg-sage/6 dark:bg-sage/10 border border-sage/10 dark:border-sage/15" style={{ gap: 14, padding: 16 }}>
            <div className="w-11 h-11 rounded-xl bg-forest/8 dark:bg-sage/15 flex items-center justify-center">
              <span className="font-display text-lg font-bold text-forest dark:text-cream">
                {useManualZone ? (manualZone || '?') : (zoneData?.zone || state.zone || '?')}
              </span>
            </div>
            <div className="text-xs">
              <div className="font-medium text-forest-deep dark:text-cream">
                Current Zone: {state.zone}
              </div>
              <div className="text-sage-dark/60 dark:text-sage/50 mt-0.5">
                Frost dates: {state.lastFrostMMDD && parseLocalDate(state.lastFrostMMDD, currentYear).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {state.firstFrostMMDD && parseLocalDate(state.firstFrostMMDD, currentYear).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Yard Size */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sage-dark/60 dark:text-sage/50 block" style={{ marginBottom: 10 }}>
              Yard Size (ft)
            </label>
            <div className="grid grid-cols-2" style={{ gap: 10 }}>
              <input type="number" min={20} max={500} value={yardW}
                onChange={e => setYardW(Math.max(20, parseInt(e.target.value) || 20))}
                className="px-3.5 py-2.5 border border-sage/15 dark:border-sage-dark/20 rounded-xl bg-white/80 dark:bg-midnight-sage/80 text-sm text-center text-forest-deep dark:text-cream focus:border-sage dark:focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage/20 transition-all"
                placeholder="Width" />
              <input type="number" min={20} max={500} value={yardH}
                onChange={e => setYardH(Math.max(20, parseInt(e.target.value) || 20))}
                className="px-3.5 py-2.5 border border-sage/15 dark:border-sage-dark/20 rounded-xl bg-white/80 dark:bg-midnight-sage/80 text-sm text-center text-forest-deep dark:text-cream focus:border-sage dark:focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage/20 transition-all"
                placeholder="Depth" />
            </div>
          </div>

          {/* Soil Type */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sage-dark/60 dark:text-sage/50 block" style={{ marginBottom: 10 }}>
              Soil Type
            </label>
            <div className="grid grid-cols-4" style={{ gap: 10 }}>
              {SOIL_TYPES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSoilType(s.id)}
                  className={`px-2 py-2 rounded-xl border text-xs font-medium text-center transition-all duration-200 ${
                    soilType === s.id
                      ? 'border-forest/30 bg-forest/6 text-forest dark:border-sage/40 dark:text-cream shadow-sm'
                      : 'border-sage/12 text-sage-dark/60 dark:border-sage-dark/20 dark:text-sage/50 hover:border-sage/25'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sun Exposure */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sage-dark/60 dark:text-sage/50 block" style={{ marginBottom: 10 }}>
              Sun Exposure
            </label>
            <div className="grid grid-cols-3" style={{ gap: 10 }}>
              {SUN_TYPES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSunExposure(s.id)}
                  className={`px-2 py-3 rounded-xl border text-center transition-all duration-200 ${
                    sunExposure === s.id
                      ? 'border-forest/30 bg-forest/6 dark:border-sage/40 shadow-sm'
                      : 'border-sage/12 dark:border-sage-dark/20 hover:border-sage/25'
                  }`}
                >
                  <div className="text-lg mb-0.5">{s.icon}</div>
                  <div className="text-[10px] font-medium text-forest-deep dark:text-cream">{s.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-sage/10 dark:border-sage-dark/15 flex items-center justify-between" style={{ padding: '18px 28px' }}>
          <div className="flex items-center" style={{ gap: 10 }}>
            <button
              onClick={() => { dispatch({ type: 'RERUN_SETUP' }); onClose(); }}
              className="text-xs text-sage-dark/60 dark:text-sage/60 hover:text-forest dark:hover:text-cream flex items-center gap-1.5 transition-colors px-2 py-1.5 rounded-lg hover:bg-sage/8"
            >
              <RotateCcw className="w-3 h-3" /> Re-run Setup
            </button>
            <button
              onClick={handleReset}
              className="text-xs text-bloom-red/50 hover:text-bloom-red flex items-center gap-1.5 transition-colors px-2 py-1.5 rounded-lg hover:bg-bloom-red/5"
            >
              <RotateCcw className="w-3 h-3" /> Reset All
            </button>
          </div>
          <button
            onClick={handleSave}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-all duration-200 shadow-sm ${
              saved
                ? 'bg-sage text-cream'
                : 'bg-gradient-to-b from-forest to-forest-deep text-cream hover:brightness-110'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
