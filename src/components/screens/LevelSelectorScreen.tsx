import React from 'react'
import { useGameStore } from '../../stores/gameStore'

export const LevelSelectorScreen: React.FC = () => {
  const setScreen = useGameStore((s) => s.setScreen)

  const levels = [
    { id: 'level-01', name: 'Level 1', title: 'First Spark', stars: 3, unlocked: true },
    { id: 'level-02', name: 'Level 2', title: 'Two Districts', stars: 0, unlocked: false },
    { id: 'level-03', name: 'Level 3', title: 'Grid Cross', stars: 0, unlocked: false },
    { id: 'level-04', name: 'Level 4', title: 'Substation Surge', stars: 0, unlocked: false },
  ]

  return (
    <div className="h-screen w-screen flex flex-col justify-between py-8 px-10 select-none bg-[var(--sky)] overflow-hidden">
      {/* Top Header */}
      <header className="flex items-center justify-between">
        <button
          onClick={() => setScreen('home')}
          className="flex items-center gap-2 bg-[var(--panel)] hover:bg-amber-100 border-2 border-[var(--outline)] text-[var(--ink)] px-5 py-2.5 rounded-2xl font-black text-sm shadow-sm transition active:translate-y-0.5"
        >
          <img src="/icons/arrow-left.svg" alt="Back" className="w-5 h-5" />
          <span>HOME</span>
        </button>

        <h1 className="text-3xl font-black text-[var(--ink)] tracking-wide">
          SELECT LEVEL
        </h1>

        <div className="w-24" />
      </header>

      {/* Level Selection Cards Grid */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl w-full">
          {levels.map((lvl) => {
            const isLevel1 = lvl.id === 'level-01'

            return (
              <div
                key={lvl.id}
                onClick={() => {
                  if (lvl.unlocked) {
                    setScreen('game')
                  }
                }}
                className={`flex flex-col items-center justify-between p-6 rounded-3xl border-4 border-[var(--outline)] transition-all ${
                  lvl.unlocked
                    ? 'bg-[var(--panel)] hover:-translate-y-1.5 cursor-pointer shadow-[0_6px_0_var(--outline)]'
                    : 'bg-white/40 opacity-70 cursor-not-allowed shadow-none'
                }`}
              >
                {/* Level Number Pill */}
                <span className="text-xs font-black px-3 py-1 bg-amber-200 text-amber-900 border border-[var(--outline)] rounded-full mb-3">
                  {lvl.name}
                </span>

                {/* Level Thumbnail / Frame */}
                <div className="w-28 h-28 rounded-2xl bg-[var(--grass-light)] border-2 border-[var(--outline)] flex flex-col items-center justify-center shadow-inner my-2 relative">
                  {isLevel1 ? (
                    <div className="flex flex-col items-center justify-center">
                      <img src="/icons/zap.svg" alt="Power" className="w-10 h-10 drop-shadow" />
                      <span className="text-[10px] font-black text-[var(--ink)] mt-1">4x4 Grid</span>
                    </div>
                  ) : (
                    <span className="text-2xl font-black text-gray-400">🔒</span>
                  )}
                </div>

                {/* Level Title */}
                <span className="text-sm font-black text-[var(--ink)] mt-2">
                  {lvl.title}
                </span>

                {/* Star Rating Display */}
                <div className="flex items-center gap-1.5 mt-3">
                  {[1, 2, 3].map((starIdx) => (
                    <img
                      key={starIdx}
                      src="/icons/star.svg"
                      alt="Star"
                      className={`w-4 h-4 ${
                        starIdx <= lvl.stars ? 'text-amber-500' : 'text-gray-300 opacity-60'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer Info */}
      <footer className="text-center text-xs font-bold text-gray-600">
        Tap Level 1 to start planning the electrical grid
      </footer>
    </div>
  )
}
