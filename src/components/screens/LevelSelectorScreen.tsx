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
    "level-06": "Medical Center",
    "level-07": "Regional Care",
    "level-08": "Metro Clinic",
    "level-09": "Crossroads Hospital",
    "level-10": "Mega City Medical",
  };

  return (
    <div className="h-dvh w-full flex flex-col justify-between gap-2 py-4 sm:py-8 px-4 sm:px-10 select-none bg-[var(--sky)] overflow-hidden">
      {/* Top Header */}
      <header className="flex items-center justify-between gap-2 px-1 py-1 sm:py-2">
        <button
          onClick={() => setScreen("home")}
          className="flex items-center gap-1.5 sm:gap-2 bg-[var(--panel)] hover:bg-amber-100 border-2 border-[var(--outline)] text-[var(--ink)] px-2.5 sm:px-5 py-1.5 sm:py-2.5 min-h-9 sm:min-h-11 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm shadow-sm transition active:translate-y-0.5"
        >
          <img src="/icons/arrow-left.svg" alt="Back" className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>HOME</span>
        </button>

        <h1 className="text-sm sm:text-2xl font-black text-[var(--ink)] tracking-wide text-center">
          CAMPAIGN LEVELS
        </h1>

        <div className="w-12 sm:w-24" />
      </header>

      {/* Level Selection Cards Grid: 4 per row on mobile, 5 on desktop */}
      <div className="flex-1 flex items-center justify-center p-1 sm:p-4 overflow-y-auto min-h-0">
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 sm:gap-4 max-w-5xl w-full m-auto py-1">
          {campaignLevels.map((lvl, index) => {
            const title = levelTitles[lvl.id] ?? `Level ${index + 1}`;

            return (
              <div
                key={lvl.id}
                onClick={() => {
                  loadLevel(lvl);
                }}
                className="flex flex-col items-center justify-between p-1.5 sm:p-4 rounded-xl sm:rounded-3xl border-2 sm:border-4 border-[var(--outline)] bg-[var(--panel)] hover:-translate-y-1 cursor-pointer shadow-[0_2px_0_var(--outline)] sm:shadow-[0_6px_0_var(--outline)] transition-all"
              >
                {/* Level Number Pill */}
                <span className="text-[9px] sm:text-xs font-black px-1.5 sm:px-3 py-0.5 bg-amber-200 text-amber-900 border border-[var(--outline)] rounded-full mb-1">
                  Lvl {lvl.name.replace(/[^0-9]/g, "") || index + 1}
                </span>

                {/* Level Thumbnail / Frame */}
                <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-lg sm:rounded-2xl bg-[var(--grass-light)] border border-[var(--outline)] sm:border-2 flex flex-col items-center justify-center shadow-inner my-0.5 sm:my-1.5 relative">
                  <div className="flex flex-col items-center justify-center">
                    <img
                      src="/icons/zap.svg"
                      alt="Power"
                      className="w-5 h-5 sm:w-8 sm:h-8 drop-shadow"
                    />
                    <span className="text-[8px] sm:text-[10px] font-black text-[var(--ink)] mt-0.5">
                      {lvl.grid.width}x{lvl.grid.height}
                    </span>
                  </div>
                </div>

                {/* Level Title */}
                <span className="text-[8px] sm:text-xs font-black text-[var(--ink)] text-center line-clamp-1 mt-0.5 sm:mt-1 max-w-full">
                  {title}
                </span>

                {/* Star Rating Display */}
                <div className="flex items-center gap-0.5 sm:gap-1 mt-1">
                  {[1, 2, 3].map((starIdx) => (
                    <img
                      key={starIdx}
                      src="/icons/star.svg"
                      alt="Star"
                      className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-amber-500"
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <footer className="text-center text-xs font-bold text-gray-600 pb-[env(safe-area-inset-bottom)]">
        Choose a level to deploy generators and balance city power networks
      </footer>
    </div>
  );
};
