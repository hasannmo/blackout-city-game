import React, { useState } from "react";
import { useGameStore } from "../../stores/gameStore";
import { SolverModal } from "./SolverModal";

export const PlacementBar: React.FC = () => {
  const level = useGameStore((s) => s.level);
  const levelIndex = useGameStore((s) => s.levelIndex);
  const gameState = useGameStore((s) => s.gameState);
  const selectedType = useGameStore((s) => s.selectedInventoryType);
  const selectType = useGameStore((s) => s.selectInventoryType);
  const proceedToActivation = useGameStore((s) => s.proceedToActivation);
  const proceedToSimulation = useGameStore((s) => s.proceedToSimulation);
  const navigateBack = useGameStore((s) => s.navigateBack);

  const [isSolverOpen, setIsSolverOpen] = useState<boolean>(false);

  const isPlacement = gameState.phase === "placement";
  const isActivation = gameState.phase === "activation";
  const isSimulation = gameState.phase === "simulation";

  return (
    <>
      <footer className="w-full grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-3 sm:gap-y-2 px-2 sm:px-6 lg:px-10 pt-1.5 sm:pt-4 pb-[max(0.35rem,env(safe-area-inset-bottom))] sm:pb-[max(1rem,env(safe-area-inset-bottom))] bg-[var(--panel)] border-t-2 sm:border-t-4 border-[var(--outline)] select-none">
        {/* Left Actions: Back or Solver */}
        <div className="flex items-center gap-2">
          {!isPlacement && (
            <button
              onClick={navigateBack}
              className="w-full sm:w-auto justify-center flex items-center gap-1.5 sm:gap-2 bg-[var(--btn-blue)] hover:brightness-105 active:translate-y-0.5 border-2 border-[var(--outline)] text-white px-3 sm:px-5 py-1.5 sm:py-2.5 min-h-10 sm:min-h-11 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm shadow-[0_3px_0_var(--btn-blue-rim)] sm:shadow-[0_4px_0_var(--btn-blue-rim)]"
            >
              <img src="/icons/arrow-left.svg" alt="Back" className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>BACK</span>
            </button>
          )}

          {isPlacement && (
            <button
              onClick={() => setIsSolverOpen(true)}
              className="w-full sm:w-auto justify-center flex items-center gap-1.5 sm:gap-2 bg-amber-400 hover:bg-amber-300 active:translate-y-0.5 border-2 border-[var(--outline)] text-[var(--ink)] px-2.5 sm:px-4 py-1.5 sm:py-2.5 min-h-10 sm:min-h-11 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm shadow-sm transition"
              title="Open Constraint Satisfaction Problem Solver & Benchmark"
            >
              <img src="/icons/solver.svg" alt="CSP Solver" className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-[11px] sm:text-xs uppercase tracking-wide">CSP Solver</span>
            </button>
          )}
        </div>

      {/* Center: Generator Inventory in zap currency */}
      <div className="col-span-2 order-first w-full lg:order-none lg:w-auto flex items-center justify-center gap-2 sm:gap-4 max-lg:overflow-x-auto py-1 sm:py-2 lg:py-0">
        {isPlacement && (
          <>
            {Object.entries(level.inventory).map(([typeId, totalCount]) => {
              const def = levelIndex.buildingDefinitions[typeId];
              const placed = gameState.generators.filter(
                (g) => g.typeId === typeId,
              ).length;
              const remaining = totalCount - placed;
              const isSelected = selectedType === typeId;

              return (
                <button
                  key={typeId}
                  onClick={() => selectType(typeId)}
                  className={`flex-1 min-w-[8.5rem] sm:min-w-[9.5rem] sm:flex-none justify-center sm:justify-start shrink-0 flex items-center gap-2 sm:gap-3.5 px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl border-2 border-[var(--outline)] transition transform active:scale-95 ${
                    isSelected
                      ? "bg-[var(--power-yellow)] shadow-[0_3px_0_var(--outline)] sm:shadow-[0_4px_0_var(--outline)] -translate-y-0.5 sm:-translate-y-1"
                      : "bg-white hover:bg-amber-50"
                  }`}
                >
                  <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-amber-200 border border-[var(--outline)] sm:border-2 flex items-center justify-center">
                    <img
                      src="/icons/zap.svg"
                      alt="Generator"
                      className="w-5 h-5 sm:w-7 sm:h-7 text-[var(--ink)]"
                    />
                  </div>
                  <div className="text-left">
                    <span className="block text-xs font-black text-[var(--ink)]">
                      {def?.name ?? typeId}
                    </span>
                    <span className="flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-[11px] font-bold text-gray-700">
                      Output: <strong>{def?.output}</strong>
                      <img
                        src="/icons/zap.svg"
                        alt="zap"
                        className="w-3 h-3 sm:w-3.5 sm:h-3.5 inline"
                      />
                    </span>
                    <span className="block text-[9px] sm:text-[10px] font-extrabold text-amber-900">
                      Available: {remaining} / {totalCount}
                    </span>
                  </div>
                </button>
              );
            })}
          </>
        )}

        {isActivation && (
          <div className="text-center w-full">
            <span className="text-xs sm:text-sm font-black text-[var(--ink)] block">
              Tap connected house to activate electricity
            </span>
            <span className="hidden sm:inline text-xs text-gray-600">
              Auto-activation has allocated generation to connected demand.
            </span>
          </div>
        )}

        {isSimulation && (
          <div className="text-center w-full">
            <span className="text-xs sm:text-sm font-black text-amber-900 block">
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
            className="w-full sm:w-auto justify-center flex items-center gap-1.5 sm:gap-2 bg-[var(--btn-green)] hover:brightness-105 active:translate-y-0.5 border-2 border-[var(--outline)] text-white px-3 sm:px-6 py-1.5 sm:py-2.5 min-h-10 sm:min-h-11 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm shadow-[0_3px_0_var(--btn-green-rim)] sm:shadow-[0_4px_0_var(--btn-green-rim)]"
          >
            <span>ACTIVATION</span>
            <img src="/icons/arrow-right.svg" alt="Next" className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        {isActivation && (
          <button
            onClick={proceedToSimulation}
            className="w-full sm:w-auto justify-center flex items-center gap-1.5 sm:gap-2 bg-[var(--btn-green)] hover:brightness-105 active:translate-y-0.5 border-2 border-[var(--outline)] text-white px-3 sm:px-6 py-1.5 sm:py-2.5 min-h-10 sm:min-h-11 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm shadow-[0_3px_0_var(--btn-green-rim)] sm:shadow-[0_4px_0_var(--btn-green-rim)]"
          >
            <span>SIMULATE</span>
            <img src="/icons/zap.svg" alt="Simulate" className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}
      </div>
      </footer>

      {/* CSP Solver Modal */}
      <SolverModal
        isOpen={isSolverOpen}
        onClose={() => setIsSolverOpen(false)}
      />
    </>
  );
};
