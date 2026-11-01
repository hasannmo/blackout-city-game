import { useEffect } from 'react'
import { useGameStore } from './stores/gameStore'
import { GameHUD } from './components/game/GameHUD'
import { GameGrid } from './components/game/GameGrid'
import { PlacementBar } from './components/game/PlacementBar'
import { ResultModal } from './components/game/ResultModal'

export function App() {
  const gameState = useGameStore((s) => s.gameState)
  const toastMessage = useGameStore((s) => s.toastMessage)
  const dismissToast = useGameStore((s) => s.dismissToast)

  // Manage Day / Night data-theme per spec 14.8
  useEffect(() => {
    const isNight = gameState.phase === 'activation' || gameState.phase === 'simulation'
    document.documentElement.setAttribute('data-theme', isNight ? 'night' : 'day')
  }, [gameState.phase])

  return (
    <div className="h-screen w-screen flex flex-col justify-between overflow-hidden relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[var(--alert)] border-2 border-white text-white px-5 py-2.5 rounded-2xl shadow-xl animate-bounce">
          <img src="/icons/alert-x.svg" alt="Alert" className="w-5 h-5" />
          <span className="text-sm font-bold">{toastMessage}</span>
          <button
            onClick={dismissToast}
            className="ml-2 font-black text-xs hover:opacity-75"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top HUD */}
      <GameHUD />

      {/* Main City Grid */}
      <GameGrid />

      {/* Bottom Placement & Navigation Bar */}
      <PlacementBar />

      {/* Result Simulation Modal */}
      <ResultModal />
    </div>
  )
}

export default App
