import React from "react";
import { useGameStore, campaignLevels } from "../../stores/gameStore";

export const LevelSelectorScreen: React.FC = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const loadLevel = useGameStore((s) => s.loadLevel);

  const levelTitles: Record<string, string> = {
    "level-01": "First Spark",
    "level-02": "Dual Line",
    "level-03": "Twin Enclaves",
    "level-04": "Triple Cross",
    "level-05": "Grand Metropolis",
  };

  return (
    <div className="h-screen w-screen flex flex-col justify-between py-8 px-10 select-none bg-[var(--sky)] overflow-hidden">
      {/* Top Header */}
      <header className="flex items-center justify-between">
        <button
          onClick={() => setScreen("home")}
          className="flex items-center gap-2 bg-[var(--panel)] hover:bg-amber-100 border-2 border-[var(--outline)] text-[var(--ink)] px-5 py-2.5 rounded-2xl font-black text-sm shadow-sm transition active:translate-y-0.5"
        >
          <img src="/icons/arrow-left.svg" alt="Back" className="w-5 h-5" />
          <span>HOME</span>
        </button>

        <h1 className="text-3xl font-black text-[var(--ink)] tracking-wide">
          CAMPAIGN LEVELS
        </h1>

        <div className="w-24" />
      </header>

      {/* Level Selection Cards Grid */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-5 max-w-5xl w-full">
          {campaignLevels.map((lvl, index) => {
            const title = levelTitles[lvl.id] ?? `Level ${index + 1}`;

            return (
              <div
                key={lvl.id}
                onClick={() => {
                  loadLevel(lvl);
                }}
                className="flex flex-col items-center justify-between p-5 rounded-3xl border-4 border-[var(--outline)] bg-[var(--panel)] hover:-translate-y-1.5 cursor-pointer shadow-[0_6px_0_var(--outline)] transition-all"
              >
                {/* Level Number Pill */}
                <span className="text-xs font-black px-3 py-1 bg-amber-200 text-amber-900 border border-[var(--outline)] rounded-full mb-2">
                  {lvl.name}
                </span>

                {/* Level Thumbnail / Frame */}
                <div className="w-24 h-24 rounded-2xl bg-[var(--grass-light)] border-2 border-[var(--outline)] flex flex-col items-center justify-center shadow-inner my-2 relative">
                  <div className="flex flex-col items-center justify-center">
                    <img
                      src="/icons/zap.svg"
                      alt="Power"
                      className="w-9 h-9 drop-shadow"
                    />
                    <span className="text-[10px] font-black text-[var(--ink)] mt-1">
                      {lvl.grid.width}x{lvl.grid.height} Grid
                    </span>
                  </div>
                </div>

                {/* Level Title */}
                <span className="text-xs font-black text-[var(--ink)] text-center line-clamp-1 mt-1">
                  {title}
                </span>

                {/* Star Rating Display */}
                <div className="flex items-center gap-1 mt-2.5">
                  {[1, 2, 3].map((starIdx) => (
                    <img
                      key={starIdx}
                      src="/icons/star.svg"
                      alt="Star"
                      className="w-3.5 h-3.5 text-amber-500"
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <footer className="text-center text-xs font-bold text-gray-600">
        Choose a level to deploy generators and balance city power networks
      </footer>
    </div>
  );
};
