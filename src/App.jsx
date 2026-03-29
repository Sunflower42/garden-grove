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
    <AuthProvider>
      <AuthGate>
        <StoreProvider>
          <AppContent />
        </StoreProvider>
      </AuthGate>
    </AuthProvider>
  );
}
