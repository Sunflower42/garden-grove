import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { PLANTS, PLANT_CATEGORIES, getPlantById, searchPlants } from '../data/plants';
import { Search, Plus, Minus, X, ChevronDown, Shield, Droplets, Sun, Clock, Users, Ban, Sprout, Flower2, Pencil, Check, Info, LayoutGrid, List, ShoppingCart } from 'lucide-react';
import { lookupVariety, getVarietiesForPlant } from '../data/varieties';

function DeerMeter({ level }) {
  return (
    <div className="flex items-center gap-1">
      <Shield className="w-3 h-3 text-sage-dark dark:text-sage" />
      <div className="flex gap-0.5">
        {[1,2,3,4,5].map(i => (
          <div
            key={i}
            className={`w-1.5 h-3 rounded-sm ${
              i <= level
                ? level >= 4 ? 'bg-sage' : level >= 3 ? 'bg-amber' : 'bg-bloom-red'
                : 'bg-sage/20 dark:bg-sage-dark/30'
            }`}
          />
        ))}
      </div>
      <span className="text-[10px] text-sage-dark dark:text-sage ml-0.5">
        {level >= 4 ? 'Deer proof' : level >= 3 ? 'Moderate' : 'Deer candy'}
      </span>
    </div>
  );
}

// Card for an item already in inventory
function InventoryItemCard({ item, plant, onRemove, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [variety, setVariety] = useState(item.variety || '');
  const [type, setType] = useState(item.type || 'seed');
  const [expanded, setExpanded] = useState(false);

  const handleSave = () => {
    onUpdate({ id: item.id, variety, type });
    setEditing(false);
  };

  if (!plant) return null;

  return (
    <motion.div
      layout
      className="rounded-2xl border border-sage/30 bg-sage/5 dark:border-sage-dark/40 dark:bg-sage/8 shadow-sm overflow-hidden"
    >
      <div className="p-7 flex items-start gap-5">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm"
          style={{ backgroundColor: plant.color + '15' }}
        >
          {plant.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-forest-deep dark:text-cream leading-tight">
                {plant.name}
              </h3>
              {item.variety ? (
                <p className="text-[11px] text-terra dark:text-terra-light mt-1 font-medium">
                  '{item.variety}'
                </p>
              ) : (
                <p className="text-[10px] text-sage-dark/50 dark:text-sage/40 mt-1 italic">
                  No variety set
                </p>
              )}
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => setEditing(!editing)}
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-sage/8 text-sage-dark hover:bg-sage/15 dark:bg-sage/12 dark:text-sage border border-sage/15 dark:border-sage-dark/20 transition-all"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                onClick={() => onRemove(item.id)}
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-bloom-red/8 text-bloom-red hover:bg-bloom-red/15 border border-bloom-red/15 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Type badge + variety details */}
          <div className="flex items-center flex-wrap" style={{ gap: 8, marginTop: 10 }}>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${
              item.type === 'want'
                ? 'bg-bloom-blue/10 text-bloom-blue border border-bloom-blue/20'
                : item.type === 'start'
                  ? 'bg-terra/10 text-terra-dark dark:bg-terra/15 dark:text-terra-light border border-terra/20'
                  : 'bg-sage/10 text-sage-dark dark:bg-sage/15 dark:text-sage-light border border-sage/20'
            }`}>
              {item.type === 'want' ? <ShoppingCart className="w-3 h-3" /> : item.type === 'start' ? <Flower2 className="w-3 h-3" /> : <Sprout className="w-3 h-3" />}
              {item.type === 'want' ? 'Want to Buy' : item.type === 'start' ? 'Plant Start' : 'Seed'}
            </span>
            {(() => {
              const vInfo = item.varietyInfo || lookupVariety(plant.id, item.variety);
              if (!vInfo) return null;
              return (
                <>
                  {vInfo.daysToMaturity && (
                    <span className="text-[10px] text-sage-dark/60 dark:text-sage/50">{vInfo.daysToMaturity}d</span>
                  )}
                  {vInfo.color && (
                    <span className="text-[10px] text-sage-dark/60 dark:text-sage/50">{vInfo.color}</span>
                  )}
                  {vInfo.heat && (
                    <span className="text-[10px] text-bloom-red/70">{vInfo.heat}</span>
                  )}
                </>
              );
            })()}
          </div>
          {(() => {
            const vInfo = item.varietyInfo || lookupVariety(plant.id, item.variety);
            if (!vInfo?.notes) return null;
            return (
              <p className="text-[10px] text-sage-dark/50 dark:text-sage/40 italic" style={{ marginTop: 6 }}>{vInfo.notes}</p>
            );
          })()}
        </div>
      </div>

      {/* Edit form */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-sage/10 dark:border-sage-dark/15" style={{ padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Type toggle */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sage-dark/60 dark:text-sage/50 block" style={{ marginBottom: 10 }}>
                  Type
                </label>
                <div className="flex" style={{ gap: 8 }}>
                  <button
                    onClick={() => setType('seed')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                      type === 'seed'
                        ? 'bg-sage/15 border-sage/30 text-forest-deep dark:text-cream'
                        : 'bg-transparent border-sage/10 text-sage-dark/50 dark:text-sage/40 hover:border-sage/20'
                    }`}
                  >
                    <Sprout className="w-3.5 h-3.5" /> Seed
                  </button>
                  <button
                    onClick={() => setType('start')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                      type === 'start'
                        ? 'bg-terra/15 border-terra/30 text-forest-deep dark:text-cream'
                        : 'bg-transparent border-sage/10 text-sage-dark/50 dark:text-sage/40 hover:border-sage/20'
                    }`}
                  >
                    <Flower2 className="w-3.5 h-3.5" /> Start
                  </button>
                  <button
                    onClick={() => setType('want')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                      type === 'want'
                        ? 'bg-bloom-blue/15 border-bloom-blue/30 text-bloom-blue'
                        : 'bg-transparent border-sage/10 text-sage-dark/50 dark:text-sage/40 hover:border-sage/20'
                    }`}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" /> Want
                  </button>
                </div>
              </div>

              {/* Variety input */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sage-dark/60 dark:text-sage/50 block" style={{ marginBottom: 10 }}>
                  Variety
                </label>
                <input
                  type="text"
                  value={variety}
                  onChange={e => setVariety(e.target.value)}
                  placeholder={`e.g. ${plant.variety || 'Cherokee Purple'}`}
                  className="w-full px-3 py-2 rounded-xl border border-sage/15 dark:border-sage-dark/20 bg-white/80 dark:bg-midnight-sage/80 text-sm text-forest-deep dark:text-cream placeholder:text-sage/40 focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage/20 transition-all"
                />
              </div>

              <button
                onClick={handleSave}
                className="w-full py-2 rounded-xl text-xs font-medium bg-gradient-to-b from-forest to-forest-deep text-cream hover:brightness-110 transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Save
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Details expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-center gap-1.5 text-[10px] text-sage-dark/50 dark:text-sage/40 hover:text-sage-dark dark:hover:text-sage hover:bg-sage/5 dark:hover:bg-sage/5 transition-all duration-200 border-t border-sage/8 dark:border-sage-dark/12"
      >
        <span>{expanded ? 'Less' : 'Plant details'}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="text-xs text-sage-dark dark:text-sage" style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-sage-dark/60 dark:text-sage/50">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {plant.daysToMaturity}d</span>
                <span className="flex items-center gap-1"><Sun className="w-3 h-3" /> {plant.sun}</span>
                <span className="flex items-center gap-1"><Droplets className="w-3 h-3" /> {plant.water}</span>
                <span>{plant.spacingIn}" spacing</span>
              </div>
              <DeerMeter level={plant.deerResistance} />
              {plant.companions.length > 0 && (
                <div className="flex items-start gap-1">
                  <Users className="w-3 h-3 mt-0.5 text-sage shrink-0" />
                  <div>
                    <span className="font-medium text-forest-deep dark:text-cream">Good with: </span>
                    {plant.companions.map(id => getPlantById(id)?.name || id).join(', ')}
                  </div>
                </div>
              )}
              {plant.avoid.length > 0 && (
                <div className="flex items-start gap-1">
                  <Ban className="w-3 h-3 mt-0.5 text-bloom-red shrink-0" />
                  <div>
                    <span className="font-medium text-bloom-red">Avoid: </span>
                    {plant.avoid.map(id => getPlantById(id)?.name || id).join(', ')}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Card for adding a new plant from the catalog
function AddPlantCard({ plant, onAdd, userZone, existingCount }) {
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState('seed');
  const [variety, setVariety] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const zoneCompatible = !userZone || plant.zones.includes(userZone);

  // Look up variety details
  const varietyInfo = useMemo(() => lookupVariety(plant.id, variety), [plant.id, variety]);
  const knownVarieties = useMemo(() => getVarietiesForPlant(plant.id), [plant.id]);
  const filteredSuggestions = useMemo(() => {
    if (!variety) return knownVarieties;
    const q = variety.toLowerCase();
    return knownVarieties.filter(v => v.name.toLowerCase().includes(q));
  }, [variety, knownVarieties]);

  const handleAdd = () => {
    onAdd({ plantId: plant.id, type, variety, varietyInfo: varietyInfo || undefined });
    setShowForm(false);
    setType('seed');
    setVariety('');
  };

  return (
    <motion.div
      layout
      className="rounded-2xl border border-sage/12 bg-white dark:border-sage-dark/15 dark:bg-midnight-green hover:border-sage/25 dark:hover:border-sage-dark/30 hover:shadow-sm transition-all duration-200 overflow-hidden"
    >
      <div className="p-7 flex items-start gap-5">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm"
          style={{ backgroundColor: plant.color + '15' }}
        >
          {plant.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-forest-deep dark:text-cream leading-tight">
                {plant.name}
              </h3>
              <p className="text-[10px] text-sage-dark/60 dark:text-sage/50 mt-1">
                {plant.variety} · {PLANT_CATEGORIES[plant.category]?.label}
              </p>
            </div>
            <div className="flex items-center shrink-0" style={{ gap: 6 }}>
              {existingCount > 0 && (
                <span className="badge bg-terra/10 text-terra-dark dark:bg-terra/15 dark:text-terra-light border border-terra/20 text-[9px]">
                  {existingCount} in collection
                </span>
              )}
              <button
                onClick={() => setShowForm(!showForm)}
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-sage/8 text-sage hover:bg-sage/15 dark:bg-sage/12 dark:text-sage-light border border-sage/15 dark:border-sage-dark/20 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3.5 text-[10px] text-sage-dark/60 dark:text-sage/50">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {plant.daysToMaturity}d</span>
            <span className="flex items-center gap-1"><Sun className="w-3 h-3" /> {plant.sun}</span>
            <span className="flex items-center gap-1"><Droplets className="w-3 h-3" /> {plant.water}</span>
          </div>

          {!zoneCompatible && (
            <div className="mt-3">
              <span className="badge bg-bloom-red/8 text-bloom-red border border-bloom-red/15">
                Not Zone {userZone}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-sage/10 dark:border-sage-dark/15" style={{ padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Type toggle */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sage-dark/60 dark:text-sage/50 block" style={{ marginBottom: 10 }}>
                  What do I have?
                </label>
                <div className="flex" style={{ gap: 8 }}>
                  <button
                    onClick={() => setType('seed')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                      type === 'seed'
                        ? 'bg-sage/15 border-sage/30 text-forest-deep dark:text-cream'
                        : 'bg-transparent border-sage/10 text-sage-dark/50 dark:text-sage/40 hover:border-sage/20'
                    }`}
                  >
                    <Sprout className="w-3.5 h-3.5" /> Seed
                  </button>
                  <button
                    onClick={() => setType('start')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                      type === 'start'
                        ? 'bg-terra/15 border-terra/30 text-forest-deep dark:text-cream'
                        : 'bg-transparent border-sage/10 text-sage-dark/50 dark:text-sage/40 hover:border-sage/20'
                    }`}
                  >
                    <Flower2 className="w-3.5 h-3.5" /> Start
                  </button>
                  <button
                    onClick={() => setType('want')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                      type === 'want'
                        ? 'bg-bloom-blue/15 border-bloom-blue/30 text-bloom-blue'
                        : 'bg-transparent border-sage/10 text-sage-dark/50 dark:text-sage/40 hover:border-sage/20'
                    }`}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" /> Want
                  </button>
                </div>
              </div>

              {/* Variety */}
              <div className="relative">
                <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sage-dark/60 dark:text-sage/50 block" style={{ marginBottom: 10 }}>
                  Variety (optional)
                </label>
                <input
                  type="text"
                  value={variety}
                  onChange={e => { setVariety(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  placeholder={`e.g. ${plant.variety || 'Cherokee Purple'}`}
                  className="w-full px-3 py-2 rounded-xl border border-sage/15 dark:border-sage-dark/20 bg-white/80 dark:bg-midnight-sage/80 text-sm text-forest-deep dark:text-cream placeholder:text-sage/40 focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage/20 transition-all"
                />
                {/* Variety suggestions dropdown */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 z-20 bg-white dark:bg-midnight-green rounded-xl shadow-xl border border-sage/15 dark:border-sage-dark/20 overflow-hidden" style={{ top: '100%', marginTop: 4, maxHeight: 180, overflowY: 'auto' }}>
                    {filteredSuggestions.map(v => (
                      <button
                        key={v.name}
                        onMouseDown={(e) => { e.preventDefault(); setVariety(v.name); setShowSuggestions(false); }}
                        className="w-full text-left hover:bg-sage/8 dark:hover:bg-sage/8 transition-colors"
                        style={{ padding: '8px 12px' }}
                      >
                        <div className="text-xs font-medium text-forest-deep dark:text-cream">{v.name}</div>
                        {v.notes && <div className="text-[10px] text-sage-dark/60 dark:text-sage/50 truncate" style={{ marginTop: 2 }}>{v.notes.slice(0, 60)}...</div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Variety details */}
              {varietyInfo && (
                <div className="rounded-xl bg-sage/8 dark:bg-sage/10 border border-sage/15 dark:border-sage-dark/20" style={{ padding: '12px 14px' }}>
                  <div className="flex items-center text-[10px] font-semibold text-forest-deep dark:text-cream" style={{ gap: 6, marginBottom: 6 }}>
                    <Info className="w-3 h-3 text-sage" />
                    {varietyInfo.matched && varietyInfo.matched !== variety.toLowerCase() ? `Matched: ${varietyInfo.matched}` : 'Variety Details'}
                  </div>
                  <div className="flex flex-wrap text-[10px] text-sage-dark/70 dark:text-sage/60" style={{ gap: '4px 16px' }}>
                    {varietyInfo.daysToMaturity && <span>{varietyInfo.daysToMaturity} days to harvest</span>}
                    {varietyInfo.color && <span>{varietyInfo.color}</span>}
                    {varietyInfo.size && <span>{varietyInfo.size}</span>}
                    {varietyInfo.type && <span>{varietyInfo.type}</span>}
                    {varietyInfo.heat && <span>{varietyInfo.heat}</span>}
                  </div>
                  {varietyInfo.notes && (
                    <p className="text-[10px] text-sage-dark/60 dark:text-sage/50 italic" style={{ marginTop: 6 }}>{varietyInfo.notes}</p>
                  )}
                </div>
              )}

              <button
                onClick={handleAdd}
                className="w-full py-2 rounded-xl text-xs font-medium bg-gradient-to-b from-forest to-forest-deep text-cream hover:brightness-110 transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> {existingCount > 0 ? 'Add Another Variety' : 'Add to My Collection'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function SeedInventory() {
  const { state, dispatch } = useStore();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showInventoryOnly, setShowInventoryOnly] = useState(state.seedInventory.length > 0);
  const [showZoneOnly, setShowZoneOnly] = useState(false);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'compact'

  // Helper to check if a plant is in inventory
  const inventoryPlantIds = useMemo(() =>
    new Set(state.seedInventory.map(item => item.plantId)),
    [state.seedInventory]
  );

  const filteredPlants = useMemo(() => {
    let plants = PLANTS;
    if (showZoneOnly && state.zone) {
      plants = plants.filter(p => p.zones.includes(state.zone));
    }
    if (activeCategory !== 'all') {
      plants = plants.filter(p => p.category === activeCategory);
    }
    if (search) {
      const q = search.toLowerCase();
      plants = plants.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.variety.toLowerCase().includes(q)
      );
    }
    // Catalog shows all plants — users can add multiple varieties of each
    return plants;
  }, [search, activeCategory, showZoneOnly, showInventoryOnly, state.zone, inventoryPlantIds]);

  // Filter inventory items
  const filteredInventory = useMemo(() => {
    let items = state.seedInventory;
    if (activeCategory !== 'all') {
      items = items.filter(item => {
        const plant = getPlantById(item.plantId);
        return plant && plant.category === activeCategory;
      });
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(item => {
        const plant = getPlantById(item.plantId);
        return plant && (
          plant.name.toLowerCase().includes(q) ||
          plant.variety.toLowerCase().includes(q) ||
          (item.variety && item.variety.toLowerCase().includes(q))
        );
      });
    }
    return [...items].reverse();
  }, [state.seedInventory, search, activeCategory]);

  // Quick-add state
  const [quickPlant, setQuickPlant] = useState(null); // selected plant object
  const [quickSearch, setQuickSearch] = useState('');
  const [quickType, setQuickType] = useState('seed');
  const [quickVariety, setQuickVariety] = useState('');
  const [quickShowDropdown, setQuickShowDropdown] = useState(false);
  const [quickShowVarietySuggestions, setQuickShowVarietySuggestions] = useState(false);

  const quickFilteredPlants = useMemo(() => {
    if (!quickSearch) return PLANTS.slice(0, 8);
    const q = quickSearch.toLowerCase();
    return PLANTS.filter(p => p.name.toLowerCase().includes(q) || p.variety.toLowerCase().includes(q)).slice(0, 8);
  }, [quickSearch]);

  const quickVarietyInfo = useMemo(() => quickPlant ? lookupVariety(quickPlant.id, quickVariety) : null, [quickPlant, quickVariety]);
  const quickVarietySuggestions = useMemo(() => {
    if (!quickPlant) return [];
    const all = getVarietiesForPlant(quickPlant.id);
    if (!quickVariety) return all.slice(0, 10);
    const q = quickVariety.toLowerCase();
    return all.filter(v => v.name.toLowerCase().includes(q));
  }, [quickPlant, quickVariety]);

  // Auto-show variety suggestions when a plant is selected
  useEffect(() => {
    if (quickPlant) setQuickShowVarietySuggestions(true);
  }, [quickPlant]);

  // Web lookup state
  const [webLookupLoading, setWebLookupLoading] = useState(false);
  const [webLookupResult, setWebLookupResult] = useState(null);

  // Search the web for an unknown variety
  const handleWebLookup = async () => {
    if (!quickPlant || !quickVariety || quickVarietyInfo) return;
    setWebLookupLoading(true);
    setWebLookupResult(null);
    try {
      const query = `${quickVariety} ${quickPlant.name} variety days to maturity growing info`;
      const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=1`);
      const wiki = await res.json();

      // Also try a more targeted gardening search via DuckDuckGo instant answer
      const ddgRes = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(`${quickVariety} ${quickPlant.name} seed variety`)}&format=json&no_redirect=1`);
      const ddg = await ddgRes.json();

      // Parse what we can from the results
      const abstract = ddg.Abstract || ddg.AbstractText || '';
      const wikiSnippet = wiki?.query?.search?.[0]?.snippet?.replace(/<[^>]*>/g, '') || '';
      const description = abstract || wikiSnippet;

      // Try to extract days to maturity from the text
      const daysMatch = description.match(/(\d{2,3})\s*(?:days?|d)\s*(?:to\s*(?:maturity|harvest))?/i);
      const daysToMaturity = daysMatch ? parseInt(daysMatch[1]) : null;

      if (description) {
        const result = {
          notes: description.slice(0, 200) + (description.length > 200 ? '...' : ''),
          daysToMaturity,
          source: 'web',
        };
        setWebLookupResult(result);
      } else {
        setWebLookupResult({ notes: `No details found for "${quickVariety}" ${quickPlant.name}. You can still add it!`, source: 'none' });
      }
    } catch {
      setWebLookupResult({ notes: 'Lookup failed — check your connection. You can still add it manually.', source: 'error' });
    }
    setWebLookupLoading(false);
  };

  // Auto-trigger web lookup when variety changes and isn't in local DB
  const webLookupTimeout = useRef(null);
  useEffect(() => {
    setWebLookupResult(null);
    if (webLookupTimeout.current) clearTimeout(webLookupTimeout.current);
    if (quickPlant && quickVariety.length >= 3 && !quickVarietyInfo) {
      webLookupTimeout.current = setTimeout(() => {
        handleWebLookup();
      }, 500); // Wait 500ms after typing stops
    }
    return () => { if (webLookupTimeout.current) clearTimeout(webLookupTimeout.current); };
  }, [quickVariety, quickPlant, quickVarietyInfo]);

  const handleQuickAdd = () => {
    if (!quickPlant) return;
    const info = quickVarietyInfo || (webLookupResult?.source !== 'none' && webLookupResult?.source !== 'error' ? webLookupResult : undefined);
    dispatch({ type: 'ADD_TO_INVENTORY', payload: { plantId: quickPlant.id, type: quickType, variety: quickVariety, varietyInfo: info || undefined } });
    setQuickPlant(null);
    setQuickSearch('');
    setQuickType('seed');
    setQuickVariety('');
    setWebLookupResult(null);
  };

  const handleAdd = (payload) => {
    dispatch({ type: 'ADD_TO_INVENTORY', payload });
  };

  const handleRemove = (id) => {
    dispatch({ type: 'REMOVE_FROM_INVENTORY', payload: id });
  };

  const handleUpdate = (payload) => {
    dispatch({ type: 'UPDATE_INVENTORY_ITEM', payload });
  };

  const seedCount = state.seedInventory.filter(i => i.type === 'seed').length;
  const startCount = state.seedInventory.filter(i => i.type === 'start').length;
  const wantCount = state.seedInventory.filter(i => i.type === 'want').length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-sage/10 dark:border-sage-dark/15" style={{ padding: '32px 40px 0' }}>
        {/* Top row: title + smart search + view toggle */}
        <div className="flex items-center" style={{ gap: 16 }}>
          <h2 className="font-display text-2xl font-semibold text-forest-deep dark:text-cream shrink-0">
            Seed Inventory
          </h2>
          <div className="relative flex-1" style={{ maxWidth: 480 }}>
            <Search className="absolute top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-sage/40" style={{ left: 16 }} />
            {quickPlant ? (
              /* Plant selected — show plant + variety input inline */
              <div className="flex items-center w-full rounded-2xl border-2 border-terra/25 bg-white dark:bg-midnight-sage/80 shadow-sm" style={{ padding: '0 8px 0 0', minHeight: 48 }}>
                <button
                  onClick={() => { setQuickPlant(null); setQuickVariety(''); setSearch(''); }}
                  className="flex items-center shrink-0 rounded-l-2xl bg-terra/8 text-sm font-medium text-forest-deep dark:text-cream hover:bg-terra/15 transition-all"
                  style={{ padding: '12px 14px 12px 18px', gap: 8 }}
                >
                  <span className="text-lg">{quickPlant.emoji}</span>
                  <span>{quickPlant.name}</span>
                  <X className="w-3.5 h-3.5 text-sage-dark/30 hover:text-sage-dark/60" />
                </button>
                <div className="flex items-center flex-1" style={{ gap: 8 }}>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={quickVariety}
                      onChange={e => { setQuickVariety(e.target.value); setQuickShowVarietySuggestions(true); }}
                      onFocus={() => setQuickShowVarietySuggestions(true)}
                      onBlur={() => setTimeout(() => setQuickShowVarietySuggestions(false), 200)}
                      onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
                      placeholder="Enter variety..."
                      autoFocus
                      className="w-full bg-transparent text-sm text-forest-deep dark:text-cream placeholder:text-sage/30 focus:outline-none"
                      style={{ padding: '12px 10px' }}
                    />
                    {quickShowVarietySuggestions && quickVarietySuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 z-30 bg-white dark:bg-midnight-green rounded-xl shadow-xl border border-sage/15 dark:border-sage-dark/20 overflow-hidden" style={{ top: '100%', marginTop: 8, maxHeight: 200, overflowY: 'auto' }}>
                        {quickVarietySuggestions.map(v => (
                          <button
                            key={v.name}
                            onMouseDown={(e) => { e.preventDefault(); setQuickVariety(v.name); setQuickShowVarietySuggestions(false); }}
                            className="w-full text-left hover:bg-sage/8 dark:hover:bg-sage/8 transition-colors"
                            style={{ padding: '10px 14px' }}
                          >
                            <div className="text-xs font-medium text-forest-deep dark:text-cream">{v.name}</div>
                            {v.notes && <div className="text-[10px] text-sage-dark/50 truncate" style={{ marginTop: 2 }}>{v.notes.slice(0, 60)}...</div>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Seed/Start/Want toggle */}
                  <button
                    onClick={() => setQuickType(quickType === 'seed' ? 'start' : quickType === 'start' ? 'want' : 'seed')}
                    className={`shrink-0 flex items-center rounded-xl text-[11px] font-medium transition-all ${
                      quickType === 'want' ? 'bg-bloom-blue/15 text-bloom-blue border border-bloom-blue/20'
                        : quickType === 'start' ? 'bg-terra/15 text-terra-dark dark:text-terra-light border border-terra/20'
                        : 'bg-sage/10 text-sage-dark/60 dark:text-sage/50 border border-sage/15'
                    }`}
                    style={{ padding: '6px 12px', gap: 5 }}
                    title="Click to toggle: Seed → Start → Want"
                  >
                    {quickType === 'want' ? <ShoppingCart className="w-3.5 h-3.5" /> : quickType === 'start' ? <Flower2 className="w-3.5 h-3.5" /> : <Sprout className="w-3.5 h-3.5" />}
                    {quickType === 'want' ? 'Want' : quickType === 'start' ? 'Start' : 'Seed'}
                  </button>
                  <button
                    onClick={handleQuickAdd}
                    className="shrink-0 flex items-center rounded-xl text-xs font-semibold bg-gradient-to-b from-forest to-forest-deep text-cream hover:brightness-110 transition-all shadow-sm"
                    style={{ padding: '8px 16px', gap: 6 }}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>
            ) : (
              /* Normal search — filters collection + shows plant picker dropdown */
              <>
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setQuickShowDropdown(true); }}
                  onFocus={() => { if (search) setQuickShowDropdown(true); }}
                  onBlur={() => setTimeout(() => setQuickShowDropdown(false), 200)}
                  placeholder="Search or add a plant..."
                  className="w-full rounded-2xl border-2 border-sage/15 dark:border-sage-dark/20 bg-white dark:bg-midnight-sage/80 text-sm text-forest-deep dark:text-cream placeholder:text-sage/30 focus:border-sage/30 dark:focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage/10 transition-all shadow-sm"
                  style={{ padding: '13px 18px 13px 44px' }}
                />
                {quickShowDropdown && search.length >= 1 && (
                  <div className="absolute left-0 right-0 z-30 bg-white dark:bg-midnight-green rounded-xl shadow-xl border border-sage/15 dark:border-sage-dark/20 overflow-hidden" style={{ top: '100%', marginTop: 6, maxHeight: 280, overflowY: 'auto' }}>
                    {/* Matching plants to add */}
                    {(() => {
                      const q = search.toLowerCase();
                      const matches = PLANTS.filter(p => p.name.toLowerCase().includes(q) || p.variety.toLowerCase().includes(q)).slice(0, 8);
                      if (matches.length === 0) return <div className="text-xs text-sage-dark/40 dark:text-sage/30" style={{ padding: '12px 16px' }}>No plants found</div>;
                      return matches.map(p => {
                        const count = state.seedInventory.filter(i => i.plantId === p.id).length;
                        return (
                          <button
                            key={p.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setQuickPlant(p);
                              setSearch('');
                              setQuickShowDropdown(false);
                            }}
                            className="w-full text-left flex items-center hover:bg-sage/8 dark:hover:bg-sage/8 transition-colors"
                            style={{ padding: '10px 16px', gap: 10 }}
                          >
                            <span className="text-base">{p.emoji}</span>
                            <div className="flex-1">
                              <span className="text-xs font-medium text-forest-deep dark:text-cream">{p.name}</span>
                              {count > 0 && (
                                <span className="text-[10px] text-terra dark:text-terra-light" style={{ marginLeft: 8 }}>{count} in collection</span>
                              )}
                            </div>
                            <span className="text-[10px] text-sage-dark/40 dark:text-sage/30 flex items-center" style={{ gap: 4 }}>
                              <Plus className="w-3 h-3" /> Add
                            </span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex items-center ml-auto" style={{ gap: 8 }}>
            {showInventoryOnly && (
              <div className="flex rounded-lg border border-sage/15 dark:border-sage-dark/20 overflow-hidden">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`transition-all ${viewMode === 'cards' ? 'bg-sage/15 text-forest-deep dark:text-cream' : 'text-sage-dark/40 dark:text-sage/30 hover:bg-sage/8'}`}
                  style={{ padding: '5px 8px' }}
                  title="Card view"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('compact')}
                  className={`transition-all border-l border-sage/15 dark:border-sage-dark/20 ${viewMode === 'compact' ? 'bg-sage/15 text-forest-deep dark:text-cream' : 'text-sage-dark/40 dark:text-sage/30 hover:bg-sage/8'}`}
                  style={{ padding: '5px 8px' }}
                  title="Compact list"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {!showInventoryOnly && state.zone && (
              <button
                onClick={() => setShowZoneOnly(!showZoneOnly)}
                style={{ padding: '6px 12px' }}
                className={`rounded-lg text-[11px] font-medium transition-all ${
                  showZoneOnly
                    ? 'bg-sage text-cream shadow-sm'
                    : 'bg-sage/8 text-sage-dark/60 dark:text-sage/50 hover:bg-sage/15'
                }`}
              >
                Zone {state.zone}
              </button>
            )}
          </div>
        </div>

        {/* Tab bar: My Collection / Browse + category filters */}
        <div className="flex items-center" style={{ marginTop: 20, gap: 0 }}>
          {/* Main tabs */}
          <button
            onClick={() => setShowInventoryOnly(true)}
            style={{ padding: '10px 20px' }}
            className={`text-xs font-medium border-b-2 transition-all ${
              showInventoryOnly
                ? 'border-terra text-terra dark:text-terra-light'
                : 'border-transparent text-sage-dark/50 dark:text-sage/40 hover:text-sage-dark dark:hover:text-sage'
            }`}
          >
            My Collection ({state.seedInventory.length})
          </button>
          <button
            onClick={() => setShowInventoryOnly(false)}
            style={{ padding: '10px 20px' }}
            className={`text-xs font-medium border-b-2 transition-all ${
              !showInventoryOnly
                ? 'border-forest text-forest dark:text-cream'
                : 'border-transparent text-sage-dark/50 dark:text-sage/40 hover:text-sage-dark dark:hover:text-sage'
            }`}
          >
            Browse Catalog
          </button>

          {/* Category pills — right-aligned */}
          <div className="flex items-center ml-auto" style={{ gap: 6 }}>
            <button
              onClick={() => setActiveCategory('all')}
              style={{ padding: '5px 12px' }}
              className={`rounded-full text-[10px] font-medium transition-all ${
                activeCategory === 'all'
                  ? 'bg-forest/10 text-forest dark:bg-sage/15 dark:text-cream'
                  : 'text-sage-dark/40 dark:text-sage/30 hover:bg-sage/8'
              }`}
            >
              All
            </button>
            {Object.entries(PLANT_CATEGORIES).map(([key, cat]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                style={{ padding: '5px 12px' }}
                className={`rounded-full text-[10px] font-medium transition-all ${
                  activeCategory === key
                    ? 'bg-forest/10 text-forest dark:bg-sage/15 dark:text-cream'
                    : 'text-sage-dark/40 dark:text-sage/30 hover:bg-sage/8'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '32px 40px' }}>
        {/* Variety info preview — local DB or web lookup */}
        {quickPlant && quickVarietyInfo && (
          <div className="rounded-xl bg-sage/6 dark:bg-sage/8 text-[11px] text-sage-dark/60 dark:text-sage/50 border border-sage/10 dark:border-sage-dark/15" style={{ padding: '12px 16px', marginBottom: 20 }}>
            <div className="flex items-center" style={{ gap: 6, marginBottom: 4 }}>
              <Info className="w-3 h-3 text-sage" />
              <span className="text-[10px] font-semibold text-forest-deep dark:text-cream uppercase tracking-wider">Known Variety</span>
            </div>
            <div className="italic">
              {quickVarietyInfo.daysToMaturity && <span className="not-italic font-medium">{quickVarietyInfo.daysToMaturity}d</span>}
              {quickVarietyInfo.color && <span> · {quickVarietyInfo.color}</span>}
              {quickVarietyInfo.heat && <span> · {quickVarietyInfo.heat}</span>}
              {quickVarietyInfo.notes && <span> — {quickVarietyInfo.notes}</span>}
            </div>
          </div>
        )}
        {quickPlant && !quickVarietyInfo && webLookupLoading && (
          <div className="rounded-xl bg-bloom-blue/5 dark:bg-bloom-blue/8 text-[11px] text-sage-dark/50 dark:text-sage/40 border border-bloom-blue/10" style={{ padding: '12px 16px', marginBottom: 20 }}>
            <div className="flex items-center" style={{ gap: 8 }}>
              <div className="w-3 h-3 border-2 border-bloom-blue/40 border-t-bloom-blue rounded-full animate-spin" />
              Looking up "{quickVariety}" {quickPlant.name}...
            </div>
          </div>
        )}
        {quickPlant && !quickVarietyInfo && webLookupResult && !webLookupLoading && (
          <div className={`rounded-xl text-[11px] border ${
            webLookupResult.source === 'web'
              ? 'bg-bloom-blue/5 dark:bg-bloom-blue/8 border-bloom-blue/10 text-sage-dark/60 dark:text-sage/50'
              : 'bg-sage/4 dark:bg-sage/6 border-sage/10 text-sage-dark/40 dark:text-sage/30'
          }`} style={{ padding: '12px 16px', marginBottom: 20 }}>
            {webLookupResult.source === 'web' && (
              <div className="flex items-center" style={{ gap: 6, marginBottom: 4 }}>
                <Search className="w-3 h-3 text-bloom-blue" />
                <span className="text-[10px] font-semibold text-forest-deep dark:text-cream uppercase tracking-wider">Found Online</span>
              </div>
            )}
            <div className="italic">
              {webLookupResult.daysToMaturity && <span className="not-italic font-medium">{webLookupResult.daysToMaturity}d · </span>}
              {webLookupResult.notes}
            </div>
          </div>
        )}

        {showInventoryOnly ? (
          viewMode === 'compact' ? (
            /* Compact list grouped by category */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {Object.entries(PLANT_CATEGORIES).map(([catKey, cat]) => {
                const catItems = filteredInventory.filter(item => {
                  const plant = getPlantById(item.plantId);
                  return plant && plant.category === catKey;
                });
                if (catItems.length === 0) return null;
                return (
                  <div key={catKey}>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-sage-dark/50 dark:text-sage/40" style={{ marginBottom: 10, padding: '0 4px' }}>
                      {cat.label} ({catItems.length})
                    </div>
                    <div className="rounded-xl border border-sage/15 dark:border-sage-dark/20 overflow-hidden bg-white/60 dark:bg-midnight-green/40">
                      {catItems.map((item, i) => {
                        const plant = getPlantById(item.plantId);
                        if (!plant) return null;
                        const vInfo = item.varietyInfo || lookupVariety(plant.id, item.variety);
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center hover:bg-sage/5 dark:hover:bg-sage/5 transition-colors ${i > 0 ? 'border-t border-sage/8 dark:border-sage-dark/12' : ''}`}
                            style={{ padding: '10px 16px', gap: 12 }}
                          >
                            <span className="text-base leading-none">{plant.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline" style={{ gap: 6 }}>
                                <span className="text-xs font-semibold text-forest-deep dark:text-cream">{plant.name}</span>
                                {item.variety && (
                                  <span className="text-[11px] text-terra dark:text-terra-light font-medium">'{item.variety}'</span>
                                )}
                              </div>
                              {vInfo?.notes && (
                                <div className="text-[10px] text-sage-dark/50 dark:text-sage/40 truncate" style={{ marginTop: 2 }}>{vInfo.notes}</div>
                              )}
                            </div>
                            <span className={`inline-flex items-center rounded-md text-[9px] font-medium ${
                              item.type === 'want'
                                ? 'bg-bloom-blue/10 text-bloom-blue border border-bloom-blue/20'
                                : item.type === 'start'
                                  ? 'bg-terra/10 text-terra-dark dark:text-terra-light border border-terra/20'
                                  : 'bg-sage/10 text-sage-dark dark:text-sage-light border border-sage/20'
                            }`} style={{ padding: '2px 8px', gap: 4 }}>
                              {item.type === 'want' ? <ShoppingCart className="w-2.5 h-2.5" /> : item.type === 'start' ? <Flower2 className="w-2.5 h-2.5" /> : <Sprout className="w-2.5 h-2.5" />}
                              {item.type === 'want' ? 'Want' : item.type === 'start' ? 'Start' : 'Seed'}
                            </span>
                            {vInfo?.daysToMaturity && (
                              <span className="text-[10px] text-sage-dark/50 dark:text-sage/40 tabular-nums" style={{ minWidth: 28, textAlign: 'right' }}>{vInfo.daysToMaturity}d</span>
                            )}
                            <button
                              onClick={() => handleRemove(item.id)}
                              className="text-sage-dark/30 hover:text-bloom-red transition-colors"
                              style={{ padding: 4 }}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Card grid view */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 24 }}>
              {filteredInventory.map(item => (
                <InventoryItemCard
                  key={item.id}
                  item={item}
                  plant={getPlantById(item.plantId)}
                  onRemove={handleRemove}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          )
        ) : (
          /* Browse Catalog view */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 24 }}>
            {filteredPlants.map(plant => (
              <AddPlantCard
                key={plant.id}
                plant={plant}
                onAdd={handleAdd}
                userZone={state.zone}
                existingCount={state.seedInventory.filter(i => i.plantId === plant.id).length}
              />
            ))}
          </div>
        )}

        {/* Empty states */}
        {showInventoryOnly && filteredInventory.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-sage/8 dark:bg-sage/12 flex items-center justify-center mx-auto mb-4">
              <Sprout className="w-7 h-7 text-sage/30" />
            </div>
            <p className="text-lg font-display text-sage-dark/50 dark:text-sage/40">No seeds yet</p>
            <p className="text-sm mt-1.5 text-sage-dark/35 dark:text-sage/25">Browse the catalog to add seeds and starts</p>
            <button
              onClick={() => setShowInventoryOnly(false)}
              className="mt-4 px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-b from-forest to-forest-deep text-cream hover:brightness-110 transition-all shadow-sm inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Browse Catalog
            </button>
          </div>
        )}
        {!showInventoryOnly && filteredPlants.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-sage/8 dark:bg-sage/12 flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7 text-sage/30" />
            </div>
            <p className="text-lg font-display text-sage-dark/50 dark:text-sage/40">No plants found</p>
            <p className="text-sm mt-1.5 text-sage-dark/35 dark:text-sage/25">Try a different search or filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
