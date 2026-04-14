import { Component, useState, useEffect } from 'react';
import { AuthProvider } from './AuthContext';
import AuthGate from './components/AuthGate';
import { StoreProvider, useStore } from './store';
import Sidebar from './components/Sidebar';
import Onboarding from './components/Onboarding';
import GardenPlanner from './components/GardenPlanner';
import PlantingCalendar from './components/PlantingCalendar';
import SeedInventory from './components/SeedInventory';
import Recommendations from './components/Recommendations';
import './index.css';

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('ErrorBoundary caught:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: 'system-ui', maxWidth: 600, margin: '0 auto' }}>
          <h1 style={{ color: '#C17644' }}>Something went wrong</h1>
          <p style={{ marginTop: 12, color: '#666' }}>Garden Grove hit an error. Try clearing your local data:</p>
          <button
            onClick={() => { localStorage.removeItem('garden-grove-state'); window.location.reload(); }}
            style={{ marginTop: 16, padding: '10px 20px', background: '#4A5E3A', color: '#FDF6E9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
          >
            Reset Local Data & Reload
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, marginLeft: 12, padding: '10px 20px', background: '#eee', border: '1px solid #ccc', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
          >
            Just Reload
          </button>
          <pre style={{ marginTop: 20, padding: 16, background: '#f5f5f5', borderRadius: 8, fontSize: 12, overflow: 'auto', color: '#c00', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.message}{'\n'}{this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return isMobile;
}

function AppContent() {
  const { state } = useStore();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!state.onboardingComplete) {
    return <Onboarding />;
  }

  const views = {
    planner: GardenPlanner,
    calendar: PlantingCalendar,
    inventory: SeedInventory,
    recommendations: Recommendations,
  };
  const ActiveView = views[state.activeView] || GardenPlanner;

  return (
    <div className={`flex h-full overflow-hidden ${state.darkMode ? 'dark' : ''}`}>
      {/* Mobile hamburger button */}
      {isMobile && !sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-3 left-3 z-50 w-10 h-10 rounded-xl bg-white/90 dark:bg-midnight-green/90 border border-sage/20 dark:border-sage-dark/30 shadow-lg flex items-center justify-center backdrop-blur-sm"
          aria-label="Open menu"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-forest-deep dark:text-cream">
            <line x1="3" y1="4.5" x2="15" y2="4.5" />
            <line x1="3" y1="9" x2="15" y2="9" />
            <line x1="3" y1="13.5" x2="15" y2="13.5" />
          </svg>
        </button>
      )}

      {/* Sidebar — overlay on mobile, static on desktop */}
      {isMobile ? (
        <>
          {sidebarOpen && (
            <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSidebarOpen(false)} />
          )}
          <div
            className={`fixed top-0 left-0 h-full z-50 transition-transform duration-300 ease-out ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <Sidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        </>
      ) : (
        <Sidebar />
      )}

      <main className="flex-1 overflow-hidden bg-cream dark:bg-midnight">
        <ActiveView isMobile={isMobile} />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthGate>
          <StoreProvider>
            <AppContent />
          </StoreProvider>
        </AuthGate>
      </AuthProvider>
    </ErrorBoundary>
  );
}
