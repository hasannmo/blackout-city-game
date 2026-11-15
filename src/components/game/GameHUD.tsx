import React from "react";
import { useGameStore } from "../../stores/gameStore";
import {
  computeCapacityReport,
  computeActivationReport,
} from "../../engine/simulation/capacity";

export const GameHUD: React.FC = () => {
  const level = useGameStore((s) => s.level);
  const gameState = useGameStore((s) => s.gameState);
  const levelIndex = useGameStore((s) => s.levelIndex);
  const resetCurrentLevel = useGameStore((s) => s.resetCurrentLevel);
  const setScreen = useGameStore((s) => s.setScreen);
  const showStarSidebar = useGameStore((s) => s.showStarSidebar);
  const toggleStarSidebar = useGameStore((s) => s.toggleStarSidebar);

  const capacityReport = computeCapacityReport(levelIndex, gameState);
  const activationReport = computeActivationReport(levelIndex, gameState);

  return (
    <header className="w-full flex flex-wrap items-center justify-between gap-1.5 px-2 py-1.5 sm:px-6 sm:py-3 select-none">
      {/* Left: Level Info & Level Select Navigation */}
      <div className="flex items-center gap-1.5 sm:gap-4 min-w-0 bg-[var(--panel)] px-2 sm:px-4 py-1 sm:py-2 rounded-xl sm:rounded-2xl border-2 border-[var(--outline)] shadow-sm sm:shadow-md">
        <button
          onClick={() => setScreen("level-select")}
          className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center hover:bg-amber-100 rounded-lg sm:rounded-xl transition"
          title="Back to Level Selector"
        >
          <img
            src="/icons/arrow-left.svg"
            alt="Back"
            className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--ink)]"
          />
        </button>
        <div className="min-w-0">
          <span className="hidden sm:block text-xs font-bold text-gray-500 uppercase tracking-wider">
            Campaign
          </span>
          <h1 className="text-sm sm:text-lg font-black leading-none text-[var(--ink)] truncate">
            {level.name}
          </h1>
        </div>
        <div className="hidden sm:block h-6 w-px bg-gray-300 mx-1" />
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] sm:text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 sm:px-2 py-0.5 rounded-full">
            <span className="hidden sm:inline">Phase: </span><strong className="uppercase">{gameState.phase}</strong>
          </span>
        </div>
      </div>

      {/* Center: Network Capacities in In-Game Zap Currency */}
      <div className="order-3 w-full lg:order-none lg:w-auto flex items-center gap-1 sm:gap-2 flex-wrap justify-center max-w-xl">
        {levelIndex.roadComponents.map((comp) => {
          const cap = capacityReport.get(comp.id);
          const act = activationReport.get(comp.id);
          const isActivation =
            gameState.phase === "activation" ||
            gameState.phase === "simulation";

          const badgeBg =
            comp.id === "A"
              ? "var(--net-a)"
              : comp.id === "B"
                ? "var(--net-b)"
                : comp.id === "C"
                  ? "var(--net-c)"
                  : "var(--net-d)";

          return (
            <div
              key={comp.id}
              className="flex items-center gap-1 bg-[var(--panel)] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl border border-[var(--outline)] sm:border-2 shadow-xs"
            >
              <div
                className="w-4 h-4 sm:w-6 sm:h-6 rounded-full flex items-center justify-center font-black text-[10px] sm:text-xs text-white shadow-xs shrink-0"
                style={{ backgroundColor: badgeBg }}
              >
                {comp.id}
              </div>
              <div className="text-[10px] sm:text-xs font-bold flex items-center gap-0.5 sm:gap-1 leading-tight text-[var(--ink)] whitespace-nowrap">
                {isActivation ? (
                  <>
                    <span className="hidden sm:inline">Left:</span>
                    <span className="font-black text-amber-900">
                      {act?.remaining ?? 0}
                    </span>
                    <img
                      src="/icons/zap.svg"
                      alt="zap"
                      className="w-3 h-3 sm:w-3.5 sm:h-3.5 inline"
                    />
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Out:</span>
                    <span className="font-black text-amber-900">
                      {cap?.generation ?? 0}
                    </span>
                    <span className="text-gray-400">/{cap?.demand ?? 0}</span>
                    <img
                      src="/icons/zap.svg"
                      alt="zap"
                      className="w-3 h-3 sm:w-3.5 sm:h-3.5 inline"
                    />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Right: Sidebar Toggle & Reset */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Toggle Star Requirements Sidebar Button */}
        <button
          onClick={toggleStarSidebar}
          className={`flex items-center justify-center gap-1 border-2 border-[var(--outline)] min-w-8 h-8 sm:min-w-10 sm:h-10 px-2 sm:px-3 rounded-lg sm:rounded-xl text-xs font-bold transition shadow-sm active:translate-y-0.5 ${
            showStarSidebar
              ? "bg-[var(--power-yellow)] text-amber-950"
              : "bg-[var(--panel)] hover:bg-amber-100 text-[var(--ink)]"
          }`}
          title={showStarSidebar ? "Hide Objectives & Stars" : "Show Objectives & Stars"}
        >
          <img src="/icons/star.svg" alt="Stars" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">{showStarSidebar ? "Hide Goals" : "Goals"}</span>
        </button>

        <button
          onClick={resetCurrentLevel}
          className="flex items-center justify-center gap-1 bg-[var(--panel)] hover:bg-amber-100 text-[var(--ink)] border-2 border-[var(--outline)] min-w-8 h-8 sm:min-w-10 sm:h-10 px-2 sm:px-3 rounded-lg sm:rounded-xl text-xs font-bold transition shadow-sm active:translate-y-0.5"
          title="Reset Level"
        >
          <img src="/icons/reset.svg" alt="Reset" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>
    </header>
  );
};
