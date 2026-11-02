import React from "react";
import { useGameStore } from "../../stores/gameStore";
import {
  computeCapacityReport,
  computeActivationReport,
} from "../../engine/simulation/capacity";
import { computeLiveStarState } from "../../engine/objectives/objectiveEvaluator";

export const GameHUD: React.FC = () => {
  const level = useGameStore((s) => s.level);
  const buildingDefinitions = useGameStore((s) => s.buildingDefinitions);
  const gameState = useGameStore((s) => s.gameState);
  const levelIndex = useGameStore((s) => s.levelIndex);
  const resetCurrentLevel = useGameStore((s) => s.resetCurrentLevel);
  const setScreen = useGameStore((s) => s.setScreen);

  const capacityReport = computeCapacityReport(levelIndex, gameState);
  const activationReport = computeActivationReport(levelIndex, gameState);

  const { star1Satisfied, star2Satisfied, star3Satisfied } =
    computeLiveStarState(level, buildingDefinitions, gameState.activeBuildingIds);

  return (
    <header className="w-full flex items-center justify-between px-6 py-3 select-none">
      {/* Left: Level Info & Level Select Navigation */}
      <div className="flex items-center gap-4 bg-[var(--panel)] px-4 py-2 rounded-2xl border-2 border-[var(--outline)] shadow-md">
        <button
          onClick={() => setScreen("level-select")}
          className="p-1.5 hover:bg-amber-100 rounded-xl transition"
          title="Back to Level Selector"
        >
          <img
            src="/icons/arrow-left.svg"
            alt="Back"
            className="w-5 h-5 text-[var(--ink)]"
          />
        </button>
        <div>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
            Campaign
          </span>
          <h1 className="text-lg font-black leading-none text-[var(--ink)]">
            {level.name}
          </h1>
        </div>
        <div className="h-6 w-px bg-gray-300 mx-1" />
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
            Phase: <strong className="uppercase">{gameState.phase}</strong>
          </span>
        </div>
      </div>

      {/* Center: Network Capacities in In-Game Zap Currency */}
      <div className="flex items-center gap-3">
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
              className="flex items-center gap-2.5 bg-[var(--panel)] px-3.5 py-1.5 rounded-xl border-2 border-[var(--outline)] shadow-sm"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center font-black text-sm text-white shadow"
                style={{ backgroundColor: badgeBg }}
              >
                {comp.id}
              </div>
              <div className="text-xs font-bold flex items-center gap-1 leading-tight text-[var(--ink)]">
                {isActivation ? (
                  <>
                    <span>Remaining:</span>
                    <span className="text-sm font-black text-amber-900">
                      {act?.remaining ?? 0}
                    </span>
                    <img
                      src="/icons/zap.svg"
                      alt="zap"
                      className="w-4 h-4 inline"
                    />
                  </>
                ) : (
                  <>
                    <span>Output:</span>
                    <span className="text-sm font-black text-amber-900">
                      {cap?.generation ?? 0}
                    </span>
                    <span className="text-gray-500">/ {cap?.demand ?? 0}</span>
                    <img
                      src="/icons/zap.svg"
                      alt="zap"
                      className="w-4 h-4 inline"
                    />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Right: Live Compact Star Indicator & Reset */}
      <div className="flex items-center gap-3">
        {/* Compact Star Indicator Pill */}
        <div className="flex items-center gap-1.5 bg-[var(--panel)] border-2 border-[var(--outline)] px-3 py-1.5 rounded-xl shadow-sm">
          {[
            { id: 1, satisfied: star1Satisfied },
            { id: 2, satisfied: star2Satisfied },
            { id: 3, satisfied: star3Satisfied },
          ].map((s) => (
            <div
              key={s.id}
              className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                s.satisfied ? "scale-110 drop-shadow" : "opacity-35 grayscale"
              }`}
            >
              <img
                src="/icons/star.svg"
                alt={`Star ${s.id}`}
                className="w-5 h-5"
              />
            </div>
          ))}
        </div>

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
  );
};
