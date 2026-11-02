import React from "react";

interface BuildingProps {
  variant: string;
  isLit: boolean;
  isPowered: boolean;
  demand?: number;
}

export const BuildingSprite: React.FC<BuildingProps> = ({ isLit, demand }) => {
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
