import React from 'react'
import { useGameStore } from '../../stores/gameStore'

export const ResultModal: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState)
  const navigateBack = useGameStore((s) => s.navigateBack)
  const resetLevel = useGameStore((s) => s.resetCurrentLevel)

  if (gameState.phase !== 'simulation' || !gameState.result) return null

  const { completed, score, stars } = gameState.result

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--panel)] border-4 border-[var(--outline)] rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center">
        {/* Stars Display */}
        <div className="flex items-center gap-3 mb-4">
          {[1, 2, 3].map((starIdx) => (
            <div
              key={starIdx}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-[var(--outline)] shadow transition-transform ${
                starIdx <= stars
                  ? 'bg-[var(--power-yellow)] scale-110'
                  : 'bg-gray-300 opacity-60'
              }`}
            >
              <img
                src="/icons/star.svg"
                alt="Star"
                className={`w-8 h-8 ${starIdx <= stars ? 'text-[var(--star-on)]' : 'text-gray-400'}`}
              />
            </div>
          ))}
        </div>

        <h2 className="text-3xl font-black text-[var(--ink)] mb-2">
          {completed ? 'LEVEL RESTORED!' : 'BLACKOUT CONTINUES'}
        </h2>

        <p className="text-sm font-bold text-gray-700 mb-6">
          {completed
            ? 'Mandatory objectives satisfied. Electricity successfully distributed!'
            : 'Mandatory objectives could not be fully met with current layout.'}
        </p>

        {/* Score Card */}
        <div className="w-full bg-white/80 rounded-2xl border-2 border-[var(--outline)] py-4 px-6 mb-6">
          <span className="text-xs font-black uppercase text-gray-500 block">Total Score</span>
          <span className="text-4xl font-black text-[var(--ink)]">{score} PTS</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 w-full">
          <button
            onClick={navigateBack}
            className="flex-1 bg-[var(--btn-blue)] hover:brightness-105 active:translate-y-0.5 border-2 border-[var(--outline)] text-white py-3 rounded-2xl font-black shadow-[0_4px_0_var(--btn-blue-rim)]"
          >
            ADJUST
          </button>
          <button
            onClick={resetLevel}
            className="flex-1 bg-[var(--btn-green)] hover:brightness-105 active:translate-y-0.5 border-2 border-[var(--outline)] text-white py-3 rounded-2xl font-black shadow-[0_4px_0_var(--btn-green-rim)]"
          >
            PLAY AGAIN
          </button>
        </div>
      </div>
    </div>
  )
}

