import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import {
  Sprout, Calendar, Package, Lightbulb, Sun, Moon,
  Plus, Trash2, ChevronDown, MapPin, Leaf, Settings, LogOut
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import SettingsPanel from './SettingsPanel';

const NAV_ITEMS = [
  { id: 'inventory', label: 'Seed Inventory', icon: Package },
  { id: 'planner', label: 'Garden Planner', icon: Sprout },
  { id: 'calendar', label: 'Planting Calendar', icon: Calendar },
  { id: 'recommendations', label: 'Recommendations', icon: Lightbulb },
];

export default function Sidebar() {
  const { state, dispatch } = useStore();
  const { user, signOut } = useAuth();
  const [plotsOpen, setPlotsOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <aside className="h-full flex flex-col border-r border-sage/15 bg-cream-dark dark:bg-midnight-green dark:border-sage-dark/20 grain-texture shrink-0" style={{ width: 264 }}>
      {/* Logo */}
      <div className="relative z-10" style={{ padding: '28px 24px 20px' }}>
        <div className="flex items-center" style={{ gap: 16 }}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-forest to-forest-deep dark:from-sage-dark dark:to-forest flex items-center justify-center shadow-sm">
            <Leaf className="w-5 h-5 text-cream" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold text-forest-deep dark:text-cream leading-tight tracking-tight">
              Garden Grove
            </h1>
            <p className="text-[10px] text-sage-dark/70 dark:text-sage-light/60 font-body tracking-[0.15em] uppercase" style={{ marginTop: 2 }}>
              Plan My Paradise
            </p>
          </div>
        </div>

        {/* Zone badge */}
        {state.zone && (
          <div className="inline-flex items-center rounded-lg bg-sage/10 dark:bg-sage/15 text-[11px] text-sage-dark dark:text-sage-light" style={{ marginTop: 16, gap: 8, padding: '6px 12px' }}>
            <MapPin className="w-3 h-3" />
            <span className="font-medium">Zone {state.zone}</span>
            <span className="text-sage/60 dark:text-sage-dark">·</span>
            <span>{state.zipCode}</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="relative z-10" style={{ padding: '0 16px', marginTop: 4 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = state.activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => dispatch({ type: 'SET_VIEW', payload: item.id })}
              style={{ padding: '10px 16px', gap: 12 }}
              className={`w-full flex items-center rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-forest/10 text-forest dark:bg-sage/15 dark:text-cream shadow-sm'
                  : 'text-soil-light dark:text-sage hover:bg-sage/8 dark:hover:bg-sage/8 hover:text-forest-deep dark:hover:text-cream'
              }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                active
                  ? 'bg-forest/15 dark:bg-sage/20'
                  : 'bg-sage/10 dark:bg-sage/10'
              }`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              {item.label}
            </button>
          );
        })}
        </div>
      </nav>

      {/* Divider */}
      <div className="border-t border-sage/15 dark:border-sage-dark/20 relative z-10" style={{ margin: '16px 20px' }} />

      {/* Garden Plots */}
      <div className="flex-1 overflow-y-auto relative z-10" style={{ padding: '0 16px' }}>
        <button
          onClick={() => setPlotsOpen(!plotsOpen)}
          style={{ padding: '8px 12px' }}
          className="w-full flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.15em] text-sage-dark/70 dark:text-sage/70 hover:text-sage-dark dark:hover:text-sage transition-colors"
        >
          <span>Garden Plots</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${plotsOpen ? '' : '-rotate-90'}`} />
        </button>

        <AnimatePresence>
          {plotsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {/* Yard overview link */}
              <div
                style={{ padding: '10px 16px', gap: 12 }}
                className={`flex items-center rounded-xl cursor-pointer text-sm transition-all duration-200 ${
                  state.activeView === 'planner' && !state.activePlotId
                    ? 'bg-sage/12 text-forest dark:bg-sage/15 dark:text-cream shadow-sm'
                    : 'text-soil-light dark:text-sage hover:bg-sage/8 dark:hover:bg-sage/8 hover:text-forest-deep dark:hover:text-cream'
                }`}
                onClick={() => {
                  dispatch({ type: 'SET_ACTIVE_PLOT', payload: null });
                  dispatch({ type: 'SET_VIEW', payload: 'planner' });
                }}
              >
                <span className="text-base leading-none">🏡</span>
                <span className="flex-1 truncate font-medium">Yard Overview</span>
              </div>

              {state.plots.map(plot => (
                <div
                  key={plot.id}
                  style={{ padding: '10px 16px', gap: 12, marginLeft: 8 }}
                  className={`group flex items-center rounded-xl cursor-pointer text-sm transition-all duration-200 ${
                    state.activePlotId === plot.id
                      ? 'bg-terra/10 text-terra-dark dark:bg-terra/15 dark:text-terra-light shadow-sm'
                      : 'text-soil-light dark:text-sage hover:bg-terra/5 dark:hover:bg-terra/8 hover:text-soil dark:hover:text-cream'
                  }`}
                  onClick={() => {
                    dispatch({ type: 'SET_ACTIVE_PLOT', payload: plot.id });
                    dispatch({ type: 'SET_VIEW', payload: 'planner' });
                  }}
                >
                  <span className="text-sm leading-none">{plot.icon}</span>
                  <span className="flex-1 truncate font-medium">{plot.name}</span>
                  <span className="badge bg-sage/10 dark:bg-sage/15 text-sage-dark dark:text-sage">
                    {plot.plants.length}
                  </span>
                  {state.plots.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete "${plot.name}"?`)) {
                          dispatch({ type: 'REMOVE_PLOT', payload: plot.id });
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-bloom-red/10"
                    >
                      <Trash2 className="w-3 h-3 text-bloom-red/50 hover:text-bloom-red" />
                    </button>
                  )}
                </div>
              ))}

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer controls */}
      <div className="border-t border-sage/15 dark:border-sage-dark/20 relative z-10" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button
          onClick={() => setShowSettings(true)}
          style={{ padding: '10px 12px', gap: 12 }}
          className="w-full flex items-center rounded-lg text-xs text-sage-dark/80 dark:text-sage/80 hover:text-forest dark:hover:text-cream hover:bg-sage/8 dark:hover:bg-sage/10 transition-all duration-200"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
          <span className="ml-auto badge bg-sage/10 dark:bg-sage/15 text-sage-dark dark:text-sage">Zone {state.zone}</span>
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_DARK_MODE', payload: !state.darkMode })}
          style={{ padding: '10px 12px', gap: 12 }}
          className="w-full flex items-center rounded-lg text-xs text-sage-dark/80 dark:text-sage/80 hover:text-forest dark:hover:text-cream hover:bg-sage/8 dark:hover:bg-sage/10 transition-all duration-200"
        >
          {state.darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>{state.darkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        {user && (
          <button
            onClick={signOut}
            style={{ padding: '10px 12px', gap: 12 }}
            className="w-full flex items-center rounded-lg text-xs text-sage-dark/80 dark:text-sage/80 hover:text-bloom-red dark:hover:text-bloom-red hover:bg-bloom-red/5 dark:hover:bg-bloom-red/10 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
            <span className="ml-auto text-[10px] text-sage/60 dark:text-sage-dark/60 truncate max-w-[100px]">{user.email}</span>
          </button>
        )}
        </div>
      </div>

      {/* Settings modal */}
      <AnimatePresence>
        {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      </AnimatePresence>
    </aside>
  );
}
