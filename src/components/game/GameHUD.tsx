import React from 'react'
import { useGameStore } from '../../stores/gameStore'
import { computeCapacityReport, computeActivationReport } from '../../engine/simulation/capacity'

export const GameHUD: React.FC = () => {
  const level = useGameStore((s) => s.level)
  const gameState = useGameStore((s) => s.gameState)
  const levelIndex = useGameStore((s) => s.levelIndex)
  const resetCurrentLevel = useGameStore((s) => s.resetCurrentLevel)

  const capacityReport = computeCapacityReport(levelIndex, gameState)
  const activationReport = computeActivationReport(levelIndex, gameState)

  return (
    <header className="w-full flex items-center justify-between px-6 py-3 select-none">
      {/* Left: Level Info & Objectives */}
      <div className="flex items-center gap-4 bg-[var(--panel)] px-4 py-2 rounded-2xl border-2 border-[var(--outline)] shadow-md">
        <div>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Campaign</span>
          <h1 className="text-lg font-black leading-none text-[var(--ink)]">{level.name}</h1>
        </div>
        <div className="h-6 w-px bg-gray-300 mx-1" />
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
            Phase: <strong className="uppercase">{gameState.phase}</strong>
          </span>
        </div>
      </div>

      {/* Center: Network Capacities */}
      <div className="flex items-center gap-3">
        {levelIndex.roadComponents.map((comp) => {
          const cap = capacityReport.get(comp.id)
          const act = activationReport.get(comp.id)
          const isActivation = gameState.phase === 'activation' || gameState.phase === 'simulation'

          const badgeBg =
            comp.id === 'A' ? 'var(--net-a)' :
            comp.id === 'B' ? 'var(--net-b)' :
            comp.id === 'C' ? 'var(--net-c)' : 'var(--net-d)'

          return (
            <div
              key={comp.id}
              className="flex items-center gap-2 bg-[var(--panel)] px-3 py-1.5 rounded-xl border-2 border-[var(--outline)] shadow-sm"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center font-black text-sm text-white shadow"
                style={{ backgroundColor: badgeBg }}
              >
                {comp.id}
              </div>
              <div className="text-xs font-bold flex flex-col leading-tight">
                {isActivation ? (
                  <span>
                    Remaining: <strong className="text-sm">{act?.remaining ?? 0}</strong> kW
                  </span>
                ) : (
                  <span>
                    Output: <strong>{cap?.generation ?? 0}</strong> / {cap?.demand ?? 0} kW
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Right: Reset & Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={resetCurrentLevel}
          className="flex items-center gap-1.5 bg-[var(--panel)] hover:bg-amber-100 text-[var(--ink)] border-2 border-[var(--outline)] px-3 py-2 rounded-xl text-xs font-bold transition shadow-sm active:translate-y-0.5"
          title="Reset Level"
        >
          <img src="/icons/reset.svg" alt="Reset" className="w-4 h-4" />
          <span>Reset</span>
        </button>
      </div>
    </header>
  )
}

