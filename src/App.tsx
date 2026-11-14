import { useEffect } from "react";
import { useGameStore } from "./stores/gameStore";
import { HomeScreen } from "./components/screens/HomeScreen";
import { LevelSelectorScreen } from "./components/screens/LevelSelectorScreen";
import { GameHUD } from "./components/game/GameHUD";
import { GameGrid } from "./components/game/GameGrid";
import { StarTrackerPanel } from "./components/game/StarTrackerPanel";
import { PlacementBar } from "./components/game/PlacementBar";
import { ResultModal } from "./components/game/ResultModal";

export function App() {
  const currentScreen = useGameStore((s) => s.currentScreen);
  const gameState = useGameStore((s) => s.gameState);
  const toastMessage = useGameStore((s) => s.toastMessage);
  const dismissToast = useGameStore((s) => s.dismissToast);
  const showStarSidebar = useGameStore((s) => s.showStarSidebar);

  // Manage Day / Night data-theme per spec 14.8
  useEffect(() => {
    if (currentScreen === "game") {
      const isNight =
        gameState.phase === "activation" || gameState.phase === "simulation";
      document.documentElement.setAttribute(
        "data-theme",
        isNight ? "night" : "day",
      );
    } else {
      document.documentElement.setAttribute("data-theme", "day");
    }
  }, [currentScreen, gameState.phase]);

  if (currentScreen === "home") {
    return <HomeScreen />;
  }

  if (currentScreen === "level-select") {
    return <LevelSelectorScreen />;
  }

  return (
    <div className="h-dvh w-full flex flex-col justify-between overflow-hidden relative pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 w-max max-w-[92vw] bg-[var(--alert)] border-2 border-white text-white px-4 sm:px-5 py-2.5 rounded-2xl shadow-xl animate-bounce">
          <img src="/icons/alert-x.svg" alt="Alert" className="w-5 h-5 shrink-0" />
          <span className="text-sm font-bold">{toastMessage}</span>
          <button
            onClick={dismissToast}
            className="ml-1 sm:ml-2 w-8 h-8 shrink-0 flex items-center justify-center font-black text-xs hover:opacity-75"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top HUD */}
      <GameHUD />

      {/* Main Playing Area with Board and Toggle-able Live Star Tracker Panel */}
      <div className="flex-1 min-h-0 flex items-center justify-center gap-6 px-2 sm:px-4 py-1 sm:py-2 overflow-hidden transition-all duration-300">
        <GameGrid />
        {showStarSidebar && <StarTrackerPanel />}
      </div>

      {/* Bottom Placement & Navigation Bar */}
      <PlacementBar />

      {/* Result Simulation Modal */}
      <ResultModal />
    </div>
  );
}

export default App;
