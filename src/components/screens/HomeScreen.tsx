import React from 'react'
import { useGameStore } from '../../stores/gameStore'

export const HomeScreen: React.FC = () => {
  const setScreen = useGameStore((s) => s.setScreen)

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-between py-10 px-6 select-none bg-[var(--sky)] relative overflow-hidden">
      {/* Decorative background clouds */}
      <div className="absolute top-10 left-12 w-32 h-16 bg-white/40 rounded-full blur-sm pointer-events-none" />
      <div className="absolute top-24 right-20 w-44 h-20 bg-white/40 rounded-full blur-sm pointer-events-none" />

      {/* Prominent Game Logo with glow */}
      <div className="flex-1 flex flex-col items-center justify-center -mt-6">
        <div className="relative flex items-center justify-center">
          <img
            src="/resources/design/logo/logo-glow.png"
            alt="Blackout City"
            className="w-[580px] sm:w-[680px] md:w-[780px] max-w-[90vw] object-contain drop-shadow-xl"
          />
        </div>
        <p className="mt-2 text-sm md:text-base font-black text-[var(--ink)] tracking-widest uppercase">
          Restore Light to the Grid
        </p>
      </div>

      {/* Main Play Action Button */}
      <div className="flex flex-col items-center gap-4 z-10 mb-8">
        <button
          onClick={() => setScreen('level-select')}
          className="flex items-center justify-center gap-3 bg-[var(--btn-green)] hover:brightness-105 active:translate-y-1 transition text-white px-14 py-5 rounded-3xl font-black text-2xl border-4 border-[var(--outline)] shadow-[0_8px_0_var(--btn-green-rim)] min-w-[280px]"
        >
          <img src="/icons/zap.svg" alt="Play" className="w-8 h-8 text-amber-300 drop-shadow" />
          <span>PLAY GAME</span>
        </button>
      </div>

      {/* Footer info */}
      <footer className="text-xs font-bold text-gray-600">
        Blackout City — City Electricity Simulation Puzzle
      </footer>
    </div>
  )
}
