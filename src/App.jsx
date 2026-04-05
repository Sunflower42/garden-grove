import { Component } from 'react';
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
          <pre style={{ marginTop: 20, padding: 16, background: '#f5f5f5', borderRadius: 8, fontSize: 12, overflow: 'auto', color: '#c00' }}>
            {this.state.error?.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { state } = useStore();

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
      <Sidebar />
      <main className="flex-1 overflow-hidden bg-cream dark:bg-midnight">
        <ActiveView />
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
