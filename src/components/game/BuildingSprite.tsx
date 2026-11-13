import React from "react";

interface BuildingProps {
  variant: string;
  isLit: boolean;
  isPowered: boolean;
  demand?: number;
}

export const BuildingSprite: React.FC<BuildingProps> = ({
  variant,
  isLit,
  demand,
}) => {
  if (variant === "hospital") {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center p-2 select-none pointer-events-none">
        {/* Power Demand Label Pill */}
        {demand !== undefined && demand > 0 && (
          <div
            className={`absolute top-2 left-2 z-30 flex items-center gap-1 px-2 py-0.5 rounded-full border-2 border-[var(--outline)] shadow-sm transition-all ${
              isLit
                ? "bg-[var(--power-yellow)] text-amber-950 font-black scale-105"
                : "bg-white/95 text-[var(--ink)] font-extrabold"
            }`}
          >
            <span className="text-xs leading-none">{demand}</span>
            <img
              src="/icons/zap.svg"
              alt="demand"
              className="w-3.5 h-3.5 inline"
            />
          </div>
        )}

        {/* Hospital Building Body (2x2 footprint) */}
        <div
          className="w-[85%] h-[82%] rounded-2xl border-4 border-[var(--outline)] relative flex flex-col items-center justify-between p-2 shadow-xl transition-colors duration-300"
          style={{
            backgroundColor: isLit ? "#f8fafc" : "#94a3b8",
          }}
        >
          {/* Top Medical Cross Roof Banner */}
          <div
            className="w-full flex items-center justify-center py-1 rounded-lg border-2 border-[var(--outline)] shadow-inner transition-colors duration-300"
            style={{
              backgroundColor: isLit ? "#ef4444" : "#b91c1c",
            }}
          >
            {/* White Hospital Cross */}
            <div className="relative w-6 h-6 flex items-center justify-center">
              <div className="absolute w-5 h-2 bg-white rounded-xs shadow-xs" />
              <div className="absolute w-2 h-5 bg-white rounded-xs shadow-xs" />
            </div>
          </div>

          {/* Windows Matrix (3x2) */}
          <div className="grid grid-cols-3 gap-2 w-full my-auto px-1">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-4 rounded border-2 border-[var(--outline)] transition-colors duration-300"
                style={{
                  backgroundColor: isLit
                    ? "var(--power-yellow)"
                    : "var(--window-unlit)",
                  boxShadow: isLit ? "0 0 8px var(--power-yellow)" : "none",
                }}
              />
            ))}
          </div>

          {/* Bottom Entrance */}
          <div className="w-8 h-5 bg-[var(--outline)] rounded-t-md flex items-center justify-center">
            <div
              className="w-3 h-3 rounded-t-xs"
              style={{
                backgroundColor: isLit ? "#38bdf8" : "#64748b",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-1 select-none pointer-events-none">
      {/* Power Demand Label Pill */}
      {demand !== undefined && demand > 0 && (
        <div
          className={`absolute -top-1.5 left-1 z-30 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border border-[var(--outline)] shadow-sm transition-all ${
            isLit
              ? "bg-[var(--power-yellow)] text-amber-950 font-black scale-105"
              : "bg-white/95 text-[var(--ink)] font-extrabold"
          }`}
        >
          <span className="text-[10px] leading-none">{demand}</span>
          <img src="/icons/zap.svg" alt="demand" className="w-2.5 h-2.5 inline" />
        </div>
      )}

      {/* 2.5D Isometric Roof */}
      <div
        className="w-10 h-7 rounded-lg border-2 border-[var(--outline)] relative shadow-md transition-colors duration-300"
        style={{
          backgroundColor: isLit ? "var(--roof-red-lit)" : "var(--roof-unlit)",
        }}
      >
        {/* Roof ridge / highlight */}
        <div className="absolute top-1 left-1.5 right-1.5 h-1.5 bg-white/25 rounded-sm" />
      </div>

      {/* House Front Wall */}
      <div
        className="w-9 h-6 -mt-1 rounded-b-md border-2 border-[var(--outline)] border-t-0 relative flex items-center justify-around px-1 transition-colors duration-300 shadow-sm"
        style={{
          backgroundColor: isLit ? "var(--wall-lit)" : "var(--wall-unlit)",
        }}
      >
        {/* Window 1 */}
        <div
          className="w-2.5 h-2.5 rounded-sm border border-[var(--outline)] transition-colors duration-300"
          style={{
            backgroundColor: isLit
              ? "var(--power-yellow)"
              : "var(--window-unlit)",
            boxShadow: isLit ? "0 0 6px var(--power-yellow)" : "none",
          }}
        />

        {/* Door */}
        <div className="w-2 h-3.5 bg-[var(--outline)] rounded-t-sm self-end" />

        {/* Window 2 */}
        <div
          className="w-2.5 h-2.5 rounded-sm border border-[var(--outline)] transition-colors duration-300"
          style={{
            backgroundColor: isLit
              ? "var(--power-yellow)"
              : "var(--window-unlit)",
            boxShadow: isLit ? "0 0 6px var(--power-yellow)" : "none",
          }}
        />
      </div>
    </div>
  );
};
