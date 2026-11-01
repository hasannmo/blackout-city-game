import React from 'react'
import { useGameStore } from '../../stores/gameStore'

export const PlacementBar: React.FC = () => {
  const level = useGameStore((s) => s.level)
  const levelIndex = useGameStore((s) => s.levelIndex)
  const gameState = useGameStore((s) => s.gameState)
  const selectedType = useGameStore((s) => s.selectedInventoryType)
  const selectType = useGameStore((s) => s.selectInventoryType)
  const proceedToActivation = useGameStore((s) => s.proceedToActivation)
  const proceedToSimulation = useGameStore((s) => s.proceedToSimulation)
  const navigateBack = useGameStore((s) => s.navigateBack)

  const isPlacement = gameState.phase === 'placement'
  const isActivation = gameState.phase === 'activation'
  const isSimulation = gameState.phase === 'simulation'

  return (
    <footer className="w-full flex items-center justify-between px-10 py-4 bg-[var(--panel)] border-t-4 border-[var(--outline)] select-none">
      {/* Back button */}
      <div>
        {!isPlacement && (
          <button
            onClick={navigateBack}
            className="flex items-center gap-2 bg-[var(--btn-blue)] hover:brightness-105 active:translate-y-0.5 border-2 border-[var(--outline)] text-white px-5 py-2.5 rounded-2xl font-black shadow-[0_4px_0_var(--btn-blue-rim)]"
          >
            <img src="/icons/arrow-left.svg" alt="Back" className="w-5 h-5" />
            <span>BACK</span>
          </button>
        )}
      </div>

      {/* Center: Inventory Cards or Phase Instructions */}
      <div className="flex items-center gap-4">
        {isPlacement && (
          <>
            {Object.entries(level.inventory).map(([typeId, totalCount]) => {
              const def = levelIndex.buildingDefinitions[typeId]
              const placed = gameState.generators.filter((g) => g.typeId === typeId).length
              const remaining = totalCount - placed
              const isSelected = selectedType === typeId

              return (
                <button
                  key={typeId}
                  onClick={() => selectType(typeId)}
                  className={`flex items-center gap-3 px-4 py-2 rounded-2xl border-2 border-[var(--outline)] transition transform active:scale-95 ${
                    isSelected
                      ? 'bg-[var(--power-yellow)] shadow-[0_4px_0_var(--outline)] -translate-y-1'
                      : 'bg-white hover:bg-amber-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-200 border-2 border-[var(--outline)] flex items-center justify-center">
                    <img src="/icons/zap.svg" alt="Generator" className="w-6 h-6 text-[var(--ink)]" />
                  </div>
                  <div className="text-left">
                    <span className="block text-xs font-black text-[var(--ink)]">
                      {def?.name ?? typeId}
                    </span>
                    <span className="block text-[11px] font-bold text-gray-600">
                      Output: {def?.output} kW
                    </span>
                    <span className="block text-[10px] font-extrabold text-amber-900">
                      Available: {remaining} / {totalCount}
                    </span>
                  </div>
                </button>
              )
            })}
          </>
        )}

        {isActivation && (
          <div className="text-center">
            <span className="text-sm font-black text-[var(--ink)] block">
              Tap connected buildings to toggle power
            </span>
            <span className="text-xs text-gray-600">
              Auto-activation has powered all networks within budget.
            </span>
          </div>
        )}

        {isSimulation && (
          <div className="text-center">
            <span className="text-sm font-black text-amber-900 block">
              Simulation evaluation complete!
            </span>
          </div>
        )}
      </div>

      {/* Forward Action Button */}
      <div>
        {isPlacement && (
          <button
            onClick={proceedToActivation}
            className="flex items-center gap-2 bg-[var(--btn-green)] hover:brightness-105 active:translate-y-0.5 border-2 border-[var(--outline)] text-white px-6 py-2.5 rounded-2xl font-black shadow-[0_4px_0_var(--btn-green-rim)]"
          >
            <span>ACTIVATION</span>
            <img src="/icons/arrow-right.svg" alt="Next" className="w-5 h-5" />
          </button>
        )}

        {isActivation && (
          <button
            onClick={proceedToSimulation}
            className="flex items-center gap-2 bg-[var(--btn-green)] hover:brightness-105 active:translate-y-0.5 border-2 border-[var(--outline)] text-white px-6 py-2.5 rounded-2xl font-black shadow-[0_4px_0_var(--btn-green-rim)]"
          >
            <span>SIMULATE</span>
            <img src="/icons/zap-plain.svg" alt="Simulate" className="w-5 h-5" />
          </button>
        )}
      </div>
    </footer>
  )
}

